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

- `packages/core` exists as a minimal, non-domain-specific placeholder that proves the
  workspace, TypeScript configuration, and build/typecheck scripts work end to end.
- No Context Resolution, Convention Evaluation, naming algorithm, metadata projection,
  Placement Constraint validation, CLI behavior, or adapter integration has been
  implemented.
- `packages/catalog`, `packages/cli`, and `packages/adapters/*` do not exist yet — they
  are planned (see [Planned packages](#planned-packages)) and must only be created when
  a concrete task needs them, per the repository's incremental-evolution principle (see
  [`AGENTS.md`](AGENTS.md#repository-evolution)).

## Package naming policy

The npm scope, package name, and folder name are three independent, deliberately
distinct concerns:

- **The npm scope (`@lksnext`) identifies the publisher** — the GitHub organization
  that owns and publishes these packages, not the project.
- **The package name (`iac-conventions-*`) identifies the project and package
  responsibility** — `iac-conventions` is the project's package family name, and the
  suffix (`core`, `catalog`, `cli`, …) identifies what that specific package is
  responsible for.
- **The folder name under `packages/`** (`core/`, `catalog/`, `cli/`, …) is
  intentionally short and independent from the published package name — the directory
  layout must never be inferred from, or assumed to match, the npm package name.

This keeps published import paths concise (`@lksnext/iac-conventions-core`) while still
reading as one consistent package family, and keeps the repository's own name
(`iac-resource-conventions`) free to stay descriptive without leaking into every import
statement. `iac-conventions` is deliberately shorter than the repository name
`iac-resource-conventions` — repository names favor descriptiveness, while npm package
names and the CLI executable favor brevity, since they are typed constantly.

| Convention | Value |
| --- | --- |
| GitHub repository | `iac-resource-conventions` |
| npm scope | `@lksnext` |
| npm package family | `iac-conventions-*` |
| TypeScript import specifier | `@lksnext/iac-conventions-*` |
| CLI executable (planned, not implemented) | `iac-conventions` |

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

`@lksnext/iac-conventions` (no suffix) is **reserved** for a possible future convenience
package that re-exports the public APIs of `core` and `catalog` together. It is not
created in this task, and must not be created speculatively — only once a concrete
consumer needs a single combined import instead of depending on `core`/`catalog`
directly.

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

No dependency-cycle-detection tooling is introduced in this task — with a single
package (`core`), there is no cycle to detect yet. When `catalog` is introduced,
`npm ls` (or `npm ls --workspaces`) is sufficient to confirm the dependency graph by
inspection; add automated cycle detection only if the graph becomes large enough that
manual inspection stops being reliable.

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

## Root workspace commands

The root [`package.json`](package.json) remains the standard task entry point and now
declares an npm workspace (`"workspaces": ["packages/*"]`). Root scripts delegate to
per-package scripts instead of duplicating their implementation:

```text
npm run build      -> npm run build --workspaces --if-present
npm run typecheck  -> npm run typecheck --workspaces --if-present
npm test           -> npm run test --workspaces --if-present
npm run lint       -> npm run lint --workspaces --if-present
npm run fmt        -> terraform fmt -recursive              (unchanged)
npm run validate   -> node scripts/validate-json.mjs         (unchanged)
```

`--if-present` means a package that has not yet defined a given script (for example a
future `catalog` package before it has tests) is silently skipped rather than failing the
whole workspace run. `fmt` and `validate` are unchanged because they operate outside the
new TypeScript workspace (Terraform formatting and specification JSON validation,
respectively).

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
  (see [Package naming policy](#package-naming-policy) above); `@lksnext/iac-conventions`
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
[Package naming policy](#package-naming-policy) above) — short and independent from both
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

No GitHub Actions workflows exist in this repository yet (`.github/` currently only
contains issue templates and Copilot instructions). None are added in this task — doing
so is out of scope until the workflow would actually run something beyond what
`npm install && npm run build && npm run typecheck && npm run validate` already
demonstrates locally. This is called out explicitly as a deferred decision below rather
than left implicit.

## Deferred decisions

The following are intentionally **not** decided in this task:

- **Test runner** — Node's built-in test runner vs. Vitest vs. Jest.
- **Linter** — whether/when to add ESLint (and which config, e.g. `typescript-eslint`)
  now that `packages/` contains TypeScript source. Root `npm run lint` already delegates
  to `--workspaces --if-present`, so adding a linter to a package later requires no root
  script changes.
- **Runtime validation library** — whether `core` will eventually need AJV/Zod, and
  whether TypeScript types should be generated from the existing JSON Schemas.
- **CI workflows** — no GitHub Actions workflow is added in this task (see [CI](#ci)
  above).
- **Project references / `tsc -b`** — deferred until a second package depends on `core`.
- **Binary packaging for the CLI** — deferred until the CLI package exists and a concrete
  distribution need is identified.
- **`fixtures/` creation** — the directory layout is documented above but not created;
  it will be created alongside the first contract test that needs it.
- **Dependency-cycle-detection tooling** — deferred until the dependency graph has more
  than one internal edge.
