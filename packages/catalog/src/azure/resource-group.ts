import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Azure Resource Group (`Microsoft.Resources/resourceGroups`).
 *
 * Source: {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 * ("Naming rules and restrictions for Azure resources", `Microsoft.Resources`
 * section, retrieved for the Azure Lamassu portability slice).
 *
 * Findings:
 * - **Uniqueness / scope** — "resourcegroups | subscription | 1-90". Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "subscription"`. Evidence:
 *   Explicit.
 * - **Global** — a resource group is deployed to (and has) a location, so
 *   `identity_constraints.global: false`, matching `azure_key_vault`'s and every
 *   other regional resource type in this slice. Evidence: Explicit (Azure requires a
 *   `location` at resource-group creation).
 * - **Length** — "1-90". Modeled as `min_length: 1`, `max_length: 90`. Evidence:
 *   Explicit.
 * - **Length unit** — `code_points`, the same repository implementation choice made
 *   for every AWS entry (see `../aws/s3-bucket.ts`), not an Azure-defined code-point
 *   semantic.
 * - **Allowed characters (partial model, documented gap)** — Azure's own rule is
 *   "Underscores, hyphens, periods, parentheses, and letters or digits as defined by
 *   `Char.IsLetterOrDigit`" — a .NET Unicode category set (`UppercaseLetter`,
 *   `LowercaseLetter`, `TitlecaseLetter`, `ModifierLetter`, `OtherLetter`,
 *   `DecimalDigitNumber`) broader than this Specification's closed, ASCII-only
 *   `character_constraints` vocabulary (see
 *   `specification/resource-definition.md#regex-decision`). Modeled conservatively as
 *   `ascii_letters` + `ascii_digits` + `_`, `-`, `.`, `(`, `)` literals: every name this
 *   allows is genuinely valid in Azure, but a non-ASCII-letter name Azure would also
 *   accept is rejected here. This under-approximation is a documented gap (P2, same
 *   category as the AWS catalog's own ASCII-only character-class limitation), not a
 *   guess. Evidence: Explicit for the ASCII subset; Azure's broader Unicode allowance
 *   is not modeled.
 * - **End constraint** — "Can't end with period." Modeled as `forbidden_suffixes: ["."]`.
 *   Evidence: Explicit. No documented start restriction beyond the allowed character
 *   set itself, so no `starts_with` is modeled.
 * - **Placement** — regional; the deployment chooses the Azure region.
 */
export const AZURE_RESOURCE_GROUP: ResourceDefinition = deepFreeze({
  resource_type: "azure_resource_group",
  platform: "azure",
  category: "management",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "subscription",
    global: false,
  },
  rendering_constraints: {
    min_length: 1,
    max_length: 90,
    length_unit: "code_points",
    allowed_characters_description:
      "letters, digits, underscores, hyphens, periods, and parentheses (ASCII subset modeled; Azure additionally allows non-ASCII Unicode letters, not modeled here)",
    character_constraints: {
      classes: ["ascii_letters", "ascii_digits"],
      literals: ["_", "-", ".", "(", ")"],
    },
    forbidden_suffixes: ["."],
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
