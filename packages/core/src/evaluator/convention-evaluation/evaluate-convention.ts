import type {
  ConventionOutputs,
  ConventionPack,
  ConventionResult,
  ConventionValidation,
  ConventionValidationFailure,
} from "../../model/index.js";
import type { ContextResolutionResult } from "../contracts/context-resolution-result.js";
import type { ConventionEvaluationInput } from "../contracts/convention-evaluation-input.js";

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

function explain(
  conventionPack: ConventionPack,
  requiredAttributes: ReadonlyArray<string>,
  missing: ReadonlyArray<string>,
): string {
  if (requiredAttributes.length === 0) {
    return `Convention pack "${conventionPack.id}" declares no required attributes.`;
  }
  if (missing.length === 0) {
    return `All ${requiredAttributes.length} required attribute(s) declared by convention pack "${conventionPack.id}" were resolved.`;
  }
  return (
    `${missing.length} of ${requiredAttributes.length} required attribute(s) declared by ` +
    `convention pack "${conventionPack.id}" could not be resolved: ${missing.join(", ")}.`
  );
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
 * **Deliberately not implemented, all for the same reason — the current frozen
 * Specification and Executable Domain Model do not yet define the concrete rule, only
 * its concept in prose (see
 * `docs/architecture/reference-evaluator.md#convention-evaluation-rules-implemented`
 * for the full inventory and Specification citations):**
 * - naming rendering (component ordering is already projected by `projectResource`, see
 *   `../resource-projection/index.js`, but joining components into a final name needs a
 *   separator, casing rule, and abbreviation-substitution semantics that no Convention
 *   Pack field or Specification document defines);
 * - abbreviation application (`ConventionPack.abbreviations` exists, but the
 *   Specification never defines what text an abbreviation replaces — a component's
 *   resolved value, a positional label, or something else);
 * - normalization (`ResourceDefinition.rendering_constraints.normalization` is free
 *   text, not a machine-executable rule);
 * - separators, casing, truncation, and hashing (no field or normative rule defines any
 *   of these anywhere in the Specification or domain model);
 * - metadata projection — Tags, Labels, Annotations (`ConventionPack` has no metadata
 *   projection mapping field at all; see `../../model/conventions/convention-pack.ts`);
 * - Resource Definition technical-constraint validation (`max_length`,
 *   `allowed_characters`) — these constrain a generated name, which this increment
 *   cannot produce;
 * - Placement Constraint validation — `ResourceDefinition.placement_constraints` is a
 *   `ReadonlyArray<string>` of free-form descriptive statements, since the
 *   Specification defines no formal grammar for them yet;
 * - collision handling — `ResourceDefinition.identity_constraints` describes whether
 *   uniqueness is required, but proving it requires knowledge external to the
 *   evaluator (a registry), which this function must not consult.
 *
 * Consequently `outputs` is always `{}` in this increment: no `name` and no `metadata`
 * are generated. `warnings` is never populated, since every currently-implementable
 * warning-worthy transformation (truncation, normalization) is itself unimplemented.
 *
 * Pure and deterministic: the same `input` always produces a structurally equivalent
 * `ConventionResult`; `input` (and everything it references) is never mutated.
 */
export function evaluateConvention(input: ConventionEvaluationInput): ConventionResult {
  const { resolved_context: resolvedContext, convention_pack: conventionPack } = input;
  const requiredAttributes = conventionPack.required_attributes ?? [];

  const missing = requiredAttributes.filter(
    (attribute) => resolveRequiredAttributeValue(resolvedContext, attribute) === undefined,
  );

  const validation: ConventionValidation =
    missing.length === 0
      ? { valid: true }
      : {
          valid: false,
          failures: missing.map(
            (attribute): ConventionValidationFailure => ({
              message: `Required attribute "${attribute}" declared by convention pack "${conventionPack.id}" has no resolved value.`,
            }),
          ),
        };

  const outputs: ConventionOutputs = {};

  return {
    resource_identity: resolvedContext.resource_identity,
    governance_context: resolvedContext.governance_context,
    outputs,
    validation,
    explanation: explain(conventionPack, requiredAttributes, missing),
  };
}
