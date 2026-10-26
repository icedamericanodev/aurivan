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

## At a glance

| # | Gate | Needed before | Code status | Owner action |
|---|---|---|---|---|
| 1 | Signed phone updates (audit M1) | (A) and (B) | (A) met another way: store builds ship with updates off (mobile 1.40.1). Signing still open for test builds and Phase 9 | Not for (A). For (B): keys, one native build, a paid plan |
| 2 | Staff MFA + admin/moderator split (M2) | (B) | **Done** | Yes: turn on MFA, enrol staff, add staff rows |
| 3 | Captcha + your own email sender (L3) | (B) | Interface ready | Yes: Turnstile + SMTP accounts |
| 4 | Backup-route APK signing key (L4) | Next run of that workflow | Not started | Yes: a decision |
| 5 | GraphQL off on the hosted project (I7) | (B) | Local config done | Yes: one dashboard switch |
| 6 | Adapter guardrails (I1, I2, I3) | (B) | Rules written here | No: engineer checklist |

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

**Owner steps (Phase 9).**
1. Create a free Cloudflare **Turnstile** widget. Put its secret key in the
   hosted project's Auth captcha settings (provider: Turnstile). The site key
   is public and goes in the app's build settings.
2. Choose an email provider (for example Resend, Postmark or Amazon SES; some
   cost money: your decision), and set it as the project's custom SMTP sender.
3. Set the hourly email limit to match that provider's quota.
4. Ask an agent to switch on `[auth.captcha]` in `config.toml` and pass the
   captcha token from the sign-in screens.

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

## How to re-check

From the repo root:
```bash
bash scripts/check_rls.sh                       # static RLS rules
(cd mobile && npm run check)                    # app tests, lint, types
# SQL tests: CI (.github/workflows/supabase.yml) runs `supabase test db`;
# the mutation checks: python3 scripts/board_sql_mutants.py
```
Re-run the `mobile-security-auditor` agent before the first store build and
again before Phase 9.
