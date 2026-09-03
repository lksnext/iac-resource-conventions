import type { ResourceNameLengthUnit } from "../../../model/index.js";

/**
 * Measures `value` according to a Resource Definition's declared
 * {@link ResourceNameLengthUnit} (see
 * `specification/resource-definition.md#rendering-constraints`):
 *
 * - `code_points` — the number of Unicode code points, computed with the spread
 *   operator (`[...value].length`), which iterates by code point and correctly
 *   accounts for surrogate pairs — unlike JavaScript's native UTF-16-code-unit
 *   `String.prototype.length`.
 * - `utf8_bytes` — the number of bytes in `value`'s UTF-8 encoding, computed with a
 *   pure ECMAScript code-point iteration: each code point contributes 1 byte
 *   (U+0000–U+007F), 2 bytes (U+0080–U+07FF), 3 bytes (U+0800–U+FFFF), or 4 bytes
 *   (U+10000–U+10FFFF), the same byte count Node's `Buffer.byteLength(value, "utf8")`
 *   produces, without depending on Node's ambient type declarations.
 *
 * Pure and deterministic: the same `value` and `unit` always produce the same result.
 */
export function measureLength(value: string, unit: ResourceNameLengthUnit): number {
  switch (unit) {
    case "code_points":
      return [...value].length;
    case "utf8_bytes": {
      let bytes = 0;
      for (const codePoint of value) {
        const point = codePoint.codePointAt(0) ?? 0;
        bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
      }
      return bytes;
    }
  }
}
