import type { ConventionPack } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * `aws-workload-default` — an effective Convention Pack for AWS workload accounts,
 * composing an AWS Platform Convention, an AWS workload-account Organization
 * Convention, and an Internal Workload Deployment Convention.
 *
 * This value implements, and must remain faithful to, the normative Specification
 * Artifact at `specification/convention-packs/aws-workload-default.md`. That document
 * remains the normative source; this executable value is its implementation, proven
 * faithful by `test/runtime/convention-pack-catalog.test.mjs`'s fidelity tests — it is
 * not a second, independent source of truth (see
 * docs/architecture/convention-pack-catalog.md#specificationruntime-fidelity).
 *
 * Field-by-field mapping to the artifact:
 * - `identity_defaults.deployment.platform: "aws"` — "Identity defaults": `platform`
 *   defaults to `aws`.
 * - `required_attributes` — "Required attributes": `organizational.system`,
 *   `deployment.environment`, `functional.resource_type`.
 * - `naming_component_order`, `separator`, `casing`, `abbreviations` — "Naming
 *   projection", reproduced verbatim from the artifact's own YAML example.
 * - `override_policy.protected_attributes` — "Override policy": `organization` and
 *   `deployment_scope` must not normally be overridden.
 * - `override_policy.overridable_attributes` — "Override policy": `location` may be
 *   overridden for legacy resources.
 *
 * The artifact does not state a concrete default Governance Profile or metadata/tag
 * key mapping ("This document does not define actual AWS Tag key names, value
 * formats, or casing"), so `governance_defaults` and `context_authority_rules` are
 * intentionally omitted here rather than invented.
 */
export const AWS_WORKLOAD_DEFAULT: ConventionPack = deepFreeze({
  id: "aws-workload-default",
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
  },
  override_policy: {
    protected_attributes: ["organizational.organization", "deployment.deployment_scope"],
    overridable_attributes: ["deployment.location"],
  },
});
