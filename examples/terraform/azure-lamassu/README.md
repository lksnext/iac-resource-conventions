# Terraform Example: Azure Lamassu Portability Slice

This example shows how to name the Azure resource types used by the
[`lamassu-azure`](https://github.com/lamassuiot/lamassu-azure) reference project
through `@lksnext/iac-conventions-cli`'s `terraform-external` command, using this
repository's Azure Convention Packs instead of `lamassu-azure`'s own hand-written
Terraform naming module. See
[`../../../docs/integrations/terraform.md`](../../../docs/integrations/terraform.md)
for the full architecture, protocol mapping, and limitations this example follows, and
[`../external/README.md`](../external/README.md) for the first (AWS)
`terraform-external` example this one follows the same pattern as.

## Requirements

- The `iac-conventions` executable must be installed and resolvable on `PATH` in the
  environment where `terraform plan`/`terraform apply` runs.
- Terraform itself, and the `hashicorp/external` provider. No cloud provider (for
  example, `hashicorp/azurerm`) is required or declared: this example never contacts
  Azure, it only evaluates naming conventions locally.
- Node.js `>=22`, the version this repository's CLI targets.

## What this example does

`main.tf` evaluates three Naming Requests, one per Azure resource type used by
`lamassu-azure`'s `network` and `keyvault` Terraform modules:

1. `azure_resource_group` and `azure_virtual_network`, named under
   `azure-workload-default` — the general-purpose, hyphen-separated Convention Pack
   (see
   [`specification/convention-packs/azure-workload-default.md`](../../../specification/convention-packs/azure-workload-default.md)).
2. `azure_key_vault`, named under `azure-workload-compact` instead — Key Vault's
   24-character maximum name length does not fit `azure-workload-default`'s full
   naming component set (see
   [`specification/convention-packs/azure-workload-compact.md`](../../../specification/convention-packs/azure-workload-compact.md)).

Each request follows the same `terraform-external` protocol as
[`../external/main.tf`](../external/main.tf): a `{ naming_request,
evaluation_context }` document is encoded with `jsonencode(...)` into
`query.request_json`, and `result.name` / `result.valid` / `result.result_json` are
read back as outputs.

## Migration notes: maintaining lamassu-azure's existing generated names is not required

`lamassu-azure`'s own Terraform naming module (`terraform/modules/naming/main.tf`)
hand-rolls a hyphenated pattern per resource type, with an underscore-only special case
for `azurerm_shared_image_gallery` because Azure's naming grammar forbids hyphens for
that resource type (see
[`specification/convention-packs/azure-workload-underscore.md`](../../../specification/convention-packs/azure-workload-underscore.md),
which now documents that exact constraint for `azure_compute_gallery`, the Resource
Type this catalog uses for that same resource).

Adopting this example's Convention Packs is **not required to preserve
`lamassu-azure`'s existing generated names byte-for-byte**. The naming component order,
abbreviations, and separators declared by `azure-workload-default`,
`azure-workload-compact`, and `azure-workload-underscore` are an independent,
Specification-driven naming policy; a resource migrated to name itself through this
catalog may receive a different, but equally valid, name than `lamassu-azure`'s own
naming module previously produced for it. Treat adoption as a one-time rename, not an
in-place, invisible replacement — plan any migration of already-provisioned resources
accordingly (for example, `terraform state mv`, or accepting a resource replacement,
depending on whether the target resource type supports renaming in place).

## Try it

```shell
npm install --workspaces --include-workspace-root=false --omit=dev
npm run build --workspace=@lksnext/iac-conventions-cli
export PATH="$PWD/../../../packages/cli/node_modules/.bin:$PWD/../../../packages/cli:$PATH"
terraform init -backend=false
terraform validate
terraform apply
```

## Limitations

- This is a bridge, not a native Terraform provider: see
  [`docs/integrations/terraform.md`](../../../docs/integrations/terraform.md#limitations).
- This example does not model global name uniqueness for `azure_key_vault` or
  `azure_postgresql_flexible_server`: it validates length and character constraints
  only, consistent with how this catalog's Resource Definitions themselves document
  that gap (see
  `packages/catalog/src/azure/key-vault.ts` and
  `packages/catalog/src/azure/postgresql-flexible-server.ts`).
