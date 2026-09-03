import type { Platform, ResourceType } from "../common/identifiers.js";
import type { PlacementConstraint } from "./placement-constraint.js";
import type { ResourceNameCharacterSet } from "./resource-name-character-set.js";
import type { ResourceNameLengthUnit } from "./resource-name-length-unit.js";

/**
 * The technical characteristics of a canonical resource type, independently of any
 * specific resource instance. Where `ResourceIdentity` describes what a particular
 * resource is (see `../identity/resource-identity.ts`), a Resource Definition describes
 * what a kind of resource can be: the technical shape, constraints, and valid
 * deployment topology every instance of that resource type must respect.
 *
 * Specification v1.2 defines a structured, executable representation for length
 * constraints, character constraints, start/end constraints, forbidden prefixes and
 * suffixes, and `PlacementConstraint` rules (see
 * `specification/resource-definition.md#executable-resource-constraints-specification-v12`).
 * Normalization, `provider_capabilities`, `allowed_characters_description`, and a
 * relationship-dependent Placement Constraint with no canonical condition input (see
 * `./placement-constraint.js`) remain descriptive/conceptual only — the Specification
 * does not yet define an executable representation for them. This contract represents
 * every responsibility category at the granularity the Specification currently defines
 * it, without inventing a schema or grammar for the categories still deferred.
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
   * to resources it depends on. Each entry always carries a human-readable `statement`;
   * `rule` is present only when the constraint can be evaluated from Resource Identity
   * alone (see `./placement-constraint.js` and
   * `specification/resource-definition.md#structured-placement-constraints-specification-v12`).
   */
  readonly placement_constraints?: ReadonlyArray<PlacementConstraint>;
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
 * inventing a rendering grammar the Specification does not define, except for the
 * structured, executable Specification v1.2 constraint families below.
 *
 * `min_length` and `max_length` share exactly one `length_unit`: whenever either bound
 * is declared, `length_unit` must also be declared, from the closed
 * {@link ResourceNameLengthUnit} vocabulary, so that two independently conforming
 * Reference Evaluator implementations measure the same generated name the same way
 * (see `specification/resource-definition.md#minimum-length`). This four-way union
 * makes "a bound without `length_unit`" unrepresentable, rather than merely
 * undocumented. `min_length <= max_length`, when both are declared, is a value-level
 * invariant this union cannot express; it is checked by catalog integrity tests
 * instead (see `packages/catalog/test/runtime/catalog.test.mjs`).
 */
export type ResourceRenderingConstraints = {
  /**
   * Allowed characters or casing rule imposed by the underlying platform, described as
   * free text. Purely illustrative; never interpreted as an executable grammar — see
   * {@link ResourceRenderingConstraints.character_constraints} for the executable
   * representation.
   */
  readonly allowed_characters_description?: string;

  /** How raw input must be normalized to produce a valid value for this resource type, described as free text. */
  readonly normalization?: string;

  /** Provider-specific capabilities or limitations Convention Evaluation must respect. */
  readonly provider_capabilities?: ReadonlyArray<string>;

  /**
   * A structured, executable representation of this resource type's allowed
   * characters (see `specification/resource-definition.md#character-constraints`).
   * Every code point in a rendered name must belong to the allowed set this value
   * describes.
   */
  readonly character_constraints?: ResourceNameCharacterSet;

  /** The rendered name's first code point must belong to this allowed set. */
  readonly starts_with?: ResourceNameCharacterSet;

  /** The rendered name's last code point must belong to this allowed set. */
  readonly ends_with?: ResourceNameCharacterSet;

  /** Exact, case-sensitive prefixes a rendered name must not start with. */
  readonly forbidden_prefixes?: ReadonlyArray<string>;

  /** Exact, case-sensitive suffixes a rendered name must not end with. */
  readonly forbidden_suffixes?: ReadonlyArray<string>;
} & (
  | {
      readonly min_length?: undefined;
      readonly max_length?: undefined;
      readonly length_unit?: undefined;
    }
  | {
      /** Minimum length imposed by the underlying platform, measured in `length_unit`. */
      readonly min_length: number;
      readonly max_length?: undefined;
      /** The unit `min_length` counts. Required whenever `min_length` is declared. */
      readonly length_unit: ResourceNameLengthUnit;
    }
  | {
      readonly min_length?: undefined;
      /** Maximum length imposed by the underlying platform, measured in `length_unit`. */
      readonly max_length: number;
      /** The unit `max_length` counts. Required whenever `max_length` is declared. */
      readonly length_unit: ResourceNameLengthUnit;
    }
  | {
      readonly min_length: number;
      readonly max_length: number;
      readonly length_unit: ResourceNameLengthUnit;
    }
);
