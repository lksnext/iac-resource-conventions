// The `terraform-external` command (Milestone 4.4: Terraform External Integration).
// See docs/architecture/cli.md#terraform-integration-boundary.
//
// This command is a second thin I/O transport around the exact same evaluation path
// `evaluate` uses: it reads stdin, extracts the underlying request document via
// `../internal/parse-terraform-external-query.js`, hands that document as-is to the
// existing `../internal/parse-evaluate-request.js` and
// `../internal/execute-evaluation-request.js` (no naming, validation, Context
// Resolution, or provider-rule logic is duplicated here or anywhere in this file),
// and projects the resulting `ConventionResult` into the string-only shape Terraform's
// `hashicorp/external` data source requires via
// `../internal/serialize-terraform-external-result.js`.
//
// stdout carries the resulting `{ name, valid, result_json }` object as compact JSON,
// and nothing else. stderr carries every CLI/transport failure (malformed JSON, an
// unknown top-level field, a missing/invalid `request_json`, or any failure
// `parseEvaluateRequest`/`executeEvaluationRequest` themselves raise) as a single
// deterministic, human-readable line. A domain-invalid `ConventionResult`
// (`validation.valid === false`) is not a CLI/transport failure: it is a successfully
// produced result, so it is written to stdout like any other result and the command
// still exits `0` (see docs/architecture/cli.md#exit-codes).

import { CliError } from "../errors.js";
import { executeEvaluationRequest } from "../internal/execute-evaluation-request.js";
import { parseEvaluateRequest } from "../internal/parse-evaluate-request.js";
import { parseTerraformExternalQuery } from "../internal/parse-terraform-external-query.js";
import { serializeTerraformExternalResult } from "../internal/serialize-terraform-external-result.js";

async function readStdin(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Runs the `terraform-external` command against `process.stdin`/`stdout`/`stderr`. */
export async function runTerraformExternalCommand(): Promise<number> {
  let raw: string;
  try {
    raw = await readStdin(process.stdin);
  } catch {
    process.stderr.write("Failed to read stdin.\n");
    return 1;
  }

  try {
    const requestJson = parseTerraformExternalQuery(raw);
    const request = parseEvaluateRequest(requestJson);
    const result = executeEvaluationRequest(request);
    const output = serializeTerraformExternalResult(result);
    process.stdout.write(`${JSON.stringify(output)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof CliError) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
    // Not a transport failure: rethrow so the top-level handler in cli.ts reports it
    // as an unexpected internal error (with a stack trace) instead of mislabeling it
    // as malformed input.
    throw error;
  }
}
