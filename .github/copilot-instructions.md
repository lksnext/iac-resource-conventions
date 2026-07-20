# Copilot Instructions

This file is concise, operational guidance for Copilot in this repository. For the full project
architecture, goals, repository structure, and detailed rationale, see
[`AGENTS.md`](../AGENTS.md) — that document is the primary architectural reference for this
repository. For the implementation monorepo architecture — package boundaries, dependency
direction, module format, build/test strategy — see [`IMPLEMENTATION.md`](../IMPLEMENTATION.md).

## Tools

Use Serena MCP tools for codebase exploration and edits in this repository.

Prefer Serena symbol and reference tools over raw file reads when they are available.

Use GitHub MCP tools for GitHub issues, pull requests, notifications, and repository
metadata when those tasks come up.

If Serena is unavailable for a task, fall back to the standard workspace tools.

## Project Architecture

This is a **Specification First** monorepo: conventions are defined once and consumed by
multiple adapters. See [`AGENTS.md`](../AGENTS.md) for full detail, including the **Current
Repository Structure** and **Planned Architecture** sections. Key rules that affect how Copilot
should implement changes:

- **Inspect before creating** — always check the actual repository contents before creating a
  new file or directory. Never create `packages/catalog/`, `packages/cli/`,
  `packages/adapters/`, `fixtures/`, `tests/`, or `docs/` just because they are mentioned in
  `AGENTS.md` or `IMPLEMENTATION.md` — they are planned, not present, until a task genuinely
  requires them. `packages/core/` already exists — see [`IMPLEMENTATION.md`](../IMPLEMENTATION.md)
  for its current contents and boundaries.
- **Specification First** — `specification/` exists and is the current single source of truth
  for the domain models and schemas already defined there (Resource Identity, Governance
  Context, the Naming Request, and their JSON Schemas). Inspect it before proposing changes to
  concepts, schemas, examples, or future adapters. Do not invent concepts that are not yet
  present in it, and do not encode these rules directly in an adapter.
- **Adapter Consistency** — Terraform, AWS CDK, Ansible, CLI, and future adapters consume the
  Specification; they must not redefine or independently duplicate convention rules. All adapters
  must produce equivalent results for the same canonical input, unless a documented platform
  constraint requires a difference. Shared fixtures and contract tests are the authoritative
  compatibility mechanism across adapters.
- **Convention Pack Composition** — an effective Convention Pack is still the single
  Specification Artifact selected via a Naming Request's `convention` field, but it may compose
  reusable Platform Convention, Organization Convention, and Deployment Convention dimensions (see
  `specification/policies/` and `specification/convention-pack.md`). Never create a Convention
  Pack per tenant or customer, never treat Control Tower as a platform or deployment convention
  pattern, and never treat Evaluation Context (its shared organizational context, shared
  deployment context, Runtime Context, and Provisioning Context; see
  `specification/context-resolution.md#evaluation-context`) as part of a Convention Pack.
- **Generated Artifacts** — never edit generated files by hand. Changes affecting generated
  output must start in the Specification, generator, or source template, then regenerate.
- **Testing Expectations** — any change to the Specification must include corresponding updates
  to contract tests, and must verify that all affected adapters still behave consistently.
- **Semantic Versioning and Compatibility** — public APIs, schemas, Convention Packs, generated
  outputs, naming algorithms, abbreviations, truncation rules, and hash strategies follow SemVer.
  Treat any change that can alter an existing generated name, tag, label, annotation, canonical
  identifier, or validation result as potentially breaking; prefer backward-compatible changes.
- **Cross-platform Development** — prefer portable implementations that work on Linux, macOS,
  Windows, the Dev Container, and CI/CD. Use the root `package.json` npm scripts as the standard
  task entry point, and avoid duplicating a command's implementation across VS Code, docs,
  CI/CD, and local development.
- **Repository Infrastructure** — do not modify `.github/`, `.devcontainer/`, `.vscode/`,
  `.serena/`, `.editorconfig`, or `.gitignore` unless the task explicitly calls for it.
- **Scope** — keep changes focused, reviewable, and limited to the requested scope. Do not
  introduce new runtime dependencies, tools, frameworks, or build systems unless necessary and
  justified.

## Specification Freeze (v1.0)

Assume the conceptual Specification is frozen at v1.0 (see
`specification/README.md#specification-status`).

- Do not redesign Concepts already documented under `specification/`.
- Prefer implementation changes (Resource Definitions, Convention Packs, the Reference
  Evaluator, adapters) over conceptual Specification changes.
- Only propose a Specification modification when implementation demonstrates that the
  current model cannot represent a valid scenario.
- Avoid speculative conceptual improvements — the Specification evolves from
  implementation evidence, not theoretical review.

## Commit Safety and Approval

Copilot must never create a commit automatically after modifying files. Committing is always a
separate, explicit step that requires the user's approval.

### Before proposing a commit

Before creating any commit, Copilot must:

- Summarize the files changed.
- Summarize the purpose of the changes.
- Report the validation, linting, formatting, and tests executed.
- Report any checks that were not executed.
- Show the proposed commit message.
- Ask the user for explicit approval to create the commit.

### Waiting for approval

Copilot must wait for an unambiguous user response such as:

- "Approve the commit"
- "Create the commit"
- "Commit these changes"

General confirmations such as "looks good", "continue", or "okay" must **not** be treated as
approval to commit unless the user explicitly mentions the commit.

If the user requests changes after the summary, Copilot must apply them, repeat the relevant
validation, provide a new summary, and request approval again.

### Restrictions

Copilot must not:

- Commit partially completed work.
- Commit when required checks are failing.
- Commit unrelated changes.
- Stage files that are unrelated to the requested task.
- Amend, rebase, reset, force-push, or rewrite Git history unless the user explicitly requests it.
- Push a commit unless the user explicitly requests the push as a separate action.

### Signed commits

Every commit created by Copilot must be cryptographically signed, using `git commit -S` or the
equivalent signed-commit mechanism configured in Git.

Before creating a commit, verify that commit signing is configured and functional. Suggested
checks include:

```bash
git config --get user.signingkey
git config --get commit.gpgsign
git config --get gpg.format
```

Do not expose private keys, secret key material, tokens, or sensitive configuration.

If signing is not configured or the signed commit fails:

- Stop.
- Do not create an unsigned commit.
- Explain the issue to the user.
- Ask the user to configure signing or explicitly handle the commit themselves.
- Never silently fall back to an unsigned commit.

Prefer SSH commit signing when the repository documentation does not mandate another signing
method, but respect the contributor's existing valid Git signing configuration.

### Commit message conventions

Use Conventional Commits for proposed commit messages when compatible with the repository's
existing conventions. Examples:

```text
feat(terraform): add initial resource convention module
docs(contributing): clarify repository governance
chore(devcontainer): install GitHub CLI
```

Keep the proposed commit focused and atomic.

### Before committing

Before committing, inspect the staged diff and confirm that only intended files are included.
Suggested command:

```bash
git diff --cached
```

### After approval

After the user explicitly approves the commit:

- Stage only the intended files.
- Recheck the staged diff.
- Create a signed commit.
- Report the resulting commit hash and commit subject.
- Do not push automatically.

### Workflow example

1. Modify files.
2. Run relevant checks.
3. Present a change summary and proposed commit message.
4. Wait for explicit user approval.
5. Create a signed commit.
6. Report the commit result.
7. Wait for a separate explicit request before pushing.
