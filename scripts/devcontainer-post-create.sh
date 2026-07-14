#!/usr/bin/env bash
# Post-create setup for the iac-resource-conventions Dev Container.
# Idempotent: safe to re-run manually (e.g. "npm run" style: bash scripts/devcontainer-post-create.sh).
set -euo pipefail

# Always operate from the repository root, regardless of the caller's cwd.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

log() {
  printf '==> %s\n' "$1"
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

log "Post-create setup complete"
