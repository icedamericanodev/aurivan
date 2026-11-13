# Android 2.1 release tracker

Owner requirement recorded 9 Nov 2026: the next Android App Bundle must have version name **2.1**, include every completed change from this development cycle plus changes completed before the build, and use a version code greater than the last uploaded build. Update this inventory after every completed change and reconcile it at build freeze. This is a development tracker, not a declaration that a release has shipped.

## Included in the integrated review workspace

| Change | Source checkpoint | State |
|---|---|---|
| Optional local onboarding nickname | PR #234, ba1147c | Integrated; native keyboard and screen-reader checks pending |
| All answer options beside explanations | PR #235, cb66b30 | Integrated; original-letter mapping tests passed |
| Coach me question text readability | PR #236, fbe2eea | Integrated; native high-contrast matrix pending |
| Opt-in sample pack safeguards | PR #233, fb42de3 | Integrated; full beta content remains the default |
| Deterministic badge geometry | babf4be | Integrated; full-suite badge check passed; visual comparison pending |
| Unified support and feedback | cd977573 | Integrated with review fixes; email/share retained; direct send disabled |
| Restore signed-in public feature suggestion route | Live integration review | Implemented with cloud-enabled regression test |
| Show exact direct-send message separately from fitted email preview | Live integration review | Implemented; transport activation still blocked on backend |
| Build-tool security update: minimatch to 11.0.8 (Dependabot alert #11, a moderate denial-of-service in a build and test tool, not app code) | npm override in `mobile/package.json` | Implemented; `npm run check` passed (7,143 tests), Expo fingerprint and Android export passed |

## Work in progress

- FB-005: explicit Android folder-picker backup save implemented alongside sharing; 32 focused tests and independent review passed. Native folder-picker opening and cancellation verified on the Android emulator; local Documents provider write/restore acceptance passed on the isolated Android emulator; no real files created or overwritten.

- FB-004: scoped durable reset and onboarding return implemented; cancellation, confirmation, restart, failure, duplicate-action and unrelated-data tests passed. Independent review clear; integrated check and Android export passed. No emulator progress was reset.

## Fixed after learner reports

Draft release notes; retain this exact section heading separately from other improvements. Do not name reporters. Promote each entry only after its acceptance checks pass.

- **Reset CISA:** Learners expected setup after a reset. Confirmed resets now save the scoped fresh start before returning to onboarding; unrelated exams/accounts remain.
- **Android backups:** Learners could only find sharing destinations. A separate folder picker now saves and verifies a new backup file while preserving sharing.
- **Answer explanations:** Learners reported having to remember missing answer options. The answer and mock-review screens now keep each option beside its explanation.
- **Nickname setup:** Learners reported having to search for username setup. The existing setup screen now offers an optional local nickname; this does not introduce accounts or sign-in.
- **Coach me readability:** Learners reported that question text became unreadable after opening Coach me. The duplicate question layer was removed so the question uses one readable text layer. Native high-contrast verification remains pending.

The verified anonymous entries are now bundled in `mobile/src/content/support/fixes.json` for the integrated 2.1 preview. They describe implemented changes, not completed native acceptance or a published release. Keep tester-log entries In review until shipment; do not claim inbox delivery or that a release has shipped.

## Required bundle handoff gates

- [ ] Reconcile this inventory against completed commits, open PRs and later fixes; record the final immutable build commit.
- [ ] Finish review/test/fix loop, CI, native smoke, high-contrast, large text, keyboard and accessibility checks; attach native light/dark evidence.
- [ ] Resolve exact version-name handling: development currently uses `2.1.0`; requested AAB version name is exactly `2.1`. The support/backup parser currently requires three components. Preserve backup/report upgrade safety while preparing the exact store version; test old and new saves.
- [ ] Read the highest previously uploaded version code from Play Console/authorized release evidence; record code, source and time. Currently **not verified**.
- [ ] Build from the frozen intended commit. EAS remote versioning and autoIncrement are configured, but are not proof of a greater uploaded code.
- [ ] Download and inspect the actual `.aab` manifest: versionName **2.1** and versionCode strictly above the recorded uploaded maximum. Record bundle hash, build ID, commit, versionName and versionCode.
- [ ] Verify intended changes in the artifact/build provenance and install a matching bundle-derived test build for smoke checks without clearing existing learner data.
- [ ] Complete release notes including the separate section above, with confirmed feedback fixes only.
- [ ] Verify production flags, full content/entitlements and upgrade safety; do not switch public builds to sample-only or enable unconfigured private support.
- [ ] Confirm required authorization before publishing/uploading a Play release. No release was built or published by this integration task.

## Pending foundations

Private support backend is not implemented or deployed. Real anti-abuse, durable idempotency and transactional mail adapters, privacy review and end-to-end acceptance evidence are required before enabling it. Recipient remains certprep.support@gmail.com. Provider acceptance is not proof of inbox delivery.

Original checkout staged edits and all source worktrees remain preserved. The emulator uses the dedicated live workspace on Metro port 8082; the original port 8081 server must not be stopped.

## Reset and backup verification checkpoint · 2026-11-09

- `npm run check`: 355 suites passed; 7,250 tests passed, 2 skipped. Lint, typecheck and generated asset checks passed. Jest reported a worker teardown warning; no failed tests.
- Android export passed (`/tmp/kaisip-resumed-android`). Export is not a signed AAB or a Play release.
- Native Android review: Your data shows the separate local-save and share actions and scoped reset explanation. Folder picker opens device storage; Android requires a subfolder instead of the storage root. Cancelling returns “Save cancelled — No backup was saved. Your progress is unchanged.”
- No native reset, provider write or restore was performed against the owner’s data. Reset/persistence/restart and backup roundtrip/failures are covered by isolated regression tests; native destructive acceptance remains outstanding.
- Native screenshots: `review-evidence/native-your-data-final.png`, `review-evidence/native-backup-picker.png`, `review-evidence/native-backup-cancelled.png` in the Codex task documents directory. Dedicated Metro port 8082 is running for interactive review.

## Isolated native acceptance · 2026-11-09

Completed against commit `f4a99e3` on a newly created blank `KaiSip_Acceptance` AVD (`emulator-5556`), separate from the owner’s `emulator-5554`. AVD files are under `/tmp/kaisip-native-acceptance/avd`. Only the installed APK was copied; no owner app data or files were copied. Both use the live Metro workspace on port 8082.

- Onboarded a synthetic learner named Acceptance and recorded one correct practice answer (`d1_002`).
- Saved through Android’s folder picker into the blank emulator’s Documents folder. Native UI reported the backup was written and checked. Pulled the resulting JSON and verified the nickname and one answer were present.
- Confirmed CISA reset on this disposable data. App returned to onboarding. Force-stopped and reopened only the isolated app: onboarding remained. Read the isolated persisted store: `onboarded:false`, CISA answers empty, paused session null, nickname retained.
- Opened the saved file through the native restore picker. Preview correctly showed zero current questions versus one backup question. Confirmed restore: Home greeted Acceptance and showed one answer. Persisted restored answer records exactly matched the native saved JSON; `onboarded:true`.
- Visually inspected saved, post-restart onboarding, and restored screenshots. Evidence is in the Codex task `review-evidence/isolated-native-{saved,reset,restart,restore-preview,restored}.png`.
- Owner progress and existing files were not modified. No code changes were needed; prior full checks (355 suites, 7,250 passed, 2 skipped) and Android export remain applicable. This verifies the local Android Documents provider; external/cloud providers, Samsung-specific accessibility, and the other release gates remain separate. No AAB built or release published.

## Integrated PR review · 2026-11-09

PR #238 reconciles #233–236 into one 2.1 integration and retains main's already-merged Beta Desk #232. Source drafts are to be closed as superseded only after integration merges; their branches remain preserved. Independent QA/UX/security review found no blocking implementation issue with default full content and direct support disabled.

Pre-fix integration `9699a5b`: repository health, 19 web smoke journeys (2 public-site-only W10 cases not tested), 8 mobile browser journeys, typecheck and lint passed. A parallel backup UI timeout passed unchanged in isolation; full serial tests passed (355 suites, 7,250 passed, 2 skipped), followed by the generated asset guard. No assertions or timeouts were weakened.

Native Coach me evidence on the isolated emulator: readable single question layer in high-contrast light at normal size and dark at 200% text; options reachable by scrolling; coached answer and next-question transition worked. Screenshots: `review-evidence/native-coach-highcontrast-light.png` and `native-coach-highcontrast-dark-200.png` in the Codex task directory. Samsung-specific and TalkBack/VoiceOver acceptance remain separate release checks.

Native testing exposed an existing deprecated numeric-tag focus warning after display configuration changes. The shared focus helper and Coach effect now use React Native's host-instance focus API with cancellation on cleanup. Independent parent diff review found no blocker; six targeted suites (99 tests) and typecheck passed. Repeating Coach me and display changes on the patched emulator showed no warning. Final integrated gates must pass on this added change before merge.

Final application source at `79aa9c5`: typecheck, lint, 355 suites / 7,255 tests (2 skipped), generated assets and Android export passed. Earlier Linux CI passed both full test modes but hit the 25-minute job limit during the OFF bundle export (run 42603397651). The bounded job allowance is raised to 40 minutes; no tests or bundle/security/size guards are removed. Final remote checks remain required before merge.
