# Implementation Architecture

This document describes the **implementation monorepo architecture** for
`iac-resource-conventions`: how the frozen conceptual Specification under
[`specification/`](specification/) is turned into working software — a TypeScript
Reference Evaluator, executable Convention Packs, a Resource Definition catalog, a CLI,
and future Terraform/CDK/Ansible adapters.

It does **not** redefine or duplicate the Specification. Where this document and the
Specification appear to overlap, the Specification is authoritative for *what* a
convention is; this document only describes *how* that concept is implemented in code.

See [`AGENTS.md`](AGENTS.md) for the overall project architecture and
[`.github/copilot-instructions.md`](.github/copilot-instructions.md) for day-to-day
operational rules (commit approval, tool usage). This document is the implementation
counterpart to those — it does not repeat their governance rules.

## Status

This is the **implementation foundation** only. As of this writing:

- **Unified Node.js version policy** — the root [`package.json`](package.json) and every
  workspace package (for example [`packages/core/package.json`](packages/core/package.json))
  declare the same `engines.node` floor: **Node.js 22 LTS or later** (`>=22`). The root
  floor is a hard requirement — Commitlint, cspell, and lint-staged do not run on Node
  18/20 — and every published package matches it rather than declaring an independent,
  lower consumer-facing floor, keeping a single Node.js version policy for the whole
  repository instead of one per package. The Dev Container and CI both resolve Node via
  a floating `lts` pointer, so they always satisfy this floor without a manual version
  bump.
- `packages/core` exists as a minimal, non-domain-specific placeholder that proves the
  workspace, TypeScript configuration, and build/typecheck scripts work end to end.
