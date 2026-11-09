# Opt-in sample question pack foundation

Status: development/CI only. **Do not publish or enable it in an EAS build or
update channel yet.** This change does not turn on accounts, payments,
verified-email tester grants, protected pack downloads, or a premium paywall.
It does not make a sample-only public mobile release ready.

## What changes

The default `npm run content` and postinstall still build the full CISA
question bank. No EAS profiles, update channels, website defaults or installed
beta builds change. The website already has its own free-sample builder.

For an isolated local review checkout, from the repository root:

```sh
KAISIP_QUESTION_PACK=sample node mobile/scripts/build-content.mjs
node mobile/scripts/sample-content.mjs
# Restore the existing closed-testing content after review:
node mobile/scripts/build-content.mjs
# Regression suite restores full output even after a failed assertion:
node --test mobile/scripts/check-sample-content.mjs
```

`KAISIP_QUESTION_PACK` accepts only `full` (default) or `sample`. It is a
build-time choice, not a client feature flag or an entitlement. Never reuse
one generated tree across different release jobs. A later plain install or
content build intentionally restores the full bank; rerun the explicit sample
build and guard immediately before any sample export. Existing release
workflows remain full-bank workflows.

The existing additive `data/free/cisa_sample_ids.json` is the sole selection
list. The generator validates every original source link before filtering,
so narrowing the sample cannot hide bad authoring. It then removes
non-sample questions and narrows only known question-link fields:
`practiceIds` in notes/principles and `prepares` in lessons. Study notes,
lessons (including their own teaching checks), glossary terms, games,
principles and exam guidance remain available unchanged otherwise. This is
**a question-bank sample**, not a paid-study-suite packaging policy.

The generated directory is rebuilt in a hidden staging directory and atomically
published only after validation, preventing stale full-domain or
additional-cert files from surviving. The final generated import path is removed before a sample build starts.
Failure or interruption cannot leave intermediate full content there; a hard
kill may leave an ignored hidden staging directory, which is not imported.
Unknown certification packs require an explicit implementation and manifest;
they are not silently included in sample mode.

## Checks and limits

Mobile CI runs dependency-free integration tests before its existing full-pack
checks. Tests exercise real source data, deterministic sample generation,
full-to-sample-to-full restoration, stale files, missing/duplicate/unknown
manifest entries, empty domain samples, a manifest containing the entire bank,
unknown mode values, failed sample builds, extra directories/files, symlinks,
and leaked question references/stems.

The generated-tree guard checks exact ordered domain membership and rejects
unexpected files, symlinks, known non-sample question IDs and verbatim
non-sample stems of at least 40 characters. It is deliberately **not** a proof
that arbitrary premium content cannot leak. It does not inspect other app
source imports, compressed/encoded text, a signed APK/AAB/IPA, OTA payloads,
remote downloads or previously cached full packs. Notes and lessons can teach
the same facts as paid questions. It is not a DRM mechanism.

## Required before public launch

1. Implement and test real authenticated identity and server-side tester
   entitlements. A Gmail list alone must not unlock content on a device. Do
   not put tester emails or grants in the app bundle or repository.
2. Agree which premium packs/features testers retain, for how long, and the
   recovery/revocation behavior. Preserve existing saved progress keys.
3. Implement authorized delivery of full packs and a safe offline policy.
   Separate sample/full cache identity, entitlement checks and revision rules;
   the current pack revision alone does not distinguish these variants.
4. Test the reduced-bank experience: mock length, readiness, onboarding,
   progress/history/bookmarks for omitted questions, resume, and interrupted
   entitlement/download flows. Do not remove tester access before recovery
   and migration are verified.
5. Add fail-closed release-channel configuration, public build/OTA gates and
   inspections of actual exported/signed artifacts. Exercise sample builds on
   Android and iOS and full access for invited testers, including reinstall,
   account switching, offline use and cached-pack revocation boundaries.
6. Only then approve a public rollout and release notes/version changes.

This internal tooling change does not bump a learner-facing app version.
