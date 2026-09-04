// Internal-only stdin JSON transport parser for `evaluate` (Milestone 4.3: Stable CLI
// Evaluate JSON Contract). Not part of the package's public surface — the CLI's only
// public surface is its binary (see package.json's `bin` field; no `main`/`exports`).
//
// Converts untrusted external JSON into the CLI's trusted internal transport shape,
// `{ naming_request, evaluation_context }`. This is transport validation only — is the
// JSON well-formed enough to safely reach core? — not domain validation (required
// attributes, protected-value conflicts, naming/rendering/placement constraints),
// which remains `evaluate()`'s responsibility (see
// docs/architecture/cli.md#transport-and-domain-validation-boundary).
//
// core's Context Resolution dereferences every nested NamingRequest/EvaluationContext
// field with optional chaining only (see
// packages/core/src/evaluator/context-resolution/resolve-resource-identity.ts and
// resolve-governance-context.ts), so a malformed *nested* value (wrong type, absent
// field) cannot throw there — it only resolves to `undefined`, which core's own
// required-attribute validation already reports. The only external shapes that could
// otherwise reach core unsafely are: the JSON root, `naming_request`, and
// `evaluation_context` not being plain objects at all; and the two catalog lookup
// keys, `naming_request.resource_type`/`naming_request.convention`, needing to be
// non-empty strings before they are used as object-map lookup keys. No deeper
// structural validation is required or added (see
// docs/architecture/cli.md#transport-and-domain-validation-boundary).

import type { EvaluationContext, NamingRequest } from "@lksnext/iac-conventions-core";
import { CliError } from "../errors.js";

/**
 * The CLI's stable external JSON input contract for `evaluate` (Milestone 4.3).
 * `resource_type` and `convention` are narrowed to non-optional strings here: both are
 * required catalog lookup keys, validated below, so callers of this type never need to
 * re-check their presence.
 */
export interface EvaluateRequest {
  readonly naming_request: NamingRequest & {
    readonly resource_type: NonNullable<NamingRequest["resource_type"]>;
    readonly convention: NonNullable<NamingRequest["convention"]>;
  };
  readonly evaluation_context: EvaluationContext;
}

const ALLOWED_TOP_LEVEL_FIELDS = new Set(["naming_request", "evaluation_context"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Parses `raw` stdin text into a trusted {@link EvaluateRequest}, or throws
 * {@link CliError} describing the first transport problem found. Unknown top-level
 * fields (for example, a leftover Milestone 4.1 `convention_pack`) are rejected rather
 * than silently ignored: this is a new, stable, machine-oriented contract, so a typo
 * or stale caller should fail loudly rather than be misinterpreted.
 */
export function parseEvaluateRequest(raw: string): EvaluateRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError("Malformed JSON input on stdin.");
  }

  if (!isPlainObject(parsed)) {
    throw new CliError("JSON input must be an object.");
  }

  for (const field of Object.keys(parsed)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      throw new CliError(`Unknown field "${field}" in JSON input.`);
    }
  }

  const { naming_request: namingRequest, evaluation_context: evaluationContext } = parsed;

  if (!isPlainObject(namingRequest)) {
    throw new CliError('JSON input is missing a required "naming_request" object.');
  }
  if (!isPlainObject(evaluationContext)) {
    throw new CliError('JSON input is missing a required "evaluation_context" object.');
  }

  if (!isNonEmptyString(namingRequest.resource_type)) {
    throw new CliError('"naming_request.resource_type" must be a non-empty string.');
  }
  if (!isNonEmptyString(namingRequest.convention)) {
    throw new CliError('"naming_request.convention" must be a non-empty string.');
  }

  return {
    naming_request: namingRequest as unknown as EvaluateRequest["naming_request"],
    evaluation_context: evaluationContext as unknown as EvaluationContext,
  };
}
