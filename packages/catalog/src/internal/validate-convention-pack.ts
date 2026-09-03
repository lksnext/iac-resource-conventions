// Internal-only catalog conformance validator for executable Convention Packs
// (Milestone 4.2). Not part of the package's public API (see
// packages/catalog/src/index.ts, the package's single public entry point).
//
// Mirrors `validate-resource-definition.ts`'s principle: an executable, built-in
// Convention Pack shipped by this catalog should itself be Specification-valid, so
// static catalog conformance rejects a malformed pack definition before publication
// (see docs/architecture/convention-pack-catalog.md#conformance). This does not
// replace or narrow Convention Evaluation's own defensive validation — an external
// caller may still supply a Convention Pack directly to `evaluate()`, so `evaluate()`
// keeps rejecting a duplicate `naming_component_order` reference (and any other
// malformed pack state) on its own, regardless of this validator.
//
// This checks only invariants defined by the Specification (see
// specification/convention-pack.md#naming-projections and
// specification/convention-pack.md#override-policy) that TypeScript's own types cannot
// already guarantee for hand-written catalog source — a duplicate reference, a
// reference outside the closed canonical vocabulary, an unrecognized Evaluation
// Context source, and catalog registration identity. It is not a general-purpose
// runtime schema validator for arbitrary unknown JSON.

import type {
  CanonicalResourceIdentityAttribute,
  ConventionPack,
  EvaluationContextSource,
} from "@lksnext/iac-conventions-core";
import { CANONICAL_RESOURCE_IDENTITY_ATTRIBUTES } from "./canonical-attributes.js";
/**
 * One static ConventionPack conformance problem. `convention_pack_id` identifies which
 * catalog entry the issue belongs to (the entry's own declared `id`, not necessarily
 * its registered catalog key — see {@link validateCatalogConventionPackEntries}, which
 * checks that separately); `path` is a dotted/indexed field path within that pack;
 * `message` is a human-readable explanation.
 */
export interface CatalogConventionPackIssue {
  readonly convention_pack_id: string;
  readonly path: string;
  readonly message: string;
}

/**
 * The closed `casing` vocabulary (Specification v1.1; see
 * specification/convention-pack.md#casing), duplicated here as a runtime set for the
 * same reason as {@link CANONICAL_RESOURCE_IDENTITY_ATTRIBUTES}: `NamingCasing`
 * (core) is a compile-time-only literal union.
 */
const NAMING_CASINGS = new Set(["preserve", "lower", "upper"]);

/**
 * The closed Evaluation Context source vocabulary (see
 * specification/context-resolution.md), duplicated here as a runtime set for the same
 * reason as {@link CANONICAL_RESOURCE_IDENTITY_ATTRIBUTES}: `EvaluationContextSource`
 * (core) is a compile-time-only literal union.
 */
