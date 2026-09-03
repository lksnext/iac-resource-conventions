import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * AWS Lambda function.
 *
 * Sources (retrieved for Milestone 3.2, re-verified for Milestone 3.3):
 * - {@link https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html}
 *   ("CreateFunction") — `FunctionName` request parameter and pattern; the
 *   `ResourceConflictException` ("The resource already exists, or another operation
 *   is in progress") is Lambda's own documented evidence that creating a function
 *   with a name that already exists is rejected.
 * - {@link https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html}
 *   ("Lambda quotas") — "Quotas for concurrent executions and storage apply per AWS
 *   Region," confirming Lambda is a Region-scoped service.
 *
 * Findings:
 * - **Uniqueness / regional** — a function is created within a single Region and
 *   account (`CreateFunction` is invoked against a Regional Lambda endpoint, and
 *   every returned `FunctionArn` embeds both the Region and the account ID). Modeled
 *   as `identity_constraints.unique: true` (Evidence: Explicit —
 *   `ResourceConflictException` directly demonstrates duplicate-name rejection),
 *   `uniqueness_scope: "account, region"` (Evidence: **Derived**, not Explicit — no
 *   single AWS sentence states this exact scope; it is inferred mechanically from the
 *   regional endpoint plus the account/Region segments in `FunctionArn` and
 *   `ResourceConflictException`, per Milestone 3.3's evidence-classification review),
 *   `identity_constraints.global: false` (Evidence: Explicit, from the per-Region
 *   quota statement above).
 * - **Length** — `FunctionName`'s description states: "The length constraint applies
 *   only to the full ARN. If you specify only the function name, it is limited to 64
 *   characters in length." Modeled as `max_length: 64` (the bare-name case, since
 *   this catalog models a resource's own rendered name, not its ARN). The
 *   request-time pattern's `+` quantifier (see below) requires at least one
 *   character, modeled as `min_length: 1` (Specification v1.2 closes the previously
 *   documented `min_length` model gap; see
 *   `docs/architecture/resource-definition-catalog-conformance.md#min_length-gap`).
 *   Evidence: Explicit.
 * - **Length unit** — the request-time `FunctionName` pattern
 *   (`[a-zA-Z0-9-_]+` for the bare-name segment) is entirely single-byte ASCII, so
 *   `code_points` and `utf8_bytes` coincide; `code_points` is used for the same
 *   reason as `aws_s3_bucket` (see `./s3-bucket.ts`). This is a repository
 *   implementation choice, not an AWS-defined code-point semantic.
 * - **Allowed characters** — the request-time pattern's bare-name segment allows only
 *   letters, digits, hyphens, and underscores (no period). Modeled executably as
 *   `character_constraints` (`ascii_letters` + `ascii_digits` classes, plus the `-`
 *   and `_` literals), directly from the literal, AWS-published regular expression
 *   `[a-zA-Z0-9-_]+` — the *only* one of this catalog's four current entries backed
 *   by a pattern rather than prose alone. Specification v1.2 closes the previously
 *   documented allowed-character-model gap (see
 *   `docs/architecture/resource-definition-catalog-conformance.md#allowed-character-model-gap`).
 *   The pattern imposes no additional first/last-character rule, so no `starts_with`/
 *   `ends_with` is modeled. Evidence: Explicit. Note: the *response* `FunctionName`
 *   pattern additionally allows a period, and `FunctionArn`/response length
 *   constraints differ (256 characters); this Resource Definition models the value a
 *   caller supplies at creation time, not the ARN or the value AWS may echo back.
 * - **Placement** — regional, with no additional conditional rule documented (unlike
 *   `aws_acm_certificate`, see `./acm-certificate.ts`).
 */
export const AWS_LAMBDA_FUNCTION: ResourceDefinition = deepFreeze({
  resource_type: "aws_lambda_function",
  platform: "aws",
  category: "compute",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "account, region",
    global: false,
  },
  rendering_constraints: {
    min_length: 1,
    max_length: 64,
    length_unit: "code_points",
    allowed_characters_description: "letters, digits, hyphens, and underscores only",
    character_constraints: {
      classes: ["ascii_letters", "ascii_digits"],
      literals: ["-", "_"],
    },
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
