# `@lksnext/iac-conventions-catalog`

Static Resource Definition and Convention Pack catalog for the
`iac-resource-conventions` Specification.

> Viewing this on npmjs.com? Relative links below (for example to `docs/` or `specification/`)
> resolve only within the source repository, not from a published package. See them at
> <https://github.com/lksnext/iac-resource-conventions>.

## Status

Milestone 3.2 added a first, intentionally small, evidence-backed AWS Resource
Definition slice — `aws_s3_bucket`, `aws_iam_role`, `aws_lambda_function`, and
`aws_acm_certificate`. Every technical constraint recorded for these four resource
types is sourced from authoritative AWS documentation (cited in a provenance comment
next to each definition, under `src/aws/`); no fact is guessed or inferred from
Terraform provider documentation. Milestone 3.3 validated that slice: every fact was
classified by evidence quality (no `Unsupported` fact was found), `aws_s3_bucket` was
scoped explicitly to general purpose buckets only, and catalog integrity tests were
strengthened. This is still a deliberately incomplete slice, not broad AWS coverage —
see
[`docs/architecture/resource-definition-catalog.md`](../../docs/architecture/resource-definition-catalog.md)
for the full architecture and
[`docs/architecture/resource-definition-catalog-conformance.md`](../../docs/architecture/resource-definition-catalog-conformance.md)
for the per-fact conformance matrix and the model gaps this milestone found (for
example, no `min_length` field, no separate `path` identifier component, and
`placement_constraints`' free-form-only representation of conditional rules).

Milestone 4.2 added a first executable Convention Pack: `aws-workload-default`,
implementing
[`specification/convention-packs/aws-workload-default.md`](../../specification/convention-packs/aws-workload-default.md).
This is currently the **only** Convention Pack the catalog carries — not broad
Convention Pack coverage — see
[`docs/architecture/convention-pack-catalog.md`](../../docs/architecture/convention-pack-catalog.md)
for the full architecture.

## Intended responsibilities

This package owns two separate, static, immutable artifact families:

- A map from canonical `ResourceType` to `ResourceDefinition`, with a minimal lookup
  API: `getResourceDefinition`, `listResourceTypes`.
- A map from `ConventionPackId` to `ConventionPack`, with a minimal lookup API:
  `getConventionPack`, `listConventionPackIds`.

These two families are kept separate — there is no generic `CatalogEntry<T>` or
`ArtifactRegistry<T>` shared between them — since `ResourceDefinition` and
`ConventionPack` are distinct Specification concepts keyed by different identifier
types.

This package must never:

- Perform Context Resolution or Convention Evaluation (that remains
  `@lksnext/iac-conventions-core`'s responsibility).
- Depend on a cloud provider SDK, Terraform, CDK, or any other environment-specific
  integration.
- Expose a mutable runtime registry.

Every catalog entry, in both families, is deeply immutable at runtime (not only its
top-level fields, but any nested object or array field) via an internal `deepFreeze`
helper — see `src/internal/deep-freeze.ts`.

## Conformance validation

Every `ResourceDefinition` catalog entry is checked by an internal, unexported
validator (`src/internal/validate-resource-definition.ts`) during `npm test`, so a
Resource Definition PR that introduces malformed data (for example, `min_length`
greater than `max_length`, a non-integer or `NaN`/`Infinity` length bound, an
unsupported `length_unit`, an empty character set, or a mismatched catalog key) fails
tests before merge. See
[`docs/architecture/resource-definition-catalog.md#catalog-conformance-validation`](../../docs/architecture/resource-definition-catalog.md#catalog-conformance-validation).

Every `ConventionPack` catalog entry is likewise checked by an internal, unexported
validator (`src/internal/validate-convention-pack.ts`) — for example, an out-of-vocabulary
or duplicated `naming_component_order` reference, an unsupported `casing` value, or a
mismatched catalog key. See
[`docs/architecture/convention-pack-catalog.md#conformance`](../../docs/architecture/convention-pack-catalog.md#conformance).

Both validators check structural conformance only, never provider or organizational
policy truth, and are not general-purpose runtime schema validators.

## Usage

```ts
import { getConventionPack, getResourceDefinition } from "@lksnext/iac-conventions-catalog";
import { evaluate } from "@lksnext/iac-conventions-core";

const conventionPack = getConventionPack("aws-workload-default");
const resourceDefinition = getResourceDefinition("aws_s3_bucket");
if (conventionPack === undefined || resourceDefinition === undefined) {
  throw new Error("unknown convention pack or resource type");
}

const result = evaluate({
  naming_request: {
    convention: "aws-workload-default",
    resource_type: "aws_s3_bucket",
    functional: { service: "ingestion" },
  },
  convention_pack: conventionPack,
  evaluation_context: {
    /* ... */
  },
  resource_definition: resourceDefinition,
});
```

## Development

From the repository root:

```bash
npm install
npm run build --workspace=@lksnext/iac-conventions-catalog
npm run typecheck --workspace=@lksnext/iac-conventions-catalog
npm run test --workspace=@lksnext/iac-conventions-catalog
```
