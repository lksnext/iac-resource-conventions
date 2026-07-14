# Debian-based Microsoft Dev Containers base image; already provides a
# non-root "vscode" user, git, curl, and sudo.
FROM mcr.microsoft.com/devcontainers/base:bookworm

# Git, GitHub CLI, Node.js, Python and Terraform (+ TFLint) are installed via
# Dev Container Features in devcontainer.json. Only tools with no suitable
# official Feature are installed here, kept to a minimal apt/binary install.
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install --no-install-recommends \
    jq \
    unzip \
    shellcheck \
    make \
    pipx \
    python3-venv \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# yq (Go implementation) and terraform-docs: single static binaries with no
# maintained official Feature, pinned to specific released versions.
ARG YQ_VERSION=v4.44.3
ARG TERRAFORM_DOCS_VERSION=v0.19.0
RUN curl -fsSL -o /usr/local/bin/yq \
    "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64" \
    && chmod +x /usr/local/bin/yq \
    && curl -fsSL \
    "https://github.com/terraform-docs/terraform-docs/releases/download/${TERRAFORM_DOCS_VERSION}/terraform-docs-${TERRAFORM_DOCS_VERSION}-linux-amd64.tar.gz" \
    | tar -xz -C /usr/local/bin terraform-docs \
    && chmod +x /usr/local/bin/terraform-docs

# Python CLI tools, isolated from project virtualenvs via pipx.
USER vscode
RUN pipx install ansible-core \
    && pipx install ansible-lint \
    && pipx install ruff \
    && pipx install pre-commit

# Expose pipx-installed tools on the default PATH without relying on shell rc
# files, since postCreateCommand and non-interactive shells may not source them.
USER root
RUN for f in /home/vscode/.local/bin/*; do \
    ln -sf "$f" "/usr/local/bin/$(basename "$f")"; \
    done

# Pre-create cache directories with vscode ownership. Docker's local volume
# driver copies a directory's existing contents (including ownership) into a
# fresh named volume on first mount, so the caches mounted in devcontainer.json
# come up writable by the non-root user instead of root.
RUN mkdir -p /home/vscode/.npm /home/vscode/.cache/pip /home/vscode/.cache/pre-commit \
    && chown -R vscode:vscode /home/vscode/.npm /home/vscode/.cache

USER vscode
