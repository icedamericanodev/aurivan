# KaiSip security gates (go-live checklist)

**Source:** the mobile + Supabase security audit of 21 Oct 2026 (OWASP MASVS v2).
**Audience:** the owner (plain steps) and every future Claude Code session.

> **In one paragraph.** The app as shipped today (accounts and the board built
> OFF) is fine to release. Before two moments, though, some doors must be
> locked: **(A)** the first store build or the first update sent to the
> `production` channel, and **(B)** Phase 9, when accounts, sync and the
> feedback board go live. Each gate below says what it protects, what is
> already done in code, and the exact steps only you (the owner) can take,
> because they need your accounts, keys or a decision.

## Status, accounts beta (27 Oct 2026)

The owner chose a smaller first step than Phase 9: optional accounts on the
web and Android (Google or an email code), progress sync between them, on
the Supabase Free plan, with the **feedback board OFF** (its own build flag,
and posting paused on the server). Moment **(B)** below now means "the
accounts beta goes live". What that changes:

- **Gate 1:** Play testers get the production profile through closed
  testing, where over-the-air updates are off, so signed-in phones never run
  unsigned updates. Preview APKs (unsigned updates) stay on Sky's own phone.
- **Gate 2:** not needed for the beta (no board, so no staff tools in use).
  Still required before the board opens.
- **Gate 3:** decided: Cloudflare Turnstile and Resend's free plan; the
  email templates are written (`docs/mobile/AUTH_EMAIL_TEMPLATES.md`).
  Open: the owner's accounts and settings (`ACCOUNTS_BETA_PLAN.md` §9 C, D,
  F22–F24, F30). Captcha is switched on last.
- **Gate 5:** open, one switch (§9 F27).
- **Gate 6:** still binding, plus the snapshot codec rule below.
- **New, done in the repo (ticket 1):** the schema fixes before the first
  apply (gzip snapshots, one checkpoint, no content tables, the keyed
  deletion audit, a trigger refusing new passwords on confirmed accounts,
  the board paused), CORS for exactly `https://kaisip.com` on the two
  account functions, a capped gzip reader against gzip bombs, the delete
  order (the account first), the keep-awake and encrypted-backup workflows.
  Open: Sky's `DELETION_PEPPER` Function secret, R2 bucket, `age` key and
  the `db-backup` environment secrets.

## At a glance

| # | Gate | Needed before | Code status | Owner action |
|---|---|---|---|---|
| 1 | Signed phone updates (audit M1) | (A) and (B) | (A) met another way: store builds ship with updates off (mobile 1.40.1). Signing still open for test builds and Phase 9 | Not for (A). For (B): keys, one native build, a paid plan |
| 2 | Staff MFA + admin/moderator split (M2) | Before the board opens (not the accounts beta) | **Done** | Yes: turn on MFA, enrol staff, add staff rows |
| 3 | Captcha + your own email sender (L3) | (B) | Chosen: Turnstile + Resend; templates written | Yes: Turnstile widget, Resend + DNS, SMTP and captcha settings |
| 4 | Backup-route APK signing key (L4) | Next run of that workflow | Not started | Yes: a decision |
| 5 | GraphQL off on the hosted project (I7) | (B) | Local config done | Yes: one dashboard switch |
| 6 | Adapter guardrails (I1, I2, I3, I9) | (B) | Rules written here | No: engineer checklist |
| 7 | Free-plan safeguards (keep-awake, encrypted backups, size alarm) | (B) | **Workflows in the repo** | Yes: repo variables, R2 bucket, `age` key, `db-backup` secrets |

Already fixed in code by the same audit (nothing for you to do):
- **L1** a link from outside the app (`kaisip://board/new?body=…`) can no longer
  pre-fill a board post (`mobile/src/lib/linkPrefill.ts`).
- **L2** the board's search is cut to 100 characters and the certification id
  is checked, so a huge search can't slow the server (`board_feed`).
- **L5** a learner can't edit their comment on a post staff locked or hid.

---

## Gate 1. Signed phone updates (OTA code signing)

