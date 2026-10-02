// Runtime tests for Specification v1.3 executable tag projection (see
// specification/convention-pack.md#tag-projections). `evaluateConvention` is imported
// from the built `dist/evaluator/` output, the same way ./naming-evaluation.test.mjs
// does.

import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateConvention } from "../../dist/evaluator/convention-evaluation/index.js";
import { evaluate } from "../../dist/index.js";

function deepFreeze(value) {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) {
      deepFreeze(value[key]);
    }
  }
  return value;
}

function input(conventionPack, governanceContext = { owner: "platform-team" }) {
  return deepFreeze({
    resolved_context: {
      resource_identity: {
        organizational: { system: "Telemetry-Platform" },
        deployment: { environment: "production" },
        functional: { service: "ingestion", resource_type: "aws_s3_bucket" },
      },
      governance_context: governanceContext,
    },
    resource_definition: { resource_type: "aws_s3_bucket", platform: "aws" },
    convention_pack: { id: "test-pack", ...conventionPack },
  });
}

test("tag projection: the normative example projects verbatim values and omits absent sources", () => {
  const result = evaluateConvention(
    input({
      naming_component_order: ["organizational.system", "deployment.environment"],
      separator: "-",
      casing: "lower",
      abbreviations: { "deployment.environment": { production: "prod" } },
      tag_projections: {
        Project: "organizational.system",
        Environment: "deployment.environment",
        Component: "functional.component",
        Owner: "governance.owner",
      },
    }),
  );

  assert.equal(result.outputs.name, "telemetry-platform-prod");
  assert.deepEqual(result.outputs.metadata, {
    tags: { Project: "Telemetry-Platform", Environment: "production", Owner: "platform-team" },
  });
  assert.deepEqual(result.validation, { valid: true });
});

test("tag projection: tags are emitted in declaration order", () => {
  const result = evaluateConvention(
    input({
      tag_projections: {
        Service: "functional.service",
        Owner: "governance.owner",
        Project: "organizational.system",
      },
    }),
  );

  assert.deepEqual(Object.keys(result.outputs.metadata.tags), ["Service", "Owner", "Project"]);
});

test("tag projection: every Governance Context reference resolves", () => {
  const result = evaluateConvention(
    input(
      {
        tag_projections: {
          Owner: "governance.owner",
          ManagedBy: "governance.managed_by",
          CostCenter: "governance.cost_center",
          Profile: "governance.profile",
        },
      },
      { owner: "o", managed_by: "terraform", cost_center: "cc-1", profile: "standard" },
    ),
  );

  assert.deepEqual(result.outputs.metadata.tags, {
    Owner: "o",
    ManagedBy: "terraform",
    CostCenter: "cc-1",
    Profile: "standard",
  });
});

test("tag projection: no tag_projections leaves outputs.metadata absent", () => {
  const result = evaluateConvention(input({}));

  assert.equal(Object.hasOwn(result.outputs, "metadata"), false);
});

test("tag projection: when no declared source resolves, outputs.metadata is absent and the result is valid", () => {
  const result = evaluateConvention(
    input({ tag_projections: { Tenant: "organizational.tenant" } }),
  );

  assert.equal(Object.hasOwn(result.outputs, "metadata"), false);
  assert.deepEqual(result.validation, { valid: true });
});

test("tag projection: tags are projected even when no name is generated", () => {
  const result = evaluateConvention(
    input({
      naming_component_order: ["organizational.system", "functional.component"],
      required_attributes: ["functional.component"],
      tag_projections: { Project: "organizational.system" },
    }),
  );

  assert.equal(result.outputs.name, undefined);
  assert.deepEqual(result.outputs.metadata, { tags: { Project: "Telemetry-Platform" } });
  assert.equal(result.validation.valid, false);
});

