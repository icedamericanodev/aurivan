# Interactive Concept Lab pilot — owner review

Base: `5382a2ee95fa82404e9b5ee6186d030773cbefe0` (remote main verified before branching).
Branch: `codex/kaisip-interactive-concept-lab`. Independent of the Mistake Journal/Slip Coach work.

## Architecture and scope

- Typed certification-scoped registry in `mobile/src/content/labs/index.ts`; the pilot uses stable ID `cisa-lab-rto-rpo`, domain `4`, lesson `cisa-l-d4-rpo-rto`, note `4B1.2`, and relevant original questions `d4_074` / `d4_082`.
- Pure, validated minute calculations and reset defaults in `engine/conceptLab.ts`. Equality meets an objective; each objective is evaluated separately. Four combinations and clock boundaries are tested.
- Shared instruments in `components/conceptLab.tsx`: responsive timeline rails, animated markers, compact drag controls, paired numeric outcome tiles, adjustable accessibility actions and 48pt+ one-minute alternatives behind a labelled precise-controls disclosure. Motion follows existing `useMotion` and tokens.
- `/labs` catalogs supported labs by current certification domain; `/labs/cisa-lab-rto-rpo` contains Explore, Experiment and Apply. A malformed/missing/cross-certification ID gets a recoverable empty state.
- Learn retains its four reference tiles, responsive grid, Final Review Week and lesson groups. The full-width lab entry is between the reference tiles and Final Review Week. Unsupported certifications show no entry.
- Note `4B1.2` keeps its primary Practice this concept action and adds a secondary lab link. Apply links to existing lesson/note and optional relevant practice through the existing guarded session start.
- No completion is persisted. Lab actions do not affect answers, lesson completion, exam readiness, account data, backup/sync schemas or entitlement decisions. The existing practice action keeps its normal progress semantics.
- No package, permission, native module, service, authentication, release version/channel or store configuration changes.

## Specialist review and corrections

Independent mobile QA added engine/content and rendered-screen regression coverage plus a reproducible seeded browser harness. Independent UX/accessibility, motion, security and CISA concept review found two blockers, both corrected: stage changes now reset scroll/focus, and slider tracks use the high-contrast control token. Precision fixes derive timeline timestamps from configuration, constrain status announcements, use shared timing, reject zero-width ranges, space card content and avoid implying source publications ship offline.

The source publication was subsequently fetched through the web connector after shell networking denied it. NIST SP 800-34 Rev. 1, printed p.17 / §3.2 supports the distinct RTO/RPO concepts; §3.5 is Plan Testing, Training, and Exercises (the initial draft incorrectly said §3.6, which is Plan Maintenance). The registry now cites the correct section. Explanations and scenarios are original KaiSip prose, with no copied exam items.

Public primary reference: https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-34r1.pdf

Security review found no new sensitive path or high/critical dependency finding. Existing unchanged transitive audit advisories are outside this feature's scope.

## Reproduce visual and interaction QA

From `mobile/`:

```sh
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 SHOTS=labs npm run shots -- /tmp/kaisip-lab-shots
```

The existing screenshot harness creates synthetic local data and a temporary web export. Configure `PLAYWRIGHT_REQUIRE_FROM` and `CHROME_PATH` for the installed browser if needed. It never opens an existing tester profile. The lab set captures Learn, catalog, Explore, Experiment, Apply, feedback and note link in light/dark, with a 360-wide approximate 200% text / reduced-motion pass. It exercises real pointer dragging, boundaries, increment and reset. Browser text scaling is an approximation, not native Android accessibility acceptance.

Direct review paths: `/learn`, `/labs`, `/labs/cisa-lab-rto-rpo`, `/notes/subtopic/4B1.2`.

## Integration contract and follow-ups

A future remediation surface can use `findLab(certId, 'cisa-lab-rto-rpo')`, `labForNote(certId, '4B1.2')`, or the registry's verified `questionIds`; it must preserve certification scoping. Navigation target is `/labs/cisa-lab-rto-rpo`. No Mistake Journal/Slip Coach file or shared progress/data contract changed. `run.sh` has only a new `SHOTS=labs` dispatch; reconcile that small insertion if another task edits the harness.

Further recovery-timeline labs can use the same config and instruments (for example, comparing recovery-test results against different business-approved objectives). New interaction families such as segregation-of-duties mapping or preventive/detective control simulations need a real interaction renderer and a new discriminant; this pilot deliberately does not scaffold unused types.

