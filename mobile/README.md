# Aurivan — mobile app

The iOS + Android version of Aurivan, built with React Native + Expo.
Architecture, roadmap and launch plan: [`docs/mobile/ARCHITECTURE.md`](../docs/mobile/ARCHITECTURE.md).

**Testing on the Android emulator (Aurivan as its own app, auto-updating from GitHub)?**
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

There are two ways to get a test APK. **Both receive the small updates
described below**, because both are built from `main` with the same native
parts (the same "fingerprint") and listen on the **preview** update channel.

1. **GitHub Releases (simplest).** On GitHub: **Actions → Android test APK →
   Run workflow**. It publishes the APK to the repo's Releases page as
   `apk-v<version>` (for example `apk-v1.17.1`). On the phone, open that
   release while signed in to GitHub, tap the `.apk`, then allow **"Install
   unknown apps"** when Android asks.
2. **expo.dev.** Start a fresh EAS build (profile **preview**, branch `main`,
   base directory `/mobile`, platform Android, Submit unchecked). On the
   phone, open the build's page on expo.dev and tap **Install**.

The two APKs are signed with **different keys**, so a phone can keep only
one of them. To switch, uninstall the other first, which erases the progress
on that phone (save a backup file first: Settings → Your data). Installing a
newer APK of the same kind over an older one keeps your progress.

**An old expo.dev build gets no updates.** An EAS build made before 12 October
2026 (version 1.15.0) has older native parts, so its fingerprint no longer
matches and no update reaches it. Replace it with a new APK from either route.

**Small updates arrive by themselves.** After every merge to `main`, GitHub
publishes the new code to the **preview** update channel
(`.github/workflows/eas-update.yml`, needs the `EXPO_TOKEN` repository secret).
The phone downloads it in the background and uses it the next time the app
opens (close it fully, then reopen). Changes to native parts (a new library
with Android code, the icon, permissions) need a new APK; the "fingerprint"
runtime policy in `app.json` makes sure a phone never gets an update that
doesn't match its APK.

On a Mac with Android Studio there is also `bash scripts/build-apk.sh` (it
builds in a separate folder, so the emulator and `dev-sync.sh` keep running).
Its APK is signed like the GitHub Releases one.

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

Before the first store build: set your own `ios.bundleIdentifier` and
`android.package` in `app.json` (use a domain you own, reversed — e.g.
`com.yourdomain.aurivan`; **these can never change after launch**), replace
the placeholder icons in `assets/` with the Aurivan logo, and copy
`.env.example` to `.env.local` with your privacy/terms URLs.

## Where things live

- `src/app/` — screens (each file is a page)
- `src/engine/` — study logic (pure, tested)
- `src/store/` — saved progress and settings
- `src/content/` — certifications and question loading
- `scripts/build-content.mjs` — converts `../data` into the app's question pack
