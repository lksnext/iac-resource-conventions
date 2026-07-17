// Public entry point for @lksnext/iac-conventions-core.
//
// This package will eventually host the TypeScript domain contracts for the frozen
// Specification (Resource Identity, Governance Context, Naming Request, Context
// Resolution, Resource Definition, Convention Pack, Convention Result) and the
// Reference Evaluator that implements Context Resolution and Convention Evaluation.
//
// No domain model or evaluator logic is implemented yet — see IMPLEMENTATION.md at the
// repository root for the current architecture and deferred decisions. This minimal
// placeholder exists only to prove the package builds, type-checks, and exposes a valid
// entry point.

/** The published name of this package, kept in sync with `package.json`. */
export const CORE_PACKAGE_NAME = "@lksnext/iac-conventions-core";
