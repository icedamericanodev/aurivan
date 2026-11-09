# Mistake DNA review evidence

Synthetic QA data only. Screenshots are browser renderings at 393 × 852; enlarged-text views simulate larger text and do not certify native Android accessibility.

- `light-journal.png`, `dark-journal.png`: integrated journal summary and existing remediation.
- `light-evidence.png`, `dark-evidence.png`: provenance and overlapping percentages.
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
- Cloud-enabled full regression: running separately; final outcome will be added before owner handoff.
- Native Android acceptance remains pending because `adb` is unavailable. Browser screenshots and render tests do not replace TalkBack/real font-scale testing. Repository pa11y was skipped because its optional website server was not running; this feature does not edit website markup.

Android export is a local compilation check only; no Android package was built, uploaded or released.

## Exact changed files

- `assets/kaisip-cloud.js`
- `design-notes/mistake-dna/README.md`
- `design-notes/mistake-dna/dark-empty.png`
- `design-notes/mistake-dna/dark-evidence.png`
- `design-notes/mistake-dna/dark-journal.png`
- `design-notes/mistake-dna/dark-large-text.png`
- `design-notes/mistake-dna/dark-trend.png`
- `design-notes/mistake-dna/light-empty.png`
- `design-notes/mistake-dna/light-evidence.png`
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
