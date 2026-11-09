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

## Fixed after learner reports

Draft release notes; retain this exact section heading separately from other improvements. Do not name reporters. Promote each entry only after its acceptance checks pass.

- **Answer explanations:** Learners reported having to remember missing answer options. The answer and mock-review screens now keep each option beside its explanation.
- **Nickname setup:** Learners reported having to search for username setup. The existing setup screen now offers an optional local nickname; this does not introduce accounts or sign-in.
- **Coach me readability:** Learners reported that question text became unreadable after opening Coach me. The duplicate question layer was removed so the question uses one readable text layer. Native high-contrast verification remains pending.

The three anonymous entries are now bundled in `mobile/src/content/support/fixes.json` for the integrated 2.1 preview. They describe implemented changes, not completed native acceptance or a published release. Keep tester-log entries In review until shipment; do not claim inbox delivery or that a release has shipped.

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
