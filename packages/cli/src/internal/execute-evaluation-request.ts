// Internal-only evaluation orchestration for `evaluate` (Milestone 4.3: Stable CLI
// Evaluate JSON Contract). Not part of the package's public surface (see
// ./parse-evaluate-request.ts).
//
// Resolves both catalog artifacts a NamingRequest references — the ResourceDefinition
// keyed by `naming_request.resource_type`, and the ConventionPack keyed by
// `naming_request.convention` — then calls core's `evaluate()` exactly once. Kept as a
// standalone function, not invoked by spawning the CLI as a subprocess, so a future
// Terraform transport (Milestone 4.4) can reuse this same evaluation path around a
// different stdin/stdout shape (see docs/architecture/cli.md#terraform-integration-boundary).

import { getConventionPack, getResourceDefinition } from "@lksnext/iac-conventions-catalog";
import { type ConventionResult, evaluate } from "@lksnext/iac-conventions-core";
import { CliError } from "../errors.js";
import type { EvaluateRequest } from "./parse-evaluate-request.js";

/**
 * Resolves `request`'s catalog references and calls `evaluate()`, returning the
 * resulting {@link ConventionResult}. Throws {@link CliError} when either catalog
 * lookup key is unknown — never a partial evaluation, and never a fallback to another
 * Convention Pack.
 */
export function executeEvaluationRequest(request: EvaluateRequest): ConventionResult {
  const { naming_request: namingRequest, evaluation_context: evaluationContext } = request;

  const resourceDefinition = getResourceDefinition(namingRequest.resource_type);
  if (resourceDefinition === undefined) {
    throw new CliError(`Unknown resource_type: "${namingRequest.resource_type}".`);
  }

  const conventionPack = getConventionPack(namingRequest.convention);
  if (conventionPack === undefined) {
    throw new CliError(`Unknown convention: "${namingRequest.convention}".`);
  }

  return evaluate({
    naming_request: namingRequest,
    evaluation_context: evaluationContext,
    convention_pack: conventionPack,
    resource_definition: resourceDefinition,
  });
}
