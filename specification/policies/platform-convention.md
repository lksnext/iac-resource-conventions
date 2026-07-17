# Platform Convention

Platform Convention is a reusable convention dimension that an effective
[Convention Pack](../convention-pack.md) may compose. It answers:

**Purpose:** "How should conventions be projected for this target infrastructure
platform?"

Platform Convention captures the parts of an effective Convention Pack that depend on the
target infrastructure platform, so the same platform-oriented convention can be reused
across different organizations, deployment conventions, and Convention Packs, instead of
being redefined every time an organization adopts a new platform.

## Initial platforms

This iteration of the Specification anticipates Platform Convention for at least:

- AWS
- Azure
- Kubernetes

Additional platforms may be added later without changing this conceptual model.

## Responsibilities

Platform Convention may define or contribute:

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

## What Platform Convention must NOT own

Platform Convention must not own technical resource constraints. These remain the
responsibility of [Resource Definition](../resource-definition.md):

- maximum name length;
- allowed characters;
- provider uniqueness scope;
- resource-specific normalization requirements.

A Platform Convention may reference or declare compatibility with a Resource Definition, but
it does not replace or duplicate the Resource Definition's technical constraints.

## What Platform Convention must NOT contain

Platform Convention describes a platform in general, independently of any specific
organization, product, or tenant. It must not contain:

- SaaS tenancy models — those belong to
  [Deployment Convention](./deployment-convention.md);
- customer-specific information;
- Control Tower account instances or other organization-specific landing-zone facts —
  those belong to [Organization Convention](./organization-convention.md);
- dynamic account IDs or other provider-generated technical identifiers — those are
  Evaluation Context facts (see
  [`context-resolution.md`](../context-resolution.md#evaluation-context));
- product-specific deployment scopes.

## Relationship with Convention Pack

An effective [Convention Pack](../convention-pack.md) may compose a Platform Convention
alongside an [Organization Convention](./organization-convention.md) and a
[Deployment Convention](./deployment-convention.md). Platform Convention is a reusable
Concept: the same Platform Convention is expected to be reused across many effective
Convention Packs that target the same platform. See
[`convention-pack.md`](../convention-pack.md#composed-from-reusable-convention-dimensions)
for how these dimensions combine into a single effective Convention Pack.

## Out of scope

This document defines the *concept* of Platform Convention only. It intentionally does not
define:

- concrete Platform Convention artifacts (for example, an `aws` or `azure` Platform Convention
  document);
- YAML, JSON, or generated representations of a Platform Convention;
- a JSON Schema for Platform Convention;
- a composition or merge algorithm.

These are left for a later iteration of the Specification, consistent with how
[`convention-pack.md`](../convention-pack.md#out-of-scope) treats concrete Convention
Packs.
