import type { CanonicalResourceIdentityAttribute, ResourceIdentity } from "../../model/index.js";

/**
 * Which Resource Identity plane a canonical naming attribute belongs to.
 */
export type CanonicalResourceIdentityAttributePlane =
  | "organizational"
  | "deployment"
  | "functional";

const CANONICAL_RESOURCE_IDENTITY_ATTRIBUTE_ACCESSORS: Readonly<
  Record<
    CanonicalResourceIdentityAttribute,
    (resourceIdentity: ResourceIdentity) => string | undefined
  >
> = {
  "organizational.organization": (resourceIdentity) =>
    resourceIdentity.organizational?.organization,
  "organizational.business_unit": (resourceIdentity) =>
    resourceIdentity.organizational?.business_unit,
  "organizational.system": (resourceIdentity) => resourceIdentity.organizational?.system,
  "organizational.tenant": (resourceIdentity) => resourceIdentity.organizational?.tenant,
  "deployment.platform": (resourceIdentity) => resourceIdentity.deployment?.platform,
  "deployment.deployment_scope": (resourceIdentity) =>
    resourceIdentity.deployment?.deployment_scope,
  "deployment.environment": (resourceIdentity) => resourceIdentity.deployment?.environment,
  "deployment.location": (resourceIdentity) => resourceIdentity.deployment?.location,
  "deployment.instance": (resourceIdentity) => resourceIdentity.deployment?.instance,
  "functional.service": (resourceIdentity) => resourceIdentity.functional?.service,
  "functional.component": (resourceIdentity) => resourceIdentity.functional?.component,
  "functional.resource_type": (resourceIdentity) => resourceIdentity.functional?.resource_type,
};

const CANONICAL_RESOURCE_IDENTITY_ATTRIBUTE_PLANES: Readonly<
  Record<CanonicalResourceIdentityAttribute, CanonicalResourceIdentityAttributePlane>
> = {
  "organizational.organization": "organizational",
  "organizational.business_unit": "organizational",
  "organizational.system": "organizational",
  "organizational.tenant": "organizational",
  "deployment.platform": "deployment",
  "deployment.deployment_scope": "deployment",
  "deployment.environment": "deployment",
  "deployment.location": "deployment",
  "deployment.instance": "deployment",
  "functional.service": "functional",
  "functional.component": "functional",
  "functional.resource_type": "functional",
};

export function resolveCanonicalResourceIdentityAttribute(
  resourceIdentity: ResourceIdentity,
  attribute: CanonicalResourceIdentityAttribute,
): string | undefined {
  return CANONICAL_RESOURCE_IDENTITY_ATTRIBUTE_ACCESSORS[attribute](resourceIdentity);
}

export function planeOfCanonicalResourceIdentityAttribute(
  attribute: CanonicalResourceIdentityAttribute,
): CanonicalResourceIdentityAttributePlane {
  return CANONICAL_RESOURCE_IDENTITY_ATTRIBUTE_PLANES[attribute];
}
