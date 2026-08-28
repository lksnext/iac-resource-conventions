import type {
  ConventionOutputs,
  ConventionPack,
  ConventionResult,
  ConventionValidation,
  ConventionValidationFailure,
  ResourceDefinition,
  ResourceNameLengthUnit,
} from "../../model/index.js";
import type { ContextResolutionResult } from "../contracts/context-resolution-result.js";
import type { ConventionEvaluationInput } from "../contracts/convention-evaluation-input.js";
import { projectResource } from "../resource-projection/index.js";
import { evaluateName } from "./naming/index.js";

type RequiredAttributeAccessor = (context: ContextResolutionResult) => string | undefined;

/**
 * Every Resource Identity and Governance Context attribute this increment knows how to
 * resolve, keyed by the same dotted attribute path convention
 * `ConventionPack.required_attributes` uses (see
 * `../../model/conventions/convention-pack.ts`). A `required_attributes` entry outside
 * this table refers to no known attribute, so it can never resolve to a value; it is
 * therefore always treated as unresolved — the same honest "no value found" outcome an
 * unrecognized path and a genuinely absent value both produce, with nothing fabricated
 * for either case.
 */
const REQUIRED_ATTRIBUTE_ACCESSORS: Readonly<Record<string, RequiredAttributeAccessor>> = {
  "organizational.organization": (c) => c.resource_identity.organizational?.organization,
  "organizational.business_unit": (c) => c.resource_identity.organizational?.business_unit,
  "organizational.system": (c) => c.resource_identity.organizational?.system,
  "organizational.tenant": (c) => c.resource_identity.organizational?.tenant,
  "deployment.platform": (c) => c.resource_identity.deployment?.platform,
  "deployment.deployment_scope": (c) => c.resource_identity.deployment?.deployment_scope,
  "deployment.environment": (c) => c.resource_identity.deployment?.environment,
  "deployment.location": (c) => c.resource_identity.deployment?.location,
  "deployment.instance": (c) => c.resource_identity.deployment?.instance,
  "functional.service": (c) => c.resource_identity.functional?.service,
  "functional.component": (c) => c.resource_identity.functional?.component,
  "functional.resource_type": (c) => c.resource_identity.functional?.resource_type,
  "governance.owner": (c) => c.governance_context.owner,
  "governance.managed_by": (c) => c.governance_context.managed_by,
  "governance.cost_center": (c) => c.governance_context.cost_center,
  "governance.profile": (c) => c.governance_context.profile,
};

function resolveRequiredAttributeValue(
  context: ContextResolutionResult,
  attribute: string,
): string | undefined {
  return REQUIRED_ATTRIBUTE_ACCESSORS[attribute]?.(context);
}

/**
 * Finds every canonical attribute reference that `naming_component_order` lists more
 * than once, per `specification/convention-pack.md#naming-projections` ("A reference
 * listed more than once is invalid."). Each duplicated reference is reported exactly
 * once, in the order its second occurrence is encountered while scanning `order`
 * left-to-right, so the result — and therefore every `ConventionValidationFailure`
 * derived from it — is deterministic for a given `order`.
 */
function findDuplicateNamingComponentOrderReferences(
  order: ReadonlyArray<string>,
): ReadonlyArray<string> {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const attribute of order) {
    if (seen.has(attribute)) {
      if (!duplicates.includes(attribute)) {
        duplicates.push(attribute);
      }
      continue;
    }
    seen.add(attribute);
  }

  return duplicates;
}

function explain(
  conventionPack: ConventionPack,
  requiredAttributes: ReadonlyArray<string>,
  missing: ReadonlyArray<string>,
  duplicateNamingReferences: ReadonlyArray<string>,
  maxLengthFailure: ConventionValidationFailure | undefined,
): string {
  const requiredAttributesSummary =
    requiredAttributes.length === 0
      ? `Convention pack "${conventionPack.id}" declares no required attributes.`
      : missing.length === 0
        ? `All ${requiredAttributes.length} required attribute(s) declared by convention pack "${conventionPack.id}" were resolved.`
        : `${missing.length} of ${requiredAttributes.length} required attribute(s) declared by ` +
          `convention pack "${conventionPack.id}" could not be resolved: ${missing.join(", ")}.`;

  const duplicateNamingReferencesSummary =
    duplicateNamingReferences.length === 0
      ? ""
      : ` The naming_component_order declared by convention pack "${conventionPack.id}" lists ` +
        `the following canonical attribute reference(s) more than once, so no name was ` +
        `generated: ${duplicateNamingReferences.join(", ")}.`;

  const maxLengthSummary = maxLengthFailure === undefined ? "" : ` ${maxLengthFailure.message}.`;

  return `${requiredAttributesSummary}${duplicateNamingReferencesSummary}${maxLengthSummary}`;
}

