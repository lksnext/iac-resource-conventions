import type { CanonicalResourceIdentityAttribute } from "../common/identifiers.js";

/**
 * The closed placement operator vocabulary a `PlacementConstraintRule` or
 * `PlacementConstraintCondition` may use (see
 * `specification/resource-definition.md#placement-operator-vocabulary`).
 *
 * Modeled as a discriminated union so an `equals` check always carries its expected
 * `value`, and a `present`/`absent` check never can — an invalid combination (for
 * example, `present` with a `value`) is unrepresentable, rather than merely
 * undocumented.
 */
export type PlacementConstraintOperator =
  | { readonly operator: "equals"; readonly value: string }
  | { readonly operator: "present" }
  | { readonly operator: "absent" };

/**
 * A single canonical-attribute check: at most one per `PlacementConstraintRule`'s
 * `condition` (see `specification/resource-definition.md#conditional-composition`) —
 * there is no `AND`, `OR`, or nested group.
 *
 * `subject` is a canonical Resource Identity attribute reference only: the
 * Specification defines no equivalent closed canonical attribute vocabulary for
 * Governance Context (see `specification/resource-identity.md#canonical-attribute-references`,
 * which explicitly excludes Governance Context attributes), and no current evidence
 * requires one, so none is introduced speculatively here.
 */
export type PlacementConstraintCondition = {
  readonly subject: CanonicalResourceIdentityAttribute;
} & PlacementConstraintOperator;

/**
 * A structured, executable Placement Constraint rule (see
 * `specification/resource-definition.md#structured-placement-constraints-specification-v12`).
 *
 * `subject` is a canonical Resource Identity attribute reference (see
 * `specification/resource-definition.md#placement-subject`); `condition`, when
 * present, applies the same operator vocabulary to gate whether the rule itself is
 * evaluated (see `specification/resource-definition.md#the-conditional-input-problem`).
 * A rule with no `condition` applies unconditionally.
 */
export type PlacementConstraintRule = {
  readonly subject: CanonicalResourceIdentityAttribute;
  readonly condition?: PlacementConstraintCondition;
} & PlacementConstraintOperator;

/**
 * A single Placement Constraint entry (see
 * `specification/resource-definition.md#structured-placement-constraints-specification-v12`).
 *
 * `statement` is always present and human-readable. `rule` is present only when the
 * constraint can be evaluated from Resource Identity alone; a constraint with no
 * `rule` remains exactly as executable as a v1.1 free-form string — descriptive only,
 * contributing no automated validation outcome.
 */
export interface PlacementConstraint {
  readonly statement: string;
  readonly rule?: PlacementConstraintRule;
}
