import type { ConventionPack } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * `azure-workload-compact` — a shorter-name variant of `azure-workload-default` (see
 * `./azure-workload-default.ts`) for Azure Resource Types whose maximum length makes
 * the default pack's full component set impractical. Its only current consumer is
 * `azure_key_vault` (`max_length: 24`, see `../azure/key-vault.ts`): even a short
 * `organizational.system` value quickly exhausts 24 characters once resource-type
 * abbreviation, service, environment, location, and instance are all present.
 *
 * This pack does not truncate — Specification v1.2 forbids Convention Evaluation from
 * repairing an out-of-range rendered name (see
 * `specification/resource-definition.md#validation-and-normalization-remain-separate`).
 * Instead, it drops `functional.service` and `deployment.location` from
 * `naming_component_order` entirely, keeping only the components a Key Vault name
 * needs most: which resource type, which system, which environment, and an optional
 * instance discriminator. A caller whose resolved values still exceed 24 characters
 * after this reduction receives an invalid Convention Result — expected and correct
 * behavior, not a defect (see `docs/release-notes/v0.1.0-alpha.1.md` for the
 * documented recommendation to keep `organizational.system` short for Key Vault).
 *
 * This value implements, and must remain faithful to, the normative Specification
 * Artifact at `specification/convention-packs/azure-workload-compact.md`.
 *
 * Field-by-field mapping to the artifact:
 * - `identity_defaults`, `required_attributes`, `override_policy` — identical to
 *   `azure-workload-default`, since this pack narrows only the naming projection, not
 *   identity defaults, required attributes, or override policy.
 * - `naming_component_order`, `separator`, `casing` — "Naming projection": the
 *   reduced four-component order, still hyphen-separated and lowercased.
 * - `abbreviations` — reuses the same `functional.resource_type` and
 *   `deployment.environment` mappings as `azure-workload-default`; no
 *   `deployment.location` mapping is needed since `deployment.location` is not part
 *   of this pack's naming projection at all.
 */
export const AZURE_WORKLOAD_COMPACT: ConventionPack = deepFreeze({
  id: "azure-workload-compact",
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
    "deployment.environment",
    "deployment.instance",
  ],
  separator: "-",
  casing: "lower",
  abbreviations: {
    "functional.resource_type": {
      azure_key_vault: "kv",
    },
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