/**
 * Measures `value` according to the Resource Definition's own declared
 * {@link ResourceNameLengthUnit} (see
 * `../../model/definitions/resource-name-length-unit.ts` and
 * `specification/resource-definition.md#rendering-constraints`):
 *
 * - `code_points` — the number of Unicode code points, computed with the spread
 *   operator (`[...value].length`), which iterates by code point and correctly
 *   accounts for surrogate pairs — unlike JavaScript's native UTF-16-code-unit
 *   `String.prototype.length`.
 * - `utf8_bytes` — the number of bytes in `value`'s UTF-8 encoding, computed with a
 *   pure ECMAScript code-point iteration (`for...of` iterates a string by code point):
 *   each code point contributes 1 byte (U+0000–U+007F), 2 bytes (U+0080–U+07FF), 3
 *   bytes (U+0800–U+FFFF), or 4 bytes (U+10000–U+10FFFF), per the standard UTF-8
 *   encoding rule — the same byte count Node's `Buffer.byteLength(value, "utf8")`
 *   produces, without depending on Node's ambient type declarations (`Buffer` itself
 *   is not usable here without adding `@types/node`, which this increment must not
 *   add).
 *
 * Pure and deterministic: the same `value` and `unit` always produce the same result.
 */
function measureLength(value: string, unit: ResourceNameLengthUnit): number {
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

/**
 * Validates a generated name against the resource's Resource Definition `max_length`
 * (see `specification/convention-pack.md#naming-rule-examples`, "Validation without
 * truncation"): a generated name that exceeds `max_length` is reported as a validation
 * failure, and the generated name itself is left exactly as produced — never
 * truncated, never omitted.
 *
 * Only applies when a name was actually generated (`name !== undefined`) and the
 * Resource Definition actually declares a `max_length` (see
 * `../../model/definitions/resource-definition.ts`); a Convention Pack whose naming is
 * otherwise invalid (no name generated) has nothing to measure, and a Resource
 * Definition with no `max_length` imposes no constraint to violate.
 *
 * Length is measured with {@link measureLength}, according to the Resource
 * Definition's own declared `length_unit` — never an evaluator-chosen default.
 * `ResourceRenderingConstraints` requires `length_unit` whenever `max_length` is
 * declared (see `../../model/definitions/resource-definition.ts`), so this function
 * never makes an independent length-unit choice; the same generated name can satisfy
 * one Resource Definition and violate another solely because their declared
 * `length_unit` differs.
 *
 * This invariant is enforced at compile time for TypeScript callers, but a
 * `ResourceDefinition` can also arrive from an untyped source (for example, parsed
 * JSON). If `max_length` is declared without a recognized `length_unit`, length cannot
 * be measured deterministically; this is reported as its own validation failure,
 * distinct from a `max_length` violation, rather than silently defaulting to a unit
 * or silently passing.
 */
function maxLengthFailure(
  name: string | undefined,
  resourceDefinition: ResourceDefinition,
): ConventionValidationFailure | undefined {
  const constraints = resourceDefinition.rendering_constraints;
  if (name === undefined || constraints === undefined || constraints.max_length === undefined) {
    return undefined;
  }

  const unit: string | undefined = constraints.length_unit;
  if (unit !== "code_points" && unit !== "utf8_bytes") {
    return {
      message:
        "Resource Definition declares max_length without a recognized length_unit " +
        '("code_points" or "utf8_bytes"); length cannot be measured deterministically.',
    };
  }

  const length = measureLength(name, unit);
  if (length <= constraints.max_length) {
    return undefined;
  }

  return { message: `name exceeds max_length of ${constraints.max_length} characters` };
}

/**
 * Applies the Convention Evaluation rules that are actually executable against the
 * current frozen Specification and the current Executable Domain Model, and assembles
 * the resulting `ConventionResult` (see `specification/convention-result.md`).
 *
 * **Implemented rule: required-attribute completeness.** `specification/convention-
 * pack.md#required-attributes` states that a Convention Pack's `required_attributes`
 * "must be available before Convention Evaluation can proceed." This function checks
 * every declared required attribute against the resolved `ContextResolutionResult` and
 * reports each unresolved one as a `ConventionValidationFailure`. This is independent of
 * — not a duplicate of — Context Resolution's own `unresolved-required-attribute`
 * diagnostics (see `../context-resolution/diagnostics.ts`): `ContextResolutionResult`
 * does not carry those diagnostics forward (it has only `resource_identity` and
 * `governance_context`), so Convention Evaluation re-checks completeness itself, at its
 * own pipeline stage, producing its own `ConventionResult`-shaped outcome rather than
 * reusing a diagnostic type documented as specific to Context Resolution (see
 * `../context-resolution/diagnostics.ts`).
 *
 * Per `specification/convention-result.md#convention-evaluation-pipeline`, "Produce
 * Convention Result" is reached even when validation fails: this function never throws
 * for a missing required attribute, it reports `validation.valid: false` instead (see
 * `docs/architecture/reference-evaluator.md#validation-and-diagnostics`). This resolves
 * the deferred question recorded in
 * `docs/architecture/reference-evaluator.md#deferred-decisions` ("Required-but-
 * unresolvable attribute handling"): a `ConventionResult` is still produced, with
 * `validation.valid: false`.
 *
 * **Implemented rule: executable naming (Specification v1.1).** `projectResource` (see
 * `../resource-projection/index.js`) orders and resolves naming components, then
 * `evaluateName` (see `./naming/index.js`) applies abbreviation, casing, and separator
 * joining to produce `outputs.name`, per
 * `specification/convention-pack.md#naming-projections`. `outputs.name` is left
 * `undefined` when the Convention Pack declares no naming components, or when a
 * declared required naming component has no resolved value.
 *
 * **Implemented rule: duplicate naming component order rejection (Specification
 * v1.1).** `specification/convention-pack.md#naming-projections` states "A reference
 * listed more than once is invalid." `findDuplicateNamingComponentOrderReferences`
 * detects every canonical attribute reference `naming_component_order` declares more
 * than once. When any are found, `projectResource` and `evaluateName` are never
 * invoked — so the same canonical attribute is never projected twice into
 * `outputs.name` — and each duplicated reference is reported as its own
 * `ConventionValidationFailure`, alongside any unresolved required attributes.
 *
 * **Implemented rule: `max_length` validation, without truncation (Specification
 * v1.1).** `specification/convention-pack.md#naming-rule-examples` ("Validation
 * without truncation") normatively requires that a generated name exceeding the
 * resource's Resource Definition `max_length` be reported as a validation failure,
 * with the generated name retained exactly as produced — never truncated, never
 * omitted. `maxLengthFailure` implements this, measuring length according to the
 * Resource Definition's own declared `length_unit` (see {@link measureLength}); it
 * only applies when a name was actually generated and the Resource Definition
 * declares a `max_length`.
 *
 * **Deliberately not implemented — the current frozen Specification and Executable
 * Domain Model do not yet define the concrete rule, only its concept in prose (see
 * `docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented`
 * for the full inventory and Specification citations):**
 * - normalization (`ResourceDefinition.rendering_constraints.normalization` is free
 *   text, not a machine-executable rule);
 * - truncation and hashing (no field or normative rule defines either anywhere in the
 *   Specification or domain model);
 * - metadata projection — Tags, Labels, Annotations (`ConventionPack` has no metadata
 *   projection mapping field at all; see `../../model/conventions/convention-pack.ts`);
 * - Resource Definition technical-constraint validation (`allowed_characters`) — free
 *   text, not a defined grammar; a string must not be assumed to be a regular
 *   expression;
 * - Placement Constraint validation — `ResourceDefinition.placement_constraints` is a
 *   `ReadonlyArray<string>` of free-form descriptive statements, since the
 *   Specification defines no formal grammar for them yet;
 * - collision handling — `ResourceDefinition.identity_constraints` describes whether
 *   uniqueness is required, but proving it requires knowledge external to the
 *   evaluator (a registry), which this function must not consult.
 *
 * Consequently `outputs.metadata` is always absent in this increment. `warnings` is
 * never populated, since every currently-implementable warning-worthy transformation
 * (truncation, normalization) is itself unimplemented.
 *
 * Pure and deterministic: the same `input` always produces a structurally equivalent
 * `ConventionResult`; `input` (and everything it references) is never mutated.
 */
export function evaluateConvention(input: ConventionEvaluationInput): ConventionResult {
  const {
    resolved_context: resolvedContext,
    convention_pack: conventionPack,
    resource_definition: resourceDefinition,
  } = input;
  const requiredAttributes = conventionPack.required_attributes ?? [];
  const namingComponentOrder = conventionPack.naming_component_order ?? [];
  const duplicateNamingReferences =
    findDuplicateNamingComponentOrderReferences(namingComponentOrder);

  const name =
    duplicateNamingReferences.length === 0
      ? evaluateName(
          projectResource(resolvedContext.resource_identity, conventionPack),
          conventionPack,
        )
      : undefined;

  const missing = requiredAttributes.filter(
    (attribute) => resolveRequiredAttributeValue(resolvedContext, attribute) === undefined,
  );

  const nameLengthFailure = maxLengthFailure(name, resourceDefinition);

  const failures: ConventionValidationFailure[] = [
    ...missing.map(
      (attribute): ConventionValidationFailure => ({
        message: `Required attribute "${attribute}" declared by convention pack "${conventionPack.id}" has no resolved value.`,
      }),
    ),
    ...duplicateNamingReferences.map(
      (attribute): ConventionValidationFailure => ({
        message: `naming_component_order declared by convention pack "${conventionPack.id}" lists canonical attribute reference "${attribute}" more than once.`,
      }),
    ),
    ...(nameLengthFailure === undefined ? [] : [nameLengthFailure]),
  ];

  const validation: ConventionValidation =
    failures.length === 0 ? { valid: true } : { valid: false, failures };

  const outputs: ConventionOutputs = name === undefined ? {} : { name };

  return {
    resource_identity: resolvedContext.resource_identity,
    governance_context: resolvedContext.governance_context,
    outputs,
    validation,
    explanation: explain(
      conventionPack,
      requiredAttributes,
      missing,
      duplicateNamingReferences,
      nameLengthFailure,
    ),
  };
}
