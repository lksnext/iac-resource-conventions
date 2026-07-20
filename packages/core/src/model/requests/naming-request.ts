import type { ConventionPackId, ResourceType } from "../common/identifiers.js";
import type { GovernanceContext } from "../governance/governance-context.js";
import type { DeploymentIdentity } from "../identity/deployment-identity.js";
import type { FunctionalIdentity } from "../identity/functional-identity.js";
import type { OrganizationalIdentity } from "../identity/organizational-identity.js";

/**
 * The public request contract submitted when a resource needs to be named, tagged, or
 * labeled according to project conventions.
 *
 * A Naming Request is intentionally small: callers supply only the information that is
 * specific to the resource being requested (primarily its functional identity and any
 * deployment detail that cannot be inferred from context); Context Resolution resolves
 * everything else into a complete `ResourceIdentity` and `GovernanceContext` (see
 * `../identity/resource-identity.ts` and `../governance/governance-context.ts`).
 * `resource_type` is exposed at the top level for convenience and resolves into
 * `functional.resource_type` on the canonical Resource Identity — it is not duplicated
 * inside `functional`. `convention` and `governance.profile` are independent selectors
 * (see `../conventions/convention-pack.ts` and `../governance/governance-context.ts`).
 *
 * See `specification/naming-request.md` and
 * `specification/schemas/naming-request.schema.json`.
 */
export interface NamingRequest {
  /** Identifier of the Convention Pack used to resolve and evaluate the request. */
  readonly convention?: ConventionPackId;

  /** The type of resource being requested. */
  readonly resource_type?: ResourceType;

  /** Functional Identity information specific to this request. */
  readonly functional?: NamingRequestFunctional;

  /** Governance information supplied directly on the request. */
  readonly governance?: GovernanceContext;

  /** Deployment Identity information specific to this request. */
  readonly deployment?: NamingRequestDeployment;

  /** Explicit values that intentionally bypass Context Resolution defaults. */
  readonly overrides?: NamingRequestOverrides;

  /** Additional caller-supplied metadata that does not map to a defined Resource Identity attribute. */
  readonly custom_metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Functional Identity fields a Naming Request may supply directly. `resource_type` is
 * not repeated here — it is exposed at the top level of `NamingRequest` instead.
 */
export interface NamingRequestFunctional {
  /** Logical workload, subsystem, or deployable capability within the system. */
  readonly service?: string;

  /** Optional functional role or subcomponent within the service. */
  readonly component?: string;
}

/**
 * Deployment Identity fields a Naming Request may supply directly. Most deployment
 * information is resolved by shared context rather than supplied on the request.
 */
export interface NamingRequestDeployment {
  /** Distinguishes multiple instances of an otherwise identical resource. */
  readonly instance?: string;
}

/**
 * Explicit values that intentionally bypass attributes otherwise resolved by Context
 * Resolution. Overrides mirror the canonical Resource Identity and Governance Context
 * hierarchy rather than arbitrary key/value pairs, and remain subject to Convention
 * Evaluation validation and a Convention Pack's override policy (see
 * `../conventions/convention-pack.ts`).
 */
export interface NamingRequestOverrides {
  readonly organizational?: OrganizationalIdentity;
  readonly deployment?: DeploymentIdentity;
  readonly functional?: FunctionalIdentity;
  readonly governance?: GovernanceContext;
}
