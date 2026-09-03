import type {
  ConventionValidationFailure,
  PlacementConstraintCondition,
  PlacementConstraintOperator,
  PlacementConstraintRule,
  ResourceDefinition,
  ResourceIdentity,
} from "../../../model/index.js";
import { resolveCanonicalResourceIdentityAttribute } from "../../resource-projection/canonical-resource-identity-attribute.js";

/**
 * Applies the closed `equals`/`present`/`absent` operator vocabulary (see
 * `specification/resource-definition.md#placement-operator-vocabulary`) to a resolved
 * canonical attribute value. Never branches on `resource_type` or any provider
 * literal — only the generic `operator`/`value` structure is interpreted, exactly as
 * `max_length` is interpreted without knowing which resource type declared it (see
 * `specification/resource-definition.md#provider-literals-never-provider-branches`).
 */
function evaluateOperator(
  resolvedValue: string | undefined,
  operator: PlacementConstraintOperator,
): boolean {
  switch (operator.operator) {
    case "equals":
      return resolvedValue === operator.value;
    case "present":
      return resolvedValue !== undefined;
    case "absent":
      return resolvedValue === undefined;
  }
}

function evaluateCondition(
  resourceIdentity: ResourceIdentity,
  condition: PlacementConstraintCondition,
): boolean {
  const resolvedValue = resolveCanonicalResourceIdentityAttribute(
    resourceIdentity,
    condition.subject,
  );
  return evaluateOperator(resolvedValue, condition);
}

/**
 * Evaluates one executable `rule` against the resolved `resourceIdentity`. A `rule`
 * with a `condition` that evaluates to `false` is skipped entirely — it contributes
 * no failure and no warning (see
 * `specification/resource-definition.md#the-conditional-input-problem`). A `rule`
 * with no `condition` applies unconditionally.
 */
function evaluateRule(
  resourceIdentity: ResourceIdentity,
  rule: PlacementConstraintRule,
): ConventionValidationFailure | undefined {
  if (rule.condition !== undefined && !evaluateCondition(resourceIdentity, rule.condition)) {
    return undefined;
  }

  const resolvedValue = resolveCanonicalResourceIdentityAttribute(resourceIdentity, rule.subject);
  if (evaluateOperator(resolvedValue, rule)) {
    return undefined;
  }

  return {
    message: `resolved Resource Identity does not satisfy the Placement Constraint rule for "${rule.subject}"`,
    code: "placement",
  };
}

/**
 * Validates the resolved `resourceIdentity` against every executable `rule` declared
 * by `resourceDefinition`'s `placement_constraints` (Specification v1.2 step 6, see
 * `specification/resource-definition.md#constraint-validation-order-specification-v12`),
 * in the array's declaration order. A `PlacementConstraint` with no `rule` remains
 * descriptive only and contributes no automated outcome.
 */
export function validatePlacementConstraints(
  resourceIdentity: ResourceIdentity,
  resourceDefinition: ResourceDefinition,
): ConventionValidationFailure[] {
  const failures: ConventionValidationFailure[] = [];

  for (const constraint of resourceDefinition.placement_constraints ?? []) {
    if (constraint.rule === undefined) {
      continue;
    }

    const failure = evaluateRule(resourceIdentity, constraint.rule);
    if (failure !== undefined) {
      failures.push(failure);
    }
  }

  return failures;
}
