# IaC Resource Conventions

Infrastructure as Code Resource Conventions specification and SDKs.

## Development Container

This repository includes a [Dev Container](https://containers.dev/) so the full toolchain
(Terraform, TFLint, terraform-docs, Ansible, Python/Ruff, Node.js, GitHub CLI, jq, yq, shellcheck,
pre-commit, etc.) is available without installing anything locally beyond Docker and VS Code.

**Prerequisites**

- [Docker](https://docs.docker.com/get-docker/) (or a compatible container runtime).
- [Visual Studio Code](https://code.visualstudio.com/) with the
  [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
  extension, or [GitHub Codespaces](https://github.com/features/codespaces).

**Opening the repository in the container**

1. Open this repository in VS Code.
2. Run **Dev Containers: Reopen in Container** from the Command Palette (or accept the prompt
   VS Code shows automatically).
3. On first start, `postCreateCommand` runs [`scripts/devcontainer-post-create.sh`](scripts/devcontainer-post-create.sh),
   which installs Node.js/Python/pre-commit dependencies only for the project files that already
   exist.

**Included tools**

Git, GitHub CLI, Node.js LTS + npm, Python 3 + pip/pipx, Terraform, TFLint, terraform-docs,
Ansible Core, ansible-lint, Ruff, pre-commit, jq, yq, shellcheck, unzip, curl, and make.

**Standard entry point**

`npm run <script>` (and `npm test`) is the single entry point for project tasks. The same scripts
defined in [`package.json`](package.json) are used from VS Code, the command line, and CI/CD —
there are no separate, duplicated task definitions.

**Rebuilding the container**

Run **Dev Containers: Rebuild Container** from the Command Palette after changing
[`.devcontainer/Dockerfile`](.devcontainer/Dockerfile) or [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json).

**Authentication**

No credentials, tokens, or secrets are stored in the container image or configuration. Git and
GitHub CLI authentication is expected to be provided by your host environment (credential
forwarding / `gh auth login` inside the container); cloud provider credentials are not configured
by default.
