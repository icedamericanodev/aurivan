#!/usr/bin/env bash
#
# Run KaiSip on your Android emulator and keep it in sync with GitHub.
#
#   bash scripts/dev-sync.sh          # from inside the mobile/ folder
#
# KaiSip runs as its OWN app on the emulator (a "development build"), not
# inside Expo Go. On start this builds and installs that app (first time
# ~5-10 minutes, later runs under a minute), then serves your code to it.
#
# What it does next, every 15 seconds:
#   1. Asks GitHub for new commits on your current branch (git fetch).
#   2. If there are any, pulls them and prints what changed.
#   3. If the questions changed (../data/domain*.json), rebuilds the
#      question pack. If libraries changed (package.json / lock file),
#      runs npm ci and REBUILDS the app (new libraries can include
#      native Android code, which only a rebuild picks up).
#
# You do not need to press anything after that. Expo's dev server WATCHES the
# files: the moment a pull changes code, it pushes the change to the emulator
# by itself ("Fast Refresh"). If a screen ever looks stale, press r in this
# window to reload the app fully.
#
# Stop with Ctrl-C.
#
# To see Claude's work AS IT IS PUSHED (before merging), run it on Claude's
# working branch: git checkout claude/jolly-archimedes-p1sklr
# To see only merged work, run it on main.
#
# Use this when Claude works in a CLOUD session and PUSHES commits. If Claude
# Code runs on this Mac and edits files directly, you do not need this script
# at all: plain `npx expo run:android` already reacts to every saved file.

set -u
INTERVAL=15

cd "$(dirname "$0")/.." || exit 1          # → mobile/
if [ ! -f package.json ] || [ ! -f app.json ]; then
  echo "Run this from inside the KaiSip repository (mobile/ folder)." >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
RESTART_FLAG="$(mktemp -u /tmp/aurivan-restart.XXXXXX)"
echo "Watching origin/$BRANCH on GitHub, checking every ${INTERVAL}s."
echo "Press Ctrl-C to stop."
echo

# LAYOUT, AND WHY: the app's dev server runs in the FOREGROUND and the GitHub
# watcher in the BACKGROUND. The first version did the opposite, and Expo then
# printed "Using a non-interactive terminal, keyboard commands are disabled":
# a background process cannot read your keyboard, so r (reload) did nothing.
# Same lesson Salapify's script learned: keep the app in front.

STOPPING=0
WATCH_PID=""

