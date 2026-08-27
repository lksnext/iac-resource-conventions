// Runtime tests for Specification v1.1 naming evaluation.
//
// These tests exercise the new executable naming semantics implemented in
// Convention Evaluation: canonical Resource Identity attribute references,
// component ordering, abbreviation, casing, separator joining, optional omission,
// and required-component failure handling.

import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateConvention } from "../../dist/evaluator/convention-evaluation/index.js";

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
}

function baseInput(overrides = {}) {
  return deepFreeze({
    resolved_context: {
      resource_identity: {
        organizational: { system: "Telemetry-Platform" },
        deployment: {
          environment: "production",
          location: "us-east-1",
        },
        functional: {
          service: "Ingestion",
          resource_type: "aws_s3_bucket",
        },
      },
      governance_context: { owner: "platform-team" },
    },
    resource_definition: {
      resource_type: "aws_s3_bucket",
      platform: "aws",
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: [
        "organizational.system",
        "functional.service",
        "deployment.environment",
        "functional.resource_type",
      ],
      separator: "-",
      casing: "lower",
      abbreviations: {
        "deployment.environment": {
          production: "prod",
        },
      },
    },
    ...overrides,
  });
}

test("generates a deterministic name from canonical attributes, abbreviation, casing, and separator", () => {
  const result = evaluateConvention(baseInput());

  assert.equal(result.outputs.name, "telemetry-platform-ingestion-prod-aws_s3_bucket");
  assert.equal(result.validation.valid, true);
});

test("omits an absent optional component without leaving an extra separator", () => {
  const input = baseInput({
    resolved_context: {
      resource_identity: {
        organizational: { system: "Telemetry-Platform" },
        deployment: { environment: "production" },
        functional: { service: "Ingestion", resource_type: "aws_s3_bucket" },
      },
      governance_context: { owner: "platform-team" },
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: [
        "organizational.system",
        "functional.service",
        "deployment.location",
        "deployment.environment",
      ],
      separator: "-",
      casing: "lower",
      abbreviations: {
        "deployment.environment": { production: "prod" },
      },
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, "telemetry-platform-ingestion-prod");
});

test("applies abbreviation before casing", () => {
  const input = baseInput({
    resolved_context: {
      resource_identity: {
        organizational: { system: "Telemetry-Platform" },
        deployment: { environment: "production" },
        functional: { service: "Ingestion", resource_type: "aws_s3_bucket" },
      },
      governance_context: { owner: "platform-team" },
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["deployment.environment"],
      separator: "-",
      casing: "upper",
      abbreviations: {
        "deployment.environment": { production: "prod" },
      },
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, "PROD");
});

test("uses the empty-string separator by default", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["organizational.system", "functional.service"],
      casing: "preserve",
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, "Telemetry-PlatformIngestion");
});

test("does not generate a name when a required naming component is missing", () => {
  const input = baseInput({
    resolved_context: {
      resource_identity: {
        organizational: { system: "Telemetry-Platform" },
        functional: { resource_type: "aws_s3_bucket" },
      },
      governance_context: { owner: "platform-team" },
    },
    convention_pack: {
      id: "test-pack",
      required_attributes: ["deployment.environment"],
      naming_component_order: ["organizational.system", "deployment.environment"],
      separator: "-",
      casing: "lower",
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, undefined);
  assert.equal(result.validation.valid, false);
});

test("does not generate a name when no naming components are declared", () => {
  const result = evaluateConvention(
    baseInput({
      convention_pack: {
        id: "test-pack",
        separator: "-",
        casing: "lower",
      },
    }),
  );

  assert.deepEqual(result.outputs, {});
  assert.equal(result.validation.valid, true);
});

test("evaluateConvention is deterministic for naming output", () => {
  const input = baseInput();
  const first = evaluateConvention(input);
  const second = evaluateConvention(input);

  assert.deepEqual(first, second);
});
