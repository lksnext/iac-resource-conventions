import type { ResourceTagConstraints } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

const TAG_CHARACTERS = {
  classes: ["unicode_letters", "unicode_numbers", "unicode_separators"],
  literals: ["_", ".", ":", "/", "=", "+", "-", "@"],
} as const;

const TAG_KEY = {
  min_length: 1,
  max_length: 128,
  length_unit: "code_points",
  character_constraints: TAG_CHARACTERS,
  forbidden_prefixes: ["aws:"],
} as const;

const TAG_VALUE = {
  max_length: 256,
  length_unit: "code_points",
  character_constraints: TAG_CHARACTERS,
} as const;

/**
 * AWS tag limits shared by every AWS Resource Definition in this catalog
 * (Specification v1.5; see `specification/resource-definition.md#tag-constraints`).
 *
 * Sources (retrieved 2026-10):
 * - {@link https://docs.aws.amazon.com/tag-editor/latest/userguide/best-practices-and-strats.html#tag-conventions}
 *   ("Tag naming limits and requirements") — "Each resource can have a maximum of 50
 *   user created tags"; "System created tags that begin with `aws:` are reserved for
 *   AWS use"; "The tag key must be a minimum of 1 and a maximum of 128 Unicode
 *   characters in UTF-8"; "The tag value must be a minimum of 0 and a maximum of 256
 *   Unicode characters in UTF-8"; "Allowed characters can vary by AWS service. … In
 *   general, the allowed characters are letters, numbers, spaces representable in
 *   UTF-8, and the following characters: _ . : / = + - @".
 * - Per-service `Tag` API references, each declaring key length 1–128, value length
 *   0–256, and the pattern `[\p{L}\p{Z}\p{N}_.:/=+\-@]`:
 *   {@link https://docs.aws.amazon.com/acm/latest/APIReference/API_Tag.html} (ACM),
 *   {@link https://docs.aws.amazon.com/IAM/latest/APIReference/API_Tag.html} (IAM),
 *   {@link https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_Tag.html}
 *   (Systems Manager).
 * - {@link https://docs.aws.amazon.com/AmazonS3/latest/userguide/CostAllocTagging.html}
 *   (S3) — key "1 to 128 Unicode characters", value "from 0 to 256 Unicode
 *   characters", and "A tag set can contain as many as 50 tags".
 * - {@link https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html} (IAM) — "You
 *   cannot create a tag key or value that begins with the text aws:".
 *
 * Findings:
 * - **Lengths and count** — Explicit for every resource type (general requirements),
 *   and additionally per service for ACM, IAM, Systems Manager, and S3. `code_points`
 *   models "Unicode characters".
 * - **Characters** — Explicit for ACM, IAM, and Systems Manager (published pattern).
 *   **Derived** for S3 and Lambda: their documentation defers to the general rule
 *   above, which "can vary by AWS service".
 * - **Reserved `aws:` prefix** — keys: Explicit (general requirements). Values: Explicit
 *   for IAM only, so only {@link AWS_IAM_TAG_CONSTRAINTS} reserves it for values.
 */
export const AWS_TAG_CONSTRAINTS: ResourceTagConstraints = deepFreeze({
  max_count: 50,
  key: TAG_KEY,
  value: TAG_VALUE,
});

/** {@link AWS_TAG_CONSTRAINTS}, plus IAM's reserved `aws:` prefix for tag values. */
export const AWS_IAM_TAG_CONSTRAINTS: ResourceTagConstraints = deepFreeze({
  max_count: 50,
  key: TAG_KEY,
  value: { ...TAG_VALUE, forbidden_prefixes: ["aws:"] },
});
