#!/usr/bin/env bash
# Plant contact sheets from the APP's renderer (Phase 4a).
# Usage (from mobile/): bash scripts/screenshots/plant_sheet.sh [out_dir]
#
# 1. A one-file jest run with the jest-expo WEB preset server-renders
#    components/plant/Plant.tsx through react-native-web + react-native-svg's
#    web build into HTML pages (scripts/screenshots/plant-sheet.web.tsx).
# 2. Playwright screenshots each page at 2x (like a phone).
# Needs Playwright (preinstalled in Claude cloud sessions; locally: npx playwright install chromium).
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="$(mkdir -p "${1:-plant-sheets}" && cd "${1:-plant-sheets}" && pwd)"
export PLANT_SHEET_OUT="$OUT"

npx jest --config scripts/screenshots/plant-sheet.jest.config.cjs --runTestsByPath scripts/screenshots/plant-sheet.web.tsx >/dev/null
if [ -d /opt/node-tools/node_modules/playwright ]; then export PLAYWRIGHT_REQUIRE_FROM=/opt/node-tools/node_modules/; fi
if [ -x /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]; then export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome; fi
node scripts/screenshots/shoot_plant_sheet.mjs "$OUT"
