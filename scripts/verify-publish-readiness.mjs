#!/usr/bin/env node

// Offline, non-mutating pre-publish gate for the coordinated GitHub Packages alpha
// release: synchronized versions across core/catalog/cli, exact-pinned internal
// dependencies (no semver ranges, no workspace:/file:/link: references), each
// package's publishConfig.registry pointing at GitHub Packages (never
// registry.npmjs.org or a Nexus registry), the repository-root .npmrc routing the
// @lksnext scope there too, and correct repository metadata for GitHub Packages
// association. Run before any `npm publish`; never touches the network.
//
// Usage: node scripts/verify-publish-readiness.mjs

import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

const EXPECTED_REGISTRY = "https://npm.pkg.github.com";
const EXPECTED_REPO_URL = "git+https://github.com/lksnext/iac-resource-conventions.git";

const PACKAGE_DIRS = {
  core: "packages/core",
  catalog: "packages/catalog",
  cli: "packages/cli",
};

function readPackageJson(dir) {
  return JSON.parse(readFileSync(path.join(process.cwd(), dir, "package.json"), "utf8"));
}

const packages = Object.fromEntries(
  Object.entries(PACKAGE_DIRS).map(([key, dir]) => [key, { dir, json: readPackageJson(dir) }]),
);

const errors = [];

// Section 10: synchronized versions across all three packages.
const versions = new Set(Object.values(packages).map(({ json }) => json.version));
if (versions.size !== 1) {
  errors.push(
    `Package versions are not synchronized: ${Object.entries(packages)
      .map(([key, { json }]) => `${key}=${json.version}`)
      .join(", ")}`,
  );
}
const version = packages.core.json.version;

// Section 11: exact-pinned internal dependencies, no ranges, no workspace/file/link
// references.
function checkDependency(consumerKey, dependencyName) {
  const consumer = packages[consumerKey].json;
  const actual = consumer.dependencies?.[dependencyName];
  if (actual === undefined) {
    errors.push(`${consumer.name} is missing an expected dependency on ${dependencyName}`);
    return;
  }
  if (/^(workspace:|file:|link:)/.test(actual)) {
    errors.push(
      `${consumer.name} depends on ${dependencyName} via an unexpected reference (${actual})`,
    );
    return;
  }
  if (actual !== version) {
    errors.push(
      `${consumer.name} depends on ${dependencyName}@${actual}, expected an exact pin of ${version}`,
    );
  }
}

checkDependency("catalog", "@lksnext/iac-conventions-core");
checkDependency("cli", "@lksnext/iac-conventions-core");
checkDependency("cli", "@lksnext/iac-conventions-catalog");

// Section 12: registry routing — publishConfig.registry and the repository-root
// .npmrc scope routing.
for (const { json } of Object.values(packages)) {
  const registry = json.publishConfig?.registry;
  if (registry !== EXPECTED_REGISTRY) {
    errors.push(
      `${json.name} publishConfig.registry is '${registry ?? "unset"}', expected '${EXPECTED_REGISTRY}'`,
    );
  }
}

let npmrc = "";
try {
  npmrc = readFileSync(path.join(process.cwd(), ".npmrc"), "utf8");
} catch {
  errors.push(
    "Repository-root .npmrc is missing; expected it to route the @lksnext scope to GitHub Packages.",
  );
}
if (npmrc && !npmrc.includes(`@lksnext:registry=${EXPECTED_REGISTRY}`)) {
  errors.push(`Repository-root .npmrc does not contain '@lksnext:registry=${EXPECTED_REGISTRY}'`);
}

// Section 13: package metadata must point at this repository, unambiguously.
for (const { dir, json } of Object.values(packages)) {
  const repo = json.repository;
  if (repo?.type !== "git" || repo.url !== EXPECTED_REPO_URL) {
    errors.push(
      `${json.name} repository metadata is missing or incorrect (expected type "git", url "${EXPECTED_REPO_URL}")`,
    );
  } else if (repo.directory !== dir) {
    errors.push(`${json.name} repository.directory is '${repo.directory}', expected '${dir}'`);
  }
}

if (errors.length > 0) {
  console.error("Publish readiness checks FAILED:\n");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`Publish readiness checks passed. Synchronized version: ${version}`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
}
