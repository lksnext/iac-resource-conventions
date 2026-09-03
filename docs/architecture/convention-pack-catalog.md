# Convention Pack Catalog

## Purpose

The Convention Pack Catalog answers a single question: given a `ConventionPackId`,
which executable `ConventionPack` does it identify? It is static organizational policy
data — naming component order, separator, casing, abbreviations, required attributes,
identity defaults, and override policy — not a resolution or evaluation step. It exists
alongside the [Resource Definition Catalog](resource-definition-catalog.md) so that
callers such as the CLI, adapters, and future integrations can obtain a `ConventionPack`
before invoking [`@lksnext/iac-conventions-core`](../../packages/core/README.md)'s
`evaluate()`, instead of constructing one by hand at every call site.

## Relationship with Specification artifacts

[`specification/convention-pack.md`](../../specification/convention-pack.md) defines
the abstract Convention Pack *concept*; concrete Convention Packs are Specification
Artifacts under
[`specification/convention-packs/`](../../specification/convention-packs/), expressed
as Markdown policy documents, not executable data (see
[`specification/convention-packs/README.md`](../../specification/convention-packs/README.md)).
`aws-workload-default` is currently the only such artifact.

The catalog implements each artifact it carries; it does not extend, reinterpret, or
duplicate the policy those artifacts define. Every catalog entry is a `ConventionPack`
value exactly as defined by `@lksnext/iac-conventions-core` — no catalog-specific
subtype, and no field the Specification does not already describe. Where an artifact
states a field only in prose (not a concrete YAML/JSON value), the executable value
maps it faithfully rather than inventing policy the artifact does not state; where an
artifact provides no value at all for a `ConventionPack` field (for example,
`aws-workload-default.md` defines no concrete Governance Profile or tag mapping), that
field is omitted from the executable pack rather than given a fabricated default.

## Package ownership

The Convention Pack Catalog lives in the same package as the Resource Definition
Catalog, `packages/catalog/` (`@lksnext/iac-conventions-catalog`), as a second,
separate artifact family — not a generic registry shared with `ResourceDefinition`.
`ConventionPack` and `ResourceDefinition` are distinct Specification concepts, keyed by
different identifier types (`ConventionPackId` versus `ResourceType`); combining them
into one `CatalogEntry<T>`/`ArtifactRegistry<T>` abstraction would obscure that
distinction for no current benefit.

## Dependency direction

