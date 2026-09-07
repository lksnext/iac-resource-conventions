#!/usr/bin/env node

// Non-mutating GitHub Packages existence check, shared by two pre/post-publish
// gates: the collision check (run for all three packages, expecting "absent",
// before any `npm publish`) and the post-publish verification (run per package,
// expecting "present", after its own `npm publish`). Reads the package name and
// version to check directly from that package's own package.json, so the version
// checked can never drift from what was actually published. Never mutates registry
// state and never prints the auth token — only `npm view`'s own stdout/stderr.
//
// Note: GitHub Packages returns 404 both for "package/version genuinely does not
// exist" and for "the caller is not authorized to see it" — it does not distinguish
// the two the way registry.npmjs.org's 401/403 responses do. This script cannot
// perfectly tell those apart from a 404 alone; it relies on the workflow's
// GITHUB_TOKEN already being scoped to read/write this repository's own packages,
// so a 404 here is expected to mean "not yet published", not "unauthorized".
//
// Usage: node scripts/github-packages-check.mjs <package-dir> <absent|present>
// Example: node scripts/github-packages-check.mjs packages/core absent

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const REGISTRY = "https://npm.pkg.github.com";

const [, , packageDir, expect] = process.argv;
if (!packageDir || !["absent", "present"].includes(expect)) {
  console.error("Usage: node scripts/github-packages-check.mjs <package-dir> <absent|present>");
  process.exit(1);
}

const { name, version } = JSON.parse(
  readFileSync(path.join(process.cwd(), packageDir, "package.json"), "utf8"),
);
const spec = `${name}@${version}`;

let stdout = "";
let stderr = "";
let exists = false;
let inconclusive = false;

try {
  stdout = execFileSync("npm", ["view", spec, "version", "--registry", REGISTRY], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  exists = stdout.trim() === version;
} catch (error) {
  stderr = String(error.stderr ?? error.message ?? "");
  const is404 = /\bE404\b|404 Not Found/i.test(stderr);
  inconclusive = !is404;
}

if (inconclusive) {
  console.error(`Could not determine whether ${spec} exists on ${REGISTRY}.`);
  console.error(
    "The failure did not look like a 'not found' response (no E404), so this is being treated",
  );
  console.error(
    "as an authentication or network error rather than a safe 'does not exist' result:",
  );
  console.error(stderr.trim());
  process.exit(1);
}

if (expect === "absent") {
  if (exists) {
    console.error(
      `${spec} already exists on ${REGISTRY}. Refusing to publish over an existing version.`,
    );
    console.error("Prepare a new synchronized prerelease (for example 0.1.0-alpha.1) instead.");
    process.exit(1);
  }
  console.log(`OK: ${spec} does not yet exist on ${REGISTRY}.`);
} else {
  if (!exists) {
    console.error(
      `${spec} was not found on ${REGISTRY} after publishing. Publication may have failed or not yet propagated.`,
    );
    process.exit(1);
  }
  console.log(`OK: ${spec} is visible on ${REGISTRY}.`);
}
