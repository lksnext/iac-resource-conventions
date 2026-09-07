# azure-workload-underscore

`azure-workload-underscore` is a concrete Convention Pack — a Specification Artifact
that applies the abstract [Convention Pack](../convention-pack.md) concept to Azure
Resource Types whose naming grammar forbids hyphens. It is selected explicitly by a
[Naming Request](../naming-request.md)'s `convention` field:

```yaml
convention: azure-workload-underscore
```

This document describes `azure-workload-underscore`'s policy conceptually. It does not
define YAML, JSON, or any machine-readable representation (see
[`README.md`](./README.md#scope-of-this-iteration)).

## Purpose

`azure-workload-underscore` exists solely because `azure_compute_gallery`'s
Microsoft-documented allowed characters are "Alphanumerics, underscores, and
periods" — explicitly excluding the hyphen every other Azure Resource Type in this
catalog accepts (see [`resource-definition.md`](../resource-definition.md)). Reusing
[`azure-workload-default`](./azure-workload-default.md) unchanged for this resource
type is not an option: its `-` separator would appear literally inside the rendered
name, which the resource type's own naming grammar rejects. This pack changes only the
`separator`; every other field keeps the same shape as `azure-workload-default`.

It is intended for Azure Resource Types whose naming grammar forbids hyphens; its only
current consumer is `azure_compute_gallery`.

## Identity defaults, required attributes, and override policy

Identical to [`azure-workload-default`](./azure-workload-default.md#identity-defaults),
[`azure-workload-default`](./azure-workload-default.md#required-attributes), and
[`azure-workload-default`](./azure-workload-default.md#override-policy) respectively.

## Naming projection

`azure-workload-underscore` projects a resolved Resource Identity into a generated
name using the same `naming_component_order` as `azure-workload-default`, but with an
underscore separator:

```yaml
naming_component_order:
  - functional.resource_type
  - organizational.system
  - functional.service
  - deployment.environment
  - deployment.location
  - deployment.instance
separator: "_"
casing: lower
abbreviations:
  functional.resource_type:
    azure_compute_gallery: gal
  deployment.environment:
    production: prod
    staging: stg
    development: dev
  deployment.location:
    eastus: eus
    westeurope: weu
```

Every candidate abbreviation and resolved value used by this pack's current consumer is
itself hyphen-free, so no field besides `separator` needs to change to keep the
rendered name valid.

For example, a `production` `azure_compute_gallery` resource for the `platform` service
of the `workload` system, deployed to `westeurope`, with no instance resolved, generates
the name `gal_workload_platform_prod_weu`.

## Metadata projection

Identical to
[`azure-workload-default`'s metadata projection](./azure-workload-default.md#metadata-projection).
This pack changes only the naming separator, not metadata projection.

## Compatibility

Changes to `azure-workload-underscore`'s naming component ordering, separator, or
abbreviations are potentially breaking. `azure-workload-underscore` follows
[Semantic Versioning](https://semver.org/).

## Relationship with the Specification

Identical to
[`azure-workload-default`'s relationship with the Specification](./azure-workload-default.md#relationship-with-the-specification).

## Validation scenarios

- **Valid request** — a Naming Request selects `azure-workload-underscore` for an
  `azure_compute_gallery` resource, supplies `organizational.system` and
  `functional.resource_type`, and either supplies `deployment.environment` or allows it
  to resolve from shared Evaluation Context. Context Resolution completes
  successfully, and Convention Evaluation produces a valid, hyphen-free Convention
  Result.
- **Compute Gallery under azure-workload-default** — a Naming Request selects
  `azure-workload-default` (not this pack) for an `azure_compute_gallery` resource.
  Nothing in Context Resolution rejects the combination, but the generated name
  contains hyphens, which `azure_compute_gallery`'s own character constraints forbid,
  producing a failed Convention Result. Callers naming a Compute Gallery should select
  `azure-workload-underscore` instead.
