#!/usr/bin/env bash
# Penetration-style smoke for the accounts backend (Uplift Phase 6, spec §2.7;
# accounts beta, docs/mobile/ACCOUNTS_BETA_PLAN.md §3.4 and acceptance tests
# S1, S3, S4, S6). Run it against the hosted project right after the
# migrations are applied and the two Edge Functions deployed, BEFORE captcha
# is switched on, and keep the output with the go-live checklist. It also
# runs against a local stack (`supabase start`).
#
# It only READS, or attempts writes that must be refused. With two real test
# accounts A and B, every cross-user read and write, every anon read, every
# private-schema read and every server-only RPC call must fail, and the two
# web-facing functions must answer the website's origin (and only it).
#
# Inputs (environment; never commit them):
#   SUPABASE_URL        e.g. http://127.0.0.1:54321 locally
#   SUPABASE_ANON_KEY   the publishable key (sb_publishable_…)
#   JWT_A, JWT_B        access tokens for two test learners (sign in with an
#                       email code, then copy session.access_token)
#   UID_A, UID_B        their user ids
#   WEB_ORIGIN          optional; the only origin the functions answer
#                       (default https://kaisip.com)
#   EMAIL_A             optional; learner A's email. With it, the run also
#                       tries to give A a password with A's own session, then
#                       signs in with that password, which must fail (S9).
# Both learners must have accepted the terms (a profiles row each), so the
# snapshot checks below are refused by the shape checks, not by a missing
# profile.
#
# Usage: bash scripts/cloud_smoke.sh
#
# Second mode, by hand (security audit H1, acceptance test S9), with captcha
# still off and "Confirm email" ON:
#   PROBE_EMAIL=you+probe@example.com bash scripts/cloud_smoke.sh pre-register
# It signs up a NEW address WITH a password (what an attacker would do with a
# victim's address), asks you for the code sent to that inbox (the
# victim confirming with a code), then signs in with the password, which must
# fail: confirming wipes any password. Delete the probe account afterwards
# (Supabase dashboard → Authentication → Users).
set -euo pipefail

if [ "${1:-}" = pre-register ]; then
  : "${SUPABASE_URL:?set SUPABASE_URL}" "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY}" "${PROBE_EMAIL:?set PROBE_EMAIL}"
  AUTH="${SUPABASE_URL%/}/auth/v1"
  pw="Smoke-$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')!"
  hdr=(-H "apikey: $SUPABASE_ANON_KEY" -H 'Content-Type: application/json')
  echo "1. Sign up $PROBE_EMAIL with a password (the attacker's step):"
  curl -sS -o /dev/null -w '   HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/signup" \
    --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw\"}"
  printf '2. Enter the code emailed to %s (the victim confirming): ' "$PROBE_EMAIL"
  read -r code
  curl -sS -o /dev/null -w '   verify: HTTP %{http_code} (200 expected)\n' "${hdr[@]}" -X POST "$AUTH/verify" \
    --data "{\"type\":\"signup\",\"email\":\"$PROBE_EMAIL\",\"token\":\"$code\"}"
  echo "3. Sign in with the attacker's password:"
  status=$(curl -sS -o /dev/null -w '%{http_code}' "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" \
    --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw\"}" || echo 000)
  if [[ $status == 2* || $status == 000 ]]; then
    echo "   ✗ HTTP $status: the pre-registered password still works. STOP: do not open sign-up (H1)."
    exit 1
  fi
  echo "   ✓ HTTP $status: refused. The confirmed account has no password."
  exit 0
fi

