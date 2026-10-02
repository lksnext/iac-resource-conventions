# aws-workload-compact

`aws-workload-compact` is a concrete Convention Pack — a Specification Artifact that
applies the abstract [Convention Pack](../convention-pack.md) concept to AWS workload
accounts with shorter names. It is selected explicitly by a
[Naming Request](../naming-request.md)'s `convention` field:

```yaml
convention: aws-workload-compact
```

This document describes `aws-workload-compact`'s policy conceptually. It does not
define YAML, JSON, or any machine-readable representation (see
[`README.md`](./README.md#scope-of-this-iteration)).

## Purpose

[`aws-workload-default`](./aws-workload-default.md) includes `functional.resource_type`
in every name verbatim, for example
`lamassu-dev-us-east-1-cloudfront-aws_acm_certificate`. That keeps names long, and it
makes every `aws_s3_bucket` name invalid, because S3 bucket names forbid the
underscore in `aws_s3_bucket` itself. Abbreviating the resource type in
`aws-workload-default` would change every name it already generates, which is a
breaking change. `aws-workload-compact` is a separate pack instead: it is identical to
`aws-workload-default` except that it abbreviates `functional.resource_type`, so
existing consumers of `aws-workload-default` are unaffected and new consumers can opt
in.

## Identity defaults, required attributes, override policy, and metadata projection

Identical to [`aws-workload-default`](./aws-workload-default.md#identity-defaults),
[`aws-workload-default`](./aws-workload-default.md#required-attributes),
[`aws-workload-default`](./aws-workload-default.md#override-policy), and
[`aws-workload-default`](./aws-workload-default.md#metadata-projection) respectively.

## Naming projection

The same `naming_component_order`, `separator`, and `casing` as `aws-workload-default`,
with one added abbreviation table for `functional.resource_type`:

```yaml
naming_component_order:
  - organizational.system
  - functional.service
  - deployment.environment
  - deployment.location
  - functional.component
  - functional.resource_type
  - deployment.instance
separator: "-"
casing: lower
abbreviations:
  deployment.environment:
    production: prod
    staging: stg
    development: dev
  functional.resource_type:
    aws_acm_certificate: acm
    aws_iam_role: role
    aws_lambda_function: lambda
    aws_s3_bucket: s3
    aws_ssm_parameter: param
```

A resource type without an entry keeps its full resolved value, exactly as under
`aws-workload-default` (see
[`convention-pack.md#abbreviations`](../convention-pack.md#abbreviations)).

For example, a `production` `aws_s3_bucket` resource for the `ingestion` service of the
`telemetry-platform` system, with no `location`, `component`, or `instance` resolved,
generates the valid name `telemetry-platform-ingestion-prod-s3`.

## Compatibility

Changes to `aws-workload-compact`'s naming component ordering, separator, or
abbreviations are potentially breaking. Adding an abbreviation for a resource type
that had none changes that resource type's names, so it is potentially breaking too.
`aws-workload-compact` follows [Semantic Versioning](https://semver.org/).

## Relationship with the Specification

Identical to
[`aws-workload-default`'s relationship with the Specification](./aws-workload-default.md#relationship-with-the-specification).

## Validation scenarios

- **Valid S3 bucket** — a Naming Request selects `aws-workload-compact` for an
  `aws_s3_bucket`; the name ends in `-s3` and satisfies S3's character constraints,
  unlike the same request under `aws-workload-default`.
- **Unabbreviated resource type** — a Naming Request selects `aws-workload-compact` for
  a resource type with no abbreviation entry; the name contains the full resource type,
  exactly as under `aws-workload-default`.
