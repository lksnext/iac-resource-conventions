# Resource Definition Catalog

## Purpose

The Resource Definition Catalog answers a single question: given a canonical
`ResourceType`, which `ResourceDefinition` describes that resource? It is static
provider knowledge — name-length limits, uniqueness scope, placement rules, and similar
technical facts about a *kind* of resource — not a resolution or evaluation step. It
exists so that callers such as the CLI, adapters, and future integrations can obtain the
correct `ResourceDefinition` before invoking
[`@lksnext/iac-conventions-core`](../../packages/core/README.md)'s `evaluate()`, instead
of constructing one by hand or duplicating provider knowledge at every call site.

## Relationship with the Specification

[`specification/resource-definition.md`](../../specification/resource-definition.md)
defines the *concept* of a Resource Definition only; it explicitly defers "an actual
catalog of resource types" and "concrete AWS, Azure, or Kubernetes resource types" to a
later iteration (see its "Out of scope for this document" section).
[`specification/README.md`](../../specification/README.md#what-does-not-belong-here)
is more direct still: "Resource Definitions catalog entries" are configuration and
implementation concerns that consume the Specification's concepts, and are explicitly
listed as **not** belonging under `specification/`.

The catalog therefore implements a Specification concept; it does not extend or
reinterpret it. Every catalog entry is a `ResourceDefinition` value exactly as defined
by `@lksnext/iac-conventions-core`'s Executable Domain Model (see
[`docs/architecture/executable-domain-model.md`](executable-domain-model.md)) — no
catalog-specific subtype, and no field the Specification does not already describe.

## Package boundary

The catalog lives in its own workspace package, `packages/catalog/`
(`@lksnext/iac-conventions-catalog`), separate from `@lksnext/iac-conventions-core`:

- `core` must remain provider-independent — it has no knowledge of AWS, Azure, or
  Kubernetes resource types, only the Specification's abstract concepts.
- The catalog contains provider- and resource-specific knowledge, which will grow
  independently of the evaluator's own release cadence.
- Consumers who only need `evaluate()` (for example, a caller that already has its own
  `ResourceDefinition` values) are not forced to depend on the catalog.
- Future provider catalogs (Azure, Kubernetes) can evolve independently of both `core`
  and each other.