test("tag projection: an unknown source is reported and only that tag is omitted", () => {
  const result = evaluateConvention(
    input({
      tag_projections: { Project: "organizational.system", Cost: "governance.budget" },
    }),
  );

  assert.deepEqual(result.outputs.metadata, { tags: { Project: "Telemetry-Platform" } });
  assert.deepEqual(result.validation, {
    valid: false,
    failures: [
      {
        message:
          'tag_projections declared by convention pack "test-pack" maps tag key "Cost" to unknown metadata source reference "governance.budget".',
      },
    ],
  });
  assert.match(result.explanation, /unknown metadata source reference "governance\.budget"/);
});

test("tag projection: an empty tag key is reported", () => {
  const result = evaluateConvention(input({ tag_projections: { "": "organizational.system" } }));

  assert.equal(Object.hasOwn(result.outputs, "metadata"), false);
  assert.deepEqual(result.validation.failures, [
    {
      message: 'tag_projections declared by convention pack "test-pack" declares an empty tag key.',
    },
  ]);
});

test("tag projection: evaluate() projects tags from Naming Request governance and shared context", () => {
  const result = evaluate(
    deepFreeze({
      naming_request: {
        convention: "test-pack",
        resource_type: "aws_s3_bucket",
        functional: { service: "ingestion" },
        governance: { owner: "platform-team" },
      },
      evaluation_context: {
        shared_organizational_context: { system: "telemetry-platform" },
        shared_deployment_context: { environment: "production" },
      },
      convention_pack: {
        id: "test-pack",
        tag_projections: {
          Project: "organizational.system",
          Environment: "deployment.environment",
          Service: "functional.service",
          Owner: "governance.owner",
        },
      },
      resource_definition: { resource_type: "aws_s3_bucket", platform: "aws" },
    }),
  );

  assert.deepEqual(result.outputs.metadata.tags, {
    Project: "telemetry-platform",
    Environment: "production",
    Service: "ingestion",
    Owner: "platform-team",
  });
});

// --- outputs.name (specification/convention-pack.md#metadata-source-references) -------

test("tag projection: the normative generated-name example projects the name exactly as generated", () => {
  const result = evaluateConvention(
    deepFreeze({
      resolved_context: {
        resource_identity: {
          organizational: { system: "telemetry-platform" },
          deployment: { environment: "production" },
          functional: { resource_type: "aws_acm_certificate" },
        },
        governance_context: {},
      },
      resource_definition: { resource_type: "aws_acm_certificate", platform: "aws" },
      convention_pack: {
        id: "test-pack",
        naming_component_order: [
          "organizational.system",
          "deployment.environment",
          "functional.resource_type",
        ],
        separator: "-",
        casing: "lower",
        abbreviations: { "deployment.environment": { production: "prod" } },
        tag_projections: { Name: "outputs.name", Environment: "deployment.environment" },
      },
    }),
  );

  assert.equal(result.outputs.name, "telemetry-platform-prod-aws_acm_certificate");
  assert.deepEqual(result.outputs.metadata.tags, {
    Name: "telemetry-platform-prod-aws_acm_certificate",
    Environment: "production",
  });
});

test("tag projection: outputs.name is omitted when no name is generated", () => {
  const result = evaluateConvention(
    input({
      naming_component_order: ["organizational.system", "functional.component"],
      required_attributes: ["functional.component"],
      tag_projections: { Name: "outputs.name", Project: "organizational.system" },
    }),
  );

  assert.equal(result.outputs.name, undefined);
  assert.deepEqual(result.outputs.metadata.tags, { Project: "Telemetry-Platform" });
});

test("tag projection: outputs.name carries a generated name even when validation fails", () => {
  const result = evaluateConvention(
    deepFreeze({
      ...input({
        naming_component_order: ["organizational.system", "functional.resource_type"],
        separator: "-",
        tag_projections: { Name: "outputs.name" },
      }),
      resource_definition: {
        resource_type: "aws_s3_bucket",
        platform: "aws",
        rendering_constraints: { max_length: 5, length_unit: "code_points" },
      },
    }),
  );

  assert.equal(result.validation.valid, false);
  assert.deepEqual(result.outputs.metadata.tags, { Name: result.outputs.name });
});
