// Compile-time only contract fixtures for Specification v1.3 tag projection types.
//
// Type-checked with `noEmit` via ../../tsconfig.test.json; never executed or published.
// Proves the closed metadata source reference vocabulary is enforced by the public
// contracts.

import type {
  ConventionPack,
  GovernanceContextAttribute,
  MetadataSourceReference,
} from "../../src/index.js";

export const governanceReference: GovernanceContextAttribute = "governance.owner";
export const identityMetadataReference: MetadataSourceReference = "deployment.environment";
export const governanceMetadataReference: MetadataSourceReference = "governance.cost_center";

export const conventionPackWithTags: ConventionPack = {
  id: "test-pack",
  tag_projections: {
    Project: "organizational.system",
    Owner: "governance.owner",
  },
};

// @ts-expect-error -- the metadata source reference vocabulary is closed.
export const invalidMetadataReference: MetadataSourceReference = "governance.budget";

export const invalidTagProjection: ConventionPack = {
  id: "test-pack",
  tag_projections: {
    // @ts-expect-error -- a tag projection source must be a metadata source reference.
    Project: "system",
  },
};
