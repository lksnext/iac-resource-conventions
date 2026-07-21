// Barrel export for the Reference Evaluator's internal pipeline contracts (Milestone
// 2.1). See ./context-resolution-input.ts, ./context-resolution-result.ts, and
// ./convention-evaluation-input.ts for the individual contracts and their normative
// basis, and docs/architecture/reference-evaluator.md for the overall architecture.
//
// This module is intentionally behavior-free: every export is a type-only contract.
// No Context Resolution, Resource Definition selection, or Convention Evaluation
// behavior is implemented yet.

export type { ContextResolutionInput } from "./context-resolution-input.js";
export type { ContextResolutionResult } from "./context-resolution-result.js";
export type { ConventionEvaluationInput } from "./convention-evaluation-input.js";
