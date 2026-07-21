import type { ConventionPack, GovernanceContext } from "../../model/index.js";
import type { ContextResolutionInput } from "../contracts/index.js";
import type { ContextResolutionDiagnostic } from "./diagnostics.js";
import { type ContextCandidate, resolveAttribute } from "./resolve-attribute.js";

/**
 * The result of resolving only the Governance Context half of Context Resolution (see
 * `docs/architecture/reference-evaluator.md#increment-plan`). This is intentionally not
 * the full {@link ContextResolutionResult} from Milestone 2.1 (see
 * `../contracts/context-resolution-result.ts`): that contract also requires a
 * `resource_identity`, produced independently by `resolveResourceIdentity` (Milestone
 * 2.2, see `./resolve-resource-identity.js`). The two halves compose into that contract
 * at the call site — see
 * `docs/architecture/reference-evaluator.md#context-resolution-governance-context-implemented`.
 */
export interface GovernanceContextResolution {
  /** The resolved Governance Context. May be empty when no source supplied any attribute. */
  readonly governance_context: GovernanceContext;

  /**
   * Diagnostics recorded while resolving, if any: protected-value conflicts and
   * unresolved required attributes (see `./diagnostics.js`), the same representation
   * `resolveResourceIdentity` uses. An incomplete or conflicting resolution is
   * represented here, not by throwing.
   */
  readonly diagnostics: ReadonlyArray<ContextResolutionDiagnostic>;
}

function policyFor(conventionPack: ConventionPack, attribute: string) {
  return {
    authoritativeSource: conventionPack.context_authority_rules?.[attribute],
    protectedAttribute:
      conventionPack.override_policy?.protected_attributes?.includes(attribute) ?? false,
    required: conventionPack.required_attributes?.includes(attribute) ?? false,
  };
}

const GOVERNANCE_ATTRIBUTES = ["owner", "managed_by", "cost_center", "profile"] as const;

/**
 * Resolves Governance Context: a pure, deterministic transformation of the same
 * {@link ContextResolutionInput} `resolveResourceIdentity` consumes, reusing the shared
 * `resolveAttribute` primitive per governance attribute (see `./resolve-attribute.js`).
 * Does not mutate any part of its input.
 *
 * **Candidate sources**, per `specification/context-resolution.md#resolution-sources`:
 * - Convention Pack `governance_defaults` (lowest precedence) — including a default
 *   `profile` the Convention Pack applies when the caller does not select one
 *   explicitly (see `specification/governance-context.md#relationship-with-convention-packs`).
 * - The Naming Request's `governance` block (see `specification/naming-request.md`).
 * - The Naming Request's `overrides.governance` block (highest precedence, see
 *   `specification/naming-request.md#explicit-overrides`).
 *
 * **Two Specification-named sources are deliberately not implemented**, and are
 * documented rather than silently ignored (see
 * `docs/architecture/reference-evaluator.md#context-resolution-governance-context-implemented`):
 * - **Evaluation Context** carries no governance-bearing fields anywhere in the domain
 *   model — `EvaluationContext`, `RuntimeContext`, `SharedOrganizationalContext`, and
 *   `SharedDeploymentContext` model only organizational and deployment attributes (see
 *   `../../model/contexts/`). Governance therefore has no context-tier candidate beyond
 *   Convention Pack defaults in the current model; a `context_authority_rules` entry
 *   for a governance attribute cannot match any Evaluation Context candidate and
 *   resolution falls back to Convention Pack defaults, exactly like an attribute with
 *   no declared authority rule at all.
 * - **Governance Profile defaults** — defaults declared by the *selected* Governance
 *   Profile itself, distinct from a Convention Pack's own `governance_defaults` (see
 *   `specification/context-resolution.md#resolution-sources`, precedence step 5) — has
 *   no defaults-bearing type in the domain model: `GovernanceProfileId` is a bare
 *   identifier alias (see `../../model/common/identifiers.ts`). Inventing one is out of
 *   scope for this increment; only the selected identifier itself is resolved.
 *
 * **Independence from Resource Identity.** This function reads no Resource Identity
 * attribute and produces none: it consumes only `naming_request.governance`,
 * `naming_request.overrides.governance`, and `convention_pack.governance_defaults`,
 * matching the Specification's statement that Resource Identity and Governance Context
 * "evolve independently" (see
 * `specification/governance-context.md#relationship-with-resource-identity`).
 */
export function resolveGovernanceContext(
  input: ContextResolutionInput,
): GovernanceContextResolution {
  const { naming_request: namingRequest, convention_pack: conventionPack } = input;
  const overrides = namingRequest.overrides?.governance;

  const diagnostics: ContextResolutionDiagnostic[] = [];
  const resolved: Partial<Record<(typeof GOVERNANCE_ATTRIBUTES)[number], string>> = {};

  for (const key of GOVERNANCE_ATTRIBUTES) {
    const attribute = `governance.${key}`;
    const contextCandidates: ReadonlyArray<ContextCandidate<string>> = [
      {
        source: "convention-pack-defaults",
        value: conventionPack.governance_defaults?.[key],
      },
    ];
    const result = resolveAttribute<string>({
      attribute,
      contextCandidates,
      namingRequestValue: namingRequest.governance?.[key],
      overrideValue: overrides?.[key],
      ...policyFor(conventionPack, attribute),
    });
    diagnostics.push(...result.diagnostics);
    if (result.value !== undefined) {
      resolved[key] = result.value;
    }
  }

  return {
    governance_context: resolved,
    diagnostics,
  };
}
