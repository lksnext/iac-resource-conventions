// Static dependency-direction check for the Reference Evaluator's pipeline contracts
// (Milestone 2.1: Reference Evaluator Pipeline Contracts).
//
// The evaluator may depend on the domain model; the domain model must never depend on
// the evaluator (see docs/architecture/reference-evaluator.md#dependency-boundaries).
// This is verified by scanning every model source file's import specifiers directly,
// rather than by a build tool, since no project-references or dependency-cycle-
// detection tooling exists yet (see IMPLEMENTATION.md#deferred-decisions).

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const modelRoot = path.join(packageRoot, "src", "model");

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

test("no domain model file imports from the evaluator", async () => {
  const modelFiles = await collectSourceFiles(modelRoot);
  assert.ok(modelFiles.length > 0, "expected to find model source files to check");

  const offendingImports = [];
  for (const filePath of modelFiles) {
    const contents = await readFile(filePath, "utf8");
    const importSpecifiers = [...contents.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    for (const specifier of importSpecifiers) {
      if (specifier.includes("evaluator")) {
        offendingImports.push(`${path.relative(packageRoot, filePath)} imports "${specifier}"`);
      }
    }
  }

  assert.deepEqual(
    offendingImports,
    [],
    `the domain model must never import from the evaluator: ${offendingImports.join(", ")}`,
  );
});
