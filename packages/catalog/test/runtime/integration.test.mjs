// End-to-end integration test proving the intended package boundary (Milestone 3.1):
//
//   resource_type -> catalog lookup -> ResourceDefinition -> evaluate() -> ConventionResult
//
// The catalog performs only the lookup; `evaluate()` is unaware the definition came
// from a catalog at all — it is called exactly the same way
// packages/core/test/runtime/evaluate.test.mjs already calls it, with an explicitly
// looked-up `resource_definition`. This proves catalog lookup happens outside
// `evaluate()`, per docs/architecture/resource-definition-catalog.md.
//
// Milestone 4.2 extends this with a second flow proving a caller no longer needs to
// construct a ConventionPack by hand:
//
//   convention id -> catalog lookup -> ConventionPack
//   resource_type -> catalog lookup -> ResourceDefinition
//     -> evaluate() -> ConventionResult
//
// Both lookups happen outside `evaluate()`, using only this package's public API — see
// docs/architecture/convention-pack-catalog.md#cli-relationship.

import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluate } from "@lksnext/iac-conventions-core";
import { getConventionPack, getResourceDefinition } from "../../dist/index.js";

test("integration: a catalog-looked-up ResourceDefinition can be passed to evaluate()", () => {
  const resourceDefinition = getResourceDefinition("aws_s3_bucket");
  assert.ok(resourceDefinition, "expected the catalog to know aws_s3_bucket");

  const result = evaluate({
    naming_request: {
      convention: "test-pack",
      resource_type: "aws_s3_bucket",
      functional: { service: "ingestion" },
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: [
        "organizational.system",
        "functional.service",
        "functional.resource_type",
      ],
      separator: "-",
    },
    evaluation_context: {
      shared_organizational_context: { system: "telemetry-platform" },
    },
    resource_definition: resourceDefinition,
  });

  assert.equal(result.outputs.name, "telemetry-platform-ingestion-aws_s3_bucket");
});

test("integration: a catalog definition's max_length/length_unit constrains evaluate()'s validation", () => {
  const resourceDefinition = getResourceDefinition("aws_s3_bucket");
  assert.ok(resourceDefinition, "expected the catalog to know aws_s3_bucket");
  assert.equal(resourceDefinition.rendering_constraints.max_length, 63);
  assert.equal(resourceDefinition.rendering_constraints.length_unit, "code_points");

  const result = evaluate({
    naming_request: {
      convention: "test-pack",
      resource_type: "aws_s3_bucket",
      functional: { service: "a".repeat(70) },
    },
    convention_pack: {
      id: "test-pack",
      naming_component_order: ["functional.service"],
      separator: "",
    },
    evaluation_context: {},
    resource_definition: resourceDefinition,
  });

  assert.deepEqual(result.validation.failures, [
    { message: "name exceeds max_length of 63 characters", code: "max-length" },
  ]);
});

test("integration: a catalog-looked-up ConventionPack and ResourceDefinition can both be passed to evaluate()", () => {
  const conventionPack = getConventionPack("aws-workload-default");
  assert.ok(conventionPack, "expected the catalog to know aws-workload-default");

  // aws_iam_role, not aws_s3_bucket, is used here: aws-workload-default's
  // naming_component_order always includes functional.resource_type verbatim (per its
  // own worked example in specification/convention-packs/aws-workload-default.md), and
  // aws_s3_bucket's own character_constraints forbid the underscore in
  // "aws_s3_bucket" itself — a real, but unrelated, S3 naming-rule finding this test
  // does not need to exercise. aws_iam_role's character_constraints allow underscores.
  const resourceDefinition = getResourceDefinition("aws_iam_role");
  assert.ok(resourceDefinition, "expected the catalog to know aws_iam_role");

  const result = evaluate({
    naming_request: {
      convention: "aws-workload-default",
      resource_type: "aws_iam_role",
      functional: { service: "ingestion" },
    },
    convention_pack: conventionPack,
    evaluation_context: {
      shared_organizational_context: { system: "telemetry-platform" },
      shared_deployment_context: { environment: "production" },
    },
    resource_definition: resourceDefinition,
  });

  assert.equal(result.outputs.name, "telemetry-platform-ingestion-prod-aws_iam_role");
  assert.equal(result.validation.valid, true);
});