- [Biome](https://biomejs.dev/) is configured as the canonical formatter and linter for
  TypeScript, JavaScript, JSON, and JSONC across the whole repository (see
  [Formatting and linting](#formatting-and-linting)). ESLint and Prettier are not used.
- Husky, lint-staged, and Commitlint provide pre-commit and commit-msg git hooks, and
  a GitHub Actions workflow provides reproducible CI (see
  [Git hooks and commit linting](#git-hooks-and-commit-linting) and [CI](#ci)).
- markdownlint-cli2, cspell, and lychee provide documentation quality checks (Markdown
  style, spelling, and link validation) locally and in CI (see [Documentation quality
  tooling](#documentation-quality-tooling)).
- npm audit provides dependency security validation locally and in CI (see
  [Dependency security validation](#dependency-security-validation)). Automated
  architectural dependency validation is intentionally deferred until the
  implementation contains multiple packages with meaningful dependency
  relationships (see [Architectural dependency validation
  (deferred)](#architectural-dependency-validation-deferred)).
- license-checker-rseidelsohn provides dependency license compliance validation locally and in
  CI (see [Dependency license validation](#dependency-license-validation)) — a separate concern
  from npm audit's security scanning.
- No Context Resolution, Convention Evaluation, naming algorithm, metadata projection,
  Placement Constraint validation, CLI behavior, or adapter integration has been
  implemented.
- `packages/catalog`, `packages/cli`, and `packages/adapters/*` do not exist yet — they
  are planned (see [Planned packages](#planned-packages)) and must only be created when
  a concrete task needs them, per the repository's incremental-evolution principle (see
  [`AGENTS.md`](AGENTS.md#repository-evolution)).

## Milestones

- **Milestone 1 — Executable Domain Model: Complete.** Every central Specification concept
  (Naming Request, Resource Identity, Governance Context, Evaluation Context, Resource
  Definition, Convention Pack, Convention Result) has a behavior-free, platform-independent
  public TypeScript contract, exported from the package root only, with no production
  dependencies and no circular internal dependencies. Traceability against the Specification
  is recorded in
  [`docs/architecture/executable-domain-model-traceability.md`](docs/architecture/executable-domain-model-traceability.md).
  Compile-time contract tests and package-level build/runtime tests pass (see [Testing and
  fixture strategy](#testing-and-fixture-strategy)). No Reference Evaluator behavior exists.
- **Milestone 2 — Reference Evaluator: In progress.** The deterministic, platform-independent
  implementation of Context Resolution and Convention Evaluation. Architecture defined in
  [`docs/architecture/reference-evaluator.md`](docs/architecture/reference-evaluator.md).
  - Current increment: **2.1 — Evaluator architecture and public contract** (architecture and
    module boundary only; no behavior).
  - Next increment: **2.2 — Context Resolution** (Resource Identity and Governance Context).
  - Planned: **2.3 — Resource Definition selection**, **2.4 — Convention Evaluation:
    projection and output generation**, **2.5 — Convention Evaluation: validation and
    Convention Result production**.
  - Deferred: see
    [`docs/architecture/reference-evaluator.md#deferred-decisions`](docs/architecture/reference-evaluator.md#deferred-decisions).

## Package Naming Policy

The GitHub repository name, npm scope, package family, and package suffix are four
independent, deliberately distinct concerns:

- **The GitHub repository name identifies the project** —
  `iac-resource-conventions` is the project as a whole: the Specification, this
  implementation monorepo, and every package and adapter it contains.
- **The npm scope identifies the publishing organization** — `@lksnext` is the GitHub
  organization that owns and publishes these packages, not the project itself.
- **The package family identifies the reusable library ecosystem** —
  `iac-conventions` is the shared name every published package in this repository
  builds on, independent of the (longer, more descriptive) repository name.
- **The package suffix identifies the package responsibility** — `core`, `catalog`,
  `cli`, and future suffixes (`terraform`, `cdk`, `ansible`, `testing`, `vscode`, …)
  identify what that specific package is responsible for.

The folder name under `packages/` (`core/`, `catalog/`, `cli/`, …) is intentionally
short and independent from the published package name — the directory layout must
never be inferred from, or assumed to match, the npm package name.

| Purpose | Name |
| --- | --- |
| GitHub repository | `iac-resource-conventions` |
| npm scope | `@lksnext` |
| Package family | `iac-conventions` |
| Core package | `@lksnext/iac-conventions-core` |
| Catalog package | `@lksnext/iac-conventions-catalog` |
| CLI package | `@lksnext/iac-conventions-cli` |
| Future aggregate package | `@lksnext/iac-conventions` |

Future packages follow the same `@lksnext/iac-conventions-<suffix>` convention, for
example `@lksnext/iac-conventions-terraform`, `@lksnext/iac-conventions-cdk`,
`@lksnext/iac-conventions-ansible`, `@lksnext/iac-conventions-testing`, and
`@lksnext/iac-conventions-vscode`. `@lksnext/iac-conventions` (no suffix) is
**reserved** for a possible future convenience package that re-exports the public APIs
of `core` and `catalog` together — it is not created in this task, and must not be
created speculatively.

The repository name intentionally differs from the published package names:

- **Repository names optimize discoverability** — `iac-resource-conventions` is
  descriptive and unambiguous when someone finds the project on GitHub.
- **Package names optimize usability and imports** — `iac-conventions-*` is shorter,
  since it is typed in every import statement, `package.json` dependency, and CLI
  invocation.
- **The npm scope already identifies the publisher** — `@lksnext` makes restating
  "iac-resource-conventions" as part of the scope redundant; the scope and the package
  family together (`@lksnext/iac-conventions-*`) are sufficient to identify both the
  publisher and the project unambiguously.

The planned CLI executable name is `iac-conventions` (see
[CLI distribution](#cli-distribution-planned-not-implemented) below) — short and
independent from both the repository name and the `@lksnext/iac-conventions-cli`
package name that publishes it.

Do not use the `@iac-resource-conventions/*` scope — an npm scope must map to a
publishing organization (`@lksnext`), not restate the repository name.

## Package structure

```text
packages/
└── core/               # @lksnext/iac-conventions-core (exists)
    ├── package.json
    ├── README.md
    ├── tsconfig.json
    └── src/
        └── index.ts
```

### Planned packages

These do not exist yet. Do not create them speculatively — only when a concrete task
requires them:

```text
packages/
├── catalog/            # @lksnext/iac-conventions-catalog (planned)
├── cli/                # @lksnext/iac-conventions-cli (planned)
└── adapters/
    ├── terraform/       # @lksnext/iac-conventions-terraform (planned)
    ├── cdk/             # @lksnext/iac-conventions-cdk (planned)
    └── ansible/          # ansible adapter (language TBD; likely not an npm package)
```

`@lksnext/iac-conventions` (no suffix) is reserved for a possible future convenience
package (see [Package Naming Policy](#package-naming-policy) above) — it is not created
in this task, and must not be created speculatively.

### Package responsibilities

| Package | Responsibility | May depend on |
| --- | --- | --- |
| `@lksnext/iac-conventions-core` | TypeScript domain contracts for the Specification; Context Resolution; Convention Evaluation; deterministic validation; Convention Result production; the public Reference Evaluator API. | *(none internal)* |
| `@lksnext/iac-conventions-catalog` | Executable Resource Definitions; executable Convention Packs; registries; built-in canonical artifacts. | `core` |
| `@lksnext/iac-conventions-cli` | JSON/YAML input; invoking the Reference Evaluator; machine-readable output; exit codes; local filesystem integration. | `core`, `catalog` |
| Adapters (`terraform`, `cdk`, `ansible`, …) | Render Convention Results for a target tool; consume the Reference Evaluator contract. | `core`, optionally `catalog` |

`core` must never depend on the AWS SDK, Terraform, CDK, CLI frameworks, filesystem
state, network services, or any other environment-specific integration — it is a pure,
deterministic library.

## Dependency direction

```text
Specification
    ↓
core
    ↓
catalog
    ↓
cli and adapters
```

More precisely:

```text
core        -> no internal package dependencies
catalog     -> core
cli         -> core + catalog
adapters    -> core, and optionally catalog
```

Disallowed:

```text
core -> catalog
core -> cli
core -> adapters
catalog -> cli
catalog -> adapters
adapter A -> adapter B
```

This dependency direction is documented as the architectural contract for the
implementation monorepo; it is not yet enforced by an automated dependency graph tool.
Architecture enforcement will be introduced once the implementation contains multiple
packages with meaningful dependency relationships. Until then, the documented package
dependency direction above is the architectural contract — see [Architectural
dependency validation (deferred)](#architectural-dependency-validation-deferred)
below.

## Module format

**Decision: TypeScript compiled to ECMAScript Modules (ESM), single build, no dual
ESM/CommonJS output.**

- `module`/`moduleResolution`: `NodeNext`, targeting `ES2022`.
- Each package sets `"type": "module"` and publishes a single ESM entry point.
- Declaration files (`.d.ts`) and source maps are generated for every package.
- Rationale: Node.js LTS, modern bundlers, and AWS CDK all consume ESM without issue;
  the CLI runs directly under Node.js; and a single build output avoids the maintenance
  cost of dual-publishing. If a concrete consumer (for example a CommonJS-only Terraform
  tool integration) later demonstrates a real incompatibility, revisit this decision —
  do not add a CommonJS build speculatively.

## TypeScript configuration

```text
tsconfig.base.json
packages/core/tsconfig.json
```

[`tsconfig.base.json`](tsconfig.base.json) is shared by every package and enables:

- `strict` — baseline type safety for a public library.
- `noUncheckedIndexedAccess` — the Specification's models have optional/dynamic fields
  (for example tag maps); indexed access must be treated as possibly `undefined` so it
  is modeled accurately instead of assumed present.
- `exactOptionalPropertyTypes` — the Specification distinguishes "field omitted" from
  "field present with an empty/undefined value" in several places (for example optional
  Governance Context attributes); this flag preserves that distinction instead of
  silently collapsing it.
- `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noImplicitReturns` — standard
  correctness guards with no known downside for this codebase.
- `useUnknownInCatchVariables` — forces explicit narrowing of caught errors, which
  matters once the evaluator starts distinguishing validation failures from unexpected
  errors.
- `isolatedModules` — every file must be safely transpilable in isolation (no
  ambiguous `const enum`/namespace-merging patterns), which keeps the codebase
  compatible with single-file transpilers and bundlers; no known downside for this
  codebase.
- `verbatimModuleSyntax` — type-only imports/exports must use `import type`/
  `export type` explicitly, so the NodeNext ESM output never accidentally imports a
  type as a value (which would fail at runtime). Pairs with Biome's `useImportType`
  lint rule (see [Formatting and linting](#formatting-and-linting)).
- `declaration`, `declarationMap`, `sourceMap` — every package publishes types and
  supports source-mapped debugging.

Each package's `tsconfig.json` extends the base and only adds its own `rootDir`/
`outDir` and `include`. Project references (`composite`/`tsc -b`) are intentionally not
configured yet — with a single package there is nothing to compose a build graph from;
introduce them when `catalog` (or another package that depends on `core`) is created and
cross-package incremental builds become useful.

## Package API and exports

- Single public entry point per package (`packages/core/src/index.ts`), exported via a
  single `"."` condition in `package.json#exports`. No subpath exports
  (`@lksnext/iac-conventions-core/models`, `.../evaluation`, etc.) yet — add them only
  when a real internal boundary needs to be exposed independently.
- No broad barrel re-exports of internal implementation files; `index.ts` will export
  only the intentionally public surface as domain modules are added.
- `main`/`types` fields are kept in sync with `exports` for compatibility with tools that
  do not yet read `exports`.

## Source and build layout

```text
packages/core/
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.test.json
├── src/
│   ├── index.ts
│   └── model/
│       ├── index.ts
│       ├── common/
│       ├── identity/
│       ├── governance/
│       ├── contexts/
│       ├── requests/
│       ├── definitions/
│       ├── conventions/
│       └── results/
├── test/
│   ├── types/
│   └── runtime/
└── dist/            # generated, git-ignored
```

- Source lives under `src/`; compiled output lives under `dist/`.
- `dist/` is git-ignored (see [`.gitignore`](.gitignore)) and is never committed.
- `package.json#files` restricts any published tarball to `dist/` only — `test/` is
  never published (verified with `npm pack --dry-run`).
- `build` (`tsc -p tsconfig.json`) and `typecheck` (`tsc -p tsconfig.json --noEmit`) are
  separate scripts so CI/local runs can type-check without emitting, or build without a
  redundant separate type-check pass.

### Executable Domain Model contracts (implemented)

The initial, behavior-free TypeScript contracts for the Executable Domain Model (see
[`docs/architecture/executable-domain-model.md`](docs/architecture/executable-domain-model.md))
are implemented under `packages/core/src/model/`, one subdirectory per concept, following
that document's proposed layout. See
[`docs/architecture/executable-domain-model-traceability.md`](docs/architecture/executable-domain-model-traceability.md)
for the full Specification-concept-to-contract mapping; the summary table below is a quick
overview only.

| Concept | Contract(s) | Specification source |
| --- | --- | --- |
| Naming Request | `NamingRequest`, `NamingRequestFunctional`, `NamingRequestDeployment`, `NamingRequestOverrides` | [`specification/naming-request.md`](specification/naming-request.md) |
| Resource Identity | `ResourceIdentity`, `OrganizationalIdentity`, `DeploymentIdentity`, `FunctionalIdentity` | [`specification/resource-identity.md`](specification/resource-identity.md) |
| Governance Context | `GovernanceContext` | [`specification/governance-context.md`](specification/governance-context.md) |
| Evaluation Context | `EvaluationContext`, `SharedOrganizationalContext`, `SharedDeploymentContext`, `RuntimeContext`, `ProvisioningContext`, `EvaluationContextSource` | [`specification/context-resolution.md`](specification/context-resolution.md) |
| Resource Definition | `ResourceDefinition`, `ResourceIdentityConstraints`, `ResourceRenderingConstraints` | [`specification/resource-definition.md`](specification/resource-definition.md) |
| Convention Pack | `ConventionPack`, `ConventionPackIdentityDefaults`, `ConventionPackOverridePolicy` | [`specification/convention-pack.md`](specification/convention-pack.md) |
| Convention Result | `ConventionResult`, `ConventionOutputs`, `ConventionMetadata`, `ConventionValidation`, `ConventionValidationFailure`, `ConventionWarning` | [`specification/convention-result.md`](specification/convention-result.md) |
| Shared identifiers | `ResourceType`, `ConventionPackId`, `GovernanceProfileId`, `Platform`, `DeploymentScope`, `ProviderScopeId`, `Environment`, `Location`, `TenantId` | reused across the concepts above |

All contracts are exported from the package root only — no subpath imports:

```ts
import type { NamingRequest, ConventionResult } from "@lksnext/iac-conventions-core";
```

Every contract is type-only (an `interface` or a `type` alias); the package still has no
runtime behavior beyond the existing `CORE_PACKAGE_NAME` constant. Context Resolution,
Convention Evaluation, naming algorithms, validation rules, and every adapter remain
unimplemented — see
[`docs/architecture/executable-domain-model.md#non-goals`](docs/architecture/executable-domain-model.md#non-goals).

Two Specification documents — [`convention-pack.md`](specification/convention-pack.md) and
[`resource-definition.md`](specification/resource-definition.md) — explicitly leave their
concept without a JSON Schema or concrete syntax (see their own "Out of scope" sections).
`ConventionPack` and `ResourceDefinition` therefore model only the named responsibility
categories those documents describe in prose (for example, required attributes and naming
component order as dotted attribute-path strings), and intentionally do not invent a
concrete schema for the parts the Specification itself defers, such as normalization syntax
or metadata key-mapping format. Field names elsewhere follow the exact snake_case used by
the existing JSON Schemas (for example `business_unit`, `deployment_scope`,
`custom_metadata`); for contracts with no existing schema (Evaluation Context and its
sub-contexts, and the Resource Definition/Convention Pack fields described only in prose),
the same snake_case convention is used for consistency across the model rather than mixing
naming styles.

## Formatting and linting

[Biome](https://biomejs.dev/) is the canonical formatter and linter for TypeScript,
JavaScript, JSON, and JSONC in this repository. ESLint and Prettier are intentionally
not used — Biome replaces both with a single, fast, dependency-light tool, resolving
the "Linter" item that was previously listed under
[Deferred decisions](#deferred-decisions).

- Configuration lives at the repository root in [`biome.jsonc`](biome.jsonc) and
  applies once across the whole workspace; packages do not declare their own
  Biome config or `lint`/`format` scripts.
- `vcs.useIgnoreFile: true` means Biome respects [`.gitignore`](.gitignore) (for
  example `node_modules/`, `dist/`, `build/`) instead of duplicating those patterns.
- Formatting settings (`indentStyle: space`, `indentWidth: 2`, `lineEnding: lf`) match
  [`.editorconfig`](.editorconfig); the same settings are not repeated in `.editorconfig`
  beyond what already existed there.
- The linter enables Biome's `recommended` rule preset (correctness, suspicious, style,
  and complexity rules) and explicitly raises `noUnusedImports` and `noUnusedVariables`
  from their default `warn` severity to `error`, so unused imports/variables fail
  `biome lint`/`biome check` rather than only warning.
- Import organization runs via Biome's built-in `assist.actions.source.organizeImports`
  (no separate plugin); it sorts and groups imports without altering public import
  paths such as `@lksnext/iac-conventions-core`.
- Biome's formatter was verified to produce no changes to the existing
  `specification/schemas/*.json` files — their existing 2-space indentation already
  matches this configuration, so no frozen Specification content was reformatted.
- VS Code integration: the `biomejs.biome` extension is recommended in
  [`.vscode/extensions.json`](.vscode/extensions.json) and configured as the default
  formatter for `[typescript]`, `[javascript]`, `[json]`, and `[jsonc]` in
  [`.vscode/settings.json`](.vscode/settings.json), with format-on-save and
  Biome-specific code actions (`source.fixAll.biome`, `source.organizeImports.biome`).
  Terraform, YAML, and Markdown keep their existing formatters/settings, unchanged.
- Root npm scripts (see [Root workspace commands](#root-workspace-commands)) wrap the
  Biome CLI directly (`biome format`, `biome lint`, `biome check`) rather than
  delegating through `--workspaces --if-present`, since Biome runs once across the
  whole repository from the root, not per package.

## Root workspace commands

The root [`package.json`](package.json) remains the standard task entry point and now
declares an npm workspace (`"workspaces": ["packages/*"]`). Package-specific scripts
(`build`, `typecheck`, `test`) delegate to per-package scripts instead of duplicating
their implementation; formatting/linting scripts invoke Biome directly across the whole
repository:

```text
npm run build          -> npm run build --workspaces --if-present
npm run clean          -> npm run clean --workspaces --if-present
npm run typecheck      -> npm run typecheck --workspaces --if-present
npm test               -> npm run test --workspaces --if-present
npm run lint           -> biome lint .
npm run lint:fix        -> biome lint --write .
npm run format          -> biome format --write .
npm run format:check    -> biome format .
npm run check           -> biome check .
npm run check:fix       -> biome check --write .
npm run validate        -> npm run typecheck && npm run check && npm run docs:lint &&
                            npm run docs:spell && npm run test && npm run build &&
                            npm run validate:specification
npm run validate:specification -> node scripts/validate-json.mjs
npm run docs:lint       -> markdownlint-cli2
npm run docs:lint:fix   -> markdownlint-cli2 --fix
npm run docs:spell      -> cspell --no-progress --dot "**/*.{md,ts,tsx,js,jsx,mjs,cjs,
                            json,jsonc,yml,yaml}"
npm run docs:links      -> lychee --config lychee.toml "**/*.md"
npm run audit           -> npm audit --audit-level=high
npm run audit:production -> npm audit --omit=dev --audit-level=high
npm run licenses:check  -> node scripts/check-licenses.mjs
npm run licenses:production -> node scripts/check-licenses.mjs --production
npm run licenses:report -> node scripts/check-licenses.mjs --report
npm run fmt             -> terraform fmt -recursive              (unchanged)
npm run prepare         -> husky                                  (git hook install)
```

`--if-present` means a package that has not yet defined a given script (for example a
future `catalog` package before it has tests) is silently skipped rather than failing the
whole workspace run — this is also why `clean` is a no-op today (no package currently
defines a `clean` script) but is already wired at the root so a package can opt in
without any root changes. `fmt` is unchanged because it operates outside Biome's scope
(Terraform formatting via the Terraform CLI). `validate` is an aggregate command
that chains type checking, Biome checks, Markdown linting, spell checking, tests, the
build, and the existing Specification JSON validation. `docs:links` (lychee) and
`audit`/`audit:production` (npm audit) are intentionally excluded from `validate`
because both make real network requests — see [Documentation quality
tooling](#documentation-quality-tooling) and [Dependency security
validation](#dependency-security-validation) below. `licenses:check`/`licenses:production`
are also excluded from `validate`, for a different reason: some dependencies install
optional, platform-specific packages (for example Biome's per-OS `@biomejs/cli-*`
binaries), so the exact set of licensed packages is not always identical across every
OS `validate` runs on — see [Dependency license
validation](#dependency-license-validation) below. `prepare` runs automatically after
`npm install`/`npm ci` (the standard npm lifecycle hook) and only installs Husky's git
hooks — see [Git hooks and commit linting](#git-hooks-and-commit-linting) below.

## Git hooks and commit linting

[Husky](https://typicode.github.io/husky/), [lint-staged](https://github.com/lint-staged/lint-staged),
and [Commitlint](https://commitlint.js.org/) provide fast local feedback before a commit
is created. They intentionally duplicate none of the validation logic already expressed
as npm scripts — both hooks below simply invoke the same tooling contributors already use
manually.

- **`prepare` script** (`package.json`) — runs `husky` after `npm install`/`npm ci`, which
  points git's `core.hooksPath` at [`.husky/`](.husky/). No global Husky installation is
  required; the hook activation is entirely workspace-local.
- **`.husky/pre-commit`** — runs `npx lint-staged`, which runs `biome check --write
  --no-errors-on-unmatched` and `cspell` on staged `*.{js,cjs,mjs,jsx,ts,tsx,json,jsonc}`
  files, and `markdownlint-cli2` and `cspell` on staged `*.md` files (the `lint-staged`
  key in `package.json`). Safe Biome fixes are applied and re-staged automatically. This
  hook intentionally does **not** run the build, typecheck, full test suite, link
  checking, or Specification validation — those stay in `npm run validate`/`npm run
  docs:links` and CI, so the hook stays fast regardless of repository size.
- **`.husky/commit-msg`** — runs `npx --no -- commitlint --edit "$1"`, validating the
  commit message against [`commitlint.config.js`](commitlint.config.js) (extending
  `@commitlint/config-conventional`). Scopes are free-form — any package or area name
  (`core`, `catalog`, `cli`, `specification`, `monorepo`, `devcontainer`, `github`, …) is
  accepted; no fixed scope list is enforced. See
  [`CONTRIBUTING.md#commit-messages`](CONTRIBUTING.md#commit-messages) for message
  examples.
- **`.husky/_/`** is Husky's own generated internal directory (ignored via its own
  `.gitignore` file); it is never edited by hand.
- Pre-commit hooks are a fast, local convenience layer, not the authoritative gate — CI
  (see [CI](#ci) below) re-validates everything on every push and pull request
  regardless of what ran locally, since hooks can be skipped (`git commit --no-verify`)
  or not installed in every environment.
- No `pre-push`, `post-commit`, or `prepare-commit-msg` hook is added — nothing in this
  task justifies the extra friction of a slower hook beyond `pre-commit`/`commit-msg`.

## Documentation quality tooling

Three tools check documentation quality, each with a single, non-overlapping
responsibility. None of them redefine or duplicate rules already expressed by Biome,
and none run against the frozen Specification content in a way that would require
editing it merely to satisfy tooling (see [`AGENTS.md`](AGENTS.md#specification-evolution)).

- **[markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2)** (`npm run
  docs:lint`, `npm run docs:lint:fix`) — Markdown style and structure. Root config
  [`.markdownlint-cli2.jsonc`](.markdownlint-cli2.jsonc) raises `MD013` (line length) to
  100 to match Biome's `lineWidth: 100`, excludes tables and code blocks from that rule
  (GFM table rows are inherently single-line and can be very long; code blocks may
  contain long URLs or shell/JSON examples unrelated to prose wrapping), and sets
  `MD046` to `fenced` since the whole repository already uses fenced code blocks
  exclusively. A nested
  [`specification/.markdownlint-cli2.jsonc`](specification/.markdownlint-cli2.jsonc)
  cascading override disables `MD009` and `MD013` only for that directory, with inline
  comments explaining the two specific, pre-existing pieces of frozen content (a
  trailing space, and a 201-character attribute-description line) that cannot be
  reflowed without editing frozen Specification prose.
- **[cspell](https://cspell.org/)** (`npm run docs:spell`) — spelling, across both
  documentation and source code. Config [`cspell.config.jsonc`](cspell.config.jsonc)
  enables both the `en` and `en-GB` locales (so legitimate British spellings like
  "behaviour" in Specification/governance prose do not need individual dictionary
  entries) plus cspell's bundled dictionaries relevant to this stack (Node, npm,
  TypeScript, bash, git, Markdown, HTML, CSS, Docker, AWS, Kubernetes, Terraform,
  filetypes, general software terms) — all already available transitively via
  `@cspell/cspell-bundled-dicts`, so no extra dependency was added for them. A small
  project dictionary, [`.cspell/project-words.txt`](.cspell/project-words.txt), lists
  only words cspell actually flagged as unknown (organization/tool names, git config
  keys, compound technical terms), each grouped with a short justification comment.
- **[lychee](https://lychee.cli.rs/)** (`npm run docs:links`) — link validation for
  Markdown files. Config [`lychee.toml`](lychee.toml) sets retry/timeout/user-agent
  behavior and documents two categories of intentional exception, each justified
  inline: (1) `remap` entries that rewrite the repository's GitHub-web-UI-relative
  links (`../../discussions`, `../../issues`, `../../security/advisories/new`) to their
  real `https://github.com/...` equivalents, so they are genuinely checked rather than
  skipped; and (2) a single `exclude` entry for the planned-but-not-yet-created `docs/`
  directory referenced in README.md (see [`AGENTS.md`](AGENTS.md#planned-architecture)).
  External link validation is not disabled globally. lychee has no npm package (the
  npm registry's `lychee` package is an unrelated, deprecated ORM); the Dev Container
  installs a pinned release binary (see
  [`.devcontainer/Dockerfile`](.devcontainer/Dockerfile)), while native environments must
  install it separately to run `docs:links` locally (cargo, Homebrew, or a release
  binary). CI installs it automatically via the official
  [`lycheeverse/lychee-action`](https://github.com/lycheeverse/lychee-action) (see
  [CI](#ci)).

`docs:lint` and `docs:spell` run in `npm run validate` (and therefore in the `validate`
CI job) because they are fast and offline. `docs:links` is intentionally excluded from
`validate` because it makes real network requests, which would make local `validate`
runs unreliable offline or on a flaky connection; it runs as its own CI job instead
(see [CI](#ci)). `lint-staged` also runs markdownlint-cli2 and cspell against staged
Markdown files (see [Git hooks and commit linting](#git-hooks-and-commit-linting)
above), but never lychee, for the same network-reliability reason.

No VS Code settings changes were needed: [`.vscode/extensions.json`](.vscode/extensions.json)
already recommended `DavidAnson.vscode-markdownlint` and `streetsidesoftware.code-spell-checker`,
and both extensions auto-discover their config files (`.markdownlint-cli2.jsonc`,
`cspell.config.jsonc`) without additional editor settings.

## Architectural dependency validation (deferred)

The package dependency direction documented in [Dependency
direction](#dependency-direction) above — `core` has no internal dependencies;
`catalog` may depend on `core`; `cli` may depend on `core` and `catalog`; adapters may
depend on `core` and, optionally, `catalog`, but never on each other or on `cli` —
including no circular dependencies and no deep imports into another package's internal
`src/` files, is the architectural contract for this implementation monorepo.

Automated enforcement of these rules (a dependency graph tool, circular-dependency
detection, deep-import checks) is intentionally **not** introduced yet: only
`packages/core/` exists today (see [Planned packages](#planned-packages)), so there is
no meaningful multi-package dependency graph for such a tool to validate.
Architecture enforcement will be introduced once the implementation contains multiple
packages with meaningful dependency relationships. Until then, the documented package
dependency direction above is the architectural contract, and code review is the
enforcement mechanism.

## Dependency security validation

`npm run audit` (`npm audit --audit-level=high`) and `npm run audit:production` (`npm
audit --omit=dev --audit-level=high`) check installed dependencies against the npm
advisory database. `--audit-level=high` means low/moderate advisories (common and
rarely actionable in transitive devDependencies) do not fail the command; high/critical
advisories do. `audit:production` additionally scopes the check to production
dependencies only (`--omit=dev`), which matters most once a package is actually
published. `npm audit`'s result depends on the live npm advisory database: the same
`package-lock.json` can pass today and fail tomorrow (a new advisory published) with no
code change in this repository — a deliberate, documented exception to this
repository's otherwise deterministic validation. For that reason `audit`/
`audit:production` are intentionally **not** part of `npm run validate`; they run in
their own CI job instead (see [CI](#ci) below) and are not run from
`pre-commit`/lint-staged.

## Dependency license validation

This project itself is distributed under Apache-2.0 (see [`LICENSE`](LICENSE)); this section
covers verifying that every *dependency's own* license is compatible with that distribution —
a separate concern from `npm audit` (which checks dependencies for known security
vulnerabilities, not licensing) and from [`NOTICE`](NOTICE) (which attributes copyright for this
project itself and is not a dependency inventory).

[license-checker-rseidelsohn](https://github.com/RSeidelsohn/license-checker-rseidelsohn) is a
pinned root devDependency (not installed globally, so behavior is identical everywhere `npm ci`
runs) that inspects every installed dependency's license metadata.
[`scripts/check-licenses.mjs`](scripts/check-licenses.mjs) wraps it: a small,
platform-agnostic Node.js script (no Bash-specific tooling) that inventories every installed
dependency's SPDX license expression and applies this repository's explicit allowlist — missing,
unrecognized, or disallowed licenses fail the check.

- `npm run licenses:check` checks every dependency (production and development); `npm run
  licenses:production` scopes the same check to production dependencies only
  (`--production`); `npm run licenses:report` prints the full inventory to the terminal without
  failing and without writing any generated file — no static license report is generated or
  committed.
- This repository's own workspace packages (`iac-resource-conventions`,
  `@lksnext/iac-conventions-core`) are excluded via `excludePrivatePackages` — they report
  `UNLICENSED` only because they are private, unpublished placeholders, not third-party
  dependencies.
- Unlike `npm audit`, this check is fully offline and deterministic. It is nonetheless
  intentionally **not** part of `npm run validate` or `pre-commit`/lint-staged: some
  dependencies install different optional, platform-specific packages depending on the
  operating system (for example Biome's per-OS `@biomejs/cli-*` binaries), so the exact set of
  licensed packages is not always identical across every OS `validate` runs on. It instead runs
  once, on Linux only, in its own CI job (see [CI](#ci) below).

### Allowlist (as implemented in `scripts/check-licenses.mjs`)

Allowed for any dependency (production or development):

| SPDX identifier | Notes |
| --- | --- |
| `MIT`, `ISC`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, `0BSD`, `CC0-1.0`, `BlueOak-1.0.0` | Standard permissive licenses already present in the dependency tree. |
| `Python-2.0` | Used by `argparse`, a faithful port of Python's own `argparse` module — OSI-approved, permissive. |
| `CC-BY-3.0` | Attribution-only content license used by `spdx-exceptions` for a bundled JSON data file (not code). |

Allowed for devDependencies only (must never appear in a production dependency):

| SPDX identifier | Notes |
| --- | --- |
| `CC-BY-SA-4.0` | Share-alike content license used only by a cspell spelling dictionary (`@cspell/dict-en-common-misspellings`); manually overridden in `scripts/check-licenses.mjs` because license-checker reports it as `Custom: <url>` rather than a clean SPDX identifier. |

Do not document a license here as allowed unless `scripts/check-licenses.mjs` actually permits
it — this table and the script's `ALLOWED_LICENSES`/`DEV_ONLY_ALLOWED_LICENSES` sets must stay in
sync.

### Passing the check is not legal advice

A passing `licenses:check`/`licenses:production` run means a dependency's license metadata
matches an entry on this allowlist — it is **not** legal advice, and it does not replace human
review. Contributors must still verify that a new dependency's actual use and distribution model
are compatible with this project before accepting it. Allowlist exceptions must never be added
silently; use the process below.

### Adding an exception to the allowlist

1. Identify the exact package name and version.
2. Determine whether it is a production dependency or development-only.
3. Inspect the actual SPDX license expression reported by `npm run licenses:report`, and the
   package's own upstream license text (not just the SPDX identifier).
4. Assess compatibility with distributing this Apache-2.0 project, and any distribution
   implications (for example share-alike/copyleft terms).
5. Obtain maintainer approval for the exception.
6. Only after approval, update `scripts/check-licenses.mjs` (the allowlist or a per-package
   override) and this documentation together, in the same change.

## Testing and fixture strategy

`core`'s `test` script uses Node's built-in test runner (`node:test`, via `node --test`)
rather than a third-party runner — it requires no new dependency and is sufficient for
the Executable Domain Model's current, behavior-free contracts (see
[`packages/core/test/`](packages/core/test/)):

- **Compile-time contract fixtures** (`test/types/contract-fixtures.ts`) — representative
  valid compositions of every public contract, plus `@ts-expect-error` cases proving
  invalid structures (unknown properties, wrong field types, `null` in place of omission,
  mutation of `readonly`/`ReadonlyArray` fields) are rejected. Type-checked with its own
  `tsconfig.test.json` (`noEmit`, so it never affects `dist/`); never executed and never
  published (`package.json#files` restricts the tarball to `dist/`).
- **Build-artifact runtime checks** (`test/runtime/build-artifact.test.mjs`) — since the
  model is entirely type-only, "public export availability" is a compile-time concern,
  not a runtime one; what these checks instead verify against the actual built `dist/`
  output is that no unexpected runtime export leaks from the type-only model, that a
  declaration file is generated, and that no production dependency was introduced.

Whether Node's built-in test runner remains the choice once the Reference Evaluator
introduces real runtime logic (assertions, fixtures-as-data, mocking needs) is still open
(see [Deferred decisions](#deferred-decisions)).

The compile-time fixtures above are distinct from, and not a substitute for, the planned
root-level, language-neutral `fixtures/` directory described below — that remains
deferred until the Reference Evaluator exists to evaluate them.

The planned strategy, once implementation begins:

- **Unit tests** for `core`, colocated with source or under `packages/core/test/`.
- **Contract tests** shared across adapters, verifying every adapter produces the result
  defined by shared fixtures for the same canonical input.
- **End-to-end CLI tests** once the CLI package exists.
- **Compatibility tests** guarding against unintentional changes to generated names,
  tags, labels, or annotations.
- **Collision tests** for naming/abbreviation rules.

Fixtures are intentionally **not** created in this task. They are planned to live at the
repository root, as **language-neutral JSON fixtures** (not inside a TypeScript-only
package), for example:

```text
fixtures/
├── requests/
├── evaluation-contexts/
├── resource-definitions/
├── convention-packs/
└── expected-results/
```

Root-level, language-neutral fixtures are preferred over a TypeScript package so that
non-TypeScript adapters (Ansible, and any future non-Node tooling) can consume the exact
same fixtures as the TypeScript contract tests without depending on the Node.js
toolchain.

## Validation strategy

Four layers of validation exist or are planned, each with a distinct responsibility:

1. **TypeScript types** — compile-time contracts for anything written in TypeScript
   (`core`, `catalog`, `cli`).
2. **JSON Schemas** (already present under
   [`specification/schemas/`](specification/schemas/)) — external input validation,
   independent of any programming language.
3. **The Reference Evaluator** (`core`, not yet implemented) — semantic validation
   (Context Resolution and Convention Evaluation correctness).
4. **Resource Definitions and Convention Packs** (`catalog`, not yet implemented) —
   resource-specific technical/Placement Constraints, and policy requirements,
   authority, protection, and projection rules, respectively.

No runtime validation library (AJV, Zod, or similar) is added in this task — nothing in
`core` yet parses untrusted input. Whether to introduce one, and whether to generate
TypeScript types from the existing JSON Schemas instead of hand-writing them, is an
explicit deferred decision (see below) to resolve once the domain contracts are actually
implemented.

## Versioning and publication

- Package names use the `@lksnext` npm scope with the `iac-conventions-*` package family
  (see [Package Naming Policy](#package-naming-policy) above); `@lksnext/iac-conventions`
  itself is reserved for a possible future convenience package and is not created yet.
- Every workspace package is currently `"private": true` and at `0.1.0` — no package is
  published, and no publish credentials are configured in this task.
- During this initial implementation phase, package versions are kept synchronized
  (single repository version) rather than independently versioned; independent
  versioning is only introduced once a package has an actual reason to release on its
  own cadence (for example, an adapter needing a patch without bumping `core`).
- **Specification version and package version are separate axes.** Specification v1.0
  (frozen, see
  [`specification/README.md#specification-status`](specification/README.md#specification-status))
  does not imply package version `1.0.0`, and a package version bump does not imply a
  Specification change. A package's `1.0.0` release should correspond to API stability
  of that package's own public surface, not to the Specification's version number.
- Semantic Versioning applies to every published package once publication begins:
  changes to generated names, tags, labels, annotations, abbreviations, truncation, or
  hashing are treated as potentially breaking, per
  [`AGENTS.md#compatibility-and-versioning`](AGENTS.md#compatibility-and-versioning).
- **Published tarballs do not yet include `LICENSE`/`NOTICE`.** `npm pack --dry-run` against
  `packages/core` (verified while adding dependency license compliance tooling, see
  [Dependency license validation](#dependency-license-validation) above) confirms the tarball
  currently contains only `README.md`, `package.json`, and `dist/**` — `package.json#files:
  ["dist"]` does not implicitly include the repository root `LICENSE` or `NOTICE`, and npm does
  not add them automatically for a scoped, non-root package. Before any package is actually
  published, either add explicit `files` entries (for example a copied `LICENSE`/`NOTICE` per
  package) or a prepack step that copies them from the repository root; this is not done in this
  task because no package is published yet.

## CLI distribution (planned, not implemented)

The CLI package does not exist yet. Once implemented, it must:

- Accept machine-readable JSON input and produce machine-readable JSON output.
- Execute deterministically, with no hidden network calls.
- Return stable, documented exit codes.
- Support explicit Convention Pack and Resource Definition inputs or registries.
- Report its own version.
- Run directly under Node.js — no binary-packaging tool (`pkg`, `nexe`, single
  executable applications, etc.) is chosen in this task; that decision is deferred until
  a concrete distribution need (for example, a Terraform external data source requiring
  a zero-Node-install binary) justifies it.

The planned CLI executable name is `iac-conventions` (see
[Package Naming Policy](#package-naming-policy) above) — short and independent from both
the repository name and the `@lksnext/iac-conventions-cli` package name that publishes
it.

## Terraform integration boundary (planned, not implemented)

Initial strategy:

```text
Terraform
    -> external data source
        -> TypeScript CLI
            -> core Reference Evaluator
```

Possible future strategy, once Terraform's provider-defined functions/data sources are a
better fit:

```text
Terraform provider
    -> provider-defined function or data source
        -> stable evaluator contract
```

The Terraform adapter must consume the Reference Evaluator's contract; it must not
reimplement Context Resolution, naming rules, metadata projection, Placement Constraint
validation, or Convention Pack semantics. No Terraform files or provider code are created
in this task.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) is the repository's GitHub Actions
workflow (`.github/` previously only contained issue templates and Copilot
instructions). It runs on every push to `main` and on every pull request:

- **`validate` job** — matrix across `ubuntu-latest`, `macos-latest`, and
  `windows-latest` (the same three operating systems contributors and the Dev Container
  target). Each runs `npm ci` followed by `npm run validate` — the identical aggregate
  command contributors run locally, so CI never drifts from the documented local
  workflow and no validation logic is duplicated in the workflow file itself.
- **`commitlint` job** — pull requests only; runs `npx commitlint --from <base-sha> --to <head-sha>`
  across every commit in the pull request. This is the CI-side, authoritative
  counterpart to the local `commit-msg` hook (see
  [Git hooks and commit linting](#git-hooks-and-commit-linting)), since local hooks can
  be bypassed or skipped.
- **`docs-links` job** — runs once on `ubuntu-latest` only (not the `validate` matrix),
  since it makes real network requests and running it three times per push would
  triple external traffic and the chance of transient rate-limiting. Uses the official
  [`lycheeverse/lychee-action`](https://github.com/lycheeverse/lychee-action) with
  [`lychee.toml`](lychee.toml) (see [Documentation quality
  tooling](#documentation-quality-tooling)) and fails the workflow on broken links.
- **`dependency-audit` job** — runs once on `ubuntu-latest` only, for the same
  network-dependent reason as `docs-links`: `npm audit` queries the live npm advisory
  database, so running it three times per push would triple external requests without
  additional benefit. Runs `npm run audit` and `npm run audit:production` (see
  [Dependency security
  validation](#dependency-security-validation) above for the
  `--audit-level=high` threshold rationale).
- **`dependency-licenses` job** — runs once on `ubuntu-latest` only. Unlike `docs-links` and
  `dependency-audit`, this is not for network-dependency reasons — it is fully offline — but
  because some dependencies install different optional, platform-specific packages depending on
  the operating system (for example Biome's per-OS `@biomejs/cli-*` binaries), so running it
  across the `validate` matrix would not add real signal. Runs `npm run licenses:check` and
  `npm run licenses:production` (see [Dependency license
  validation](#dependency-license-validation) above).

No release, tagging, or npm-publication workflow is added — publication remains out of
scope (see [Versioning and publication](#versioning-and-publication)).

## Deferred decisions

The following are intentionally **not** decided in this task:

- **Architectural dependency validation tooling** — which tool, if any, to introduce
  for automated enforcement of the documented package dependency direction (see
  [Architectural dependency validation
  (deferred)](#architectural-dependency-validation-deferred) above) is deferred until
  the implementation contains multiple packages with meaningful dependency
  relationships.

- **Test runner for the Reference Evaluator** — `core`'s current contract tests use
  Node's built-in test runner (see [Testing and fixture strategy](#testing-and-fixture-strategy)
  above); whether this remains the choice once real evaluator behavior (and its more
  complex fixture/assertion needs) exists is still open.
- **Runtime validation library** — whether `core` will eventually need AJV/Zod, and
  whether TypeScript types should be generated from the existing JSON Schemas.
- **Release automation** — no release, changelog, or npm-publication workflow is added
  (see [CI](#ci) above); Semantic Release and Changesets are intentionally not
  introduced until publication is actually planned. A placeholder `release:dry-run`
  script was removed (it only echoed a message and verified nothing) rather than kept
  speculatively — `npm pack --dry-run` inside a specific package directory remains the
  ad hoc way to inspect tarball contents until a real, documented release process
  exists (see [Versioning and publication](#versioning-and-publication) above).
- **Project references / `tsc -b`** — deferred until a second package depends on `core`.
- **Binary packaging for the CLI** — deferred until the CLI package exists and a concrete
  distribution need is identified.
- **`fixtures/` creation** — the directory layout is documented above but not created;
  it will be created alongside the first contract test that needs it.
- **Dependency-cycle-detection tooling** — deferred until the dependency graph has more
  than one internal edge.
