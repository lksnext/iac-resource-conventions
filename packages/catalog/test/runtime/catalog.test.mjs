// Runtime tests for the Resource Definition Catalog's lookup API and definition
// integrity (Milestone 3.1: Catalog Architecture & Contracts; strengthened by
// Milestone 3.3: Catalog Validation & Model Conformance). See
// docs/architecture/resource-definition-catalog.md,
// docs/architecture/resource-definition-catalog-conformance.md, and
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

test("a returned ResourceDefinition's nested rendering_constraints cannot be mutated", () => {
  const definition = getResourceDefinition("aws_s3_bucket");

  assert.throws(() => {
    definition.rendering_constraints.max_length = 1;
  });
  assert.equal(definition.rendering_constraints.max_length, 63);
});

test("a returned ResourceDefinition's nested identity_constraints cannot be mutated", () => {
  const definition = getResourceDefinition("aws_iam_role");

  assert.throws(() => {
    definition.identity_constraints.global = false;
  });
  assert.equal(definition.identity_constraints.global, true);
});

test("a returned ResourceDefinition's placement_constraints array cannot be mutated", () => {
  const definition = getResourceDefinition("aws_acm_certificate");
  const originalLength = definition.placement_constraints.length;

  assert.throws(() => {
    definition.placement_constraints.push("fabricated constraint");
  });
  assert.equal(definition.placement_constraints.length, originalLength);

  assert.throws(() => {
    definition.placement_constraints[0] = "fabricated constraint";
  });
});

// --- Listing --------------------------------------------------------------------------

test("listResourceTypes returns exactly the expected catalog entries in lexical order", () => {
  assert.deepEqual(listResourceTypes(), [
    "aws_acm_certificate",
    "aws_iam_role",
    "aws_lambda_function",
    "aws_s3_bucket",
  ]);
});

test("listResourceTypes is deterministic across repeated calls", () => {
  assert.deepEqual(listResourceTypes(), listResourceTypes());
});

// --- Definition integrity ------------------------------------------------------------
//
// Structural conformance invariants (field-level validity, length-bound pairing,
// character-set/placement shape, catalog-key/resource_type/duplicate checks) are
// covered by the shared internal validator instead of being re-implemented here — see
// test/runtime/conformance.test.mjs and
// packages/catalog/src/internal/validate-resource-definition.ts. Only invariants that
// are specific to this file's own lookup/listing behavior remain below.

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
