import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Amazon S3 general purpose bucket.
 *
 * `aws_s3_bucket` is scoped, deliberately and permanently, to **general purpose
 * buckets only** — never directory buckets. AWS's own `CreateBucket` API creates
 * either kind from the same operation, distinguished only by the request's bucket-type
 * configuration, and directory buckets have a materially different namespace (unique
 * per Availability/Local Zone, not per partition), naming grammar (mandatory
 * `--{{zone-id}}--x-s3` suffix, no periods allowed), and additional reserved patterns
 * ({@link https://docs.aws.amazon.com/AmazonS3/latest/userguide/directory-bucket-naming-rules.html}).
 * A single static `ResourceDefinition` cannot honestly represent both variants at
 * once (see Milestone 3.3's conformance findings,
 * `docs/architecture/resource-definition-catalog-conformance.md#aws_s3_bucket`); every
 * fact below is evidenced from, and applies only to, the general purpose variant. A
 * directory bucket would need its own `ResourceType` (for example,
 * `aws_s3_directory_bucket`) if ever cataloged — never a conditional branch inside this
 * definition.
 *
 * Source: {@link https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html}
 * ("General purpose bucket naming rules", retrieved for Milestone 3.2).
 *
 * Findings:
 * - **Uniqueness / global namespace** — "General purpose buckets exist in a global
 *   namespace, which means that each bucket name must be unique across all AWS
 *   accounts in all the AWS Regions within a partition." Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "partition"`. Evidence:
 *   Explicit.
 * - **Regional placement** — a bucket is created in a specific AWS Region chosen by
 *   the caller ("When you create a general purpose bucket, you choose its name and
 *   the AWS Region to create it in"); it is not a global resource in the
 *   `identity_constraints.global` sense (that field describes the resource itself,
 *   not its name's uniqueness scope). Modeled as `identity_constraints.global: false`
 *   and a placement constraint mirroring
 *   `specification/resource-definition.md#s3-bucket`'s own illustrative example.
 *   Evidence: Explicit.
 * - **Length** — "Bucket names must be between 3 (min) and 63 (max) characters
 *   long." Modeled as `min_length: 3`, `max_length: 63` (Specification v1.2 closes
 *   the previously documented `min_length` model gap; see
 *   `docs/architecture/resource-definition-catalog-conformance.md#min_length-gap`).
 *   Evidence: Explicit.
 * - **Length unit** — every valid character (see below) is single-byte ASCII, so
 *   Unicode code points and UTF-8 bytes coincide for any conforming name; `code_points`
 *   is used for consistency with the Reference Evaluator's own default choice (see
 *   `specification/README.md#length-unit-clarification`). This is a repository
 *   implementation choice given unit equivalence, not an AWS-defined code-point
 *   semantic — AWS itself only defines an ASCII character grammar.
 * - **Allowed characters** — "Bucket names can consist only of lowercase letters,
 *   numbers, periods (.), and hyphens (-)... must begin and end with a letter or
 *   number." Modeled executably as `character_constraints` (`ascii_lowercase` +
 *   `ascii_digits` classes, plus the `.` and `-` literals) and `starts_with`/
 *   `ends_with` (`ascii_lowercase` + `ascii_digits`, since a bucket name must begin
 *   and end with a letter or number, never a period or hyphen). Specification v1.2
 *   closes the previously documented allowed-character-model gap (see
 *   `docs/architecture/resource-definition-catalog-conformance.md#allowed-character-model-gap`).
 *   Evidence: Explicit.
 * - **Reserved prefixes/suffixes** — "Bucket names must not start with the prefix
 *   `xn--`", "must not start with the prefix `sthree-`", and "must not end with the
 *   suffix `-s3alias`." Modeled executably as `forbidden_prefixes`/
 *   `forbidden_suffixes`. Specification v1.2 closes the previously documented
 *   reserved-pattern gap (see
 *   `docs/architecture/resource-definition-catalog-conformance.md#reserved-pattern-gap`).
 *   Evidence: Explicit.
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
    min_length: 3,
    max_length: 63,
    length_unit: "code_points",
    allowed_characters_description: "lowercase letters, digits, periods, and hyphens only",
    character_constraints: {
      classes: ["ascii_lowercase", "ascii_digits"],
      literals: [".", "-"],
    },
    starts_with: { classes: ["ascii_lowercase", "ascii_digits"] },
    ends_with: { classes: ["ascii_lowercase", "ascii_digits"] },
    forbidden_prefixes: ["xn--", "sthree-"],
    forbidden_suffixes: ["-s3alias"],
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
