import type {
  ConventionPack,
  DeploymentIdentity,
  EvaluationContext,
  FunctionalIdentity,
  NamingRequest,
  OrganizationalIdentity,
  ResourceIdentity,
} from "../../model/index.js";
import type { ContextResolutionInput } from "../contracts/index.js";
import type { ContextResolutionDiagnostic } from "./diagnostics.js";
import { type ContextCandidate, resolveAttribute } from "./resolve-attribute.js";

/**
 * The result of resolving only the Resource Identity half of Context Resolution (see
 * `docs/architecture/reference-evaluator.md#increment-plan`). Governance Context
 * resolution is a separate, later increment: the Specification's "Governance Profile
 * defaults" resolution source (see
 * `specification/context-resolution.md#resolution-sources`) has no corresponding
 * defaults-bearing type anywhere in the domain model yet — only a `profile` identifier
 * reference exists on `GovernanceContext` (see
 * `../../model/governance/governance-context.ts`) — so resolving it now would require
 * inventing a domain concept the Specification has not yet been shown to need,
 * something this increment must not do.
 *
 * This is intentionally not the full {@link ContextResolutionResult} from Milestone
 * 2.1 (see `../contracts/context-resolution-result.ts`): that contract requires a
 * `governance_context`, which this increment does not produce. A later increment
 * composes both halves into that contract.
 */
export interface ResourceIdentityResolution {
  /** The resolved Resource Identity. Still may be incomplete when required attributes could not be resolved. */
  readonly resource_identity: ResourceIdentity;

