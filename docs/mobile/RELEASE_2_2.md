# Android 2.2 release tracker

A development tracker for the next phone update after 2.1, not a record of a shipped release. Version name **2.2** (two parts like 2.1; saved files record it as 2.2.0 through `fullVersion()`). Update this file as work lands; reconcile it at build freeze, and follow the same bundle handoff gates as `RELEASE_2_1.md` (read the built AAB's version name and code, compare with the highest Play code, record the commit and SHA-256).

## Included

### Large screens: tablets, foldables, Chromebooks (18 Nov 2026)

**Why.** At the 2.1 upload, Play Console's pre-review check warned: "Required hardware feature declarations are restricting your app's availability: android.hardware.screen.portrait affects Phone, Tablet, Desktop and Android XR users". `app.json` sets `"orientation": "portrait"`, the main activity is written with `screenOrientation="portrait"`, and Play reads that as a *required* portrait screen. The owner pressed "Proceed anyway" for 2.0.0 and 2.1 (a User experience warning, not a policy issue). Separately, Android 16 ignores orientation locks on screens 600dp and wider for apps targeting SDK 36 (KaiSip does), so tablets could already open the app 1280pt wide, stretched edge to edge.

**Decision (expert panel, no owner question needed).** `product-manager` and `mobile-ui-designer` both chose **Option A**: phones stay portrait; large screens rotate and lay out in a centred reading column. Full phone landscape (Option B) was rejected: at 852x393 only one answer option fits above the "Check answer" footer, so it would need a second layout for the quiz, lessons and games, for very few learners. Implementation **A1** (mark the feature optional, keep the phone lock) over A2 (unlock and lock phones at runtime with a new native module): no new dependency, no landscape flash on phone launch. Android 16's temporary opt-out property was not used (it stops working at target SDK 37).

**What changed.**
- `mobile/plugins/withOptionalPortrait.js` (in `app.json` plugins) adds `<uses-feature android:name="android.hardware.screen.portrait" android:required="false" />`, Android's documented fix for an activity that locks orientation but does not require it. Verified with `expo config --type introspect` (store env): the feature is `required="false"` and MainActivity keeps `screenOrientation="portrait"`.
- `mobile/src/components/layout.tsx`: `COLUMN_MAX` 600 (Grove's 560 reading measure + two gutters), `useContentWidth()`, `ContentColumn`. The root layout wraps the screen stack in the column; the seven page sheets and the Settings bottom sheet centre in it; 16 components that sized from the window now size from the column. The diagram viewer stays full window.
- `SHOTS=wide npm run shots` (`scripts/screenshots/shoot_wide.mjs`): tablet landscape 1280x800, tablet portrait 800x1280 and the phone; fails on sideways scrolling or on anything wider than the column. Against the 2.1 code it fails on every screen (1240pt wide); on this change it passes.
- `src/__tests__/large-screens.test.tsx`: the phone lock stays, the plugin is registered and writes the feature once as optional, the column maths, `useContentWidth` and `ContentColumn`.

**Evidence.** Phone portrait (393x852) screenshots of 13 key screens compared pixel by pixel with 2.1: 11 identical, 2 with sub-threshold animation-timing differences (no pixel changed visibly). At 1280x800 the question, all four options and "Check answer" fit without scrolling. `npm run check` (363 suites, 7,190 passed, 2 skipped), Android export, release-config and size-budget checks passed.

**Still to verify on the built AAB (cannot be done from the cloud session: no emulator).**
- [ ] Read the merged manifest in the AAB: `android.hardware.screen.portrait` with `required="false"`, MainActivity still `portrait`.
- [ ] Play Console pre-review: the required-feature warning is gone; Device catalog lists tablets and Chromebooks as supported.
- [ ] A tablet emulator on Android 16 (e.g. Pixel Tablet, API 36) in landscape and portrait: Today, a practice question and answer, a mock (rotate mid-mock: the selection, timer and progress are kept), a lesson, notes, onboarding, Settings sheets.
- [ ] A phone on any Android version: still portrait only, nothing moved.

**Not in scope (owner decisions if wanted later).** Promoting tablets or Chromebooks in the Play listing (needs tablet screenshots). iPad support (`ios.supportsTablet` stays false until after the iOS launch). A two-pane tablet layout (for example the question beside its explanation).

## Play release notes (draft)

Improved: on tablets and other large screens, every page now sits in a comfortable reading width instead of stretching across the screen.
