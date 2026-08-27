import type { ConventionPack, ResourceIdentity } from "../../model/index.js";

/**
 * Which Resource Identity plane a projected naming component was resolved from (see
 * `specification/resource-identity.md`). Preserved explicitly, as a typed value, so a
 * later Convention Evaluation increment does not need to re-parse a dotted attribute
 * path to recover the same fact (see
 * `docs/architecture/reference-evaluator.md#resource-projection-implemented`).
 */
export type ProjectedNamingComponentPlane = "organizational" | "deployment" | "functional";

/**
 * A single Resource Identity attribute projected as a candidate naming component, in
 * the order declared by the selected Convention Pack's `naming_component_order` (see
 * `specification/convention-pack.md#naming-projections`).
 *
 * This is a semantic representation only: `value` is copied verbatim from the resolved
 * `ResourceIdentity`, never normalized, cased, abbreviated, truncated, or otherwise
 * transformed. Applying an abbreviation, separator, or casing rule, and concatenating
 * components into a rendered name, are Convention Evaluation responsibilities that
 * belong to a later increment (see
 * `docs/architecture/reference-evaluator.md#increment-plan`), not to Resource
 * Projection.
 */
export interface ProjectedNamingComponent {
  /**
   * The dotted Resource Identity attribute path this component represents (for
   * example, `functional.service`), matching the same dotted-path convention already
   * used by `ConventionPack.naming_component_order`, `required_attributes`, and
   * `override_policy` (see `../../model/conventions/convention-pack.ts`).
   */
  readonly attribute: string;

  /** The Resource Identity plane `attribute` was resolved from. */
  readonly plane: ProjectedNamingComponentPlane;

  /**
   * The component's resolved value, copied verbatim from `ResourceIdentity`.
   * `undefined` only when the selected Convention Pack's `required_attributes`
   * declares this component required but no value was resolved for it — a projected
   * resource never silently omits a missing *required* component the way it omits a
   * missing optional one (see
   * `docs/architecture/reference-evaluator.md#resource-projection-implemented`).
   */
  readonly value: string | undefined;

  /**
   * Whether the selected Convention Pack's `required_attributes` declares this
   * attribute required (see `specification/convention-pack.md#required-attributes`).
   * Distinguishes a mandatory component from an optional one for later Convention
   * Evaluation validation (increment 2.6); Resource Projection itself never rejects or
   * throws for a missing required component.
   */
  readonly required: boolean;
}

/**
 * The semantic, resource-specific naming component sequence produced by Resource
 * Projection (see
 * `docs/architecture/reference-evaluator.md#resource-projection-implemented`). Contains
 * only candidate naming components — no final rendered name, no metadata (tags,
 * labels, annotations), and no Governance Context: the Specification ties
 * `naming_component_order` to "resolved identity components" only (see
 * `specification/convention-pack.md#naming-projections`), and no metadata projection
 * mapping exists anywhere in the current domain model for Resource Projection to
 * consult (see `../../model/conventions/convention-pack.ts`).
 */
export interface ProjectedResource {
  /**
   * The resource's candidate naming components, in the order declared by the selected
   * Convention Pack's `naming_component_order`. An absent *optional* component (no
   * resolved value, and not required) is omitted entirely, consistent with the
   * Specification's statement that a Convention Pack determines "which components may
   * be omitted for a given resource" (see
   * `specification/convention-pack.md#naming-projections`). An absent *required*
   * component is still included, with `value: undefined`, so a later increment can
   * detect and report it rather than have it silently disappear.
   */
  readonly components: ReadonlyArray<ProjectedNamingComponent>;
}

type ComponentAccessor = (resourceIdentity: ResourceIdentity) => string | undefined;

/**
 * Every Resource Identity attribute Resource Projection knows how to resolve, keyed by
 * the same dotted attribute path convention `ConventionPack.naming_component_order`
 * uses. A `naming_component_order` entry outside this table refers to no known Resource
 * Identity attribute, so neither its value nor its plane can be resolved faithfully; it
 * is omitted from a projected resource's `components` regardless of whether it is
 * declared required (see {@link projectResource}) — the Specification defines no other
 * kind of naming component (for example, a literal, constant-text component) for
 * Resource Projection to represent (see
 * `specification/convention-pack.md#naming-projections`).
 */
const COMPONENT_ACCESSORS: Readonly<Record<string, ComponentAccessor>> = {
  "organizational.organization": (ri) => ri.organizational?.organization,
  "organizational.business_unit": (ri) => ri.organizational?.business_unit,
  "organizational.system": (ri) => ri.organizational?.system,
  "organizational.tenant": (ri) => ri.organizational?.tenant,
  "deployment.platform": (ri) => ri.deployment?.platform,
  "deployment.deployment_scope": (ri) => ri.deployment?.deployment_scope,
  "deployment.environment": (ri) => ri.deployment?.environment,
  "deployment.location": (ri) => ri.deployment?.location,
  "deployment.instance": (ri) => ri.deployment?.instance,
  "functional.service": (ri) => ri.functional?.service,
  "functional.component": (ri) => ri.functional?.component,
  "functional.resource_type": (ri) => ri.functional?.resource_type,
};

function planeOf(attribute: string): ProjectedNamingComponentPlane | undefined {
  if (attribute.startsWith("organizational.")) {
    return "organizational";
  }
  if (attribute.startsWith("deployment.")) {
    return "deployment";
  }
  if (attribute.startsWith("functional.")) {
    return "functional";
  }
  return undefined;
}

/**
 * Projects the resource-specific naming component sequence for a resolved Resource
 * Identity, as configured by the selected Convention Pack's `naming_component_order`
 * and `required_attributes` (see `specification/convention-pack.md#naming-projections`
 * and `specification/convention-pack.md#required-attributes`).
 *
 * This is Resource Projection: the narrow, internal implementation increment within
 * Convention Evaluation that determines which resolved identity components a
 * generated name may draw from, and in what order — corresponding to the
 * Specification's "Evaluate Convention" pipeline step (see
 * `specification/convention-result.md#convention-evaluation-pipeline`). It is not a
 * Specification processing stage of its own, and it does not render a final name: no
 * normalization, casing, abbreviation, separator, truncation, hashing, or
 * collision-handling rule is applied here (see
 * `docs/architecture/reference-evaluator.md#resource-projection-implemented`).
 *
 * Pure and deterministic: the same `resourceIdentity` and `conventionPack` always
 * produce the same `ProjectedResource`; neither input is mutated.
 */
export function projectResource(
  resourceIdentity: ResourceIdentity,
  conventionPack: ConventionPack,
): ProjectedResource {
  const order = conventionPack.naming_component_order ?? [];
  const components: ProjectedNamingComponent[] = [];

  for (const attribute of order) {
    const plane = planeOf(attribute);
    const accessor = COMPONENT_ACCESSORS[attribute];
    if (plane === undefined || accessor === undefined) {
      // An unrecognized `naming_component_order` entry refers to no known Resource
      // Identity attribute; it cannot be resolved and its plane cannot be determined
      // faithfully, so it is omitted rather than represented with a fabricated plane
      // (see the {@link COMPONENT_ACCESSORS} documentation above).
      continue;
    }

    const value = accessor(resourceIdentity);
    const required = conventionPack.required_attributes?.includes(attribute) ?? false;

    if (value === undefined && !required) {
      // Absent optional component: omitted entirely, per
      // `specification/convention-pack.md#naming-projections`.
      continue;
    }

    components.push({ attribute, plane, value, required });
  }

  return { components };
}
