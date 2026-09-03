// Runtime tests for the public Reference Evaluator API (Milestone 2.7: Reference
// Evaluator API). See docs/architecture/reference-evaluator.md,
// specification/README.md#architecture, specification/context-resolution.md,
// specification/convention-pack.md, and specification/convention-result.md for the
// rules exercised below.
//
// Unlike every other runtime test file in this directory, `evaluate` is imported from
// the built package root (`dist/index.js`), the same way ./build-artifact.test.mjs
// reaches into `dist/index.js` directly — because `evaluate` is the one evaluator
// function that IS part of the public package surface (see
// ../types/evaluate-fixtures.ts for the compile-time proof of that boundary).
//
// Fixtures are neutral and fictional. They exercise the orchestration `evaluate` adds
// on top of already-tested stage behavior: composing Context Resolution and Convention
// Evaluation into one call, the two identity-boundary checks, and protected-value
// diagnostics propagation. Resolution precedence, naming rendering, and required-
// attribute completeness are exercised in depth elsewhere (./context-resolution.test.mjs,
// ./governance-resolution.test.mjs, ./naming-evaluation.test.mjs,
// ./convention-evaluation.test.mjs); this file does not re-test their internals.

import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeWarnings } from "../../dist/evaluator/evaluate.js";
import { evaluate } from "../../dist/index.js";

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
    resource_definition: {
      resource_type: "aws_s3_bucket",
      platform: "aws",
    },
    ...overrides,
  });
}

// --- Orchestration: determinism and immutability ----------------------------------

test("evaluate is deterministic: the same input produces the same result", () => {
  const input = baseInput();

  assert.deepEqual(evaluate(input), evaluate(input));
});

test("evaluate does not mutate its input", () => {
  // baseInput() is already deep-frozen; a mutation attempt would throw in strict mode.
  const input = baseInput();

  assert.doesNotThrow(() => evaluate(input));
});

// --- Specification v1.1 acceptance tests (specification/convention-pack.md#naming-rule-examples) ---

test("acceptance: minimal example — every declared component present", () => {
  const result = evaluate(baseInput());

  assert.equal(result.outputs.name, "telemetry-platform-ingestion-aws_s3_bucket");
  assert.deepEqual(result.validation, { valid: true });
});

test("acceptance: optional component absent — omitted with its surrounding separator", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: [
        "organizational.system",
        "functional.service",
        "functional.component",
        "functional.resource_type",
      ],
      separator: "-",
    },
  });

  const result = evaluate(input);

  assert.equal(result.outputs.name, "telemetry-platform-ingestion-aws_s3_bucket");
});

test("acceptance: abbreviation — a matching abbreviation entry is applied", () => {
  const input = baseInput({
    naming_request: {
      convention: "test-pack",
      resource_type: "aws_s3_bucket",
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: [
        "organizational.system",
        "deployment.environment",
        "functional.resource_type",
      ],
      separator: "-",
      abbreviations: {
        "deployment.environment": { production: "prd" },
      },
    },
    evaluation_context: {
      shared_organizational_context: { system: "telemetry-platform" },
      shared_deployment_context: { environment: "production" },
    },
  });

  const result = evaluate(input);

  assert.equal(result.outputs.name, "telemetry-platform-prd-aws_s3_bucket");
});

test("acceptance: casing — casing: lower normalizes an inconsistently-cased resolved value", () => {
  const input = baseInput({
    naming_request: {
      convention: "test-pack",
      resource_type: "aws_s3_bucket",
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["organizational.system", "functional.resource_type"],
      separator: "-",
      casing: "lower",
    },
    evaluation_context: {
      shared_organizational_context: { system: "Telemetry-Platform" },
    },
  });

  const result = evaluate(input);

  assert.equal(result.outputs.name, "telemetry-platform-aws_s3_bucket");
});

test(
  "acceptance: validation without truncation — a name exceeding max_length is reported " +
    "invalid, and the generated name is retained exactly as produced, never truncated",
  () => {
    const input = baseInput({
      naming_request: {
        convention: "test-pack",
        resource_type: "aws_s3_bucket",
        functional: { service: "ingestion-pipeline-orchestration" },
      },
      resource_definition: {
        resource_type: "aws_s3_bucket",
        platform: "aws",
        rendering_constraints: { max_length: 24, length_unit: "code_points" },
      },
    });

    const result = evaluate(input);

    assert.equal(
      result.outputs.name,
      "telemetry-platform-ingestion-pipeline-orchestration-aws_s3_bucket",
    );
    assert.equal(result.validation.valid, false);
    assert.deepEqual(result.validation.failures, [
      { message: "name exceeds max_length of 24 characters", code: "max-length" },
    ]);
  },
);

// --- Context Resolution orchestration (specification/context-resolution.md#resolution-precedence) ---

test("evaluate resolves identity through the same precedence as the internal resolvers", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      identity_defaults: { organizational: { system: "default-system" } },
      naming_component_order: ["organizational.system"],
      separator: "-",
    },
    evaluation_context: {
      // Shared Organizational Context outranks Convention Pack defaults.
      shared_organizational_context: { system: "shared-system" },
    },
  });

  const result = evaluate(input);

  assert.equal(result.resource_identity.organizational?.system, "shared-system");
  assert.equal(result.outputs.name, "shared-system");
});

