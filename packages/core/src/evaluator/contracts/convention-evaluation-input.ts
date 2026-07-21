import type { ConventionPack, ResourceDefinition } from "../../model/index.js";
import type { ContextResolutionResult } from "./context-resolution-result.js";

/**
 * The complete set of inputs Convention Evaluation consumes to produce a
 * `ConventionResult` (see `../../model/results/convention-result.ts`).
 *
 * The Specification's Convention Evaluation pipeline evaluates "the Specification's
 * naming, tagging, labeling, and annotation conventions, as configured by the selected
 * Convention Pack, to the resolved models" alongside the resource's selected Resource
 * Definition (see `specification/convention-result.md#convention-evaluation-pipeline`,
 * steps 4–5). This contract names that combined boundary explicitly: Convention
 * Evaluation is the second of the Specification's exactly two processing stages (see
 * `specification/README.md#architecture`), and it depends on the completed
 * {@link ContextResolutionResult} together with the selected Resource Definition and
 * Convention Pack, not on any one of them alone.
 *
 * `resource_definition` is accepted as an already-selected value: Resource Definition
 * selection is a lookup by `resource_type`, not a resolution performed by Context
 * Resolution or Convention Evaluation itself (see
 * `specification/context-resolution.md#what-context-resolution-produces`), and `core`
 * never performs that lookup itself (see
 * `docs/architecture/reference-evaluator.md#non-responsibilities`).
 *
 * Every field is required: Convention Evaluation cannot proceed without all three.
 *
 * This is an internal evaluator contract, not part of the package's public API (see
 * `docs/architecture/reference-evaluator.md#public-api-principles`).
 */
export interface ConventionEvaluationInput {
  /** The completed Context Resolution result this evaluation projects and validates. */
  readonly resolved_context: ContextResolutionResult;

  /** The Resource Definition selected for the resolved `resource_type`. */
  readonly resource_definition: ResourceDefinition;

  /** The Convention Pack whose naming, metadata, and validation policy apply. */
  readonly convention_pack: ConventionPack;
}
