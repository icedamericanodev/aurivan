#!/usr/bin/env bash
# KaiSip release smoke test: walks the key learner paths on the web app and the
# phone app (its Expo web export) in headless Chromium, and runs the phone's
# unit gates. Owned by the smoke-tester agent (.claude/agents/smoke-tester.md).
#
# Usage: scripts/smoke/run.sh [web|mobile|all] [out_dir] [repo_root]
#   web     index.html over a local server, 390x844 and 1280x800, light and dark
#   mobile  the phone app exported for the web, 390x844, plus `npm run check`
#   all     both (default)
#   out_dir screenshots + *-results.json + logs (default: ./smoke-out)
#   repo_root the checkout to test (default: SMOKE_REPO, else this script's repo),
#           e.g. a clean `git worktree add --detach <path> <sha>`. It needs
#           mobile/node_modules (a symlink to another checkout's is fine).
#
# Environment:
#   SMOKE_REPO          repo to test (same as the 3rd argument)
#   SMOKE_WEB_PORT      web server port            (default 8030)
#   SMOKE_MOBILE_PORT   phone build port            (default 8031)
#   SMOKE_DIALOGS_PORT  phone "dialogs" build port  (default 8032)
#   SMOKE_ONLY=W3,M4    run only these paths (prefix match)
#   SMOKE_SKIP_CHECK=1  skip `npm run check` (the unit gates)
#   SMOKE_SLOW_MS=5000  phone: a screen slower than this to show content fails M7
#
# Read-only on the apps. The one write inside the repo is the content-pack
# rebuild the screenshot harness also does (mobile/scripts/build-content.mjs);
# if that changes tracked files, the committed pack was stale and it is reported.
# Cloud stays off: the "dialogs" build uses only the in-memory backend
# (EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND=memory + EXPO_PUBLIC_AURIVAN_SHOTS=1), which
# draws system alerts in the page so "Submit exam?" can be answered on the web.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
WHAT="${1:-all}"
OUT="${2:-smoke-out}"
REPO="${3:-${SMOKE_REPO:-$(cd "$HERE/../.." && pwd)}}"
REPO="$(cd "$REPO" && pwd)"
mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"
WEB_PORT="${SMOKE_WEB_PORT:-8030}"; MOB_PORT="${SMOKE_MOBILE_PORT:-8031}"; DLG_PORT="${SMOKE_DIALOGS_PORT:-8032}"
case "$WHAT" in web|mobile|all) ;; *) echo "usage: $0 [web|mobile|all] [out_dir] [repo_root]" >&2; exit 2;; esac

if [ -d /opt/node-tools/node_modules/playwright ]; then export PLAYWRIGHT_REQUIRE_FROM=/opt/node-tools/node_modules/; fi
if [ -x /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]; then export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome; fi

SHA="$(git -C "$REPO" rev-parse HEAD)"
DIRTY="$(git -C "$REPO" status --porcelain --untracked-files=no | wc -l | tr -d ' ')"
T0=$(date +%s)
echo "Smoke test of $REPO at $SHA ($DIRTY changed tracked files) → $OUT"
printf '{"sha":"%s","repo":"%s","dirtyFiles":%s,"started":"%s","what":"%s"}\n' "$SHA" "$REPO" "$DIRTY" "$(date -u +%FT%TZ)" "$WHAT" > "$OUT/run-meta.json"

port_busy() { python3 -c "import socket,sys; s=socket.socket(); sys.exit(0 if s.connect_ex(('127.0.0.1',$1))==0 else 1)"; }
for p in $([ "$WHAT" != mobile ] && echo "$WEB_PORT") $([ "$WHAT" != web ] && echo "$MOB_PORT $DLG_PORT"); do
  if port_busy "$p"; then echo "Port $p is already in use (an old smoke server?). Stop it or pick another SMOKE_*_PORT." >&2; exit 1; fi
done

PIDS=(); TMP="$(mktemp -d)"
cleanup() { for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done; rm -rf "$TMP"; }
trap cleanup EXIT
wait_port() { for _ in $(seq 1 50); do port_busy "$1" && return 0; sleep 0.2; done; echo "server on port $1 did not start" >&2; return 1; }
STATUS=0

