#!/usr/bin/env node
// Recursively validates that every .json file under a target directory parses as valid JSON.
//
// Uses Node.js built-in modules only (no external dependencies). Intended to run
// consistently on Linux, macOS, Windows, Dev Containers, and CI.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..");
const targetDir = join(repoRoot, "specification");

const ignoredDirNames = new Set([".git", "node_modules", ".terraform", "dist", "build", ".serena"]);

/**
 * Recursively collects .json file paths under `dir`, skipping ignored directories
 * and not following symbolic links.
 */
function collectJsonFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  // Sort for deterministic output regardless of filesystem ordering.
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirNames.has(entry.name)) {
        continue;
      }
      collectJsonFiles(fullPath, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  let jsonFiles;
  try {
    jsonFiles = collectJsonFiles(targetDir);
  } catch (error) {
    console.error(`Failed to read directory "${relative(repoRoot, targetDir)}": ${error.message}`);
    process.exitCode = 1;
    return;
  }

  let hasErrors = false;

  for (const filePath of jsonFiles) {
    const displayPath = relative(repoRoot, filePath);
    let contents;

    try {
      contents = readFileSync(filePath, "utf8");
    } catch (error) {
      hasErrors = true;
      console.error(`✗ ${displayPath}: unable to read file (${error.message})`);
      continue;
    }

    try {
      JSON.parse(contents);
      console.log(`✓ ${displayPath}`);
    } catch (error) {
      hasErrors = true;
      console.error(`✗ ${displayPath}: ${error.message}`);
    }
  }

  if (jsonFiles.length === 0) {
    console.log(`No .json files found under ${relative(repoRoot, targetDir)}.`);
  }

  if (hasErrors) {
    console.error("\nJSON validation failed.");
    process.exitCode = 1;
    return;
  }

  console.log(`\nAll ${jsonFiles.length} JSON file(s) parsed successfully.`);
}

// Also validate package.json itself, since it is part of the repository's JSON surface.
function validatePackageJson() {
  const packageJsonPath = join(repoRoot, "package.json");
  const displayPath = relative(repoRoot, packageJsonPath);

  try {
    const contents = readFileSync(packageJsonPath, "utf8");
    JSON.parse(contents);
    console.log(`✓ ${displayPath}`);
    return true;
  } catch (error) {
    console.error(`✗ ${displayPath}: ${error.message}`);
    return false;
  }
}

if (statSync(targetDir, { throwIfNoEntry: false })?.isDirectory()) {
  const packageJsonOk = validatePackageJson();
  main();
  if (!packageJsonOk) {
    process.exitCode = 1;
  }
} else {
  console.error(`Target directory "${relative(repoRoot, targetDir)}" does not exist.`);
  process.exitCode = 1;
}
