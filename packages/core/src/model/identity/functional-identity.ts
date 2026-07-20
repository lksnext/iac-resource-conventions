import type { ResourceType } from "../common/identifiers.js";

/**
 * Plane 3 of Resource Identity: Functional Identity.
 *
 * Answers "what does this resource do?" by describing the resource's purpose and role
 * within the systems it belongs to. `service` is intentionally broader than a
 * microservice; `component` is an optional subdivision of it; `resource_type` is the
 * canonical technical resource kind used to select the resource's Resource Definition.
 *
 * See `specification/resource-identity.md` and
 * `specification/schemas/resource-identity.schema.json`.
 */
export interface FunctionalIdentity {
  /** Logical workload, subsystem, or deployable capability within the system. */
  readonly service?: string;

  /** Optional functional role or subcomponent within the service. */
  readonly component?: string;

  /** Canonical technical resource kind used to select its Resource Definition. */
  readonly resource_type?: ResourceType;
}
