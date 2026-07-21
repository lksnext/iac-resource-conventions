// Compile-time only contract fixtures for the Reference Evaluator's pipeline contracts
// (Milestone 2.1: Reference Evaluator Pipeline Contracts).
//
// This file is never executed and is not part of the published package: it is
// type-checked with `noEmit` via ../../tsconfig.test.json, and
// packages/core/package.json#files restricts the published tarball to `dist/` only.
// It exists to prove, at compile time, that the evaluator's internal pipeline
// contracts accept representative valid compositions, reject representative invalid
// ones, compose existing domain contracts rather than duplicate them, and remain
// internal to the evaluator (not part of the package root's public API).
//
// Values below are minimal, neutral, and fictional. They do not encode a naming
// algorithm, assert a generated name, or imply any Reference Evaluator behavior — no
// Context Resolution, Resource Definition selection, or Convention Evaluation function
// exists yet.

import type {
  ContextResolutionInput,
  ContextResolutionResult,
  ConventionEvaluationInput,
} from "../../src/evaluator/index.js";
import {
  conventionPack,
  evaluationContext,
  minimalRequest,
  resolvedGovernance,
  resolvedIdentity,
  resourceDefinition,
} from "./contract-fixtures.js";

// --- Valid contract compositions, composing existing domain fixtures ------------

// ContextResolutionInput composes the three existing domain contracts Context
// Resolution consumes together; it introduces no new domain attributes of its own.
export const contextResolutionInput: ContextResolutionInput = {
  naming_request: minimalRequest,
  convention_pack: conventionPack,
  evaluation_context: evaluationContext,
};

// ContextResolutionResult composes the two existing domain contracts Context
// Resolution produces together.
export const contextResolutionResult: ContextResolutionResult = {
  resource_identity: resolvedIdentity,
  governance_context: resolvedGovernance,
};

// ConventionEvaluationInput composes ContextResolutionResult (itself composed above)
// with the two remaining existing domain contracts Convention Evaluation consumes.
export const conventionEvaluationInput: ConventionEvaluationInput = {
  resolved_context: contextResolutionResult,
  resource_definition: resourceDefinition,
  convention_pack: conventionPack,
};

// --- Compile-time rejection of invalid structures --------------------------------

// @ts-expect-error -- unlike the individual domain contracts it composes,
// ContextResolutionInput requires every field: Context Resolution cannot run without
// all three inputs present (missing `evaluation_context` here).
export const contextResolutionInputMissingField: ContextResolutionInput = {
  naming_request: minimalRequest,
  convention_pack: conventionPack,
};

// @ts-expect-error -- governance_context is required: ContextResolutionResult
// represents the completed, paired output of one Context Resolution evaluation.
export const contextResolutionResultMissingField: ContextResolutionResult = {
  resource_identity: resolvedIdentity,
};

// @ts-expect-error -- convention_pack is required: Convention Evaluation cannot
// proceed without the Convention Pack whose policy it applies.
export const conventionEvaluationInputMissingField: ConventionEvaluationInput = {
  resolved_context: contextResolutionResult,
  resource_definition: resourceDefinition,
};

// @ts-expect-error -- ContextResolutionResult's fields are readonly; a completed
// Context Resolution result must not be mutated in place.
contextResolutionResult.resource_identity = {};

// @ts-expect-error -- ConventionEvaluationInput's fields are readonly.
conventionEvaluationInput.resource_definition = resourceDefinition;

// --- Evaluator stage contracts are internal, not part of the package root API ----

// @ts-expect-error -- ContextResolutionInput is an internal evaluator pipeline
// contract; it must not be importable from the package root until a concrete public
// evaluator API is defined (see
// docs/architecture/reference-evaluator.md#public-api-principles). If this import
// ever succeeds, this directive becomes unused and the build fails, catching an
// accidental public export.
import type { ContextResolutionInput as ShouldNotBePublic } from "../../src/index.js";

// Referenced so the import above is not itself flagged as an unused import.
export type AssertContextResolutionInputStaysInternal = ShouldNotBePublic;