test("integration: aws-workload-default reproduces the artifact's worked tag example", () => {
  const result = evaluate({
    naming_request: {
      convention: "aws-workload-default",
      resource_type: "aws_s3_bucket",
      functional: { service: "ingestion" },
      governance: { owner: "platform-team" },
    },
    convention_pack: getConventionPack("aws-workload-default"),
    evaluation_context: {
      shared_organizational_context: { system: "telemetry-platform" },
      shared_deployment_context: { environment: "production" },
    },
    resource_definition: getResourceDefinition("aws_s3_bucket"),
  });

  assert.deepEqual(result.outputs.metadata, {
    tags: {
      Project: "telemetry-platform",
      Environment: "production",
      Service: "ingestion",
      Owner: "platform-team",
    },
  });
});

test("integration: aws-workload-default adds the Name tag for aws_acm_certificate, which accepts no name", () => {
  const result = evaluate({
    naming_request: {
      convention: "aws-workload-default",
      resource_type: "aws_acm_certificate",
      functional: { service: "ingestion" },
      governance: { owner: "platform-team" },
    },
    convention_pack: getConventionPack("aws-workload-default"),
    evaluation_context: {
      shared_organizational_context: { system: "telemetry-platform" },
      shared_deployment_context: { environment: "production" },
    },
    resource_definition: getResourceDefinition("aws_acm_certificate"),
  });

  assert.deepEqual(result.outputs.metadata.tags, {
    Name: "telemetry-platform-ingestion-prod-aws_acm_certificate",
    Project: "telemetry-platform",
    Environment: "production",
    Service: "ingestion",
    Owner: "platform-team",
  });
});

test("integration: azure-workload-default names an azure_resource_group", () => {
  const conventionPack = getConventionPack("azure-workload-default");
  assert.ok(conventionPack, "expected the catalog to know azure-workload-default");

  const resourceDefinition = getResourceDefinition("azure_resource_group");
  assert.ok(resourceDefinition, "expected the catalog to know azure_resource_group");

  const result = evaluate({
    naming_request: {
      convention: "azure-workload-default",
      resource_type: "azure_resource_group",
      functional: { service: "platform" },
    },
    convention_pack: conventionPack,
    evaluation_context: {
      shared_organizational_context: { system: "workload" },
      shared_deployment_context: { environment: "production", location: "westeurope" },
    },
    resource_definition: resourceDefinition,
  });

  assert.equal(result.outputs.name, "rg-workload-platform-prod-weu");
  assert.equal(result.validation.valid, true);
});

test("integration: azure-workload-compact keeps azure_key_vault within its 24-character maximum", () => {
  const conventionPack = getConventionPack("azure-workload-compact");
  assert.ok(conventionPack, "expected the catalog to know azure-workload-compact");

  const resourceDefinition = getResourceDefinition("azure_key_vault");
  assert.ok(resourceDefinition, "expected the catalog to know azure_key_vault");

  const result = evaluate({
    naming_request: {
      convention: "azure-workload-compact",
      resource_type: "azure_key_vault",
    },
    convention_pack: conventionPack,
    evaluation_context: {
      shared_organizational_context: { system: "workload" },
      shared_deployment_context: { environment: "production" },
    },
    resource_definition: resourceDefinition,
  });

  assert.equal(result.outputs.name, "kv-workload-prod");
  assert.equal(result.validation.valid, true);
});

