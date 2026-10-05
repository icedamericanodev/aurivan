#!/usr/bin/env bash
#
# Run Aurivan on your Android emulator and keep it in sync with GitHub.
#
#   bash scripts/dev-sync.sh          # from inside the mobile/ folder
#
# What it does, every 15 seconds:
#   1. Asks GitHub for new commits on your current branch (git fetch).
#   2. If there are any, pulls them and prints what changed.
#   3. If the questions changed (../data/domain*.json), rebuilds the
#      question pack. If libraries changed (package.json / lock file),
#      runs npm install and restarts the dev server.
#
# You do not need to press anything after that. Expo's dev server WATCHES the
# files: the moment a pull changes code, it pushes the change to the emulator
# by itself ("Fast Refresh"). If a screen ever looks stale, press r in this
# window to reload the app fully.
#
# Stop with Ctrl-C.
#
# Use this when Claude works in a CLOUD session and PUSHES commits. If Claude
# Code runs on this Mac and edits files directly, you do not need this script
# at all: plain `npx expo start --android` already reacts to every saved file.

set -u
INTERVAL=15

cd "$(dirname "$0")/.." || exit 1          # → mobile/
if [ ! -f package.json ] || [ ! -f app.json ]; then
  echo "Run this from inside the Aurivan repository (mobile/ folder)." >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Watching origin/$BRANCH on GitHub, checking every ${INTERVAL}s."
echo "Press Ctrl-C to stop."
echo

STOPPING=0
EXPO_PID=""

start_expo() {
  # --android opens the app on the running emulator (installing Expo Go on it
  # the first time). Output goes straight to this window.
  npx expo start --android &
  EXPO_PID=$!
}

stop_expo() {
  if [ -n "$EXPO_PID" ]; then
    kill "$EXPO_PID" 2>/dev/null
    wait "$EXPO_PID" 2>/dev/null
    EXPO_PID=""
  fi
}

cleanup() {
  STOPPING=1
  echo
  echo "Stopping."
  stop_expo
}
trap cleanup EXIT
trap 'cleanup; exit 0' INT TERM

start_expo

while [ "$STOPPING" = "0" ]; do
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

  if ! git pull --quiet --ff-only origin "$BRANCH"; then
    echo "  Could not fast-forward. You have local changes, or the branch was"
    echo "  rebuilt after a merge. Run 'git status' and sort it out by hand;"
    echo "  this script picks up again afterwards."
    continue
  fi

  CHANGED="$(git --no-pager diff --name-only "$LOCAL" HEAD)"

  # New libraries need installing, and the dev server must restart to see them.
  if echo "$CHANGED" | grep -qE '^mobile/package(-lock)?\.json$'; then
    echo "  Libraries changed: running npm install and restarting the dev server."
    stop_expo
    npm install --silent   # also rebuilds the question pack (postinstall)
    start_expo
    continue
  fi

  # New or edited questions: rebuild the question pack. The dev server sees
  # the regenerated files and refreshes the app on its own.
  if echo "$CHANGED" | grep -qE '^data/domain[0-9]+\.json$|^mobile/scripts/build-content\.mjs$'; then
    echo "  Questions changed: rebuilding the question pack."
    npm run --silent content
  fi

  echo "  Done. The emulator refreshes by itself (press r here if it looks stale)."
done
