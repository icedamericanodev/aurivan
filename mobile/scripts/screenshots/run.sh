#!/usr/bin/env bash
# Screenshot harness: web-export the app, seed demo data, capture key screens.
# Usage (from mobile/): [SHOTS=notes|data|pace|practice|milestones|support|paths|motion|growth|badges] bash scripts/screenshots/run.sh [out_dir] [dark|light]
# Needs Playwright (preinstalled in Claude cloud sessions; locally: npx playwright install chromium).
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT="${1:-screenshots}"; THEME="${2:-dark}"; TMP="$(mktemp -d)"
mkdir -p "$OUT"
# Rebuild the question pack first so shots never show stale questions.
node scripts/build-content.mjs >/dev/null
# SHOTS=support needs one fix shipped after a learner's report, to show "Updated
# after your report". The real list (src/content/support/fixes.json) is empty until
# the first fix ships, so a one-entry demo list is swapped in for THIS export only
# and put back straight after it (and on any exit, by the trap).
FIXES=src/content/support/fixes.json
if [ "${SHOTS:-}" = support ]; then
  cp "$FIXES" "$TMP/fixes.keep"
  trap 'cp "$TMP/fixes.keep" "'"$FIXES"'"; rm -rf "$TMP"' EXIT
  python3 - "$FIXES" <<'PY'
import json, sys, time
day = time.strftime("%Y-%m-%d", time.localtime(time.time() - 3 * 86400))
json.dump([{"ref": "q:d1_008", "cert": "cisa", "date": day, "fixedIn": "1.7.1", "kind": "corrected",
            "publicNote": "The answer key was corrected, and the explanation now says why."}], open(sys.argv[1], "w"), indent=2)
PY
fi
# --clear: Metro caches the inlined app manifest, so without it the web build can
# report an old app.json (an old version and colours) in Settings → About and backups.
EXPO_OFFLINE=1 npx expo export --platform web --clear --output-dir "$TMP/web" >/dev/null
if [ "${SHOTS:-}" = support ]; then cp "$TMP/fixes.keep" "$FIXES"; fi
python3 scripts/screenshots/make_seed.py "$TMP/seed.json" "$THEME"
python3 scripts/screenshots/serve_spa.py "$TMP/web" & SERVER=$!
trap 'kill $SERVER 2>/dev/null; rm -rf "$TMP"' EXIT
sleep 1
if [ -d /opt/node-tools/node_modules/playwright ]; then export PLAYWRIGHT_REQUIRE_FROM=/opt/node-tools/node_modules/; fi
if [ -x /opt/pw-browsers/chromium-1194/chrome-linux/chrome ]; then export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome; fi
# SHOTS=notes captures the Study notes screens instead (shoot_notes.mjs);
# SHOTS=data captures Settings → Your data: backup, restore preview, errors (shoot_data.mjs).
# SHOTS=pace captures the Build D timer screens: mock start sheet, pace checks,
# pacing results, timed practice, Study defaults and Daylight (shoot_pace.mjs).
if [ "${SHOTS:-}" = notes ]; then
  node scripts/screenshots/shoot_notes.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = data ]; then
  node scripts/screenshots/shoot_data.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = pace ]; then
  node scripts/screenshots/shoot_pace.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = practice ]; then
  # The Practice tab: first screen, whole tab, Guided, the path chooser and
  # Build a set opened, approximate 200% text (shoot_practice.mjs).
  node scripts/screenshots/shoot_practice.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = milestones ]; then
  # Build F: back-fill summary, Milestones, a Results milestone, Play levels,
  # Field notes, and each new game's round and end (shoot_milestones.mjs).
  node scripts/screenshots/shoot_milestones.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = support ]; then
  # Mobile 1.7 Help and feedback: the report sheet on a question and a note, the
  # note after sending, the no-email-app fallback, Settings → Help and feedback,
  # Help, What's new, What's next, Common questions, Your reports (shoot_support.mjs).
  node scripts/screenshots/shoot_support.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = motion ]; then
  # Mobile 1.8 motion: end states of the changed screens, and slow-motion
  # frame strips of the press, the page turn, the segment fill, the tab fade,
  # the segmented thumb (moving and reopened) and a mock's calm turn (shoot_motion.mjs).
  node scripts/screenshots/shoot_motion.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = growth ]; then
  # Mobile 1.9 progress you can see: Today (normal, cleared, exam-ready, exam
  # eve), Results, You, Milestones, the new empty states, the bank grouping and
  # a sheet; strips of a number roll, ring growth, the clearing, the milestone
  # moment, the theme fade and You's growth (shoot_growth.mjs).
  node scripts/screenshots/shoot_growth.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = badges ]; then
  # Mobile 1.10 badge collection: the case (empty-ish, mid, nearly complete),
  # each shelf, Next for your exam, Sort, the detail sheet, Results with a new
  # badge, You's dot, Show badges off/on, and a strip of the unlock moment
  # (shoot_badges.mjs; REDUCED=1 for the reduced set).
  node scripts/screenshots/shoot_badges.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = paths ]; then
  # Build E: mode picker, Smart reason tag, Guided step, In order tail,
  # Practice this topic, Root or Rumor and Call It First (shoot_paths.mjs).
  node scripts/screenshots/shoot_paths.mjs "$TMP/seed.json" "$OUT" "$THEME"
else
  node scripts/screenshots/shoot.mjs "$TMP/seed.json" "$OUT"
fi
echo "Screenshots in $OUT"
