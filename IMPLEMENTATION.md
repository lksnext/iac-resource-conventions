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
- `packages/core` (`@lksnext/iac-conventions-core`) implements the Executable Domain Model
  (every central Specification concept as a behavior-free public TypeScript contract) and
  the Reference Evaluator's Context Resolution and Convention Evaluation, composed into the
  public `evaluate()` function and its `EvaluateInput` contract (Milestones 1–2; see
  [Milestones](#milestones) below).
- `packages/catalog` (`@lksnext/iac-conventions-catalog`) exists, holding a static,
  immutable Resource Definition Catalog validated against authoritative AWS documentation
  (Milestones 3.1–3.3): a `getResourceDefinition` / `listResourceTypes` lookup API over
  four AWS entries (`aws_s3_bucket`, `aws_iam_role`, `aws_lambda_function`,
  `aws_acm_certificate`). See [Milestones](#milestones) below and
  [`docs/architecture/resource-definition-catalog.md`](docs/architecture/resource-definition-catalog.md).
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
- Context Resolution (Resource Identity and Governance Context) and Convention Evaluation —
  including Specification v1.1 executable naming (component ordering, abbreviation, casing,
  separator joining, optional-component omission, and rejection of a Convention Pack whose
  `naming_component_order` lists the same canonical attribute reference more than once) — are
  implemented under
  [`packages/core/src/evaluator/`](packages/core/src/evaluator/) (see
  [Milestones](#milestones) below), and composed into the public `evaluate()` function
  (increment 2.7), exported from the package root alongside its `EvaluateInput` contract. Metadata
  projection, general normalization, `allowed_characters` grammar, Placement Constraint
  validation, truncation, hashing, global uniqueness, CLI behavior, and adapter integration
  remain unimplemented.
- `packages/cli` and `packages/adapters/*` do not exist yet — they are planned (see
  [Planned packages](#planned-packages)) and must only be created when a concrete task
  needs them, per the repository's incremental-evolution principle (see
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
  fixture strategy](#testing-and-fixture-strategy)). Milestone 1 itself introduced no
  Reference Evaluator behavior; evaluator behavior was added later under Milestone 2.
- **Milestone 2 — Reference Evaluator: Complete for Specification v1.1 executable scope.** The
  deterministic, platform-independent implementation of Context Resolution and Convention
  Evaluation. Architecture defined in
  [`docs/architecture/reference-evaluator.md`](docs/architecture/reference-evaluator.md).
  - Completed increment: **2.1 — Evaluator architecture and public contract** (architecture,
    module boundary, and the behavior-free internal pipeline contracts
    `ContextResolutionInput`, `ContextResolutionResult`, and `ConventionEvaluationInput`
    under
    [`packages/core/src/evaluator/contracts/`](packages/core/src/evaluator/contracts/); no
    evaluation behavior). See
    [`docs/architecture/reference-evaluator.md#pipeline-contracts-implemented`](docs/architecture/reference-evaluator.md#pipeline-contracts-implemented).
  - Completed increment: **2.2 — Context Resolution: Resource Identity** (`resolveResourceIdentity`
    under
    [`packages/core/src/evaluator/context-resolution/`](packages/core/src/evaluator/context-resolution/):
    deterministic resolution precedence, Convention-Pack-declared context authority and
    protection, and required-attribute diagnostics, reusing `ContextResolutionInput`
    unchanged; no Governance Context resolution). See
    [`docs/architecture/reference-evaluator.md#context-resolution-resource-identity-implemented`](docs/architecture/reference-evaluator.md#context-resolution-resource-identity-implemented).
  - Completed increment: **2.3 — Context Resolution: Governance Context** (`resolveGovernanceContext`
    under
    [`packages/core/src/evaluator/context-resolution/`](packages/core/src/evaluator/context-resolution/):
    deterministic resolution of Convention Pack `governance_defaults`, Naming Request
    `governance`, and `overrides.governance`, reusing the same `resolveAttribute` primitive
    and `ContextResolutionInput` contract as 2.2. Two Specification-named sources —
    Evaluation Context and Governance Profile defaults — remain unimplemented, since the
    domain model has neither a governance-bearing Evaluation Context field nor a
    defaults-bearing type for a selected Governance Profile; both are documented
    limitations, not silent omissions). See
    [`docs/architecture/reference-evaluator.md#context-resolution-governance-context-implemented`](docs/architecture/reference-evaluator.md#context-resolution-governance-context-implemented).
  - Completed increment: **2.4 — Resource Convention Preparation** (design gate only: concluded
    that no dedicated preparation contract or module is justified, since the Milestone 2.1
    `ConventionEvaluationInput` contract already bundles `ContextResolutionResult`,
    `ResourceDefinition`, and `ConventionPack`, and any resource-specific filtering of Convention
    Pack policy — for example, which `naming_component_order` entries apply — is Resource
    Projection behavior for increment 2.5, not a separate resolution step. This closes out
    Resource Definition selection too: its definition of done was already satisfied when
    increment 2.1 introduced `ConventionEvaluationInput`. No new code, folder, or contract was
    introduced). See
    [`docs/architecture/reference-evaluator.md#increment-plan`](docs/architecture/reference-evaluator.md#increment-plan).
  - Completed increment: **2.5 — Resource Projection** (`projectResource` under
    [`packages/core/src/evaluator/resource-projection/`](packages/core/src/evaluator/resource-projection/):
    a design gate concluded this establishes a genuine invariant — combining a Convention Pack's
    resource-agnostic `naming_component_order` declaration with a specific resolved
    `ResourceIdentity` to determine, for that resource, which naming components are present,
    which absent-optional components are omitted, which absent-required components must still
    be represented (never silently omitted), and each retained component's originating identity
    plane. Resource Projection is an internal implementation increment within Convention
    Evaluation, not an independent Specification processing stage; it renders no final name and
    applies no abbreviation, normalization, or metadata rule — those remain increment 2.6). See
    [`docs/architecture/reference-evaluator.md#resource-projection-implemented`](docs/architecture/reference-evaluator.md#resource-projection-implemented).
  - Completed increment (for currently executable rules): **2.6 — Convention Evaluation Rules**
    (`evaluateConvention` under
    [`packages/core/src/evaluator/convention-evaluation/`](packages/core/src/evaluator/convention-evaluation/):
    a mandatory rule inventory and scope gate found required-attribute completeness the only
    Convention Evaluation behavior the frozen Specification and current Executable Domain Model
    make genuinely executable today — every other candidate rule (naming rendering, abbreviation
    application, normalization, separators, casing, truncation, hashing, metadata projection,
    Resource Definition technical-constraint validation, Placement Constraint validation, and
    collision handling) remains blocked on a documented Specification or domain-model gap, cited
    in full in the architecture document below. `evaluateConvention` therefore checks every
    declared `required_attributes` entry against the resolved `ContextResolutionResult` and
    produces a `ConventionResult` whose `validation.valid` reflects completeness, with
    `outputs: {}` and no `warnings` in this increment). See
    [`docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented`](docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented).
  - Completed increment: **2.6.1 — Executability Gap Analysis** — a pure documentation and
    analysis increment (no production code, tests, or Specification changes) that formalizes,
    capability by capability with full repository citations, which Specification concepts are
    currently Executable, Modelled but not executable, Conceptual only, External, or Deferred.
    See
    [`docs/architecture/convention-evaluation-executability.md`](docs/architecture/convention-evaluation-executability.md).
    Its explicit recommendation is to pursue Specification v1.1 work for naming-rendering
    semantics (separator, casing, abbreviation) before increment 2.7 begins; 2.7 remains **not
    yet started** and is not implied active by this entry.
  - Completed: **Specification v1.1 — Executable Naming** — a Specification-only change (no
    production code, tests, or dependency changes) that adopted 2.6.1's recommendation: it
    added the canonical attribute-reference vocabulary
    ([`specification/resource-identity.md#canonical-attribute-references`](specification/resource-identity.md#canonical-attribute-references))
    and normative separator, casing, abbreviation, and naming rule execution order semantics
    ([`specification/convention-pack.md#naming-projections`](specification/convention-pack.md#naming-projections)),
    additively over the frozen `specification-v1.0` baseline. See
    [`specification/README.md#specification-v11-executable-naming`](specification/README.md#specification-v11-executable-naming)
    for the full scope, delta, and non-goals. It changes no evaluator behavior by itself.
  - Completed: **2.6.2 — Executable Naming Rules** — implements Specification v1.1's
    canonical Resource Identity naming vocabulary, component ordering, optional-component
    omission, required-component failure handling, abbreviation application, casing, separator
    joining, and deterministic `outputs.name` generation in `packages/core/src/evaluator/`.
    `ConventionPack` now exposes `separator`, `casing`, `naming_component_order`, and the
    reshaped `abbreviations`, with corresponding tests. Not yet complete at the end of this
    increment: validation against `ResourceRenderingConstraints.max_length` remained deferred; it
    was subsequently implemented in 2.7.1, and its cross-language measurement semantics were
    formalized in 2.7.2.
  - Completed: **2.6.3 — Executable Naming Conformance** — closes two conformance gaps found in
    2.6.2's naming implementation. First, `evaluateConvention` now rejects a Convention Pack
    whose `naming_component_order` lists the same canonical attribute reference more than once
    (per
    [`specification/convention-pack.md#naming-projections`](specification/convention-pack.md#naming-projections):
    "A reference listed more than once is invalid."): when duplicates are found, `outputs.name`
    is left `undefined` (Resource Projection and naming are never invoked, so the same attribute
    is never projected twice) and each duplicated reference is reported as its own
    `ConventionValidationFailure`. Second, a documented, evidence-based review (citing ECMA-262
    §22.1.3.28/22.1.3.30 and the Unicode.org Case Mapping FAQ, plus empirical verification)
    found that `casing`'s existing implementation — JavaScript's `toLowerCase()`/
    `toUpperCase()` — implements the Unicode Default Case Conversion algorithm (locale-
    insensitive, but not restricted to one-to-one code point mappings), not the strictly
    one-to-one "Unicode simple case mapping" the Specification previously described; the
    Specification wording in
    [`specification/convention-pack.md#casing`](specification/convention-pack.md#casing) was
    corrected to describe Default Case Conversion, since aligning the wording to the existing,
    cross-runtime-reproducible implementation was the resolution that required no new
    dependency and no implementation change. Both fixes are covered by new runtime tests in
    [`packages/core/test/runtime/naming-evaluation.test.mjs`](packages/core/test/runtime/naming-evaluation.test.mjs).
    This increment also corrected stale "no evaluator behavior is implemented" documentation
    left over from before 2.2–2.6.2 in
    [`packages/core/src/index.ts`](packages/core/src/index.ts) and
    [`packages/core/src/evaluator/index.ts`](packages/core/src/evaluator/index.ts).
  - Completed: **2.6.4 — Naming Specification & Architecture Closure** — a documentation-only
    increment (no evaluator behavior, dependency, or public API changes) that: (1) corrected
    remaining stale documentation describing pre-2.6.2 executability across
    [`specification/README.md`](specification/README.md),
    [`docs/architecture/reference-evaluator.md`](docs/architecture/reference-evaluator.md) (its
    "Dependency boundaries" section and "Increment plan," which previously had no entries for
    2.6.1, Specification v1.1, 2.6.2, or 2.6.3), and
    [`packages/core/src/evaluator/contracts/index.ts`](packages/core/src/evaluator/contracts/index.ts)'s
    header comment; (2) investigated whether cross-implementation Default Case Conversion
    determinism requires pinning a specific Unicode Character Database version in
    [`specification/convention-pack.md#casing`](specification/convention-pack.md#casing) —
    concluding, on the evidence of the Unicode Consortium's own Stability Policies and ECMA-262,
    that a version pin is not warranted yet, since no second-language adapter exists to
    demonstrate an actual divergence (see
    [`docs/architecture/convention-evaluation-executability.md`](docs/architecture/convention-evaluation-executability.md)'s
    new "Unicode Character Database version determinism" section for the full analysis); (3)
    removed an ECMAScript-specific normative justification from
    [`specification/convention-pack.md#casing`](specification/convention-pack.md#casing),
    relocating the cross-runtime evidence to the non-normative architecture document instead, so
    the Specification's casing rule depends only on the Unicode Standard; (4) confirmed, in a new
    "P0 naming readiness" section of
    [`docs/architecture/convention-evaluation-executability.md`](docs/architecture/convention-evaluation-executability.md),
    that every P0 naming capability (canonical attribute vocabulary, component ordering,
    duplicate-reference rejection, optional-component omission, required-component handling,
    abbreviation, casing, separator, deterministic rendering) is normatively specified, executable,
    and tested, with P1/P2 items correctly left deferred; and (5) recorded, in a new "2.7 readiness
    and design invariants" section of
    [`docs/architecture/reference-evaluator.md`](docs/architecture/reference-evaluator.md), the
    non-naming design questions increment 2.7 must still resolve (minimum viable public result,
    Resource Definition and Convention Pack identity boundary checks, Context Resolution
    orchestration, and diagnostics propagation) without deciding or implementing any of them. No
    P0 blocker remains for increment 2.7.
  - Completed increment: **2.7 — Reference Evaluator API** (`evaluate()` and its `EvaluateInput`
    contract under
    [`packages/core/src/evaluator/`](packages/core/src/evaluator/), exported from the package
    root: the first stable public orchestration API for the Reference Evaluator, composing
    `resolveResourceIdentity`, `resolveGovernanceContext`, and `evaluateConvention` exactly as
    2.2, 2.3, and 2.6 implemented and tested them, introducing no new processing stage and no
    new evaluation rule. Resolves all four design invariants recorded by 2.6.4: the public
    function signature (`EvaluateInput`, a single aggregate input object), the Resource
    Definition and Convention Pack identity boundaries (defensive `ConventionValidationFailure`-
    shaped checks at the public boundary), Context Resolution orchestration (both resolvers
    invoked and composed into one `ContextResolutionResult`), and diagnostics propagation
    (`protected-value-conflict` diagnostics surface as `ConventionResult.warnings`;
    `unresolved-required-attribute` diagnostics are not duplicated, since `evaluateConvention`
    already re-derives that outcome independently)). See
    [`docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented`](docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented).
  - Completed increment: **2.7.1 — Public Evaluator Conformance** (a post-implementation review
    of 2.7 found, and this increment closes, two conformance gaps without redesigning
    `evaluate()` or `evaluateConvention`: first, `max_length` validation
    (`ResourceRenderingConstraints.max_length`) is now implemented as `maxLengthFailure` in
    [`packages/core/src/evaluator/convention-evaluation/evaluate-convention.ts`](packages/core/src/evaluator/convention-evaluation/evaluate-convention.ts),
    per
    [`specification/convention-pack.md#naming-rule-examples`](specification/convention-pack.md#naming-rule-examples)
    ("Validation without truncation"): an over-length generated name is reported as a
    `ConventionValidationFailure`, composed with any other failures, and the name itself is
    retained exactly as produced, never truncated. Length was measured in Unicode code points at
    the end of this increment, a documented implementation-scoped decision recorded in
    [`docs/architecture/convention-evaluation-executability.md#length-and-truncation`](docs/architecture/convention-evaluation-executability.md#length-and-truncation)
    since the Specification did not yet define the length unit itself; this was formalized
    normatively in 2.7.2 below. `allowed_characters`
    remains deferred. Second, `evaluate()`'s final line previously discarded Convention
    Evaluation's own `ConventionResult.warnings` whenever Context Resolution's diagnostics-
    derived warnings were also present, instead of merging both; a new `mergeWarnings` helper in
    [`packages/core/src/evaluator/evaluate.ts`](packages/core/src/evaluator/evaluate.ts) merges
    both sources (Context Resolution's warnings first, Convention Evaluation's second) without
    inventing a new warning taxonomy). See
    [`docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented`](docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented).
  - Completed increment: **2.7.2 — Deterministic Name Length Semantics** (closes the remaining
    `max_length` interoperability ambiguity left open by 2.7.1: Specification v1.1 defined
    `max_length` validation, but never normatively defined the unit it counts, so two
    independently conforming Reference Evaluator implementations could measure the same
    generated name differently.
    [`specification/resource-definition.md#rendering-constraints`](specification/resource-definition.md#rendering-constraints)
    now normatively requires a Resource Definition that declares
    `rendering_constraints.max_length` to also declare `rendering_constraints.length_unit`, from
    a closed `code_points` / `utf8_bytes` vocabulary (a new
    [`ResourceNameLengthUnit`](packages/core/src/model/definitions/resource-name-length-unit.ts)
    type). `ResourceRenderingConstraints` is now a discriminated union that makes `max_length`
    without `length_unit` (and vice versa) unrepresentable in TypeScript, proven by new
    compile-time contract fixtures in
    [`packages/core/test/types/contract-fixtures.ts`](packages/core/test/types/contract-fixtures.ts).
    `maxLengthFailure` no longer makes an independent length-unit choice: it measures each
    generated name according to the Resource Definition's own declared `length_unit`, via a new
    internal `measureLength` helper (`code_points` via `[...value].length`; `utf8_bytes` via a
    pure ECMAScript code-point-to-byte-count calculation — no dependency added, since Node's
    `Buffer` is not usable here without adding `@types/node`). A `length_unit`-less `max_length`
    arriving from an untyped source (for example, parsed JSON) is reported as its own dedicated
    validation failure at runtime, never silently defaulted to a unit. New runtime tests in
    [`packages/core/test/runtime/convention-evaluation.test.mjs`](packages/core/test/runtime/convention-evaluation.test.mjs)
    prove the same generated name can be valid under one Resource Definition and invalid under
    another, solely because their declared `length_unit` differs. This is documented as a
    Specification v1.1 clarification, not a new Specification version, in
    [`specification/README.md#length-unit-clarification`](specification/README.md#length-unit-clarification).
    See
    [`docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented`](docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented)
    and
    [`docs/architecture/convention-evaluation-executability.md#length-and-truncation`](docs/architecture/convention-evaluation-executability.md#length-and-truncation).
  - Not yet started: metadata projection, general normalization, `allowed_characters` grammar,
    Placement Constraint validation, Governance Profile defaults, truncation, hashing, and
    global uniqueness. Every one of these is a Specification v1.1 Non-Goal (see
    [`specification/README.md#specification-v11-non-goals`](specification/README.md#specification-v11-non-goals)),
    not a gap within v1.1's own executable scope, so their absence does not contradict Milestone
    2's "Complete for Specification v1.1 executable scope" status above.
  - Deferred: see
    [`docs/architecture/reference-evaluator.md#deferred-decisions`](docs/architecture/reference-evaluator.md#deferred-decisions).

- **Milestone 3 — Resource Definition Catalog.** A static, immutable catalog answering "given
  a canonical `ResourceType`, which `ResourceDefinition` describes it?", strictly outside
  `evaluate()` (see
  [`docs/architecture/resource-definition-catalog.md`](docs/architecture/resource-definition-catalog.md)).
  Planned increments (this split is not mandatory; a later increment may reshape 3.3–3.4 if
  repository analysis suggests a better one):
  - **3.1 — Catalog Architecture & Foundation.**
  - **3.2 — AWS Resource Definitions — Initial Slice.**
  - **3.3 — Catalog Validation & Model Conformance.**
  - **3.3.2 — Catalog Conformance Automation.**
  - **3.4 — Additional Providers** (planned): Azure, Kubernetes, or other provider catalogs.
    Not activated by 3.3 — see 3.3's own recommended next action below.
  - Completed increment: **3.1 — Catalog Architecture & Foundation** (a new workspace package,
    `packages/catalog/` (`@lksnext/iac-conventions-catalog`), depending on `core` and never the
    reverse, proven by
    [`packages/catalog/test/runtime/dependency-direction.test.mjs`](packages/catalog/test/runtime/dependency-direction.test.mjs).
    Exposes a minimal, static lookup API — `getResourceDefinition(resourceType)` and
    `listResourceTypes()` — over an immutable `ResourceType -> ResourceDefinition` map built
    from plain `ResourceDefinition` values (no `CatalogResourceDefinition` subtype, no class, no
    mutable registry). Contains exactly one entry, `aws_s3_bucket`, deliberately declaring no
    `rendering_constraints`, `identity_constraints`, or `placement_constraints`, since this
    increment's purpose is to prove the package and API boundary, not to research provider
    technical constraints (deferred to 3.2). An end-to-end integration test
    ([`packages/catalog/test/runtime/integration.test.mjs`](packages/catalog/test/runtime/integration.test.mjs))
    proves the intended `resource_type -> catalog lookup -> ResourceDefinition -> evaluate() ->
    ConventionResult` flow, with the catalog lookup performed explicitly by the caller before
    invoking `core`'s `evaluate()` — `evaluate()` itself was not modified. No Specification file
    changed).
  - Completed increment: **3.2 — AWS Resource Definitions — Initial Slice** (upgraded
    `aws_s3_bucket` and added three new entries — `aws_iam_role`, `aws_lambda_function`,
    `aws_acm_certificate` — every technical constraint sourced from authoritative AWS
    documentation, cited in a provenance comment next to each definition under
    `packages/catalog/src/aws/`, never from Terraform provider documentation or from memory.
    Replaced Milestone 3.1's two-level `Object.freeze` with an internal recursive `deepFreeze`
    helper ([`packages/catalog/src/internal/deep-freeze.ts`](packages/catalog/src/internal/deep-freeze.ts)),
    since a definition with nested `rendering_constraints`/`identity_constraints`/
    `placement_constraints` needs more than a two-level freeze to be genuinely immutable.
    `listResourceTypes()` now derives from a single source-of-truth registration map with no
    duplicated resource-type array. Found and documented three Specification/model gaps without
    fixing them: no `min_length` field (Amazon S3 documents a 3-character minimum); no separate
    identifier component for IAM's `path` (distinct from a role's own name); and
    `placement_constraints`' flat `ReadonlyArray<string>` shape can only describe a conditional
    rule (ACM certificate + CloudFront's `us-east-1` requirement) as two independent descriptive
    strings, not a structured condition. No Specification file changed; `evaluate()` was not
    modified and still performs no catalog lookup. See
    [`docs/architecture/resource-definition-catalog.md`](docs/architecture/resource-definition-catalog.md)
    for the full findings.
  - Completed increment: **3.3 — Catalog Validation & Model Conformance** (classified every
    fact in all four AWS entries as Explicit, Derived, or an explicit absence — no
    `Unsupported` fact was found. Made three evidence-driven corrections without changing any
    catalog value: scoped `aws_s3_bucket` explicitly and permanently to general purpose
    buckets only, since AWS's `CreateBucket` API can also produce a directory bucket with a
    materially different namespace/grammar (a future directory-bucket entry would need its own
    `ResourceType`, never a conditional branch); reclassified `aws_lambda_function`'s
    `uniqueness_scope` evidence as Derived, not Explicit, citing `ResourceConflictException`
    and the `FunctionArn` shape; reworded `aws_acm_certificate`'s two `placement_constraints`
    strings so each names the other, reducing the risk they are read as independent facts
    rather than one conditional rule. Strengthened `aws_iam_role`'s `global: true` provenance
    to cite the Specification's own precise `global` definition rather than endpoint existence
    alone. Added catalog integrity tests: no empty `resource_type`, no duplicate
    `resource_type`, no empty `placement_constraints` string, and `unique: true` always paired
    with a `uniqueness_scope`. Documented, without implementing, further model gaps (a
    `min_length` field, a secondary identifier component, a conditional-constraint mechanism,
    an executable character grammar, a structured `uniqueness_scope` vocabulary, and reserved
    name patterns) and a three-tier support-status vocabulary (Cataloged / Naming-executable /
    Partially modeled). No Specification file changed, no new AWS/Azure/Kubernetes resource
    added, no new dependency added. Recommended a future Specification v1.2 —
    Executable Resource Constraints evolution (scope proposal only, not implemented) as the
    next action, over expanding AWS coverage further, since every one of the four current
    entries independently hit the same set of gaps. See
    [`docs/architecture/resource-definition-catalog-conformance.md`](docs/architecture/resource-definition-catalog-conformance.md)
    for the full conformance matrix and findings.)
  - Completed increment: **3.3.2 — Catalog Conformance Automation** (turns 3.3's ad hoc
    catalog integrity assertions into one reusable, internal, unexported validator —
    `validateResourceDefinition`/`validateCatalogEntries` under
    [`packages/catalog/src/internal/validate-resource-definition.ts`](packages/catalog/src/internal/validate-resource-definition.ts)
    — that mechanically checks a static `ResourceDefinition`'s structural conformance to
    Specification v1.2 (length-bound pairing and ordering, character-set/reserved-pattern
    shape, `PlacementConstraint` operator/subject shape, catalog key/`resource_type`/
    duplicate-registration invariants), returning every issue found rather than throwing
    on the first one, in deterministic field-declaration order. This is catalog quality
    infrastructure, not Reference Evaluator behavior: `evaluate()` was not touched, no new
    `ResourceType` or provider was added, and no Specification file changed. Duplicate
    character-set/reserved-pattern entries remain deliberately unrejected, since
    Specification v1.2 states they have no effect rather than prohibiting them.
    `packages/catalog/test/runtime/conformance.test.mjs` proves all four current AWS
    entries pass with zero issues and exercises 14 negative fixtures; the now-redundant
    invariant assertions previously duplicated in
    [`packages/catalog/test/runtime/catalog.test.mjs`](packages/catalog/test/runtime/catalog.test.mjs)
    were removed in favor of this single validator, and it now runs as part of the
    existing `npm test`/`npm run validate` pipeline (see the catalog architecture
    document's
    [Catalog Conformance Validation](docs/architecture/resource-definition-catalog.md#catalog-conformance-validation)
    section) — no new script or CI job was added, since that pipeline already gates every
    pull request. Provider factual truth (evidence quality, currency, provenance) remains
    outside this validator's scope and continues to be reviewed per
    [`docs/architecture/resource-definition-catalog-conformance.md`](docs/architecture/resource-definition-catalog-conformance.md),
    which this increment does not replace.)

Milestone 3.3 is complete; **Specification v1.2 — Executable Resource Constraints** is
now the active Specification evolution (see
[`specification/README.md#specification-v12-executable-resource-constraints`](specification/README.md#specification-v12-executable-resource-constraints)),
acting on 3.3's own recommendation. This is a Specification-only design change: it does
not expand AWS catalog coverage, and Milestone 3.4 — Additional Providers is **not**
activated by it. Once merged, the planned follow-up implementation increments (not
scoped or started here) are, in order:

- **Executable Resource Constraint Model** — add the Specification v1.2 fields
  (`min_length`, `character_constraints`, `starts_with`/`ends_with`,
  `forbidden_prefixes`/`forbidden_suffixes`, the migrated `PlacementConstraint` shape,
  and `ConventionValidationFailure.code`) to the public TypeScript domain model under
  `packages/core/src/model/`, with no evaluator behavior yet.
- **Resource Constraint Evaluation** — implement the corresponding Reference Evaluator
  checks, in the deterministic order
  [`resource-definition.md#constraint-validation-order-specification-v12`](specification/resource-definition.md#constraint-validation-order-specification-v12)
  defines, and update the four AWS catalog entries per the [Catalog impact
  plan](specification/resource-definition.md#catalog-impact-plan-non-normative).

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
├── core/               # @lksnext/iac-conventions-core (exists)
│   ├── package.json
│   ├── README.md
│   ├── tsconfig.json
│   └── src/
│       └── index.ts
└── catalog/            # @lksnext/iac-conventions-catalog (exists)
    ├── package.json
    ├── README.md
    ├── tsconfig.json
    └── src/
        ├── aws/
        │   └── s3-bucket.ts
        └── index.ts
```

### Planned packages

These do not exist yet. Do not create them speculatively — only when a concrete task
requires them:

```text
packages/
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
`outDir` and `include`. Project references (`composite`/`tsc -b`) remain intentionally not
configured: `packages/catalog/` now depends on `core` (Milestone 3.1), but its own `build`/
`typecheck` scripts already build `core` first explicitly (`npm run build -w
@lksnext/iac-conventions-core && tsc -p tsconfig.json`), which works correctly regardless of
npm workspaces' alphabetical build ordering and needs no incremental build graph to do so.
With only two packages and one dependency edge, project references would add `composite`
configuration and a `tsc -b` invocation for a build-ordering problem the explicit script
prefix already solves; introduce them when a third package joins the dependency graph, or
when incremental cross-package build time becomes an observed problem this explicit-ordering
approach does not scale to.

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

Every contract is type-only (an `interface` or a `type` alias); the model layer itself carries
no runtime behavior beyond the existing `CORE_PACKAGE_NAME` constant, by design (see
[`docs/architecture/executable-domain-model.md#non-goals`](docs/architecture/executable-domain-model.md#non-goals)).
Context Resolution, Convention Evaluation, and Specification v1.1 executable naming are
implemented separately, under `packages/core/src/evaluator/` (see
[Milestones](#milestones)), which depends on the model but is never depended on by it; every
adapter remains unimplemented.

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

Automated enforcement of these rules through a dedicated dependency graph tool (a
circular-dependency detector, deep-import checks) is intentionally **not** introduced
yet: `packages/catalog/` (see [Planned packages](#planned-packages)) is the first
package with a real dependency on another package, and its direction is instead proven
by [`packages/catalog/test/runtime/dependency-direction.test.mjs`](packages/catalog/test/runtime/dependency-direction.test.mjs)
— a plain Node.js test scanning package manifests and import specifiers, the same
approach [`packages/core/test/runtime/model-independence.test.mjs`](packages/core/test/runtime/model-independence.test.mjs)
already used for the model/evaluator boundary within `core`. A dedicated tool such as
dependency-cruiser remains deferred until the package graph grows enough (`cli` and
adapters depending on both `core` and `catalog`) that hand-written scans like this one
stop scaling. Until then, the documented package dependency direction above is the
architectural contract, and code review is the
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
- **Evaluator pipeline contract fixtures** (`test/types/evaluator-contract-fixtures.ts`) —
  added in Milestone 2.1, mirroring the compile-time fixtures above for
  `packages/core/src/evaluator/contracts/`: valid compositions (reusing existing domain
  fixtures to prove composition rather than duplication), `@ts-expect-error` cases for
  missing required fields and `readonly` mutation, and an `@ts-expect-error`-guarded import
  attempt proving these contracts are not importable from the package root.
- **Model-independence check** (`test/runtime/model-independence.test.mjs`) — added in
  Milestone 2.1, a static scan of every `packages/core/src/model/` source file's import
  specifiers asserting none reference the evaluator, since no project-references or
  dependency-cycle-detection tooling exists yet to enforce this at build time (see
  [Deferred decisions](#deferred-decisions)).

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
- **Project references / `tsc -b`** — still deferred; see
  [`#typescript-configuration`](#typescript-configuration) for the current reasoning now that
  `catalog` depends on `core` (an explicit build-script ordering already solves the only
  problem project references would address, with just one dependency edge).
- **Binary packaging for the CLI** — deferred until the CLI package exists and a concrete
  distribution need is identified.
- **`fixtures/` creation** — the directory layout is documented above but not created;
  it will be created alongside the first contract test that needs it.
- **Dependency-cycle-detection tooling** — deferred until the dependency graph has more
  than one internal edge.
