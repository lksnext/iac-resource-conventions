// Runtime tests for Context Resolution's Governance Context resolution (Milestone 2.3:
// Context Resolution — Governance Context). See docs/architecture/reference-evaluator.md
// and specification/context-resolution.md, specification/naming-request.md,
// specification/governance-context.md, specification/convention-pack.md for the rules
// exercised below.
//
// `resolveGovernanceContext` is an internal evaluator function, not exported from the
// package root (see ../types/governance-resolution-fixtures.ts for the compile-time
// proof of that boundary). It is imported here directly from the built `dist/evaluator/`
// output by relative path, the same way ./context-resolution.test.mjs and
// ./build-artifact.test.mjs reach into `dist/` directly, bypassing package.json#exports.
//
// Fixtures are neutral and fictional. They exercise Governance Context resolution rules
// only — no naming rendering, Resource Definition selection, or Convention Evaluation is
// exercised or implied.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveGovernanceContext,
  resolveResourceIdentity,
} from "../../dist/evaluator/context-resolution/index.js";

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

// --- Explicit governance selection / precedence (specification/context-resolution.md#resolution-precedence) ---

test("governance precedence: Convention Pack governance_defaults are used when no other source supplies a value", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      governance_defaults: { owner: "platform-team", profile: "standard" },
    },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.equal(governance_context.owner, "platform-team");
  assert.equal(governance_context.profile, "standard");
  assert.deepEqual(diagnostics, []);
});

test("governance precedence: Naming Request governance values outrank Convention Pack governance_defaults", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      governance_defaults: { owner: "platform-team" },
    },
    naming_request: { governance: { owner: "billing-team" } },
  });
  const { governance_context } = resolveGovernanceContext(input);
  assert.equal(governance_context.owner, "billing-team");
});

test("governance precedence: override governance values outrank Naming Request governance values", () => {
  const input = baseInput({
    naming_request: {
      governance: { owner: "billing-team" },
      overrides: { governance: { owner: "legacy-owner" } },
    },
  });
  const { governance_context } = resolveGovernanceContext(input);
  assert.equal(governance_context.owner, "legacy-owner");
});

test("governance precedence: explicit profile selection on the Naming Request outranks the Convention Pack's default profile", () => {
  const input = baseInput({
    convention_pack: { id: "test-pack", governance_defaults: { profile: "standard" } },
    naming_request: { governance: { profile: "restricted" } },
  });
  const { governance_context } = resolveGovernanceContext(input);
  assert.equal(governance_context.profile, "restricted");
});

// --- Evaluation Context / Governance Profile defaults: documented, not implemented ---

test("Evaluation Context contributes no governance candidate: shared and runtime context values do not affect governance resolution", () => {
  const input = baseInput({
    convention_pack: { id: "test-pack", governance_defaults: { owner: "platform-team" } },
    evaluation_context: {
      shared_organizational_context: { organization: "acme" },
      shared_deployment_context: { environment: "production" },
      runtime_context: { organizational: { organization: "acme-runtime" } },
    },
  });
  const { governance_context } = resolveGovernanceContext(input);
  // Only the Convention Pack default is a governance candidate in the current domain
  // model — no field on EvaluationContext, RuntimeContext, SharedOrganizationalContext,
  // or SharedDeploymentContext carries governance attributes.
  assert.equal(governance_context.owner, "platform-team");
});

test("a context_authority_rules entry for a governance attribute falls back to Convention Pack defaults, since no Evaluation Context source can supply governance", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      governance_defaults: { owner: "platform-team" },
      context_authority_rules: { "governance.owner": "runtime-context" },
    },
  });
  assert.doesNotThrow(() => resolveGovernanceContext(input));
  const { governance_context } = resolveGovernanceContext(input);
  assert.equal(governance_context.owner, "platform-team");
});

// --- Protection (specification/context-resolution.md#precedence-authority-and-protection) ---

test("protection: a conflicting Naming Request governance value is rejected and recorded as a diagnostic", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      governance_defaults: { cost_center: "cc-100" },
      override_policy: { protected_attributes: ["governance.cost_center"] },
    },
    naming_request: { governance: { cost_center: "cc-999" } },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.equal(governance_context.cost_center, "cc-100");
  assert.deepEqual(diagnostics, [
    {
      kind: "protected-value-conflict",
      attribute: "governance.cost_center",
      message:
        '"governance.cost_center" is protected by the selected Convention Pack; the Naming Request or override value was not applied.',
    },
  ]);
});

test("protection: a conflicting override governance value is rejected the same way as a conflicting Naming Request value", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      governance_defaults: { cost_center: "cc-100" },
      override_policy: { protected_attributes: ["governance.cost_center"] },
    },
    naming_request: { overrides: { governance: { cost_center: "cc-999" } } },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.equal(governance_context.cost_center, "cc-100");
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].kind, "protected-value-conflict");
});

test("protection: no diagnostic when the conflicting-precedence governance value actually matches the protected value", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      governance_defaults: { cost_center: "cc-100" },
      override_policy: { protected_attributes: ["governance.cost_center"] },
    },
    naming_request: { governance: { cost_center: "cc-100" } },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.equal(governance_context.cost_center, "cc-100");
  assert.deepEqual(diagnostics, []);
});

