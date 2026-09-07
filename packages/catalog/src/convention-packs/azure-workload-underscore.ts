import type { ConventionPack } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * `azure-workload-underscore` — an underscore-separated variant of
 * `azure-workload-default` (see `./azure-workload-default.ts`) for Azure Resource
 * Types whose naming grammar forbids hyphens. Its only current consumer is
 * `azure_compute_gallery` (see `../azure/compute-gallery.ts`), whose Microsoft-documented
 * allowed characters are "Alphanumerics, underscores, and periods" — explicitly
 * excluding the hyphen every other Resource Type in this catalog slice accepts.
 *
 * Reusing `azure-workload-default` unchanged for this resource type is not an option:
 * its `-` separator would appear literally inside the rendered name, and Specification
 * v1.2 does not sanitize a generated name to remove a separator that turns out to be
 * an invalid character for the target resource type (see
 * `specification/convention-pack.md#separator`, "The Specification does not sanitize
 * a naming component's own resolved or abbreviated value"). A dedicated pack with a
 * valid separator is the correct fix, not evaluator-level character substitution.
 *
 * This value implements, and must remain faithful to, the normative Specification
 * Artifact at `specification/convention-packs/azure-workload-underscore.md`.
 *
 * Field-by-field mapping to the artifact:
 * - `identity_defaults`, `required_attributes`, `naming_component_order`,
 *   `override_policy` — identical in shape to `azure-workload-default`; only
 *   `separator` changes.
 * - `separator: "_"` — "Naming projection": the sole difference from
 *   `azure-workload-default`, chosen because every candidate abbreviation and
 *   resolved value used by this pack's current consumer is itself hyphen-free, so no
 *   other field needs to change to keep the rendered name valid.
 * - `abbreviations` — reuses the same `deployment.environment` mapping as
 *   `azure-workload-default`; `functional.resource_type` maps only
 *   `azure_compute_gallery`, this pack's sole current consumer.
 */
export const AZURE_WORKLOAD_UNDERSCORE: ConventionPack = deepFreeze({
  id: "azure-workload-underscore",
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
  separator: "_",
  casing: "lower",
  abbreviations: {
    "functional.resource_type": {
      azure_compute_gallery: "gal",
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