const EVALUATION_CONTEXT_SOURCES: ReadonlySet<EvaluationContextSource> = new Set([
  "shared-organizational-context",
  "shared-deployment-context",
  "runtime-context",
  "provisioning-context",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function validateStringList(
  packId: string,
  path: string,
  values: ReadonlyArray<string> | undefined,
  issues: CatalogConventionPackIssue[],
): void {
  for (const [index, value] of (values ?? []).entries()) {
    if (!isNonEmptyString(value)) {
      issues.push({
        convention_pack_id: packId,
        path: `${path}[${index}]`,
        message: "must not be empty",
      });
    }
  }
}

/**
 * Validates one static {@link ConventionPack} against every mechanically verifiable
 * Specification invariant. Returns every violation, in deterministic
 * field-declaration order — never only the first.
 *
 * Does not, and must not, validate organizational-policy truth (whether the pack's
 * required attributes actually match an organization's real requirements, whether an
 * abbreviation is the "right" one): those are policy review concerns, not structural
 * conformance.
 */
export function validateConventionPack(
  pack: ConventionPack,
): ReadonlyArray<CatalogConventionPackIssue> {
  const packId = pack.id;
  const issues: CatalogConventionPackIssue[] = [];

  if (!isNonEmptyString(pack.id)) {
    issues.push({ convention_pack_id: String(packId), path: "id", message: "must not be empty" });
  }

  const seenNamingReferences = new Set<string>();
  for (const [index, reference] of (pack.naming_component_order ?? []).entries()) {
    const path = `naming_component_order[${index}]`;
    if (!CANONICAL_RESOURCE_IDENTITY_ATTRIBUTES.has(reference)) {
      issues.push({
        convention_pack_id: String(packId),
        path,
        message: `"${reference}" is not a canonical Resource Identity attribute reference`,
      });
    } else if (seenNamingReferences.has(reference)) {
      issues.push({
        convention_pack_id: String(packId),
        path,
        message: `"${reference}" is referenced more than once`,
      });
    } else {
      seenNamingReferences.add(reference);
    }
  }

  if (pack.casing !== undefined && !NAMING_CASINGS.has(pack.casing)) {
    issues.push({
      convention_pack_id: String(packId),
      path: "casing",
      message: `"${String(pack.casing)}" is not "preserve", "lower", or "upper"`,
    });
  }

  for (const [attribute, mapping] of Object.entries(pack.abbreviations ?? {})) {
    const path = `abbreviations.${attribute}`;
    if (
      !CANONICAL_RESOURCE_IDENTITY_ATTRIBUTES.has(attribute as CanonicalResourceIdentityAttribute)
    ) {
      issues.push({
        convention_pack_id: String(packId),
        path,
        message: `"${attribute}" is not a canonical Resource Identity attribute reference`,
      });
      continue;
    }
    for (const [value, abbreviation] of Object.entries(mapping ?? {})) {
      if (!isNonEmptyString(abbreviation)) {
        issues.push({
          convention_pack_id: String(packId),
          path: `${path}.${value}`,
          message: "must be a non-empty string",
        });
      }
    }
  }

  for (const [attribute, source] of Object.entries(pack.context_authority_rules ?? {})) {
    if (!EVALUATION_CONTEXT_SOURCES.has(source)) {
      issues.push({
        convention_pack_id: String(packId),
        path: `context_authority_rules.${attribute}`,
        message: `"${String(source)}" is not a recognized Evaluation Context source`,
      });
    }
  }

  validateStringList(String(packId), "required_attributes", pack.required_attributes, issues);

  const overridePolicy = pack.override_policy;
  if (overridePolicy !== undefined) {
    validateStringList(
      String(packId),
      "override_policy.overridable_attributes",
      overridePolicy.overridable_attributes,
      issues,
    );
    validateStringList(
      String(packId),
      "override_policy.protected_attributes",
      overridePolicy.protected_attributes,
      issues,
    );

    const protectedAttributes = new Set(overridePolicy.protected_attributes ?? []);
    for (const attribute of overridePolicy.overridable_attributes ?? []) {
      if (protectedAttributes.has(attribute)) {
        issues.push({
          convention_pack_id: String(packId),
          path: "override_policy",
          message: `"${attribute}" cannot be both overridable and protected`,
        });
      }
    }
  }

  return issues;
}

/**
 * Validates registration-level catalog invariants across `entries` — each entry's own
 * registered `key` alongside its `pack` — then every structural invariant
 * {@link validateConventionPack} checks for that pack. `entries` is an array, not a
 * `Record`, for the same representability reason as
 * `validate-resource-definition.ts`'s `validateCatalogEntries`: a duplicate `id`
 * across two entries would otherwise already have silently collapsed into one object
 * key before it could be observed.
 */
export function validateCatalogConventionPackEntries(
  entries: ReadonlyArray<{ readonly key: string; readonly pack: ConventionPack }>,
): ReadonlyArray<CatalogConventionPackIssue> {
  const issues: CatalogConventionPackIssue[] = [];
  const seenIds = new Set<string>();

  for (const { key, pack } of entries) {
    if (key !== pack.id) {
      issues.push({
        convention_pack_id: String(pack.id),
        path: "id",
        message: `catalog key "${key}" must equal pack.id`,
      });
    }
    if (seenIds.has(pack.id)) {
      issues.push({
        convention_pack_id: String(pack.id),
        path: "id",
        message: `duplicate id "${pack.id}" registered more than once`,
      });
    }
    seenIds.add(pack.id);

    issues.push(...validateConventionPack(pack));
  }

  return issues;
}
