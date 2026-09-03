// Internal-only catalog conformance validator (Milestone 3.3.2). Not part of the
// package's public API (see packages/catalog/src/index.ts, the package's single public
// entry point).
//
// This validates that a *static* ResourceDefinition value is structurally well formed
// according to Specification v1.2 (see
// specification/resource-definition.md#executable-resource-constraints-specification-v12)
// and this catalog's own publication policy (a registered key must equal its
// definition's own resource_type, and no two entries may share a resource_type). It is
// catalog publication/build confidence, not Convention Evaluation: `evaluate()` never
// calls this validator, and it never will (see
// docs/architecture/resource-definition-catalog.md#catalog-conformance-validation).
//
// TypeScript's own types already make most of these invariants unrepresentable for
// catalog source written in this package (for example, `ResourceRenderingConstraints`'s
// four-way length union). This validator exists for the invariants TypeScript cannot
// express at all (`min_length <= max_length`, a non-empty character set, exactly one
// code point per literal, a valid Placement Constraint operator/value shape) and for
// defensive conformance checks on malformed values that reach this validator via
// untyped or generated input (for example, a future catalog-generation workflow), not
// only hand-written TypeScript source. It is not a general-purpose runtime schema
// validator for arbitrary unknown JSON: it checks a fixed, mechanically verifiable set
// of Specification v1.2 invariants, not every possible malformed object shape.

import type {
  CanonicalResourceIdentityAttribute,
  ResourceDefinition,
  ResourceNameLengthUnit,
} from "@lksnext/iac-conventions-core";
import { CANONICAL_RESOURCE_IDENTITY_ATTRIBUTES } from "./canonical-attributes.js";

/**
 * One static ResourceDefinition conformance problem. `resource_type` identifies which
 * catalog entry the issue belongs to (the entry's own declared `resource_type`, not
 * necessarily its registered catalog key — see {@link validateCatalogEntries}, which
 * checks that separately); `path` is a dotted/indexed field path within that
 * definition; `message` is a human-readable explanation. There is no severity, code, or
 * source-location field: every issue in this increment blocks publication/tests, so a
 * severity taxonomy would carry no decision either way.
 */
export interface CatalogConformanceIssue {
  readonly resource_type: string;
  readonly path: string;
  readonly message: string;
}

const CHARACTER_CLASSES = new Set([
  "ascii_lowercase",
  "ascii_uppercase",
  "ascii_letters",
  "ascii_digits",
]);

/**
 * The closed `length_unit` vocabulary (Specification v1.2; see
 * `specification/resource-definition.md#rendering-constraints`), duplicated here as a
 * runtime set for the same reason as {@link CANONICAL_RESOURCE_IDENTITY_ATTRIBUTES}:
 * `ResourceNameLengthUnit` (imported above) is a compile-time-only literal union, core
 * exposes no runtime constant for it, and expanding core's public API solely for this
 * internal catalog validator is not justified.
 */
