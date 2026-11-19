# Mistake DNA review evidence

Current design: one help icon beside “Your Mistake DNA,” opening a shared scrollable help sheet. A coaching cue and exact evidence remain visible; coverage is in expanded evidence.

Synthetic QA data only. Screenshots are browser renderings at 393 × 852; enlarged-text views simulate larger text and do not certify native Android accessibility.

- `light-journal.png`, `dark-journal.png`: integrated journal summary and existing remediation.
- `light-evidence.png`, `dark-evidence.png`: provenance and overlapping percentages.
- `light-info.png`, `dark-info.png`: an opened information control with the complete explanation.
- `light-trend.png`, `dark-trend.png`: both sample windows and interpretation limits.
- `light-large-text.png`, `dark-large-text.png`: enlarged-text wrapping with no horizontal viewport overflow.
- `light-empty.png`, `dark-empty.png`: honest empty summary and retained journal empty state.

## Reproduce

From `mobile/`, use the existing development dependencies:

```sh
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npx expo export --platform web --output-dir /tmp/dna-web
python3 scripts/screenshots/make_seed.py /tmp/dna-seed.json light
python3 scripts/screenshots/serve_spa.py /tmp/dna-web 8095
```

In a second terminal, from `mobile/`:

```sh
PLAYWRIGHT_REQUIRE_FROM=/path/to/playwright/node_modules/ CHROME_PATH=/path/to/chromium node scripts/screenshots/shoot_mistake_dna.mjs /tmp/dna-seed.json ../design-notes/mistake-dna
```

The script uses fresh browser contexts, never an existing tester profile. `DNA_URL` can override the local server address. On this runtime, Expo additionally uses `__UNSAFE_EXPO_HOME_DIRECTORY=/tmp/dna-expo` to keep its cache in a writable directory. The default screenshot suite also captures expanded DNA evidence after its existing pattern fixture.

## Specialist reviews

Independent reviewers followed `.claude/agents/mobile-ux-reviewer.md`, `mobile-security-auditor.md`, `mobile-qa-tester.md` and `isaca-mindset-coach.md`.

Fixed all findings: actionless corrected knowledge-gap state, different spoken/visible provenance, floating-point trend boundary, malformed tags posing as observed evidence, test text extraction and missing empty-state illustration. UX re-review found no remaining blocking code/layout issues in reviewed screenshots; native TalkBack remains pending. Security review found no new feature risks: no new external calls, persisted fields, permissions or access bypass. Existing dependency audit: zero high/critical findings; no dependency changes.

## Verification results

- `npm run check`: passed; 357 suites, 7,278 tests passed, 2 existing skips. After removing duplicate test imports, lint rerun had no warnings and both DNA suites passed again (23 tests).
- `NPM_CONFIG_CACHE=/workspace/.npm bash scripts/verify_repo.sh`: ALL CHECKS PASSED. The first attempt needed its npm cache moved to a writable location; no source change was required.
- Independent final QA: 4 suites / 44 tests passed; no remaining findings.
- Android Metro/Hermes export: passed. Cloud-OFF guard G2, release-channel guard, shared-source guard and size budget passed. Bundle: 11,849,637 bytes (11.85 MB of 14 MB); CISA content 4.68 MB of 6 MB. Exact increase from a fresh baseline export was not measured; no dependencies changed.
- Synthetic Node v24 benchmark: 5,000 distinct observations, 50 timed analyses after 10 warmups, median 8.66 ms, p95 20.93 ms. This is not a native/Hermes performance measurement.
- Dedicated screenshot run: light/dark/expanded evidence/trend/empty/enlarged text captured, zero page errors and no horizontal viewport overflow. UX reviewer inspected screenshots; the trend capture was corrected to include its explanation and counts.
- Cloud-enabled full regression (`EXPO_PUBLIC_AURIVAN_CLOUD=1 EXPO_PUBLIC_AURIVAN_CLOUD_BACKEND=memory npm test -- --runInBand`): passed; 356 suites passed, 1 skipped; 7,249 tests passed, 31 skipped for this configuration.
- Native Android acceptance remains pending because `adb` is unavailable. Browser screenshots and render tests do not replace TalkBack/real font-scale testing. Repository pa11y was skipped because its optional website server was not running; this feature does not edit website markup.

Android export is a local compilation check only; no Android package was built, uploaded or released.

## Exact changed files

