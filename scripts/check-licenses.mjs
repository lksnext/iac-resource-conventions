#!/usr/bin/env node

// Enforces the repository's dependency license allowlist policy.
//
// Uses license-checker-rseidelsohn (a local devDependency, not installed globally)
// to inventory every SPDX license expression present in the installed dependency
// tree, then checks each one against the allowlists below. Node.js built-ins only
// besides that one dependency; no shell-specific tooling, so this runs the same way
// on Linux, macOS, Windows, the Dev Container, and CI.
//
// Usage:
//   node scripts/check-licenses.mjs               Check every dependency (dev + production).
//   node scripts/check-licenses.mjs --production   Check only production dependencies.
//   node scripts/check-licenses.mjs --report       Print the full inventory; never fails.
//
// See CONTRIBUTING.md#dependency-license-compliance for the policy this enforces,
// including how to review and extend the allowlists below.

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "license-checker-rseidelsohn";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..");

const args = process.argv.slice(2);
const productionOnly = args.includes("--production");
const reportOnly = args.includes("--report");

// SPDX license identifiers allowed for any dependency, production or development.
// This list was verified against the repository's actual dependency tree (not
// assumed) — see CONTRIBUTING.md#dependency-license-compliance for the review
// process. Extend it only after manually confirming a new license's terms are
// compatible with this Apache-2.0 project.
const ALLOWED_LICENSES = new Set([
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "CC0-1.0",
  "BlueOak-1.0.0",
  // Python Software Foundation's permissive license, used by `argparse` (a
  // faithful port of Python's own argparse module) — OSI-approved, permissive.
  "Python-2.0",
  // Creative Commons Attribution-only license, used by `spdx-exceptions` for a
  // bundled JSON data file (not code) of SPDX license-exception text.
  "CC-BY-3.0",
]);

// SPDX identifiers allowed only for devDependencies — never acceptable for a
// production dependency, because these are share-alike/content licenses used
// here only for local developer tooling (for example a spell-check
// dictionary), not for any code shipped to consumers.
const DEV_ONLY_ALLOWED_LICENSES = new Set(["CC-BY-SA-4.0"]);

// Manual overrides for packages whose license metadata license-checker cannot
// resolve to a clean SPDX identifier on its own. Each entry was verified
// directly against that package's own `package.json`/LICENSE file. Keyed by
// `name@version` so a version bump requires re-verifying the override instead
// of silently carrying it forward.
const LICENSE_OVERRIDES = {
  "@cspell/dict-en-common-misspellings@2.1.13": "CC-BY-SA-4.0",
};

// This repository's own workspace packages report `UNLICENSED` because they
// are `"private": true` placeholders with no `license` field yet — they are
// not third-party dependencies, so `excludePrivatePackages` removes them from
// the report entirely rather than allowlisting `UNLICENSED` itself, which
// must otherwise remain treated as unacceptable.

/**
 * Splits a (non-nested) SPDX license expression into its parts and combinator.
 * The dependency tree here only contains simple `A`, `A OR B`, and `(A AND B)`
 * forms — no nested expressions — so a full SPDX expression parser is not
 * needed.
 */
function parseSpdxExpression(expression) {
  const cleaned = expression.replace(/[()]/g, "").trim();
  if (cleaned.includes(" AND ")) {
    return { operator: "AND", identifiers: cleaned.split(" AND ").map((part) => part.trim()) };
  }
  if (cleaned.includes(" OR ")) {
    return { operator: "OR", identifiers: cleaned.split(" OR ").map((part) => part.trim()) };
  }
  return { operator: "SINGLE", identifiers: [cleaned] };
}

function isExpressionAllowed(expression, allowedLicenses) {
  const { operator, identifiers } = parseSpdxExpression(expression);
  if (operator === "AND") {
    return identifiers.every((identifier) => allowedLicenses.has(identifier));
  }
  return identifiers.some((identifier) => allowedLicenses.has(identifier));
}

function runLicenseChecker(options) {
  return new Promise((resolve, reject) => {
    init(options, (error, packages) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(packages);
    });
  });
}

function main() {
  runLicenseChecker({
    start: repoRoot,
    production: productionOnly,
    excludePrivatePackages: true,
  })
    .then((packages) => {
      const entries = Object.entries(packages).sort(([a], [b]) => a.localeCompare(b));

      if (reportOnly) {
        for (const [packageId, info] of entries) {
          const license = LICENSE_OVERRIDES[packageId] ?? info.licenses ?? "UNKNOWN";
          console.log(`${packageId}\t${license}`);
        }
        return;
      }

      const allowedForScope = productionOnly
        ? ALLOWED_LICENSES
        : new Set([...ALLOWED_LICENSES, ...DEV_ONLY_ALLOWED_LICENSES]);

      const violations = [];

      for (const [packageId, info] of entries) {
        const license = LICENSE_OVERRIDES[packageId] ?? info.licenses;

        if (!license || !isExpressionAllowed(license, allowedForScope)) {
          violations.push({ packageId, license: license ?? "UNKNOWN" });
        }
      }

      const scopeLabel = productionOnly ? "production" : "all (production + development)";
      console.log(`Checked ${entries.length} ${scopeLabel} dependencies for license compliance.`);

      if (violations.length > 0) {
        console.error(
          `\n${violations.length} package(s) have a disallowed or unrecognized license:\n`,
        );
        for (const { packageId, license } of violations) {
          console.error(`  - ${packageId}: ${license}`);
        }
        console.error(
          "\nIf this license is actually acceptable, add it to the allowlist in " +
            "scripts/check-licenses.mjs after manual review (see " +
            "CONTRIBUTING.md#dependency-license-compliance). Do not add a package solely " +
            "because this check would otherwise pass — verify its use and distribution " +
            "model are compatible with this project.",
        );
        process.exitCode = 1;
        return;
      }

      console.log("All dependency licenses are allowed.");
    })
    .catch((error) => {
      console.error("Failed to run license-checker-rseidelsohn:", error.message);
      process.exitCode = 1;
    });
}

main();
