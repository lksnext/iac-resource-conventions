// Architectural dependency validation for this monorepo.
//
// This config enforces the layering rules documented in
// IMPLEMENTATION.md#dependency-direction:
//
//   core        -> no internal package dependencies
//   catalog     -> core
//   cli         -> core + catalog
//   adapters/*  -> core, optionally catalog (never another adapter, never cli)
//
// Only `packages/core/` exists today (see IMPLEMENTATION.md#package-structure).
// The rules below are written against the *planned* `packages/catalog/`,
// `packages/cli/`, and `packages/adapters/<name>/` paths so they are already in
// force, without violation, the moment those packages are created — nothing here
// creates those directories, and nothing here is a Specification or evaluator
// concern (see AGENTS.md#specification-freeze-v10).
//
// .cjs (not .js) so this file is unambiguously CommonJS regardless of any
// package-level "type": "module" setting, per dependency-cruiser's own guidance
// for pure-ESM projects (see doc/faq.md).
module.exports = {
  forbidden: [
    {
      name: "core-layering",
      comment:
        "core is the innermost layer (see IMPLEMENTATION.md#dependency-direction) " +
        "and must have no internal package dependencies at all.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { path: "^packages/(catalog|cli|adapters)/" },
    },
    {
      name: "catalog-layering",
      comment: "catalog may depend on core only, never on cli or adapters.",
      severity: "error",
      from: { path: "^packages/catalog/" },
      to: { path: "^packages/(cli|adapters)/" },
    },
    {
      name: "cli-layering",
      comment: "cli may depend on core and catalog only, never on adapters.",
      severity: "error",
      from: { path: "^packages/cli/" },
      to: { path: "^packages/adapters/" },
    },
    {
      name: "adapter-not-to-cli",
      comment: "adapters may depend on core and, optionally, catalog — never on cli.",
      severity: "error",
      from: { path: "^packages/adapters/[^/]+/" },
      to: { path: "^packages/cli/" },
    },
    {
      name: "no-adapter-to-adapter",
      comment:
        "adapters must be independent of one another (for example terraform must not depend on cdk).",
      severity: "error",
      from: { path: "^packages/adapters/([^/]+)/" },
      to: {
        path: "^packages/adapters/",
        pathNot: "^packages/adapters/$1/",
      },
    },
    {
      name: "no-circular",
      comment: "No circular dependencies are allowed between any modules in the workspace.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-deep-imports-across-core-catalog-cli",
      comment:
        "Public package entry points must be used — core, catalog, and cli must import " +
        "one another only through their published entry point (src/index.ts), never by " +
        "reaching into another package's internal src/ files.",
      severity: "error",
      from: { path: "^packages/(core|catalog|cli)/" },
      to: {
        path: "^packages/(core|catalog|cli)/src/(?!index\\.ts$).+",
        pathNot: "^packages/$1/",
      },
    },
    {
      name: "no-deep-imports-from-adapters",
      comment:
        "Adapters must import core and catalog only through their published entry point " +
        "(src/index.ts), never by reaching into internal src/ files.",
      severity: "error",
      from: { path: "^packages/adapters/[^/]+/" },
      to: { path: "^packages/(core|catalog)/src/(?!index\\.ts$).+" },
    },
  ],
  options: {
    // Only the packages themselves are part of the architecture graph — not the
    // repository root's own tooling/config files.
    includeOnly: "^packages/",
    doNotFollow: { path: "node_modules" },
    // Include `import type { ... }` dependencies so type-only layering violations
    // are caught too, not just runtime ones.
    tsPreCompilationDeps: true,
  },
};
