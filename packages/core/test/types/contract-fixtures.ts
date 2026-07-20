// Compile-time only contract fixtures for the Executable Domain Model.
//
// This file is never executed and is not part of the published package: it is
// type-checked with `noEmit` via ../../tsconfig.test.json, and
// packages/core/package.json#files restricts the published tarball to `dist/` only.
// It exists to prove, at compile time, that the model's public contracts accept
// representative valid compositions and reject representative invalid ones (see the
// "Tests" section of this milestone's task and IMPLEMENTATION.md's testing strategy).
//
// Values below are minimal, neutral, and fictional. They do not encode a naming
// algorithm, assert a generated name, or imply any Reference Evaluator behavior.

import type {
  ConventionPack,
  ConventionResult,
  EvaluationContext,
  GovernanceContext,
  NamingRequest,
  ProvisioningContext,
  ResourceDefinition,
  ResourceIdentity,
  RuntimeContext,
} from "../../src/model/index.js";

// --- Valid contract compositions -------------------------------------------------

// Every Resource Identity, Naming Request, and Governance Context attribute is
// optional at the schema level (see specification/schemas/*.schema.json); an empty
// object is a valid instance of each.
export const emptyIdentity: ResourceIdentity = {};
export const emptyRequest: NamingRequest = {};
export const emptyGovernance: GovernanceContext = {};

export const minimalRequest: NamingRequest = {
  convention: "aws-workload-default",
  resource_type: "aws_s3_bucket",
  functional: {
    service: "ingestion",
  },
};

export const detailedRequest: NamingRequest = {
  convention: "aws-workload-default",
  resource_type: "aws_s3_bucket",
  functional: {
    service: "ingestion",
    component: "storage",
  },
  deployment: {
    instance: "01",
  },
  governance: {
    owner: "platform-team",
    profile: "standard",
  },
  overrides: {
    deployment: {
      location: "us-east-1",
    },
  },
};

export const resolvedIdentity: ResourceIdentity = {
  organizational: {
    system: "telemetry-platform",
  },
  deployment: {
    platform: "aws",
    deployment_scope: "workload-prod",
    environment: "production",
    location: "us-east-1",
  },
  functional: {
    service: "ingestion",
    component: "storage",
    resource_type: "aws_s3_bucket",
  },
};

export const resolvedGovernance: GovernanceContext = {
  owner: "platform-team",
  managed_by: "terraform",
  cost_center: "cc-1234",
  profile: "standard",
};

export const evaluationContext: EvaluationContext = {
  shared_organizational_context: {
    organization: "example-corp",
    business_unit: "platform",
  },
  shared_deployment_context: {
    platform: "aws",
    deployment_scope: "workload-prod",
  },
  runtime_context: {
    provider_scope_id: "123456789012",
  },
};

// A ProvisioningContext is structurally assignable wherever a RuntimeContext is
// expected, matching the Specification's "every Provisioning Context is Runtime
// Context" relationship (see specification/context-resolution.md).
export const provisioningContext: ProvisioningContext = {
  deployment: {
    deployment_scope: "workload-prod",
  },
  provider_scope_id: "123456789012",
};
export const runtimeContextFromProvisioning: RuntimeContext = provisioningContext;

export const resourceDefinition: ResourceDefinition = {
  resource_type: "aws_s3_bucket",
  platform: "aws",
  category: "storage",
  identity_constraints: {
    unique: true,
    uniqueness_scope: "global",
    global: false,
  },
  rendering_constraints: {
    max_length: 63,
    allowed_characters: "lowercase letters, digits, and hyphens",
  },
  placement_constraints: ["regional; location chosen by the deployment"],
};

export const conventionPack: ConventionPack = {
  id: "aws-workload-default",
  identity_defaults: {
    deployment: {
      platform: "aws",
    },
  },
  required_attributes: [
    "organizational.system",
    "deployment.environment",
    "functional.resource_type",
  ],
  naming_component_order: ["organizational.system", "functional.service", "deployment.environment"],
  abbreviations: {
    environment: "env",
  },
  context_authority_rules: {
    "deployment.deployment_scope": "provisioning-context",
  },
  override_policy: {
    protected_attributes: ["organizational.organization", "deployment.deployment_scope"],
  },
};

export const conventionResult: ConventionResult = {
  resource_identity: resolvedIdentity,
  governance_context: resolvedGovernance,
  outputs: {
    name: "telemetry-platform-ingestion-production-storage-s3",
    metadata: {
      tags: {
        system: "telemetry-platform",
      },
    },
  },
  validation: {
    valid: true,
  },
  warnings: [{ message: "deployment.location was normalized to lowercase" }],
};

// --- Compile-time rejection of invalid structures --------------------------------

export const identityWithUnknownAttribute: ResourceIdentity = {
  // @ts-expect-error -- unknown attributes are not part of Resource Identity's schema
  // (additionalProperties: false; see specification/schemas/resource-identity.schema.json).
  unknown_attribute: "not-a-real-attribute",
};

export const governanceWithWrongType: GovernanceContext = {
  // @ts-expect-error -- owner must be a string; the Specification does not model
  // Governance Context attributes as numbers.
  owner: 42,
};

export const governanceWithNull: GovernanceContext = {
  // @ts-expect-error -- `null` is not a substitute for omission; an absent attribute
  // must be omitted, not set to null (see this milestone's optionality rules).
  owner: null,
};

// @ts-expect-error -- Resource Identity's planes are readonly; a resolved identity
// must not be mutated in place.
resolvedIdentity.organizational = { system: "different-system" };

// @ts-expect-error -- `required_attributes` is a ReadonlyArray; consumers must not
// mutate a Convention Pack's declared attribute list.
conventionPack.required_attributes?.push("organizational.business_unit");
