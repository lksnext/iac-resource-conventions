// The `evaluate` command (Milestone 4.1): the CLI adapter's first, minimal proof that
// CLI -> catalog -> core works end-to-end (see docs/architecture/cli.md).
//
// Reads one JSON object from stdin, looks up the referenced `ResourceDefinition` from
// `@lksnext/iac-conventions-catalog`, and passes the result to
// `@lksnext/iac-conventions-core`'s `evaluate()`. This command performs no naming,
// validation, or Context Resolution logic of its own — every domain decision is made
// by `evaluate()`; this command only orchestrates catalog lookup and I/O.
//
// stdout carries the resulting `ConventionResult` as JSON, and nothing else. stderr
// carries every CLI/transport failure (malformed JSON, a missing required field, or an
// unknown `resource_type`) as a single deterministic, human-readable line. A
// domain-invalid `ConventionResult` (`validation.valid === false`) is not a
// CLI/transport failure: it is a successfully produced result, so it is written to
// stdout like any other result and the command still exits `0` (see
// docs/architecture/cli.md#exit-codes).

import { getResourceDefinition } from "@lksnext/iac-conventions-catalog";
import {
  type ConventionPack,
  type EvaluationContext,
  evaluate,
  type NamingRequest,
} from "@lksnext/iac-conventions-core";
import { CliError } from "../errors.js";

/**
 * The CLI's external JSON input contract for `evaluate`.
 *
 * This is deliberately not `EvaluateInput` (`@lksnext/iac-conventions-core`) exposed
 * verbatim: `EvaluateInput` requires an already-selected `ResourceDefinition`, which
 * this package's caller (a human, a shell pipeline, or Terraform) cannot be expected to
 * supply — the CLI resolves it from `@lksnext/iac-conventions-catalog` using
 * `naming_request.resource_type` instead. No separate top-level `resource_type` field
 * is introduced here: `NamingRequest` already carries one, and duplicating it would
 * create two sources of truth for the same lookup key (see
 * docs/architecture/cli.md#input-boundary).
 *
 * `convention_pack` is supplied by the caller in full, not looked up: the repository
 * has a Resource Definition Catalog but no executable Convention Pack catalog yet (see
 * docs/architecture/cli.md#convention-pack-source-decision).
 */
export interface CliEvaluateInput {
  readonly naming_request: NamingRequest;
  readonly convention_pack: ConventionPack;
  readonly evaluation_context: EvaluationContext;
}

async function readStdin(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInput(raw: string): CliEvaluateInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError("Malformed JSON input on stdin.");
  }

  if (!isPlainObject(parsed)) {
    throw new CliError("JSON input must be an object.");
  }

  const { naming_request, convention_pack, evaluation_context } = parsed;

  if (!isPlainObject(naming_request)) {
    throw new CliError('JSON input is missing a required "naming_request" object.');
  }
  if (!isPlainObject(convention_pack)) {
    throw new CliError('JSON input is missing a required "convention_pack" object.');
  }
  if (!isPlainObject(evaluation_context)) {
    throw new CliError('JSON input is missing a required "evaluation_context" object.');
  }

  return {
    naming_request: naming_request as unknown as NamingRequest,
    convention_pack: convention_pack as unknown as ConventionPack,
    evaluation_context: evaluation_context as unknown as EvaluationContext,
  };
}

/** Runs the `evaluate` command against `process.stdin`/`process.stdout`/`process.stderr`. */
export async function runEvaluateCommand(): Promise<number> {
  let raw: string;
  try {
    raw = await readStdin(process.stdin);
  } catch {
    process.stderr.write("Failed to read stdin.\n");
    return 1;
  }

  let input: CliEvaluateInput;
  try {
    input = parseInput(raw);
  } catch (error) {
    process.stderr.write(`${error instanceof CliError ? error.message : "Malformed input."}\n`);
    return 1;
  }

  const resourceType = input.naming_request.resource_type;
  if (resourceType === undefined) {
    process.stderr.write('"naming_request.resource_type" is required.\n');
    return 1;
  }

  const resourceDefinition = getResourceDefinition(resourceType);
  if (resourceDefinition === undefined) {
    process.stderr.write(`Unknown resource_type: "${resourceType}".\n`);
    return 1;
  }

  const result = evaluate({
    naming_request: input.naming_request,
    convention_pack: input.convention_pack,
    evaluation_context: input.evaluation_context,
    resource_definition: resourceDefinition,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}
