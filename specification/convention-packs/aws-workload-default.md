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

`aws-workload-default` is a concrete Convention Pack that demonstrates composition. It
combines an AWS Platform Convention, an AWS workload-account Organization Convention,
and an Internal Workload Deployment Convention into one effective pack for AWS
workload accounts. The same effective pack can be consumed by multiple adapters,
including Terraform, AWS CDK, and future CLI or IaC adapters.

The pack assumes:

- resources are AWS resources, selected via an AWS `resource_type` (for example,
  `aws_s3_bucket`);
- the resource's `deployment_scope` corresponds to the AWS account alias hosting the
  workload;
- the workload is internal rather than customer-tenanted.

It is not intended for shared SaaS, tiered SaaS, non-AWS platforms, or
adapter-specific management models. Those scenarios call for a different effective
Convention Pack.

## Composed conventions

`aws-workload-default` demonstrates how an effective Convention Pack is assembled from
the reusable convention dimensions documented under
[`policies/`](../policies/README.md). This document does not define new Platform
Convention, Organization Convention, or Deployment Convention artifacts; it only shows,
conceptually, which contribution each dimension makes to this effective pack.

### AWS Platform Convention

Contributes:

- `platform` defaults to `aws`;
- AWS-specific metadata projection, mapping Resource Identity and Governance Context
  onto AWS Tags;
- AWS region and location representation used when projecting `deployment.location`.

### AWS Workload Organization Convention

Contributes:

- `deployment_scope` represents the AWS account alias hosting the workload;
- protection of `organization` and `deployment_scope` against override (see
  [Override policy](#override-policy) below);
- account-naming conventions for AWS workload accounts.

### Internal Workload Deployment Convention

Contributes:

- the Internal Workload model — no customer tenancy;
- shared or dedicated workload accounts according to Organization Convention, rather
  than a fixed Isolation Model;
- no Service Tier Mapping, since Internal Workload has no customer-facing service
  tiers.

Composing these three dimensions into `aws-workload-default` is a Specification
Artifact concern, not a distinct processing stage — see
[`convention-pack.md`](../convention-pack.md#composed-from-reusable-convention-dimensions).

## Identity defaults

`aws-workload-default` supplies the following Resource Identity defaults, consistent
with the Context Resolution precedence order described in
[`context-resolution.md`](../context-resolution.md#resolution-precedence):

- **`platform`** — defaults to `aws`, since every resource named under this pack is an
  AWS resource selected via an AWS `resource_type`.
- **Deployment conventions** — `deployment_scope` is expected to resolve to the AWS
  account alias hosting the workload, supplied by shared deployment context rather than
  repeated on every request; `environment` is expected to be supplied by the caller or
  resolved from shared deployment context, since it distinguishes lifecycle stages
  (for example, `staging` versus `production`) within the same workload account.

This pack does not invent organization-specific values (for example, a specific
`organization` or `business_unit`); those remain supplied by shared organizational
context or the Naming Request, as described in
[`context-resolution.md`](../context-resolution.md#resolution-sources).

## `deployment_scope` is optional for naming, expected for metadata

`aws-workload-default` follows **Option B**: `deployment.deployment_scope` is
intentionally not listed under [Required attributes](#required-attributes) below, so
Convention Evaluation can still generate a name without it — for example, during a
pre-provisioning evaluation that produces a proposed name before the AWS account
exists (see
[`context-resolution.md`](../context-resolution.md#pre-provisioning)). However, this
pack expects `deployment_scope` to resolve — normally from shared deployment context —
before a complete, production-ready Convention Result is produced, since metadata
projection uses `deployment_scope` to tag every resource with the AWS account alias
that hosts it. A Convention Result generated without `deployment_scope` is valid but
incomplete for metadata purposes, consistent with the pre- and post-provisioning
distinction described in
[`context-resolution.md`](../context-resolution.md#provisioning-lifecycle).

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
is organizational convention, not a JSON Schema constraint: the same canonical Resource
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

`aws-workload-default` does not fix `managed_by` to a specific tool such as Terraform.
`managed_by` is a Governance Context attribute (see
[`governance-context.md`](../governance-context.md)); this pack expects it to be
supplied by Evaluation Context or the calling adapter, not hard-coded by the pack
itself, so the same effective pack remains reusable whether the AWS workload account is
managed by Terraform, AWS CDK, or a future adapter.

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

This is organizational convention specific to `aws-workload-default`, not a Context
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
  organizational and deployment Evaluation Context, to produce a complete Resource
  Identity and Governance Context (see [`context-resolution.md`](../context-resolution.md)).
- **Resource Identity** — `aws-workload-default`'s required attributes and identity
  defaults apply to the three-plane Resource Identity model; the pack does not change
  what Resource Identity fundamentally is (see
  [`resource-identity.md`](../resource-identity.md)).
- **Governance Context** — `aws-workload-default`'s metadata projection applies to the
  resolved Governance Context (see
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
  supplies `deployment.environment` or allows it to resolve from shared Evaluation
  Context. Context Resolution completes successfully, and Convention Evaluation
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
