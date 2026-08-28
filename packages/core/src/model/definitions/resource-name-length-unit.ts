/**
 * The closed length-measurement vocabulary a Resource Definition must declare whenever
 * it declares `rendering_constraints.max_length`, so that two independently conforming
 * Reference Evaluator implementations measure the same generated name the same way
 * (see `specification/resource-definition.md#rendering-constraints`).
 *
 * - `code_points` — the number of Unicode code points (scalar values) in the name.
 * - `utf8_bytes` — the number of bytes in the name's UTF-8 encoding.
 *
 * This vocabulary only includes units a currently-known resource-definition scenario
 * requires; it is not exhaustive of every unit a future resource type could need (for
 * example, UTF-16 code units or grapheme clusters), and is extended only when a real
 * supported resource type demonstrates the need.
 */
export type ResourceNameLengthUnit = "code_points" | "utf8_bytes";
