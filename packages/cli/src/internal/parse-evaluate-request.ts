// Internal-only stdin JSON transport parser for `evaluate` (Milestone 4.3: Stable CLI
// Evaluate JSON Contract). Not part of the package's public surface — the CLI's only
// public surface is its binary (see package.json's `bin` field; no `main`/`exports`).
//
// Converts untrusted external JSON into the CLI's trusted internal transport shape,
// `{ naming_request, evaluation_context }`. This is transport validation only — is the
// JSON well-formed enough to safely reach core? — not domain validation (required
// attributes, protected-value conflicts, naming/rendering/placement constraints),
// which remains `evaluate()`'s responsibility (see
// docs/architecture/cli.md#transport-and-domain-validation-boundary).
//
// core's `evaluate()` trusts its TypeScript input types: a known attribute whose value
// is not a string (for example, JSON `null` emitted by Terraform's `jsonencode` for an
// unset optional attribute, or a number) reaches naming and throws there. This parser
// therefore checks every field the Specification's JSON Schemas type as a string or
// an object (see specification/schemas/), and rejects any other value — including
// `null`, which the Specification gives no meaning: an unset attribute is expressed
// by omitting it (see docs/architecture/cli.md#transport-and-domain-validation-boundary).

import type { EvaluationContext, NamingRequest } from "@lksnext/iac-conventions-core";
import { CliError } from "../errors.js";

/**
 * The CLI's stable external JSON input contract for `evaluate` (Milestone 4.3).
 * `resource_type` and `convention` are narrowed to non-optional strings here: both are
 * required catalog lookup keys, validated below, so callers of this type never need to
 * re-check their presence.
 */
export interface EvaluateRequest {
  readonly naming_request: NamingRequest & {
    readonly resource_type: NonNullable<NamingRequest["resource_type"]>;
    readonly convention: NonNullable<NamingRequest["convention"]>;
  };
  readonly evaluation_context: EvaluationContext;
}

const ALLOWED_TOP_LEVEL_FIELDS = new Set(["naming_request", "evaluation_context"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** The JSON type a known field must have when present: a string, or an object whose own known fields are checked recursively. */
type FieldShape = "string" | "object" | { readonly [field: string]: FieldShape };

const ORGANIZATIONAL_SHAPE = {
  organization: "string",
  business_unit: "string",
  system: "string",
  tenant: "string",
} as const;

const DEPLOYMENT_SHAPE = {
  platform: "string",
  deployment_scope: "string",
  environment: "string",
  location: "string",
  instance: "string",
} as const;

const FUNCTIONAL_SHAPE = {
  service: "string",
  component: "string",
  resource_type: "string",
} as const;

const GOVERNANCE_SHAPE = {
  owner: "string",
  managed_by: "string",
  cost_center: "string",
  profile: "string",
} as const;

// Mirrors specification/schemas/naming-request.schema.json and the EvaluationContext
// model (packages/core/src/model/contexts/). Unknown nested fields are not checked.
const NAMING_REQUEST_SHAPE: Readonly<Record<string, FieldShape>> = {
  functional: { service: "string", component: "string" },
  governance: GOVERNANCE_SHAPE,
  deployment: { instance: "string" },
  overrides: {
    organizational: ORGANIZATIONAL_SHAPE,
    deployment: DEPLOYMENT_SHAPE,
    functional: FUNCTIONAL_SHAPE,
    governance: GOVERNANCE_SHAPE,
  },
  custom_metadata: "object",
};

const EVALUATION_CONTEXT_SHAPE: Readonly<Record<string, FieldShape>> = {
  shared_organizational_context: ORGANIZATIONAL_SHAPE,
  shared_deployment_context: DEPLOYMENT_SHAPE,
  runtime_context: {
    organizational: ORGANIZATIONAL_SHAPE,
    deployment: DEPLOYMENT_SHAPE,
    provider_scope_id: "string",
  },
};

function describeJsonType(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "an array";
  }
  if (typeof value === "object") {
    return "an object";
  }
  return `a ${typeof value}`;
}

/** Throws {@link CliError} for the first present field in `value` whose JSON type does not match `shape`. */
function checkFieldTypes(
  value: Record<string, unknown>,
  shape: Readonly<Record<string, FieldShape>>,
  path: string,
): void {
  for (const [field, fieldShape] of Object.entries(shape)) {
    if (!Object.hasOwn(value, field)) {
      continue;
    }
    const fieldValue = value[field];
    const fieldPath = `${path}.${field}`;
    if (fieldShape === "string") {
      if (typeof fieldValue !== "string") {
        throw new CliError(
          `"${fieldPath}" must be a string, not ${describeJsonType(fieldValue)}; omit the field to leave it unset.`,
        );
      }
      continue;
    }
    if (!isPlainObject(fieldValue)) {
      throw new CliError(
        `"${fieldPath}" must be an object, not ${describeJsonType(fieldValue)}; omit the field to leave it unset.`,
      );
    }
    if (fieldShape !== "object") {
      checkFieldTypes(fieldValue, fieldShape, fieldPath);
    }
  }
}

/**
 * Parses `raw` stdin text into a trusted {@link EvaluateRequest}, or throws
 * {@link CliError} describing the first transport problem found. Unknown top-level
 * fields (for example, a leftover Milestone 4.1 `convention_pack`) are rejected rather
 * than silently ignored: this is a new, stable, machine-oriented contract, so a typo
 * or stale caller should fail loudly rather than be misinterpreted.
 */
export function parseEvaluateRequest(raw: string): EvaluateRequest {
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

  const { naming_request: namingRequest, evaluation_context: evaluationContext } = parsed;

  if (!isPlainObject(namingRequest)) {
    throw new CliError('JSON input is missing a required "naming_request" object.');
  }
  if (!isPlainObject(evaluationContext)) {
    throw new CliError('JSON input is missing a required "evaluation_context" object.');
  }

  if (!isNonEmptyString(namingRequest.resource_type)) {
    throw new CliError('"naming_request.resource_type" must be a non-empty string.');
  }
  if (!isNonEmptyString(namingRequest.convention)) {
    throw new CliError('"naming_request.convention" must be a non-empty string.');
  }

  checkFieldTypes(namingRequest, NAMING_REQUEST_SHAPE, "naming_request");
  checkFieldTypes(evaluationContext, EVALUATION_CONTEXT_SHAPE, "evaluation_context");

  return {
    naming_request: namingRequest as unknown as EvaluateRequest["naming_request"],
    evaluation_context: evaluationContext as unknown as EvaluationContext,
  };
}
