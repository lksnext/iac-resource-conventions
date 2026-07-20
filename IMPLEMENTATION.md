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
  floor is a hard requirement — Commitlint, cspell, lint-staged, and dependency-cruiser
  do not run on Node 18/20 — and every published package matches it rather than
  declaring an independent, lower consumer-facing floor, keeping a single Node.js version
  policy for the whole repository instead of one per package. The Dev Container and CI
  both resolve Node via a floating `lts` pointer, so they always satisfy this floor
  without a manual version bump.
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
- dependency-cruiser and npm audit provide architecture and dependency security
  validation locally and in CI (see [Architecture and dependency security
  validation](#architecture-and-dependency-security-validation)).
- No Context Resolution, Convention Evaluation, naming algorithm, metadata projection,
  Placement Constraint validation, CLI behavior, or adapter integration has been
  implemented.
- `packages/catalog`, `packages/cli`, and `packages/adapters/*` do not exist yet — they
  are planned (see [Planned packages](#planned-packages)) and must only be created when
  a concrete task needs them, per the repository's incremental-evolution principle (see
  [`AGENTS.md`](AGENTS.md#repository-evolution)).

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

[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) (`npm run
architecture`) enforces this layering — including circular-dependency detection — via
[`.dependency-cruiser.cjs`](.dependency-cruiser.cjs). See [Architecture and dependency
security validation](#architecture-and-dependency-security-validation) below for the
rule set, its forward-compatibility with the not-yet-existing `catalog`/`cli`/`adapters`
packages, and a known current TypeScript 7 compatibility limitation.

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
├── src/
│   └── index.ts
└── dist/            # generated, git-ignored
```

- Source lives under `src/`; compiled output lives under `dist/`.
- `dist/` is git-ignored (see [`.gitignore`](.gitignore)) and is never committed.
- `package.json#files` restricts any future published tarball to `dist/` only.
- `build` (`tsc -p tsconfig.json`) and `typecheck` (`tsc -p tsconfig.json --noEmit`) are
  separate scripts so CI/local runs can type-check without emitting, or build without a
  redundant separate type-check pass.

No domain-model files were added beyond the placeholder `CORE_PACKAGE_NAME` constant in
`src/index.ts`, which exists solely to give the package a real export to build, type-check,
and import in validation.

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
npm run architecture    -> depcruise --config .dependency-cruiser.cjs packages
npm run validate        -> npm run typecheck && npm run check && npm run architecture &&
                            npm run docs:lint && npm run docs:spell && npm run test &&
                            npm run build && npm run validate:specification
npm run validate:specification -> node scripts/validate-json.mjs
npm run docs:lint       -> markdownlint-cli2
npm run docs:lint:fix   -> markdownlint-cli2 --fix
npm run docs:spell      -> cspell --no-progress --dot "**/*.{md,ts,tsx,js,jsx,mjs,cjs,
                            json,jsonc,yml,yaml}"
npm run docs:links      -> lychee --config lychee.toml "**/*.md"
npm run audit           -> npm audit --audit-level=high
npm run audit:production -> npm audit --omit=dev --audit-level=high
npm run fmt             -> terraform fmt -recursive              (unchanged)
npm run prepare         -> husky                                  (git hook install)
```

`--if-present` means a package that has not yet defined a given script (for example a
future `catalog` package before it has tests) is silently skipped rather than failing the
whole workspace run — this is also why `clean` is a no-op today (no package currently
defines a `clean` script) but is already wired at the root so a package can opt in
without any root changes. `fmt` is unchanged because it operates outside Biome's scope
(Terraform formatting via the Terraform CLI). `validate` is an aggregate command
that chains type checking, Biome checks, architecture validation, Markdown linting,
spell checking, tests, the build, and the existing Specification JSON validation.
`docs:links` (lychee) and `audit`/`audit:production` (npm audit) are intentionally
excluded from `validate` because both make real network requests — see [Documentation
quality tooling](#documentation-quality-tooling) and [Architecture and dependency
security validation](#architecture-and-dependency-security-validation) below. `prepare`
runs automatically after `npm install`/`npm ci` (the standard npm lifecycle hook) and
only installs Husky's git hooks — see [Git hooks and commit
linting](#git-hooks-and-commit-linting) below.

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

## Architecture and dependency security validation

Two tools validate concerns that formatting, linting, and type-checking do not cover,
each with a single, non-overlapping responsibility:

- **dependency-cruiser validates architecture.** `npm run architecture`
  (`depcruise --config .dependency-cruiser.cjs packages`) enforces the package
  dependency direction from [Dependency direction](#dependency-direction) above via
  [`.dependency-cruiser.cjs`](.dependency-cruiser.cjs):
  - `core` must not depend on `catalog`, `cli`, or `adapters`.
  - `catalog` must not depend on `cli` or `adapters`.
  - `cli` must not depend on `adapters`.
  - Adapters must not depend on `cli` or on each other (`adapter A -> adapter B` is
    forbidden).
  - No circular dependencies are allowed anywhere in the workspace.
  - Deep imports into another package's internal `src/` files are forbidden — every
    cross-package reference must go through the target package's public entry point
    (`src/index.ts`), enforced with dependency-cruiser's regex "group matching" so the
    same-package case is never a false positive.
  - Every rule is written against the `packages/catalog/`, `packages/cli/`, and
    `packages/adapters/<name>/` paths documented as **planned** in [Planned
    packages](#planned-packages) — only `packages/core/` exists today, so most rules
    have nothing to violate yet; they take effect automatically, with no config change
    needed, the moment those packages are created.
  - **Known current limitation:** dependency-cruiser 18.1.0 (the latest release
    available at the time this was added — confirmed via `npm view dependency-cruiser
    dist-tags`) does not support TypeScript 7.x. Running `npx depcruise --info`
    confirms the `.ts`/`.tsx`/`.d.ts` extensions and the `typescript` transpiler
    (supported range `>=2.0.0 <7.0.0`) are both disabled, since this repository pins
    `typescript@^7.0.2` (see [TypeScript configuration](#typescript-configuration)).
    Concretely, `npm run architecture` currently cannot analyze `.ts` source at all; it
    prints a `missing-typescript-transpiler` warning on every run as a visible signal
    of this gap, and — on a checkout with no prior `dist/` build present — cruises zero
    modules. The rule set itself was verified correct against an isolated scratch
    project using plain `.js` files mirroring the planned `core`/`catalog`/`cli`/
    `adapters` layout (every layering, adapter-to-adapter, circular, and deep-import
    rule fired as expected), so no rule logic is in question — only TypeScript 7
    parsing support, which is outside this repository's control. Revisit this once
    dependency-cruiser publishes TypeScript 7 support, or if the project's TypeScript
    version is revisited for unrelated reasons; downgrading TypeScript solely to work
    around this is out of scope for this change.
  - `architecture` is not run from `pre-commit`/lint-staged (see [Git hooks and commit
    linting](#git-hooks-and-commit-linting) below) — it validates the whole dependency
    graph, not individual staged files.
- **npm audit validates dependency security.** `npm run audit` (`npm audit
  --audit-level=high`) and `npm run audit:production` (`npm audit --omit=dev
  --audit-level=high`) check installed dependencies against the npm advisory database.
  `--audit-level=high` means low/moderate advisories (common and rarely actionable in
  transitive devDependencies) do not fail the command; high/critical advisories do.
  `audit:production` additionally scopes the check to production dependencies only
  (`--omit=dev`), which matters most once a package is actually published.
  `npm audit`'s result depends on the live npm advisory database: the same `package-lock.json`
  can pass today and fail tomorrow (a new advisory published) with no code change in this
  repository — a deliberate, documented exception to this repository's otherwise
  deterministic validation. For that reason `audit`/`audit:production` are intentionally
  **not** part of `npm run validate`; they run in their own CI job instead (see
  [CI](#ci) below) and are not run from `pre-commit`/lint-staged.

## Testing and fixture strategy

No test runner is added in this task — `core`'s `test` script is currently a placeholder
(`echo "Tests not implemented yet"`). Choosing between Node's built-in test runner and a
third-party runner (Vitest, Jest, etc.) is deferred (see
[Deferred decisions](#deferred-decisions)) until real evaluator logic exists to test.

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
  [Architecture and dependency security
  validation](#architecture-and-dependency-security-validation) above for the
  `--audit-level=high` threshold rationale). Architecture validation
  (dependency-cruiser) is *not* a separate job — it runs inside the `validate` job via
  `npm run validate`, since it is fast, local, and fully deterministic, unlike `npm audit`.

No release, tagging, or npm-publication workflow is added — publication remains out of
scope (see [Versioning and publication](#versioning-and-publication)).

## Deferred decisions

The following are intentionally **not** decided in this task:

- **dependency-cruiser / TypeScript 7 compatibility** — dependency-cruiser 18.1.0 does
  not yet support TypeScript 7.x (see [Architecture and dependency security
  validation](#architecture-and-dependency-security-validation) above). Whether to wait
  for upstream support, or revisit this repository's TypeScript version, is deferred.

- **Test runner** — Node's built-in test runner vs. Vitest vs. Jest.
- **Runtime validation library** — whether `core` will eventually need AJV/Zod, and
  whether TypeScript types should be generated from the existing JSON Schemas.
- **Release automation** — no release, changelog, or npm-publication workflow is added
  (see [CI](#ci) above); Semantic Release and Changesets are intentionally not
  introduced until publication is actually planned.
- **Project references / `tsc -b`** — deferred until a second package depends on `core`.
- **Binary packaging for the CLI** — deferred until the CLI package exists and a concrete
  distribution need is identified.
- **`fixtures/` creation** — the directory layout is documented above but not created;
  it will be created alongside the first contract test that needs it.
- **Dependency-cycle-detection tooling** — deferred until the dependency graph has more
  than one internal edge.
