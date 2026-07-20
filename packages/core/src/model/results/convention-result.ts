import type { GovernanceContext } from "../governance/governance-context.js";
import type { ResourceIdentity } from "../identity/resource-identity.js";

/**
 * The final artifact produced by Convention Evaluation once it has evaluated the
 * Specification against a resource's resolved `ResourceIdentity`, `GovernanceContext`,
 * and `ResourceDefinition` (see `../definitions/resource-definition.ts`). Returned to
 * the caller of a Naming Request (see `../requests/naming-request.ts`).
 *
 * A Convention Result is more than a generated name: it is a structured bundle
 * capturing the resolved context, every convention output produced from it, and
 * whether that output is valid.
 *
 * See `specification/convention-result.md`.
 */
export interface ConventionResult {
  /** The resolved, canonical identity the result was generated from. */
  readonly resource_identity: ResourceIdentity;

  /** The resolved ownership and governance context the result was generated from. */
  readonly governance_context: GovernanceContext;

  /** The platform-specific outputs projected from Resource Identity and Governance Context. */
  readonly outputs: ConventionOutputs;

  /** The outcome of validating the generated outputs and resolved identity against constraints. */
  readonly validation: ConventionValidation;

  /** A human-readable account of how the result was derived. */
  readonly explanation?: string;

  /** Non-fatal issues detected while generating the result, independent of `validation`. */
  readonly warnings?: ReadonlyArray<ConventionWarning>;
}

/**
 * The conceptual grouping for every platform-specific output a Convention Result
 * carries. Future Specification iterations may extend this with additional output
 * kinds (for example, aliases or DNS names) without changing this conceptual model.
 */
export interface ConventionOutputs {
  /** The canonical name produced for the resource. */
  readonly name?: string;

  /** Platform-specific metadata projected from Resource Identity and Governance Context. */
  readonly metadata?: ConventionMetadata;
}

/** Platform-specific metadata projected from Resource Identity and Governance Context. */
export interface ConventionMetadata {
  /** Platform-specific tags (for example, AWS or Azure tags). */
  readonly tags?: Readonly<Record<string, string>>;

  /** Platform-specific labels (for example, Kubernetes labels). */
  readonly labels?: Readonly<Record<string, string>>;

  /** Platform-specific annotations (for example, Kubernetes annotations). */
  readonly annotations?: Readonly<Record<string, string>>;
}

/**
 * The outcome of validating a Convention Result's generated outputs and resolved
 * Resource Identity against the Resource Definition's constraints and the
 * Specification.
 */
export interface ConventionValidation {
  /** Whether the generated outputs and resolved identity satisfy every checked constraint. */
  readonly valid: boolean;

  /** The constraint violations found, if any. */
  readonly failures?: ReadonlyArray<ConventionValidationFailure>;
}

/** A single constraint violation found while validating a Convention Result. */
export interface ConventionValidationFailure {
  /** A human-readable description of the violated constraint. */
  readonly message: string;
}

/** A single non-fatal issue detected while generating a Convention Result. */
export interface ConventionWarning {
  /** A human-readable description of the non-fatal issue. */
  readonly message: string;
}