App-size estimate: approximately 26 KB of new uncompressed production TypeScript/source text, no binary assets or dependencies; expect a small JavaScript-only increment (tens of KB, compression/build dependent), not a measured APK/AAB delta. Native startup was not benchmarked. The lab registry is small and no content pack/progress schema grows.

## Acceptance limits

No Android emulator/ADB is installed in this runtime. Android JavaScript export validates compilation; browser and Jest coverage do not establish physical-device drag feel, TalkBack/VoiceOver speech, Samsung behavior or native 200% layout. These remain owner/device acceptance checks. Existing 2.1 native release gates remain separate and unchanged. No merge, deployment, OTA publication or production Android build is authorized or performed.

Final automated results and screenshot locations are recorded in the PR/handoff.

Committed review images: [Learn light](learn-light.png), [Learn dark](learn-dark.png), [Lab light](lab-light.png), [Lab dark](lab-dark.png). Additional catalog, Explore/Apply, feedback, note link and approximate 200% reduced-motion images are generated by the same harness in `/tmp/kaisip-lab-shots`.

## Exact changed files

- `mobile/src/engine/conceptLab.ts`
- `mobile/src/content/labs/index.ts`
- `mobile/src/components/conceptLab.tsx`
- `mobile/src/app/labs/index.tsx`
- `mobile/src/app/labs/[id].tsx`
- `mobile/src/app/(tabs)/learn.tsx`
- `mobile/src/app/notes/subtopic/[id].tsx`
- `mobile/src/__tests__/conceptLab.test.ts`
- `mobile/src/__tests__/conceptLab-screens.test.tsx`
- `mobile/scripts/screenshots/shoot_labs.mjs`
- `mobile/scripts/screenshots/run.sh`
- `docs/mobile/concept-lab/REVIEW.md`
- `docs/mobile/concept-lab/learn-light.png`
- `docs/mobile/concept-lab/learn-dark.png`
- `docs/mobile/concept-lab/lab-light.png`
- `docs/mobile/concept-lab/lab-dark.png`

## Final local verification

- `EXPO_NO_TELEMETRY=1 npm run check`: PASS — 357 suites, 7,320 passed / 2 skipped; typecheck and generated-asset guards passed. The final dedicated `npm run lint` rerun is clean (0 errors/warnings).
- `npm_config_cache=/tmp/kaisip-npm-cache bash scripts/verify_repo.sh`: ALL CHECKS PASSED. The first attempt could not write the default npm cache; using a writable temporary cache resolved it without source changes.
- Final Android export: `/tmp/kaisip-lab-final-android`; cloud-OFF bundle guard PASS; size guard PASS (11.87 MB / 14 MB JavaScript, CISA pack 4.68 MB / 6 MB); release-channel and shared-file guards PASS.
- Focused lab coverage: 41 engine/content tests and 25 screen tests. Rendered tests verify all four outcomes, inclusive boundaries, reset, invalid/missing IDs, certification visibility, existing tile placement, lesson/note/practice navigation, accessible controls, light/dark and large-text/reduced-motion operation.
- Browser journeys: PASS, zero page errors, 16 screenshots. Pointer dragging, endpoints/clamping, increments, reset and related navigation checked in both themes.
- Logs: `/tmp/kaisip-lab-final-check.log`, `/tmp/kaisip-lab-final-lint.log`, `/tmp/kaisip-lab-repo-check.log`, `/tmp/kaisip-lab-final-android.log`.

The first full run revealed the existing copy guard reserves numbered “Stage” wording for the study journey; lab headings now say “Part”. Two other first-run failures were transient missing generated content while the screenshot harness rebuilt it. With content rebuilding finished, the full rerun passed without changing any existing assertion or timeout.

## Desktop emulator loading handoff (requested by owner)

This cloud task cannot reach the owner's desktop emulator: no ADB, Android SDK, KVM device or emulator is present here. The coordinating desktop chat (`01a1c035-65d1-7040-a942-90de91581927`) can fetch this branch into an isolated worktree and load it through the already-installed KaiSip development client (`com.kaisip.app`, scheme `kaisip`). No native dependency changed, so no new Android build is needed.

Use the existing desktop development-client/Metro workflow. Preserve the original port 8081 server and the separate port 8082 workspace documented in `RELEASE_2_1.md`; use a dedicated free port for this branch if necessary. Do not uninstall, clear app data, reset progress or reuse a synthetic screenshot seed on the owner's emulator. Open Learn → Interactive Concept Lab → Understand RTO vs. RPO, or the in-app route `/labs/cisa-lab-rto-rpo`. Device update and TalkBack/gesture acceptance are pending that desktop step, not claimed complete here.

