# Organization Policy

Organization Policy is a reusable policy dimension that an effective
[Convention Pack](../convention-pack.md) may compose. It answers:

**Purpose:** "How does this organization structure and govern its infrastructure
platforms?"

Organization Policy captures the parts of an effective Convention Pack that depend on
how a specific organization structures itself on a platform — its landing zones,
account or subscription structure, and organization-wide governance defaults —
independently of the target platform's own conventions and independently of any
particular workload's tenancy model.

## Responsibilities

Organization Policy may contribute:

- organizational identity defaults, such as a default `organizational.organization` or
  `organizational.business_unit`;
- corporate metadata requirements;
- [Governance Context](../governance-context.md) defaults;
- account, subscription, cluster, or namespace classification;
- landing-zone conventions;
- logical deployment-scope patterns — for example, how `deployment.deployment_scope`
  values are typically named within this organization;
- protected organizational attributes (see
  [`context-resolution.md`](../context-resolution.md#precedence-versus-protection));
- organization-wide override restrictions.

## Examples

Organization Policy is where an organization's landing zone is described, for example:

- a corporate AWS Organization managed through Control Tower;
- a product-specific AWS Organization managed through Control Tower;
- an Azure Landing Zone;
- a corporate on-premises Kubernetes platform.

These are examples of the kind of organizational structure Organization Policy
describes, not an exhaustive or normative list.

## Control Tower is organizational and provisioning environment, not a Deployment Model

AWS Control Tower — and comparable landing-zone tooling on other platforms — governs how
accounts, subscriptions, or clusters are structured and provisioned. That is an
Organization Policy and provisioning concern. It must not be treated as a
[Deployment Model Policy](./deployment-model-policy.md): whether a workload is internal,
shared SaaS, or tiered SaaS is an independent question from which landing zone or
account factory provisions its deployment scope.

## Organization Policy describes stable policy, not dynamic instances

Organization Policy describes how an organization *structures* its platforms — it is
stable, reusable policy. It must not contain:

- dynamically created account instances;
- customer-specific account IDs.

A dynamically created AWS account for a specific tenant is Runtime or Provisioning
Context, not Organization Policy (see
[`context-resolution.md`](../context-resolution.md#runtime-context-and-provisioning-context)).

## Relationship with Convention Pack

An effective [Convention Pack](../convention-pack.md) may compose an Organization Policy
alongside a [Platform Policy](./platform-policy.md) and a
[Deployment Model Policy](./deployment-model-policy.md). See
[`convention-pack.md`](../convention-pack.md#composed-from-reusable-policy-dimensions)
for how these dimensions combine into a single effective Convention Pack.

## Out of scope

This document defines the *concept* of Organization Policy only. It intentionally does
not define:

- concrete Organization Policy artifacts;
- YAML, JSON, or generated representations of an Organization Policy;
- a JSON Schema for Organization Policy;
- a composition or merge algorithm.

These are left for a later iteration of the Specification, consistent with how
[`convention-pack.md`](../convention-pack.md#out-of-scope) treats concrete Convention
Packs.
