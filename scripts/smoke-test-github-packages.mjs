#!/usr/bin/env node

// Real, post-publication consumer smoke test against GitHub Packages itself — not
// local tarballs (see scripts/smoke-test-packages.mjs for that, still run separately
// and unaffected by this script). Installs the just-published
// @lksnext/iac-conventions-cli@<version> from https://npm.pkg.github.com into a
// disposable consumer project, proves the resolved package graph (core, catalog,
// cli) came from that registry and not a local path, and exercises the installed
// binary's --version, evaluate, and terraform-external commands.
//
// Requires NODE_AUTH_TOKEN in the environment (a GitHub Actions GITHUB_TOKEN with
// packages:write, or a locally supplied, non-exposed, appropriately scoped GitHub
// token) — never written to a literal value in any file; only referenced by name in
// a disposable, untracked .npmrc via npm's environment-variable substitution.
//
// Usage: NODE_AUTH_TOKEN=... node scripts/smoke-test-github-packages.mjs

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REGISTRY = "https://npm.pkg.github.com";
const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..");

if (!process.env.NODE_AUTH_TOKEN) {
  console.error("NODE_AUTH_TOKEN must be set in the environment to install from GitHub Packages.");
  process.exit(1);
}

const { version } = JSON.parse(
  readFileSync(join(repoRoot, "packages", "cli", "package.json"), "utf8"),
);

// Same valid deterministic identity/context used by
// scripts/smoke-test-packages.mjs and examples/terraform/external/main.tf.
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

function runCli(bin, args, cwd, input) {
  console.log(`+ ${bin} ${args.join(" ")}`);
  const result = spawnSync(bin, args, { cwd, input, encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  return result;
}

const consumerDir = mkdtempSync(join(tmpdir(), "iac-conventions-github-packages-smoke-"));

try {
  writeFileSync(
    join(consumerDir, "package.json"),
    JSON.stringify(
      { name: "github-packages-smoke-consumer", version: "0.0.0", private: true },
      null,
      2,
    ),
  );
  // Only the (non-secret) scope routing is written literally; the token is a
  // reference to the environment variable, substituted by npm at read time — never
  // a literal secret in this file.
  writeFileSync(
    join(consumerDir, ".npmrc"),
    `@lksnext:registry=${REGISTRY}\n//npm.pkg.github.com/:_authToken=\${NODE_AUTH_TOKEN}\n`,
  );

  run(
    "npm",
    [
      "install",
      "--userconfig",
      join(consumerDir, ".npmrc"),
      `@lksnext/iac-conventions-cli@${version}`,
    ],
    consumerDir,
  );

  const lockfile = JSON.parse(readFileSync(join(consumerDir, "package-lock.json"), "utf8"));
  for (const name of [
    "@lksnext/iac-conventions-core",
    "@lksnext/iac-conventions-catalog",
    "@lksnext/iac-conventions-cli",
  ]) {
    const entry = lockfile.packages?.[`node_modules/${name}`];
    if (!entry) {
      throw new Error(`expected ${name} to be present in the installed package-lock.json`);
    }
    if (entry.version !== version) {
      throw new Error(`expected ${name}@${version}, got ${name}@${entry.version}`);
    }
    if (!entry.resolved?.startsWith(`${REGISTRY}/`)) {
      throw new Error(
        `expected ${name} to resolve from ${REGISTRY}, got resolved="${entry.resolved}" — ` +
          "this must never be a local workspace path, a local tarball, npmjs.org, or Nexus",
      );
    }
  }
  console.log(
    "Installed package graph verified: core, catalog, and cli all resolved from",
    REGISTRY,
  );

  const cliBin = join(consumerDir, "node_modules", ".bin", "iac-conventions");
  const cliVersion = run(cliBin, ["--version"], consumerDir).trim();
  if (cliVersion !== version) {
    throw new Error(`expected installed CLI version "${version}", got "${cliVersion}"`);
  }
  console.log("cli --version smoke OK:", cliVersion);

  const evaluateResult = runCli(
    cliBin,
    ["evaluate"],
    consumerDir,
    JSON.stringify(VALID_NAMING_REQUEST),
  );
  if (evaluateResult.status !== 0 || evaluateResult.stderr !== "") {
    throw new Error(
      `installed CLI evaluate exited ${evaluateResult.status}, stderr: ${evaluateResult.stderr}`,
    );
  }
  const evaluateOutput = JSON.parse(evaluateResult.stdout);
  if (evaluateOutput.outputs?.name !== EXPECTED_NAME || evaluateOutput.validation?.valid !== true) {
    throw new Error(`unexpected installed CLI evaluate output: ${evaluateResult.stdout}`);
  }
  console.log("cli evaluate smoke OK:", evaluateOutput.outputs.name);

  const requestJson = JSON.stringify(VALID_NAMING_REQUEST);
  const terraformResult = runCli(
    cliBin,
    ["terraform-external"],
    consumerDir,
    JSON.stringify({ request_json: requestJson }),
  );
  if (terraformResult.status !== 0 || terraformResult.stderr !== "") {
    throw new Error(
      `installed CLI terraform-external exited ${terraformResult.status}, stderr: ` +
        `${terraformResult.stderr}`,
    );
  }
  const terraformOutput = JSON.parse(terraformResult.stdout);
  if (terraformOutput.name !== EXPECTED_NAME || terraformOutput.valid !== "true") {
    throw new Error(
      `unexpected installed CLI terraform-external output: ${terraformResult.stdout}`,
    );
  }
  console.log("cli terraform-external smoke OK:", terraformOutput.name);

  console.log("All GitHub Packages post-publication smoke tests passed.");
} finally {
  rmSync(consumerDir, { recursive: true, force: true });
}
