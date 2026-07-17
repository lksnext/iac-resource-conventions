# Deployment Convention

Deployment Convention is a reusable convention dimension that an effective
[Convention Pack](../convention-pack.md) may compose. It answers:

**Purpose:** "How does this workload model its purpose, tenancy, isolation, and tier mapping?"

Deployment Convention captures the parts of an effective Convention Pack that depend
on how a workload is intended to behave from a tenancy and isolation perspective,
independently of the target platform and independently of the organization hosting it.
The same Deployment Convention is expected to be reused across many products,
organizations, and platforms.

## Model dimensions

Deployment Convention is conceptually composed of the following concerns:

```text
Deployment Convention
├── Workload Model
│   ├── Internal
│   └── SaaS
├── Tenancy Model
│   ├── None
│   └── Application Multitenancy
├── Isolation Model
│   ├── Shared
│   └── Dedicated
└── Optional Service Tier Mapping
    ├── Trial -> Shared
    ├── Standard -> Shared
    └── Enterprise -> Dedicated
```

### Workload Model

The workload model captures the broad purpose of the deployment.

### Tenancy Model

The tenancy model captures whether infrastructure tenants are isolated within the
Deployment Convention itself or handled primarily by the application.

### Isolation Model

The isolation model captures whether the workload is implemented on shared or dedicated
infrastructure boundaries.

### Optional Service Tier Mapping

The mapping between service tier and isolation model is product-specific policy that can
be carried by a concrete Convention Pack or by a product-specific Deployment Convention.
For the current SaaS product, the mapping is:

```text
Trial      -> Shared
Standard   -> Shared
Enterprise -> Dedicated
```

Another product could define a different mapping, such as:

```text
Professional -> Shared
Enterprise   -> Shared or Dedicated
Government   -> Dedicated
```

Service tier is therefore not a universal deployment model. It is an input to product
policy or Evaluation Context, while the isolation model describes the infrastructure
boundary that the resulting Convention Pack uses.

## Illustrative Deployment Convention patterns

These are illustrative combinations of the Workload Model, Tenancy Model, and Isolation
Model dimensions described above, not additional model dimensions of their own.

### Internal Workload

For internal projects, experiments, and sandbox workloads. Typical characteristics:

- internal organizational ownership;
- shared or dedicated workload accounts, subscriptions, clusters, or namespaces,
  according to [Organization Convention](./organization-convention.md);
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

### SaaS with a product-specific Service Tier Mapping

