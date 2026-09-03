// Runtime tests for the internal catalog conformance validator (Milestone 3.3.2: Catalog
// Conformance Automation). See
// docs/architecture/resource-definition-catalog.md#catalog-conformance-validation and
// packages/catalog/src/internal/validate-resource-definition.ts.
//
// `validateResourceDefinition`/`validateCatalogEntries` are internal-only (never exported
// from the package root — see packages/catalog/src/index.ts), so this file imports them
// directly from the built `dist/internal/` output, the same way
// test/runtime/dependency-direction.test.mjs reasons about internal source structure
// without going through the public API.

import assert from "node:assert/strict";
import { test } from "node:test";
import { getResourceDefinition, listResourceTypes } from "../../dist/index.js";
import {
  validateCatalogEntries,
  validateResourceDefinition,
} from "../../dist/internal/validate-resource-definition.js";

// --- The current catalog is conformant -----------------------------------------------

test("every current AWS ResourceDefinition passes conformance validation with zero issues", () => {
  for (const resourceType of listResourceTypes()) {
    const definition = getResourceDefinition(resourceType);
    assert.deepEqual(
      validateResourceDefinition(definition),
      [],
      `${resourceType}: expected zero conformance issues`,
    );
  }
});

test("the current catalog registration passes validateCatalogEntries with zero issues", () => {
  const entries = listResourceTypes().map((key) => ({
    key,
    definition: getResourceDefinition(key),
  }));
  assert.deepEqual(validateCatalogEntries(entries), []);
});

// --- Negative fixtures: rendering constraints ----------------------------------------

function fixture(overrides) {
  return { resource_type: "test_resource", platform: "test", ...overrides };
}

test("min_length greater than max_length is reported", () => {
  const issues = validateResourceDefinition(
    fixture({
      rendering_constraints: { min_length: 10, max_length: 5, length_unit: "code_points" },
    }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "rendering_constraints.min_length",
      message: "must not exceed max_length",
    },
  ]);
});

test("a length bound declared without length_unit is reported", () => {
  const issues = validateResourceDefinition(fixture({ rendering_constraints: { max_length: 10 } }));
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "rendering_constraints.length_unit",
      message: "must be declared whenever min_length or max_length is declared",
    },
  ]);
});

// --- Negative fixtures: numeric bound hygiene ------------------------------------------

for (const min_length of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  test(`min_length: ${min_length} is reported as not a non-negative integer`, () => {
    const issues = validateResourceDefinition(
      fixture({ rendering_constraints: { min_length, length_unit: "code_points" } }),
    );
    assert.deepEqual(issues, [
      {
        resource_type: "test_resource",
        path: "rendering_constraints.min_length",
        message: "must be a non-negative integer",
      },
    ]);
  });
}

for (const max_length of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
  test(`max_length: ${max_length} is reported as not a non-negative finite number`, () => {
    const issues = validateResourceDefinition(
      fixture({ rendering_constraints: { max_length, length_unit: "code_points" } }),
    );
    assert.deepEqual(issues, [
      {
        resource_type: "test_resource",
        path: "rendering_constraints.max_length",
        message: "must be a non-negative finite number",
      },
    ]);
  });
}

test("min_length: 0 and a positive integer are both valid", () => {
  assert.deepEqual(
    validateResourceDefinition(
      fixture({ rendering_constraints: { min_length: 0, length_unit: "code_points" } }),
    ),
    [],
  );
  assert.deepEqual(
    validateResourceDefinition(
      fixture({ rendering_constraints: { min_length: 3, length_unit: "code_points" } }),
    ),
    [],
  );
});

test("max_length: 1.5 is not rejected — Specification v1.2 does not normatively require max_length to be an integer", () => {
  const issues = validateResourceDefinition(
    fixture({ rendering_constraints: { max_length: 1.5, length_unit: "code_points" } }),
  );
  assert.deepEqual(issues, []);
});

test("an unsupported length_unit value is reported", () => {
  const issues = validateResourceDefinition(
    fixture({ rendering_constraints: { max_length: 10, length_unit: "characters" } }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "rendering_constraints.length_unit",
      message: '"characters" is not "code_points" or "utf8_bytes"',
    },
  ]);
});

test("code_points and utf8_bytes remain valid length_unit values", () => {
  for (const length_unit of ["code_points", "utf8_bytes"]) {
    assert.deepEqual(
      validateResourceDefinition(
        fixture({ rendering_constraints: { max_length: 10, length_unit } }),
      ),
      [],
    );
  }
});

test("min > max is not reported when either bound is not itself a valid comparable number", () => {
  const issues = validateResourceDefinition(
    fixture({
      rendering_constraints: { min_length: Number.NaN, max_length: 5, length_unit: "code_points" },
    }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "rendering_constraints.min_length",
      message: "must be a non-negative integer",
    },
  ]);
});

test("an empty character_constraints allowed set is reported", () => {
  const issues = validateResourceDefinition(
    fixture({ rendering_constraints: { character_constraints: {} } }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "rendering_constraints.character_constraints",
      message: "must declare at least one class or literal (an empty allowed set admits no name)",
    },
  ]);
});

