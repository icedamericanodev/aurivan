#!/usr/bin/env bash
# Screenshot harness: web-export the app, seed demo data, capture key screens.
# Usage (from mobile/): [SHOTS=notes|data|pace|practice|milestones|support|paths|motion|growth|badges|badgesC|stats|learnplay|plant|fit|proof|settings] bash scripts/screenshots/run.sh [out_dir] [dark|light]
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
# A server left over from an earlier run would keep serving its OLD build on
# the same port (this one would fail to bind, quietly): stop instead.
if python3 -c "import socket,sys; s=socket.socket(); sys.exit(0 if s.connect_ex(('127.0.0.1',8093))==0 else 1)"; then
  echo "Port 8093 is already in use (an old screenshot server?). Stop it, then run again." >&2
  exit 1
fi
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
  # Help, What's new (top and end), Common questions, Your reports (shoot_support.mjs).
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
  # (shoot_badges.mjs; REDUCED=1 for the reduced set; FONT_SCALE=1.3 or 2 for the
  # large-text layouts of the case, a shelf and the sheet).
  node scripts/screenshots/shoot_badges.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = badgesC ]; then
  # Mobile 1.11 badge tiers, Took Root and the share card: the tier ladders,
  # the five domain medallions and their Stretch row, "New in Evergreen", the
  # catalogue line, the share entry and the card (shoot_badges_c.mjs; REDUCED=1;
  # FONT_SCALE=2 for the sheet, its ladder and the share panel at about 200% text).
  node scripts/screenshots/shoot_badges_c.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = stats ]; then
  # Mobile 1.11 stat rows: Results (1-question practice, 20-question practice,
  # a mock and its pacing), You's stats and the Today clearing (shoot_stats.mjs;
  # NARROW=1 for a 360-wide phone, FONT_SCALE=2 for approximate 200% text).
  node scripts/screenshots/shoot_stats.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = learnplay ]; then
  # Mobile 1.12 Learn and Play: Learn's trail and reason, the lesson cover, the
  # scene templates, a check's verdict, Lesson complete, Mark as read, Play,
  # each game's header, a recap with its sparkline and a level up; strips of
  # the scene turn, the step line, the timeline, the lesson ✓, a match, a
  # stone and the level-leaf morph (shoot_learnplay.mjs; REDUCED=1; NARROW=1;
  # FONT_SCALE=2 for approximate 200% text).
  node scripts/screenshots/shoot_learnplay.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = plant ]; then
  # Mobile 1.13 Your plant: the onboarding pick, Today (the plant, the grow-up
  # line, the quiet prompt), You, Your plant, resting, Quiet look, hidden and
  # Change species (shoot_plant.mjs; NARROW=1; FONT_SCALE=2 for about 200% text).
  # Mobile 1.14 Dress and Alive (shoot_plant4b.mjs): the Look screen, dressed
  # plants, moods, planters, keepsakes, the badge sheet line, the planting
  # moment, and frame strips of Breathe, a reaction, the growth sequence and
  # the planting (REDUCED=1 for the reduced set). PLANT=4b runs only these.
  if [ "${PLANT:-}" != 4b ]; then node scripts/screenshots/shoot_plant.mjs "$TMP/seed.json" "$OUT" "$THEME"; fi
  node scripts/screenshots/shoot_plant4b.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = fit ]; then
  # Mobile 1.15 "Fit the plan": onboarding steps 2–4, Today (a new learner's
  # day 1, a 10-minute day, the Exam-focused mini mock, the "Fit your plan"
  # card, Tomorrow), the fit screen, Settings → Your study, Practice's order,
  # You's legend, the mistake tags and their sheet, an answer after a hint
  # and the exam eve (shoot_fit.mjs; NARROW=1; FONT_SCALE=2 for about 200% text).
  node scripts/screenshots/shoot_fit.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = proof ]; then
  # Mobile 1.16 "Proof": the readiness report (full, not enough data, one mock,
  # a mock opened from You, a "down" trend), Today in exam week (6 and 3 days
  # out), Today's readiness words as a button, the exam-week checklist and
  # You's Mock exams rows (shoot_proof.mjs; NARROW=1; FONT_SCALE=2 for about 200% text).
  node scripts/screenshots/shoot_proof.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = settings ]; then
  # Mobile 1.17 "a tidy Settings": Settings top, middle and end, every sheet
  # (the exam-date calendar too), Settings opened at the plant's group and
  # straight into the calendar, onboarding's date step with the calendar, and
  # You without the theme switch (shoot_settings.mjs; NARROW=1; FONT_SCALE=2).
  node scripts/screenshots/shoot_settings.mjs "$TMP/seed.json" "$OUT" "$THEME"
elif [ "${SHOTS:-}" = paths ]; then
  # Build E: mode picker, Smart reason tag, Guided step, In order tail,
  # Practice this topic, Root or Rumor and Call It First (shoot_paths.mjs).
  node scripts/screenshots/shoot_paths.mjs "$TMP/seed.json" "$OUT" "$THEME"
else
  node scripts/screenshots/shoot.mjs "$TMP/seed.json" "$OUT"
fi
echo "Screenshots in $OUT"
