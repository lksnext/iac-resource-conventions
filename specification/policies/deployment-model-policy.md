# Deployment Model Policy

Deployment Model Policy is a reusable policy dimension that an effective
[Convention Pack](../convention-pack.md) may compose. It answers:

**Purpose:** "What is the operational isolation and tenancy model of this workload?"

Deployment Model Policy captures the parts of an effective Convention Pack that depend
on how a workload isolates its tenants and environments, independently of the target
platform and independently of the organization hosting it. The same Deployment Model
Policy is expected to be reused across many products, organizations, and platforms.

## Initial deployment models

### Internal Workload

For internal projects, experiments, and sandbox workloads. Typical characteristics:

- internal organizational ownership;
- shared or dedicated workload accounts, subscriptions, clusters, or namespaces,
  according to [Organization Policy](./organization-policy.md);
- sandbox and experimental environments;
- no customer tenancy requirement by default.

### SaaS Shared

For SaaS products whose multitenancy is implemented at the application level. Typical
characteristics:

- shared workload account, subscription, cluster, or namespace;
- multiple tenants sharing the same infrastructure;
- `organizational.tenant` may be absent from infrastructure names, since tenancy is an
  application concern rather than an infrastructure concern;
- shared deployment scope.

### SaaS Tiered

For products supporting Trial, Standard, and Enterprise service tiers. SaaS Tiered
represents the following isolation semantics:

| Tier       | Infrastructure                                          | Tenancy model                  |
| ---------- | ------------------------------------------------------- | ------------------------------- |
| Trial      | Shared infrastructure                                   | Application-level multitenancy |
| Standard   | Shared production infrastructure                        | Application-level multitenancy |
| Enterprise | A dedicated deployment scope provisioned for the tenant | Infrastructure-level isolation |