> **Decision, 22 Oct 2026 (owner):** Google Play builds ship with `updates.enabled: false` until this gate is done (free Option A in `docs/mobile/PLAY_LAUNCH.md`, B1). Store users get changes only through Play releases. Test builds keep OTA. The paid plan stays optional, for later.
>
> **Status, mobile 1.40.1 (23 Oct 2026): done in code for store builds.**
> - `mobile/app.config.js` turns updates off when EAS builds the `production` profile (its `env` in eas.json sets `KAISIP_STORE_BUILD=1`, which `eas build` passes both on your computer and on the build machine; `EAS_BUILD_PROFILE=production` also counts). Every other profile gets `app.json` unchanged, so preview and development builds keep their updates.
> - `mobile/scripts/check-release-config.mjs` (rule 5, run in CI and by Jest) fails if any store profile would resolve to updates on while `app.json` has no code-signing certificate. Once the certificate is added (steps 2–5 below), the rule steps aside.
> - The Settings "Check for updates" row and the update stamp hide themselves when `Updates.isEnabled` is false, so a Play install shows neither (`mobile/src/lib/updates.ts`, tested in `settings-updates.test.tsx`).
> - The same file stops a production build that sets `EXPO_PUBLIC_AURIVAN_CLOUD` without `AURIVAN_CLOUD_GO_LIVE_ACK=yes` (PLAY_LAUNCH.md c4).
> - What stays open: test phones (preview APKs) still accept unsigned updates. That is the accepted risk for test builds until this gate is closed. Steps 1–6 below still apply before Phase 9, or before store builds ever turn updates back on.
> - One-off cost: this release changed the native fingerprint of preview builds as well (the blocked advertising-ID permission and the `eas.json` submit settings), so testers on an older preview APK need one new preview build to keep receiving updates.

**What it protects.** Every merge to `main` that touches the app sends an
over-the-air update to test phones, with no person approving it. Today a phone
runs any update that the Expo project serves. A leaked Expo token, a poisoned
npm package or a bad merge could therefore put someone else's code on every
phone. At Phase 9 that code would run next to the learner's signed-in session.
With code signing, the phone refuses any update that wasn't signed with a
private key that only you hold.

**Done in code (interim, 21 Oct 2026).** The publishing job
(`.github/workflows/eas-update.yml`) no longer runs any package's install
script: `npm ci --ignore-scripts`, then the content pack is built by name, and
eas-cli is fetched with install scripts off. This was checked on a clean copy:
same runtime fingerprint, byte-identical JavaScript bundle, every check passes.
This closes one door (install-time code) but not the main one (the dependency
code still runs), so this gate stays open.

**Owner steps.**
1. **Check the cost first.** On expo.dev, check that your plan includes EAS
   Update code signing. Expo has offered it on paid plans only. If it needs a
   paid plan, that is your decision to make before anything else.
2. **Make the key on your own computer, never in CI.** In a terminal, in the
   `mobile/` folder:
   ```bash
   npx expo-updates codesigning:generate \
     --key-output-directory ../../kaisip-keys \
     --certificate-output-directory certs \
     --certificate-validity-duration-years 10 \
     --certificate-common-name "KaiSip"
   npx expo-updates codesigning:configure \
     --certificate-input-directory certs \
     --key-input-directory ../../kaisip-keys
   ```
   `../../kaisip-keys` is a folder NEXT TO the repo, not inside it. The
   certificate (`mobile/certs/`) is public and goes in the repo; the second
   command adds `codeSigningCertificate` and `codeSigningMetadata` to
   `mobile/app.json`.
