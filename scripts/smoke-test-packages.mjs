#!/usr/bin/env node

// Reproduces the release-readiness tarball smoke test manually performed for
// Milestone 4.5, and extended in Milestone 4.5.1 to close a coverage gap found in
// post-release-readiness review: pack the three publishable packages, install only
// those tarballs into a fresh consumer project outside the repository, and prove each
// package works as an external dependency (not a workspace symlink), including the
// installed CLI binary's `evaluate` and `terraform-external` commands — not only
// `--version`. Built entirely on Node.js built-ins plus the `npm` CLI already required
// by this repository — no new dependency. See IMPLEMENTATION.md#release-readiness for
// the full rationale.
//
// Usage: node scripts/smoke-test-packages.mjs

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..");

const PACKAGES = ["core", "catalog", "cli"];

// The same valid deterministic identity/context used by
// packages/cli/test/runtime/terraform-external.test.mjs and
// examples/terraform/external/main.tf, so this script asserts against the same
// normative expected name those already establish.
const VALID_NAMING_REQUEST = {
  naming_request: {
    convention: "aws-workload-default",
    resource_type: "aws_iam_role",
    functional: { service: "ingestion" },
  },
  evaluation_context: {
    shared_organizational_context: { system: "telemetry-platform" },
    shared_deployment_context: { environment: "production" },
  },
};
const EXPECTED_NAME = "telemetry-platform-ingestion-prod-aws_iam_role";

