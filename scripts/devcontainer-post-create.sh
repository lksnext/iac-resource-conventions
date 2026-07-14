#!/usr/bin/env bash
# Post-create setup for the iac-resource-conventions Dev Container.
# Idempotent: safe to re-run manually (e.g. "npm run" style: bash scripts/devcontainer-post-create.sh).
set -euo pipefail

# Always operate from the repository root, regardless of the caller's cwd.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

log() {
  printf '[devcontainer] %s\n' "$1"
}

# --- Node.js dependencies ----------------------------------------------------
if [ -f package.json ]; then
  if [ -f package-lock.json ]; then
    log "Installing Node.js dependencies with 'npm ci'"
    npm ci
  else
    log "Installing Node.js dependencies with 'npm install'"
    npm install
  fi
else
  log "Skipping Node.js dependencies (no package.json found)"
fi

# --- Python dependencies -----------------------------------------------------
if [ -f requirements.txt ]; then
  log "Installing Python dependencies from requirements.txt"
  pip install --user -r requirements.txt
elif [ -f pyproject.toml ]; then
  log "Installing Python project dependencies from pyproject.toml"
  pip install --user -e .
else
  log "Skipping Python dependencies (no requirements.txt or pyproject.toml found)"
fi

# --- pre-commit hooks ---------------------------------------------------------
if [ -f .pre-commit-config.yaml ]; then
  log "Installing pre-commit hooks"
  pre-commit install
else
  log "Skipping pre-commit hooks (no .pre-commit-config.yaml found)"
fi

# --- Preparing GitHub SSH known_hosts -----------------------------------------
log "Preparing GitHub SSH known_hosts..."

ssh_dir="$HOME/.ssh"
known_hosts="$ssh_dir/known_hosts"

mkdir -p "$ssh_dir"
chmod 700 "$ssh_dir"

# Drop any previously trusted github.com entries so stale/mismatched host keys
# (e.g. left over from a different container instance) can't cause a false
# "REMOTE HOST IDENTIFICATION HAS CHANGED" warning. Ignored if the file doesn't
# exist yet.
ssh-keygen -f "$known_hosts" -R github.com >/dev/null 2>&1 || true

# Official GitHub host keys, published at
# https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
github_host_keys=(
  'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl'
  'github.com ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg='
)

touch "$known_hosts"
for key in "${github_host_keys[@]}"; do
  if ! grep -qxF "$key" "$known_hosts"; then
    printf '%s\n' "$key" >>"$known_hosts"
  fi
done

chmod 600 "$known_hosts"

# --- Updating shell environment ------------------------------------------------
log "Updating shell environment..."

bashrc="$HOME/.bashrc"
touch "$bashrc"

if ! grep -qE '^\s*(export\s+)?EDITOR=' "$bashrc"; then
  printf '\nexport EDITOR=code\n' >>"$bashrc"
fi

if ! grep -qE '^\s*(export\s+)?VISUAL=' "$bashrc"; then
  printf 'export VISUAL=code\n' >>"$bashrc"
fi

log "Done."
