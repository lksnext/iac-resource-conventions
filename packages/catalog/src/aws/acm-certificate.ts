import type { ResourceDefinition } from "@lksnext/iac-conventions-core";
import { deepFreeze } from "../internal/deep-freeze.js";

/**
 * AWS Certificate Manager (ACM) certificate.
 *
 * Sources (retrieved for Milestone 3.2):
 * - {@link https://docs.aws.amazon.com/acm/latest/APIReference/API_RequestCertificate.html}
 *   ("RequestCertificate") — the only certificate-identifying inputs are `DomainName`
 *   and `SubjectAlternativeNames`; there is no user-supplied certificate name.
 * - {@link https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html}
 *   ("Requirements for using SSL/TLS certificates with CloudFront") — "To use a
 *   certificate in AWS Certificate Manager (ACM) to require HTTPS between viewers and
 *   CloudFront, make sure you request (or import) the certificate in the US East
 *   (N. Virginia) Region (`us-east-1`)."
 *
 * Findings:
 * - **No name to render (gap, not modeled)** — `RequestCertificate` never accepts a
 *   name; a certificate is identified by its ARN (assigned by ACM) and addressed by
 *   its `DomainName`. This Resource Definition therefore declares no
 *   `rendering_constraints` at all — the catalog does not fabricate a `max_length` or
 *   `allowed_characters` value this resource type has no evidence for. This is the
 *   first catalog entry to omit `rendering_constraints` entirely, proving the field's
 *   optionality is more than a type-level nicety.
 * - **Conditional placement** — normally regional (a certificate lives in the Region
 *   it was requested or imported into), but must be `us-east-1` specifically when
 *   associated with a CloudFront distribution. This is exactly
 *   `specification/resource-definition.md#acm-certificate`'s own illustrative
 *   example. `placement_constraints` (a `ReadonlyArray<string>` of free-form
 *   descriptive statements) can express this rule only as prose — there is no formal
 *   grammar to state the condition in a way a machine could check (see
 *   `specification/resource-definition.md#out-of-scope-for-this-document`, which
 *   defers "a formal schema or grammar for expressing Placement Constraints"). The two
 *   statements below are worded (Milestone 3.3) so that the general rule explicitly
 *   names its own exception and the exception explicitly names what it overrides,
 *   reducing (without eliminating) the risk that a reader treats them as two
 *   independent, simultaneously applicable constraints rather than one conditional
 *   relationship — this catalog still cannot express "regional, except X" as a single
 *   structured rule, only as two cross-referencing descriptive strings a human (or a
 *   future adapter) must reconcile.
 * - **Uniqueness** — no uniqueness or identity constraint is documented by AWS for
 *   certificates beyond their ARN, which ACM itself assigns (not user-supplied);
 *   `identity_constraints` is therefore omitted entirely rather than guessed.
 */
export const AWS_ACM_CERTIFICATE: ResourceDefinition = deepFreeze({
  resource_type: "aws_acm_certificate",
  platform: "aws",
  category: "security",
  placement_constraints: [
    "regional; the deployment chooses the Region, except when associated with a CloudFront distribution",
    "when associated with a CloudFront distribution, the Region must be us-east-1, overriding the general regional rule above",
  ],
});
