// Compile-time only contract fixtures for Convention Evaluation Rules (Milestone 2.6:
// Convention Evaluation Rules).
//
// This file is never executed and is not part of the published package: it is
// type-checked with `noEmit` via ../../tsconfig.test.json, and
// packages/core/package.json#files restricts the published tarball to `dist/` only.
// It exists to prove, at compile time, that `evaluateConvention` accepts the existing
// Milestone 2.1 `ConventionEvaluationInput` contract unchanged, returns the existing
// domain `ConventionResult` contract, and remains internal to the evaluator (not part
// of the package root's public API).
//
// Runtime behavior (required-attribute completeness, `outputs`/`warnings` shape,
// determinism) is covered by ../runtime/convention-evaluation.test.mjs; this file
// checks types only.

import { evaluateConvention } from "../../src/evaluator/index.js";
import type { ConventionResult } from "../../src/model/index.js";
import { conventionEvaluationInput } from "./evaluator-contract-fixtures.js";

// --- evaluateConvention accepts the existing Milestone 2.1 input contract --------

export const conventionResult: ConventionResult = evaluateConvention(conventionEvaluationInput);

// --- Compile-time rejection of invalid structures --------------------------------

// @ts-expect-error -- `ConventionResult`'s `outputs` and `validation` fields are
// required; a Convention Evaluation result must not omit either.
export const conventionResultMissingField: ConventionResult = {
  resource_identity: conventionResult.resource_identity,
  governance_context: conventionResult.governance_context,
};

// @ts-expect-error -- `ConventionResult.validation.failures` is a ReadonlyArray;
// consumers must not mutate a produced result's failures in place.
(conventionResult.validation.failures ?? []).push({ message: "unused" });

// --- evaluateConvention is internal, not part of the package root API -----------

// @ts-expect-error -- `evaluateConvention` is an internal evaluator function; it must
// not be importable from the package root until a concrete public evaluator API is
// defined (see docs/architecture/reference-evaluator.md#public-api-principles). If
// this import ever succeeds, this directive becomes unused and the build fails,
// catching an accidental public export.
import { evaluateConvention as shouldNotBePublic } from "../../src/index.js";

// Referenced so the import above is not itself flagged as an unused import.
void shouldNotBePublic;
