#!/usr/bin/env bash
# Guard G1 (Uplift Phase 6, docs/mobile/ARCHITECTURE.md "Cloud (built OFF)"):
# no secrets in the mobile app's tracked files.
#
# Usage (from the repo root): bash scripts/check_secrets.sh
#
# Greps every file git tracks under mobile/ for the patterns in
# scripts/secret_patterns.txt (one extended regex per line): service-role
# and secret keys, live payment keys, PEM private keys, and JWTs. Anything
# with EXPO_PUBLIC_ in its name is bundled into the app where anyone can
# read it, so a secret must never be near mobile/ at all. Any hit fails.
#
# Scoped to mobile/ on purpose: server code (supabase/functions) legitimately
# handles key material in its tests and never ships in the app.
# The pattern list itself lives outside mobile/, so it never matches itself.
set -euo pipefail
cd "$(dirname "$0")/.."
PATTERNS=scripts/secret_patterns.txt
mapfile -t FILES < <(git ls-files -z -- mobile | tr '\0' '\n' | grep -v '^$')
if [ "${#FILES[@]}" -eq 0 ]; then
  echo "G1: no tracked files under mobile/" >&2
  exit 1
fi
if grep -nIE -f "$PATTERNS" -- "${FILES[@]}"; then
  echo "G1 failed: the lines above look like secrets. Secrets live only in EAS secrets or Supabase function secrets." >&2
  exit 1
fi
echo "G1: no secrets in ${#FILES[@]} tracked files under mobile/."
