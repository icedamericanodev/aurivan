# Web launch, accounts and the next courses: plan

**Started:** 28 Nov 2026, after the first public Android release (2.3, 26 Nov).
**Owner's goal:** introduce the KaiSip website version with sign-in and
progress that syncs between the web and the Android app, then launch on the
Apple App Store. In parallel, prepare the other courses (CRISC, AAIA, CC,
CSOE) to ship, with CIA kept as a placeholder until it is ready.

This plan sits on top of the detailed designs already in the repo:
`docs/mobile/ACCOUNTS_BETA_PLAN.md` (database, security audit, go-live gates,
owner checklist) and `docs/business/monetization/WEB_GATE_PLAN.md` (free
sample, entitlement gate). Read those for the how; this file holds the order
and the owner's decisions.

## Owner decisions (28 Nov 2026)

| Topic | Decision | What it changes |
|---|---|---|
| Sign-in methods | **Google, an emailed code, and email + password** | Reverses the 27 Oct "no passwords" choice. The database guard that wipes passwords (`20261027000100_beta_no_passwords.sql`, the fix for audit finding H1) must be replaced by a narrower guard that still blocks the pre-registration takeover. Needs a password reset flow, password rules, rate limits and a fresh security review before any public sign-in link. |
| Email code length | **8 digits** (confirms the audit's L7 change) | None: already set. Close L7. |
| GitHub Pro | **Owner buys it** | Go-live gate 4 can be met: "Require review from Code Owners" on `main`, and the `ota` and `db-backup` environments enforced again. |
| New courses | **Public free sample; full course for Alpha testers only** (as CISA today) | Each course needs a free sample builder, a pack in the phone app, the public build's sample-only guard and audit extended to it, and the tester build carrying the full course. No payment system is part of this. |
| CIA | **Placeholder until it is done** | Stays out of the apps (expert decision 27 Nov: not until The IIA licence question is settled). The pack pipeline keeps passing its dry run so it can be switched on later. |

## What already exists

- Supabase project (Singapore, Free plan): sync, snapshots, deletion,
  export, Beta Desk. Migrations applied and audited (28 Oct, 4 Nov, 9 Nov).
- Edge Functions `delete-account` and `export-my-data`, deployed.
- Website sync engine `assets/kaisip-cloud.js`, compiled from the phone app's
  own TypeScript (`mobile/src/webcloud/`), so both apps sync with the same
  rules.
- Nightly encrypted backups to Cloudflare R2.
- The web study app already loads only the free CISA sample (web v12.50+),
  and is built at a hidden preview path under the home page.
- Course content: CRISC 1,000, AAIA 1,000, CC 1,000 and CSOE 392 questions,
  each with notes, principles, an exam guide and a final review week. CIA
  Part 1 meets its gate; Parts 2 and 3 do not yet.

## Work streams and order

Each step is one or more pull requests, reviewed and merged by the usual
loop. Nothing goes public until its gate says so.

### A. Accounts with passwords (design first)
1. Security design for email + password on top of the existing setup:
   replace the H1 guard, password reset, password rules, leaked-password
   check, rate limits, Google linking, the "set a password later" path.
   Reviewed by `backend-architect` and `mobile-security-auditor`.
2. Migration for the new guard, with tests (local Postgres) and the
   `cloud_smoke.sh` probes updated; applied through the Supabase MCP after
   the PR is green.
3. Add password sign-in, sign-up and reset to the shared TypeScript sign-in
   client (`mobile/src/webcloud/`), so web and phone use one implementation.

### B. Website version with sign-in and sync (web v14, MAJOR)
1. `index.html`: sign-in screen (Google, emailed code, email + password,
   forgot password), the Account section (status, Sync now, Download my
   data, Delete synced progress, Delete account, sign out), first-sync
   preview and undo, Terms and 16+.
2. New pages: `delete-account.html`, `human-check.html` (Turnstile); CSP and
   `_headers` updates; `build_site.sh` publishes them.
3. Where the study app lives on kaisip.com (keep the home page at `/` and
   the app at a short path) is a step-4 decision for the experts.
4. Stays behind the `ACCOUNTS_ON` switch (preview only) until every go-live
   gate is ticked.

### C. Android 2.4 with sign-in and sync
1. Supabase adapters, the sign-in and account screens, in-app account
   deletion, the human check, release config.
2. Privacy policy, Terms, Play Data safety ("No data collected" no longer
   true once sync is on), IARC and listing updates. Checked by
   `app-store-compliance-reviewer`.
3. Two bundles as from 2.3 (public sample, Alpha full).

### D. Course packs (runs in parallel with A to C)
1. Generalise the free sample builder to every course (CRISC, AAIA, CC,
   CSOE), keeping each course's own sample rules.
2. Add each course to the phone app's pack builder; the public build bundles
   only the samples, the tester build the full courses; extend
   `audit-public-aab.mjs` and the build guards to every course.
3. Course gaps the survey found: CC and CSOE entries in
   `certifications.ts`; glossaries for CC and CSOE; dry runs for CC and
   CSOE; CSOE's forward-only mock; CRISC's five sale items in its plan §7
   that also apply to a free sample.
4. Switch each course on in a phone release once its sample and tests pass.
   The store listing, title and trademark wording are checked before any
   course besides CISA is offered publicly.
5. The website course switcher comes after the phone app (web is CISA-only
   today).

### E. Apple App Store
After the website and Android 2.4. Needs an Apple Developer account
(US$99 a year, owner), Sign in with Apple (required by Apple when Google
sign-in is offered), and the iOS build and review.

## Go-live gates

Public sign-in waits for every gate in `docs/mobile/ACCOUNTS_BETA_PLAN.md`
("Go-live gates", 1 to 12), plus:

- 13. Password sign-in reviewed: the new guard's tests pass and the
  security auditor finds no HIGH issue.
- 14. Password reset emails come from our own sender (not Supabase's
  default), with the template text in `docs/mobile/AUTH_EMAIL_TEMPLATES.md`.

## Owner checklist for this plan (only you can do these)

1. Buy GitHub Pro, then turn on "Require review from Code Owners" on `main`
   (gate 4). Recreate the `ota` and `db-backup` environments.
2. The remaining items in `ACCOUNTS_BETA_PLAN.md` section 9 (Supabase
   settings, Turnstile, the restore drill, go-live day).
3. When the password design is ready: switch on the Email provider's
   password option in Supabase with the settings it lists.
4. Later: Apple Developer account for stream E.
