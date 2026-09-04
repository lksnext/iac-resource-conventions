// Runtime tests for the `terraform-external` command (Milestone 4.4: Terraform
// External Integration). See docs/architecture/cli.md#terraform-integration-boundary.
//
// `terraform-external` reuses the exact same `parseEvaluateRequest`/
// `executeEvaluationRequest` functions `evaluate` uses (see ../../src/commands/
// terraform-external.ts), so this file does not re-test every generic transport rule
// already covered by cli.test.mjs's `evaluate` tests (unknown top-level fields,
// missing/empty `resource_type`/`convention`, and so on). It covers only what is
// specific to this command: the `{ request_json }` query envelope, the string-only
// `{ name, valid, result_json }` output shape, and a focused sample proving the shared
// functions really are reused rather than reimplemented.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI_PATH = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));

/** Spawns the built CLI, feeding `stdin` (if any) and collecting stdout/stderr/exit code. */
function runCli(args, stdin) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

const VALID_REQUEST_JSON = JSON.stringify({
  naming_request: {
    convention: "aws-workload-default",
    resource_type: "aws_iam_role",
    functional: { service: "ingestion" },
  },
  evaluation_context: {
    shared_organizational_context: { system: "telemetry-platform" },
    shared_deployment_context: { environment: "production" },
  },
});

const VALID_QUERY = JSON.stringify({ request_json: VALID_REQUEST_JSON });

// --- valid protocol ---------------------------------------------------------------------

test("terraform-external: a valid query produces a string-only result object, exit 0, empty stderr", async () => {
  const { exitCode, stdout, stderr } = await runCli(["terraform-external"], VALID_QUERY);

  assert.equal(exitCode, 0);
  assert.equal(stderr, "");

  const output = JSON.parse(stdout);
  assert.deepEqual(Object.keys(output).sort(), ["name", "result_json", "valid"]);
  for (const value of Object.values(output)) {
    assert.equal(typeof value, "string");
  }

  assert.equal(output.name, "telemetry-platform-ingestion-prod-aws_iam_role");
  assert.equal(output.valid, "true");

  const result = JSON.parse(output.result_json);
  assert.equal(result.validation.valid, true);
  assert.equal(result.outputs.name, "telemetry-platform-ingestion-prod-aws_iam_role");
});

// --- domain-invalid result ---------------------------------------------------------------

test("terraform-external: a domain-invalid ConventionResult still completes with exit 0", async () => {
  const requestJson = JSON.stringify({
    naming_request: {
      convention: "aws-workload-default",
      resource_type: "aws_s3_bucket",
      functional: { service: `a-${"n".repeat(70)}` },
    },
    evaluation_context: {
      shared_organizational_context: { system: "telemetry-platform" },
      shared_deployment_context: { environment: "production" },
    },
  });

  const { exitCode, stdout, stderr } = await runCli(
    ["terraform-external"],
    JSON.stringify({ request_json: requestJson }),
  );

  assert.equal(exitCode, 0);
  assert.equal(stderr, "");

  const output = JSON.parse(stdout);
  assert.equal(output.valid, "false");

  const result = JSON.parse(output.result_json);
  assert.ok(
    result.validation.failures?.some((failure) => failure.code === "max-length"),
    "expected a max-length validation failure",
  );
});

// --- no-name result ----------------------------------------------------------------------
//
// A `ConventionResult` with no generated name (`outputs.name === undefined`) is a
// documented, reachable core outcome (see
// packages/core/src/evaluator/convention-evaluation/naming/evaluate-name.ts), but not
// one this suite can cheaply reach end-to-end through the current AWS catalog
// resource definitions without duplicating core's own naming-evaluation tests. This is
// therefore a focused unit test of `serializeTerraformExternalResult` itself, as
// Section 31 allows.

test("terraform-external: a ConventionResult with no generated name serializes name as an empty string", async () => {
  const { serializeTerraformExternalResult } = await import(
    "../../dist/internal/serialize-terraform-external-result.js"
  );

  const result = {
    resource_identity: {},
    governance_context: {},
    outputs: {},
    validation: { valid: false, failures: [{ code: "required-attribute" }] },
  };

  const output = serializeTerraformExternalResult(result);

  assert.equal(output.name, "");
  assert.equal(output.valid, "false");
  assert.equal(JSON.parse(output.result_json).outputs.name, undefined);
});