: "${SUPABASE_URL:?set SUPABASE_URL}" "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY}"
: "${JWT_A:?set JWT_A}" "${JWT_B:?set JWT_B}" "${UID_A:?set UID_A}" "${UID_B:?set UID_B}"
command -v curl >/dev/null || { echo "curl is required"; exit 2; }
WEB_ORIGIN=${WEB_ORIGIN:-https://kaisip.com}

REST="${SUPABASE_URL%/}/rest/v1"
FN="${SUPABASE_URL%/}/functions/v1"
fail=0
pass=0
# A well-formed snapshot body (gzip of {} as base64), used only in writes
# that must be refused for another reason (a column the app may not set).
GZ_EMPTY='H4sIAAAAAAACA6uuBQBDv6ajAgAAAA=='
DEVICE='00000000-0000-4000-8000-0000000000aa'

# request <method> <url> <bearer> [json-body] [extra-header]
# Prints "<status> <body>" with the body cut to 200 characters.
# An empty <bearer> sends NO Authorization header: that is what an anonymous
# caller looks like (PostgREST then uses the anon role, and the Edge Functions
# must answer 401 themselves). Sending the publishable key as a Bearer token
# instead would be refused at the gateway with the new sb_publishable_ keys,
# so a denial would pass for the wrong reason.
request() {
  local method=$1 url=$2 bearer=$3 body=${4:-} extra=${5:-}
  local tmp
  tmp=$(mktemp)
  local args=(-sS -o "$tmp" -w '%{http_code}' -X "$method" "$url"
    -H "apikey: $SUPABASE_ANON_KEY"
    -H 'Content-Type: application/json' -H 'Prefer: return=representation')
  [ -n "$bearer" ] && args+=(-H "Authorization: Bearer $bearer")
  [ -n "$extra" ] && args+=(-H "$extra")
  [ -n "$body" ] && args+=(--data "$body")
  local code
  code=$(curl "${args[@]}" || echo 000)
  printf '%s %s' "$code" "$(head -c 200 "$tmp" 2>/dev/null | tr -d '\n')"
  rm -f "$tmp"
}

# cors <method> <url> <origin> [bearer] [json-body]
# Like a browser on <origin>: a preflight (OPTIONS) carries no apikey and no
# Authorization, only Origin and the Access-Control-Request-* headers. Prints
# "<status> <access-control-allow-origin value or ->".
cors() {
  local method=$1 url=$2 origin=$3 bearer=${4:-} body=${5:-}
  local hdr
  hdr=$(mktemp)
  local args=(-sS -o /dev/null -D "$hdr" -w '%{http_code}' -X "$method" "$url" -H "Origin: $origin")
  if [ "$method" = OPTIONS ]; then
    args+=(-H 'Access-Control-Request-Method: POST'
      -H 'Access-Control-Request-Headers: authorization, apikey, content-type, x-client-info')
  else
    args+=(-H "apikey: $SUPABASE_ANON_KEY" -H 'Content-Type: application/json')
    [ -n "$bearer" ] && args+=(-H "Authorization: Bearer $bearer")
    [ -n "$body" ] && args+=(--data "$body")
  fi
  local code acao
  code=$(curl "${args[@]}" || echo 000)
  acao=$(tr -d '\r' <"$hdr" | awk -F': ' 'tolower($1) == "access-control-allow-origin" { print $2 }' | tail -n 1)
  printf '%s %s' "$code" "${acao:--}"
  rm -f "$hdr"
}

# expect <label> <result> <rule>
#   denied        not 2xx (and not a network failure)
#   empty         2xx with [] or no body
#   has:<text>    2xx and the body contains <text>
#   <status>      exactly that status
#   <status> <v>  exactly that status and second field (cors: the allowed origin, - for none)
expect() {
  local label=$1 result=$2 rule=$3 code=${2%% *} body=${2#* }
  local ok=no
  case $rule in
    denied) [[ $code != 2* && $code != 000 ]] && ok=yes ;;
    empty)  [[ $code == 2* && ( $body == '[]' || -z $body ) ]] && ok=yes ;;
    has:*)  [[ $code == 2* && $body == *"${rule#has:}"* ]] && ok=yes ;;
    *' '*)  [[ $result == "$rule" ]] && ok=yes ;;
    *)      [[ $code == "$rule" ]] && ok=yes ;;
  esac
  if [ "$ok" = yes ]; then pass=$((pass + 1)); printf '  ✓ %-62s %s\n' "$label" "$code"
  else fail=$((fail + 1)); printf '  ✗ %-62s %s  %s\n' "$label" "$code" "$body"; fi
}

