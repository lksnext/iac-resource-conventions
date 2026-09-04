# Terraform Example: `terraform-external` Bridge

This example shows how to consume `@lksnext/iac-conventions-cli`'s `terraform-external`
command from Terraform, using the `hashicorp/external` provider's `data "external"`
source (Milestone 4.4: Terraform External Integration). See
[`../../../docs/integrations/terraform.md`](../../../docs/integrations/terraform.md)
for the full architecture, protocol mapping, and limitations this example follows.

## Requirements

- The `iac-conventions` executable (this repository's CLI, `@lksnext/iac-conventions-cli`)
  must be installed and resolvable on `PATH` in the environment where `terraform plan`/
  `terraform apply` runs. Terraform invokes it directly as `program`; it is not resolved
  through this Terraform configuration.
- Terraform itself, and the `hashicorp/external` provider (declared in
  [`main.tf`](main.tf)'s `required_providers` block). No cloud provider (for example,
  `hashicorp/aws`) is required or declared: this example never contacts AWS, it only
  evaluates naming conventions locally.
- Node.js `>=22`, the version this repository's CLI targets.

## What this example does

`main.tf` evaluates a Naming Request for an `aws_iam_role` resource against the
`aws-workload-default` Convention Pack, entirely through the `terraform-external`
protocol:

1. It encodes the same `{ naming_request, evaluation_context }` document `evaluate`
   accepts (see the root [`packages/cli/README.md`](../../../packages/cli/README.md))
   as a single JSON string, using `jsonencode(...)`.
2. It passes that string as `query.request_json` — the `hashicorp/external` provider's
   `query` argument only supports string values, so this is the only field the query
   ever carries (see
   [`docs/architecture/cli.md`](../../../docs/architecture/cli.md#terraform-integration-boundary)).
3. It reads back `result.name`, `result.valid`, and `result.result_json` — all strings,
   per the same protocol constraint — and exposes them as outputs, additionally
   decoding `result.result_json` into `local.convention_result` for full structured
   access to the underlying `ConventionResult` (resolved identity, governance context,
   validation failures, and warnings).

## Try it

```shell
npm install --workspaces --include-workspace-root=false --omit=dev
npm run build --workspace=@lksnext/iac-conventions-cli
export PATH="$PWD/../../../packages/cli/node_modules/.bin:$PWD/../../../packages/cli:$PATH"
terraform init -backend=false
terraform validate
terraform apply
```

In practice, install `@lksnext/iac-conventions-cli` however your environment normally
installs Node CLI tools (for example, `npm install -g` from a published package, or a
container image that bundles it) so that `iac-conventions` is simply on `PATH`.

## Limitations

- This is a bridge, not a native Terraform provider: see
  [`docs/integrations/terraform.md`](../../../docs/integrations/terraform.md#limitations)
  for why, and what a future native provider could remove.
- HashiCorp documents `hashicorp/external` as an "escape hatch," not a first-class
  provider replacement, and does not guarantee that Terraform Enterprise's remote
  execution environment can run arbitrary external programs. This example targets
  local Terraform runs and self-managed CI/CD, not Terraform Enterprise's remote
  execution mode.