- `assets/kaisip-cloud.js`
- `design-notes/mistake-dna/README.md`
- `design-notes/mistake-dna/dark-empty.png`
- `design-notes/mistake-dna/dark-evidence.png`
- `design-notes/mistake-dna/dark-info.png`
- `design-notes/mistake-dna/dark-journal.png`
- `design-notes/mistake-dna/dark-large-text.png`
- `design-notes/mistake-dna/dark-trend.png`
- `design-notes/mistake-dna/light-empty.png`
- `design-notes/mistake-dna/light-evidence.png`
- `design-notes/mistake-dna/light-info.png`
- `design-notes/mistake-dna/light-journal.png`
- `design-notes/mistake-dna/light-large-text.png`
- `design-notes/mistake-dna/light-trend.png`
- `docs/mobile/MISTAKE_DNA.md`
- `docs/mobile/RELEASE_2_1.md`
- `mobile/scripts/screenshots/shoot.mjs`
- `mobile/scripts/screenshots/shoot_mistake_dna.mjs`
- `mobile/src/__tests__/build-f.qa.test.tsx`
- `mobile/src/__tests__/mistake-dna-screen.test.tsx`
- `mobile/src/__tests__/mistake-dna.test.ts`
- `mobile/src/__tests__/principles-screens.test.tsx`
- `mobile/src/app/mistakes.tsx`
- `mobile/src/components/mistakeDNA.tsx`
- `mobile/src/engine/mistakeDNA.ts`
- `mobile/src/engine/slipCoach.ts`
- `mobile/src/engine/tips.ts`

## Emulator handoff requested by owner

The owner asked for screenshots and an emulator update. This task runs in a cloud Linux workspace; there is no `adb`, Android SDK, emulator process or connected device. The coordinating chat “Coordinate KaiSip feature development” runs locally on the owner’s Mac and can perform that update from its existing Android development setup.

Use branch `codex/kaisip-mistake-dna` / PR #240 in an isolated local checkout. No native dependencies or configuration changed, so the existing compatible KaiSip development client can receive the branch with `npx expo start --dev-client --android` from `mobile/`, following `docs/mobile/RUN_ON_ANDROID_EMULATOR.md`. Coordinate with the Lab branch before choosing which feature(s) to show. Keep the existing emulator app data: do not uninstall, clear storage, reset progress, or import these synthetic fixtures into a tester profile. The cloud task has **not** updated the emulator. This is a local development handoff, not production release authorization.

## Earlier compact caption refinement (superseded)

At the owner’s request, all DNA explanatory copy now opens from adjacent information icons rather than filling the screen. Essential counts and evidence sources stay visible. The controls have 48-point targets, distinct spoken labels and expanded state; help follows the label in reading order. Trend text still names the specific pattern. Independent UX re-review of light/dark, large-text, collapsed and help-open views found no remaining blocking issues. The refreshed synthetic screenshot run had zero page errors and no horizontal overflow. A regression test verifies help is hidden initially and opens/closes on demand.

Android export and cloud-OFF/size guards passed again (11,851,499-byte bundle). This is a UI-only refinement; no analytics, progress or cloud behavior changed.

Compact-caption verification: `npm run check` passed with 357 suites / 7,279 tests, 2 existing skips; the focused disclosure tests also passed (5/5).

## One-icon reviewer recommendation implemented

Both UI and content reviewers recommended one information control, not one per label. The journal now uses the existing `FeatureInfo` sheet for all methodology and definitions, with a visible coaching cue, explicit 28-day window and exact supporting count. Expanded evidence keeps source labels, classified/unclassified coverage and named 14-day trends. Redundant tagged totals and percentage text are removed from the default view; bar shares and spoken percentages retain explicit denominators.

Current main `5e3fad1` was merged into this feature branch. The generated cloud bundle was regenerated and the shared role-drill test retains main’s Role Check display name while expecting the new DNA heading. The Concept Lab and release configuration receive no feature-PR edits. UI/content re-reviews are clear; the help-sheet screenshot now waits for the transition to finish and uses Asia/Manila browser time. Native emulator access remains unavailable in this cloud workspace.

Latest-main one-icon verification: `npm run check` passed (361 suites; 7,167 tests passed, 2 existing skips). Repository health, Android export, cloud-OFF guard, release-channel/shared-source guards and size budgets passed. Current Android bundle: 11,357,548 bytes (11.36 MB of 14 MB); the changed baseline includes main’s UI cleanup. Focused help/journal tests passed; screenshots have zero page errors. No Learn, Lab, app.json or EAS differences relative to current main.