## Compact Experiment revision

The owner supplied a clearer, less-wordy reference. Experiment now leads with two label/value sliders, their RTO/RPO targets and paired met/missed result tiles. The potential-data-loss caveat stays visible. Timeline, timestamps and full explanation are behind a labelled disclosure; precise one-minute alternatives have a separate expanded-state toggle while native adjustable actions remain available at all times. Outcome tiles stack at large text and decorative verdict symbols are hidden from screen readers. Explore and Apply retain their existing teaching content.

Independent accessibility/content review cleared the revision. Focused coverage passes 66 tests, including the compact default and on-demand explanation. Updated light/dark images replace the original lab images.

## First-time learner review and native gesture correction

A separate simulated first-time learner cognitive walkthrough found the two-number comparison clear after Explore, but flagged “Recoverable data gap” and slash-form actual/limit numbers as ambiguous in Experiment alone. The revised view now says “Age of latest usable data” / “Minutes before the outage”; first-control helper says “Minutes from outage to restored service”. Outcome tiles label Actual and Limit separately. The visible rule explains that results change while business limits stay fixed, with equality meeting the objective. The potential-loss caveat remains visible; an orders example and transaction-record check sit in the expanded explanation. Explore and Apply wording is plainer. The tester's second review cleared the conceptual blockers. This is simulated expert user review, not real-human research.

Native QA on emulator-5554 reported that vertical scrolling beginning over a slider changed its value. The slider no longer claims touch-down. Native Pressability commits deliberate taps and allows ScrollView cancellation; the outer responder captures only deliberate horizontal motion (>6 px and clearly greater than vertical movement). Vertical intent remains locked for that gesture, including the release. Native adjustable actions and precise controls still work. Web touch events lacking locationX are normalized through host measurement, with invalid coordinates, unmounted hosts and invalid measurements ignored.

Focused regressions exercise both ranges: no touchdown change, no vertical-scroll change (including subsequent horizontal drift), taps, horizontal dragging, endpoint clamping, and malformed tap safety. Independent gesture review cleared the fix. Browser touch scrolling/taps plus mouse dragging/clamping passed in light/dark with zero page errors; 16 refreshed images are at `/tmp/kaisip-lab-revised-shots`. Native retest of this exact pushed head remains required.

Latest full check: 357 suites passed, 7,320 tests passed / 2 skipped (`/tmp/kaisip-lab-revised-check.log`). Latest focused check: 66 passed (`/tmp/kaisip-lab-revised-focused.log`). The added malformed-event case was verified after the full run. Compact revision Android export and OFF/size guards passed; the final gesture/copy export is `/tmp/kaisip-lab-revised-android`.

Final post-review verification: typecheck and lint clean; focused tests also pass with the existing cloud-memory flag (66 tests, `/tmp/kaisip-lab-revised-cloud.log`). The final Android export compiles and passes the OFF-bundle and size guards (11.87 MB JavaScript, unchanged 4.68 MB CISA content). Browser touch scrolling, touch taps, horizontal dragging, clamping, reset and navigation passed in both themes with zero page errors (`/tmp/kaisip-lab-browser-retest.log`). No code was merged or published; load the new PR head in the existing development client for the native vertical-scroll retest.

## Native acceptance and merge preparation

The coordinating workspace retested `5da1c2b6b1d803f8187bc224c15811bc1d52f9be` on emulator-5554. Vertical swipes beginning on either slider preserved 80/30 while scrolling; deliberate horizontal drags, taps and reset worked. TalkBack adjusted both controls and activated precise controls. The emulator stayed at 100% text and TalkBack was restored off. Tester data, premium access and account sync settings were preserved. Full spoken wording was outside that interaction check.

One minor native wording finding, “1 minutes”, is corrected to “1 minute” in the accessible value and covered by the existing bounded-control regression. Independent review cleared the two-line fix; typecheck/lint and 66 focused tests pass.

The owner subsequently authorized merge unless major issues remain. Main advanced to Grove commit `245ed576b53c7e3fbe828ad9b84ebd5f63d27087`, so a separate exact merged-tree smoke/full-check pass is required before merging. The repository's push-main EAS Update workflow auto-publishes preview OTA. To preserve the owner's no-publication boundary without editing release configuration, the squash commit will use GitHub's documented `[skip ci]` marker only after PR CI and merged-tree verification pass. This intentionally also skips main push checks; report pre-merge CI and exact-tree local results, not merged-SHA CI success. Verify the resulting tree and run post-merge smoke checks.
