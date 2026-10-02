import type { ConventionPack, ConventionValidationFailure } from "../../../model/index.js";
import type { ContextResolutionResult } from "../../contracts/context-resolution-result.js";
import {
  isKnownAttributeReference,
  resolveAttributeReference,
} from "../resolve-attribute-reference.js";

/** The outcome of projecting a Convention Pack's `tag_projections`. */
export interface TagProjection {
  /** The projected tags in declaration order, or `undefined` when none resolved. */
  readonly tags: Readonly<Record<string, string>> | undefined;
  readonly failures: ReadonlyArray<ConventionValidationFailure>;
}

/**
 * Projects `conventionPack.tag_projections` per Specification v1.3 (see
 * `specification/convention-pack.md#tag-projections`): each tag carries its source's
 * resolved value verbatim; an absent source omits the tag; an empty key or an
 * unknown source is reported and only that tag is omitted.
 */
export function projectTags(
  context: ContextResolutionResult,
  conventionPack: ConventionPack,
): TagProjection {
  const tags: Record<string, string> = {};
  const failures: ConventionValidationFailure[] = [];

  for (const [key, reference] of Object.entries(conventionPack.tag_projections ?? {})) {
    if (key.length === 0) {
      failures.push({
        message: `tag_projections declared by convention pack "${conventionPack.id}" declares an empty tag key.`,
      });
      continue;
    }
    if (!isKnownAttributeReference(reference)) {
      failures.push({
        message: `tag_projections declared by convention pack "${conventionPack.id}" maps tag key "${key}" to unknown metadata source reference "${reference}".`,
      });
      continue;
    }
    const value = resolveAttributeReference(context, reference);
    if (value !== undefined) {
      tags[key] = value;
    }
  }

  return { tags: Object.keys(tags).length > 0 ? tags : undefined, failures };
}
