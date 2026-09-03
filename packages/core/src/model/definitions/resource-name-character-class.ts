/**
 * The closed, ASCII-only, locale-insensitive character-class vocabulary a Resource
 * Definition may reference from `character_constraints`, `starts_with`, or `ends_with`
 * (see `specification/resource-definition.md#character-constraints`).
 *
 * Deliberately closed to plain ASCII classes: no current catalog resource type
 * demonstrates a need for a Unicode general category or a locale-sensitive class (see
 * `specification/resource-definition.md#regex-decision`). Extended only when a real,
 * cataloged resource type demonstrates a need for another class.
 */
export type ResourceNameCharacterClass =
  | "ascii_lowercase"
  | "ascii_uppercase"
  | "ascii_letters"
  | "ascii_digits";
