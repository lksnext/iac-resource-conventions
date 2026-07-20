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
npm run clean
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
npm run docs:lint
npm run docs:lint:fix
npm run docs:spell
npm run docs:links
```

Run the script relevant to the change you are making. See `package.json` for the full, current
list of available scripts. `lint`, `format`, and `check` run [Biome](https://biomejs.dev/) — the
canonical formatter and linter for TypeScript, JavaScript, JSON, and JSONC in this repository
(see [`IMPLEMENTATION.md`](IMPLEMENTATION.md#formatting-and-linting)). `fmt` remains
Terraform-specific (`terraform fmt`); it does not overlap with Biome's scope. `docs:lint`,
`docs:spell`, and `docs:links` check documentation quality (see [Documentation
Quality](#documentation-quality) below). `validate` is the same aggregate command run in CI (see
[Continuous Integration](#continuous-integration) below): it chains `typecheck`, `check`,
`docs:lint`, `docs:spell`, `test`, `build`, and Specification JSON validation.

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

This repository requires [Conventional Commits](https://www.conventionalcommits.org/) for commit
messages, enforced by [Commitlint](https://commitlint.js.org/) (`@commitlint/config-conventional`).
Scopes are free-form — use whichever package or area the change touches (`core`, `catalog`,
`cli`, `specification`, `monorepo`, `devcontainer`, `github`, …); no fixed scope list is
enforced. Examples:

```text
feat(spec): add support for custom abbreviation overrides
fix(terraform): correct tag merge order in resource-conventions module
docs(readme): clarify dev container setup steps
test(contract): add cross-adapter naming parity tests
```

## Documentation Quality

Markdown documentation is checked by three tools, each with a distinct responsibility:

- [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) (`npm run docs:lint`,
  `npm run docs:lint:fix`) checks Markdown style and structure. Configuration lives in
  [`.markdownlint-cli2.jsonc`](.markdownlint-cli2.jsonc), with a nested
  [`specification/.markdownlint-cli2.jsonc`](specification/.markdownlint-cli2.jsonc) override for
  the two rules that frozen Specification content cannot satisfy (see the comments in that file).
- [cspell](https://cspell.org/) (`npm run docs:spell`) checks spelling across documentation and
  source code. Configuration lives in [`cspell.config.jsonc`](cspell.config.jsonc); legitimate
  project-specific words (organization names, tool names, compound technical terms) are added to
  [`.cspell/project-words.txt`](.cspell/project-words.txt) with a short justification comment —
  prefer enabling an existing bundled dictionary or locale over growing this list. Do not add a
  word unless cspell actually flags it as unknown.
- [lychee](https://lychee.cli.rs/) (`npm run docs:links`) checks that links in Markdown files
  resolve. Configuration, including every intentionally remapped or excluded link pattern (with
  its justification), lives in [`lychee.toml`](lychee.toml). lychee has no npm package; install it
  locally via `cargo install lychee`, Homebrew (`brew install lychee`), or a [release
  binary](https://github.com/lycheeverse/lychee/releases) to run `docs:links` locally — CI
  installs it automatically via the official `lycheeverse/lychee-action`.

`docs:lint` and `docs:spell` run as part of `npm run validate` (and therefore in CI). `docs:links`
is intentionally excluded from `validate` because it makes real network requests, which would
make local `validate` runs unreliable on flaky or offline connections; it runs in its own CI job
instead (see [Continuous Integration](#continuous-integration) below).

## Git Hooks

Running `npm install` (or `npm ci`) automatically installs [Husky](https://typicode.github.io/husky/)
git hooks via the standard npm `prepare` lifecycle script — no manual setup step is required, in
the Dev Container or natively:

- **`pre-commit`** runs [lint-staged](https://github.com/lint-staged/lint-staged), which applies
  Biome's safe formatting and lint fixes, markdownlint-cli2, and cspell only to the files you
  staged. This keeps the hook fast regardless of repository size — it does not run the build,
  typecheck, full test suite, link checking, or Specification validation.
- **`commit-msg`** runs Commitlint against your commit message (see [Commit
  Messages](#commit-messages) above) and rejects commits that do not follow Conventional Commits.

Pre-commit hooks are a fast, local convenience layer, not the authoritative gate — they can be
skipped (`git commit --no-verify`) or may not run in every environment. **CI is the authoritative
validation** (see [Continuous Integration](#continuous-integration) below) and re-checks
everything regardless of what ran locally. See
[`IMPLEMENTATION.md#git-hooks-and-commit-linting`](IMPLEMENTATION.md#git-hooks-and-commit-linting)
for the full hook configuration.

## Continuous Integration

Every push to `main` and every pull request runs the [`CI` GitHub Actions
workflow](.github/workflows/ci.yml):

- A `validate` job runs `npm ci` followed by `npm run validate` on Linux, macOS, and Windows —
  the same aggregate command described above (including markdownlint-cli2 and cspell), so CI
  never diverges from what you run locally.
- A `commitlint` job (pull requests only) validates every commit message in the pull request.
- A `docs-links` job runs lychee once (not across the OS matrix, since it makes network requests)
  to check that documentation links resolve.

A pull request is expected to pass CI before it can be merged; see [Repository
Governance](#repository-governance) below.

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

- Always submit changes through Pull Requests — direct commits to protected branches are not
  allowed.
- Ensure pull requests satisfy the repository protection rules configured on GitHub before they
  can be merged.
- Be aware that repository governance rules may evolve as the project and maintainer team grow.

Repository protection rules may include:

- Required reviews from code owners (enforced via [CODEOWNERS](CODEOWNERS))
- Required status checks and CI validation (see [Continuous
  Integration](#continuous-integration) above)
- Commit signing requirements
- Conventional Commits, verified by Commitlint (see [Commit Messages](#commit-messages) above)
- Other automated checks and validations

At minimum, contributors should expect:

- `main` is always kept stable and is protected — it only changes through merged pull requests,
  never direct pushes.
- Pull requests require the CI workflow's required status checks to pass before merging.
- Commits are expected to be signed.

Instead of relying on assumptions documented in CONTRIBUTING.md, contributors should verify the
current GitHub rules configured for the repository. As the maintainer team grows, repository
governance is expected to become stricter while maintaining a transparent and supportive
contribution experience.

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
