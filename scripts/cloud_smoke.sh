#!/usr/bin/env bash
# Penetration-style smoke for the accounts backend (Uplift Phase 6, spec §2.7;
# accounts beta, docs/mobile/ACCOUNTS_BETA_PLAN.md §3.4 and acceptance tests
# S1, S3, S4, S6; passwords, docs/mobile/PASSWORD_SIGN_IN_DESIGN.md §3.4 and
# the password audit's LOW-4). Run it against the hosted project right after
# the migrations are applied and the two Edge Functions deployed, BEFORE
# captcha is switched on, and keep the output with the go-live checklist. It
# also runs against a local stack (`supabase start`).
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
#                       checks that a STALE session can't add a first password
#                       (S9, password guard rule 4). A must have no password
#                       (a code or Google account), and JWT_A must come from a
#                       sign-in 11 to 59 minutes ago; the run reads the token's
#                       sign-in time and expiry, and skips the check, with a
#                       note, if it is too fresh or expired. The refusal must be
#                       a 500 (the database's): anything else proves nothing.
# The main run also checks that learner A can't enrol an authenticator app
# (gate 20: a 500 from POST /auth/v1/factors, the database refusing the row).
# Every check needs positive evidence: a network failure (000) never passes.
# Both learners must have accepted the terms (a profiles row each), so the
# snapshot checks below are refused by the shape checks, not by a missing
# profile.
#
# Usage: bash scripts/cloud_smoke.sh
#
# Modes run by hand, with captcha still OFF and "Confirm email" ON (each needs
# a NEW probe address with no account; delete the probe account afterwards in
# Supabase dashboard → Authentication → Users). Every email-sending step waits
# 61 seconds first: the Auth server sends one email a minute per address.
#
#   VARIANT=signup|otp|recover PROBE_EMAIL=you+probe1@example.com bash scripts/cloud_smoke.sh pre-register
#     Security audit H1, acceptance test S9. Signs up the address WITH a
#     password (what an attacker would do with a victim's address), then the
#     victim confirms: with the sign-up code (signup, the default), with an
#     emailed sign-in code (otp) or with a reset code (recover). Signing in
#     with the attacker's password must then fail. Run all three (three probe
#     addresses) after every Auth upgrade (/auth/v1/health shows the version).
#
#   PROBE_EMAIL=you+probe4@example.com bash scripts/cloud_smoke.sh password
#     Acceptance test S10: the real flows work. Code first, then the password
#     with that fresh session; sign-in; a too-short password refused; a
#     stranger's re-sign-up changes nothing; "forgot password" with a reset
#     code; the old password stops working and the first session is signed out.
#
#   PROBE_EMAIL=you+probe5@example.com bash scripts/cloud_smoke.sh binding
#     The password audit's HIGH-1 fix on the hosted project. Signs in with a
#     code (the "thief's" session), waits 11 minutes, signs in again (the
#     owner), then the OLD session tries to add a first password: refused, and
#     the owner's session still works. Then the owner's own fresh session adds
#     a password. Takes about 12 minutes. A refused attempt may still send the
#     "password changed" notice (the Auth server sends it before the commit).
#
#   bash scripts/cloud_smoke.sh captcha
#     Acceptance test S7, run straight AFTER captcha is switched on: password
#     sign-in, /signup, /recover, /resend, /magiclink and /otp are refused
#     without a human-check token; the refresh and Google (pkce) grants are not
#     behind it. Needs only SUPABASE_URL and SUPABASE_ANON_KEY; sends no email.
set -euo pipefail

# Shared by the modes below.
rnd() { od -An -N12 -tx1 /dev/urandom | tr -d ' \n'; }
# 37 characters with upper and lower case, digits and symbols: valid under the
# old rule (12, all four kinds) and the new one (15, no required kinds).
probe_password() { printf 'Smoke-%s-Words!' "$(rnd)"; }
token_of() { sed -n 's/.*"access_token" *: *"\([^"]*\)".*/\1/p'; }
# The HTTP status only: 000 on a network failure (curl prints its own 000 and
# fails, so never append a second one: "000000" would pass for a refusal).
status_of() { local c; c=$(curl -sS -o /dev/null -w '%{http_code}' "$@") || c=000; printf '%s' "${c:0:3}"; }
wait_a_minute() { echo "   waiting 61 s (one email a minute per address)"; sleep 61; }
ok_n=0; bad_n=0
# check <label> <status> <pattern>: the pattern is a shell glob ('4??' = any 4xx).
check() {
  # shellcheck disable=SC2053
  if [[ $2 == $3 ]]; then ok_n=$((ok_n + 1)); echo "  ✓ $1 ($2)"
  else bad_n=$((bad_n + 1)); echo "  ✗ $1 ($2, wanted $3)"; fi
}
mode_env() {
  : "${SUPABASE_URL:?set SUPABASE_URL}" "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY}"
  AUTH="${SUPABASE_URL%/}/auth/v1"
  hdr=(-H "apikey: $SUPABASE_ANON_KEY" -H 'Content-Type: application/json')
}
# verify_code <type> <prompt>: asks for the emailed code, prints the access token (empty if refused).
verify_code() {
  local code
  printf '   %s: ' "$2" >&2
  read -r code
  { curl -sS "${hdr[@]}" -X POST "$AUTH/verify" \
    --data "{\"type\":\"$1\",\"email\":\"$PROBE_EMAIL\",\"token\":\"$code\"}" || true; } | token_of
}

