#!/usr/bin/env bash
# Guard G2 (Uplift Phase 6, docs/mobile/ARCHITECTURE.md "Cloud (built OFF)"):
# a build made with the cloud flag OFF carries no cloud runtime code.
#
# Usage (from mobile/):
#   EXPO_OFFLINE=1 npx expo export --platform android --output-dir "$TMP/off"
#   bash scripts/check_off_bundle.sh "$TMP/off"
#
# It greps the exported bundle (Hermes bytecode keeps its strings readable)
# for words only the cloud runtime would bring in: the backend SDK, the
# sign-in SDKs, the secure key store, the REST path, and the memory
# backend's demo learner. Any hit fails the check.
set -euo pipefail
DIR="${1:?usage: check_off_bundle.sh <export-dir>}"
mapfile -t FILES < <(find "$DIR" -type f \( -name '*.hbc' -o -name '*.js' \))
if [ "${#FILES[@]}" -eq 0 ]; then
  echo "G2: no bundle found in $DIR" >&2
  exit 1
fi
# -i only where the word could appear in any case (supabase / Supabase).
CASELESS=(supabase)
EXACT=(signInWithIdToken AppleAuthentication GoogleSignin SecureStore /rest/v1/ maya@example.com mem-user)
fail=0
for p in "${CASELESS[@]}"; do
  if grep -qialF -- "$p" "${FILES[@]}"; then echo "G2: found \"$p\" in the OFF bundle" >&2; fail=1; fi
done
for p in "${EXACT[@]}"; do
  if grep -qalF -- "$p" "${FILES[@]}"; then echo "G2: found \"$p\" in the OFF bundle" >&2; fail=1; fi
done
if [ "$fail" -ne 0 ]; then
  echo "G2 failed: cloud code reached a build with the flag off. Load it only behind the inline check in src/cloud/backend.ts." >&2
  exit 1
fi
echo "G2: the OFF bundle has no cloud runtime code (${#FILES[@]} bundle file(s) checked)."
