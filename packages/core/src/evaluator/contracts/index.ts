// Barrel export for the Reference Evaluator's internal pipeline contracts (Milestone
// 2.1). See ./context-resolution-input.ts, ./context-resolution-result.ts, and
// ./convention-evaluation-input.ts for the individual contracts and their normative
// basis, and docs/architecture/reference-evaluator.md for the overall architecture.
//
// This module is intentionally behavior-free: every export here is a type-only
// contract, and none of these types implement Context Resolution, Resource Definition
// selection, or Convention Evaluation behavior themselves. That behavior exists
// elsewhere under ../context-resolution/, ../resource-projection/, and
// ../convention-evaluation/, which consume these contracts. These contracts remain
// internal evaluator-stage boundaries only: no public `evaluate()` API is exposed yet
// (see docs/architecture/reference-evaluator.md#public-api-principles).

export type { ContextResolutionInput } from "./context-resolution-input.js";
export type { ContextResolutionResult } from "./context-resolution-result.js";
export type { ConventionEvaluationInput } from "./convention-evaluation-input.js";
