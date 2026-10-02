/**
 * The closed, locale-insensitive character-class vocabulary a Resource Definition may
 * reference from a character set (see
 * `specification/resource-definition.md#character-constraints`). The `unicode_*`
 * classes are Unicode General Categories L, N, and Z (Specification v1.5; see
 * `specification/resource-definition.md#unicode-character-classes`).
 */
export type ResourceNameCharacterClass =
  | "ascii_lowercase"
  | "ascii_uppercase"
  | "ascii_letters"
  | "ascii_digits"
  | "unicode_letters"
  | "unicode_numbers"
  | "unicode_separators";
