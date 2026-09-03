# Resource Definition Catalog

## Purpose

The Resource Definition Catalog answers a single question: given a canonical
`ResourceType`, which `ResourceDefinition` describes that resource? It is static
provider knowledge — name-length limits, uniqueness scope, placement rules, and similar
technical facts about a *kind* of resource — not a resolution or evaluation step. It
exists so that callers such as the CLI, adapters, and future integrations can obtain the
correct `ResourceDefinition` before invoking
[`@lksnext/iac-conventions-core`](../../packages/core/README.md)'s `evaluate()`, instead
of constructing one by hand or duplicating provider knowledge at every call site.

## Relationship with the Specification

[`specification/resource-definition.md`](../../specification/resource-definition.md)
defines the *concept* of a Resource Definition only; it explicitly defers "an actual
catalog of resource types" and "concrete AWS, Azure, or Kubernetes resource types" to a
later iteration (see its "Out of scope for this document" section).
[`specification/README.md`](../../specification/README.md#what-does-not-belong-here)
is more direct still: "Resource Definitions catalog entries" are configuration and
implementation concerns that consume the Specification's concepts, and are explicitly
listed as **not** belonging under `specification/`.

The catalog therefore implements a Specification concept; it does not extend or
reinterpret it. Every catalog entry is a `ResourceDefinition` value exactly as defined
by `@lksnext/iac-conventions-core`'s Executable Domain Model (see
[`docs/architecture/executable-domain-model.md`](executable-domain-model.md)) — no
catalog-specific subtype, and no field the Specification does not already describe.

## Package boundary

The catalog lives in its own workspace package, `packages/catalog/`
(`@lksnext/iac-conventions-catalog`), separate from `@lksnext/iac-conventions-core`:

- `core` must remain provider-independent — it has no knowledge of AWS, Azure, or
  Kubernetes resource types, only the Specification's abstract concepts.
- The catalog contains provider- and resource-specific knowledge, which will grow
  independently of the evaluator's own release cadence.
- Consumers who only need `evaluate()` (for example, a caller that already has its own
  `ResourceDefinition` values) are not forced to depend on the catalog.
- Future provider catalogs (Azure, Kubernetes) can evolve independently of both `core`
  and each other.

