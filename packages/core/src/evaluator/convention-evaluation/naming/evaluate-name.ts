import type { ConventionPack } from "../../../model/index.js";
import type { ProjectedResource } from "../../resource-projection/index.js";
import { applyAbbreviation } from "./apply-abbreviation.js";
import { applyCasing } from "./apply-casing.js";

/**
 * Evaluates the Specification v1.1 naming rules for a projected resource.
 *
 * Returns `undefined` when no name can or should be generated: either because the
 * selected Convention Pack declared no naming components, or because one of the
 * declared components is required but unresolved.
 */
export function evaluateName(
  projectedResource: ProjectedResource,
  conventionPack: ConventionPack,
): string | undefined {
  if (projectedResource.components.length === 0) {
    return undefined;
  }

  const separator = conventionPack.separator ?? "";
  const casing = conventionPack.casing ?? "preserve";

  const transformedComponents: string[] = [];

  for (const component of projectedResource.components) {
    if (component.value === undefined) {
      return undefined;
    }

    const abbreviatedValue = applyAbbreviation(
      component.attribute,
      component.value,
      conventionPack.abbreviations,
    );
    transformedComponents.push(applyCasing(abbreviatedValue, casing));
  }

  return transformedComponents.join(separator);
}
