# Publishing runbook (first alpha)

This is release-process documentation, not a Specification or product change. It records the
approved sequence for the first alpha publication of `@lksnext/iac-conventions-core`,
`@lksnext/iac-conventions-catalog`, and `@lksnext/iac-conventions-cli`. No package has been
published under this runbook yet; see
[IMPLEMENTATION.md#alpha-package-conformance](../../IMPLEMENTATION.md#alpha-package-conformance)
and
[IMPLEMENTATION.md#release-readiness](../../IMPLEMENTATION.md#release-readiness)
for the full rationale behind each decision below.

## Preconditions

- Working from a clean checkout of `main` (`git status` clean, `git pull --ff-only` up to
  date).
- All three packages at the intended synchronized version (currently `0.1.0-alpha.0`), with
  exact-pinned internal dependency versions (`catalog` and `cli` depend on the others by exact
  version, not a range).
- npm authentication for the `@lksnext` organization is configured locally (`npm whoami`
  succeeds) — no token is ever stored in this repository.

## Sequence

1. `git switch main && git pull --ff-only`
2. `npm ci`
3. `npm run validate` (formatting, lint, typecheck, tests, license checks — see
   [IMPLEMENTATION.md#root-workspace-commands](../../IMPLEMENTATION.md#root-workspace-commands)
   for what this aggregates)
4. `npm run build` (explicit, even though `prepack` now also builds — confirms a clean build
   succeeds before relying on `prepack` to repeat it during `npm pack`/`npm publish`)
5. `npm run package:smoke-test` (proves the installed CLI's `--version`, `evaluate`, and
   `terraform-external` all work from real tarballs, not workspace symlinks)
6. Verify npm auth and `@lksnext` organization publish permission (`npm whoami`,
   `npm access ls-packages @lksnext` or equivalent)
7. Publish in dependency order — **`core` first, then `catalog`, then `cli`** — since `catalog`
   and `cli` depend on exact-pinned versions of the packages published before them:
   - `npm publish --workspace=@lksnext/iac-conventions-core --tag alpha`
   - `npm publish --workspace=@lksnext/iac-conventions-catalog --tag alpha`
   - `npm publish --workspace=@lksnext/iac-conventions-cli --tag alpha`
8. Verify the published packages by installing them in a disposable project, outside this
   repository (`npm install @lksnext/iac-conventions-cli@alpha && npx iac-conventions
   --version`).
9. Create an annotated, signed Git tag for the release (for example, `v0.1.0-alpha.0`) once the
   packages are confirmed installable.
10. Create a GitHub Release from that tag, using the corresponding
    [`docs/release-notes/`](.) entry as the release description.

Steps 6–10 are **not** executed by this runbook document itself — they are the sequence a
maintainer follows when an actual publish is approved. No step in this document was executed
as part of writing it.

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
CI-driven publish workflow, not claimed for this first, manual alpha.

## Manual vs. CI publish

Publish the first alpha manually, following this runbook, from an approved and signed release
commit. Introduce a GitHub Actions publish workflow (with provenance) only after the manual
process has proven the package topology actually works end-to-end. Changesets, Lerna, or Rush
are not warranted for three synchronously versioned packages.

## Credentials

No npm token, `.npmrc` credential, or other secret is stored in this repository. Publishing
relies on the maintainer's own local npm authentication (or, for a future CI workflow, a
repository secret configured directly in GitHub, never committed).
