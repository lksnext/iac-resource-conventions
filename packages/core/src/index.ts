// Public entry point for @lksnext/iac-conventions-core.
//
// Exposes the Executable Domain Model: the behavior-free TypeScript representation of
// the frozen Specification (Resource Identity, Governance Context, Naming Request,
// Evaluation Context, Resource Definition, Convention Pack, Convention Result — see
// ./model/index.ts and docs/architecture/executable-domain-model.md). It also exposes
// the public Reference Evaluator API (Milestone 2.7): `evaluate`, a single
// deterministic function composing Context Resolution and Convention Evaluation, and
// its aggregate input contract, `EvaluateInput` (see ./evaluator/evaluate.ts and
// ./evaluator/evaluate-input.ts). Every other evaluator stage and pipeline contract
// (Context Resolution's individual resolvers, Resource Projection, Convention
// Evaluation Rules, and their internal contracts — see ./evaluator/index.ts) remains
// internal, not re-exported from this package root (see
// docs/architecture/reference-evaluator.md#public-api-principles, and
// IMPLEMENTATION.md at the repository root for the current architecture, milestone
// status, and deferred decisions).

export { evaluate } from "./evaluator/evaluate.js";
export type { EvaluateInput } from "./evaluator/evaluate-input.js";

export type {
  CanonicalResourceIdentityAttribute,
  ConventionMetadata,
  ConventionOutputs,
  ConventionPack,
  ConventionPackId,
  ConventionPackIdentityDefaults,
  ConventionPackOverridePolicy,
  ConventionResult,
  ConventionValidation,
  ConventionValidationFailure,
  ConventionWarning,
  DeploymentIdentity,
  DeploymentScope,
  Environment,
  EvaluationContext,
  EvaluationContextSource,
  FunctionalIdentity,
  GovernanceContext,
  GovernanceProfileId,
  Location,
  NamingCasing,
  NamingRequest,
  NamingRequestDeployment,
  NamingRequestFunctional,
  NamingRequestOverrides,
  OrganizationalIdentity,
  Platform,
  ProviderScopeId,
  ProvisioningContext,
  ResourceDefinition,
  ResourceIdentity,
  ResourceIdentityConstraints,
  ResourceRenderingConstraints,
  ResourceType,
  RuntimeContext,
  SharedDeploymentContext,
  SharedOrganizationalContext,
  TenantId,
} from "./model/index.js";

/** The published name of this package, kept in sync with `package.json`. */
export const CORE_PACKAGE_NAME = "@lksnext/iac-conventions-core";
