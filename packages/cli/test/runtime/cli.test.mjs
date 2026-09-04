// Runtime tests for the CLI package's binary/package wiring (Milestone 4.1: CLI
// Package Foundation; Milestone 4.3: Stable CLI Evaluate JSON Contract). See
// docs/architecture/cli.md.
//
// These spawn the built executable (`dist/cli.js`) as a separate Node process, the
// same way a shell pipeline, CI job, or Terraform's `external` data source would
// invoke it, so this suite proves the binary and package wiring, not only internal
// command functions.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const CLI_PATH = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
const PACKAGE_JSON = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../package.json", import.meta.url)), "utf8"),
);

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

const VALID_INPUT = JSON.stringify({
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

// --- --help / --version -------------------------------------------------------------

test("--help exits 0, prints usage to stdout, and writes nothing to stderr", async () => {
  const { exitCode, stdout, stderr } = await runCli(["--help"]);

  assert.equal(exitCode, 0);
  assert.match(stdout, /Usage: iac-conventions <command>/);
  assert.match(stdout, /evaluate/);
  assert.equal(stderr, "");
});

test("--version exits 0, prints the package version to stdout, and writes nothing to stderr", async () => {
  const { exitCode, stdout, stderr } = await runCli(["--version"]);

  assert.equal(exitCode, 0);
  assert.equal(stdout, `${PACKAGE_JSON.version}\n`);
  assert.equal(stderr, "");
});

test("invoking the CLI with no command is a usage error: non-zero exit, empty stdout", async () => {
  const { exitCode, stdout, stderr } = await runCli([]);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /A command is required/);
});

test("an unknown command is a usage error: non-zero exit, empty stdout", async () => {
  const { exitCode, stdout, stderr } = await runCli(["not-a-command"]);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /Unknown command: "not-a-command"/);
});

// --- evaluate: valid evaluation -------------------------------------------------------

test("evaluate: a valid input produces a valid ConventionResult on stdout, exit 0, empty stderr", async () => {
  const { exitCode, stdout, stderr } = await runCli(["evaluate"], VALID_INPUT);

  assert.equal(exitCode, 0);
  assert.equal(stderr, "");

  const result = JSON.parse(stdout);
  assert.equal(result.validation.valid, true);
  assert.equal(result.outputs.name, "telemetry-platform-ingestion-prod-aws_iam_role");
});

// --- evaluate: domain-invalid result ---------------------------------------------------

test("evaluate: a v1.2 max_length violation still completes with exit 0 and a domain-invalid result", async () => {
  const input = JSON.stringify({
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

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.equal(exitCode, 0);
  assert.equal(stderr, "");

  const result = JSON.parse(stdout);
  assert.equal(result.validation.valid, false);
  assert.ok(
    result.validation.failures?.some((failure) => failure.code === "max-length"),
    "expected a max-length validation failure",
  );
});

// --- evaluate: unknown catalog lookups -------------------------------------------------

test("evaluate: an unknown resource_type is a transport failure — non-zero exit, empty stdout", async () => {
  const input = JSON.stringify({
    naming_request: { resource_type: "no_such_resource_type", convention: "aws-workload-default" },
    evaluation_context: {},
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /Unknown resource_type: "no_such_resource_type"/);
});

test("evaluate: an unknown convention is a transport failure — non-zero exit, empty stdout", async () => {
  const input = JSON.stringify({
    naming_request: { resource_type: "aws_s3_bucket", convention: "no-such-convention" },
    evaluation_context: {},
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /Unknown convention: "no-such-convention"/);
});

// --- evaluate: malformed transport ------------------------------------------------------

test("evaluate: malformed JSON input is a transport failure — non-zero exit, empty stdout, no stack trace", async () => {
  const { exitCode, stdout, stderr } = await runCli(["evaluate"], "{ this is not JSON");

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, "Malformed JSON input on stdin.\n");
});

test("evaluate: a JSON array root is a transport failure", async () => {
  const { exitCode, stdout, stderr } = await runCli(["evaluate"], "[]");

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, "JSON input must be an object.\n");
});

test("evaluate: an unknown top-level field is a transport failure", async () => {
  const input = JSON.stringify({
    naming_request: { resource_type: "aws_s3_bucket", convention: "aws-workload-default" },
    evaluation_context: {},
    convention_pack: { id: "aws-workload-default" },
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, 'Unknown field "convention_pack" in JSON input.\n');
});

test("evaluate: a missing naming_request is a transport failure", async () => {
  const input = JSON.stringify({ evaluation_context: {} });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, 'JSON input is missing a required "naming_request" object.\n');
});

test("evaluate: a naming_request as an array is a transport failure", async () => {
  const input = JSON.stringify({ naming_request: [], evaluation_context: {} });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, 'JSON input is missing a required "naming_request" object.\n');
});

test("evaluate: a missing naming_request.resource_type is a transport failure", async () => {
  const input = JSON.stringify({
    naming_request: { convention: "aws-workload-default" },
    evaluation_context: {},
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /resource_type/);
});

test("evaluate: an empty naming_request.resource_type is a transport failure", async () => {
  const input = JSON.stringify({
    naming_request: { resource_type: "", convention: "aws-workload-default" },
    evaluation_context: {},
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /resource_type/);
});

test("evaluate: a missing naming_request.convention is a transport failure", async () => {
  const input = JSON.stringify({
    naming_request: { resource_type: "aws_s3_bucket" },
    evaluation_context: {},
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /convention/);
});

test("evaluate: an empty naming_request.convention is a transport failure", async () => {
  const input = JSON.stringify({
    naming_request: { resource_type: "aws_s3_bucket", convention: "" },
    evaluation_context: {},
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.match(stderr, /convention/);
});

test("evaluate: a missing evaluation_context is a transport failure", async () => {
  const input = JSON.stringify({
    naming_request: { resource_type: "aws_s3_bucket", convention: "aws-workload-default" },
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, 'JSON input is missing a required "evaluation_context" object.\n');
});

test("evaluate: an evaluation_context as an array is a transport failure", async () => {
  const input = JSON.stringify({
    naming_request: { resource_type: "aws_s3_bucket", convention: "aws-workload-default" },
    evaluation_context: [],
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.notEqual(exitCode, 0);
  assert.equal(stdout, "");
  assert.equal(stderr, 'JSON input is missing a required "evaluation_context" object.\n');
});

// --- evaluate: malformed nested values do not crash core -------------------------------

test("evaluate: a wrong-typed naming_request.overrides does not crash core and still completes", async () => {
  const input = JSON.stringify({
    naming_request: {
      resource_type: "aws_s3_bucket",
      convention: "aws-workload-default",
      overrides: "not-an-object",
    },
    evaluation_context: {
      shared_organizational_context: { system: "telemetry-platform" },
      shared_deployment_context: { environment: "production" },
    },
  });

  const { exitCode, stdout, stderr } = await runCli(["evaluate"], input);

  assert.equal(exitCode, 0);
  assert.equal(stderr, "");

  const result = JSON.parse(stdout);
  assert.equal(typeof result.validation.valid, "boolean");
});

// --- evaluate: deterministic output ----------------------------------------------------

test("evaluate: the same stdin input produces byte-for-byte identical stdout across two runs", async () => {
  const first = await runCli(["evaluate"], VALID_INPUT);
  const second = await runCli(["evaluate"], VALID_INPUT);

  assert.equal(first.exitCode, 0);
  assert.equal(second.exitCode, 0);
  assert.equal(first.stdout, second.stdout);
});
