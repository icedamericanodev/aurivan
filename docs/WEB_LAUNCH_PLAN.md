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
| Sign-in methods | **Google, and email + password** (owner, 28 Nov 2026, second decision). Emailed 8-digit codes are kept only to confirm an email address and for "Forgot password", and both always end with setting a password | NIST SP 800-63B-4 §3.1.3: "Email SHALL NOT be used for out-of-band authentication"; confirmation and issued recovery codes (§4.2.1.2) are allowed. Reverses the 27 Oct "no passwords" choice: the wipe-all guard (`20261027000100_beta_no_passwords.sql`, the H1 fix) is replaced by `20261128000000_password_guard.sql`. A code session is a full session in GoTrue, so the apps force "set a password" after any code session; a server rule that limits learner data to password or Google sessions is a planned follow-up (design audit, "Audit alignment") |
| Supabase plan | **Free for now** (owner: see how many learners sign up first) | Alternatives on Free, written up as documented deviations for audit: the 30-day sign-in expiry is enforced on the server by a nightly job that deletes sessions older than 30 days; predictable passwords are refused by the apps (structural rules and bundled lists, which only a learner bypassing the app for their own account could skip; they miss phrases and names that are on no list, see "What the password rules cannot do" below); Supabase's own leaked-password check is a Pro feature, so the apps run their own lookup instead (Have I Been Pwned's range API, ON since the later decision the same day; "Leaked-password check" below); the 100-wrong-tries account limit is replaced by the human check on every password sign-in, per-IP limits, 15 characters and monitoring. **Upgrade to Pro before the paid launch** (already required by `WEB_GATE_PLAN.md`), or earlier if the deviation register's trigger is hit |
| Email code length | **8 digits** (confirms the audit's L7 change) | None: already set. Close L7. |
| GitHub Pro | **Owner buys it** | Go-live gate 4 can be met: "Require review from Code Owners" on `main`, and the `ota` and `db-backup` environments enforced again. |
| New courses | **Public free sample; full course for Alpha testers only** (as CISA today) | Each course needs a free sample builder, a pack in the phone app, the public build's sample-only guard and audit extended to it, and the tester build carrying the full course. No payment system is part of this. |
| Password rules | **At least 15 characters, no required character types** (NIST SP 800-63B rev 4) | Dashboard setting (checklist below); `supabase/config.toml` mirrors it |
| Common passwords | **Client-side blocklist required** (common passwords, the email's name part, "kaisip", "cisa", "isaca", repeats and sequences) | Step A3 (`mobile/src/engine/passwordRules.ts`, shared by web and phone) |
| "Password changed" notice | **Hard go-live gate** (gate 15) | If the Free plan with custom SMTP can't send it, passwords wait for an in-app "password changed on <date>" notice instead |
| Android human check | **Shown on each password sign-in** (the same browser sheet as email codes) | Accepted (design R6); an in-app web view later only if it hurts sign-ins |
| Leaked-password lookup | **No third-party lookup for now** (no HIBP range check from the apps; Pro's server check is not on Free). **Reversed later the same day: the apps' own range lookup is ON** ("Leaked-password check" below) | Listed risk R2; the Pro upgrade path stays open |
| CIA | **Placeholder until it is done** | Stays out of the apps (expert decision 27 Nov: not until The IIA licence question is settled). The pack pipeline keeps passing its dry run so it can be switched on later. |

## Owner decisions (28 Nov 2026, later the same day)

| Topic | Decision |
|---|---|
| Web design | Direction A, "Grove Atelier" (Grove, elevated), with joined code cells and tick marks; **one design across the website, Android and iPhone**. It ships to existing Android users in 2.4 |
| Common passwords | "Apply the password security standard and reject all common passwords": the whole password is compared (NIST SP 800-63B-4 3.1.1.2), against a common-password list, patterns (repeats, sequences, keyboard walks, years), the service's own words and the learner's email and name. Normal phrases pass. What this can and cannot reach, measured: "What the password rules cannot do" below |
| Idle sign-in | A sign-in unused for 14 days ends, on top of the 30-day limit (the owner's checklist asked for an idle timeout) |
| Sign-up for new learners | A step of onboarding on every platform, shown as **optional**, explaining that an account lets them study on the website too and keeps progress in sync; "Continue without an account" stays |
| Existing Android users | 2.4 shows a one-time, dismissible pop-up inviting them to sign in; afterwards an account card on the You tab ("Saved on this phone only", create a free account, sign in). Mockups reviewed by the owner |
| Ratings | 2.4 asks for a Google Play rating with Google's own sheet. Experts' agreed rule (behaviour, compliance, growth, support): celebrate every milestone, ask only at the best ones; first ask after about 7 days and 5 study days; at least 90 days apart, at most 3 a year, once per app version; never on day one, mid-question, after a poor mock, in exam week or where the free questions end. "Rate KaiSip on Google Play" and "Tell us what to improve" are always in the app. No reward, no "do you like it?" question, no request for 5 stars anywhere. Reviews with a problem go into `docs/beta/TESTER_FEEDBACK.md` |
| Android beta | **Closed** (no new testers, no new reward). Existing Alpha testers keep their track and their 6 months. The "Testers Community" tester list is left as it is |
| After the free questions on the web | The Google Play badge to the Android app, and the waitlist for iPhone |

## What already exists

- Supabase project (Singapore, Free plan): sync, snapshots, deletion,
  export, Beta Desk. Migrations applied and audited (28 Oct, 4 Nov, 9 Nov).
- Edge Functions `delete-account` and `export-my-data`, deployed.
- Website sync engine `assets/kaisip-cloud.js`, compiled from the phone app's
  own TypeScript (`mobile/src/webcloud/`), so both apps sync with the same
  rules.
- Nightly encrypted backups to Cloudflare R2.
- The web study app loads only the free CISA sample (web v12.50+). Since
  28 Nov 2026 (web v13.2) it is public at https://kaisip.com/app/ (see
  stream B, step 0).
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
   **Done 28 Nov 2026:** `docs/mobile/PASSWORD_SIGN_IN_DESIGN.md`, audited in
   `docs/mobile/PASSWORD_DESIGN_AUDIT.md` (go with changes: two HIGH, fixed in
   step 2).
2. Migration for the new guard, with tests (local Postgres) and the
   `cloud_smoke.sh` probes updated; applied through the Supabase MCP after
   the PR is green. **Built 28 Nov 2026** (not applied):
   `supabase/migrations/20261128000000_password_guard.sql` (the design's
   guard plus the audit's commit-time check and staff-only authenticator
   apps), `supabase/tests/41_passwords.sql`, `scripts/password_sql_mutants.py`,
   the `cloud_smoke.sh` modes `pre-register` (with `VARIANT`), `password`,
   `binding` and `captcha`.
3. Add password sign-in, sign-up and reset to the shared TypeScript sign-in
   client (`mobile/src/webcloud/`), so web and phone use one implementation.
   **Built 28 Nov 2026** (no screens yet; names as built are in the design's
   §4.3 note): `mobile/src/webcloud/auth.ts` gains the design's methods plus
   `passwordNeeded()` (a code session without a saved password, read from
   the token's sign-in method: no sync, signed out after 10 minutes) and
   `sessionEnded()` (30 days after sign-in, 14 days unused, or a refused
   refresh: signed out with the reason kept across reloads, progress
   untouched). Code sign-in is gone from the public client.
   `mobile/src/engine/passwordRules.ts` follows NIST §3.1.1.2's
   whole-password comparison: 15 code points in NFC and NFKC, at most 72
   bytes (documented deviation for accented text), NFKC sent, control and
   invisible characters refused. The comparison reads accents, invisible
   characters, Cyrillic and Greek look-alikes, letter-for-number swaps (per
   position) and the password backwards. Two kinds of check: structural
   rules (fewer than 10 real characters after repeats, sequences, walks,
   copies, mirrors and years; one word with numbers; mostly the account's own
   words, domain included; a full name with numbers; dates and phone
   numbers), and lists (at most two list entries and 3 word pieces in all,
   with at most 2 characters left over). Lists (lightly scrambled, built by
   `mobile/scripts/build-password-blocklist.mjs` from pinned copies, checked
   in CI): the top 3,000 passwords of 15+ characters (ASVS 6.2.4) in every
   bundle, with the sizes and SHA-256 the lazy lists must match; the top
   100,000 of 4–14 characters (SecLists xato-net, MIT), 19,886 English words
   of 15+ letters (dwyl/english-words, Unlicense) and hand-written lists in
   `mobile/scripts/password-sources/` (clichés and the app's own hints; exam
   and work vocabulary; Filipino; other Asian learners; names) in
   `assets/kaisip-password-words.js`, which the website fetches (with
   `?v=KaiSipCloud.passwordWordsRef`) only when a password form opens. The
   owner reviews the Filipino, names and Asian lists in
   `docs/content/PASSWORD_LIST_FILIPINO.md`. No second ranked password list
   with Asian coverage and a clear licence was found, so none is used.
   Guidance words for every refusal, which describe and never show an
   example. A leaked-password range check is ON (below).
   Tests: `password-rules.test.ts`, `webcloud-password.test.ts` (gate 17 for
   the web client). The phone's `AuthPort` and memory backend get the same
   methods with the phone screens (stream C).

#### What the password rules cannot do (measured 28 Nov 2026)

The owner asked to apply the password standard and reject common passwords.
Without a leaked-password lookup the apps can only refuse what their rules
and lists can see:

- **Structural rules generalise.** On a third tester's 867 unseen hostile
  passwords, the structural families (repeats, mirrors, walks, dates,
  numbers, the account's own words) were almost all refused before any
  list was tuned.
- **Lists do not.** A phrase, slogan, name, school, show or brand that is on
  no list passes. To measure that honestly the 867 are split in a fixed way
  (`mobile/jest/password-fixtures-r3.ts`): odd index = tuning half, even
  index = **held-out half, report-only** (the code and the lists are never
  tuned on it). Accepted:

  | | Tuning half (433) | Held-out half (434) |
  |---|---|---|
  | At dc23533 (before) | 147 (33.9%) | 133 (30.6%) |
  | Now | 19 (4.4%) | 50 (11.5%: 22 the tester judged to matter, 28 obscure) |

  The held-out figure is the one to quote. It is held out from tuning, but
  NOT from the tester's candidate vocabulary list, which was added to the
  local list in the same change; with the earlier lists the held-out
  accept rate is about 27% (116 of 434). A fresh tester should expect
  somewhere between 11.5% and about 30% on vocabulary families (phrases,
  names, brands), which is what the leaked-password check is for. Both
  figures are ceilings in the tests and may only fall. The good side: 0 of the tester's 164 good passphrases
  and 0 of the 62 round-2 ones are refused; fewer than 0.5% of random
  three-word phrases are; four or more different ordinary words pass by
  design.
- **The leaked-password check is ON** (owner decision 28 Nov 2026, below).
  It closes most of the gap for passwords that leaked anywhere. What still
  passes: an uncommon phrase, name or slogan that is on no list and has
  never appeared in a leak, and any password chosen while the check can't
  reach the service (it fails open and says so).

#### Leaked-password check (ON since 28 Nov 2026)

`mobile/src/webcloud/breach.ts` (with `engine/passwordBreach.ts`) looks up
at most two forms of a new password (as typed, and ONE simplified form:
the compared form without trailing numbers and symbols when what is left
is at least 8 characters and at least half the password, otherwise the
compared form; owner decision S1, 28 Nov 2026) with Have I Been Pwned's
k-anonymity range API, when a password is chosen (sign-up, reset, "set a
password"), after the app's rules have passed it, and never at sign-in.
Only the first 5 characters of each SHA-1 leave the device (the first 5
characters of a fingerprint of your password and of one simplified
version of it); the `Add-Padding` header pads the answer (if a network
refuses that header, the lookup is tried once without it, and the answer's
size then says a little about the prefix); the email and the full hash are
never sent; no cookies or referrer go with the request, but the service
sees the IP address and that the request came from kaisip.com; nothing is
logged. An answer that is not a range list (an error page, an empty or
huge body) counts as "couldn't check", never as "not leaked". A hit refuses with `password_leaked` and the
guidance text. A network failure, or no answer within 3 seconds in all,
fails open: the password is accepted and `breachState()` is `unchecked`, so
the screen can say it couldn't check. `BREACH_CHECK_ON` in
`mobile/src/webcloud/config.ts` is `true`; the page passes
nothing extra: `KaiSipCloud.create` uses `crypto.subtle` when the page has
it, and the client's own SHA-1 (`engine/sha1.ts`) when it doesn't (Hermes,
pages not on https).

- **Privacy:** the paragraph is a DRAFT in
  `docs/mobile/PASSWORD_SIGN_IN_DESIGN.md` §7; it goes into `privacy.html`
  with the sign-in release, after `app-store-compliance-reviewer` checks it
  (together with the Play Data safety view written there).
- **Website CSP:** `https://api.pwnedpasswords.com` is in `connect-src` for
  the study app's pages. The policy is in `_headers`, edited by hand;
  `scripts/build_site.sh` only checks it (the home and thanks policies must
  not allow the host). The home page's policy is unchanged. Nothing calls it until a password form exists.
- [ ] **Release gate (tick before the password form ships):** on the live
  site, a range request with `Add-Padding` succeeds from kaisip.com (the
  service answers the browser's CORS preflight for the header). If it
  does not, the client falls back to one request without the header
  (weaker padding, see above), which is not good enough to ship on.

### B. Website version with sign-in and sync (web v14, MAJOR)
0. **Done (28 Nov 2026, web v13.2, owner decision): the web app is public
   without sign-in**, so iPhone users can study before the App Store app.
   The home page stays at `/`; the app is at `/app/` (step 3
   below); the old preview folder redirects there. It installs with "Add to
   Home Screen" (manifest, Apple tags, an iPhone Safari tip on Today). No
   service worker yet. Details and rollback: `docs/WEBSITE_DEPLOY.md`.
   Sign-in (the steps below) is unchanged and still waits for the go-live gates;
   its redirect addresses must include `https://kaisip.com/app/`.
1. `index.html`: sign-in screen (Google, email + password, forgot password;
   sign-up confirms the email with a code), the Account section (status, Sync now, Download my
   data, Delete synced progress, Delete account, sign out), first-sync
   preview and undo, Terms and 16+.
2. New pages: `delete-account.html`, `human-check.html` (Turnstile); CSP and
   `_headers` updates; `build_site.sh` publishes them.
3. The study app goes to `https://kaisip.com/app/` (owner, 28 Nov 2026: open
   the web version now for iPhone users; free CISA sample, no sign-in yet),
   with the home page staying at `/`.
4. Stays behind the `ACCOUNTS_ON` switch (preview only) until every go-live
   gate is ticked.
5. **Sign-up consent (owner, 28 Nov 2026).** On the first sign-up step,
   before "Send my code" and before Google: required "I agree to the Terms
   and Privacy Policy" and "I'm 16 or older"; a separate, optional, unticked
   "Email me study tips and KaiSip news. I can unsubscribe anytime." The
   choice is stored with its wording version and time, can be changed in the
   Account section, and every such email has an unsubscribe link. Sending the
   opted-in addresses to Kit comes later (an Edge Function with Kit's key as
   a Function secret). Wording checked by `app-store-compliance-reviewer`
   and `growth-marketer`; the privacy policy is updated in the same release.
6. **Design (owner asked for a creative web design, 28 Nov 2026).** Three
   directions were drawn (Grove Atelier, Working Paper, Canopy); the designer
   recommends Grove Atelier with Working Paper's joined code cells and tick
   marks. Waiting for the owner's pick. Sign-up order is email, then the
   code, then the password.
7. **Sessions.** A sign-in lasts at most 30 days (NIST SP 800-63B-4 2.1.3):
   a nightly database job removes older sessions, and the apps say "please
   sign in again to keep syncing" and never touch saved progress.
8. **Beta Desk behind Cloudflare Access (owner approved, 28 Nov 2026).** A
   Zero Trust Access application on `kaisip.com/beta-desk` (and its script),
   allow-list of the owner's email, as a layer in front of the existing
   two-step sign-in. The old `kaisip.certprep-support.workers.dev` address
   must be switched off or covered too, or it bypasses Access.

### C. Android 2.4 with sign-in and sync
1. Supabase adapters, the sign-in and account screens, in-app account
   deletion, the human check, release config.
2. Privacy policy, Terms, Play Data safety ("No data collected" no longer
   true once sync is on), IARC and listing updates. Checked by
   `app-store-compliance-reviewer`.
3. Two bundles as from 2.3 (public sample, Alpha full).
4. Already merged for 2.4 (add to the 2.4 release notes when its tracker is
   opened): the capital J has a straight stem in headings, names and the
   avatar initial (FB-014, owner report 28 Nov 2026; the font files in
   `mobile/assets/fonts/`, no code change). Not in 2.3.

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

**Status (28 Nov 2026): steps 1 and 2 done for CRISC and AAIA.**
- `scripts/build_free_sample.py` builds every course's sample with its own
  plan's rules: CRISC 100 (26 / 22 / 32 / 20; every outline area, the 50-item
  mini mock fits), AAIA 200 (66 / 92 / 42; every notes subtopic). CISA's files
  are unchanged. Each list only grows (`verify_repo.sh`). The website still
  publishes CISA only, and a `build_site.sh` guard now refuses any other
  course's id or sample file.
- The picked samples were read by the content auditors before the lists were
  committed: 6 CRISC and 20 AAIA items were swapped for stronger ones (and
  the AAIA areas evened out), and seven CRISC wordings were tidied.
- The phone app's content build carries the full CRISC and AAIA courses in
  the testers' build and only their samples in the public build, with the
  same fail-closed guards; `audit-public-aab.mjs` checks every bundled course
  and that CC, CSOE and CIA are absent, and mobile CI now builds and audits a
  public-sample export on every run.
- Both stay `coming_soon` (step 4). A bundled `coming_soon` course is treated
  as not on the phone, so nothing a learner sees changes yet. What switching
  one on takes: `docs/mobile/SAMPLE_QUESTION_PACK.md`.
- The testers' bundle grew to about 17 MB (budget raised from 14 to 20 MB).
  Adding CC and CSOE in full would pass it: plan downloadable packs first.
- Follow-up (not built): give the sample builder a "best-reviewed first"
  input, a reviewed list of preferred ids per course, so the next course's
  sample starts from the auditors' picks instead of the hash order and the
  manual swap step goes away.
- Next: CC and CSOE (step 3, then steps 1 and 2 for them).

### E. Apple App Store
After the website and Android 2.4. Needs an Apple Developer account
(US$99 a year, owner), Sign in with Apple (required by Apple when Google
sign-in is offered), and the iOS build and review.

## Go-live gates

Public sign-in waits for every gate in `docs/mobile/ACCOUNTS_BETA_PLAN.md`
("Go-live gates", 1 to 12), plus:

- [ ] 13. Password sign-in reviewed: the new guard's tests pass and the
  security auditor finds no HIGH issue. In detail:
  - [ ] **13a.** `20261128000000_password_guard.sql` merged with
    `41_passwords.sql` green in CI and every mutant of
    `scripts/password_sql_mutants.py` caught, then applied through the MCP
    with the owner present (steps in `docs/mobile/ACCOUNTS_BETA_PLAN.md`,
    "Applying the password guard"). The apply record has its md5, and a
    read-only check shows `kaisip_password_guard` and
    `kaisip_first_password_session` (deferrable, initially deferred) on
    `auth.users`, `kaisip_mfa_staff_only` on `auth.mfa_factors`, all enabled,
    and `kaisip_clear_password` gone.
  - [ ] **13b.** On the hosted project, captcha still off:
    `VARIANT=signup|otp|recover … cloud_smoke.sh pre-register` all pass
    (three probe addresses); `cloud_smoke.sh password` passes;
    `cloud_smoke.sh binding` passes (the old session is refused, audit
    LOW-4); the `EMAIL_A` stale-session check passes.
  - [ ] **13c.** Dashboard settings as in the owner checklist below.
    `/auth/v1/settings` still shows `"mailer_autoconfirm":false`.
  - [ ] **13d.** `mobile-security-auditor` and `backend-architect` review the
    guard, both clients and the screens: no HIGH finding.
- [ ] 14. Password reset emails come from our own sender
  (`codes@kaisip.com`, not Supabase's default), with the template text in
  `docs/mobile/AUTH_EMAIL_TEMPLATES.md` §5: a code and no link.
- [ ] 15. **HARD:** the "password changed" notice is ON and arrives (§7 of
  the templates). If the Free plan with custom SMTP can't send it, passwords
  do not go live until the apps show "Your password was changed on <date>"
  from a `password_set_at` the client records (audit MEDIUM-1).
- [ ] 16. With captcha on, `cloud_smoke.sh captcha` passes: password
  sign-in, `/signup`, `/recover`, `/resend`, `/magiclink` and `/otp` are
  refused without a token; the refresh and Google (pkce) grants are not
  behind it (acceptance test S7).
- [ ] 17. The password is never saved by either client: a Jest test fills the
  sign-up, sign-in, reset and set-password flows, then asserts that no
  storage (web localStorage and sessionStorage; the phone's persisted stores
  and SecureStore) and no log line contains it. The client blocklist
  (decision above) ships with its own tests.
- [ ] 18. The hosted Auth version at go-live is written down (v2.199.0 or
  later). The three `pre-register` probes are re-run whenever
  `/auth/v1/health` shows a new version (a monthly look, beside the weekly
  Usage check).
- [ ] 19. Privacy policy, Terms and the Play Data safety "account creation"
  answer updated as in the design §7, checked by
  `app-store-compliance-reviewer`.
- [ ] 20. The Phone provider stays OFF (the guard watches the email columns
  only), and `auth.mfa_factors` has no learner rows (only accounts in
  `private.beta_desk_admins` or `private.staff`). Hosted proof: the full
  `cloud_smoke.sh` run's "learner A cannot enrol an authenticator app" answers
  500 (POST `/auth/v1/factors`, the database refusing the row).
- [ ] 21. Session time limits enforced on the server (owner decisions: 30
  days from sign-in, 14 days unused): a scheduled job (pg_cron) deletes
  `auth.sessions` past either limit, and a read-only check on the hosted
  project shows **no session older than 30 days and none idle over 14 days**
  (`count(*) = 0`). The apps already treat such sessions as signed out
  (step A3); a stolen refresh token is only stopped by the server job. The
  job and its migration are a separate pull request (security reviewer).

Emergency-brake numbers (audit MEDIUM-1 and MEDIUM-2): in the weekly Auth-log
look, more than 20 `invalid_credentials` for one address in a day, more than
5 `/recover` requests for one address in a day, or bursts of failed `/verify`
codes are the signal to hide the password form (its own remote switch) and
tell the owner. These starting numbers are a judgement, to be tuned with real
traffic.

## Owner checklist for this plan (only you can do these)

1. GitHub Pro is active (28 Nov 2026). Gate 4 as rewritten in
   `ACCOUNTS_BETA_PLAN.md`: both environments limited to `main` with the only
   copies of their secrets, admin bypass off, `main` protected, Code Owners
   review left off (Claude acts through the owner's account).
2. The remaining items in `ACCOUNTS_BETA_PLAN.md` section 9 (Supabase
   settings, Turnstile, the restore drill, go-live day).
3. Passwords: after Claude says the password guard is applied and its
   checks are green, set these in the Supabase dashboard, in order (details
   and reasons: `docs/mobile/PASSWORD_SIGN_IN_DESIGN.md` §5):
   - **Authentication → Sign In / Providers → Email:** Confirm email stays
     ON; Secure email change stays ON; Secure password change ON; Require
     current password when updating ON; **Minimum password length 15**;
     **Password requirements: no required characters**; Prevent use of leaked
     passwords stays off (Pro only); Email OTP length 8 and expiry 600
     unchanged. Save.
   - **Authentication → Emails → Templates → Reset Password:** paste the
     subject and body from `docs/mobile/AUTH_EMAIL_TEMPLATES.md` §5.
   - **Authentication → Emails → Security notifications:** "Password changed"
     ON with the text from §7 (a hard gate: tell Claude if Free with custom
     SMTP doesn't offer it). "Sign-in method linked" ON with §8, if offered.
   - **Authentication → Rate Limits** (note the unit shown beside each box):
     emails sent 20 an hour; sign-ups and sign-ins 30; token verifications 30;
     token refreshes 150 (password sign-ins share this one, so don't lower
     it); per-address waits at 60 seconds.
   - **Leave as they are:** Phone OFF, Anonymous sign-ins OFF, Manual
     linking OFF, Allow new users to sign up ON, URL Configuration unchanged.
     Multi-factor (TOTP) stays on: only staff can enrol now.
   - **Authentication → Attack Protection → CAPTCHA (Turnstile):** ON, on
     go-live day, last; then Claude runs `bash scripts/cloud_smoke.sh captcha`.
   - Make test accounts the way learners do (code first, then the
     password): a dashboard user created with a password and "Auto confirm"
     ends up with none.
4. Later: Apple Developer account for stream E.
