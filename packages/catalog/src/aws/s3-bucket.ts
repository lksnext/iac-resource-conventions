import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Amazon S3 general purpose bucket.
 *
 * Source: {@link https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html}
 * ("General purpose bucket naming rules", retrieved for Milestone 3.2).
 *
 * Findings:
 * - **Uniqueness / global namespace** — "General purpose buckets exist in a global
 *   namespace, which means that each bucket name must be unique across all AWS
 *   accounts in all the AWS Regions within a partition." Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "partition"`.
 * - **Regional placement** — a bucket is created in a specific AWS Region chosen by
 *   the caller ("When you create a general purpose bucket, you choose its name and
 *   the AWS Region to create it in"); it is not a global resource in the
 *   `identity_constraints.global` sense (that field describes the resource itself,
 *   not its name's uniqueness scope). Modeled as `identity_constraints.global: false`
 *   and a placement constraint mirroring
 *   `specification/resource-definition.md#s3-bucket`'s own illustrative example.
 * - **Length** — "Bucket names must be between 3 (min) and 63 (max) characters
 *   long." Only `max_length` (63) is modeled: `ResourceRenderingConstraints` has no
 *   `min_length` field (see `docs/architecture/resource-definition-catalog.md`'s
 *   Milestone 3.2 findings) — a genuine, evidence-backed model gap, not invented here.
 * - **Length unit** — every valid character (see below) is single-byte ASCII, so
 *   Unicode code points and UTF-8 bytes coincide for any conforming name; `code_points`
 *   is used for consistency with the Reference Evaluator's own default choice (see
 *   `specification/README.md#length-unit-clarification`).
 * - **Allowed characters** — "Bucket names can consist only of lowercase letters,
 *   numbers, periods (.), and hyphens (-)... must begin and end with a letter or
 *   number." Recorded as free descriptive text per
 *   `specification/resource-definition.md#rendering-constraints` (not a regular
 *   expression or executable grammar — see
 *   `docs/architecture/convention-evaluation-executability.md#allowed-characters`).
 * - **Reserved prefixes/suffixes** (for example, `xn--`, `sthree-`, `-s3alias`) exist
 *   but have no representation in the current model beyond `allowed_characters`' free
 *   text; no grammar or reserved-pattern field is defined
 *   (see `specification/resource-definition.md#out-of-scope-for-this-document`). Not
 *   modeled as a separate field — documented as a gap only.
 */
export const AWS_S3_BUCKET: ResourceDefinition = deepFreeze({
  resource_type: "aws_s3_bucket",
  platform: "aws",
  category: "storage",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "partition",
    global: false,
  },
  rendering_constraints: {
    max_length: 63,
    length_unit: "code_points",
    allowed_characters: "lowercase letters, digits, periods, and hyphens only",
  },
  placement_constraints: ["regional; location chosen by the deployment"],
});
