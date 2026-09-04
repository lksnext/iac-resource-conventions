#!/usr/bin/env node

// Reproduces the release-readiness tarball smoke test manually performed for
// Milestone 4.5: pack the three publishable packages, install only those tarballs
// into a fresh consumer project outside the repository, and prove each package works
// as an external dependency (not a workspace symlink). Built entirely on Node.js
// built-ins plus the `npm` CLI already required by this repository — no new
// dependency. See IMPLEMENTATION.md#release-readiness for the full rationale.
//
// Usage: node scripts/smoke-test-packages.mjs

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..");

const PACKAGES = ["core", "catalog", "cli"];

function run(command, args, cwd) {
  console.log(`+ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, { cwd, stdio: "pipe", encoding: "utf8" });
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

  console.log("\nAll package smoke tests passed.");
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
