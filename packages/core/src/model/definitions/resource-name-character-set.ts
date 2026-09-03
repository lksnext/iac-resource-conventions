import type { ResourceNameCharacterClass } from "./resource-name-character-class.js";

/**
 * A structured, executable allowed-character-set representation, shared by
 * `character_constraints`, `starts_with`, and `ends_with` (see
 * `specification/resource-definition.md#character-constraints`).
 *
 * The allowed set is the union of every code point covered by `classes` and every
 * code point listed in `literals`; a value with an empty allowed set (no `classes`,
 * no `literals`) is malformed Resource Definition configuration and must not be
 * declared (see `specification/resource-definition.md#character-constraints`).
 */
export interface ResourceNameCharacterSet {
  /** Zero or more closed character classes contributing to the allowed set. */
  readonly classes?: ReadonlyArray<ResourceNameCharacterClass>;

  /** Zero or more individual allowed characters, each exactly one Unicode code point. */
  readonly literals?: ReadonlyArray<string>;
}
