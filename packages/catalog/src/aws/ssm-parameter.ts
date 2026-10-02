import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/** Every ASCII letter-case spelling of `word`, because `forbidden_prefixes` matching is case-sensitive. */
function caseVariants(word: string): ReadonlyArray<string> {
  return [...word].reduce<string[]>(
    (variants, character) =>
      variants.flatMap((variant) => [
        variant + character.toLowerCase(),
        variant + character.toUpperCase(),
      ]),
    [""],
  );
}

const RESERVED_PREFIX_WORDS = ["aws", "ssm"] as const;

/**
 * AWS Systems Manager Parameter Store parameter.
 *
 * Sources (retrieved for the `lamassu-terraform-modules` ACM consumer support, 2026-10):
 * - {@link https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_PutParameter.html}
 *   ("PutParameter") — the `Name` request parameter, its naming constraints, its
 *   length constraints, and `HierarchyLevelLimitExceededException`.
 * - {@link https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-a-parameter.html#sysman-parameter-name-constraints}
 *   ("Parameter Store reference — Parameter name constraints").
 * - {@link https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-hierarchies.html}
 *   ("Working with parameter hierarchies in Parameter Store").
 *
 * Findings:
 * - **Uniqueness / regional** — "A parameter name must be unique within an AWS
 *   Region." Modeled as `identity_constraints.unique: true` (Evidence: Explicit) and
 *   `global: false` (Evidence: Explicit). `uniqueness_scope: "account, region"` —
 *   the Region is Explicit; the account dimension is **Derived** from the parameter
 *   ARN (`arn:aws:ssm:<region>:<account-id>:parameter/...`), the same derivation
 *   `aws_lambda_function` uses (see `./lambda-function.ts`).
 * - **Minimum length** — `Name` "Length Constraints: Minimum length of 1." Modeled as
 *   `min_length: 1`. Evidence: Explicit.
 * - **Maximum length (gap, not modeled)** — "The maximum length for a parameter name
 *   that you specify is 1011 characters. This count of 1011 characters includes the
 *   characters in the ARN that precede the name you specify", for example the 45
 *   characters of `arn:aws:ssm:us-east-2:111122223333:parameter/`. The bound depends
 *   on the partition and Region, so no fixed `max_length` represents it; `max_length`
 *   is omitted rather than fabricated. (The API's `Maximum length of 2048` includes
 *   1037 characters reserved for internal use, so it is not the caller's limit
 *   either.)
 * - **Length unit** — every allowed character (see below) is single-byte ASCII, so
 *   `code_points` and `utf8_bytes` coincide; `code_points` is used for the same reason
 *   as `aws_s3_bucket` (see `./s3-bucket.ts`).
 * - **Allowed characters** — "Parameter names can include only the following symbols
 *   and letters: `a-zA-Z0-9_.-`. In addition, the slash character ( / ) is used to
 *   delineate hierarchies in parameter names", and "Parameter names can't contain
 *   spaces." Modeled as `character_constraints` (`ascii_letters` + `ascii_digits`,
 *   plus the `_`, `.`, `-`, and `/` literals). Evidence: Explicit.
 * - **Reserved prefixes** — "A parameter name can't be prefixed with `aws` or `ssm`
 *   (case-insensitive)", with failing examples including `awsTestParameter` and
 *   `/aws/testparam1`. Specification v1.2's
 *   `forbidden_prefixes` match case-sensitively, so every letter-case spelling of
 *   `aws` and `ssm` is listed (Evidence: Explicit). The same spellings preceded by a
 *   leading `/` are also listed: `/aws/testparam1` is Explicit evidence for `/aws`;
 *   `/ssm` is **Derived** by applying the same documented rule to a hierarchical name.
 * - **Hierarchical names (gap, not modeled)** — "For parameters in a hierarchy, you
 *   must include a leading forward slash character (/)" (`MyParameter3/L1` is "not
 *   fully qualified"), and "Parameter hierarchies are limited to a maximum depth of
 *   fifteen levels." Neither rule is representable by Specification v1.2: the first
 *   is conditional (a leading `/` is required only when the name contains another
 *   `/`), and the second counts occurrences of a character. A flat name such as
 *   `lamassu-dev-dns-validation-aws_ssm_parameter` is fully valid, and the
 *   `aws-ssm-parameter-path` Convention Pack renders hierarchical names with a leading
 *   `/` (see
 *   `docs/architecture/resource-definition-catalog.md#hierarchical-names-aws_ssm_parameter`).
 * - **Case sensitivity** — "Parameter names are case sensitive." No model field
 *   represents this; recorded here only.
 * - **Placement** — regional, with no additional conditional rule documented.
 */
export const AWS_SSM_PARAMETER: ResourceDefinition = deepFreeze({
  resource_type: "aws_ssm_parameter",
  platform: "aws",
  category: "management",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "account, region",
    global: false,
  },
  rendering_constraints: {
    min_length: 1,
    length_unit: "code_points",
    allowed_characters_description:
      "letters, digits, '_', '.', '-', and '/' (hierarchy delimiter); no spaces",
    character_constraints: {
      classes: ["ascii_letters", "ascii_digits"],
      literals: ["_", ".", "-", "/"],
    },
    forbidden_prefixes: RESERVED_PREFIX_WORDS.flatMap((word) => [
      ...caseVariants(word),
      ...caseVariants(word).map((variant) => `/${variant}`),
    ]),
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
