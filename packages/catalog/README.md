# `@lksnext/iac-conventions-catalog`

Static Resource Definition catalog for the `iac-resource-conventions` Specification.

## Status

Milestone 3.1: catalog architecture and package/API boundary foundation. The catalog
currently contains a single, deliberately minimal `ResourceDefinition` (`aws_s3_bucket`),
added only to prove the catalog's public API and its integration with
`@lksnext/iac-conventions-core`'s `evaluate()`. Broader, researched provider coverage is
deferred to Milestone 3.2. See [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md) at the
repository root and
[`docs/architecture/resource-definition-catalog.md`](../../docs/architecture/resource-definition-catalog.md)
for the full architecture, milestone roadmap, and deferred decisions.

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
