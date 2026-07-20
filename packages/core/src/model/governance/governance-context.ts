import type { GovernanceProfileId } from "../common/identifiers.js";

/**
 * The canonical model describing how a resource is owned and governed — "who owns,
 * pays for, and manages this resource?" — independently of what the resource is (see
 * `../identity/resource-identity.ts`).
 *
 * Governance Context is intentionally independent from Resource Identity: changing one
 * must not require changing the other. `profile` selects the Governance Profile applied
 * to the resource; it is independent of the Convention Pack, which is selected via a
 * Naming Request's `convention` field (see `../conventions/convention-pack.ts`).
 *
 * See `specification/governance-context.md` and
 * `specification/schemas/governance-context.schema.json`.
 */
export interface GovernanceContext {
  /** Team or person responsible for the resource. */
  readonly owner?: string;

  /** Tool or platform managing the resource. */
  readonly managed_by?: string;

  /** Organizational cost allocation identifier. */
  readonly cost_center?: string;

  /** Identifier of the Governance Profile applied to the resource. */
  readonly profile?: GovernanceProfileId;
}
