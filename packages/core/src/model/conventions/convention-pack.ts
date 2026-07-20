import type { ConventionPackId } from "../common/identifiers.js";
import type { EvaluationContextSource } from "../contexts/evaluation-context-source.js";
import type { GovernanceContext } from "../governance/governance-context.js";
import type { DeploymentIdentity } from "../identity/deployment-identity.js";
import type { FunctionalIdentity } from "../identity/functional-identity.js";
import type { OrganizationalIdentity } from "../identity/organizational-identity.js";

/**
 * The Specification Artifact that defines how canonical models are projected into
 * platform-specific conventions: naming defaults, deployment defaults, governance
 * defaults, abbreviations, ordering rules, metadata projection, and override policy. A
 * Convention Pack defines organizational policy; it does not implement naming or define
 * technical platform constraints (see `../definitions/resource-definition.ts`).
 *
 * The Specification defines this concept only in prose and explicitly does not define a
 * JSON Schema, concrete syntax, or composition/merge algorithm for it (see
 * `specification/convention-pack.md`'s "Out of scope" section). Two named
 * responsibilities — normalization rules and metadata projection mappings — are
 * therefore intentionally not given a concrete shape here: the Specification itself
 * states no concrete naming syntax or key-mapping format is defined yet. Representing
 * them with an invented schema would exceed what the Specification defines; they are
 * deferred to a later Milestone 1 increment, once the Specification defines them.
 *
 * See `specification/convention-pack.md`.
 */
export interface ConventionPack {
  /** The identifier a Naming Request selects via its `convention` field. */
  readonly id: ConventionPackId;

  /** Default Resource Identity values applied when a request does not supply them. */
  readonly identity_defaults?: ConventionPackIdentityDefaults;

  /**
   * Default Governance Context values, including an optional default Governance
   * Profile applied when the caller does not select one explicitly.
   */
  readonly governance_defaults?: GovernanceContext;

  /**
   * Resource Identity and Governance Context attributes, expressed as dotted attribute
   * paths (for example, `organizational.system`), that must be available before
   * Convention Evaluation can proceed.
   */
  readonly required_attributes?: ReadonlyArray<string>;

  /**
   * The order, expressed as dotted attribute paths, in which resolved identity
   * components appear in a generated name.
   */
  readonly naming_component_order?: ReadonlyArray<string>;

  /** Shortened forms used to represent identity components in generated names, keyed by dotted attribute path. */
  readonly abbreviations?: Readonly<Record<string, string>>;

  /**
   * Which Evaluation Context source is authoritative for a specific canonical
   * attribute, keyed by dotted attribute path, whenever more than one source could
   * supply it.
   */
  readonly context_authority_rules?: Readonly<Record<string, EvaluationContextSource>>;

  /** Which attributes may be overridden on a Naming Request, and which are protected. */
  readonly override_policy?: ConventionPackOverridePolicy;
}

/**
 * Default Resource Identity values a Convention Pack supplies. Mirrors the three
 * identity planes rather than a flat set of arbitrary keys, consistent with how
 * `NamingRequestOverrides` is structured (see `../requests/naming-request.ts`).
 */
export interface ConventionPackIdentityDefaults {
  readonly organizational?: OrganizationalIdentity;
  readonly deployment?: DeploymentIdentity;
  readonly functional?: FunctionalIdentity;
}

/**
 * Which attributes a Convention Pack allows to be overridden on a Naming Request, and
 * which it protects from override regardless of precedence (see
 * `specification/naming-request.md`'s precedence and protection rules). Both lists use
 * dotted attribute paths, consistent with `required_attributes` and
 * `naming_component_order` above. The Specification does not define a concrete
 * validation-policy shape beyond these two lists, so none is invented here.
 */
export interface ConventionPackOverridePolicy {
  readonly overridable_attributes?: ReadonlyArray<string>;
  readonly protected_attributes?: ReadonlyArray<string>;
}