# ── Phone build (started first: the exports run while the web walk does) ─────
export_mobile() {
  local M="$REPO/mobile"
  [ -e "$M/node_modules" ] || { echo "mobile/node_modules is missing in $REPO (symlink one: ln -sfn <checkout>/mobile/node_modules $M/node_modules)" >&2; return 1; }
  ( cd "$M"
    node scripts/build-content.mjs > "$OUT/build-content.log" 2>&1
    git -C "$REPO" status --porcelain -- mobile/src/content/generated > "$OUT/content-pack-diff.txt"
    # --clear: Metro caches the inlined app manifest (see mobile/scripts/screenshots/run.sh).
    env -u EXPO_PUBLIC_AURIVAN_CLOUD -u EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND -u EXPO_PUBLIC_AURIVAN_SHOTS EXPO_OFFLINE=1 \
      npx expo export --platform web --clear --output-dir "$TMP/web-off" > "$OUT/export-shipped.log" 2>&1
    EXPO_OFFLINE=1 EXPO_PUBLIC_AURIVAN_CLOUD=1 EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND=memory EXPO_PUBLIC_AURIVAN_SHOTS=1 \
      npx expo export --platform web --clear --output-dir "$TMP/web-dialogs" > "$OUT/export-dialogs.log" 2>&1
    python3 scripts/screenshots/make_seed.py "$TMP/seed.json" light )
}
if [ "$WHAT" != web ]; then
  echo "· exporting the phone app for the web (two builds, about 1-2 minutes)"
  export_mobile > "$OUT/export.log" 2>&1 & EXPORT_PID=$!
fi

# ── Web ──────────────────────────────────────────────────────────────────────
if [ "$WHAT" != mobile ]; then
  echo "· web: serving $REPO on :$WEB_PORT"
  python3 -m http.server "$WEB_PORT" --bind 127.0.0.1 --directory "$REPO" > "$OUT/web-server.log" 2>&1 & PIDS+=($!)
  wait_port "$WEB_PORT"
  node "$HERE/web.mjs" "$REPO" "$OUT" "http://127.0.0.1:$WEB_PORT" 2>&1 | tee "$OUT/web.log" || STATUS=1
fi

# ── Phone ────────────────────────────────────────────────────────────────────
if [ "$WHAT" != web ]; then
  if ! wait "$EXPORT_PID"; then echo "the phone export failed: see $OUT/export*.log" >&2; cat "$OUT/export.log" >&2; exit 1; fi
  if [ -s "$OUT/content-pack-diff.txt" ]; then echo "! the rebuilt content pack differs from the committed one (see content-pack-diff.txt)"; fi
  python3 "$REPO/mobile/scripts/screenshots/serve_spa.py" "$TMP/web-off" "$MOB_PORT" & PIDS+=($!)
  python3 "$REPO/mobile/scripts/screenshots/serve_spa.py" "$TMP/web-dialogs" "$DLG_PORT" & PIDS+=($!)
  wait_port "$MOB_PORT"; wait_port "$DLG_PORT"
  node "$HERE/mobile.mjs" "$REPO" "$OUT" "http://127.0.0.1:$MOB_PORT" "http://127.0.0.1:$DLG_PORT" "$TMP/seed.json" 2>&1 | tee "$OUT/mobile.log" || STATUS=1
  # Stop the servers before the unit gates: jest has timing tests that a busy machine can fail.
  cleanup; PIDS=(); TMP="$(mktemp -d)"
  if [ "${SMOKE_SKIP_CHECK:-}" != 1 ]; then
    echo "· phone unit gates: npm run check (typecheck, lint, jest, web plant check; about 5 minutes)"
    T1=$(date +%s); CHECK=0
    ( cd "$REPO/mobile" && npm run check ) > "$OUT/npm-check.log" 2>&1 || CHECK=$?
    node "$HERE/summary.mjs" --gates "$OUT" "$CHECK" "$(( $(date +%s) - T1 ))"
    [ "$CHECK" = 0 ] || STATUS=1
  fi
fi

node "$HERE/summary.mjs" "$OUT" "$(( $(date +%s) - T0 ))" || STATUS=1
exit $STATUS
