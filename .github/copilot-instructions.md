# Copilot Instructions

Use Serena MCP tools for codebase exploration and edits in this repository.

Prefer Serena symbol and reference tools over raw file reads when they are available.

Use GitHub MCP tools for GitHub issues, pull requests, notifications, and repository metadata when those tasks come up.

If Serena is unavailable for a task, fall back to the standard workspace tools.

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

```
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
