// Unit tests for `parseEvaluateRequest`'s typed-field transport validation. Every field
// the Specification's JSON Schemas type as a string or an object must have that type
// when present; JSON `null` is rejected rather than treated as absent (see
// docs/architecture/cli.md#transport-and-domain-validation-boundary).

import assert from "node:assert/strict";
import { test } from "node:test";
import { CliError } from "../../dist/errors.js";
import { parseEvaluateRequest } from "../../dist/internal/parse-evaluate-request.js";

function request(namingRequestFields = {}, evaluationContext = {}) {
  return JSON.stringify({
    naming_request: {
      convention: "aws-workload-default",
      resource_type: "aws_s3_bucket",
      ...namingRequestFields,
    },
    evaluation_context: evaluationContext,
  });
}

function assertRejected(raw, message) {
  assert.throws(
    () => parseEvaluateRequest(raw),
    (error) => error instanceof CliError && error.message === message,
  );
}

test("parseEvaluateRequest: accepts every known field when it has the expected type", () => {
  const raw = request(
    {
      functional: { service: "ingestion", component: "storage" },
      deployment: { instance: "01" },
      governance: {
        owner: "platform-team",
        managed_by: "terraform",
        cost_center: "cc-1",
        profile: "standard",
      },
      overrides: {
        organizational: { organization: "example", business_unit: "bu", system: "s", tenant: "t" },
        deployment: {
          platform: "aws",
          deployment_scope: "a",
          environment: "e",
          location: "l",
          instance: "i",
        },
        functional: { service: "s", component: "c", resource_type: "aws_s3_bucket" },
        governance: { owner: "o" },
      },
      custom_metadata: { anything: [1, null, true] },
    },
    {
      shared_organizational_context: { system: "telemetry-platform" },
      shared_deployment_context: { environment: "production" },
      runtime_context: {
        organizational: { tenant: "t" },
        deployment: { location: "us-east-1" },
        provider_scope_id: "111122223333",
      },
    },
  );

  assert.equal(parseEvaluateRequest(raw).naming_request.functional.service, "ingestion");
});

test("parseEvaluateRequest: does not check unknown nested fields", () => {
  const raw = request({ functional: { unknown_field: null } }, { unknown_context: null });

  assert.doesNotThrow(() => parseEvaluateRequest(raw));
});

test("parseEvaluateRequest: rejects null for a string field", () => {
  assertRejected(
    request({ functional: { service: null } }),
    '"naming_request.functional.service" must be a string, not null; omit the field to leave it unset.',
  );
});

test("parseEvaluateRequest: rejects a number, boolean, array, or object for a string field", () => {
  for (const [value, description] of [
    [5, "a number"],
    [true, "a boolean"],
    [["a"], "an array"],
    [{}, "an object"],
  ]) {
    assertRejected(
      request({ deployment: { instance: value } }),
      `"naming_request.deployment.instance" must be a string, not ${description}; omit the field to leave it unset.`,
    );
  }
});

test("parseEvaluateRequest: rejects null, a string, or an array for an object field", () => {
  for (const [value, description] of [
    [null, "null"],
    ["x", "a string"],
    [[], "an array"],
  ]) {
    assertRejected(
      request({}, { runtime_context: value }),
      `"evaluation_context.runtime_context" must be an object, not ${description}; omit the field to leave it unset.`,
    );
  }
});

test("parseEvaluateRequest: rejects null custom_metadata but not null values inside it", () => {
  assertRejected(
    request({ custom_metadata: null }),
    '"naming_request.custom_metadata" must be an object, not null; omit the field to leave it unset.',
  );
  assert.doesNotThrow(() => parseEvaluateRequest(request({ custom_metadata: { key: null } })));
});

test("parseEvaluateRequest: reports the first offending field in declaration order", () => {
  assertRejected(
    request(
      { functional: { service: null }, governance: { owner: null } },
      { shared_deployment_context: { environment: null } },
    ),
    '"naming_request.functional.service" must be a string, not null; omit the field to leave it unset.',
  );
});
