# KaiSip: email + password sign-in, safely (design)

**Written:** 28 Nov 2026 by the backend architect, for work stream A of
`docs/WEB_LAUNCH_PLAN.md` (step A1). **Status:** reviewed by
`mobile-security-auditor` (`docs/mobile/PASSWORD_DESIGN_AUDIT.md`, verdict "go
with changes"). The database part is built in step A2 **with the audit's fixes**
(see "What step A2 changed" below); where this text and the repo differ, the
repo files win: `supabase/migrations/20261128000000_password_guard.sql`,
`supabase/tests/41_passwords.sql`, `scripts/password_sql_mutants.py`,
`scripts/cloud_smoke.sh`. Not applied to the hosted project yet.
**Audience:** the owner (plain-English parts) and the engineers (parts marked
**Technical**). Anything I could not confirm on the vendor's own page or
source code is marked *(verify)*.

**What I checked, and where:**
- The Supabase Auth server's own source code (GoTrue, repo `supabase/auth`) at
  tag **v2.199.0**. That is the version the KaiSip project runs today: I read it
  from the project's public health address (`/auth/v1/health` answered
  `"version":"v2.199.0"` on 28 Nov 2026). The same check of `/auth/v1/settings`
  showed `"mailer_autoconfirm":false`, which means "Confirm email" is ON (go-live
  gate 1 is still met).
- Supabase's documentation source (repo `supabase/supabase`, folder
  `apps/docs/content/`). supabase.com itself can't be reached from this
  session, so I read the same pages from GitHub.
- The KaiSip repo: the migrations, `supabase/tests/`, `scripts/cloud_smoke.sh`,
  `mobile/src/webcloud/`, `mobile/src/cloud/`, `supabase/config.toml`, and the
  accounts and security plans.

### Decisions taken (28 Nov 2026; the experts agreed)

| # | Decision |
|---|---|
| 1 | Passwords: **at least 12 characters, with a lowercase letter, an uppercase letter, a number and a symbol** (28 Nov 2026, evening: "Require all 4 types, 12+"; replaces "at least 15, no required types"; deviations D3 and D4 in `docs/WEB_LAUNCH_PLAN.md`) |
| 2 | A **client-side common-password blocklist is required** (the apps; step A3) |
| 3 | The **"password changed" security notice is a hard go-live gate** (gate 15) |
| 4 | Android shows the **human check on each password sign-in** (accepted, R6) |
| 5 | **No third-party leaked-password lookup** for now (no HIBP range check; Pro's server check stays off on Free) |
| 6 | **Sign-in is Google or password; codes only confirm an email and reset** (owner, 28 Nov 2026, second decision; `docs/WEB_LAUNCH_PLAN.md`). Text below that offers "sign in with an emailed code" to learners is superseded. Beta Desk staff sign-in (email code + authenticator app) is not covered by this learner rule |

### What step A2 changed from this design (the audit's fixes)

- **Rule 4b (audit HIGH-1).** Rule 4 alone asked "has this account signed in in
  the last 10 minutes?". A second check now runs at COMMIT (a deferred
  constraint trigger, `kaisip_first_password_session`): PUT `/user` has by then
  signed out every other session, so every session left must be under 10
  minutes old and at least one must exist. A stolen old session can no longer
  add a first password by waiting for the owner's next sign-in. A session with
  no `created_at` counts as old.
- **Authenticator apps for staff only (audit HIGH-2).** A new trigger,
  `kaisip_mfa_staff_only` on `auth.mfa_factors`, lets only an account in
  `private.beta_desk_admins` or `private.staff` enrol a factor (or have one
  moved to it). Existing
  factors are untouched, so the Beta Desk admins keep their authenticator apps
  and their aal2 sign-in. Add a staff member to the list first, then they enrol.
  Its function is the one SECURITY DEFINER here (the Auth server's role can't
  read the private lists), in schema `private`, with `search_path` empty.
- **Order (audit LOW-2):** the new functions and triggers are created first,
  the old trigger dropped last.
- **Tests:** `41_passwords.sql` has 75 assertions (this draft's 34 plus the
  commit-time cases, the unconfirmed early return, the trigger shapes, the MFA
  rule and an invite-style confirmation). The Auth server's writes run as its
  own role, `supabase_auth_admin`, which owns the auth tables in the local shim
  as on hosted, so the tests prove the triggers fire for that role with no
  execute grant. `scripts/password_sql_mutants.py` has 36 mutants, all caught,
  and a static check that the old trigger is dropped last.
- **Implementation review (28 Nov 2026):** the hint says "Confirm it is you
  again (Google, password, or a reset code)"; the guards are revoked from
  `service_role` too; the MFA rule also fires when a factor's `user_id`
  changes; rule 4b skips an account deleted before the commit; the emergency
  brakes are graded, with ownership-free versions; the smoke probes need
  positive evidence (a network failure never passes) and check on the hosted
  project that a learner can't enrol an authenticator app.
- **Probes:** `cloud_smoke.sh` gains `binding` (audit LOW-4), and the `captcha`
  mode also covers `/magiclink` and `/resend` and checks that the refresh and
  Google (pkce) grants are not behind the human check. `pre-register` stops
  with "inconclusive" if the victim's code is refused (otherwise step 3 would
  pass for the wrong reason). Probe passwords satisfy both the old and the new
  dashboard rule.
- **Reset email wording (audit MEDIUM-1):** "nobody can change it without this
  code" is dropped, because a sign-in code works as well as a reset code.
- **Gates:** the final list is in `docs/WEB_LAUNCH_PLAN.md` (13a to 20).

---

## 1. The short version (for the owner)

**My recommendation, in one line:** offer passwords, but **only ever save a
password straight after the person has proved they own the inbox**, with an
emailed code or with Google. The database then keeps that password and wipes
any password that arrived any other way.

What a learner sees:

- **Create an account with a password:** they type their email and a
  password, we email an 8-digit code, they type the code, and the account is
  ready with their password. That is the same number of steps as every other
  "confirm your email" sign-up. Behind the scenes the password is held on the
  screen and saved only after the code is accepted.
- **Sign in with a password:** email + password, plus the usual human check.
- **Forgot password:** we email an 8-digit **reset code** (no link). They type
  it and choose a new password. This also works for people who first signed up
  with Google or with a code, so "forgot password" doubles as **"set a
  password later"**. *(Superseded in part by decision 6: learners no longer
  sign up "with a code"; read "who first signed up with Google".)*
- **Add or change a password** from the Account screen: allowed within 10
  minutes of signing in, like "Delete account" today.

**Why this design:**

1. **It closes the takeover (H1) completely, without trusting anyone's
   good luck.** H1 works because a password typed by a stranger *before* the
   real owner proved the inbox survives the proof. Here no password from
   before the proof survives, and the only password that is kept is one sent
   by a session that has just proved the inbox.
2. **Supabase's own server already does most of this now.** Since its
   13 Nov 2026 release it clears a stranger's password when the owner confirms
   with an email code, a reset code or Google. It still leaves **one** path
   open (confirming a password sign-up with the sign-up code), and it has twice
   merged and then reverted a change that would have weakened the code path.
   Our database rule holds whatever Supabase changes.
3. **No new service, no new cost.** It all runs on the Free plan, with the
   Resend email sender and Turnstile human check you already set up.
4. **Codes, not links, for resets.** A reset code works on any device (ask on
   the phone, read the email on a laptop), email scanners can't use it up, and
   the "no link in any KaiSip email" rule stays true. It also means no new
   redirect address and no app route that reads link data.

**What would change my mind:**
- If Supabase adds a setting that makes the sign-up confirmation clear a
  stranger's password, we could let the apps send the password with the
  sign-up request. (Keep the database rule anyway; it costs nothing.)
- If the Auth logs show password-guessing or reused-password attacks
  ("credential stuffing"), move to Supabase **Pro** (about US$25 a month
  *(verify the current price)*), which turns on the leaked-password check.
- If the human-check sheet on every Android password sign-in clearly hurts
  sign-ins, add a small in-app web view for Turnstile instead of the browser
  sheet (one new native package).

