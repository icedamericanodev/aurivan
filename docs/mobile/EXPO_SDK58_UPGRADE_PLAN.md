# KaiSip phone app: upgrade plan, Expo SDK 57 → SDK 58

## Status (30 Oct 2026)

**PR 1 of 2 (this PR, mobile 1.54): done in code, not yet on a phone.**

What it did:
- Moved to Expo SDK 58: expo 58.0.21, React Native 0.88.1, React 19.3.0,
  every expo-* package and the React Native libraries at Expo's SDK 58
  versions, `react-native-worklets` declared directly, and
  `react-native-android-widget` 0.26.0.
- Overrides: kept `zod` 4.6.6 and `node-forge` 1.4.2; removed `xcode → uuid`
  (`docs/mobile/DEPENDENCY_AUDIT.md`).
- Fixed what the trial found: `await file.write()` in the backup and the
  account-data download (each with a test that fails without it), and
  `InteractionManager` replaced by `requestIdleCallback` in the board
  composer (with a test).
- **Found and fixed one more router 58 problem the trial didn't show:**
  screens that only redirect (`app/widget.tsx`, where every home-screen
  widget tap lands, and `app/play.tsx`) navigated from a mount effect. On
  router 58 that throws on a cold start ("the imperative router is
  unavailable before the first render has finished") and, on a warm start,
  `canDismiss()` still answers false, so a second tab navigator was stacked.
  They now run on first focus (`src/lib/useOnceOnFocus.ts`).
- The QA-120 router tests no longer use expo-router's private `StackRouter`:
  they run the real router through `expo-router/testing-library`
  (`src/__tests__/qa-120-router.test.tsx`), plus new real-router tests for
  widget taps (`src/__tests__/widgets-router58.test.tsx`). This adds
  `@testing-library/react-native` and `test-renderer` (dev only).
- Widget library 0.26: our layouts already draw at whatever size they are
  given, so no layout changed. Added: the new size file
  (`rnwidget.measured_sizes.xml`) is kept out of Android backups, and a test
  that a `WIDGET_RESIZED` redraw keeps today's reveal and saves nothing.
- Types: the one-line legacy-types condition in `tsconfig.json` (125 errors
  → 0 after the `InteractionManager` fix).
- `expo.version` 1.53.0 → 1.54.0, with a What's new line.

Left to do:
1. **PR 2: retype the refs** (`useRef<View>` etc. → `ViewInstance`,
   `ScrollViewInstance`, `TextInputInstance`, about 110 places) and remove
   `react-native-legacy-deep-imports` from `tsconfig.json`. Must land before
   React Native 0.89 (Expo SDK 59).
2. **Android development build** (`eas build --profile development`, needs
   the maintainer's go-ahead). First suspects if it fails: the widget library,
   view-shot 6.
3. **Phone walk-through** (needs the build): all 8 widgets (add, resize, the
   two that ask first, a first tap right after placing or resizing, which may
   only redraw), widget taps with the app closed and open, back and
   `dismissTo` flows (Readiness → Learn, `kaisip://play`), deep links
   (`kaisip://whats-next`, `kaisip://help?open=idea`), backup export and
   restore and the share sheet, reminders, the share card, Reduce Motion and
   tab-switch speed. The board composer is a cloud screen (off in store
   builds); check it only on a cloud test build.
4. Check the merged Android manifest of that build (WorkManager 2.12.0).
5. Then preview APKs to testers (SDK 57 APKs stop getting updates once this
   merges), then production.

---

*The plan as written before the upgrade (unchanged below).*

Date: 30 Oct 2026. Scope: plan only. No repo files were changed.
Everything below was checked with `npm view`, the published npm packages, the
Expo SDK 58 release post (expo.dev/changelog/sdk-58), the expo-router
CHANGELOG, and a **trial upgrade in a scratch copy** of `mobile/`. That copy was
installed with the SDK 58 versions, then typechecked, tested, linted,
exported and audited.

---

## Short summary (read this first)

- **Recommendation: upgrade now, as its own PR, Android development build first.**
  SDK 58 has been stable for a month (58.0.0 on 29 Sep; now 58.0.21, the npm
  `latest`). The security goal is proven: in the trial build,
  `decode-uri-component` and `query-string` are in **0 modules** of the Android
  app bundle.
- **Effort: medium.** That means about half a day of code changes, plus new
  phone builds and a careful phone walk-through. What drives the effort:
  1. the home-screen widget library must move to 0.26.0;
  2. three small code fixes (one silent backup bug, one crash, one test);
  3. about 110 type errors from stricter React Native types (a one-line opt-out
     exists for now);
  4. new EAS builds and testing all 8 widgets on a real phone.
- **Trial results on SDK 58, before any fixes:** lint clean. Android export OK
  (size budget 10.30 of 14 MB). `npm audit`: 0 high, 0 moderate, 14 low (all
  the known `deepmerge` chain). Jest: 6,010 of 6,032 tests pass. The 10 real
  failures come from 2 causes. 125 type errors, 110 of them one mechanical
  pattern.
- **Top risks:** (1) the widget library: 0.24 very likely won't compile on SDK
  58's Android tools, and 0.26.0 is one day old; (2) a **silent bug**: backups
  could be shared before the file is fully written, and the type checker won't
  catch it; (3) a crash in the feedback-board composer (`InteractionManager`
  was removed); (4) navigation behaviour changes in expo-router 58.
- **Blockers:** none. One correction to the brief: the **zod override must
  stay**, because @expo/cli 58 still uses zod 3. The `uuid` override can go;
  `node-forge` is optional.

---

## 1. Is SDK 58 released and stable?

Yes. `npm view expo dist-tags` → `latest: 58.0.21`, `sdk-57: 57.0.31`.

| | |
|---|---|
| 58.0.0 published | 29 Sep 2026 (after 9 previews) |
| Patches since | 21 (58.0.21 on 28 Oct 2026) |
| React Native | **0.88.1** (from 0.86.3) |
| React / react-dom | **19.3.0** (from 19.2.3) |
| Node.js | 22.13+ or 24.3+ (no odd versions). CI uses `22` and this machine has 22.22, so this is fine |
| Android toolchain (from RN 0.88.1) | Android Gradle Plugin 9.2.1, compileSdk 37, targetSdk 36, minSdk 24 |
| Expo Go | The new Expo Go supports only SDK 58. This doesn't affect us: KaiSip already needs a development build because of the widgets and view-shot |

SDK 58 versions of the packages we use (from `expo@58.0.21/bundledNativeModules.json`):

| Package | Now | SDK 58 |
|---|---|---|
| expo-router | ~57.0.24 | ~58.0.28 |
| expo-notifications | ~57.0.21 | **~58.1.7** |
| expo-updates | ~57.0.24 | ~58.0.19 |
| expo-sharing | ~57.0.22 | ~58.0.21 |
| expo-file-system | ~57.0.7 | ~58.0.13 |
| other expo-* (build-properties, constants, dev-client, document-picker, font, haptics, linking, splash-screen, status-bar, system-ui) | ~57.x | ~58.x |
| react-native-reanimated | 4.7.1 | 4.7.1 (no change; its peer range already covers RN 0.86 to 0.88) |
| react-native-worklets | 0.13.0 (only as a hidden peer) | 0.13.0, **declare it directly** (expo-doctor flags it) |
| react-native-svg | 15.15.4 | 15.16.0 |
| react-native-safe-area-context | ~5.7.0 | ~5.10.1 |
| react-native-screens | ~4.26.0 | ~4.30.0 |
| react-native-view-shot | 5.1.0 | **6.1.1 (major)** |
| react-native-web | ~0.21.0 | ~0.21.4 |
| @react-native-async-storage/async-storage | 2.2.0 | 2.2.0 (no change, so saved progress is untouched) |
| jest-expo / eslint-config-expo | ~57 | ~58.0.13 / ~58.0.4 |
| @types/react | ~19.2.2 | ~19.3.0 (expo-doctor) |
| react-test-renderer | 19.2.3 | 19.3.0 (match React; not in Expo's list, so set by hand) |

## 2. The security fixes and the three overrides

| Question | Answer | Evidence |
|---|---|---|
| Does expo-router 58 drop query-string / decode-uri-component? | **Yes.** | `npm view expo-router@58.0.28 dependencies` has no `query-string` (57.0.24 had `^7.1.3`). Its `build/` has no `require` of either. In the trial lockfile neither package exists. The Android source map lists 0 modules for both (2,123 modules in total). |
| Can the zod override go? | **No, keep it.** | `@expo/cli@58.1.17` (the newest release) still declares `"zod": "^3.25.76"`. Trial without overrides: zod 3.25.76 comes back and `npm audit` shows **3 high** (GHSA-mrhx-c7xc-m3w5). With the override: 0 high. |
| node-forge 1.4.2 override? | **Optional.** You can keep it. | @expo/cli 58 and @expo/code-signing-certificates 0.0.7 still ask for `^1.4.0`. 1.4.2 is npm `latest`, so a fresh install picks it anyway. The override only guards against an old lockfile entry (1.4.0 or 1.4.1). It costs nothing to keep. |
| xcode → uuid 11.1.1 override? | **Remove it** (it no longer does anything). | `@expo/config-plugins@58.0.11` uses `xcode ^4.0.0`, and xcode 4.0.0 has no `uuid` dependency. The trial tree has no npm `uuid` at all. |

`npm audit` on the trial tree (with zod and node-forge overrides): **0 critical, 0 high, 0 moderate, 14 low**. All 14 come from `deepmerge` 4.3.1 (no fix exists), through
@expo/config and jest-config. braces, sprintf-js, uuid and decode-uri-component
no longer appear. braces 3.0.3 is still installed (Metro, Jest), but the audit
no longer flags it.

## 3. Breaking changes that hit THIS codebase

### Must fix (found by the trial run)

1. **`File.write()` is now async** (expo-file-system 58: returns `Promise<void>`).
   - `src/lib/backup.ts:196` and `src/lib/account.ts:419` call `file.write(text)`
     and then immediately open the share sheet. Without `await`, the share could
     start before the file is fully written, so a learner could save an empty
     or partial backup.
   - **The type checker does NOT catch this** (an un-awaited promise compiles fine).
   - Fix: `await file.write(text);`. Both functions are already `async`. Prefer
     this over `writeSync`, because 24 test files mock `File` with a `write()`
     method only, and `await` works with them unchanged.
2. **`InteractionManager` is removed** (RN 0.88).
   - In development it throws, and in a release build it is `undefined`, so the
     call crashes.
   - Used once: `warmLeakGuard` in `src/lib/board.ts:367`, called by the
     feedback-board composer `src/app/(cloud)/board/new.tsx:94`. Those cloud
     screens are off in store builds, but test builds and the tests reach them.
   - Causes 7 failing tests (board-screens, board-review-screens) and 1 type error.
   - Fix: use `requestIdleCallback` / `cancelIdleCallback` (React Native's
     suggested replacement; typed in RN 0.88 globals), with a `setTimeout`
     fallback, and keep the same `{ cancel }` return shape.
3. **`src/__tests__/qa-120.test.tsx`** (3 failing tests). It drives expo-router's
   internal `StackRouter` from `expo-router/build/layouts/StackClient`.
   - In router 58, `getInitialState` was removed and `getStateForAction` now
     returns `{ state, affectedRouteKey }`.
   - This is a test-only rewrite. These tests guard the `/play` → Drills
     redirect and `dismissTo` behaviour, so re-check those paths on a phone too
     (router 58.0.26 changed `dismissTo` in nested stacks).
4. **Stricter React Native types** (RN 0.87+ "Strict API" is now the default).
   This gives 125 type errors:
   - About 110 are one pattern: refs typed as `useRef<View>` / `useRef<ScrollView>`
     / `useRef<TextInput>`. They now need `ViewInstance` / `ScrollViewInstance` /
     `TextInputInstance`, plus parameter types in `measureInWindow` callbacks.
     Worst files: `components/ui.tsx` (26), `app/session.tsx` (13),
     `components/notes.tsx` (11), `components/drills.tsx` (7).
   - Also: 5 `Share` mock types in tests, and 1 `captureRef` target in `shareCard.tsx`.
   - **Quick path (measured):** add
     `"customConditions": ["react-native", "react-native-legacy-deep-imports"]`
     to `tsconfig.json`. This uses the old types and leaves only the
     `InteractionManager` error. Expo says this opt-out goes away after RN 0.89,
     so plan the proper retyping as the next PR.
   - Tests that `jest.requireActual('react-native/Libraries/StyleSheet/...')` still
     work (the files exist in 0.88 and the suites pass).

### Checked and safe (no change needed)

- **expo-router APIs we use:** `router.push/replace/back/canGoBack/dismissTo/
  dismissAll/navigate/setParams`, `useLocalSearchParams`, `useFocusEffect`,
  `useIsFocused`, `Redirect`, `Stack`, `Tabs`, `usePathname`, `Href`,
  `ErrorBoundaryProps` are all still exported. `PlatformPressable` is still
  exported from `expo-router/react-navigation`.
- None of the removed props are used (`initialRouteName`, `initialParams`,
  `href: null`, `freezeOnBlur`, `unstable_settings`, `redirect=`,
  `beforeRemove`, `withLayoutContext`).
- **`src/app/+native-intent.tsx`:** `redirectSystemPath({ path, initial })`
  has the same signature in 58 (`build/types.d.ts`).
- **`src/lib/legacyLinks.ts`:** pure string code, so nothing changes. Its tests pass.
- **Behaviour changes to watch on a phone (tests pass):**
  - navigation actions now run after the screen renders ("deferred dispatch");
  - params are no longer copied from parent routes during `router.push`;
  - blurred screens are never frozen (possible extra re-renders on hidden tabs:
    worth a quick `perf-tabs` look);
  - generated query strings encode spaces as `+`.
- **Reanimated / worklets:** 4.7.1 / 0.13.x support RN 0.86 to 0.88. Just
  declare `react-native-worklets` directly (`npx expo install react-native-worklets`).
- **react-native-svg 15.16.0:** a minor bump, with no peer limits. lucide-react-native
  allows svg `^15`.
- **expo-notifications 58.1:** every function we call still exists
  (`setNotificationHandler`, `scheduleNotificationAsync`,
  `SchedulableTriggerInputTypes.DATE`, channels, permissions). The new
  "show in foreground by default" matches what `initNotifications()` already sets.
- **expo-sharing 58:** `shareAsync` / `isAvailableAsync` are unchanged.
- **expo-updates 58:** no breaking change (new optional `updates.maxUpdatesToKeep`).
- **@expo/fingerprint 0.21:** the default preset is now `balanced`. Our
  `fingerprint.config.js` sets `sourceSkips` explicitly, and that still wins.
  The only change is that native packages are now hashed by version instead of
  by files.
- **Jest:** jest-expo 58 runs on Jest 30 and needs `@react-native/jest-preset`
  ^0.88.1 as a peer, the same pattern as today. If `npm install` stops with
  ERESOLVE on that package, add `@react-native/jest-preset@0.88.1` as a devDependency.
  Our `jest/setup.ts` mocks still work.
- **TypeScript:** `expo/tsconfig.base` is unchanged in shape. TypeScript 6.0 is fine.
- **Web export / `npm run shots`:** the release post says `web.output` now
  defaults to `"server"`. But the trial export with no `web.output` set still
  produced a single-page `index.html` with no server folder, which is what
  `serve_spa.py` needs. Web routes now load in chunks (async routes on by
  default), so watch for screenshots taken before a screen has loaded.
  Optional: pin `"web": { "output": "single" }` in app.json to make it explicit.
- **iOS scene life cycle / SceneDelegate:** not relevant to us. We use
  Continuous Native Generation and have no iOS build yet.
- **Android R8 on by default:** we already turn it on (`enableMinifyInReleaseBuilds`).

### Third-party native packages in `mobile/package.json`

| Package | SDK 58-compatible version | Notes |
|---|---|---|
| **react-native-android-widget** ^0.24.0 | **0.26.0** (29 Oct 2026) | 0.24 reads `BuildConfig` but does not turn it on for Android Gradle Plugin 9. RN 0.88 uses AGP 9.2.1, so 0.24 **very likely fails to compile**. 0.26.0 adds `buildFeatures { buildConfig true }`, moves to compileSdk 37 / targetSdk 36 / minSdk 24 (exactly RN 0.88's), and its dev dependencies are React 19.3.0 / RN 0.88.1. 0.25.0 does NOT have the AGP fix. 0.25 and 0.26 also **change how widget size is measured** (new `RNWidgetSizing`) and bump `androidx.work` to 2.12.0. The SecureRandom image names from 0.24 are kept. Peer: `expo >=54`. Pin `~0.26.0`. |
| react-native-view-shot 5.1.0 | 6.1.1 (Expo's pick) | Major bump. `captureRef(view, { format, result, width, height })` is unchanged. Only the types tightened (1 type error). A new optional peer `html2canvas-pro` is for web only. |
| react-native-reanimated 4.7.1 | 4.7.1 | No change. |
| react-native-svg, safe-area-context, screens, web, async-storage | Expo's versions above | Routine. |
| react-native-gesture-handler (not declared; auto-installed peer of `react-native-drawer-layout`, which expo-router needs) | 3.4.0 auto-installed (Expo lists ~3.3.0) | Already installed today as 3.3.0, so it is not new native code. |
| lucide-react-native, @expo-google-fonts/*, zustand | Unchanged | JavaScript only, or font files. |

**`expo-widgets` on Android:** SDK 58 adds Android support. It uses Jetpack
Glance and runs widgets in their own JavaScript runtime. Its plugin has
`configuration` and `resizeMode` options. But it is brand new: its recent
patches fix launch crashes and R8 release-build crashes. **Not for this
upgrade.** Keep `react-native-android-widget` 0.26, and re-evaluate
`expo-widgets` at SDK 59. Our widget logic lives in `engine/widgets.ts`, so a
later switch would only replace the layouts.

## 4. Native impact, store builds and OTA

- **The fingerprint changes** (new React Native, new native modules), so this
  **cannot ship as an over-the-air update**. It needs new EAS builds:
  development, then preview, then production.
- **Google Play users (production build):** `app.config.js` builds the store app
  with updates OFF. They see no change and nothing breaks until they install
  the new Play release.
- **Test phones (preview APKs, `fingerprint` runtime policy):**
  - After the upgrade merges, `eas-update.yml` publishes to the new runtime only.
    The SDK 57 APKs simply stop getting updates, keep working on their last
    update, and need the new APK.
  - Any urgent fix for SDK 57 APKs would have to be published from a branch cut
    before the upgrade.
- **Saved progress:** safe. async-storage stays at 2.2.0, and the store keys
  (`aurivan.*.v1`, `aurivan.widget.v1`) are unchanged, so no data migration is
  needed. Widgets already on the home screen keep the same receiver names. Their
  size is re-measured by 0.26's new logic, so check them visually.
- Bump `expo.version` in `mobile/app.json` (mobile release rule). Web
  `APP_VERSION` rules do not apply.

## 5. Step-by-step upgrade plan

Run these on a fresh branch, from `mobile/`. Commit after each numbered step.

0. **Mark the safe point.** `git tag sdk57-last` on the current main commit.
   Note the current Android fingerprint:
   `npx expo-updates fingerprint:generate --platform android`.
1. **Move to SDK 58.**
   - Run `npx expo install expo@^58.0.0 --fix`. In this cloud environment, use
     `npm install expo@~58.0.21` first, then `EXPO_OFFLINE=1 npx expo install --fix`.
   - Then run `npx expo install react-native-worklets`, and set
     `react-test-renderer` to `19.3.0`.
   - If npm reports ERESOLVE on `@react-native/jest-preset`, run
     `npm install -D @react-native/jest-preset@0.88.1`.
2. **Widget library:** `npm install react-native-android-widget@~0.26.0`.
3. **Overrides:** keep `"zod": "4.6.6"`. Keep (or drop) `"node-forge": "1.4.2"`.
   Delete the `"xcode": { "uuid": ... }` entry. Update `docs/mobile/DEPENDENCY_AUDIT.md`.
4. **Code fixes** (small, commented):
   1. `src/lib/backup.ts:196` and `src/lib/account.ts:419`: `await file.write(text)`.
   2. `src/lib/board.ts` `warmLeakGuard`: replace `InteractionManager` with
      `requestIdleCallback`, falling back to `setTimeout`.
   3. `src/__tests__/qa-120.test.tsx`: rebuild the router model on the new
      `StackRouter` API, or on `expo-router/testing-library`.
   4. `tsconfig.json`: add the legacy-types condition (quick path). Open a
      follow-up PR to retype about 110 refs to `ViewInstance` etc. and remove
      the condition.
5. **Local checks:**
   - `npm run check` (typecheck, lint, Jest, web-plant).
   - `npx expo-doctor` (expect only the network-only checks to fail in the cloud).
   - `EXPO_OFFLINE=1 npx expo export --platform android --output-dir <tmp>`, then
     `bash scripts/check_off_bundle.sh` and `node scripts/check-size-budget.mjs <tmp>`.
   - `node scripts/check-release-config.mjs`.
   - `npm audit --omit=dev`: expect 0 high, 0 moderate.
   - `npm run shots`, light and dark.
6. **Phone builds:** `npx eas-cli@latest build --profile development --platform android`.
   - If it fails, the first suspects are the widget library and view-shot 6.
   - The CI pin `eas-cli@24.14.0` may need a bump if EAS warns. I could not
     verify its SDK 58 support.
7. **Phone walk-through** (smoke-tester, mobile-qa-tester):
   - onboarding → session → results;
   - share card (view-shot);
   - backup export, then restore (the file-write fix);
   - "Save your account data";
   - reminders in foreground and background;
   - all 8 widgets: add, resize, and the 2 that "ask first" (re-configure);
   - deep links `kaisip://whats-next`, `kaisip://play`, `kaisip://help?open=idea`;
   - back / `dismissTo` flows from Readiness to Learn;
   - Reduce Motion;
   - tab-switch speed.
8. **Release:** preview APK to test phones, then production build, then the Play
   internal track. Use a staged rollout.

**Rollback**

- **Before merge:** close the PR. Nothing has shipped.
- **After merge, before a store release:** `git revert` the squash commit. The
  fingerprint returns to the SDK 57 value, so OTA reaches the old APKs again.
  Or rebuild from `sdk57-last`.
- **After a Play release:** Play cannot go back to a lower version code. Halt
  the staged rollout in Play Console, then ship a rebuilt SDK 57 version with
  a higher version code (`autoIncrement` handles this). User data is safe
  either way, because storage is unchanged.

## 6. Risks (ranked) and effort

| # | Risk | Likelihood / impact | Mitigation |
|---|---|---|---|
| 1 | Widget library: 0.24 won't build on AGP 9; 0.26.0 is 1 day old and changes widget sizing | High / medium | Pin 0.26.0, dev build first, check all 8 widgets visually. If 0.26 misbehaves, wait for 0.26.x. There is no older SDK 58-compatible release. |
| 2 | Backup or account file shared before it is written (`File.write` now async), invisible to the type checker | Certain if not fixed / high (learner's backup) | `await file.write`, plus a phone check of export and restore |
| 3 | Board composer crash (`InteractionManager` removed) | Certain if not fixed / low today (cloud off in store) | `requestIdleCallback` fix; the 7 tests cover it |
| 4 | expo-router 58 navigation rework (deferred dispatch, `dismissTo` fix, no param copying, no screen freezing) | Medium / medium | Tests pass except the internal model test. Walk the back, dismiss and deep-link paths on a phone. Quick perf check of tabs. |
| 5 | First native build fails for another reason (view-shot 6 major, Kotlin/AGP 9, compileSdk 37) | Medium / low (blocks, but nothing ships) | Dev build before anything else |
| 6 | Type strictness: 125 errors | Certain / effort only | One-line opt-out now, retype in a follow-up |
| 7 | Test phones stop getting OTA until they install the new APK | Certain / low | Tell testers; build the preview APK the same day |
| 8 | Audit leftovers: zod still needs the override; 14 low (`deepmerge`) | Certain / low | Keep the override; re-check at SDK 59 |

**Effort: medium.**

- Code: about half a day, with the type opt-out.
- The follow-up ref retyping: about half a day more, mechanical.
- Builds and phone testing: about a day, including the owner's phone time.

## 7. Recommendation

**Upgrade now. Don't wait.**

- SDK 58 is a month old with 21 patch releases. The security fix it brings is
  proven in the trial build. Everything the trial found is small and known.
- The one item worth caution is the widget library's very new 0.26.0. Handle it
  with a development build and a widget check before anything ships, not by
  waiting.
- Ship it as one focused PR (steps 1 to 4). Keep the SDK 57 Play release live
  until the new build passes the phone walk-through.

## What I could not verify

- **docs.expo.dev is blocked in this session** (DNS). I used expo.dev/changelog,
  the expo-router CHANGELOG on raw.githubusercontent.com, and the packages' own
  type files instead. To read the official upgrade guide and the expo-widgets
  docs page, docs.expo.dev has to be allowed in the session's network settings.
- **GitHub API access to `sAleksovski/react-native-android-widget` is blocked.**
  The widget findings come from diffing the npm tarballs of 0.24.0, 0.25.0 and
  0.26.0, not from its release notes.
- **No Android native build was possible here** (no Android SDK or EAS). The
  claim "0.24 fails on AGP 9" is a strong inference, not a tested build failure.
- Two expo-doctor checks need exp.host and the React Native Directory, which
  are blocked here: the config schema check and the directory metadata check.
- I did not verify whether the CI pin `eas-cli@24.14.0` officially supports SDK 58.
- The trial used a freshly resolved lockfile. The real upgrade updates the
  existing lockfile, so small transitive version differences are possible.
