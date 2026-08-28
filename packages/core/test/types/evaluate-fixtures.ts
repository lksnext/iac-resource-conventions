// Compile-time only contract fixtures for the public Reference Evaluator API
// (Milestone 2.7: Reference Evaluator API).
//
// This file is never executed and is not part of the published package: it is
// type-checked with `noEmit` via ../../tsconfig.test.json, and
// packages/core/package.json#files restricts the published tarball to `dist/` only.
// It exists to prove, at compile time, that `evaluate` and `EvaluateInput` — unlike
// every other evaluator stage and pipeline contract (see
// ./evaluator-contract-fixtures.ts, ./context-resolution-fixtures.ts,
// ./governance-resolution-fixtures.ts, ./resource-projection-fixtures.ts, and
// ./convention-evaluation-fixtures.ts, which each prove the opposite) — ARE part of
// the package root's public API, requiring no deep import into `src/evaluator/`.
//
// Runtime behavior (orchestration, identity-boundary checks, diagnostics propagation)
// is covered by ../runtime/evaluate.test.mjs; this file checks types only.

import type { ConventionResult, EvaluateInput } from "../../src/index.js";
import { evaluate } from "../../src/index.js";
import {
  conventionPack,
  evaluationContext,
  minimalRequest,
  resourceDefinition,
} from "./contract-fixtures.js";

// --- evaluate and EvaluateInput are importable from the package root, no deep import ---

export const evaluateInput: EvaluateInput = {
  naming_request: minimalRequest,
  convention_pack: conventionPack,
  evaluation_context: evaluationContext,
  resource_definition: resourceDefinition,
};

export const evaluateResult: ConventionResult = evaluate(evaluateInput);

// --- Compile-time rejection of invalid structures --------------------------------

// @ts-expect-error -- every EvaluateInput field is required: `evaluate` cannot
// orchestrate Context Resolution or Convention Evaluation without all four inputs.
export const evaluateInputMissingField: EvaluateInput = {
  naming_request: minimalRequest,
  convention_pack: conventionPack,
  evaluation_context: evaluationContext,
};

// @ts-expect-error -- EvaluateInput's fields are readonly; the caller's input must not
// be mutated in place.
evaluateInput.resource_definition = resourceDefinition;
