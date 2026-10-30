#!/usr/bin/env bash
# Marketing footage of The Turning, from the app's own web export at phone size.
#
# Makes, in <out_dir> (default: kaisip-turning NEXT TO the repo folder, never inside it):
#   forms13/forms13-<species>-form{III,IV}-<theme>.png   all 13 species, botanical look
#   clips/turning-<species>-formIV-<theme>-9x16.mp4      the Form III -> IV Turning, real speed, 1080x1920
#   clips/turning-<species>-formIV-<theme>-4x5.mp4       the same, 1080x1350, cropped above "What grows it next"
#   clips/turning-<species>-formIV-<theme>-end.png       the settled last frame (fact + form name)
# Use the 4:5 clips for social: the 9:16 clip shows the domain percentages under the plant.
#
# Usage (from the repo root):
#   bash docs/marketing/tools/capture.sh [out_dir] [species...]
#   (default species for clips: oak bamboo narra cherry-blossom; oak is also shot in dark)
#
# Needs: the mobile app's npm packages (cd mobile && npm ci), Playwright with
# Chromium (preinstalled in Claude cloud sessions), Python 3 with Pillow, ffmpeg.
# It regenerates the git-ignored mobile content pack (mobile/src/content/generated)
# and writes everything else only to <out_dir>. It changes no app code or data.
#
# These clips are real app footage from the app's WEB build: fine for social,
# the website hero and the edit's animatic. Store preview videos (App Store,
# Play promo) use a recording from a real phone (TURNING_VIDEO_PLAN.md §2).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
TOOLS="$ROOT/docs/marketing/tools"
OUT_ARG="${1:-$ROOT/../kaisip-turning}"
OUT="$(mkdir -p "$OUT_ARG" && cd "$OUT_ARG" && pwd)"
shift || true
SPECIES=("${@:-oak bamboo narra cherry-blossom}")
read -r -a SPECIES <<<"${SPECIES[*]}"
PORT=8095
TMP="$(mktemp -d)"
mkdir -p "$OUT/forms13" "$OUT/clips"

if [ -d /opt/node-tools/node_modules/playwright ]; then export PLAYWRIGHT_REQUIRE_FROM=/opt/node-tools/node_modules/; fi
if [ -x /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]; then export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome; fi

# 1. Export the app for the web, and make the demo saves (light and dark).
cd "$ROOT/mobile"
node scripts/build-content.mjs >/dev/null
EXPO_OFFLINE=1 npx expo export --platform web --output-dir "$TMP/web" >/dev/null
python3 scripts/screenshots/make_seed.py "$TMP/seed-light.json" light
python3 scripts/screenshots/make_seed.py "$TMP/seed-dark.json" dark

if python3 -c "import socket,sys; s=socket.socket(); sys.exit(0 if s.connect_ex(('127.0.0.1',$PORT))==0 else 1)"; then
  echo "Port $PORT is already in use. Stop the old server, then run again." >&2
  exit 1
fi
python3 scripts/screenshots/serve_spa.py "$TMP/web" "$PORT" >/dev/null 2>&1 & SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$TMP"' EXIT
sleep 2
BASE="http://127.0.0.1:$PORT"

# 2. All 13 species at Form III and Form IV.
for t in light dark; do node "$TOOLS/shoot_forms13.mjs" "$TMP/seed-$t.json" "$OUT/forms13" "$t" "$BASE"; done

# 3. The Turning, frame by frame on a slowed clock, then rebuilt at real speed.
clip() { # species theme
  local sp=$1 th=$2 bg
  bg=$([ "$th" = dark ] && echo 0x111613 || echo 0xF3F1EA)
  node "$TOOLS/record_turning.mjs" "$TMP/seed-$th.json" "$TMP" "$th" "$BASE" "$sp" 6 5500
  local list="$TMP/frames-$sp-$th/concat.txt" name="$OUT/clips/turning-$sp-formIV-$th"
  ffmpeg -v error -y -f concat -safe 0 -i "$list" -vf "fps=30,scale=886:1920,pad=1080:1920:(ow-iw)/2:0:color=$bg" -c:v libx264 -pix_fmt yuv420p -crf 20 -r 30 "$name-9x16.mp4"
  # The 4:5 crop stops above "What grows it next", so no domain percentages show.
  ffmpeg -v error -y -f concat -safe 0 -i "$list" -vf "fps=30,crop=786:1076:0:90,scale=-2:1350,pad=1080:1350:(ow-iw)/2:0:color=$bg" -c:v libx264 -pix_fmt yuv420p -crf 20 -r 30 "$name-4x5.mp4"
  cp "$(ls "$TMP/frames-$sp-$th"/f*.png | tail -1)" "$name-end.png"
}
for sp in "${SPECIES[@]}"; do clip "$sp" light; done
clip oak dark
echo "Done: $OUT"