This matches the package architecture anticipated by
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md#planned-packages) and
[`README.md`](../../README.md#planned-architecture).

## Dependency direction

```text
core
  ^
catalog
  ^
CLI / adapters (future)
```

`catalog` depends on `core` (a single `dependencies` entry on
`@lksnext/iac-conventions-core` in
[`packages/catalog/package.json`](../../packages/catalog/package.json)); `core` must
never depend on `catalog`. This repository does not use dependency-cruiser or other
architectural-dependency tooling (see
[`IMPLEMENTATION.md#status`](../../IMPLEMENTATION.md#status)); instead, the direction is
enforced the same way `packages/core/test/runtime/model-independence.test.mjs` already
enforces the model/evaluator boundary — by
[`packages/catalog/test/runtime/dependency-direction.test.mjs`](../../packages/catalog/test/runtime/dependency-direction.test.mjs)
scanning package manifests and import specifiers directly:

- `catalog`'s `package.json` declares a dependency on `@lksnext/iac-conventions-core`.
- `core`'s `package.json` declares no dependency on `@lksnext/iac-conventions-catalog`.
- No `core` source file imports from the catalog.
- No catalog source file imports from anything other than `core` or the catalog's own
  relative modules (in particular, no provider SDK).

## Catalog responsibilities

The catalog is responsible for:

- holding a static, immutable map from canonical `ResourceType` to `ResourceDefinition`;
- looking up a `ResourceDefinition` by `ResourceType`, returning `undefined` for an
  unknown one;
- listing the `ResourceType`s it knows about, deterministically.

## Non-responsibilities

The catalog does **not**:

- resolve Resource Identity or Governance Context (Context Resolution remains `core`'s
  responsibility);
- apply conventions or generate names (Convention Evaluation remains `core`'s
  responsibility);
- access cloud provider APIs, inspect live infrastructure, or discover resources
  dynamically;
- validate deployed infrastructure;
- perform Placement Constraint evaluation (Placement Constraints remain conceptual —
  see [Definition provenance and modeling findings](#definition-provenance-and-modeling-findings)
  below);
- expose a mutable runtime registry — there is no `registerResourceDefinition` or
  `unregisterResourceDefinition`, since no current consumer needs one, and a static
  catalog keeps lookup deterministic and testable.

`evaluate()` itself does not perform catalog lookup, and never will: the catalog sits
strictly before `evaluate()` in the caller's own code, as proven by
[`packages/catalog/test/runtime/integration.test.mjs`](../../packages/catalog/test/runtime/integration.test.mjs).

## Static catalog model

```text
package contents (packages/catalog/src/**)
    -> immutable ResourceDefinition map (packages/catalog/src/index.ts)
        -> lookup (getResourceDefinition / listResourceTypes)
```

The catalog is a plain object literal built from imported `ResourceDefinition` constants,
`Object.freeze`d at two levels: the top-level `ResourceType -> ResourceDefinition` map,
and each individual `ResourceDefinition` value. Freezing only the outer map would leave
a returned `ResourceDefinition` object itself mutable by a caller; both need to be frozen
for the catalog to be immutable in more than name. There is no class, no constructor, and
no mutable singleton — the catalog is exactly the module's own exports.

## Public API

```ts
function getResourceDefinition(resourceType: ResourceType): ResourceDefinition | undefined;
function listResourceTypes(): ReadonlyArray<ResourceType>;
```

- **`getResourceDefinition`** returns `undefined` for an unknown resource type rather
  than throwing. An unknown resource type is an expected, recoverable outcome for a
  caller (for example, a CLI validating user input), not an exceptional one; this
  repository does not introduce a custom exception hierarchy for it.
- **`listResourceTypes`** returns every known `ResourceType` in lexical order, the only
  order with no other domain meaning here.

`hasResourceDefinition`, `listResourceDefinitions`, `search`, `filter`, `discover`,
`refresh`, `register`, and `unregister` were considered and deliberately not added:
`getResourceDefinition(...) !== undefined` already answers "has", and no current
consumer needs the others. They can be added later, additively, if a concrete consumer
demonstrates the need (see [Future evolution](#future-evolution)).

Only `ResourceDefinition` and `ResourceType` are used, both already public
`core` contracts — there is no `CatalogResourceDefinition` or `AwsResourceDefinition`
subtype, and no class.

## Provider organization

```text
packages/catalog/src/
    aws/
        s3-bucket.ts
    index.ts
```

Only `aws/` exists, because the catalog currently contains exactly one, deliberately
minimal, AWS entry (see
[Definition provenance and modeling findings](#definition-provenance-and-modeling-findings)
below). No `azure/` or `kubernetes/` directory exists yet, and no `providers/base/`,
`providers/common/`, or `providers/generic/` grouping was introduced — none has a
concrete responsibility yet. A provider directory is created only once it holds a real
definition, per this repository's incremental-evolution principle (see
[`AGENTS.md#repository-evolution`](../../AGENTS.md#repository-evolution)).

## Definition provenance and modeling findings

Milestone 3.1's purpose is to prove the package and API boundary, not to research
provider technical constraints — so it deliberately includes exactly one entry,
`aws_s3_bucket`:

```ts
{ resource_type: "aws_s3_bucket", platform: "aws" }
```

This entry declares no `rendering_constraints`, `identity_constraints`, or
`placement_constraints`. Encoding a maximum length, an allowed-character rule, a
uniqueness scope, or a Placement Constraint (for example, "regional, location chosen by
the deployment", per
[`specification/resource-definition.md#s3-bucket`](../../specification/resource-definition.md#s3-bucket))
without first verifying it against authoritative AWS documentation and choosing a
`length_unit` from evidence would fabricate a technical constraint this catalog does
not yet have — exactly what
[`specification/resource-definition.md#rendering-constraints`](../../specification/resource-definition.md#rendering-constraints)
and [`specification/README.md#length-unit-clarification`](../../specification/README.md#length-unit-clarification)
warn against. Researching and adding real, sourced constraints — and testing whether the
current conceptual model can faithfully represent a conditional Placement Constraint
such as "an ACM Certificate must be in `us-east-1` when associated with a CloudFront
Distribution" — is Milestone 3.2's job, not this one's.

Every future concrete definition must record its authoritative source (for example, an
AWS documentation page) in a source comment next to the definition, the same way this
document records the reasoning above; provenance is not added as a runtime field on
`ResourceDefinition`, since the Specification does not define provenance as domain data.

## Testing strategy

- **Package boundary** —
  [`test/runtime/dependency-direction.test.mjs`](../../packages/catalog/test/runtime/dependency-direction.test.mjs):
  dependency direction, no provider SDK dependency, no cross-package import.
- **Lookup** —
  [`test/runtime/catalog.test.mjs`](../../packages/catalog/test/runtime/catalog.test.mjs):
  known/unknown lookup, determinism, immutability, lexical listing order.
- **Definition integrity** — the same file: catalog key equals
  `definition.resource_type` for every entry, every entry declares a `platform`, and
  `max_length`/`length_unit` are declared together or not at all.
- **Integration** —
  [`test/runtime/integration.test.mjs`](../../packages/catalog/test/runtime/integration.test.mjs):
  an end-to-end `resource_type -> catalog lookup -> ResourceDefinition -> evaluate() ->
  ConventionResult` flow, with the lookup performed explicitly before calling
  `evaluate()`.

## Future evolution

- **Milestone 3.2** — research and add a first real AWS Resource Definition slice, with
  authoritative sources for every technical constraint, and use it to test whether the
  current conceptual `placement_constraints` and `allowed_characters` fields can
  faithfully represent real provider rules (see [Specification
  gaps](../../specification/resource-definition.md#out-of-scope-for-this-document)).
- **Additional providers** — an `azure/` or `kubernetes/` directory, created only once a
  concrete task needs one.
- **Tree-shakeable subpaths** — once the catalog grows large enough that a consumer
  might want, for example, "AWS definitions only", a subpath export (for example,
  `@lksnext/iac-conventions-catalog/aws`) could be added without breaking the existing
  root export. Not implemented yet, since the current single-entry catalog does not
  justify it.

See [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md#milestones)
for the full milestone roadmap.
