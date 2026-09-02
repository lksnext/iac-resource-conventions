import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * AWS Lambda function.
 *
 * Source: {@link https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html}
 * ("CreateFunction", `FunctionName` request parameter, retrieved for Milestone 3.2).
 *
 * Findings:
 * - **Uniqueness / regional** — a function is created within a single Region and
 *   account (the `CreateFunction` operation is invoked against a Regional Lambda
 *   endpoint); its name must be unique within that account and Region. Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "account, region"`,
 *   `identity_constraints.global: false`.
 * - **Length** — `FunctionName`'s description states: "The length constraint applies
 *   only to the full ARN. If you specify only the function name, it is limited to 64
 *   characters in length." Modeled as `max_length: 64` (the bare-name case, since
 *   this catalog models a resource's own rendered name, not its ARN).
 * - **Length unit** — the request-time `FunctionName` pattern
 *   (`[a-zA-Z0-9-_]+` for the bare-name segment) is entirely single-byte ASCII, so
 *   `code_points` and `utf8_bytes` coincide; `code_points` is used for the same
 *   reason as `aws_s3_bucket` (see `./s3-bucket.ts`).
 * - **Allowed characters** — the request-time pattern's bare-name segment allows only
 *   letters, digits, hyphens, and underscores (no period), recorded as free
 *   descriptive text. Note: the *response* `FunctionName` pattern additionally allows
 *   a period, and `FunctionArn`/response length constraints differ (256 characters);
 *   this Resource Definition models the value a caller supplies at creation time, not
 *   the ARN or the value AWS may echo back.
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
    max_length: 64,
    length_unit: "code_points",
    allowed_characters: "letters, digits, hyphens, and underscores only",
  },
  placement_constraints: ["regional; location chosen by the deployment"],
});
