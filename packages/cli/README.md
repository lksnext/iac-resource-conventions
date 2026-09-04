# `@lksnext/iac-conventions-cli`

Command-line adapter for the `iac-resource-conventions` Reference Evaluator.

> Viewing this on npmjs.com? Relative links below (for example to `docs/` or
> `examples/terraform/external/`) resolve only within the source repository, not from a
> published package. See them at <https://github.com/lksnext/iac-resource-conventions>.

## Status

Milestone 4.4 — Terraform External Integration. This package implements two commands:
`evaluate`, proving `CLI -> catalog -> core` works end-to-end, and
`terraform-external`, a thin transport reusing the same evaluation path so Terraform's
`hashicorp/external` provider can consume it. It does not yet implement a broad command
suite or a `catalog` subcommand — see
[`docs/architecture/cli.md`](https://github.com/lksnext/iac-resource-conventions/blob/main/docs/architecture/cli.md)
for the full architecture,
design-gate decisions, and current limitations.

## Purpose and architecture boundary

This package is an **adapter**, not a domain implementation:

- It contains no naming, validation, Context Resolution, or provider-rule logic of its
  own.
- It orchestrates two existing public APIs, both from
  `@lksnext/iac-conventions-catalog`: `getResourceDefinition` and `getConventionPack`,
  and `@lksnext/iac-conventions-core`'s `evaluate()`.
- Every domain decision — name generation, validation, failure codes — is made by
  `evaluate()`. This package only reads JSON, looks up a `ResourceDefinition` and a
  `ConventionPack`, calls `evaluate()`, and writes JSON.

Dependency direction: `cli -> core`, `cli -> catalog`, `catalog -> core`. `core` and
`catalog` never depend on `cli`.

## Install / run

```bash
npm install @lksnext/iac-conventions-cli@alpha
iac-conventions --help
```

The same binary is also available from a repository checkout, without installing from
npm, via `npm run build --workspace=@lksnext/iac-conventions-cli` and
`node packages/cli/dist/cli.js --help` (see the `bin` field in
[`package.json`](package.json)).

## `evaluate` — stdin JSON input

```bash
echo '{
  "naming_request": {
    "convention": "aws-workload-default",
    "resource_type": "aws_s3_bucket",
    "functional": { "service": "ingestion" }
  },
  "evaluation_context": {
    "shared_organizational_context": { "system": "telemetry-platform" },
    "shared_deployment_context": { "environment": "production" }
  }
}' | node packages/cli/dist/cli.js evaluate
```

`naming_request.resource_type` and `naming_request.convention` are both required: they
are the lookup keys used to resolve, respectively, the `ResourceDefinition` and the
`ConventionPack` from `@lksnext/iac-conventions-catalog`'s `getResourceDefinition` and
`getConventionPack`. Neither is supplied by the caller as a full object — this replaced
the Milestone 4.1 provisional contract, which required a full `convention_pack` JSON
object (see
[`docs/architecture/cli.md#convention-pack-source-decision-historical-and-milestone-43-replacement`](https://github.com/lksnext/iac-resource-conventions/blob/main/docs/architecture/cli.md#convention-pack-source-decision-historical-and-milestone-43-replacement)).
Only `naming_request` and `evaluation_context` are accepted at the top level; any other
field is a transport error.

## Output

`evaluate` writes the public `ConventionResult` (`@lksnext/iac-conventions-core`) as
JSON to stdout, and nothing else — no banners, progress logs, or explanatory text. All
CLI/transport errors are written to stderr as a single human-readable line.

## Terraform External Integration

`terraform-external` lets Terraform's `hashicorp/external` provider consume this CLI as
a `data "external"` data source. See
[`docs/integrations/terraform.md`](https://github.com/lksnext/iac-resource-conventions/blob/main/docs/integrations/terraform.md)
for a full
usage guide and
[`examples/terraform/external/`](https://github.com/lksnext/iac-resource-conventions/tree/main/examples/terraform/external)
for a runnable example; see
[`docs/architecture/cli.md#terraform-integration-boundary`](https://github.com/lksnext/iac-resource-conventions/blob/main/docs/architecture/cli.md#terraform-integration-boundary)
for the full protocol mapping.

```bash
echo '{
  "request_json": "{\"naming_request\":{\"convention\":\"aws-workload-default\",\"resource_type\":\"aws_iam_role\",\"functional\":{\"service\":\"ingestion\"}},\"evaluation_context\":{\"shared_organizational_context\":{\"system\":\"telemetry-platform\"},\"shared_deployment_context\":{\"environment\":\"production\"}}}"
}' | node packages/cli/dist/cli.js terraform-external
```

`terraform-external` reads exactly one field on stdin, `request_json`: a string
containing the same JSON document `evaluate` accepts. This matches
`hashicorp/external`'s `query` argument, which only supports string values. It writes
a JSON object of string values to stdout: `name` (the generated name, or `""` if none
was produced), `valid` (`"true"`/`"false"`), and `result_json` (the full
`ConventionResult`, JSON-encoded as a string) — matching `hashicorp/external`'s
`result` attribute, which is likewise string-only. It reuses the exact same
`parseEvaluateRequest`/`executeEvaluationRequest` functions `evaluate` uses; no naming,
validation, or catalog-lookup logic is duplicated.

## Exit codes

- `0` — the command completed, including a **domain-invalid** result
  (`validation.valid === false`): evaluation completing and returning an invalid
  proposed name is a successful outcome, not a CLI failure. This applies to both
  `evaluate` and `terraform-external`.
- `1` — a CLI/transport failure: malformed JSON, an unknown top-level field, a missing
  or invalid required field, an unknown `resource_type`, an unknown `convention`, or an
  unexpected internal error. For `terraform-external`, this also includes a missing or
  invalid `request_json` field.

See [`docs/architecture/cli.md#exit-codes`](https://github.com/lksnext/iac-resource-conventions/blob/main/docs/architecture/cli.md#exit-codes)
for the full rationale.

## Current limitations

- Only two commands, `evaluate` and `terraform-external`, are implemented.
- `terraform-external` is a bridge built on `hashicorp/external`, not a native
  Terraform provider — see
  [`docs/integrations/terraform.md#limitations`](https://github.com/lksnext/iac-resource-conventions/blob/main/docs/integrations/terraform.md#limitations).
- No `catalog` subcommand (for example, to list known `ResourceType`s or
  `ConventionPackId`s) exists yet.
- Transport validation is intentionally minimal (structural checks only); it does not
  duplicate core's domain validation (see
  [`docs/architecture/cli.md#transport-and-domain-validation-boundary`](https://github.com/lksnext/iac-resource-conventions/blob/main/docs/architecture/cli.md#transport-and-domain-validation-boundary)).
