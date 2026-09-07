import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * Azure Linux Virtual Machine (`Microsoft.Compute/virtualMachines`, Linux host name
 * variant only — see [Windows/Linux scope](#windows-linux-scope) below).
 *
 * Source: {@link https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules}
 * ("Naming rules and restrictions for Azure resources", `Microsoft.Compute` section,
 * `virtualMachines` row, retrieved for the Azure portability slice).
 *
 * Findings:
 * - **Windows/Linux scope** — "virtualMachines | resource group | 1-15 (Windows)
 *   1-64 (Linux)" with a note: "Azure virtual machines have two distinct names:
 *   resource name and host name. ... The restrictions in the preceding table are for
 *   the host name. The actual resource name can have up to 64 characters." This
 *   catalog entry is deliberately scoped, permanently, to **Linux only** — the same
 *   reasoning `aws_s3_bucket` applies to general purpose buckets versus directory
 *   buckets (see `../aws/s3-bucket.ts`): the Windows host-name limit (15 characters)
 *   is a materially different constraint a single static `ResourceDefinition` cannot
 *   honestly represent alongside Linux's 64. A future `azure_windows_virtual_machine`
 *   would need its own `ResourceType`, never a conditional branch inside this one.
 * - **Uniqueness / scope** — unique within its resource group. Modeled as
 *   `identity_constraints.unique: true`, `uniqueness_scope: "resource group"`.
 *   Evidence: Explicit.
 * - **Global** — regional; a virtual machine is deployed to a specific Azure region.
 *   `identity_constraints.global: false`. Evidence: Explicit.
 * - **Length** — "1-64 (Linux)", and the note above confirms the ARM resource name
 *   itself may be up to 64 characters — the same bound this catalog models, since it
 *   models a resource's own rendered name (consistent with `aws_lambda_function`'s
 *   bare-name scoping; see `../aws/lambda-function.ts`). Modeled as `min_length: 1`,
 *   `max_length: 64`. Evidence: Explicit.
 * - **Length unit** — `code_points` (repository implementation choice; see
 *   `./resource-group.ts`).
 * - **Allowed characters** — "Can't use spaces, control characters, or these
 *   characters: `~ ! @ # $ % ^ & * ( ) = + _ [ ] { } \ | ; : . ' " , < > / ?`." This
 *   excludes the underscore and the period along with the more obviously unsafe
 *   symbols, leaving only letters, digits, and hyphen as allowed. Modeled as
 *   `character_constraints` (`ascii_letters` + `ascii_digits` classes, plus `-`
 *   literal only — no underscore, no period). Evidence: Explicit.
 * - **End constraint** — "Linux virtual machines can't end with periods or hyphens."
 *   Since periods are already outside the allowed character set (so a period can
 *   never appear anywhere in a valid name, including at the end), only the hyphen
 *   half of this rule needs a dedicated constraint. Modeled as
 *   `forbidden_suffixes: ["-"]`. Evidence: Explicit. No documented start restriction
 *   beyond the allowed character set itself, so no `starts_with` is modeled.
 * - **Placement** — regional; location chosen by the deployment.
 */
export const AZURE_LINUX_VIRTUAL_MACHINE: ResourceDefinition = deepFreeze({
  resource_type: "azure_linux_virtual_machine",
  platform: "azure",
  category: "compute",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "resource group",
    global: false,
  },
  rendering_constraints: {
    min_length: 1,
    max_length: 64,
    length_unit: "code_points",
    allowed_characters_description: "letters, digits, and hyphens only (Linux host name)",
    character_constraints: {
      classes: ["ascii_letters", "ascii_digits"],
      literals: ["-"],
    },
    forbidden_suffixes: ["-"],
  },
  placement_constraints: [{ statement: "regional; location chosen by the deployment" }],
});
