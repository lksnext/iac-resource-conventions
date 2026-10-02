import type {
  ConventionValidationFailure,
  ResourceDefinition,
  ResourceNameCharacterSet,
  ResourceRenderingConstraints,
} from "../../../model/index.js";
import { characterSetMatcher, codePointsOf } from "./character-set.js";
import {
  validateCharacterSet,
  validateForbiddenPrefixes,
  validateLengthBounds,
} from "./text-constraints.js";

/** Validates one boundary code point of `name` (its first or last) against `set`. */
function validateBoundary(
  codePoint: string | undefined,
  set: ResourceNameCharacterSet | undefined,
  field: "starts_with" | "ends_with",
): ConventionValidationFailure | undefined {
  if (set === undefined) {
    return undefined;
  }
  if (codePoint !== undefined && characterSetMatcher(set)(codePoint)) {
    return undefined;
  }
  return field === "starts_with"
    ? { message: "name's first code point does not satisfy starts_with", code: "starts-with" }
    : { message: "name's last code point does not satisfy ends_with", code: "ends-with" };
}

/** Validates `name` against every entry of `forbidden_suffixes`, in declaration order, reporting every match. */
function validateForbiddenSuffixes(
  name: string,
  constraints: ResourceRenderingConstraints,
): ConventionValidationFailure[] {
  return (constraints.forbidden_suffixes ?? [])
    .filter((suffix) => name.endsWith(suffix))
    .map((suffix) => ({
      message: `name ends with the forbidden suffix "${suffix}"`,
      code: "forbidden-suffix" as const,
    }));
}

/** Validates `name`'s non-empty delimiter-separated segment count against `max_segments` (Specification v1.5). */
function validateMaxSegments(
  name: string,
  constraints: ResourceRenderingConstraints,
): ConventionValidationFailure | undefined {
  const limit = constraints.max_segments;
  if (limit === undefined) {
    return undefined;
  }
  const segments = name.split(limit.delimiter).filter((segment) => segment.length > 0).length;
  if (segments <= limit.max) {
    return undefined;
  }
  return {
    message: `name has ${segments} "${limit.delimiter}"-separated segments, more than max_segments of ${limit.max}`,
    code: "max-segments",
  };
}

/**
 * Validates a rendered `name` against every executable `rendering_constraints` family
 * declared by `resourceDefinition`, in the Specification's normative deterministic
 * order (see
 * `specification/resource-definition.md#constraint-validation-order-specification-v12`):
 * `min_length`, `max_length`, `character_constraints`, `starts_with`, `ends_with`,
 * `forbidden_prefixes`, `forbidden_suffixes`, `max_segments`. Returns every violated
 * constraint, not only the first, in that same order. None of these checks ever
 * transforms `name`.
 *
 * Only applies when a name was actually generated (`name !== undefined`) and the
 * Resource Definition actually declares `rendering_constraints`.
 */
export function validateRenderingConstraints(
  name: string | undefined,
  resourceDefinition: ResourceDefinition,
): ConventionValidationFailure[] {
  const constraints = resourceDefinition.rendering_constraints;
  if (name === undefined || constraints === undefined) {
    return [];
  }

  const codePoints = codePointsOf(name);
  const failures: ConventionValidationFailure[] = [
    ...validateLengthBounds(name, constraints, "name", { min: "min-length", max: "max-length" }),
  ];

  const optionalFailures = [
    validateCharacterSet(name, constraints.character_constraints, "name", "character-constraint"),
    validateBoundary(codePoints[0], constraints.starts_with, "starts_with"),
    validateBoundary(codePoints[codePoints.length - 1], constraints.ends_with, "ends_with"),
  ];
  for (const failure of optionalFailures) {
    if (failure !== undefined) {
      failures.push(failure);
    }
  }

  failures.push(
    ...validateForbiddenPrefixes(name, constraints.forbidden_prefixes, "name", "forbidden-prefix"),
  );
  failures.push(...validateForbiddenSuffixes(name, constraints));

  const maxSegmentsFailure = validateMaxSegments(name, constraints);
  if (maxSegmentsFailure !== undefined) {
    failures.push(maxSegmentsFailure);
  }

  return failures;
}
