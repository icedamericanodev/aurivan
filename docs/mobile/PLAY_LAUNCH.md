> **Owner decisions (22 Oct 2026).** (1) Launch order: website, then Google Play (Android), Apple App Store later. (2) **Store builds ship with over-the-air updates OFF** (Option A below, free): store users get changes only through Play releases; test builds keep OTA. Implement in the store-build PR after the pre-beta quality pass. (3) Inbox: certprep.support@gmail.com (display name "KaiSip", 2-step verification) owns the beta sign-up form and tester list. See also `marketing/BETA_PROGRAM.md`.

# KaiSip: Google Play go/no-go and launch plan (22 Oct 2026)

Status words are PASS / FAIL / WARN rather than symbols.

**How I checked the sources.** The egress proxy blocks support.google.com (403 on CONNECT), so I read the Play Console Help pages through search-engine extracts. I fetched developer.android.com pages directly. I read the Expo docs from their GitHub source (`expo/expo/docs/pages/...`).

## (a) Verdict

**NO-GO for production today. GO to start internal and closed testing once B1–B3 are fixed (about 1–2 days of work).** Production access needs the 12-tester, 14-day closed test, so the earliest production date is about 17–28 Nov 2026.

### Blocking items

**B1. Unsigned OTA updates to store users (Gate 1). This refutes your current view.**
- The production profile builds with expo-updates on. Evidence: `/home/user/aurivan/mobile/app.json:75-79` (`checkAutomatically: ON_LOAD`) and `/home/user/aurivan/mobile/eas.json:19-22` (channel `production`). There is no code-signing certificate.
- `eas-update.yml` publishing only to "preview" is a choice written in a workflow file. It is not a technical control. Any holder of the Expo project's publish rights can send code to every store install, in three ways:
  - Run `eas update --channel production`. The `EXPO_TOKEN` in the GitHub `ota` environment can do this; EAS tokens are not limited to one channel.
  - Run `eas channel:edit production --branch preview`. That points store phones at the branch that every merge auto-publishes to.
  - Merge an edit to `eas-update.yml` itself. The workflow triggers on its own path.
