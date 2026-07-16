# Convention Packs

This directory contains concrete Convention Packs for `iac-resource-conventions`.

## What is a Convention Pack?

A Convention Pack is the Specification artifact that answers "How should this
organization project canonical models into platform-specific conventions?" — naming
defaults, deployment defaults, governance defaults, abbreviations, ordering rules,
metadata projection, and override policy. The abstract concept is defined in
[`../convention-pack.md`](../convention-pack.md); read that document first for the full
conceptual model, including responsibilities, required attributes, naming and metadata
projections, override policy, and versioning.

## Concepts versus Specification Artifacts

The Specification distinguishes between two kinds of content:

- **Concepts** — the abstract, reusable domain models described directly under
  [`specification/`](../README.md) (for example, Resource Identity, Governance Context,
  and the abstract Convention Pack concept itself). A Concept answers a general question
  that applies to every organization adopting the Specification.
- **Specification Artifacts** — concrete instances that apply a Concept to a specific
  organizational policy. A concrete Convention Pack, such as
  [`aws-workload-default.md`](./aws-workload-default.md), is a Specification Artifact: it
  answers the Convention Pack Concept's question for one particular organizational
  scenario, rather than defining the question itself.

Documents in this directory are Specification Artifacts. They apply the Convention Pack
Concept; they do not redefine it. If a decision described here seems to require changing
what a Convention Pack fundamentally *is*, that change belongs in
[`../convention-pack.md`](../convention-pack.md), not in a concrete pack.

## Contents

- [`aws-workload-default.md`](./aws-workload-default.md) — the first concrete Convention
  Pack, describing an organizational naming, governance, and metadata policy for AWS
  workload accounts managed through Terraform.

## Scope of this iteration

This iteration defines concrete Convention Packs as conceptual policy documents only,
written in Markdown. It intentionally does not define:

- YAML representations of a Convention Pack;
- JSON representations of a Convention Pack;
- generated or machine-readable representations of a Convention Pack;
- a JSON Schema for Convention Packs;
- any implementation that reads or applies a Convention Pack.

Future iterations of the Specification may introduce YAML, JSON, or generated
representations of a Convention Pack once the conceptual policy described here has been
validated. Until then, the Markdown documents in this directory are the authoritative
description of each concrete Convention Pack's policy.
