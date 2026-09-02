import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * AWS IAM role.
 *
 * Sources (retrieved for Milestone 3.2, re-verified for Milestone 3.3):
 * - {@link https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html}
 *   ("IAM and AWS STS quotas") — name requirements and character limits.
 * - {@link https://docs.aws.amazon.com/general/latest/gr/iam-service.html}
 *   ("AWS Identity and Access Management endpoints and quotas") — a single
 *   `iam.amazonaws.com` endpoint is listed for every commercial Region, and quotas
 *   (for example, "Roles per account") are account-scoped, not per-Region.
 *
 * Findings:
 * - **Global** — `specification/resource-definition.md#identity-constraints` defines
 *   `global` precisely as "whether the resource type is global or bound to a specific
 *   location, affecting whether `location` is meaningful for it" — not merely "has a
 *   global endpoint". An IAM role satisfies that precise definition directly: it is
 *   never created "in" a Region, has no per-Region variant, and `deployment.location`
 *   has no meaning for it. The single global endpoint and account-wide (not
 *   per-Region) quota are the supporting evidence for that conclusion, not the
 *   definition of `global` itself. Modeled as `identity_constraints.global: true`,
 *   matching `specification/resource-definition.md#iam-role`'s own illustrative
 *   example ("global within the deployment scope (AWS account)"). Evidence: Explicit.
 * - **Uniqueness** — "Names of users, groups, roles, and instance profiles must be
 *   unique within the account. They aren't distinguished by case." Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "account"`. Evidence:
 *   Explicit. The case-insensitivity detail itself has no dedicated model field and is
 *   recorded only here, in prose — a minor, non-misleading gap (P2; see
 *   `docs/architecture/resource-definition-catalog-conformance.md`).
 * - **Length** — "Role name: 64 characters." Modeled as `max_length: 64`. Evidence:
 *   Explicit.
 * - **Length unit** — the allowed character set (see below) is entirely single-byte
 *   ASCII, so `code_points` and `utf8_bytes` coincide; `code_points` is used for the
 *   same reason as `aws_s3_bucket` (see `./s3-bucket.ts`). This is a repository
 *   implementation choice, not an AWS-defined code-point semantic.
 * - **Allowed characters** — "Names of users, groups, roles, ... must be
 *   alphanumeric, including the following common characters: plus (+), equals (=),
 *   comma (,), period (.), at (@), underscore (_), and hyphen (-)." Recorded as free
 *   descriptive text (not an executable grammar). Evidence: Explicit, but not
 *   executable.
 * - **Path (gap, not modeled)** — IAM separately limits a role's `path` to 512
 *   characters, and states "If you intend to use a role with the Switch Role feature
 *   in the AWS Management Console, then the combined Path and RoleName can't exceed
 *   64 characters." `ResourceDefinition` has no concept of a secondary identifier
 *   component distinct from the resource's rendered name; `path` cannot be
 *   represented today. Documented as a gap only (P1: needed before a future IAM-like
 *   resource with a path is cataloged) — not encoded as a fabricated `max_length`
 *   covering both fields.
 */
export const AWS_IAM_ROLE: ResourceDefinition = deepFreeze({
  resource_type: "aws_iam_role",
  platform: "aws",
  category: "identity",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "account",
    global: true,
  },
  rendering_constraints: {
    max_length: 64,
    length_unit: "code_points",
    allowed_characters: "alphanumeric characters plus '+', '=', ',', '.', '@', '_', and '-'",
  },
  placement_constraints: ["global within the deployment scope (AWS account)"],
});
