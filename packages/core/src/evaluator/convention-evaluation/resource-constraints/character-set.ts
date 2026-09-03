import type { ResourceNameCharacterClass, ResourceNameCharacterSet } from "../../../model/index.js";

const ASCII_LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const ASCII_UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ASCII_DIGITS = "0123456789";

/**
 * Expands one closed {@link ResourceNameCharacterClass} into its member characters
 * (see `specification/resource-definition.md#character-constraints`). Locale-
 * independent: the four classes are plain ASCII ranges, never a locale-sensitive
 * Unicode general category.
 */
function expandCharacterClass(characterClass: ResourceNameCharacterClass): string {
  switch (characterClass) {
    case "ascii_lowercase":
      return ASCII_LOWERCASE;
    case "ascii_uppercase":
      return ASCII_UPPERCASE;
    case "ascii_letters":
      return ASCII_LOWERCASE + ASCII_UPPERCASE;
    case "ascii_digits":
      return ASCII_DIGITS;
  }
}

/**
 * The allowed set for a {@link ResourceNameCharacterSet}: the union of every code
 * point covered by its declared `classes` and every code point listed in its
 * `literals` (see `specification/resource-definition.md#character-constraints`). A
 * code point appearing more than once, across classes or literals, has no effect on
 * the union.
 */
export function allowedCodePoints(set: ResourceNameCharacterSet): ReadonlySet<string> {
  const allowed = new Set<string>();
  for (const characterClass of set.classes ?? []) {
    for (const character of expandCharacterClass(characterClass)) {
      allowed.add(character);
    }
  }
  for (const literal of set.literals ?? []) {
    allowed.add(literal);
  }
  return allowed;
}

/**
 * Iterates `value` by Unicode code point (unlike UTF-16-code-unit indexing), so a
 * character outside the Basic Multilingual Plane is never split into two entries.
 */
export function codePointsOf(value: string): ReadonlyArray<string> {
  return [...value];
}
