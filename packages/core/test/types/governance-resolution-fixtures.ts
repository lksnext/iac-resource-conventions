// Compile-time only contract fixtures for Context Resolution's Governance Context
// resolution (Milestone 2.3: Context Resolution — Governance Context).
//
// This file is never executed and is not part of the published package: it is
// type-checked with `noEmit` via ../../tsconfig.test.json, and
// packages/core/package.json#files restricts the published tarball to `dist/` only.
// It exists to prove, at compile time, that `resolveGovernanceContext` accepts the
// Milestone 2.1 `ContextResolutionInput` contract unchanged, returns the documented
// `GovernanceContextResolution` shape, remains internal to the evaluator (not part of
// the package root's public API), and composes with `resolveResourceIdentity`'s output
// into the full Milestone 2.1 `ContextResolutionResult` contract.
//
// Runtime behavior (precedence, protection, required-attribute detection, scope
// isolation) is covered by ../runtime/governance-resolution.test.mjs; this file checks
// types only.

import type {
  ContextResolutionResult,
  GovernanceContextResolution,
} from "../../src/evaluator/index.js";
import { resolveGovernanceContext, resolveResourceIdentity } from "../../src/evaluator/index.js";
import { contextResolutionInput } from "./evaluator-contract-fixtures.js";

// --- resolveGovernanceContext accepts the existing Milestone 2.1 input contract --

export const governanceContextResolution: GovernanceContextResolution =
  resolveGovernanceContext(contextResolutionInput);

// --- Compile-time rejection of invalid structures --------------------------------

// @ts-expect-error -- GovernanceContextResolution's fields are readonly; a resolved
// result must not be mutated in place.
governanceContextResolution.governance_context = {};

// @ts-expect-error -- `diagnostics` is a ReadonlyArray; consumers must not mutate a
// resolution's recorded diagnostics.
governanceContextResolution.diagnostics.push({
  kind: "unresolved-required-attribute",
  attribute: "governance.owner",
  message: "unused",
});

// --- Composes with resolveResourceIdentity's output into the full Milestone 2.1 --
// --- ContextResolutionResult contract (see ../contracts/context-resolution-result.ts) ---

export const contextResolutionResult: ContextResolutionResult = {
  resource_identity: resolveResourceIdentity(contextResolutionInput).resource_identity,
  governance_context: governanceContextResolution.governance_context,
};

// --- resolveGovernanceContext is internal, not part of the package root API ------

// @ts-expect-error -- `resolveGovernanceContext` is an internal evaluator function;
// it must not be importable from the package root until a concrete public evaluator
// API is defined (see docs/architecture/reference-evaluator.md#public-api-principles).
// If this import ever succeeds, this directive becomes unused and the build fails,
// catching an accidental public export.
import { resolveGovernanceContext as shouldNotBePublic } from "../../src/index.js";

// Referenced so the import above is not itself flagged as an unused import.
void shouldNotBePublic;
