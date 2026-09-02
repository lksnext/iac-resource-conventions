// Internal-only immutability helper. Not part of the package's public API (see
// packages/catalog/src/index.ts, the package's single public entry point).
//
// Milestone 3.1's two-level `Object.freeze` (outer catalog map, individual
// `ResourceDefinition` value) is insufficient once a `ResourceDefinition` gains a
// nested object or array field — `rendering_constraints`, `identity_constraints`, and
// `placement_constraints` are exactly such fields. Freezing only the outer levels
// would leave `definition.rendering_constraints.max_length = 1` or
// `definition.placement_constraints.push(...)` silently succeeding, contradicting the
// catalog's documented immutability guarantee (see
// docs/architecture/resource-definition-catalog.md).
//
// This helper recursively freezes plain objects and arrays only. `ResourceDefinition`
// values contain no `Map`, `Set`, `Date`, class instance, or circular reference, so
// support for those is intentionally not added.

/**
 * Recursively freezes `value` and every plain object or array reachable from it.
 * Returns `value` for convenient use at a definition's own call site.
 */
export function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const element of value) {
      deepFreeze(element);
    }
    return Object.freeze(value);
  }

  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    return Object.freeze(value);
  }

  return value;
}