test("integration: azure-workload-underscore produces a hyphen-free name for azure_compute_gallery", () => {
  const conventionPack = getConventionPack("azure-workload-underscore");
  assert.ok(conventionPack, "expected the catalog to know azure-workload-underscore");

  const resourceDefinition = getResourceDefinition("azure_compute_gallery");
  assert.ok(resourceDefinition, "expected the catalog to know azure_compute_gallery");

  const result = evaluate({
    naming_request: {
      convention: "azure-workload-underscore",
      resource_type: "azure_compute_gallery",
    },
    convention_pack: conventionPack,
    evaluation_context: {
      shared_organizational_context: { system: "workload" },
      shared_deployment_context: { environment: "production" },
    },
    resource_definition: resourceDefinition,
  });

  assert.equal(result.outputs.name, "gal_workload_prod");
  assert.equal(result.validation.valid, true);
  assert.ok(!result.outputs.name.includes("-"), "expected no hyphens in a compute gallery name");
});

function evaluateSsmParameter(system, component) {
  return evaluate({
    naming_request: {
      convention: "aws-workload-default",
      resource_type: "aws_ssm_parameter",
      functional: { component },
    },
    convention_pack: getConventionPack("aws-workload-default"),
    evaluation_context: {
      shared_organizational_context: { system },
      shared_deployment_context: { environment: "dev" },
    },
    resource_definition: getResourceDefinition("aws_ssm_parameter"),
  });
}

test("integration: aws-workload-default renders a valid flat aws_ssm_parameter name", () => {
  const result = evaluateSsmParameter("lamassu", "dns-validation");

  assert.equal(result.outputs.name, "lamassu-dev-dns-validation-aws_ssm_parameter");
  assert.equal(result.validation.valid, true);
});

test("integration: an aws_ssm_parameter name with a reserved aws/ssm prefix is invalid in any letter case", () => {
  for (const system of ["aws-tools", "AWS-Tools", "ssm-store", "SsM-store"]) {
    const result = evaluateSsmParameter(system, "dns-validation");

    assert.equal(result.validation.valid, false, system);
    assert.ok(
      result.validation.failures.some((failure) => failure.code === "forbidden-prefix"),
      `${system}: expected a forbidden-prefix failure`,
    );
  }
});

test("integration: aws_ssm_parameter rejects characters outside a-zA-Z0-9_.-/", () => {
  const result = evaluateSsmParameter("lamassu", "dns validation");

  assert.equal(result.validation.valid, false);
  assert.ok(result.validation.failures.some((failure) => failure.code === "character-constraint"));
});

test("integration: aws_ssm_parameter forbids every letter-case spelling of aws and ssm, with and without a leading slash", () => {
  const prefixes =
    getResourceDefinition("aws_ssm_parameter").rendering_constraints.forbidden_prefixes;

  assert.equal(prefixes.length, 32);
  for (const prefix of ["aws", "AWS", "aWs", "ssm", "SSM", "/aws", "/AwS", "/ssm", "/SSM"]) {
    assert.ok(prefixes.includes(prefix), prefix);
  }
});

function evaluateSsmParameterPath(system, instance) {
  return evaluate({
    naming_request: {
      convention: "aws-ssm-parameter-path",
      resource_type: "aws_ssm_parameter",
      functional: { component: "dns-validation" },
      deployment: { instance },
    },
    convention_pack: getConventionPack("aws-ssm-parameter-path"),
    evaluation_context: {
      shared_organizational_context: { system },
      shared_deployment_context: { environment: "development" },
    },
    resource_definition: getResourceDefinition("aws_ssm_parameter"),
  });
}

test("integration: aws-ssm-parameter-path reproduces the consumer's hierarchical parameter name", () => {
  const result = evaluateSsmParameterPath("lamassu", "example-com");

  assert.equal(result.outputs.name, "/lamassu/dev/dns-validation/example-com");
  assert.equal(result.validation.valid, true);
  assert.deepEqual(result.outputs.metadata.tags, {
    Project: "lamassu",
    Environment: "development",
    Component: "dns-validation",
  });
});

test("integration: aws-ssm-parameter-path reports a reserved /aws path prefix", () => {
  const result = evaluateSsmParameterPath("aws-tools", "example-com");

  assert.equal(result.outputs.name, "/aws-tools/dev/dns-validation/example-com");
  assert.ok(result.validation.failures.some((failure) => failure.code === "forbidden-prefix"));
});
