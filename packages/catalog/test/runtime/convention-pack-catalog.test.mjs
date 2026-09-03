// Runtime tests for the Convention Pack Catalog's lookup API and pack integrity
// (Milestone 4.2: Executable Convention Pack Catalog). See
// docs/architecture/convention-pack-catalog.md and specification/convention-pack.md.
//
// `getConventionPack`/`listConventionPackIds` are imported from the built package root
// (`dist/index.js`), the same way `test/runtime/catalog.test.mjs` reaches into this
// package's own `dist/index.js` for its Resource Definition lookup API.

import assert from "node:assert/strict";
import { test } from "node:test";
import { getConventionPack, listConventionPackIds } from "../../dist/index.js";

// --- Lookup semantics ---------------------------------------------------------------

test("a known convention pack id returns its ConventionPack", () => {
  const pack = getConventionPack("aws-workload-default");

  assert.ok(pack, "expected a ConventionPack for a known id");
  assert.equal(pack.id, "aws-workload-default");
});

test("an unknown convention pack id returns undefined, not an exception", () => {
  assert.equal(getConventionPack("no-such-convention-pack"), undefined);
});

test("lookup is deterministic across repeated calls", () => {
  assert.deepEqual(
    getConventionPack("aws-workload-default"),
    getConventionPack("aws-workload-default"),
  );
});

// --- Immutability ---------------------------------------------------------------------

test("a returned ConventionPack cannot be mutated by the caller", () => {
  const pack = getConventionPack("aws-workload-default");

  assert.throws(() => {
    pack.id = "tampered";
  });
});

test("a returned ConventionPack's naming_component_order array cannot be mutated", () => {
  const pack = getConventionPack("aws-workload-default");
  const originalLength = pack.naming_component_order.length;

  assert.throws(() => {
    pack.naming_component_order.push("functional.service");
  });
  assert.equal(pack.naming_component_order.length, originalLength);
});

test("a returned ConventionPack's nested abbreviations map cannot be mutated", () => {
  const pack = getConventionPack("aws-workload-default");

  assert.throws(() => {
    pack.abbreviations["deployment.environment"].production = "tampered";
  });
  assert.equal(pack.abbreviations["deployment.environment"].production, "prod");
});

test("a returned ConventionPack's nested override_policy lists cannot be mutated", () => {
  const pack = getConventionPack("aws-workload-default");

  assert.throws(() => {
    pack.override_policy.protected_attributes.push("tampered");
  });
});

test("a returned ConventionPack's nested identity_defaults cannot be mutated", () => {
  const pack = getConventionPack("aws-workload-default");

  assert.throws(() => {
    pack.identity_defaults.deployment.platform = "azure";
  });
  assert.equal(pack.identity_defaults.deployment.platform, "aws");
});

// --- Listing --------------------------------------------------------------------------

test("listConventionPackIds returns exactly the expected catalog entries in lexical order", () => {
  assert.deepEqual(listConventionPackIds(), ["aws-workload-default"]);
});

test("listConventionPackIds is deterministic across repeated calls", () => {
  assert.deepEqual(listConventionPackIds(), listConventionPackIds());
});

// --- Registration integrity ------------------------------------------------------------

test("every catalog key matches its own pack's id", () => {
  for (const conventionPackId of listConventionPackIds()) {
    const pack = getConventionPack(conventionPackId);

    assert.equal(pack.id, conventionPackId, `catalog key "${conventionPackId}" must match pack.id`);
  }
});

// --- Fidelity: aws-workload-default matches specification/convention-packs/aws-workload-default.md ---
//
// These assertions are derived directly from the normative artifact's own prose and
// YAML example, not parsed from the Markdown file itself (see
// docs/architecture/convention-pack-catalog.md#specificationruntime-fidelity). The
// Specification artifact remains the normative source; this test proves the
// executable value stays faithful to it.

test("aws-workload-default: id matches the artifact's selector value", () => {
  const pack = getConventionPack("aws-workload-default");
  assert.equal(pack.id, "aws-workload-default");
});

test("aws-workload-default: identity_defaults.deployment.platform defaults to aws", () => {
  const pack = getConventionPack("aws-workload-default");
  assert.equal(pack.identity_defaults.deployment.platform, "aws");
});

test("aws-workload-default: required_attributes matches the artifact's Required attributes section", () => {
  const pack = getConventionPack("aws-workload-default");
  assert.deepEqual(pack.required_attributes, [
    "organizational.system",
    "deployment.environment",
    "functional.resource_type",
  ]);
});

test("aws-workload-default: naming_component_order matches the artifact's Naming projection example", () => {
  const pack = getConventionPack("aws-workload-default");
  assert.deepEqual(pack.naming_component_order, [
    "organizational.system",
    "functional.service",
    "deployment.environment",
    "deployment.location",
    "functional.component",
    "functional.resource_type",
    "deployment.instance",
  ]);
});

test("aws-workload-default: separator and casing match the artifact's Naming projection example", () => {
  const pack = getConventionPack("aws-workload-default");
  assert.equal(pack.separator, "-");
  assert.equal(pack.casing, "lower");
});

test("aws-workload-default: abbreviations match the artifact's Naming projection example", () => {
  const pack = getConventionPack("aws-workload-default");
  assert.deepEqual(pack.abbreviations, {
    "deployment.environment": {
      production: "prod",
      staging: "stg",
      development: "dev",
    },
  });
});

test("aws-workload-default: override_policy matches the artifact's Override policy section", () => {
  const pack = getConventionPack("aws-workload-default");
  assert.deepEqual(pack.override_policy, {
    protected_attributes: ["organizational.organization", "deployment.deployment_scope"],
    overridable_attributes: ["deployment.location"],
  });
});

test("aws-workload-default: the artifact's worked naming example reproduces telemetry-platform-ingestion-prod-aws_s3_bucket", () => {
  // Reproduces the artifact's own worked example: "a production aws_s3_bucket resource
  // for the ingestion service of the telemetry-platform system, with no location,
  // component, or instance resolved, generates the name
  // telemetry-platform-ingestion-prod-aws_s3_bucket." Exercised end-to-end (through
  // evaluate()) by test/runtime/convention-pack-integration.test.mjs; this test only
  // pins the pack's own declared fields that make that example possible.
  const pack = getConventionPack("aws-workload-default");
  assert.equal(pack.abbreviations["deployment.environment"].production, "prod");
  assert.equal(pack.separator, "-");
  assert.equal(pack.casing, "lower");
});
