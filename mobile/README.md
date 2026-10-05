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
