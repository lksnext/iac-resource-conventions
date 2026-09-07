import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Azure Key Vault (`Microsoft.KeyVault/vaults`).
 *
 * Source: {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 * ("Naming rules and restrictions for Azure resources", `Microsoft.KeyVault` section,
 * `vaults` row, retrieved for the Azure Lamassu portability slice).
 *
 * Findings:
 * - **Uniqueness / scope** — "vaults | global | 3-24": a Key Vault name is unique
 *   across all of Azure (it becomes part of the public `<name>.vault.azure.net` DNS
 *   name), not merely within a resource group or subscription. Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "global"`. Evidence:
 *   Explicit.
 * - **Global** — the vault itself is still a regional resource (it is deployed to,
 *   and has, an Azure region); "global" here describes the *uniqueness scope* of its
 *   name, not the resource's own placement — the same distinction
 *   `specification/resource-definition.md#identity-constraints` draws between
 *   `uniqueness_scope` and `global`. Modeled as `identity_constraints.global: false`.
 *   Evidence: Explicit (Key Vault requires a `location` at creation).
 * - **Length** — "3-24". Modeled as `min_length: 3`, `max_length: 24`. Evidence:
 *   Explicit. This is the tightest length bound in this catalog slice, motivating the
 *   `azure-workload-compact` Convention Pack (see
 *   `../convention-packs/azure-workload-compact.ts`) rather than truncation, which
 *   Specification v1.2 does not permit (see
 *   `specification/resource-definition.md#validation-and-normalization-remain-separate`).
 * - **Length unit** — `code_points` (repository implementation choice; see
 *   `./resource-group.ts`).
 * - **Allowed characters** — "Alphanumerics and hyphens. Start with a letter. End
 *   with letter or number." Modeled as `character_constraints` (`ascii_letters` +
 *   `ascii_digits` classes, plus `-` literal), `starts_with` (`ascii_letters` only —
 *   not digits, since the rule says "a letter", not "alphanumeric"), `ends_with`
 *   (`ascii_letters` + `ascii_digits`). Evidence: Explicit.
 * - **Adjacency rule (deferred, not modeled)** — "Can't contain consecutive hyphens."
 *   No structured constraint in Specification v1.2 represents character adjacency
 *   (see `specification/resource-definition.md#deferred-reserved-pattern-rules`,
 *   which defers exactly this category for `aws_s3_bucket`'s "no two adjacent
 *   periods" rule); the same deferral applies here. Documented as a gap only (P2),
 *   not encoded as a fabricated `forbidden_prefixes`/`forbidden_suffixes` entry.
 * - **Placement** — regional; location chosen by the deployment.
 */
export const AZURE_KEY_VAULT: ResourceDefinition = deepFreeze({
  resource_type: "azure_key_vault",
  platform: "azure",
  category: "security",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "global",
    global: false,
  },
  rendering_constraints: {
    min_length: 3,
    max_length: 24,
    length_unit: "code_points",
    allowed_characters_description:
      "alphanumeric characters and hyphens; must start with a letter and end with a letter or number",
    character_constraints: {
      classes: ["ascii_letters", "ascii_digits"],
      literals: ["-"],
    },
    starts_with: { classes: ["ascii_letters"] },
    ends_with: { classes: ["ascii_letters", "ascii_digits"] },
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
