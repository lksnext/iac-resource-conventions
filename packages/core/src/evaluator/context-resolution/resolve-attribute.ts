import type { EvaluationContextSource } from "../../model/index.js";
import type { ContextResolutionDiagnostic } from "./diagnostics.js";

/**
 * Where a single-attribute candidate value came from, for the context tier only
 * (Convention Pack defaults plus the Evaluation Context sources — see
 * `specification/context-resolution.md#resolution-precedence`). The Naming Request and
 * override tier is represented separately in {@link AttributeResolutionInput}, since
 * only the context tier participates in Convention Pack authority rules (see
 * `specification/convention-pack.md#context-authority-rules`).
 */
export type ContextTierSource = "convention-pack-defaults" | EvaluationContextSource;

/** A single context-tier source's candidate value for one Resource Identity attribute. */
export interface ContextCandidate<T> {
  readonly source: ContextTierSource;
  readonly value: T | undefined;
}

/**
 * Everything needed to resolve one Resource Identity attribute: its context-tier
 * candidates (in ascending precedence order — see
 * `specification/context-resolution.md#resolution-precedence`), its Naming Request and
 * override candidates, and the Convention-Pack-declared policy that applies to it (see
 * `specification/context-resolution.md#precedence-authority-and-protection`).
 */
export interface AttributeResolutionInput<T> {
  /** The dotted attribute path, used only for diagnostic messages. */
  readonly attribute: string;

  /** Context-tier candidates, ascending precedence order (lowest first). */
  readonly contextCandidates: ReadonlyArray<ContextCandidate<T>>;

  /** The value supplied directly on the Naming Request, if any. */
  readonly namingRequestValue: T | undefined;

  /** The value supplied in the Naming Request's `overrides` block, if any. */
  readonly overrideValue: T | undefined;

  /**
   * The Evaluation Context source the selected Convention Pack declares authoritative
   * for this attribute, if any (see
   * `specification/convention-pack.md#context-authority-rules`).
   */
  readonly authoritativeSource: EvaluationContextSource | undefined;

  /**
   * Whether the selected Convention Pack protects this attribute from being replaced
   * by a Naming Request or override value (see
   * `specification/convention-pack.md#override-policy`).
   */
  readonly protectedAttribute: boolean;

  /**
   * Whether the selected Convention Pack requires this attribute to be resolvable
   * (see `specification/convention-pack.md#required-attributes`).
   */
  readonly required: boolean;
}

/** The outcome of resolving one Resource Identity attribute. */
export interface AttributeResolution<T> {
  readonly value: T | undefined;
  readonly diagnostics: ReadonlyArray<ContextResolutionDiagnostic>;
}

/**
 * Provisioning Context is a specialization of Runtime Context with no distinguishing
 * field in the domain model (see `../../model/contexts/evaluation-context.ts`): a
 * Convention Pack may declare authority as either `"runtime-context"` or
 * `"provisioning-context"`, and both must match the same `"runtime-context"` candidate,
 * since the model exposes only one `runtime_context` field.
 */
function authoritySourceMatches(
  declared: EvaluationContextSource,
  candidateSource: ContextTierSource,
): boolean {
  if (declared === candidateSource) {
    return true;
  }
  return (
    (declared === "runtime-context" || declared === "provisioning-context") &&
    candidateSource === "runtime-context"
  );
}

/**
 * Resolves a single Resource Identity attribute by applying, in order: Convention Pack
 * authority rules among context-tier sources (falling back to plain precedence when no
 * authority rule is declared or the declared source has no value), then protection of
 * an authoritative context-tier value against the Naming Request and override tier
 * (falling back to plain precedence when the attribute is not protected), then
 * required-attribute detection when the result is still absent (see
 * `specification/context-resolution.md#precedence-authority-and-protection` and
 * `specification/convention-pack.md#required-attributes`).
 *
 * A source that does not supply a value for this attribute contributes nothing and
 * produces no diagnostic; only an actual protected-value conflict or an unresolved
 * required attribute does (see
 * `specification/context-resolution.md#precedence-authority-and-protection`).
 */
export function resolveAttribute<T>(input: AttributeResolutionInput<T>): AttributeResolution<T> {
  const {
    attribute,
    contextCandidates,
    namingRequestValue,
    overrideValue,
    authoritativeSource,
    protectedAttribute,
    required,
  } = input;

  let contextValue: T | undefined;
  if (authoritativeSource !== undefined) {
    const authoritative = contextCandidates.find((candidate) =>
      authoritySourceMatches(authoritativeSource, candidate.source),
    );
    contextValue = authoritative?.value;
  }
  if (contextValue === undefined) {
    for (let index = contextCandidates.length - 1; index >= 0; index -= 1) {
      const candidate = contextCandidates[index];
      if (candidate !== undefined && candidate.value !== undefined) {
        contextValue = candidate.value;
        break;
      }
    }
  }

  // Overrides outrank Naming Request values: both are the highest-precedence tier,
  // but overrides are evaluated after Naming Request values (see
  // `specification/naming-request.md#explicit-overrides`).
  const requestValue = overrideValue !== undefined ? overrideValue : namingRequestValue;

  const diagnostics: ContextResolutionDiagnostic[] = [];
  let value: T | undefined;

  if (requestValue === undefined) {
    value = contextValue;
  } else if (!protectedAttribute || contextValue === undefined) {
    value = requestValue;
  } else if (requestValue === contextValue) {
    value = contextValue;
  } else {
    value = contextValue;
    diagnostics.push({
      kind: "protected-value-conflict",
      attribute,
      message:
        `"${attribute}" is protected by the selected Convention Pack; the Naming ` +
        "Request or override value was not applied.",
    });
  }

  if (value === undefined && required) {
    diagnostics.push({
      kind: "unresolved-required-attribute",
      attribute,
      message: `"${attribute}" is required by the selected Convention Pack but could not be resolved from any source.`,
    });
  }

  return { value, diagnostics };
}
