# `@lksnext/iac-conventions-catalog`

Static Resource Definition catalog for the `iac-resource-conventions` Specification.

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

## Intended responsibilities

This package owns:

- A static, immutable map from canonical `ResourceType` to `ResourceDefinition`.
- A minimal lookup API: `getResourceDefinition`, `listResourceTypes`.

This package must never:

- Perform Context Resolution or Convention Evaluation (that remains
  `@lksnext/iac-conventions-core`'s responsibility).
- Depend on a cloud provider SDK, Terraform, CDK, or any other environment-specific
  integration.
- Expose a mutable runtime registry.

Every catalog entry is deeply immutable at runtime (not only its top-level fields, but
any nested `rendering_constraints`, `identity_constraints`, or `placement_constraints`
object or array) via an internal `deepFreeze` helper — see
`src/internal/deep-freeze.ts`.

## Conformance validation

Every catalog entry is checked by an internal, unexported validator
(`src/internal/validate-resource-definition.ts`) during `npm test`, so a Resource
Definition PR that introduces malformed data (for example, `min_length` greater than
`max_length`, a non-integer or `NaN`/`Infinity` length bound, an unsupported
`length_unit`, an empty character set, or a mismatched catalog key) fails tests before
merge. This checks structural conformance only, never provider truth, and is not a
general-purpose runtime schema validator — see
[`docs/architecture/resource-definition-catalog.md#catalog-conformance-validation`](../../docs/architecture/resource-definition-catalog.md#catalog-conformance-validation).

## Usage

```ts
import { getResourceDefinition } from "@lksnext/iac-conventions-catalog";
import { evaluate } from "@lksnext/iac-conventions-core";

const resourceDefinition = getResourceDefinition("aws_s3_bucket");
if (resourceDefinition === undefined) {
  throw new Error("unknown resource type");
}

const result = evaluate({
  naming_request: {
    convention: "aws-workload-default",
    resource_type: "aws_s3_bucket",
    functional: { service: "ingestion" },
  },
  convention_pack: {
    /* ... */
  },
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
