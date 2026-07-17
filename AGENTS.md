# AGENTS.md

This document is the primary architectural reference for any human or AI agent (GitHub Copilot,
Serena MCP, or other repository-aware tooling) working in this repository. It describes what the
project is, what it is not, how it is structured, and the rules that keep behavior consistent
across every adapter.

For Copilot-specific, day-to-day operational guidance (tool usage, commit approval workflow),
see [`.github/copilot-instructions.md`](.github/copilot-instructions.md). That file defers to
this one for architectural detail rather than repeating it.

## Project Overview

**iac-resource-conventions** is an open-source monorepo that defines standardized Infrastructure
as Code (IaC) resource conventions — naming, tags, labels, annotations, metadata, and validation
— for AWS, Azure, Kubernetes, and GitOps. Conventions are defined once in a Specification and
consumed by multiple adapters (Terraform, AWS CDK, Ansible, CLI) instead of being re-implemented
per tool.

## Project Goals

- Provide standardized, validated resource conventions across cloud platforms.
- Guarantee consistent behavior across every adapter for the same canonical input.
- Offer reusable, ready-to-use Convention Packs for common organizational contexts.
- Keep the Specification platform-independent, so it is not tied to any single cloud or tool.
- Produce predictable, backward-compatible outputs as the project evolves.

## Non-Goals

This project is **not**:

- A complete cloud governance or policy-enforcement platform.
- A replacement for Terraform, AWS CDK, Ansible, or Kubernetes itself.
- A business-logic runtime or general-purpose application framework.
- An API gateway or deployment platform.
- A place to define adapter-specific conventions — conventions belong in the Specification, not
  in individual adapters.

## Architectural Principles

- **Specification First** — every convention is defined in the Specification before it is
  implemented anywhere else.
- **Single Source of Truth** — naming, tags, labels, metadata, and validation rules are defined
  once and consumed everywhere.
- **Convention over Configuration** — sensible, consistent defaults reduce required configuration.
- **Platform Agnostic** — the Specification is not tied to any single cloud provider or tool.
- **Adapter-based Architecture** — platform-specific tools consume the Specification through thin
  adapters instead of duplicating logic.
- **Deterministic Outputs** — the same canonical input always produces the same output, for any
  adapter.
- **Backward Compatibility** — changes are made carefully to avoid breaking existing consumers.
- **Cross-platform Development** — the project and its tooling behave consistently on Linux,
  macOS, and Windows.
- **Small and Reviewable Changes** — changes are kept focused and scoped to the task at hand.

## Current Repository Structure

This reflects what actually exists in the repository today. Verify against the live file listing
before relying on it — this section can lag behind real changes.

<!-- markdownlint-disable MD060 -->

| Path              | Responsibility                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `README.md`       | Project overview, features, and roadmap.                                                       |
| `AGENTS.md`       | This document — the architectural reference.                                                   |
| `CONTRIBUTING.md` | Contribution workflow and guidelines.                                                          |
| `CODE_OF_CONDUCT.md` | Community expectations.                                                                     |
| `SECURITY.md`     | Vulnerability reporting process.                                                               |
| `CODEOWNERS`      | Review ownership rules.                                                                        |
| `LICENSE`         | Apache License 2.0.                                                                            |
| `package.json`    | npm scripts — the standard task entry point (see below).                                       |
| `package-lock.json` | Locked npm dependency versions.                                                              |
| `scripts/`        | Repository automation (for example, Dev Container setup).                                     |
| `.github/`        | GitHub configuration: Copilot instructions, issue forms, workflows.                            |
| `.devcontainer/`  | Development Container configuration (runtime environment only).                               |
| `.vscode/`        | Shared editor settings and extension recommendations.                                          |
| `.serena/`        | Serena MCP project configuration and memories.                                                 |
| `.editorconfig`   | Repository-wide editor formatting defaults.                                                    |
| `.gitignore`      | Ignored files and directories.                                                                 |
| `specification/`  | The Specification — the current single source of truth for the domain concepts and schemas defined so far. See the tree below. |

```text
specification/
├── README.md
├── resource-identity.md
├── governance-context.md
├── naming-request.md
├── context-resolution.md
├── resource-definition.md
├── convention-pack.md
├── convention-result.md
├── policies/
│   ├── README.md
│   ├── platform-policy.md
│   ├── organization-policy.md
│   └── deployment-model-policy.md
├── convention-packs/
│   ├── README.md
│   └── aws-workload-default.md
└── schemas/
    ├── resource-identity.schema.json
    ├── naming-request.schema.json
    └── governance-context.schema.json
```

No `core/`, `terraform/`, `cdk/`, `ansible/`, `cli/`, `fixtures/`, `tests/`, or `docs/` directory
exists yet — see **Planned Architecture** below.

## Planned Architecture

