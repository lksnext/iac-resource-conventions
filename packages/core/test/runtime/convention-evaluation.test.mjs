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

// --- max_length validation, without truncation (specification/convention-pack.md#naming-rule-examples) ---

test("a generated name exactly at max_length is valid", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.resource_type"],
    },
    resource_definition: {
      resource_type: "aws_s3_bucket",
      platform: "aws",
      // "aws_s3_bucket" is 13 characters.
      rendering_constraints: { max_length: 13, length_unit: "code_points" },
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, "aws_s3_bucket");
  assert.deepEqual(result.validation, { valid: true });
});

test("a generated name one unit below max_length is valid", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.resource_type"],
    },
    resource_definition: {
      resource_type: "aws_s3_bucket",
      platform: "aws",
      rendering_constraints: { max_length: 14, length_unit: "code_points" },
    },
  });

  const result = evaluateConvention(input);

  assert.deepEqual(result.validation, { valid: true });
});

test(
  "a generated name one unit over max_length is invalid, and the name is retained " +
    "unmodified, never truncated",
  () => {
    const input = baseInput({
      convention_pack: {
        id: "test-pack",
        naming_component_order: ["functional.resource_type"],
      },
      resource_definition: {
        resource_type: "aws_s3_bucket",
        platform: "aws",
        rendering_constraints: { max_length: 12, length_unit: "code_points" },
      },
    });

    const result = evaluateConvention(input);

    assert.equal(result.outputs.name, "aws_s3_bucket");
    assert.equal(result.validation.valid, false);
    assert.deepEqual(result.validation.failures, [
      { message: "name exceeds max_length of 12 characters" },
    ]);
  },
);

test("an absent max_length imposes no constraint on an otherwise valid name", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.resource_type"],
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, "aws_s3_bucket");
  assert.deepEqual(result.validation, { valid: true });
});

test("an over-length name composes with an unrelated missing-required-attribute failure", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.resource_type"],
      required_attributes: ["organizational.tenant"],
    },
    resource_definition: {
      resource_type: "aws_s3_bucket",
      platform: "aws",
      rendering_constraints: { max_length: 12, length_unit: "code_points" },
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, "aws_s3_bucket");
  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.failures.length, 2);
  assert.deepEqual(result.validation.failures[1], {
    message: "name exceeds max_length of 12 characters",
  });
});

test("max_length is never applied to an absent name (naming itself is invalid)", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.resource_type", "functional.resource_type"],
      required_attributes: [],
    },
    resource_definition: {
      resource_type: "aws_s3_bucket",
      platform: "aws",
      rendering_constraints: { max_length: 1, length_unit: "code_points" },
    },
  });

  const result = evaluateConvention(input);

  assert.deepEqual(result.outputs, {});
  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.failures.length, 1);
  assert.match(result.validation.failures[0].message, /lists canonical attribute reference/);
});

function partyPopperInput(overrides = {}) {
  // U+1F389 PARTY POPPER is one Unicode code point, a UTF-16 surrogate pair (two code
  // units), and 4 UTF-8 bytes, so twelve of them distinguish every candidate length
  // unit concretely: 12 code points, 24 UTF-16 code units, 48 UTF-8 bytes.
  const partyPopper = "\u{1F389}";
  const twelveCodePoints = partyPopper.repeat(12);

  return {
    name: twelveCodePoints,
    input: baseInput({
      resolved_context: {
        resource_identity: {
          organizational: { system: "telemetry-platform" },
          deployment: { environment: "production" },
          functional: { resource_type: twelveCodePoints },
        },
        governance_context: { owner: "platform-team" },
      },
      convention_pack: {
        id: "test-pack",
        naming_component_order: ["functional.resource_type"],
      },
      resource_definition: {
        resource_type: twelveCodePoints,
        platform: "aws",
        rendering_constraints: { max_length: 12, ...overrides },
      },
    }),
  };
}

test(
  "the same generated name is valid under length_unit: code_points and invalid under " +
    "length_unit: utf8_bytes, purely because of the declared unit",
  () => {
    const codePoints = partyPopperInput({ length_unit: "code_points" });
    const utf8Bytes = partyPopperInput({ length_unit: "utf8_bytes" });

    const codePointsResult = evaluateConvention(codePoints.input);
    const utf8BytesResult = evaluateConvention(utf8Bytes.input);

    assert.equal(codePointsResult.outputs.name, codePoints.name);
    assert.deepEqual(codePointsResult.validation, { valid: true });

    assert.equal(utf8BytesResult.outputs.name, utf8Bytes.name);
    assert.equal(utf8BytesResult.validation.valid, false);
    assert.deepEqual(utf8BytesResult.validation.failures, [
      { message: "name exceeds max_length of 12 characters" },
    ]);
  },
);

test(
  "max_length declared without a recognized length_unit reports a dedicated failure, " +
    "never a silent pass or a coincidental max_length violation",
  () => {
    const input = baseInput({
      convention_pack: {
        id: "test-pack",
        naming_component_order: ["functional.resource_type"],
      },
      resource_definition: {
        resource_type: "aws_s3_bucket",
        platform: "aws",
        // This shape is unrepresentable in TypeScript (see
        // ../types/contract-fixtures.ts); it is exercised here to prove the runtime
        // guard against malformed, non-TypeScript-checked input (for example, parsed
        // JSON) does not silently default to a length unit.
        rendering_constraints: { max_length: 12 },
      },
    });

    const result = evaluateConvention(input);

    assert.equal(result.validation.valid, false);
    assert.deepEqual(result.validation.failures, [
      {
        message:
          "Resource Definition declares max_length without a recognized length_unit " +
          '("code_points" or "utf8_bytes"); length cannot be measured deterministically.',
      },
    ]);
  },
);

test("measureLength is deterministic: repeated evaluation of the same input is identical", () => {
  const { input } = partyPopperInput({ length_unit: "code_points" });

  const first = evaluateConvention(input);
  const second = evaluateConvention(input);

  assert.deepEqual(first, second);
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
