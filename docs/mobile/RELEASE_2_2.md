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

**Evidence.** Phone portrait (393x852) screenshots of 13 key screens compared pixel by pixel with 2.1: 11 identical, 2 with sub-threshold animation-timing differences (no pixel changed visibly). At 1280x800 the question, all four options and "Check answer" fit without scrolling. `npm run check` (363 suites, 7,191 passed, 2 skipped), Android export, release-config and size-budget checks passed.

**Review (PR #283).** Code review found one phone regression, fixed: in the Report a problem sheet the column had gone between the safe area and the keyboard view, and Android's keyboard maths reads that view's position from its parent, so the bottom field could slip under the keyboard (a test now pins the nesting). UX review: the tab bar now follows the column (it was capped at 520, narrower than the 560 cards, so card corners showed beside it); the load-failure and crash screen centres itself; the wide set now shows an open Settings sheet. Play review: GO, with the release note softened from "every page" to "pages" (the diagram viewer stays full width). Copy left for later: onboarding's "Everything stays on your phone" reads oddly on a tablet ("on this device" would fit both).

**Still to verify on the built AAB (cannot be done from the cloud session: no emulator).**
- [ ] Read the merged manifest in the AAB: `android.hardware.screen.portrait` with `required="false"`, MainActivity still `portrait`.
- [ ] Play Console pre-review: the required-feature warning is gone; Device catalog lists tablets and Chromebooks as supported.
- [ ] A tablet emulator on Android 16 (e.g. Pixel Tablet, API 36) in landscape and portrait: Today, a practice question and answer, a mock (rotate mid-mock: the selection, timer and progress are kept), a lesson, notes, onboarding, Settings sheets.
- [ ] A phone on any Android version: still portrait only, nothing moved.

**Not in scope (owner decisions if wanted later).** Promoting tablets or Chromebooks in the Play listing (needs tablet screenshots). iPad support (`ios.supportsTablet` stays false until after the iOS launch). A two-pane tablet layout (for example the question beside its explanation).

### Build-tool security update: node-forge 1.4.3 (19 Nov 2026, PR #286)

Clears four Dependabot alerts (one low, three moderate) in node-forge, which only Expo's command-line and update code-signing tools use; it is not in the app. The npm override in `mobile/package.json` moved from 1.4.2 to 1.4.3. `npm run check` passed (7,191 tests); the Android and iOS update fingerprints are unchanged, so existing installs keep receiving updates. The fifth alert (glob, build tools only) stays open on purpose until Expo and Jest move to glob 14: `docs/mobile/DEPENDENCY_AUDIT.md`. No release note: nothing a learner can notice.
### Learner-feedback round (19 Nov 2026)

Source: the owner's consolidated handoff of 18 to 19 Nov 2026 and her decisions the same day. Built on main at `44f6583`. **State: implemented and unit-tested in a pull request; not merged, not built, not tested on a phone.** The owner reviews screenshots first.

| Change | What it does | Decision / reason |
|---|---|---|
| Simpler practice answer | The 2.0.0 order is back: answer card (your answer, "Why not B", best answer), Key idea, the three tips, "Why D". The whole question and all four choices sit behind ONE switch, "Show question & choices", closed for each new question; each choice's reason is a second, opt-in switch inside it. The inline "Compare all options" list and the "Show all options" sheet are gone from practice. | Owner, 19 Nov: the inline reasons overwhelmed a tester; R-ZXUQ could not find the question and choices. Mock review keeps its full comparison; lessons and drills are unchanged. Question data untouched. |
| Concept Lab hidden | `CONCEPT_LAB_ENABLED = false` (`mobile/src/content/labs/enabled.ts`): no tile in Learn, no link from notes; `/labs` routes go to Learn. Code and tests kept. | Owner, 19 Nov: the lab made the topic more confusing. It shipped in the 2.1 bundle, so this hides a live feature on purpose; no saved data is involved. Returns only after a redesign and uncoached learner testing. #244 stays deferred. |
| Answered review (read-only) | "Answered" filter in the question list opens `/answered/[id]`: question, choices in A to D order, best answer, current explanations, Key idea, tips, last result and date. A separate "Practice this question" button. Opening it changes no stored data (tested). | First delivery only: no new stored fields. The app never saved which option was picked, so the page says "Your selected option was not saved for this answer", except for a miss whose pick is in the Mistake journal for that same attempt. Saving the latest pick for new answers is a later, separately reviewed storage change. |
| Practice countdown (gentle) | Build a set: Untimed / Count up / Countdown, per set. Counts active study time only (pauses in the background and when paused; no wall-clock deadline). At zero: "Keep going untimed" or "Finish now"; nothing is auto-submitted and unanswered questions are never marked wrong. Domain rows open the builder with the area preselected. | Owner, 19 Nov, chose gentle over exam-strict. Mock deadlines untouched (regression test). One optional field on the active session, `countdown`; no store version bump; not in backups. Old `timed: true` still means count up. |
| Rate and Share | Settings, Help and about: "Rate this app" (Android only, opens Google Play; no in-app prompt, no reward, no screening question) and "Share this app" (share sheet with one neutral line and https://kaisip.com; nothing personal). | Tester suggestion. Google's in-app review guidance: user-initiated buttons open the store. |
| Website | `home.html`: the plant panel, bullet and step 05 become the Mistake journal; screenshots re-shot from this build. | The plant was retired in 2.1; the public page must match the app. |

Not done from this round (kept for later, on purpose): saving the latest pick per question; lesson entry points for the set builder; an exit-confirmation dialog on Back (no data-loss defect shown); study-fatigue wording review; the Concept Lab learning pilot; countdown pausing while the More or report sheet is open.

**Still to verify on a phone (no emulator in the cloud session).**
- [ ] R-S4JW: Coach me on the reported Android version, question visible before and after the hint, light/dark, 200% text, TalkBack.
- [ ] The new answer screen: switch opens and closes, resets on the next question, TalkBack says expanded/collapsed, 200% text.
- [ ] Countdown: background and resume, kill and relaunch at zero, the sheet over the More and report sheets.
- [ ] Answered review with a real profile upgraded from 2.0.0 or 2.1; nothing changes after opening it.
- [ ] Rate opens the Play page for a closed tester; Share shows only the approved line.
- [ ] Bottom buttons with three-button and gesture navigation; upgrade from 2.1 keeps progress.

## Play release notes (draft)

```
What's new in 2.2
• Look back at answered questions with their explanations, without answering again.
• Set a countdown for practice. When time is up, finish or keep going untimed.
• Choose how many questions and which timer for one area.
• After you answer: the short summary and tips first, with the question and all choices one tap away.
• Rate or share KaiSip from Settings.
• Better layout on tablets.
• The Concept Lab is put away while we make it clearer.
```
