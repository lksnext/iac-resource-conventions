# azure-workload-default

`azure-workload-default` is a concrete Convention Pack — a Specification Artifact that
applies the abstract [Convention Pack](../convention-pack.md) concept to Azure workload
subscriptions. It is selected explicitly by a
[Naming Request](../naming-request.md)'s `convention` field:

```yaml
convention: azure-workload-default
```

This document describes `azure-workload-default`'s policy conceptually. It does not
define YAML, JSON, or any machine-readable representation (see
[`README.md`](./README.md#scope-of-this-iteration)).

## Purpose

`azure-workload-default` is a concrete Convention Pack that combines an Azure Platform
Convention, an Azure workload-subscription Organization Convention, and an Internal
Workload Deployment Convention into one effective pack for Azure workload
subscriptions. The same effective pack can be consumed by multiple adapters, including
Terraform, AWS CDK-equivalent Azure tooling, and future CLI or IaC adapters.

The pack assumes:

- resources are Azure resources, selected via an Azure `resource_type` (for example,
  `azure_resource_group`);
- the resource's `deployment_scope` corresponds to the Azure subscription hosting the
  workload;
- the workload is internal rather than customer-tenanted.

It is not intended for shared SaaS, tiered SaaS, non-Azure platforms, or
adapter-specific management models. It is also not intended for every Azure Resource
Type in this catalog: `azure_key_vault`'s 24-character maximum length is too tight for
this pack's full naming component set (see
[`azure-workload-compact.md`](./azure-workload-compact.md)), and
`azure_compute_gallery`'s naming grammar forbids hyphens entirely (see
[`azure-workload-underscore.md`](./azure-workload-underscore.md)).

## Composed conventions

