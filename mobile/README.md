# KaiSip — mobile app

The iOS + Android version of KaiSip, built with React Native + Expo.
Architecture, roadmap and launch plan: [`docs/mobile/ARCHITECTURE.md`](../docs/mobile/ARCHITECTURE.md).

**Testing on the Android emulator (KaiSip as its own app, auto-updating from GitHub)?**
Follow [`docs/mobile/RUN_ON_ANDROID_EMULATOR.md`](../docs/mobile/RUN_ON_ANDROID_EMULATOR.md)
and use `bash scripts/dev-sync.sh`.

## Run it on your phone (5 minutes, no Mac needed)

1. Install **Node.js 20+** on your computer (https://nodejs.org).
2. Install the free **Expo Go** app on your phone (App Store / Play Store).
3. In a terminal:
   ```bash
   cd mobile
   npm ci             # downloads libraries AND builds the question pack
   npx expo start     # starts the dev server and shows a QR code
   ```
4. Scan the QR code with your phone camera (iPhone) or with Expo Go (Android).
   The app opens on your phone. Edit a file, save, and it reloads instantly.

## Install a test APK on an Android phone (no computer needed)

Test APKs come from expo.dev (EAS Build). On GitHub: **Actions → Phone build
(EAS Build) → Run workflow**, pick the **preview** profile, and run it. When
the build finishes on expo.dev (about 15–25 minutes), open the build's page on
the phone and tap **Install**, then allow **"Install unknown apps"** when
Android asks. The APK from expo.dev installs in the Android emulator too: drag
it onto the emulator window, or run `adb -e install -r <file>.apk`.

It **receives the small updates described below**: it is built from `main`,
stamped with the update "runtime" (the fingerprint of the native parts) and
listens on the **preview** update channel.

**The old GitHub Releases route is retired** (26 Oct 2026): its workflow
signed with Android's public debug key (`docs/mobile/SECURITY_GATES.md`,
Gate 4). Its APKs (`apk-v…`) and the expo.dev ones are signed with
**different keys**, so a phone can keep only one of them. To switch, uninstall
the old one first, which erases the progress on that phone (save a backup file
first: Settings → Your data). Installing a newer expo.dev APK over an older one
keeps your progress.

**Some older APKs get no updates.** An EAS build made before 12 October 2026
(version 1.15.0) has older native parts, so its fingerprint no longer matches.
GitHub Releases APKs `apk-v1.16.0` and `apk-v1.17.0` (and Mac builds made
before 13 October 2026) were stamped with a runtime computed inside the Gradle
build, which came out different from the published one, so they never
updated either. Install a newer APK of the same kind over them (same key, so
progress is kept); from then on updates arrive.

**Small updates arrive by themselves.** After every merge to `main`, GitHub
publishes the new code to the **preview** update channel
(`.github/workflows/eas-update.yml`, needs the `EXPO_TOKEN` repository secret).
The phone looks for it only when the app starts **cold** (not when you come
back to it from the recent-apps list), downloads it in the background, and
uses it the **next** cold start after that. So to pick up an update by
yourself: force-stop the app (or swipe it away from recents) and open it
again, twice if needed. Since 1.19 there is also a manual way: **Settings →
Help and about → Check for updates** checks now, downloads, and offers
"Restart to update"; the "Update … · …" line under the version tells you
(and support) which update the phone is running ("built-in" means it still
runs the code shipped inside the APK). Changes to native parts (a new library
with Android code, the icon, permissions) need a new APK; the "fingerprint"
runtime policy in `app.json` makes sure a phone never gets an update that
doesn't match its APK.

On a Mac with Android Studio there is also `bash scripts/build-apk.sh` (it
builds in a separate folder, so the emulator and `dev-sync.sh` keep running).
Its APK is signed with the debug key (like the retired GitHub Releases
route), not the expo.dev key. It checks the update stamp inside the finished
APK and fails if it doesn't match.

**KaiSip 1.23 is a new app on the phone (the rename from Aurivan).** The app
name, icon and package id (`com.kaisip.app`, was `com.aurivan.app`) are native
parts, so 1.23 needs a **new APK**: no over-the-air update can deliver it, and
the old Aurivan APKs keep their old update "runtime" (`5e26d4b…`) and never
receive KaiSip updates. Android treats a new package id as a different app, so
KaiSip installs **next to** the old Aurivan app and starts empty. To move your
progress: in the old app, **Settings → Your data → Save a backup**; in KaiSip,
**Restore from a backup** on the welcome screen (or later in Settings) and pick
that file. KaiSip reads both the new `kaisip-backup-…` files and the old
`aurivan-backup-…` ones. When the new APK is built, run
`npx expo-updates fingerprint:generate --platform android` and note the hash:
that is the runtime every later KaiSip update is published for (computed in
the development sandbox for 1.23.0: `076db17a21d9685df49fdbf3c3e103000ce3445e`;
trust the value CI or EAS prints). The EAS project, slug and owner in `app.json` are
unchanged on purpose (renaming the slug needs a new EAS project); the first EAS
build of `com.kaisip.app` asks to create new signing credentials.

## Everyday commands (run inside `mobile/`)

| Command | What it does |
|---|---|
| `npm run content` | Rebuild the question pack after `../data/domain*.json` changes |
| `npm run typecheck` | Checks the code for type mistakes |
| `npm test` | Runs the automated tests (grading, spaced review, readiness, content integrity) |
| `npm run check` | Typecheck + tests together — run before every commit |

## Publishing to the stores (when ready)

```bash
npx eas-cli@latest login                                   # free Expo account
npx eas-cli@latest build --profile preview --platform android   # installable test APK
npx eas-cli@latest build --profile production --platform all    # store builds (iOS built in the cloud)
npx eas-cli@latest submit --platform ios                        # upload to App Store Connect
```

Before the first store build: check `ios.bundleIdentifier` and
`android.package` in `app.json` (both `com.kaisip.app` since 1.23; use a domain
you own, reversed, if you prefer another; **these can never change after
launch**), and copy `.env.example` to `.env.local` with your privacy/terms
URLs. The icons in `assets/` are the KaiSip "Kasama" logo, rendered from the
masters in `design-notes/brand-kaisip/` (see `docs/mobile/DESIGN_SYSTEM.md` §12).

## Where things live

- `src/app/` — screens (each file is a page)
- `src/engine/` — study logic (pure, tested)
- `src/store/` — saved progress and settings
- `src/content/` — certifications and question loading
- `scripts/build-content.mjs` — converts `../data` into the app's question pack
