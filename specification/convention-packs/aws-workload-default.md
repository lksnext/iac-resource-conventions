# aws-workload-default

`aws-workload-default` is a concrete Convention Pack — a Specification Artifact that
applies the abstract [Convention Pack](../convention-pack.md) concept to a specific
organizational scenario. It is selected explicitly by a
[Naming Request](../naming-request.md)'s `convention` field:

```yaml
convention: aws-workload-default
```

This document describes `aws-workload-default`'s policy conceptually. It does not
define YAML, JSON, or any machine-readable representation (see
[`README.md`](./README.md#scope-of-this-iteration)).

## Purpose

`aws-workload-default` targets AWS workload accounts managed through Terraform: a
resource is deployed into an AWS account dedicated to a single workload, and that
account's infrastructure is provisioned using the Terraform adapter. This is the most
common scenario for early adopters of the Specification, since Terraform is the first
planned adapter.

The pack assumes:

- resources are AWS resources, selected via an AWS `resource_type` (for example,
  `aws_s3_bucket`);
- the resource's `deployment_scope` corresponds to the AWS account alias hosting the
  workload;
- infrastructure is provisioned and managed through Terraform.

It is not intended for shared, multi-workload accounts, non-AWS platforms, or resources
managed outside Terraform. Those scenarios call for a different Convention Pack.

## Identity defaults

`aws-workload-default` supplies the following Resource Identity defaults, consistent
with the Context Resolution precedence order described in
[`context-resolution.md`](../context-resolution.md#resolution-precedence):

- **`platform`** — defaults to `aws`, since every resource named under this pack is an
  AWS resource selected via an AWS `resource_type`.
- **`managed_by`** — defaults to `terraform`, since this pack targets workloads
  provisioned through the Terraform adapter.
- **Deployment conventions** — `deployment_scope` is expected to resolve to the AWS
  account alias hosting the workload, supplied by shared deployment context rather than
  repeated on every request; `environment` is expected to be supplied by the caller or
  resolved from shared deployment context, since it distinguishes lifecycle stages
  (for example, `staging` versus `production`) within the same workload account.

This pack does not invent organization-specific values (for example, a specific
`organization` or `business_unit`); those remain supplied by shared organizational
context or the Naming Request, as described in
[`context-resolution.md`](../context-resolution.md#resolution-sources).

## Required attributes

Before Convention Evaluation proceeds, `aws-workload-default` requires the following
attributes to be available on the resolved Resource Identity:

- **`organizational.system`** — required so that every resource can be grouped under
  the software system or application it belongs to; without it, generated names and
  tags cannot be attributed to a system.
- **`deployment.environment`** — required so that resources in different lifecycle
  stages within the same workload account remain distinguishable; without it, a
  `staging` resource and a `production` resource could collide.
- **`functional.resource_type`** — required so that Convention Evaluation can select
  the resource's [Resource Definition](../resource-definition.md) and apply its
  technical constraints; without it, no platform-specific output can be generated at
  all.

As described in [`convention-pack.md`](../convention-pack.md#required-attributes), this
is organizational policy, not a JSON Schema constraint: the same canonical Resource
Identity model may have different required attributes under a different Convention
Pack.

## Naming projection

`aws-workload-default` projects a resolved Resource Identity into a generated name using
the following conceptual component order, from broadest to most specific:

```text
system
    -> service
        -> environment
            -> location
                -> component
                    -> resource_type
                        -> instance
```

This ordering places the most stable, broadest identity components first (the system a
resource belongs to) and the most specific, most volatile components last (an optional
instance discriminator). This document does not yet define separators, abbreviations, or
casing rules for this ordering; those are left for a later iteration of this Convention
Pack, once the ordering itself has been validated.

## Metadata projection

`aws-workload-default` projects resolved Resource Identity and Governance Context
attributes onto AWS Tags. Conceptually:

- Organizational Identity attributes (for example, `system`, `business_unit`) become
  tags that identify which system or business area a resource belongs to.
- Deployment Identity attributes (for example, `environment`, `deployment_scope`)
  become tags that identify where and in which lifecycle stage a resource is deployed.
- Functional Identity attributes (for example, `service`, `component`) become tags that
  identify a resource's functional role.
- Governance Context attributes (for example, `owner`, `managed_by`, `cost_center`)
  become tags that identify who owns, manages, and pays for a resource.

This document does not define actual AWS Tag key names, value formats, or casing; those
concrete mappings are left for a later iteration of this Convention Pack.

## Override policy

`aws-workload-default` declares the following override policy, consistent with the
responsibilities described in
[`convention-pack.md`](../convention-pack.md#override-policy):

- **`organization`** and **`deployment_scope`** must not normally be overridden. These
  attributes describe stable organizational and account boundaries; overriding them
  would let a resource claim to belong to an organization or account boundary it does
  not actually occupy.
- **`location`** may be overridden for legacy resources — for example, a resource that
  was deployed before this pack's conventions existed and must keep its original
  location during a migration window.

This is organizational policy specific to `aws-workload-default`, not a Context
Resolution or Convention Evaluation mechanic: Context Resolution accepts whatever
overrides are supplied in a Naming Request's `overrides` block, but it is this Convention
Pack that decides which of those overrides are actually allowed (see
[`context-resolution.md`](../context-resolution.md#overrides)).

## Compatibility

Changes to `aws-workload-default`'s required attributes, naming component ordering,
abbreviations, or metadata projection rules are potentially breaking: they may change
the generated name, tags, or validation outcome for resources that already exist.
`aws-workload-default` follows [Semantic Versioning](https://semver.org/), consistent
with how the abstract Convention Pack concept treats versioning (see
[`convention-pack.md`](../convention-pack.md#versioning)).

## Relationship with the Specification

- **Naming Request** — a caller selects `aws-workload-default` explicitly via the
  request's `convention` field (see [`naming-request.md`](../naming-request.md)).
- **Context Resolution** — combines the Naming Request with
  `aws-workload-default`'s identity and deployment defaults, alongside shared
  organizational and deployment context, to produce a complete Resource Identity and
  Governance Context (see [`context-resolution.md`](../context-resolution.md)).
- **Resource Identity** — `aws-workload-default`'s required attributes and identity
  defaults apply to the three-plane Resource Identity model; the pack does not change
  what Resource Identity fundamentally is (see
  [`resource-identity.md`](../resource-identity.md)).
- **Governance Context** — `aws-workload-default`'s `managed_by` default and metadata
  projection apply to the resolved Governance Context (see
  [`governance-context.md`](../governance-context.md)).
- **Resource Definition** — `aws-workload-default` does not define or override any
  technical constraint; the Resource Definition selected via `resource_type` remains
  the sole source of technical constraints for a resource type (see
  [`resource-definition.md`](../resource-definition.md)).
- **Convention Evaluation** — consults `aws-workload-default` for naming component
  ordering and metadata projection when generating a resource's name, tags, and
  annotations (see
  [`convention-result.md`](../convention-result.md#convention-evaluation-pipeline)).
- **Convention Result** — the generated name and AWS Tags in a Convention Result for a
  resource named under `aws-workload-default` follow this pack's naming and metadata
  projection policy (see [`convention-result.md`](../convention-result.md)).

## Validation scenarios

The following are conceptual examples only; no implementation exists yet to execute
them.

- **Valid request** — a Naming Request selects `aws-workload-default`, supplies
  `organizational.system`, `functional.service`, `functional.resource_type`, and either
  supplies `deployment.environment` or allows it to resolve from shared deployment
  context. Context Resolution completes successfully, and Convention Evaluation
  produces a Convention Result.
- **Missing environment** — a Naming Request selects `aws-workload-default` but
  `deployment.environment` cannot be resolved from the request or from shared
  deployment context. Because `deployment.environment` is a required attribute for this
  pack, Convention Evaluation should reject the request rather than produce a name that
  cannot be distinguished from the same resource in a different environment.
- **Legacy override** — a Naming Request for a resource that predates this pack's
  conventions supplies `overrides.deployment.location` to preserve the resource's
  original location. Because `location` is an overridable attribute under this pack's
  override policy, the override is accepted, subject to the validation Convention
  Evaluation still performs against the resource's Resource Definition.
- **Shared service** — a Naming Request for a resource belonging to a service used by
  multiple components omits `functional.component`, since `component` is optional under
  Resource Identity and is not one of this pack's required attributes. The request
  still resolves successfully using only the attributes this pack requires.