The following directories are part of the intended architecture but **do not exist yet**. They
represent where the project is heading, not what it currently contains. Create one only when a
task actually requires it — never speculatively, and never merely because it is listed here.

| Path        | Planned Responsibility                                           |
| ----------- | --------------------------------------------------------------- |
| `core/`     | Convention Engine that evaluates the Specification for adapters. |
| `terraform/` | Terraform adapter consuming the Specification.                  |
| `cdk/`      | AWS CDK adapter consuming the Specification.                     |
| `ansible/`  | Ansible adapter consuming the Specification.                    |
| `cli/`      | Command-line adapter consuming the Specification.               |
| `fixtures/`  | Shared, canonical input/output fixtures used by contract tests. |
| `tests/`    | Unit, contract, and integration tests.                          |
| `docs/`     | Reference documentation.                                         |

<!-- markdownlint-enable MD060 -->

## Guidance for AI Agents

- Always inspect the actual repository contents before creating new files or directories — do
  not rely solely on this document, which can become outdated.
- `specification/` exists and is the single source of truth for the domain concepts and schemas
  currently defined there. Inspect it before changing domain models, schemas, examples, adapters,
  or documentation that depend on it.
- Do not invent concepts, attributes, or schemas that are not yet present in `specification/`.
- Do not create any path listed under **Planned Architecture** simply because it is documented
  here. Create it only when the requested task genuinely needs it.
- Repository evolution is incremental: introduce a new directory, adapter, or tool only when
  there is concrete, immediate work that requires it.

## Repository Evolution

This project grows incrementally by design. New directories, adapters, and tooling are
introduced only when they become necessary for a specific, requested change — never
speculatively. When in doubt, prefer extending what already exists over creating new top-level
structure.

## Specification Rules

The Specification defines *what* a convention is: resource naming schemes, tag and label keys and
formats, annotation conventions, metadata fields, validation rules, abbreviations, and any
platform-specific restrictions the convention must respect. The Specification does **not** contain
adapter-specific rendering logic, tool syntax, or infrastructure code — that belongs to adapters.

`specification/` exists in the repository today (see **Current Repository Structure** above) and
is the single source of truth described above for the domain concepts and schemas currently
defined there. Agents must inspect its existing contents before changing domain models, schemas,
examples, adapters, or documentation, and must not invent concepts that are not yet present in it.