const LENGTH_UNITS: ReadonlySet<ResourceNameLengthUnit> = new Set(["code_points", "utf8_bytes"]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * `min_length` is normatively a non-negative integer (see
 * `specification/resource-definition.md#minimum-length`), so `NaN`, `Infinity`,
 * negative values, and fractions are all rejected.
 */
function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * `max_length` is measured in a discrete `length_unit` (code points or UTF-8 bytes) and
 * shares that unit with `min_length`, but Specification v1.2 does not state, the same
 * explicit way it does for `min_length`, that `max_length` itself must be an integer
 * (see `specification/resource-definition.md#minimum-length`). This check therefore
 * only rejects what every reading of "length" agrees is invalid — `NaN`, `Infinity`,
 * `-Infinity`, and negative values — without silently tightening `max_length` to
 * require `Number.isInteger` (see the completion report for this documented
 * Specification gap).
 */
function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validateCharacterSet(
  resourceType: string,
  path: string,
  characterSet: unknown,
  issues: CatalogConformanceIssue[],
): void {
  if (characterSet === undefined) {
    return;
  }
  if (typeof characterSet !== "object" || characterSet === null) {
    issues.push({ resource_type: resourceType, path, message: "must be an object" });
    return;
  }

  const { classes, literals } = characterSet as { classes?: unknown; literals?: unknown };
  const classCount = Array.isArray(classes) ? classes.length : 0;
  const literalCount = Array.isArray(literals) ? literals.length : 0;

  if (classCount + literalCount === 0) {
    issues.push({
      resource_type: resourceType,
      path,
      message: "must declare at least one class or literal (an empty allowed set admits no name)",
    });
  }

  for (const [index, characterClass] of (Array.isArray(classes) ? classes : []).entries()) {
    if (!CHARACTER_CLASSES.has(characterClass as string)) {
      issues.push({
        resource_type: resourceType,
        path: `${path}.classes[${index}]`,
        message: `"${String(characterClass)}" is not a recognized character class`,
      });
    }
  }

  for (const [index, literal] of (Array.isArray(literals) ? literals : []).entries()) {
    const codePointCount = typeof literal === "string" ? [...literal].length : 0;
    if (codePointCount !== 1) {
      issues.push({
        resource_type: resourceType,
        path: `${path}.literals[${index}]`,
        message: "must contain exactly one Unicode code point",
      });
    }
  }
}

function validateStringList(
  resourceType: string,
  path: string,
  values: ReadonlyArray<string> | undefined,
  issues: CatalogConformanceIssue[],
): void {
  for (const [index, value] of (values ?? []).entries()) {
    if (!isNonEmptyString(value)) {
      issues.push({
        resource_type: resourceType,
        path: `${path}[${index}]`,
        message: "must not be empty",
      });
    }
  }
}

function validatePlacementOperator(
  resourceType: string,
  path: string,
  operatorHolder: { operator?: unknown; value?: unknown },
  issues: CatalogConformanceIssue[],
): void {
  const { operator, value } = operatorHolder;
  if (operator !== "equals" && operator !== "present" && operator !== "absent") {
    issues.push({
      resource_type: resourceType,
      path: `${path}.operator`,
      message: `"${String(operator)}" is not "equals", "present", or "absent"`,
    });
    return;
  }

  if (operator === "equals" && typeof value !== "string") {
    issues.push({
      resource_type: resourceType,
      path: `${path}.value`,
      message: '"equals" must carry a string value',
    });
  }
  if (operator !== "equals" && value !== undefined) {
    issues.push({
      resource_type: resourceType,
      path: `${path}.value`,
      message: `"${operator}" must not carry a value`,
    });
  }
}

function validatePlacementSubject(
  resourceType: string,
  path: string,
  subject: unknown,
  issues: CatalogConformanceIssue[],
): void {
  if (!CANONICAL_RESOURCE_IDENTITY_ATTRIBUTES.has(subject as CanonicalResourceIdentityAttribute)) {
    issues.push({
      resource_type: resourceType,
      path,
      message: `"${String(subject)}" is not a canonical Resource Identity attribute reference`,
    });
  }
}

/**
 * Validates one static {@link ResourceDefinition} against every mechanically
 * verifiable Specification v1.2 structural invariant. Returns every violation, in
 * deterministic field-declaration order — never only the first — so a single
 * malformed definition reports every problem at once.
 *
 * Does not, and must not, validate provider-truth concerns (whether AWS documentation
 * is current, whether `uniqueness_scope` is factually correct, whether a provider
 * constraint was omitted): those remain the human/evidence review recorded in
 * docs/architecture/resource-definition-catalog-conformance.md.
 */
export function validateResourceDefinition(
  definition: ResourceDefinition,
): ReadonlyArray<CatalogConformanceIssue> {
  const resourceType = definition.resource_type;
  const issues: CatalogConformanceIssue[] = [];

  if (!isNonEmptyString(definition.resource_type)) {
    issues.push({
      resource_type: String(resourceType),
      path: "resource_type",
      message: "must not be empty",
    });
  }
  if (!isNonEmptyString(definition.platform)) {
    issues.push({
      resource_type: String(resourceType),
      path: "platform",
      message: "must not be empty",
    });
  }
  if (definition.category !== undefined && !isNonEmptyString(definition.category)) {
    issues.push({
      resource_type: String(resourceType),
      path: "category",
      message: "must not be empty when declared",
    });
  }

  const identity = definition.identity_constraints;
  if (identity?.unique === true && !isNonEmptyString(identity.uniqueness_scope)) {
    issues.push({
      resource_type: String(resourceType),
      path: "identity_constraints.uniqueness_scope",
      message: "must be declared, and non-empty, whenever unique is true",
    });
  }

  const rendering = definition.rendering_constraints;
  if (rendering !== undefined) {
    const hasMinLength = rendering.min_length !== undefined;
    const hasMaxLength = rendering.max_length !== undefined;
    const hasLengthUnit = rendering.length_unit !== undefined;

    const validMinLength = hasMinLength && isNonNegativeInteger(rendering.min_length);
    const validMaxLength = hasMaxLength && isNonNegativeFiniteNumber(rendering.max_length);

    if (hasMinLength && !validMinLength) {
      issues.push({
        resource_type: String(resourceType),
        path: "rendering_constraints.min_length",
        message: "must be a non-negative integer",
      });
    }
    if (hasMaxLength && !validMaxLength) {
      issues.push({
        resource_type: String(resourceType),
        path: "rendering_constraints.max_length",
        message: "must be a non-negative finite number",
      });
    }
    if ((hasMinLength || hasMaxLength) && !hasLengthUnit) {
      issues.push({
        resource_type: String(resourceType),
        path: "rendering_constraints.length_unit",
        message: "must be declared whenever min_length or max_length is declared",
      });
    }
    if (hasLengthUnit && !LENGTH_UNITS.has(rendering.length_unit as ResourceNameLengthUnit)) {
      issues.push({
        resource_type: String(resourceType),
        path: "rendering_constraints.length_unit",
        message: `"${String(rendering.length_unit)}" is not "code_points" or "utf8_bytes"`,
      });
    }
    if (
      validMinLength &&
      validMaxLength &&
      (rendering.min_length as number) > (rendering.max_length as number)
    ) {
      issues.push({
        resource_type: String(resourceType),
        path: "rendering_constraints.min_length",
        message: "must not exceed max_length",
      });
    }

    validateCharacterSet(
      String(resourceType),
      "rendering_constraints.character_constraints",
      rendering.character_constraints,
      issues,
    );
    validateCharacterSet(
      String(resourceType),
      "rendering_constraints.starts_with",
      rendering.starts_with,
      issues,
    );
    validateCharacterSet(
      String(resourceType),
      "rendering_constraints.ends_with",
      rendering.ends_with,
      issues,
    );
    validateStringList(
      String(resourceType),
      "rendering_constraints.forbidden_prefixes",
      rendering.forbidden_prefixes,
      issues,
    );
    validateStringList(
      String(resourceType),
      "rendering_constraints.forbidden_suffixes",
      rendering.forbidden_suffixes,
      issues,
    );
  }

  for (const [index, constraint] of (definition.placement_constraints ?? []).entries()) {
    const entryPath = `placement_constraints[${index}]`;
    if (!isNonEmptyString(constraint.statement)) {
      issues.push({
        resource_type: String(resourceType),
        path: `${entryPath}.statement`,
        message: "must not be empty",
      });
    }

    const rule = constraint.rule;
    if (rule === undefined) {
      continue;
    }
    validatePlacementSubject(
      String(resourceType),
      `${entryPath}.rule.subject`,
      rule.subject,
      issues,
    );
    validatePlacementOperator(String(resourceType), `${entryPath}.rule`, rule, issues);

    const condition = rule.condition;
    if (condition !== undefined) {
      validatePlacementSubject(
        String(resourceType),
        `${entryPath}.rule.condition.subject`,
        condition.subject,
        issues,
      );
      validatePlacementOperator(
        String(resourceType),
        `${entryPath}.rule.condition`,
        condition,
        issues,
      );
    }
  }

  return issues;
}

/**
 * Validates registration-level catalog invariants across `entries` — each entry's own
 * registered `key` alongside its `definition` — then every structural invariant
 * {@link validateResourceDefinition} checks for that definition. `entries` is an
 * array, not a `Record`, precisely so a duplicate `resource_type` across two entries
 * is representable and detectable: once two definitions collapse into the same object
 * key, the collision has already silently occurred and can no longer be observed from
 * the built map alone. Issues are returned in deterministic array order — `entries`'
 * own order, then each definition's own field-declaration order.
 */
export function validateCatalogEntries(
  entries: ReadonlyArray<{ readonly key: string; readonly definition: ResourceDefinition }>,
): ReadonlyArray<CatalogConformanceIssue> {
  const issues: CatalogConformanceIssue[] = [];
  const seenResourceTypes = new Set<string>();

  for (const { key, definition } of entries) {
    if (key !== definition.resource_type) {
      issues.push({
        resource_type: String(definition.resource_type),
        path: "resource_type",
        message: `catalog key "${key}" must equal definition.resource_type`,
      });
    }
    if (seenResourceTypes.has(definition.resource_type)) {
      issues.push({
        resource_type: String(definition.resource_type),
        path: "resource_type",
        message: `duplicate resource_type "${definition.resource_type}" registered more than once`,
      });
    }
    seenResourceTypes.add(definition.resource_type);

    issues.push(...validateResourceDefinition(definition));
  }

  return issues;
}
