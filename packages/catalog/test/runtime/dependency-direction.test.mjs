// Static package-boundary check for the Resource Definition Catalog (Milestone 3.1).
//
// Enforces the intended dependency direction (see
// docs/architecture/resource-definition-catalog.md#dependency-direction):
//
//   core
//     ^
//   catalog
//
// catalog may depend on core; core must never depend on catalog. This is verified
// structurally, from package.json dependencies and source import specifiers, the same
// way packages/core/test/runtime/model-independence.test.mjs verifies the model/
// evaluator boundary directly — no dependency-cruiser or other new tooling is
// introduced (see IMPLEMENTATION.md#status).

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const catalogRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const packagesRoot = path.dirname(catalogRoot);
const coreRoot = path.join(packagesRoot, "core");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function collectSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectSourceFiles(entryPath);
      }
      return entry.name.endsWith(".ts") ? [entryPath] : [];
    }),
  );
  return files.flat();
}

test("catalog's package.json depends on core", async () => {
  const catalogPackageJson = await readJson(path.join(catalogRoot, "package.json"));

  assert.ok(
    catalogPackageJson.dependencies?.["@lksnext/iac-conventions-core"],
    "packages/catalog/package.json must declare a dependency on @lksnext/iac-conventions-core",
  );
});

test("core's package.json does not depend on catalog", async () => {
  const corePackageJson = await readJson(path.join(coreRoot, "package.json"));
  const allDependencyNames = [
    ...Object.keys(corePackageJson.dependencies ?? {}),
    ...Object.keys(corePackageJson.devDependencies ?? {}),
  ];

  assert.ok(
    !allDependencyNames.includes("@lksnext/iac-conventions-catalog"),
    "packages/core/package.json must never depend on @lksnext/iac-conventions-catalog",
  );
});

test("catalog declares no provider SDK dependency", async () => {
  const catalogPackageJson = await readJson(path.join(catalogRoot, "package.json"));
  const allDependencyNames = [
    ...Object.keys(catalogPackageJson.dependencies ?? {}),
    ...Object.keys(catalogPackageJson.devDependencies ?? {}),
  ];
  const providerSdkPattern = /^@aws-sdk\/|^@azure\/|^aws-sdk$|kubernetes|terraform/i;

  const offending = allDependencyNames.filter((name) => providerSdkPattern.test(name));
  assert.deepEqual(offending, [], `catalog must declare no provider SDK dependency: ${offending}`);
});

test("no core source file imports from the catalog", async () => {
  const coreModelAndEvaluatorRoot = path.join(coreRoot, "src");
  const coreFiles = await collectSourceFiles(coreModelAndEvaluatorRoot);
  assert.ok(coreFiles.length > 0, "expected to find core source files to check");

  const offendingImports = [];
  for (const filePath of coreFiles) {
    const contents = await readFile(filePath, "utf8");
    const importSpecifiers = [...contents.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    for (const specifier of importSpecifiers) {
      if (specifier.includes("catalog")) {
        offendingImports.push(`${path.relative(packagesRoot, filePath)} imports "${specifier}"`);
      }
    }
  }

  assert.deepEqual(
    offendingImports,
    [],
    `core must never import from the catalog: ${offendingImports.join(", ")}`,
  );
});

test("catalog source only imports from core or relative catalog modules", async () => {
  const catalogSrcRoot = path.join(catalogRoot, "src");
  const catalogFiles = await collectSourceFiles(catalogSrcRoot);
  assert.ok(catalogFiles.length > 0, "expected to find catalog source files to check");

  const offendingImports = [];
  for (const filePath of catalogFiles) {
    const contents = await readFile(filePath, "utf8");
    const importSpecifiers = [...contents.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    for (const specifier of importSpecifiers) {
      const isRelative = specifier.startsWith(".");
      const isCore = specifier === "@lksnext/iac-conventions-core";
      if (!isRelative && !isCore) {
        offendingImports.push(`${path.relative(packagesRoot, filePath)} imports "${specifier}"`);
      }
    }
  }

  assert.deepEqual(
    offendingImports,
    [],
    `catalog source must only import from core or its own relative modules: ${offendingImports.join(", ")}`,
  );
});
