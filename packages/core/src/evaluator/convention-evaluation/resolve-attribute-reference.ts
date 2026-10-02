import type { ContextResolutionResult } from "../contracts/context-resolution-result.js";

type AttributeAccessor = (context: ContextResolutionResult) => string | undefined;

/**
 * Every Resource Identity and Governance Context attribute reference Convention
 * Evaluation can resolve, keyed by the same dotted path `required_attributes` and
 * `tag_projections` use (see `../../model/conventions/convention-pack.ts`).
 */
const ATTRIBUTE_ACCESSORS: Readonly<Record<string, AttributeAccessor>> = {
  "organizational.organization": (c) => c.resource_identity.organizational?.organization,
  "organizational.business_unit": (c) => c.resource_identity.organizational?.business_unit,
  "organizational.system": (c) => c.resource_identity.organizational?.system,
  "organizational.tenant": (c) => c.resource_identity.organizational?.tenant,
  "deployment.platform": (c) => c.resource_identity.deployment?.platform,
  "deployment.deployment_scope": (c) => c.resource_identity.deployment?.deployment_scope,
  "deployment.environment": (c) => c.resource_identity.deployment?.environment,
  "deployment.location": (c) => c.resource_identity.deployment?.location,
  "deployment.instance": (c) => c.resource_identity.deployment?.instance,
  "functional.service": (c) => c.resource_identity.functional?.service,
  "functional.component": (c) => c.resource_identity.functional?.component,
  "functional.resource_type": (c) => c.resource_identity.functional?.resource_type,
  "governance.owner": (c) => c.governance_context.owner,
  "governance.managed_by": (c) => c.governance_context.managed_by,
  "governance.cost_center": (c) => c.governance_context.cost_center,
  "governance.profile": (c) => c.governance_context.profile,
};

/** Whether `reference` is a Resource Identity or Governance Context attribute reference. */
export function isKnownAttributeReference(reference: string): boolean {
  return Object.hasOwn(ATTRIBUTE_ACCESSORS, reference);
}

/**
 * Resolves a dotted attribute reference against `context`. An unknown reference
 * resolves to `undefined`, the same outcome as a known but absent value.
 */
export function resolveAttributeReference(
  context: ContextResolutionResult,
  reference: string,
): string | undefined {
  return isKnownAttributeReference(reference)
    ? ATTRIBUTE_ACCESSORS[reference]?.(context)
    : undefined;
}