if [ "${1:-}" = pre-register ]; then
  mode_env; : "${PROBE_EMAIL:?set PROBE_EMAIL (an address with no account yet)}"
  VARIANT=${VARIANT:-signup}
  case $VARIANT in
    signup) vtype=signup ;;    # the victim types the code from the attacker's own sign-up
    otp) vtype=email ;;        # the victim signs in with an emailed code
    recover) vtype=recovery ;; # the victim uses "forgot password"
    *) echo "VARIANT must be signup, otp or recover"; exit 2 ;;
  esac
  pw=$(probe_password)
  echo "1. Sign up $PROBE_EMAIL with a password (the attacker's step):"
  curl -sS -o /dev/null -w '   HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/signup" \
    --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw\"}"
  case $VARIANT in
    otp) wait_a_minute
         curl -sS -o /dev/null -w '   otp: HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/otp" \
           --data "{\"email\":\"$PROBE_EMAIL\",\"create_user\":true}" ;;
    recover) wait_a_minute
         curl -sS -o /dev/null -w '   recover: HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/recover" \
           --data "{\"email\":\"$PROBE_EMAIL\"}" ;;
  esac
  echo "2. The victim confirms ($VARIANT):"
  t=$(verify_code "$vtype" "enter the NEWEST code emailed to $PROBE_EMAIL")
  if [ -z "$t" ]; then
    echo "   ✗ the code was refused, so the account is not confirmed and step 3 would prove nothing. Run it again with a new address."
    exit 1
  fi
  echo "   ✓ confirmed (a session was issued)"
  echo "3. Sign in with the attacker's password:"
  status=$(status_of "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" \
    --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw\"}")
  if [[ $status == 2* ]]; then
    echo "   ✗ HTTP $status: the pre-registered password still works. STOP: do not open sign-up (H1)."
    exit 1
  fi
  # Positive evidence only: 400 invalid_credentials. Anything else (000 network,
  # 429 rate limit, 5xx) proves nothing either way.
  if [[ $status != 400 ]]; then
    echo "   ✗ HTTP $status, wanted 400 (invalid credentials): inconclusive. Run it again with a new address."
    exit 1
  fi
  echo "   ✓ HTTP $status: refused. Confirming wiped the password set before the inbox was proven ($VARIANT)."
  exit 0
fi

if [ "${1:-}" = password ]; then
  mode_env; : "${PROBE_EMAIL:?set PROBE_EMAIL (an address with no account yet)}"
  pw1=$(probe_password); pw2=$(probe_password); evil=$(probe_password)
  echo "1. Create the account the way the apps do: code first, then the password"
  curl -sS -o /dev/null -w '   otp: HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/otp" \
    --data "{\"email\":\"$PROBE_EMAIL\",\"create_user\":true}"
  t1=$(verify_code email "sign-in code")
  [ -n "$t1" ] || { echo "  ✗ the code was refused; run it again with a new address"; exit 1; }
  check "saving the password with the fresh session" \
    "$(status_of "${hdr[@]}" -H "Authorization: Bearer $t1" -X PUT "$AUTH/user" --data "{\"password\":\"$pw1\"}")" 200
  check "signing in with it" \
    "$(status_of "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw1\"}")" 200
  check "a too-short password is refused" \
    "$(status_of "${hdr[@]}" -H "Authorization: Bearer $t1" -X PUT "$AUTH/user" --data '{"password":"short"}')" 422

  echo "2. A stranger signs up again with this address and their own password"
  curl -sS -o /dev/null -w '   signup: HTTP %{http_code} (looks like a new sign-up; changes nothing)\n' "${hdr[@]}" \
    -X POST "$AUTH/signup" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$evil\"}"
  check "the stranger's password does not sign in" \
    "$(status_of "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$evil\"}")" 400
  check "the owner's password still does" \
    "$(status_of "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw1\"}")" 200

  echo "3. Forgot password: a reset code, then a new password"
  wait_a_minute
  curl -sS -o /dev/null -w '   recover: HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/recover" \
    --data "{\"email\":\"$PROBE_EMAIL\"}"
  t2=$(verify_code recovery "reset code")
  [ -n "$t2" ] || { echo "  ✗ the reset code was refused"; exit 1; }
  check "setting the new password after the reset code" \
    "$(status_of "${hdr[@]}" -H "Authorization: Bearer $t2" -X PUT "$AUTH/user" --data "{\"password\":\"$pw2\"}")" 200
  check "the old password no longer works" \
    "$(status_of "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw1\"}")" 400
  check "the new one does" \
    "$(status_of "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw2\"}")" 200
  # A signed-out session's token is refused at once (403 session_not_found).
  check "the first session was signed out by the change" \
    "$(status_of "${hdr[@]}" -H "Authorization: Bearer $t1" "$AUTH/user")" '4??'
  echo "password probe: $ok_n passed, $bad_n failed. Delete the probe account afterwards."
  [ "$bad_n" -eq 0 ]; exit
