# `@lksnext/iac-conventions-cli`

Command-line adapter for the `iac-resource-conventions` Reference Evaluator.

## Status

Milestone 4.1 — CLI Package Foundation. This package establishes the minimal, stable
foundation for the `iac-conventions` executable: one command, `evaluate`, that proves
`CLI -> catalog -> core` works end-to-end. It does not yet implement a broad command
suite, Terraform-specific output, or a `catalog` subcommand — see
[`docs/architecture/cli.md`](../../docs/architecture/cli.md) for the full architecture,
design-gate decisions, and current limitations.

## Purpose and architecture boundary

This package is an **adapter**, not a domain implementation:

- It contains no naming, validation, Context Resolution, or provider-rule logic of its
  own.
- It orchestrates two existing public APIs: `@lksnext/iac-conventions-catalog`'s
  `getResourceDefinition` and `@lksnext/iac-conventions-core`'s `evaluate()`.
- Every domain decision — name generation, validation, failure codes — is made by
  `evaluate()`. This package only reads JSON, looks up a `ResourceDefinition`, calls
  `evaluate()`, and writes JSON.

Dependency direction: `cli -> core`, `cli -> catalog`, `catalog -> core`. `core` and
`catalog` never depend on `cli`.

## Install / run

This package is not published yet (`"private": true`). Within this repository:

```bash
npm run build --workspace=@lksnext/iac-conventions-cli
node packages/cli/dist/cli.js --help
```

Once published, the same binary is available as `iac-conventions` (see the `bin` field
in [`package.json`](package.json)).

## `evaluate` — stdin JSON input

```bash
echo '{
  "naming_request": {
    "convention": "aws-workload-default",
    "resource_type": "aws_s3_bucket",
    "functional": { "service": "ingestion" }
  },
  "convention_pack": {
    "id": "aws-workload-default",
    "naming_component_order": ["organizational.system", "functional.service"],
    "separator": "-"
  },
  "evaluation_context": {
    "shared_organizational_context": { "system": "telemetry-platform" }
  }
}' | node packages/cli/dist/cli.js evaluate
```

`naming_request.resource_type` is required — it is used to look up the
`ResourceDefinition` from `@lksnext/iac-conventions-catalog`. `convention_pack` must be
supplied in full: the repository has a Resource Definition Catalog but no executable
Convention Pack catalog yet (see
[`docs/architecture/cli.md#convention-pack-source-decision`](../../docs/architecture/cli.md#convention-pack-source-decision)).

## Output

`evaluate` writes the public `ConventionResult` (`@lksnext/iac-conventions-core`) as
JSON to stdout, and nothing else — no banners, progress logs, or explanatory text. All
CLI/transport errors are written to stderr as a single human-readable line.

## Exit codes

- `0` — the command completed, including a **domain-invalid** result
  (`validation.valid === false`): evaluation completing and returning an invalid
  proposed name is a successful outcome, not a CLI failure.
- `1` — a CLI/transport failure: malformed JSON, a missing required field, an unknown
  `resource_type`, or an unexpected internal error.

See [`docs/architecture/cli.md#exit-codes`](../../docs/architecture/cli.md#exit-codes)
for the full rationale.

## Current limitations

- Only one command, `evaluate`, is implemented.
- No Terraform-specific transport mode (`--terraform-external` or similar) exists yet;
  the generic JSON output above is not directly compatible with Terraform's `external`
  data source protocol, which requires string-only values (see
  [`docs/architecture/cli.md#terraform-integration-boundary`](../../docs/architecture/cli.md#terraform-integration-boundary)).
  Terraform integration is planned for a later milestone.
- No `catalog` subcommand (for example, to list known `ResourceType`s) exists yet.
- The Convention Pack must be supplied by the caller in full; there is no built-in or
  named Convention Pack registry.
