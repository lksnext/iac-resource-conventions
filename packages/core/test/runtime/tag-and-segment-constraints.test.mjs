// Runtime tests for Specification v1.5 executable tag and hierarchy constraints (see
// specification/resource-definition.md#executable-tag-and-hierarchy-constraints-specification-v15).

import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateConvention } from "../../dist/evaluator/convention-evaluation/index.js";

const AWS_TAG_CHARACTERS = {
  classes: ["unicode_letters", "unicode_numbers", "unicode_separators"],
  literals: ["_", ".", ":", "/", "=", "+", "-", "@"],
};

function input({ name, tags, renderingConstraints, tagConstraints }) {
  return {
    resolved_context: {
      resource_identity: {
        organizational: { system: name },
        functional: { resource_type: "test_resource" },
      },
      governance_context: tags,
    },
    resource_definition: {
      resource_type: "test_resource",
      platform: "test",
      ...(renderingConstraints === undefined
        ? {}
        : { rendering_constraints: renderingConstraints }),
      ...(tagConstraints === undefined ? {} : { tag_constraints: tagConstraints }),
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["organizational.system"],
      tag_projections: {
        Owner: "governance.owner",
        ManagedBy: "governance.managed_by",
        CostCenter: "governance.cost_center",
      },
    },
  };
}

// --- Unicode character classes ----------------------------------------------------------

test("unicode classes accept letters, numbers, and separators from any script", () => {
  const result = evaluateConvention(
    input({
      name: "caf\u00e9 \u00f1 \u65e5\u672c \u0663\u00a0x",
      tags: {},
      renderingConstraints: { character_constraints: AWS_TAG_CHARACTERS },
    }),
  );

  assert.deepEqual(result.validation, { valid: true });
});

test("unicode classes reject symbols and emoji outside the declared categories", () => {
  for (const name of ["a#b", "a😀b", "a\tb"]) {
    const result = evaluateConvention(
      input({
        name,
        tags: {},
        renderingConstraints: { character_constraints: AWS_TAG_CHARACTERS },
      }),
    );

    assert.deepEqual(
      result.validation.failures.map((failure) => failure.code),
      ["character-constraint"],
      name,
    );
  }
});

// --- max_segments ---------------------------------------------------------------------

test("max_segments: a name at the limit is valid and empty pieces are not counted", () => {
  for (const name of ["/a/b/c", "a/b/c", "//a//b/c/"]) {
    const result = evaluateConvention(
      input({ name, tags: {}, renderingConstraints: { max_segments: { delimiter: "/", max: 3 } } }),
    );

    assert.deepEqual(result.validation, { valid: true }, name);
  }
});

test("max_segments: a name above the limit is reported", () => {
  const result = evaluateConvention(
    input({
      name: "/a/b/c/d",
      tags: {},
      renderingConstraints: { max_segments: { delimiter: "/", max: 3 } },
    }),
  );

  assert.deepEqual(result.validation.failures, [
    {
      message: 'name has 4 "/"-separated segments, more than max_segments of 3',
      code: "max-segments",
    },
  ]);
});

test("max_segments is evaluated after forbidden_suffixes", () => {
  const result = evaluateConvention(
    input({
      name: "/a/b/c/x-",
      tags: {},
      renderingConstraints: {
        forbidden_suffixes: ["-"],
        max_segments: { delimiter: "/", max: 3 },
      },
    }),
  );

  assert.deepEqual(
    result.validation.failures.map((failure) => failure.code),
    ["forbidden-suffix", "max-segments"],
  );
});

// --- tag_constraints --------------------------------------------------------------------

const AWS_TAG_CONSTRAINTS = {
  max_count: 2,
  key: {
    min_length: 1,
    max_length: 9,
    length_unit: "code_points",
    character_constraints: AWS_TAG_CHARACTERS,
    forbidden_prefixes: ["aws:"],
  },
  value: {
    max_length: 10,
    length_unit: "code_points",
    character_constraints: AWS_TAG_CHARACTERS,
    forbidden_prefixes: ["aws:"],
  },
};

test("tag_constraints: valid tags, including non-ASCII values, pass", () => {
  const result = evaluateConvention(
    input({
      name: "n",
      tags: { owner: "caf\u00e9 \u00f1u", managed_by: "terraform" },
      tagConstraints: AWS_TAG_CONSTRAINTS,
    }),
  );

  assert.deepEqual(result.validation, { valid: true });
});

test("tag_constraints: every key, value, and count violation is reported in order", () => {
  const result = evaluateConvention(
    input({
      name: "n",
      tags: { owner: "platform#team", managed_by: "aws:cdk", cost_center: "cc" },
      tagConstraints: AWS_TAG_CONSTRAINTS,
    }),
  );

  assert.deepEqual(result.validation.failures, [
    {
      message: 'tag "Owner" value exceeds max_length of 10 characters',
      code: "tag-value-length",
    },
    {
      message:
        'tag "Owner" value contains a code point outside the allowed character_constraints set',
      code: "tag-value-character",
    },
    {
      message: 'tag "ManagedBy" value starts with the forbidden prefix "aws:"',
      code: "tag-value-forbidden-prefix",
    },
    {
      message: 'tag key "CostCenter" exceeds max_length of 9 characters',
      code: "tag-key-length",
    },
    { message: "3 tags are projected, more than max_count of 2", code: "tag-count" },
  ]);
  assert.deepEqual(result.outputs.metadata.tags, {
    Owner: "platform#team",
    ManagedBy: "aws:cdk",
    CostCenter: "cc",
  });
});

test("tag_constraints: a reserved key prefix is reported", () => {
  const constraints = { key: { forbidden_prefixes: ["aws:"] } };
  const result = evaluateConvention({
    ...input({ name: "n", tags: { owner: "o" }, tagConstraints: constraints }),
    convention_pack: { id: "test-pack", tag_projections: { "aws:owner": "governance.owner" } },
  });

  assert.deepEqual(result.validation.failures, [
    {
      message: 'tag key "aws:owner" starts with the forbidden prefix "aws:"',
      code: "tag-key-forbidden-prefix",
    },
  ]);
});

test("tag_constraints: no projected tags means no tag validation", () => {
  const result = evaluateConvention(
    input({ name: "n", tags: {}, tagConstraints: { ...AWS_TAG_CONSTRAINTS, max_count: 0 } }),
  );

  assert.deepEqual(result.validation, { valid: true });
});