fi

if [ "${1:-}" = binding ]; then
  mode_env; : "${PROBE_EMAIL:?set PROBE_EMAIL (an address with no account yet)}"
  pw=$(probe_password)
  echo "1. Sign in with a code: the session a thief would steal"
  curl -sS -o /dev/null -w '   otp: HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/otp" \
    --data "{\"email\":\"$PROBE_EMAIL\",\"create_user\":true}"
  t_old=$(verify_code email "sign-in code")
  [ -n "$t_old" ] || { echo "  ✗ the code was refused; run it again with a new address"; exit 1; }
  echo "2. Waiting 11 minutes, so that session is older than the 10-minute window"
  sleep 660
  echo "3. The owner signs in again: a fresh session"
  curl -sS -o /dev/null -w '   otp: HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/otp" \
    --data "{\"email\":\"$PROBE_EMAIL\",\"create_user\":true}"
  t_new=$(verify_code email "the NEWEST sign-in code")
  [ -n "$t_new" ] || { echo "  ✗ the code was refused"; exit 1; }
  echo "4. The OLD session tries to add a first password (HIGH-1)"
  st=$(status_of "${hdr[@]}" -H "Authorization: Bearer $t_old" -X PUT "$AUTH/user" --data "{\"password\":\"$pw\"}")
  if [[ $st == 2* ]]; then
    bad_n=$((bad_n + 1)); echo "  ✗ the old session added a password (HTTP $st). STOP: rule 4b is not working on this project."
  elif [[ $st != 500 ]]; then
    bad_n=$((bad_n + 1)); echo "  ✗ HTTP $st, wanted 500 (the database's refusal): inconclusive"
  else
    ok_n=$((ok_n + 1)); echo "  ✓ refused (HTTP 500: the database's refusal)"
  fi
  check "and that password does not sign in" \
    "$(status_of "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw\"}")" 400
  check "the owner's fresh session still works (the refused write rolled back)" \
    "$(status_of "${hdr[@]}" -H "Authorization: Bearer $t_new" "$AUTH/user")" 200
  check "the owner's own fresh session adds a password" \
    "$(status_of "${hdr[@]}" -H "Authorization: Bearer $t_new" -X PUT "$AUTH/user" --data "{\"password\":\"$pw\"}")" 200
  check "and the old session was signed out by it" \
    "$(status_of "${hdr[@]}" -H "Authorization: Bearer $t_old" "$AUTH/user")" '4??'
  echo "binding probe: $ok_n passed, $bad_n failed. Delete the probe account afterwards."
  [ "$bad_n" -eq 0 ]; exit
fi

