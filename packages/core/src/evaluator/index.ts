// Internal entry point for the Reference Evaluator's pipeline contracts (Milestone
// 2.1: Reference Evaluator Pipeline Contracts).
//
// These are behavior-free stage-boundary types only: no Context Resolution, Resource
// Definition selection, Convention Evaluation, or public `evaluate()` function exists
// yet — see docs/architecture/reference-evaluator.md for the full architecture and
// increment plan.
//
// This module is intentionally NOT re-exported from ../index.ts (the package root):
// evaluator stage contracts are internal by default until a concrete, stable public
// evaluator API is defined (see
// docs/architecture/reference-evaluator.md#public-api-principles). It may depend on
// the domain model (../model/index.js); the domain model must never depend on it.

export type {
  ContextResolutionInput,
  ContextResolutionResult,
  ConventionEvaluationInput,
} from "./contracts/index.js";
