#!/usr/bin/env node

// Copies the repository root's LICENSE and NOTICE files into a publishable package
// directory before `npm pack`/`npm publish`. npm does not walk up to parent
// directories to find LICENSE/NOTICE for a workspace package, so a tarball built from
// `packages/*` without this step would ship with no license text at all. Run as each
// publishable package's own `prepack` lifecycle script (see package.json), so a
// standalone `npm pack --dry-run` or `npm publish` from within that package directory
// always produces a correctly licensed artifact.
//
// The copies are intentionally not committed (see .gitignore) to avoid maintaining
// multiple, potentially drifting copies of the same license text; the root LICENSE and
// NOTICE remain the single source of truth.
//
// Usage: node scripts/copy-license-notice.mjs <path-to-package-dir>

import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(scriptDir, "..");

const targetArg = process.argv[2];
if (!targetArg) {
  console.error("Usage: node scripts/copy-license-notice.mjs <path-to-package-dir>");
  process.exit(1);
}

const targetDir = join(process.cwd(), targetArg);

for (const fileName of ["LICENSE", "NOTICE"]) {
  copyFileSync(join(repoRoot, fileName), join(targetDir, fileName));
}
