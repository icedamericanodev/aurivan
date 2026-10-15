#!/usr/bin/env bash
#
# Build a KaiSip APK you can install on your own Android phone (a test
# install, not the Play Store), WITHOUT disturbing the emulator setup.
#
#   bash scripts/build-apk.sh              # builds the latest merged app (main)
#   bash scripts/build-apk.sh <branch>     # or another branch, e.g. claude/...
#
# Your emulator and dev-sync.sh can keep running while this works. The build
# happens in a SEPARATE copy of the code (a "git worktree") in
# ~/aurivan-apk-build, with its own packages and its own android/ folder, so it
# never touches the folder dev-sync is serving to the emulator.
#
# What it does:
#   1. Fetches the latest code from GitHub and puts that version in the
#      separate copy (main by default: only reviewed, merged work).
#   2. Installs packages there and builds the question pack.
#   3. Builds a RELEASE app with Gradle. A release app carries all of its
#      code inside, so it runs on a phone with no computer attached.
#   4. Copies the APK to your Desktop as KaiSip-<version>.apk.
#
# The APK is signed with the standard Android DEBUG key. That is fine for
# installing on your own phones; the Play Store needs a separate upload key,
# which we set up at store time.
#
# First run takes 10-20 minutes (packages and Gradle download their parts);
# later runs are much quicker.

set -euo pipefail

REF="${1:-main}"
MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)"          # this repo's mobile/
REPO="$(git -C "$MOBILE_DIR" rev-parse --show-toplevel)"
BUILD_DIR="${APK_BUILD_DIR:-$HOME/aurivan-apk-build}"
OUT_DIR="${APK_OUT_DIR:-$HOME/Desktop}"

# Gradle needs to know where the Android SDK is. expo run:android finds it on
# its own; Gradle only reads ANDROID_HOME, so point it at the usual Mac place.
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
if [ -z "${ANDROID_HOME:-}" ]; then
  echo "Can't find the Android SDK. Set ANDROID_HOME to its folder and run again." >&2
  exit 1
fi

echo "Building an installable KaiSip APK from '$REF'."
echo "Your emulator and dev-sync can keep running."
echo

echo "• Getting the latest '$REF' from GitHub…"
git -C "$REPO" fetch --quiet origin "$REF"
COMMIT="$(git -C "$REPO" rev-parse FETCH_HEAD)"

# The separate copy. Created once, then moved to the new version each run.
if [ -d "$BUILD_DIR/.git" ] || [ -f "$BUILD_DIR/.git" ]; then
  git -C "$BUILD_DIR" checkout --quiet --force --detach "$COMMIT"
  git -C "$BUILD_DIR" clean --quiet -fd -e mobile/node_modules -e mobile/android
else
  git -C "$REPO" worktree prune
  git -C "$REPO" worktree add --quiet --detach "$BUILD_DIR" "$COMMIT"
fi

cd "$BUILD_DIR/mobile"
VERSION="$(node -p "require('./app.json').expo.version")"
OUT="$OUT_DIR/KaiSip-$VERSION.apk"

# Install packages only when the lock file changed since the last build.
LOCK_HASH="$(shasum package-lock.json | cut -d' ' -f1)"
if [ ! -d node_modules ] || [ "$(cat node_modules/.aurivan-lock 2>/dev/null)" != "$LOCK_HASH" ]; then
  echo "• Installing packages in the separate copy (npm ci)…"
  npm ci
  echo "$LOCK_HASH" > node_modules/.aurivan-lock
fi

echo "• Building the question pack…"
npm run --silent content

# The update "runtime" label must be computed BEFORE the android/ folder exists,
# the same way GitHub computes it when it publishes an update. Computed inside
# Gradle it came out different, and such an APK never receives an update.
echo "• Computing the update runtime…"
RUNTIME="$(npx expo-updates fingerprint:generate --platform android | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).hash))')"
[ -n "$RUNTIME" ] || { echo "Could not compute the update runtime." >&2; exit 1; }
echo "  $RUNTIME"

# A test APK listens to the "preview" update channel. The committed app.json
# sets no channel (store builds get "production" from eas.json on EAS), so set
# it in this separate copy only, after the runtime above. The next run's
# checkout resets app.json. Older versions set it in app.json already.
if [ -f scripts/set-update-channel.mjs ]; then
  node scripts/set-update-channel.mjs preview
fi

echo "• Preparing the Android project…"
npx expo prebuild --platform android --no-install

echo "• Building the release app with Gradle (this is the slow part)…"
# Gradle's default memory runs out during the release lint pass; give it room.
sed -i.bak 's/^org.gradle.jvmargs=.*/org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=1g/' android/gradle.properties && rm -f android/gradle.properties.bak
( cd android && EXPO_UPDATES_FINGERPRINT_OVERRIDE="$RUNTIME" ./gradlew assembleRelease )

APK="android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK" ]; then
  echo "The build finished but no APK was found at $APK." >&2
  exit 1
fi
EMBEDDED="$(unzip -p "$APK" assets/fingerprint)"
if [ "$EMBEDDED" != "$RUNTIME" ]; then
  echo "The APK embeds runtime $EMBEDDED but updates are published for $RUNTIME; it would never update." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
cp "$APK" "$OUT"
SIZE="$(du -h "$OUT" | cut -f1)"

echo
echo "Done: $OUT ($SIZE), version $VERSION."
echo
echo "Install it on your phone, either way:"
echo "  A) No cable: send the file to the phone (Google Drive, or email it to"
echo "     yourself), tap it there, and allow \"Install unknown apps\" when asked."
echo "  B) USB cable: turn on USB debugging on the phone, plug it in, then run"
echo "       adb -d install -r \"$OUT\""
echo "     (-d means the plugged-in phone, not the emulator)."
