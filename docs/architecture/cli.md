# CLI Architecture

This document describes the architecture of `@lksnext/iac-conventions-cli` (Milestone
4.1 — CLI Package Foundation; Milestone 4.3 — Stable CLI Evaluate JSON Contract;
Milestone 4.4 — Terraform External Integration). It does not redefine the
Specification or the Reference Evaluator; it describes how the existing
`@lksnext/iac-conventions-core` and `@lksnext/iac-conventions-catalog` public APIs are
made consumable from the command line. See [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)
for the implementation monorepo architecture and [`AGENTS.md`](../../AGENTS.md) for the
overall project architecture.

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

Milestone 4.1 implemented only the minimal stable foundation: one command, `evaluate`,
proving this pipeline works end-to-end, with a provisional input contract requiring the
caller to supply a full `ConventionPack` object. Milestone 4.3 replaces that provisional
contract with the stable one described below. Milestone 4.4 adds a second command,
`terraform-external`, a thin transport reusing the same evaluation path so Terraform
can consume it through the `hashicorp/external` provider (see
[Terraform integration boundary](#terraform-integration-boundary) below). Neither
milestone implements a broad command suite or a native Terraform provider.

## Package boundary

**The CLI contains no naming, validation, Context Resolution, or provider-rule logic.**
It orchestrates two existing public APIs, both from `@lksnext/iac-conventions-catalog`:

- `getResourceDefinition(resourceType)`.
- `getConventionPack(conventionPackId)`.

...and one from `@lksnext/iac-conventions-core`:

- `evaluate(input)`.

Every domain decision — name generation, validation, failure codes, warnings — is made
by `evaluate()`. The CLI's own code is limited to argument parsing, stdin/stdout I/O,
transport (structural) JSON validation, catalog lookup, and mapping the external JSON
input contract onto the public `EvaluateInput` contract.

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
`EvaluateInput` requires an already-selected `ResourceDefinition` and `ConventionPack`
that an external caller (a human, a shell pipeline, or Terraform) cannot be expected to
supply as full objects — both are looked up from `@lksnext/iac-conventions-catalog`
instead (see [`packages/cli/src/internal/parse-evaluate-request.ts`](../../packages/cli/src/internal/parse-evaluate-request.ts)):

```ts
interface EvaluateRequest {
  readonly naming_request: NamingRequest; // must include resource_type and convention
  readonly evaluation_context: EvaluationContext;
}
```

`naming_request.resource_type` and `naming_request.convention` are the two catalog
lookup keys. No separate top-level fields are introduced for either: `NamingRequest`
already carries both (see `packages/core/src/model/requests/naming-request.ts`), and
duplicating them as independent top-level fields would create two sources of truth for
the same lookup keys with no Specification-defined precedence between them.

Only `naming_request` and `evaluation_context` are accepted at the top level; any other
field (including a leftover Milestone 4.1 `convention_pack`) is rejected as an unknown
field rather than silently ignored, so a typo or a stale caller fails loudly instead of
being misinterpreted.

## Convention Pack source decision (historical) and Milestone 4.3 replacement

Milestone 4.1 could not call `evaluate()` without a `ConventionPack`, and no executable
Convention Pack catalog existed yet, so it required the caller to supply the full
`ConventionPack` object in the JSON input (`convention_pack`). That section anticipated
an executable catalog as a purely additive, optional second input mode.

**Milestone 4.2** added that catalog: `@lksnext/iac-conventions-catalog` now exposes
`getConventionPack`/`listConventionPackIds` (see
[`docs/architecture/convention-pack-catalog.md`](convention-pack-catalog.md)). Milestone
4.2 itself deliberately left the CLI's JSON contract unchanged, deferring the contract
change to this milestone.

**Milestone 4.3 removes `convention_pack` entirely** rather than supporting two
competing input contracts side by side. This project is pre-0.1.0-alpha: `packages/cli`
is marked `"private": true` in `package.json`, is not yet published, and no prior
milestone or release documented a compatibility commitment for the full-`ConventionPack`
input — the Milestone 4.2 note above explicitly anticipated it being superseded, not
preserved. `naming_request.convention` is now resolved through `getConventionPack`,
exactly like `naming_request.resource_type` is resolved through `getResourceDefinition`.

## Catalog lookups

Both `ResourceDefinition` and `ConventionPack` are resolved the same way, from the same
catalog package, keyed by fields already present on `NamingRequest`. The CLI:

1. Reads `naming_request.resource_type` and `naming_request.convention` from the
   parsed, transport-valid input.
2. Calls `getResourceDefinition(resourceType)`. If it returns `undefined`, the CLI
   reports a deterministic error to stderr and exits non-zero **without** calling
   `evaluate()`.
3. Calls `getConventionPack(convention)`. If it returns `undefined`, the CLI reports a
   deterministic error to stderr and exits non-zero **without** calling `evaluate()`.

There is no provider or Convention Pack fallback, and no partial evaluation with an
undefined definition or pack. This is implemented in
[`packages/cli/src/internal/execute-evaluation-request.ts`](../../packages/cli/src/internal/execute-evaluation-request.ts).

## Transport and domain validation boundary

The CLI performs only **transport (structural) validation** — is the JSON well-formed
enough to safely reach core? — never **domain validation** (required attributes,
protected-value conflicts, naming/rendering/placement constraints), which remains
`evaluate()`'s sole responsibility. No schema-validation library dependency was added;
[`parseEvaluateRequest`](../../packages/cli/src/internal/parse-evaluate-request.ts) is a
small, plain internal function, not exposed as public API and not a class.

core's Context Resolution (`packages/core/src/evaluator/context-resolution/`)
dereferences every nested `NamingRequest`/`EvaluationContext` field using optional
chaining only, so a malformed *nested* value (wrong type or an absent field) cannot
throw there — it only resolves to `undefined`, which core's own required-attribute
validation already reports. The CLI's transport validation is therefore limited to what
core does **not** already defend against:

- the JSON root, `naming_request`, and `evaluation_context` must each be a plain object
  (not an array, `null`, or a primitive);
- `naming_request.resource_type` and `naming_request.convention` must each be a
  non-empty string, since both are used as object-map lookup keys before `evaluate()`
  is ever called;
- only `naming_request` and `evaluation_context` are accepted at the top level.

No deeper structural validation (for example, validating the shape of
`naming_request.overrides` or `evaluation_context.runtime_context`) is implemented:
doing so would duplicate domain validation that already belongs to core, and the
reference evaluator safety review found no nested shape capable of crashing it.

## No protocol versioning

This contract carries no version field or version negotiation (for example, no
`"version": 1` on the input or output JSON). The package itself is unpublished, private
(`"private": true`), and pre-0.1.0-alpha: there are no external consumers yet to
negotiate a version with, and adding one now would be speculative machinery with no
current requirement driving it (see `AGENTS.md`'s Coding Conventions: avoid unnecessary
abstraction until a real, current need exists). If a future milestone introduces a
breaking change to this contract after the package is published, that milestone should
introduce explicit versioning at that time, informed by real consumers.

## `EvaluateInput` mapping

The CLI constructs the public `EvaluateInput` directly from the parsed JSON input and
both catalog lookup results:

```ts
evaluate({
  naming_request: request.naming_request,
  evaluation_context: request.evaluation_context,
  convention_pack: conventionPack, // from getConventionPack()
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
  line for every expected failure (malformed JSON, an unknown top-level field, a
  missing or invalid required field, an unknown `resource_type`, an unknown
  `convention`, an unknown command). Unexpected internal errors may include a stack
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
- **`1`** — a CLI/transport failure: malformed JSON, an unknown top-level field, a
  missing or invalid required field (for example, `naming_request.resource_type` or
  `naming_request.convention`), an unknown `resource_type`, an unknown `convention`, an
  unknown or missing command, an unrecognized flag, or an unexpected internal error.

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
([HashiCorp documentation](https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external))
requires the external program to read a JSON object of **string** values from stdin and
write a JSON object of **string** values to stdout; nested objects, arrays, booleans,
and numbers are not supported by that protocol. On success the program must exit `0`;
on failure it must print a single human-readable line to stderr and exit non-zero (any
stdout is then ignored). Terraform re-runs the program on every refresh, since it
expects an `external` data source to have no observable side effects. HashiCorp itself
documents this mechanism as an "escape hatch" for situations where a first-class
provider is not available, not as a first-class provider replacement, and does not
guarantee that Terraform Enterprise's remote execution environment can run arbitrary
external programs.

The CLI's `evaluate` output — the full, nested `ConventionResult` — is not directly
compatible with `data "external"`'s string-only protocol. Rather than flattening
`evaluate` itself (which would break its generic, structured contract for every other
caller), Milestone 4.4 adds a **second command**, `terraform-external`, as a dedicated
transport around the exact same evaluation path:

```text
Terraform `data "external"`
      ↓ stdin: { "request_json": "<the same evaluate JSON, as a string>" }
terraform-external command
      ↓ parseTerraformExternalQuery         (../../packages/cli/src/internal/parse-terraform-external-query.ts)
      ↓ parseEvaluateRequest                (../../packages/cli/src/internal/parse-evaluate-request.ts — reused, unchanged)
      ↓ executeEvaluationRequest            (../../packages/cli/src/internal/execute-evaluation-request.ts — reused, unchanged)
      ↓ serializeTerraformExternalResult     (../../packages/cli/src/internal/serialize-terraform-external-result.ts)
      ↓ stdout: { "name": "...", "valid": "true"|"false", "result_json": "<the full ConventionResult, as a string>" }
```

This is transport reuse, not a second evaluator: `terraform-external` never calls
`evaluate()` directly, constructs an `EvaluateInput`, or duplicates any catalog lookup
or domain logic. It calls the exact same `parseEvaluateRequest`/
`executeEvaluationRequest` functions `evaluate` calls (see
[`packages/cli/src/commands/terraform-external.ts`](../../packages/cli/src/commands/terraform-external.ts)),
around a different stdin/stdout shape.

### Input (`terraform-external`)

A JSON object on stdin with exactly one field, `request_json`: a string containing the
same JSON document `evaluate` accepts (`{ naming_request, evaluation_context }`, see
[Input boundary](#input-boundary) above). This single string field is the only
practical mapping onto `hashicorp/external`'s `query`, since `query` itself only
supports string values — nesting `naming_request`/`evaluation_context` as separate
query fields would still require flattening them, and would create a second, divergent
input shape alongside the stable one. `parseTerraformExternalQuery` (see
[`packages/cli/src/internal/parse-terraform-external-query.ts`](../../packages/cli/src/internal/parse-terraform-external-query.ts))
only extracts and structurally validates this string; it does not parse or validate its
contents; the extracted string is handed unchanged to the existing
`parseEvaluateRequest`.

### Output (`terraform-external`)

A JSON object of string values on stdout, matching `hashicorp/external`'s `result`
attribute:

- `name` — the generated name (`result.outputs?.name`), or `""` if none was produced.
  Never a placeholder or invented value.
- `valid` — `result.validation.valid` converted to the literal string `"true"` or
  `"false"`. Never independently recomputed.
- `result_json` — the full `ConventionResult`, compactly JSON-encoded as a string, so
  every field (validation failures, warnings, resolved identity, and governance
  context) remains available to a caller that decodes it (for example, with
  Terraform's `jsondecode(...)`).

This projection is implemented in `serializeTerraformExternalResult` (see
[`packages/cli/src/internal/serialize-terraform-external-result.ts`](../../packages/cli/src/internal/serialize-terraform-external-result.ts))
and does not reinterpret or revalidate the `ConventionResult` it receives.

### Domain-invalid results and transport failures over `terraform-external`

The same distinction `evaluate` makes applies here: a domain-invalid `ConventionResult`
(`validation.valid === false`) is a successful evaluation outcome, so
`terraform-external` still exits `0` and writes `{ name, valid: "false", result_json }`
to stdout — Terraform's `data "external"` never sees this as a failure; a caller must
check `result.valid` itself, exactly as `evaluate` callers check `validation.valid`. A
CLI/transport failure (malformed JSON, a missing/invalid `request_json`, or any failure
the reused `parseEvaluateRequest`/`executeEvaluationRequest` raise) is reported as a
single deterministic line on stderr with a non-zero exit, matching the `external`
protocol's failure contract exactly.

See [`packages/cli/README.md`](../../packages/cli/README.md) and
[`docs/integrations/terraform.md`](../integrations/terraform.md) for a runnable
example.

## Non-responsibilities

The CLI does not, and must not:

- Implement naming, validation, Context Resolution, or provider-rule logic.
- Implement a native Terraform provider or Terraform-specific naming behavior.
- Expand AWS/Azure/Kubernetes catalog coverage.
- Modify the Specification or Reference Evaluator semantics.
- Expose a broad JavaScript library API for its internals — its public surface is its
  binary.
- Maintain a built-in or hidden Convention Pack registry.
- Reimplement naming/validation/Context Resolution logic a second time for
  `terraform-external`: it must always reuse `parseEvaluateRequest` and
  `executeEvaluationRequest`.

## Future evolution

Recommended roadmap (see `IMPLEMENTATION.md`'s Milestone 4 entry):

- **4.2 — Executable Convention Pack Catalog**: complete; see
  [`docs/architecture/convention-pack-catalog.md`](convention-pack-catalog.md).
- **4.3 — Stable Evaluate JSON Contract**: complete; see this document's
  [Input boundary](#input-boundary) and
  [Transport and domain validation boundary](#transport-and-domain-validation-boundary)
  sections.
- **4.4 — Terraform External Integration**: complete; see this document's
  [Terraform integration boundary](#terraform-integration-boundary) section.
- **4.5 — First Alpha Release**: publication readiness across `core`, `catalog`, and
  `cli` — the next active increment.

A `catalog` subcommand (for example, to list known `ResourceType`s or
`ConventionPackId`s) remains a plausible future addition, but is not implemented in
this milestone. A native Terraform provider (replacing the `hashicorp/external`
bridge entirely) also remains a plausible future addition, contingent on real usage
evidence from this bridge.
