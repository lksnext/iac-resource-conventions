// Internal-only shared runtime vocabularies. Not part of the package's public API (see
// packages/catalog/src/index.ts, the package's single public entry point).
//
// `CanonicalResourceIdentityAttribute` (core) is a compile-time-only literal union;
// core exposes no runtime array of its members, and expanding core's public API solely
// for these internal catalog validators is not justified (see
// docs/architecture/resource-definition-catalog.md#catalog-conformance-validation).
// This module exists so the vocabulary is declared exactly once and shared by every
// internal catalog validator that needs it — currently
// `validate-resource-definition.ts` and `validate-convention-pack.ts` — rather than
// each validator duplicating its own copy.

import type { CanonicalResourceIdentityAttribute } from "@lksnext/iac-conventions-core";

/**
 * The closed canonical Resource Identity attribute vocabulary (Specification v1.1; see
 * specification/resource-identity.md#canonical-attribute-references), duplicated here
 * as a runtime array since core exposes only the compile-time type.
 */
export const CANONICAL_RESOURCE_IDENTITY_ATTRIBUTES: ReadonlySet<CanonicalResourceIdentityAttribute> =
  new Set([
    "organizational.organization",
    "organizational.business_unit",
    "organizational.system",
    "organizational.tenant",
    "deployment.platform",
    "deployment.deployment_scope",
    "deployment.environment",
    "deployment.location",
    "deployment.instance",
    "functional.service",
    "functional.component",
    "functional.resource_type",
  ]);
