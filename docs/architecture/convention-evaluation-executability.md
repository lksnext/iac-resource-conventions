# Convention Evaluation Executability

## Purpose

Implementing the Reference Evaluator's Context Resolution stage (increments 2.2–2.3),
Resource Projection (increment 2.5), and Convention Evaluation Rules (increment 2.6)
exposed a distinction that Specification v1.0 does not itself make explicit: the
difference between

- concepts **described** by Specification v1.0, and
- concepts Specification v1.0 defines **precisely enough for deterministic execution**.

Many Convention Evaluation responsibilities — naming rendering, abbreviation
application, metadata projection, and others — are named and motivated in prose
throughout `specification/`, but their operational semantics (a separator value, a
casing rule, an abbreviation-matching algorithm, a metadata key mapping) are not yet
defined anywhere. Milestone 2.6 could therefore implement only one Convention
Evaluation rule — required-attribute completeness — without inventing semantics the
Specification does not supply.

The purpose of this document is to identify those boundaries precisely, capability by
capability, with repository evidence for every claim, and to provide the evidence base
for a possible future Specification revision. It does not decide that revision.

> This document is non-normative. The Specification remains the source of truth.

Nothing in this document modifies, reinterprets, or overrides any file under
[`specification/`](../../specification/). Where this document says a concept is not yet
executable, that is a statement about the current implementation boundary, not a
criticism of the Specification: [`specification/README.md#specification-status`](../../specification/README.md#specification-status)
already anticipated that "frozen" v1.0 would evolve only "when real implementation
experience demonstrates that the current model is insufficient" — this document was
that implementation experience, and it directly motivated
[Specification v1.1: Executable Naming](../../specification/README.md#specification-v11-executable-naming),
which normatively defines separator, casing, and abbreviation semantics (see the
updated rows below).

> **Status update:** this document's original analysis (below) reflects the point in
> time before implementation increment 2.6.2. Naming rule execution — separator,
> casing, abbreviation application, component ordering, optional-component omission,
> and generated name output — has since been implemented by **2.6.2 — Executable
> Naming Rules**, and increment **2.6.3 — Executable Naming Conformance** added
> rejection of a `naming_component_order` with a duplicated canonical attribute
> reference and corrected the Specification's casing wording to match the existing
> implementation's Unicode Default Case Conversion semantics (see
> [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md) for current milestone status). The
> capability tables below already reflect this — every row this document originally
> analyzed as blocked purely on missing Specification semantics (separator, casing,
> abbreviations, component ordering, generated name output) is now marked
> **Executable**; only the narrative sections further below, written before 2.6.2,
> still describe the pre-implementation gap analysis and are retained as historical
> record.

## Executability classification

| Classification | Meaning |
| --- | --- |
| **Executable** | The Specification and current domain model define enough information for deterministic implementation without inventing semantics. Demonstrated by working, tested evaluator code. |
| **Modelled but not executable** | A domain model contract represents the concept's shape, but its operational semantics (algorithm, grammar, matching rule) are not sufficiently defined to execute deterministically. |
| **Conceptual only** | The Specification describes the capability in prose, but no executable contract represents it at all, or the contract that exists carries no operational content. |
| **External** | Correct evaluation requires information the deterministic core evaluator cannot itself obtain (for example, a live uniqueness registry). |
| **Deferred** | The concept is intentionally postponed to a future Specification or implementation milestone, and is already documented as such in an architecture decision. |

Only these five classifications are used below; every one is needed by at least one row
of the matrix.

## Primary executability matrix

Legend for **Domain model**: cites the public TypeScript contract, if any (see
[`docs/architecture/executable-domain-model-traceability.md`](executable-domain-model-traceability.md)
for the full Specification-to-contract mapping). Legend for **Evaluator**: cites the
implementation file and whether runtime tests exist. "—" means no code exists.

### Context and identity

| Capability | Specification source | Domain model | Evaluator | Status | Missing executable semantics | Likely owner |
| --- | --- | --- | --- | --- | --- | --- |
| Context Resolution (overall) | [context-resolution.md](../../specification/context-resolution.md) | `ContextResolutionInput`/`ContextResolutionResult` ([contracts/](../../packages/core/src/evaluator/contracts/)) | `resolveResourceIdentity`, `resolveGovernanceContext` ([context-resolution/](../../packages/core/src/evaluator/context-resolution/)); tested in [context-resolution.test.mjs](../../packages/core/test/runtime/context-resolution.test.mjs), [governance-resolution.test.mjs](../../packages/core/test/runtime/governance-resolution.test.mjs) | Executable | None for the two implemented resolution sources (see two rows below for the ones that are not) | — |
| Resource Identity resolution | [resource-identity.md](../../specification/resource-identity.md) | `ResourceIdentity` (Implemented, per traceability matrix) | `resolveResourceIdentity` | Executable | None | — |
| Governance Context resolution | [governance-context.md](../../specification/governance-context.md) | `GovernanceContext` (Implemented) | `resolveGovernanceContext` | Executable | Two named resolution sources unimplemented — see "Governance Profile defaults" row below | — |
| Required attributes | [convention-pack.md#required-attributes](../../specification/convention-pack.md#required-attributes) | `ConventionPack.required_attributes` | `resolveAttribute` (Context Resolution); `evaluateConvention` (Convention Evaluation, [evaluate-convention.ts](../../packages/core/src/evaluator/convention-evaluation/evaluate-convention.ts)) | Executable | None | — |
| Protected attributes | [context-resolution.md#precedence-authority-and-protection](../../specification/context-resolution.md#precedence-authority-and-protection), [convention-pack.md#override-policy](../../specification/convention-pack.md#override-policy) | `ConventionPack.override_policy.protected_attributes` | `resolveAttribute`; tested (`protection: …` tests in both resolution test files) | Executable | None | — |
| Context authority rules | [convention-pack.md#context-authority-rules](../../specification/convention-pack.md#context-authority-rules) | `ConventionPack.context_authority_rules` | `resolveAttribute` | Executable | None | — |
| Explicit overrides | [naming-request.md#explicit-overrides](../../specification/naming-request.md#explicit-overrides) | `NamingRequestOverrides` | `resolveAttribute`, `resolveResourceIdentity`, `resolveGovernanceContext`; tested | Executable | None for resolution. Validating an override against Resource Definition constraints during Convention Evaluation is blocked on the same gaps as "technical constraints" below | Reference Evaluator (for the deferred validation half) |
| Governance Profile defaults | [context-resolution.md#resolution-sources](../../specification/context-resolution.md#resolution-sources) | `GovernanceProfileId` only (`common/identifiers.ts`); no defaults-bearing type | — | Conceptual only | `GovernanceProfileId` is a bare string identifier; no type represents a Governance Profile's own default values, and no evaluator input carries them (see [Governance Profile gap](#governance-profile-gap)) | Unknown / decision required |

### Naming

| Capability | Specification source | Domain model | Evaluator | Status | Missing executable semantics | Likely owner |
| --- | --- | --- | --- | --- | --- | --- |
| Naming component selection | [convention-pack.md#naming-projections](../../specification/convention-pack.md#naming-projections) | `ConventionPack.naming_component_order` | `projectResource` ([project-resource.ts](../../packages/core/src/evaluator/resource-projection/project-resource.ts)); tested in [resource-projection.test.mjs](../../packages/core/test/runtime/resource-projection.test.mjs) | Executable | None for selection itself; the attribute vocabulary it resolves against is hard-coded (see [Naming component ordering](#naming-component-ordering) and [Hard-coded canonical attribute vocabulary](#hard-coded-canonical-attribute-vocabulary)) | — |
| Component ordering | [convention-pack.md#naming-projections](../../specification/convention-pack.md#naming-projections) | `ConventionPack.naming_component_order` (`ReadonlyArray<string>`) | `projectResource` | Executable | None | — |
| Canonical Resource Identity attribute vocabulary | [resource-identity.md#canonical-attribute-references](../../specification/resource-identity.md#canonical-attribute-references) | `CanonicalResourceIdentityAttribute` | `resolveCanonicalResourceIdentityAttribute`, `planeOfCanonicalResourceIdentityAttribute` ([canonical-resource-identity-attribute.ts](../../packages/core/src/evaluator/resource-projection/canonical-resource-identity-attribute.ts)) | Executable | None | — |
| Optional component omission | [convention-pack.md#naming-projections](../../specification/convention-pack.md#naming-projections) ("which components may be omitted") | `ProjectedNamingComponent.required` | `projectResource`; tested | Executable | None | — |
| Literal (fixed-text) components | *(not named anywhere in the Specification)* | — | — | Conceptual only | The Specification's naming-projection prose never mentions a fixed-text component distinct from an attribute-derived one; there is nothing to make executable yet | Specification |
| Separator | [convention-pack.md#separator](../../specification/convention-pack.md#separator) | `ConventionPack.separator` | `evaluateName` ([evaluate-name.ts](../../packages/core/src/evaluator/convention-evaluation/naming/evaluate-name.ts)) | Executable | Defaults to the empty string; inserted verbatim only between present components | — |
| Casing | [convention-pack.md#casing](../../specification/convention-pack.md#casing) | `ConventionPack.casing` / `NamingCasing` | `applyCasing` ([apply-casing.ts](../../packages/core/src/evaluator/convention-evaluation/naming/apply-casing.ts)) | Executable | Closed `preserve` / `lower` / `upper` vocabulary; applied after abbreviation | — |
| Normalization (Convention Pack rule) | [convention-pack.md#responsibilities](../../specification/convention-pack.md#responsibilities) ("Normalization rules") | Not modelled (see `ConventionPack`'s own doc comment) | — | Conceptual only | No operations, order, Unicode handling, or interaction with casing/abbreviation/truncation is defined | Specification |
| Normalization (Resource Definition rule) | [resource-definition.md#rendering-constraints](../../specification/resource-definition.md#responsibilities) | `ResourceRenderingConstraints.normalization: string` | — | Modelled but not executable | Free text ("for example, lower-casing, character substitution, or truncation rules"), not a machine-executable instruction set | Specification |
| Allowed characters | [resource-definition.md#rendering-constraints](../../specification/resource-definition.md#responsibilities) | `ResourceRenderingConstraints.allowed_characters: string` | — | Modelled but not executable | Free text, not a defined grammar or regular expression; a string must not be assumed to be a regex | Specification |
| Abbreviations | [convention-pack.md#abbreviations](../../specification/convention-pack.md#abbreviations) | `ConventionPack.abbreviations` (nested mapping keyed by canonical Resource Identity attribute reference and exact resolved value) | `applyAbbreviation` ([apply-abbreviation.ts](../../packages/core/src/evaluator/convention-evaluation/naming/apply-abbreviation.ts)) | Executable | Exact match only; missing mapping preserves the original value; applied before casing | — |
| Generated name output | [convention-result.md#convention-outputs](../../specification/convention-result.md#convention-outputs) | `ConventionOutputs.name` | `evaluateName` ([evaluate-name.ts](../../packages/core/src/evaluator/convention-evaluation/naming/evaluate-name.ts)) | Executable | Populated only when naming components exist and all required naming components resolve | — |
| Prefixes | *(not named anywhere in the Specification)* | — | — | Conceptual only | Not mentioned in `convention-pack.md#naming-projections` or elsewhere | Specification |
| Suffixes | *(not named anywhere in the Specification)* | — | — | Conceptual only | Same as prefixes | Specification |
| Component length | *(not named anywhere in the Specification)* | — | — | Conceptual only | Only total-name length is named (via Resource Definition); no per-component length concept exists | Specification |
| Total-name length | [resource-definition.md#rendering-constraints](../../specification/resource-definition.md#responsibilities) | `ResourceRenderingConstraints.max_length: number` | — | Modelled but not executable | The numeric constraint itself is precise and would be trivially executable as validation once a rendered name exists; Specification v1.1 now defines how that name is produced, but the Specification still does not define the length unit for cross-language determinism, so this validation remains deferred (see [Length and truncation](#length-and-truncation)) | Reference Evaluator (deferred) |
| Truncation | [resource-definition.md#rendering-constraints](../../specification/resource-definition.md#responsibilities) (implied by "truncation rules" example under normalization) | — | — | Conceptual only | Whether truncation is permitted, what is truncated, priority between components, direction, preservation requirements, and warning behavior are all undefined; a `max_length` constraint is not permission to truncate | Specification |
| Deterministic hashing | *(not named in `specification/`; named only as deferred behavior in [executable-domain-model-traceability.md#deferred-behavior](executable-domain-model-traceability.md#deferred-behavior))* | — | — | Conceptual only | No trigger, source material, algorithm, encoding, output length, placement, separator, or collision semantics is defined anywhere, including in the Specification itself | Specification |
| Collision handling | [resource-definition.md#identity-constraints](../../specification/resource-definition.md#responsibilities) | `ResourceIdentityConstraints.unique`, `.uniqueness_scope` | — | External | Local determinism (same input → same name) is already guaranteed by Context Resolution and Resource Projection; proving global uniqueness needs a live registry the evaluator must not consult (see [Uniqueness and collision handling](#uniqueness-and-collision-handling)) | External system |
| Uniqueness (local determinism) | [context-resolution.md#deterministic-behaviour](../../specification/context-resolution.md#deterministic-behaviour) | — | `resolveResourceIdentity`/`resolveGovernanceContext`/`projectResource`; tested (`determinism: …` tests) | Executable | None | — |
| Uniqueness (global guarantee) | [resource-definition.md#identity-constraints](../../specification/resource-definition.md#responsibilities) | `ResourceIdentityConstraints` | — | External | Requires an external resource registry | External system |

### Metadata

| Capability | Specification source | Domain model | Evaluator | Status | Missing executable semantics | Likely owner |
| --- | --- | --- | --- | --- | --- | --- |
| Metadata projection (overall) | [convention-pack.md#metadata-projections](../../specification/convention-pack.md#metadata-projections) | Not modelled (no field on `ConventionPack`) | — | Conceptual only | "This document does not define concrete key mappings or value formats" — no source-attribute-to-target-key mapping exists at all | Specification |
| Tags | [convention-result.md#convention-outputs](../../specification/convention-result.md#convention-outputs) | `ConventionMetadata.tags: Readonly<Record<string,string>>` | — | Conceptual only | Shape only; no mapping rule populates it | Specification |
| Labels | [convention-result.md#convention-outputs](../../specification/convention-result.md#convention-outputs) | `ConventionMetadata.labels` | — | Conceptual only | Same as Tags | Specification |
| Annotations | [convention-result.md#convention-outputs](../../specification/convention-result.md#convention-outputs) | `ConventionMetadata.annotations` | — | Conceptual only | Same as Tags | Specification |
| Resource Identity → metadata | [convention-pack.md#metadata-projections](../../specification/convention-pack.md#metadata-projections) | — | — | Conceptual only | No mapping from identity attributes to metadata keys is defined | Specification |
| Governance Context → metadata | [governance-context.md#metadata-projection](../../specification/governance-context.md#metadata-projection) | — | — | Conceptual only | "This document does not define the implementation details of these projections; that concern belongs to adapters" | Specification / Adapter |

### Resource validation

| Capability | Specification source | Domain model | Evaluator | Status | Missing executable semantics | Likely owner |
| --- | --- | --- | --- | --- | --- | --- |
| Technical constraints (`max_length`) | [resource-definition.md#rendering-constraints](../../specification/resource-definition.md#responsibilities) | `ResourceRenderingConstraints.max_length` | — | Modelled but not executable | Blocked transitively on naming rendering (see Naming table above) | Reference Evaluator |
| Technical constraints (`allowed_characters`) | [resource-definition.md#rendering-constraints](../../specification/resource-definition.md#responsibilities) | `ResourceRenderingConstraints.allowed_characters` | — | Modelled but not executable | Free text, no grammar | Specification |
| Normalization constraints | [resource-definition.md#rendering-constraints](../../specification/resource-definition.md#responsibilities) | `ResourceRenderingConstraints.normalization` | — | Modelled but not executable | Free text | Specification |
| Placement Constraints | [resource-definition.md#placement-constraints](../../specification/resource-definition.md#placement-constraints) | `ResourceDefinition.placement_constraints: ReadonlyArray<string>` | — | Modelled but not executable | Free-form prose; [resource-definition.md#out-of-scope-for-this-document](../../specification/resource-definition.md#out-of-scope-for-this-document) explicitly defers "a formal schema or grammar for expressing Placement Constraints" | Specification |
| Resource-specific constraints (general) | [resource-definition.md](../../specification/resource-definition.md) | `ResourceDefinition` (Partially implemented, per traceability matrix) | — | Modelled but not executable | See the three rows above | Specification |
| Uniqueness constraints | [resource-definition.md#identity-constraints](../../specification/resource-definition.md#responsibilities) | `ResourceIdentityConstraints` | — | External (global) / Executable (local determinism only) | See "Uniqueness and collision handling" above | External system |

### Result semantics

| Capability | Specification source | Domain model | Evaluator | Status | Missing executable semantics | Likely owner |
| --- | --- | --- | --- | --- | --- | --- |
| Convention Outputs (shape) | [convention-result.md#convention-outputs](../../specification/convention-result.md#convention-outputs) | `ConventionOutputs` (Implemented, per traceability matrix) | `evaluateConvention` always returns `outputs: {}` | Modelled but not executable | The contract exists and is exercised, but nothing currently populates `name` or `metadata` (see Naming and Metadata tables above) | Reference Evaluator |
| Validation — required-attribute completeness | [convention-pack.md#required-attributes](../../specification/convention-pack.md#required-attributes) | `ConventionValidation`, `ConventionValidationFailure` | `evaluateConvention`; tested in [convention-evaluation.test.mjs](../../packages/core/test/runtime/convention-evaluation.test.mjs) | Executable | None | — |
| Validation — technical/normalization/placement/uniqueness constraints | [convention-result.md#conceptual-contents](../../specification/convention-result.md#conceptual-contents) | `ConventionValidation` | — | Modelled but not executable / External | See Resource validation table above | Specification / External system |
| Explanation | [convention-result.md#conceptual-contents](../../specification/convention-result.md#conceptual-contents) | `ConventionResult.explanation?: string` | `evaluateConvention` produces a deterministic string; tested | Executable, with a caveat | The Specification requires only "a human-readable account"; exact content/structure is implementation-defined and must not be treated as a stable compatibility surface (see [Explanation](#explanation)) | — |
| Warnings | [convention-result.md#conceptual-contents](../../specification/convention-result.md#conceptual-contents) | `ConventionResult.warnings?: ReadonlyArray<ConventionWarning>` | Never populated by `evaluateConvention` | Conceptual only | No warning taxonomy, stable codes, or trigger rules are defined; only illustrative examples ("a value that had to be truncated or normalized") | Specification |
| Diagnostics / trace propagation | [context-resolution.md](../../specification/context-resolution.md), [convention-result.md#conceptual-contents](../../specification/convention-result.md#conceptual-contents) | `ContextResolutionDiagnostic` (evaluator-internal, not a domain model contract) | Produced by `resolveResourceIdentity`/`resolveGovernanceContext`, but **not** carried by `ContextResolutionResult`; `evaluateConvention` recomputes required-attribute completeness independently | Deferred | See [Diagnostics propagation](#diagnostics-propagation) | Reference Evaluator |

A capability is never marked **Executable** merely because a TypeScript field exists for
it (for example, `ConventionPack.abbreviations` and `ResourceDefinition.placement_constraints`
both have fields, but neither has executable semantics).

## Required-attribute baseline

`required_attributes` is the concrete example of what "Executable" means in this
document, and the only Convention Evaluation rule Milestone 2.6 implements:

- **Normatively defined** — [`convention-pack.md#required-attributes`](../../specification/convention-pack.md#required-attributes):
  "which Resource Identity and Governance Context attributes must be available before
  Convention Evaluation can proceed."
- **Represented in the domain model** — `ConventionPack.required_attributes?:
  ReadonlyArray<string>` ([convention-pack.ts](../../packages/core/src/model/conventions/convention-pack.ts)).
- **Executable** — resolved independently at two pipeline points: as a Context
  Resolution diagnostic (`unresolved-required-attribute`, see
  [diagnostics.ts](../../packages/core/src/evaluator/context-resolution/diagnostics.ts))
  and, again, as a Convention Evaluation validation failure (`evaluateConvention`, see
  [evaluate-convention.ts](../../packages/core/src/evaluator/convention-evaluation/evaluate-convention.ts)).
- **Tested** — [context-resolution.test.mjs](../../packages/core/test/runtime/context-resolution.test.mjs),
  [governance-resolution.test.mjs](../../packages/core/test/runtime/governance-resolution.test.mjs),
  and [convention-evaluation.test.mjs](../../packages/core/test/runtime/convention-evaluation.test.mjs)
  all cover it directly.

No other capability in the matrix above is assumed to share this status merely by
analogy; each was independently verified against the Specification and code.

## Naming component ordering

`naming_component_order` (dotted attribute paths, for example `organizational.system`)
is sufficiently formalized for the ordering and inclusion/omission behavior itself —
`projectResource` implements and tests it deterministically. However, the **vocabulary**
of valid dotted attribute paths is not formalized anywhere in the Specification: it is
only ever demonstrated through prose examples (`organizational.system`,
`deployment.environment`, `functional.resource_type` in
[convention-pack.md#required-attributes](../../specification/convention-pack.md#required-attributes)
and [resource-identity.md](../../specification/resource-identity.md)'s attribute lists).
No JSON Schema or Specification document enumerates the closed set of valid dotted
paths, or defines the dotted-path naming convention itself as a normative grammar.

To make the ordering executable today, `projectResource` maintains its own hard-coded
`COMPONENT_ACCESSORS` table ([project-resource.ts](../../packages/core/src/evaluator/resource-projection/project-resource.ts))
enumerating the twelve Resource Identity attribute paths it recognizes; an
unrecognized path is silently omitted regardless of whether it is declared required.
This is a genuine, working solution for the vocabulary the Specification currently uses
in its own examples, but it is not derived from a reusable, Specification-defined
canonical attribute reference — see [Hard-coded canonical attribute
vocabulary](#hard-coded-canonical-attribute-vocabulary) for the duplication this
causes.

The gap belongs primarily to the **Specification** (no canonical attribute-reference
vocabulary is defined) and secondarily to the **Executable Domain Model** (no reusable
type centralizes the vocabulary the evaluator needs); it does not belong to Resource
Definition or Convention Pack, since both already use the same dotted-path convention
without defining it themselves.

## Separator semantics

Specification v1.0 defines none of the following:

- separator value (no default is named anywhere, and none should be assumed — not even `-`);
- separator ownership (Convention Pack? Resource Definition? Platform Convention?);
- separator placement rules;
- repeated-separator behavior;
- leading/trailing separator behavior;
- interaction with an omitted optional component (does omission leave a double
  separator, or does the renderer close the gap?).

[`convention-pack.md#naming-projections`](../../specification/convention-pack.md#naming-projections)
only said separators were "used"; it stated "this document does not define any concrete
naming syntax." [`convention-packs/aws-workload-default.md`](../../specification/convention-packs/aws-workload-default.md),
the one concrete Convention Pack example, stated directly: "This document does not yet
define separators, abbreviations, or casing rules for this ordering; those are left for
a later iteration." Separator rendering was therefore classified **Conceptual only**,
not **Modelled but not executable** — no contract represented a separator at all.

**Update (Specification v1.1):** every gap above is now closed normatively. See
[convention-pack.md#separator](../../specification/convention-pack.md#separator) for the
value, default (empty string), ownership (Convention Pack), placement, and
omitted-component interaction rules, and
[convention-pack.md#naming-rule-examples](../../specification/convention-pack.md#naming-rule-examples)
for worked examples. At the time this section was written, this was documentation only;
it has since been implemented by `evaluateName` (see
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)'s 2.6.2 entry), and the Separator row in
the [Naming](#naming) table above is classified **Executable** accordingly.

## Casing semantics

Casing was named in prose ("what casing style is used",
[convention-pack.md#naming-projections](../../specification/convention-pack.md#naming-projections))
but was not represented as data anywhere, was not executable, and was only ever implied
by non-normative examples elsewhere in the Specification (none of which were marked
normative). No behavior was derived from those examples in this document.

**Update (Specification v1.1):** a closed `preserve` / `lower` / `upper` vocabulary is
now defined normatively, with `preserve` as the default and an explicit execution order
relative to abbreviation — see
[convention-pack.md#casing](../../specification/convention-pack.md#casing). At the time
this section was written, this was documentation only; it has since been implemented by
`applyCasing` (see [`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)'s 2.6.2 entry), and the
Casing row in the [Naming](#naming) table above is classified **Executable**
accordingly. Increment **2.6.3 — Executable Naming Conformance** additionally corrected
this section's Specification citation itself: `casing: lower`/`upper` are defined in
terms of the Unicode Default Case Conversion algorithm, not the strictly one-to-one
"Unicode simple case mapping" an earlier draft of `convention-pack.md#casing`
described — a documented, evidence-based correction (ECMA-262, Unicode.org), not an
implementation change, since `applyCasing`'s `toLowerCase()`/`toUpperCase()` calls
already conformed to Default Case Conversion.

## Normalization

Normalization appears in two distinct places, both non-executable today:

1. **Convention Pack "Normalization rules"** (see
   [convention-pack.md#responsibilities](../../specification/convention-pack.md#responsibilities))
   — not represented by any field on `ConventionPack` at all; the contract's own doc
   comment states this was deliberately deferred.
2. **Resource Definition rendering constraint** (`ResourceRenderingConstraints.normalization: string`,
   [resource-definition.ts](../../packages/core/src/model/definitions/resource-definition.ts)) —
   modelled as a free-text string ("for example, lower-casing, character substitution,
   or truncation rules"). Free-form prose is not interpreted as executable instructions
   in this document; operation order, Unicode handling, invalid-character behavior, and
   interaction with casing, abbreviations, and truncation are all undefined.

## Allowed characters

`ResourceRenderingConstraints.allowed_characters` is a plain `string`
([resource-definition.ts](../../packages/core/src/model/definitions/resource-definition.ts)),
documented as "described as free text." This is a human-readable description, not an
executable pattern or constraint: the Specification never states that this string is a
regular expression, character class, or any other machine-parseable grammar, so none is
assumed. Classified **Modelled but not executable**.

## Abbreviations

`ConventionPack.abbreviations?: Readonly<Record<string, string>>` exists, but leaves
every operational question unanswered:

**Update (Specification v1.1):** those questions are now answered normatively by
[`convention-pack.md#abbreviations`](../../specification/convention-pack.md#abbreviations)
and implemented by
[`applyAbbreviation`](../../packages/core/src/evaluator/convention-evaluation/naming/apply-abbreviation.ts).
The old bare-string shape above is the pre-v1.1 sketch this section originally analyzed;
the current executable model uses a nested mapping keyed by canonical Resource Identity
attribute reference and exact resolved value.

- **Key semantics** — unclear whether a key identifies a resource type, a naming
  component's dotted attribute path, a specific resolved value, or a literal text
  fragment.
- **Value semantics** — presumably a replacement string, but nothing states whether it
  replaces the whole component value or matches a substring within it.
- **Matching semantics and case sensitivity** — undefined.
- **Application scope** — whether an abbreviation applies globally, per resource type,
  or per naming position is undefined.
- **Execution order** — relative to casing and normalization, undefined.
- **Fallback behavior** — what happens when a key has no configured abbreviation is
  undefined (though "no abbreviation" trivially falls back to the unabbreviated value,
  this is an assumption, not a Specification statement).

The current test fixture (`{ environment: "env" }` in
[contract-fixtures.ts](../../packages/core/test/types/contract-fixtures.ts)) uses a bare
key ("environment") rather than the dotted-path convention
(`deployment.environment`) the contract's own doc comment claims — direct evidence that
even the key convention is not settled in practice, not only in the Specification.

**Update (Specification v1.1):** every gap above is now closed normatively, with the
field reshaped to `Record<attributeReference, Record<exactValue, abbreviation>>` — a
canonical attribute reference outer key, an exact-match resolved-value inner key, exact
case-sensitive matching only, unabbreviated fallback, and an explicit execution order
before casing. See [convention-pack.md#abbreviations](../../specification/convention-pack.md#abbreviations).
This is a shape change from the sketch above (see [Specification v1.1's own delta
note](../../specification/README.md#delta-from-specification-v10) for why this is
treated as low-risk). At the time this section was written, this was documentation
only; it has since been implemented by `applyAbbreviation` (see
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)'s 2.6.2 entry), and the Abbreviations row
in the [Naming](#naming) table above is classified **Executable** accordingly.

## Length and truncation

These are separate concerns with different executability:

- **Length validation** — `ResourceRenderingConstraints.max_length: number` is a
  precise, well-typed numeric constraint. In isolation it would be trivially
  executable (`renderedName.length <= max_length`). It is classified **Modelled but not
  executable** here only because there is no rendered name to validate against yet
  (naming rendering itself is blocked — see [Separator semantics](#separator-semantics)
  and [Casing semantics](#casing-semantics)); the constraint's own semantics are not the
  blocker.
- **Truncation** — a maximum length is not permission to truncate. The Specification
  never states whether truncation is allowed at all, what would be truncated, the
  priority between naming components, truncation direction, preservation requirements
  (for example, never truncating `resource_type`), or whether truncation implies a
  warning. Classified **Conceptual only**.

## Hashing

Deterministic hashing is not defined anywhere in `specification/` — not the trigger
(when hashing would occur), the source material (which attributes feed it), the
algorithm, the encoding, the output length, its placement in a rendered name, its
interaction with a separator, its interaction with truncation, or its collision
semantics. It is named only as an anticipated, deferred behavior in
[executable-domain-model-traceability.md#deferred-behavior](executable-domain-model-traceability.md#deferred-behavior),
not in the Specification itself. Classified **Conceptual only**; no algorithm is
proposed here.

## Uniqueness and collision handling

Two properties must be kept separate:

- **Local deterministic uniqueness properties** — Context Resolution and Resource
  Projection are already proven deterministic (same input → same output; see the
  `determinism: …` tests in every runtime test file). This property is **Executable**
  and already relied upon by every other capability in this document.
- **Global uniqueness guarantees** — `ResourceIdentityConstraints.unique` and
  `.uniqueness_scope` ([resource-definition.ts](../../packages/core/src/model/definitions/resource-definition.ts))
  describe *that* uniqueness may be required and *within what scope*, but proving no
  other resource already holds a generated name requires information no evaluator input
  currently supplies. This is classified **External**. Likely owners for the external
  lookup: the caller, a provisioning system, the cloud provider itself (uniqueness
  errors surfaced at apply time), or a future resource registry. No external lookup
  behavior is added to `core` here.

## Metadata projection

`ConventionPack` has no field representing a metadata projection mapping at all (see
its own doc comment in
[convention-pack.ts](../../packages/core/src/model/conventions/convention-pack.ts)).
[`convention-pack.md#metadata-projections`](../../specification/convention-pack.md#metadata-projections)
confirms this is deliberate: "This document does not define concrete key mappings or
value formats." No source attribute, target metadata key, mapping semantics, omission
behavior, value conversion, required-metadata rule, or tag/label/annotation
distinction is defined. `ConventionMetadata.tags`/`.labels`/`.annotations`
([convention-result.ts](../../packages/core/src/model/results/convention-result.ts))
model only the *shape* of the eventual output. No AWS, Azure, or Kubernetes mapping is
invented here. Classified **Conceptual only**.

## Placement Constraints

`ResourceDefinition.placement_constraints?: ReadonlyArray<string>` is free-form
descriptive text (for example, "regional; location chosen by the deployment," from the
S3 Bucket example in [resource-definition.md#illustrative-examples](../../specification/resource-definition.md#illustrative-examples)).
There is no machine-readable grammar, no structured condition representation, no
defined operators, no typed values, and no defined failure semantics.
[resource-definition.md#out-of-scope-for-this-document](../../specification/resource-definition.md#out-of-scope-for-this-document)
explicitly defers "a formal schema or grammar for expressing Placement Constraints."
The ACM Certificate + CloudFront → `us-east-1` example is used only as evidence that
conditional placement rules are an intended future capability, not as a hard-coded
semantic implemented anywhere. Classified **Modelled but not executable**.

## Explanation

[`convention-result.md#conceptual-contents`](../../specification/convention-result.md#conceptual-contents)
requires only "a human-readable account of how the result was derived, useful for
troubleshooting and auditing." It does not specify a structure, a stable vocabulary, or
a compatibility contract for the string's exact wording. `evaluateConvention` already
produces a deterministic, tested explanation string today (see
[convention-evaluation.test.mjs](../../packages/core/test/runtime/convention-evaluation.test.mjs)),
so the *conceptual capability* is functionally executable — but its exact content is
implementation-defined, not a stable executable contract, and must not yet be relied
upon as a compatibility surface by any caller.

## Warnings

The Specification only gives an illustrative example ("a value that had to be
truncated or normalized",
[convention-result.md#conceptual-contents](../../specification/convention-result.md#conceptual-contents))
and does not define which events are warnings, whether a transformation automatically
implies one, a warning structure beyond `{ message: string }`
([convention-result.ts](../../packages/core/src/model/results/convention-result.ts)), or
any stable warning code. `evaluateConvention` never populates `warnings` today, since
every currently-implementable transformation that might warrant one (normalization,
truncation) is itself unimplemented. Classified **Conceptual only**.

## Diagnostics propagation

Context Resolution produces `ContextResolutionDiagnostic` values
([diagnostics.ts](../../packages/core/src/evaluator/context-resolution/diagnostics.ts))
from both `resolveResourceIdentity` and `resolveGovernanceContext`, and both are
directly tested. However:

- The Milestone 2.1 pipeline contract `ContextResolutionResult`
  ([context-resolution-result.ts](../../packages/core/src/evaluator/contracts/context-resolution-result.ts))
  carries forward only `resource_identity` and `governance_context` — **not** these
  diagnostics. They are discarded at the pipeline-contract boundary, not preserved.
- Convention Evaluation (`evaluateConvention`) does not read or reuse them. It
  **recomputes** required-attribute completeness independently, directly against the
  resolved `ContextResolutionResult`, using its own accessor table (see
  [evaluate-convention.ts](../../packages/core/src/evaluator/convention-evaluation/evaluate-convention.ts)).
- Final diagnostic aggregation — combining Context Resolution's discarded diagnostics
  and any future Convention Evaluation diagnostics into `ConventionResult.explanation`
  and `.warnings` — remains an open item already recorded in
  [reference-evaluator.md#deferred-decisions](reference-evaluator.md#deferred-decisions)
  ("Diagnostics aggregation across Context Resolution's two halves").

This is not blocked pending increment 2.7 orchestration specifically; it is blocked
because no contract currently carries Context Resolution diagnostics past the pipeline
boundary, and introducing one is a model change this document does not decide.
Classified **Deferred**.

## Governance Profile gap

Carried forward from increment 2.3 (see
[reference-evaluator.md#deferred-decisions](reference-evaluator.md#deferred-decisions)):

- `GovernanceProfileId` exists as a bare `string` alias
  ([identifiers.ts](../../packages/core/src/model/common/identifiers.ts)).
- No type represents a Governance Profile's own *contents* or *defaults* — only the
  selected profile's identifier is resolved, the same as any other
  Convention-Pack-defaulted attribute.
- Consequently, Governance Profile defaults — a resolution source named explicitly in
  [context-resolution.md#resolution-sources](../../specification/context-resolution.md#resolution-sources)
  — cannot currently be executed at all; there is nothing to resolve them from.
- No registry or loader for Governance Profiles should be invented inside `core`: `core`
  never performs IO ([executable-domain-model.md#model-boundaries](executable-domain-model.md#model-boundaries)),
  and inventing a loader would exceed what the Specification defines.

Whether this belongs to a future Specification artifact (a "Governance Profile"
concept analogous to a concrete Convention Pack), a new evaluator input contract, the
future `catalog` package, or another layer is genuinely undecided by this analysis;
implementation should not be chosen prematurely.

## Hard-coded canonical attribute vocabulary

Three separate tables independently enumerate the same small set of dotted Resource
Identity / Governance Context attribute paths:

- `COMPONENT_ACCESSORS` in [project-resource.ts](../../packages/core/src/evaluator/resource-projection/project-resource.ts)
  (12 entries: the three identity planes).
- `REQUIRED_ATTRIBUTE_ACCESSORS` in [evaluate-convention.ts](../../packages/core/src/evaluator/convention-evaluation/evaluate-convention.ts)
  (16 entries: the three identity planes plus Governance Context).
- The per-plane attribute-key arrays (`ORGANIZATIONAL_ATTRIBUTES`,
  `DEPLOYMENT_CONTEXT_ATTRIBUTES`, `FUNCTIONAL_REQUEST_ATTRIBUTES`,
  `GOVERNANCE_ATTRIBUTES`) inside
  [resolve-resource-identity.ts](../../packages/core/src/evaluator/context-resolution/resolve-resource-identity.ts)
  and [resolve-governance-context.ts](../../packages/core/src/evaluator/context-resolution/resolve-governance-context.ts).

None of these is a reusable domain concept; each is a private, evaluator-internal
constant, duplicated because the Specification and Executable Domain Model do not
define a single canonical, enumerable list of valid attribute paths anywhere. This is
low risk today (all four tables are small, evaluator-internal, and covered by tests
that would fail if one fell out of sync with `ResourceIdentity`/`GovernanceContext`'s
actual fields), but the duplication risk grows with every future increment that needs
the same vocabulary (for example, a future metadata-projection rule or naming-rendering
rule).

Whether Specification v1.1 needs to formalize a canonical attribute-reference
vocabulary, or whether a future internal refactor could simply centralize the existing
tables into one shared, evaluator-internal module without any Specification change, are
both left open here — no refactor is performed as part of this analysis (see [No code
changes](#no-code-changes-performed)).

## Gap ownership

| Gap | Likely owner |
| --- | --- |
| Governance Profile defaults representation | Unknown / decision required |
| Naming component canonical attribute vocabulary | Executable Domain Model |
| Separator semantics | Reference Evaluator |
| Casing semantics | Reference Evaluator |
| Convention Pack normalization rules | Specification |
| Resource Definition normalization / allowed-characters grammar | Specification |
| Abbreviation semantics | Reference Evaluator |
| Literal / prefix / suffix naming components | Specification |
| Truncation semantics | Specification |
| Deterministic hashing | Specification |
| Global uniqueness / collision proof | External system |
| Metadata projection model (Tags/Labels/Annotations) | Specification |
| Placement Constraint grammar | Specification |
| Total-name length validation | Reference Evaluator (blocked transitively on naming rendering, owned by Specification) |
| Warning taxonomy | Specification |
| Diagnostics aggregation across pipeline stages | Reference Evaluator |
| Hard-coded attribute-vocabulary duplication | Executable Domain Model |

No gap in this list is assumed to require new evaluator code as its default
resolution — several belong to the Specification, one to an external system, and one
is a low-risk internal duplication that may not need any change at all.

## Candidate Specification v1.1 Work

Only gaps for which this analysis demonstrates that **additional normative semantics**
(not merely more code) are required are listed here. No Specification text is drafted.

1. **Separator semantics** — problem: no separator value, placement, or
   omitted-component interaction is defined; v1.0 is insufficient because
   `convention-pack.md` explicitly declines to define naming syntax. Affected concepts:
   Convention Pack naming projections, Convention Result naming output. Minimum
   decision required: whether separator is a single Convention-Pack-wide value, a
   per-attribute value, or platform-specific. Additive (a new optional Convention Pack
   field).
2. **Casing semantics** — problem: casing style is named but not defined as data.
   Affected concepts: Convention Pack naming projections. Minimum decision required: a
   closed casing vocabulary (for example `preserve`/`lower`/`upper`) and its scope
   (whole name vs. per component). Additive.
3. **Abbreviation semantics** — problem: key/value/matching/scope/order/fallback are
   all undefined for an existing field. Affected concepts: Convention Pack. Minimum
   decision required: what an abbreviation key identifies (an attribute path, a
   specific value, or both) and how it composes with casing and separators. Likely
   additive, but could be breaking if the existing bare-string-key convention (see the
   `{ environment: "env" }` fixture) must change to a dotted path to match the
   contract's own documentation.
4. **Executable naming-rule model** — problem: naming rendering cannot proceed without
   1–3 above being resolved together, since separator, casing, and abbreviation
   interact. Affected concepts: Convention Pack, Convention Result. Minimum decision
   required: the composition order of these three rules. Additive if introduced as new
   optional fields.
5. **Metadata projection model** — problem: no source-attribute-to-metadata-key mapping
   exists. Affected concepts: Convention Pack, Convention Result (`ConventionMetadata`).
   Minimum decision required: whether the mapping is platform-neutral (adapters
   translate) or platform-specific (the Convention Pack already targets one platform,
   as `aws-workload-default` does). Additive.
6. **Executable technical constraints and Placement Constraint grammar** — problem:
   `allowed_characters`, `normalization`, and `placement_constraints` are all free
   text. Affected concepts: Resource Definition. Minimum decision required: a formal
   grammar for at least Placement Constraints, since `resource-definition.md` already
   anticipates conditional rules (the ACM/CloudFront example). Likely additive (a new,
   more specific field alongside the existing free-text one, to avoid breaking any
   consumer already reading the free-text field).
7. **Truncation and hashing semantics** — problem: neither is defined at all. Affected
   concepts: Resource Definition (`max_length`), Convention Result. Minimum decision
   required: whether truncation/hashing are in scope for v1.1 at all, or remain
   deferred further. Additive if introduced.
8. **Governance Profile artifact/input model** — problem: no defaults-bearing type
   exists for a Governance Profile. Affected concepts: Governance Context, Context
   Resolution. Minimum decision required: whether a Governance Profile becomes a
   Specification Artifact analogous to a concrete Convention Pack, or an evaluator-only
   input contract. Additive.
9. **Diagnostic propagation model** — problem: Context Resolution diagnostics are
   discarded at the `ContextResolutionResult` pipeline-contract boundary. Affected
   concepts: the evaluator's internal pipeline contracts (not a Specification concept
   directly, since diagnostics are evaluator-internal, not domain model). Minimum
   decision required: whether `ContextResolutionResult` should carry diagnostics
   forward, or whether Convention Evaluation should keep independently recomputing
   them (as it does today for required attributes). This is an Executable Domain Model
   / Reference Evaluator decision, not a Specification change, and is listed here only
   for completeness of the candidate-work inventory.
10. **Canonical attribute-reference vocabulary** — problem: three separate hard-coded
    tables duplicate the same small vocabulary today; this works at the current scale
    but has no Specification-level definition. Affected concepts: Resource Identity,
    Governance Context, Convention Pack (`naming_component_order`, `required_attributes`,
    `abbreviations`, `context_authority_rules`, `override_policy`). Minimum decision
    required: whether the Specification should name a canonical set of dotted
    attribute paths explicitly, or whether this should remain an internal
    implementation concern. Additive if formalized; also independently addressable as
    a non-Specification internal refactor (see [Hard-coded canonical attribute
    vocabulary](#hard-coded-canonical-attribute-vocabulary)).

Not included: literal/prefix/suffix naming components, and per-component length. These
were analyzed and found to have no current motivating use case or existing Specification
prose to formalize — including them would be speculative rather than evidence-driven,
which [`specification/README.md#future-evolution`](../../specification/README.md#future-evolution)
explicitly discourages ("evidence over speculation").

## Prioritization

**The smallest meaningful end-to-end Convention Result**, verified against
[`convention-result.md#conceptual-contents`](../../specification/convention-result.md#conceptual-contents),
is: **resolved identity and governance context + a generated name + validation**.
Metadata (Tags/Labels/Annotations) is one of several *Convention Outputs* the
Specification names, not a mandatory component of every Convention Result — the
Specification's own conceptual contents list treats Convention Outputs as a single
grouping that "conceptually include" both names and metadata, without requiring both to
be present before a result is meaningful, and `aws-workload-default.md` already
describes an intentional, staged rollout ("a naming output may therefore be generated
before `deployment_scope` is available") for exactly this reason. A useful first
evaluator therefore does not require metadata projection to exist.

- **P0 — required for the first useful `ConventionResult`:**
  - Separator semantics
  - Casing semantics
  - Abbreviation semantics
  - (together) the executable naming-rule model needed to render a name at all
- **P1 — required for Specification v1.1 completeness:**
  - Executable technical constraints and Placement Constraint grammar
  - Governance Profile artifact/input model
  - Metadata projection model
- **P2 — valuable but can remain deferred:**
  - Truncation and hashing semantics
  - Canonical attribute-reference vocabulary formalization
  - Diagnostic propagation model refinement

## Recommend the next development action

**Recommendation: B — create Specification v1.1** for naming-rendering semantics
(separator, casing, abbreviation), before proceeding to increment 2.7.

Rationale: increment 2.6 already demonstrated the ceiling of what is executable under
the current frozen Specification — required-attribute completeness. The next
meaningful unit of caller-visible value, a generated resource **name**, is blocked by
three P0 gaps above, all owned by the Specification, not by an incomplete TypeScript
representation of an already-precise concept (which would instead call for option C).
Proceeding to option A (2.7, the public `evaluate()` API) now would publish an API whose
`ConventionResult.outputs.name` can never be populated without inventing semantics —
exactly what this milestone and Milestone 2.6 were both instructed not to do. Option C
(extend the Executable Domain Model) is not the right next step either: the model
already faithfully represents every concept the Specification defines (see
[executable-domain-model-traceability.md](executable-domain-model-traceability.md)); the
blockers are in the Specification's own prose, not in an incomplete TypeScript shape.

This recommendation is scoped narrowly to the P0 items above (separator, casing,
abbreviation semantics — the minimum needed to render a name); it does not recommend
resolving every candidate in [Candidate Specification v1.1 Work](#candidate-specification-v11-work)
before further implementation proceeds.

## No code changes performed

No file under `packages/core/src/model/` or `packages/core/src/evaluator/` was modified
as part of this analysis. No inaccurate documentation statement requiring a production
code fix was discovered.

## Specification v1.1 outcome

[Specification v1.1: Executable Naming](../../specification/README.md#specification-v11-executable-naming)
adopted this recommendation. It closed the three P0 gaps above — Separator semantics,
Casing semantics, and Abbreviation semantics — together with the executable naming-rule
model that ties them into a single, deterministic execution order (see
[convention-pack.md#naming-rule-execution-order](../../specification/convention-pack.md#naming-rule-execution-order)).
It also formalized the canonical attribute-reference vocabulary (candidate item 10
above), which the P0 items required as a prerequisite for referencing Resource Identity
attributes at all, ahead of its original P2 placement in
[Prioritization](#prioritization) — a re-prioritization driven directly by drafting the
P0 items, not a change made independently of them.

Candidate items 5–9 (metadata projection, technical constraints and Placement
Constraint grammar, truncation and hashing, the Governance Profile artifact/input
model, and diagnostic propagation) remain deferred, unchanged, exactly as scoped in
[Specification v1.1 Non-Goals](../../specification/README.md#specification-v11-non-goals).

Specification v1.1 changed only `specification/` at the time this document was
written. As noted in the status update at the top of this document, implementation
increment **2.6.2 — Executable Naming Rules** has since landed, with tests (see
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)); the Separator, Casing, Abbreviations,
Component ordering, and Generated name output rows in the [Naming](#naming) table above
now read **Executable** as a result, exactly as this section anticipated.
