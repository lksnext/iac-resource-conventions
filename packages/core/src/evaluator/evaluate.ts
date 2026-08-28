import type {
  ConventionResult,
  ConventionValidationFailure,
  ConventionWarning,
} from "../model/index.js";
import type { ContextResolutionDiagnostic } from "./context-resolution/index.js";
import { resolveGovernanceContext, resolveResourceIdentity } from "./context-resolution/index.js";
import type {
  ContextResolutionInput,
  ContextResolutionResult,
  ConventionEvaluationInput,
} from "./contracts/index.js";
import { evaluateConvention } from "./convention-evaluation/index.js";
import type { EvaluateInput } from "./evaluate-input.js";

/**
 * Reduces Context Resolution's own {@link ContextResolutionDiagnostic}s to the subset
 * that would otherwise silently disappear from the final `ConventionResult`.
 *
 * `"unresolved-required-attribute"` diagnostics are deliberately excluded:
 * `evaluateConvention` already re-checks required-attribute completeness directly
 * against the resolved `ContextResolutionResult` (see
 * `../convention-evaluation/evaluate-convention.ts`), so reusing them here would
 * duplicate the same failure under two different result fields (see
 * `docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented`).
 *
 * `"protected-value-conflict"` diagnostics have no equivalent downstream check: no
 * later stage re-derives them, so surfacing nothing here would silently drop a real,
 * caller-visible outcome (the caller's requested value was rejected in favor of an
 * authoritative one). They are non-fatal — resolution still produced a value — so they
 * are mapped to `ConventionResult.warnings`, an existing extension point, rather than a
 * new result type or a `ConventionValidationFailure`.
 */
function toWarnings(
  diagnostics: ReadonlyArray<ContextResolutionDiagnostic>,
): ReadonlyArray<ConventionWarning> | undefined {
  const conflicts = diagnostics.filter(
    (diagnostic) => diagnostic.kind === "protected-value-conflict",
  );
  return conflicts.length === 0
    ? undefined
    : conflicts.map((conflict) => ({
        message: conflict.message,
      }));
}

/**
 * Merges Context Resolution's warnings ({@link toWarnings}) with Convention
 * Evaluation's own `ConventionResult.warnings`, so neither source silently overwrites
 * the other in the composed `ConventionResult` — fixing a conformance gap where the
 * final result previously kept only one source's warnings (see
 * `docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented`).
 *
 * Context Resolution's warnings are ordered first, Convention Evaluation's second,
 * matching the order the two stages actually run in (see
 * `specification/README.md#architecture`). Returns `undefined`, not an empty array,
 * when neither source has any warnings, so `ConventionResult.warnings` continues to be
 * omitted entirely rather than present-but-empty (see `exactOptionalPropertyTypes` in
 * `tsconfig.base.json`).
 *
 * Exported from this module only so it can be unit-tested directly by importing the
 * built `dist/evaluator/evaluate.js` module, the same way
 * `../convention-evaluation/evaluate-convention.ts`'s `evaluateConvention` is tested —
 * not re-exported from the package root (`../index.ts`), so it is not part of the
 * public API (see `docs/architecture/reference-evaluator.md#public-api-principles`).
 * Convention Evaluation has no currently-executable rule that populates
 * `ConventionResult.warnings` yet, so this merge cannot be exercised end-to-end through
 * `evaluate` for its "Convention-Evaluation-only" and "both sources" cases; testing the
 * function directly avoids fabricating a warning-producing rule solely to test it.
 */
export function mergeWarnings(
  contextResolutionWarnings: ReadonlyArray<ConventionWarning> | undefined,
  conventionEvaluationWarnings: ReadonlyArray<ConventionWarning> | undefined,
): ReadonlyArray<ConventionWarning> | undefined {
  if (contextResolutionWarnings === undefined) {
    return conventionEvaluationWarnings;
  }
  if (conventionEvaluationWarnings === undefined) {
    return contextResolutionWarnings;
  }
  return [...contextResolutionWarnings, ...conventionEvaluationWarnings];
}

