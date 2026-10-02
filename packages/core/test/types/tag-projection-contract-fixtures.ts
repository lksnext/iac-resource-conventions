// Compile-time only contract fixtures for Specification v1.3 tag projection types.
//
// Type-checked with `noEmit` via ../../tsconfig.test.json; never executed or published.
// Proves the closed metadata source reference vocabulary is enforced by the public
// contracts.

import type {
  ConditionalTagProjection,
  ConventionPack,
  GovernanceContextAttribute,
  MetadataSourceReference,
  ResourceDefinition,
} from "../../src/index.js";

export const governanceReference: GovernanceContextAttribute = "governance.owner";
export const identityMetadataReference: MetadataSourceReference = "deployment.environment";
export const governanceMetadataReference: MetadataSourceReference = "governance.cost_center";
export const generatedNameReference: MetadataSourceReference = "outputs.name";

export const conventionPackWithTags: ConventionPack = {
  id: "test-pack",
  tag_projections: {
    Name: "outputs.name",
    Project: "organizational.system",
    Owner: "governance.owner",
  },
};

// @ts-expect-error -- the metadata source reference vocabulary is closed.
export const invalidMetadataReference: MetadataSourceReference = "governance.budget";

// @ts-expect-error -- outputs.name is the only Convention Output a tag may project.
export const invalidOutputReference: MetadataSourceReference = "outputs.metadata";

export const invalidTagProjection: ConventionPack = {
  id: "test-pack",
  tag_projections: {
    // @ts-expect-error -- a tag projection source must be a metadata source reference.
    Project: "system",
  },
};

export const conditionalNameTag: ConditionalTagProjection = {
  source: "outputs.name",
  only_when_resource_accepts_no_name: true,
};

export const conventionPackWithConditionalTag: ConventionPack = {
  id: "test-pack",
  tag_projections: { Name: conditionalNameTag, Project: { source: "organizational.system" } },
};

// @ts-expect-error -- the object form requires a source.
export const conditionalTagWithoutSource: ConditionalTagProjection = {
  only_when_resource_accepts_no_name: true,
};

export const unnamedResourceDefinition: ResourceDefinition = {
  resource_type: "aws_acm_certificate",
  platform: "aws",
  accepts_name: false,
};
