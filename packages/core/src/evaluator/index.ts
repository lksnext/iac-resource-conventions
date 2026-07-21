// Internal entry point for the Reference Evaluator (Milestone 2.1: Reference
// Evaluator Pipeline Contracts; Milestone 2.2: Context Resolution — Resource
// Identity; Milestone 2.3: Context Resolution — Governance Context).
//
// Resource Definition selection, Convention Evaluation, and a public `evaluate()`
// function do not exist yet — see docs/architecture/reference-evaluator.md for the
// full architecture and increment plan.
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
