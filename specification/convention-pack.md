# Convention Pack

A Convention Pack is the Specification artifact that answers:

**Purpose:** "How should this organization project canonical models into
platform-specific conventions?"

Convention Packs define organizational policy. They do not define technical platform
constraints, and they do not implement naming. A Convention Pack describes *how*
[Resource Identity](./resource-identity.md) and
[Governance Context](./governance-context.md) should be projected into names, tags,
labels, and annotations — not what those models are, and not the technical rules a
platform imposes on a resource type.

A Convention Pack is selected explicitly by a [Naming Request](./naming-request.md),
using its `convention` field:

```yaml
convention: aws-workload-default
```

The identifier selects the Convention Pack; it does not embed the pack's contents in
the request. The selected Convention Pack is then consumed by
[Context Resolution](./context-resolution.md) and by
[Convention Evaluation](./convention-result.md#convention-evaluation-pipeline).

## Composed from reusable convention dimensions

A Convention Pack remains the single Specification Artifact selected by a Naming
Request's `convention` field — callers select one effective Convention Pack, never three
independent policies. Internally, however, an effective Convention Pack may be
assembled from reusable convention dimensions, so that stable convention is written once and
reused across many effective packs instead of being redefined for every organization,
product, or platform combination:

```text
Convention Pack
├── Platform Convention
├── Organization Convention
└── Deployment Convention
```

- **[Platform Convention](./policies/platform-convention.md)** — how conventions are projected
  for a target infrastructure platform (for example, AWS, Azure, or Kubernetes).
- **[Organization Convention](./policies/organization-convention.md)** — how an organization
  structures and governs its infrastructure platforms (for example, an AWS Organization
  managed through Control Tower, or an Azure Landing Zone).
- **[Deployment Convention](./policies/deployment-convention.md)** — the workload purpose,
  tenancy, isolation, and optional service-tier mapping used by a product or platform
  (for example, an internal workload or a SaaS product).

A concrete Convention Pack may reference, extend, or compose these reusable policy
artifacts, but resolving that composition into a single effective Convention Pack is a
Specification Artifact concern — it happens when the effective Convention Pack is
authored, not as an additional runtime processing stage. The Specification continues to
have exactly two processing stages, Context Resolution and Convention Evaluation (see
[`context-resolution.md`](./context-resolution.md) and
[`convention-result.md`](./convention-result.md#convention-evaluation-pipeline));
composing Platform Convention, Organization Convention, and Deployment Convention into an
effective Convention Pack is not a third stage.

Because these dimensions are independent, the same Deployment Convention can be
composed with different Platform Convention and Organization Convention dimensions to
target different platforms — see
[Deployment Convention: Cross-platform reuse](./policies/deployment-convention.md#cross-platform-reuse).

This document does not define a composition or merge algorithm for these dimensions,
consistent with [Out of scope](#out-of-scope) below.

## Responsibilities

A Convention Pack may define the following, each described briefly below.

**Identity defaults** — default values for Resource Identity attributes that are not
supplied on the Naming Request and cannot be resolved from shared context, allowing a
caller to omit organizationally stable values on every request.

**Governance defaults** — default values for Governance Context attributes, including a
default Governance Profile to apply when the caller does not select one explicitly (see
[`governance-context.md`](./governance-context.md)).

**Required attributes** — which Resource Identity and Governance Context attributes must
be available before Convention Evaluation can proceed, so that incomplete requests are
rejected consistently rather than producing partial or ambiguous output.

**Naming component ordering** — the order in which resolved identity components appear
in a generated name, so that names are structured predictably across every resource
produced under the pack. Formalized normatively in Specification v1.1 (see
[Naming projections](#naming-projections) below).

**Separator** — the literal text, if any, inserted between adjacent naming components
when they are joined into a generated name. New in Specification v1.1 (see
[Naming projections](#naming-projections) below).

**Casing** — the case transformation, if any, applied to each naming component's value
before it is joined into a generated name. New in Specification v1.1 (see
[Naming projections](#naming-projections) below).

**Abbreviations** — the shortened forms used to represent identity components in
generated names, keeping names within practical length limits while remaining
recognizable. Formalized normatively in Specification v1.1 (see
[Naming projections](#naming-projections) below).

**Normalization rules** — how resolved values should be conformed to the pack's naming
style before being combined into a generated name, independently of any technical
constraint imposed by a platform. Casing and separator handling are formalized
separately above; general normalization beyond casing (for example, whitespace
collapsing, diacritic stripping, or character substitution) remains conceptual and
undefined in Specification v1.1 (see [Specification v1.1
Non-Goals](./README.md#specification-v11-non-goals)).

**Metadata projection rules** — how resolved Resource Identity and Governance Context
attributes map onto platform-specific tags, labels, and annotations.

**Context authority rules** — which Evaluation Context source is considered
authoritative for a specific canonical attribute whenever more than one source could
supply it (see [Context authority rules](#context-authority-rules) below).

**Override policy** — which attributes may or may not be overridden on a Naming Request,
and what validation applies to an override when it is allowed (see
[Override policy](#override-policy) below).

## What a Convention Pack must NOT define

A Convention Pack must not define:

- provider technical constraints;
- maximum name lengths;
- allowed provider characters;
- uniqueness algorithms;
- resource placement constraints (for example, requiring a specific region for a
  resource type; see [`resource-definition.md`](./resource-definition.md#placement-constraints));
- provider API behaviour;
- implementation details;
- adapter logic.

These responsibilities belong to [Resource Definition](./resource-definition.md), which
describes the technical rules and placement constraints a resource type must respect, or
to adapters, which translate a Convention Result into a tool-specific interface. A
Convention Pack decides *how organizational policy is projected*; a Resource Definition
decides *what a platform technically allows and where a resource may exist*. Confusing
the two would let organizational policy silently depend on provider-specific technical
limits, and would prevent the same Convention Pack from being reused unchanged across
platforms.

This restriction applies equally to every reusable convention dimension a Convention Pack
may compose — [Platform Convention](./policies/platform-convention.md),
[Organization Convention](./policies/organization-convention.md), and
[Deployment Convention](./policies/deployment-convention.md) alike (see
[Composed from reusable convention dimensions](#composed-from-reusable-convention-dimensions)
above).

## Relationship with the other concepts

**Naming Request** — a Naming Request selects a Convention Pack explicitly via its
`convention` field. The Naming Request does not contain the pack's contents; it only
references the pack by identifier (see [`naming-request.md`](./naming-request.md)).

**Resource Identity** — a Convention Pack supplies identity defaults and required
attributes, and defines how a resolved Resource Identity is projected into a generated
name. It does not alter what Resource Identity fundamentally is (see
[`resource-identity.md`](./resource-identity.md)).

**Governance Context** — a Convention Pack supplies governance defaults, including an
optional default Governance Profile, and defines how a resolved Governance Context is
projected into tags, labels, and annotations. It does not replace Governance Context
(see [`governance-context.md`](./governance-context.md)).

**Context Resolution** — a Convention Pack is one of the inputs Context Resolution
combines, alongside the Naming Request and shared context, to produce a complete
Resource Identity and Governance Context (see
[`context-resolution.md`](./context-resolution.md)).

**Resource Definition** — a Convention Pack and a Resource Definition are consulted
together during Convention Evaluation, but they answer different questions: a Convention
Pack defines organizational projection policy, while a Resource Definition defines
technical constraints for a resource type (see
[`resource-definition.md`](./resource-definition.md)).

**Convention Result** — a Convention Pack's naming, metadata projection, and override
policy determine much of the generated name, tags, labels, and annotations that appear
in the final Convention Result (see [`convention-result.md`](./convention-result.md)).

## Convention Pack lifecycle

The conceptual lifecycle of a Convention Pack, from selection to output, is:

```text
Naming Request + Convention Pack
    -> Context Resolution
        -> Resource Identity + Governance Context
            -> Convention Evaluation (with Resource Definition)
                -> Convention Result
```

A Convention Pack is selected by the Naming Request's `convention` field, but it is an
input to Context Resolution alongside the Naming Request, not a step between them:
Context Resolution is the only processing stage that consumes both. This describes the
conceptual order in which a Convention Pack participates in producing a Convention
Result. It does not describe an implementation, execution runtime, or API.

Convention Pack composition is the primary reuse mechanism in this iteration. This
document does not define a Convention Pack inheritance model; if inheritance is
reintroduced later, it must remain separate from the reusable convention dimensions and
their composition rules.

## Convention Pack naming

Effective Convention Pack identifiers should be clear about which convention dimensions
they compose. Examples of effective, composed Convention Pack identifiers:

```text
corporate-aws-internal
product-a-aws-saas-shared
product-b-aws-saas-trial
product-b-aws-saas-standard
product-b-aws-saas-enterprise
product-b-azure-saas-enterprise
product-b-kubernetes-saas-enterprise
```

These identifiers represent effective, composed conventions — for example,
`product-b-aws-saas-enterprise` composes an AWS Platform Convention, `product-b`'s AWS
Organization Convention, and a Deployment Convention that maps the Enterprise service
tier to dedicated isolation.
They do not encode individual tenant names or dynamically generated deployment scopes:
every Enterprise tenant of `product-b` on AWS is named through the same
`product-b-aws-saas-enterprise` Convention Pack, with the tenant's dedicated deployment
scope supplied as Provisioning Context rather than encoded in the pack's identifier (see
[`context-resolution.md`](./context-resolution.md#evaluation-context)).
See [`policies/deployment-convention.md`](./policies/deployment-convention.md#illustrative-scenarios)
for the scenarios these examples illustrate.

This document does not standardize the exact naming syntax for effective Convention
Pack identifiers; the examples above illustrate the composition, not a required naming
grammar.

## Required attributes

A Convention Pack may declare which Resource Identity and Governance Context attributes
must be available before Convention Evaluation proceeds. Examples include
`organizational.system`, `deployment.environment`, and `functional.resource_type`. This
is the conceptual place where mandatory fields are defined for a given organizational
context — it is not encoded in the Naming Request, Resource Identity, or Governance
Context JSON Schemas, since the same canonical models may have different required
attributes under different Convention Packs.

## Naming projections

A Convention Pack defines how a resolved canonical identity is projected into a
generated name. Specification v1.0 only described this responsibility in prose;
Specification v1.1 adds the normative rules below — additively, without redefining what
a Convention Pack fundamentally is — so that a generated name is deterministic and does
not depend on an implementation's own, unstated choices (see
[`docs/architecture/convention-evaluation-executability.md`](../docs/architecture/convention-evaluation-executability.md)
for the gap analysis that motivated this addition, and [Specification v1.1: Executable
Naming](./README.md#specification-v11-executable-naming) for the full scope and delta).

### Canonical attribute references

A naming rule refers to a Resource Identity attribute using a **canonical attribute
reference**: a dotted path of the form `<plane>.<attribute>`, where `<plane>` is one of
`organizational`, `deployment`, or `functional`, and `<attribute>` is one of that
plane's attributes, as defined in the closed vocabulary in
[`resource-identity.md#canonical-attribute-references`](./resource-identity.md#canonical-attribute-references).
Governance Context attributes are not part of this vocabulary: Governance Context
participates only in [Metadata projections](#metadata-projections), never in naming, so
a naming rule that references a Governance Context attribute is invalid.

### Component ordering

`naming_component_order` declares, as an ordered list of canonical attribute
references, exactly which Resource Identity attributes appear in a generated name, and
in what order. Rendering order always matches declaration order.

- A reference outside the closed canonical attribute vocabulary is invalid.
- A reference listed more than once is invalid.
- An absent optional component (one not listed in [Required
  attributes](#required-attributes)) is omitted from the generated name entirely,
  together with the separator that would otherwise surround it.
- An absent required component prevents a name from being generated at all for that
  resource (see [Naming rule execution order](#naming-rule-execution-order) below).
- `naming_component_order` remains optional: when it is absent, or an empty list, no
  naming components are declared, and no name is generated for resources projected
  under that Convention Pack — this matches the existing behavior of the Reference
  Evaluator's resource projection.
- Literal (fixed-text) naming components are not introduced in Specification v1.1: no
  implementation evidence demonstrated a need for one, and introducing one
  speculatively would be inconsistent with this Specification's evidence-driven
  evolution principle (see [`README.md#future-evolution`](./README.md#future-evolution)).

### Separator

`separator` is a new, optional string a Convention Pack declares to join adjacent
naming components. It may be any string, including the empty string, and is not
restricted to a single character. When `separator` is omitted, its value is the empty
string: naming components are concatenated directly, with nothing inserted between
them. No particular separator (for example `-`) is assumed by the Specification; a
Convention Pack that wants one declares it explicitly, keeping the naming rule itself
platform-independent.

The separator is inserted only between two components that both appear in the final,
already-filtered sequence (see [Naming rule execution
order](#naming-rule-execution-order)): an omitted optional component never leaves a
leading, trailing, or doubled separator, because the join step only runs after absent
optional components have already been removed. The Specification does not sanitize a
naming component's own resolved or abbreviated value: if that value happens to already
contain the separator's exact characters, the rendered name will contain them too —
this is a concern for a resolved attribute value, a Resource Definition constraint, or a
future normalization rule (see [Specification v1.1
Non-Goals](./README.md#specification-v11-non-goals)), not for separator semantics
themselves.

### Casing

`casing` is a new, optional field selecting one of a small, closed set of casing
transformations applied to each naming component's value:

| Value | Effect |
| --- | --- |
| `preserve` | The component's value is used exactly as resolved (and, if applicable, abbreviated — see [Abbreviations](#abbreviations)); no case transformation is applied. |
| `lower` | The component's value is mapped to lowercase using the Unicode Default Case Conversion algorithm's lowercase mapping, applied without regard to locale. |
| `upper` | The component's value is mapped to uppercase using the Unicode Default Case Conversion algorithm's uppercase mapping, applied without regard to locale. |

`casing` defaults to `preserve` when omitted, so a Convention Pack that does not
declare a casing rule generates names using resolved values exactly as they appear in
Resource Identity. No other casing style (for example `camelCase`, `PascalCase`,
`snake_case`, or title case) is defined in Specification v1.1: none was demonstrated
necessary to make naming deterministically executable, and adding one speculatively
would exceed this version's scope (see [Specification v1.1:
Scope](./README.md#scope)).

The Unicode Default Case Conversion algorithm (Unicode Standard, Chapter 3, "Default
Case Algorithms") is locale-insensitive but is not restricted to one-to-one code point
mappings: it applies every locale-insensitive mapping in both `UnicodeData.txt` and
`SpecialCasing.txt`, so a single input code point can map to more than one output code
point (for example, `ß` U+00DF uppercases to the two-character sequence `SS`, and `İ`
U+0130 lowercases to the two-character sequence `i` + U+0307 COMBINING DOT ABOVE). This
is a deliberately different, broader algorithm than the "Unicode simple case mapping"
referenced by earlier drafts of this section, which is restricted to the strictly
one-to-one mappings in `UnicodeData.txt` alone and would leave code points such as `ß`
unchanged. `casing: lower` and `casing: upper` are defined in terms of Default Case
Conversion, rather than the stricter simple case mapping, because Default Case
Conversion is the Unicode Standard's own general-purpose, locale-independent case
conversion algorithm; requiring the stricter simple mapping instead would silently
exclude well-formed one-to-many mappings such as `ß` → `SS` for no normative reason. See
[`docs/architecture/convention-evaluation-executability.md#casing-semantics`](../docs/architecture/convention-evaluation-executability.md#casing-semantics)
for the cross-runtime, non-normative evidence (ECMA-262, the Unicode Character Encoding
Stability Policies, and the current Reference Evaluator's conformance) that motivated
this choice.

Casing applies to each naming component's final per-component value — after
abbreviation substitution, if any (see [Naming rule execution
order](#naming-rule-execution-order)) — never to `separator` itself, which is always
inserted verbatim.

### Abbreviations

`abbreviations` maps a canonical attribute reference to an exact-match table of
resolved values and their abbreviated forms:

```yaml
abbreviations:
  deployment.environment:
    production: prd
    development: dev
  functional.resource_type:
    aws_s3_bucket: s3
```

- The outer key is a canonical attribute reference; an outer key outside the closed
  vocabulary is invalid, the same as an invalid `naming_component_order` entry.
- The inner key is the exact, case-sensitive resolved value of that attribute. Matching
  is exact-string only: no prefix, substring, wildcard, or pattern matching is defined.
- At most one abbreviation can ever apply to a given component, because the mapping is
  keyed uniquely by the pair of attribute and value; there is no ambiguity to resolve
  between competing abbreviations.
- When no mapping exists for a component's attribute, or no entry matches its exact
  resolved value, the component's original resolved value is used unchanged. This is
  the only fallback behavior; it is not itself a warning or a failure.
- Abbreviation is applied before casing (see [Naming rule execution
  order](#naming-rule-execution-order)): an abbreviation's mapped value is itself
  subject to the Convention Pack's `casing` rule, exactly like an unabbreviated resolved
  value, so a Convention Pack only declares one casing rule for the whole name, not one
  per abbreviation entry.

This is a shape change from how Specification v1.0 sketched `abbreviations`, called out
explicitly in [Delta from Specification
v1.0](./README.md#delta-from-specification-v10): v1.0 never made abbreviations
executable, no Reference Evaluator code reads the field today, and no concrete
Convention Pack defines one (see
[`docs/architecture/convention-evaluation-executability.md`](../docs/architecture/convention-evaluation-executability.md)).
Formalizing the field for the first time, rather than reusing an under-specified shape
that was never exercised, is treated as the smaller-risk option.

### Naming rule execution order

A conforming implementation of Specification v1.1 naming rules produces the following
sequence, in this exact order, for every reference declared by
`naming_component_order`:

1. **Resolve** each canonical attribute reference against the resolved Resource
   Identity.
2. **Classify** each resolved reference: present; absent and optional (omit it and its
   surrounding separator in step 5); or absent and required (see [Required
   attributes](#required-attributes)) — in which case name generation fails for this
   resource: no `name` is produced, reported the same way Convention Evaluation already
   reports any other unresolved required attribute (see
   [`convention-result.md`](./convention-result.md#convention-evaluation-pipeline)).
3. **Apply abbreviation** to every present component's resolved value (see
   [Abbreviations](#abbreviations)).
4. **Apply casing** to every present component's, possibly abbreviated, value (see
   [Casing](#casing)).
5. **Omit** every absent-and-optional component from the sequence.
6. **Join** the remaining, ordered per-component values using `separator` (see
   [Separator](#separator)).
7. The joined string is the resource's generated name, validated against the resource's
   Resource Definition constraints exactly as already described in
   [`convention-result.md`](./convention-result.md#convention-evaluation-pipeline).

No other order is conforming: two implementations that, for example, applied casing
before abbreviation could disagree on the generated name for identical input, which
would violate the deterministic-output principle this version exists to satisfy (see
[`README.md#architectural-principles`](../README.md#architectural-principles)).
Specification v1.1 does not change the validation step in point 7, and does not make
every Resource Definition constraint in it executable — see [Specification v1.1
Non-Goals](./README.md#specification-v11-non-goals).

### Naming fields

| Field | Required | Default | Invalid values |
| --- | --- | --- | --- |
| `naming_component_order` | No | No naming components declared; no name is generated | A reference outside the canonical attribute vocabulary; a duplicate reference |
| `separator` | No | `""` (components are concatenated directly) | None beyond being a string |
| `casing` | No | `preserve` | Any value other than `preserve`, `lower`, or `upper` |
| `abbreviations` | No | No abbreviation applies to any component | An outer key outside the canonical attribute vocabulary |

### Naming rule examples

These are normative test vectors: given the `naming_component_order`, `separator`,
`casing`, and `abbreviations` shown, and the resolved Resource Identity attributes
shown, the generated `name` is exactly as shown.

**Minimal example** — every declared component present, no abbreviation, default
casing and separator:

```yaml
# Convention Pack naming rule
naming_component_order:
  - organizational.system
  - functional.service
  - functional.resource_type
separator: "-"

# Resolved Resource Identity (relevant attributes only)
organizational:
  system: telemetry-platform
functional:
  service: ingestion
  resource_type: aws_s3_bucket

# Generated name
name: telemetry-platform-ingestion-aws_s3_bucket
```

**Optional component absent** — `functional.component` is declared but not resolved for
this resource, so it and its surrounding separator are omitted:

```yaml
naming_component_order:
  - organizational.system
  - functional.service
  - functional.component
  - functional.resource_type
separator: "-"

organizational:
  system: telemetry-platform
functional:
  service: ingestion
  resource_type: aws_s3_bucket
# functional.component is not resolved for this resource

name: telemetry-platform-ingestion-aws_s3_bucket
```

**Abbreviation** — `deployment.environment` has a matching abbreviation entry:

```yaml
naming_component_order:
  - organizational.system
  - deployment.environment
  - functional.resource_type
separator: "-"
abbreviations:
  deployment.environment:
    production: prd

organizational:
  system: telemetry-platform
deployment:
  environment: production
functional:
  resource_type: aws_s3_bucket

name: telemetry-platform-prd-aws_s3_bucket
```

**Casing** — `casing: lower` normalizes an inconsistently-cased resolved value:

```yaml
naming_component_order:
  - organizational.system
  - functional.resource_type
separator: "-"
casing: lower

organizational:
  system: Telemetry-Platform
functional:
  resource_type: aws_s3_bucket

name: telemetry-platform-aws_s3_bucket
```

**Validation without truncation** — the generated name violates the Resource
Definition's `max_length`; Specification v1.1 reports this as a validation failure
instead of silently truncating the name (see [Specification v1.1
Non-Goals](./README.md#specification-v11-non-goals)):

```yaml
naming_component_order:
  - organizational.system
  - functional.service
  - functional.resource_type
separator: "-"

organizational:
  system: telemetry-platform
functional:
  service: ingestion-pipeline-orchestration
  resource_type: aws_s3_bucket

# Resource Definition: max_length: 24

name: telemetry-platform-ingestion-pipeline-orchestration-aws_s3_bucket
validation:
  valid: false
  failures:
    - message: "name exceeds max_length of 24 characters"
```

## Metadata projections

A Convention Pack defines how resolved Resource Identity and Governance Context become
platform-specific metadata, such as AWS Tags, Azure Tags, Kubernetes Labels, and
Kubernetes Annotations. This document does not define concrete key mappings or value
formats; it only describes that this is a Convention Pack responsibility, consistent
with the metadata projection described in
[`governance-context.md`](./governance-context.md#metadata-projection).

## Context authority rules

A Convention Pack declares which Evaluation Context source is considered
authoritative for a specific canonical attribute whenever more than one Evaluation
Context source could supply it. This is different from precedence, which is a fixed,
Specification-wide resolution order (see
[`context-resolution.md`](./context-resolution.md#resolution-precedence)): authority is
attribute-specific organizational policy, declared per Convention Pack, about which
source's value should be trusted once several sources are available. Examples of
attributes a Convention Pack may declare authority rules for:

- `deployment.deployment_scope`;
- `deployment.platform`;
- `deployment.environment`;
- `deployment.location`;
- `organizational.tenant`.

Context authority rules influence resolution only: they determine which Evaluation
Context source Context Resolution trusts for a given attribute, but they never become
part of the resulting [Resource Identity](./resource-identity.md) or
[Governance Context](./governance-context.md) themselves — only the resolved attribute
value they helped select does.

Authority and protection are related but independent: a Convention Pack may declare an
attribute authoritative from a specific source without protecting it from override, or
protect an attribute without needing to declare an explicit authority rule for it (see
[Override policy](#override-policy) below and
[`context-resolution.md`](./context-resolution.md#precedence-authority-and-protection)).

Responsibilities are divided as follows:

- **Convention Pack** declares which Evaluation Context source is authoritative for a
  given attribute, and declares whether that attribute is protected from override.
- **Context Resolution** applies the authority and protection rules a Convention Pack
  declares; it does not decide them itself (see
  [`context-resolution.md`](./context-resolution.md#precedence-authority-and-protection)).
- **Convention Evaluation** validates the resulting resolved model against Resource
  Definition constraints and Specification rules.

## Override policy

A Convention Pack may define which attributes are overridable, which are protected from
being overridden, and what validation policy applies to an allowed override. The
responsibilities are divided as follows:

- **Context Resolution** accepts overrides supplied in a Naming Request's `overrides`
  block (see [`context-resolution.md`](./context-resolution.md#overrides)).
- **Convention Packs** decide whether a given attribute is allowed to be overridden at
  all.
- **Convention Evaluation** validates an allowed override against Resource Definition
  constraints and Specification rules before it is used.

## Versioning

Convention Packs are versioned independently of the Specification itself. Changing a
Convention Pack's required attributes, abbreviations, component ordering, separator,
casing, or metadata projections may change the generated name, tags, labels, or
annotations for resources that already exist, which is a potentially breaking change. Convention Packs therefore
follow [Semantic Versioning](https://semver.org/), consistent with how the rest of the
Specification treats naming algorithms, abbreviations, and generated outputs (see
[`AGENTS.md`](../AGENTS.md#compatibility-and-versioning)).

## Out of scope

This document defines the *concept* of a Convention Pack only. It intentionally does
not define:

- actual Convention Packs (for example, `aws-workload-default`);
- concrete Platform Convention, Organization Convention, or Deployment Convention artifacts
  (see [`policies/`](./policies/));
- YAML or JSON syntax for expressing a Convention Pack or any of its composed policy
  dimensions;
- a JSON Schema for Convention Packs or any of its composed policy dimensions;
- an inheritance algorithm;
- a composition or merge algorithm for Platform Convention, Organization Convention, and
  Deployment Convention;
- any implementation.

These are left for a later iteration of the Specification, once the conceptual model has
been validated.

## Where Convention Pack fits

See the canonical pipeline diagram in
[`specification/README.md`](./README.md#architecture). Convention Pack is an input to
Context Resolution, alongside the Naming Request and Evaluation Context — it is not
itself a processing stage. The pipeline has exactly two processing stages, Context
Resolution and Convention Evaluation; every other concept, including Convention Pack, is
a domain model or Specification artifact consumed by one of those two stages.
