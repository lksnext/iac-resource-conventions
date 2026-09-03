# CLI Architecture

This document describes the architecture of `@lksnext/iac-conventions-cli` (Milestone
4.1 — CLI Package Foundation). It does not redefine the Specification or the Reference
Evaluator; it describes how the existing `@lksnext/iac-conventions-core` and
`@lksnext/iac-conventions-catalog` public APIs are made consumable from the command
line. See [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md) for the implementation
monorepo architecture and [`AGENTS.md`](../../AGENTS.md) for the overall project
architecture.

## Purpose

The CLI is the first adapter in this repository, and the foundation both interactive
developer use and, later, machine-to-machine use from Terraform build on:

```text
user / Terraform
      ↓
@lksnext/iac-conventions-cli
      ↓
catalog lookup
      ↓
core evaluate()
      ↓
deterministic output
```

Milestone 4.1 implements only the minimal stable foundation: one command, `evaluate`,
that proves this pipeline works end-to-end. It does not implement a broad command
suite, a Terraform-specific transport mode, or a native Terraform provider.

## Package boundary

**The CLI contains no naming, validation, Context Resolution, or provider-rule logic.**
It orchestrates two existing public APIs:

- `@lksnext/iac-conventions-catalog`'s `getResourceDefinition(resourceType)`.
- `@lksnext/iac-conventions-core`'s `evaluate(input)`.

Every domain decision — name generation, validation, failure codes, warnings — is made
by `evaluate()`. The CLI's own code is limited to argument parsing, stdin/stdout I/O,
JSON parsing, catalog lookup, and mapping the external JSON input contract onto the
public `EvaluateInput` contract.

