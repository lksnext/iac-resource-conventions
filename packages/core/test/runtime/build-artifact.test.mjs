// Runtime checks against the actual built package artifact (`dist/`).
//
// These complement the compile-time contract fixtures in ../types/contract-fixtures.ts:
// since the Executable Domain Model is entirely type-only (no runtime values besides
// the pre-existing CORE_PACKAGE_NAME constant), "public export availability" for the
// model itself is a compile-time concern, not a runtime one — type-only exports leave
// no trace in the built JavaScript. What *can* be verified at runtime is that the
// build produces the expected artifact shape: no unexpected runtime exports leak from
// a type-only model, a declaration file is generated, and no production dependency was
// introduced.
//
// Requires `npm run build` to have already produced `dist/` (see package.json#test,
// which runs `build` before this file).

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const distIndex = path.join(packageRoot, "dist", "index.js");
const distDeclaration = path.join(packageRoot, "dist", "index.d.ts");

test("the built package exposes only its intentional runtime surface", async () => {
  const builtModule = await import(distIndex);

  assert.deepEqual(
    Object.keys(builtModule).sort(),
    ["CORE_PACKAGE_NAME"],
    "the Executable Domain Model is type-only; it must not add runtime exports",
  );
  assert.equal(builtModule.CORE_PACKAGE_NAME, "@lksnext/iac-conventions-core");
});

test("the build generates a declaration file for the package root", () => {
  assert.equal(existsSync(distDeclaration), true);
});

test("the package declares no production dependencies", async () => {
  const packageJsonPath = path.join(packageRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

  assert.deepEqual(packageJson.dependencies ?? {}, {});
});
