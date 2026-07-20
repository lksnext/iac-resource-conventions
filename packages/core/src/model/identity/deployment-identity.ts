import type { DeploymentScope, Environment, Location, Platform } from "../common/identifiers.js";

/**
 * Plane 2 of Resource Identity: Deployment Identity.
 *
 * Answers "where is this resource deployed?" by describing the platform, deployment
 * boundary, and location within that boundary.
 *
 * `platform` is part of the canonical resolved identity but is normally derived from
 * the resource type, Resource Definition, or adapter rather than supplied directly by a
 * caller. `deployment_scope` is a logical identifier, not a provider's technical ID
 * (see `../common/identifiers.ts`'s `ProviderScopeId`). Some resources are global and
 * therefore do not require `location`.
 *
 * See `specification/resource-identity.md` and
 * `specification/schemas/resource-identity.schema.json`.
 */
export interface DeploymentIdentity {
  /** Infrastructure platform, normally derived rather than supplied directly. */
  readonly platform?: Platform;

  /** Logical identifier for the administrative or isolation boundary where the resource is deployed. */
  readonly deployment_scope?: DeploymentScope;

  /** Lifecycle stage or operational environment in which the resource is used. */
  readonly environment?: Environment;

  /** Logical or physical deployment location, when the resource is not global. */
  readonly location?: Location;

  /** Optional discriminator distinguishing multiple equivalent instances of a resource. */
  readonly instance?: string;
}
