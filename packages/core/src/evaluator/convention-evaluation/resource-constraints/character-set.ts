import type { ResourceNameCharacterClass, ResourceNameCharacterSet } from "../../../model/index.js";

/**
 * The membership test for one closed {@link ResourceNameCharacterClass} (see
 * `specification/resource-definition.md#character-constraints`). The ASCII classes are
 * plain ranges; the `unicode_*` classes are Unicode General Categories L, N, and Z
 * (see `specification/resource-definition.md#unicode-character-classes`). All are
 * locale-insensitive.
 */
const CHARACTER_CLASS_PATTERNS: Readonly<Record<ResourceNameCharacterClass, RegExp>> = {
  ascii_lowercase: /^[a-z]$/u,
  ascii_uppercase: /^[A-Z]$/u,
  ascii_letters: /^[A-Za-z]$/u,
  ascii_digits: /^[0-9]$/u,
  unicode_letters: /^\p{L}$/u,
  unicode_numbers: /^\p{N}$/u,
  unicode_separators: /^\p{Z}$/u,
};

/**
 * The membership test for a {@link ResourceNameCharacterSet}'s allowed set: the union
 * of every code point covered by its declared `classes` and every code point listed in
 * its `literals` (see `specification/resource-definition.md#character-constraints`).
 */
export function characterSetMatcher(set: ResourceNameCharacterSet): (codePoint: string) => boolean {
  const literals = new Set(set.literals ?? []);
  const patterns = (set.classes ?? []).map(
    (characterClass) => CHARACTER_CLASS_PATTERNS[characterClass],
  );
  return (codePoint) =>
    literals.has(codePoint) || patterns.some((pattern) => pattern?.test(codePoint) === true);
}

/**
 * Iterates `value` by Unicode code point (unlike UTF-16-code-unit indexing), so a
 * character outside the Basic Multilingual Plane is never split into two entries.
 */
export function codePointsOf(value: string): ReadonlyArray<string> {
  return [...value];
}
