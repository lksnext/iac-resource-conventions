# `@lksnext/iac-conventions-core`

TypeScript domain contracts and Reference Evaluator for the `iac-resource-conventions`
Specification.

> Viewing this on npmjs.com? Relative links below (for example to `IMPLEMENTATION.md` or
> `specification/`) resolve only within the source repository, not from a published package.
> See them at
> <https://github.com/lksnext/iac-resource-conventions>.

## Status

The Executable Domain Model (Milestone 1) and the Reference Evaluator (Milestone 2) are
implemented: domain contracts for every core Specification concept, Context Resolution,
Convention Evaluation (including Specification v1.1 executable naming), and the public
`evaluate()` orchestration API (Milestone 2.7). Metadata projection, general normalization,
truncation, hashing, and global uniqueness remain unimplemented. See
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md) at the repository root for the monorepo
architecture, package boundaries, milestone history, and deferred decisions.

### Node.js requirement

This package's `engines.node` (`>=22`) matches the repository's single, unified Node.js
version policy — see [IMPLEMENTATION.md#status](../../IMPLEMENTATION.md#status) for the
full rationale.

## Intended responsibilities

This package owns:

- TypeScript domain contracts corresponding to the frozen Specification under
  [`specification/`](../../specification/) (Resource Identity, Governance Context, Naming
  Request, Resource Definition, Convention Pack, Convention Result).
- Context Resolution.
- Convention Evaluation.
- Deterministic validation and Convention Result production.
- The public Reference Evaluator API (`evaluate()`/`EvaluateInput`) consumed by
  `@lksnext/iac-conventions-catalog`, the CLI, and adapters.

This package must never depend on the AWS SDK, Terraform, CDK, CLI frameworks, filesystem
state, network services, or any other environment-specific integration.

## Usage

```ts
import { evaluate, type EvaluateInput } from "@lksnext/iac-conventions-core";

const input: EvaluateInput = {
  naming_request: {
    convention: "aws-workload-default",
    resource_type: "aws_s3_bucket",
    functional: { service: "ingestion" },
  },
  convention_pack: {
    id: "aws-workload-default",
    naming_component_order: ["organizational.system", "functional.service", "functional.resource_type"],
    separator: "-",
  },
  evaluation_context: {
    shared_organizational_context: { system: "telemetry-platform" },
  },
  resource_definition: {
    resource_type: "aws_s3_bucket",
    platform: "aws",
  },
};

const result = evaluate(input);
// result.outputs.name === "telemetry-platform-ingestion-aws_s3_bucket"
```

See [`docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented`](../../docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented)
for the full API contract and design rationale.

## Development

From the repository root:

```bash
npm install
npm run build --workspace=@lksnext/iac-conventions-core
npm run typecheck --workspace=@lksnext/iac-conventions-core
```
