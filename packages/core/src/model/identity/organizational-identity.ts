import type { TenantId } from "../common/identifiers.js";

/**
 * Plane 1 of Resource Identity: Organizational Identity.
 *
 * Answers "why does this resource exist?" by describing the organizational context a
 * resource belongs to. These attributes are stable and rarely change over the lifetime
 * of a resource.
 *
 * Every attribute is optional: the Specification's JSON Schema does not require any of
 * them. Which attributes are required for a specific evaluation is a Convention Pack
 * policy decision (see `../conventions/convention-pack.ts`), not a structural rule of
 * this contract.
 *
 * See `specification/resource-identity.md` and
 * `specification/schemas/resource-identity.schema.json`.
 */
export interface OrganizationalIdentity {
  /** Enterprise, company, legal entity, or top-level owner of the resource. */
  readonly organization?: string;

  /** Organizational area responsible for or funding the system. */
  readonly business_unit?: string;

  /** Software system, product, or business application the resource belongs to. */
  readonly system?: string;

  /** Optional customer or logical tenant associated with the resource. */
  readonly tenant?: TenantId;
}
