// Internal-only result serializer for `terraform-external` (Milestone 4.4: Terraform
// External Integration). Not part of the package's public surface (see
// ./parse-evaluate-request.ts).
//
// Terraform's `hashicorp/external` data source requires the external program's stdout
// to be a JSON object whose values are always strings — the same constraint that
// motivates ./parse-terraform-external-query.ts (see
// docs/architecture/cli.md#terraform-integration-boundary). This function projects a
// `ConventionResult` (produced by the shared `executeEvaluationRequest`, unchanged
// from Milestone 4.3) into that string-only shape without recomputing or
// reinterpreting any of it:
//
// - `name` is the generated name if one was produced, or `""` otherwise — never a
//   placeholder or invented value.
// - `valid` is `result.validation.valid` converted to the literal string `"true"` or
//   `"false"` — never independently recomputed from `name` or anything else.
// - `result_json` is the full `ConventionResult`, compactly JSON-encoded, so every
//   field (including failures, warnings, resolved identity, and governance context)
//   remains available to the caller without any lossy transformation.

import type { ConventionResult } from "@lksnext/iac-conventions-core";

/** The string-only result shape Terraform's `external` data source requires. */
export interface TerraformExternalResult {
  readonly name: string;
  readonly valid: string;
  readonly result_json: string;
}

/** Projects `result` into the string-only shape `terraform-external` writes to stdout. */
export function serializeTerraformExternalResult(
  result: ConventionResult,
): Readonly<TerraformExternalResult> {
  return {
    name: result.outputs?.name ?? "",
    valid: String(result.validation.valid),
    result_json: JSON.stringify(result),
  };
}