test("a multi-code-point character_constraints literal is reported", () => {
  const issues = validateResourceDefinition(
    fixture({ rendering_constraints: { character_constraints: { literals: ["ab"] } } }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "rendering_constraints.character_constraints.literals[0]",
      message: "must contain exactly one Unicode code point",
    },
  ]);
});

test("an empty character_constraints literal is reported", () => {
  const issues = validateResourceDefinition(
    fixture({ rendering_constraints: { character_constraints: { literals: [""] } } }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "rendering_constraints.character_constraints.literals[0]",
      message: "must contain exactly one Unicode code point",
    },
  ]);
});

test("an empty forbidden_prefixes entry is reported", () => {
  const issues = validateResourceDefinition(
    fixture({ rendering_constraints: { forbidden_prefixes: [""] } }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "rendering_constraints.forbidden_prefixes[0]",
      message: "must not be empty",
    },
  ]);
});

test("an empty forbidden_suffixes entry is reported", () => {
  const issues = validateResourceDefinition(
    fixture({ rendering_constraints: { forbidden_suffixes: [""] } }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "rendering_constraints.forbidden_suffixes[0]",
      message: "must not be empty",
    },
  ]);
});

// --- Negative fixtures: placement constraints ----------------------------------------

test("an empty PlacementConstraint statement is reported", () => {
  const issues = validateResourceDefinition(
    fixture({ placement_constraints: [{ statement: "" }] }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "placement_constraints[0].statement",
      message: "must not be empty",
    },
  ]);
});

test("an untyped, invalid Placement Constraint operator/value shape is reported", () => {
  const issues = validateResourceDefinition(
    fixture({
      placement_constraints: [
        {
          statement: "s",
          rule: { subject: "deployment.location", operator: "matches", value: "us-east-1" },
        },
      ],
    }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "placement_constraints[0].rule.operator",
      message: '"matches" is not "equals", "present", or "absent"',
    },
  ]);
});

test("an equals operator without a string value is reported", () => {
  const issues = validateResourceDefinition(
    fixture({
      placement_constraints: [
        { statement: "s", rule: { subject: "deployment.location", operator: "equals" } },
      ],
    }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "placement_constraints[0].rule.value",
      message: '"equals" must carry a string value',
    },
  ]);
});

test("a present operator carrying a value is reported", () => {
  const issues = validateResourceDefinition(
    fixture({
      placement_constraints: [
        {
          statement: "s",
          rule: { subject: "deployment.location", operator: "present", value: "us-east-1" },
        },
      ],
    }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "placement_constraints[0].rule.value",
      message: '"present" must not carry a value',
    },
  ]);
});

test("a rule subject outside the canonical attribute vocabulary is reported", () => {
  const issues = validateResourceDefinition(
    fixture({
      placement_constraints: [
        { statement: "s", rule: { subject: "governance.owner", operator: "present" } },
      ],
    }),
  );
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "placement_constraints[0].rule.subject",
      message: '"governance.owner" is not a canonical Resource Identity attribute reference',
    },
  ]);
});

// --- Negative fixtures: registration-level invariants --------------------------------

test("a mismatched catalog key and resource_type is reported", () => {
  const issues = validateCatalogEntries([
    { key: "wrong_key", definition: fixture({ resource_type: "actual_type" }) },
  ]);
  assert.deepEqual(issues, [
    {
      resource_type: "actual_type",
      path: "resource_type",
      message: 'catalog key "wrong_key" must equal definition.resource_type',
    },
  ]);
});

test("a duplicate resource_type across two entries is reported", () => {
  const issues = validateCatalogEntries([
    { key: "test_resource", definition: fixture() },
    { key: "test_resource", definition: fixture() },
  ]);
  assert.deepEqual(issues, [
    {
      resource_type: "test_resource",
      path: "resource_type",
      message: 'duplicate resource_type "test_resource" registered more than once',
    },
  ]);
});

// --- Deterministic ordering -----------------------------------------------------------

test("a multiply-malformed definition reports every issue in deterministic field-declaration order", () => {
  const issues = validateResourceDefinition(
    fixture({
      resource_type: "",
      platform: "",
      rendering_constraints: {
        min_length: 10,
        max_length: 5,
        length_unit: "code_points",
        character_constraints: {},
        forbidden_prefixes: [""],
      },
      placement_constraints: [{ statement: "" }],
    }),
  );

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      "resource_type",
      "platform",
      "rendering_constraints.min_length",
      "rendering_constraints.character_constraints",
      "rendering_constraints.forbidden_prefixes[0]",
      "placement_constraints[0].statement",
    ],
  );
});

test("validateResourceDefinition is deterministic across repeated calls", () => {
  const definition = fixture({ rendering_constraints: { max_length: 10 } });
  assert.deepEqual(validateResourceDefinition(definition), validateResourceDefinition(definition));
});

test("invalid min_length, invalid max_length, invalid length_unit, and min > max are reported in that field-declaration order", () => {
  const issues = validateResourceDefinition(
    fixture({
      rendering_constraints: {
        min_length: 1.5,
        max_length: Number.NaN,
        length_unit: "characters",
      },
    }),
  );

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      "rendering_constraints.min_length",
      "rendering_constraints.max_length",
      "rendering_constraints.length_unit",
    ],
  );
});
