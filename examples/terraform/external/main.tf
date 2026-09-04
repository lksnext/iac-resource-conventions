terraform {
  required_version = ">= 1.5"

  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3"
    }
  }
}

# Evaluates a Naming Request for an `aws_iam_role` resource against the
# `aws-workload-default` Convention Pack through the `iac-conventions
# terraform-external` bridge (Milestone 4.4). See ./README.md and
# ../../../docs/integrations/terraform.md for the full protocol mapping.
#
# No AWS credentials or provider are required: this data source only evaluates
# naming conventions locally, it never contacts AWS.
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

# The full ConventionResult (resolved identity, governance context, validation, and
# any warnings), decoded from the string-only `result_json` field the `external`
# protocol requires (see ./README.md).
locals {
  convention_result = jsondecode(data.external.convention.result.result_json)
}

output "generated_name" {
  description = "The canonical name generated for the aws_iam_role resource."
  value       = data.external.convention.result.name
}

output "valid" {
  description = "Whether the generated outputs and resolved identity satisfied every checked constraint."
  value       = data.external.convention.result.valid
}
