// End-to-end integration test proving the intended package boundary (Milestone 3.1):
//
//   resource_type -> catalog lookup -> ResourceDefinition -> evaluate() -> ConventionResult
//
// The catalog performs only the lookup; `evaluate()` is unaware the definition came
// from a catalog at all — it is called exactly the same way
// packages/core/test/runtime/evaluate.test.mjs already calls it, with an explicitly
// looked-up `resource_definition`. This proves catalog lookup happens outside
// `evaluate()`, per docs/architecture/resource-definition-catalog.md.

import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate } from "@lksnext/iac-conventions-core";
import { getResourceDefinition } from "../../dist/index.js";

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
