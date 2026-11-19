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

### Your mistake patterns, from PR #240 (19 Nov 2026)

**Why.** Expert scope review for 2.2 (product-manager, behavioral-scientist, technical review): it is the one candidate that works on metacognition. "Sure, but incorrect" uses the learner's own confidence ratings (the hypercorrection effect), final-two confusion comes from the actual pick, and "Practice other questions" serves only questions outside the mistake history (transfer, not recognition). Nothing shows below 5 classified mistakes. Owner approved the 2.2 scope on 19 Nov 2026; the renamed screen goes to the owner for a final yes before merge.

**What changed from #240 as built.** Learner copy says "Your mistake patterns", not "Mistake DNA" (code name kept). The card shows the cue and one action only; counts, sources and the trend sit in the opt-in "Explore pattern evidence"; caveats stay behind the "i". A rising trend shows "What helps: …". The generated `assets/kaisip-cloud.js` was regenerated from the merged sources (no data sent anywhere new). Design and method: `docs/mobile/MISTAKE_DNA.md`.

**Review (PR #288).** Code review: the journal's clock was read on every redraw (each tag tap re-analysed the whole journal); my first fix froze it at screen open, which would have dropped misses made in a practice session opened from the journal. The clock now refreshes exactly when the saved mistakes change; a test fails on a frozen clock. The changed final-two helper gives the same letter as before for every CISA, AAIA and CRISC question, and the website's sync code is unchanged. UX review: no extra "What to do next" heading, quiet buttons aligned left, an empty journal shows only its empty state, the card's caption is read with its heading by screen readers and capped with it at large text, and "classified" became "with a pattern" on screen. Final expert panel (owner asked for it before merge, 19 Nov 2026): `behavioral-scientist` SHIP WITH NITS, `app-store-compliance-reviewer` GO (analysis stays on the device, Data safety unchanged, no pass or diagnosis claims), `learner-reader` and `mobile-qa-tester` (12 new edge-case tests). Applied: plain-language help without "classified"; the card names FIRST, BEST or MOST; "Show details" instead of "Explore pattern evidence"; sources read "From your tags…" and "From the answers you chose"; the trend says "about the same as the 2 weeks before" with the counts kept; the study-note button's spoken name matches its text; What's New says "questions outside your mistake journal" (not "not seen yet", which was inaccurate). QA fixes: older-only mistakes no longer get "Tag a few mistakes"; a mistake whose question left the pack is no longer counted in "N open"; "Show fixed" no longer carries over when switching exams. Left for later: the Play tab's slip line still uses all-time tags, so it can name a different pattern than the journal's 28-day view.

**To measure after release (on the device, shared through the opt-in tester check-in):** the share of answers marked Sure on first sight that are wrong (should fall), first-try accuracy on "Practice other questions" sets, how many misses are classified, and replies that call it discouraging (guardrail). No notifications for this feature.

## Play release notes (draft)

New: your mistake journal now shows the pattern behind your recent mistakes, one thing to try next, and practice on questions outside your mistake journal.
Improved: on tablets and other large screens, pages now sit in a comfortable reading width instead of stretching across the screen.
