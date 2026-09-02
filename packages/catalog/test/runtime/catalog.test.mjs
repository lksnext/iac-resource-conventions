// Runtime tests for the Resource Definition Catalog's lookup API and definition
// integrity (Milestone 3.1: Catalog Architecture & Contracts). See
// docs/architecture/resource-definition-catalog.md and
// specification/resource-definition.md.
//
// `getResourceDefinition`/`listResourceTypes` are imported from the built package root
// (`dist/index.js`), the same way packages/core/test/runtime/evaluate.test.mjs reaches
// into core's own `dist/index.js` for its one public runtime export.

import assert from "node:assert/strict";
import { test } from "node:test";
import { getResourceDefinition, listResourceTypes } from "../../dist/index.js";

// --- Lookup semantics ---------------------------------------------------------------

test("a known resource type returns its ResourceDefinition", () => {
  const definition = getResourceDefinition("aws_s3_bucket");

  assert.ok(definition, "expected a definition for a known resource type");
  assert.equal(definition.resource_type, "aws_s3_bucket");
  assert.equal(definition.platform, "aws");
});

test("an unknown resource type returns undefined, not an exception", () => {
  assert.equal(getResourceDefinition("no_such_resource_type"), undefined);
});

test("lookup is deterministic across repeated calls", () => {
  assert.deepEqual(getResourceDefinition("aws_s3_bucket"), getResourceDefinition("aws_s3_bucket"));
});

// --- Immutability ---------------------------------------------------------------------

test("a returned ResourceDefinition cannot be mutated by the caller", () => {
  const definition = getResourceDefinition("aws_s3_bucket");

  assert.throws(() => {
    definition.platform = "azure";
  });
});

// --- Listing --------------------------------------------------------------------------

test("listResourceTypes returns every catalog entry in lexical order", () => {
  const resourceTypes = listResourceTypes();

  assert.deepEqual(resourceTypes, [...resourceTypes].sort());
  assert.ok(resourceTypes.includes("aws_s3_bucket"));
});

test("listResourceTypes is deterministic across repeated calls", () => {
  assert.deepEqual(listResourceTypes(), listResourceTypes());
});

// --- Definition integrity ------------------------------------------------------------

test("every catalog key matches its own definition's resource_type", () => {
  for (const resourceType of listResourceTypes()) {
    const definition = getResourceDefinition(resourceType);

    assert.equal(
      definition.resource_type,
      resourceType,
      `catalog key "${resourceType}" must match definition.resource_type`,
    );
  }
});

test("every catalog entry declares a platform", () => {
  for (const resourceType of listResourceTypes()) {
    const definition = getResourceDefinition(resourceType);

    assert.equal(typeof definition.platform, "string");
    assert.ok(definition.platform.length > 0);
  }
});

test("no catalog entry declares max_length without length_unit, or vice versa", () => {
  for (const resourceType of listResourceTypes()) {
    const { rendering_constraints } = getResourceDefinition(resourceType);

    if (rendering_constraints === undefined) {
      continue;
    }
    const hasMaxLength = rendering_constraints.max_length !== undefined;
    const hasLengthUnit = rendering_constraints.length_unit !== undefined;
    assert.equal(
      hasMaxLength,
      hasLengthUnit,
      `${resourceType}: max_length and length_unit must be declared together`,
    );
  }
});
