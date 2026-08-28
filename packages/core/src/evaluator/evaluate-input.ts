import type {
  ConventionPack,
  EvaluationContext,
  NamingRequest,
  ResourceDefinition,
} from "../model/index.js";

/**
 * The aggregate input to the public {@link evaluate} function (Milestone 2.7: Reference
 * Evaluator API).
 *
 * The Specification describes Context Resolution and Convention Evaluation as a
 * conceptual, logical pipeline and explicitly leaves the concrete public function
 * signature undecided (see
 * `specification/convention-result.md#convention-evaluation-pipeline`,
 * and `docs/architecture/reference-evaluator.md#inputs-and-outputs`, which recorded
 * two faithful shapes: one aggregate input object, or four explicit parameters).
 * `EvaluateInput` resolves that choice in favor of a single aggregate object: it
 * groups the same four inputs shown in the canonical pipeline diagram
 * (`specification/README.md#architecture`) — a `NamingRequest`, the selected
 * `ConventionPack`, the `EvaluationContext`, and the already-selected
 * `ResourceDefinition` — without introducing any new field or attribute of its own.
 * Every field reuses an existing domain contract from `../model/index.js` verbatim;
 * `EvaluateInput` composes the Executable Domain Model, it does not extend it.
 *
 * A single object was preferred over four positional parameters because `evaluate`'s
 * four inputs share no natural ordering the Specification itself imposes (unlike, for
 * example, resolution precedence, which does have a defined order — see
 * `specification/context-resolution.md#resolution-precedence`); an aggregate object
 * keeps call sites self-describing and additive (a future optional input can be added
 * as a new field without breaking existing call sites), consistent with this
 * repository's compatibility rules (see `AGENTS.md#compatibility-and-versioning`).
 *
 * All four fields are required: `evaluate` cannot orchestrate Context Resolution
 * without a `NamingRequest`, `ConventionPack`, and `EvaluationContext`, and cannot
 * perform Convention Evaluation without a `ResourceDefinition` (see
 * `specification/context-resolution.md#what-context-resolution-produces` — Resource
 * Definition selection is "a lookup, not a resolution", performed by the caller before
 * invoking Convention Evaluation).
 *
 * See `docs/architecture/reference-evaluator.md#reference-evaluator-api-implemented`.
 */
export interface EvaluateInput {
  /** The caller's request for a resource's naming and governance conventions. */
  readonly naming_request: NamingRequest;

  /** The Convention Pack selected to resolve and evaluate the request. */
  readonly convention_pack: ConventionPack;

  /** The external facts available for this evaluation. */
  readonly evaluation_context: EvaluationContext;

  /** The already-selected Resource Definition for the request's resource type. */
  readonly resource_definition: ResourceDefinition;
}
