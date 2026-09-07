import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Azure Database for PostgreSQL Flexible Server
 * (`Microsoft.DBforPostgreSQL/flexibleServers`).
 *
 * Sources (retrieved for the Azure Lamassu portability slice):
 * - {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 *   ("Naming rules and restrictions for Azure resources", `Microsoft.DBforPostgreSQL`
 *   section, `servers` row): "servers | global | 3-63 | Lowercase letters, hyphens,
 *   and numbers. Can't start or end with hyphens."
 * - {@link https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/quickstart-create-server-cli}
 *   ("Quickstart: Create an Azure Database for PostgreSQL Flexible Server"): "Server
 *   name | Must be globally unique," with example values such as
 *   `mydemoserver-pgsql` — lowercase letters and hyphens only, consistent with the
 *   `servers` row above.
 *
 * Findings:
 * - **flexibleServers vs. servers (evidence classification)** — the ARM naming-rules
 *   table lists a `servers` row under `Microsoft.DBforPostgreSQL`, not a
 *   `flexibleServers` row specifically; this Resource Definition applies that rule to
 *   `flexibleServers` because the flexible-server quickstart's own globally-unique,
 *   lowercase-hyphenated example name is consistent with it, and no other Microsoft
 *   documentation states a different rule for the flexible server variant. This is
 *   **Derived**, not Explicit, evidence, and is called out here rather than presented
 *   as an equally strong Explicit fact.
 * - **Uniqueness / scope** — global; the server name becomes part of the public
 *   `<name>.postgres.database.azure.com` DNS name. Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "global"`. Evidence:
 *   Explicit (from the quickstart's "Must be globally unique").
 * - **Global** — the server is still a regional resource (deployed to a specific
 *   Azure region); "global" here again describes uniqueness scope, not placement —
 *   the same distinction drawn for `azure_key_vault` (see `./key-vault.ts`). Modeled
 *   as `identity_constraints.global: false`. Evidence: Explicit.
 * - **Length** — "3-63". Modeled as `min_length: 3`, `max_length: 63`. Evidence:
 *   Explicit.
 * - **Length unit** — `code_points` (repository implementation choice; see
 *   `./resource-group.ts`).
 * - **Allowed characters** — "Lowercase letters, hyphens, and numbers. Can't start or
 *   end with hyphen." Modeled as `character_constraints` (`ascii_lowercase` +
 *   `ascii_digits` classes, plus `-` literal), `starts_with`/`ends_with`
 *   (`ascii_lowercase` + `ascii_digits`, excluding the hyphen). Evidence: Explicit.
 * - **Global uniqueness is a real-world constraint, not proven by this catalog** —
 *   this Resource Definition documents the character/length rule; it does not, and
 *   cannot, verify at evaluation time that a candidate name is actually unused
 *   globally (see `specification/resource-definition.md#responsibilities`, which
 *   describes identity constraints as rules the resource type must respect, not a
 *   live registry check). A practical deployment achieves global uniqueness by
 *   supplying a distinguishing value through `deployment.instance` (or another
 *   existing identity attribute), never through a randomly generated suffix invented
 *   by this catalog or the Reference Evaluator.
 * - **Placement** — regional; location chosen by the deployment.
 */
export const AZURE_POSTGRESQL_FLEXIBLE_SERVER: ResourceDefinition = deepFreeze({
  resource_type: "azure_postgresql_flexible_server",
  platform: "azure",
  category: "database",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "global",
    global: false,
  },
  rendering_constraints: {
    min_length: 3,
    max_length: 63,
    length_unit: "code_points",
    allowed_characters_description:
      "lowercase letters, digits, and hyphens; must not start or end with a hyphen",
    character_constraints: {
      classes: ["ascii_lowercase", "ascii_digits"],
      literals: ["-"],
    },
    starts_with: { classes: ["ascii_lowercase", "ascii_digits"] },
    ends_with: { classes: ["ascii_lowercase", "ascii_digits"] },
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
