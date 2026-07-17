# Platform Policy

Platform Policy is a reusable policy dimension that an effective
[Convention Pack](../convention-pack.md) may compose. It answers:

**Purpose:** "How should conventions be projected for this target infrastructure
platform?"

Platform Policy captures the parts of an effective Convention Pack that depend on the
target infrastructure platform, so the same platform-oriented policy can be reused
across different organizations, deployment models, and Convention Packs, instead of
being redefined every time an organization adopts a new platform.

## Initial platforms

This iteration of the Specification anticipates Platform Policy for at least:

- AWS
- Azure
- Kubernetes

Additional platforms may be added later without changing this conceptual model.

## Responsibilities

Platform Policy may define or contribute:

- a platform identifier (for example, `aws`, `azure`, or `kubernetes`);
- platform-level naming style, such as preferred casing or separators for the platform;
- region or location abbreviations used when projecting `deployment.location`;
- metadata projection conventions for the platform — for example, how Resource Identity
  and Governance Context map onto AWS Tags, Azure Tags, or Kubernetes Labels and
  Annotations;
- platform-specific default values, such as a default `deployment.platform` value;
- compatibility with canonical resource types, expressed as a reference to the
  [Resource Definitions](../resource-definition.md) the platform supports;
- aliases or representations used by adapters when rendering a platform's resources.

## What Platform Policy must NOT own

Platform Policy must not own technical resource constraints. These remain the
responsibility of [Resource Definition](../resource-definition.md):

- maximum name length;
- allowed characters;
- provider uniqueness scope;
- resource-specific normalization requirements.

A Platform Policy may reference or declare compatibility with a Resource Definition, but
it does not replace or duplicate the Resource Definition's technical constraints.

## What Platform Policy must NOT contain

Platform Policy describes a platform in general, independently of any specific
organization, product, or tenant. It must not contain:

- SaaS tenancy models — those belong to
  [Deployment Model Policy](./deployment-model-policy.md);
- customer-specific information;
- Control Tower account instances or other organization-specific landing-zone facts —
  those belong to [Organization Policy](./organization-policy.md);
- dynamic account IDs or other provider-generated technical identifiers — those are
  Runtime or Provisioning Context (see
  [`context-resolution.md`](../context-resolution.md#runtime-context-and-provisioning-context));
- product-specific deployment scopes.

## Relationship with Convention Pack

An effective [Convention Pack](../convention-pack.md) may compose a Platform Policy
alongside an [Organization Policy](./organization-policy.md) and a
[Deployment Model Policy](./deployment-model-policy.md). Platform Policy is a reusable
Concept: the same Platform Policy is expected to be reused across many effective
Convention Packs that target the same platform. See
[`convention-pack.md`](../convention-pack.md#composed-from-reusable-policy-dimensions)
for how these dimensions combine into a single effective Convention Pack.

## Out of scope

This document defines the *concept* of Platform Policy only. It intentionally does not
define:

- concrete Platform Policy artifacts (for example, an `aws` or `azure` Platform Policy
  document);
- YAML, JSON, or generated representations of a Platform Policy;
- a JSON Schema for Platform Policy;
- a composition or merge algorithm.

These are left for a later iteration of the Specification, consistent with how
[`convention-pack.md`](../convention-pack.md#out-of-scope) treats concrete Convention
Packs.
