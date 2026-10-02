import type {
  ConventionPack,
  ConventionValidationFailure,
  ResourceDefinition,
} from "../../../model/index.js";
import type { ContextResolutionResult } from "../../contracts/context-resolution-result.js";
import {
  isKnownAttributeReference,
  resolveAttributeReference,
} from "../resolve-attribute-reference.js";

/** The outcome of projecting a Convention Pack's `tag_projections`. */
export interface TagProjectionResult {
  /** The projected tags in declaration order, or `undefined` when none resolved. */
  readonly tags: Readonly<Record<string, string>> | undefined;
  readonly failures: ReadonlyArray<ConventionValidationFailure>;
}

function isKnownMetadataSource(source: unknown): source is string {
  return (
    typeof source === "string" && (source === "outputs.name" || isKnownAttributeReference(source))
  );
}

/**
 * Projects `conventionPack.tag_projections` per Specification v1.3 (see
 * `specification/convention-pack.md#tag-projections`): each tag carries its source's
 * resolved value verbatim (`outputs.name` resolves to `name`); an absent source, or an
 * unmet `only_when_resource_accepts_no_name` condition, omits the tag; an empty key or
 * an invalid source is reported and only that tag is omitted.
 */
export function projectTags(
  context: ContextResolutionResult,
  conventionPack: ConventionPack,
  resourceDefinition: ResourceDefinition,
  name: string | undefined,
): TagProjectionResult {
  const tags: Record<string, string> = {};
  const failures: ConventionValidationFailure[] = [];

  for (const [key, entry] of Object.entries(conventionPack.tag_projections ?? {})) {
    if (key.length === 0) {
      failures.push({
        message: `tag_projections declared by convention pack "${conventionPack.id}" declares an empty tag key.`,
      });
      continue;
    }
    const reference: unknown = typeof entry === "string" ? entry : entry?.source;
    if (!isKnownMetadataSource(reference)) {
      failures.push({
        message: `tag_projections declared by convention pack "${conventionPack.id}" maps tag key "${key}" to unknown metadata source reference "${String(reference)}".`,
      });
      continue;
    }
    if (
      typeof entry !== "string" &&
      entry.only_when_resource_accepts_no_name === true &&
      resourceDefinition.accepts_name !== false
    ) {
      continue;
    }
    const value =
      reference === "outputs.name" ? name : resolveAttributeReference(context, reference);
    if (value !== undefined) {
      tags[key] = value;
    }
  }

  return { tags: Object.keys(tags).length > 0 ? tags : undefined, failures };
}
