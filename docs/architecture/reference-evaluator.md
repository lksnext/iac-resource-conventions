# Reference Evaluator

## Purpose

The Reference Evaluator is the canonical, executable implementation of the Specification's
evaluation semantics: Context Resolution and Convention Evaluation (see
[`specification/context-resolution.md`](../../specification/context-resolution.md) and
[`specification/convention-result.md`](../../specification/convention-result.md)). It consumes
the domain contracts defined by the
[Executable Domain Model](executable-domain-model.md) and returns a `ConventionResult`.

Like the Executable Domain Model it builds on, the Reference Evaluator remains platform
independent: it has no knowledge of AWS, Azure, Kubernetes, Terraform, CDK, Ansible, or the CLI.
It implements only the conceptual pipeline the Specification describes — nothing an adapter
would need to reimplement or reinterpret.

This document defines the architecture for Milestone 2. It does not duplicate the
Specification, and it does not implement evaluation behavior — see [Increment
plan](#increment-plan) and [Out of scope](#deferred-decisions) below for what is deferred to
later increments.

## Responsibilities

The Reference Evaluator is responsible for:

- orchestrating the two-stage evaluation pipeline the Specification defines — Context
  Resolution and Convention Evaluation (see [Evaluation pipeline](#evaluation-pipeline));
- resolving the effective Resource Identity and Governance Context from a Naming Request, a
  selected Convention Pack, and Evaluation Context;
- applying the Specification-defined source precedence, attribute authority, and protection
  rules during resolution (see
  [`specification/context-resolution.md#precedence-authority-and-protection`](../../specification/context-resolution.md#precedence-authority-and-protection));
- selecting the Resource Definition referenced by the resolved `resource_type` (a lookup, not a
  resolution — see
  [`specification/context-resolution.md#what-context-resolution-produces`](../../specification/context-resolution.md#what-context-resolution-produces));
- projecting the resolved Resource Identity and Governance Context into Convention Outputs
  (names, tags, labels, annotations), as configured by the selected Convention Pack;
- applying the convention rules the Specification and the selected Convention Pack define, once
  those rules exist in executable form (see [Increment plan](#increment-plan));
- producing a deterministic `ConventionResult`, including validation information, an
  explanation, and warnings, where the Specification defines them.

Responsibilities not described by the Specification are not assigned to the Reference
Evaluator — see [Non-responsibilities](#non-responsibilities).

## Non-responsibilities

The Reference Evaluator must never:

- read files;
- load YAML or JSON;
- discover or register Convention Packs or Resource Definitions;
- call a cloud-provider API;
- integrate with Terraform, CDK, or another IaC tool;
- parse CLI arguments;
- configure logging;
- persist data;
- consume a remote registry;
- read environment variables;
- access the network;
- transport telemetry;
- orchestrate deployments.

Everything in this list belongs to `catalog`, the CLI, or an adapter — never to `core` (see
[Package responsibilities in `IMPLEMENTATION.md`](../../IMPLEMENTATION.md#package-responsibilities)).
In particular, Convention Packs and Resource Definitions are selected by the caller (or by
`catalog`/the CLI) and handed to the evaluator as already-resolved values; the evaluator never
loads them itself.

## Inputs and outputs

The Specification describes Context Resolution and Convention Evaluation as a conceptual,
logical pipeline and explicitly states that it "does not describe implementation details such
as data structures, APIs, or execution order guarantees beyond" the conceptual steps it lists
(see
[`specification/convention-result.md#convention-evaluation-pipeline`](../../specification/convention-result.md#convention-evaluation-pipeline)).
This means the evaluator's concrete public function signature is not fully determined by the
Specification today.

Two faithful shapes are possible:

- **One aggregate input object** — a single value grouping the Naming Request, Convention
  Pack, Evaluation Context, and (once selected) Resource Definition.
- **Explicit arguments** — the evaluator accepts the Naming Request, Convention Pack,
  Evaluation Context, and Resource Definition as separate parameters, matching the four
  distinct inputs shown in the canonical pipeline diagram in
  [`specification/README.md#architecture`](../../specification/README.md#architecture).

Neither shape is finalized here. It is recorded as **deferred to the first code increment**
(see [Deferred decisions](#deferred-decisions)), to be decided with the evidence a real
implementation provides rather than guessed in advance.

The output is unambiguous: every evaluation produces a `ConventionResult` (see
[`ConventionResult`](../../packages/core/src/model/results/convention-result.ts)), already
defined by the Executable Domain Model. No new output type is introduced by this document.

## Determinism

Context Resolution and Convention Evaluation must both be deterministic: the same complete
inputs must always produce the same `ConventionResult` (see
[`specification/context-resolution.md#deterministic-behaviour`](../../specification/context-resolution.md#deterministic-behaviour)).
This is a precondition for meaningful contract and compatibility testing across adapters.

The evaluator must not depend on:

- the current time;
- random values;
- the process environment;
- filesystem state;
- network state;
- a cloud provider API;
- mutable global state.

Any normalization, truncation, hashing, or collision-handling behavior introduced by a later
increment must also be deterministic — a given input must never produce different outputs on
different runs.

## Evaluation pipeline

The Specification defines exactly two processing stages — Context Resolution and Convention
Evaluation — with Resource Definition selection as an intermediate lookup between them (see
[`specification/README.md#architecture`](../../specification/README.md#architecture)):

```mermaid
flowchart TD
    NR["Naming Request"]
    CP["Convention Pack"]
    EC["Evaluation Context"]
    CR["Context Resolution"]
    RI["Resource Identity"]
    GC["Governance Context"]
    RD["Resource Definition"]
    CE["Convention Evaluation"]
    RS["Convention Result"]

    NR --> CR
    CP --> CR
    EC --> CR
    CR --> RI
    CR --> GC
    RI --> CE
    GC --> CE
    RD --> CE
    CE --> RS
```

At an architectural level:

| Stage | Input | Output | Responsibility | Must not |
| --- | --- | --- | --- | --- |
| Context Resolution | `NamingRequest`, `ConventionPack`, `EvaluationContext` | `ResourceIdentity`, `GovernanceContext` | Apply the Specification's resolution precedence, attribute authority, and protection rules to produce both canonical models together (see [`specification/context-resolution.md`](../../specification/context-resolution.md)) | Generate names, tags, labels, or annotations; select a Resource Definition |
| Resource Definition selection | The resolved `functional.resource_type` | `ResourceDefinition` | Look up the Resource Definition referenced by the resolved resource type | Load a catalog, file, or registry from within `core`; resolve or infer a resource type |
| Convention Evaluation | `ResourceIdentity`, `GovernanceContext`, `ResourceDefinition`, the selected `ConventionPack` | `ConventionResult` | Project identity and governance into Convention Outputs, then validate those outputs and the resolved identity against the Resource Definition's constraints and the Specification, producing warnings and an explanation | Re-resolve context; bypass Resource Definition constraints; invent a validation rule the Specification does not define |

Context Resolution produces Resource Identity and Governance Context **together**, not as two
sequential sub-stages — the Specification describes them as the two outputs of one process, and
several precedence-order entries (for example Governance Profile defaults) interleave with
identity-related sources in the same ordered list (see
[`specification/context-resolution.md#resolution-precedence`](../../specification/context-resolution.md#resolution-precedence)).
This remains the conceptual model. The implementation, however, delivered the two outputs as two
separate increments (see [Increment plan](#increment-plan)): increment 2.2 resolved Resource
Identity, and increment 2.3 resolved Governance Context reusing the same input contract and the
same `resolveAttribute` primitive. One Specification-named precedence source, "Governance
Profile defaults," has no corresponding defaults-bearing type anywhere in the domain model —
`GovernanceContext.profile` is only an identifier reference (see
[`packages/core/src/model/governance/governance-context.ts`](../../packages/core/src/model/governance/governance-context.ts))
— so increment 2.3 deliberately did not implement that one source rather than inventing a domain
concept the Specification has not yet been shown to need (see [Context Resolution: Governance
Context (implemented)](#context-resolution-governance-context-implemented) and [Deferred
decisions](#deferred-decisions)). Splitting the implementation into two increments is a
build-order decision; it does not change the conceptual pipeline, which still has exactly two
stages, Context Resolution and Convention Evaluation. This document intentionally does not
describe algorithm-level detail (for example, exactly how each precedence rule is implemented)
— that belongs to the increment that implements it.

## Dependency boundaries

An illustrative internal structure, mirroring the Executable Domain Model's package layout
(see
[Package Organization in `executable-domain-model.md`](executable-domain-model.md#package-organization)):

```text
packages/core/src/
    model/
    evaluator/
        context-resolution/        # Resource Identity (2.2) + Governance Context (2.3)
        resource-projection/       # Resource Projection (2.5)
        convention-evaluation/     # required-attribute completeness validation (2.6)
        index.ts
```

No `resource-definition/` folder is illustrated: increment 2.4 introduced no code (see
[Increment plan](#increment-plan)) — the Resource Definition selection boundary is already fully
expressed by the `resource_definition` field on the Milestone 2.1 `ConventionEvaluationInput`
contract, and `core` never loads a Resource Definition itself (see
[Non-responsibilities](#non-responsibilities)).

This is illustrative, not a commitment beyond what has already been built: `context-resolution/`,
`resource-projection/`, and `convention-evaluation/` all exist today (see [Code
scaffold](#code-scaffold) below); `convention-evaluation/` currently contains only the
required-attribute completeness rule (see [Convention Evaluation Rules
(implemented)](#convention-evaluation-rules-implemented)) — abbreviation application,
normalization, separators, casing, metadata projection, and Resource Definition constraint
validation remain unimplemented, each blocked on a documented Specification or domain-model gap.

Dependency direction:

```text
model
  ↑
evaluator stage contracts
  ↑
evaluator orchestration
```

- The evaluator may depend on the model.
- The model must never depend on the evaluator.
- Evaluator stages must not depend on adapters, the CLI, provider SDKs, or filesystem code.

## Functional core

Evaluator logic should be implemented as pure functions where practical: explicit inputs,
explicit outputs, immutable transformations, deterministic behavior, and small composable
stages, consistent with the Executable Domain Model's own preference for immutable data (see
[Design Principles in `executable-domain-model.md`](executable-domain-model.md#design-principles)).

Avoid, by default:

- service locators;
- dependency injection frameworks;
- mutable evaluator classes;
- hidden caches;
- singletons;
- process-global configuration.

This is a default, not a categorical prohibition: a class may be justified later by concrete
evidence (for example, genuinely stateful memoization within a single evaluation), but pure
functions are the starting assumption for every increment below.

## Validation and diagnostics

The Specification distinguishes several kinds of outcome that must not be conflated:

- **Input shape validation** — whether a `NamingRequest` (or other input) matches its JSON
  Schema. This is a schema-level concern, already tracked as validation layer 2 in
  [`IMPLEMENTATION.md#validation-strategy`](../../IMPLEMENTATION.md#validation-strategy); it is
  not part of Context Resolution or Convention Evaluation themselves.
- **Normative domain validation** — whether a resolved value may replace another given the
  Specification's authority and protection rules (see
  [`specification/context-resolution.md#precedence-authority-and-protection`](../../specification/context-resolution.md#precedence-authority-and-protection)).
  This happens during Context Resolution.
- **Convention validation** — whether generated outputs and the resolved Resource Identity
  satisfy the Resource Definition's constraints and the Specification (uniqueness,
  normalization, Placement Constraints); this is `ConventionResult.validation` (see
  [`specification/convention-result.md#conceptual-contents`](../../specification/convention-result.md#conceptual-contents)).
- **Diagnostics** — `ConventionResult.explanation` and `ConventionResult.warnings`, both
  already modeled by the Executable Domain Model.

The Convention Evaluation pipeline reaches its final step, "Produce Convention Result," even
when validation fails (see [Convention Evaluation
pipeline](../../specification/convention-result.md#convention-evaluation-pipeline) in the
Specification) — `ConventionResult.validation.valid` is the signal, not an exception. This
document records, as
the working assumption for later increments, that **expected evaluation outcomes** — a failed
constraint, an unresolved non-required attribute, a value that had to be normalized — should be
represented in `ConventionResult` rather than thrown. Unexpected programmer errors (for example,
a malformed internal invariant) may remain exceptional, but no exception hierarchy is designed
here. Increment 2.6 resolves the question of what happens when a *required* attribute, per the
selected Convention Pack's `required_attributes`, cannot be resolved at all: a `ConventionResult`
is still produced, with `validation.valid: false` and a `ConventionValidationFailure` per
unresolved required attribute (see [Convention Evaluation Rules
(implemented)](#convention-evaluation-rules-implemented)) — this condition never throws.

No runtime schema library (AJV, Zod, or similar) is selected in this document — that remains a
deferred decision already tracked in
[`IMPLEMENTATION.md#deferred-decisions`](../../IMPLEMENTATION.md#deferred-decisions).

## Traceability and explanation

`ConventionResult.explanation` and `ConventionResult.warnings` require the pipeline to retain
enough information, as it runs, to describe how a result was derived (see
[`specification/convention-result.md#conceptual-contents`](../../specification/convention-result.md#conceptual-contents)).
Later increments that implement Context Resolution and Convention Evaluation should design each
stage so it can report which source supplied a given attribute and why, rather than only
producing a final value — but no tracing mechanism is implemented by this document. Generic
application logging is not a substitute for this domain-level trace data: an explanation is a
Convention Result field, not a log line, and must remain deterministic and reproducible from the
same inputs.

## Public API principles

The future evaluator's public API should follow the same principles already established for
the Executable Domain Model (see [Public API in
`executable-domain-model.md`](executable-domain-model.md#public-api)):

- importable from the package root only, no deep imports;
- an explicit, documented input contract (shape to be finalized per [Inputs and
  outputs](#inputs-and-outputs));
- a deterministic output (`ConventionResult`);
- no provider-specific parameters;
- no IO side effects;
- stable public types, evolved additively wherever possible;
- internal evaluator stages (Context Resolution, Resource Definition selection, Resource
  Projection, Convention Evaluation Rules) are implementation details, not public API surface,
  unless a concrete consumer need justifies exposing one independently.

## Testing strategy

Once evaluation behavior exists, the following test categories are planned:

- **Specification examples as acceptance tests** — concrete examples already described in the
  Specification (for example,
  [`specification/resource-definition.md#illustrative-examples`](../../specification/resource-definition.md#illustrative-examples))
  used as end-to-end fixtures.
- **Unit tests for each pure stage** — Context Resolution, Resource Definition selection, and
  Convention Evaluation tested independently.
- **Table-driven precedence tests** — covering the seven-level precedence order and the
  authority/protection exceptions to it (see
  [`specification/context-resolution.md#resolution-precedence`](../../specification/context-resolution.md#resolution-precedence)).
- **Invariant tests** — for example, a `ConventionResult` always has a `resource_identity`, a
  `governance_context`, `outputs`, and a `validation`, regardless of outcome.
- **Deterministic-output tests** — the same inputs evaluated twice produce identical results.
- **Compile-time public API tests** — following the same pattern as
  [`packages/core/test/types/contract-fixtures.ts`](../../packages/core/test/types/contract-fixtures.ts).
- **Regression tests** for resolved edge cases, added as they are discovered.

No new test runner or testing dependency is introduced — Node's built-in test runner
(`node:test`), already used by `core`, remains sufficient (see
[Testing and fixture strategy in `IMPLEMENTATION.md`](../../IMPLEMENTATION.md#testing-and-fixture-strategy)).
These tests are not implemented by this document — see [Code scaffold](#code-scaffold).

## Increment plan

Milestone 2 is delivered as a sequence of small increments. Increments 2.2 and 2.3 below
implement, in two separate steps, the two canonical models one conceptual Context Resolution
process produces (see [Evaluation pipeline](#evaluation-pipeline)); the split is a build-order
decision driven by a genuine domain-model gap for Governance Profile defaults, not a
reinterpretation of the Specification's pipeline shape. "Resource projection" is likewise
renamed to match the Specification's own terms ("Evaluate Convention" / "Generate outputs").

- **2.1 — Evaluator architecture and public contract** (this document, plus the pipeline
  contracts below). Defines responsibility, inputs/outputs, determinism, dependency
  boundaries, and error philosophy at a conceptual level, and implements the behavior-free
  internal contracts between evaluator stages (see [Pipeline contracts
  (implemented)](#pipeline-contracts-implemented)). No behavior. **Definition of done:** this
  document exists, is linked from `IMPLEMENTATION.md`, `packages/core/src/evaluator/contracts/`
  defines `ContextResolutionInput`, `ContextResolutionResult`, and `ConventionEvaluationInput`,
  and no evaluation behavior has been implemented. **Status: complete.**
- **2.2 — Context Resolution: Resource Identity**. Implements the normative, deterministic
  resolution of Resource Identity from a Naming Request, Convention Pack, and Evaluation
  Context: source precedence, Convention-Pack-declared context authority, protection of
  authoritative values, and required-attribute detection (see [Context Resolution: Resource
  Identity (implemented)](#context-resolution-resource-identity-implemented)). No Governance
  Context resolution, no naming projection. **Definition of done:** given a Naming Request,
  Convention Pack, and Evaluation Context, `resolveResourceIdentity` produces a correctly
  precedence-ordered `ResourceIdentity` plus diagnostics for protected-value conflicts and
  unresolved required attributes, verified by table-driven tests. **Status: complete.**
- **2.3 — Context Resolution: Governance Context**. Implements the normative, deterministic
  resolution of Governance Context from a Naming Request and Convention Pack, reusing the same
  `ContextResolutionInput` contract `resolveResourceIdentity` consumes (see [Context Resolution:
  Governance Context (implemented)](#context-resolution-governance-context-implemented)). Two
  Specification-named resolution sources — Evaluation Context and Governance Profile defaults —
  are not implemented, since the domain model has no governance-bearing Evaluation Context
  field and no defaults-bearing type for a selected Governance Profile; inventing either was out
  of scope (see [Deferred decisions](#deferred-decisions)). **Definition of done:** given a
  Naming Request and Convention Pack, `resolveGovernanceContext` produces a correctly
  precedence-ordered `GovernanceContext` plus diagnostics for protected-value conflicts and
  unresolved required attributes, verified by table-driven tests; the two Milestone 2.2/2.3
  outputs compose into the full `ContextResolutionResult` contract from Milestone 2.1. **Status:
  complete.**
- **2.4 — Resource Convention Preparation**. Before this increment began, a mandatory design
  gate asked whether a dedicated preparation step — bundling the resolved `ContextResolutionResult`
  with the selected `ResourceDefinition` and `ConventionPack` ahead of Resource Projection, or
  deriving a resource-specific subset of Convention Pack policy (for example, which
  `naming_component_order` entries apply to a given Resource Identity) — would establish a
  genuine, Specification-backed invariant not already represented by the existing domain and
  contract types. The answer is **no**: the Milestone 2.1 `ConventionEvaluationInput` contract
  already bundles `ContextResolutionResult`, `ResourceDefinition`, and `ConventionPack` for
  Convention Evaluation, and every Convention Pack field a projection step needs
  (`naming_component_order`, `abbreviations`, `override_policy`, and so on) is already a flat,
  directly-readable field — determining which apply to a specific resource is projection
  behavior belonging to increment 2.5, not a separate resolution step (see [Contracts
  considered and rejected](#contracts-considered-and-rejected)). This increment therefore
  introduces no new module, function, or contract. It also closes out Resource Definition
  selection — establishing the boundary where `core` accepts an already-selected
  `ResourceDefinition` (matching the resolved `resource_type`) as an evaluator input, without
  loading it itself — whose definition of done (the evaluator's input contract accepts a
  `ResourceDefinition`; no file, registry, or catalog access exists in `core`) was already
  satisfied when increment 2.1 introduced `ConventionEvaluationInput`. **Status: complete —
  no code introduced; the design gate is the deliverable.**
- **2.5 — Resource Projection**. Before this increment began, a mandatory design gate asked
  whether determining which resolved Resource Identity attributes participate in a resource's
  generated name — and in what order, per the selected Convention Pack's
  `naming_component_order` and `required_attributes` — establishes a genuine, Specification-
  backed invariant not already represented by an existing contract, or whether it would merely
  copy fields already available from `ResourceIdentity` and `ConventionPack`. The answer is
  **yes, it establishes a genuine invariant**: no existing contract combines a Convention Pack's
  resource-agnostic `naming_component_order` declaration with a *specific* resolved
  `ResourceIdentity` to determine, for that resource, which components are present, which are
  absent-and-omitted, which are absent-but-required (and therefore must not silently disappear),
  and which Resource Identity plane each retained component came from. This increment therefore
  introduces `projectResource`, under
  [`packages/core/src/evaluator/resource-projection/`](../../packages/core/src/evaluator/resource-projection/)
  (see [Resource Projection (implemented)](#resource-projection-implemented)). Resource Projection
  is an internal implementation increment within Convention Evaluation, corresponding to the
  Specification's "Evaluate Convention" pipeline step (see
  [`specification/convention-result.md#convention-evaluation-pipeline`](../../specification/convention-result.md#convention-evaluation-pipeline));
  it is not an independent Specification processing stage, and it does not render a final name,
  apply an abbreviation or normalization rule, or generate metadata. **Definition of done:** given
  a resolved Resource Identity and the selected Convention Pack, `projectResource` produces an
  ordered, resource-specific naming component sequence consistent with the Convention Pack's
  declared `naming_component_order` and `required_attributes`, verified by table-driven tests.
- **2.6 — Convention Evaluation Rules**. Before implementation began, a mandatory rule inventory
  and scope gate examined every candidate Convention Evaluation behavior the Specification
  describes in prose — naming rendering, abbreviation application, normalization, separators,
  casing, truncation, hashing, collision handling, metadata (Tags/Labels/Annotations) projection,
  Resource Definition technical-constraint validation (`max_length`, `allowed_characters`), and
  Placement Constraint validation — against the frozen Specification and the current Executable
  Domain Model. Every one of these remains blocked on a genuine, documented gap: no separator,
  casing rule, or abbreviation-substitution semantics is defined anywhere (the concrete
  `aws-workload-default` Convention Pack example explicitly disclaims defining them, see
  [`specification/convention-packs/aws-workload-default.md`](../../specification/convention-packs/aws-workload-default.md));
  `ConventionPack` has no metadata projection mapping field at all (see
  [`packages/core/src/model/conventions/convention-pack.ts`](../../packages/core/src/model/conventions/convention-pack.ts));
  `ResourceDefinition.placement_constraints` is free-form prose with no formal grammar (see
  [`packages/core/src/model/definitions/resource-definition.ts`](../../packages/core/src/model/definitions/resource-definition.ts));
  and technical-constraint and collision validation both require a rendered name or an external
  registry this evaluator must not consult. The only rule the gate found genuinely
  implementable — a real Specification-backed invariant, not an invented one — is
  **required-attribute completeness**: the Specification states a Convention Pack's
  `required_attributes` "must be available before Convention Evaluation can proceed" (see
  [`specification/convention-pack.md#required-attributes`](../../specification/convention-pack.md#required-attributes)),
  and this had never been checked at the Convention Evaluation stage itself (`ContextResolutionResult`
  does not carry Context Resolution's own `unresolved-required-attribute` diagnostics forward, see
  [Pipeline contracts (implemented)](#pipeline-contracts-implemented)). This increment therefore
  implements only that rule, in `evaluateConvention` under
  [`packages/core/src/evaluator/convention-evaluation/`](../../packages/core/src/evaluator/convention-evaluation/)
  (see [Convention Evaluation Rules (implemented)](#convention-evaluation-rules-implemented)),
  and produces `outputs: {}` (no `name`, no `metadata`) and no `warnings`, since every rule that
  would populate them remains blocked. **Definition of done:** given a `ConventionEvaluationInput`,
  `evaluateConvention` returns a `ConventionResult` whose `validation.valid` correctly reflects
  whether every declared required attribute resolved, for both complete and incomplete inputs,
  verified by table-driven tests; every other candidate rule is either implemented or explicitly
  documented as blocked, with a citation, rather than silently omitted. **Status: complete for
  the currently executable rule** — abbreviation, normalization, separator, casing, truncation,
  hashing, collision, metadata projection, and Resource Definition constraint validation remain
  open for a future increment, once the Specification defines the missing mechanisms.

## Pipeline contracts (implemented)

Milestone 2.1 implements the behavior-free internal contracts that make the stage
boundaries described in [Evaluation pipeline](#evaluation-pipeline) explicit in code, under
[`packages/core/src/evaluator/contracts/`](../../packages/core/src/evaluator/contracts/). No
Context Resolution, Resource Definition selection, or Convention Evaluation behavior exists —
these are types only.

| Contract | Composes | Produced by | Consumed by | Visibility |
| --- | --- | --- | --- | --- |
| `ContextResolutionInput` | `NamingRequest`, `ConventionPack`, `EvaluationContext` | The caller of Context Resolution (increment 2.2) | Context Resolution (increment 2.2) | Internal |
| `ContextResolutionResult` | `ResourceIdentity`, `GovernanceContext` | Context Resolution (increment 2.2) | Resource Definition selection (2.4); Convention Evaluation (2.5–2.6), via `ConventionEvaluationInput` | Internal |
| `ConventionEvaluationInput` | `ContextResolutionResult`, `ResourceDefinition`, `ConventionPack` | The caller of Convention Evaluation, once Resource Definition selection (2.4) has run | Convention Evaluation Rules (increment 2.6) | Internal |

Each is required-field-only (unlike the domain contracts it composes, whose own attributes stay
optional to mirror their permissive JSON Schemas): a stage-boundary contract represents "this
stage has everything it needs," which is a stronger, evaluator-specific invariant the domain
model does not itself express. All three remain internal — none are re-exported from the
package root (`packages/core/src/index.ts`) — because the public `evaluate()` signature is
still an open decision (see [Deferred decisions](#deferred-decisions)), and no consumer outside
the evaluator's own orchestration needs to inspect them yet (see [Public API
principles](#public-api-principles)). They are exported only from
[`packages/core/src/evaluator/index.ts`](../../packages/core/src/evaluator/index.ts), the
evaluator's own internal module boundary.

### Contracts considered and rejected

- **A separate "resolved governance" contract, sequential to a "resolved identity" contract** —
  rejected. The Specification states Context Resolution produces Resource Identity and
  Governance Context together, as the two outputs of one process, not as two independent or
  sequential resolutions (see
  [`specification/context-resolution.md#what-context-resolution-produces`](../../specification/context-resolution.md#what-context-resolution-produces)).
  Splitting them into two contracts would invent a sequencing the Specification does not
  describe; `ContextResolutionResult` represents both together instead.
- **A "resolved convention set" wrapping the selected Resource Definition and Convention Pack
  alone** — rejected. Resource Definition selection is "a lookup, not a resolution" (see
  [`specification/context-resolution.md#what-context-resolution-produces`](../../specification/context-resolution.md#what-context-resolution-produces)),
  and a Convention Pack is not itself resolved into a new shape — it is selected upfront and
  used as-is. Bundling only these two, without the resolved identity and governance Convention
  Evaluation also needs, would not represent the actual stage-2 boundary; `ConventionEvaluationInput`
  bundles all three together instead.
- **A "projected resource" contract for generated-but-unvalidated outputs** — rejected. The
  existing `ConventionOutputs` domain contract (see
  [`ConventionResult`](../../packages/core/src/model/results/convention-result.ts)) already
  represents exactly this value — it is already used as an independent field, separate from
  `ConventionValidation`, inside `ConventionResult`. A new type here would duplicate an existing
  domain contract rather than compose it.
- **An "evaluated convention" contract for the fully-validated result, distinct from
  `ConventionResult`** — rejected for the same reason: `ConventionResult` already is the
  Specification's own name for this final artifact (see
  [`specification/convention-result.md`](../../specification/convention-result.md)); introducing
  a second name for the same shape would duplicate an existing domain contract.
- **A single contract bundling the entire pipeline end to end** (an `EvaluationInput`-style
  aggregate matching a possible public `evaluate()` signature) — rejected for this increment.
  This is exactly the still-open public function signature question recorded in [Inputs and
  outputs](#inputs-and-outputs); inventing it now would fabricate a public contract this
  document cannot yet honor truthfully.
- **A dedicated "Resource Convention Preparation" contract** (variously named
  `ResourceConventionData` or similar), produced by a new increment 2.4 step between Context
  Resolution and Resource Projection (2.5) — rejected, per the increment 2.4 design gate (see
  [Increment plan](#increment-plan)). It would either duplicate `ConventionEvaluationInput`
  (already bundling `ContextResolutionResult`, `ResourceDefinition`, and `ConventionPack`
  since increment 2.1) or attempt to precompute which Convention Pack rules apply to a specific
  resource — a projection concern that belongs to increment 2.5, not a Context-Resolution-like
  resolution step the Specification does not describe. This is the same reasoning already
  recorded above for "a 'resolved convention set' wrapping the selected Resource Definition and
  Convention Pack alone."

## Context Resolution: Resource Identity (implemented)

Milestone 2.2 implements `resolveResourceIdentity`, under
[`packages/core/src/evaluator/context-resolution/`](../../packages/core/src/evaluator/context-resolution/):
a pure function `(input: ContextResolutionInput) => ResourceIdentityResolution` that resolves
only the Resource Identity half of Context Resolution. It reuses the Milestone 2.1
`ContextResolutionInput` contract unchanged as its input.

**Output.** `ResourceIdentityResolution` is a new internal type — `{ resource_identity:
ResourceIdentity; diagnostics: ReadonlyArray<ContextResolutionDiagnostic> }` — distinct from the
Milestone 2.1 `ContextResolutionResult`, which additionally requires a `governance_context` this
increment does not produce (see [Increment plan](#increment-plan)). A later increment composes
both halves into `ContextResolutionResult`.

**Failure representation.** Resource Identity is always produced, even when it is incomplete:
an unresolved required attribute or a rejected protected-value conflict is recorded as a
`ContextResolutionDiagnostic` (`{ kind: "unresolved-required-attribute" |
"protected-value-conflict"; attribute: string; message: string }`), never thrown. This is a
distinct type from `ConventionValidation`/`ConventionValidationFailure` (see [Validation and
diagnostics](#validation-and-diagnostics)): those describe validation against a Resource
Definition and the Specification, which has not run yet at this stage. This resolves the
previous "required-but-unresolvable attribute handling" deferred decision for the identity
slice: Context Resolution reports the condition; refusing to proceed is Convention Evaluation's
decision, not this stage's.

**Algorithm.** For each Resource Identity attribute, the resolver: (1) determines a
context-tier value from Convention Pack defaults, the applicable shared context, and Runtime
Context, honoring a Convention-Pack-declared `context_authority_rules` entry when one applies
and falling back to plain precedence otherwise; (2) determines a request-tier value from the
Naming Request and its `overrides` block, overrides outranking the Naming Request; (3) applies
the request-tier value unless the attribute is Convention-Pack-protected and a context-tier value
exists, in which case the context-tier value wins and a conflict is recorded only when the two
values actually differ; (4) records an unresolved-required-attribute diagnostic when the result
is still absent and the attribute is Convention-Pack-required. See
[`specification/context-resolution.md#precedence-authority-and-protection`](../../specification/context-resolution.md#precedence-authority-and-protection)
and
[`specification/convention-pack.md#context-authority-rules`](../../specification/convention-pack.md#context-authority-rules).

**Invariants.** Pure and deterministic (same input, same output); never mutates its input;
never produces a diagnostic for a source that simply does not supply a value (only for an actual
conflict or an actual unresolved requirement); never derives `deployment.platform` from a
Resource Definition (Resource Definition selection is a later, sequentially-dependent stage —
see increment 2.4) — `platform` is resolved like any other attribute, with no special derivation
logic in this stage.

**Recorded interpretive decision.** `EvaluationContextSource` has four values, but
`EvaluationContext` exposes only one `runtime_context` field for both Runtime Context and
Provisioning Context data (see
[`packages/core/src/model/contexts/evaluation-context.ts`](../../packages/core/src/model/contexts/evaluation-context.ts)).
The domain model has no structural way to tell them apart. `resolveResourceIdentity` therefore
treats a `context_authority_rules` entry of either `"runtime-context"` or `"provisioning-context"`
as referring to the same `evaluation_context.runtime_context` field. This is a recorded
ambiguity, not a resolved one — a future increment may need to revisit it if the domain model
ever gains a structural distinction between the two.

**Public API.** `resolveResourceIdentity`, `ResourceIdentityResolution`, and
`ContextResolutionDiagnostic` are exported only from
[`packages/core/src/evaluator/index.ts`](../../packages/core/src/evaluator/index.ts) (the
evaluator's internal module boundary), never from the package root — proven at compile time by
[`packages/core/test/types/context-resolution-fixtures.ts`](../../packages/core/test/types/context-resolution-fixtures.ts).
Internal helpers (`resolveAttribute`, per-plane resolvers, `policyFor`) are not exported at all.

## Context Resolution: Governance Context (implemented)

Milestone 2.3 implements `resolveGovernanceContext`, alongside `resolveResourceIdentity` under
[`packages/core/src/evaluator/context-resolution/`](../../packages/core/src/evaluator/context-resolution/):
a pure function `(input: ContextResolutionInput) => GovernanceContextResolution` that resolves
the Governance Context half of Context Resolution. It reuses the same Milestone 2.1
`ContextResolutionInput` contract unchanged, and the same `resolveAttribute` primitive
`resolveResourceIdentity` uses, applied to Governance Context's four attributes (`owner`,
`managed_by`, `cost_center`, `profile`).

**Output.** `GovernanceContextResolution` is a new internal type — `{ governance_context:
GovernanceContext; diagnostics: ReadonlyArray<ContextResolutionDiagnostic> }` — distinct from
the Milestone 2.1 `ContextResolutionResult`, which additionally requires a `resource_identity`
produced independently by `resolveResourceIdentity`. A caller composes both halves into
`ContextResolutionResult` at the call site; no new orchestration function is introduced by this
increment (see [Public API principles](#public-api-principles) — internal evaluator stages
remain implementation details until a concrete consumer need justifies more).

**Candidate sources implemented.** Convention Pack `governance_defaults` (lowest precedence,
including a default `profile`), the Naming Request's `governance` block, and its
`overrides.governance` block (highest precedence) — see
[`specification/context-resolution.md#resolution-sources`](../../specification/context-resolution.md#resolution-sources).

**Candidate sources not implemented, and why.** Two Specification-named sources are
deliberately absent rather than silently ignored:

- **Evaluation Context.** `EvaluationContext`, `RuntimeContext`, `SharedOrganizationalContext`,
  and `SharedDeploymentContext` model only organizational and deployment attributes (see
  [`packages/core/src/model/contexts/`](../../packages/core/src/model/contexts/)); none carries
  a governance-bearing field. Governance therefore has only one context-tier candidate —
  Convention Pack defaults — in the current domain model. A `context_authority_rules` entry
  declared for a governance attribute cannot match any Evaluation Context candidate and falls
  back to plain precedence, exactly as if no authority rule had been declared; this degrades
  safely rather than throwing (verified by a dedicated test).
- **Governance Profile defaults.** The Specification names this as a distinct precedence-5
  source — defaults declared by the *selected* Governance Profile itself, not by the Convention
  Pack (see
  [`specification/context-resolution.md#resolution-sources`](../../specification/context-resolution.md#resolution-sources)).
  No defaults-bearing type exists for it: `GovernanceProfileId` is a bare identifier alias (see
  [`packages/core/src/model/common/identifiers.ts`](../../packages/core/src/model/common/identifiers.ts)).
  Inventing one was out of scope for this increment (see [Deferred decisions](#deferred-decisions));
  only the selected profile identifier itself is resolved, the same as any other attribute.

**Failure representation.** Governance Context is always produced, even when it is incomplete or
empty: an unresolved required attribute or a rejected protected-value conflict is recorded as a
`ContextResolutionDiagnostic` — the same type `resolveResourceIdentity` uses — never thrown.

**Relationship with Resource Identity.** `resolveGovernanceContext` reads no Resource Identity
attribute and produces none: it consumes only `naming_request.governance`,
`naming_request.overrides.governance`, and `convention_pack.governance_defaults`. This matches
the Specification's statement that the two models "evolve independently" (see
[`specification/governance-context.md#relationship-with-resource-identity`](../../specification/governance-context.md#relationship-with-resource-identity)).
A dedicated integration test proves the two resolvers compose into `ContextResolutionResult` and
neither reads the other's request fields.

**Relationship with Convention Pack selection.** The same selected Convention Pack supplies both
identity defaults and governance defaults; `governance.profile` remains an independent selector
from `convention` (see
[`specification/naming-request.md`](../../specification/naming-request.md)) — selecting a
Convention Pack does not select a Governance Profile, and this resolver does not conflate the
two. `required_attributes`, `override_policy.protected_attributes`, and `context_authority_rules`
are all attribute-generic, dotted-path-keyed policies already defined by `ConventionPack` (see
[`packages/core/src/model/conventions/convention-pack.ts`](../../packages/core/src/model/conventions/convention-pack.ts));
no governance-specific policy shape was added. A dedicated test proves an unrelated (non-
governance) attribute path in any of these three policies does not affect governance resolution.

**Invariants.** Pure and deterministic (same input, same output); never mutates its input;
never produces a diagnostic for a source that simply does not supply a value; never invents a
governance default not supplied by some source; never infers a Governance Profile from a
resource or provider name.

**Governance inheritance.** The Specification does not define a governance inheritance model
(distinct from ordinary precedence over Convention Pack defaults, Naming Request values, and
overrides); none is implemented here, consistent with not inventing behavior the Specification
does not define.

**Public API.** `resolveGovernanceContext` and `GovernanceContextResolution` are exported only
from [`packages/core/src/evaluator/index.ts`](../../packages/core/src/evaluator/index.ts), never
from the package root — proven at compile time by
[`packages/core/test/types/governance-resolution-fixtures.ts`](../../packages/core/test/types/governance-resolution-fixtures.ts).

## Resource Projection (implemented)

Milestone 2.5 implements `projectResource`, under
[`packages/core/src/evaluator/resource-projection/`](../../packages/core/src/evaluator/resource-projection/):
a pure function `(resourceIdentity: ResourceIdentity, conventionPack: ConventionPack) =>
ProjectedResource` that determines which resolved Resource Identity attributes participate in a
generated name, and in what order, without rendering one.

**What Resource Projection is, and is not.** Resource Projection is **not** an independent
processing stage of the Specification — the Specification defines exactly two stages, Context
Resolution and Convention Evaluation (see
[Evaluation pipeline](#evaluation-pipeline)). It is an internal implementation increment *within*
Convention Evaluation, corresponding to the Specification's "Evaluate Convention" pipeline step,
which the Specification distinguishes from the following "Generate outputs" step (see
[`specification/convention-result.md#convention-evaluation-pipeline`](../../specification/convention-result.md#convention-evaluation-pipeline)).
Resource Projection therefore does **not**: render a final name; apply an abbreviation,
normalization, casing, or separator rule; truncate, hash, or resolve a collision; or generate
metadata (tags, labels, or annotations). Those remain later Convention Evaluation
responsibilities (increment 2.6), applied to Resource Projection's output.

**Why Governance Context does not participate.** The Specification ties
`naming_component_order` to "resolved identity components" only (see
[`specification/convention-pack.md#naming-projections`](../../specification/convention-pack.md#naming-projections));
no Convention Pack field ties a Governance Context attribute into naming component order, and no
metadata projection mapping exists anywhere in the current domain model (see
[`packages/core/src/model/conventions/convention-pack.ts`](../../packages/core/src/model/conventions/convention-pack.ts)'s
documented deferral of normalization and metadata projection shapes). Resource Projection
therefore consumes only a resolved `ResourceIdentity` and the selected `ConventionPack` — not
`GovernanceContext` and not `ResourceDefinition`, neither of which currently influences which
naming components a resource projects (see [Increment plan](#increment-plan)).

**Output.** `ProjectedResource` is a new internal type — `{ components:
ReadonlyArray<ProjectedNamingComponent> }` — where each `ProjectedNamingComponent` carries the
dotted `attribute` path, the Resource Identity `plane` it was resolved from, its resolved `value`
(copied verbatim, never normalized or abbreviated), and whether the selected Convention Pack's
`required_attributes` declares it `required`. No `order` field is included: array position alone
represents ordering, matching how `naming_component_order` itself is expressed as an ordered
list, and avoiding a redundant, independently-mutable duplicate of that same fact. No
`abbreviation` field is included either: any consumer that already has the selected
`ConventionPack` can look one up via `conventionPack.abbreviations?.[component.attribute]`
directly, so copying it onto every component would duplicate existing data without establishing
a new invariant.

**Component inclusion and omission.** For each dotted path in the selected Convention Pack's
`naming_component_order`, in order: an unrecognized path — one matching no known Resource
Identity attribute — is omitted entirely, regardless of whether it is declared required, since
neither its value nor its originating plane can be resolved faithfully. A recognized path whose
value is absent and not required is an **absent optional component** and is omitted entirely,
consistent with the Specification's statement that a Convention Pack determines "which components
may be omitted for a given resource." A recognized path whose value is absent but *is* required
is still included, with `value: undefined`, so a missing required component is never silently
converted into an omitted optional one — detecting and reporting that condition is deferred to
Convention Evaluation's validation increment (2.6), not decided here.

**Failure representation.** `projectResource` never throws and returns no diagnostics array: its
only expected-but-incomplete condition — a required component with no resolved value — is
represented structurally, as `required: true` paired with `value: undefined` on the affected
component, not as a separate diagnostic. A dedicated diagnostic was deliberately not introduced:
the same underlying condition (a Convention-Pack-required attribute unresolved) is already
diagnosed once, generically, by `resolveResourceIdentity` and `resolveGovernanceContext`'s
`unresolved-required-attribute` `ContextResolutionDiagnostic` (see [Context Resolution: Resource
Identity (implemented)](#context-resolution-resource-identity-implemented)); re-diagnosing the
same fact through a second, projection-specific diagnostic type would duplicate that existing
diagnostic rather than represent new information.

**Invariants.** Pure and deterministic (same inputs, same output); never mutates `resourceIdentity`
or `conventionPack`; every retained component's `value` is copied verbatim from the resolved
Resource Identity, never defaulted, normalized, or transformed; component order always matches
`naming_component_order`'s own order; `ProjectedResource` carries no rendered name and no
metadata.

**Public API.** `projectResource`, `ProjectedResource`, `ProjectedNamingComponent`, and
`ProjectedNamingComponentPlane` are exported only from
[`packages/core/src/evaluator/index.ts`](../../packages/core/src/evaluator/index.ts), never from
the package root — proven at compile time by
[`packages/core/test/types/resource-projection-fixtures.ts`](../../packages/core/test/types/resource-projection-fixtures.ts).

## Convention Evaluation Rules (implemented)

Milestone 2.6 implements `evaluateConvention`, under
[`packages/core/src/evaluator/convention-evaluation/`](../../packages/core/src/evaluator/convention-evaluation/):
a pure function `(input: ConventionEvaluationInput) => ConventionResult` that reuses the
Milestone 2.1 `ConventionEvaluationInput` contract unchanged (see [Contracts considered and
rejected](#contracts-considered-and-rejected) — no new intermediate contract was introduced) and
assembles the final `ConventionResult` (see
[`specification/convention-result.md`](../../specification/convention-result.md)).

**Rule inventory and scope gate.** Before writing any code, every candidate Convention
Evaluation behavior described in prose by the Specification was checked against the current
frozen Specification and Executable Domain Model for a genuine, executable rule — not merely a
named concept:

| Candidate rule | Specification source | Executable today? |
| --- | --- | --- |
| Required-attribute completeness | [`specification/convention-pack.md#required-attributes`](../../specification/convention-pack.md#required-attributes) | **Yes** — implemented |
| Naming rendering (joining projected components into a name) | [`specification/convention-result.md#convention-evaluation-pipeline`](../../specification/convention-result.md#convention-evaluation-pipeline) | No — no separator or casing rule is defined anywhere |
| Abbreviation application | [`ConventionPack.abbreviations`](../../packages/core/src/model/conventions/convention-pack.ts) | No — the Specification never defines what text an abbreviation replaces |
| Normalization | [`ResourceDefinition.rendering_constraints.normalization`](../../packages/core/src/model/definitions/resource-definition.ts) | No — documented as free text, not a machine-executable rule |
| Separators, casing, truncation, hashing | *(none — not named as structured data anywhere)* | No — no field or normative rule defines any of these |
| Metadata projection (Tags, Labels, Annotations) | [`specification/convention-result.md#conceptual-contents`](../../specification/convention-result.md#conceptual-contents) | No — `ConventionPack` has no metadata projection mapping field at all |
| Resource Definition technical-constraint validation (`max_length`, `allowed_characters`) | [`ResourceDefinition.rendering_constraints`](../../packages/core/src/model/definitions/resource-definition.ts) | No — validating these requires a rendered name, which naming rendering above cannot yet produce |
| Placement Constraint validation | [`ResourceDefinition.placement_constraints`](../../packages/core/src/model/definitions/resource-definition.ts) | No — documented as free-form prose with no formal grammar |
| Collision / uniqueness handling | [`ResourceDefinition.identity_constraints`](../../packages/core/src/model/definitions/resource-definition.ts) | No — proving uniqueness needs an external registry, which the evaluator must not consult |

Required-attribute completeness is the only row this increment implements; every other row is a
genuine, cited, blocking gap in the Specification or Executable Domain Model, not an oversight —
each is also documented as a "deliberately not implemented" case directly in
[`evaluate-convention.ts`](../../packages/core/src/evaluator/convention-evaluation/evaluate-convention.ts).

Milestone 2.6.1 formalizes this same boundary — every capability named in this document,
classified consistently as Executable, Modelled but not executable, Conceptual only, External,
or Deferred, with full repository citations — in
[`docs/architecture/convention-evaluation-executability.md`](convention-evaluation-executability.md).
That document is the authoritative, detailed status reference; this section is not repeated or
superseded by it.

**What the implemented rule checks.** For every dotted attribute path in the selected
Convention Pack's `required_attributes`, `evaluateConvention` resolves its value against the
`ContextResolutionResult` — spanning `ResourceIdentity`'s three planes (organizational,
deployment, functional) and `GovernanceContext` — using an internal, exhaustive accessor table
keyed the same way `resolveResourceIdentity`, `resolveGovernanceContext`, and `projectResource`
key their own attribute tables (see [Context Resolution: Resource Identity
(implemented)](#context-resolution-resource-identity-implemented) and [Resource Projection
(implemented)](#resource-projection-implemented)). This check is independent of, and does not
reuse, Context Resolution's own `unresolved-required-attribute` `ContextResolutionDiagnostic`:
`ContextResolutionResult` carries forward only `resource_identity` and `governance_context`, not
diagnostics (see [Pipeline contracts (implemented)](#pipeline-contracts-implemented)), so
Convention Evaluation re-checks completeness itself, independently, at its own pipeline stage.
An attribute path with no matching accessor — an unrecognized or mistyped entry — naturally
resolves to `undefined` through the same generic lookup, and is therefore honestly treated as
unresolved, with nothing fabricated for it; no special-case branch was needed, unlike Resource
Projection's need to actively omit unrecognized `naming_component_order` entries.

**Resolving the deferred question.** This increment resolves the question recorded in [Deferred
decisions](#deferred-decisions) ("Required-but-unresolvable attribute handling"): a
`ConventionResult` is still produced when a required attribute cannot be resolved, matching the
Specification's own pipeline, which reaches "Produce Convention Result" even when validation
fails (see [Validation and diagnostics](#validation-and-diagnostics)). `validation.valid` is
`false` and `validation.failures` contains one `ConventionValidationFailure` per unresolved
required attribute; `evaluateConvention` never throws for this condition.

**Output shape.** `outputs` is always `{}` in this increment: no `name` and no `metadata` are
generated, since every rule that would produce either (see the rule inventory above) remains
blocked. `warnings` is never populated, since every currently-implementable warning-worthy
transformation (for example, normalization) is itself unimplemented. `resource_identity` and
`governance_context` are copied through from the `ContextResolutionResult` unchanged.
`resource_definition` is accepted on the input but deliberately not read anywhere in this
increment's logic, since every `ResourceDefinition`-based rule is currently blocked (see the rule
inventory above); this is a documented, temporary limitation, not an oversight.

**Invariants.** Pure and deterministic (same input, same output); never mutates `resolved_context`,
`resource_definition`, or `convention_pack`; never throws for an unresolved required attribute;
`explanation` is a deterministic summary of how many required attributes were checked and how
many, if any, were unresolved, naming the Convention Pack's `id`.

**Public API.** `evaluateConvention` is exported only from
[`packages/core/src/evaluator/index.ts`](../../packages/core/src/evaluator/index.ts), never from
the package root — proven at compile time by
[`packages/core/test/types/convention-evaluation-fixtures.ts`](../../packages/core/test/types/convention-evaluation-fixtures.ts).

## Code scaffold

`packages/core/src/evaluator/` contains the Milestone 2.1 pipeline contracts (`contracts/`), the
Milestone 2.2/2.3 Context Resolution resolvers (`context-resolution/`: `resolveResourceIdentity`
and `resolveGovernanceContext`), the Milestone 2.5 Resource Projection function
(`resource-projection/`: `projectResource`), and the Milestone 2.6 Convention Evaluation Rules
function (`convention-evaluation/`: `evaluateConvention`, implementing required-attribute
completeness validation only — abbreviation application, normalization, separators, casing,
truncation, hashing, metadata projection, and Resource Definition constraint validation remain
unimplemented, see [Convention Evaluation Rules
(implemented)](#convention-evaluation-rules-implemented)). No public `evaluate()` function exists
yet. Increment 2.4 (Resource Convention Preparation / Resource Definition selection) added no
folder or code at all, per its design gate (see [Increment plan](#increment-plan)).

## Deferred decisions

- **Final evaluator function signature** — aggregate input object versus explicit arguments
  (see [Inputs and outputs](#inputs-and-outputs)). The 2.1 pipeline contracts fix the internal
  stage boundaries but deliberately do not answer this question — none of them are exported
  from the package root. `resolveResourceIdentity` (2.2) resolves a narrower question — it
  reuses `ContextResolutionInput` as-is — without deciding the eventual public `evaluate()`
  signature. To be decided once a public API is actually needed.
- **Internal error representation** — no exception hierarchy is designed yet; only the working
  assumption that expected evaluation outcomes belong in `ConventionResult` (see [Validation
  and diagnostics](#validation-and-diagnostics)). Increment 2.2 applies the same assumption at
  the Context Resolution stage via `ContextResolutionDiagnostic` (see [Context Resolution:
  Resource Identity (implemented)](#context-resolution-resource-identity-implemented)).
- **Required-but-unresolvable attribute handling** — resolved for the identity slice by
  increment 2.2, and applied identically to governance attributes by increment 2.3: an
  unresolved required attribute is recorded as a `ContextResolutionDiagnostic`, and the
  corresponding canonical model (`ResourceIdentity` or `GovernanceContext`) is still produced
  (see [Context Resolution: Resource Identity (implemented)](#context-resolution-resource-identity-implemented)
  and [Context Resolution: Governance Context (implemented)](#context-resolution-governance-context-implemented)).
  Increment 2.6 resolves the remaining question for Convention Evaluation itself: a
  `ConventionResult` is still produced when a required attribute cannot be resolved, with
  `validation.valid: false` and a `ConventionValidationFailure` per unresolved attribute, never
  thrown (see [Convention Evaluation Rules (implemented)](#convention-evaluation-rules-implemented)).
- **Governance Profile defaults representation** — the Specification names "Governance Profile
  defaults" as a resolution source (see
  [`specification/context-resolution.md#resolution-sources`](../../specification/context-resolution.md#resolution-sources)),
  but no defaults-bearing type exists in the domain model yet — `GovernanceProfileId` remains a
  bare identifier alias. Increment 2.3 deliberately did not invent one; only the selected
  profile identifier itself is resolved, the same as any other Convention-Pack-defaulted
  attribute. Introducing this type remains open for a future increment, once a concrete need
  demonstrates what a Governance Profile's own defaults should contain.
- **Evaluation Context has no governance-bearing field** — a second, related domain-model gap
  recorded by increment 2.3: `EvaluationContext` and its constituent types carry only
  organizational and deployment attributes, never governance ones (see [Context Resolution:
  Governance Context (implemented)](#context-resolution-governance-context-implemented)). Adding
  one remains open for a future increment, alongside the Governance Profile defaults question
  above, since both would need to be considered together.
- **Runtime Context versus Provisioning Context authority disambiguation** — `EvaluationContextSource`
  has distinct `"runtime-context"` and `"provisioning-context"` values, but `EvaluationContext`
  exposes only one field for both. Increment 2.2 treats both labels as referring to the same
  field (see [Context Resolution: Resource Identity
  (implemented)](#context-resolution-resource-identity-implemented)); revisit only if the domain
  model ever gains a structural distinction between the two.
- **Whether input runtime validation belongs in `core` or at an integration boundary** — no
  runtime schema library is selected (already tracked in
  [`IMPLEMENTATION.md#deferred-decisions`](../../IMPLEMENTATION.md#deferred-decisions)).
- **Exact stage boundaries within Convention Evaluation Rules, beyond required-attribute
  validation** — the Specification permits more than one faithful split within "generate
  outputs" and "validate outputs" (for example, whether normalization happens before or
  interleaved with generation, or how abbreviation application, metadata projection, and
  validation are internally sequenced); increment 2.5's boundary (Resource Projection: component
  selection and ordering only, no rendering) is fixed by this document, and increment 2.6 adds
  required-attribute completeness validation as its own independent check (see [Convention
  Evaluation Rules (implemented)](#convention-evaluation-rules-implemented)), but the internal
  structure of every other Convention Evaluation rule (naming rendering, abbreviation,
  normalization, metadata projection) remains undecided until the Specification defines the
  missing mechanisms each one needs (see the rule inventory in [Convention Evaluation Rules
  (implemented)](#convention-evaluation-rules-implemented)).
- **Diagnostics aggregation across Context Resolution's two halves** — `resolveResourceIdentity`
  and `resolveGovernanceContext` each return their own `diagnostics` array (see [Context
  Resolution: Resource Identity (implemented)](#context-resolution-resource-identity-implemented)
  and [Context Resolution: Governance Context
  (implemented)](#context-resolution-governance-context-implemented)); `ContextResolutionResult`
  does not aggregate them, and no type does today. Increment 2.6 does not aggregate them either:
  required-attribute completeness is re-checked independently against `ContextResolutionResult`
  itself, not derived from these diagnostics (see [Convention Evaluation Rules
  (implemented)](#convention-evaluation-rules-implemented)). Combining Context Resolution's
  diagnostics — and, later, Convention Evaluation's own — into `ConventionResult.explanation` and
  `ConventionResult.warnings` remains open for a future increment, once naming rendering,
  abbreviation application, and normalization exist to produce warning-worthy conditions.
- **Full executability status** — the deferred items above are restated, alongside every other
  Convention Evaluation capability the Specification names, with full citations and an explicit
  prioritization and recommendation, in
  [`docs/architecture/convention-evaluation-executability.md`](convention-evaluation-executability.md)
  (Milestone 2.6.1). Consult that document for the authoritative, capability-by-capability status;
  this list remains the narrower, increment-scoped record of decisions made while implementing
  2.2–2.6.