# NATIVE CHANGES, AND WHY: the generated android/ folder (never edit it, never
# committed) bakes in the app's id, name, icons and splash. If a pull changes
# any of those (the KaiSip rename did), the already-installed development
# build is OUT OF DATE: its JavaScript reloads fine but it is still the old
# app underneath, and the emulator can show a blank white screen. So we keep
# a "fingerprint" of the native settings (app.json without its version number,
# plus the icon files) and rebuild from scratch when it changes.
native_sig() {
  {
    node -e "const a=require('./app.json').expo; delete a.version; console.log(JSON.stringify(a))" 2>/dev/null
    cat assets/*.png 2>/dev/null
  } | shasum | cut -d' ' -f1
}

# Start-up check: is the android/ folder from an OLDER app id or name?
want_id="$(node -p "require('./app.json').expo.android.package" 2>/dev/null)"
have_id="$(grep -ho 'applicationId "[^"]*"' android/app/build.gradle 2>/dev/null | head -1 | sed 's/.*"\(.*\)"/\1/')"
if [ -d android ] && [ -n "$want_id" ] && [ -n "$have_id" ] && [ "$have_id" != "$want_id" ]; then
  echo "The generated android/ folder is from an older app ($have_id); this version is $want_id."
  echo "Removing it so the app is built fresh (the first build takes 5-10 minutes)."
  echo "The old app stays on the emulator: long-press its icon -> Uninstall."
  rm -rf android
  echo
fi

cleanup() {
  STOPPING=1
  [ -n "$WATCH_PID" ] && kill "$WATCH_PID" 2>/dev/null
  rm -f "$RESTART_FLAG"
}
trap cleanup EXIT
trap 'cleanup; echo; echo "Stopping."; exit 0' INT TERM

# ── The watcher (background) ───────────────────────────────────────────
watch_github() {
  while true; do
    sleep "$INTERVAL"

    # Ask GitHub what it has. This does NOT change your files.
    git fetch --quiet origin "$BRANCH" 2>/dev/null || continue
    LOCAL="$(git rev-parse HEAD 2>/dev/null)"
    REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null)"
    [ -z "$REMOTE" ] && continue
    [ "$LOCAL" = "$REMOTE" ] && continue

    echo
    echo "New work on origin/$BRANCH:"
    git --no-pager log --oneline "HEAD..origin/$BRANCH" | sed 's/^/    /'

    # Files tools rewrite on their own: package-lock.json (npm) and
    # tsconfig.json (Expo touches it when the dev server starts). Those edits
    # are noise, and leaving them would make git refuse every pull from here on.
    git checkout --quiet -- package-lock.json tsconfig.json 2>/dev/null

    SIG_BEFORE="$(native_sig)"

    if ! git pull --quiet --ff-only origin "$BRANCH"; then
      # Claude's working branch is reset onto main after every merge (see
      # CLAUDE.md "Post-merge branch hygiene"), so a plain pull can no longer
      # fast-forward. If you have NO local edits there is nothing to lose:
      # match GitHub's version exactly. With local edits, stop and let you
      # decide, so nothing you wrote is ever thrown away.
      if [ -z "$(git status --porcelain)" ]; then
        echo "  The branch was rebuilt on GitHub (normal after a merge)."
        echo "  You have no local edits, so syncing to GitHub's version."
        git reset --quiet --hard "origin/$BRANCH"
      else
        echo "  Could not fast-forward and you have local edits:"
        git status --short | sed 's/^/    /'
        echo "  Keep them? Commit or stash them. Don't need them?"
        echo "    git restore . && git clean -fd"
        echo "  This script picks up again afterwards."
        continue
      fi
    fi

    CHANGED="$(git --no-pager diff --name-only "$LOCAL" HEAD)"

    # The app's id, name, icons or splash changed: rebuild from scratch (see
    # NATIVE CHANGES above). The loop below removes android/ when it sees "clean".
    if [ "$SIG_BEFORE" != "$(native_sig)" ]; then
      echo "  The app's id, name or icons changed: rebuilding KaiSip from scratch (5-10 minutes)."
      echo clean >"$RESTART_FLAG"
      pkill -INT -f "expo run:android" 2>/dev/null
      continue
    fi

    # New libraries: the app must be rebuilt. Ask the foreground loop to do it
    # (flag file), then stop the running dev server so the loop takes over.
    if echo "$CHANGED" | grep -qE '^mobile/package(-lock)?\.json$'; then
      echo "  Libraries changed: reinstalling and rebuilding the app."
      : >"$RESTART_FLAG"
      pkill -INT -f "expo run:android" 2>/dev/null
      continue
    fi

    # New or edited questions: rebuild the question pack. The dev server sees
    # the regenerated files and refreshes the app on its own.
    if echo "$CHANGED" | grep -qE '^data/domain[0-9]+\.json$|^data/cisa_notes\.json$|^mobile/scripts/(build-content\.mjs|notes-pack\.cjs)$'; then
      echo "  Questions or study notes changed: rebuilding the content pack."
      npm run --silent content
    fi

    echo "  Done. The emulator refreshes by itself (press r here if it looks stale)."
  done
}

watch_github &
WATCH_PID=$!

# ── The app (foreground, so r / j / m keys work) ───────────────────────
while true; do
  # Builds (incrementally), installs the KaiSip development build on the
  # running emulator, and starts the dev server that streams code to it.
  npx expo run:android
  [ "$STOPPING" = "1" ] && break

  if [ -f "$RESTART_FLAG" ]; then
    if grep -q clean "$RESTART_FLAG" 2>/dev/null; then rm -rf android; fi
    rm -f "$RESTART_FLAG"
    # npm ci installs exactly what the lock file lists and never rewrites it
    # (npm install can, which then blocks the next git pull).
    npm ci --silent   # also rebuilds the question pack (postinstall)
    echo "Rebuilding KaiSip with the new libraries."
    continue
  fi

  echo
  echo "The dev server stopped. If that was not you pressing Ctrl-C, the"
  echo "reason is in the output above. Run this script again to restart."
  break
done
