# Android 2.3 release tracker: the first public release

Version name **2.3** (owner, 25 Nov 2026). Google granted production access on
25 Nov 2026. The same app code ships as **two bundles**:

| Bundle | EAS profile | Questions | Version code | Goes to |
|---|---|---|---|---|
| Public | `public-sample` | free CISA sample only (`data/free/cisa_sample_ids.json`) | 5 | Production |
| Closed testers | `production` | full CISA bank | 6 | "Alpha" closed track only (owner, 26 Nov 2026) |

**Never put the full-bank bundle (this one, or 2.2 code 4, or any earlier
store build) on production.** A public APK with the full bank gives it away
(`docs/business/monetization/WEB_GATE_PLAN.md`, Phase 3). The 2.2 advice in
earlier session notes to "promote 2.2 to production" is withdrawn.

## Why two bundles (decision, 25 Nov 2026)

- The public app bundles only the free sample. Billing, accounts and the
  paywall are not built yet and are not part of this release.
- Closed testers were promised 6 months of full CISA access
  (`RECOMMENDATION.md`, "Beta testers' 6 months free"). The store build has no
  accounts or entitlement path, so the promise is kept with Google Play's
  track rule: "Users eligible to receive multiple tracks receive the highest
  version code published across those tracks"
  (support.google.com/googleplay/android-developer/answer/9845334). Testers
  get code 6 (full bank); everyone else gets code 5 (sample). No tester email,
  list or grant is in the app or the repo; the tester lists stay in Play
  Console.
