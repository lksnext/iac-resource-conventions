// Runtime tests for Context Resolution's Resource Identity resolution (Milestone 2.2:
// Context Resolution — Resource Identity). See docs/architecture/reference-evaluator.md
// and specification/context-resolution.md, specification/naming-request.md,
// specification/convention-pack.md for the rules exercised below.
//
// `resolveResourceIdentity` is an internal evaluator function, not exported from the
// package root (see ../types/evaluator-contract-fixtures.ts for the compile-time proof
// of that boundary). It is imported here directly from the built `dist/evaluator/`
// output by relative path, the same way ./build-artifact.test.mjs reaches into
// `dist/index.js` directly, bypassing package.json#exports (which only restricts
// imports by package name, not by direct relative file path).
//
// Fixtures are neutral and fictional. They exercise resolution rules only — no naming
// rendering, Governance Context resolution, Resource Definition selection, or
// Convention Evaluation is exercised or implied.

import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveResourceIdentity } from "../../dist/evaluator/context-resolution/index.js";

function baseInput(overrides = {}) {
  return {
    naming_request: {},
    convention_pack: { id: "test-pack" },
    evaluation_context: {},
    ...overrides,
  };
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
}

// --- Resolution precedence (specification/context-resolution.md#resolution-precedence) ---

test("resolution precedence: Convention Pack defaults are used when no other source supplies a value", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      identity_defaults: { organizational: { system: "billing" } },
    },
  });
  const { resource_identity, diagnostics } = resolveResourceIdentity(input);
  assert.equal(resource_identity.organizational.system, "billing");
  assert.deepEqual(diagnostics, []);
});

test("resolution precedence: Shared Organizational Context outranks Convention Pack defaults", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      identity_defaults: { organizational: { system: "billing" } },
    },
    evaluation_context: { shared_organizational_context: { system: "payments" } },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.organizational.system, "payments");
});

test("resolution precedence: Shared Deployment Context outranks Convention Pack defaults", () => {
  const input = baseInput({
    convention_pack: { id: "test-pack", identity_defaults: { deployment: { environment: "dev" } } },
    evaluation_context: { shared_deployment_context: { environment: "staging" } },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.deployment.environment, "staging");
});

test("resolution precedence: Runtime Context outranks Shared Organizational/Deployment Context", () => {
  const input = baseInput({
    evaluation_context: {
      shared_organizational_context: { system: "payments" },
      shared_deployment_context: { environment: "staging" },
      runtime_context: {
        organizational: { system: "checkout" },
        deployment: { environment: "production" },
      },
    },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.organizational.system, "checkout");
  assert.equal(resource_identity.deployment.environment, "production");
});

test("resolution precedence: Naming Request values outrank every context layer", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      identity_defaults: { functional: { service: "cp-default-service" } },
    },
    evaluation_context: {
      runtime_context: { deployment: { instance: "runtime-instance" } },
    },
    naming_request: {
      functional: { service: "checkout-api" },
      deployment: { instance: "request-instance" },
    },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.functional.service, "checkout-api");
  assert.equal(resource_identity.deployment.instance, "request-instance");
});

test("resolution precedence: override values outrank Naming Request values", () => {
  const input = baseInput({
    naming_request: {
      functional: { service: "checkout-api" },
      overrides: { functional: { service: "legacy-checkout" } },
    },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.functional.service, "legacy-checkout");
});

// --- Context authority rules (specification/convention-pack.md#context-authority-rules) ---

test("context authority: a declared authoritative source wins even when a higher-precedence context layer conflicts", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      context_authority_rules: { "deployment.environment": "shared-deployment-context" },
    },
    evaluation_context: {
      shared_deployment_context: { environment: "staging" },
      runtime_context: { deployment: { environment: "production" } },
    },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.deployment.environment, "staging");
});

test("context authority: falls back to plain precedence when the declared authoritative source has no value", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      context_authority_rules: { "deployment.environment": "shared-deployment-context" },
    },
    evaluation_context: {
      runtime_context: { deployment: { environment: "production" } },
    },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.deployment.environment, "production");
});

test("context authority: a 'provisioning-context' authority label matches the same runtime_context field as 'runtime-context'", () => {
  // Provisioning Context is a specialization of Runtime Context with no distinguishing
  // field in the domain model (see ../../src/model/contexts/evaluation-context.ts):
  // both authority labels must resolve against evaluation_context.runtime_context.
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      context_authority_rules: { "organizational.tenant": "provisioning-context" },
    },
    evaluation_context: {
      shared_organizational_context: { tenant: "shared-tenant" },
      runtime_context: { organizational: { tenant: "provisioned-tenant" } },
    },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.organizational.tenant, "provisioned-tenant");
});

// --- Protection (specification/context-resolution.md#precedence-authority-and-protection) ---

test("protection: a conflicting Naming Request value is rejected and recorded as a diagnostic", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      override_policy: { protected_attributes: ["organizational.tenant"] },
    },
    evaluation_context: { runtime_context: { organizational: { tenant: "provisioned-tenant" } } },
    naming_request: { overrides: { organizational: { tenant: "caller-supplied-tenant" } } },
  });
  const { resource_identity, diagnostics } = resolveResourceIdentity(input);
  assert.equal(resource_identity.organizational.tenant, "provisioned-tenant");
  assert.deepEqual(diagnostics, [
    {
      kind: "protected-value-conflict",
      attribute: "organizational.tenant",
      message:
        '"organizational.tenant" is protected by the selected Convention Pack; the Naming Request or override value was not applied.',
    },
  ]);
});

