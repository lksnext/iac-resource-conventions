// The `evaluate` command (Milestone 4.3: Stable CLI Evaluate JSON Contract). See
// docs/architecture/cli.md.
//
// This command owns only I/O: reading stdin, delegating to the two internal
// functions that carry the actual contract, and writing stdout/stderr. Parsing
// (`../internal/parse-evaluate-request.js`) and evaluation orchestration
// (`../internal/execute-evaluation-request.js`) are both standalone internal
// functions, not inlined here, so a future Terraform transport (Milestone 4.4) can
// reuse them around a different stdin/stdout shape instead of invoking this CLI as a
// subprocess.
//
// stdout carries the resulting `ConventionResult` as JSON, and nothing else. stderr
// carries every CLI/transport failure (malformed JSON, a missing/invalid required
// field, an unknown `resource_type`, or an unknown `convention`) as a single
// deterministic, human-readable line. A domain-invalid `ConventionResult`
// (`validation.valid === false`) is not a CLI/transport failure: it is a successfully
// produced result, so it is written to stdout like any other result and the command
// still exits `0` (see docs/architecture/cli.md#exit-codes).

import { CliError } from "../errors.js";
import { executeEvaluationRequest } from "../internal/execute-evaluation-request.js";
import { parseEvaluateRequest } from "../internal/parse-evaluate-request.js";

async function readStdin(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
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

  try {
    const request = parseEvaluateRequest(raw);
    const result = executeEvaluationRequest(request);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof CliError ? error.message : "Malformed input."}\n`);
    return 1;
  }
}