echo "Schema (S1):"
# PostgREST answers 404 for a table that does not exist.
expect "no content_packs table (content is never in Postgres)" "$(request GET "$REST/content_packs?select=*" '')" 404

echo "Anon (publishable key only, no Authorization header):"
for t in profiles entitlements sync_snapshots; do
  expect "anon cannot read $t" "$(request GET "$REST/$t?select=*" '')" denied
done
expect "anon cannot create a profile" \
  "$(request POST "$REST/profiles" '' '{"terms_version":"2026-11","age_confirmed":true}')" denied
expect "anon cannot grant an entitlement" \
  "$(request POST "$REST/entitlements" '' "{\"user_id\":\"$UID_A\",\"entitlement\":\"all_access\",\"active\":true}")" denied
expect "anon cannot write a snapshot" \
  "$(request POST "$REST/sync_snapshots" '' "{\"store\":\"settings\",\"store_version\":1,\"app_version\":\"1.47.0\",\"device_id\":\"$DEVICE\",\"state_gz\":\"$GZ_EMPTY\",\"raw_bytes\":2}")" denied

echo "Learner A against learner B:"
expect "A cannot read B's profile" "$(request GET "$REST/profiles?id=eq.$UID_B" "$JWT_A")" empty
expect "A cannot update B's profile" \
  "$(request PATCH "$REST/profiles?id=eq.$UID_B" "$JWT_A" '{"terms_version":"2030-01"}')" empty
expect "A cannot create a profile with B's id" \
  "$(request POST "$REST/profiles" "$JWT_A" "{\"id\":\"$UID_B\",\"terms_version\":\"2026-11\",\"age_confirmed\":true}")" denied
expect "A cannot delete B's profile" "$(request DELETE "$REST/profiles?id=eq.$UID_B" "$JWT_A")" denied
expect "A cannot read B's entitlements" "$(request GET "$REST/entitlements?user_id=eq.$UID_B" "$JWT_A")" empty
expect "A cannot change B's entitlements" \
  "$(request PATCH "$REST/entitlements?user_id=eq.$UID_B" "$JWT_A" '{"active":false}')" denied
expect "B cannot read A's profile" "$(request GET "$REST/profiles?id=eq.$UID_A" "$JWT_B")" empty

echo "Sync snapshots (one gzipped snapshot per store; the server owns rev, keys and encoding):"
# user_id is never readable or writable by the app, so A can't even name B's rows.
expect "A cannot read the user_id column" "$(request GET "$REST/sync_snapshots?select=user_id" "$JWT_A")" denied
expect "A cannot filter snapshots by user_id" \
  "$(request GET "$REST/sync_snapshots?select=store&user_id=eq.$UID_B" "$JWT_A")" denied
expect "A cannot write a snapshot as B" \
  "$(request POST "$REST/sync_snapshots" "$JWT_A" "{\"user_id\":\"$UID_B\",\"store\":\"settings\",\"store_version\":1,\"app_version\":\"1.47.0\",\"device_id\":\"$DEVICE\",\"state_gz\":\"$GZ_EMPTY\",\"raw_bytes\":2}")" denied
expect "A cannot choose rev" \
  "$(request POST "$REST/sync_snapshots" "$JWT_A" "{\"store\":\"settings\",\"store_version\":1,\"app_version\":\"1.47.0\",\"device_id\":\"$DEVICE\",\"state_gz\":\"$GZ_EMPTY\",\"raw_bytes\":2,\"rev\":1}")" denied
expect "A cannot choose the encoding" \
  "$(request POST "$REST/sync_snapshots" "$JWT_A" "{\"store\":\"settings\",\"store_version\":1,\"app_version\":\"1.47.0\",\"device_id\":\"$DEVICE\",\"state_gz\":\"$GZ_EMPTY\",\"raw_bytes\":2,\"encoding\":\"gzip+base64\"}")" denied
