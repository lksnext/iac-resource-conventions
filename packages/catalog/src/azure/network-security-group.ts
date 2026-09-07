import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Azure Network Security Group (`Microsoft.Network/networkSecurityGroups`).
 *
 * Source: {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 * ("Naming rules and restrictions for Azure resources", `Microsoft.Network` section,
 * `networkSecurityGroups` row, retrieved for the Azure portability slice).
 *
 * Findings:
 * - **Uniqueness / scope** — "networkSecurityGroups | resource group | 1-80". Modeled
 *   as `identity_constraints.unique: true`, `uniqueness_scope: "resource group"`.
 *   Evidence: Explicit.
 * - **Global** — regional, bound to its resource group's location.
 *   `identity_constraints.global: false`. Evidence: Explicit.
 * - **Length** — "1-80". Modeled as `min_length: 1`, `max_length: 80`. Evidence:
 *   Explicit.
 * - **Length unit** — `code_points` (repository implementation choice; see
 *   `./resource-group.ts`).
 * - **Allowed characters** — identical rule text to `azure_virtual_network`:
 *   "Alphanumerics, underscores, periods, and hyphens. Start with alphanumeric. End
 *   with alphanumeric or underscore." Modeled identically. Evidence: Explicit.
 * - **Placement** — regional; location chosen by the deployment.
 */
export const AZURE_NETWORK_SECURITY_GROUP: ResourceDefinition = deepFreeze({
  resource_type: "azure_network_security_group",
  platform: "azure",
  category: "networking",
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
