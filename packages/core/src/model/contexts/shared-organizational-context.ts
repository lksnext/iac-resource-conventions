import type { OrganizationalIdentity } from "../identity/organizational-identity.js";

/**
 * Organizational values that are stable across many evaluations and do not need to be
 * repeated by the caller (for example, `organization`, `business_unit`).
 *
 * Shares the same attribute vocabulary as `OrganizationalIdentity` (see
 * `../identity/organizational-identity.ts`) because Shared Organizational Context
 * supplies values for that same identity plane during Context Resolution; it is not a
 * separate set of attributes.
 *
 * See `specification/context-resolution.md`.
 */
export type SharedOrganizationalContext = OrganizationalIdentity;