`azure-workload-default` demonstrates how an effective Convention Pack is assembled
from the reusable convention dimensions documented under
[`policies/`](../policies/README.md), the same composition pattern
`aws-workload-default` already established (see
[`aws-workload-default.md`](./aws-workload-default.md#composed-conventions)). This
document does not define new Platform Convention, Organization Convention, or
Deployment Convention artifacts; it only shows, conceptually, which contribution each
dimension makes to this effective pack.

### Azure Platform Convention

Contributes:

- `platform` defaults to `azure`;
- Azure-specific metadata projection, mapping Resource Identity and Governance Context
  onto Azure resource tags;
- Azure region representation used when projecting `deployment.location`.

### Azure Workload Organization Convention

Contributes:

- `deployment_scope` represents the Azure subscription hosting the workload;
- protection of `organization` and `deployment_scope` against override (see
  [Override policy](#override-policy) below).

### Internal Workload Deployment Convention

Contributes:

- the Internal Workload model — no customer tenancy;
- shared or dedicated workload subscriptions according to Organization Convention,
  rather than a fixed Isolation Model;
- no Service Tier Mapping, since Internal Workload has no customer-facing service
  tiers.

## Identity defaults

`azure-workload-default` supplies the following Resource Identity defaults, consistent
with the Context Resolution precedence order described in
[`context-resolution.md`](../context-resolution.md#resolution-precedence):

- **`platform`** — defaults to `azure`, since every resource named under this pack is
  an Azure resource selected via an Azure `resource_type`.
- **Deployment conventions** — `deployment_scope` is expected to resolve to the Azure
  subscription hosting the workload, supplied by shared deployment context rather than
  repeated on every request; `environment` is expected to be supplied by the caller or
  resolved from shared deployment context.

This pack does not invent organization-specific values (for example, a specific
`organization` or `business_unit`); those remain supplied by shared organizational
context or the Naming Request.

## Required attributes

Before Convention Evaluation proceeds, `azure-workload-default` requires the following
attributes to be available on the resolved Resource Identity:

- **`organizational.system`** — required so that every resource can be grouped under
  the software system or application it belongs to.
- **`deployment.environment`** — required so that resources in different lifecycle
  stages within the same workload subscription remain distinguishable.
- **`functional.resource_type`** — required so that Convention Evaluation can select
  the resource's [Resource Definition](../resource-definition.md) and apply its
  technical constraints.

## Naming projection

`azure-workload-default` projects a resolved Resource Identity into a generated name
using the following `naming_component_order`, from broadest to most specific:

```yaml
naming_component_order:
  - functional.resource_type
  - organizational.system
  - functional.service
  - deployment.environment
  - deployment.location
  - deployment.instance
separator: "-"
casing: lower
abbreviations:
  functional.resource_type:
    azure_resource_group: rg
    azure_virtual_network: vnet
    azure_subnet: snet
    azure_network_security_group: nsg
    azure_linux_virtual_machine: vm
    azure_postgresql_flexible_server: psql
    azure_log_analytics_workspace: log
  deployment.environment:
    production: prod
    staging: stg
    development: dev
  deployment.location:
    eastus: eus
    westeurope: weu
```

Unlike `aws-workload-default`, which places `functional.resource_type` near the end of
its naming component order, `azure-workload-default` places the abbreviated resource
type first. This is a deliberate difference: Microsoft's own Cloud Adoption Framework
naming convention prefixes a resource-type code (for example, `rg-`, `vnet-`) before
the rest of a resource's name, and this pack follows that established platform
convention rather than reusing `aws-workload-default`'s ordering verbatim. Any
component absent for a given resource — for example `functional.service` when no
sub-component applies, or `deployment.instance` when only one instance exists — is
omitted from the generated name, together with its surrounding separator (see
[Component ordering](../convention-pack.md#component-ordering)).

For example, a `production` `azure_resource_group` resource for the `platform` service
of the `lamassu` system, deployed to `westeurope`, with no instance resolved, generates
the name `rg-lamassu-platform-prod-weu`.

## Metadata projection

`azure-workload-default` projects resolved Resource Identity and Governance Context
attributes onto Azure resource tags, following the same conceptual mapping
`aws-workload-default` uses for AWS Tags (see
[`aws-workload-default.md`](./aws-workload-default.md#metadata-projection)). This
document does not define actual Azure tag key names, value formats, or casing; those
concrete mappings are left for a later iteration of this Convention Pack.

## Override policy

`azure-workload-default` declares the following override policy, consistent with the
responsibilities described in
[`convention-pack.md`](../convention-pack.md#override-policy):

- **`organization`** and **`deployment_scope`** must not normally be overridden.
- **`location`** may be overridden for legacy resources.

## Compatibility

Changes to `azure-workload-default`'s required attributes, naming component ordering,
abbreviations, or metadata projection rules are potentially breaking. `azure-workload-default`
follows [Semantic Versioning](https://semver.org/), consistent with how the abstract
Convention Pack concept treats versioning (see
[`convention-pack.md`](../convention-pack.md#versioning)).

## Relationship with the Specification

- **Naming Request** — a caller selects `azure-workload-default` explicitly via the
  request's `convention` field (see [`naming-request.md`](../naming-request.md)).
- **Context Resolution** — combines the Naming Request with
  `azure-workload-default`'s identity and deployment defaults, alongside shared
  organizational and deployment Evaluation Context, to produce a complete Resource
  Identity and Governance Context (see
  [`context-resolution.md`](../context-resolution.md)).
- **Resource Definition** — `azure-workload-default` does not define or override any
  technical constraint; the Resource Definition selected via `resource_type` remains
  the sole source of technical constraints for a resource type (see
  [`resource-definition.md`](../resource-definition.md)).
- **Convention Evaluation** — consults `azure-workload-default` for naming component
  ordering and metadata projection when generating a resource's name, tags, and
  annotations (see
  [`convention-result.md`](../convention-result.md#convention-evaluation-pipeline)).

## Validation scenarios

The following are conceptual examples only.

- **Valid request** — a Naming Request selects `azure-workload-default`, supplies
  `organizational.system`, `functional.resource_type`, and either supplies
  `deployment.environment` or allows it to resolve from shared Evaluation Context.
  Context Resolution completes successfully, and Convention Evaluation produces a
  Convention Result.
- **Missing environment** — a Naming Request selects `azure-workload-default` but
  neither the request nor shared deployment context supplies `deployment.environment`.
  Context Resolution fails this pack's required-attribute check.
- **Key Vault under this pack** — a Naming Request selects `azure-workload-default` for
  an `azure_key_vault` resource. Nothing in Context Resolution or this pack itself
  rejects the combination, but the generated name is likely to exceed
  `azure_key_vault`'s 24-character maximum for anything but the shortest
  `organizational.system` values, producing a failed Convention Result. Callers naming
  a Key Vault should select `azure-workload-compact` instead (see
  [`azure-workload-compact.md`](./azure-workload-compact.md)).
