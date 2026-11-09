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

## Work in progress

- FB-005: explicit Android folder-picker backup save implemented alongside sharing; 32 focused tests and independent review passed. Native folder-picker opening and cancellation verified on the Android emulator; actual provider write/restore acceptance remains pending; no real files created or overwritten.

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
