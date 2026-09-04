# Publishing runbook (first alpha)

This is release-process documentation, not a Specification or product change. It records the
approved sequence for the first alpha publication of `@lksnext/iac-conventions-core`,
`@lksnext/iac-conventions-catalog`, and `@lksnext/iac-conventions-cli`. No package has been
published under this runbook yet; see
[IMPLEMENTATION.md#alpha-package-conformance](../../IMPLEMENTATION.md#alpha-package-conformance)
and
[IMPLEMENTATION.md#release-readiness](../../IMPLEMENTATION.md#release-readiness)
for the full rationale behind each decision below.

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
- All three packages at the intended synchronized version (currently `0.1.0-alpha.0`), with
  exact-pinned internal dependency versions (`catalog` and `cli` depend on the others by exact
  version, not a range).
- A GitHub personal access token (classic or fine-grained) with at least `write:packages` (and
  `read:packages`) scope for the `lksnext` organization, supplied only through a securely
  configured environment variable (for example `NODE_AUTH_TOKEN`) or a GitHub Actions
  `GITHUB_TOKEN` — never written to this repository's `.npmrc` or any tracked file. See
  [Authentication](#authentication) below.

## Authentication

Package/release *configuration* (registry routing in `publishConfig` and the repository
`.npmrc`) is deliberately kept separate from registry *authentication* (a credential). This
repository never stores a credential:

- **Manual publish (this first alpha):** the maintainer supplies a newly issued, appropriately
  scoped GitHub token via an environment variable consumed by npm's standard
  `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}` convention in a *local, untracked*
  `~/.npmrc` (or `NODE_AUTH_TOKEN`/`NPM_TOKEN` environment variable, depending on tooling) — not
  the repository's tracked `.npmrc`, which contains only the non-secret `@lksnext:registry`
  line. That token must not be the token that was previously exposed in this environment's
  `~/.npmrc` (treated as compromised; see
  [IMPLEMENTATION.md#alpha-package-conformance](../../IMPLEMENTATION.md#alpha-package-conformance)).
- **Future CI-driven publish:** a GitHub Actions workflow triggered on an approved release tag,
  using `actions/setup-node` with `registry-url: https://npm.pkg.github.com` and the
  automatically provided `GITHUB_TOKEN` (workflow permissions `contents: read`,
  `packages: write`), which is scoped to the repository and never persisted outside the
  workflow run. This is the recommended long-term mechanism once the manual process has proven
  the package topology works end-to-end; it is not implemented yet (see
  [IMPLEMENTATION.md#release-readiness](../../IMPLEMENTATION.md#release-readiness)).

Never commit a `_authToken`, password, or username to this repository, and never place one in
release documentation, logs, or command output.

## Sequence

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
3. `npm install @lksnext/iac-conventions-cli@0.1.0-alpha.0`.
4. Confirm the installed `core`, `catalog`, and `cli` transitive versions are all exactly
   `0.1.0-alpha.0` and resolve from `npm.pkg.github.com`, not a local path.
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
  `0.1.0-alpha.1`), and republish the full coordinated set together. This preserves the
  invariant the exact-pinned dependencies rely on: all three packages always resolve to the
  same prerelease version.

## Provenance

npm provenance (`npm publish --provenance`) requires a supported CI environment
(`id-token: write` permission under GitHub Actions); a manual publish from a maintainer's
machine cannot honestly carry that attestation. Provenance is recommended for a future
CI-driven publish workflow, not claimed for this first, manual alpha. GitHub Packages'
provenance/attestation support should be re-checked against current GitHub documentation before
that future workflow is implemented, since it may differ from `registry.npmjs.org`'s support.

## Manual vs. CI publish

Publish the first alpha manually, following this runbook, from an approved and signed release
commit, authenticating with a newly issued GitHub token supplied only through an environment
variable (never the repository's tracked `.npmrc`, and never the credential previously exposed
in this environment). Introduce a GitHub Actions publish workflow only after the manual process
has proven the package topology actually works end-to-end. Changesets, Lerna, or Rush are not
warranted for three synchronously versioned packages.

### Proposed future GitHub Actions publish workflow (design only, not implemented)

Once the manual process has proven itself, a small, dedicated workflow (triggered manually or
on a release tag) could publish in dependency order using GitHub's own `GITHUB_TOKEN`:

```yaml
permissions:
  contents: read
  packages: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          registry-url: https://npm.pkg.github.com
      - run: npm ci
      - run: npm run build
      - run: npm publish --workspace=@lksnext/iac-conventions-core --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - run: npm publish --workspace=@lksnext/iac-conventions-catalog --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - run: npm publish --workspace=@lksnext/iac-conventions-cli --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This is a proposal for review, not an implemented workflow — no `.github/workflows/` file was
added for this. It never targets `registry.npmjs.org` or a Nexus registry, uses no third-party
release tooling, and reuses the same dependency order (`core` → `catalog` → `cli`) and `--tag
alpha` as the manual runbook above.

## Credentials

No npm token, `.npmrc` credential, or other secret is stored in this repository. The tracked
root [`.npmrc`](../../.npmrc) contains only the non-secret `@lksnext:registry` routing line.
Publishing relies on a newly issued, appropriately scoped GitHub token supplied through a
securely configured environment variable — never the credential previously exposed in this
environment's `~/.npmrc` — or, for a future CI workflow, GitHub Actions' own `GITHUB_TOKEN`,
never committed.