An Enterprise tenant is an **instance** of the SaaS Tiered deployment model, not a new
Convention Pack. The same `saas-tiered` Deployment Model Policy applies to every
Enterprise tenant; what differs between tenants is Runtime or Provisioning Context — for
example, which `deployment.deployment_scope` was provisioned for a given tenant (see
[`context-resolution.md`](../context-resolution.md#runtime-context-and-provisioning-context)).
A Convention Pack must not be created per Enterprise customer.

## Dynamic Enterprise deployment scopes

An Enterprise tenant's dedicated deployment scope is normally created dynamically,
during tenant onboarding, rather than provisioned ahead of time. For AWS, the dedicated
deployment scope is typically a workload account created by a Provisioning API.

This flow is external to Convention Evaluation:

```text
Application onboarding code
    -> Provisioning API
        -> IaC execution
            -> AWS account creation and baseline
                -> Provisioning outputs
                    -> Context Resolution
                        -> Workload convention evaluation
```

- The **Provisioning API** orchestrates onboarding: it decides when a dedicated
  deployment scope is needed and drives its creation.
- The **IaC implementation** creates and configures the deployment scope — for example,
  the AWS account and its baseline.
- The **convention system** — Context Resolution and Convention Evaluation — is
  responsible only for resolving canonical identity and governance context from the
  context it is given, generating names and metadata, and validating outputs against the
  Convention Pack's policy and the relevant Resource Definitions.

The convention evaluator must not create AWS accounts, call Control Tower Account
Factory, execute Terraform, CDK, or another IaC tool, or manage tenant onboarding
workflows. See
[`context-resolution.md`](../context-resolution.md#provisioning-lifecycle) for how this
fits into Context Resolution's timing.

## Cross-platform reuse

The same Deployment Model Policy is platform-independent. For example, a
`saas-enterprise-dedicated` policy is reusable with:

- AWS, where the dedicated scope is normally an AWS workload account;
- Azure, where the dedicated scope may be a subscription or another approved isolation
  boundary;
- Kubernetes on-premises, where the dedicated scope may be a dedicated cluster or
  namespace, depending on the isolation model the organization approves.

Not every platform provides equivalent isolation. The effective Convention Pack combines
a shared Deployment Model Policy with platform- and organization-specific rules —
supplied by [Platform Policy](./platform-policy.md) and
[Organization Policy](./organization-policy.md) — that determine the actual deployment
boundary for a given platform:

```text
AWS Platform Policy
+ Product AWS Organization Policy
+ SaaS Enterprise Deployment Model Policy
= AWS SaaS Enterprise Convention Pack

Azure Platform Policy
+ Product Azure Organization Policy
+ SaaS Enterprise Deployment Model Policy
= Azure SaaS Enterprise Convention Pack

Kubernetes Platform Policy
+ On-Premises Organization Policy
+ SaaS Enterprise Deployment Model Policy
= Kubernetes SaaS Enterprise Convention Pack
```

These are composed effective Convention Packs, not customer-specific packs — no
Convention Pack is created per tenant or per customer.

## Illustrative scenarios

These scenarios illustrate how Deployment Model Policy combines with Platform Policy and
Organization Policy. They are conceptual examples, not concrete Specification Artifacts
(see [`convention-packs/`](../convention-packs/) for the only concrete Convention Pack
currently defined).

### Scenario A: Corporate internal platform

- AWS Organization managed by Control Tower (Organization Policy).
- Internal projects, sandbox, and experimental workloads (Internal Workload deployment
  model).
- Shared organizational governance; no customer tenancy model.
- Example effective Convention Pack name: `corporate-aws-internal`.

### Scenario B: Shared SaaS product

- A separate AWS Organization managed by Control Tower (Organization Policy).
- SaaS multitenancy implemented in application code (SaaS Shared deployment model).
- Shared workload infrastructure; no dedicated account per tenant.
- Example effective Convention Pack name: `product-a-aws-saas-shared`.

### Scenario C: Tiered SaaS product

- A separate AWS Organization managed by Control Tower (Organization Policy).
- Trial and Standard tiers on shared infrastructure; Enterprise tier on a dynamically
  created dedicated workload account (SaaS Tiered deployment model).
- Enterprise account creation is initiated by application code, which calls a
  Provisioning API; the Provisioning API executes IaC, which creates and bootstraps the
  account; the provisioning outputs become Runtime Context for later Context Resolution
  (see [`context-resolution.md`](../context-resolution.md#provisioning-lifecycle)).
- The same product is also deployable to Azure and to on-premises Kubernetes, reusing
  the same `saas-tiered` Deployment Model Policy.
- Example effective Convention Pack names: `product-b-aws-saas-trial`,
  `product-b-aws-saas-standard`, `product-b-aws-saas-enterprise`,
  `product-b-azure-saas-enterprise`, `product-b-kubernetes-saas-enterprise`.
- No Convention Pack is created per Enterprise tenant: every Enterprise tenant on AWS
  resolves through `product-b-aws-saas-enterprise`, with the tenant's dedicated
  deployment scope supplied as Runtime Context.

## Relationship with Convention Pack

An effective [Convention Pack](../convention-pack.md) may compose a Deployment Model
Policy alongside a [Platform Policy](./platform-policy.md) and an
[Organization Policy](./organization-policy.md). See
[`convention-pack.md`](../convention-pack.md#composed-from-reusable-policy-dimensions)
for how these dimensions combine into a single effective Convention Pack, and
[`convention-pack.md`](../convention-pack.md#convention-pack-naming) for naming examples
of the effective packs referenced above.

## Out of scope

This document defines the *concept* of Deployment Model Policy only. It intentionally
does not define:

- concrete Deployment Model Policy artifacts (for example, an actual `saas-tiered`
  document);
- YAML, JSON, or generated representations of a Deployment Model Policy;
- a JSON Schema for Deployment Model Policy;
- a composition or merge algorithm;
- a Provisioning API or IaC implementation.

These are left for a later iteration of the Specification, consistent with how
[`convention-pack.md`](../convention-pack.md#out-of-scope) treats concrete Convention
Packs.
