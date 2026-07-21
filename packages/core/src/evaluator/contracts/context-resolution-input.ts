import type { ConventionPack, EvaluationContext, NamingRequest } from "../../model/index.js";

/**
 * The complete set of inputs Context Resolution consumes to produce a
 * {@link ContextResolutionResult}.
 *
 * The Specification frames these three values as arriving together into one process,
 * not as sequential steps (see `specification/context-resolution.md`'s "Resolution
 * sources" section and the canonical pipeline diagram in
 * `specification/README.md#architecture`, where the Naming Request, Convention Pack,
 * and Evaluation Context all point into Context Resolution). This contract names that
 * combined boundary explicitly, so an implementation of Context Resolution has a
 * single, stable input shape to depend on, distinct from whatever the eventual public
 * evaluator function signature turns out to be — still an open decision (see
 * `docs/architecture/reference-evaluator.md#deferred-decisions`).
 *
 * Every field is required, unlike the individual domain contracts it composes (whose
 * own attributes remain all-optional to mirror their permissive JSON Schemas): Context
 * Resolution cannot run at all unless all three inputs are present, even when each
 * input's internal attributes are still incomplete.
 *
 * This is an internal evaluator contract, not part of the package's public API (see
 * `docs/architecture/reference-evaluator.md#public-api-principles`).
 */
export interface ContextResolutionInput {
  /** The caller-supplied description of the resource being requested. */
  readonly naming_request: NamingRequest;

  /** The Convention Pack selected via the Naming Request's `convention` field. */
  readonly convention_pack: ConventionPack;

  /** The external facts available during this evaluation. */
  readonly evaluation_context: EvaluationContext;
}