test("evaluate resolves Governance Context alongside Resource Identity in the same call", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      governance_defaults: { owner: "default-team" },
      naming_component_order: [],
    },
    naming_request: {
      convention: "test-pack",
      resource_type: "aws_s3_bucket",
      functional: { service: "ingestion" },
      governance: { owner: "requesting-team" },
    },
  });

  const result = evaluate(input);

  // The Naming Request's governance value outranks the Convention Pack's default.
  assert.equal(result.governance_context.owner, "requesting-team");
});

// --- Diagnostics propagation (docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented) ---

test("a protected-value conflict is surfaced as a warning, not silently dropped", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["deployment.environment"],
      separator: "-",
      override_policy: { protected_attributes: ["deployment.environment"] },
    },
    naming_request: {
      convention: "test-pack",
      resource_type: "aws_s3_bucket",
      overrides: { deployment: { environment: "staging" } },
    },
    evaluation_context: {
      shared_deployment_context: { environment: "production" },
    },
  });

  const result = evaluate(input);

  // The protected, authoritative value still wins...
  assert.equal(result.resource_identity.deployment?.environment, "production");
  assert.equal(result.outputs.name, "production");
  // ...but the rejected override is not silently dropped from the public result.
  assert.equal(result.warnings?.length, 1);
  assert.match(result.warnings[0].message, /"deployment\.environment" is protected/);
});

test("an unresolved required attribute is reported once, not duplicated across result fields", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: [],
      required_attributes: ["organizational.tenant"],
    },
    evaluation_context: {},
  });

  const result = evaluate(input);

  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.failures.length, 1);
  assert.equal(result.warnings, undefined);
});

// --- Identity-boundary checks (docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented) ---

test("a Convention Pack id mismatch is reported as an invalid ConventionResult, not thrown", () => {
  const input = baseInput({
    naming_request: {
      convention: "requested-pack",
      resource_type: "aws_s3_bucket",
      functional: { service: "ingestion" },
    },
    convention_pack: {
      id: "different-pack",
      naming_component_order: ["organizational.system"],
    },
  });

  const result = evaluate(input);

  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.failures.length, 1);
  assert.match(
    result.validation.failures[0].message,
    /selected convention "requested-pack".*Convention Pack's id is "different-pack"/,
  );
  // Convention Evaluation was not performed: no name was generated.
  assert.deepEqual(result.outputs, {});
  // Context Resolution still ran: the resolved identity is still reported.
  assert.equal(result.resource_identity.organizational?.system, "telemetry-platform");
});

test("a Resource Definition resource_type mismatch is reported as an invalid ConventionResult", () => {
  const input = baseInput({
    resource_definition: {
      resource_type: "aws_dynamodb_table",
      platform: "aws",
    },
  });

  const result = evaluate(input);

  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.failures.length, 1);
  assert.match(
    result.validation.failures[0].message,
    /functional\.resource_type "aws_s3_bucket".*resource_type "aws_dynamodb_table"/,
  );
  assert.deepEqual(result.outputs, {});
});

test("no boundary check fires when the Naming Request selects no convention explicitly", () => {
  const input = baseInput({
    naming_request: {
      resource_type: "aws_s3_bucket",
      functional: { service: "ingestion" },
    },
  });

  const result = evaluate(input);

  assert.equal(result.validation.valid, true);
});

// --- Warning composition: mergeWarnings (docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented) ---
//
// mergeWarnings is exported from its own module only (not the package root; see its
// own doc comment in ../../src/evaluator/evaluate.ts) so it can be unit-tested
// directly. Convention Evaluation has no currently-executable rule that populates
// `ConventionResult.warnings`, so its "Convention-Evaluation-only" and "both sources"
// cases cannot be exercised end-to-end through `evaluate` without fabricating one; the
// "neither source" and "Context-Resolution-only" cases already are, above (see "an
// unresolved required attribute is reported once..." and "a protected-value conflict
// is surfaced as a warning...").

test("mergeWarnings returns undefined when neither source has warnings", () => {
  assert.equal(mergeWarnings(undefined, undefined), undefined);
});

test("mergeWarnings returns Context Resolution's warnings unchanged when Convention Evaluation has none", () => {
  const contextResolutionWarnings = [{ message: "a Context Resolution warning" }];

  assert.deepEqual(mergeWarnings(contextResolutionWarnings, undefined), contextResolutionWarnings);
});

test("mergeWarnings returns Convention Evaluation's warnings unchanged when Context Resolution has none", () => {
  const conventionEvaluationWarnings = [{ message: "a Convention Evaluation warning" }];

  assert.deepEqual(
    mergeWarnings(undefined, conventionEvaluationWarnings),
    conventionEvaluationWarnings,
  );
});

test("mergeWarnings concatenates both sources, Context Resolution first, when both have warnings", () => {
  const contextResolutionWarnings = [{ message: "a Context Resolution warning" }];
  const conventionEvaluationWarnings = [{ message: "a Convention Evaluation warning" }];

  assert.deepEqual(mergeWarnings(contextResolutionWarnings, conventionEvaluationWarnings), [
    { message: "a Context Resolution warning" },
    { message: "a Convention Evaluation warning" },
  ]);
});