// --- malformed external query -------------------------------------------------------------

test("terraform-external: malformed JSON input is a transport failure — non-zero exit, empty stdout", async () => {
  const { exitCode, stdout, stderr } = await runCli(["terraform-external"], "{ this is not JSON");

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, "Malformed JSON input on stdin.\n");
});

test("terraform-external: a JSON array root is a transport failure", async () => {
  const { exitCode, stdout, stderr } = await runCli(["terraform-external"], "[]");

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, "JSON input must be an object.\n");
});

test("terraform-external: a missing request_json is a transport failure", async () => {
  const { exitCode, stdout, stderr } = await runCli(["terraform-external"], "{}");

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, '"request_json" must be a non-empty string.\n');
});

test("terraform-external: a non-string request_json is a transport failure", async () => {
  const { exitCode, stdout, stderr } = await runCli(
    ["terraform-external"],
    JSON.stringify({ request_json: { naming_request: {} } }),
  );

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, '"request_json" must be a non-empty string.\n');
});

test("terraform-external: an empty request_json is a transport failure", async () => {
  const { exitCode, stdout, stderr } = await runCli(
    ["terraform-external"],
    JSON.stringify({ request_json: "" }),
  );

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, '"request_json" must be a non-empty string.\n');
});

test("terraform-external: an unknown top-level query key is a transport failure", async () => {
  const { exitCode, stdout, stderr } = await runCli(
    ["terraform-external"],
    JSON.stringify({ request_json: VALID_REQUEST_JSON, resource_type: "aws_iam_role" }),
  );

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, 'Unknown field "resource_type" in JSON input.\n');
});

test("terraform-external: malformed JSON inside request_json is a transport failure", async () => {
  const { exitCode, stdout, stderr } = await runCli(
    ["terraform-external"],
    JSON.stringify({ request_json: "{ this is not JSON" }),
  );

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, "Malformed JSON input on stdin.\n");
});

// --- stable-request error reuse (proves genuine reuse, not reimplementation) --------------

test("terraform-external: a missing naming_request is a transport failure (reused parseEvaluateRequest)", async () => {
  const requestJson = JSON.stringify({ evaluation_context: {} });

  const { exitCode, stdout, stderr } = await runCli(
    ["terraform-external"],
    JSON.stringify({ request_json: requestJson }),
  );

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, 'JSON input is missing a required "naming_request" object.\n');
});

test("terraform-external: an unknown resource_type is a transport failure (reused executeEvaluationRequest)", async () => {
  const requestJson = JSON.stringify({
    naming_request: { resource_type: "no_such_resource_type", convention: "aws-workload-default" },
    evaluation_context: {},
  });

  const { exitCode, stdout, stderr } = await runCli(
    ["terraform-external"],
    JSON.stringify({ request_json: requestJson }),
  );

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /Unknown resource_type: "no_such_resource_type"/);
});

test("terraform-external: an unknown convention is a transport failure (reused executeEvaluationRequest)", async () => {
  const requestJson = JSON.stringify({
    naming_request: { resource_type: "aws_s3_bucket", convention: "no-such-convention" },
    evaluation_context: {},
  });

  const { exitCode, stdout, stderr } = await runCli(
    ["terraform-external"],
    JSON.stringify({ request_json: requestJson }),
  );

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /Unknown convention: "no-such-convention"/);
});

// --- determinism and string-only invariant ------------------------------------------------

test("terraform-external: the same query produces byte-for-byte identical stdout across two runs", async () => {
  const first = await runCli(["terraform-external"], VALID_QUERY);
  const second = await runCli(["terraform-external"], VALID_QUERY);

  assert.equal(first.exitCode, 0);
  assert.equal(second.exitCode, 0);
  assert.equal(first.stdout, second.stdout);
});

test("terraform-external: every value in the result object is a string, as the external protocol requires", async () => {
  const { exitCode, stdout } = await runCli(["terraform-external"], VALID_QUERY);

  assert.equal(exitCode, 0);
  const output = JSON.parse(stdout);
  assert.ok(Object.values(output).every((value) => typeof value === "string"));
});
