# Android 2.3 release tracker: the first public release

Version name **2.3** (owner, 25 Nov 2026). Google granted production access on
25 Nov 2026. The same app code ships as **two bundles**:

| Bundle | EAS profile | Questions | Version code | Goes to |
|---|---|---|---|---|
| Public | `public-sample` | free CISA sample only (`data/free/cisa_sample_ids.json`) | 5 | Production |
| Closed testers | `production` | full CISA bank | 6 | "Testers Community" and "Alpha" closed tracks |

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

1. Upload the **tester** bundle (code 6) to both closed tracks and roll it out
   there, in the same countries as production. Wait until Play shows it live
   on the closed tracks.
2. Only then create the production release with the **public** bundle
   (code 5), using the release notes below.
3. On a tester's phone, check it updates to code 6 and keeps the full bank.

## Built bundles

Filled in after the builds (build id, commit, SHA-256, manifest values, audit).

## Release checks

Filled in from the candidate's tests.

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
