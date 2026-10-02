# Terraform Integration

This document describes how Terraform configurations consume
`@lksnext/iac-conventions-cli` today (Milestone 4.4: Terraform External Integration).
It does not redefine anything in [`../architecture/cli.md`](../architecture/cli.md);
that document is the authoritative architecture reference for the `terraform-external`
command and its protocol mapping. This document is a usage-focused companion aimed at
Terraform configuration authors.

## Why a bridge, not a native provider

This repository does not implement a native Terraform provider. Terraform's
`hashicorp/external` provider lets an external program act as a data source through a
simple, well-documented protocol: it reads the `query` argument (a map of strings) as
JSON on stdin, and writes a result (also a map of strings) as JSON on stdout. HashiCorp
documents this mechanism as an "escape hatch" for situations where a first-class
provider does not (yet) exist, not as a replacement for one — see the
[`hashicorp/external` provider documentation](https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external).

Using this bridge lets Terraform configurations consume this repository's naming
conventions today, without committing to a Terraform provider's release cadence,
Go SDK, and registry publication process before the underlying naming/convention
model has had real usage. See [Limitations](#limitations) below for what this
approach cannot do, and what a future native provider could remove.

## Architecture

```text
Terraform `data "external"`
      ↓ stdin: { "request_json": "<JSON string>" }
`iac-conventions terraform-external`
      ↓ (reuses the same parseEvaluateRequest / executeEvaluationRequest
      ↓  functions the generic `evaluate` command uses — see
      ↓  ../architecture/cli.md#terraform-integration-boundary)
      ↓ stdout: { "name": "...", "valid": "true"|"false", "tags_json": "<JSON string>", "result_json": "<JSON string>" }
Terraform `data.external.<name>.result`
```

`terraform-external` is a second, thin transport around the exact same evaluation path
`evaluate` uses — see
[`../architecture/cli.md#terraform-integration-boundary`](../architecture/cli.md#terraform-integration-boundary)
for the full protocol mapping, including why the input/output shapes are string-only
and how domain-invalid results are handled.

## Usage

```hcl
terraform {
  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3"
    }
  }
}

data "external" "convention" {
  program = ["iac-conventions", "terraform-external"]

  query = {
    request_json = jsonencode({
      naming_request = {
        convention    = "aws-workload-default"
        resource_type = "aws_iam_role"
        functional = {
          service = "ingestion"
        }
        governance = {
          owner      = "platform-team"
          managed_by = "terraform"
        }
      }
      evaluation_context = {
        shared_organizational_context = {
          system = "telemetry-platform"
        }
        shared_deployment_context = {
          environment = "production"
        }
      }
    })
  }
}

locals {
  convention_result = jsondecode(data.external.convention.result.result_json)
  tags              = jsondecode(data.external.convention.result.tags_json)
}

output "generated_name" {
  value = data.external.convention.result.name
}

output "valid" {
  value = data.external.convention.result.valid
}

output "tags" {
  value = local.tags
}
```

A full, runnable copy of this example lives at
[`../../examples/terraform/external/`](../../examples/terraform/external/), including
setup instructions. A second example,
[`../../examples/terraform/azure-workload/`](../../examples/terraform/azure-workload/),
shows the same pattern for `azure_resource_group`, `azure_virtual_network`, and
`azure_key_vault`, selecting `azure-workload-default` and `azure-workload-compact`
respectively — the same bridge, protocol, and limitations apply regardless of platform
or Convention Pack.

### Consuming projected tags

`data.external.convention.result.tags_json` carries the tags the selected Convention
Pack projects (Specification v1.3; see
[`../../specification/convention-pack.md#tag-projections`](../../specification/convention-pack.md#tag-projections)),
JSON-encoded as a string, or `"{}"` when the pack projects none. For the example
above, `aws-workload-default` produces:

```hcl
{
  Name        = "telemetry-platform-ingestion-prod-aws_iam_role"
  Project     = "telemetry-platform"
  Environment = "production"
  Service     = "ingestion"
  Owner       = "platform-team"
  ManagedBy   = "terraform"
}
```

Tag values are the resolved values, not the abbreviated, lowercased forms used in the
name (`Environment = "production"`, while the name contains `prod`); `Name` is the
generated name itself, so resources without a name argument (for example,
`aws_acm_certificate`) still carry it. A tag whose attribute is not resolved is
omitted. Merge the decoded map into a resource's `tags`:

```hcl
resource "aws_iam_role" "this" {
  name               = data.external.convention.result.name
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  tags               = merge(local.tags, var.extra_tags)
}
```

The same tags are also available at `local.convention_result.outputs.metadata.tags`.

### Optional attributes and `null`

Terraform's `jsonencode` emits `null` for an unset optional object attribute (for
example, a variable typed `object({ service = optional(string) })`). The CLI rejects
`null` for any known attribute with a non-zero exit and a single stderr line naming
the field, because the Specification's JSON Schemas type these attributes as strings
and express "unset" by omission (see
[`../architecture/cli.md#transport-and-domain-validation-boundary`](../architecture/cli.md#transport-and-domain-validation-boundary)):

```text
"naming_request.functional.service" must be a string, not null; omit the field to leave it unset.
```

Drop `null` values before encoding the request, for example:

```hcl
locals {
  functional = { for key, value in var.functional : key => value if value != null }
}
```

### Handling an invalid result

`data.external.convention.result.valid` is the string `"true"` or `"false"` — not a
Terraform-native boolean — because the `external` protocol only supports string
values. Compare it explicitly, for example:

```hcl
resource "terraform_data" "assert_valid_name" {
  lifecycle {
    precondition {
      condition     = data.external.convention.result.valid == "true"
      error_message = "Generated name failed convention validation: ${data.external.convention.result.result_json}"
    }
  }
}
```

## Runtime availability

`program = ["iac-conventions", "terraform-external"]` requires the `iac-conventions`
executable to be resolvable on `PATH` (or the `working_dir` the `external` data source
runs in) wherever `terraform plan`/`terraform apply` executes — a local workstation, a
self-managed CI/CD runner, or a container image that bundles Node.js and this CLI.
Terraform Enterprise's remote execution environment does not guarantee availability of
arbitrary language runtimes or external programs, so HashiCorp's own documentation
recommends against relying on `external` data sources there. This bridge therefore
targets local Terraform runs and self-managed CI/CD, not Terraform Enterprise's remote
execution mode.

## Limitations

- **Not a native provider**: no plan-time schema, no first-class attribute types (every
  value is a string), no provider-level diagnostics, and no integration with
  `terraform-plugin-testing` or similar tooling built for real providers.
- **External program dependency**: Terraform configurations depending on this bridge
  implicitly depend on Node.js and this CLI being installed wherever Terraform runs,
  outside of Terraform's own dependency management (`required_providers`).
- **No caching beyond Terraform's own data source lifecycle**: `external` data sources
  are expected to have no observable side effects, and Terraform re-runs the program on
  every refresh — this is inherent to the protocol, not specific to this CLI.
- **String-only protocol**: `tags_json` and `result_json` must be decoded with
  `jsondecode(...)` to access anything beyond `name`/`valid`; this bridge cannot expose
  a native Terraform object/map type directly.

## Future evolution

A native Terraform provider — exposing `NamingRequest`/`EvaluationContext` as a proper
provider schema and `ConventionResult` as a typed data source, without the string-only
`external` protocol's limitations — remains a plausible future addition (see
[`AGENTS.md`'s Adapter Rules](../../AGENTS.md#adapter-rules) and
[`IMPLEMENTATION.md`](../../IMPLEMENTATION.md)'s Milestone 4 roadmap for planned adapter
packages). It is not implemented by this milestone, and should only be pursued once
this bridge's real usage demonstrates the need for a first-class provider.
