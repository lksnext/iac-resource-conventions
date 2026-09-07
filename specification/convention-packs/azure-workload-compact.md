# azure-workload-compact

`azure-workload-compact` is a concrete Convention Pack — a Specification Artifact that
applies the abstract [Convention Pack](../convention-pack.md) concept to Azure Resource
Types whose maximum name length makes
[`azure-workload-default`](./azure-workload-default.md)'s full naming component set
impractical. It is selected explicitly by a [Naming Request](../naming-request.md)'s
`convention` field:

```yaml
convention: azure-workload-compact
```

This document describes `azure-workload-compact`'s policy conceptually. It does not
define YAML, JSON, or any machine-readable representation (see
[`README.md`](./README.md#scope-of-this-iteration)).

## Purpose

`azure-workload-compact` exists solely because `azure_key_vault` has a 24-character
maximum name length (see
[`resource-definition.md`](../resource-definition.md)): even a short
`organizational.system` value quickly exhausts 24 characters once a resource-type
abbreviation, service, environment, location, and instance are all present. This pack
is a shorter-name variant of `azure-workload-default` — it changes only the naming
projection, not identity defaults, required attributes, or override policy, both of
which remain identical to `azure-workload-default`.

This pack does not truncate a generated name to fit. Specification v1.2 does not permit
Convention Evaluation to repair an out-of-range rendered name (see
[`resource-definition.md`](../resource-definition.md#validation-and-normalization-remain-separate)).
Instead, it drops `functional.service` and `deployment.location` from
`naming_component_order` entirely, keeping only the components a Key Vault name needs
most: which resource type, which system, which environment, and an optional instance
discriminator. A caller whose resolved values still exceed 24 characters after this
reduction receives an invalid Convention Result — expected and correct behavior, not a
defect of this pack.

It is intended for Azure Resource Types with materially tighter length constraints than
the general Azure naming rules; its only current consumer is `azure_key_vault`.

## Identity defaults, required attributes, and override policy

Identical to [`azure-workload-default`](./azure-workload-default.md#identity-defaults),
[`azure-workload-default`](./azure-workload-default.md#required-attributes), and
[`azure-workload-default`](./azure-workload-default.md#override-policy) respectively.
This pack narrows only the naming projection described below.

## Naming projection

`azure-workload-compact` projects a resolved Resource Identity into a generated name
using the following reduced `naming_component_order`:

```yaml
naming_component_order:
  - functional.resource_type
  - organizational.system
  - deployment.environment
  - deployment.instance
separator: "-"
casing: lower
abbreviations:
  functional.resource_type:
    azure_key_vault: kv
  deployment.environment:
    production: prod
    staging: stg
    development: dev
```

No `deployment.location` abbreviation is declared: `deployment.location` is not part of
this pack's naming projection at all, precisely because it is one of the two
components dropped to keep names short.

For example, a `production` `azure_key_vault` resource for the `lamassu` system, with
no instance resolved, generates the name `kv-lamassu-prod` — 15 characters, comfortably
within the 24-character maximum, and with headroom for a longer `organizational.system`
value or an instance discriminator when global uniqueness requires one (see
[`resource-definition.md`](../resource-definition.md) for the note that this catalog
does not, and cannot, verify at evaluation time that a candidate Key Vault name is
actually unused globally).

## Metadata projection

Identical to
[`azure-workload-default`'s metadata projection](./azure-workload-default.md#metadata-projection).
This pack changes only naming component ordering, not metadata projection.

## Compatibility

Changes to `azure-workload-compact`'s naming component ordering or abbreviations are
potentially breaking. `azure-workload-compact` follows
[Semantic Versioning](https://semver.org/).

## Relationship with the Specification

Identical to
[`azure-workload-default`'s relationship with the Specification](./azure-workload-default.md#relationship-with-the-specification).

## Validation scenarios

- **Valid request** — a Naming Request selects `azure-workload-compact` for an
  `azure_key_vault` resource, supplies `organizational.system` and
  `functional.resource_type`, and either supplies `deployment.environment` or allows it
  to resolve from shared Evaluation Context. Context Resolution completes
  successfully, and Convention Evaluation produces a valid Convention Result.
- **System name too long** — a Naming Request selects `azure-workload-compact` for an
  `azure_key_vault` resource with an `organizational.system` value long enough that the
  rendered name exceeds 24 characters. Convention Evaluation produces a failed
  Convention Result; this pack does not truncate to compensate.