/**
 * Defensive consistency checks at the public evaluator boundary (see
 * `docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented`),
 * resolving the two identity-boundary questions recorded by [2.6.4's "2.7 readiness
 * and design invariants"](../../../docs/architecture/reference-evaluator.md):
 *
 * - the Naming Request's selected `convention` must match the supplied Convention
 *   Pack's `id`, whenever a `convention` was actually requested;
 * - the resolved `resource_identity.functional.resource_type` must match the supplied
 *   Resource Definition's `resource_type`, whenever a resource type actually resolved.
 *
 * Both checks reuse the existing `ConventionValidationFailure` shape (a human-readable
 * `message` only) — the same shape `evaluateConvention` already uses for
 * required-attribute failures — rather than inventing a new failure category or
 * result field.
 */
function identityBoundaryFailures(
  input: EvaluateInput,
  resolvedContext: ContextResolutionResult,
): ConventionValidationFailure[] {
  const failures: ConventionValidationFailure[] = [];
  const requestedConvention = input.naming_request.convention;

  if (requestedConvention !== undefined && requestedConvention !== input.convention_pack.id) {
    failures.push({
      message:
        `The Naming Request selected convention "${requestedConvention}", but the supplied ` +
        `Convention Pack's id is "${input.convention_pack.id}".`,
    });
  }

  const resolvedResourceType = resolvedContext.resource_identity.functional?.resource_type;
  if (
    resolvedResourceType !== undefined &&
    resolvedResourceType !== input.resource_definition.resource_type
  ) {
    failures.push({
      message:
        `The resolved functional.resource_type "${resolvedResourceType}" does not match the ` +
        `supplied Resource Definition's resource_type "${input.resource_definition.resource_type}".`,
    });
  }

  return failures;
}

/**
 * The public Reference Evaluator API (Milestone 2.7): composes Context Resolution and
 * Convention Evaluation — the Specification's exact two processing stages (see
 * `specification/README.md#architecture`) — into a single, deterministic function.
 *
 * `evaluate` introduces no new processing stage and no new evaluation rule: it
 * orchestrates `resolveResourceIdentity`, `resolveGovernanceContext`, and
 * `evaluateConvention` exactly as increments 2.2, 2.3, and 2.6 already implemented and
 * tested them, plus the two identity-boundary checks recorded as open design
 * invariants by 2.6.4 (see {@link identityBoundaryFailures}), the diagnostics
 * propagation decision described by {@link toWarnings}, and the warning-merge fix
 * described by {@link mergeWarnings}. See
 * `docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented` for
 * the full rationale.
 *
 * Pure and deterministic: the same `input` always produces the same `ConventionResult`;
 * `input` is never mutated. Never throws for an expected evaluation outcome — an
 * identity-boundary mismatch or a Convention Evaluation validation failure is always
 * represented as an invalid `ConventionResult`, never as an exception (see
 * `docs/architecture/reference-evaluator.md#validation-and-diagnostics`).
 */
export function evaluate(input: EvaluateInput): ConventionResult {
  const contextResolutionInput: ContextResolutionInput = {
    naming_request: input.naming_request,
    convention_pack: input.convention_pack,
    evaluation_context: input.evaluation_context,
  };

  const identityResolution = resolveResourceIdentity(contextResolutionInput);
  const governanceResolution = resolveGovernanceContext(contextResolutionInput);

  const resolvedContext: ContextResolutionResult = {
    resource_identity: identityResolution.resource_identity,
    governance_context: governanceResolution.governance_context,
  };

  const warnings = toWarnings([
    ...identityResolution.diagnostics,
    ...governanceResolution.diagnostics,
  ]);

  const boundaryFailures = identityBoundaryFailures(input, resolvedContext);
  if (boundaryFailures.length > 0) {
    return {
      resource_identity: resolvedContext.resource_identity,
      governance_context: resolvedContext.governance_context,
      outputs: {},
      validation: { valid: false, failures: boundaryFailures },
      explanation:
        `Convention Evaluation was not performed: ${boundaryFailures.length} input ` +
        `consistency check(s) failed. ${boundaryFailures.map((failure) => failure.message).join(" ")}`,
      ...(warnings === undefined ? {} : { warnings }),
    };
  }

  const conventionEvaluationInput: ConventionEvaluationInput = {
    resolved_context: resolvedContext,
    resource_definition: input.resource_definition,
    convention_pack: input.convention_pack,
  };

  const result = evaluateConvention(conventionEvaluationInput);

  const mergedWarnings = mergeWarnings(warnings, result.warnings);

  return mergedWarnings === undefined ? result : { ...result, warnings: mergedWarnings };
}