test("protection: a conflicting override value is rejected the same way as a conflicting Naming Request value", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      override_policy: { protected_attributes: ["deployment.deployment_scope"] },
    },
    evaluation_context: {
      runtime_context: { deployment: { deployment_scope: "tenant-a-production" } },
    },
    naming_request: { overrides: { deployment: { deployment_scope: "unauthorized-scope" } } },
  });
  const { resource_identity, diagnostics } = resolveResourceIdentity(input);
  assert.equal(resource_identity.deployment.deployment_scope, "tenant-a-production");
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].kind, "protected-value-conflict");
  assert.equal(diagnostics[0].attribute, "deployment.deployment_scope");
});

test("protection: no diagnostic when the conflicting-precedence value actually matches the protected value", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      override_policy: { protected_attributes: ["organizational.tenant"] },
    },
    evaluation_context: { runtime_context: { organizational: { tenant: "same-tenant" } } },
    naming_request: { overrides: { organizational: { tenant: "same-tenant" } } },
  });
  const { resource_identity, diagnostics } = resolveResourceIdentity(input);
  assert.equal(resource_identity.organizational.tenant, "same-tenant");
  assert.deepEqual(diagnostics, []);
});

test("protection: a protected attribute with no context-layer value lets the Naming Request value through", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      override_policy: { protected_attributes: ["organizational.tenant"] },
    },
    naming_request: { overrides: { organizational: { tenant: "caller-supplied-tenant" } } },
  });
  const { resource_identity, diagnostics } = resolveResourceIdentity(input);
  assert.equal(resource_identity.organizational.tenant, "caller-supplied-tenant");
  assert.deepEqual(diagnostics, []);
});

test("protection: an attribute not listed as protected follows plain precedence with no diagnostic", () => {
  const input = baseInput({
    evaluation_context: { runtime_context: { organizational: { tenant: "runtime-tenant" } } },
    naming_request: { overrides: { organizational: { tenant: "caller-tenant" } } },
  });
  const { resource_identity, diagnostics } = resolveResourceIdentity(input);
  assert.equal(resource_identity.organizational.tenant, "caller-tenant");
  assert.deepEqual(diagnostics, []);
});

// --- Absent vs. conflicting values ---

test("a source that simply does not supply a value produces no diagnostic and no field", () => {
  const { resource_identity, diagnostics } = resolveResourceIdentity(baseInput());
  assert.deepEqual(resource_identity, {});
  assert.deepEqual(diagnostics, []);
});

// --- Required attributes (specification/convention-pack.md#required-attributes) ---

test("required attributes: an unresolved required attribute is reported as a diagnostic, and Resource Identity is still produced", () => {
  const input = baseInput({
    convention_pack: { id: "test-pack", required_attributes: ["organizational.system"] },
    naming_request: { functional: { service: "checkout-api" } },
  });
  const { resource_identity, diagnostics } = resolveResourceIdentity(input);
  assert.equal(resource_identity.organizational, undefined);
  assert.equal(resource_identity.functional.service, "checkout-api");
  assert.deepEqual(diagnostics, [
    {
      kind: "unresolved-required-attribute",
      attribute: "organizational.system",
      message:
        '"organizational.system" is required by the selected Convention Pack but could not be resolved from any source.',
    },
  ]);
});

test("required attributes: no diagnostic once the required attribute is resolved", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      required_attributes: ["organizational.system"],
      identity_defaults: { organizational: { system: "billing" } },
    },
  });
  const { diagnostics } = resolveResourceIdentity(input);
  assert.deepEqual(diagnostics, []);
});

// --- `resource_type` top-level convenience field (specification/naming-request.md) ---

test("functional.resource_type resolves from the Naming Request's top-level resource_type, not a nested field", () => {
  const input = baseInput({
    naming_request: { resource_type: "s3-bucket" },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.functional.resource_type, "s3-bucket");
});

// --- deployment.instance is the one Deployment Identity field the Naming Request itself supplies ---

test("deployment.instance may be supplied directly on the Naming Request", () => {
  const input = baseInput({
    naming_request: { deployment: { instance: "02" } },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  assert.equal(resource_identity.deployment.instance, "02");
});

// --- Determinism and immutability (specification/context-resolution.md#deterministic-behaviour) ---

test("determinism: the same input produces a structurally equal result across repeated calls", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      identity_defaults: { organizational: { system: "billing" } },
    },
    evaluation_context: { runtime_context: { deployment: { environment: "production" } } },
    naming_request: { functional: { service: "checkout-api" }, resource_type: "s3-bucket" },
  });
  const first = resolveResourceIdentity(input);
  const second = resolveResourceIdentity(input);
  assert.deepEqual(first, second);
});

test("immutability: resolving does not mutate the Naming Request, Convention Pack, or Evaluation Context inputs", () => {
  const input = deepFreeze(
    baseInput({
      convention_pack: {
        id: "test-pack",
        identity_defaults: { organizational: { system: "billing" } },
        override_policy: { protected_attributes: ["organizational.system"] },
      },
      evaluation_context: {
        shared_organizational_context: { system: "payments" },
        runtime_context: { organizational: { tenant: "provisioned-tenant" } },
      },
      naming_request: {
        functional: { service: "checkout-api" },
        overrides: { organizational: { system: "conflicting-system" } },
      },
    }),
  );

  // deepFreeze makes any mutation attempt throw in strict mode (ESM modules are
  // always strict), so simply calling the function under test is the assertion.
  assert.doesNotThrow(() => resolveResourceIdentity(input));
});

// --- Output shape: this increment does not produce Governance Context ---

test("the result contains only resource_identity and diagnostics, not a governance_context", () => {
  const result = resolveResourceIdentity(baseInput());
  assert.deepEqual(Object.keys(result).sort(), ["diagnostics", "resource_identity"]);
});
