import type {
  ConventionValidationFailure,
  ResourceDefinition,
  ResourceTagTextConstraints,
} from "../../../model/index.js";
import {
  validateCharacterSet,
  validateForbiddenPrefixes,
  validateLengthBounds,
} from "./text-constraints.js";

function validateTagText(
  text: string,
  constraints: ResourceTagTextConstraints | undefined,
  subject: string,
  part: "key" | "value",
): ConventionValidationFailure[] {
  if (constraints === undefined) {
    return [];
  }
  const lengthCode = part === "key" ? "tag-key-length" : "tag-value-length";
  const failures = validateLengthBounds(text, constraints, subject, {
    min: lengthCode,
    max: lengthCode,
  });
  const characterFailure = validateCharacterSet(
    text,
    constraints.character_constraints,
    subject,
    part === "key" ? "tag-key-character" : "tag-value-character",
  );
  if (characterFailure !== undefined) {
    failures.push(characterFailure);
  }
  failures.push(
    ...validateForbiddenPrefixes(
      text,
      constraints.forbidden_prefixes,
      subject,
      part === "key" ? "tag-key-forbidden-prefix" : "tag-value-forbidden-prefix",
    ),
  );
  return failures;
}

/**
 * Validates projected `tags` against `resourceDefinition.tag_constraints`
 * (Specification v1.5; see `specification/resource-definition.md#tag-constraints`):
 * for each tag in projection order, its key and then its value, then `max_count`.
 * Every violation is reported; no tag is changed or dropped.
 */
export function validateTagConstraints(
  tags: Readonly<Record<string, string>> | undefined,
  resourceDefinition: ResourceDefinition,
): ConventionValidationFailure[] {
  const constraints = resourceDefinition.tag_constraints;
  if (tags === undefined || constraints === undefined) {
    return [];
  }

  const failures: ConventionValidationFailure[] = [];
  for (const [key, value] of Object.entries(tags)) {
    failures.push(...validateTagText(key, constraints.key, `tag key "${key}"`, "key"));
    failures.push(...validateTagText(value, constraints.value, `tag "${key}" value`, "value"));
  }

  const count = Object.keys(tags).length;
  if (constraints.max_count !== undefined && count > constraints.max_count) {
    failures.push({
      message: `${count} tags are projected, more than max_count of ${constraints.max_count}`,
      code: "tag-count",
    });
  }

  return failures;
}
