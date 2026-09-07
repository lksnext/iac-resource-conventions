terraform {
  required_version = ">= 1.5"

  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3"
    }
  }
}

# Evaluates Naming Requests for the Azure resource types used by the lamassu-azure
# reference project (https://github.com/lamassuiot/lamassu-azure) through the
# `iac-conventions terraform-external` bridge (Milestone 4.4), using this catalog's
# Azure Convention Packs instead of lamassu-azure's own hand-written naming module.
# See ./README.md and ../../../docs/integrations/terraform.md for the full protocol
# mapping.
#
# No Azure credentials or provider are required: this data source only evaluates
# naming conventions locally, it never contacts Azure.

locals {
  system      = "lamassu"
  environment = "production"
  location    = "westeurope"
}

# azure-workload-default: general-purpose, hyphen-separated pack. Valid for every
# Resource Type in this example except azure_key_vault (see the key_vault block below).
data "external" "resource_group" {
  program = ["iac-conventions", "terraform-external"]

  query = {
    request_json = jsonencode({
      naming_request = {
        convention    = "azure-workload-default"
        resource_type = "azure_resource_group"
        functional = {
          service = "platform"
        }
      }
      evaluation_context = {
        shared_organizational_context = {
          system = local.system
        }
        shared_deployment_context = {
          environment = local.environment
          location    = local.location
        }
      }
    })
  }
}

data "external" "virtual_network" {
  program = ["iac-conventions", "terraform-external"]

  query = {
    request_json = jsonencode({
      naming_request = {
        convention    = "azure-workload-default"
        resource_type = "azure_virtual_network"
        functional = {
          service = "platform"
        }
      }
      evaluation_context = {
        shared_organizational_context = {
          system = local.system
        }
        shared_deployment_context = {
          environment = local.environment
          location    = local.location
        }
      }
    })
  }
}

# azure-workload-compact: azure_key_vault's 24-character maximum length does not fit
# azure-workload-default's full naming component set (see
# specification/convention-packs/azure-workload-compact.md).
data "external" "key_vault" {
  program = ["iac-conventions", "terraform-external"]

  query = {
    request_json = jsonencode({
      naming_request = {
        convention    = "azure-workload-compact"
        resource_type = "azure_key_vault"
      }
      evaluation_context = {
        shared_organizational_context = {
          system = local.system
        }
        shared_deployment_context = {
          environment = local.environment
        }
      }
    })
  }
}

output "resource_group_name" {
  description = "The canonical name generated for the azure_resource_group resource."
  value       = data.external.resource_group.result.name
}

output "virtual_network_name" {
  description = "The canonical name generated for the azure_virtual_network resource."
  value       = data.external.virtual_network.result.name
}

output "key_vault_name" {
  description = "The canonical name generated for the azure_key_vault resource."
  value       = data.external.key_vault.result.name
}

output "key_vault_valid" {
  description = "Whether the generated Key Vault name satisfied every checked constraint."
  value       = data.external.key_vault.result.valid
}
