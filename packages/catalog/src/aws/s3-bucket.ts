import type { ResourceDefinition } from "@lksnext/iac-conventions-core";

/**
 * A single, deliberately minimal AWS Resource Definition, added only to prove the
 * catalog's package and API boundary (Milestone 3.1). It declares no
 * `rendering_constraints`, `identity_constraints`, or `placement_constraints`, since
 * those require authoritative provider research deferred to Milestone 3.2 (see
 * `IMPLEMENTATION.md`) — encoding them here without verification would fabricate
 * technical constraints this catalog does not yet have evidence for.
 */
export const AWS_S3_BUCKET: ResourceDefinition = Object.freeze({
  resource_type: "aws_s3_bucket",
  platform: "aws",
});
