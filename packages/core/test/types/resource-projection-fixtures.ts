// Compile-time only contract fixtures for Resource Projection (Milestone 2.5:
// Resource Projection).
//
// This file is never executed and is not part of the published package: it is
// type-checked with `noEmit` via ../../tsconfig.test.json, and
// packages/core/package.json#files restricts the published tarball to `dist/` only.
// It exists to prove, at compile time, that `projectResource` accepts a resolved
// `ResourceIdentity` and the selected `ConventionPack` directly, returns the
// documented `ProjectedResource` shape, and remains internal to the evaluator (not
// part of the package root's public API).
//
// Runtime behavior (component inclusion, omission, ordering, and required-component
// handling) is covered by ../runtime/resource-projection.test.mjs; this file checks
// types only.

import type { ProjectedResource } from "../../src/evaluator/index.js";
import { projectResource } from "../../src/evaluator/index.js";
import { conventionPack, resolvedIdentity } from "./contract-fixtures.js";

// --- projectResource accepts a resolved ResourceIdentity and the selected ConventionPack ---

export const projectedResource: ProjectedResource = projectResource(
  resolvedIdentity,
  conventionPack,
);

// --- Compile-time rejection of invalid structures --------------------------------

// @ts-expect-error -- `components` is a ReadonlyArray; consumers must not mutate a
// projected resource's component list.
projectedResource.components.push({
  attribute: "functional.service",
  plane: "functional",
  value: "ingestion",
  required: false,
});

// @ts-expect-error -- a projected naming component's fields are readonly; a component
// must not be mutated in place.
projectedResource.components[0].value = "mutated";

// --- projectResource is internal, not part of the package root API ---------------

// @ts-expect-error -- `projectResource` is an internal evaluator function; it must not
// be importable from the package root until a concrete public evaluator API is defined
// (see docs/architecture/reference-evaluator.md#public-api-principles). If this import
// ever succeeds, this directive becomes unused and the build fails, catching an
// accidental public export.
import { projectResource as shouldNotBePublic } from "../../src/index.js";

// Referenced so the import above is not itself flagged as an unused import.
void shouldNotBePublic;