The Specification now consists of multiple independent conceptual models — Resource Identity,
Governance Context, Naming Request, Context Resolution, Resource Definition, Convention Pack, and
Convention Result — each answering a distinct question and each documented in its own file under
`specification/`. They are combined into a single conceptual pipeline with exactly two processing
stages, Context Resolution and Convention Evaluation. The Naming Request, Convention Pack, and
Runtime or Shared Context (organizational, deployment, and provisioning facts; see
[`specification/context-resolution.md`](specification/context-resolution.md#runtime-context-and-provisioning-context))
are inputs to Context Resolution; Resource Identity and Governance Context are its outputs;
Resource Definition is an additional input to Convention Evaluation, which produces the
Convention Result. This pipeline is described in
[`specification/README.md`](specification/README.md#architecture). Future adapters and the
Convention Engine implementation must follow these conceptual models rather than redefining or
reinterpreting them.

## Adapter Rules

Adapters (Terraform, AWS CDK, Ansible, CLI, and any future adapter) translate the canonical result
produced by the Specification and Convention Engine into a tool-specific interface. Adapters must
not redefine, reinterpret, or independently duplicate convention rules. Platform-specific code in
an adapter should be limited to rendering and integration logic that cannot reasonably live in the
shared Specification or core engine.

## Convention Packs

Convention Pack is a Specification concept, conceptually documented in
[`specification/convention-pack.md`](specification/convention-pack.md): it defines how canonical
models are projected into platform-specific conventions (naming defaults, deployment defaults,
governance defaults, abbreviations, ordering rules, metadata projection, and override policy).
Concrete Convention Packs (for example, `aws-workload-default`, documented under
[`specification/convention-packs/`](specification/convention-packs/)) are Specification Artifacts
that apply that concept to a specific organizational policy. A Specification Artifact is part of
the Specification, not mere configuration external to it — it is expressed as a Markdown policy
document rather than an abstract, reusable concept. Convention Packs contain organizational
policy; they do not define new conventions or bypass the Specification.

An effective Convention Pack remains the single Specification Artifact selected by a Naming
Request's `convention` field. Internally, it may be assembled from three reusable policy
dimensions, documented under
[`specification/policies/`](specification/policies/):

- **Platform Policy** — how conventions are projected for a target infrastructure platform
  (AWS, Azure, Kubernetes).
- **Organization Policy** — how an organization structures and governs its infrastructure
  platforms (for example, an AWS Organization managed through Control Tower, or an Azure
  Landing Zone).
- **Deployment Model Policy** — the operational isolation and tenancy model of a workload
  (for example, Internal Workload, SaaS Shared, or SaaS Tiered).

Composing these dimensions into an effective Convention Pack is a Specification Artifact
concern, not a third processing stage — the pipeline still has exactly two stages, Context
Resolution and Convention Evaluation. Never create a Convention Pack per tenant or per
customer: a dynamically provisioned Enterprise tenant is an instance of the same Deployment
Model Policy, distinguished by Runtime or Provisioning Context, not by a new Convention Pack.
Runtime Context (dynamic facts tied to one execution, tenant, or provisioned deployment scope)
is never part of a Convention Pack, which contains only stable policy. See
[`specification/convention-pack.md`](specification/convention-pack.md) and
[`specification/context-resolution.md`](specification/context-resolution.md) for the full
model.

## Generated Artifacts

- Some files in the repository may be generated from the Specification or from source templates.
- Generated files must never be edited manually — change the source (Specification, generator, or
  template) and regenerate.
- Generation must be deterministic: the same input must always produce the same output.
- Diffs in generated files must be reviewed like any other change.
- CI should detect stale generated artifacts (generated output that no longer matches its source).

## Testing Strategy

- **Unit tests** validate isolated logic within the Specification, core engine, or an adapter.
- **Shared fixtures** provide canonical input/output pairs used across adapters.
- **Contract tests** verify that every adapter produces the result defined by the shared fixtures.
- **Integration tests** validate end-to-end behavior where appropriate.
- **Compatibility tests** confirm that a change does not alter previously generated output
  without an explicit, documented, versioned reason.
- **Collision tests** verify that naming/abbreviation rules do not produce unintended collisions.

Any change to the Specification must verify that all affected adapters still produce correct,
consistent output, and must include corresponding updates to contract tests.

## Compatibility and Versioning

Public APIs, schemas, Convention Packs, generated outputs, naming algorithms, abbreviations,
truncation rules, and hash strategies follow [Semantic Versioning](https://semver.org/).
Backward-compatible changes are preferred.

Treat the following as **potentially breaking** unless explicitly documented and versioned
accordingly:

- Changed generated resource names, tags, labels, or annotations.
- Changed abbreviations or component ordering.
- Changed truncation or hashing strategy.
- Newly required metadata fields.
- Changed schema fields.
- Changed validation behavior or results.
- Renamed or removed resource types or Convention Packs.

## Coding Conventions

- Prefer clear, simple implementations over clever ones.
- Avoid unnecessary abstraction; generalize only when there is a real, current need.
- Keep functions small and focused on a single responsibility.
- Document non-obvious decisions in code comments or the pull request description.
- Preserve existing terminology and object structures across adapters.
- Avoid platform-specific assumptions; prefer portable implementations.
- Never embed secrets, credentials, or tokens in code, tests, or fixtures.

## Development Workflow

- The Dev Container is the recommended development environment and is also used by GitHub
  Codespaces.
- Native development on Linux, macOS, and Windows is fully supported.
- The root [`package.json`](package.json) npm scripts are the common entry point for project
  tasks (`npm run validate`, `npm test`, `npm run lint`, `npm run fmt`, etc.) across native
  development, the Dev Container, and CI/CD.
- Inspect existing scripts before inventing new commands or duplicating a command's
  implementation elsewhere (VS Code tasks, documentation, CI/CD).

## Repository Infrastructure

Repository tooling and infrastructure files should only be modified when explicitly part of the
requested task:

- `.github/`
- `.devcontainer/`
- `.vscode/`
- `.serena/`
- `.editorconfig`
- `.gitignore`

## Commit and Git Safety

Agents must:

- Never commit without explicit user approval.
- Never push without a separate, explicit request.
- Create only signed commits, and never fall back to an unsigned commit.
- Use [Conventional Commits](https://www.conventionalcommits.org/) messages.
- Avoid staging unrelated files.
- Never amend, reset, rebase, force-push, or rewrite history unless explicitly requested.
- Inspect the staged diff before committing.

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for the detailed,
Copilot-specific commit approval workflow.

## Security

- Never commit secrets, tokens, private keys, or other credentials.
- Keep credentials outside the repository and outside the container image.
- Follow the reporting process described in [`SECURITY.md`](SECURITY.md).
- Do not weaken SSH host verification (for example, disabling `StrictHostKeyChecking`) or loosen
  GitHub Actions workflow permissions as a shortcut to solve an unrelated problem.

## Agent Working Method

1. Inspect the relevant files and repository structure before making changes.
2. Identify the source of truth for the behavior being changed (Specification, generator, or
   adapter).
3. Make the smallest correct change that satisfies the request.
4. Update or add tests (unit, contract, or integration) as appropriate.
5. Run the relevant npm scripts and checks.
6. Report the changes made and any checks that were not executed.
7. Wait for explicit approval before creating a signed commit.
8. Never push automatically.