**Cheapest safe fallback:** launch accounts with Google and the emailed code
only, keep the current "wipe every password" rule, and add passwords in a later
release. Nothing in this design blocks that order. *(Superseded by decision 6:
an emailed code is no longer a sign-in method, so this fallback is now "Google
only".)*

### Decisions only you can make (my recommendation first)

1. **Password rules.** *Decided 28 Nov 2026 (evening): at least 12
   characters with all four types (the owner's choice; recorded as deviations
   D3 and D4). The text below is the recommendation as it was.*
   Recommended: **at least 15 characters, no required
   character types**, with the hint "use three or four ordinary words". This is
   what the US standard for passwords (NIST SP 800-63B revision 4, 2025) asks
   for when a password is the only factor, and it matters more for us because
   the leaked-password check is not on the Free plan. Friendlier alternative:
   at least 12 characters, letters and digits required.
2. **Security notice emails** ("Your KaiSip password was changed", "Google
   was linked to your account"). Recommended: **on**. They are how a learner
   finds out if someone else got in. They use a little of the daily email
   allowance (Resend's 100 a day). Whether these notices work on the Free plan
   with custom SMTP is *(verify in the dashboard)*.
3. **Accept that Android password sign-in shows the human check** (the same
   short browser sheet as email codes) every time, because Supabase's human
   check covers password sign-in and can't be switched on for some sign-in
   methods only. Recommended: accept it for now.

Everything else below is settled by the design or is a dashboard step.

---

## 2. What the Auth server already does (verified in its source code)

Plain English first, then the exact files.

| Situation | What Supabase Auth v2.199.0 does on its own | Safe without our rule? |
|---|---|---|
| A stranger signs up with your email and a password, then **you sign in with an emailed code** | Clears the stranger's password before sending your code | Yes (since v2.198.0) |
| ...then **you use "forgot password"** with a reset code | Clears the stranger's password when you enter the code | Yes (new in v2.198.0, 13 Nov 2026) |
| ...then **you sign in with Google** | Clears the password and removes the stranger's unconfirmed sign-in methods, then links Google | Yes |
| ...then **you sign up with your own password** and enter the sign-up code | Does **not** save your password (it can't tell who is genuine) and does **not** clear the stranger's one. When you confirm, **the stranger's password works and yours doesn't** | **No: this is H1 today** |
| Someone tries to sign up again with an address that already has a confirmed account | Changes nothing and sends nothing (the answer looks the same as a new sign-up, so nobody learns the address is registered) | Yes |
| Someone with your session (a stolen phone) adds or changes a password | Allowed if that session started in the last 24 hours ("Secure password change"), otherwise needs a fresh emailed code. If a password already exists, the current password is needed, except in a session that started with an email code or reset code | Partly |
| A password is changed | Signs out every other session of that account | Yes |
| A password sign-in on an account that isn't confirmed | Refused ("Email not confirmed") | Yes |
| "Forgot password" for an address with no account | Answers the same as for a real one, sends nothing | Yes |

**Technical: the exact source (supabase/auth, tag v2.199.0)**

- `internal/api/signup.go` lines 194–201: an existing **unconfirmed** user is
  not updated ("do not update the user because we can't be sure of their
  claimed identity"), so a second sign-up keeps the first sign-up's password
  and only re-sends a confirmation. A **confirmed** user returns
  `UserExistsError`, answered with an obfuscated user (no email sent).
  https://github.com/supabase/auth/blob/v2.199.0/internal/api/signup.go
- `internal/api/magic_link.go` lines 84–98 (`/otp` and `/magiclink`): for an
  unconfirmed user with a password, `ClearUnconfirmedPassword` runs and is
  audit-logged as `UnconfirmedPasswordClearedReason`, before the sign-up code is
  sent. https://github.com/supabase/auth/blob/v2.199.0/internal/api/magic_link.go
- `internal/api/verify.go`:
  - `recoverVerify` (line 370; the clear at line 388) clears an unconfirmed
    user's password before `Confirm`.
  - `signupVerify` (line 313) confirms **without** clearing. It is used for
    `type=signup`, and also for `type=email` when the code matches the
    confirmation token (the `EmailOTPVerification` case around line 744).
  - Every POST `/verify` issues the session with method `otp` (lines 185 and
    285), so a code or reset-code session's token carries `amr` method `otp`.
  - `isOtpValid` (line 800) accepts a code whether or not a PKCE challenge was
    sent, so supabase-js's PKCE mode doesn't break typed codes.
  https://github.com/supabase/auth/blob/v2.199.0/internal/api/verify.go
- `internal/api/external.go` lines 434–441 and
  `internal/models/user.go` `RemoveUnconfirmedIdentities` (line 1082): when an
  OAuth identity (Google) arrives for an unconfirmed user, the password is set
  to null, every other identity is removed, then the user is confirmed. The
  Supabase docs say the same ("when Auth can link a new identity to an existing
  user, it removes any other unconfirmed identities linked to that user"):
  `apps/docs/content/guides/auth/identities.mdx`, "How Auth links identities".
- `internal/models/linking.go`: automatic linking uses **verified** provider
  emails only; with no verified email a new account is made.
- `internal/api/token.go` lines 116 and 213: no password (null or `''`) means
  "Invalid login credentials"; a correct password on an unconfirmed email
  answers "Email not confirmed".
- `internal/api/user.go` (PUT `/user`):
  - line 151: a "first password" is one set on a user with no password;
  - line 154: "Secure password change" (`UpdatePasswordRequireReauthentication`)
    asks for a `nonce` (a code from `/reauthenticate`) when the session was
    created more than 24 hours ago;
  - lines 173–175: "Require current password"
    (`UpdatePasswordRequireCurrentPassword`) applies only when the user already
    has a password, and is skipped for a "recovery" session;
  - `internal/models/factor.go` line 66: `otp`, `magiclink` and `recovery`
    sessions all count as recovery sessions;
  - `internal/models/user.go` lines 497–524: `UpdatePassword` clears every
    pending code and signs out every **other** session.
- `internal/api/token.go` and `internal/models/user.go` `Authenticate`
  (line 529): a password sign-in may **re-write the hash** (only when database
  encryption of hashes is on) **before** the new session exists. This is why
  our rule does not police password *changes* (section 3).
- `internal/api/password.go`: at most **72 bytes**; minimum length counted in
  characters; the leaked-password (HaveIBeenPwned) check runs only when enabled.
- `internal/api/recover.go` line 54: unknown address → HTTP 200 and no email.
- `internal/api/api.go` lines 232–271 and `internal/api/middleware.go`
  `isIgnoreCaptchaRoute` (line 288): the human check (captcha) applies to
  `/signup`, `/recover`, `/resend`, `/magiclink`, `/otp` and to
  `/token?grant_type=password`; **not** to the `pkce`, `refresh_token` or
  `id_token` grants, and not to `/verify` or PUT `/user`.
- `CHANGELOG.md`, v2.198.0 (13 Nov 2026): "clear existing password on recover
  (#2887)", "assert password is rejected after magic link/OTP (#2896)", and
  "Update user password on each valid signup attempt (#2868, #2918)" **with two
  reverts (#2912, #2921)**. Had that change stayed, a stranger could re-set a
  password between the owner's `/otp` request and their code entry. v2.199.0
  (25 Nov 2026) adds "return 422 email_exists when an unverified provider email
  is in use (#2945)".

**Not confirmed:** whether Supabase may roll back or change any of this in a
later hosted release. We can't pin the hosted version, which is why the database
rule exists and why the smoke probes are re-run after Auth upgrades (gate 18).

---

## 3. The new database guard

### 3.1 The rules, in plain English

Today's rule: "a confirmed account never keeps a password." The new rules:

1. **An account created already confirmed with a password** (only possible from
   the admin side, or if "Confirm email" were ever switched off): the password
   is wiped.
2. **The moment an account becomes confirmed** (email code, reset code, Google,
   or a confirmation link), any password it carries is wiped, because it was
   typed before anyone proved the inbox. **This is the H1 fix.**
3. **The account's email address changes:** its password is wiped, because the
   password was proven only for the old inbox. (KaiSip doesn't offer email
   changes today; if it ever does, the learner picks a new password after
   confirming the new address.)
4. **A first password on a confirmed account** (adding one to a Google or code
   account, or after rules 1–3) is saved only if the account **signed in within
   the last 10 minutes**. Otherwise the database refuses the write. Only a
   "set my password" request can do this, and the apps check for a fresh
   sign-in first, so a learner never meets the refusal. A thief holding an old
   session can't quietly add a password to keep a way in.
5. **Changing an existing password** is left to Supabase's own checks: the
   current password (or a session that began with a code), the 24-hour rule,
   and "every other device is signed out". The database can't police it safely
   (see the re-hash note in section 2).

Clearing a password is always allowed. An unconfirmed account keeps whatever it
has: nobody can sign in to an unconfirmed account, and rule 2 runs the moment it
is confirmed.

**How the variants you asked about are covered:**

| Variant | Covered by |
|---|---|
| An email code confirms an unconfirmed password account | Supabase (`/otp` clears it) **and** rule 2 |
| A reset code confirms it | Supabase (`recoverVerify`) **and** rule 2 |
| Google links to an unconfirmed password account | Supabase (`RemoveUnconfirmedIdentities`) **and** rule 2 |
| The owner signs up with their own password over a stranger's pre-registration | **Rule 2 only** (Supabase leaves it open), plus the apps saving the password after the code |
| Email change | Rule 3; the new address must also confirm with its own code ("Secure email change" stays ON) |
| A password set by someone who never proved the inbox: admin create, "Confirm email" off | Rule 1 |
| ...a stolen session adding a password | Rule 4 (10 minutes), plus Supabase's 24-hour rule and the "password changed" email |
| ...the admin API setting a learner's password | Rules 1 and 4 (refused on purpose) |

**One thing to know:** a test user you create in the dashboard with a password
and "Auto confirm" ticked ends up with **no** password (rule 1). Make test
accounts the way learners do: sign up with a code, then set the password.

### 3.2 Technical: the migration (new file; the applied migrations are untouched)

> The SQL below is the design draft. The repo file adds rule 4b and the MFA
> rule, and reorders the statements (see "What step A2 changed" at the top).

File: `supabase/migrations/20261128000000_password_guard.sql`

```sql
-- KaiSip: passwords allowed, the pre-registration takeover still blocked
-- (28 Nov 2026; owner decision: Google or email + password; emailed 8-digit codes only confirm an email address and reset a password). NOT APPLIED ANYWHERE. Applied after
-- 20261109000000_beta_desk_sign_in.sql. Append-only once applied.
--
-- Replaces the trigger of 20261027000100_beta_no_passwords.sql (that file
-- stays exactly as it was applied). That trigger wiped EVERY password on a
-- confirmed account. This one keeps a password only when it was set by a
-- session that had just proved the inbox:
--
--  1. A row inserted already confirmed with a password (an admin create, or
--     sign-up with "Confirm email" off): the password is wiped.
--  2. The moment an account becomes confirmed (an email code, a reset code,
--     Google, a link), any password it carries is wiped: it was set before
--     anyone proved the inbox (security audit H1). The Auth server (GoTrue
--     v2.199.0) clears it itself on the /otp, recover and OAuth paths, but
--     not when a password sign-up is confirmed (internal/api/verify.go
--     signupVerify), and it has merged and reverted a change that would
--     reopen the /otp path. This rule holds whatever the Auth server does.
--  3. The email of an account with a password changes: the password is
--     wiped (it was proven for the old inbox only).
--  4. A FIRST password on a confirmed account needs a sign-in of that account
--     in the last 10 minutes (a session created then). Otherwise the write
--     is REFUSED. No sign-in flow writes a first password to a confirmed
--     account; only PUT /auth/v1/user and the admin API do, and the apps
--     check for a fresh sign-in first. Refusing the admin API is deliberate.
--  5. Changing an existing password is left to the Auth server (current
--     password or a code/reset session, the 24-hour rule, other sessions
--     signed out). It is not checked here: the Auth server may re-write the
--     hash during a password sign-in (internal/models/user.go Authenticate),
--     before the new session exists.
-- Clearing a password is always allowed. Unconfirmed accounts keep what they
-- hold (they can't sign in; rule 2 runs at confirmation).
--
-- GO-LIVE GATE (unchanged): "Confirm email" must be ON.
-- Restores (SCALING.md §7) load data with session_replication_role =
-- replica, so this trigger does not fire and restored passwords survive.
-- Emergency brake, if it ever disturbs a real sign-in flow (no app release):
--   drop trigger kaisip_password_guard on auth.users;
-- (the Auth server still clears pre-registered passwords on the code, reset
-- and Google paths, and the apps never call /signup), then fix it in a new
-- migration.
-- The function lives in schema private (not exposed by the Data API), runs
-- as the caller (the Auth server's role), and nobody may call it directly.

drop trigger kaisip_clear_password on auth.users;
drop function private.clear_password_when_confirmed();

create function private.guard_password() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- No password arriving: nothing to guard (clearing is always allowed).
  if coalesce(new.encrypted_password, '') = '' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Rule 1.
    if new.email_confirmed_at is not null then
      new.encrypted_password := '';
    end if;
    return new;
  end if;

  -- Rule 2: becoming confirmed now.
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    new.encrypted_password := '';
    return new;
  end if;

  -- Rule 3: the address changed (a case-only change is not a change).
  if old.email is not null and lower(new.email) is distinct from lower(old.email) then
    new.encrypted_password := '';
    return new;
  end if;

  -- Still unconfirmed: leave it.
  if new.email_confirmed_at is null then
    return new;
  end if;

  -- Rule 4: a first password on a confirmed account.
  if coalesce(old.encrypted_password, '') = ''
     and not exists (
       select 1 from auth.sessions s
       where s.user_id = new.id
         and s.created_at > now() - interval '10 minutes')
  then
    raise exception 'kaisip_password_needs_recent_sign_in'
      using errcode = 'P0001',
            hint = 'Confirm it is you again (Google, password, or a reset code), then set the password within 10 minutes.';
  end if;

  -- Rule 5: a change to an existing password, or any other update.
  return new;
end $$;
revoke all on function private.guard_password() from public, anon, authenticated;

create trigger kaisip_password_guard
  before insert or update of email_confirmed_at, encrypted_password, email on auth.users
  for each row execute function private.guard_password();
```

Notes for the engineer:
- `UPDATE OF ...` decides only **when** the trigger fires. A BEFORE trigger may
  change any column of `NEW`, so rule 3 can wipe the password during an email
  change that doesn't list `encrypted_password`. The current trigger relies on
  the same behaviour.
- When the Auth server raises, PUT `/user` answers **500** ("Error during
  password storage") and the whole write rolls back. The apps never see it if
  they check for a fresh sign-in first (section 4).
- Applying it: through the Supabase MCP with the owner present (the MCP asks
  for confirmation because of `DROP`). That `DROP TRIGGER` works on the hosted
  `auth.users` is *(verify)*: the 27 Oct emergency brake assumes it, and
  Supabase's own docs use `drop trigger ... on auth.users`. The migration runs
  as one transaction, so if the hosted project refuses, nothing changes and the
  old wipe-everything trigger stays.
- `auth.sessions` has an index on `user_id` *(verify)*; the lookup runs only on
  first-password writes.
- Record the hosted version and md5 in the "Hosted apply record" table, as for
  earlier migrations.

### 3.3 Technical: pgTAP tests

> The draft below grew to 75 assertions in the repo (`supabase/tests/41_passwords.sql`).

**New file `supabase/tests/41_passwords.sql`.** Same style as `40_beta.sql`:
one transaction, rolled back.

```sql
-- Password guard (20261128000000_password_guard.sql). Passwords are allowed,
-- but only one set by a session that has just proved the inbox survives.
-- The pre-registration takeover (security audit H1) and its variants stay
-- closed; a sign-in flow never fails because of the guard.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(34);

-- ── 0. The trigger and its function ────────────────────────────────
select has_trigger('auth', 'users', 'kaisip_password_guard', 'the password guard is on auth.users');
select hasnt_trigger('auth', 'users', 'kaisip_clear_password', 'the wipe-every-password trigger is gone');
select hasnt_function('private', 'clear_password_when_confirmed', 'and so is its function');
select ok(not has_function_privilege('anon', 'private.guard_password()', 'execute')
          and not has_function_privilege('authenticated', 'private.guard_password()', 'execute'),
  'app roles cannot execute the guard');
select is((select prosecdef from pg_proc where oid = 'private.guard_password()'::regprocedure), false,
  'the guard runs as the caller, not as its owner');

-- ── 1. H1 on the sign-up confirmation path (the one the Auth server leaves open)
select lives_ok($$ insert into auth.users (id, email, encrypted_password)
                   values ('00000000-0000-0000-0000-0000000000f1', 'victim@test.invalid', '$2a$10$attacker.chosen') $$,
  'an unconfirmed sign-up with a password is accepted (nothing can use it yet)');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'),
  '$2a$10$attacker.chosen', 'an unconfirmed account keeps its password');
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$throwaway.second'
                   where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'a new throwaway password while the first code is pending works');
select lives_ok($$ update auth.users set confirmation_token = '', email_confirmed_at = now()
                   where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'confirming the email never fails');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'), '',
  'H1: the password set before the inbox was proven is wiped at confirmation');

-- ── 2. The real owner's sign-up: the fresh session saves their password ─
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', now());
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$owner.chosen'
                   where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'right after the code, the owner''s own new session saves a password');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'),
  '$2a$10$owner.chosen', 'and it is kept');
select lives_ok($$ update auth.users set last_sign_in_at = now()
                   where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'other changes to the account still work...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'),
  '$2a$10$owner.chosen', '...and keep the password');

-- ── 3. Changing an existing password: the Auth server's rules, never the session age
delete from auth.sessions where user_id = '00000000-0000-0000-0000-0000000000f1';
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$owner.changed'
                   where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'a change (or a re-hash during a password sign-in) is not blocked by an old or missing session');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'),
  '$2a$10$owner.changed', 'and the changed password is kept');

-- ── 4. Email change (rule 3) ───────────────────────────────────────
select lives_ok($$ update auth.users set email = 'VICTIM@test.invalid'
                   where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'a case-only change of the address works...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'),
  '$2a$10$owner.changed', '...and is not an email change: the password stays');
select lives_ok($$ update auth.users set email = 'victim-new@test.invalid'
                   where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'changing the address works...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'), '',
  '...and wipes the password, which was proven for the old inbox only');

-- ── 5. H1 on the code path: the Auth server clears first (to null), then confirms
insert into auth.users (id, email, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000f2', 'f2@test.invalid', '$2a$10$attacker.chosen');
select lives_ok($$ update auth.users set encrypted_password = null
                   where id = '00000000-0000-0000-0000-0000000000f2' $$,
  'removing a password always works (the Auth server''s own clear)');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000f2';
select is((select coalesce(encrypted_password, '') from auth.users where id = '00000000-0000-0000-0000-0000000000f2'), '',
  'after a code confirmation there is no password');

-- ── 6. A password and a confirmation in one write (Google, if the server ever confirmed first)
insert into auth.users (id, email, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000f3', 'f3@test.invalid', '$2a$10$attacker.chosen');
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$both', email_confirmed_at = now()
                   where id = '00000000-0000-0000-0000-0000000000f3' $$,
  'a password and a confirmation in one write...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f3'), '',
  '...leave no password');

-- ── 7. Inserted already confirmed with a password (rule 1) ─────────
select lives_ok($$ insert into auth.users (id, email, email_confirmed_at, encrypted_password)
                   values ('00000000-0000-0000-0000-0000000000f4', 'f4@test.invalid', now(), '$2a$10$preset') $$,
  'inserting a confirmed account with a password works...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f4'), '',
  '...and stores no password (admin create, or "Confirm email" off)');

-- ── 8. A first password needs a sign-in in the last 10 minutes (rule 4)
-- f5: a Google or code account whose newest sign-in was 11 minutes ago (a stolen old session).
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000f5', 'f5@test.invalid', now() - interval '1 day', '');
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000f5', now() - interval '11 minutes');
select throws_ok($$ update auth.users set encrypted_password = '$2a$10$thief.chosen'
                    where id = '00000000-0000-0000-0000-0000000000f5' $$,
  'P0001', 'kaisip_password_needs_recent_sign_in',
  'a session from 11 minutes ago cannot add a first password');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f5'), '',
  'and nothing was saved');
-- f6: no session at all (the admin API), while ANOTHER account has a fresh one.
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000f6', 'f6@test.invalid', now() - interval '1 day', null);
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1', now());
select throws_ok($$ update auth.users set encrypted_password = '$2a$10$admin.set'
                    where id = '00000000-0000-0000-0000-0000000000f6' $$,
  'P0001', 'kaisip_password_needs_recent_sign_in',
  'with no recent sign-in of its own (another account''s fresh session doesn''t count), no first password');
-- f5 signs in again (a code, Google or a reset code): a new session.
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000f5', now() - interval '9 minutes');
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$owner.later'
                   where id = '00000000-0000-0000-0000-0000000000f5' $$,
  '"Set a password later": within 10 minutes of a new sign-in it works');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f5'),
  '$2a$10$owner.later', 'and it is kept');

-- ── 9. Unconfirmed accounts and clearing ───────────────────────────
select lives_ok($$ insert into auth.users (id, email, encrypted_password)
                   values ('00000000-0000-0000-0000-0000000000f7', 'f7@test.invalid', '$2a$10$throwaway') $$,
  'a new email-code account with the Auth server''s throwaway password is created normally');
select lives_ok($$ update auth.users set encrypted_password = ''
                   where id = '00000000-0000-0000-0000-0000000000f5' $$,
  'clearing a password on a confirmed account always works');
select hasnt_trigger('auth', 'users', 'kaisip_refuse_new_password', 'the earliest raising trigger is still gone');

select * from finish();
rollback;
```

That makes 34 assertions; CI catches a miscount. Whether `auth.sessions`
accepts a row with only `id`, `user_id` and `created_at` is *(verify in CI)*;
if a column turns out to be required, add it to the inserts.

**Change to `supabase/tests/40_beta.sql`.** Test files aren't migrations, so
edit it: delete section 2 ("No passwords on confirmed accounts", the 18
assertions from `has_trigger(... 'kaisip_clear_password' ...)` down to
`hasnt_trigger(... 'kaisip_refuse_new_password' ...)`), change `plan(22)` to
`plan(4)`, and change its header to say the password rules moved to
`41_passwords.sql`.

**Mutation check (recommended).** Add a small `scripts/password_sql_mutants.py`,
like `sync_sql_mutants.py`, that changes the migration one way at a time and
expects `41_passwords.sql` to fail:
- `interval '10 minutes'` becomes `'1 day'`;
- rule 2's `return new;` is dropped;
- `lower(new.email)` becomes `new.email`;
- the `raise` becomes `return new`;
- the insert branch's wipe is removed.

### 3.4 Technical: `scripts/cloud_smoke.sh` probes

All of these run against the hosted project **with captcha still off**, as
today, except the last one (the `captcha` mode), which runs after captcha is
switched on. Each probe that sends email waits 61 seconds first, because the
Auth server sends at most one email a minute per address.

**(a) `pre-register` grows a `VARIANT`** (`signup`, the default and today's
probe; `otp`; `recover`). Each variant needs a fresh probe address. Replace
steps 2 and 3 of today's block with:

```bash
  VARIANT=${VARIANT:-signup}
  case $VARIANT in
    signup)  vtype=signup ;;   # the victim types the code from the attacker's own sign-up
    otp)     vtype=email
             echo "   waiting 61 s (one email a minute per address)"; sleep 61
             curl -sS -o /dev/null -w '   otp: HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/otp" \
               --data "{\"email\":\"$PROBE_EMAIL\",\"create_user\":true}" ;;
    recover) vtype=recovery
             echo "   waiting 61 s (one email a minute per address)"; sleep 61
             curl -sS -o /dev/null -w '   recover: HTTP %{http_code}\n' "${hdr[@]}" -X POST "$AUTH/recover" \
               --data "{\"email\":\"$PROBE_EMAIL\"}" ;;
    *) echo "VARIANT must be signup, otp or recover"; exit 2 ;;
  esac
  printf '2. Enter the NEWEST code emailed to %s (the victim confirming, %s): ' "$PROBE_EMAIL" "$VARIANT"
  read -r code
  curl -sS -o /dev/null -w '   verify: HTTP %{http_code} (200 expected)\n' "${hdr[@]}" -X POST "$AUTH/verify" \
    --data "{\"type\":\"$vtype\",\"email\":\"$PROBE_EMAIL\",\"token\":\"$code\"}"
  # step 3 (sign in with the attacker's password, must be refused) is unchanged
```

**(b) New mode `password`** (acceptance test S10, the legitimate flows work):

```bash
if [ "${1:-}" = password ]; then
  : "${SUPABASE_URL:?}" "${SUPABASE_ANON_KEY:?}" "${PROBE_EMAIL:?set PROBE_EMAIL (an address with no account yet)}"
  AUTH="${SUPABASE_URL%/}/auth/v1"; hdr=(-H "apikey: $SUPABASE_ANON_KEY" -H 'Content-Type: application/json')
  rnd() { od -An -N12 -tx1 /dev/urandom | tr -d ' \n'; }
  pw1="probe one $(rnd) words"; pw2="probe two $(rnd) words"; evil="evil $(rnd) words here"
  token_of() { sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'; }
  status() { curl -sS -o /dev/null -w '%{http_code}' "$@" || echo 000; }
  ok=0; bad=0; check() { if [[ $2 == $3 ]]; then ok=$((ok+1)); echo "  ✓ $1 ($2)"; else bad=$((bad+1)); echo "  ✗ $1 ($2, wanted $3)"; fi; }

  echo "1. Create the account the way the apps do: code first, then the password"
  curl -sS -o /dev/null "${hdr[@]}" -X POST "$AUTH/otp" --data "{\"email\":\"$PROBE_EMAIL\",\"create_user\":true}"
  printf '   code: '; read -r c1
  t1=$(curl -sS "${hdr[@]}" -X POST "$AUTH/verify" --data "{\"type\":\"email\",\"email\":\"$PROBE_EMAIL\",\"token\":\"$c1\"}" | token_of)
  check "saving the password with the fresh session" \
    "$(status "${hdr[@]}" -H "Authorization: Bearer $t1" -X PUT "$AUTH/user" --data "{\"password\":\"$pw1\"}")" 200
  check "signing in with it" \
    "$(status "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw1\"}")" 200
  check "a too-short password is refused" \
    "$(status "${hdr[@]}" -H "Authorization: Bearer $t1" -X PUT "$AUTH/user" --data '{"password":"short"}')" 422

  echo "2. A stranger signs up again with this address and their own password"
  curl -sS -o /dev/null "${hdr[@]}" -X POST "$AUTH/signup" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$evil\"}"
  check "the stranger's password does not sign in" \
    "$(status "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$evil\"}")" 400

  echo "3. Forgot password: a reset code, then a new password"
  echo "   waiting 61 s"; sleep 61
  curl -sS -o /dev/null "${hdr[@]}" -X POST "$AUTH/recover" --data "{\"email\":\"$PROBE_EMAIL\"}"
  printf '   reset code: '; read -r c2
  t2=$(curl -sS "${hdr[@]}" -X POST "$AUTH/verify" --data "{\"type\":\"recovery\",\"email\":\"$PROBE_EMAIL\",\"token\":\"$c2\"}" | token_of)
  check "setting the new password after the reset code" \
    "$(status "${hdr[@]}" -H "Authorization: Bearer $t2" -X PUT "$AUTH/user" --data "{\"password\":\"$pw2\"}")" 200
  check "the old password no longer works" \
    "$(status "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw1\"}")" 400
  check "the new one does" \
    "$(status "${hdr[@]}" -X POST "$AUTH/token?grant_type=password" --data "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$pw2\"}")" 200
  check "the first session was signed out by the change" \
    "$(status "${hdr[@]}" -H "Authorization: Bearer $t1" "$AUTH/user")" '4??'
  echo "password probe: $ok passed, $bad failed. Delete the probe account afterwards."
  [ "$bad" -eq 0 ]; exit
fi
```

(`check` compares with a pattern, so `'4??'` means any 4xx. The last check
assumes a signed-out session's access token is refused at once by `GET /user`,
with 401 or 403 (`session_not_found`) *(verify)*. If it answers 200, drop that
check rather than wait for the token to expire.)

**(c) The `EMAIL_A` block changes meaning.** It used to show that "a password
set by a session can't be used". Now it shows that **a stale session can't add a
first password**. Precondition: learner A has no password (a code or Google
account), and `JWT_A` comes from a sign-in **more than 11 minutes** (and less
than an hour) ago. The script reads the token's sign-in time itself and skips
with a note if it is too fresh:

```bash
if [ -n "${EMAIL_A:-}" ]; then
  echo "Stale session (S9): A's session, signed in over 10 minutes ago, tries to add a first password:"
  payload=$(cut -d. -f2 <<<"$JWT_A" | tr '_-' '/+'); while (( ${#payload} % 4 )); do payload+='='; done
  newest=$(base64 -d <<<"$payload" 2>/dev/null | grep -o '"timestamp":[0-9]*' | cut -d: -f2 | sort -n | tail -n 1)
  age=$(( $(date +%s) - ${newest:-0} ))
  if [ "$age" -le 660 ]; then
    echo "  · skipped: JWT_A's sign-in is only ${age}s old; use a token from a sign-in 11 to 59 minutes ago"
  else
    probe_pw="smoke probe $(od -An -N12 -tx1 /dev/urandom | tr -d ' \n') words"
    expect "a stale session cannot add a first password" \
      "$(request PUT "${SUPABASE_URL%/}/auth/v1/user" "$JWT_A" "{\"password\":\"$probe_pw\"}")" denied
    expect "and no such password signs in" \
      "$(request POST "${SUPABASE_URL%/}/auth/v1/token?grant_type=password" '' "{\"email\":\"$EMAIL_A\",\"password\":\"$probe_pw\"}")" denied
  fi
fi
```

**(d) New mode `captcha`** (acceptance test S7, extended; run after captcha is
switched on):

```bash
if [ "${1:-}" = captcha ]; then
  # Each request must be refused with error_code captcha_failed (HTTP 400).
  for p in "token?grant_type=password|{\"email\":\"nobody@example.invalid\",\"password\":\"x x x x x x x x\"}" \
           "recover|{\"email\":\"nobody@example.invalid\"}" \
           "otp|{\"email\":\"nobody@example.invalid\",\"create_user\":false}" \
           "signup|{\"email\":\"nobody@example.invalid\",\"password\":\"x x x x x x x x\"}"; do
    path=${p%%|*}; body=${p#*|}
    out=$(curl -sS -w ' %{http_code}' -H "apikey: $SUPABASE_ANON_KEY" -H 'Content-Type: application/json' \
          -X POST "${SUPABASE_URL%/}/auth/v1/$path" --data "$body")
    [[ $out == *captcha* && $out == *' 400' ]] && echo "  ✓ /$path needs the human check" || { echo "  ✗ /$path: $out"; exit 1; }
  done
  exit 0
fi
```

---

## 4. Sign-up, sign-in and reset: the flows

### 4.1 Plain English

| Learner action | What happens | Emails sent |
|---|---|---|
| Create account with a password | Human check → we email a code → they type it → signed in → the app saves the password with that brand-new session | **2**: the code, then the "password changed" notice (saving the first password is a change to the Auth server). Both count against the same hourly "Emails sent" limit (corrected in step A3) |
| ...the address already has an account | The code signs them in to it, and their new password is saved (they proved the inbox). Screen: "This email already had a KaiSip account. You're signed in and your password is saved." | 2 (code + notice; only the code when the password was already theirs) |
| Sign in with a password | Human check → signed in | none |
| Wrong password | "That email and password don't match." The same words whether or not the address exists | none |
| Forgot password | Human check → "If there's an account for this email, we've sent a code." → code + new password → signed in, every other device signed out | 1 reset code (+1 "password changed" notice if turned on) |
| Signed up with Google or a code, wants a password | Either "Forgot password", or Account → "Add a password" (asks them to confirm it's them first if their last sign-in was over 10 minutes ago) | 0 or 1 |
| Change password | Account → "Change password": current password, or confirm with a code | 0 or 1 |

*(Superseded in part by decision 6: there is no "sign in with a code". A
learner signs up with email + password (the code only confirms the address)
or Google; confirming "it's you" is Google, the password, or a reset code.)*
| Delete account | The fresh sign-in can now also be a password (the 10-minute rule is unchanged) | 0 |

**Where the reset lands:** nowhere, because the reset is a typed code, not a
link. The two existing redirect addresses (`https://kaisip.com/` and
`kaisip://auth-callback`) stay exactly as they are and are used only by Google.
If a reset **link** is ever wanted, it would have to use PKCE with
`redirect_to` set to exactly one of those two addresses. That has three
problems: it fails when the email is opened on a different device or browser
from the one that asked (the PKCE secret stays in the first browser); a link
scanner may use it up; and on Android the `auth-callback` route would have to
read the link's data, which breaks the app's "no route reads link parameters"
rule. So: codes.

**The password never leaves the screen until it is saved.** On the website it is
held in memory, never in localStorage or sessionStorage, never in analytics. On
the phone it lives in the sign-in screen's state, never in a saved (persisted)
store, never in a log. It is forgotten after it is saved, after a failure, or
after 10 minutes. Password managers work: the web forms use
`autocomplete="username"`, `"current-password"` and `"new-password"`, and the
phone fields use the matching autofill hints.

### 4.2 Technical: endpoints (the same on web and Android)

| Step | Endpoint | Human check? | PKCE? |
|---|---|---|---|
| Send the sign-up (or sign-in) code | `POST /auth/v1/otp` `{email, create_user:true, gotrue_meta_security:{captcha_token}}` | yes | no (web); supabase-js may add a challenge in `pkce` mode, which is harmless with code-only emails |
| Code → session | `POST /auth/v1/verify` `{type:"email", email, token}` | no | no |
| Save or change the password | `PUT /auth/v1/user` `{password, current_password?}` with `Authorization: Bearer <fresh token>` | no | no |
| Password sign-in | `POST /auth/v1/token?grant_type=password` `{email, password, gotrue_meta_security:{captcha_token}}` | yes | no |
| Ask for a reset code | `POST /auth/v1/recover` `{email, gotrue_meta_security:{captcha_token}}`, **with no `redirect_to` and no `code_challenge`** | yes | no |
| Reset code → session | `POST /auth/v1/verify` `{type:"recovery", email, token}` | no | no |
| Google (unchanged) | `GET /auth/v1/authorize?...code_challenge...` then `POST /token?grant_type=pkce` | no | **yes** |

- The apps never call `POST /auth/v1/signup`. Sign-up is `/otp` followed by
  PUT `/user`. That keeps the password out of the one request the Auth server
  can't protect, gives a code even when the address already has an account
  (`/signup` sends nothing for a confirmed address), and needs one human check,
  as today.
- PUT `/user` after `/verify` meets all three checks: the session is seconds
  old (rule 4 and the 24-hour rule), and a code or reset session is a
  "recovery" session, so no current password is needed.
- Error words the server sends (`error_code`): `invalid_credentials`,
  `email_not_confirmed`, `weak_password` (with `weak_password.reasons`:
  `length`, `characters`, `pwned`), `same_password`,
  `current_password_required`, `current_password_mismatch`,
  `reauthentication_needed`, `insufficient_aal` (staff with an authenticator
  app), `captcha_failed`, `over_request_rate_limit`,
  `over_email_send_rate_limit`. A 500 from PUT `/user` is almost always rule 4.
- Max 72 bytes (UTF-8), checked on the client before sending.
- Sign-in methods in the token: a password sign-in adds `amr` method
  `password`; code and reset sessions add `otp`; Google adds `oauth`.

### 4.3 Technical: how `mobile/src/webcloud/auth.ts` grows (signatures only)

> **As built in step A3 (28 Nov 2026); the repo files win.** Names that
> changed from this draft:
> - `passwordRules.ts`: `checkPassword(password, context?: string | { email?, names? })`
>   returns, most important first: `invalid_characters`, `too_short`,
>   `too_long`, `missing_characters` (owner decision 28 Nov 2026, evening:
>   a lowercase letter, an uppercase letter, a digit and a symbol, ASCII,
>   exactly as the server checks), `contains_email` (the email or the
>   learner's Google name), `contains_service_word`, `common`, `too_simple`
>   (the predictable reasons come before `missing_characters`). The password
>   is sent in **NFKC** form, and 12 code points are needed in both NFC and
>   NFKC. `passwordChecklist` gives the five checklist items (12 or more
>   characters; a lowercase letter; an uppercase letter; a number; a symbol)
>   and refused / ok / strong; `passwordMissingText` says what is missing.
>   Sign-in applies none of this. The whole password is
>   compared (NIST §3.1.1.2): it is refused when it can be written as
>   predictable pieces with at most 2 characters left over (up to two list
>   entries and three word pieces in all), or when fewer than 10 real
>   characters remain after repeats, sequences, copies and years. The
>   comparison form strips accents and invisible characters, reads Cyrillic
>   and Greek look-alikes as Latin and letter-for-number swaps per position,
>   and also reads the password backwards. `assessPassword` adds whether the
>   word lists are loaded (`complete`). `passwordGuidance(problem)` gives the
>   words to show after a refusal. `loadPasswordWords` accepts only the
>   lists whose sizes and SHA-256 the build recorded (four lists: short,
>   dict, local, names). Review round 3 added structural rules (one word with
>   numbers; the account's own words incl. the whole domain and reversed
>   words; a full name with numbers; a repeated word counts once; diagonal
>   walks, doubled-letter sequences, mirrors) and states what the rules
>   cannot do, with a held-out measure (`docs/WEB_LAUNCH_PLAN.md`). A
>   leaked-password range check (`webcloud/breach.ts`: at most two forms, padded
>   k-anonymity queries, 3-second timeout, fails open, `breachState()`) is
>   ON since 28 Nov 2026 (owner decision; `BREACH_CHECK_ON = true`), on
>   sign-up, reset and "set a password", never at sign-in. Its privacy
>   paragraph is a draft in §7.
>   The word lists are loaded with `loadPasswordWords` (on the website a
>   separate file, `assets/kaisip-password-words.js`, fetched when a password
>   form opens; no password is saved until it is loaded).
> - `finishPasswordReset` returns the same `{ account, passwordSaved,
>   unchanged?, problem? }` as `finishPasswordSignUp`. `unchanged`: the new
>   password was already the account's; the client then signs out every other
>   session itself (`POST /logout?scope=others`), as a change would have;
>   when the server does not confirm that, it says `othersSignedOut: false`
>   instead of `unchanged`.
> - `signInWithPassword` returns the account plus `passwordChangeSuggested`
>   when the password fails today's rules.
> - Added: `passwordNeeded()` (a code session without a saved password: no
>   sync, signed out after 10 minutes) and `sessionEnded()` (`expired`, `idle`,
>   `password_not_set`, `revoked`; kept across reloads in
>   `kaisip_auth_ended_v1`, a reason and a time only). Removed from the public
>   client: `sendEmailCode` / `verifyEmailCode` (no code sign-in).
> - `errors.ts` detail words: `password_wrong`, `password_invalid_characters`,
>   `password_too_short`, `password_too_long`, `password_common`,
>   `password_too_simple`, `password_contains_email`,
>   `password_contains_service_word`, `password_leaked`, `password_weak`,
>   `password_same`, `password_current_needed`, `password_current_wrong`,
>   `password_needed`; with `reauth_required`: `recent_sign_in`, `aal2`; with
>   `unauthorized`: `session_expired`, `password_not_set`; with `offline`:
>   `password_rules`. (This draft's `password_long` is `password_too_long`;
>   `password_current` is split in two.)
> - `config.ts` gains one storage key, `kaisip_auth_ended_v1` (no
>   identifiers), and the limits `SESSION_MAX_AGE_MS` (30 days),
>   `SESSION_IDLE_MAX_MS` (14 days), `CODE_SESSION_MAX_MS` (10 minutes),
>   `PASSWORD_FRESH_MS` (9 minutes), `RESET_RESEND_MS` (60 seconds).

The draft as reviewed:

A new shared, pure module (used by the web and the phone):

```ts
// mobile/src/engine/passwordRules.ts
export const PASSWORD_MIN_CHARS: number;   // 12 (owner decision 1, 28 Nov 2026 evening), the same as the dashboard
export const PASSWORD_MAX_BYTES = 72;      // the Auth server's limit (bcrypt)
export type PasswordProblem =
  | 'too_short' | 'too_long' | 'too_simple'   // repeats, sequences, "password…", "kaisip…", "cisa…"
  | 'contains_email' | 'missing_characters';  // required characters: decision 1 picked all four types
export function checkPassword(password: string, email?: string): PasswordProblem[];
```

`WebAuth` additions (in `auth.ts`):

```ts
export interface WebAuth {
  // ...everything there today, unchanged...

  /** Password sign-in (human check token when captcha is on). */
  signInWithPassword(email: string, password: string, opts?: { captchaToken?: string; shared?: boolean }): Promise<AccountInfo>;

  /** "Create an account with a password", step 1: checks the password locally, then emails a code. The password is NOT sent. */
  startPasswordSignUp(email: string, password: string, opts?: { captchaToken?: string }): Promise<void>;

  /** Step 2: the code → a session (saved), then the password is saved with that fresh session.
   *  If the code works but the password is refused, the learner stays signed in and `passwordSaved` is false. */
  finishPasswordSignUp(email: string, code: string, password: string, opts?: { shared?: boolean }):
    Promise<{ account: AccountInfo; passwordSaved: boolean; problem?: PasswordProblem | 'leaked' | 'server' }>;

  /** "Forgot password" (also "set a password later"): emails a reset code. Same answer whether or not the account exists. */
  sendPasswordResetCode(email: string, opts?: { captchaToken?: string }): Promise<void>;

  /** The reset code → a session (saved), then the new password. Every other session is signed out by the server. */
  finishPasswordReset(email: string, code: string, newPassword: string, opts?: { shared?: boolean }): Promise<AccountInfo>;

  /** Add or change the signed-in account's password. CloudError('reauth_required') before sending
   *  unless the newest sign-in is under 9 minutes old (the database allows 10). */
  setPassword(newPassword: string, opts?: { currentPassword?: string }): Promise<void>;

  /** "Confirm it's you" with the password (delete account, add or change a password). */
  reauthWithPassword(password: string, opts?: { captchaToken?: string }): Promise<AccountInfo>;
}
```

Smaller changes in the same folder:
- `errors.ts`: `Call` gains `'password' | 'recover' | 'user_update'`, with new
  `detail` words `password_wrong`, `password_weak`, `password_leaked`,
  `password_long`, `password_same`, `password_current`; `reauthentication_needed`
  and a 500 on `user_update` map to `reauth_required`. Every `detail` word gets
  calm copy in `cloud/types.ts`.
- `auth.ts` `info()`: treat `amr` method `password` as provider `email` (today
  only `otp` is).
- `config.ts`: no new address and no new storage key. The password is never
  stored.

**Android (`mobile/src/cloud/types.ts` `AuthPort`, the supabase-js adapter
later):** the same six methods with the same meaning, without the `shared`
option. Each calls supabase-js: `signInWithPassword({email, password,
options:{captchaToken}})`; `signInWithOtp({email, options:{shouldCreateUser:true,
captchaToken}})`, then `verifyOtp({email, token, type:'email'})`, then
`updateUser({password})`; `resetPasswordForEmail(email, {captchaToken})`
**without `redirectTo`**, then `verifyOtp({type:'recovery'})`, then
`updateUser({password})`. `reauthenticate(p, code?)` gains an optional
`password`. `CaptchaPort.token(action)` gains the actions `'password_sign_in'`
and `'password_reset'` (the same `kaisip.com/human-check` page). The memory
backend (`cloud/memory/`) implements all of them, so tests and screenshots
cover the new screens.

---

## 5. Supabase dashboard settings (owner checklist, in order)

Do these **after** Claude says the new database guard is applied and its tests
are green. Each step is a box to tick.

**Authentication → Sign In / Providers → Email**
1. [ ] **Confirm email: stays ON.** Never turn it off (go-live gate 1).
2. [ ] **Secure email change: stays ON.**
3. [ ] **Secure password change: ON.** This asks for a fresh emailed code before
   a password change in a session older than 24 hours.
4. [ ] **Require current password when updating: ON** (the exact label is
   *(verify)*; the Supabase docs call it "Require current password when
   changing password").
5. [ ] **Minimum password length: 12** (decision 1, 28 Nov 2026 evening).
   Reported already set on the hosted project: **confirm, do not change**.
6. [ ] **Password requirements: "Lowercase, uppercase letters, digits and
   symbols"** (the same; confirm, do not change).
7. [ ] **Prevent use of leaked passwords:** **not available on the Free plan**
   (Pro and above, from Supabase's own docs). Leave it off; it is a listed
   remaining risk.
8. [ ] Email OTP length **8**, expiry **600**: unchanged.
9. [ ] Save.

**Authentication → Emails**
10. [ ] **Templates → Reset Password:** paste the new subject and body from
    section 6. (Today it says "Your KaiSip sign-in code".)
11. [ ] **Security notifications → Password changed: ON**, and paste its text
    (section 6). Same for **Sign-in method linked** if offered. *(verify that
    these exist on Free with custom SMTP)*

**Authentication → Rate Limits** (the box next to each value shows its unit,
per hour or per 5 minutes; note which it is *(verify)*)
12. [ ] Emails sent: **20** (unchanged). A password sign-up sends **two** emails
    under this one hourly limit: the code and the "password changed" notice
    (so about 10 sign-ups an hour at most); a reset sends two as well;
    password sign-ins send none. Raise it with the owner if sign-ups queue.
    The apps also record the time in the account (`user_metadata
    .kaisip_password_set_at`, written with every password save) so a
    "password changed on <date>" line can show in the app as a second
    channel beside the email (data only today; the screen comes later).
13. [ ] Sign-ups and sign-ins: **30** (unchanged). This bucket covers `/otp`,
    `/signup`, `/recover`, `/resend` and saving a password, per IP address.
14. [ ] Token verifications: **30** (unchanged; covers typed codes and reset
    codes).
15. [ ] Token refreshes: **150** (unchanged). **Password sign-ins share this
    bucket with session refreshes**, so it can't go lower without signing
    people out. The human check is what really slows password guessing.
16. [ ] If the page shows per-address waits ("Send OTPs", "Password reset
    request", "Signup confirmation request"), leave them at 60 seconds.

**Authentication → Attack Protection**
17. [ ] **CAPTCHA (Turnstile): ON, on go-live day, last** (as planned). It now
    also guards password sign-in and "forgot password". Run
    `bash scripts/cloud_smoke.sh captcha` straight after.

**Leave as they are:** URL Configuration (no new redirect address), Anonymous
sign-ins OFF, Manual linking OFF, Phone OFF, Allow new users to sign up ON. No
Auth hook (the "password verification" hook, which could lock an account after
failed tries, is Teams/Enterprise only).

**The repo's local mirror** (`supabase/config.toml`, Claude's pull request, not
the owner): `minimum_password_length = 15`, `password_requirements = ""`, the
recovery template pointed at a new `supabase/templates/password_reset_code.html`
with the new subject, the password-changed notification on (if the CLI supports
`[auth.email.notification.password_changed]` *(verify)*), and the comment "The
app never offers passwords" rewritten.

---

## 6. Email templates (same plain, code-only style as AUTH_EMAIL_TEMPLATES.md)

Every email keeps the rules: a code only, never a link; 8 digits; 10 minutes;
"the KaiSip app or the KaiSip website". **Confirm signup** and **Magic Link**
stay exactly as they are: a password sign-up uses the same first code. (Its
words, "Enter this 8-digit code ... to continue", fit both.)

### Reset Password (replaces section 5 of AUTH_EMAIL_TEMPLATES.md)

Sent when a learner taps "Forgot password". This is also how someone who signed
up with Google or a code adds a password.

**Subject:**
```
Your KaiSip password reset code
```

**Body:**
```html
<h2 style="font-family:Arial,Helvetica,sans-serif;color:#17231B">Reset your KaiSip password</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">Enter this 8-digit code in the KaiSip app or on the KaiSip website, then choose your new password:</p>
<p style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#17231B">{{ .Token }}</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">It works for 10 minutes. If you didn’t ask to reset your password, you can ignore this email: your password stays the same.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#465349">KaiSip never asks for this code by email, chat or phone. Don’t share it with anyone.</p>
```

### Password changed (security notification; new)

Sent after a password is added or changed.

**Subject:**
```
Your KaiSip password was changed
```

**Body:**
```html
<h2 style="font-family:Arial,Helvetica,sans-serif;color:#17231B">Your KaiSip password was changed</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">A password was just added to, or changed on, the KaiSip account for {{ .Email }}. Your other devices were signed out.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">If this was you, there’s nothing to do.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">If it wasn’t you: open the KaiSip app or website, choose <strong>Forgot password</strong>, and set a new one with the code we email you. Then tell us at the support address in the app.</p>
```

### Sign-in method linked (security notification; new, optional)

`{{ .Provider }}` is the method's short name (for example `google`).

**Subject:**
```
A new sign-in method was added to your KaiSip account
```

**Body:**
```html
<h2 style="font-family:Arial,Helvetica,sans-serif;color:#17231B">A new way to sign in</h2>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">You can now sign in to the KaiSip account for {{ .Email }} with: {{ .Provider }}.</p>
<p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#17231B">If this wasn’t you, open the KaiSip app or website, choose <strong>Forgot password</strong> to set a new password, and tell us at the support address in the app.</p>
```

**Reauthentication** and **Change Email Address** stay as they are. The design
never sends the reauthentication code (it asks for a fresh sign-in instead), and
email changes aren't offered.

The "2-minute check" at the end of AUTH_EMAIL_TEMPLATES.md gains one step: tap
"Forgot password" with your own address. The email says "password reset code",
has no link, and comes from `codes@kaisip.com`.

---

## 7. Privacy and Data safety: what changes

**Does storing a password hash change any answer? Yes, a few wording changes,
and no new data type or company.**

- **What is stored:** if a learner sets a password, Supabase stores only a
  **one-way scrambled fingerprint** of it (a bcrypt hash with a random salt) in
  the account record, in Singapore. Nobody, including you, can read the
  password back. Source: Supabase's password-security doc ("Only hashed
  passwords are stored").
- **No new company:** the leaked-password check (which would send the first 5
  characters of a fingerprint to HaveIBeenPwned) is not on the Free plan and is
  off. If you upgrade and turn it on, the privacy policy needs one line *(verify
  the exact wording Supabase uses)*.
- **Backups:** the nightly encrypted backup already includes account records,
  so it will now include these fingerprints. They stay encrypted (age) in R2
  for 30 days. No wording change is needed beyond "account data", but the
  policy should say passwords are stored only as fingerprints.
- **"Download my data":** it does not include the fingerprint. The Auth
  server never returns it, and it is a security secret. Fine to say so.
- **Deleting the account** deletes the fingerprint with it (it lives in the same
  row).
- **Philippine Data Privacy Act:** a password hash is personal information but
  not "sensitive personal information", so NPC registration is unchanged
  (still "not mandatory" by the earlier analysis; that analysis's own
  *(verify)* items stand).

**Leaked-password check (ON since 28 Nov 2026, owner decision). DRAFT for the
sign-in release; not in the live `privacy.html` yet. It goes live with the
sign-in release after `app-store-compliance-reviewer` checks it.**

- **Where:** section 6A (the KaiSip account) of the cloud privacy draft,
  `docs/legal/cloud/privacy.html`, which becomes the live `privacy.html` with
  the sign-in release: a new paragraph right after the sentence about how the
  password is stored (the §7 table below). Section 5 (third-party services)
  also gains one row: "Have I Been Pwned (Pwned Passwords), Troy Hunt /
  Superlative Enterprises Pty Ltd, served through Cloudflare: checks a new
  password against known leaks; receives only a 5-character hash prefix."
- **Wording (draft):**

  > **Checking for leaked passwords.** When you choose a password (when you
  > create an account, reset your password or set a new one), the app checks
  > whether that password has appeared in a known data leak, so you don't
  > pick one that criminals already have. To do this, your device makes a
  > one-way fingerprint (a SHA-1 hash) of your password and of one
  > simplified version of it (for example without capitals, spaces or a
  > number at the end), and sends only the first 5 characters of each
  > fingerprint to the Pwned Passwords service of Have I Been Pwned, run by
  > Troy Hunt (Superlative Enterprises Pty Ltd) on Cloudflare's network. The
  > service sends back a long list of fingerprints that start the same way,
  > padded with made-up ones, and your device looks for a match itself. Your
  > password, your email address and the full fingerprints never leave your
  > device, and we send no cookies or account details with the request. Like
  > any website you contact, the service can see your device's IP address
  > and that the request came from kaisip.com. We don't check when you sign
  > in. If the service can't be reached, the app accepts your password
  > without the check and tells you it couldn't check.

- **What is sent, exactly (S1, owner decision 28 Nov 2026):** at most two
  5-character prefixes per password chosen: the typed form, and ONE derived
  form (the compared form without its trailing numbers and symbols when what
  is left is at least 8 characters and at least half the password, otherwise
  the compared form; not sent when it is the same as the typed form).
- **Play Data safety (for the compliance check):** no new data type is
  collected or shared. A 5-character prefix of a password hash is not
  personal data on its own: there are about a million possible prefixes
  (16^5 = 1,048,576), each matching several hundred to a thousand-odd leaked
  hashes in the service's list *(verify against HIBP's API documentation)*,
  no account identifier goes with it, and the answer is padded. The service
  does see the IP address and the page's origin, as for any request. Our
  view is that the form's answers stay as they are ("Data shared: none" for
  this flow); **flag it for `app-store-compliance-reviewer`** to confirm,
  together with whether Apple's privacy label needs a line.
- **Website CSP:** `https://api.pwnedpasswords.com` is in `connect-src` for
  the study app's pages. The policy lives in `_headers`, which is edited by
  hand; `scripts/build_site.sh` only checks it (for example that the home
  and thanks pages' stricter policies do not allow the lookup host).

**Edits needed (for `app-store-compliance-reviewer` and the legal drafts):**

| Where | Today | Change to |
|---|---|---|
| `docs/legal/cloud/privacy.html` §6A | "You sign in with Google or with an 8-digit code we email you. KaiSip has no passwords." | "...with Google, with an 8-digit code we email you, or with a password you choose. We never see your password: our sign-in provider stores only a one-way scrambled fingerprint of it." |
| same, "What we keep" | email, account ID, sign-in methods... | add "if you set a password, its one-way fingerprint (never the password itself)" and "password-changed notices we email you" |
| `docs/mobile/STORE_LISTING.md` §7.1, "methods of account creation" | OAuth + "Username and other authentication"; "Not 'Username and password'" | **tick "Username and password" too** |
| Play Data safety, data types | Email address, User IDs, Device IDs, App activity | **unchanged**: Play's list has no separate "password" type; the fingerprint is part of account management *(verify in the Play Console form)* |
| Play App access | "use Continue with Google" | can now give the reviewer a test email + password (easier; make that account the normal way: code, then password) |
| Terms | — | a line that learners keep their password secret and use "Forgot password" if it may be known |

---

## 8. Remaining risks and new go-live gates

### 8.1 Risks we accept (with what limits them)

| # | Risk | Limited by | Level |
|---|---|---|---|
| R1 | **No lockout after many wrong passwords** (the Auth hook that could do it is Teams/Enterprise only) | the human check on every password sign-in; 15-character minimum; the per-IP token limit; watching Auth logs for many `invalid_credentials` | Medium |
| R2 | **No leaked-password check on Free**: a learner reusing a password leaked elsewhere can be "stuffed" | human check; length; the client's "too simple" check; password-manager-friendly forms; Pro upgrade path | Medium |
| R3 | A stolen session **itself** under 10 minutes old can add a first password (rule 4 is tied to the requesting session, checked at commit, since A2); a stolen **code** session under 24 hours old can change an existing password without the current one (the Auth server counts code sessions as reset sessions) | the "password changed" email (a hard gate); every other device is signed out (the learner notices); "Forgot password" undoes it; the thief can't enrol an authenticator app to lock the owner out (staff only, since A2) | Low–Medium |
| R4 | Supabase changes its Auth server (we can't pin the hosted version) | the database guard holds for H1 whatever they change; probes re-run after upgrades (gate 18) | Low |
| R5 | Rule 4 shows as a generic server error (500) if an app skips the fresh-sign-in check. The Auth server sends the "password changed" notice before the commit, so a refused attempt can still send it (useful: the owner hears about it) | the apps check first (9 minutes vs the database's 10, from the server's clock: audit LOW-3); a Jest test for it; the support copy explains the notice | Low |
| R6 | Android password sign-in opens the human-check sheet every time | accepted (decision 3); WebView later if needed | UX only |
| R7 | Phishing a password is easier than phishing a code | email notices; future authenticator-app (TOTP) option for learners | Low–Medium |
| R8 | A test user made in the dashboard with a password has none | documented in §3.1 | Ops only |
| R9 | If email change is ever offered, a learner loses their password at the change | rule 3, on purpose; the screen must say "set a new password after" | UX only |
| R10 | Typed codes (sign-in and reset are the same token) can be guessed at a rate set only by the attacker's IP count: no per-code try counter, `/verify` has no human check, per-IP limits with no IPv6 grouping (audit MEDIUM-1) | 8 digits, 10 minutes; every extra code lands in the victim's inbox; the "password changed" notice; weekly Auth-log look at `/verify` failures and `/recover` volume per address | Medium |

### 8.2 New go-live gates (extend `WEB_LAUNCH_PLAN.md` gates 13 and 14)

> Final list, with the audit's additions (gate 20, the binding probe, the hard
> notice gate): `docs/WEB_LAUNCH_PLAN.md`, "Go-live gates".

- [ ] **13a.** `20261128000000_password_guard.sql` merged with
  `41_passwords.sql` green in CI (and the mutants failing it), then applied
  through the MCP with the owner present. The apply record has its md5, and a
  read-only check shows `kaisip_password_guard` enabled and
  `kaisip_clear_password` gone.
- [ ] **13b.** On the hosted project, captcha still off:
  `VARIANT=signup|otp|recover ... cloud_smoke.sh pre-register` all pass (three
  probe addresses); `cloud_smoke.sh password` passes; the `EMAIL_A` stale
  session check passes.
- [ ] **13c.** Dashboard settings as section 5. `/auth/v1/settings` still shows
  `"mailer_autoconfirm":false`.
- [ ] **13d.** `mobile-security-auditor` and `backend-architect` review the
  guard, both clients and the screens: no HIGH finding.
- [ ] **14.** The reset email comes from `codes@kaisip.com` with the section 6
  text, a code and no link.
- [ ] **15.** The password-changed notice is on and arrives (or, if Free can't
  send it, that is recorded as an accepted risk under R3).
- [ ] **16.** With captcha on, `cloud_smoke.sh captcha` passes: password
  sign-in, `/recover`, `/otp` and `/signup` are refused without a token; Google
  (PKCE) and refresh still work without one (acceptance test S7).
- [ ] **17.** The password is never saved by either client: a Jest test fills
  the sign-up, sign-in, reset and set-password flows and then asserts that no
  storage (web localStorage/sessionStorage; the phone's persisted stores and
  SecureStore) and no log line contains it.
- [ ] **18.** The hosted Auth version at go-live is written down (v2.199.0 or
  later). The three `pre-register` probes are re-run whenever
  `/auth/v1/health` shows a new version (a quick monthly look, beside the
  weekly Usage check).
- [ ] **19.** Privacy policy, Terms and the Play Data safety "account creation"
  answer updated as in section 7, checked by `app-store-compliance-reviewer`.

### 8.3 Emergency brakes (no app release needed)

- **The guard disturbs a real sign-in:** re-run the three `pre-register`
  probes first, then `drop trigger kaisip_first_password_session on auth.users;`
  and `drop trigger kaisip_password_guard on auth.users;` (Claude through the
  MCP, with the owner's OK). H1 then rests on the Auth server's own clearing,
  which covers every path the apps use at v2.199.0. The MFA rule has its own
  brake: `drop trigger kaisip_mfa_staff_only on auth.mfa_factors;`.
- **Password attacks seen in the logs:** hide the password options on the
  website (`ACCOUNTS_ON` stays, the password form goes behind its own switch)
  and, on the phone, behind a remote setting. As the hard stop, a prepared
  migration puts back the 27 Oct rule ("wipe any password on a confirmed
  account"). Existing passwords keep working until that migration's optional
  one-off `update auth.users set encrypted_password = ''` runs, and that step
  needs the owner's explicit OK (everyone with a password then uses a code or
  Google).

---

## 9. Who does what, and what it costs

| Component | Choice | Monthly cost now / at 3,000 users | Who sets it up | Risk |
|---|---|---|---|---|
| Password storage | Supabase Auth (bcrypt), Free plan | $0 / $0 | already there | R1, R2 |
| H1 guard | `private.guard_password()` trigger | $0 / $0 | Claude (PR, then MCP apply with the owner present) | R4, R5 |
| Password rules | 12 characters with all four types (server and client), client "too simple" check | $0 / $0 | owner (dashboard), Claude (client) | R2 |
| Leaked-password check | off (Pro only) | $0 / $0 (Pro about $25 if later *(verify)*) | owner, if ever | R2 |
| Reset | emailed 8-digit code, no link | $0 / $0 (within Resend's 3,000 a month and 100 a day) | owner (template), Claude (clients) | — |
| Notices | password changed, method linked | $0 / $0 (a few emails a day) | owner (toggle and template) | uses email allowance |
| Human check | Turnstile on sign-in, sign-up and reset | $0 / $0 | owner (switch on), Claude (clients) | R6 |
| Tests | pgTAP `41_passwords.sql`, smoke probes | $0 / $0 | Claude (CI); owner types the probe codes from their own inbox | — |

**Total: $0 a month, now and at 3,000 users.** Fewer emails, too: every password
sign-in is a code email not sent.

**Exit plan:** nothing new. The password hashes are standard bcrypt in
`auth.users`, in the nightly dump. Most auth systems import bcrypt hashes, so
learners would keep their passwords on a move *(verify for the target system)*.

**What Claude can do through tools:** write the migration, tests, probes and
client code; apply the migration through the Supabase MCP (with you present for
the DROP confirmation); read the public `/auth/v1/health` and
`/auth/v1/settings`. **What only you can do:** the dashboard settings in
section 5 (the MCP has no auth-settings tools, and the Management API would need
your personal access token, which must never be shared), pasting the templates,
typing the probe codes from your own inbox, and the Play Console and legal-page
publishing.

---

## Sources

- Supabase Auth source, tag v2.199.0 (the hosted version on 28 Nov 2026):
  [signup.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/signup.go),
  [magic_link.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/magic_link.go),
  [verify.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/verify.go),
  [external.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/external.go),
  [linking.go](https://github.com/supabase/auth/blob/v2.199.0/internal/models/linking.go),
  [models/user.go](https://github.com/supabase/auth/blob/v2.199.0/internal/models/user.go),
  [api/user.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/user.go),
  [token.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/token.go),
  [recover.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/recover.go),
  [password.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/password.go),
  [middleware.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/middleware.go),
  [api.go](https://github.com/supabase/auth/blob/v2.199.0/internal/api/api.go),
  [factor.go](https://github.com/supabase/auth/blob/v2.199.0/internal/models/factor.go),
  [CHANGELOG.md](https://github.com/supabase/auth/blob/master/CHANGELOG.md)
- Supabase docs source (supabase/supabase, `apps/docs/content/`):
  [Password security](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/password-security.mdx)
  (leaked-password protection is Pro and above; secure password change is 24 hours; require current password),
  [Rate limits table](https://github.com/supabase/supabase/blob/master/apps/docs/content/_partials/auth_rate_limits.mdx),
  [Auth hooks](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/auth-hooks.mdx)
  (password verification hook: Teams and Enterprise),
  [Identities](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/identities.mdx),
  [Email templates](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/auth-email-templates.mdx)
  (security notifications; `{{ .Token }}`),
  [CAPTCHA](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/auth-captcha.mdx),
  [Redirect URLs](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/redirect-urls.mdx)
- [Supabase Password security (web page)](https://supabase.com/docs/guides/auth/password-security)
- NIST SP 800-63B-4 (15 characters for single-factor passwords; no composition rules):
  [NIST authenticators section](https://pages.nist.gov/800-63-4/sp800-63b/authenticators),
  [Enzoic summary](https://www.enzoic.com/blog/nist-sp-800-63b-rev4/)
- [Google Play Data safety help](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
  (no password data type confirmed: *(verify)*)
