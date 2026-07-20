import type { RuntimeContext } from "./runtime-context.js";

/**
 * Runtime Context that has been produced or enriched by a provisioning process or IaC
 * execution.
 *
 * Every Provisioning Context is Runtime Context; not every Runtime Context comes from a
 * provisioning process (see `specification/context-resolution.md`). This contract is a
 * structural specialization of `RuntimeContext`: a value typed as `ProvisioningContext`
 * is assignable wherever a `RuntimeContext` is expected, matching the Specification's
 * tree notation that nests Provisioning Context under Runtime Context rather than
 * describing it as a separate, parallel category of Evaluation Context.
 *
 * No additional fields are declared beyond `RuntimeContext`'s: the Specification does
 * not define any attribute that distinguishes a Provisioning Context from Runtime
 * Context structurally — the distinction is one of provenance (how the context was
 * produced), not shape. This is an explicit architectural decision, not an omission.
 */
export type ProvisioningContext = RuntimeContext;
