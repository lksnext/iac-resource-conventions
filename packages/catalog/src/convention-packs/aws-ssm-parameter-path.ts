import type { ConventionPack } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * `aws-ssm-parameter-path` — a hierarchical-path variant of `aws-workload-default` (see
 * `./aws-workload-default.ts`) for `aws_ssm_parameter` (see `../aws/ssm-parameter.ts`),
 * whose hierarchical names must start with `/`.
 *
 * This value implements, and must remain faithful to, the normative Specification
 * Artifact at `specification/convention-packs/aws-ssm-parameter-path.md`.
 *
 * Field-by-field mapping to the artifact:
 * - `identity_defaults`, `required_attributes`, `override_policy`, `tag_projections` —
 *   identical to `aws-workload-default`.
 * - `naming_component_order`, `separator`, `prefix`, `casing`, `abbreviations` —
 *   "Naming projection", reproduced verbatim from the artifact's own YAML example.
 */
export const AWS_SSM_PARAMETER_PATH: ConventionPack = deepFreeze({
  id: "aws-ssm-parameter-path",
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
    "deployment.environment",
    "functional.service",
    "functional.component",
    "deployment.instance",
  ],
  separator: "/",
  prefix: "/",
  casing: "lower",
  abbreviations: {
    "deployment.environment": {
      production: "prod",
      staging: "stg",
      development: "dev",
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
