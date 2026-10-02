// Compile-time only contract fixtures for Specification v1.5 tag and hierarchy
// constraint types. Type-checked with `noEmit` via ../../tsconfig.test.json.

import type { ResourceDefinition, ResourceTagTextConstraints } from "../../src/index.js";

export const definitionWithTagAndSegmentConstraints: ResourceDefinition = {
  resource_type: "aws_ssm_parameter",
  platform: "aws",
  rendering_constraints: {
    max_length: 955,
    length_unit: "code_points",
    max_segments: { delimiter: "/", max: 15 },
  },
  tag_constraints: {
    max_count: 50,
    key: {
      min_length: 1,
      max_length: 128,
      length_unit: "code_points",
      character_constraints: {
        classes: ["unicode_letters", "unicode_numbers", "unicode_separators"],
      },
      forbidden_prefixes: ["aws:"],
    },
    value: { max_length: 256, length_unit: "code_points" },
  },
};

// @ts-expect-error -- a tag length bound requires a length_unit.
export const tagBoundWithoutUnit: ResourceTagTextConstraints = { max_length: 128 };

export const unknownCharacterClass: ResourceTagTextConstraints = {
  // @ts-expect-error -- the character-class vocabulary is closed.
  character_constraints: { classes: ["unicode_symbols"] },
};
