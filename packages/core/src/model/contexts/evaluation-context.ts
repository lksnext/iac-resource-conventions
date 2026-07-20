import type { RuntimeContext } from "./runtime-context.js";
import type { SharedDeploymentContext } from "./shared-deployment-context.js";
import type { SharedOrganizationalContext } from "./shared-organizational-context.js";

/**
 * The complete collection of external facts available during a specific Context
 * Resolution evaluation.
 *
 * Evaluation Context is not part of the Convention Pack (see
 * `../conventions/convention-pack.ts`): it contains facts scoped to one execution,
 * tenant, or provisioned deployment scope, not stable, reusable convention.
 *
 * `runtime_context` may hold either a plain `RuntimeContext` or the more specific
 * `ProvisioningContext` (see `./provisioning-context.ts`), consistent with the
 * Specification's tree notation that nests Provisioning Context under Runtime Context
 * rather than modeling it as an independent, parallel field.
 *
 * See `specification/context-resolution.md`.
 */
export interface EvaluationContext {
  /** Organizational values stable across many evaluations. */
  readonly shared_organizational_context?: SharedOrganizationalContext;

  /** Deployment values stable across many evaluations. */
  readonly shared_deployment_context?: SharedDeploymentContext;

  /** Dynamic facts scoped to this execution, possibly a `ProvisioningContext`. */
  readonly runtime_context?: RuntimeContext;
}
