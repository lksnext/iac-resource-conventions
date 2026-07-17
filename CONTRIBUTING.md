# Contributing to IaC Resource Conventions

Thank you for your interest in contributing! **IaC Resource Conventions** provides a unified
specification and set of SDKs for naming, tagging, labeling, annotating, and validating
Infrastructure as Code resources across AWS, Azure, Kubernetes, and GitOps platforms. Our
mission is to make organizational conventions consistent, portable, and enforceable across every
adapter — Terraform, AWS CDK, Ansible, and the CLI — so teams never have to reinvent the same
rules for every platform they use. Contributions of all kinds — specification changes, adapter
improvements, documentation, tests, and bug reports — are welcome and appreciated.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md).
By participating, you are expected to uphold it. Please read it before contributing.

## Before You Start

We follow a standard fork-and-branch workflow:

- Fork the repository to your own account.
- Create a feature branch off the latest `main` for your change.
- Keep changes focused — one logical change per branch and pull request.
- Synchronize your branch regularly with `main` to avoid large, hard-to-review merge conflicts.

## Development Environment

Contributors are welcome to work on **Linux**, **macOS**, or **Windows**. The project is
designed to provide a consistent developer experience across all supported operating systems,
so no platform is treated as a second-class citizen.

The **recommended** development environment is **Visual Studio Code** with the
**Development Container** described below. Native development environments — without Docker or
a Dev Container — are also fully supported.

## Development Container

**Benefits:**

- Consistent environment for every contributor, regardless of host OS.
- Reproducible builds using pinned tool versions.
- Cross-platform support out of the box.
- Ready-to-use toolchain — no manual installation steps.
- Compatible with [GitHub Codespaces](https://github.com/features/codespaces).

**How to use it:**

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or an equivalent
   Docker engine).
