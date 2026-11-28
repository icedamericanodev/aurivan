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
| Supabase plan | **Free for now** (owner: see how many learners sign up first) | Alternatives on Free, written up as documented deviations for audit: the 30-day sign-in expiry is enforced on the server by a nightly job that deletes sessions older than 30 days; predictable passwords are refused by the apps (structural rules and bundled lists, which only a learner bypassing the app for their own account could skip; they miss phrases and names that are on no list, see "What the password rules cannot do" below); Supabase's own leaked-password check is a Pro feature, so the apps run their own lookup instead (Have I Been Pwned's range API, ON since the later decision the same day; "Leaked-password check" below); the 100-wrong-tries account limit is replaced by the human check on every password sign-in, per-IP limits, the password length and monitoring. **Upgrade to Pro before the paid launch** (already required by `WEB_GATE_PLAN.md`), or earlier if the deviation register's trigger is hit |
| Email code length | **8 digits** (confirms the audit's L7 change) | None: already set. Close L7. |
| GitHub Pro | **Owner buys it** | Go-live gate 4 can be met: "Require review from Code Owners" on `main`, and the `ota` and `db-backup` environments enforced again. |
| New courses | **Public free sample; full course for Alpha testers only** (as CISA today) | Each course needs a free sample builder, a pack in the phone app, the public build's sample-only guard and audit extended to it, and the tester build carrying the full course. No payment system is part of this. |
| Password rules | **At least 12 characters, with a lowercase letter, an uppercase letter, a number and a symbol** (owner decision, 28 Nov 2026, evening: "Require all 4 types, 12+"; it replaced "at least 15 characters, no required character types") | Dashboard setting (checklist below: confirm, do not change); `supabase/config.toml` mirrors it; the apps mirror the server's exact checks. Deviations D3 and D4 in the deviation register below |
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
   whole-password comparison: 12 code points in NFC and NFKC, at least one
   lowercase letter, uppercase letter, digit and symbol (ASCII, as the server
   checks; owner decision, deviation D3), at most 72
   bytes (documented deviation for accented text), NFKC sent, control and
   invisible characters refused. The comparison reads accents, invisible
   characters, Cyrillic and Greek look-alikes, letter-for-number swaps (per
   position) and the password backwards. Two kinds of check: structural
   rules (fewer than 8 to 10 real characters, by length, after repeats,
   sequences, walks, copies, mirrors and years; a core, without the numbers
   and symbols around it, that is one list entry, name, run or the account's
   or app's word; one word with numbers; mostly the account's own
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
  | Under the 12-character, four-types rule (each with the four types added) | 15 (3.5%) | 45 (10.4%) |

  The held-out figure is the one to quote. It is held out from tuning, but
  NOT from the tester's candidate vocabulary list, which was added to the
  local list in the same change; with the earlier lists the held-out
  accept rate is about 27% (116 of 434). A fresh tester should expect
  somewhere between 11.5% and about 30% on vocabulary families (phrases,
  names, brands), which is what the leaked-password check is for. Both
  figures are ceilings in the tests and may only fall. The good side: 0 of the tester's 164 good passphrases
  and 0 of the 62 round-2 ones are refused (one round-2 phrase is refused
  since round 5 on purpose: the app's own old hint with "The" in front);
  with the four types added (a capital, a number and a symbol), under 1 in
  100 random three-word phrases with spaces is refused, and under 4 in 100
  when the three words are typed as one (14 letters or fewer run together
  look like one word); four or more different ordinary words pass by
  design.
- **The 12-character, four-types rule (owner decision 28 Nov 2026,
  evening), measured twice.**

  | Measure | Tuning half | Held-out half (report-only) | Good passwords refused |
  |---|---|---|---|
  | Round 4 (same author; new words in ONE shape, a word plus numbers and a symbol; `password-fixtures-r4.ts`) | 0 of 2,900 | 0 of 2,833 (13 before round 5) | 0 of 240 |
  | Round 5 (an **independent** reviewer's 5,220 candidates in 17 families; `password-fixtures-r5.ts`, split by base word before any result was seen) | 228 of 3,206 (7.1%; 368 before) | **116 of 2,014 (5.8%; 197, 9.8%, before)** | 6 of 370, all on purpose |
  | Verification (the reviewer's 758 new candidates aimed at the fixed shapes and their neighbours; not in the repo) | n/a | 117 of 758 (15.4%; 44.6% before the fixes), 115 after the follow-ups | 5 of 150 (four random strings of mostly digits and symbols, one two-common-words) |

  Two numbers to quote, and what each one is. **5.8% (116 of 2,014)** is
  round 5's held-out half: the broad, independent set, somewhat optimistic
  because the round-5 fixes follow the reviewer's prototypes, which were
  made with the whole set in view. **15.4% (117 of 758; 44.6% before the
  fixes)** is the reviewer's verification round: new candidates written
  after the fixes and aimed at the fixed shapes and their neighbours, so it
  is a worst-area figure, not an average (115 of 758 after two small
  follow-ups, one of which targets a shape that round found). Before round 5
  the reviewer measured 10.8% of the whole set (12.1% on fresh vocabulary).
  What still passes, in words: two
  uncommon words with a number and a symbol; an unlisted word with
  letter-for-number swaps; a date or phone number written with separators
  and a short label; text-speak and expressions; names and places that are
  on no list; a short random core padded with repeated symbols or spaces;
  the app's name with a four-letter word; four-letter and double fillers
  before a listed word; stepping patterns whose letters step by two; one
  look-alike digit standing for two different letters in a word; two-letter
  book names in verse references; pairs of words joined by "and". The
  other way round: random generated passwords (uniform printable, or
  browser style) of 12 characters are refused about 2 to 2.5% of the time,
  of 14 about 1 to 2%, of 16 under 0.5% (measured on 3,000 of each; test
  ceilings keep it from drifting).
  The good passwords the rules refuse on purpose: four with no plain ASCII
  capital or lowercase letter (the server would refuse them too), and two
  made of two common words. Two common words with a number and a symbol are
  refused at every length: the reviewer's recommendation is to keep refusing
  two common words at every length; the owner was told on 28 Nov 2026 and is
  to confirm (the reviewer's numbers: about 90% of natural two-word choices
  are refused at 12 and at 18 characters, and the cheapest fall within about
  60 million guesses). The guidance says that a third unrelated word fixes it.
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
   **Built 28 Nov 2026, behind the switch (OFF); see "B1 as built" below.**
2. New pages: `delete-account.html`, `human-check.html` (Turnstile); CSP and
   `_headers` updates; `build_site.sh` publishes them.
   **Built 28 Nov 2026.** Published only when `ACCOUNTS_ON` is true or the
   build sets `SITE_ACCOUNTS_PREVIEW=1`; noindex until accounts are on.
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

#### B1 as built (28 Nov 2026; nothing a visitor can reach changed)

- **The switch.** `ACCOUNTS_ON = false` in the first script of `index.html`.
  With it off no account element is created, the accounts client
  (`assets/kaisip-cloud.js`), the password word lists and Cloudflare's human
  check are never loaded, and no request goes to the sign-in service or any
  other party. Account screens exist only on `https://kaisip.com` (never
  `file://`, a preview host or a copy of the site). The owner's preview is a
  note saved in her own browser by opening
  `https://kaisip.com/app/#accounts-preview=on` (`=off` removes it); steps in
  `docs/WEBSITE_DEPLOY.md`. It is not access control: the page's code is
  public, so anyone who reads it can switch the screens on for their own
  browser. What protects accounts before launch is the server side (the
  go-live gates), not this switch.
- **Screens** (direction A, Grove Atelier, with joined code cells and audit
  ticks; `docs/mobile/DESIGN_SYSTEM.md` §22): Sign in; Create account in the
  order email and agreements, the 8-digit code, the password; Forgot
  password; the agreements after a first Google sign-in; the first-visit
  welcome choice; the first-sync preview (This browser, Account, After) with
  Combine, "Use the account's progress here" (a 7-day undo copy) and Not
  now; the account card on You (full for 3 days seen, then slim; synced,
  syncing, waiting for a connection, couldn't sync, sign in again); the
  Account page; `delete-account.html`; `human-check.html`.
- **Shared client** (`mobile/src/webcloud/`, part of this step because the
  owner's order needs it): `sendSignUpCode` and `confirmSignUpCode` (a code
  session that only "needs a password": no sync, signed out after 10
  minutes), then the existing `setPassword`. Google now returns to
  `https://kaisip.com/app/` (`REDIRECT_URL`), so **the Supabase redirect
  list must hold that address before Google is tried** (owner checklist).
- **Consent.** The two required agreements and the separate, optional,
  unticked news box sit before "Send my code" and before Google. Terms and
  "16 or older" are saved through the client (`acceptTerms`). The news
  choice, with its wording version and time, goes through a small adapter in
  `index.html` (`kaConsent.saveConsent` / `readConsent`); until the consent
  API exists it is kept in the browser only, marked pending. **To do with
  the consent API:** give the page `window.KaiSipConsentApi` (or replace the
  two bodies) and send the pending record.
- **Tests:** `node scripts/smoke/accounts.mjs <repo> <out>` (or
  `scripts/smoke/run.sh accounts`) drives the real page at
  `https://kaisip.com/app/` (intercepted) with the real client against the
  Jest fake Supabase: 34 paths at 390 and 1280. They cover the switch off
  (nothing loads), every flow and failure (wrong code, each refused
  password, leaked, leak check unreachable, rate limit, offline, expired
  session, unticked agreements), two tabs, Google, axe on every account
  screen in light and dark, 320 to 1280 wide and text at 200%. `--shots <dir>` saves every
  screen at 390 and 1280, light and dark.
- **Found while building (decide before launch):**
  1. The sync engine writes back only questions the website has loaded (the
     free sample). A browser that still holds answers for full-course
     questions (study from before web v12.50) would have lost them from its
     own record at its first sync. The page now carries those entries and
     their counts over (`kaKeepUnknown`, tested), but they still never reach
     the account, so they do not show on the phone. Fix in the client
     (`toWeb` / `fromWeb`) or accept and say so.
  2. Google's "G" mark is not in `assets/`, so the Google buttons are words
     only. Google's branding rules ask for their own mark file: add it (light
     and dark) and the button before launch.
  3. The buttons use the phone's shipped shape (54 tall, 16 corners), not
     the pills drawn in the direction A mockups (open decision D2 of the You
     tab design). One CSS variable, `--ka-r-btn`, changes it.
  4. New passwords are shown as typed at first (the approved design), with a
     Hide button. On a shared screen that is a shoulder-surfing risk; the
     alternative is hidden at first with Show.
  5. `delete-account.html` still needs the developer name exactly as on
     Google Play and the database provider's log period (both left out
     rather than guessed), and the compliance reviewer's read.
  6. Not built here: the remote "hide the password form" brake, the
     in-app "password changed on" banner (the Account page shows the date),
     a service worker, and the privacy policy and Terms updates (gate 19).

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

## Deviation register: passwords (for audit)

Each row is a place where KaiSip's password handling does not do what the
cited standard asks, the owner's decision behind it, and what compensates.
"Meets" is used only where the requirement is met as written. Earlier
deviations (D1 email codes only to confirm and recover, D2 no per-account
failed-attempt limit, the 72-byte limit, client-side-only blocklist) are in
`docs/mobile/PASSWORD_DESIGN_AUDIT.md`.

| # | Date, decision | Requirement | What KaiSip does | Status |
|---|---|---|---|---|
| D3 | 28 Nov 2026, owner decision ("Require all 4 types, 12+") | NIST SP 800-63B-4 §3.1.1.2: verifiers SHALL NOT impose composition rules (such as requiring mixtures of character types); §3.1.1.1 says the same of other composition requirements *(as cited by the independent review; verify the wording)*. OWASP ASVS 5.0 **6.2.5** (L1): passwords of any composition can be used, with no requirement for upper or lower case characters, numbers or special characters | A new password needs at least one lowercase letter (a-z), uppercase letter (A-Z), digit (0-9) and symbol (ASCII punctuation), checked by the apps and by the sign-in server (Supabase Auth `password_requirements = lower_upper_letters_digits_symbols`) | **Does not meet** NIST §3.1.1.2 (composition) or ASVS 6.2.5 |
| D5 | Earlier (design), recorded 28 Nov 2026 | OWASP ASVS 5.0 **6.2.8** (L1): verify the password exactly as received, without modifications. NIST SP 800-63B-4 asks for normalisation as a SHOULD, and names NFC *(per the independent review; verify)* | The apps send the password in **NFKC** (full-width letters, ligatures and compatibility forms made plain), so the same keys make the same password on every device | **Does not meet** ASVS 6.2.8 as written; NFKC instead of NIST's NFC |
| D4 | 28 Nov 2026, the same decision | NIST SP 800-63B-4 §3.1.1.2: a password used as a single-factor authenticator SHALL be at least 15 characters. OWASP ASVS 5.0 **6.2.1** (L1): at least 8 characters, 15 strongly recommended | At least 12 characters (code points, in NFC and NFKC), server and apps | **Does not meet** NIST's 15 for a single factor (KaiSip passwords are single-factor). **Meets** ASVS 6.2.1's minimum of 8, below its recommended 15 |

**Compensating controls (both rows):**
- The apps refuse predictable passwords before anything is sent: the bundled
  common-password lists, the whole-password comparison and the structural
  rules (repeats, sequences, keyboard walks, dates, the account's own words,
  the app's and exam names), including the shapes composition rules invite:
  a capitalised word, name, walk or season with numbers and a symbol around
  it, a list word with a short tag, and letters, digits and symbols each in
  a run. Measured: an independent reviewer's attack (round 5, 5,220
  candidates) still passes **116 of its 2,014 held-out candidates (5.8%)**,
  the broad figure (somewhat optimistic); the reviewer's verification round,
  aimed at the fixed shapes and their neighbours, passes **117 of 758
  (15.4%; 44.6% before the fixes)**, a worst-area figure, not an average; the
  author's own round 4, which tests one shape only, passes 0. Shapes that
  still pass are named in "What the password rules cannot do".
- The leaked-password check (Have I Been Pwned range API, k-anonymity) when a
  password is chosen; it fails open when the service can't be reached.
- **From go-live, not today:** the human check (captcha) on every password
  sign-in, sign-up and reset (go-live gate 16; it is off in
  `supabase/config.toml` until then), and the sessions' 30-day and 14-day
  end on the server (gate 21; today only the client ends them). Supabase's
  per-IP rate limits apply now (local values in `supabase/config.toml`; the
  hosted values to confirm).
- These client checks run only in the apps: a learner calling the server
  directly for their own account can skip everything except the server's own
  length and composition checks (the earlier client-side-only deviation).

**What the rule does line up with:** PCI DSS v4.0.1 requirement 8.3.6 asks
for passwords of at least 12 characters (8 where a system cannot do 12)
containing both numeric and alphabetic characters *(wording from the
standard as recalled; verify against the PCI SSC document before quoting)*.
KaiSip's rule meets that and goes further (both cases and a symbol). KaiSip
is not in PCI DSS scope; this is a point of reference, not a claim.

**ASVS 6.2.4 note:** the bundled lists were picked for the earlier 15+
policy (the top 3,000 passwords of 15+ characters, and the top 100,000 of 4
to 14 characters, compared in any case). They cover 12 to 14 character
passwords through the 100,000 list, but a "top 3,000 that meet the new
policy" list has not been built, so 6.2.4 is not yet shown as met for the new
policy *(follow-up)*.

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
     current password when updating ON; **Minimum password length 12** and
     **Password requirements: lowercase, uppercase letters, digits and
     symbols** (reported already set this way on the hosted project:
     **confirm, do not change**); Prevent use of leaked
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
     linking OFF, Allow new users to sign up ON. Multi-factor (TOTP) stays
     on: only staff can enrol now.
   - **Authentication → URL Configuration → Redirect URLs:** add
     `https://kaisip.com/app/` (exactly, with the last slash), beside
     `https://kaisip.com/` and `kaisip://auth-callback`. The web app lives
     at `/app/`, and Google sends the learner back there. Without it Google
     sign-in on the website lands on the home page and does not finish.
   - **Authentication → Attack Protection → CAPTCHA (Turnstile):** ON, on
     go-live day, last; then Claude runs `bash scripts/cloud_smoke.sh captcha`.
   - Make test accounts the way learners do (code first, then the
     password): a dashboard user created with a password and "Auto confirm"
     ends up with none.
4. Later: Apple Developer account for stream E.
