/**
 * A single diagnostic recorded while resolving Resource Identity.
 *
 * Distinguishes the two Context-Resolution-specific outcomes the Specification
 * describes as expected, not exceptional (see
 * `specification/context-resolution.md#precedence-authority-and-protection` and
 * `specification/convention-pack.md#required-attributes`): a Naming Request or
 * override value that tried to replace a protected attribute could not be applied, or
 * an attribute the selected Convention Pack requires could not be resolved from any
 * source.
 *
 * This is intentionally a distinct type from `ConventionValidation` and
 * `ConventionValidationFailure` (see `../../model/results/convention-result.ts`): those
 * describe Convention Evaluation's validation of generated outputs against a Resource
 * Definition and the Specification, which has not run yet when Resource Identity is
 * resolved — reusing them here would misrepresent when and against what the diagnostic
 * was produced (see
 * `docs/architecture/reference-evaluator.md#validation-and-diagnostics`).
 */
export interface ContextResolutionDiagnostic {
  /**
   * Which kind of expected resolution outcome this diagnostic represents. Distinct
   * from a source simply not supplying a value, which produces no diagnostic at all.
   */
  readonly kind: "protected-value-conflict" | "unresolved-required-attribute";

  /**
   * The dotted Resource Identity attribute path this diagnostic concerns (for
   * example, `deployment.deployment_scope`), consistent with how the selected
   * Convention Pack itself names attributes in `required_attributes` and
   * `override_policy` (see `../../model/conventions/convention-pack.ts`).
   */
  readonly attribute: string;

  /** A human-readable description of the outcome. */
  readonly message: string;
}
