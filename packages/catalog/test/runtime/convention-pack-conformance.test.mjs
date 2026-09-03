// Runtime tests for the internal Convention Pack conformance validator (Milestone 4.2).
// See docs/architecture/convention-pack-catalog.md#conformance and
// packages/catalog/src/internal/validate-convention-pack.ts.
//
// `validateConventionPack`/`validateCatalogConventionPackEntries` are internal-only
// (never exported from the package root — see packages/catalog/src/index.ts), so this
// file imports them directly from the built `dist/internal/` output, the same way
// `test/runtime/conformance.test.mjs` does for the Resource Definition validator.

import assert from "node:assert/strict";
import { test } from "node:test";
import { getConventionPack, listConventionPackIds } from "../../dist/index.js";
import {
  validateCatalogConventionPackEntries,
  validateConventionPack,
} from "../../dist/internal/validate-convention-pack.js";

// --- The current catalog is conformant -----------------------------------------------

test("every current ConventionPack passes conformance validation with zero issues", () => {
  for (const conventionPackId of listConventionPackIds()) {
    const pack = getConventionPack(conventionPackId);
    assert.deepEqual(
      validateConventionPack(pack),
      [],
      `${conventionPackId}: expected zero conformance issues`,
    );
  }
});

test("the current catalog registration passes validateCatalogConventionPackEntries with zero issues", () => {
  const entries = listConventionPackIds().map((key) => ({ key, pack: getConventionPack(key) }));
  assert.deepEqual(validateCatalogConventionPackEntries(entries), []);
});

// --- Negative fixtures ------------------------------------------------------------------

function fixture(overrides) {
  return { id: "test-pack", ...overrides };
}

test("a naming_component_order reference outside the canonical vocabulary is reported", () => {
  const issues = validateConventionPack(
    fixture({ naming_component_order: ["organizational.system", "functional.not_a_real_field"] }),
  );
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "naming_component_order[1]",
      message:
        '"functional.not_a_real_field" is not a canonical Resource Identity attribute reference',
    },
  ]);
});

test("a naming_component_order duplicate reference is reported", () => {
  const issues = validateConventionPack(
    fixture({
      naming_component_order: ["organizational.system", "organizational.system"],
    }),
  );
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "naming_component_order[1]",
      message: '"organizational.system" is referenced more than once',
    },
  ]);
});

test("naming_component_order with every reference present and unique passes", () => {
  assert.deepEqual(
    validateConventionPack(
      fixture({
        naming_component_order: ["organizational.system", "functional.service"],
      }),
    ),
    [],
  );
});

test("an unsupported casing value is reported", () => {
  const issues = validateConventionPack(fixture({ casing: "camelCase" }));
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "casing",
      message: '"camelCase" is not "preserve", "lower", or "upper"',
    },
  ]);
});

for (const casing of ["preserve", "lower", "upper"]) {
  test(`casing: ${casing} is valid`, () => {
    assert.deepEqual(validateConventionPack(fixture({ casing })), []);
  });
}

test("an abbreviations outer key outside the canonical vocabulary is reported", () => {
  const issues = validateConventionPack(
    fixture({ abbreviations: { "functional.not_a_real_field": { x: "y" } } }),
  );
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "abbreviations.functional.not_a_real_field",
      message:
        '"functional.not_a_real_field" is not a canonical Resource Identity attribute reference',
    },
  ]);
});

test("an abbreviations mapped value that is empty is reported", () => {
  const issues = validateConventionPack(
    fixture({ abbreviations: { "deployment.environment": { production: "" } } }),
  );
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "abbreviations.deployment.environment.production",
      message: "must be a non-empty string",
    },
  ]);
});

test("an unrecognized context_authority_rules source is reported", () => {
  const issues = validateConventionPack(
    fixture({ context_authority_rules: { "organizational.system": "not-a-real-source" } }),
  );
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "context_authority_rules.organizational.system",
      message: '"not-a-real-source" is not a recognized Evaluation Context source',
    },
  ]);
});

for (const source of [
  "shared-organizational-context",
  "shared-deployment-context",
  "runtime-context",
  "provisioning-context",
]) {
  test(`context_authority_rules source: ${source} is valid`, () => {
    assert.deepEqual(
      validateConventionPack(
        fixture({ context_authority_rules: { "organizational.system": source } }),
      ),
      [],
    );
  });
}

test("an empty required_attributes entry is reported", () => {
  const issues = validateConventionPack(fixture({ required_attributes: [""] }));
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "required_attributes[0]",
      message: "must not be empty",
    },
  ]);
});

test("an attribute listed as both overridable and protected is reported", () => {
  const issues = validateConventionPack(
    fixture({
      override_policy: {
        overridable_attributes: ["deployment.location"],
        protected_attributes: ["deployment.location"],
      },
    }),
  );
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "override_policy",
      message: '"deployment.location" cannot be both overridable and protected',
    },
  ]);
});

// --- Registration invariants -------------------------------------------------------------

test("a mismatched catalog key is reported", () => {
  const issues = validateCatalogConventionPackEntries([
    { key: "wrong-key", pack: fixture({ id: "test-pack" }) },
  ]);
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "id",
      message: 'catalog key "wrong-key" must equal pack.id',
    },
  ]);
});

test("a duplicate id across two entries is reported", () => {
  const issues = validateCatalogConventionPackEntries([
    { key: "test-pack", pack: fixture({ id: "test-pack" }) },
    { key: "test-pack", pack: fixture({ id: "test-pack" }) },
  ]);
  assert.deepEqual(issues, [
    {
      convention_pack_id: "test-pack",
      path: "id",
      message: 'duplicate id "test-pack" registered more than once',
    },
  ]);
});
