#!/usr/bin/env bash
# Install the project's git hooks. Idempotent — re-running replaces any
# existing hook with the current versioned script.
#
# Usage (from repo root):
#   bash scripts/install_hooks.sh
#
# What it installs:
#   .git/hooks/pre-commit  →  scripts/pre-commit  (symlinked)
#
# After install, every `git commit` runs scripts/verify_repo.sh first
# and aborts the commit if it fails. To bypass in an emergency:
#   git commit --no-verify
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "Error: not inside a git repository" >&2
  exit 1
}
cd "$repo_root"

hook_src="scripts/pre-commit"
hook_dst=".git/hooks/pre-commit"

if [ ! -f "$hook_src" ]; then
  echo "Error: $hook_src not found" >&2
  exit 1
fi

chmod +x "$hook_src"

if [ -e "$hook_dst" ] || [ -L "$hook_dst" ]; then
  rm -f "$hook_dst"
fi

ln -s "../../$hook_src" "$hook_dst"

echo "✓ Installed pre-commit hook → $hook_dst"
echo "  (symlinked to versioned script $hook_src)"
echo
echo "Test by running:  git commit --allow-empty -m 'test hook'"
echo "Bypass in emergency: git commit --no-verify"