3. **Back up `private-key.pem`** in your password manager. Never commit it,
   email it or paste it into a chat. (The repo's secret scanner blocks PEM
   private keys, but don't rely on that.)
4. **Change how updates are published, in the same pull request** as the
   `app.json` change. Once phones carry the certificate, they refuse unsigned
   updates, so the automatic preview publishing would silently stop working.
   Choose one:
   - **Simplest:** sign every update from your own computer:
     `npx eas-cli@24.14.0 update --channel preview --private-key-path ../../kaisip-keys/private-key.pem --message "…"`
     and turn the automatic workflow off.
   - **Keep automatic preview updates:** create a NEW GitHub Environment (for
     example `ota-signed`) with **Required reviewers** ticked and the key
     stored there as a secret. Ask an agent to change `eas-update.yml` to
     write it to a temporary file and pass `--private-key-path`.
   - Send `production` updates only from your own computer, either way.
5. **Make one new native build** (EAS Build `preview`, and the store build).
   Code signing changes the app's fingerprint, so older test APKs stop
   getting updates; testers install the new APK once.
6. **Until all of this is done:** consider ticking **Required reviewers** on
   the `ota` environment again (docs/WEBSITE_DEPLOY.md, section 1: no code
   change needed), use an Expo robot token with the smallest role that can
   publish, and rotate it.

## Gate 2. Staff MFA and the admin / moderator split

**What it protects.** The staff tools can read posts held for containing
contact details or threats, and can silence anyone. Staff sign in with an
email code, so before this fix a phished staff mailbox gave full control.

**Done in code.**
- `staff-action` (the server's staff gate) refuses the staff queue and every
  staff action unless the session passed a second factor: an authenticator
  app code (TOTP). Supabase marks such a session `aal2` inside the sign-in
  token. Without it the answer is `401 reauth_required`, detail
  `mfa_required`. Only "am I staff?" (`whoami`) stays open, so the app can
  ask staff to verify first.
- Two roles in `private.staff`. A **moderator** keeps the everyday tools
  (approve, hide, remove, lock, status, warn, limit, suspend, lift a
  suspension, rename a learner, dismiss reports, decide appeals). Only an
  **admin** may pause or reopen the whole board, ban, lift a ban (directly or
  by restoring a banned member's appeal), or act on another staff account.
- TOTP is switched on in `supabase/config.toml` (`[auth.mfa.totp]`).
- Tests: `supabase/tests/33_board_security.sql` and the staff-action Deno tests.

**Owner steps (Phase 9).**
1. In the hosted project's Auth settings, turn on **TOTP (authenticator app)
   multi-factor authentication**, both enrolment and verification, to match
   `supabase/config.toml`.
2. Keep admins to one or two people (you). Add staff rows in the SQL editor:
   ```sql
   insert into private.staff (user_id, role) values ('<your account id>', 'admin');
   insert into private.staff (user_id, role) values ('<moderator account id>', 'moderator');
   ```
3. Each staff member installs an authenticator app (for example the one built
   into their password manager) and enrols it on the staff screen.
4. Check it: a moderator account that tries **Pause posting** gets "not
   allowed", and a staff account that has not verified its authenticator
   gets asked to verify.

**Engineer note (Phase 9 app work).** The staff screen needs an MFA step:
`supabase.auth.mfa.enroll` once, then `challenge` + `verify` when
`staff-action` answers `reauth_required` with detail `mfa_required`, then
retry the call. Learners are never asked to enrol.

## Gate 3. Captcha and your own email sender

**What it protects.** Anyone can ask the server to email a sign-in code to any
address. Without a captcha, a script can flood strangers' inboxes and use up
the project's hourly email allowance, so real learners can't sign in.

**Done in code.** The app has a captcha interface (`CaptchaPort`), and
`supabase/config.toml` has the captcha block ready (commented out until Phase 9).

**Decided (accounts beta, 27 Oct 2026):** Turnstile (Managed, hostname
`kaisip.com`) and Resend's free plan (3,000 emails a month, 100 a day),
sending from `KaiSip <codes@kaisip.com>`. The templates are code-only
(`docs/mobile/AUTH_EMAIL_TEMPLATES.md`).

**Owner steps (accounts beta; exact clicks in `ACCOUNTS_BETA_PLAN.md` §9).**
1. Create the Turnstile widget (§9 D11–D12). The site key is public; send it
   to Claude. Keep the secret key for the last step.
2. Set up Resend with the `kaisip.com` DNS records (§9 C6–C10), then the
   custom SMTP sender in Supabase (§9 F22).
3. Paste the email templates (§9 F23) and set the rate limits: emails 20 an
   hour, token verifications 30, sign-ins 30, refreshes 150 (§9 F24).
4. Last, on go-live day, after both clients send captcha tokens and the
   smoke test has run: Authentication → Attack Protection → CAPTCHA →
   Turnstile, with the secret key (§9 F30).

## Gate 4. The backup-route test APK's signing key (done: route retired)

**What it protected.** The hand-run "Android test APK" workflow signed with
Android's public debug key, the same key in every React Native project. Anyone
could build a fake KaiSip APK with that key, and Android would install it as an
update over a tester's real app, with access to all its saved data.

**Status: retired on 26 Oct 2026** (owner decision). The workflow now lives in
`archive/github-workflows/android-apk.yml`; GitHub only runs workflows inside
`.github/workflows/`, so it can no longer run. Test APKs come from the
"Phone build (EAS Build)" workflow with the **preview** profile (Actions →
"Phone build (EAS Build)" → Run workflow → profile `preview`), signed with the
EAS-managed key on expo.dev. The APK from expo.dev installs in the Android emulator too: drag it onto the emulator window, or run `adb -e install -r <file>.apk`.

Testers who still have a GitHub Releases APK must uninstall it before
installing the expo.dev one (the keys differ), so save a backup file first
(Settings → Your data). The Mac script `mobile/scripts/build-apk.sh` still
signs with the debug key: never build an accounts-on (cloud) APK with it.

## Gate 5. GraphQL off on the hosted project

**What it protects.** The app talks to the database only through the REST
API. Supabase can also expose a GraphQL API; leaving it on is one more door to
audit and nothing uses it.

**Owner steps (Phase 9).** In the hosted project: under Database, Extensions,
turn off `pg_graphql`; under the API settings, expose only the `public`
schema (as in `supabase/config.toml`). Mirror the rest of `[auth]` from that
file by hand, as its header says.

## Gate 6. Rules for the Phase 9 Supabase adapter (engineer checklist)

No owner action. Whoever writes the real Supabase client code must follow these:
- **I1 No string-built filters.** Check that ids are UUIDs before using them.
  Call only `rpc('board_post', { p_id })`, `rpc('board_feed', { p_q, … })` or
  `.eq('id', id)`. Never put learner text or route params inside `.or()`,
  `.filter()` or `.textSearch()` strings: that syntax is where injection happens.
- **I2 RevenueCat webhook (when subscriptions arrive).** `verify_jwt = false`;
  compare the `Authorization` header to a function secret with the
  constant-time `sameSecret` (see `staff-digest`); make it idempotent with a
  `private.revenuecat_events (id text primary key)` table; ignore events whose
  user id is not a real account.
- **I3 Secure storage.** When `expo-secure-store` is added, keep its Android
  backup exclusion on (`allowBackup` is on for study data).
- **I4 Privacy notice.** Signed-in learners can see every member's public
  board name. Say so in `privacy.html`.
- **I8** The staff screen's own check is only cosmetic. The server
  (`staff-action` and `private.staff_act`) is the real gate. Keep it that way.
- **I9 Snapshots are untrusted input (accounts beta).** Every client (the
  phone and the website) reads a synced snapshot through a capped inflate:
  feed the inflater small slices (1 KB) from a pull-based stream, never the
  whole gzip in one chunk (security audit M1: one chunk let the inflater
  run 500 MB past the cap on Deno), stop at 2,000,000 bytes, check the
  zipped size against the 200,000-character cap before a push, refuse a
  size that doesn't equal `raw_bytes` or
  an `encoding` other than `gzip+base64`, then the strict snapshot checker.
  A snapshot that fails pauses sync as unreadable; it never crashes the app
  or replaces local progress. The server's reader is
  `supabase/functions/_shared/gz.ts`.

## Gate 7. Free-plan safeguards (accounts beta)

**What it protects.** On the Free plan Supabase pauses a project after 7 days
without activity (sign-in and sync stop for everyone), keeps no backups we
can restore from *(verify)*, and sends no usage alerts.

**Done in the repo.**
- `.github/workflows/keep-awake.yml`: every 2 days, one read with the
  publishable key; a red run means the project is paused or down.
- `.github/workflows/db-backup.yml`: nightly `pg_dump`, encrypted with
  `age` to Sky's public key, uploaded to R2 and kept 30 days; red over
  300 MB. It runs only from `main`, in the `db-backup` environment, prints
  no counts (the log is public), and uploads no artifact.
- Both stop green with a notice until they are set up.

**Owner steps** (`ACCOUNTS_BETA_PLAN.md` §9 G31–G35): the R2 bucket with a
30-day lifecycle rule and a bucket-only token; an `age` key made on your own
computer (only the `age1…` public line goes to GitHub, as the repository
variable `BACKUP_AGE_RECIPIENT`); Supabase's CA certificate as the variable
`SUPABASE_DB_CA_CERT` (the job checks the server's certificate); the
`db-backup` environment (main only)
with `SUPABASE_DB_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and
`R2_ENDPOINT`; and the repository variables `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` for keep-awake; and "Require review from Code
Owners" on `main`, so `.github/CODEOWNERS` makes you review any workflow
change (security audit M3: the backup job holds the database password).
Then decrypt one backup and do a restore drill (acceptance test S8). The
full list of go-live gates is in `ACCOUNTS_BETA_PLAN.md`.

## How to re-check

From the repo root:
```bash
bash scripts/check_rls.sh                       # static RLS rules
(cd mobile && npm run check)                    # app tests, lint, types
# SQL tests: CI (.github/workflows/supabase.yml) runs `supabase test db`;
# the mutation checks: python3 scripts/sync_sql_mutants.py and
# python3 scripts/board_sql_mutants.py
# On the hosted project, after the apply: bash scripts/cloud_smoke.sh
```
Re-run the `mobile-security-auditor` agent before the first store build and
again before Phase 9.
