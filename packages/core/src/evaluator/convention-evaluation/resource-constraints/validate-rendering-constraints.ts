import type {
  ConventionValidationFailure,
  ResourceDefinition,
  ResourceRenderingConstraints,
} from "../../../model/index.js";
import { allowedCodePoints, codePointsOf } from "./character-set.js";
import { measureLength } from "./length.js";

/**
 * Validates `name` against `min_length`/`max_length`, in that order (Specification
 * v1.2 steps 1–2, see
 * `specification/resource-definition.md#constraint-validation-order-specification-v12`).
 * Neither bound truncates or pads the name — a violation is reported, unmodified.
 *
 * If either bound is declared without a recognized `length_unit`, length cannot be
 * measured deterministically; this is reported as its own failure, distinct from
 * (and carrying no) v1.2 `code`, the same way `max_length`'s pre-v1.2 defensive check
 * already behaved. `ResourceRenderingConstraints` prevents this at compile time; the
 * check remains for a `ResourceDefinition` arriving from an untyped source.
 */
function validateLength(
  name: string,
  constraints: ResourceRenderingConstraints,
): ConventionValidationFailure[] {
  if (constraints.min_length === undefined && constraints.max_length === undefined) {
    return [];
  }

  const unit: string | undefined = constraints.length_unit;
  if (unit !== "code_points" && unit !== "utf8_bytes") {
    return [
      {
        message:
          "Resource Definition declares min_length or max_length without a recognized " +
          'length_unit ("code_points" or "utf8_bytes"); length cannot be measured ' +
          "deterministically.",
      },
    ];
  }

  const length = measureLength(name, unit);
  const failures: ConventionValidationFailure[] = [];

  if (constraints.min_length !== undefined && length < constraints.min_length) {
    failures.push({
      message: `name is shorter than min_length of ${constraints.min_length} characters`,
      code: "min-length",
    });
  }

  if (constraints.max_length !== undefined && length > constraints.max_length) {
    failures.push({
      message: `name exceeds max_length of ${constraints.max_length} characters`,
      code: "max-length",
    });
  }

  return failures;
}

/**
 * Validates `name` against `character_constraints` (Specification v1.2 step 3). One
 * failure is reported per rendered name, regardless of how many code points violate
 * the allowed set: unlike `forbidden_prefixes`/`forbidden_suffixes` (which the
 * Specification explicitly says report "every match"), `character_constraints` states
 * only that a name containing any disallowed code point "is invalid" — the same
 * single-outcome phrasing `min_length`/`max_length`/`starts_with`/`ends_with` use,
 * each of which can only ever produce one failure.
 */
function validateCharacterConstraints(
  name: string,
  constraints: ResourceRenderingConstraints,
): ConventionValidationFailure | undefined {
  if (constraints.character_constraints === undefined) {
    return undefined;
  }

  const allowed = allowedCodePoints(constraints.character_constraints);
  const hasDisallowedCodePoint = codePointsOf(name).some((codePoint) => !allowed.has(codePoint));
  if (!hasDisallowedCodePoint) {
    return undefined;
  }

  return {
    message: "name contains a code point outside the allowed character_constraints set",
    code: "character-constraint",
  };
}

/** Validates `name`'s first code point against `starts_with` (Specification v1.2 step 4a). */
function validateStartsWith(
  name: string,
  constraints: ResourceRenderingConstraints,
): ConventionValidationFailure | undefined {
  if (constraints.starts_with === undefined) {
    return undefined;
  }

  const allowed = allowedCodePoints(constraints.starts_with);
  const first = codePointsOf(name)[0];
  if (first !== undefined && allowed.has(first)) {
    return undefined;
  }

  return {
    message: "name's first code point does not satisfy starts_with",
    code: "starts-with",
  };
}

/** Validates `name`'s last code point against `ends_with` (Specification v1.2 step 4b). */
function validateEndsWith(
  name: string,
  constraints: ResourceRenderingConstraints,
): ConventionValidationFailure | undefined {
  if (constraints.ends_with === undefined) {
    return undefined;
  }

  const allowed = allowedCodePoints(constraints.ends_with);
  const codePoints = codePointsOf(name);
  const last = codePoints[codePoints.length - 1];
  if (last !== undefined && allowed.has(last)) {
    return undefined;
  }

  return {
    message: "name's last code point does not satisfy ends_with",
    code: "ends-with",
  };
}

/**
 * Validates `name` against `forbidden_prefixes` (Specification v1.2 step 5a). Every
 * declared entry is checked, in declaration order, and every match is reported.
 */
function validateForbiddenPrefixes(
  name: string,
  constraints: ResourceRenderingConstraints,
): ConventionValidationFailure[] {
  return (constraints.forbidden_prefixes ?? [])
    .filter((prefix) => name.startsWith(prefix))
    .map((prefix) => ({
      message: `name starts with the forbidden prefix "${prefix}"`,
      code: "forbidden-prefix" as const,
    }));
}

/**
 * Validates `name` against `forbidden_suffixes` (Specification v1.2 step 5b). Every
 * declared entry is checked, in declaration order, and every match is reported.
 */
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

/**
 * Validates a rendered `name` against every executable `rendering_constraints` family
 * declared by `resourceDefinition`, in the Specification's normative deterministic
 * order (see
 * `specification/resource-definition.md#constraint-validation-order-specification-v12`):
 * `min_length`, `max_length`, `character_constraints`, `starts_with`, `ends_with`,
 * `forbidden_prefixes` (entries in declaration order), `forbidden_suffixes` (entries
 * in declaration order). Returns every violated constraint, not only the first, in
 * that same order. None of these checks ever transforms `name` — no truncation, no
 * padding, no sanitization.
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

  const failures: ConventionValidationFailure[] = [...validateLength(name, constraints)];

  const characterConstraintFailure = validateCharacterConstraints(name, constraints);
  if (characterConstraintFailure !== undefined) {
    failures.push(characterConstraintFailure);
  }

  const startsWithFailure = validateStartsWith(name, constraints);
  if (startsWithFailure !== undefined) {
    failures.push(startsWithFailure);
  }

  const endsWithFailure = validateEndsWith(name, constraints);
  if (endsWithFailure !== undefined) {
    failures.push(endsWithFailure);
  }

  failures.push(...validateForbiddenPrefixes(name, constraints));
  failures.push(...validateForbiddenSuffixes(name, constraints));

  return failures;
}
