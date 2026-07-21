# Executable Domain Model Traceability

## Purpose

This document maps normative concepts defined in the frozen [`specification/`](../../specification/)
to their public TypeScript representation in `@lksnext/iac-conventions-core`
(see [`docs/architecture/executable-domain-model.md`](executable-domain-model.md) for the
architecture the model follows).

- The Specification remains the single source of truth for every concept it defines.
- This matrix is informational and implementation-facing; it does not define new conventions.
- If this matrix and the Specification ever disagree, the Specification is authoritative — fix
  the matrix (or the code it describes), never the Specification (see
  [`AGENTS.md`](../../AGENTS.md#specification-freeze-v10) and
  [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md#specification-freeze-v10)).
- Update this matrix whenever a public domain contract is added, renamed, removed, or made
  internal (see [Maintenance rules](#maintenance-rules)).

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `Implemented` | The concept has a public TypeScript contract that represents its full data shape as the Specification currently describes it. |
| `Partially implemented` | A public TypeScript contract exists, but the Specification itself leaves part of the concept's shape, syntax, or grammar undefined; the contract necessarily covers only what the Specification currently defines. |

## Traceability matrix

| Specification concept | Specification source | TypeScript contract | Source file | Public API | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Resource Identity | [resource-identity.md](../../specification/resource-identity.md) | `ResourceIdentity` | [identity/resource-identity.ts](../../packages/core/src/model/identity/resource-identity.ts) | Yes | Implemented | Composed aggregate of the three identity planes below; exact match with [resource-identity.schema.json](../../specification/schemas/resource-identity.schema.json) |
| Organizational Identity | [resource-identity.md#plane-1-organizational-identity](../../specification/resource-identity.md#plane-1-organizational-identity) | `OrganizationalIdentity` | [identity/organizational-identity.ts](../../packages/core/src/model/identity/organizational-identity.ts) | Yes | Implemented | Exact schema mapping |
| Deployment Identity | [resource-identity.md#plane-2-deployment-identity](../../specification/resource-identity.md#plane-2-deployment-identity) | `DeploymentIdentity` | [identity/deployment-identity.ts](../../packages/core/src/model/identity/deployment-identity.ts) | Yes | Implemented | Exact schema mapping |
| Functional Identity | [resource-identity.md#plane-3-functional-identity](../../specification/resource-identity.md#plane-3-functional-identity) | `FunctionalIdentity` | [identity/functional-identity.ts](../../packages/core/src/model/identity/functional-identity.ts) | Yes | Implemented | Exact schema mapping |
| Governance Context | [governance-context.md](../../specification/governance-context.md) | `GovernanceContext` | [governance/governance-context.ts](../../packages/core/src/model/governance/governance-context.ts) | Yes | Implemented | Exact match with [governance-context.schema.json](../../specification/schemas/governance-context.schema.json) |
| Evaluation Context | [context-resolution.md#evaluation-context](../../specification/context-resolution.md#evaluation-context) | `EvaluationContext` | [contexts/evaluation-context.ts](../../packages/core/src/model/contexts/evaluation-context.ts) | Yes | Implemented | Composed aggregate of the three Evaluation Context sources below |
| Evaluation Context Source | [context-resolution.md#evaluation-context](../../specification/context-resolution.md#evaluation-context), [convention-pack.md#context-authority-rules](../../specification/convention-pack.md#context-authority-rules) | `EvaluationContextSource` | [contexts/evaluation-context-source.ts](../../packages/core/src/model/contexts/evaluation-context-source.ts) | Yes | Implemented | Faithful interpretation: the Specification names these four sources in prose, not as fixed string literals |
| Shared Organizational Context | [context-resolution.md#evaluation-context](../../specification/context-resolution.md#evaluation-context) | `SharedOrganizationalContext` | [contexts/shared-organizational-context.ts](../../packages/core/src/model/contexts/shared-organizational-context.ts) | Yes | Implemented | Deliberate alias of `OrganizationalIdentity` (same identity plane, a different resolution role) |
| Shared Deployment Context | [context-resolution.md#evaluation-context](../../specification/context-resolution.md#evaluation-context) | `SharedDeploymentContext` | [contexts/shared-deployment-context.ts](../../packages/core/src/model/contexts/shared-deployment-context.ts) | Yes | Implemented | Deliberate alias of `DeploymentIdentity` |
| Runtime Context | [context-resolution.md#precedence-authority-and-protection](../../specification/context-resolution.md#precedence-authority-and-protection) | `RuntimeContext` | [contexts/runtime-context.ts](../../packages/core/src/model/contexts/runtime-context.ts) | Yes | Partially implemented | Faithful interpretation; the Specification intentionally does not enumerate a fixed field set for Runtime Context |
| Provisioning Context | [context-resolution.md#provisioning-lifecycle](../../specification/context-resolution.md#provisioning-lifecycle) | `ProvisioningContext` | [contexts/provisioning-context.ts](../../packages/core/src/model/contexts/provisioning-context.ts) | Yes | Partially implemented | Deliberate structural alias of `RuntimeContext`; every Provisioning Context is a Runtime Context |
| Naming Request | [naming-request.md](../../specification/naming-request.md) | `NamingRequest`, `NamingRequestFunctional`, `NamingRequestDeployment`, `NamingRequestOverrides` | [requests/naming-request.ts](../../packages/core/src/model/requests/naming-request.ts) | Yes | Implemented | Exact match with [naming-request.schema.json](../../specification/schemas/naming-request.schema.json); Overrides composed from the three identity planes plus Governance Context |
| Resource Definition | [resource-definition.md](../../specification/resource-definition.md) | `ResourceDefinition`, `ResourceIdentityConstraints`, `ResourceRenderingConstraints` | [definitions/resource-definition.ts](../../packages/core/src/model/definitions/resource-definition.ts) | Yes | Partially implemented | Named responsibility categories only; the Specification's own ["Out of scope"](../../specification/resource-definition.md#out-of-scope-for-this-document) section defers a concrete schema or Placement Constraint grammar |
| Convention Pack | [convention-pack.md](../../specification/convention-pack.md) | `ConventionPack`, `ConventionPackIdentityDefaults`, `ConventionPackOverridePolicy` | [conventions/convention-pack.ts](../../packages/core/src/model/conventions/convention-pack.ts) | Yes | Partially implemented | Normalization rules and metadata projection mappings are intentionally not modeled; the Specification's own ["Out of scope"](../../specification/convention-pack.md#out-of-scope) section defers their concrete syntax |
| Convention Result | [convention-result.md](../../specification/convention-result.md) | `ConventionResult`, `ConventionOutputs`, `ConventionMetadata` | [results/convention-result.ts](../../packages/core/src/model/results/convention-result.ts) | Yes | Implemented | A single structured bundle, not a discriminated union — matches the Specification's own description |
| Convention Validation | [convention-result.md#conceptual-contents](../../specification/convention-result.md#conceptual-contents) | `ConventionValidation`, `ConventionValidationFailure`, `ConventionWarning` | [results/convention-result.ts](../../packages/core/src/model/results/convention-result.ts) | Yes | Implemented | A `valid` flag plus optional failures/warnings; no structured failure code, since the Specification describes only human-readable outcomes |
| Resource Type | [resource-identity.md#plane-3-functional-identity](../../specification/resource-identity.md#plane-3-functional-identity), [resource-definition.md](../../specification/resource-definition.md) | `ResourceType` | [common/identifiers.ts](../../packages/core/src/model/common/identifiers.ts) | Yes | Implemented | Public supporting type; the link between Resource Identity and Resource Definition |
| Convention Pack ID | [naming-request.md#request-model](../../specification/naming-request.md#request-model), [convention-pack.md](../../specification/convention-pack.md) | `ConventionPackId` | [common/identifiers.ts](../../packages/core/src/model/common/identifiers.ts) | Yes | Implemented | Public supporting type; shared between `NamingRequest.convention` and `ConventionPack.id` |
| Governance Profile ID | [governance-context.md#governance-attributes](../../specification/governance-context.md#governance-attributes) | `GovernanceProfileId` | [common/identifiers.ts](../../packages/core/src/model/common/identifiers.ts) | Yes | Implemented | Public supporting type |
| Platform | [resource-identity.md#plane-2-deployment-identity](../../specification/resource-identity.md#plane-2-deployment-identity), [resource-definition.md](../../specification/resource-definition.md) | `Platform` | [common/identifiers.ts](../../packages/core/src/model/common/identifiers.ts) | Yes | Implemented | Public supporting type; shared between Deployment Identity and Resource Definition |
| Deployment Scope | [resource-identity.md#plane-2-deployment-identity](../../specification/resource-identity.md#plane-2-deployment-identity) | `DeploymentScope` | [common/identifiers.ts](../../packages/core/src/model/common/identifiers.ts) | Yes | Implemented | Public supporting type |
| Provider Scope ID | [context-resolution.md#deployment-scope-versus-provider-scope-id](../../specification/context-resolution.md#deployment-scope-versus-provider-scope-id) | `ProviderScopeId` | [common/identifiers.ts](../../packages/core/src/model/common/identifiers.ts) | Yes | Implemented | Public supporting type |
| Environment | [resource-identity.md#plane-2-deployment-identity](../../specification/resource-identity.md#plane-2-deployment-identity) | `Environment` | [common/identifiers.ts](../../packages/core/src/model/common/identifiers.ts) | Yes | Implemented | Public supporting type |
| Location | [resource-identity.md#plane-2-deployment-identity](../../specification/resource-identity.md#plane-2-deployment-identity) | `Location` | [common/identifiers.ts](../../packages/core/src/model/common/identifiers.ts) | Yes | Implemented | Public supporting type |
| Tenant ID | [resource-identity.md#plane-1-organizational-identity](../../specification/resource-identity.md#plane-1-organizational-identity) | `TenantId` | [common/identifiers.ts](../../packages/core/src/model/common/identifiers.ts) | Yes | Implemented | Public supporting type |

These 25 rows account for all 36 public type exports currently listed in
[`packages/core/src/index.ts`](../../packages/core/src/index.ts) (verified against
[`packages/core/src/model/index.ts`](../../packages/core/src/model/index.ts)); several rows group
more than one contract where those contracts share one normative responsibility (for example
`NamingRequest` and its three request-shaped sub-types).

## Deferred behavior

The contracts above represent data shapes only. The following behaviors are intentionally not
implemented in Milestone 1, even where a contract above models one of their inputs or outputs:

- Context Resolution
- Authority and precedence resolution between Evaluation Context sources
- Fallback behavior between resolution sources
- Convention Evaluation
- Resource name rendering
- Normalization
- Truncation
- Hashing
- Collision handling
- Diagnostic (explanation/warning/failure message) generation

For example, `ConventionResult` models the *shape* of a validation outcome and its warnings, but
nothing in the model computes them — that is the Reference Evaluator's responsibility (see
[`docs/architecture/executable-domain-model.md#non-goals`](executable-domain-model.md#non-goals)).

## Maintenance rules

1. Update this matrix when a public domain contract is added, renamed, removed, or made internal.
2. Update this matrix when the Specification changes.
3. Never change the Specification merely to match the implementation — see
   [`AGENTS.md`](../../AGENTS.md#specification-evolution).
4. Keep source links repository-relative, as in this document.
5. Do not include Reference Evaluator implementation classes or adapter-specific contracts here —
   this matrix is scoped to the Executable Domain Model's public data contracts only.
6. Review this matrix as part of any public API change to `@lksnext/iac-conventions-core`.
