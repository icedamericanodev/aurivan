# Opt-in sample question pack foundation

Status (25 Nov 2026): **used by the first public Android release (2.3)**
through the EAS profile `public-sample`, which fails closed (see
`docs/mobile/RELEASE_2_3.md`, "How the public build fails closed"). Closed
testers keep the full bank through a paired, higher-coded bundle on their
closed tracks instead of accounts. This still does not turn on accounts,
payments, verified-email tester grants, protected pack downloads or a paywall;
the "Required before public launch" list below is now the list for the paid
release and for retiring the paired tester bundle.

Earlier status: development/CI only.

## Every course has its own sample (28 Nov 2026)

Owner decision (28 Nov 2026, `docs/WEB_LAUNCH_PLAN.md` stream D): each new
course ships a public free sample, and the full course goes only to the Alpha
testers, exactly as CISA does since 2.3. The first step covers **CRISC and
AAIA**; CC and CSOE come next, CIA stays out.

| Course | Sample list | Sample rule (its own plan) | Size today (per domain) |
|---|---|---|---|
| CISA | `data/free/cisa_sample_ids.json` | 20%, every notes subtopic, the first five pinned | 278 (58 / 48 / 35 / 65 / 72) |
| CRISC | `data/free/crisc_sample_ids.json` | 10%, never fewer than 100, every outline area (43), the 50-item mini mock (13 / 11 / 16 / 10) fits; the fill prefers notes subtopics with nothing free yet (98 of 115 covered after the review swaps) | 100 (26 / 22 / 32 / 20) |
| AAIA | `data/free/aaia_sample_ids.json` | 20%, never fewer than 100, every notes subtopic (52), 25 / 50 / 25 difficulty, about 20% of each outline area (13 or 14 each after the review swaps), the 30-item short mock (10 / 14 / 6) and diagnostic (10 / 13 / 7) fit | 200 (66 / 92 / 42) |

All three lists come from `scripts/build_free_sample.py` (each course's rules
are in its `COURSES` entry), and each list only grows: `--check`, run by
`scripts/verify_repo.sh`, fails if an id would disappear. CRISC and AAIA also
balance answer letters. CISA's files are unchanged byte for byte.

- **Website:** CISA only. `scripts/build_site.sh` publishes only
  `data/free/cisa_d1..5.json`, and a guard stops the build if any other
  course's question id or `data/free/` file reaches `_site/`.
- **Phone, full build** (`production` profile, Alpha testers): the full CISA,
  CRISC and AAIA courses.
- **Phone, public build** (`public-sample` profile): each course's sample
  only. `mobile/scripts/sample-content.mjs` lists the courses with a
  reviewed sample (`SAMPLE_COURSES`); a course in the content build without
  one stops a sample build. `audit-public-aab.mjs` checks every bundled
  course: all its free questions present (id and stem), no paid id or stem,
  and no CC, CSOE or CIA id at all.
- **Still parked:** CRISC and AAIA stay `coming_soon` in
  `mobile/src/content/certifications.ts`. The content loader treats a
  `coming_soon` course whose only content is the bundled one as not on the
  phone (`hasContent`), so a restored or synced choice of CRISC keeps studying
  CISA and a backup keeps its CRISC progress untouched, exactly as before.

**Switching a course on later** is one line, `status: 'available'` in
`certifications.ts`, in a phone release, after:
1. The course's store listing, title and trademark wording are checked
   (`app-store-compliance-reviewer`).
2. The `TO VERIFY` note on CRISC's domain names is cleared.
3. Its free mini mock and diagnostic draw only from the sample (CRISC plan
   section 7, item 2).
4. **A full mock in the public build draws only from the sample.** CRISC's
   sample is 100, smaller than its 150-item exam; AAIA's is 200 against 90.
   Decide what a free learner gets instead of a full CRISC mock (the 50-item
   mini mock, labelled as such, as the plans say) and test it on the public
   build.
5. **The notes subtopics with no free question** are handled: 17 of CRISC's
   115 have none (every outline area has at least one), so their "Practice
   this concept" link is empty in the public build. Either add a free item
   for each (the list may grow) or check the empty state reads well. AAIA
   covers all 52.
6. The Play release notes and the release tracker say so.

**The samples were read before they were committed (28 Nov 2026).** The
builder picks by coverage, difficulty, answer letters and a fixed hash, not
"best reviewed first" as both plans ask (no field records review quality).
So the content auditors read every picked item before the lists first went
to main: 6 CRISC items and 20 AAIA items were swapped for stronger ones (the
AAIA swaps also even out its outline areas), and seven CRISC wordings were
tidied. A swap at that stage was simply an edit of the list in the same pull
request, because no list was on main yet.

**After a list is on main it only grows.** The builder keeps every id main
already has, so deleting an id from the committed file does not remove it
(the next build puts it back). Even before a course is switched on, a swap
then needs a deliberate, owner-approved change to that rule for that one
course and id; nothing in the builder allows it today. Adding ids is always
fine. A later course should get its auditors' read before its list first
merges (see the "best-reviewed first" follow-up in `docs/WEB_LAUNCH_PLAN.md`).

**Mobile CI** builds the public-sample content, exports Android as the store
build does, runs `audit-public-aab.mjs` on that export (it must PASS), then
rebuilds the full tree for the remaining steps. The audit also fails when any
paid stem can't be checked (under 40 characters, or inside a free stem), and
prints how many paid CISA ids sit only inside a CRISC or AAIA id (those are
checked by their stems).

**Bundle size:** the testers' Android bundle is 17.08 MB with the three full
courses (about 11.4 MB with CISA alone); the public bundle, samples only, is
10.77 MB. The bundle budget went from 14 MB to 20 MB
(`mobile/scripts/check-size-budget.mjs`). CC and CSOE in full would pass it:
by then the testers' full courses should move to downloadable packs.

## What changes

The default `npm run content` and postinstall still build the full question
banks (CISA, and since 28 Nov 2026 CRISC and AAIA). No EAS profiles, update channels, website defaults or installed
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

Each course's additive `data/free/<cert>_sample_ids.json` is the sole
selection list for that course (CISA, CRISC, AAIA). The generator validates every original source link before filtering,
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
