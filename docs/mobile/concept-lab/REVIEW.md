# Interactive Concept Lab pilot — owner review

Base: `5382a2ee95fa82404e9b5ee6186d030773cbefe0` (remote main verified before branching).
Branch: `codex/kaisip-interactive-concept-lab`. Independent of the Mistake Journal/Slip Coach work.

## Architecture and scope

- Typed certification-scoped registry in `mobile/src/content/labs/index.ts`; the pilot uses stable ID `cisa-lab-rto-rpo`, domain `4`, lesson `cisa-l-d4-rpo-rto`, note `4B1.2`, and relevant original questions `d4_074` / `d4_082`.
- Pure, validated minute calculations and reset defaults in `engine/conceptLab.ts`. Equality meets an objective; each objective is evaluated separately. Four combinations and clock boundaries are tested.
- Shared instruments in `components/conceptLab.tsx`: responsive timeline rails, animated markers, drag controls, explicit numeric outcomes, adjustable accessibility actions and 48pt+ one-minute alternatives. Motion follows existing `useMotion` and tokens.
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

- `EXPO_NO_TELEMETRY=1 npm run check`: PASS — 357 suites, 7,317 passed / 2 skipped; typecheck and generated-asset guards passed. The final dedicated `npm run lint` rerun is clean (0 errors/warnings).
- `npm_config_cache=/tmp/kaisip-npm-cache bash scripts/verify_repo.sh`: ALL CHECKS PASSED. The first attempt could not write the default npm cache; using a writable temporary cache resolved it without source changes.
- Final Android export: `/tmp/kaisip-lab-final-android`; cloud-OFF bundle guard PASS; size guard PASS (11.87 MB / 14 MB JavaScript, CISA pack 4.68 MB / 6 MB); release-channel and shared-file guards PASS.
- Focused lab coverage: 41 engine/content tests and 21 screen tests. Rendered tests verify all four outcomes, inclusive boundaries, reset, invalid/missing IDs, certification visibility, existing tile placement, lesson/note/practice navigation, accessible controls, light/dark and large-text/reduced-motion operation.
- Browser journeys: PASS, zero page errors, 16 screenshots. Pointer dragging, endpoints/clamping, increments, reset and related navigation checked in both themes.
- Logs: `/tmp/kaisip-lab-final-check.log`, `/tmp/kaisip-lab-final-lint.log`, `/tmp/kaisip-lab-repo-check.log`, `/tmp/kaisip-lab-final-android.log`.

The first full run revealed the existing copy guard reserves numbered “Stage” wording for the study journey; lab headings now say “Part”. Two other first-run failures were transient missing generated content while the screenshot harness rebuilt it. With content rebuilding finished, the full rerun passed without changing any existing assertion or timeout.

## Desktop emulator loading handoff (requested by owner)

This cloud task cannot reach the owner's desktop emulator: no ADB, Android SDK, KVM device or emulator is present here. The coordinating desktop chat (`01a1c035-65d1-7040-a942-90de91581927`) can fetch this branch into an isolated worktree and load it through the already-installed KaiSip development client (`com.kaisip.app`, scheme `kaisip`). No native dependency changed, so no new Android build is needed.

Use the existing desktop development-client/Metro workflow. Preserve the original port 8081 server and the separate port 8082 workspace documented in `RELEASE_2_1.md`; use a dedicated free port for this branch if necessary. Do not uninstall, clear app data, reset progress or reuse a synthetic screenshot seed on the owner's emulator. Open Learn → Interactive Concept Lab → Understand RTO vs. RPO, or the in-app route `/labs/cisa-lab-rto-rpo`. Device update and TalkBack/gesture acceptance are pending that desktop step, not claimed complete here.