- `npx --yes eas-cli@24.14.0` resolves eas-cli's dependencies without a lockfile while `EXPO_TOKEN` is in the environment (`/home/user/aurivan/.github/workflows/eas-update.yml:158,183`).
- Those are exactly Gate 1's threats (a leaked token, a poisoned package, a bad merge), and they reach Play users as much as test phones.
- The signing certificate is compiled into the binary. Builds shipped without it accept unsigned updates for as long as people keep that version installed. Closed testers count as store users.
- Code signing needs the EAS Production plan, which is $199/month: "EAS Update Code Signing is only available to accounts subscribed to the EAS Production or Enterprise plans" (https://docs.expo.dev/eas-update/code-signing/). That is a cost, so it is the owner's decision.
- **Recommendation: Option A, free.** Build the `production` profile with `updates.enabled: false` until Gate 1 is done. Store users then get changes only through Play releases. The app makes no call to Expo, which also makes "No data collected" exactly true. The Settings "Check for updates" row already hides itself when `Updates.isEnabled` is false (`/home/user/aurivan/mobile/src/lib/updates.ts:80-83`).
  - Option B is to pay for the plan and finish Gate 1 before the first AAB.
  - Do not ship with OTA on and unsigned.
  - This decision must be made before the first closed-test AAB.

**B2. In-app privacy policy link is not guaranteed.**
- `/home/user/aurivan/mobile/src/lib/config.ts:23,25` defaults the privacy and terms links to `''`, which hides both rows in Settings (`/home/user/aurivan/mobile/src/app/settings.tsx:516-521`).
- The links only appear if `EXPO_PUBLIC_PRIVACY_URL` and `EXPO_PUBLIC_TERMS_URL` are set in the EAS **production** environment. I cannot see that from the repo. Google's User Data policy requires the privacy policy link inside the app as well as in the Console.
- Live pages return 200: https://kaisip.com/privacy, /terms, /support.

**B3. Store graphics.**
- No 1024×500 feature graphic exists anywhere in the repo.
- The `npm run shots` screenshots are 786×1704, a 2.17 ratio. Play rejects any screenshot whose long side is more than twice its short side. The screenshots are also gitignored (`/home/user/aurivan/mobile/.gitignore:48`).

**B4. Account and production access (process only).**
- Identity, contact and device verification must be finished.
- Production access needs at least 12 testers opted in for 14 consecutive days, then an application.

**B5. The Data safety answer depends on B1** (see section d).

### Review table

| Item | Status | Evidence | Fix |
|---|---|---|---|
| Target API | PASS | Play requires API 36 for new apps and updates from 31 Aug 2026 (https://developer.android.com/google/play/requirements/target-sdk, fetched). SDK 57 / RN 0.86.3 targets 36: `/home/user/aurivan/mobile/node_modules/react-native/gradle/libs.versions.toml:4`; Expo SDK table shows 57 → compile/target 36 (https://docs.expo.dev/versions/latest/) | None |
| 16 KB page size | PASS | Required for apps targeting 35+; updates blocked from 1 Feb 2027 (https://developer.android.com/guide/practices/page-sizes). RN 0.86 supports it | None |
| Package and version | PASS | `com.kaisip.app`, version 1.38.0 (`app.json:7,26`); `appVersionSource: remote` and `autoIncrement` (`eas.json:4,21`) | None |
| OTA security (Gate 1) | FAIL | See B1 | Option A or B |
| Cloud flag OFF | PASS, one gap | `/home/user/aurivan/mobile/src/cloud/flag.ts:19`: `CLOUD = EXPO_PUBLIC_AURIVAN_CLOUD === '1'`, inlined at build time. The OFF bundle guard (`scripts/check_off_bundle.sh`) proves no Supabase, sign-in, SecureStore or REST code ships. Cloud routes redirect to Today (`src/app/(cloud)/_layout.tsx`). Gap: nothing stops `EXPO_PUBLIC_AURIVAN_CLOUD=1` in the EAS **production** environment. `eas-update.yml` checks only the preview environment, and `configGuard.ts` is not wired into any build | Owner: run `eas env:list --environment production`. Engineer: build-time guard (c4) |
| What a production build contains | Info | Every study feature, offline, no account. No analytics, crash reporting or ads (no Sentry, PostHog or RevenueCat in `/home/user/aurivan/mobile/package.json`). Network use is only the expo-updates check (`app.json:75`). The app opens browser links only when the learner taps one (`examGuide.tsx:61`, `settings.tsx:517`), and support uses mailto: drafts (`src/lib/support.ts`). Notifications are local only; no push-token call exists | None |
| Android permissions | WARN | Merged from libraries: POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, VIBRATE, INTERNET, ACCESS_NETWORK_STATE. Storage and SYSTEM_ALERT_WINDOW are blocked (`app.json:35-39`). expo-notifications pulls in `firebase-messaging:25.0.1` (`node_modules/expo-notifications/android/build.gradle:43`), which may merge `com.google.android.gms.permission.AD_ID`. Mobile 1.47 (home-screen widgets): WorkManager 2.8.1, used by `react-native-android-widget`, also merges WAKE_LOCK and an untyped FOREGROUND_SERVICE (no typed `FOREGROUND_SERVICE_*`, so no Play foreground-service declaration is expected). The configuration activity for the Readiness and Exam countdown widgets is exported (Android requires it). Confirm all of this in the first 1.47 AAB/APK manifest (`aapt dump permissions`) | Block AD_ID (c3), or check the AAB manifest before answering the Advertising ID question |
| Notification permission asked in context | PASS | `src/lib/reminders.ts:66-74`, called only from the first-set screen and Settings (`firstSet.tsx:98`, `settings.tsx:244`) | None |
| Privacy policy | PASS (content), FAIL (in-app link) | `privacy.html` §6 covers the mobile app accurately, including the Expo install code. In-app link: B2 | c2; c8 after Option A |
| Account deletion | N/A | No accounts in the OFF build | Required at Phase 9 |
| Trademarks | PASS, minor flags | Title has no marks; icon is the Kasama K with no text (`/home/user/aurivan/assets/icon-512.png`). In-app disclaimer: `src/components/help.tsx:37`, `src/content/certifications.ts:22`, FAQ `src/content/support/index.ts:559`. Listing notice: `STORE_LISTING.md:93` | See section 6 below |
| No external payments | PASS | Ko-fi only on the website (privacy.html table; terms) | None |
| No pass guarantee | PASS | `STORE_LISTING.md:90`; terms §4 | None |
| Play icon 512 | WARN | `/home/user/aurivan/assets/icon-512.png` is 512×512 but RGB (24-bit). The spec is a 32-bit PNG, full square, no shadow, at most 1 MB (https://developer.android.com/distribute/google-play/resources/icon-design-specifications, fetched) | Re-save as RGBA (c9) |
| Feature graphic | FAIL | Missing | Make it (c9) |
| Phone screenshots | FAIL | `/home/user/aurivan/mobile/scripts/screenshots/shoot.mjs:15` uses a 393×852 viewport at 2× | Add a 1080×1920 store mode (c6) |
| Gate 4 debug-key APK | PASS (retired 26 Oct 2026) | The "Android test APK" workflow is retired (moved to `archive/github-workflows/android-apk.yml`, where GitHub does not run it). Test APKs now come from the "Phone build (EAS Build)" workflow with the **preview** profile. The APK from expo.dev installs in the Android emulator too | Done (c10) |
| Title character count | WARN | `STORE_LISTING.md:121` says 27/30; the real count is 26 | Doc fix |

## Verified rules (Q1–Q8)

**1. New personal accounts (created after 13 Nov 2023)**
- **Closed test.** At least 12 testers opted in for 14 consecutive days. Testers who leave before day 14 don't count, and a tester who leaves and rejoins restarts the 14 days.
- **Applying.** Then Dashboard → Apply for production. The form asks about the closed test, the app and production readiness. Review usually takes 7 days or less.
- **Too few testers.** Google can require more testing if fewer than 12 testers were opted in or engagement was low. Source: https://support.google.com/googleplay/android-developer/answer/14151465
- **Identity.** A government ID is needed if the payments profile isn't already verified. The legal name and address come from the payments profile (https://support.google.com/googleplay/android-developer/answer/10841920).
- **Contact details.** Email and phone are verified by one-time code (https://support.google.com/googleplay/android-developer/answer/13628312).
- **Device check.** Use the Play Console mobile app on a real, non-rooted phone running Android 10 or later (https://support.google.com/googleplay/android-developer/answer/14316361).
- **D-U-N-S.** Organisation accounts only; you don't need it.
- **What the listing shows.** Personal accounts show the legal name, country and developer email. The full address is shown only if you monetise (https://support.google.com/googleplay/android-developer/answer/13634081).
- **Android developer verification (sideloading).** Enforced from 30 Sep 2026 in BR/ID/SG/TH, globally in 2027. Play apps are registered automatically (https://developer.android.com/developer-verification/guides). Later, register the EAS key that signs preview APKs too, so sideloaded test APKs keep installing.

**2. Target API.** Covered in the table: API 36 is required and SDK 57 targets 36 (sources above).

**3. Data safety.** See section (d). Definitions: "collect" means sending data off the device. Data used only on the device, data sent through a user-initiated action the user expects (sending an email, sharing a document), and transfers to service providers are not "sharing". Pseudonymous IDs must be disclosed (https://support.google.com/googleplay/android-developer/answer/10787469).

**4. Content rating, target audience and other declarations.** See section (d). Target audience: https://support.google.com/googleplay/android-developer/answer/9867159. Educational category: https://support.google.com/googleplay/android-developer/answer/6159966.

**5. Graphics specs** (https://support.google.com/googleplay/android-developer/answer/9866151)
- Icon: 512×512, 32-bit PNG, at most 1 MB.
- Feature graphic: 1024×500, JPEG or 24-bit PNG, no alpha.
- Screenshots: at least 2 (upload 4–8). JPEG or 24-bit PNG, each side 320–3840 px, long side at most twice the short side. Use 1080×1920.

What exists in the repo:

| Asset | Exists? |
|---|---|
| Icon | Yes: `/home/user/aurivan/assets/icon-512.png` (needs alpha). Master: `/home/user/aurivan/design-notes/brand-kaisip/png/icon-1024.png` |
| Lockups for the feature graphic | Yes: `/home/user/aurivan/design-notes/brand-kaisip/png/lockup_light.png`, `lockup_dark.png` |
| Feature graphic | No, must be made |
| Store-size screenshots | No, must be made |

**6. Trademark**
- The title "KaiSip: Cyber & IT Audit Prep" is safe (re-checked 29 Oct 2026 when it replaced "KaiSip: IT Audit Exam Prep"). "CISA®" in the short and full descriptions is descriptive use, with the notice at `STORE_LISTING.md:93`.
- Flags:
  - (i) `STORE_LISTING.md:85` "No data collected" is true only with Option A.
  - (ii) A/B variant B (`:193`) starts the short description with "CISA® exam practice…", which reads like a product name. Keep variant A.
  - (iii) Add "ISACA®" in the notice line.
  - (iv) Keep "CISA" off the feature graphic and out of screenshot captions. The captions at `:147-152` are clean.
  - (v) Your public developer name must not contain CISA or ISACA.
  - (vi) "CISA" is also a US government agency. Answer the Government apps question "No"; the ISACA disclaimer removes the ambiguity.

**7. Signing and submitting**
- Accept the default Play App Signing (a Google-generated app-signing key). The EAS keystore for `com.kaisip.app`, the same one that signs the preview APKs, becomes the upload key.
- Consequence: a tester who has the EAS preview APK cannot update it to the Play version (different signature). They must save a backup, uninstall, install from Play, then restore.
- Current Expo docs say `eas submit` can create the first release on the internal track once a service-account key is set. Older Expo guidance said the first upload must be manual (https://docs.expo.dev/submit/android/, https://github.com/expo/fyi/blob/main/first-android-submission.md).
- **For a beginner: upload the first AAB by hand** in Play Console. Add the service account afterwards for later releases (https://expo.fyi/creating-google-service-account).

**8. The production build**
- `eas build --platform android --profile production` gives an AAB (AAB is the default; only `buildType: apk` gives an APK).
- With `appVersionSource: remote` and `autoIncrement`, EAS stores the versionCode and adds 1 per production build. It starts from 1 when nothing is set (https://docs.expo.dev/build-reference/app-versions/). versionName = `expo.version` (1.38.0).
- The channel is "production". The runtime version comes from the fingerprint, which matches the preview builds because they use the same app.json.
- On whether Gate 1 can wait: refuted, see B1. It can wait only if the store build has OTA disabled (Option A).

## (b) Owner checklist (ordered by lead time)

**Today (22 Oct)**

1. **Finish account verification.**
   - Play Console → Home: finish any "Verify your identity" task (upload ID if asked).
   - Verify the developer email and contact phone with the one-time codes.
   - Install the "Google Play Console" app on an Android 10+ phone, sign in, and complete device verification.
   - Phone verification unlocks only after identity and device are done.
   - Set the public developer name with no CISA/ISACA. The public email is certprep.support@gmail.com.
2. **Decide B1.** Reply "Option A" (free, recommended) or "Option B" (pay $199/month, then do SECURITY_GATES Gate 1 steps 2–5 before any store build).
3. **Recruit 15–20 testers now** (buffer over 12).
   - Use the **Play Console email list**, not a Google Group (owner decision; see `marketing/BETA_PROGRAM.md` §1). A group needs each tester to accept an invite, and missed invites quietly drop the count below 12.
   - Collect the Gmail address each tester uses in the Play Store on their Android phone (the sign-up Form asks for it).
   - Tell anyone who has the preview APK: Settings → Your data → Save a backup before switching.
4. **Create the app.**
   - Play Console → All apps → Create app.
   - App name `KaiSip: Cyber & IT Audit Prep` (29/30; chosen 29 Oct 2026, see STORE_LISTING.md §2); Default language English (United States); App; **Free**; tick both declarations; Create app.
   - Free cannot later become paid, but in-app subscriptions remain possible.
5. **Check the EAS production variables.** In `/home/user/aurivan/mobile`:
   - Run `npx eas-cli env:list --environment production`. Confirm there is no `EXPO_PUBLIC_AURIVAN_*` variable.
   - If Claude does not add code defaults (c2), run:
     - `npx eas-cli env:create --environment production --name EXPO_PUBLIC_PRIVACY_URL --value https://kaisip.com/privacy --visibility plaintext`
     - the same for `EXPO_PUBLIC_TERMS_URL` with `https://kaisip.com/terms`.

**Days 1–2, after Claude's PR (section c) merges**

6. **Build.** GitHub → Actions → "Phone build (EAS Build)" → Run workflow → profile `production` → Run (`.github/workflows/eas-build.yml`; it uses the existing Android keystore on expo.dev). Or, on a computer: in `mobile/`, run `npx eas-cli build --platform android --profile production` and say yes to the existing keystore. When the build finishes, expo.dev → the build page → download the `.aab`.
7. **First upload, by hand.**
   - Play Console → Test and release → Testing → Internal testing → Testers tab: create an email list with yourself → Save.
   - Releases → Create new release. App integrity / Play App Signing: choose "Use Google-generated key" (the default).
   - Upload the `.aab`. Release name auto-fills (2 (1.38.0)). Notes: "First internal build." Next → Save and publish / Start rollout.
   - Install through the internal "Join on Android" link. Smoke test:
     - first launch offline
     - the reminder prompt appears only when you turn reminders on
     - Settings shows "Privacy policy" and "Terms of use"
     - no "Check for updates" row (with Option A)
8. **App content.** Dashboard → "Set up your app" → each task (or Policy and programs → App content). Paste the answers in section (d): Privacy policy, App access, Ads, Content rating, Target audience, Data safety, Government apps, Financial features, Health, News, Advertising ID.
9. **Store listing.**
   - Grow users → Store presence → Main store listing: title, short and full description from `docs/mobile/STORE_LISTING.md` §2 (with the edits in c7), icon 512, feature graphic, 4–8 phone screenshots at 1080×1920. Save.
   - Store settings: Category = Education; tags such as Education/Exam prep; email certprep.support@gmail.com; website https://kaisip.com.
10. **Closed test.** Starting this step starts the clock.
    - Test and release → Testing → Closed testing → Manage track (Alpha) → Countries/regions: add all countries.
    - Testers: use the Play Console email list.
      - Copy the Android testers' emails from the sign-up Sheet. Add a helper tab named "Android list" and put this formula in A1 (change the column letters if your Sheet differs: B = email, C = phone type):
        `=TEXTJOIN(", ", TRUE, FILTER('Form Responses 1'!B2:B, 'Form Responses 1'!C2:C="Android"))`
      - Copy cell A1 (the comma-separated emails).
      - Play Console → Test and release → Testing → Closed testing → Testers → Create email list → name it (for example "KaiSip beta") → paste the emails → Save. Tick the list for the track and Save.
      - Feedback email: certprep.support@gmail.com.
      - New sign-ups later: paste the new emails into the same list and Save.
      - Alternative (not the plan): a Google Group added under "Google Groups". Use it only if the email list ever stops being enough.
    - Create new release → "Add from library" → choose the internal build → Save.
    - Publishing overview → Send changes for review. New accounts can wait several days.
11. **When approved,** copy the opt-in URL from the Testers tab and send it by email to everyone on the list, with all the addresses in **BCC** (never To or CC, so testers don't see each other's emails). Each tester opens it while signed in with the same Google account, taps "Become a tester", then installs from the Play link.
    - Check the opted-in count and make sure 12 or more stay opted in.
    - Tell testers not to leave the program for 14 days.

**Days 3–17 (the 14-day clock)**

12. **During the test:**
    - Ask testers to open the app on several days and send feedback ("Report a problem" or email).
    - Keep a dated log: feedback received, what you changed.
    - Ship at least one update. Build again, upload to closed testing, then Send for review; versionCode goes up automatically.

**About day 17–19**

13. **Apply.** Dashboard → "Apply for production". Answer from your log:
    - how you recruited testers, and how engaged they were
    - a feedback summary and the changes you made
    - audience: CISA candidates and IT auditors
    - expected installs, and why the app is ready

    Review takes 7 days or less.

**After access is granted**

14. **Go live.** Test and release → Production → Countries/regions: add them → Create new release → Add from library: the latest closed-test build → release notes from `STORE_LISTING.md:101` → Send for review. Keep the closed track running.
15. **Optional, for later releases:** set up a service account so `eas submit` can upload builds.
    - Google Cloud Console: create a project → enable "Google Play Android Developer API" → IAM → Service Accounts → Create → Keys → Add key → JSON → download. Keep it in your password manager and never commit it.
    - Play Console → Users and permissions → Invite new users → paste the service-account email → App permissions → KaiSip → tick release-to-testing-tracks, manage testing tracks, release to production, view app information → Invite.
    - expo.dev → Credentials → Android → com.kaisip.app → Service credentials → Add Google service account key → upload the JSON.
    - Then each release is one click: GitHub → Actions → "Phone build (EAS Build)" → profile `production`, tick "Upload to Google Play" → Run. The build lands in Play Console's internal testing track as a draft; open Play Console and send it for review (or promote it to the closed or production track).
16. **After launch:** tell Claude to set the store link and update `STORE_LISTING.md` with the live URLs.

## (c) Repo changes before the first AAB

1. **Option A: `/home/user/aurivan/mobile/app.config.js` (new).**
   - Returns `{...config, updates: {...config.updates, enabled: process.env.EAS_BUILD_PROFILE !== 'production'}}`. Optionally also call `assertCloudConfig(process.env)` from `src/cloud/configGuard.ts` to cover c4.
   - Add a rule to `/home/user/aurivan/mobile/scripts/check-release-config.mjs`: production must resolve to `updates.enabled === false` until Gate 1. Add a case to `src/__tests__/release-config.test.ts`.
   - Run `npx expo-updates fingerprint:generate --platform android` before and after. The preview fingerprint must not change, or preview APKs need a rebuild.
   - Option B instead: SECURITY_GATES Gate 1 steps (codesigning config in `app.json`, `mobile/certs/`, new signing flow in `eas-update.yml`).
2. **`/home/user/aurivan/mobile/src/lib/config.ts:23,25`.** Default to `https://kaisip.com/privacy` and `https://kaisip.com/terms` when the variable is empty, mirroring `DEFAULT_SUPPORT_EMAIL`, so the in-app privacy link can never disappear. JS-only change. Update the tests that expect an empty value to hide the rows.
3. **`/home/user/aurivan/mobile/app.json:35`.** Add `"com.google.android.gms.permission.AD_ID"` to `blockedPermissions`, so the "Advertising ID: No" answer stays true. This changes the native fingerprint, so do it in the same PR as c1 and rebuild preview once.
4. **Cloud-flag build guard.** If not done in c1, add an `eas-build-pre-install` script in `/home/user/aurivan/mobile/package.json`. It fails a production build when `EXPO_PUBLIC_AURIVAN_CLOUD` is set without `AURIVAN_CLOUD_GO_LIVE_ACK=yes`.
5. **`/home/user/aurivan/mobile/eas.json` `submit.production`.** Set `{"android": {"track": "internal", "releaseStatus": "draft"}}` so `eas submit` can never release to the public by itself. eas.json is a fingerprint input, so bundle this with c1/c3.
6. **Store screenshots.** Add `SHOTS=store` to `/home/user/aurivan/mobile/scripts/screenshots/run.sh` and `shoot.mjs`: viewport 360×640, `deviceScaleFactor: 3` (1080×1920), light theme, the 6 screens in `STORE_LISTING.md:145-152`, saved as 24-bit PNG with no question count visible.
7. **`/home/user/aurivan/docs/mobile/STORE_LISTING.md`.**
   - Title count 29/30 (`KaiSip: Cyber & IT Audit Prep`).
   - Add the Play Data safety and IARC answers from section (d).
   - Keep the `:85` "No data collected" line only under Option A; otherwise change it to "No account, no ads, no analytics. Your progress stays on your phone."
   - Retire short-description variant B.
   - Notice: "CISA® and ISACA® are registered trademarks of ISACA…".
8. **`/home/user/aurivan/privacy.html` §6 "App updates" (with Option A).** Say the Google Play version gets updates only through Google Play and does not contact Expo, and that test versions do. Update "Last updated". This is a user-visible web change, so per CLAUDE.md bump `APP_VERSION` and add What's New.
9. **Graphics, via brand-logo-designer.** `design-notes/brand-kaisip/store/play-icon-512.png` (RGBA, from `png/icon-1024.png`) and `design-notes/brand-kaisip/store/feature-graphic-1024x500.png` (24-bit, no alpha, lockup on the Grove green, no CISA/ISACA text).
10. **Done (26 Oct 2026): the "Android test APK" workflow is retired** (Gate 4; now `archive/github-workflows/android-apk.yml`, which GitHub does not run). Test APKs come from the "Phone build (EAS Build)" workflow with the **preview** profile. The APK from expo.dev installs in the Android emulator too: drag it onto the emulator window, or run `adb -e install -r <file>.apk`.
11. **`/home/user/aurivan/docs/mobile/SECURITY_GATES.md` and `ARCHITECTURE.md` §11.** Record the B1 decision.
12. **After production goes live,** not before: set `/home/user/aurivan/mobile/src/content/storeLinks.ts` `STORE_LINK = 'https://play.google.com/store/apps/details?id=com.kaisip.app'`.

## (d) Exact answers

### Data safety (Option A: OTA off in store builds)

- "Does your app collect or share any of the required user data types?" → **No**. The remaining questions are skipped, and the listing shows "No data collected / No data shared".
- Why this is accurate:
  - With Option A there is no network call.
  - mailto: support goes through the user's own email app, as a user-initiated action.
  - The backup file and share cards go through the share sheet, also user-initiated.
  - Reminders are local; no push token is ever requested.
  - Android Auto Backup is the system's backup, not collection by the app.
  - The first name stays on the device.
  - Home-screen widgets (mobile 1.47) read a small snapshot the app writes on the device (`aurivan.widget.v1`) and draw on the device. No widget data is sent anywhere, so these answers don't change.

### Data safety (Option B, OTA kept with Expo)

The check sends a random per-install ID to Expo, which is like the "Firebase installation ID" example.

| Question | Answer |
|---|---|
| Collect or share required data types? | Yes |
| All data encrypted in transit? | Yes |
| Account creation methods | "My app does not allow users to create an account" |
| Way to request deletion? | No |
| Data type | Device or other IDs only |
| Collected / Shared | Collected: Yes. Shared: No (Expo is a service provider) |
| Processed ephemerally? | No |
| Required or optional | Required |
| Purpose | App functionality |
| Everything else | Not collected |

The listing then shows "Device or other IDs collected", so fix `STORE_LISTING.md:85`.

### Other App content answers

| Declaration | Answer |
|---|---|
| Privacy policy | https://kaisip.com/privacy |
| App access | "All functionality in my app is available without any access restrictions" |
| Ads | "No, my app does not contain ads" |
| Advertising ID | "No" (after c3) |
| Government apps | No |
| Financial features | "My app doesn't provide any financial features" |
| Health apps | "My app does not have any health features" |
| News app | No |
| Target audience | **18 and over** only. "Could your store listing unintentionally appeal to children?" → No (if asked). Restrict Minor Access: leave off |

### Content rating (IARC)

- Email: certprep.support@gmail.com.
- Category: **Reference, News, or Educational**. The mini-games are exam drills, not the app's main purpose. If the reviewer reclassifies it as a game, the answers below don't change.
- Answer **No** to every question:
  - violence, blood or gore
  - fear or horror
  - sexual content or nudity
  - profanity or crude humour
  - drugs, alcohol or tobacco
  - real or simulated gambling
  - hate or discrimination
- Miscellaneous, all **No**:
  - users can interact or exchange content
  - shares the user's location with other users
  - allows purchases of digital goods
  - unrestricted internet access (web browser or search engine)
  - NFTs or digital assets (if asked)
- Expected result: ESRB Everyone, PEGI 3, USK 0, ClassInd L, Play "Everyone".
- Redo the questionnaire when the feedback board (user-generated content) ships at Phase 9.

## Sources
- [App testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Target API level (developer.android.com, fetched)](https://developer.android.com/google/play/requirements/target-sdk) and [Play Help](https://support.google.com/googleplay/android-developer/answer/11926878)
- [16 KB page sizes (fetched)](https://developer.android.com/guide/practices/page-sizes)
- [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Preview assets](https://support.google.com/googleplay/android-developer/answer/9866151) and [icon spec (fetched)](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)
- [Target audience](https://support.google.com/googleplay/android-developer/answer/9867159) and [Reference, News, or Educational](https://support.google.com/googleplay/android-developer/answer/6159966)
- [Identity verification](https://support.google.com/googleplay/android-developer/answer/10841920), [device verification](https://support.google.com/googleplay/android-developer/answer/14316361), [required account info](https://support.google.com/googleplay/android-developer/answer/13628312), [what is shown publicly](https://support.google.com/googleplay/android-developer/answer/13634081)
- [Android developer verification](https://developer.android.com/developer-verification/guides)
- Expo: [submit to Google Play](https://docs.expo.dev/submit/android/), [first submission (older guidance)](https://github.com/expo/fyi/blob/main/first-android-submission.md), [code signing (paid plans only)](https://docs.expo.dev/eas-update/code-signing/), [app versions](https://docs.expo.dev/build-reference/app-versions/), [service account key](https://expo.fyi/creating-google-service-account), [pricing](https://expo.dev/pricing), [SDK version table](https://docs.expo.dev/versions/latest/)
