#!/usr/bin/env bash
# Screenshot harness: web-export the app, seed demo data, capture key screens.
# Usage (from mobile/): [SHOTS=notes] bash scripts/screenshots/run.sh [out_dir] [dark|light]
# Needs Playwright (preinstalled in Claude cloud sessions; locally: npx playwright install chromium).
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="${1:-screenshots}"; THEME="${2:-dark}"; TMP="$(mktemp -d)"
mkdir -p "$OUT"
# Rebuild the question pack first so shots never show stale questions.
node scripts/build-content.mjs >/dev/null
# --clear: Metro caches the inlined app manifest, so without it the web build can
# report an old app.json (an old version and colours) in Settings → About and backups.
EXPO_OFFLINE=1 npx expo export --platform web --clear --output-dir "$TMP/web" >/dev/null
python3 scripts/screenshots/make_seed.py "$TMP/seed.json" "$THEME"
python3 scripts/screenshots/serve_spa.py "$TMP/web" & SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$TMP"' EXIT
sleep 1
if [ -d /opt/node-tools/node_modules/playwright ]; then export PLAYWRIGHT_REQUIRE_FROM=/opt/node-tools/node_modules/; fi
if [ -x /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]; then export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome; fi
# SHOTS=notes captures the Study notes screens instead (shoot_notes.mjs);
# SHOTS=data captures Settings → Your data: backup, restore preview, errors (shoot_data.mjs).
if [ "${SHOTS:-}" = notes ]; then
  node scripts/screenshots/shoot_notes.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = data ]; then
  node scripts/screenshots/shoot_data.mjs "$TMP/seed.json" "$OUT" "$THEME"
else
  node scripts/screenshots/shoot.mjs "$TMP/seed.json" "$OUT"
fi
echo "Screenshots in $OUT"
