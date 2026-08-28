// Internal entry point for the Reference Evaluator (Milestone 2.1: Reference
// Evaluator Pipeline Contracts; Milestone 2.2: Context Resolution — Resource
// Identity; Milestone 2.3: Context Resolution — Governance Context; Milestone 2.5:
// Resource Projection; Milestone 2.6: Convention Evaluation Rules; Milestone 2.6.2:
// Executable Naming Rules; Milestone 2.6.3: Executable Naming Conformance).
//
// Convention Evaluation Rules are implemented to the extent the frozen Specification
// and current Executable Domain Model make executable: required-attribute
// completeness validation, and Specification v1.1 executable naming — component
// ordering, abbreviation, casing, separator joining, optional-component omission, and
// rejection of a Convention Pack whose `naming_component_order` lists the same
// canonical attribute reference more than once (see
// specification/convention-pack.md#naming-projections). Normalization beyond casing,
// truncation, hashing, metadata projection, Resource Definition technical-constraint
// validation, and Placement Constraint validation remain unimplemented, each blocked
// on a documented Specification or domain-model gap — see
// docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented.
//
// Milestone 2.7 added a public `evaluate()` function (../evaluator/evaluate.ts) and its
// `EvaluateInput` contract (../evaluator/evaluate-input.ts), composing the stages this
// module exports. Both are re-exported directly from ../index.ts (the package root)
// instead of from this barrel — see ../index.ts and
// docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented.
//
// This module itself is intentionally NOT re-exported from ../index.ts: every other
// evaluator stage and contract exported below remains internal by default, since no
// concrete consumer need justifies making it independently public (see
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
