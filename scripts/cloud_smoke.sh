#!/usr/bin/env bash
# Penetration-style smoke for the accounts backend (Uplift Phase 6, spec §2.7).
# Phase 9 evidence: run it against the hosted project right after
# `supabase db push`, and keep the output with the go-live checklist. It also
# runs against a local stack (`supabase start`).
#
# It only READS, or attempts writes that must be refused. With two real test
# accounts A and B, every cross-user read and write, every anon read, every
# private-schema read and every server-only RPC call must fail.
#
# Inputs (environment; never commit them):
#   SUPABASE_URL        e.g. http://127.0.0.1:54321 locally
#   SUPABASE_ANON_KEY   the publishable (anon) key
#   JWT_A, JWT_B        access tokens for two test learners (sign in with an
#                       email code, then copy session.access_token)
#   UID_A, UID_B        their user ids
# Both learners must have accepted the terms (a profiles row each).
#
# Usage: bash scripts/cloud_smoke.sh
set -euo pipefail

: "${SUPABASE_URL:?set SUPABASE_URL}" "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY}"
: "${JWT_A:?set JWT_A}" "${JWT_B:?set JWT_B}" "${UID_A:?set UID_A}" "${UID_B:?set UID_B}"
command -v curl >/dev/null || { echo "curl is required"; exit 2; }

REST="${SUPABASE_URL%/}/rest/v1"
FN="${SUPABASE_URL%/}/functions/v1"
fail=0
pass=0

# request <method> <url> <bearer> [json-body] [extra-header]
# Prints "<status> <body>" with the body cut to 200 characters.
request() {
  local method=$1 url=$2 bearer=$3 body=${4:-} extra=${5:-}
  local tmp
  tmp=$(mktemp)
  local args=(-sS -o "$tmp" -w '%{http_code}' -X "$method" "$url"
    -H "apikey: $SUPABASE_ANON_KEY" -H "Authorization: Bearer $bearer"
    -H 'Content-Type: application/json' -H 'Prefer: return=representation')
  [ -n "$extra" ] && args+=(-H "$extra")
  [ -n "$body" ] && args+=(--data "$body")
  local code
  code=$(curl "${args[@]}" || echo 000)
  printf '%s %s' "$code" "$(head -c 200 "$tmp" 2>/dev/null | tr -d '\n')"
  rm -f "$tmp"
}

# expect <label> <result> <rule>   rule: denied (not 2xx) | empty (2xx with []) | <exact status>
expect() {
  local label=$1 result=$2 rule=$3 code=${2%% *} body=${2#* }
  local ok=no
  case $rule in
    denied) [[ $code != 2* && $code != 000 ]] && ok=yes ;;
    empty)  [[ $code == 2* && ( $body == '[]' || -z $body ) ]] && ok=yes ;;
    *)      [[ $code == "$rule" ]] && ok=yes ;;
  esac
  if [ "$ok" = yes ]; then pass=$((pass + 1)); printf '  ✓ %-58s %s\n' "$label" "$code"
  else fail=$((fail + 1)); printf '  ✗ %-58s %s  %s\n' "$label" "$code" "$body"; fi
}

echo "Anon (publishable key only):"
for t in profiles entitlements content_packs; do
  expect "anon cannot read $t" "$(request GET "$REST/$t?select=*" "$SUPABASE_ANON_KEY")" denied
done
expect "anon cannot create a profile" \
  "$(request POST "$REST/profiles" "$SUPABASE_ANON_KEY" '{"terms_version":"2026-11","age_confirmed":true}')" denied

echo "Learner A against learner B:"
expect "A cannot read B's profile" "$(request GET "$REST/profiles?id=eq.$UID_B" "$JWT_A")" empty
expect "A cannot update B's profile" \
  "$(request PATCH "$REST/profiles?id=eq.$UID_B" "$JWT_A" '{"terms_version":"2030-01"}')" empty
expect "A cannot create a profile with B's id" \
  "$(request POST "$REST/profiles" "$JWT_A" "{\"id\":\"$UID_B\",\"terms_version\":\"2026-11\",\"age_confirmed\":true}")" denied
expect "A cannot delete B's profile" "$(request DELETE "$REST/profiles?id=eq.$UID_B" "$JWT_A")" denied
expect "A cannot read B's entitlements" "$(request GET "$REST/entitlements?user_id=eq.$UID_B" "$JWT_A")" empty
expect "B cannot read A's profile" "$(request GET "$REST/profiles?id=eq.$UID_A" "$JWT_B")" empty

echo "Learner A against server-only data:"
expect "A cannot grant an entitlement" \
  "$(request POST "$REST/entitlements" "$JWT_A" "{\"user_id\":\"$UID_A\",\"entitlement\":\"all_access\",\"active\":true}")" denied
expect "A cannot change created_at" \
  "$(request PATCH "$REST/profiles?id=eq.$UID_A" "$JWT_A" '{"created_at":"2000-01-01T00:00:00Z"}')" denied
for t in content_pack_stats deletions export_log; do
  expect "A cannot read private.$t" "$(request GET "$REST/$t?select=*" "$JWT_A" '' 'Accept-Profile: private')" denied
done
expect "A cannot call svc_claim_export" "$(request POST "$REST/rpc/svc_claim_export" "$JWT_A" "{\"p_user\":\"$UID_A\"}")" denied
expect "A cannot call svc_record_deletion" \
  "$(request POST "$REST/rpc/svc_record_deletion" "$JWT_A" "{\"p_user\":\"$UID_B\"}")" denied
expect "anon cannot call svc_claim_export" \
  "$(request POST "$REST/rpc/svc_claim_export" "$SUPABASE_ANON_KEY" "{\"p_user\":\"$UID_A\"}")" denied

echo "Edge Functions (no destructive call is made):"
expect "delete-account refuses the anon key" "$(request POST "$FN/delete-account" "$SUPABASE_ANON_KEY" '{"confirm":"DELETE"}')" denied
expect "delete-account needs confirm=DELETE" "$(request POST "$FN/delete-account" "$JWT_A" '{"confirm":"nope"}')" denied
expect "export-my-data refuses the anon key" "$(request POST "$FN/export-my-data" "$SUPABASE_ANON_KEY" '{}')" denied

echo
echo "cloud_smoke: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