expect "A cannot set rev on an update" \
  "$(request PATCH "$REST/sync_snapshots?store=eq.progress" "$JWT_A" '{"rev":1}')" denied
# 23514 (a check constraint) is 400: refused by the shape check itself.
expect "plain JSON instead of base64 gzip is refused (400)" \
  "$(request POST "$REST/sync_snapshots" "$JWT_A" "{\"store\":\"settings\",\"store_version\":1,\"app_version\":\"1.47.0\",\"device_id\":\"$DEVICE\",\"state_gz\":\"eyJ4IjoxfQ==\",\"raw_bytes\":7}")" 400
expect "an oversized settings snapshot is refused (400)" \
  "$(request POST "$REST/sync_snapshots" "$JWT_A" "{\"store\":\"settings\",\"store_version\":1,\"app_version\":\"1.47.0\",\"device_id\":\"$DEVICE\",\"state_gz\":\"$GZ_EMPTY\",\"raw_bytes\":98305}")" 400

echo "Learner A against server-only data:"
expect "A cannot grant an entitlement" \
  "$(request POST "$REST/entitlements" "$JWT_A" "{\"user_id\":\"$UID_A\",\"entitlement\":\"all_access\",\"active\":true}")" denied
expect "A cannot change created_at" \
  "$(request PATCH "$REST/profiles?id=eq.$UID_A" "$JWT_A" '{"created_at":"2000-01-01T00:00:00Z"}')" denied
for t in deletions export_log sync_writes sync_history; do
  expect "A cannot read private.$t" "$(request GET "$REST/$t?select=*" "$JWT_A" '' 'Accept-Profile: private')" denied
done
expect "A cannot call svc_claim_export" "$(request POST "$REST/rpc/svc_claim_export" "$JWT_A" "{\"p_user\":\"$UID_A\"}")" denied
expect "A cannot call svc_record_deletion" \
  "$(request POST "$REST/rpc/svc_record_deletion" "$JWT_A" "{\"p_uid_hmac\":\"$(printf 'ab%.0s' $(seq 32))\"}")" denied
for f in svc_export_due svc_sync_checkpoint; do
  expect "A cannot call $f" "$(request POST "$REST/rpc/$f" "$JWT_A" "{\"p_user\":\"$UID_A\"}")" denied
done
expect "anon cannot call svc_claim_export" \
  "$(request POST "$REST/rpc/svc_claim_export" '' "{\"p_user\":\"$UID_A\"}")" denied

echo "Feedback board (paused for the beta; read scope as set in board_settings, 'signed_in' by default):"
expect "anon reads the board settings (the keep-awake read)" \
  "$(request GET "$REST/board_settings?select=read_scope&limit=1" '')" 200
expect "posting is paused" "$(request GET "$REST/board_settings?select=posting_open" '')" 'has:"posting_open":false'
expect "anon reads no post in the default scope" "$(request GET "$REST/board_posts?select=id" '')" empty
expect "anon cannot read votes" "$(request GET "$REST/board_votes?select=*" '')" denied
expect "anon cannot read reports" "$(request GET "$REST/ugc_reports?select=*" '')" denied
expect "A cannot write a post directly (board-submit only)" \
  "$(request POST "$REST/board_posts" "$JWT_A" "{\"author_id\":\"$UID_A\",\"kind\":\"idea\",\"title\":\"Straight to the table\"}")" denied
expect "A cannot read severity or hold reasons" "$(request GET "$REST/board_posts?select=severity,hold_reason" "$JWT_A")" denied
expect "A cannot read B's votes" "$(request GET "$REST/board_votes?user_id=eq.$UID_B" "$JWT_A")" empty
expect "A cannot read B's blocks" "$(request GET "$REST/member_blocks?blocker_id=eq.$UID_B" "$JWT_A")" empty
expect "A cannot read B's notices" "$(request GET "$REST/board_notifications?user_id=eq.$UID_B" "$JWT_A")" empty
for t in staff moderation_log moderation_terms board_events; do
  expect "A cannot read private.$t" "$(request GET "$REST/$t?select=*" "$JWT_A" '' 'Accept-Profile: private')" denied
