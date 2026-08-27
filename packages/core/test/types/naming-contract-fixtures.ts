// Compile-time only contract fixtures for Specification v1.1 naming types.
//
// This file is never executed and is not part of the published package: it is
// type-checked with `noEmit` via ../../tsconfig.test.json, and
// packages/core/package.json#files restricts the published tarball to `dist/` only.
// It exists to prove, at compile time, that the closed canonical naming vocabulary
// and the closed casing vocabulary are enforced by the public contracts.

import type {
  CanonicalResourceIdentityAttribute,
  ConventionPack,
  NamingCasing,
} from "../../src/model/index.js";

export const canonicalAttribute: CanonicalResourceIdentityAttribute = "organizational.system";
export const namingCasing: NamingCasing = "lower";

export const conventionPackWithNaming: ConventionPack = {
  id: "test-pack",
  naming_component_order: ["organizational.system", "functional.service"],
  separator: "-",
  casing: "preserve",
  abbreviations: {
    "deployment.environment": {
      production: "prod",
    },
  },
};

// @ts-expect-error -- governance attributes are not valid naming references.
export const invalidNamingReference: CanonicalResourceIdentityAttribute = "governance.owner";

// @ts-expect-error -- the casing vocabulary is closed to preserve/lower/upper.
export const invalidNamingCasing: NamingCasing = "camel";

export const invalidAbbreviationShape: ConventionPack = {
  id: "test-pack",
  abbreviations: {
    // @ts-expect-error -- the old bare-string abbreviation shape is no longer valid.
    environment: "env",
  },
};
