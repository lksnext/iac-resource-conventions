# Specification

This directory contains the Specification for `iac-resource-conventions`.

## Specification Status

**Current version:** Specification v1.1
**Status:** Additive extension of the frozen v1.0 baseline

The conceptual Specification described in this directory — Resource Identity,
Governance Context, Naming Request, Context Resolution, Resource Definition, Convention
Pack, and Convention Result — is stable. Future conceptual changes should only be
introduced when real implementation experience demonstrates that the current model is
insufficient.

Specification v1.0 is preserved, unchanged, at the `specification-v1.0` git tag. It
never defined enough naming semantics for deterministic execution (see
[`docs/architecture/convention-evaluation-executability.md`](../docs/architecture/convention-evaluation-executability.md)).
Specification v1.1 adds exactly the normative naming semantics needed to close that gap,
additively, without redefining any v1.0 concept — see [Specification v1.1: Executable
Naming](#specification-v11-executable-naming) below.

The Reference Evaluator, Resource Definitions, Convention Packs, and adapters are
expected to validate this Specification rather than redefine it. (The Reference
Evaluator is the reference implementation of Convention Evaluation; this document also
refers to it as the Convention Engine — see [Architecture](#architecture) below.)

Being additively extended does not mean immutable: further evolution is still allowed
when justified by implementation evidence (see [Future evolution](#future-evolution)
below).

## Specification v1.1: Executable Naming

Specification v1.1 adds the minimum normative semantics required to make naming
deterministically executable by the Reference Evaluator. It changes three documents:
[`convention-pack.md`](./convention-pack.md#naming-projections) (component ordering,
separator, casing, abbreviation, and naming rule execution order semantics),
[`resource-identity.md`](./resource-identity.md#canonical-attribute-references) (the
canonical attribute-reference vocabulary naming rules use to address Resource Identity
attributes), and [`convention-result.md`](./convention-result.md) (a clarification that
`outputs.name` is now deterministically computable). It also updates the concrete
[`aws-workload-default`](./convention-packs/aws-workload-default.md) Convention Pack to
use the new fields.

### Scope

Specification v1.1 defines, normatively:

- a closed, canonical attribute-reference vocabulary for the Resource Identity
  attributes a naming rule may address;
- component ordering semantics for `naming_component_order`;
- separator semantics (a new `separator` field);
- casing semantics (a new `casing` field, with a closed `preserve` / `lower` / `upper`
  vocabulary);
- abbreviation semantics (a reshaped, component-scoped `abbreviations` field);
- a single normative naming rule execution order that ties the above together
  deterministically;
- a required length-measurement unit for `resource-definition.md`'s
  `rendering_constraints.max_length` (a new closed `code_points` / `utf8_bytes`
  `length_unit` field; see [Length-unit clarification](#length-unit-clarification)
  below).

### Delta from Specification v1.0

| Field | v1.0 | v1.1 |
| --- | --- | --- |
| `naming_component_order` | Described in prose only; ordering, omission, and invalid-reference behavior were not formalized. | Same field name and shape; ordering, duplicate-, unknown-, and absent-component behavior are now normative. Additive. |
| `separator` | Did not exist. | New, optional; defaults to `""` (no separator) when omitted. Additive. |
| `casing` | Did not exist. | New, optional; defaults to `preserve` when omitted. Additive. |
| `abbreviations` | Sketched only as an under-specified `Record<string, string>`; no code read it and no concrete Convention Pack defined it (see [`docs/architecture/convention-evaluation-executability.md`](../docs/architecture/convention-evaluation-executability.md)). | Reshaped to `Record<attributeReference, Record<exactValue, abbreviation>>`, scoped per canonical attribute reference. **This is a shape change**, called out here for visibility per this task's own instructions, even though it changes no currently executing behavior (no evaluator code reads `abbreviations` yet) and no concrete Convention Pack defines one yet. |
| `rendering_constraints.length_unit` | Did not exist; `max_length`'s measurement unit was left undefined in prose, and the Reference Evaluator's own choice of Unicode code points (implementation increment 2.7.1) was documented as an implementation-scoped decision, not a Specification rule. | New; required whenever `rendering_constraints.max_length` is declared, from a closed `code_points` / `utf8_bytes` vocabulary (see [`resource-definition.md`](./resource-definition.md#rendering-constraints)). **This is a breaking change, contained to Resource Definitions that already declare `max_length`**: they must now also declare `length_unit`; see [Length-unit clarification](#length-unit-clarification) below. |

At the time Specification v1.1 was drafted, no previously executable behavior changed:
the Reference Evaluator had not yet implemented naming rule execution (that was planned
as implementation increment 2.6.2 — Executable Naming Rules; see
[`IMPLEMENTATION.md`](../IMPLEMENTATION.md)), so this Specification update had no effect
on any output a caller observed at the time. Implementation increment **2.6.2 —
Executable Naming Rules** has since implemented this naming rule execution, and
increment **2.6.3 — Executable Naming Conformance** closed two conformance gaps found in
it (duplicate `naming_component_order` reference rejection, and a casing wording
correction); see [`IMPLEMENTATION.md`](../IMPLEMENTATION.md) for current milestone
status.

### Length-unit clarification

Specification v1.1 originally defined `max_length` validation only in prose, without
normatively defining the unit it counts. Implementation increment 2.7.1 made
`max_length` validation executable, but had to choose a length unit (Unicode code
points) to do so; that choice was documented as implementation-scoped, not normative,
because two independently conforming Reference Evaluator implementations could
otherwise measure the same generated name differently and disagree on validity.

This is now closed: [`resource-definition.md`](./resource-definition.md#rendering-constraints)
normatively requires a Resource Definition that declares `rendering_constraints.max_length`
to also declare `rendering_constraints.length_unit`, from a closed `code_points` /
`utf8_bytes` vocabulary. This is a clarification of Specification v1.1's existing
`max_length` concept — it does not introduce a new naming capability — so it does not
warrant a new Specification version label; it is recorded here, in the Delta table
above, and in [`convention-pack.md`](./convention-pack.md#naming-rule-examples)'s
"Validation without truncation" example, the same way increment 2.6.3 recorded its own
conformance corrections without a new version label (see [Future
evolution](#future-evolution) below and
[`AGENTS.md`](../AGENTS.md#compatibility-and-versioning) for this repository's
versioning policy).

### Specification v1.1 Non-Goals

Specification v1.1 intentionally does **not** define:

- metadata projection (tags, labels, annotations) semantics;
- a general normalization language beyond casing (whitespace collapsing, diacritic
  stripping, character substitution);
- an `allowed_characters` grammar;
- automatic truncation when a generated name exceeds `max_length`;
- hashing or collision-avoidance strategies;
- global uniqueness verification or a uniqueness registry;
- an executable Placement Constraint grammar;
- Governance Profile loading or defaults;
- a diagnostics-aggregation architecture;
- provider-specific naming engines;
- runtime Convention Pack resolution;
- a JSON Schema for Convention Pack (Convention Pack remains Markdown + TypeScript-only,
  consistent with v1.0 — see [`convention-pack.md`](./convention-pack.md#out-of-scope)).

These remain deferred, unchanged from Specification v1.0's own scope, until
implementation evidence demonstrates a genuine need to address them.

## Purpose

The Specification defines the conventions for Infrastructure as Code (IaC) resources —
naming, identity, governance context, tags, labels, annotations, metadata, and
validation — independently of any cloud provider, tool, or programming language. It
exists so that conventions are defined once, in one place, using a shared vocabulary,
rather than being reinvented or reinterpreted by each tool that needs to apply them.

## Design Principles

The Specification is built around a small set of architectural principles:

- Specification First
- Implementation-independent concepts
- Canonical resource identity
- Separation of identity, governance, resource definition, and convention policy
- Evidence-driven evolution
- Cross-tool interoperability

## The Specification is the single source of truth

Every concept an adapter relies on — identity, governance context, naming, tagging,
validation — is defined here first. If a rule is not defined in the Specification, it
does not yet exist as a project convention. Adapters do not introduce new conventions;
they render the conventions defined in the Specification into a form appropriate for
their platform.

## Adapters consume the Specification

Terraform, AWS CDK, Ansible, the CLI, and any future adapter are consumers of the
Specification. Each adapter reads and interprets the concepts and rules described here to
produce results appropriate to its own tooling. Because every adapter draws from the same
Specification, resources produced by different adapters remain consistent with one
another for the same canonical input.

## What belongs here

- Independent conceptual and domain models — Resource Identity (what a resource is),
  Governance Context (how a resource is owned and governed), Resource Definition (the
  technical rules for a kind of resource), and Convention Pack (how canonical models are
  projected into platform-specific conventions) are modeled as separate, independent
  concepts.
- Public request/response contracts (for example, the Naming Request and the Convention
  Result).
- The conceptual model of how these pieces are combined (Context Resolution) and
  evaluated (Convention Evaluation).
- JSON Schemas describing the structure of the models that already have one.
- Concrete Specification Artifacts that apply a Concept to a specific organizational
  policy, written as Markdown policy documents (for example, the concrete Convention
  Packs under [`convention-packs/`](./convention-packs/)). See **Concepts and
  Specification Artifacts** below.
- Reusable convention dimension Concepts that an effective Convention Pack may compose —
  Platform Convention, Organization Convention, and Deployment Convention — documented under
  [`policies/`](./policies/).

## What does not belong here

- Terraform, AWS CDK, Ansible, or CLI code.
- Tool-specific syntax or rendering logic.
- Cloud-provider-specific implementation details.
- YAML, JSON, or generated representations of a Convention Pack; Resource Definitions
  catalog entries; or Context Providers — these are configuration and implementation
  concerns that consume the Specification's concepts, not part of the conceptual
  Specification itself.

Those concerns belong to adapters, which are introduced in later iterations of this
project.

## Concepts and Specification Artifacts

The Specification now contains two kinds of content:

- **Concepts** — the abstract, reusable domain models documented directly under
  `specification/` (for example, Resource Identity, Governance Context, Naming Request,
  Context Resolution, Resource Definition, the abstract Convention Pack concept, and
  Convention Result). A Concept answers a general question that applies to every
  organization adopting the Specification, independently of any specific organizational
  policy.
- **Specification Artifacts** — concrete instances that apply a Concept to a specific
  organizational policy. The first Specification Artifacts are the concrete Convention
  Packs under [`convention-packs/`](./convention-packs/), starting with
  [`convention-packs/aws-workload-default.md`](./convention-packs/aws-workload-default.md).
  A Specification Artifact applies a Concept; it does not redefine it. See
  [`convention-packs/README.md`](./convention-packs/README.md) for the full
  distinction.

Concrete Convention Packs remain Markdown policy documents in this iteration of the
Specification. YAML, JSON, or generated representations of a Convention Pack are not
yet defined (see **What does not belong here** above).

## Contents

The Specification currently consists of the following Concepts and Specification
Artifacts:

- [`resource-identity.md`](./resource-identity.md) — the canonical domain model for
  identifying a resource: what it is.
- [`governance-context.md`](./governance-context.md) — the canonical domain model for
  how a resource is owned and governed.
- [`naming-request.md`](./naming-request.md) — the public request contract used to
  produce a Resource Identity and Governance Context.
- [`context-resolution.md`](./context-resolution.md) — how a Naming Request is resolved,
  with a Convention Pack and shared context, into Resource Identity and Governance
  Context.
- [`resource-definition.md`](./resource-definition.md) — the technical characteristics
  and constraints of a canonical resource type.
- [`convention-pack.md`](./convention-pack.md) — the Specification artifact that
  defines how canonical models are projected into platform-specific conventions, and
  how an effective Convention Pack may compose reusable Platform Convention, Organization
  Convention, and Deployment Convention dimensions.
- [`policies/`](./policies/) — the reusable convention dimension Concepts — Platform
  Convention, Organization Convention, and Deployment Convention — that an effective
  Convention Pack may compose.
- [`convention-packs/`](./convention-packs/) — concrete Convention Packs that apply the
  Convention Pack concept to a specific organizational policy.
- [`convention-result.md`](./convention-result.md) — the conceptual output produced by
  Convention Evaluation.
- [`schemas/`](./schemas/) — JSON Schema definitions for the models described above that
  already have one.

## Architecture

These documents describe independent concepts that are combined into a single
conceptual pipeline:

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

- **Naming Request** — the minimal, user-supplied description of the resource being
  requested (see [`naming-request.md`](./naming-request.md)).
- **Convention Pack** — a Specification artifact, selected via the request's
  `convention` field, that defines how canonical models are projected into
  platform-specific conventions: naming defaults, deployment defaults, governance
  defaults, abbreviations, ordering rules, metadata projection, and override policy (see
  [`convention-pack.md`](./convention-pack.md)). An effective Convention Pack may be
  assembled from reusable Platform Convention, Organization Convention, and Deployment
  Convention dimensions (see [`policies/`](./policies/)), but it remains the single
  artifact selected via `convention`. Convention Packs are currently defined as
  conceptual Markdown Specification Artifacts; machine-readable or executable
  representations are intentionally out of scope for this iteration (see **What does
  not belong here** above).
- **Evaluation Context** — the complete set of external facts available during a
  specific evaluation, including shared organizational context, shared deployment
  context, Runtime Context, and Provisioning Context (see
  [`context-resolution.md`](./context-resolution.md#evaluation-context)). It is not part
  of the Convention Pack.
- **Context Resolution** — the process that combines the Naming Request, the Convention
  Pack, and Evaluation Context into complete canonical models. Context Resolution only
  produces canonical models; it does not generate names, tags, labels, annotations, or
  other platform-specific outputs — those belong to Convention Evaluation (see
  [`context-resolution.md`](./context-resolution.md)).
- **Resource Identity** — the canonical, three-plane model describing what the resource
  is (see [`resource-identity.md`](./resource-identity.md)).
- **Governance Context** — the canonical model describing who owns, pays for, and
  manages the resource (see [`governance-context.md`](./governance-context.md)).
- **Resource Definition** — the technical characteristics and constraints of the
  resource's canonical resource type; it is selected (looked up) from the resolved
  `resource_type` once Resource Identity is complete, and participates in Convention
  Evaluation as an input (see [`resource-definition.md`](./resource-definition.md)).
- **Convention Evaluation** — evaluates the Specification against Resource Identity,
  Governance Context, and the resource's Resource Definition to produce
  platform-specific outputs. This is the Specification responsibility that generates
  names, tags, labels, and annotations; a future software component that implements it
  may be called the Convention Engine.
- **Convention Result** — the final output returned to the caller (see
  [`convention-result.md`](./convention-result.md)).

The pipeline has exactly two processing stages: Context Resolution and Convention
Evaluation. The Naming Request, Convention Pack, Evaluation Context, Resource Identity,
Governance Context, Resource Definition, and Convention Result are domain models or
Specification artifacts consumed or produced by those two stages — not processing
stages themselves.

Convention Pack, the Naming Request, and Evaluation Context are all inputs to Context
Resolution. Resource Definition is an input to Convention Evaluation, selected by
`resource_type` once Resource Identity is complete — Context Resolution does not
resolve the Resource Definition.

Composing an effective Convention Pack from Platform Convention, Organization
Convention, and Deployment Convention (see
[`convention-pack.md`](./convention-pack.md#composed-from-reusable-convention-dimensions))
is a Specification Artifact authoring concern, not a third processing stage.

Likewise, external provisioning systems and IaC processes that produce Provisioning Context are
outside this pipeline (see
[`context-resolution.md`](./context-resolution.md#business-to-infrastructure-boundary)).

If a document only focuses on one part of this pipeline, it uses a simplified diagram
showing just the concepts relevant to it. Every diagram in the Specification is expected
to be consistent with the canonical pipeline shown above.

## Schema identifiers

During this pre-1.0 phase, JSON Schema `$id` values use the canonical raw GitHub location
on the default branch (for example,
`https://raw.githubusercontent.com/lksnext/iac-resource-conventions/main/specification/schemas/resource-identity.schema.json`).
These URIs are not yet immutable release contracts; they may be revisited once the
project adopts versioned schema releases.

## Future evolution

The conceptual Specification was frozen as v1.0 and is expected to evolve over time.
Specification v1.1 (see [Specification v1.1: Executable
Naming](#specification-v11-executable-naming) above) is the first such evolution: an
additive naming-semantics extension driven by the Reference Evaluator's own
implementation experience, not a theoretical redesign. Future changes should follow
these principles:

- **Implementation first** — build the Reference Evaluator, a Resource Definition
  catalog, executable Convention Packs, and adapters before revisiting conceptual
  models.
- **Evidence over speculation** — only propose a conceptual change when real
  implementation work demonstrates the current model cannot represent a valid
  scenario, not because a theoretical improvement seems plausible.
- **Backward compatibility whenever possible** — prefer additive, non-breaking changes
  to existing concepts, schemas, and Specification Artifacts.
- **Semantic versioning** — conceptual changes that break compatibility require a new
  major Specification version (see
  [`AGENTS.md`](../AGENTS.md#compatibility-and-versioning)).
- **No conceptual changes without demonstrated need** — do not redesign a Concept
  documented here unless implementation evidence justifies it.
