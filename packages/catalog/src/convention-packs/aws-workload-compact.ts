import type { ConventionPack } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * `aws-workload-compact` — `aws-workload-default` (see `./aws-workload-default.ts`) with
 * `functional.resource_type` abbreviated, so names are shorter and `aws_s3_bucket`
 * names are valid (S3 forbids the underscore in the unabbreviated resource type).
 *
 * This value implements, and must remain faithful to, the normative Specification
 * Artifact at `specification/convention-packs/aws-workload-compact.md`.
 *
 * Field-by-field mapping to the artifact:
 * - every field except `id` and `abbreviations` — identical to `aws-workload-default`.
 * - `abbreviations` — "Naming projection", reproduced verbatim from the artifact's own
 *   YAML example.
 */
export const AWS_WORKLOAD_COMPACT: ConventionPack = deepFreeze({
  id: "aws-workload-compact",
  identity_defaults: {
    deployment: { platform: "aws" },
  },
  required_attributes: [
    "organizational.system",
    "deployment.environment",
    "functional.resource_type",
  ],
  naming_component_order: [
    "organizational.system",
    "functional.service",
    "deployment.environment",
    "deployment.location",
    "functional.component",
    "functional.resource_type",
    "deployment.instance",
  ],
  separator: "-",
  casing: "lower",
  abbreviations: {
    "deployment.environment": {
      production: "prod",
      staging: "stg",
      development: "dev",
    },
    "functional.resource_type": {
      aws_acm_certificate: "acm",
      aws_iam_role: "role",
      aws_lambda_function: "lambda",
      aws_s3_bucket: "s3",
      aws_ssm_parameter: "param",
    },
  },
  override_policy: {
    protected_attributes: ["organizational.organization", "deployment.deployment_scope"],
    overridable_attributes: ["deployment.location"],
  },
  tag_projections: {
    Name: { source: "outputs.name", only_when_resource_accepts_no_name: true },
    Project: "organizational.system",
    Environment: "deployment.environment",
    Service: "functional.service",
    Component: "functional.component",
    Owner: "governance.owner",
    ManagedBy: "governance.managed_by",
    CostCenter: "governance.cost_center",
  },
});