  /**
   * Diagnostics recorded while resolving, if any: protected-value conflicts and
   * unresolved required attributes (see `./diagnostics.js`). An incomplete or
   * conflicting resolution is represented here, not by throwing — see
   * `docs/architecture/reference-evaluator.md#validation-and-diagnostics`.
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

const ORGANIZATIONAL_ATTRIBUTES = ["organization", "business_unit", "system", "tenant"] as const;

/**
 * Resolves Plane 1, Organizational Identity. Candidates: Convention Pack defaults,
 * Shared Organizational Context, Runtime Context's organizational facts, and the
 * Naming Request's `overrides.organizational` block. The Naming Request itself carries
 * no organizational fields directly (see `specification/naming-request.md`).
 */
function resolveOrganizational(
  conventionPack: ConventionPack,
  evaluationContext: EvaluationContext,
  overrides: OrganizationalIdentity | undefined,
): { value: OrganizationalIdentity | undefined; diagnostics: ContextResolutionDiagnostic[] } {
  const diagnostics: ContextResolutionDiagnostic[] = [];
  const resolved: Partial<Record<(typeof ORGANIZATIONAL_ATTRIBUTES)[number], string>> = {};

  for (const key of ORGANIZATIONAL_ATTRIBUTES) {
    const attribute = `organizational.${key}`;
    const contextCandidates: ReadonlyArray<ContextCandidate<string>> = [
      {
        source: "convention-pack-defaults",
        value: conventionPack.identity_defaults?.organizational?.[key],
      },
      {
        source: "shared-organizational-context",
        value: evaluationContext.shared_organizational_context?.[key],
      },
      {
        source: "runtime-context",
        value: evaluationContext.runtime_context?.organizational?.[key],
      },
    ];
    const result = resolveAttribute<string>({
      attribute,
      contextCandidates,
      namingRequestValue: undefined,
      overrideValue: overrides?.[key],
      ...policyFor(conventionPack, attribute),
    });
    diagnostics.push(...result.diagnostics);
    if (result.value !== undefined) {
      resolved[key] = result.value;
    }
  }

  return {
    value: Object.keys(resolved).length > 0 ? resolved : undefined,
    diagnostics,
  };
}

const DEPLOYMENT_CONTEXT_ATTRIBUTES = [
  "platform",
  "deployment_scope",
  "environment",
  "location",
] as const;

/**
 * Resolves Plane 2, Deployment Identity. Most attributes are candidates from
 * Convention Pack defaults, Shared Deployment Context, Runtime Context's deployment
 * facts, and `overrides.deployment`. `instance` is the one Deployment Identity
 * attribute the Naming Request itself may also supply directly (see
 * `specification/naming-request.md`). `platform` is normally derived from the Resource
 * Definition once one is selected (see
 * `../../model/identity/deployment-identity.ts`); Resource Definition selection is a
 * later evaluator stage this increment does not implement, so `platform` is resolved
 * here only from the same sources as any other attribute, with no derivation logic.
 */
function resolveDeployment(
  conventionPack: ConventionPack,
  evaluationContext: EvaluationContext,
  namingRequest: NamingRequest,
  overrides: DeploymentIdentity | undefined,
): { value: DeploymentIdentity | undefined; diagnostics: ContextResolutionDiagnostic[] } {
  const diagnostics: ContextResolutionDiagnostic[] = [];
  const resolved: Partial<
    Record<(typeof DEPLOYMENT_CONTEXT_ATTRIBUTES)[number] | "instance", string>
  > = {};

  for (const key of DEPLOYMENT_CONTEXT_ATTRIBUTES) {
    const attribute = `deployment.${key}`;
    const contextCandidates: ReadonlyArray<ContextCandidate<string>> = [
      {
        source: "convention-pack-defaults",
        value: conventionPack.identity_defaults?.deployment?.[key],
      },
      {
        source: "shared-deployment-context",
        value: evaluationContext.shared_deployment_context?.[key],
      },
      {
        source: "runtime-context",
        value: evaluationContext.runtime_context?.deployment?.[key],
      },
    ];
    const result = resolveAttribute<string>({
      attribute,
      contextCandidates,
      namingRequestValue: undefined,
      overrideValue: overrides?.[key],
      ...policyFor(conventionPack, attribute),
    });
    diagnostics.push(...result.diagnostics);
    if (result.value !== undefined) {
      resolved[key] = result.value;
    }
  }

  const instanceAttribute = "deployment.instance";
  const instanceCandidates: ReadonlyArray<ContextCandidate<string>> = [
    {
      source: "convention-pack-defaults",
      value: conventionPack.identity_defaults?.deployment?.instance,
    },
    {
      source: "shared-deployment-context",
      value: evaluationContext.shared_deployment_context?.instance,
    },
    {
      source: "runtime-context",
      value: evaluationContext.runtime_context?.deployment?.instance,
    },
  ];
  const instanceResult = resolveAttribute<string>({
    attribute: instanceAttribute,
    contextCandidates: instanceCandidates,
    namingRequestValue: namingRequest.deployment?.instance,
    overrideValue: overrides?.instance,
    ...policyFor(conventionPack, instanceAttribute),
  });
  diagnostics.push(...instanceResult.diagnostics);
  if (instanceResult.value !== undefined) {
    resolved.instance = instanceResult.value;
  }

  return {
    value: Object.keys(resolved).length > 0 ? resolved : undefined,
    diagnostics,
  };
}

const FUNCTIONAL_REQUEST_ATTRIBUTES = ["service", "component"] as const;

/**
 * Resolves Plane 3, Functional Identity. Runtime Context and the shared contexts
 * carry no functional facts (see `../../model/contexts/runtime-context.ts`): candidates
 * are only Convention Pack defaults, the Naming Request itself, and
 * `overrides.functional`. `resource_type` is a special case: the Naming Request exposes
 * it at the request's top level rather than inside `functional`, and it resolves into
 * `functional.resource_type` without being duplicated (see
 * `specification/naming-request.md`).
 */
function resolveFunctional(
  conventionPack: ConventionPack,
  namingRequest: NamingRequest,
  overrides: FunctionalIdentity | undefined,
): { value: FunctionalIdentity | undefined; diagnostics: ContextResolutionDiagnostic[] } {
  const diagnostics: ContextResolutionDiagnostic[] = [];
  const resolved: Partial<
    Record<(typeof FUNCTIONAL_REQUEST_ATTRIBUTES)[number] | "resource_type", string>
  > = {};

  for (const key of FUNCTIONAL_REQUEST_ATTRIBUTES) {
    const attribute = `functional.${key}`;
    const contextCandidates: ReadonlyArray<ContextCandidate<string>> = [
      {
        source: "convention-pack-defaults",
        value: conventionPack.identity_defaults?.functional?.[key],
      },
    ];
    const result = resolveAttribute<string>({
      attribute,
      contextCandidates,
      namingRequestValue: namingRequest.functional?.[key],
      overrideValue: overrides?.[key],
      ...policyFor(conventionPack, attribute),
    });
    diagnostics.push(...result.diagnostics);
    if (result.value !== undefined) {
      resolved[key] = result.value;
    }
  }

  const resourceTypeAttribute = "functional.resource_type";
  const resourceTypeCandidates: ReadonlyArray<ContextCandidate<string>> = [
    {
      source: "convention-pack-defaults",
      value: conventionPack.identity_defaults?.functional?.resource_type,
    },
  ];
  const resourceTypeResult = resolveAttribute<string>({
    attribute: resourceTypeAttribute,
    contextCandidates: resourceTypeCandidates,
    namingRequestValue: namingRequest.resource_type,
    overrideValue: overrides?.resource_type,
    ...policyFor(conventionPack, resourceTypeAttribute),
  });
  diagnostics.push(...resourceTypeResult.diagnostics);
  if (resourceTypeResult.value !== undefined) {
    resolved.resource_type = resourceTypeResult.value;
  }

  return {
    value: Object.keys(resolved).length > 0 ? resolved : undefined,
    diagnostics,
  };
}

/**
 * Resolves the effective Resource Identity for a Naming Request: a pure, deterministic
 * transformation of {@link ContextResolutionInput} that applies the Specification's
 * resolution precedence, Convention-Pack-declared context authority, and Convention-
 * Pack-declared protection, one attribute at a time (see
 * `specification/context-resolution.md`). Does not mutate any part of its input.
 *
 * Governance Context resolution, Resource Definition selection, Convention Evaluation,
 * and naming rendering are later stages this function intentionally does not perform
 * (see `docs/architecture/reference-evaluator.md#responsibilities`).
 */
export function resolveResourceIdentity(input: ContextResolutionInput): ResourceIdentityResolution {
  const {
    naming_request: namingRequest,
    convention_pack: conventionPack,
    evaluation_context: evaluationContext,
  } = input;

  const organizational = resolveOrganizational(
    conventionPack,
    evaluationContext,
    namingRequest.overrides?.organizational,
  );
  const deployment = resolveDeployment(
    conventionPack,
    evaluationContext,
    namingRequest,
    namingRequest.overrides?.deployment,
  );
  const functional = resolveFunctional(
    conventionPack,
    namingRequest,
    namingRequest.overrides?.functional,
  );

  const resource_identity: ResourceIdentity = {
    ...(organizational.value !== undefined ? { organizational: organizational.value } : {}),
    ...(deployment.value !== undefined ? { deployment: deployment.value } : {}),
    ...(functional.value !== undefined ? { functional: functional.value } : {}),
  };

  return {
    resource_identity,
    diagnostics: [
      ...organizational.diagnostics,
      ...deployment.diagnostics,
      ...functional.diagnostics,
    ],
  };
}
