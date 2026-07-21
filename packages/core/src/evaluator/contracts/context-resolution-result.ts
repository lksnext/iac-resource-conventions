import type { GovernanceContext, ResourceIdentity } from "../../model/index.js";

/**
 * The paired output Context Resolution produces from a {@link ContextResolutionInput}.
 *
 * The Specification states that "Context Resolution produces exactly two canonical
 * models" — Resource Identity and Governance Context — together, not as two independent
 * or sequential resolutions (see
 * `specification/context-resolution.md#what-context-resolution-produces`). This
 * contract represents that pairing explicitly: a consumer (Resource Definition
 * selection, or Convention Evaluation) always receives both models from the same
 * completed evaluation, never one without the other.
 *
 * Both fields are required: unlike `ResourceIdentity` and `GovernanceContext` alone
 * (whose attributes stay optional to mirror their permissive JSON Schemas), this
 * contract represents the *completed* result of one Context Resolution evaluation, not
 * a partially-built value in progress.
 *
 * This is an internal evaluator contract, not part of the package's public API (see
 * `docs/architecture/reference-evaluator.md#public-api-principles`).
 */
export interface ContextResolutionResult {
  /** The resolved, canonical identity produced by this evaluation. */
  readonly resource_identity: ResourceIdentity;

  /** The resolved ownership and governance context produced by this evaluation. */
  readonly governance_context: GovernanceContext;
}
