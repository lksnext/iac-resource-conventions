import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Azure Compute Gallery, formerly Shared Image Gallery (`Microsoft.Compute/galleries`).
 *
 * Source: {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 * ("Naming rules and restrictions for Azure resources", `Microsoft.Compute` section,
 * `galleries` row, retrieved for the Azure Lamassu portability slice).
 *
 * Findings:
 * - **Uniqueness / scope** — "galleries | resource group | 1-80". Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "resource group"`.
 *   Evidence: Explicit.
 * - **Global** — regional; bound to its resource group's location.
 *   `identity_constraints.global: false`. Evidence: Explicit.
 * - **Length** — "1-80". Modeled as `min_length: 1`, `max_length: 80`. Evidence:
 *   Explicit.
 * - **Length unit** — `code_points` (repository implementation choice; see
 *   `./resource-group.ts`).
 * - **Allowed characters — no hyphens** — "Alphanumerics, underscores, and periods.
 *   Start and end with alphanumeric." Unlike every other resource type in this
 *   catalog slice, the hyphen is **not** an allowed character for a Compute Gallery
 *   name. Modeled as `character_constraints` (`ascii_letters` + `ascii_digits`
 *   classes, plus `_` and `.` literals — no `-`), `starts_with`/`ends_with`
 *   (`ascii_letters` + `ascii_digits`). Evidence: Explicit. This single fact is the
 *   reason `azure-workload-underscore` exists as a separate Convention Pack (see
 *   `../convention-packs/azure-workload-underscore.ts`): a hyphen-separated pack
 *   would generate a structurally invalid name for this resource type, and
 *   Specification v1.2 forbids Convention Evaluation from silently repairing an
 *   invalid rendered name (see
 *   `specification/resource-definition.md#validation-and-normalization-remain-separate`).
 * - **Placement** — regional; location chosen by the deployment.
 */
export const AZURE_COMPUTE_GALLERY: ResourceDefinition = deepFreeze({
  resource_type: "azure_compute_gallery",
  platform: "azure",
  category: "compute",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "resource group",
    global: false,
  },
  rendering_constraints: {
    min_length: 1,
    max_length: 80,
    length_unit: "code_points",
    allowed_characters_description:
      "alphanumeric characters, underscores, and periods only (no hyphens); must start and end with an alphanumeric character",
    character_constraints: {
      classes: ["ascii_letters", "ascii_digits"],
      literals: ["_", "."],
    },
    starts_with: { classes: ["ascii_letters", "ascii_digits"] },
    ends_with: { classes: ["ascii_letters", "ascii_digits"] },
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
