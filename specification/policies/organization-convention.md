# Organization Convention

Organization Convention is a reusable convention dimension that an effective
[Convention Pack](../convention-pack.md) may compose. It answers:

**Purpose:** "How does this organization structure and govern its infrastructure
platforms?"

Organization Convention captures the parts of an effective Convention Pack that depend on
how a specific organization structures itself on a platform — its landing zones,
account or subscription structure, and organization-wide governance defaults —
independently of the target platform's own conventions and independently of any
particular workload's tenancy model.

## Responsibilities

Organization Convention may contribute:

- organizational identity defaults, such as a default `organizational.organization` or
  `organizational.business_unit`;
- corporate metadata requirements;
- [Governance Context](../governance-context.md) defaults;
- account, subscription, cluster, or namespace classification;
- landing-zone conventions;
- logical deployment-scope patterns — for example, how `deployment.deployment_scope`
  values are typically named within this organization;
- protected organizational attributes (see
  [`context-resolution.md`](../context-resolution.md#precedence-authority-and-protection));
- organization-wide override restrictions.

## Examples

Organization Convention is where an organization's landing zone is described, for example:

- a corporate AWS Organization managed through Control Tower;
- a product-specific AWS Organization managed through Control Tower;
- an Azure Landing Zone;
- a corporate on-premises Kubernetes platform.

These are examples of the kind of organizational structure Organization Convention
describes, not an exhaustive or normative list.

## Control Tower is organizational and provisioning environment, not a Deployment Convention

AWS Control Tower — and comparable landing-zone tooling on other platforms — governs how
accounts, subscriptions, or clusters are structured and provisioned. That is an
Organization Convention and provisioning concern. It must not be treated as a
[Deployment Convention](./deployment-convention.md): whether a workload is internal,
shared SaaS, or tiered SaaS is an independent question from which landing zone or
account factory provisions its deployment scope.

## Organization Convention describes stable convention, not dynamic instances

Organization Convention describes how an organization *structures* its platforms — it is
stable, reusable policy. It must not contain:

- dynamically created account instances;
- customer-specific account IDs.

A dynamically created AWS account for a specific tenant is Evaluation Context, not
Organization Convention (see
[`context-resolution.md`](../context-resolution.md#evaluation-context)).

## Relationship with Convention Pack

An effective [Convention Pack](../convention-pack.md) may compose an Organization Convention
alongside a [Platform Convention](./platform-convention.md) and a
[Deployment Convention](./deployment-convention.md). See
[`convention-pack.md`](../convention-pack.md#composed-from-reusable-convention-dimensions)
for how these dimensions combine into a single effective Convention Pack.

## Out of scope

This document defines the *concept* of Organization Convention only. It intentionally does
not define:

- concrete Organization Convention artifacts;
- YAML, JSON, or generated representations of an Organization Convention;
- a JSON Schema for Organization Convention;
- a composition or merge algorithm.

These are left for a later iteration of the Specification, consistent with how
[`convention-pack.md`](../convention-pack.md#out-of-scope) treats concrete Convention
Packs.
