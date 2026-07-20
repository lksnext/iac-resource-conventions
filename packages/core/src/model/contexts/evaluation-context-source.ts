/**
 * The Evaluation Context categories a Convention Pack may name as authoritative for a
 * specific canonical attribute (see `../conventions/convention-pack.ts`'s context
 * authority rules).
 *
 * Mirrors the Evaluation Context hierarchy described in
 * `specification/context-resolution.md`: Shared Organizational Context and Shared
 * Deployment Context are stable across many evaluations; Runtime Context is dynamic and
 * scoped to one execution; Provisioning Context is a specialization of Runtime Context
 * produced or enriched by a provisioning process (see `./provisioning-context.ts`).
 *
 * See `specification/context-resolution.md` and `specification/convention-pack.md`.
 */
export type EvaluationContextSource =
  | "shared-organizational-context"
  | "shared-deployment-context"
  | "runtime-context"
  | "provisioning-context";
