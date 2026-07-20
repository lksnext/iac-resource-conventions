import type { DeploymentIdentity } from "../identity/deployment-identity.js";

/**
 * Deployment values that are stable across many evaluations or derived from the
 * environment in which a request is made (for example, `platform`, `deployment_scope`).
 *
 * Shares the same attribute vocabulary as `DeploymentIdentity` (see
 * `../identity/deployment-identity.ts`), for the same reason described on
 * `SharedOrganizationalContext`.
 *
 * See `specification/context-resolution.md`.
 */
export type SharedDeploymentContext = DeploymentIdentity;
