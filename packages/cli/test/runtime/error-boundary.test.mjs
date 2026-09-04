// Unit tests for the corrected unexpected-error boundary shared by `evaluate` and
// `terraform-external` (Milestone 4.4: Terraform External Integration; fixes a
// Milestone 4.3 bug — see docs/architecture/cli.md#exit-codes).
//
// Both commands must not mislabel a genuine, unexpected internal error (anything that
// is not a `CliError`) as "Malformed input.": that would hide real bugs behind a
// misleading transport-failure message. Reproducing such an error end-to-end is not
// practical — core's Context Resolution deliberately never throws for malformed
// nested input (see ../../src/internal/parse-evaluate-request.ts) — so this file
// substitutes the internal parser each command calls with one that throws a plain
// `Error`, using `node:test`'s module mocking, and asserts the command rethrows it
// unchanged instead of catching and relabeling it. `cli.ts`'s own top-level `.catch()`
// is what ultimately reports a rethrown error, with its stack trace, to stderr.

import assert from "node:assert/strict";
import { test } from "node:test";

// `t.mock.module()` resolves its specifier the same way `import()` does, so it must be
// given a `file://` URL string (always forward-slashed) rather than an OS-native path —
// on Windows, an `fileURLToPath()`-derived path uses backslashes, which does not match
// the forward-slashed URL that the relative imports below resolve to, silently
// preventing the mock from being installed.
const PARSE_EVALUATE_REQUEST_SPECIFIER = new URL(
  "../../dist/internal/parse-evaluate-request.js",
  import.meta.url,
).href;
const PARSE_TERRAFORM_EXTERNAL_QUERY_SPECIFIER = new URL(
  "../../dist/internal/parse-terraform-external-query.js",
  import.meta.url,
).href;

/** Temporarily replaces `process.stdin` with a fake, empty async-iterable stream. */
function withEmptyStdin(run) {
  const original = process.stdin;
  const fake = { [Symbol.asyncIterator]: async function* () {} };
  Object.defineProperty(process, "stdin", { value: fake, configurable: true });
  return run().finally(() => {
    Object.defineProperty(process, "stdin", { value: original, configurable: true });
  });
}

test("evaluate: an unexpected (non-CliError) internal error is rethrown, not mislabeled", async (t) => {
  t.mock.module(PARSE_EVALUATE_REQUEST_SPECIFIER, {
    namedExports: {
      parseEvaluateRequest: () => {
        throw new Error("boom: unexpected internal failure");
      },
    },
  });

  const { runEvaluateCommand } = await import("../../dist/commands/evaluate.js");

  await withEmptyStdin(() =>
    assert.rejects(() => runEvaluateCommand(), /boom: unexpected internal failure/),
  );
});

test("terraform-external: an unexpected (non-CliError) internal error is rethrown, not mislabeled", async (t) => {
  t.mock.module(PARSE_TERRAFORM_EXTERNAL_QUERY_SPECIFIER, {
    namedExports: {
      parseTerraformExternalQuery: () => {
        throw new Error("boom: unexpected internal failure");
      },
    },
  });

  const { runTerraformExternalCommand } = await import("../../dist/commands/terraform-external.js");

  await withEmptyStdin(() =>
    assert.rejects(() => runTerraformExternalCommand(), /boom: unexpected internal failure/),
  );
});
