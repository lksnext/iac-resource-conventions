import type { DeploymentIdentity } from "./deployment-identity.js";
import type { FunctionalIdentity } from "./functional-identity.js";
import type { OrganizationalIdentity } from "./organizational-identity.js";

/**
 * The canonical, three-plane domain model describing the complete identity of a
 * resource, independently of any cloud provider, tool, or naming syntax.
 *
 * Resource Identity is produced by Context Resolution from a Naming Request; it is not
 * normally constructed directly by callers (see `../requests/naming-request.ts`). It
 * does not include ownership, cost allocation, or operational policy information — that
 * is modeled independently by `GovernanceContext` (see
 * `../governance/governance-context.ts`).
 *
 * See `specification/resource-identity.md` and
 * `specification/schemas/resource-identity.schema.json`.
 */
export interface ResourceIdentity {
  /** Plane 1: why this resource exists. */
  readonly organizational?: OrganizationalIdentity;

  /** Plane 2: where this resource is deployed. */
  readonly deployment?: DeploymentIdentity;

  /** Plane 3: what this resource does. */
  readonly functional?: FunctionalIdentity;
}
