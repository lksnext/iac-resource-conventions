// Runtime tests for Resource Projection (Milestone 2.5: Resource Projection). See
// docs/architecture/reference-evaluator.md and
// specification/convention-pack.md#naming-projections,
// specification/convention-pack.md#required-attributes,
// specification/resource-identity.md for the rules exercised below.
//
// `projectResource` is an internal evaluator function, not exported from the package
// root (see ../types/resource-projection-fixtures.ts for the compile-time proof of
// that boundary). It is imported here directly from the built `dist/evaluator/`
// output by relative path, the same way ./context-resolution.test.mjs and
// ./governance-resolution.test.mjs reach into `dist/` directly.
//
// Fixtures are neutral and fictional. They exercise Resource Projection only — no
// normalization, abbreviation application, separator insertion, casing, truncation,
// metadata (tags/labels/annotations) generation, or final name rendering is exercised
// or implied; those remain later Convention Evaluation responsibilities.

import assert from "node:assert/strict";
import { test } from "node:test";
import { projectResource } from "../../dist/evaluator/resource-projection/index.js";

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
}

// --- Ordering and inclusion (specification/convention-pack.md#naming-projections) ---

test("projection orders components exactly as declared by naming_component_order", () => {
  const resourceIdentity = deepFreeze({
    organizational: { system: "telemetry-platform" },
    deployment: { environment: "production" },
    functional: { service: "ingestion" },
  });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: [
      "functional.service",
      "organizational.system",
      "deployment.environment",
    ],
  });

  const { components } = projectResource(resourceIdentity, conventionPack);

  assert.deepEqual(
    components.map((component) => component.attribute),
    ["functional.service", "organizational.system", "deployment.environment"],
  );
});

test("a present, optional component is included with its resolved value and plane", () => {
  const resourceIdentity = deepFreeze({ functional: { service: "ingestion" } });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: ["functional.service"],
  });

  const { components } = projectResource(resourceIdentity, conventionPack);

  assert.deepEqual(components, [
    { attribute: "functional.service", plane: "functional", value: "ingestion", required: false },
  ]);
});

test("a present, required component is included with required: true", () => {
  const resourceIdentity = deepFreeze({ organizational: { system: "telemetry-platform" } });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: ["organizational.system"],
    required_attributes: ["organizational.system"],
  });

  const { components } = projectResource(resourceIdentity, conventionPack);

  assert.deepEqual(components, [
    {
      attribute: "organizational.system",
      plane: "organizational",
      value: "telemetry-platform",
      required: true,
    },
  ]);
});

// --- Absence handling (specification/convention-pack.md#naming-projections) ---

test("an absent, optional component is omitted entirely", () => {
  const resourceIdentity = deepFreeze({ functional: { service: "ingestion" } });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: ["functional.service", "deployment.location"],
  });

  const { components } = projectResource(resourceIdentity, conventionPack);

  assert.deepEqual(
    components.map((component) => component.attribute),
    ["functional.service"],
  );
});

test("an absent, required component is still included, with value undefined, not silently omitted", () => {
  const resourceIdentity = deepFreeze({ functional: { service: "ingestion" } });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: ["functional.service", "deployment.environment"],
    required_attributes: ["deployment.environment"],
  });

  const { components } = projectResource(resourceIdentity, conventionPack);

  assert.deepEqual(components, [
    { attribute: "functional.service", plane: "functional", value: "ingestion", required: false },
    { attribute: "deployment.environment", plane: "deployment", value: undefined, required: true },
  ]);
});

test("an unrecognized naming_component_order entry is omitted, regardless of required_attributes", () => {
  const resourceIdentity = deepFreeze({ functional: { service: "ingestion" } });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: ["functional.service", "governance.owner"],
    required_attributes: ["governance.owner"],
  });

  const { components } = projectResource(resourceIdentity, conventionPack);

  assert.deepEqual(
    components.map((component) => component.attribute),
    ["functional.service"],
  );
});

test("no naming_component_order declared projects no components", () => {
  const resourceIdentity = deepFreeze({ functional: { service: "ingestion" } });
  const conventionPack = deepFreeze({ id: "test-pack" });

  const { components } = projectResource(resourceIdentity, conventionPack);

  assert.deepEqual(components, []);
});

// --- Values are copied verbatim: no normalization, abbreviation, or rendering ----

test("projection does not apply an abbreviation, even when one is declared for a component", () => {
  const resourceIdentity = deepFreeze({ deployment: { environment: "production" } });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: ["deployment.environment"],
    abbreviations: { "deployment.environment": "env" },
  });

  const { components } = projectResource(resourceIdentity, conventionPack);

  assert.equal(components[0].value, "production");
});

test("projection produces no rendered name or metadata: only a components array", () => {
  const resourceIdentity = deepFreeze({ functional: { service: "ingestion" } });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: ["functional.service"],
  });

  const projected = projectResource(resourceIdentity, conventionPack);

  assert.deepEqual(Object.keys(projected), ["components"]);
});

// --- Purity and determinism ------------------------------------------------------

test("projection does not mutate its inputs", () => {
  const resourceIdentity = deepFreeze({
    organizational: { system: "telemetry-platform" },
    functional: { service: "ingestion" },
  });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: ["organizational.system", "functional.service"],
    required_attributes: ["organizational.system"],
  });

  assert.doesNotThrow(() => projectResource(resourceIdentity, conventionPack));
});

test("projection is deterministic: the same inputs always produce the same result", () => {
  const resourceIdentity = deepFreeze({
    organizational: { system: "telemetry-platform" },
    deployment: { environment: "production" },
    functional: { service: "ingestion" },
  });
  const conventionPack = deepFreeze({
    id: "test-pack",
    naming_component_order: [
      "organizational.system",
      "functional.service",
      "deployment.environment",
    ],
  });

  const first = projectResource(resourceIdentity, conventionPack);
  const second = projectResource(resourceIdentity, conventionPack);

  assert.deepEqual(first, second);
});
