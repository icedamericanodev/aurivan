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
| Simpler practice answer | The 2.0.0 order is back: answer card (your answer, "Why not B", best answer), Key idea, the three tips, "Why D". The whole question and all four options sit behind ONE switch, "Show question & options", closed for each new question; opened, it shows the question and the four options only (no per-option reasons on this screen: see the second panel note below). The inline "Compare all options" list and the "Show all options" sheet are gone from practice. | Owner, 19 Nov: the inline reasons overwhelmed a tester; R-ZXUQ could not find the question and choices. Mock review keeps its full comparison; lessons and drills are unchanged. Question data untouched. |
| Concept Lab hidden | `CONCEPT_LAB_ENABLED = false` (`mobile/src/content/labs/enabled.ts`): no tile in Learn, no link from notes; `/labs` routes go to Learn. Code and tests kept. | Owner, 19 Nov: the lab made the topic more confusing. It shipped in the 2.1 bundle, so this hides a live feature on purpose; no saved data is involved. Returns only after a redesign and uncoached learner testing. #244 stays deferred. |
| Answered review (read-only) | "Answered" filter in the question list opens `/answered/[id]`: last result and date, the question, a closed "Show why the other options are wrong" switch, the four options in A to D order with the best one marked, then Key idea, tips and the reason for the best answer. A separate "Practice this question" button. Opening it changes no stored data (tested). | First delivery only: no new stored fields. The app never saved which option was picked, so after a miss the page says "KaiSip saved your result for this answer, not which option you picked", except for a miss whose pick is in the Mistake journal for that same attempt (shown as "Your answer" with its reason open). After a correct answer it marks only the best answer and never guesses a pick. Saving the latest pick for new answers is a later, separately reviewed storage change. |
| Practice countdown (gentle) | Build a set: Untimed / Count up / Countdown, per set. Counts active study time only (pauses in the background and when paused; no wall-clock deadline). At zero: "Keep going untimed" or "Finish now"; nothing is auto-submitted and unanswered questions are never marked wrong. Domain rows open the builder with the area preselected. | Owner, 19 Nov, chose gentle over exam-strict. Mock deadlines untouched (regression test). One optional field on the active session, `countdown`; no store version bump; not in backups. Old `timed: true` still means count up. |
| Rate and Share | Settings, Help and about: "Rate this app" (Android only, opens Google Play; no in-app prompt, no reward, no screening question) and "Share this app" (share sheet with one neutral line and https://kaisip.com; nothing personal). | Tester suggestion. Google's in-app review guidance: user-initiated buttons open the store. |
| Website | `home.html`: the plant panel, bullet and step 05 become the Mistake journal; screenshots re-shot from this build. | The plant was retired in 2.1; the public page must match the app. |

**Expert panel on two open choices (19 Nov 2026, at the owner's request).** `product-manager`, `mobile-ui-designer`, `learner-reader` and `isaca-language-reviewer` answered independently.
- *One word.* All four chose **"options"** over "choices": ISACA's 2026 candidate guide says each question has "a stem (question) and four options", the bank's tips and explanations say "option" about 320 times against 48 for "choice", and the learner read two words as two things. This replaces the handoff's suggested label "Show question & choices". Existing "closest wrong choice" copy and the games' "Choice 1 of 6" are unchanged.
- *Look-back page order.* The learner and the designer wanted the reasons behind a tap (the page was two screens of reasons before the Key idea); the product manager preferred keeping the full list for 2.2 (medium confidence). Implemented the designer's layout: question, options, closed switch, Key idea, tips, the best answer's reason. Tips stay after the options because they name option letters. Reversible in one file if the owner prefers the full list.
- *Also agreed:* no "not saved" line after a correct answer (it read as a fault); the "latest version" line moves to the foot of the page; the Answered filter's help line no longer contradicts "Practice these again"; "Countdown length" is "Time limit" (it sat beside "Length", the number of questions).

**Second panel: are per-option reasons needed after answering? (19 Nov 2026, owner's question).** `learner-reader`, `behavioral-scientist`, `cisa-pedagogy-checker`, `mobile-ux-reviewer` and `product-manager`. Four of five: remove "Show why for each option" from the after-answer screen and keep the reasons on the look-back page (the product manager would have kept the closed switch and asked testers first).
- *Measured:* in all 1,279 questions the Eliminate and Final two tips together name every wrong option. In a 40-question sample (seed 22, 8 per domain), 107 of 120 wrong-option reasons restated a tip already on screen and 13 added a point, 3 of which are also in the Key idea or the best answer's reason; none conflicted. After a lucky correct guess the best answer's reason rebutted the runner-up in all 40.
- *Why:* at the moment of answering the list is a second copy two taps deep, a switch inside a switch (nine extra screen-reader stops before the verdict), and opened it rebuilt the wall testers rejected. Repeated content lowers learning (redundancy effect). It is useful when re-reading days later, which is the look-back page.
- *Done:* the answer screen's "Show question & options" opens the question and options only. On the look-back page the switch sits above the options, reveals the wrong options' reasons only (the best answer's reason is shown once, lower down) and is named "Show why the other options are wrong". Mock review is unchanged; nothing was deleted from the bank.
- *To ask testers after 2.2:* "After a wrong answer, was there an option you still did not understand why it was wrong? Which question?" If about one in five names a real case, bring the reasons back after misses only.

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
• After you answer: the short summary and tips first, with the question and every option one tap away.
• Rate or share KaiSip from Settings.
• Better layout on tablets.
• The Concept Lab is put away while we make it clearer.
```
