# Policies

This directory contains the reusable convention dimension Concepts that an effective
[Convention Pack](../convention-pack.md) may compose.

## Why these are separate documents

A Convention Pack remains the single Specification Artifact selected by a
[Naming Request](../naming-request.md)'s `convention` field. However, the convention an
effective Convention Pack expresses is rarely unique to one organization, one platform,
and one product all at once. Splitting the reusable parts of that convention into their
own Concepts lets the same convention be written once and reused across many effective
Convention Packs, instead of being redefined every time an organization adopts a new
platform, structures a new landing zone, or launches a new product tier. See
[`../convention-pack.md`](../convention-pack.md#composed-from-reusable-convention-dimensions)
for how these dimensions combine into a single effective Convention Pack.

## Concepts versus Specification Artifacts

The documents in this directory are Concepts, in the same sense described in
[`../README.md`](../README.md#concepts-and-specification-artifacts): abstract, reusable
domain models that apply to every organization adopting the Specification. They are not
Specification Artifacts — this iteration does not yet define concrete Platform
Convention, Organization Convention, or Deployment Convention artifacts, in the same
way [`../convention-packs/`](../convention-packs/) defines concrete Convention Packs. If
a decision here seems to require inventing a concrete convention instance, it belongs in
a future concrete artifact, not in these conceptual documents.

## Contents

- [`platform-convention.md`](./platform-convention.md) — how conventions are projected for a
  target infrastructure platform (for example, AWS, Azure, or Kubernetes).
- [`organization-convention.md`](./organization-convention.md) — how an organization structures
  and governs its infrastructure platforms (for example, an AWS Organization managed
  through Control Tower, or an Azure Landing Zone).
- [`deployment-convention.md`](./deployment-convention.md) — the workload purpose,
  tenancy, isolation, and optional service-tier mapping used by a workload or product
  (for example, an internal workload or a SaaS product).

## Scope of this iteration

This iteration defines Platform Convention, Organization Convention, and Deployment Convention
as conceptual Markdown documents only. It intentionally does not define:

- concrete Platform Convention, Organization Convention, or Deployment Convention artifacts;
- YAML, JSON, or generated representations of any of these dimensions;
- a JSON Schema for any of these dimensions;
- a composition or merge algorithm that combines them into an effective Convention Pack.

These are left for a later iteration of the Specification, once the conceptual model
described here has been validated — consistent with how
[`../convention-pack.md`](../convention-pack.md#out-of-scope) treats concrete Convention
Packs.
