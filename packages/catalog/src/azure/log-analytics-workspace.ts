import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Azure Log Analytics Workspace (`Microsoft.OperationalInsights/workspaces`).
 *
 * Source: {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 * ("Naming rules and restrictions for Azure resources", `Microsoft.OperationalInsights`
 * section, `workspaces` row, retrieved for the Azure Lamassu portability slice).
 *
 * Findings:
 * - **Uniqueness / scope** — "workspaces | resource group | 4-63". Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "resource group"`.
 *   Evidence: Explicit.
 * - **Global** — regional; bound to its resource group's location.
 *   `identity_constraints.global: false`. Evidence: Explicit.
 * - **Length** — "4-63". Modeled as `min_length: 4`, `max_length: 63`. Evidence:
 *   Explicit.
 * - **Length unit** — `code_points` (repository implementation choice; see
 *   `./resource-group.ts`).
 * - **Allowed characters** — "Alphanumerics and hyphens. Start and end with
 *   alphanumeric." Modeled as `character_constraints` (`ascii_letters` +
 *   `ascii_digits` classes, plus `-` literal), `starts_with`/`ends_with`
 *   (`ascii_letters` + `ascii_digits`, excluding the hyphen). Evidence: Explicit.
 * - **Placement** — regional; location chosen by the deployment.
 */
export const AZURE_LOG_ANALYTICS_WORKSPACE: ResourceDefinition = deepFreeze({
  resource_type: "azure_log_analytics_workspace",
  platform: "azure",
  category: "monitoring",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "resource group",
    global: false,
  },
  rendering_constraints: {
    min_length: 4,
    max_length: 63,
    length_unit: "code_points",
    allowed_characters_description:
      "alphanumeric characters and hyphens; must start and end with an alphanumeric character",
    character_constraints: {
      classes: ["ascii_letters", "ascii_digits"],
      literals: ["-"],
    },
    starts_with: { classes: ["ascii_letters", "ascii_digits"] },
    ends_with: { classes: ["ascii_letters", "ascii_digits"] },
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