This matches the package architecture anticipated by
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md#planned-packages) and
[`README.md`](../../README.md#planned-architecture).

## Dependency direction

```text
core
  ^
catalog
  ^
CLI / adapters (future)
```

`catalog` depends on `core` (a single `dependencies` entry on
`@lksnext/iac-conventions-core` in
[`packages/catalog/package.json`](../../packages/catalog/package.json)); `core` must
never depend on `catalog`. This repository does not use dependency-cruiser or other
architectural-dependency tooling (see
[`IMPLEMENTATION.md#status`](../../IMPLEMENTATION.md#status)); instead, the direction is
enforced the same way `packages/core/test/runtime/model-independence.test.mjs` already
enforces the model/evaluator boundary — by
[`packages/catalog/test/runtime/dependency-direction.test.mjs`](../../packages/catalog/test/runtime/dependency-direction.test.mjs)
scanning package manifests and import specifiers directly:

- `catalog`'s `package.json` declares a dependency on `@lksnext/iac-conventions-core`.
- `core`'s `package.json` declares no dependency on `@lksnext/iac-conventions-catalog`.
- No `core` source file imports from the catalog.
- No catalog source file imports from anything other than `core` or the catalog's own
  relative modules (in particular, no provider SDK).

## Catalog responsibilities

The catalog is responsible for:

- holding a static, immutable map from canonical `ResourceType` to `ResourceDefinition`;
- looking up a `ResourceDefinition` by `ResourceType`, returning `undefined` for an
  unknown one;
- listing the `ResourceType`s it knows about, deterministically.

## Non-responsibilities

The catalog does **not**:

- resolve Resource Identity or Governance Context (Context Resolution remains `core`'s
  responsibility);
- apply conventions or generate names (Convention Evaluation remains `core`'s
  responsibility);
- access cloud provider APIs, inspect live infrastructure, or discover resources
  dynamically;
- validate deployed infrastructure;
- perform Context Resolution or Convention Evaluation (those remain `core`'s
  responsibility; `core` evaluates the structured v1.2 constraints carried by a
  catalog definition);
- expose a mutable runtime registry — there is no `registerResourceDefinition` or
  `unregisterResourceDefinition`, since no current consumer needs one, and a static
  catalog keeps lookup deterministic and testable.

`evaluate()` itself does not perform catalog lookup, and never will: the catalog sits
strictly before `evaluate()` in the caller's own code, as proven by
[`packages/catalog/test/runtime/integration.test.mjs`](../../packages/catalog/test/runtime/integration.test.mjs).

## Static catalog model

```text
package contents (packages/catalog/src/**)
    -> immutable ResourceDefinition map (packages/catalog/src/index.ts)
        -> lookup (getResourceDefinition / listResourceTypes)
```

The catalog is a plain object literal built from imported `ResourceDefinition` constants,
recursively frozen by an internal `deepFreeze` helper
([`src/internal/deep-freeze.ts`](../../packages/catalog/src/internal/deep-freeze.ts)),
not only `Object.freeze`d at the top level. Milestone 3.1's two-level freeze (outer map,
individual `ResourceDefinition` value) was sufficient only because its one entry had no
nested object or array field; once a definition gained a nested
`rendering_constraints`, `identity_constraints`, or `placement_constraints` value (as
every Milestone 3.2 entry does), a shallow freeze would leave `definition
.rendering_constraints.max_length = 1` or `definition.placement_constraints.push(...)`
silently succeeding. `deepFreeze` is applied once at each individual definition's own
definition site (for example, `AWS_S3_BUCKET`) and again to the outer
`ResourceType -> ResourceDefinition` map itself, since the map is a distinct value from
any entry it contains. `deepFreeze` is internal-only (not exported), has no dependency,
and handles plain objects and arrays only — `ResourceDefinition` values contain no
`Map`, `Set`, `Date`, class instance, or circular reference, so support for those was not
added. There is no class, no constructor, and no mutable singleton — the catalog is
exactly the module's own exports.

## Public API

```ts
function getResourceDefinition(resourceType: ResourceType): ResourceDefinition | undefined;
function listResourceTypes(): ReadonlyArray<ResourceType>;
```

- **`getResourceDefinition`** returns `undefined` for an unknown resource type rather
  than throwing. An unknown resource type is an expected, recoverable outcome for a
  caller (for example, a CLI validating user input), not an exceptional one; this
  repository does not introduce a custom exception hierarchy for it.
- **`listResourceTypes`** returns every known `ResourceType` in lexical order, the only
  order with no other domain meaning here.

`hasResourceDefinition`, `listResourceDefinitions`, `search`, `filter`, `discover`,
`refresh`, `register`, and `unregister` were considered and deliberately not added:
`getResourceDefinition(...) !== undefined` already answers "has", and no current
consumer needs the others. They can be added later, additively, if a concrete consumer
demonstrates the need (see [Future evolution](#future-evolution)).

Only `ResourceDefinition` and `ResourceType` are used, both already public
`core` contracts — there is no `CatalogResourceDefinition` or `AwsResourceDefinition`
subtype, and no class.

## Provider organization

```text
packages/catalog/src/
    aws/
        acm-certificate.ts
        iam-role.ts
        lambda-function.ts
        s3-bucket.ts
    internal/
        deep-freeze.ts
    index.ts
```

Only `aws/` exists, because the catalog currently contains only a small AWS slice (see
[Definition provenance and modeling findings](#definition-provenance-and-modeling-findings)
below). No `azure/` or `kubernetes/` directory exists yet, and no `providers/base/`,
`providers/common/`, or `providers/generic/` grouping was introduced — none has a
concrete responsibility yet. A provider directory is created only once it holds a real
definition, per this repository's incremental-evolution principle (see
[`AGENTS.md#repository-evolution`](../../AGENTS.md#repository-evolution)).

## Definition provenance and modeling findings

Milestone 3.2 added the catalog's first authoritative AWS slice: `aws_s3_bucket`
(upgraded from Milestone 3.1's minimal entry), `aws_iam_role`, `aws_lambda_function`,
and `aws_acm_certificate`. Every technical constraint below is sourced from official
AWS documentation (`docs.aws.amazon.com`), cited in a provenance comment next to each
definition under `packages/catalog/src/aws/` — not from Terraform provider
documentation, and not from memory. Provenance is recorded only as a source comment,
never as a runtime field on `ResourceDefinition`, since the Specification does not
define provenance as domain data.

Milestone 3.3 reviewed every fact below for evidence quality, corrected the three
findings it produced (an explicit general-purpose-only scope for `aws_s3_bucket`, an
Explicit-vs-Derived reclassification for `aws_lambda_function`'s uniqueness scope, and
clearer conditional wording for `aws_acm_certificate`'s placement constraints), and
formalized the provenance and freshness policy this section already followed in
practice. See
[`docs/architecture/resource-definition-catalog-conformance.md`](resource-definition-catalog-conformance.md)
for the full per-fact conformance matrix, evidence classification, prioritized model
gaps, support-status vocabulary, and coverage reporting — not duplicated here.

### Selected slice and rationale

| Resource type | Why selected |
| --- | --- |
| `aws_s3_bucket` | Globally unique name across an entire AWS partition; tests `identity_constraints.unique`/`uniqueness_scope` at their broadest scope, and exposes a genuine minimum-length gap (see below). |
| `aws_iam_role` | A single `iam.amazonaws.com` endpoint is listed for every commercial Region ([AWS General Reference](https://docs.aws.amazon.com/general/latest/gr/iam-service.html)), and role quotas are account-scoped, not per-Region — direct evidence for `identity_constraints.global: true`, matching the Specification's own IAM Role illustrative example. |
| `aws_lambda_function` | A "normal" regional, account-scoped resource, for contrast with the global/partition-scoped entries above. |
| `aws_acm_certificate` | `RequestCertificate` never accepts a user-supplied name — only `DomainName` — so this entry declares no `rendering_constraints` at all, the first catalog entry to omit the field entirely. It is also the Specification's own conditional-placement illustrative example: regional, but must be `us-east-1` when associated with a CloudFront distribution ([source](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)). |

`aws_dynamodb_table`, `aws_cloudfront_distribution`, and `aws_sqs_queue` were considered
and not added: the four resources above already cover global-partition-unique,
account-scoped-global, regional-with-no-conditional-rule, and no-name/
conditional-placement cases without redundancy.

### Length-unit findings

Every character AWS documents as valid for these four resource types' names is
single-byte ASCII (lowercase letters/digits/periods/hyphens for S3; alphanumeric plus a
small symbol set for IAM; letters/digits/hyphens/underscores for Lambda). Unicode code
points and UTF-8 bytes therefore coincide for every conforming name, so `code_points` was
chosen for all three `rendering_constraints`-bearing entries, for consistency with the
Reference Evaluator's own default choice (see
[`specification/README.md#length-unit-clarification`](../../specification/README.md#length-unit-clarification)).
No entry required `utf8_bytes`; this catalog's evidence base does not yet demonstrate the
need for a resource type whose valid characters are not single-byte ASCII.

### Model gaps found (documented, not fixed here)

- **No secondary identifier component (`path`)** — IAM separately limits a role's
  `path` to 512 characters and the combined `path` + role name to 64 characters for
  one console workflow. `ResourceDefinition` has no concept of a secondary,
  independently-constrained identifier; `aws_iam_role` models only the role-name
  limit, not `path`.
- **ACM/CloudFront cross-resource relationship** — v1.2 adds structured placement
  rules for canonical Resource Identity subjects, but no canonical attribute represents
  a certificate's association with a CloudFront distribution. ACM's entries therefore
  remain statement-only and are not evaluated as conditional rules.
- **No `rendering_constraints` at all for a real resource type** —
  `aws_acm_certificate` is the first catalog entry to omit `rendering_constraints`
  entirely, since ACM certificates have no user-supplied name. This confirms the field's
  optionality is load-bearing, not merely a type-level nicety.

## Testing strategy

- **Package boundary** —
  [`test/runtime/dependency-direction.test.mjs`](../../packages/catalog/test/runtime/dependency-direction.test.mjs):
  dependency direction, no provider SDK dependency, no cross-package import.
- **Lookup** —
  [`test/runtime/catalog.test.mjs`](../../packages/catalog/test/runtime/catalog.test.mjs):
  known/unknown lookup, determinism, immutability (including deep immutability of
  nested `rendering_constraints`, `identity_constraints`, and `placement_constraints`),
  an exact expected `listResourceTypes()` list (not merely "already sorted", so a
  missing registration is caught), and that every catalog key matches its own
  definition's `resource_type`.
- **Conformance** —
  [`test/runtime/conformance.test.mjs`](../../packages/catalog/test/runtime/conformance.test.mjs):
  see [Catalog Conformance Validation](#catalog-conformance-validation) below.
- **Integration** —
  [`test/runtime/integration.test.mjs`](../../packages/catalog/test/runtime/integration.test.mjs):
  an end-to-end `resource_type -> catalog lookup -> ResourceDefinition -> evaluate() ->
  ConventionResult` flow, with the lookup performed explicitly before calling
  `evaluate()`, plus a case proving a real catalog definition's `max_length`/
  `length_unit` constrains `evaluate()`'s validation output. Structured rendering and
  placement constraints are exercised by core evaluator tests; statement-only catalog
  placement entries remain descriptive (see
  [`docs/architecture/convention-evaluation-executability.md`](convention-evaluation-executability.md)).

## Catalog Conformance Validation

Milestone 3.3.2 turns the catalog's mechanically verifiable publication invariants —
previously spread across several ad hoc test assertions — into one reusable internal
validator:
[`src/internal/validate-resource-definition.ts`](../../packages/catalog/src/internal/validate-resource-definition.ts).
It answers a narrower question than Convention Evaluation:

- **Resource evaluation** (owned by `@lksnext/iac-conventions-core`'s `evaluate()`)
  validates a resource *instance*/rendered name against a `ResourceDefinition`.
- **ResourceDefinition conformance** (owned by this package) validates that a *static
  catalog definition itself* is well formed according to Specification v1.2 and this
  catalog's own publication policy, before it is ever passed to `evaluate()`.

These are different concerns and are never mixed: `evaluate()` never calls this
validator, and this validator never inspects a resolved Resource Identity or generates
or validates a rendered name. It runs during catalog tests (see
[Testing strategy](#testing-strategy) above), as part of the normal `npm test`/
`npm run validate` pipeline that already gates this repository's CI — no separate
`catalog:validate` script was added, since no concrete workflow yet needs conformance
checked outside that pipeline (see
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) and
[`CONTRIBUTING.md#continuous-integration`](../../CONTRIBUTING.md#continuous-integration)).
It is not repeated on every `getResourceDefinition()` call: the catalog is trusted,
immutable, built-in package data, not untrusted runtime input.

`validateResourceDefinition`/`validateCatalogEntries` are internal-only — neither is
exported from [`src/index.ts`](../../packages/catalog/src/index.ts) — and return a
`ReadonlyArray<CatalogConformanceIssue>` (`{ resource_type, path, message }`) rather
than throwing, so a single malformed definition reports every problem at once, in
deterministic field-declaration order. There is no severity, code, or diagnostic
framework: every issue in this increment blocks publication/tests, so a taxonomy would
carry no decision either way. This provides defensive conformance checks for malformed
values that reach the static catalog validation boundary, including a possible future
generated/imported catalog pipeline — it is **not** a general-purpose runtime schema
validator for arbitrary unknown JSON (see [What is automated](#what-is-automated)
below for its exact, fixed invariant set).

### What is automated

- `resource_type`/`platform` are non-empty; `category`, when declared, is non-empty.
- `identity_constraints.uniqueness_scope` is declared, and non-empty, whenever `unique`
  is `true`.
- `min_length`, when declared, is a non-negative integer (Specification v1.2 states
  this explicitly) — `NaN`, `Infinity`, negative values, and fractions are all
  rejected. `max_length`, when declared, is a non-negative finite number — `NaN`,
  `Infinity`, `-Infinity`, and negative values are rejected, but a fraction is **not**
  rejected, since the Specification does not state, the same explicit way it does for
  `min_length`, that `max_length` itself must be an integer (a documented normative gap;
  see Milestone 3.3.3 in [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)). Either bound
  requires `length_unit`; a declared `length_unit` must be `code_points` or
  `utf8_bytes`; `min_length <= max_length` when both are declared and independently
  valid (an invalid bound never produces a misleading `min_length <= max_length`
  issue).
- `character_constraints`/`starts_with`/`ends_with` each declare a non-empty allowed
  set, use only recognized character classes, and every literal is exactly one Unicode
  code point.
- `forbidden_prefixes`/`forbidden_suffixes` entries are non-empty.
- Every `PlacementConstraint`'s `statement` is non-empty; a declared `rule` (and its
  optional `condition`) has a canonical Resource Identity attribute `subject` and a
  valid `equals`/`present`/`absent` operator/value shape.
- Catalog registration: a registered key equals its definition's own `resource_type`,
  and no two entries share a `resource_type`.

Duplicate `classes`/`literals` entries and duplicate `forbidden_prefixes`/
`forbidden_suffixes` entries are **not** rejected: Specification v1.2 states a
duplicate code point has no effect on a character set's allowed union, and defines no
prohibition on duplicate reserved patterns; validation follows the Specification's own
normative text rather than inventing stricter catalog policy for aesthetic cleanliness.
`aws_*` -> `platform: "aws"` is likewise not inferred from `resource_type` syntax: no
Specification document defines that as a normative rule, so it is not encoded as one.

### What remains human/provider-evidence review

The validator never judges provider truth — whether AWS documentation is still
current, whether a fact's provenance is authoritative, whether `uniqueness_scope` is
factually correct, or whether a provider constraint was omitted entirely. Those remain
review concerns recorded in
[`docs/architecture/resource-definition-catalog-conformance.md`](resource-definition-catalog-conformance.md),
which this validator does not replace.

## Future evolution

- **Milestone 3.3 — Catalog Validation & Model Conformance** — complete; see
  [`docs/architecture/resource-definition-catalog-conformance.md`](resource-definition-catalog-conformance.md)
  for the full conformance review and the remaining IAM path and ACM relationship gaps.
- **Additional providers** — an `azure/` or `kubernetes/` directory, created only once a
  concrete task needs one.
- **Tree-shakeable subpaths** — once the catalog grows large enough that a consumer
  might want, for example, "AWS definitions only", a subpath export (for example,
  `@lksnext/iac-conventions-catalog/aws`) could be added without breaking the existing
  root export. Not implemented yet, since the current four-entry catalog does not
  justify it.

See [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md#milestones)
for the full milestone roadmap.