if [ "${1:-}" = captcha ]; then
  mode_env
  nobody='nobody@example.invalid'
  echo "Every request without a human-check token must be refused (HTTP 400, captcha_failed):"
  for p in "token?grant_type=password|{\"email\":\"$nobody\",\"password\":\"x x x x x x x x\"}" \
           "signup|{\"email\":\"$nobody\",\"password\":\"x x x x x x x x\"}" \
           "recover|{\"email\":\"$nobody\"}" \
           "resend|{\"type\":\"signup\",\"email\":\"$nobody\"}" \
           "magiclink|{\"email\":\"$nobody\"}" \
           "otp|{\"email\":\"$nobody\",\"create_user\":false}"; do
    path=${p%%|*}; body=${p#*|}
    out=$(curl -sS -w ' %{http_code}' "${hdr[@]}" -X POST "$AUTH/$path" --data "$body" || echo ' 000')
    if [[ $out == *captcha* && $out == *' 400' ]]; then ok_n=$((ok_n + 1)); echo "  ✓ /$path needs the human check"
    else
      bad_n=$((bad_n + 1)); echo "  ✗ /$path: $out"
      [ "$path" = signup ] && echo "    /signup was not stopped, so it may have created $nobody: delete that user (Authentication → Users)"
    fi
  done
  echo "These grants are not behind it (refresh, and Google through pkce): a bogus token is refused for another reason:"
  for p in "refresh_token|{\"refresh_token\":\"smoke-not-a-real-token\"}" \
           "pkce|{\"auth_code\":\"00000000-0000-4000-8000-000000000000\",\"code_verifier\":\"smoke-not-a-real-verifier-smoke-not-a-real-verifier\"}"; do
    grant=${p%%|*}; body=${p#*|}
    out=$(curl -sS -w ' %{http_code}' "${hdr[@]}" -X POST "$AUTH/token?grant_type=$grant" --data "$body" || echo ' 000')
    if [[ $out != *captcha* && $out != *' 000' ]]; then ok_n=$((ok_n + 1)); echo "  ✓ grant_type=$grant is not behind the human check (${out##* })"
    else bad_n=$((bad_n + 1)); echo "  ✗ grant_type=$grant: $out"; fi
  done
  echo "captcha probe: $ok_n passed, $bad_n failed."
  [ "$bad_n" -eq 0 ]; exit
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
  code=$(curl "${args[@]}") || code=000
  code=${code:0:3}
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
  code=$(curl "${args[@]}") || code=000
  code=${code:0:3}
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
  echo "Stale session (S9, password guard rule 4): A's session, from a sign-in over 10 minutes ago, tries to add a first password:"
  # The newest sign-in time in the token (amr timestamps). Base64url, unpadded.
  payload=$(cut -d. -f2 <<<"$JWT_A" | tr '_-' '/+'); while (( ${#payload} % 4 )); do payload+='='; done
  claims=$(base64 -d <<<"$payload" 2>/dev/null || true)
  newest=$(grep -o '"timestamp":[0-9]*' <<<"$claims" | cut -d: -f2 | sort -n | tail -n 1 || true)
  exp=$(grep -o '"exp":[0-9]*' <<<"$claims" | cut -d: -f2 | head -n 1 || true)
  age=$(( $(date +%s) - ${newest:-0} ))
  if [ "${exp:-0}" -le "$(date +%s)" ]; then
    echo "  · skipped: JWT_A has expired (or has no exp); refresh it, or sign in again and wait 11 minutes"
  elif [ "$age" -le 660 ]; then
    echo "  · skipped: JWT_A's sign-in is only ${age}s old; use a token from a sign-in 11 to 59 minutes ago"
  else
    probe_pw=$(probe_password)
    # The database refuses it (rule 4, and rule 4b at commit): the Auth server answers 500.
    # It fails even if A signed in elsewhere in the last 10 minutes: the check is tied to
    # the requesting session (password audit HIGH-1).
    # Positive evidence: 500 is the database's refusal (anything else proves nothing).
    expect "a stale session cannot add a first password (500, the database refuses)" \
      "$(request PUT "${SUPABASE_URL%/}/auth/v1/user" "$JWT_A" "{\"password\":\"$probe_pw\"}")" 500
    expect "and no such password signs in" \
      "$(request POST "${SUPABASE_URL%/}/auth/v1/token?grant_type=password" '' "{\"email\":\"$EMAIL_A\",\"password\":\"$probe_pw\"}")" denied
  fi
fi

echo "Authenticator apps are for staff only (gate 20, password guard rule 6):"
# Learner A tries to enrol TOTP. The database refuses the new factor row, and
# the Auth server answers 500. A 200 means the guard is missing: remove the
# unverified factor it left on A (Authentication → Users → A → factors).
expect "learner A cannot enrol an authenticator app (500, the database refuses)" \
  "$(request POST "${SUPABASE_URL%/}/auth/v1/factors" "$JWT_A" '{"factor_type":"totp","friendly_name":"smoke-probe"}')" 500

echo "CORS (S6): only $WEB_ORIGIN may call the two account functions from a browser:"
# Only the allowed-origin header is compared ("any <origin>", "any -" for
# none), whatever status the gateway or the function chose for a refusal.
origin_only() { awk '{ print ($1 == "000" ? "000" : "any"), $2 }'; }  # a network failure (000) never passes
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