done
for f in svc_board_write svc_board_join svc_staff_act svc_staff_queue svc_board_export svc_board_counts; do
  expect "A cannot call $f" "$(request POST "$REST/rpc/$f" "$JWT_A" "{\"p_user\":\"$UID_A\"}")" denied
done
# The board's functions are not deployed in the beta (404); if they ever are,
# they must still refuse these callers.
expect "board-submit refuses an anonymous call (or is not deployed)" "$(request POST "$FN/board-submit" '' '{"op":"me"}')" denied
expect "staff-action refuses a learner (or is not deployed)" \
  "$(request POST "$FN/staff-action" "$JWT_A" '{"action":"queue","tab":"held"}')" denied
expect "staff-digest refuses a learner's token (or is not deployed)" "$(request POST "$FN/staff-digest" "$JWT_A" '')" denied

echo "Edge Functions (no destructive call is made):"
# Anonymous: 401 from the gateway's JWT check (verify_jwt) or, with it off, the function's own.
expect "delete-account refuses an anonymous call" "$(request POST "$FN/delete-account" '' '{"confirm":"DELETE"}')" 401
expect "export-my-data refuses an anonymous call" "$(request POST "$FN/export-my-data" '' '{}')" 401
# A real learner's token passes the gateway, so these denials come from the function itself.
expect "delete-account needs confirm=DELETE (learner A's token)" "$(request POST "$FN/delete-account" "$JWT_A" '{"confirm":"nope"}')" denied
expect "delete-account refuses a GET (learner A's token)" "$(request GET "$FN/delete-account" "$JWT_A")" denied

if [ -n "${EMAIL_A:-}" ]; then
  echo "No passwords (S9): learner A's own session tries to add one; password sign-in must still fail:"
  probe_pw="Smoke-$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')!"
  # Whatever the Auth server answers here (it may accept the write), the database wipes the password.
  set_pw=$(request PUT "${SUPABASE_URL%/}/auth/v1/user" "$JWT_A" "{\"password\":\"$probe_pw\"}")
  printf '  · setting a password answered %s\n' "${set_pw%% *}"
  expect "A cannot sign in with a password set by a session" \
    "$(request POST "${SUPABASE_URL%/}/auth/v1/token?grant_type=password" '' "{\"email\":\"$EMAIL_A\",\"password\":\"$probe_pw\"}")" denied
fi

echo "CORS (S6): only $WEB_ORIGIN may call the two account functions from a browser:"
# Only the allowed-origin header is compared ("any <origin>", "any -" for
# none), whatever status the gateway or the function chose for a refusal.
origin_only() { awk '{ print "any", $2 }'; }
for f in delete-account export-my-data; do
  expect "$f: preflight from $WEB_ORIGIN" "$(cors OPTIONS "$FN/$f" "$WEB_ORIGIN")" "204 $WEB_ORIGIN"
  for other in 'https://kaisip.com.evil.example' 'https://www.kaisip.com' 'null'; do
    expect "$f: no CORS header for origin $other" "$(cors OPTIONS "$FN/$f" "$other" | origin_only)" "any -"
  done
done
# Refused (400 confirm_required, or 401 reauth_required for a token older than
# 10 minutes), but the website can read why; another origin can't.
expect "delete-account: a refusal is readable by $WEB_ORIGIN" \
  "$(cors POST "$FN/delete-account" "$WEB_ORIGIN" "$JWT_A" '{"confirm":"nope"}' | origin_only)" "any $WEB_ORIGIN"
expect "delete-account: and not by another origin" \
  "$(cors POST "$FN/delete-account" 'https://kaisip.com.evil.example' "$JWT_A" '{"confirm":"nope"}' | origin_only)" "any -"

echo
echo "cloud_smoke: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
