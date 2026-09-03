// Public entry point for @lksnext/iac-conventions-catalog.
//
// A static, immutable catalog of two separate artifact families (Milestone 3.1:
// Resource Definitions; Milestone 4.2: Convention Packs), each with its own lookup
// API, keyed by its own identifier:
//
//   ResourceType       -> getResourceDefinition -> ResourceDefinition
//   ConventionPackId   -> getConventionPack     -> ConventionPack
//
// A caller passes both, alongside a NamingRequest and EvaluationContext, to
// @lksnext/iac-conventions-core's evaluate(). The catalog performs no evaluation
// itself — see docs/architecture/resource-definition-catalog.md and
// docs/architecture/convention-pack-catalog.md for the full architecture and package
// boundary rationale.

import type {
  ConventionPack,
  ConventionPackId,
  ResourceDefinition,
  ResourceType,
} from "@lksnext/iac-conventions-core";
import { AWS_ACM_CERTIFICATE } from "./aws/acm-certificate.js";
import { AWS_IAM_ROLE } from "./aws/iam-role.js";
import { AWS_LAMBDA_FUNCTION } from "./aws/lambda-function.js";
import { AWS_S3_BUCKET } from "./aws/s3-bucket.js";
import { AWS_WORKLOAD_DEFAULT } from "./convention-packs/aws-workload-default.js";
import { deepFreeze } from "./internal/deep-freeze.js";

/**
 * Every catalog entry, keyed by its own `resource_type` (enforced by
 * `test/runtime/catalog.test.mjs`'s identity-invariant test, since TypeScript's index
 * signature alone cannot express "this object's key equals this value's field"). This
 * is the single source of truth `getResourceDefinition`/`listResourceTypes` both
 * derive from — no separate `resourceTypes`/`awsResources` array is kept in sync by
 * hand.
 *
 * Each individual definition (for example, `AWS_S3_BUCKET`) is already deep-frozen at
 * its own definition site (see `./internal/deep-freeze.ts`); `deepFreeze` is applied
 * again here to the outer map itself, since the map object is a value in its own
 * right, distinct from any entry it contains.
 */
const resourceDefinitions: Readonly<Record<ResourceType, ResourceDefinition>> = deepFreeze({
  [AWS_ACM_CERTIFICATE.resource_type]: AWS_ACM_CERTIFICATE,
  [AWS_IAM_ROLE.resource_type]: AWS_IAM_ROLE,
  [AWS_LAMBDA_FUNCTION.resource_type]: AWS_LAMBDA_FUNCTION,
  [AWS_S3_BUCKET.resource_type]: AWS_S3_BUCKET,
});

/**
 * Looks up the {@link ResourceDefinition} for a canonical `resourceType`.
 *
 * Returns `undefined` for an unknown resource type rather than throwing: an unknown
 * resource type is an expected, recoverable outcome for a caller (for example, a CLI
 * validating user input), not an exceptional condition, and this repository avoids
 * introducing a custom exception hierarchy for it.
 */
export function getResourceDefinition(resourceType: ResourceType): ResourceDefinition | undefined {
  return resourceDefinitions[resourceType];
}

/**
 * Lists every canonical `ResourceType` known to the catalog, in lexical order.
 *
 * Lexical order is used because the catalog defines no other ordering with domain
 * meaning; it also keeps the result deterministic across catalog growth.
 */
export function listResourceTypes(): ReadonlyArray<ResourceType> {
  return Object.keys(resourceDefinitions).sort();
}

/**
 * Every executable Convention Pack, keyed by its own `id` (enforced by
 * `test/runtime/convention-pack-catalog.test.mjs`'s identity-invariant test, the same
 * pattern as `resourceDefinitions` above). Deliberately a separate map, not merged
 * with `resourceDefinitions` into one generic registry: Resource Definitions and
 * Convention Packs are distinct Specification concepts, keyed by different identifier
 * types (`ResourceType` versus `ConventionPackId`), and combining them would obscure
 * that distinction for no current benefit (see
 * docs/architecture/convention-pack-catalog.md#package-ownership).
 */
const conventionPacks: Readonly<Record<ConventionPackId, ConventionPack>> = deepFreeze({
  [AWS_WORKLOAD_DEFAULT.id]: AWS_WORKLOAD_DEFAULT,
});

/**
 * Looks up the {@link ConventionPack} for a `conventionPackId`.
 *
 * Returns `undefined` for an unknown id rather than throwing, consistent with
 * {@link getResourceDefinition}: an unknown Convention Pack id is an expected,
 * recoverable outcome for a caller, not an exceptional condition.
 */
export function getConventionPack(conventionPackId: ConventionPackId): ConventionPack | undefined {
  return conventionPacks[conventionPackId];
}

/**
 * Lists every `ConventionPackId` known to the catalog, in lexical order, consistent
 * with {@link listResourceTypes}.
 */
export function listConventionPackIds(): ReadonlyArray<ConventionPackId> {
  return Object.keys(conventionPacks).sort();
}
