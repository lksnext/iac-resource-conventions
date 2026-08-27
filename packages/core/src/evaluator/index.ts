// Internal entry point for the Reference Evaluator (Milestone 2.1: Reference
// Evaluator Pipeline Contracts; Milestone 2.2: Context Resolution — Resource
// Identity; Milestone 2.3: Context Resolution — Governance Context; Milestone 2.5:
// Resource Projection; Milestone 2.6: Convention Evaluation Rules).
//
// Convention Evaluation Rules are implemented only to the extent the frozen
// Specification and current Executable Domain Model make executable: required-attribute
// completeness validation. Naming rendering, abbreviation application, normalization,
// metadata projection, Resource Definition technical-constraint validation, and
// Placement Constraint validation remain unimplemented, each blocked on a documented
// Specification or domain-model gap — see
// docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented. A
// public `evaluate()` function does not exist yet.
//
// This module is intentionally NOT re-exported from ../index.ts (the package root):
// evaluator stages and contracts are internal by default until a concrete, stable
// public evaluator API is defined (see
// docs/architecture/reference-evaluator.md#public-api-principles). It may depend on
// the domain model (../model/index.js); the domain model must never depend on it.

export type {
  ContextResolutionDiagnostic,
  GovernanceContextResolution,
  ResourceIdentityResolution,
} from "./context-resolution/index.js";

export { resolveGovernanceContext, resolveResourceIdentity } from "./context-resolution/index.js";
export type {
  ContextResolutionInput,
  ContextResolutionResult,
  ConventionEvaluationInput,
} from "./contracts/index.js";
export { evaluateConvention } from "./convention-evaluation/index.js";
export type {
  ProjectedNamingComponent,
  ProjectedNamingComponentPlane,
  ProjectedResource,
} from "./resource-projection/index.js";
export { projectResource } from "./resource-projection/index.js";