- Experts: `product-manager` chose this over waiting for accounts (option A);
  `app-store-compliance-reviewer`: GO with changes (the listing line now says
  "A free sample of original practice questions"; Data safety stays "No data
  collected" only if both bundles are checked for endpoints).
- Owner decisions: version name 2.3, and build both bundles (25 Nov 2026).
- Owner decision (26 Nov 2026): the full bank goes to the **Alpha** track only.
  "Testers Community" were paid testers for Google's closed-test requirement
  and get no premium access, so that track is not given code 6. Its members
  move to production code 5 (sample) when production goes live, because 5 is
  higher than the 2.2 code 4 still on their track; their saved progress stays.
  The owner may pause that track or empty its tester list in Play Console.

Risks the owner accepts:
- Every public release needs a paired tester bundle with a higher code until
  accounts and entitlements exist. The danger is the full bundle reaching
  production by mistake: the public bundle is audited, and only the owner
  uploads.
- A tester who leaves the testing programme keeps code 6 until a public
  release passes it; that public update then replaces the full bank with the
  sample. Their saved progress stays (history for questions not bundled is
  kept, see the checks below).
- Closed-track bundles can be downloaded by testers, as today.

## How the public build fails closed

- `mobile/scripts/build-content.mjs` (`questionPackMode`): a build is public
  when its EAS profile is `public-sample` or `KAISIP_RELEASE=public`. It must
  also say `KAISIP_RELEASE=public` and `KAISIP_QUESTION_PACK=sample`
  explicitly; a missing, misspelled or `full` value stops it before any
  content is written, and the generated folder is removed first.
- `mobile/app.config.js` (`publicBuildProblem`): the same settings plus
  `KAISIP_STORE_BUILD=1` are required whenever Expo reads the config for the
  public build, and on the EAS build machine (`EAS_BUILD=true`) the generated
  content is checked against the sample list each time, including when the
  JavaScript bundle is made, so a later install or content build can't swap
  the full bank back in.
- `.github/workflows/eas-build.yml`: `public-sample` is a choice; uploading to
  Play from the workflow is refused for it.
- `mobile/scripts/audit-public-aab.mjs`: opens the built .aab and checks that
  every sample question is in it, no paid CISA question id or stem is in it
  (stems searched as UTF-8 and UTF-16), and no id from an unreleased course
  (AAIA, CRISC, CC, CIA, CSOE) is in it. Six paid ids appear in app code on
  purpose, with no question text (`CODE_REFERENCES`, listed with reasons).
  Proven on the 2.2 full bundle: it fails with every paid question found.
- The free sample now always includes the phone's "first five" questions
  (`scripts/build_free_sample.py`, pinned; a mobile test checks the two lists
  match). Three of them were missing, so a fresh public install would have
  opened missing questions. The free list only grows: 275 → 278.
- The `production` profile is unchanged and still builds the full bank.

## Build order (Claude)

EAS keeps one version-code counter for every profile (`appVersionSource:
remote`, `autoIncrement`). Build **`public-sample` first, then `production`**,
so the testers' bundle gets the higher code. A retried or failed public build
also takes a number, so before handoff read both codes from the .aab files
themselves and check **tester code > public code**. If not, rebuild the tester
bundle; never hand over a pair where the public code is higher, because Play
would then give testers the sample.

## Play Console order (owner)

1. Upload the **tester** bundle (code 6) to the **Alpha** closed track only
   and roll it out there, in the same countries as production. Wait until Play
   shows it live. Do not add it to "Testers Community" (owner, 26 Nov 2026).
2. Only then create the production release with the **public** bundle
   (code 5), using the release notes below.
3. On an Alpha tester's phone, check it updates to code 6 and keeps the full
   bank.
4. Optional: once production is live, pause "Testers Community" or empty its
   tester list, so 2.2 (code 4, full bank) is no longer offered on that track.

## Built bundles

Both built from commit `4f7b3aaff2cecf16fd000634b37b972ab3758676` (main after
#315) on 25 Nov 2026. Package `com.kaisip.app`, version name 2.3. Values below
were read from the .aab files themselves, not from EAS.

| | Public (production) | Closed testers |
|---|---|---|
| EAS profile | `public-sample` | `production` |
| EAS build id | `af41784e-ed9d-4ae3-950c-829cae666d2c` | `df806044-dae2-4664-82ad-ceb3be10450e` |
| versionCode (manifest) | **5** | **6** |
| Size | 71,510,297 bytes | 72,306,071 bytes |
| SHA-256 | `03429fdf222c2e0867a6f04bb64ecf1050530624bfeb5f215a5cf70fec07dfbd` | `b98b2ffef1e197d546659f627028782f6dde1ebc0c09ed560dee6ce8459dd760` |
| Upload certificate SHA-256 | `BE:8B:DA:41:…:93:09:E4:9C` (same as 2.1 and 2.2) | same |
| targetSdk | 36 | 36 |
| OTA updates (embedded config) | off | off |
| Permissions and services | identical to 2.2 | identical to 2.2 |
| Tablet setting (`screen.portrait` not required) | yes | yes |
| `audit-public-aab.mjs` | **PASS**: 278/278 sample, 0 paid ids (6 known code references, no text), 0/1001 paid stems, 0/3621 unreleased-course ids, no server addresses | **FAIL as expected** (full bank): 278/278 sample, 995 paid ids, 1001/1001 paid stems, 0/3621 unreleased-course ids, no server addresses |

Tester code 6 > public code 5: PASS. A whole-.aab scan of the public bundle
(all 1,207 files, not only the JavaScript bundle) found no paid stem.

The .aab files are not in the repo (they were handed to the owner directly).

## Release checks

Local tests used the Expo web export of the same commit at phone size
(Chromium), plus the gates below. No Android phone and no Play-signed install
were available to Claude.

| Check | Result |
|---|---|
| `npm run check`, cloud-mode jest, sample-content tests, release-config check, `verify_repo.sh` | PASS |
| Public build refuses missing, misspelled or `full` settings (tests) | PASS |
| Public .aab carries only the free sample (audit above) | PASS |
| Tester .aab carries the full bank, no unreleased course | PASS |
| No sync, analytics or crash-report server in either bundle (Data safety "No data collected") | PASS |
| Version codes: tester 6 > public 5 | PASS |
| Same upload key, permissions, services, targetSdk 36, OTA off | PASS |
| Fresh guest on the public build: first five, practice, full 150-question mock, mini mock, notes, journal, You, Settings | PASS (web export) |
| Upgrade from a full-bank save to the public build: no saved keys removed, review skips missing questions, past mocks open | PASS (web export) |
| Unfinished mock with questions no longer bundled resumes and scores only the remaining ones | PASS (web export, after the fix in #315) |
| Saved-question count counts only questions in the build | PASS (web export) |
| Backup export and restore | NOT TESTED |
| Real "Submit exam" tap on a full mock (time-out scoring was tested) | NOT TESTED |
| Dark mode on the public build | NOT TESTED |
| Native Android device (either bundle) | NOT TESTED |
| In-place upgrade of a real Play-signed closed install (2.2 code 4 → 2.3 code 6) keeps progress and the full bank | NOT TESTED: needs Play Console (owner, step 3 above) |
| Play pre-launch report | NOT TESTED: runs after upload (owner) |

Known, not changed (product call): when a learner finishes every free question
in a domain, practice repeats questions without saying the sample has ended.

## Play release notes

Production (code 5):

```
Welcome to KaiSip: calm practice for the CISA® exam.
• A free sample of original practice questions, with an explanation for every option
• A daily study plan, study notes and a mistake journal
• Mock exams weighted like the CISA exam
• Works offline. No account, no ads.
Spot something wrong? Report it from any question.
```

Closed testers (code 6):

```
What's new in 2.3
• The drill on Play, the final review week and the reminders before your exam now follow your mistake journal's recent pattern.
• You keep the full question bank as a tester.
```