2. Install [Visual Studio Code](https://code.visualstudio.com/).
3. Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
   extension.
4. Open the repository in VS Code.
5. Select **Reopen in Container** when prompted (or run it from the Command Palette).

Native development is equally supported for contributors who prefer not to use containers.

## Prerequisites

If you use the Development Container, all required tools are already installed and configured
for you.

If you use a native environment, you are responsible for installing the required development
tools for the parts of the project you intend to work on (for example Terraform, Node.js, or
Python). Refer to the [Development Container](#development-container) definition as the source
of truth for required tool versions.

## Building and Testing

All development workflows — regardless of environment — use the npm scripts defined in the root
[`package.json`](package.json). This keeps behavior identical across native development,
the Dev Container, GitHub Codespaces, and CI/CD pipelines, with no duplicated task definitions.
The repository is an npm workspace monorepo (see [`IMPLEMENTATION.md`](IMPLEMENTATION.md)); root
scripts delegate to the relevant package(s) under [`packages/`](packages/) instead of duplicating
their implementation.

```bash
npm install
npm run validate
npm run build
npm run typecheck
npm run generate
npm test
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run check
npm run check:fix
npm run fmt
```

Run the script relevant to the change you are making. See `package.json` for the full, current
list of available scripts. `lint`, `format`, and `check` run [Biome](https://biomejs.dev/) — the
canonical formatter and linter for TypeScript, JavaScript, JSON, and JSONC in this repository
(see [`IMPLEMENTATION.md`](IMPLEMENTATION.md#formatting-and-linting)). `fmt` remains
Terraform-specific (`terraform fmt`); it does not overlap with Biome's scope.

## Project Architecture

At a high level:

- **The Specification is the single source of truth** for every convention the project defines.
- **Convention Packs** define organization- or platform-specific conventions built on top of the
  Specification.
- **Adapters** (Terraform, AWS CDK, Ansible, CLI) consume the Specification — they do not define
  their own independent rules.
- **Rules must never be duplicated** across adapters; duplication leads to drift and
  inconsistent behavior.
- **Generated artifacts should not be edited manually.** If a generated file needs to change,
  change its source and regenerate it.
- **Contract Tests** guarantee that all adapters produce identical behavior for the same
  Specification input.

## Specification First

This project follows a **Specification First** architecture. Any change affecting:

- Resource naming
- Tags
- Labels
- Metadata
- Validation rules
- Abbreviations
- Resource definitions

must begin with an update to the Specification. Platform adapters should derive their behavior
from the Specification whenever possible, rather than encoding equivalent logic independently.

## Coding Guidelines

- Prefer readability over cleverness.
- Keep functions small and focused on a single responsibility.
- Keep changes focused — avoid mixing unrelated concerns in one pull request.
- Avoid unnecessary abstractions; only generalize when there is a real, current need.
- Follow existing conventions used elsewhere in the codebase.
- Document non-obvious design decisions where appropriate, in code comments or the pull request
  description.

## Cross-platform Requirements

Every contribution should work correctly on Linux, macOS, and Windows. Avoid platform-specific
shell commands whenever possible, and prefer portable implementations (for example, using
Node.js or Python scripts instead of OS-specific shell syntax) so that all contributors and CI
environments behave consistently.

## Testing Requirements

Every functional change should include or update tests. Depending on the nature of the change,
this may include:

- **Unit Tests** for isolated logic.
- **Contract Tests** that verify adapters behave consistently with the Specification.
- **Integration Tests** when appropriate, for end-to-end behavior.

Changes to the Specification should verify that all adapters continue producing identical
behavior after the change.

## Documentation

New functionality should include documentation updates when appropriate. Keeping documentation
close to the code it describes helps it stay accurate as the project evolves. README examples
are encouraged wherever they help clarify usage.

## Commit Messages

We recommend using [Conventional Commits](https://www.conventionalcommits.org/) for commit
messages. Examples:

```
feat(spec): add support for custom abbreviation overrides
fix(terraform): correct tag merge order in resource-conventions module
docs(readme): clarify dev container setup steps
test(contract): add cross-adapter naming parity tests
```

## Pull Requests

When opening a pull request:

- Keep it small and focused on a single change.
- Provide a clear description of what changed and why.
- Explain the motivation behind the change.
- Link related issues, if any.
- Include screenshots only when they add value (for example, for tooling or CLI output changes).

## Repository Governance

This repository is protected using GitHub Rulesets to ensure code quality, security, and consistency.

Contributors should:

- Always submit changes through Pull Requests — direct commits to protected branches are not allowed.
- Ensure pull requests satisfy the repository protection rules configured on GitHub before they can be merged.
- Be aware that repository governance rules may evolve as the project and maintainer team grow.

Repository protection rules may include:

- Required reviews from code owners (enforced via [CODEOWNERS](CODEOWNERS))
- Required status checks and CI validation
- Commit signing requirements
- Other automated checks and validations

Instead of relying on assumptions documented in CONTRIBUTING.md, contributors should verify the current GitHub
rules configured for the repository. As the maintainer team grows, repository governance is expected to become stricter
while maintaining a transparent and supportive contribution experience.

## Reviews

Reviews focus on:

- Correctness
- Maintainability
- Readability
- Cross-platform compatibility
- Backward compatibility
- Architectural consistency (in particular, adherence to the Specification First approach)

## Backward Compatibility

Backward compatibility matters to everyone relying on this project's conventions in production.
Breaking changes should be discussed with maintainers before implementation, so that impact and
migration paths can be considered up front.

## Security

Please review [`SECURITY.md`](SECURITY.md) for details on supported versions and how to report
vulnerabilities. **Security vulnerabilities should never be reported through public GitHub
Issues.**

## Questions

If you have a question, please use:

- [GitHub Discussions](../../discussions) for general questions, ideas, and open-ended
  conversations.
- [GitHub Issues](../../issues) for concrete bugs or well-defined feature requests.

## Thank You

Thank you for taking the time to contribute. This project exists because of contributors like
you, and we look forward to collaborating with you.
