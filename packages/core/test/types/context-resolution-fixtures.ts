// Compile-time only contract fixtures for Context Resolution's Resource Identity
// resolution (Milestone 2.2: Context Resolution — Resource Identity).
//
// This file is never executed and is not part of the published package: it is
// type-checked with `noEmit` via ../../tsconfig.test.json, and
// packages/core/package.json#files restricts the published tarball to `dist/` only.
// It exists to prove, at compile time, that `resolveResourceIdentity` accepts the
// Milestone 2.1 `ContextResolutionInput` contract unchanged, returns the documented
// `ResourceIdentityResolution` shape, and — like the pipeline contracts themselves —
// remains internal to the evaluator, not part of the package root's public API.
//
// Runtime behavior (precedence, authority, protection, required-attribute detection)
// is covered by ../runtime/context-resolution.test.mjs; this file checks types only.

import type { ResourceIdentityResolution } from "../../src/evaluator/index.js";
import { resolveResourceIdentity } from "../../src/evaluator/index.js";
import { contextResolutionInput } from "./evaluator-contract-fixtures.js";

// --- resolveResourceIdentity accepts the existing Milestone 2.1 input contract ---

export const resourceIdentityResolution: ResourceIdentityResolution =
  resolveResourceIdentity(contextResolutionInput);

// --- Compile-time rejection of invalid structures --------------------------------

// @ts-expect-error -- ResourceIdentityResolution's fields are readonly; a resolved
// result must not be mutated in place.
resourceIdentityResolution.resource_identity = {};

// @ts-expect-error -- `diagnostics` is a ReadonlyArray; consumers must not mutate a
// resolution's recorded diagnostics.
resourceIdentityResolution.diagnostics.push({
  kind: "unresolved-required-attribute",
  attribute: "organizational.system",
  message: "unused",
});

// --- resolveResourceIdentity is internal, not part of the package root API -------

// @ts-expect-error -- `resolveResourceIdentity` is an internal evaluator function; it
// must not be importable from the package root until a concrete public evaluator API
// is defined (see docs/architecture/reference-evaluator.md#public-api-principles). If
// this import ever succeeds, this directive becomes unused and the build fails,
// catching an accidental public export.
import { resolveResourceIdentity as shouldNotBePublic } from "../../src/index.js";

// Referenced so the import above is not itself flagged as an unused import.
void shouldNotBePublic;
