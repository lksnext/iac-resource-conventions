# Publishing runbook (alpha releases)

This is release-process documentation, not a Specification or product change. It records the
approved sequence for the alpha publication of `@lksnext/iac-conventions-core`,
`@lksnext/iac-conventions-catalog`, and `@lksnext/iac-conventions-cli`. The first alpha
(`0.1.0-alpha.0`) has been published under this runbook; see
[IMPLEMENTATION.md#alpha-package-conformance](../../IMPLEMENTATION.md#alpha-package-conformance)
and
[IMPLEMENTATION.md#release-readiness](../../IMPLEMENTATION.md#release-readiness)
for the full rationale behind each decision below. This document remains the authoritative
process for every subsequent alpha publication (for example, `0.1.0-alpha.1`).

The preferred publication method is the
[`publish-alpha.yml`](../../.github/workflows/publish-alpha.yml) GitHub Actions workflow (see
[GitHub Actions publish workflow](#github-actions-publish-workflow) below); the manual sequence
further down remains documented as a fallback.

## Registry: GitHub Packages only

`@lksnext/iac-conventions-core`, `@lksnext/iac-conventions-catalog`, and
`@lksnext/iac-conventions-cli` are published **only** to GitHub Packages
(`https://npm.pkg.github.com`), configured per package via `publishConfig.registry` and, for
local/CI consumption, via the repository-root [`.npmrc`](../../.npmrc)
(`@lksnext:registry=https://npm.pkg.github.com`). They are never published to the public npm
registry (`registry.npmjs.org`) or to any private Nexus registry. Third-party dependencies of
this repository are unaffected and continue to resolve from `registry.npmjs.org` as usual —
this scoped routing applies only to the `@lksnext` scope.

GitHub Packages requires authentication to install a package even when the owning repository is
public — this is a real, unavoidable difference from `registry.npmjs.org` and must be
communicated to consumers (see the package READMEs and
[`docs/release-notes/v0.1.0-alpha.0.md`](v0.1.0-alpha.0.md)).

## Preconditions

- Working from a clean checkout of `main` (`git status` clean, `git pull --ff-only` up to
  date).
- All three packages at the intended synchronized version declared in each package's
  `package.json` (the release candidate version), with exact-pinned internal dependency
  versions (`catalog` and `cli` depend on the others by exact version, not a range).
- A GitHub personal access token (classic or fine-grained) with at least `write:packages` (and
  `read:packages`) scope for the `lksnext` organization, supplied only through a securely
  configured environment variable (for example `NODE_AUTH_TOKEN`) or a GitHub Actions
  `GITHUB_TOKEN` — never written to this repository's `.npmrc` or any tracked file. See
  [Authentication](#authentication) below.

## Authentication

Package/release *configuration* (registry routing in `publishConfig` and the repository
`.npmrc`) is deliberately kept separate from registry *authentication* (a credential). This
repository never stores a credential:

- **GitHub Actions publish (preferred):** [`publish-alpha.yml`](../../.github/workflows/publish-alpha.yml)
  uses GitHub's own automatically generated `GITHUB_TOKEN` (workflow permissions
  `contents: read`, `packages: write`), passed to npm as `NODE_AUTH_TOKEN`. It is scoped to this
  repository, never persisted outside the workflow run, requires no repository secret to be
  created, and is never the token previously exposed in this environment's `~/.npmrc`.
- **Manual publish (fallback):** the maintainer supplies a newly issued, appropriately scoped
  GitHub token via an environment variable consumed by npm's standard
  `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}` convention in a *local, untracked*
  `~/.npmrc` (or `NODE_AUTH_TOKEN`/`NPM_TOKEN` environment variable, depending on tooling) — not
  the repository's tracked `.npmrc`, which contains only the non-secret `@lksnext:registry`
  line. That token must not be the token that was previously exposed in this environment's
  `~/.npmrc` (treated as compromised; see
  [IMPLEMENTATION.md#alpha-package-conformance](../../IMPLEMENTATION.md#alpha-package-conformance)).

Never commit a `_authToken`, password, or username to this repository, and never place one in
release documentation, logs, or command output.

## GitHub Actions publish workflow

[`publish-alpha.yml`](../../.github/workflows/publish-alpha.yml) is a manually triggered
(`workflow_dispatch`) workflow that automates the sequence below end-to-end, in one place, so it
can never drift from this document:

1. Requires a `confirmation` input typed exactly as `publish-alpha` (protects against an
   accidental click) and verifies the workflow was launched against `refs/heads/main` — both
   checked before checkout, dependency install, or any credential is configured.
2. `npm ci`, then `node scripts/verify-publish-readiness.mjs` — an offline, non-mutating gate
   that fails the workflow before any registry call if the three packages' versions are not
   synchronized, their internal dependency pins are not exact (no ranges, no
   `workspace:`/`file:`/`link:` references), any package's `publishConfig.registry` is not
   `https://npm.pkg.github.com`, the repository-root `.npmrc` does not route the `@lksnext`
   scope there, or `repository` metadata is missing/incorrect.
3. `npm run validate`, `npm run package:dry-run`, `npm run package:smoke-test` — the same local
   validation and tarball smoke test described below, reusing the existing scripts rather than
   duplicating their logic in YAML.
4. `node scripts/github-packages-check.mjs <dir> absent`, for `core`, `catalog`, and `cli`, all
   run before the first `npm publish` — refuses to publish over an already-published exact
   version (see [Registry collision gate](#registry-collision-gate) below).
5. Publishes `core`, then `catalog`, then `cli`, in that order, each with
   `--registry https://npm.pkg.github.com --tag alpha` (defense in depth alongside
   `publishConfig.registry` and `actions/setup-node`'s `registry-url`), verifying each package is
   visible on GitHub Packages (`node scripts/github-packages-check.mjs <dir> present`) before
   publishing its dependents. A failure at any point stops the workflow immediately — see
   [Partial-publication failure and recovery](#partial-publication-failure-and-recovery).
6. `node scripts/smoke-test-github-packages.mjs` — a real consumer install of
   `@lksnext/iac-conventions-cli` at the just-published release version from
   `https://npm.pkg.github.com` (never a local tarball), verifying the installed
   `core`/`catalog`/`cli` versions and that each resolved from GitHub Packages, then exercising
   the installed binary's `--version`, `evaluate`, and `terraform-external` commands.
7. Writes a `GITHUB_STEP_SUMMARY` with the version, commit, registry, dist-tag, and result — no
   secrets.

The workflow does **not** create a Git tag or a GitHub Release (see
[Sequence (manual fallback)](#sequence-manual-fallback) steps 9–10 below, which remain a
separate, later, manual step) and does not
trigger on push or from pull-request code — only an explicit, confirmed `workflow_dispatch` run
against `main`. It uses `permissions: contents: read, packages: write` only, and a
`concurrency: publish-alpha` group (`cancel-in-progress: false`) so a running publication can
never be killed mid-sequence by a second dispatch.

### Registry collision gate

`scripts/github-packages-check.mjs` queries `npm view <package>@<version> --registry
https://npm.pkg.github.com` for each package before publishing any of them. GitHub Packages
returns 404 both for "genuinely not yet published" and for "the caller cannot see it" — it does
not distinguish the two the way `registry.npmjs.org`'s 401/403 responses do. This check relies on
the workflow's `GITHUB_TOKEN` already being scoped to read/write this repository's own packages,
so a 404 here is expected to mean "not yet published", not "unauthorized"; any other failure
(a non-404 error) is treated as inconclusive and fails the workflow rather than assuming success.

### GitHub Environment recommendation

This repository has no GitHub Environments configured yet (verified via the GitHub API before
writing this workflow). A `release` Environment with required reviewers would add a manual
approval gate between `workflow_dispatch` and the workflow actually running, on top of the
`confirmation` input already in the workflow. This is a repository configuration change, not a
YAML change, so it is documented here as a recommendation rather than created automatically;
assign `environment: release` to the `publish` job once such an Environment exists.

### GitHub Packages visibility and consumption

GitHub Package visibility/access may need to be configured after the first publication,
depending on organization policy — GitHub Packages does not automatically inherit
"public npm package" semantics from `registry.npmjs.org` visibility conventions, and
organization policy may make a newly published package private/internal by default. This should
be verified after the first publish and reported if so, rather than assumed. Consumers may need
GitHub Packages authentication to install the package even for read access, depending on that
visibility; do not claim anonymous `npm install` works until verified against the actual
published package.

## Sequence (manual fallback)

1. `git switch main && git pull --ff-only`
2. `npm ci`
3. `npm run validate` (formatting, lint, typecheck, tests, license checks — see
   [IMPLEMENTATION.md#root-workspace-commands](../../IMPLEMENTATION.md#root-workspace-commands)
   for what this aggregates)
4. `npm run build` (explicit, even though `prepack` now also builds — confirms a clean build
   succeeds before relying on `prepack` to repeat it during `npm pack`/`npm publish`)
5. `npm run package:smoke-test` (proves the installed CLI's `--version`, `evaluate`, and
   `terraform-external` all work from real tarballs, not workspace symlinks; does not require
   GitHub Packages authentication — it installs from local tarballs, not the registry)
6. Verify GitHub Packages authentication and `lksnext` organization package-publish permission
   for the credential in use (for example, `npm whoami --registry=https://npm.pkg.github.com`).
7. Publish in dependency order — **`core` first, then `catalog`, then `cli`** — since `catalog`
   and `cli` depend on exact-pinned versions of the packages published before them. Each
   package's own `publishConfig.registry` already targets GitHub Packages, so no `--registry`
   flag is required:
   - `npm publish --workspace=@lksnext/iac-conventions-core --tag alpha`
   - `npm publish --workspace=@lksnext/iac-conventions-catalog --tag alpha`
   - `npm publish --workspace=@lksnext/iac-conventions-cli --tag alpha`
8. Verify the published packages by installing them in a disposable project, outside this
   repository, with `@lksnext:registry=https://npm.pkg.github.com` configured and a valid
   GitHub Packages read credential available (`npm install @lksnext/iac-conventions-cli@alpha
   && npx iac-conventions --version`). See
   [Post-publication registry smoke test](#post-publication-registry-smoke-test) below.
9. Create an annotated, signed Git tag for the release (for example, `v0.1.0-alpha.0`) once the
   packages are confirmed installable.
10. Create a GitHub Release from that tag, using the corresponding
    [`docs/release-notes/`](.) entry as the release description.

Steps 6–10 are **not** executed by this runbook document itself — they are the sequence a
maintainer follows when an actual publish is approved. No step in this document was executed
as part of writing it.

## Post-publication registry smoke test

Once publication is approved and has occurred, verify the published packages from a clean
consumer project outside this repository:

1. Configure `@lksnext:registry=https://npm.pkg.github.com` in that consumer's `.npmrc`.
2. Authenticate with a newly issued, appropriately scoped GitHub read credential (or a CI
   token) — never the credential exposed in this environment's `~/.npmrc`.
3. `npm install @lksnext/iac-conventions-cli@<release version>` (for example,
   `@lksnext/iac-conventions-cli@0.1.0-alpha.0` for the first alpha), or
   `@lksnext/iac-conventions-cli@alpha` to resolve the latest alpha dist-tag.
4. Confirm the installed `core`, `catalog`, and `cli` transitive versions are all exactly the
   release version and resolve from `npm.pkg.github.com`, not a local path.
5. Run `npx iac-conventions --version` and a minimal `evaluate` call to confirm the installed
   package graph works end-to-end.

This step is deliberately **not executed** until publication has been explicitly approved and a
valid, non-exposed credential is available.

## npm dist-tag

Publish with `--tag alpha`, never the default `latest`. `npm install
@lksnext/iac-conventions-cli` without an explicit tag must not resolve to a prerelease;
consumers opt in with `npm install @lksnext/iac-conventions-cli@alpha`.

## Partial-publication failure and recovery

If publication fails partway through step 7 (for example, `core` and `catalog` succeed but
`cli` fails):

- Do not attempt to unpublish the packages that already succeeded. npm discourages and
  time-limits unpublishing, and a partially visible alpha under the `alpha` dist-tag is not
  itself harmful to existing consumers (nothing installs it without opting in).
- Fix the failure, bump all three packages to the next synchronized prerelease (for example,
  `0.1.0-alpha.2`), and republish the full coordinated set together. This preserves the
  invariant the exact-pinned dependencies rely on: all three packages always resolve to the
  same prerelease version.

## Provenance

npm provenance (`npm publish --provenance`) requires the `id-token: write` permission under
GitHub Actions, which [`publish-alpha.yml`](../../.github/workflows/publish-alpha.yml) does not
request — only the minimum `contents: read`/`packages: write` this first workflow actually needs.
Provenance is not claimed for this first alpha. GitHub Packages' own provenance/attestation
support should be re-checked against current GitHub documentation before a future workflow
revision adds `id-token: write` and `--provenance`.

## Manual vs. CI publish

Publish using the [`publish-alpha.yml`](../../.github/workflows/publish-alpha.yml) GitHub
Actions workflow (see [GitHub Actions publish workflow](#github-actions-publish-workflow) above),
authenticating with GitHub's own `GITHUB_TOKEN` — no repository secret to create or rotate, and
never the credential previously exposed in this environment. The manual sequence above remains
documented as a fallback (for example, if the workflow itself needs to be debugged), using a
newly issued GitHub token supplied only through an environment variable, never the repository's
tracked `.npmrc`. Changesets, Lerna, or Rush are not warranted for three synchronously versioned
packages.

## Credentials

No npm token, `.npmrc` credential, or other secret is stored in this repository. The tracked
root [`.npmrc`](../../.npmrc) contains only the non-secret `@lksnext:registry` routing line.
Publishing relies on GitHub Actions' own `GITHUB_TOKEN` (preferred; see [GitHub Actions publish
workflow](#github-actions-publish-workflow) above) or, for the manual fallback, a newly issued,
appropriately scoped GitHub token supplied through a securely configured environment
variable — never the credential previously exposed in this environment's `~/.npmrc`, and never
committed.
