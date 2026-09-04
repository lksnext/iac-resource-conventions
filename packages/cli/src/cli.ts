#!/usr/bin/env node
// The `@lksnext/iac-conventions-cli` binary entry point (Milestone 4.1: CLI Package
// Foundation). Published as `iac-conventions` (see `package.json`'s `bin` field and
// docs/architecture/cli.md).
//
// This module owns only command dispatch, `--help`, and `--version` — the smallest
// stable surface this milestone requires (see docs/architecture/cli.md). It contains
// no naming, validation, Context Resolution, or provider-rule logic: every domain
// decision belongs to `@lksnext/iac-conventions-core`'s `evaluate()`, reached through
// `./commands/evaluate.js`.
//
// Argument parsing uses Node's built-in `node:util.parseArgs`: the command surface this
// milestone needs (`--help`, `--version`, one subcommand) does not justify a CLI
// framework dependency (see docs/architecture/cli.md#cli-framework-decision).

import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { runEvaluateCommand } from "./commands/evaluate.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const HELP_TEXT = `Usage: iac-conventions <command> [options]

Commands:
  evaluate    Evaluate a Naming Request read as JSON from stdin, and write the
              resulting ConventionResult as JSON to stdout.

Options:
  -h, --help     Show this help message and exit.
  -v, --version  Show the installed package version and exit.

Input (evaluate):
  A JSON object on stdin with exactly two fields: "naming_request" (including
  "resource_type" and "convention") and "evaluation_context". "resource_type"
  is looked up in @lksnext/iac-conventions-catalog to obtain the
  ResourceDefinition, and "convention" is looked up there to obtain the
  ConventionPack — neither is supplied by the caller in full.

Output (evaluate):
  The public ConventionResult, as JSON, on stdout. Nothing else is written to
  stdout.

Exit codes:
  0  The command completed, including a domain-invalid ConventionResult
     (validation.valid === false is a successful evaluation outcome, not a
     CLI/transport failure).
  1  A CLI/transport failure: malformed JSON, an unknown top-level field, a
     missing or invalid required field, an unknown resource_type, an unknown
     convention, or an unexpected internal error.
`;

/** Parses `argv` and dispatches to the requested command. Exported for testing. */
export async function runCli(argv: readonly string[]): Promise<number> {
  let parsed: { values: { help?: boolean; version?: boolean }; positionals: string[] };
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  if (parsed.values.version) {
    process.stdout.write(`${version}\n`);
    return 0;
  }

  if (parsed.values.help) {
    process.stdout.write(HELP_TEXT);
    return 0;
  }

  const [command] = parsed.positionals;

  if (command === "evaluate") {
    return runEvaluateCommand();
  }

  if (command === undefined) {
    process.stderr.write(`A command is required.\n\n${HELP_TEXT}`);
    return 1;
  }

  process.stderr.write(`Unknown command: "${command}"\n\n${HELP_TEXT}`);
  return 1;
}

runCli(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    process.exitCode = 1;
  });
