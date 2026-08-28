import type { Platform, ResourceType } from "../common/identifiers.js";
import type { ResourceNameLengthUnit } from "./resource-name-length-unit.js";

/**
 * The technical characteristics of a canonical resource type, independently of any
 * specific resource instance. Where `ResourceIdentity` describes what a particular
 * resource is (see `../identity/resource-identity.ts`), a Resource Definition describes
 * what a kind of resource can be: the technical shape, constraints, and valid
 * deployment topology every instance of that resource type must respect.
 *
 * The Specification defines this concept only in prose and explicitly does not yet
 * define a catalog, a JSON Schema, or a formal grammar for Placement Constraints (see
 * `specification/resource-definition.md`'s "Out of scope" section). This contract
 * therefore represents only the named responsibility categories the Specification
 * describes, at the same conceptual granularity, without inventing a concrete schema or
 * grammar the Specification itself defers to a later iteration.
 *
 * See `specification/resource-definition.md`.
 */
export interface ResourceDefinition {
  /** The stable identifier for the resource type (matches `resource_type` elsewhere). */
  readonly resource_type: ResourceType;

  /** The infrastructure platform the resource type belongs to. */
  readonly platform: Platform;

  /** A broader technical grouping the resource type belongs to (for example, storage, compute, networking). */
  readonly category?: string;

  /** Whether and how instances of this resource type must be distinguished from one another. */
  readonly identity_constraints?: ResourceIdentityConstraints;

  /** How a valid representation of this resource type must be generated. */
  readonly rendering_constraints?: ResourceRenderingConstraints;

  /**
   * The valid deployment topology for this resource type, including how it must relate
   * to resources it depends on. Represented as free-form descriptive statements because
   * the Specification does not yet define a formal grammar for Placement Constraints.
   */
  readonly placement_constraints?: ReadonlyArray<string>;
}

/**
 * Identity constraints for a resource type: whether and how instances of it must be
 * distinguished from one another.
 */
export interface ResourceIdentityConstraints {
  /** Whether names or identifiers for this resource type must be unique within `uniqueness_scope`. */
  readonly unique?: boolean;

  /**
   * The administrative or isolation boundary within which uniqueness applies (for
   * example, an account, a region, a namespace, or global). The Specification gives
   * these as illustrative examples, not a closed enumeration, so this remains a plain
   * string rather than a string literal union.
   */
  readonly uniqueness_scope?: string;

  /** Whether the resource type is global or bound to a specific `location`. */
  readonly global?: boolean;
}

/**
 * Rendering constraints for a resource type: how a valid representation of it must be
 * generated. The Specification names these categories in prose but defines no concrete
 * schema for their values; fields stay close to plain, descriptive types rather than
 * inventing a rendering grammar the Specification does not define.
 *
 * `max_length` and `length_unit` are declared together, or not at all: Specification
 * v1.1's clarified `max_length` semantics (see
 * `specification/resource-definition.md#rendering-constraints`) require every Resource
 * Definition that declares a maximum name length to also declare the unit it counts,
 * from the closed {@link ResourceNameLengthUnit} vocabulary, so that two independently
 * conforming Reference Evaluator implementations measure the same generated name the
 * same way. This union makes the invalid "`max_length` without `length_unit`" state
 * unrepresentable, rather than merely undocumented.
 */
export type ResourceRenderingConstraints = {
  /** Allowed characters or casing rule imposed by the underlying platform, described as free text. */
  readonly allowed_characters?: string;

  /** How raw input must be normalized to produce a valid value for this resource type, described as free text. */
  readonly normalization?: string;

  /** Provider-specific capabilities or limitations Convention Evaluation must respect. */
  readonly provider_capabilities?: ReadonlyArray<string>;
} & (
  | {
      readonly max_length?: undefined;
      readonly length_unit?: undefined;
    }
  | {
      /** Maximum length imposed by the underlying platform, measured in `length_unit`. */
      readonly max_length: number;

      /** The unit `max_length` counts. Required whenever `max_length` is declared. */
      readonly length_unit: ResourceNameLengthUnit;
    }
);
