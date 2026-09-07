import type { ConventionPack } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * `azure-workload-default` — an effective Convention Pack for Azure workload
 * subscriptions, composing an Azure Platform Convention, an Azure workload
 * Organization Convention, and an Internal Workload Deployment Convention. This is
 * the general-purpose, hyphen-separated Azure naming policy: it is valid for every
 * Resource Type in this catalog's Azure slice **except** `azure_key_vault` (whose
 * 24-character maximum length is too tight for this pack's full component set — see
 * `./azure-workload-compact.ts`) and `azure_compute_gallery` (whose naming grammar
 * forbids hyphens entirely — see `./azure-workload-underscore.ts`).
 *
 * This value implements, and must remain faithful to, the normative Specification
 * Artifact at `specification/convention-packs/azure-workload-default.md` (see
 * `test/runtime/convention-pack-catalog.test.mjs`'s fidelity tests, the same pattern
 * `aws-workload-default` already established — see
 * docs/architecture/convention-pack-catalog.md#specificationruntime-fidelity).
 *
 * Field-by-field mapping to the artifact:
 * - `identity_defaults.deployment.platform: "azure"` — "Identity defaults": `platform`
 *   defaults to `azure`.
 * - `required_attributes` — "Required attributes": `organizational.system`,
 *   `deployment.environment`, `functional.resource_type`.
 * - `naming_component_order`, `separator`, `casing`, `abbreviations` — "Naming
 *   projection", reproduced verbatim from the artifact's own YAML example. The
 *   resource-type abbreviation leads the name (Azure's own CAF convention prefixes a
 *   resource-type code, for example `rg-`, `vnet-`), unlike `aws-workload-default`,
 *   which places `functional.resource_type` near the end — a deliberate difference
 *   justified by Azure's own naming convention, not an inconsistency.
 * - `override_policy.protected_attributes` — "Override policy": `organization` and
 *   `deployment_scope` must not normally be overridden, mirroring
 *   `aws-workload-default`'s own policy for the same reasons.
 * - `override_policy.overridable_attributes` — "Override policy": `location` may be
 *   overridden for legacy resources.
 *
 * `governance_defaults` and `context_authority_rules` are intentionally omitted, the
 * same as `aws-workload-default` (see `./aws-workload-default.ts`): the artifact does
 * not define a concrete default Governance Profile or metadata/tag key mapping.
 */
export const AZURE_WORKLOAD_DEFAULT: ConventionPack = deepFreeze({
  id: "azure-workload-default",
  identity_defaults: {
    deployment: { platform: "azure" },
  },
  required_attributes: [
    "organizational.system",
    "deployment.environment",
    "functional.resource_type",
  ],
  naming_component_order: [
    "functional.resource_type",
    "organizational.system",
    "functional.service",
    "deployment.environment",
    "deployment.location",
    "deployment.instance",
  ],
  separator: "-",
  casing: "lower",
  abbreviations: {
    "functional.resource_type": {
      azure_resource_group: "rg",
      azure_virtual_network: "vnet",
      azure_subnet: "snet",
      azure_network_security_group: "nsg",
      azure_linux_virtual_machine: "vm",
      azure_postgresql_flexible_server: "psql",
      azure_log_analytics_workspace: "log",
    },
    "deployment.environment": {
      production: "prod",
      staging: "stg",
      development: "dev",
    },
    "deployment.location": {
      eastus: "eus",
      eastus2: "eus2",
      westus: "wus",
      westus2: "wus2",
      westus3: "wus3",
      centralus: "cus",
      northeurope: "neu",
      westeurope: "weu",
      uksouth: "uks",
      ukwest: "ukw",
    },
  },
  override_policy: {
    protected_attributes: ["organizational.organization", "deployment.deployment_scope"],
    overridable_attributes: ["deployment.location"],
  },
});
