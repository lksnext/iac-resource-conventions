// Internal-only stdin JSON transport parser for `terraform-external` (Milestone 4.4:
// Terraform External Integration). Not part of the package's public surface (see
// ./parse-evaluate-request.ts).
//
// Terraform's `hashicorp/external` data source passes its `query` argument to the
// external program on stdin as a JSON object whose values are always strings (see
// docs/architecture/cli.md#terraform-integration-boundary). This CLI defines exactly
// one query field, `request_json`: a string containing the same JSON document
// `evaluate` accepts on stdin. This keeps the Terraform transport a thin wrapper
// around the existing stable contract instead of inventing a second, parallel
// `naming_request`/`evaluation_context` shape at the query level — which `query`,
// being string-only, could not represent as nested objects anyway.
//
// This function only extracts and validates the `request_json` string itself; it does
// not parse or validate its contents. The extracted string is handed as-is to
// `./parse-evaluate-request.js`'s `parseEvaluateRequest`, so every transport rule for
// the underlying document (malformed JSON, unknown fields, missing/invalid
// `resource_type`/`convention`, and so on) is defined and enforced in exactly one
// place.

import { CliError } from "../errors.js";

const ALLOWED_TOP_LEVEL_FIELDS = new Set(["request_json"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses `raw` stdin text (Terraform's `external` data source query) and returns the
 * `request_json` string it carries, or throws {@link CliError} describing the first
 * transport problem found.
 */
export function parseTerraformExternalQuery(raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError("Malformed JSON input on stdin.");
  }

  if (!isPlainObject(parsed)) {
    throw new CliError("JSON input must be an object.");
  }

  for (const field of Object.keys(parsed)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      throw new CliError(`Unknown field "${field}" in JSON input.`);
    }
  }

  const { request_json: requestJson } = parsed;

  if (typeof requestJson !== "string" || requestJson.length === 0) {
    throw new CliError('"request_json" must be a non-empty string.');
  }

  return requestJson;
}