Unchanged from the Resource Definition Catalog (see
[`resource-definition-catalog.md#dependency-direction`](resource-definition-catalog.md#dependency-direction)):
`catalog` depends on `core`; `core` never depends on `catalog`; no catalog source file
imports from anything other than `core` or the catalog's own relative modules.
`test/runtime/dependency-direction.test.mjs` enforces this for both artifact families,
since it scans catalog source generically, not per-family.

## Static immutable model

```text
packages/catalog/src/
    convention-packs/
        aws-workload-default.ts
    internal/
        canonical-attributes.ts
        deep-freeze.ts
        validate-convention-pack.ts
    index.ts
```

`AWS_WORKLOAD_DEFAULT` is deep-frozen at its own definition site
(`src/convention-packs/aws-workload-default.ts`), the same `deepFreeze` helper used by
`ResourceDefinition` entries (`src/internal/deep-freeze.ts` — reused as-is; no second
freeze implementation was added). `src/index.ts` builds a second, separate
`Readonly<Record<ConventionPackId, ConventionPack>>` map, deep-frozen again at the map
level, alongside (not merged with) the existing `resourceDefinitions` map.

`src/internal/canonical-attributes.ts` holds the closed, 12-item canonical Resource
Identity attribute vocabulary as a runtime `Set` (Specification v1.1), shared by both
`validate-resource-definition.ts` and `validate-convention-pack.ts` — declared once
rather than duplicated per validator, since `CanonicalResourceIdentityAttribute`
(`core`) is a compile-time-only literal union with no runtime array of its members.

## Public API

```ts
function getConventionPack(conventionPackId: ConventionPackId): ConventionPack | undefined;
function listConventionPackIds(): ReadonlyArray<ConventionPackId>;
```

- **`getConventionPack`** returns `undefined` for an unknown id rather than throwing,
  consistent with `getResourceDefinition`: an unknown id is an expected, recoverable
  outcome for a caller, not an exceptional one.
- **`listConventionPackIds`** returns every known `ConventionPackId` in lexical order,
  consistent with `listResourceTypes`.

Only `ConventionPack` and `ConventionPackId`, both already public `core` contracts, are
used — there is no `CatalogConventionPack` subtype and no class.

## Conformance

`src/internal/validate-convention-pack.ts` mirrors
`validate-resource-definition.ts`'s pattern: an internal, unexported
`validateConventionPack(pack)` returns every violation (never only the first) as a
`ReadonlyArray<{ convention_pack_id, path, message }>`, and
`validateCatalogConventionPackEntries(entries)` additionally checks registration
identity (a catalog key equals its pack's own `id`; no duplicate `id`).

What is checked: a `naming_component_order` reference is in the closed canonical
vocabulary and referenced at most once; `casing`, when declared, is `preserve`,
`lower`, or `upper`; an `abbreviations` outer key is in the closed canonical
vocabulary and every mapped abbreviation is a non-empty string; a
`context_authority_rules` value is a recognized Evaluation Context source;
`required_attributes` and `override_policy`'s attribute lists contain only non-empty
strings; and no attribute is listed as both `overridable` and `protected`.

What is deliberately **not** checked against the closed canonical vocabulary:
`required_attributes`, `override_policy.overridable_attributes`, and
`override_policy.protected_attributes`. Per
[`specification/convention-pack.md`](../../specification/convention-pack.md), these
lists may reference Governance Context attributes in addition to canonical Resource
Identity attributes, and `core` defines no closed, enumerable vocabulary for Governance
Context attributes; restricting these fields to the 12-item Resource Identity
vocabulary would reject Specification-valid packs.

This validator never inspects a resolved Resource Identity or generates or validates a
rendered name — that remains `evaluate()`'s responsibility, unaffected by this
validator's existence. `evaluate()` continues to defend against a malformed
`ConventionPack` on its own (for example, a duplicate `naming_component_order`
reference), regardless of whether that pack came from this catalog.

## Provenance

Provenance is recorded only as a source comment on each executable pack (pointing to
`specification/convention-packs/<artifact>.md`), never as a runtime `ConventionPack`
field — the Specification defines no provenance field, consistent with
`ResourceDefinition` provenance comments under `src/aws/`.

## Specification/runtime fidelity

`test/runtime/convention-pack-catalog.test.mjs` pins every field of
`AWS_WORKLOAD_DEFAULT` against the literal values stated in
`specification/convention-packs/aws-workload-default.md` (its `id`, naming projection
YAML example, required attributes, and override policy), without parsing the Markdown
file itself. `test/runtime/integration.test.mjs` additionally exercises the artifact's
own worked naming example end-to-end through `evaluate()`.

## CLI relationship

`@lksnext/iac-conventions-cli`'s `evaluate` command's JSON input contract is
**unchanged** by this catalog: `convention_pack` remains a required, full-object JSON
field (see
[`docs/architecture/cli.md#convention-pack-source-decision`](cli.md#convention-pack-source-decision)).
A `convention` string resolved through `getConventionPack` remains a plausible, purely
additive future CLI input mode, not implemented by this milestone.

## Non-responsibilities

The Convention Pack Catalog does **not**:

- resolve Resource Identity or Governance Context, or perform Context Resolution
  (remains `core`'s responsibility);
- apply conventions or generate names (Convention Evaluation remains `core`'s
  responsibility);
- validate a rendered resource name or a resolved Resource Identity (that remains
  `evaluate()`'s responsibility);
- expose a mutable runtime registry — there is no `registerConventionPack` or
  `unregisterConventionPack`;
- invent Convention Packs not backed by a Specification Artifact under
  `specification/convention-packs/`.
