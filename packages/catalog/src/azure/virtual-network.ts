import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Azure Virtual Network (`Microsoft.Network/virtualNetworks`).
 *
 * Source: {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 * ("Naming rules and restrictions for Azure resources", `Microsoft.Network` section,
 * `virtualNetworks` row, retrieved for the Azure Lamassu portability slice).
 *
 * Findings:
 * - **Uniqueness / scope** — "virtualNetworks | resource group | 2-64". Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "resource group"`.
 *   Evidence: Explicit.
 * - **Global** — regional; a virtual network is bound to the Azure region of its
 *   resource group. `identity_constraints.global: false`. Evidence: Explicit.
 * - **Length** — "2-64". Modeled as `min_length: 2`, `max_length: 64`. Evidence:
 *   Explicit.
 * - **Length unit** — `code_points` (repository implementation choice; see
 *   `./resource-group.ts`).
 * - **Allowed characters** — "Alphanumerics, underscores, periods, and hyphens. Start
 *   with alphanumeric. End with alphanumeric or underscore." Modeled as
 *   `character_constraints` (`ascii_letters` + `ascii_digits` classes, plus `_`, `.`,
 *   `-` literals), `starts_with` (`ascii_letters` + `ascii_digits`), `ends_with`
 *   (`ascii_letters` + `ascii_digits` classes, plus `_` literal). Evidence: Explicit.
 * - **Placement** — regional; the deployment chooses the Azure region, inherited from
 *   the containing resource group.
 */
export const AZURE_VIRTUAL_NETWORK: ResourceDefinition = deepFreeze({
  resource_type: "azure_virtual_network",
  platform: "azure",
  category: "networking",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "resource group",
    global: false,
  },
  rendering_constraints: {
    min_length: 2,
    max_length: 64,
    length_unit: "code_points",
    allowed_characters_description:
      "alphanumeric characters, underscores, periods, and hyphens; must start with an alphanumeric character and end with an alphanumeric character or underscore",
    character_constraints: {
      classes: ["ascii_letters", "ascii_digits"],
      literals: ["_", ".", "-"],
    },
    starts_with: { classes: ["ascii_letters", "ascii_digits"] },
    ends_with: { classes: ["ascii_letters", "ascii_digits"], literals: ["_"] },
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
