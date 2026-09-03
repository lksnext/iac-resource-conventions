// End-to-end integration test proving the intended package boundary (Milestone 3.1):
//
//   resource_type -> catalog lookup -> ResourceDefinition -> evaluate() -> ConventionResult
//
// The catalog performs only the lookup; `evaluate()` is unaware the definition came
// from a catalog at all — it is called exactly the same way
// packages/core/test/runtime/evaluate.test.mjs already calls it, with an explicitly
// looked-up `resource_definition`. This proves catalog lookup happens outside
// `evaluate()`, per docs/architecture/resource-definition-catalog.md.
//
// Milestone 4.2 extends this with a second flow proving a caller no longer needs to
// construct a ConventionPack by hand:
//
//   convention id -> catalog lookup -> ConventionPack
//   resource_type -> catalog lookup -> ResourceDefinition
//     -> evaluate() -> ConventionResult
//
// Both lookups happen outside `evaluate()`, using only this package's public API — see
// docs/architecture/convention-pack-catalog.md#cli-relationship.

import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate } from "@lksnext/iac-conventions-core";
import { getConventionPack, getResourceDefinition } from "../../dist/index.js";

test("integration: a catalog-looked-up ResourceDefinition can be passed to evaluate()", () => {
  const resourceDefinition = getResourceDefinition("aws_s3_bucket");
  assert.ok(resourceDefinition, "expected the catalog to know aws_s3_bucket");

  const result = evaluate({
    naming_request: {
      convention: "test-pack",
      resource_type: "aws_s3_bucket",
      functional: { service: "ingestion" },
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: [
        "organizational.system",
        "functional.service",
        "functional.resource_type",
      ],
      separator: "-",
    },
    evaluation_context: {
      shared_organizational_context: { system: "telemetry-platform" },
    },
    resource_definition: resourceDefinition,
  });

  assert.equal(result.outputs.name, "telemetry-platform-ingestion-aws_s3_bucket");
});

test("integration: a catalog definition's max_length/length_unit constrains evaluate()'s validation", () => {
  const resourceDefinition = getResourceDefinition("aws_s3_bucket");
  assert.ok(resourceDefinition, "expected the catalog to know aws_s3_bucket");
  assert.equal(resourceDefinition.rendering_constraints.max_length, 63);
  assert.equal(resourceDefinition.rendering_constraints.length_unit, "code_points");

  const result = evaluate({
    naming_request: {
      convention: "test-pack",
      resource_type: "aws_s3_bucket",
      functional: { service: "a".repeat(70) },
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.service"],
      separator: "",
    },
    evaluation_context: {},
    resource_definition: resourceDefinition,
  });

  assert.deepEqual(result.validation.failures, [
    { message: "name exceeds max_length of 63 characters", code: "max-length" },
  ]);
});

test("integration: a catalog-looked-up ConventionPack and ResourceDefinition can both be passed to evaluate()", () => {
  const conventionPack = getConventionPack("aws-workload-default");
  assert.ok(conventionPack, "expected the catalog to know aws-workload-default");

  // aws_iam_role, not aws_s3_bucket, is used here: aws-workload-default's
  // naming_component_order always includes functional.resource_type verbatim (per its
  // own worked example in specification/convention-packs/aws-workload-default.md), and
  // aws_s3_bucket's own character_constraints forbid the underscore in
  // "aws_s3_bucket" itself — a real, but unrelated, S3 naming-rule finding this test
  // does not need to exercise. aws_iam_role's character_constraints allow underscores.
  const resourceDefinition = getResourceDefinition("aws_iam_role");
  assert.ok(resourceDefinition, "expected the catalog to know aws_iam_role");

  const result = evaluate({
    naming_request: {
      convention: "aws-workload-default",
      resource_type: "aws_iam_role",
      functional: { service: "ingestion" },
    },
    convention_pack: conventionPack,
    evaluation_context: {
      shared_organizational_context: { system: "telemetry-platform" },
      shared_deployment_context: { environment: "production" },
    },
    resource_definition: resourceDefinition,
  });

  assert.equal(result.outputs.name, "telemetry-platform-ingestion-prod-aws_iam_role");
  assert.equal(result.validation.valid, true);
});
