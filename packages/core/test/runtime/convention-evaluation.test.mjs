// Runtime tests for Convention Evaluation Rules (Milestone 2.6: Convention Evaluation
// Rules). See docs/architecture/reference-evaluator.md,
// specification/convention-pack.md#required-attributes, and
// specification/convention-result.md for the rules exercised below.
//
// `evaluateConvention` is an internal evaluator function, not exported from the
// package root (see ../types/convention-evaluation-fixtures.ts for the compile-time
// proof of that boundary). It is imported here directly from the built
// `dist/evaluator/` output by relative path, the same way
// ./resource-projection.test.mjs reaches into `dist/` directly.
//
// Fixtures are neutral and fictional. They exercise required-attribute completeness
// validation only: no `naming_component_order` is declared, so naming rendering never
// produces `outputs.name` here (see ./naming-evaluation.test.mjs for those runtime
// tests). Normalization, metadata (tags/labels/annotations) generation, and Resource
// Definition constraint validation remain unimplemented in this increment (see
// ../../src/evaluator/convention-evaluation/evaluate-convention.ts).

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
        organizational: { system: "telemetry-platform" },
        deployment: { environment: "production" },
        functional: { resource_type: "aws_s3_bucket" },
      },
      governance_context: { owner: "platform-team" },
    },
    resource_definition: {
      resource_type: "aws_s3_bucket",
      platform: "aws",
    },
    convention_pack: {
      id: "test-pack",
      required_attributes: [
        "organizational.system",
        "deployment.environment",
        "functional.resource_type",
      ],
    },
    ...overrides,
  });
}

// --- Required-attribute completeness (specification/convention-pack.md#required-attributes) ---

test("all required attributes resolved: validation.valid is true, with no failures", () => {
  const result = evaluateConvention(baseInput());

  assert.deepEqual(result.validation, { valid: true });
});

test("a missing required attribute produces a validation failure and validation.valid: false", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      required_attributes: ["organizational.tenant"],
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.validation.valid, false);
  assert.deepEqual(result.validation.failures, [
    {
      message:
        'Required attribute "organizational.tenant" declared by convention pack "test-pack" has no resolved value.',
    },
  ]);
});

test("multiple missing required attributes each produce their own failure", () => {
  const input = baseInput({
    resolved_context: {
      resource_identity: {},
      governance_context: {},
    },
    convention_pack: {
      id: "test-pack",
      required_attributes: ["organizational.system", "governance.owner"],
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.failures.length, 2);
});

test("no required_attributes declared is vacuously valid", () => {
  const input = baseInput({ convention_pack: { id: "test-pack" } });

  const result = evaluateConvention(input);

  assert.deepEqual(result.validation, { valid: true });
});

test("an unrecognized required_attributes entry is treated as unresolved, not ignored", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      required_attributes: ["not.a.real.attribute"],
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.failures.length, 1);
});

// --- Output shape (docs/architecture/reference-evaluator.md) ---

test("outputs is empty when the convention pack declares no naming components", () => {
  const result = evaluateConvention(baseInput());

  assert.deepEqual(result.outputs, {});
});

test("warnings is never populated in this increment", () => {
  const result = evaluateConvention(baseInput());

  assert.equal(result.warnings, undefined);
});

test("resource_identity and governance_context are copied through unchanged", () => {
  const input = baseInput();

  const result = evaluateConvention(input);

  assert.deepEqual(result.resource_identity, input.resolved_context.resource_identity);
  assert.deepEqual(result.governance_context, input.resolved_context.governance_context);
});

test("explanation summarizes the number of required attributes checked and unresolved", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      required_attributes: ["organizational.tenant"],
    },
  });

  const result = evaluateConvention(input);

  assert.match(result.explanation, /1 of 1 required attribute/);
  assert.match(result.explanation, /"test-pack"/);
});

// --- Purity and determinism ------------------------------------------------------

test("evaluateConvention does not mutate its input", () => {
  const input = baseInput();

  assert.doesNotThrow(() => evaluateConvention(input));
});

test("evaluateConvention is deterministic: the same input always produces the same result", () => {
  const input = baseInput();

  const first = evaluateConvention(input);
  const second = evaluateConvention(input);

  assert.deepEqual(first, second);
});