The CLI's own public surface is its binary, `iac-conventions`. It does not export a
broad JavaScript library API for its internals (see [Non-responsibilities](#non-responsibilities)
below): `package.json` declares only a `bin` entry, no `main`/`exports`.

## Dependency direction

```text
cli      -> core
cli      -> catalog
catalog  -> core
```

`core` and `catalog` never depend on `cli`. This matches
[`IMPLEMENTATION.md`'s dependency direction](../../IMPLEMENTATION.md#dependency-direction).

## CLI framework decision

Node's built-in `node:util.parseArgs` is used for argument parsing. The command surface
this milestone needs — `--help`, `--version`, and one subcommand with no flags of its
own — does not justify a CLI framework dependency (Commander, yargs, oclif, cac,
clipanion, or similar). No such dependency was added.

If a future milestone's command surface (multiple subcommands, repeated/typed options,
shell completion) demonstrates that `parseArgs` is genuinely insufficient, that
decision should be revisited explicitly, with the proposed dependency, its bundle and
runtime impact, license, and maintenance implications reported before it is added — not
introduced speculatively.

`@types/node` was added as a root **development** dependency (type declarations only,
no runtime footprint) because this is the first package in the repository whose source
uses Node built-ins (`process`, `Buffer`, `node:util`, `node:module`) directly; `core`
and `catalog` deliberately avoid any environment-specific integration and so had no
prior need for it.

## Input boundary

The CLI defines its own external JSON input contract for `evaluate` rather than
exposing `EvaluateInput` (`@lksnext/iac-conventions-core`) directly, since
`EvaluateInput` requires an already-selected `ResourceDefinition` that an external
caller (a human, a shell pipeline, or Terraform) cannot be expected to supply:

```ts
interface CliEvaluateInput {
  readonly naming_request: NamingRequest; // must include resource_type
  readonly convention_pack: ConventionPack;
  readonly evaluation_context: EvaluationContext;
}
```

`naming_request.resource_type` is the catalog lookup key. No separate top-level
`resource_type` field is introduced: `NamingRequest` already carries one (see
`packages/core/src/model/requests/naming-request.ts`), and duplicating it as a second,
independent field would create two sources of truth for the same lookup key with no
Specification-defined precedence between them.

## Convention Pack source decision

The CLI cannot call `evaluate()` without a `ConventionPack`. Before finalizing the input
contract, the repository was reviewed for an existing Convention Pack source:

- `specification/convention-packs/aws-workload-default.md` is a **Specification
  Artifact document** — Markdown policy, not executable data.
- `IMPLEMENTATION.md`'s package responsibility table lists "executable Convention
  Packs" as a **future** `@lksnext/iac-conventions-catalog` responsibility; no such
  runtime registry exists in `packages/catalog/src` today (confirmed by inspection —
  the catalog package exports only `getResourceDefinition`/`listResourceTypes`, over
  `ResourceDefinition` values, never `ConventionPack` values).

**Decision: the caller supplies the full `ConventionPack` in the JSON input (Option
A).** This is the smallest architecturally correct solution available today: it
requires no new catalog milestone, does not hard-code `aws-workload-default` (or any
other pack) inside the CLI, and keeps the CLI a thin adapter. A future executable
Convention Pack catalog (Option B) can add a second, optional input mode (for example, a
`convention` string resolved through a catalog lookup) without a breaking change to this
one, since the current contract's `convention_pack` field would simply become optional
once an alternative resolution path exists.

## Resource Definition lookup

Unlike `ConventionPack`, `ResourceDefinition` lookup already has an explicit catalog.
The CLI:

1. Reads `naming_request.resource_type` from the parsed input.
2. Calls `getResourceDefinition(resourceType)`.
3. If it returns `undefined`, the CLI reports a deterministic error to stderr and exits
   non-zero **without** calling `evaluate()`. There is no provider fallback and no
   partial evaluation with an undefined definition.

## `EvaluateInput` mapping

The CLI constructs the public `EvaluateInput` directly from the parsed JSON input and
the catalog lookup result:

```ts
evaluate({
  naming_request: input.naming_request,
  convention_pack: input.convention_pack,
  evaluation_context: input.evaluation_context,
  resource_definition: resourceDefinition, // from getResourceDefinition()
});
```

No `ResourceIdentity` is constructed manually, no naming logic runs, and no value is
pre-normalized — `evaluate()` remains solely responsible for every domain decision.

## stdout / stderr contract

- **stdout** carries only successful command transport output. For `evaluate`, this is
  exactly one JSON document (the `ConventionResult`) followed by a trailing newline —
  no banners, progress logs, or explanatory text. For `--help`/`--version`, this is the
  requested human-readable text.
- **stderr** carries only CLI usage/errors: a single, deterministic, human-readable
  line for every expected failure (malformed JSON, a missing required field, an unknown
  `resource_type`, an unknown command). Unexpected internal errors may include a stack
  trace on stderr, but stdout is never used for diagnostics.

This is essential for shell pipelines, CI, and Terraform's `external` data source (see
[Terraform integration boundary](#terraform-integration-boundary) below), which all
depend on stdout carrying only machine-readable transport output.

## Exit codes

- **`0`** — the command completed. This includes a **domain-invalid**
  `ConventionResult` (`validation.valid === false`): evaluation completing and
  returning an invalid proposed name is a successful evaluation outcome, not a
  CLI/transport failure. A caller (for example, Terraform) that wants to fail on an
  invalid name must check `validation.valid` in the returned JSON itself.
- **`1`** — a CLI/transport failure: malformed JSON, a missing required field (for
  example, `naming_request.resource_type`), an unknown `resource_type`, an unknown or
  missing command, an unrecognized flag, or an unexpected internal error.

This distinction is deliberate: it lets machine callers pipe the CLI's stdout to a JSON
parser unconditionally on exit `0`, and treat a non-zero exit as "the tool itself
failed to produce a result", independent of whether the domain result inside that JSON
happens to be valid.

## Determinism

The same stdin input always produces byte-for-byte identical stdout: `evaluate()` is
pure and deterministic (see `docs/architecture/reference-evaluator.md`), the CLI does
not introduce any additional randomness or environment-dependent formatting, and
`JSON.stringify` with a fixed, code-constructed object always serializes the same
key order for the same input.

## Terraform integration boundary

Terraform's `external` data source protocol
([HashiCorp documentation](https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/data))
requires the external program to read a JSON object of **string** values from stdin and
write a JSON object of **string** values to stdout; nested objects, arrays, booleans,
and numbers are not supported by that protocol.

The CLI's current `evaluate` output — the full, nested `ConventionResult` — is
therefore **not** directly compatible with `data "external"` as-is. This is expected
and deliberate at this milestone: Milestone 4.1 keeps the CLI's domain output generic,
and a Terraform-specific transport mode (for example, `evaluate --terraform-external`,
flattening the result to string values) is deferred to a later milestone. No
Terraform-specific behavior is mixed into the generic JSON output implemented here.

## Non-responsibilities

The CLI does not, and must not:

- Implement naming, validation, Context Resolution, or provider-rule logic.
- Implement a native Terraform provider or Terraform-specific naming behavior.
- Expand AWS/Azure/Kubernetes catalog coverage.
- Modify the Specification or Reference Evaluator semantics.
- Expose a broad JavaScript library API for its internals — its public surface is its
  binary.
- Maintain a built-in or hidden Convention Pack registry.

## Future evolution

Recommended roadmap (see `IMPLEMENTATION.md`'s Milestone 4 entry):

- **4.2 — Stable Evaluate JSON Contract**: harden and document the `evaluate` JSON
  input/output contract (error taxonomy, schema, versioning) once real usage
  feedback exists.
- **4.3 — Terraform External Integration**: add a Terraform-specific transport mode
  compatible with `data "external"`'s string-only protocol.
- **4.4 — First Alpha Release**: publication readiness across `core`, `catalog`, and
  `cli`.

A `catalog` subcommand (for example, to list known `ResourceType`s) and an executable
Convention Pack catalog are both plausible future additions, but neither is implemented
in this milestone.
