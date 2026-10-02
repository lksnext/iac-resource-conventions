# aws-ssm-parameter-path

`aws-ssm-parameter-path` is a concrete Convention Pack — a Specification Artifact that
applies the abstract [Convention Pack](../convention-pack.md) concept to AWS Systems
Manager parameters organized in a hierarchy. It is selected explicitly by a
[Naming Request](../naming-request.md)'s `convention` field:

```yaml
convention: aws-ssm-parameter-path
```

This document describes `aws-ssm-parameter-path`'s policy conceptually. It does not
define YAML, JSON, or any machine-readable representation (see
[`README.md`](./README.md#scope-of-this-iteration)).

## Purpose

`aws-ssm-parameter-path` exists because a hierarchical `aws_ssm_parameter` name is a
path that must start with `/` (see `packages/catalog/src/aws/ssm-parameter.ts`).
[`aws-workload-default`](./aws-workload-default.md) renders a valid but flat
parameter name, joined with `-`; this pack renders a path instead, using
`separator: "/"` and the Specification v1.4 `prefix` (see
[`convention-pack.md#prefix-specification-v14`](../convention-pack.md#prefix-specification-v14)).
It composes the same AWS Platform Convention, AWS Workload Organization Convention,
and Internal Workload Deployment Convention as `aws-workload-default`; only the naming
projection differs.

It is intended for `aws_ssm_parameter` only. Its first consumer is the
`lamassuiot/lamassu-terraform-modules` `aws-acm-certificate` module, whose parameters
follow `/lamassu/<env>/dns-validation/<name>` and `/lamassu/<env>/certificates/<name>`.

## Identity defaults, required attributes, and override policy

Identical to [`aws-workload-default`](./aws-workload-default.md#identity-defaults),
[`aws-workload-default`](./aws-workload-default.md#required-attributes), and
[`aws-workload-default`](./aws-workload-default.md#override-policy) respectively.

## Naming projection

```yaml
naming_component_order:
  - organizational.system
  - deployment.environment
  - functional.service
  - functional.component
  - deployment.instance
separator: "/"
prefix: "/"
casing: lower
abbreviations:
  deployment.environment:
    production: prod
    staging: stg
    development: dev
```

The order runs from the broadest path level to the most specific, so parameters of
one system and environment share a common path for `GetParametersByPath`. A caller
supplies the parameter's own leaf name as `deployment.instance`.
`functional.resource_type` is not a naming component: every name under this pack
is an `aws_ssm_parameter`, so a path level for it would carry no information. An
absent optional component is omitted together with its `/`, so the path never
contains an empty level.

For example, a `development` parameter of the `lamassu` system for the
`dns-validation` component, with instance `example-com` and no service, generates
`/lamassu/dev/dns-validation/example-com`.

At most five path levels are generated, well within Systems Manager's fifteen-level
limit, unless a resolved value itself contains `/`; that limit is not validated (see
[`../README.md#specification-v14-non-goals`](../README.md#specification-v14-non-goals)).

## Metadata projection

Identical to
[`aws-workload-default`'s metadata projection](./aws-workload-default.md#metadata-projection).
`aws_ssm_parameter` accepts a name, so no `Name` tag is projected.

## Compatibility

Changes to `aws-ssm-parameter-path`'s naming component ordering, separator, prefix,
or abbreviations are potentially breaking. `aws-ssm-parameter-path` follows
[Semantic Versioning](https://semver.org/).

## Relationship with the Specification

Identical to
[`aws-workload-default`'s relationship with the Specification](./aws-workload-default.md#relationship-with-the-specification).

## Validation scenarios

- **Valid request** — a Naming Request selects `aws-ssm-parameter-path` for an
  `aws_ssm_parameter`, supplies `functional.component` and `deployment.instance`, and
  resolves `organizational.system` and `deployment.environment` from shared Evaluation
  Context. Convention Evaluation produces a valid path.
- **Reserved prefix** — a system whose name starts with `aws` or `ssm` renders a path
  starting with `/aws` or `/ssm`, which `aws_ssm_parameter` forbids, producing a
  failed Convention Result.
- **Other resource types** — selecting this pack for any other resource type renders a
  name containing `/`, which most AWS resource types' character constraints forbid.
