import type {
  ConventionValidationFailure,
  ConventionValidationFailureCode,
  ResourceLengthBounds,
  ResourceNameCharacterSet,
} from "../../../model/index.js";
import { characterSetMatcher, codePointsOf } from "./character-set.js";
import { measureLength } from "./length.js";

/**
 * Validates `value` against `min_length`/`max_length`, in that order. `subject` names
 * the validated text in messages (for example, `name` or `tag key "Project"`).
 *
 * A bound declared without a recognized `length_unit` cannot be measured
 * deterministically and is reported as its own failure, carrying no `code`.
 */
export function validateLengthBounds(
  value: string,
  bounds: ResourceLengthBounds,
  subject: string,
  codes: {
    readonly min: ConventionValidationFailureCode;
    readonly max: ConventionValidationFailureCode;
  },
): ConventionValidationFailure[] {
  if (bounds.min_length === undefined && bounds.max_length === undefined) {
    return [];
  }

  const unit: string | undefined = bounds.length_unit;
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

  const length = measureLength(value, unit);
  const failures: ConventionValidationFailure[] = [];

  if (bounds.min_length !== undefined && length < bounds.min_length) {
    failures.push({
      message: `${subject} is shorter than min_length of ${bounds.min_length} characters`,
      code: codes.min,
    });
  }

  if (bounds.max_length !== undefined && length > bounds.max_length) {
    failures.push({
      message: `${subject} exceeds max_length of ${bounds.max_length} characters`,
      code: codes.max,
    });
  }

  return failures;
}

/**
 * Validates every code point of `value` against `set`. One failure is reported per
 * value, regardless of how many code points violate the allowed set.
 */
export function validateCharacterSet(
  value: string,
  set: ResourceNameCharacterSet | undefined,
  subject: string,
  code: ConventionValidationFailureCode,
): ConventionValidationFailure | undefined {
  if (set === undefined) {
    return undefined;
  }

  const isAllowed = characterSetMatcher(set);
  if (codePointsOf(value).every(isAllowed)) {
    return undefined;
  }

  return {
    message: `${subject} contains a code point outside the allowed character_constraints set`,
    code,
  };
}

/** Validates `value` against every entry of `prefixes`, in declaration order, reporting every match. */
export function validateForbiddenPrefixes(
  value: string,
  prefixes: ReadonlyArray<string> | undefined,
  subject: string,
  code: ConventionValidationFailureCode,
): ConventionValidationFailure[] {
  return (prefixes ?? [])
    .filter((prefix) => value.startsWith(prefix))
    .map((prefix) => ({
      message: `${subject} starts with the forbidden prefix "${prefix}"`,
      code,
    }));
}
