#!/usr/bin/env bash
# Guard G1 (Uplift Phase 6, docs/mobile/ARCHITECTURE.md "Cloud (built OFF)"):
# no secrets in any file git tracks. The repo is public.
#
# Usage (from anywhere): bash scripts/check_secrets.sh
# CI: .github/workflows/verify.yml runs it on every pull request.
#
# 1. No key or env file is tracked: *.p8 *.p12 *.jks *.keystore *.pem *.key
#    *.mobileprovision, or .env / .env.* (only .env.example, with empty
#    values, may be tracked).
# 2. Every tracked file (except data/, the question banks) is grepped for the
#    secret shapes in scripts/secret_patterns.txt.
# 3. Files under mobile/ are also grepped for scripts/secret_patterns_app.txt
#    (words the app must never contain, like the service role's name).
# A hit fails, unless scripts/secret_allowlist.txt allows that pattern in that
# one file. The pattern and allowlist files are not scanned (they'd match
# themselves). A grep that can't read a file fails the check too (fail closed).
#
# Portable bash 3.2 (macOS): no mapfile.
set -euo pipefail
cd "$(dirname "$0")/.."
PATTERNS=scripts/secret_patterns.txt
APP_PATTERNS=scripts/secret_patterns_app.txt
ALLOW=scripts/secret_allowlist.txt
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# The pattern files without their comments and blank lines (an empty pattern matches everything).
grep -vE '^[[:space:]]*(#|$)' "$PATTERNS" > "$TMP/all" || { echo "G1: no patterns in $PATTERNS" >&2; exit 2; }
grep -vE '^[[:space:]]*(#|$)' "$APP_PATTERNS" > "$TMP/app" || { echo "G1: no patterns in $APP_PATTERNS" >&2; exit 2; }
cat "$TMP/all" "$TMP/app" > "$TMP/both"

# Tracked files, read NUL-separated so any file name is safe.
ALL=()
while IFS= read -r -d '' f; do ALL+=("$f"); done < <(git ls-files -z)
if [ "${#ALL[@]}" -eq 0 ]; then
  echo "G1: git lists no tracked files" >&2
  exit 2
fi

fail=0

# 1. Key and env files.
for f in "${ALL[@]}"; do
  base=${f##*/}
  case $base in
    .env.example) continue ;;
    .env | .env.*) echo "G1: tracked env file: $f" >&2; fail=1 ;;
  esac
  case $base in
    *.p8 | *.p12 | *.jks | *.keystore | *.pem | *.key | *.mobileprovision) echo "G1: tracked key file: $f" >&2; fail=1 ;;
  esac
done

# 2 and 3. Pick the files to grep: regular files that exist here (not symlinks).
SCAN=()
APP=()
for f in "${ALL[@]}"; do
  case $f in
    data/* | "$PATTERNS" | "$APP_PATTERNS" | "$ALLOW") continue ;;
  esac
  [ -f "$f" ] && [ ! -L "$f" ] || continue
  case $f in
    mobile/*) APP+=("$f") ;;
    *) SCAN+=("$f") ;;
  esac
done

# grep_hits <pattern-file> <files...>: the "path:line:text" hits, failing closed on a grep error.
grep_hits() {
  local pat=$1 rc=0
  shift
  [ "$#" -gt 0 ] || return 0
  grep -nIE -f "$pat" -- "$@" || rc=$?
  if [ "$rc" -ge 2 ]; then
    echo "G1: grep could not read every file (exit $rc); failing closed." >&2
    exit 2
  fi
}
{
  grep_hits "$TMP/all" ${SCAN[@]+"${SCAN[@]}"}
  grep_hits "$TMP/both" ${APP[@]+"${APP[@]}"}
} > "$TMP/hits"

# Drop the hits the allowlist covers: same file, and nothing secret left once its regex is removed.
SEP=$(printf '\001')
while IFS= read -r hit; do
  path=${hit%%:*}
  rest=${hit#*:}
  text=${rest#*:}
  allowed=0
  while IFS= read -r entry; do
    case $entry in '' | '#'*) continue ;; esac
    [ "${entry%%:*}" = "$path" ] || continue
    re=${entry#*:}
    stripped=$(printf '%s\n' "$text" | sed -E "s${SEP}${re}${SEP}${SEP}g")
    rc=0
    printf '%s\n' "$stripped" | grep -qE -f "$TMP/both" || rc=$?
    if [ "$rc" -eq 1 ]; then allowed=1; break; fi
    if [ "$rc" -ge 2 ]; then echo "G1: grep error on the allowlist check" >&2; exit 2; fi
  done < "$ALLOW"
  if [ "$allowed" -eq 0 ]; then
    printf '%s\n' "$hit" | cut -c1-200 >&2
    fail=1
  fi
done < "$TMP/hits"

if [ "$fail" -ne 0 ]; then
  echo "G1 failed: the lines above look like secrets or key files. Secrets live only in EAS secrets or Supabase function secrets." >&2
  exit 1
fi
echo "G1: no secrets in ${#SCAN[@]} tracked files, plus ${#APP[@]} under mobile/ with the app-only words."
