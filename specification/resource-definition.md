# Resource Definition

A Resource Definition describes the technical characteristics of a canonical resource
type, independently of any specific resource instance. Where
[Resource Identity](./resource-identity.md) describes *what a particular resource is*,
a Resource Definition describes *what a kind of resource can be* — the technical shape
and constraints that every instance of that resource type must respect.

## Purpose

**Purpose:** "What are the technical rules for this kind of resource?"

Resource Identity's Functional Identity plane includes a `resource_type` attribute —
the canonical technical resource kind (see [`resource-identity.md`](./resource-identity.md)).
A Resource Definition is the technical specification referenced by that `resource_type`.
It exists so that Convention Evaluation and adapters can apply resource-type-specific
rules consistently, instead of re-deriving them ad hoc for every resource.

## Responsibilities

A Resource Definition is conceptually responsible for describing a resource type's
canonical identifier, platform, and category, along with the identity constraints and
rendering constraints that every instance of that resource type must respect:

- **Canonical identifier** — the stable identifier for the resource type (the value used
  as `resource_type` in a Resource Identity).
- **Platform** — the infrastructure platform the resource type belongs to (for example,
  AWS, Azure, or Kubernetes).
- **Category** — a broader technical grouping the resource type belongs to (for example,
  storage, compute, networking).

### Identity constraints

Identity constraints define the identity characteristics of a resource type — whether
and how instances of it must be distinguished from one another:

- **Uniqueness** — whether names or identifiers for this resource type must be unique
  within an account, a region, a namespace, or globally.
- **Scope** — the administrative or isolation boundary within which uniqueness and other
  identity rules apply.
- **Global visibility** — whether the resource type is global or bound to a specific
  location, affecting whether `location` is meaningful for it.

### Rendering constraints

Rendering constraints define how a valid representation of the resource type must be
generated:

- **Technical constraints** — limits inherent to the resource type itself, such as
  maximum length, allowed characters, casing, and separators imposed by the underlying
  platform.
- **Normalization requirements** — how raw input must be transformed to produce a valid
  value for this resource type (for example, lower-casing, character substitution, or
  truncation rules).
- **Provider-specific capabilities** — technical capabilities or limitations specific to
  the platform or provider that Convention Evaluation must respect when generating
  outputs for this resource type.

This list describes the conceptual responsibilities of a Resource Definition. It is not
an exhaustive attribute list, and no schema is defined for it yet.

## Relationship with Resource Identity

A Resource Definition is selected through Resource Identity's Functional Identity plane:

```text
Resource Identity
    -> functional.resource_type
        -> Resource Definition
```

`resource_type` is the link between the two models: Resource Identity identifies a
specific resource, and its `resource_type` value selects the Resource Definition that
describes the technical rules that resource must follow. Resource Identity remains
canonical and independent — it does not embed a Resource Definition's technical details
directly; it only references one by `resource_type`.

## Relationship with Convention Evaluation

Convention Evaluation consults a resource's Resource Definition, alongside its
[Resource Identity](./resource-identity.md) and [Governance Context](./governance-context.md),
when evaluating conventions and generating outputs. Technical constraints declared by
the Resource Definition (for example, maximum name length or allowed characters)
constrain how Convention Evaluation generates a name, and inform the validation and
warnings included in the resulting [Convention Result](./convention-result.md).

## Out of scope for this document

This document defines the *concept* of a Resource Definition only. It intentionally does
not:

- Define an actual catalog of resource types.
- Define concrete AWS, Azure, or Kubernetes resource types.
- Define a JSON Schema for Resource Definitions.

These are left for a later iteration of the Specification, once the conceptual model has
been validated.

## Where Resource Definition fits

```mermaid
flowchart TD
    RI["Resource Identity"] --> RD["Resource Definition"]
    RD --> CE["Convention Evaluation"]
```

This is a focused view of the pipeline described in
[`specification/README.md`](./README.md#architecture); it shows only how Resource
Definition relates to Resource Identity and Convention Evaluation.