A product may apply its own [Optional Service Tier Mapping](#optional-service-tier-mapping)
to the SaaS Workload Model, so that different service tiers resolve to different
Isolation Model values — for example, Trial and Standard tiers resolving to Shared
isolation, and Enterprise resolving to Dedicated isolation. This is not a fourth
Deployment Convention pattern: it is the SaaS Workload Model combined with a
product-specific Service Tier Mapping, expressed using the same Workload, Tenancy, and
Isolation Model dimensions described above.

An Enterprise tenant is an **instance** of this composition, not a new Convention Pack.
The same Deployment Convention applies to every Enterprise tenant; what differs between
tenants is Evaluation Context — for example, which `deployment.deployment_scope` was
provisioned for a given tenant (see
[`context-resolution.md`](../context-resolution.md#evaluation-context)). A Convention
Pack must not be created per Enterprise customer.

## Dynamic Enterprise deployment scopes

An Enterprise tenant's dedicated deployment scope is normally created dynamically,
during tenant onboarding, rather than provisioned ahead of time. For AWS, the dedicated
deployment scope is typically a workload account created by a Provisioning API.

This flow is external to the Specification's Convention system:

```text
Application onboarding code
    -> Provisioning API
        -> IaC execution
            -> AWS account creation and baseline
                -> Provisioning outputs
                    -> Evaluation Context
                      -> Context Resolution
                        -> Convention Evaluation
```

- The **Provisioning API** orchestrates onboarding: it decides when a dedicated
  deployment scope is needed and drives its creation.
- The **IaC implementation** creates and configures the deployment scope — for example,
  the AWS account and its baseline.
- The **convention system** — Context Resolution and Convention Evaluation — is
  responsible only for resolving canonical identity and governance context from the
  context it is given, generating names and metadata, and validating outputs against the
  Convention Pack's convention and the relevant Resource Definitions.

The convention evaluator must not create AWS accounts, call Control Tower Account
Factory, execute Terraform, CDK, or another IaC tool, or manage tenant onboarding
workflows. See
[`context-resolution.md`](../context-resolution.md#business-to-infrastructure-boundary)
for how this fits into the boundary between business, infrastructure, and convention
systems.

## Cross-platform reuse

The same Deployment Convention is platform-independent. For example, a
`saas-enterprise-dedicated` convention is reusable with:

- AWS, where the dedicated scope is normally an AWS workload account;
- Azure, where the dedicated scope may be a subscription or another approved isolation
  boundary;
- Kubernetes on-premises, where the dedicated scope may be a dedicated cluster or
  namespace, depending on the isolation model the organization approves.

Not every platform provides equivalent isolation. The effective Convention Pack combines
a shared Deployment Convention with platform- and organization-specific rules —
supplied by [Platform Convention](./platform-convention.md) and
[Organization Convention](./organization-convention.md) — that determine the actual
deployment boundary for a given platform:

```text
AWS Platform Convention
+ Product AWS Organization Convention
+ SaaS Enterprise Deployment Convention
= AWS SaaS Enterprise Convention Pack

Azure Platform Convention
+ Product Azure Organization Convention
+ SaaS Enterprise Deployment Convention
= Azure SaaS Enterprise Convention Pack

Kubernetes Platform Convention
+ On-Premises Organization Convention
+ SaaS Enterprise Deployment Convention
= Kubernetes SaaS Enterprise Convention Pack
```

These are composed effective Convention Packs, not customer-specific packs — no
Convention Pack is created per tenant or per customer.

## Illustrative scenarios

These scenarios illustrate how Deployment Convention combines with Platform Convention and
Organization Convention. They are conceptual examples, not concrete Specification Artifacts
(see [`convention-packs/`](../convention-packs/) for the only concrete Convention Pack
currently defined).

### Scenario A: Corporate internal platform

- AWS Organization managed by Control Tower (Organization Convention).
- Internal workload with no tenant isolation requirement (Internal Workload Model).
- Shared organizational governance; no customer tenancy.
- Example effective Convention Pack name: `corporate-aws-internal`.

### Scenario B: Shared SaaS product

- A separate AWS Organization managed by Control Tower (Organization Convention).
- SaaS workload with application-level multitenancy and Shared isolation.
- Shared workload infrastructure; no dedicated account per tenant.
- Example effective Convention Pack name: `product-a-aws-saas-shared`.

### Scenario C: Tiered SaaS product

- A separate AWS Organization managed by Control Tower (Organization Convention).
- Trial and Standard tiers on shared infrastructure; Enterprise tier on a dynamically
  created dedicated workload account (Deployment Convention with product-specific tier
  mapping).
- Enterprise account creation is initiated by application code, which calls a
  Provisioning API; the Provisioning API executes IaC, which creates and bootstraps the
  account; the provisioning outputs become Provisioning Context for later Context
  Resolution (see [`context-resolution.md`](../context-resolution.md#evaluation-context)).
- The same product is also deployable to Azure and to on-premises Kubernetes, reusing
  the same `saas-enterprise-dedicated` Deployment Convention.
- Example effective Convention Pack names: `product-b-aws-saas-trial`,
  `product-b-aws-saas-standard`, `product-b-aws-saas-enterprise`,
  `product-b-azure-saas-enterprise`, `product-b-kubernetes-saas-enterprise`.
- No Convention Pack is created per Enterprise tenant: every Enterprise tenant on AWS
  resolves through `product-b-aws-saas-enterprise`, with the tenant's dedicated
  deployment scope supplied as Provisioning Context.

## Relationship with Convention Pack

An effective [Convention Pack](../convention-pack.md) may compose a Deployment Convention
alongside a [Platform Convention](./platform-convention.md) and an
[Organization Convention](./organization-convention.md). See
[`convention-pack.md`](../convention-pack.md#composed-from-reusable-convention-dimensions)
for how these dimensions combine into a single effective Convention Pack, and
[`convention-pack.md`](../convention-pack.md#convention-pack-naming) for naming examples
of the effective packs referenced above.

## Out of scope

This document defines the *concept* of Deployment Convention only. It intentionally
does not define:

- concrete Deployment Convention artifacts (for example, an actual `saas-tiered`
  document);
- YAML, JSON, or generated representations of a Deployment Convention;
- a JSON Schema for Deployment Convention;
- a composition or merge algorithm;
- a Provisioning API or IaC implementation.

These are left for a later iteration of the Specification, consistent with how
[`convention-pack.md`](../convention-pack.md#out-of-scope) treats concrete Convention
Packs.
