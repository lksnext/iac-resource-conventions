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

// --- Duplicate naming_component_order references are invalid (Specification v1.1) ---
// See specification/convention-pack.md#naming-projections: "A reference listed more
// than once is invalid."

test("does not generate a name when naming_component_order duplicates its first component", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: [
        "organizational.system",
        "organizational.system",
        "functional.service",
      ],
      separator: "-",
      casing: "lower",
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, undefined);
  assert.equal(result.validation.valid, false);
  assert.ok(
    result.validation.failures.some((failure) => failure.message.includes("organizational.system")),
  );
});

test("does not generate a name when naming_component_order duplicates a middle component", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: [
        "organizational.system",
        "functional.service",
        "functional.service",
        "deployment.environment",
      ],
      separator: "-",
      casing: "lower",
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, undefined);
  assert.equal(result.validation.valid, false);
});

test("does not generate a name when naming_component_order duplicates an optional component", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.service", "functional.service"],
      separator: "-",
      casing: "lower",
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, undefined);
  assert.equal(result.validation.valid, false);
});

test("does not generate a name when naming_component_order duplicates a required component", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      required_attributes: ["organizational.system"],
      naming_component_order: ["organizational.system", "organizational.system"],
      separator: "-",
      casing: "lower",
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, undefined);
  assert.equal(result.validation.valid, false);
});

test("reports every distinct duplicated attribute reference as its own failure", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: [
        "organizational.system",
        "functional.service",
        "organizational.system",
        "functional.service",
        "deployment.environment",
      ],
      separator: "-",
      casing: "lower",
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, undefined);
  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.failures.length, 2);
  assert.ok(
    result.validation.failures.some((failure) => failure.message.includes("organizational.system")),
  );
  assert.ok(
    result.validation.failures.some((failure) => failure.message.includes("functional.service")),
  );
});

test("reports both an unresolved required attribute and a duplicated naming reference together", () => {
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
      naming_component_order: ["organizational.system", "organizational.system"],
      separator: "-",
      casing: "lower",
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, undefined);
  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.failures.length, 2);
});

test("a non-duplicated naming_component_order still generates a name normally", () => {
  const input = baseInput();

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, "telemetry-platform-ingestion-prod-aws_s3_bucket");
  assert.equal(result.validation.valid, true);
});

test("duplicate-reference validation is deterministic across repeated calls", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.service", "functional.service"],
      separator: "-",
      casing: "lower",
    },
  });

  const first = evaluateConvention(input);
  const second = evaluateConvention(input);

  assert.deepEqual(first, second);
});

test("evaluateConvention does not mutate its input when naming_component_order has duplicates", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.service", "functional.service"],
      separator: "-",
      casing: "lower",
    },
  });

  assert.doesNotThrow(() => evaluateConvention(input));
});

// --- Casing conformance: Unicode Default Case Conversion, not Unicode simple case ---
// mapping (specification/convention-pack.md#casing). ECMAScript's
// String.prototype.toLowerCase/toUpperCase implement the Unicode Default Case
// Conversion algorithm, which is locale-insensitive but, unlike the strictly
// one-to-one "Unicode simple case mapping", may map a single input code point to
// more than one output code point (see ECMA-262 22.1.3.28/22.1.3.30 and the Unicode
// Character Properties, Case Mappings & Names FAQ).

test("casing handles an ordinary non-ASCII one-to-one mapping (upper)", () => {
  const input = baseInput({
    resolved_context: {
      resource_identity: {
        functional: { service: "café" },
      },
      governance_context: {},
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.service"],
      casing: "upper",
    },
  });

  const result = evaluateConvention(input);

  assert.equal(result.outputs.name, "CAFÉ");
});

test("casing follows Unicode Default Case Conversion, mapping one code point to several (upper)", () => {
  const input = baseInput({
    resolved_context: {
      resource_identity: {
        functional: { service: "straße" },
      },
      governance_context: {},
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.service"],
      casing: "upper",
    },
  });

  const result = evaluateConvention(input);

  // U+00DF (LATIN SMALL LETTER SHARP S) has no Unicode simple uppercase mapping (it
  // would be left unchanged under simple case mapping); Default Case Conversion
  // (SpecialCasing.txt, locale-insensitive) maps it to the two-character sequence "SS".
  assert.equal(result.outputs.name, "STRASSE");
});

test("casing follows Unicode Default Case Conversion, mapping one code point to several (lower)", () => {
  const input = baseInput({
    resolved_context: {
      resource_identity: {
        functional: { service: "İstanbul" },
      },
      governance_context: {},
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.service"],
      casing: "lower",
    },
  });

  const result = evaluateConvention(input);

  // U+0130 (LATIN CAPITAL LETTER I WITH DOT ABOVE) has no Unicode simple lowercase
  // mapping to a single code point; Default Case Conversion (SpecialCasing.txt,
  // locale-insensitive) maps it to "i" followed by U+0307 COMBINING DOT ABOVE.
  assert.equal(result.outputs.name, "i\u0307stanbul");
});
