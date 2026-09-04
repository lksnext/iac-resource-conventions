# IaC Resource Conventions

> **Project Status**
>
> 🚧 This project is currently under active development.
> APIs, convention packs, and adapters may change until the first stable release (v1.0.0).
>
> The Executable Domain Model is complete, and the platform-independent Reference Evaluator now
> exposes its first public API, `evaluate()` (see [Quick Start](#quick-start) and
> [Roadmap](#roadmap) below).

## Overview

**IaC Resource Conventions** is an Open Source project that provides a unified Specification and
a set of SDKs for defining Infrastructure as Code resource conventions.

Teams adopting Infrastructure as Code across multiple platforms and tools typically end up
re-implementing the same organizational rules — naming schemes, tags, labels, metadata, and
validation — separately for every tool they use, which leads to drift and inconsistent behavior
over time. This project solves that problem by defining conventions once, in a single
Specification, and deriving consistent, validated behavior from it across every supported
platform and adapter.

The project follows a **Specification First** architecture: the Specification is the single
source of truth for every convention, and every adapter (Terraform, AWS CDK, Ansible, CLI)
derives its behavior from it rather than defining equivalent rules independently.

## Features

- **Resource Naming** — consistent, validated resource names derived from the Specification.
- **Resource Tags** — standardized tagging across cloud providers.
- **Kubernetes Labels** — conventional label sets for Kubernetes workloads.
- **Kubernetes Annotations** — consistent annotation conventions for Kubernetes resources.
- **Metadata Generation** — derive structured metadata from a single definition.
- **Convention Packs** — ready-to-use, organization- or platform-specific rule sets.
- **Validation** — verify that resources conform to the Specification before they are deployed.
- **Cross-platform Support** — conventions apply consistently across AWS, Azure, Kubernetes, and
  GitOps.
- **Multiple Infrastructure as Code Adapters** — the same conventions are available through
  Terraform, AWS CDK, Ansible, and a CLI.

## Design Principles

- **Specification First** — every convention is defined in the Specification before it is
  implemented anywhere else.
- **Single Source of Truth** — naming, tags, labels, metadata, and validation rules are defined
  once and consumed everywhere.
- **Convention over Configuration** — sensible, consistent defaults reduce the amount of
  configuration required from users.
- **Platform Agnostic** — the Specification is not tied to any single cloud provider or
  orchestration platform.
- **Adapter-based Architecture** — platform-specific tools consume the Specification through thin
  adapters instead of duplicating logic.
- **Backward Compatibility** — changes are made with care to avoid breaking existing consumers of
  the Specification.
- **Cross-platform Development** — the project and its tooling work consistently on Linux,
  macOS, and Windows.

## Architecture Overview

The Specification is consumed by a Convention Engine, which is what every adapter builds on. No
adapter defines or overrides conventions on its own — this guarantees identical behavior no
matter which adapter a team chooses to use.

```mermaid
flowchart TD
    A[Specification] --> B[Convention Engine]
    B --> C[Terraform]
    B --> D[AWS CDK]
    B --> E[Ansible]
    B --> F[CLI]
```

## Supported Platforms

| Platform   | Description                                    |
| ---------- | ---------------------------------------------- |
| AWS        | Amazon Web Services resources and tagging.     |
| Azure      | Microsoft Azure resources and tagging.         |
| Kubernetes | Labels, annotations, and metadata conventions. |
| GitOps     | Conventions for GitOps-managed deployments.    |

## Supported Adapters

| Adapter   | Description                                          | Status                 |
| --------- | ---------------------------------------------------- | ---------------------- |
| Terraform | Consumes the Specification from Terraform modules.   | Planned                |
| AWS CDK   | Consumes the Specification from AWS CDK constructs.  | Planned                |
| Ansible   | Consumes the Specification from Ansible roles/tasks. | Planned                |
| CLI       | Consumes the Specification from the command line.    | Foundation in progress |

A native Terraform adapter/provider is still planned, but Terraform configurations can
already consume this project's conventions today through the CLI's `terraform-external`
command and the `hashicorp/external` provider — see
[`docs/integrations/terraform.md`](docs/integrations/terraform.md) for this current
bridge approach.

## Convention Packs

Convention Packs are pre-built collections of conventions for a specific organizational context
or platform. They let teams adopt a complete, coherent set of naming, tagging, labeling, and
validation rules without having to configure every individual rule by hand.

Planned examples include:

- `aws-controltower`
- `azure-enterprise-scale`
- `kubernetes-shared`
- `kubernetes-dedicated`
- `saas`

## Repository Structure

The repository is organized around the Specification-first architecture described above.

### Current Repository Structure

```text
.
├── .devcontainer/    # Development Container configuration
├── .github/          # GitHub configuration
├── specification/    # The Specification (single source of truth)
├── packages/         # Implementation monorepo packages (npm workspaces)
│   ├── core/         # @lksnext/iac-conventions-core — domain contracts and Reference Evaluator
│   ├── catalog/      # @lksnext/iac-conventions-catalog — static Resource Definition & Convention Pack catalogs
│   └── cli/          # @lksnext/iac-conventions-cli — command-line adapter (foundation)
├── scripts/          # Repository automation scripts
├── IMPLEMENTATION.md # Implementation monorepo architecture
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── README.md
```

### Planned Architecture

The following areas are introduced incrementally as the project develops and may not yet
exist. See [`IMPLEMENTATION.md`](IMPLEMENTATION.md) for the full package boundary and
dependency rules:

- `packages/adapters/terraform/` — Terraform adapter.
- `packages/adapters/cdk/` — AWS CDK adapter.
- `packages/adapters/ansible/` — Ansible adapter.
- `fixtures/` — Shared, canonical input/output fixtures used by contract tests.
- `tests/` — Unit, contract, and integration tests.

## Quick Start

Requires [Node.js](https://nodejs.org/) 22 LTS or later (see `engines` in
[`package.json`](package.json)); the Dev Container and CI already provide it.

```bash
git clone https://github.com/lksnext/iac-resource-conventions.git
cd iac-resource-conventions
npm install
npm run validate
npm run build
```

`npm install` also enables the repository's Husky git hooks (fast pre-commit formatting/linting
and Conventional Commits validation) via the standard npm `prepare` script — no extra setup step
is required. See [`CONTRIBUTING.md`](CONTRIBUTING.md#git-hooks) for details.

Documentation quality (Markdown style, spelling, and link validation) is checked by
`npm run docs:lint`, `npm run docs:spell`, and `npm run docs:links` — see
[`CONTRIBUTING.md`](CONTRIBUTING.md#documentation-quality) for details.

Architecture and dependency security are checked by `npm run audit`/`npm run audit:production` —
see [`CONTRIBUTING.md`](CONTRIBUTING.md#architecture-and-dependency-security) for details.
Automated package dependency direction validation is intentionally deferred until the
implementation contains multiple packages with meaningful dependency relationships — see
[`IMPLEMENTATION.md`](IMPLEMENTATION.md#dependency-direction).

Dependency license compliance is checked by `npm run licenses:check`/`npm run
licenses:production` — see [`CONTRIBUTING.md`](CONTRIBUTING.md#dependency-license-compliance) for
the commands and [`IMPLEMENTATION.md`](IMPLEMENTATION.md#dependency-license-validation) for the
full allowlist policy and why it is a separate concern from `npm audit`.

### Evaluating a Naming Request

The Reference Evaluator's public API, `evaluate()`, is available from
`@lksnext/iac-conventions-core`:

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

See [`packages/core/README.md`](packages/core/README.md#usage) and
[`docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented`](docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented)
for the full API contract, design rationale, and current capability scope.

## Documentation

- [`IMPLEMENTATION.md`](IMPLEMENTATION.md) — implementation monorepo architecture.
- [`docs/architecture/executable-domain-model.md`](docs/architecture/executable-domain-model.md)
  — architecture bridging the Specification and the future Reference Evaluator.
- [`docs/architecture/executable-domain-model-traceability.md`](docs/architecture/executable-domain-model-traceability.md)
  — Specification-concept-to-public-contract traceability matrix.
- [`docs/architecture/reference-evaluator.md`](docs/architecture/reference-evaluator.md) —
  architecture for the Reference Evaluator (Milestone 2).
- [`docs/architecture/convention-pack-catalog.md`](docs/architecture/convention-pack-catalog.md)
  — architecture for the executable Convention Pack Catalog (Milestone 4.2).
- [`docs/architecture/cli.md`](docs/architecture/cli.md) — architecture for the
  `iac-conventions` CLI, including the `evaluate` and `terraform-external` commands
  (Milestone 4).
- [`docs/integrations/terraform.md`](docs/integrations/terraform.md) — how Terraform
  configurations consume this project's conventions today, through the CLI's
  `terraform-external` command and the `hashicorp/external` provider.
- [`docs/`](docs/) — further reference documentation (planned).
- Reference Documentation — planned.
- [`examples/terraform/external/`](examples/terraform/external/) — a runnable Terraform
  example consuming `terraform-external`.

## Roadmap

### Phase 1

- ✓ Specification — frozen as v1.0, additively extended by v1.1 — Executable Naming,
  and by v1.2 — Executable Resource Constraints (in development; see
  [`specification/README.md`](specification/README.md#specification-status)).

### Phase 2

- ✓ Implementation monorepo architecture (see [`IMPLEMENTATION.md`](IMPLEMENTATION.md)).
- ✓ Executable Domain Model (Milestone 1 — complete; see
  [`IMPLEMENTATION.md`](IMPLEMENTATION.md#milestones)).
- ✓ Reference Evaluator (Milestone 2 — complete for Specification v1.1's executable scope; the
  public `evaluate()` API is available, see
  [`docs/architecture/reference-evaluator.md`](docs/architecture/reference-evaluator.md)).
- Resource Definition Catalog (Milestone 3 — in progress; an initial AWS slice is implemented,
  see [`packages/catalog/README.md`](packages/catalog/README.md)).
- ✓ Executable Convention Packs (Milestone 4.2 — complete; a first pack,
  `aws-workload-default`, is implemented, see
  [`docs/architecture/convention-pack-catalog.md`](docs/architecture/convention-pack-catalog.md)).
- Contract Tests
- CLI (Milestone 4 — in progress; `evaluate` and `terraform-external` are implemented,
  see [`packages/cli/README.md`](packages/cli/README.md)).

### Phase 3

- Terraform Adapter
- CDK Adapter
- Additional adapters

Adapters consume the Specification; they do not redefine it. See
[`AGENTS.md`](AGENTS.md#specification-evolution) for how the Specification itself is
expected to evolve as implementation progresses.

## Contributing

Contributions are welcome. Please see [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development
workflow, [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community expectations, and
[`SECURITY.md`](SECURITY.md) for how to report vulnerabilities.

## Community

- [GitHub Discussions](../../discussions) — for questions, ideas, and design discussions.
- [GitHub Issues](../../issues) — for reporting bugs and requesting specific features.

## License

This project is licensed under the [Apache License 2.0](LICENSE). See [`NOTICE`](NOTICE) for
required copyright attribution.
