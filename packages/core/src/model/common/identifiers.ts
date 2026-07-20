/**
 * Cross-cutting identifier and value aliases reused by more than one Executable
 * Domain Model contract.
 *
 * These are intentionally plain `string` aliases, not branded or validated types:
 * this milestone introduces named aliases only for concepts that recur across
 * contracts, and adds no runtime constructors, validators, or branding symbols (see
 * `docs/architecture/executable-domain-model.md`). They exist to communicate domain
 * meaning at contract boundaries, not to enforce it.
 */

/**
 * The canonical technical resource kind used to select a resource's
 * `ResourceDefinition` (see `../definitions/resource-definition.ts`).
 *
 * Defined by Resource Identity's Functional Identity plane (`functional.resource_type`)
 * and referenced by a Naming Request's top-level `resource_type` field.
 *
 * See `specification/resource-identity.md` and `specification/resource-definition.md`.
 */
export type ResourceType = string;

/**
 * Identifier of a Convention Pack, selected via a Naming Request's `convention` field.
 *
 * See `specification/naming-request.md` and `specification/convention-pack.md`.
 */
export type ConventionPackId = string;

/**
 * Identifier of a Governance Profile, selected via Governance Context's `profile`
 * field. Independent of {@link ConventionPackId}.
 *
 * See `specification/governance-context.md`.
 */
export type GovernanceProfileId = string;

/**
 * Infrastructure platform a resource belongs to (for example, an AWS, Azure, or
 * Kubernetes platform identifier). Normally derived rather than supplied directly by a
 * caller.
 *
 * See `specification/resource-identity.md`.
 */
export type Platform = string;

/**
 * Logical identifier for the administrative or isolation boundary where a resource is
 * deployed (for example, an AWS account alias, an Azure subscription alias, or a
 * Kubernetes cluster name) — not the provider's technical identifier (see
 * {@link ProviderScopeId}).
 *
 * See `specification/resource-identity.md` and `specification/context-resolution.md`.
 */
export type DeploymentScope = string;

/**
 * Provider-generated technical identifier for a deployment scope (for example, an AWS
 * Account ID), distinct from the logical {@link DeploymentScope}. Not part of canonical
 * Resource Identity; may be retained as Runtime or Provisioning Context.
 *
 * See `specification/context-resolution.md`.
 */
export type ProviderScopeId = string;

/**
 * Lifecycle stage or operational environment in which a resource is used (for example,
 * `staging` or `production`).
 *
 * See `specification/resource-identity.md`.
 */
export type Environment = string;

/**
 * Logical or physical deployment location for a resource that is not global (for
 * example, a region or datacenter).
 *
 * See `specification/resource-identity.md`.
 */
export type Location = string;

/**
 * Optional customer or logical tenant associated with a resource.
 *
 * See `specification/resource-identity.md`.
 */
export type TenantId = string;
