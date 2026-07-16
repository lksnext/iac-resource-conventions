# Naming Request

The Naming Request is the public contract a user or system submits when it needs a
resource named, tagged, or labeled according to project conventions. It is intentionally
small: users describe only the information that is specific to the resource they are
requesting, not the resource's complete Resource Identity.

## Users should not provide a complete Resource Identity

A complete [Resource Identity](./resource-identity.md) spans three planes: organizational,
deployment, and functional. [Governance Context](./governance-context.md) is modeled
separately. Requiring a caller to supply all of that information for every request would
be repetitive, error-prone, and would leak organizational, deployment, and governance
details into every call site.

Instead, a Naming Request carries only the details that are unique to the specific
resource being named — primarily its functional identity and any deployment detail that
cannot be inferred from context. Governance context is optional. Everything else is
resolved on the caller's behalf.

## Request model

Callers should provide only the minimum functional information not already available
from context or the selected Convention Pack. `component` is optional and should not be
required for every request. Governance Context may also be supplied when the caller
knows it:

```yaml
convention: aws-workload-default

resource_type: aws_s3_bucket

functional:
  service: ingestion
  component: storage

deployment:
  instance: "01"

governance:
  owner: platform-team
  managed_by: terraform
  profile: standard
```

`resource_type` is exposed at the top level of the Naming Request for convenience and is
resolved into `functional.resource_type` in the canonical Resource Identity. It is not
duplicated inside the `functional` block of the request.

`convention` and `governance.profile` are independent selectors, even though both are
optional values supplied on the same request:

- `convention` selects the Convention Pack — the organizational naming, deployment, and
  metadata projection conventions used to resolve this request.
- `governance.profile` selects the Governance Profile — the governance policy applied to
  the resource (see [`governance-context.md`](./governance-context.md)).

Selecting a Convention Pack does not select a Governance Profile, and selecting a
Governance Profile does not select a Convention Pack. A Convention Pack may declare a
default Governance Profile to apply when the caller does not supply one, but the two
selectors remain independent and may be combined freely.

## The Context Resolution pipeline

A Naming Request is transformed through the Context Resolution pipeline into a complete
Resource Identity and Governance Context, and ultimately into a Convention Result:

```mermaid
flowchart TD
    NR["Naming Request"] --> CP["Convention Pack"]
    CP --> CR["Context Resolution"]
    CR --> RI["Resource Identity"]
    CR --> GC["Governance Context"]
    RI --> CE["Convention Engine"]
    GC --> CE
    CE --> Result["Convention Result"]
```

- **Naming Request** — the minimal, user-supplied description of the resource.
- **Convention Pack** — selected explicitly via the request's `convention` field;
  enriches the request with naming defaults, deployment defaults, governance defaults
  (including an optional default Governance Profile), and metadata projection rules
  appropriate to the organization or platform in use. A Convention Pack does not
  replace Governance Context.
- **Context Resolution** — derives deployment context and any other shared values needed
  to complete the model.
- **Resource Identity** — the canonical, fully-resolved identity produced by combining
  the request, the Convention Pack, and shared context.
- **Governance Context** — the resolved ownership and operational governance context for
  the resource. See [`governance-context.md`](./governance-context.md) for the full
  model.
- **Convention Engine** — evaluates the Specification against Resource Identity and
  Governance Context.
- **Convention Result** — the final output produced for the caller.

In short: Convention Packs project both Resource Identity and Governance Context into
names, AWS Tags, Azure Tags, Kubernetes Labels, annotations, and other convention
outputs. Context Resolution supplies the shared data needed to complete the model; the
Convention Engine evaluates both models to produce a Convention Result.

## Precedence order

When Context Resolution completes the model, values are applied in the following order,
from lowest to highest precedence:

1. **Convention Pack defaults** — naming, deployment, and metadata defaults declared by
   the selected Convention Pack.
2. **Shared Organizational Context** — organizational values resolved from shared
   context (for example, `organization`, `business_unit`).
3. **Shared Deployment Context** — deployment values resolved from shared context (for
   example, `platform`, `deployment_scope`).
4. **Governance Profile defaults** — governance defaults declared by the selected
   Governance Profile.
5. **Naming Request values** — values explicitly supplied by the caller in the Naming
   Request.
6. **Explicit overrides** — values supplied in the request's `overrides` block.

Convention Packs establish organizational naming and metadata conventions; Governance
Profiles establish governance defaults. Values explicitly supplied in the Naming Request
override any default from either source, and explicit overrides always take the highest
precedence.

## Differences between the core concepts

| Concept              | Description                                                                                       | Supplied by                          |
| -------------------- | --------------------------------------------------------------------------------------------------|---------------------------------------|
| **Naming Request**    | The minimal, public request describing what is specific to a single resource.                     | The caller (user or system).          |
| **Resource Identity** | The complete, canonical, three-plane model describing a resource's identity.                      | Resolved by the Convention Engine.    |
| **Governance Context** | The operational ownership and policy context associated with the resource.                         | Resolved from the request and shared context. |
| **Convention Pack**   | A reusable configuration, selected via `convention`, that supplies naming defaults, deployment defaults, governance defaults (including an optional default Governance Profile), and metadata projection rules. It does not replace Governance Context. | Provided by the project or organization; selected by the caller. |
| **Governance Profile** | The named governance policy, selected via `governance.profile`, that supplies governance defaults independently of the Convention Pack. | Provided by the project or organization; selected by the caller. |
| **Convention Result** | The final output produced by evaluating the Specification against Resource Identity and Governance Context. | Produced by the Convention Engine.    |

A Naming Request is an *input*; Resource Identity is the *canonical internal model*;
Governance Context is the separate operational policy model; a Convention Pack is
*configuration* that shapes how the request is enriched; and a Convention Result is the
*output* consumed by the caller.