test("protection: a protected governance attribute with no Convention Pack default lets the Naming Request value through", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      override_policy: { protected_attributes: ["governance.owner"] },
    },
    naming_request: { governance: { owner: "billing-team" } },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.equal(governance_context.owner, "billing-team");
  assert.deepEqual(diagnostics, []);
});

test("protection: a governance attribute not listed as protected follows plain precedence with no diagnostic", () => {
  const input = baseInput({
    convention_pack: { id: "test-pack", governance_defaults: { owner: "platform-team" } },
    naming_request: { governance: { owner: "billing-team" } },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.equal(governance_context.owner, "billing-team");
  assert.deepEqual(diagnostics, []);
});

// --- Missing / absent governance information ---

test("a source that simply does not supply a governance value produces no diagnostic and no field", () => {
  const input = baseInput();
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.deepEqual(governance_context, {});
  assert.deepEqual(diagnostics, []);
});

test("required governance attributes: an unresolved required governance attribute is reported as a diagnostic, and Governance Context is still produced", () => {
  const input = baseInput({
    convention_pack: { id: "test-pack", required_attributes: ["governance.owner"] },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.equal(governance_context.owner, undefined);
  assert.deepEqual(diagnostics, [
    {
      kind: "unresolved-required-attribute",
      attribute: "governance.owner",
      message:
        '"governance.owner" is required by the selected Convention Pack but could not be resolved from any source.',
    },
  ]);
});

test("required governance attributes: no diagnostic once the required governance attribute is resolved", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      governance_defaults: { owner: "platform-team" },
      required_attributes: ["governance.owner"],
    },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.equal(governance_context.owner, "platform-team");
  assert.deepEqual(diagnostics, []);
});

// --- Governance unrelated to the resource scope ---

test("governance scope: a required/protected/authority entry for an unrelated (non-governance) attribute path does not affect governance resolution", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      required_attributes: ["deployment.platform"],
      override_policy: { protected_attributes: ["organizational.tenant"] },
      context_authority_rules: { "deployment.deployment_scope": "runtime-context" },
    },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.deepEqual(governance_context, {});
  assert.deepEqual(diagnostics, []);
});

test("governance scope: a Naming Request supplying only functional and organizational information produces no governance value", () => {
  const input = baseInput({
    naming_request: {
      resource_type: "aws_s3_bucket",
      functional: { service: "ingestion" },
      overrides: { organizational: { tenant: "customer-a" } },
    },
  });
  const { governance_context, diagnostics } = resolveGovernanceContext(input);
  assert.deepEqual(governance_context, {});
  assert.deepEqual(diagnostics, []);
});

// --- Determinism and immutability (specification/context-resolution.md#deterministic-behaviour) ---

test("determinism: the same input produces a structurally equal governance result across repeated calls", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      governance_defaults: { owner: "platform-team", cost_center: "cc-100" },
    },
    naming_request: { governance: { profile: "standard" } },
  });
  assert.deepEqual(resolveGovernanceContext(input), resolveGovernanceContext(input));
});

test("immutability: resolving governance does not mutate the Naming Request, Convention Pack, or Evaluation Context inputs", () => {
  const input = deepFreeze(
    baseInput({
      convention_pack: {
        id: "test-pack",
        governance_defaults: { owner: "platform-team" },
        override_policy: { protected_attributes: ["governance.owner"] },
      },
      naming_request: { governance: { owner: "billing-team" } },
    }),
  );
  assert.doesNotThrow(() => resolveGovernanceContext(input));
});

test("the result contains only governance_context and diagnostics", () => {
  const { governance_context, diagnostics, ...rest } = resolveGovernanceContext(baseInput());
  assert.deepEqual(Object.keys(rest), []);
  assert.equal(typeof governance_context, "object");
  assert.equal(Array.isArray(diagnostics), true);
});

// --- Integration with the output of Context Resolution's Resource Identity half ---

test("integration: resolveResourceIdentity and resolveGovernanceContext compose into the full Context Resolution result shape", () => {
  const input = baseInput({
    convention_pack: {
      id: "test-pack",
      identity_defaults: { organizational: { system: "billing" } },
      governance_defaults: { owner: "platform-team" },
    },
  });
  const { resource_identity } = resolveResourceIdentity(input);
  const { governance_context } = resolveGovernanceContext(input);
  const contextResolutionResult = { resource_identity, governance_context };

  assert.equal(contextResolutionResult.resource_identity.organizational.system, "billing");
  assert.equal(contextResolutionResult.governance_context.owner, "platform-team");
});

test("integration: governance resolution is independent of Resource Identity resolution — neither reads the other's input fields", () => {
  const identityOnlyInput = baseInput({
    naming_request: { functional: { service: "ingestion" } },
  });
  const governanceOnlyInput = baseInput({
    naming_request: { governance: { owner: "billing-team" } },
  });

  const { governance_context: governanceFromIdentityOnlyInput } =
    resolveGovernanceContext(identityOnlyInput);
  const { resource_identity: identityFromGovernanceOnlyInput } =
    resolveResourceIdentity(governanceOnlyInput);

  assert.deepEqual(governanceFromIdentityOnlyInput, {});
  assert.deepEqual(identityFromGovernanceOnlyInput, {});
});
