# `@lksnext/iac-conventions-core`

TypeScript domain contracts and Reference Evaluator for the `iac-resource-conventions`
Specification.

## Status

This package currently contains only a build-verification placeholder. No domain models,
Context Resolution, or Convention Evaluation logic have been implemented yet. See
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md) at the repository root for the monorepo
architecture, package boundaries, and deferred decisions.

### Node.js requirement

This package's `engines.node` (`>=22`) matches the repository's single, unified Node.js
version policy — see [IMPLEMENTATION.md#status](../../IMPLEMENTATION.md#status) for the
full rationale.

## Intended responsibilities

Once implemented, this package will own:

- TypeScript domain contracts corresponding to the frozen Specification under
  [`specification/`](../../specification/) (Resource Identity, Governance Context, Naming
  Request, Resource Definition, Convention Pack, Convention Result).
- Context Resolution.
- Convention Evaluation.
- Deterministic validation and Convention Result production.
- The public Reference Evaluator API consumed by `@lksnext/iac-conventions-catalog`, the
  CLI, and adapters.

This package must never depend on the AWS SDK, Terraform, CDK, CLI frameworks, filesystem
state, network services, or any other environment-specific integration.

## Usage

```ts
import { CORE_PACKAGE_NAME } from "@lksnext/iac-conventions-core";
```

## Development

From the repository root:

```bash
npm install
npm run build --workspace=@lksnext/iac-conventions-core
npm run typecheck --workspace=@lksnext/iac-conventions-core
```
