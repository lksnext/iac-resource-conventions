# Resource Definition Catalog Conformance

This is a non-normative implementation document. It records Milestone 3.3's review of
every fact currently declared by the four `ResourceDefinition` entries in
[`packages/catalog/src/aws/`](../../packages/catalog/src/aws/), classifies the evidence
behind each one, and records the architecture and model findings that review produced.
It does not modify [`specification/`](../../specification/) and does not add AWS
coverage; see [`docs/architecture/resource-definition-catalog.md`](resource-definition-catalog.md)
for the catalog's package architecture and Milestone 3.2's original provenance summary,
which this document extends rather than repeats.

## Purpose

Milestone 3.2 established the catalog's first AWS slice. Milestone 3.3 validates it:
every catalog fact must be traceable to authoritative provider evidence, distinguished
from repository interpretation and from unsupported assumption, and the current
`ResourceDefinition` model must be checked against real provider semantics rather than
assumed sufficient. No `Unsupported` fact may remain in the catalog once this review is
complete (see [Evidence classification](#evidence-classification)).

## Evidence classification

- **Explicit** — the provider documentation directly states the modeled fact.
- **Derived** — the fact follows mechanically from authoritative provider
  identifiers/API semantics but is not stated verbatim.
- **Ambiguous** — provider documentation permits more than one interpretation.
- **Unsupported** — the current catalog fact cannot be justified by the reviewed
  provider documentation.

Concrete technical constraints (length, characters, uniqueness) are preferred as
**Explicit**; **Derived** facts are treated cautiously and their derivation chain is
recorded next to the fact, in the concrete definition's own source comment (see
[`docs/architecture/resource-definition-catalog.md#definition-provenance-and-modeling-findings`](resource-definition-catalog.md#definition-provenance-and-modeling-findings)).
Category and other repository-only groupings are not provider facts and are marked
**N/A (repository interpretation)** rather than forced into this vocabulary.

## Conformance matrix

### `aws_s3_bucket`

Scope note: every fact below applies to the **general purpose bucket** variant only —
see [S3 namespace finding](#s3-namespace-finding-and-resourcetype-boundary) below for why
this is now stated as a permanent scope of the `ResourceType`, not merely a citation
detail.

| Fact | Provider evidence | Model field | Confidence | Executable | Finding |
| --- | --- | --- | --- | --- | --- |
| Platform: AWS | n/a (repository classification) | `platform` | N/A | No (metadata only) | Correct, not a provider fact |
| Category: storage | n/a (repository classification) | `category` | N/A | No | See [Category policy](#category-policy) |
| Not global; regional | [Bucket naming rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html) — Region chosen at creation | `identity_constraints.global: false` | Explicit | No (globality not validated; see [Globality model](#globality-model-review)) | Correct |
| Unique within scope | Same source — "must be unique" | `identity_constraints.unique: true` | Explicit | No (uniqueness is External per [`convention-evaluation-executability.md`](convention-evaluation-executability.md)) | Correct |
| Uniqueness scope: partition | Same source — "unique across all AWS accounts in all the AWS Regions within a partition" | `identity_constraints.uniqueness_scope: "partition"` | Explicit, **for general purpose buckets only** | No | See [S3 namespace finding](#s3-namespace-finding-and-resourcetype-boundary) — P0 |
| min_length: 3, max_length: 63 | Same source — "between 3 (min) and 63 (max)" | `rendering_constraints.min_length`, `.max_length` | Explicit | Yes | Correct; both bounds use `length_unit: "code_points"` |
| length_unit: code_points | n/a — chosen because all valid characters are single-byte ASCII | `rendering_constraints.length_unit` | N/A (implementation representation, not a provider fact) | Yes | Correct; see [Length-unit policy](#length-unit-policy) |
| Allowed characters (lowercase letters, digits, `.`, `-`) | Same source, verbatim | `rendering_constraints.character_constraints`, `.starts_with`, `.ends_with` | Explicit | Yes | Structured ASCII classes/literals and boundary checks |
| Reserved prefixes/suffixes (`xn--`, `sthree-`, `-s3alias`, and others) | Same source | `rendering_constraints.forbidden_prefixes`, `.forbidden_suffixes` | Explicit | Yes | Explicitly documented patterns are executable; directory-bucket-only patterns remain out of scope |
| Reserved prefixes/suffixes (`xn--`, `sthree-`, `-s3alias`, and others) | Same source | `rendering_constraints.forbidden_prefixes`, `.forbidden_suffixes` | Explicit | Yes | Explicitly documented patterns are executable; directory-bucket-only patterns remain out of scope |
| Placement: regional, location chosen by deployment | Same source | `placement_constraints` | Explicit | No (Placement Constraint evaluation is out of scope for this milestone) | Correct; matches the Specification's own S3 illustrative example |

### `aws_iam_role`

| Fact | Provider evidence | Model field | Confidence | Executable | Finding |
| --- | --- | --- | --- | --- | --- |
| Platform: AWS | n/a | `platform` | N/A | No | Correct |
| Category: identity | n/a | `category` | N/A | No | See [Category policy](#category-policy) |
| Global | [IAM/STS endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/iam-service.html) — one partition-wide endpoint, account-wide (not per-Region) quotas | `identity_constraints.global: true` | Explicit — matches the Specification's precise `global` definition ("`location` is meaningful"), not merely "has a global endpoint" (see [Globality model](#globality-model-review)) | No | Correct, and now justified against the Specification's own precise wording, not by analogy |
| Unique within account, case-insensitive | [IAM/STS quotas](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html) — "must be unique within the account. They aren't distinguished by case." | `identity_constraints.unique: true`, `uniqueness_scope: "account"` | Explicit | No | Correct; case-insensitivity itself has no model field — P2, non-misleading |
| max_length: 64 | Same source — "Role name: 64 characters" | `rendering_constraints.max_length` | Explicit | Yes | Correct |
| length_unit: code_points | n/a — ASCII-only allowed characters | `rendering_constraints.length_unit` | N/A (implementation representation) | Yes | Correct |
| Allowed characters (alphanumeric plus `+ = , . @ _ -`) | Same source, verbatim | `rendering_constraints.character_constraints` | Explicit | Yes | Structured ASCII classes/literals; no regex semantics are introduced |
| `path` (512-char secondary identifier, distinct from role name) | Same source | *(no field)* | Explicit | No | Documented gap, not modeled — P1, see [Path and secondary-identifier gap](#path-and-secondary-identifier-gap) |
| Placement: global within account scope | Same source (derived) | `placement_constraints` | Derived (mechanical restatement of `global: true`) | No | Correct; matches the Specification's own IAM Role illustrative example |

### `aws_lambda_function`

| Fact | Provider evidence | Model field | Confidence | Executable | Finding |
| --- | --- | --- | --- | --- | --- |
| Platform: AWS | n/a | `platform` | N/A | No | Correct |
| Category: compute | n/a | `category` | N/A | No | See [Category policy](#category-policy) |
| Not global; regional | [Lambda quotas](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html) — "Quotas...apply per AWS Region" | `identity_constraints.global: false` | Explicit | No | Correct |
| Unique (duplicate creation rejected) | [CreateFunction](https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html) — `ResourceConflictException`: "The resource already exists" | `identity_constraints.unique: true` | Explicit | No | Correct |
| Uniqueness scope: account, region | No single AWS sentence states this exact scope | `identity_constraints.uniqueness_scope: "account, region"` | **Derived** — from the regional endpoint plus the account/Region segments embedded in `FunctionArn`, together with `ResourceConflictException` | No | Milestone 3.3 correction: reclassified from an unstated "assumed precise" scope to an explicitly labeled Derived one; value unchanged since it is the minimum statement the evidence supports (see [Lambda uniqueness finding](#lambda-uniqueness-finding)) |
| max_length: 64 (bare name) | Same source — "limited to 64 characters in length" | `rendering_constraints.max_length` | Explicit | Yes | Correct |
| length_unit: code_points | n/a — ASCII-only pattern | `rendering_constraints.length_unit` | N/A (implementation representation) | Yes | Correct |
| Allowed characters (letters, digits, `-`, `_`) | Same source — literal regex `[a-zA-Z0-9-_]+` for the bare-name segment | `rendering_constraints.character_constraints` | Explicit — and the only current entry backed by a literal AWS-published regex, not prose alone | Yes | Correct; represented without introducing regex semantics |
| Placement: regional, no conditional rule | Same source (regional endpoint) | `placement_constraints` | Explicit | No | Correct |

### `aws_acm_certificate`

| Fact | Provider evidence | Model field | Confidence | Executable | Finding |
| --- | --- | --- | --- | --- | --- |
| Platform: AWS | n/a | `platform` | N/A | No | Correct |
| Category: security | n/a | `category` | N/A | No | See [Category policy](#category-policy) |
| No user-supplied name | [RequestCertificate](https://docs.aws.amazon.com/acm/latest/APIReference/API_RequestCertificate.html) — only `DomainName`/`SubjectAlternativeNames` | *(no `rendering_constraints` at all)* | Explicit | No | Correct; first entry to omit the field entirely |
| No documented uniqueness/identity rule | Same source — no name parameter to be unique | *(no `identity_constraints` at all)* | Explicit (absence) | No | Correct — omission, not a guess |
| Regional, conditionally us-east-1 for CloudFront | [CloudFront HTTPS requirements](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html) | `placement_constraints` (two strings) | Explicit for each statement individually; **Ambiguous when read as two unconditional facts** rather than one conditional rule | No (Placement Constraint evaluation is out of scope) | Milestone 3.3 correction: reworded both strings to cross-reference each other so the conditional relationship reads unambiguously — see [ACM conditional-placement finding](#acm-conditional-placement-finding) |

No `Unsupported` fact was found in any of the four entries: every fact traces to an
authoritative source, an explicit absence, or a documented, non-misleading repository
representation choice (length unit, category).

## S3 namespace finding and ResourceType boundary

AWS's `CreateBucket` API can create either a **general purpose bucket** or a
**directory bucket** from the same operation, distinguished only by a creation-time
bucket-type configuration parameter — not by two different API operations. Directory
buckets have a materially different namespace (unique per Availability/Local Zone, not
per partition), a mandatory `--{{zone-id}}--x-s3` name suffix, a stricter character
grammar (no periods), and additional reserved prefixes/suffixes (see
[Directory bucket naming rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html)).
`aws_s3_bucket`'s current `uniqueness_scope: "partition"` is Explicit and correct **for
the general purpose variant**, but was not previously stated as a permanent boundary of
the `ResourceType` itself — only as an artifact of which source page Milestone 3.2 chose
to cite.

**Decision (Option A — narrow the meaning of the existing `ResourceType`).** Milestone
3.3 makes this scope explicit and permanent in `aws_s3_bucket`'s own source comment (see
[`packages/catalog/src/aws/s3-bucket.ts`](../../packages/catalog/src/aws/s3-bucket.ts)):
`aws_s3_bucket` means the general purpose bucket variant only, now and in the future. A
directory bucket, if ever cataloged, must receive its own `ResourceType` (for example,
`aws_s3_directory_bucket`) — never a conditional branch folded into this definition.
Options B (introduce distinct ResourceTypes now) and C (add configuration-dependent
constraints to `ResourceDefinition`) were considered and rejected for this milestone:
B is unnecessary work with no current consumer need (Milestone 3.3 does not expand
coverage), and C would require a Specification change this milestone's evidence does not
yet force, since Option A already removes the misleading ambiguity without one. This
decision was not made for Terraform naming compatibility; it follows directly from the
API-level evidence that bucket type is a real, provider-defined semantic boundary, not
an implementation detail.

## ResourceType semantic-boundary rule

**Principle:** a `ResourceType` should correspond to one stable set of technical
`ResourceDefinition` semantics. If two resources reachable through what a provider
exposes as "the same API type" can have meaningfully different namespace, uniqueness
scope, placement semantics, naming grammar, or rendering constraints **depending on a
creation-time configuration choice** (not merely on the dynamic values a caller
supplies), they must be modeled as **separate `ResourceType`s**, not as one
`ResourceDefinition` with conditional constraints — because
`ResourceRenderingConstraints`/`ResourceIdentityConstraints` have no concept of
"depending on configuration X" today (see [Conditional-constraint requirements
gap](#conditional-constraint-requirements-gap)). Two resources that only ever differ in
the *value* of a Resource Identity attribute (for example, two S3 buckets with different
names) remain the same `ResourceType`.

This criterion decided the S3 finding above, and should decide any future case where a
provider's own documentation, not repository intuition, demonstrates that a
configuration parameter changes namespace, uniqueness, placement, or grammar — the same
evidentiary standard used throughout this document.

## Lambda uniqueness finding

See the `aws_lambda_function` row above. The scope value (`"account, region"`) is
unchanged from Milestone 3.2, because it remains the minimum statement the evidence
supports; what changed is that it is now explicitly labeled **Derived**, with its
derivation chain (regional endpoint, `FunctionArn` structure, `ResourceConflictException`)
recorded in the source comment, rather than left implicit.

## IAM scope/globality finding

See the `aws_iam_role` row above. The existing `global: true` value is unchanged, but its
justification is now anchored to the Specification's own precise definition of `global`
("affecting whether `location` is meaningful") rather than to the existence of a global
IAM endpoint alone, per this milestone's explicit instruction not to rely on endpoint
existence as the sole justification.

## ACM conditional-placement finding

See the `aws_acm_certificate` row above. The two `placement_constraints` strings were
reworded (not restructured) so each one names the other: the general rule states its own
exception, and the exception states what it overrides. This reduces, without
eliminating, the risk that a reader treats "regional" and "must be us-east-1" as two
independent, simultaneously applicable facts. A structured conditional-constraint
grammar remains out of scope for this milestone (see [Conditional-constraint
requirements gap](#conditional-constraint-requirements-gap)).

## Category policy

`category` (`storage`, `identity`, `compute`, `security`) is useful, non-normative
catalog metadata: it groups resource types for a human reader browsing the catalog. It
is consistently applied (every current entry declares exactly one value) but is a plain
`string`, not a closed enum, because no current consumer filters or branches on it. A
closed `Category` type is not introduced in this milestone — only a real consumer
requirement (for example, a future CLI listing resources by category) would justify one;
adding it now would be speculative taxonomy completeness the task explicitly warns
against.

## Length-unit policy

Every `rendering_constraints.max_length` must be declared together with `length_unit` —
enforced by
[`test/runtime/catalog.test.mjs`](../../packages/catalog/test/runtime/catalog.test.mjs)'s
`"no catalog entry declares max_length without length_unit, or vice versa"` test, in
addition to the type-level invariant already expressed by `ResourceRenderingConstraints`'
discriminated union (see
[`resource-definition.ts`](../../packages/core/src/model/definitions/resource-definition.ts)).
Runtime coverage is kept because a discriminated union only prevents an *invalid
TypeScript literal* from being written; it does not prove every already-compiled catalog
entry actually respects the invariant, which is cheap to verify directly.

For all four current entries, every character AWS documents as valid is single-byte
ASCII, so `code_points` and `utf8_bytes` are numerically equivalent for any conforming
value. `code_points` is a **repository implementation choice** made because of that
equivalence, consistent with the Reference Evaluator's own default — it is not itself an
AWS-defined semantic. AWS defines an ASCII character grammar; it does not define
Unicode code-point counting. This distinction is recorded explicitly in each affected
definition's source comment (Milestone 3.3).

## min_length gap

Specification v1.2 closes this gap. S3 now declares `min_length: 3` and Lambda declares
`min_length: 1`, both sharing the existing `length_unit` with `max_length`; the Reference
Evaluator reports `min-length` failures without transforming generated names.

## Path and secondary-identifier gap

IAM's `path` (see the `aws_iam_role` row) is the concrete evidence for a broader gap:
`ResourceDefinition` has no concept of a secondary, independently-constrained identifier
component distinct from a resource's own rendered name. **Priority: P1** — needed before
any future IAM-like resource (for example, IAM users, IAM policies, which also have a
`path`) is cataloged, since folding `path` into the same `max_length` as the role name
would misrepresent AWS's own documented rule.

## Allowed-character model gap

`allowed_characters_description` remains a plain descriptive `string`, useful only as
human-readable documentation today (see
[`convention-evaluation-executability.md#allowed-characters`](convention-evaluation-executability.md#allowed-characters)).
A closed `ResourceNameCharacterSet` now provides executable ASCII classes and literals,
with separate begins-with/ends-with sets. The evaluator deliberately does not interpret
the descriptive field as a regular expression. This gap is **resolved for the structured
v1.2 fields**; regex-shaped provider rules remain out of scope.

## Reserved-pattern gap

S3 general purpose bucket reserved prefixes/suffixes (`xn--`, `sthree-`, `-s3alias`) are
now represented by exact, case-sensitive v1.2 fields and validated by the evaluator.
Directory-bucket-only patterns remain intentionally unrepresented because `aws_s3_bucket`
permanently covers general purpose buckets only. This gap is resolved for the current
catalog scope.

## Conditional-constraint requirements gap

Real evidence from this catalog motivates, but does not design, a future
conditional-constraint concept: ACM's CloudFront/`us-east-1` rule, and S3's
general-purpose-vs-directory-bucket namespace difference (see [S3 namespace
finding](#s3-namespace-finding-and-resourcetype-boundary)) both need a way to express
"this constraint applies only `when` some other condition holds." A future model would
need, at minimum: a condition (`when` a field/reference meets an operator/expected-value
test) paired with the constraint it gates. This schema is **not** defined here, per this
milestone's explicit scope limit — only the requirement is recorded. **Priority: P1.**

## Globality model review

`identity_constraints.global?: boolean` was tested against both `aws_s3_bucket`
(`false`) and `aws_iam_role` (`true`) and, for these two concrete cases, the boolean is
sufficient: the Specification's own definition of `global` — "affecting whether
`location` is meaningful" — is a genuinely binary question for both resources today
(S3: yes, location is meaningful; IAM: no, it is not). No current catalog entry needs a
third state (for example, "partition-global namespace but a regional resource," which
would describe S3's *uniqueness scope*, not its own `global` field — the two are already
correctly kept distinct in the model, as S3 demonstrates: `global: false` with
`uniqueness_scope: "partition"`). **No model gap is recorded for `global` itself** based
on current evidence; an enum is not introduced in this milestone.

## Uniqueness-scope vocabulary review

`uniqueness_scope` is a plain string across all entries (`"partition"`, `"account"`,
`"account, region"`). This raises unresolved questions for future Specification work,
recorded here without being answered:

- Is `"account, region"` one compound scope or two independent dimensions that should
  be expressed as a structured list?
- Should a scope value reference a canonical Resource Identity attribute (see
  [`resource-identity.md#canonical-attribute-references`](../../specification/resource-identity.md#canonical-attribute-references))
  instead of a free-form word, so `"account"` becomes, for example,
  `deployment.deployment_scope`?
- How should `"partition"` (a scope broader than any single Resource Identity attribute)
  be represented in such a vocabulary?
- Can uniqueness scope itself be configuration-dependent, the same way S3's namespace
  is (see [S3 namespace finding](#s3-namespace-finding-and-resourcetype-boundary))? If
  so, that reinforces treating it as a `ResourceType`-boundary concern, not a per-value
  one.
- Global uniqueness (partition-wide, account-wide) cannot be verified by the Reference
  Evaluator itself regardless of vocabulary — it remains an External concern per
  [`convention-evaluation-executability.md`](convention-evaluation-executability.md#uniqueness-and-collision-handling).

**Priority: P2** — the current free-string values are not misleading for any of the four
entries; a canonical structured vocabulary is valuable before broad catalog expansion,
not before it starts.

## Support status vocabulary

Three distinct, non-overlapping statuses describe what it means for a `ResourceType` to
be "supported" by this repository, without encoding any of them as runtime data yet:

- **Cataloged** — a `ResourceDefinition` exists in the catalog for this `ResourceType`.
  All four current entries meet this bar.
- **Naming-executable** — the Reference Evaluator can enforce every naming constraint
  the `ResourceDefinition` represents *executably* (today: `max_length`/`length_unit`
  only; see [`convention-evaluation-executability.md`](convention-evaluation-executability.md)).
  All four current entries are naming-executable for the facts they declare, but this
  is a narrower claim than "fully validated": `allowed_characters` and
  `placement_constraints` are never enforced, by design, regardless of this status.
- **Partially modeled** — real, evidenced provider facts exist that the current
  `ResourceDefinition` cannot represent or execute at all (for example, IAM's `path`,
  every entry's minimum length). All four current entries are Partially modeled by this
  definition, because every one has at least one documented gap above.

These statuses are documented vocabulary only in this milestone. Whether a future CLI
needs a machine-readable support-status field is recorded here as a **requirement for a
later milestone** (most naturally alongside CLI foundation work), not decided or
implemented now.

## Coverage reporting

This repository does not report AWS coverage as a percentage, because no fixed AWS
resource-type universe is defined to divide by. Coverage is reported only as an exact,
deterministic list:

```text
Initial AWS slice: 4 cataloged ResourceTypes
  aws_acm_certificate
  aws_iam_role
  aws_lambda_function
  aws_s3_bucket
```

This exact list is enforced by
[`test/runtime/catalog.test.mjs`](../../packages/catalog/test/runtime/catalog.test.mjs)'s
`"listResourceTypes returns exactly the expected catalog entries in lexical order"`
test — a missing or accidentally added registration fails the test suite, not merely a
documentation review. This repository does not describe this slice as "AWS supported".

## Provenance policy

Formalizing the policy Milestone 3.2 established in practice:

- Every provider fact in a concrete `ResourceDefinition` is cited via an authoritative
  provider documentation URL, recorded in that definition's own source file, next to
  the fact it supports — not in a separate provenance file or as a runtime field
  (`ResourceDefinition` has no provenance field; the Specification does not define
  provenance as domain data).
- When multiple facts in one definition come from the same source, the source is cited
  once, near the top of the file's doc comment, and each finding references it rather
  than repeating the URL.
- Provenance comments are reviewed for accuracy whenever the `ResourceDefinition` they
  document is modified (see [Freshness policy](#freshness-policy)) — not on any other
  schedule.
- A retrieval note ("retrieved for Milestone N.M") is useful context for a reviewer
  judging whether a cited fact might be stale, and is kept in the existing comments; it
  is prose, not a runtime timestamp.

## Freshness policy

Provider documentation changes over time; this repository does not attempt to track
that automatically:

- Catalog facts are reviewed only when the `ResourceDefinition` that declares them is
  modified for an unrelated reason (a new milestone, a bug report, or a related
  addition) — not on a schedule, and not by automated provider scraping.
- No promise is made that a static `ResourceDefinition` "self-updates"; a provider
  documentation change that invalidates a cataloged fact requires a new catalog release
  to correct it, the same way any other software defect does.
- "Retrieved for Milestone N.M" comments (see [Provenance policy](#provenance-policy))
  are useful, low-cost freshness signals for a future reviewer. No runtime `last
  reviewed` timestamp is introduced, because the catalog's own determinism requirement
  (the same `ResourceType` must always resolve to the same `ResourceDefinition` value)
  would be undermined by embedding a value that changes independently of the resource's
  actual technical facts.

## Specification v1.2 recommendation

The evidence gathered in this milestone — independently, across all four current
entries — supports recommending a future **Specification v1.2 — Executable Resource
Constraints** evolution. This is a recommendation only; it is not implemented here, and
no `specification/` file is changed by this milestone.

Proposed scope, prioritized by the evidence above rather than included wholesale:

1. `ResourceRenderingConstraints.min_length` (P1 — evidenced by S3 and Lambda).
2. A concept for a secondary, independently-constrained identifier component (P1 —
   evidenced by IAM's `path`).
3. A structured conditional-constraint mechanism for both Placement Constraints and
   rendering/identity constraints (P1 — evidenced by ACM/CloudFront and the S3
   general-purpose/directory-bucket boundary).
4. An executable allowed-character/pattern representation (P1 — evidenced most
   strongly by Lambda's literal regex).
5. A canonical, structured `uniqueness_scope` vocabulary (P2 — no current entry is
   misleading, but ambiguity was identified).
6. Reserved-prefix/suffix representation (P2 — evidenced by S3, not currently
   misleading).

Structured Placement Constraints and richer globality semantics are **not** included in
this proposed scope on their own: this milestone found no evidence that `global`'s
current boolean is insufficient (see [Globality model review](#globality-model-review)),
and Placement Constraint evaluation itself remains explicitly out of scope for the
Reference Evaluator regardless of schema richness.

## Recommended next action

**Recommendation: (B) Create Specification v1.2 — Executable Resource Constraints.**

Expanding AWS coverage further (Option A) would only catalog more resources that
immediately hit the same four gaps this milestone already found in 100% of the current
slice (min_length, path/secondary-identifier, conditional constraints, executable
character grammar) — it would not produce new evidence, only repeat the existing
findings at a larger scale. A first Azure slice (Option C) or CLI foundation (Option D)
would each be reasonable future steps, but neither is motivated by unresolved findings
from this milestone the way closing the four P1 gaps above is. This recommendation is
not implemented in this task; it is the evidence-based conclusion this milestone was
scoped to produce.

## IMPLEMENTATION.md roadmap

Milestone 3.3 — Catalog Validation & Model Conformance is recorded as complete in
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md#milestones) once every fact above has been
classified, every `Unsupported` fact (none were found) is corrected or removed, catalog
integrity tests pass, the support vocabulary above is documented, model gaps are
prioritized, and exactly one next action is recommended — all of which this document
records. Milestone 3.4 — Additional Providers is **not** activated by this milestone;
per this milestone's own recommendation, evolving the Specification (a future milestone,
not numbered here) is the suggested next step instead.

## Specification v1.2 resolution

[Specification v1.2: Executable Resource Constraints](../../specification/README.md#specification-v12-executable-resource-constraints)
acted on [Specification v1.2 recommendation](#specification-v12-recommendation) above.
This section cross-references which of that recommendation's six proposed items were
resolved normatively, and which remain open — it appends to this document's findings
without rewriting them.

| # | Proposed item | Resolution |
| --- | --- | --- |
| 1 | `min_length` (P1) | **Resolved.** [`resource-definition.md#minimum-length`](../../specification/resource-definition.md#minimum-length) defines it normatively, sharing `length_unit` with `max_length`. |
| 2 | Secondary, independently-constrained identifier component (P1 — IAM `path`) | **Not resolved; deferred deliberately.** [`resource-definition.md#iam-path-design-gate-non-normative`](../../specification/resource-definition.md#iam-path-design-gate-non-normative) re-examined the [Path and secondary-identifier gap](#path-and-secondary-identifier-gap) using this version's own evidence-driven design questions and concluded IAM's `path` is a provider configuration property, not a Resource Definition domain-boundary need; only one resource demonstrates it. |
| 3 | Structured conditional-constraint mechanism (P1 — ACM/CloudFront, S3 variant boundary) | **Partially resolved, in two different ways.** The S3 general-purpose/directory-bucket boundary is resolved by formalizing the [ResourceType semantic-boundary rule](#resourcetype-semantic-boundary-rule) as [`resource-definition.md#resourcetype-semantic-variants-specification-v12`](../../specification/resource-definition.md#resourcetype-semantic-variants-specification-v12) — distinct `ResourceType`s, not a conditional constraint. The ACM/CloudFront case is resolved only as far as a structured Placement Constraint shape can be defined from existing canonical inputs; the condition itself remains explicitly non-executable — see [`resource-definition.md#the-conditional-input-problem`](../../specification/resource-definition.md#the-conditional-input-problem), which reports this as a stated blocker rather than a partial implementation. |
| 4 | Executable allowed-character/pattern representation (P1 — Lambda's regex) | **Resolved, without adopting regex.** [`resource-definition.md#character-constraints`](../../specification/resource-definition.md#character-constraints) defines a structured, closed character-class-and-literal model; [`resource-definition.md#regex-decision`](../../specification/resource-definition.md#regex-decision) documents why Lambda's own published regex reduces to this model without loss, and why regex itself is not adopted normatively. |
| 5 | Canonical `uniqueness_scope` vocabulary (P2) | **Not resolved; deliberately unchanged.** [`resource-definition.md#unchanged-by-specification-v12`](../../specification/resource-definition.md#unchanged-by-specification-v12) confirms `uniqueness_scope` remains a free-form `string` — no new evidence beyond the ambiguity already noted in [Uniqueness-scope vocabulary review](#uniqueness-scope-vocabulary-review) justified a redesign. |
| 6 | Reserved-prefix/suffix representation (P2) | **Resolved.** [`resource-definition.md#reserved-prefixes-and-suffixes`](../../specification/resource-definition.md#reserved-prefixes-and-suffixes) defines exact-match `forbidden_prefixes`/`forbidden_suffixes`; IPv4-resembling names and adjacency restrictions (for example, adjacent periods) remain explicitly deferred as a separate, still-open item (see [`resource-definition.md#deferred-reserved-pattern-rules`](../../specification/resource-definition.md#deferred-reserved-pattern-rules)). |

Specification v1.2 changed only `specification/resource-definition.md`,
`specification/resource-identity.md` (a small clarification), and
`specification/convention-result.md` (the additive `code` field). No catalog TypeScript
file under `packages/catalog/src/aws/` changed — the [Catalog impact
plan](../../specification/resource-definition.md#catalog-impact-plan-non-normative) in
`resource-definition.md` documents how each entry would map, as input for a later,
separate implementation increment. This milestone's own conformance findings above
remain unchanged historical record.
