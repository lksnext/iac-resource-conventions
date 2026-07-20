// Public surface of the Executable Domain Model. See
// docs/architecture/executable-domain-model.md for the architecture this module
// follows, and specification/ for the frozen conceptual Specification it represents.
//
// This module is intentionally behavior-free: every export is a type-only contract
// (an `interface` or `type` alias). No evaluator, validation, or naming logic lives
// here.

export type {
  ConventionPackId,
  DeploymentScope,
  Environment,
  GovernanceProfileId,
  Location,
  Platform,
  ProviderScopeId,
  ResourceType,
  TenantId,
} from "./common/index.js";
export type {
  EvaluationContext,
  EvaluationContextSource,
  ProvisioningContext,
  RuntimeContext,
  SharedDeploymentContext,
  SharedOrganizationalContext,
} from "./contexts/index.js";
export type {
  ConventionPack,
  ConventionPackIdentityDefaults,
  ConventionPackOverridePolicy,
} from "./conventions/index.js";
export type {
  ResourceDefinition,
  ResourceIdentityConstraints,
  ResourceRenderingConstraints,
} from "./definitions/index.js";
export type { GovernanceContext } from "./governance/index.js";
export type {
  DeploymentIdentity,
  FunctionalIdentity,
  OrganizationalIdentity,
  ResourceIdentity,
} from "./identity/index.js";
export type {
  NamingRequest,
  NamingRequestDeployment,
  NamingRequestFunctional,
  NamingRequestOverrides,
} from "./requests/index.js";

export type {
  ConventionMetadata,
  ConventionOutputs,
  ConventionResult,
  ConventionValidation,
  ConventionValidationFailure,
  ConventionWarning,
} from "./results/index.js";
