// Public surface of the Executable Domain Model. See
// docs/architecture/executable-domain-model.md for the architecture this module
// follows, and specification/ for the frozen conceptual Specification it represents.
//
// This module is intentionally behavior-free: every export is a type-only contract
// (an `interface` or `type` alias). No evaluator, validation, or naming logic lives
// here.

export type {
  CanonicalResourceIdentityAttribute,
  ConventionPackId,
  DeploymentScope,
  Environment,
  GovernanceContextAttribute,
  GovernanceProfileId,
  Location,
  MetadataSourceReference,
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
  ConditionalTagProjection,
  ConventionPack,
  ConventionPackIdentityDefaults,
  ConventionPackOverridePolicy,
  NamingCasing,
  TagProjection,
} from "./conventions/index.js";
export type {
  PlacementConstraint,
  PlacementConstraintCondition,
  PlacementConstraintOperator,
  PlacementConstraintRule,
  ResourceDefinition,
  ResourceIdentityConstraints,
  ResourceLengthBounds,
  ResourceNameCharacterClass,
  ResourceNameCharacterSet,
  ResourceNameLengthUnit,
  ResourceNameSegmentLimit,
  ResourceRenderingConstraints,
  ResourceTagConstraints,
  ResourceTagTextConstraints,
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
  ConventionValidationFailureCode,
  ConventionWarning,
} from "./results/index.js";
