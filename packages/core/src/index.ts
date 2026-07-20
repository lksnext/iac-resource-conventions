// Public entry point for @lksnext/iac-conventions-core.
//
// Exposes the Executable Domain Model: the behavior-free TypeScript representation of
// the frozen Specification (Resource Identity, Governance Context, Naming Request,
// Evaluation Context, Resource Definition, Convention Pack, Convention Result — see
// ./model/index.ts and docs/architecture/executable-domain-model.md). No Context
// Resolution, Convention Evaluation, naming, validation, or other Reference Evaluator
// behavior is implemented yet — see IMPLEMENTATION.md at the repository root for the
// current architecture and deferred decisions.

export type {
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
