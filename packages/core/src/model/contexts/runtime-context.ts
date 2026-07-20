import type { ProviderScopeId } from "../common/identifiers.js";
import type { DeploymentIdentity } from "../identity/deployment-identity.js";
import type { OrganizationalIdentity } from "../identity/organizational-identity.js";

/**
 * Dynamic facts associated with a specific execution.
 *
 * The Specification intentionally does not enumerate a fixed field set for Runtime
 * Context (see `specification/context-resolution.md`); it describes it only through
 * examples of organizational and deployment facts a specific execution may contribute,
 * plus provider-generated identifiers that may be retained as implementation context
 * (the "Provider Scope ID" example, distinct from the logical `deployment_scope`). This
 * contract represents that same attribute vocabulary rather than inventing an unrelated
 * shape; `provider_scope_id` is this model's own name for that example, since no
 * Specification schema defines Runtime Context fields.
 *
 * See `./provisioning-context.ts` for the specialization produced by a provisioning
 * process.
 */
export interface RuntimeContext {
  /** Organizational facts available during this execution. */
  readonly organizational?: OrganizationalIdentity;

  /** Deployment facts available during this execution. */
  readonly deployment?: DeploymentIdentity;

  /**
   * Provider-generated technical identifier for the deployment scope (for example, an
   * AWS Account ID), retained as implementation context when a consumer requires it.
   */
  readonly provider_scope_id?: ProviderScopeId;
}