function run(command, args, cwd) {
  console.log(`+ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, { cwd, stdio: "pipe", encoding: "utf8" });
}

/** Runs the installed CLI binary as a real process, capturing exit code and stderr
 * separately (unlike `run`, which throws on a non-zero exit and cannot assert an
 * empty stderr on success). Never invokes `packages/cli/dist/cli.js` or any
 * repository source directly — `bin` must always be the tarball-installed binary. */
function runCli(bin, args, cwd, input) {
  console.log(`+ ${bin} ${args.join(" ")}`);
  const result = spawnSync(bin, args, { cwd, input, encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  return result;
}

const workDir = mkdtempSync(join(tmpdir(), "iac-conventions-smoke-"));
const tarballDir = join(workDir, "tarballs");
const consumerDir = join(workDir, "consumer");

try {
  run("node", ["-e", "require('node:fs').mkdirSync(process.argv[1],{recursive:true})", tarballDir]);
  run("node", [
    "-e",
    "require('node:fs').mkdirSync(process.argv[1],{recursive:true})",
    consumerDir,
  ]);

  const tarballs = [];
  for (const pkg of PACKAGES) {
    const output = run(
      "npm",
      ["pack", "--pack-destination", tarballDir, join(repoRoot, "packages", pkg)],
      repoRoot,
    );
    const fileName = output.trim().split("\n").pop();
    tarballs.push(join(tarballDir, fileName));
  }

  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify({ name: "smoke-consumer", version: "0.0.0", private: true }, null, 2),
  );
  run("npm", ["install", "--offline", "--no-save", ...tarballs], consumerDir);

  writeFileSync(
    join(consumerDir, "smoke.mjs"),
    `import { evaluate } from "@lksnext/iac-conventions-core";
import { getConventionPack, getResourceDefinition } from "@lksnext/iac-conventions-catalog";

const conventionPack = getConventionPack("aws-workload-default");
const resourceDefinition = getResourceDefinition("aws_iam_role");
if (conventionPack === undefined || resourceDefinition === undefined) {
  throw new Error("expected catalog lookups to resolve");
}

const result = evaluate({
  naming_request: {
    convention: "aws-workload-default",
    resource_type: "aws_iam_role",
    functional: { service: "ingestion" },
  },
  convention_pack: conventionPack,
  evaluation_context: {
    shared_organizational_context: { system: "telemetry-platform" },
    shared_deployment_context: { environment: "production" },
  },
  resource_definition: resourceDefinition,
});

const expected = "telemetry-platform-ingestion-prod-aws_iam_role";
if (result.outputs?.name !== expected) {
  throw new Error(\`expected "\${expected}", got \${JSON.stringify(result.outputs?.name)}\`);
}
console.log("core+catalog smoke OK:", result.outputs.name);
`,
  );
  run("node", ["smoke.mjs"], consumerDir);
  console.log("core+catalog smoke test passed.");

  const version = JSON.parse(
    run(
      "node",
      ["-p", "JSON.stringify(require('./package.json').version)"],
      join(repoRoot, "packages", "cli"),
    ),
  );
  const cliBin = join(consumerDir, "node_modules", ".bin", "iac-conventions");
  const cliVersion = run(cliBin, ["--version"], consumerDir).trim();
  if (cliVersion !== version) {
    throw new Error(`expected installed CLI version "${version}", got "${cliVersion}"`);
  }
  console.log("cli --version smoke OK:", cliVersion);

  // Installed `iac-conventions evaluate`, run as a real process through the tarball-
  // installed binary — proves the installed CLI -> catalog -> core package graph
  // resolves entirely from node_modules, not a workspace symlink.
  const evaluateResult = runCli(
    cliBin,
    ["evaluate"],
    consumerDir,
    JSON.stringify(VALID_NAMING_REQUEST),
  );
  if (evaluateResult.status !== 0) {
    throw new Error(
      `installed CLI evaluate exited ${evaluateResult.status}, stderr: ${evaluateResult.stderr}`,
    );
  }
  if (evaluateResult.stderr !== "") {
    throw new Error(`installed CLI evaluate wrote to stderr: ${evaluateResult.stderr}`);
  }
  const evaluateOutput = JSON.parse(evaluateResult.stdout);
  if (evaluateOutput.outputs?.name !== EXPECTED_NAME) {
    throw new Error(
      `expected installed CLI evaluate name "${EXPECTED_NAME}", got ` +
        `${JSON.stringify(evaluateOutput.outputs?.name)}`,
    );
  }
  if (evaluateOutput.validation?.valid !== true) {
    throw new Error("expected installed CLI evaluate validation.valid to be true");
  }
  console.log("cli evaluate smoke OK:", evaluateOutput.outputs.name);

  // Installed `iac-conventions terraform-external`, fed the real HashiCorp `external`
  // provider transport shape ({ request_json: "<JSON string>" }) — proves the actual
  // packaged Terraform bridge, not only the generic `evaluate` command.
  const requestJson = JSON.stringify(VALID_NAMING_REQUEST);
  const terraformResult = runCli(
    cliBin,
    ["terraform-external"],
    consumerDir,
    JSON.stringify({ request_json: requestJson }),
  );
  if (terraformResult.status !== 0) {
    throw new Error(
      `installed CLI terraform-external exited ${terraformResult.status}, stderr: ` +
        `${terraformResult.stderr}`,
    );
  }
  if (terraformResult.stderr !== "") {
    throw new Error(`installed CLI terraform-external wrote to stderr: ${terraformResult.stderr}`);
  }
  const terraformOutput = JSON.parse(terraformResult.stdout);
  for (const [key, value] of Object.entries(terraformOutput)) {
    if (typeof value !== "string") {
      throw new Error(
        `expected terraform-external output field "${key}" to be a string, got ${typeof value}`,
      );
    }
  }
  if (terraformOutput.name !== EXPECTED_NAME) {
    throw new Error(
      `expected installed CLI terraform-external name "${EXPECTED_NAME}", got ` +
        `${JSON.stringify(terraformOutput.name)}`,
    );
  }
  if (terraformOutput.valid !== "true") {
    throw new Error(
      `expected installed CLI terraform-external valid "true", got ${JSON.stringify(terraformOutput.valid)}`,
    );
  }
  const terraformResultJson = JSON.parse(terraformOutput.result_json);
  if (terraformResultJson.outputs?.name !== terraformOutput.name) {
    throw new Error("expected result_json.outputs.name to equal the top-level name");
  }
  if (terraformResultJson.validation?.valid !== true) {
    throw new Error("expected result_json.validation.valid to be true");
  }
  console.log("cli terraform-external smoke OK:", terraformOutput.name);

  // A small, secondary domain-invalid case (an over-length generated name), proving
  // packaging has not changed the established exit-code semantics: a domain-invalid
  // ConventionResult still exits 0, it is not a CLI/transport failure.
  const invalidRequestJson = JSON.stringify({
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
  const invalidResult = runCli(
    cliBin,
    ["terraform-external"],
    consumerDir,
    JSON.stringify({ request_json: invalidRequestJson }),
  );
  if (invalidResult.status !== 0) {
    throw new Error(
      `expected a domain-invalid result to still exit 0, got ${invalidResult.status}`,
    );
  }
  if (invalidResult.stderr !== "") {
    throw new Error(
      `installed CLI wrote to stderr for a domain-invalid result: ${invalidResult.stderr}`,
    );
  }
  const invalidOutput = JSON.parse(invalidResult.stdout);
  if (invalidOutput.valid !== "false") {
    throw new Error(
      `expected domain-invalid smoke case valid "false", got ${JSON.stringify(invalidOutput.valid)}`,
    );
  }
  console.log("cli domain-invalid smoke OK: exit 0 with valid=false");

  console.log("\nAll package smoke tests passed.");
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
