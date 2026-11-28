# Security audit: KaiSip email + password sign-in design

**Reviewed:** `docs/mobile/PASSWORD_SIGN_IN_DESIGN.md` (28 Nov 2026, step A1 of `docs/WEB_LAUNCH_PLAN.md`)
**Auditor:** mobile-security-auditor (independent, read-only). No repo file changed, no secret touched.
**Evidence base:** a fresh clone of `github.com/supabase/auth` at tag **v2.199.0** (commit `0725a1d`, 25 Nov 2026),
made for this audit and not the architect's copy; the reverted commit `2550341` (#2918) fetched separately; the repo's
migrations, `supabase/tests/40_beta.sql`, `supabase/config.toml`, `scripts/cloud_smoke.sh`, `mobile/src/webcloud/`.

**Where the fixes landed (step A2, 28 Nov 2026):**

| Finding | Status |
|---|---|
| HIGH-1 | Fixed: rule 4b, the deferred constraint trigger `kaisip_first_password_session` in `supabase/migrations/20261128000000_password_guard.sql` |
| HIGH-2 | Fixed: `kaisip_mfa_staff_only` on `auth.mfa_factors` (only `private.beta_desk_admins` or `private.staff` may enrol; existing factors untouched) |
| MEDIUM-1 | The "password changed" notice is a HARD gate (owner decision; `docs/WEB_LAUNCH_PLAN.md` gate 15). R10 recorded. The reset email no longer implies the reset code is special |
| MEDIUM-2 | Client-side common-password blocklist REQUIRED (owner decision; client work in step A3). Third-party leaked-password lookup (HIBP range check): **not for now** (owner decision). *Update 28 Nov 2026: the owner then switched the check on ("Do as recommended"): `mobile/src/webcloud/breach.ts`, `BREACH_CHECK_ON = true`; see `docs/WEB_LAUNCH_PLAN.md`, "Leaked-password check".* |
| MEDIUM-3 | Done: `supabase/tests/41_passwords.sql` and `scripts/password_sql_mutants.py`, with the cases and mutants below and more |
| LOW-1, LOW-3 | Client work (step A3) |
| LOW-2 | Fixed: the new functions and triggers are created first, the old trigger is dropped last |
| LOW-4 | Done: `cloud_smoke.sh binding`, and `/magiclink` and `/resend` in `cloud_smoke.sh captcha` |
| LOW-5 | Phone OFF is gate 20; the `config.toml` rate-limit comment is fixed; the brake text says to re-run the probes first |

## Verdict: GO WITH CHANGES

The core of the design is sound. **Rule 2 (wipe at confirmation) closes H1 and every pre-registration variant I could
build**, including the sign-up-code path that GoTrue leaves open, and it never wipes a password in the recommended
flow (`/otp`, `/verify`, then `PUT /user`). The GoTrue claims are accurate (one line number is off by four).

Two HIGH findings must be fixed before passwords go live (gate 13d says "no HIGH finding"):

- **H-1:** rule 4 checks for *any* recent session of the account, not the session making the request. A stolen old
  session can add a first password whenever the owner signs in anywhere. The thief can force that sign-in with
  `POST /logout?scope=others`.
- **H-2:** TOTP enrolment is open to every learner. A thief who sets a password and enrols TOTP leaves the owner unable
  to reset the password or remove the factor (both need aal2), so the owner cannot evict the attacker.

Both have small, exact fixes below. No CRITICAL.

---

## 1. Design claims checked against GoTrue v2.199.0

| Design claim | Result | Evidence (v2.199.0) |
|---|---|---|
| Re-signup does not update an unconfirmed user; a confirmed one gets an obfuscated answer | Confirmed | `internal/api/signup.go:195-200`, `:268-284` |
| `/otp` clears an unconfirmed user's password before sending | Confirmed. It then calls `Signup`, which for a *new* address inserts the user with a **random 33-char password** | `magic_link.go:84-98`, `:101-103` |
| `recoverVerify` clears, `signupVerify` does not | Confirmed | `verify.go:370-400` (clear at 388), `:313-367` |
| `type=email` routes to `signupVerify` when the code matches the confirmation token | Confirmed. It also accepts the recovery token, so **the reset code and the sign-in code are the same column** | `verify.go:743-753` |
| Every `POST /verify` session has `amr=otp` | Confirmed | `verify.go:185, 285` |
| `isOtpValid` accepts plain or `pkce_` | Confirmed (line **796**, not 800) | `verify.go:796-801` |
| OAuth into an unconfirmed user clears the password, removes other identities, confirms | Confirmed | `external.go:434-450`, `models/user.go:1082-1112` |
| PUT `/user`: 24 h secure-change rule; current password needed unless the session is a recovery one; other sessions signed out | Confirmed. `IsRecovery()` = any AMR of `otp`, `magiclink` or `recovery` | `api/user.go:151-205`, `models/factor.go:66-73`, `models/sessions.go:114`, `models/user.go:497-526` |
| A password sign-in only writes a hash when DB encryption is on | Confirmed (`ReEncryptPassword`, guarded by the old hash) | `token.go:146-174`, `models/user.go:439-462` |
| Captcha covers `/signup`, `/recover`, `/resend`, `/magiclink`, `/otp` and `/token?grant_type=password`; not `/verify` or PUT `/user` | Confirmed. The middleware and the handler both read `grant_type` with `FormValue`, so the pkce/refresh/id_token exemption **cannot** be used to skip captcha on a password grant | `api.go:231-271`, `middleware.go:288-311`, `token.go:40-60` |
| `/recover` for an unknown address: 200, no email | Confirmed for the first request only; see L-1 | `recover.go:52-56`, `mail.go:402` |
| `auth.sessions` is indexed on `user_id` *(verify)* | Confirmed: `sessions_user_id_idx` and `user_id_created_at_idx` | `migrations/20221020193600_*`, `20221011041400_*` |
| CHANGELOG: #2887, #2896, #2868/#2918 with reverts #2912/#2921, #2945 | Confirmed. The reverted change re-read the row `FOR UPDATE`, skipped confirmed users and wrote with `UpdatePassword(tx, nil)` (signs **every** session out) | `CHANGELOG.md:22-67`, commit `2550341` |
| A refresh can't make a session look new | Confirmed: refresh keeps `session_id` and only writes `refreshed_at, user_agent, ip`; only a real sign-in calls `NewSession` | `models/refresh_token.go:175-195`, `models/sessions.go:176-181`, `tokens/service.go:891` |

Extra facts the design doesn't state but needs:

- Rate limits are **per IP only**, keyed on the exact address from `Sb-Forwarded-For` with **no IPv6 /64 grouping**
  (`sbff/sbff.go:24-31`). Verify, Token, Otp, Recover, Signups and User are all "rate per **5 minutes**, burst 30"
  (`apilimiter.go:197-238, 358-363`). `supabase/config.toml` calls them "Per hour"; only `email_sent` is hourly.
- `PUT /user {"password":""}` is refused by the strength check (`password.go:42`), so a session can't silently clear
  a password. I checked this and dropped a candidate finding.
- `POST /logout?scope=others` signs out every other session (`logout.go:36, 58`). This makes H-1 easy to trigger.
- TOTP enrolment is on project-wide (`config.toml [auth.mfa.totp] enroll_enabled = true`). PUT `/user` with a
  non-empty password needs aal2 once a verified factor exists (`api/user.go:104-108`), and removing a verified factor
  needs aal2 (`mfa.go:1073`).

---

## 2. Findings

### HIGH-1: Rule 4 is not tied to the session that sets the password

**Location:** design §3.2, the rule-4 block of `private.guard_password()`; §3.1 rule 4; §8.1 R3; test §3.3 section 8.

**Risk in plain English:** rule 4 is meant to stop "a thief holding an old session quietly adding a password". It asks
"has *this account* signed in during the last 10 minutes?", not "is *the session making this request* new?". A thief
with a stolen session (under 24 h old, so GoTrue's own secure-change rule is passed) only has to wait until the owner
signs in on any device. The thief can force that:
1. `POST /logout?scope=others` with the stolen token signs the owner out everywhere.
2. The owner signs in again with a code or Google, which creates a fresh session.
3. The thief's polling `PUT /user {"password": …}` now passes rule 4. GoTrue then signs out every session except the
   thief's, the owner's new one included.

The thief now has a permanent password of their choosing. On a code or Google account the requester's session counts
as a recovery session only when it was a code session, but a *first* password needs no current password anyway
(`api/user.go:170`). The design's own test (f5: a6 at 9 minutes "allows" the write) cannot tell the owner from the thief.

**Evidence:** `select 1 from auth.sessions s where s.user_id = new.id and s.created_at > now() - interval '10 minutes'`
has no link to the requester. GoTrue never passes the session id to Postgres. Theft is realistic here: web sessions sit
in `localStorage` (or `sessionStorage` on a shared computer, `mobile/src/webcloud/config.ts:24`), so XSS, a shared or
library PC, or an unlocked phone each gives a usable session.

**Remediation (exact):** keep the BEFORE rule as a fast first check and add a **commit-time** check. Inside PUT
`/user`'s transaction, `UpdatePassword` deletes every *other* session (`LogoutAllExceptMe`, `models/sessions.go:374`)
before COMMIT. A deferred constraint trigger therefore sees only the requester's session, and that session must be
fresh. The admin API (`UpdatePassword(tx, nil)` deletes every session) is still refused. So is a re-land of #2918,
which also uses `UpdatePassword(tx, nil)`.

```sql
-- Rule 4b: a first password must come from a session that is itself fresh.
-- Runs at COMMIT. PUT /auth/v1/user has by then deleted every OTHER session of
-- the account in the same transaction (models.LogoutAllExceptMe), so what is
-- left is the requester's own session.
create function private.guard_first_password_session() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.email_confirmed_at is null
     or coalesce(new.encrypted_password, '') = ''
     or coalesce(old.encrypted_password, '') <> '' then
    return null;                       -- not a first password on a confirmed account
  end if;
  if not exists (select 1 from auth.sessions s
                 where s.user_id = new.id and s.created_at > now() - interval '10 minutes')
     or exists (select 1 from auth.sessions s
                where s.user_id = new.id
                  and (s.created_at is null or s.created_at <= now() - interval '10 minutes'))
  then
    raise exception 'kaisip_password_needs_recent_sign_in'
      using errcode = 'P0001',
            hint = 'Only a session started in the last 10 minutes can add a first password.';
  end if;
  return null;
end $$;
revoke all on function private.guard_first_password_session() from public, anon, authenticated;

create constraint trigger kaisip_first_password_session
  after update of encrypted_password on auth.users
  deferrable initially deferred
  for each row execute function private.guard_first_password_session();
```

Notes:
- The legitimate flows still pass: in sign-up and "add a password within 10 minutes", the requester is the only session
  left at COMMIT. A sign-in that commits at the same moment only adds a *fresh* session, which is allowed.
- The client error is still a 500 (the commit fails). Side effect: GoTrue sends the "password changed" notice *inside*
  the transaction, before COMMIT (`api/user.go:232-238`), so a refused attempt can still send that email. That is
  acceptable, and even useful: the owner hears about the attempt. Say so in R5 and the support copy.
- Creating a constraint trigger needs the same TRIGGER privilege on `auth.users` that the live trigger already uses.
  Prove it on a Supabase branch or locally before the hosted apply *(verify)*.
- Update §3.1 and R3 wording: "Rule 4 is tied to the requesting session (checked at commit)".

### HIGH-2: TOTP open to every learner lets an attacker lock themselves in once passwords exist

**Location:** `supabase/config.toml` `[auth.mfa.totp] enroll_enabled = true` (hosted mirror); design §5 "Leave as
they are", §8.1 (not listed).

**Risk in plain English:** today a thief who enrols an authenticator app on a learner's account gains nothing lasting:
they have no way to start a new session. With passwords they do. Two ways to get a password in:
- H-1 before its fix;
- R3, which the design accepts: a stolen code session under 24 h old can change an existing password without the
  current one.

The thief then enrols TOTP (the first factor needs only aal1). Afterwards the real owner, signing in with a code at
aal1, **cannot set a new password** (`insufficient_aal`, `api/user.go:104-108`) and **cannot remove the factor**
(`mfa.go:1073`). The thief keeps signing in with password + TOTP. "Forgot password" no longer rescues the owner, and
only an admin can, by hand. That is the "lock the real owner out" case the brief asks about.

**Evidence:** cited above. Only Beta Desk policies use `aal` (`20261104000000_beta_desk.sql:87`). Learners never need
MFA, as the config.toml comment says: "Learners are never asked to enrol".

**Remediation (exact):** let only staff enrol factors. GoTrue's role can't read the `private` lists, so this one
trigger function is SECURITY DEFINER, owned by `postgres`, with an empty `search_path`. A trigger needs no EXECUTE
grant at fire time, so nothing is granted to any role:

```sql
create function private.guard_mfa_enrol() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.beta_desk_admins a where a.user_id = new.user_id)
     and not exists (select 1 from private.staff s where s.user_id = new.user_id) then
    raise exception 'kaisip_mfa_staff_only' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function private.guard_mfa_enrol() from public, anon, authenticated;
create trigger kaisip_mfa_staff_only before insert on auth.mfa_factors
  for each row execute function private.guard_mfa_enrol();
```

- Before applying, check that `select count(*) from auth.mfa_factors f where f.user_id not in (select user_id from private.beta_desk_admins union select user_id from private.staff)` is 0.
- Onboarding rule: add a staff member to the list first, then let them enrol. Add a pgTAP case for a learner's insert
  being refused and a listed admin's insert living.
- Fallback if the owner wants no new trigger: a support runbook entry ("owner can't reset password, `insufficient_aal`:
  verify the inbox, delete the factor and password through the admin API, sign the account out"). The app must map
  `insufficient_aal` on reset to that copy. This is weaker: the owner depends on support.

### MEDIUM-1: Typed codes (sign-in and reset) can be guessed at a rate set only by the attacker's IP count

**Location:** design §2 "recover" rows, §5 step 14, §8.1 (missing).

**Risk in plain English:** an 8-digit code has 100 million values. GoTrue keeps **no per-code or per-account count of
wrong tries**. `/verify` has no captcha and is limited to 30 per 5 minutes **per IP** (burst 30), with no IPv6 /64
grouping. One IP gets about 90 guesses per 10-minute code. 1,000 rented IPs that keep a live code going (one
`/recover` every 10 minutes, each needing a solved captcha) reach about 13 million guesses a day, or roughly 13% a day
against one chosen learner. IPv6 rotation makes it cheaper still.

This risk is **not new**: the sign-in code is the same token column (`recovery_token`, `verify.go:743-753`), and audit
L7 already chose 8 digits for it. Passwords raise the *impact*: a guessed code session is fresh, so it can now leave a
permanent password behind. Note also: a reset code and a sign-in code are interchangeable. That is fine, because
"reset" adds no attack surface beyond the sign-in code, but the email copy shouldn't imply otherwise.

**Remediation:**
1. Make "Password changed" notifications **ON** a hard go-live gate (gate 15), not "accepted risk if Free can't". If
   Free can't send them, ship passwords only after the app itself shows a "password changed on <date>" banner from
   `GET /user` (`updated_at` is not specific enough, so record a `password_set_at` in `user_metadata` from the client
   after a successful set and show it).
2. Keep `otp_expiry` 600. If the owner accepts the friction, 300 s halves the guessing window per email sent, and
   every extra code email lands in the victim's inbox, so the attack gets noisier.
3. Weekly check: Auth logs for `/verify` 403 `otp_expired` bursts and `/recover` volume per address. Write the numbers
   that trigger the emergency brake into `WEB_LAUNCH_PLAN.md`.
4. Record it as risk R10 ("code guessing, per-IP limits only") with level Medium.

### MEDIUM-2: Password guessing on Free: captcha + 15 characters is enough for launch, with three additions

**Location:** design §8.1 R1/R2, §4.3 `checkPassword`.

**Assessment:** GoTrue has no lockout and no leaked-password check on Free, and the Token bucket (150 per 5 min per
IP, burst 30) is shared with refresh, so it can't go lower. Every password attempt costs a single-use Turnstile token,
which a solving farm sells for well under a cent. So captcha raises the cost of stuffing a list of reused passwords; it
does not stop a targeted attack. The asset is study progress (low value), and the attack is one account at a time.
With the additions below, this is acceptable for launch.

**Add:**
1. **Client-side blocklist (required).** NIST 800-63B-4 says the verifier SHALL check against a blocklist. Ship a
   compressed list of common passwords (for example the top 10,000 of a public list, about 30–60 KB; vendored on web,
   since "no new dependencies" means no npm package) inside `passwordRules.ts`. Add the email local part, "kaisip",
   "cisa", "isaca" and repeated or sequential patterns. Only learners using the apps set passwords, so this protects
   them even though it isn't enforced on the server.
2. **Optional client-side HIBP range check** (k-anonymity: only the first 5 hex characters of the SHA-1 leave the
   device). Free, works without Pro, and blocks known-breached passwords at creation. It adds a third party and needs
   one privacy-policy line: owner decision. If chosen, fail open on network error.
3. **Detection:** the "password changed" notice (M-1), plus a weekly look at Auth logs for `invalid_credentials`
   bursts per address. Keep the §8.3 brake: hide the password form behind its own remote switch.
4. Don't add an Edge Function proxy for per-account lockout. GoTrue would then see the function's IP for every learner,
   so the per-IP limits would collapse onto one address and lock everyone out together.

### MEDIUM-3: The tests and mutants don't cover the fixes or some branches

**Location:** design §3.3.

**Remediation:** add to `41_passwords.sql` (and update `plan(n)`):
- **H-1 binding test.** Deferred triggers only fire at COMMIT, and the file ends in `rollback`, so every rule-4b check
  must force it. Use a helper so `throws_ok` runs one statement:
  ```sql
  create function pg_temp.put_user(p_user uuid, p_session uuid, p_hash text) returns void language plpgsql as $f$
  begin
    update auth.users set encrypted_password = p_hash where id = p_user;
    delete from auth.sessions where user_id = p_user and id <> p_session;  -- what LogoutAllExceptMe does
    set constraints all immediate;                                        -- fire the deferred check now
  end $f$;
  ```
  Cases:
  - (a) an old session (2 h) and a fresh sibling (1 min); `put_user(old)` throws `kaisip_password_needs_recent_sign_in`
    and the fresh sibling still exists afterwards (rolled back);
  - (b) `put_user(fresh)` lives, and the old session is gone;
  - (c) an admin-style write (delete all sessions, then `set constraints all immediate`) throws;
  - (d) a session with `created_at` NULL counts as old.
- **Early-return branch:** an *unconfirmed* account going from no password to a password with **no session** must
  live. Today no test fails if the "Still unconfirmed: leave it" return is deleted.
- **Explicit trigger shape:** read `pg_trigger` and assert BEFORE, ROW, INSERT+UPDATE and the column list. For rule 4b
  assert `tgdeferrable` and `tginitdeferred`. The behaviour tests catch most mutants, but this gives a clear message.
- **H-2:** a learner's `insert into auth.mfa_factors` throws; a listed admin's lives.
- **More mutants** for `password_sql_mutants.py`: BEFORE→AFTER; drop `email` from the `UPDATE OF` list; delete the
  unconfirmed early return; remove `coalesce(old.encrypted_password,'') = ''` from rule 4 (it then polices changes, and
  test 3 must fail); rule 4b `deferrable initially deferred` → `not deferrable` (test (a) must fail); remove
  `or exists (… <= now() - …)` (test (a) must fail).
- The design's own count of 34 is right; recount after the additions. The `auth.sessions` insert with only
  `id, user_id, created_at` is fine at v2.199.0: only `id` and `user_id` are NOT NULL in the GoTrue migrations.

### LOW-1: "Same answer whether or not the account exists" is only true for the first request

**Location:** design §2 table (last row), §4.1 "Forgot password", §4.3 `sendPasswordResetCode` docstring.

**Evidence:** for a real account, a second `/recover` within 60 s answers **429** `over_email_send_rate_limit`
(`mail.go:402, 724-727`); an unknown address always gets 200. A repeated `/signup` for an unconfirmed address does the
same. `/otp` with `create_user:false` answers **422** `otp_disabled` for an unknown address (`otp.go:82-84`), an older
and direct oracle. A password sign-in returns at once for an unknown address or one without a password, and after a
bcrypt check for one with a password: a timing oracle for "has a password".

**Remediation:** accept, since captcha makes each probe cost a solve, but fix the wording in §2 and the docstring to
"the first answer is the same". Make the client show the same calm copy for 200 and 429 on reset ("If there's an
account, we've sent a code. You can ask again in a minute."), so the UI isn't a second oracle.

### LOW-2: Migration order leaves a moment with no guard if it ever runs outside one transaction

**Location:** design §3.2 (the `drop` statements come first).

**Remediation:** create the new function and trigger(s) first, then drop the old trigger and function. If both exist
for a moment, the old one simply wipes every password (the safe side). Keep `apply_migration` (transactional), and
record md5 and hosted version as before.

### LOW-3: The client's "fresh sign-in" check uses the device clock

**Location:** design §4.3 `setPassword` (9 vs 10 minutes).

**Remediation:** work out the age as `now_device - amr.timestamp + skew`, where skew is `iat - device time when the
token arrived` (or the HTTP `Date` header). Keep the 500 → `reauth_required` mapping as the backstop.

### LOW-4: Smoke probes miss the new risks

**Location:** design §3.4.

**Remediation:**
- Add a **binding probe** (proves H-1 is fixed on hosted): sign in A with a code (token T_old), wait 11 minutes, sign
  in A again (T_new), then `PUT /user` with **T_old** must be refused, and `GET /user` with T_new must still be 200.
- Add `/magiclink` and `/resend` to the `captcha` mode list.
- Note on the EMAIL_A probe as designed: without the H-1 fix it fails whenever A also signed in elsewhere in the last
  10 minutes. That is the bug showing through, not a flaky test.

### LOW-5: Smaller items

- **Phone:** rules 1–4 watch only `email_confirmed_at`/`email`. Add "Phone provider stays OFF" to the go-live gates
  explicitly (it is in "Leave as they are" but not gated). If phone is ever enabled, extend the guard first.
- **`supabase/config.toml` rate-limit comment:** say "per 5 minutes (burst 30)" for `token_verifications`,
  `sign_in_sign_ups` and `token_refresh`; only `email_sent` is per hour. Confirm the dashboard's unit label *(verify)*.
- **Email budget:** `/recover` shares the project-wide 20-an-hour email cap with sign-in codes. Someone buying captcha
  solves can starve resets and codes for everyone (this already exists). Passwords help here, because a password
  sign-in sends no email. Keep watching the Usage page.
- **R3 (accepted):** fine for launch only together with the H-2 fix and the notice gate. Once H-2 is fixed, an R3
  attacker is evicted by "Forgot password" plus GoTrue's sign-out of other sessions.
- **Emergency brake text (§8.3):** "covers every path the apps use" is true at v2.199.0, because `/otp` clears before
  any code is sent and `/signup` never updates an existing user. Add "re-run the three pre-register probes before
  dropping the guard".

---

## 3. Answers to the six questions

1. **Does the guard close H1 and its variants?** Yes for pre-registration:
   - The OTP confirm, signup-code confirm, Google link, recovery and invite paths all pass through rule 2 (BEFORE
     UPDATE, fires on `email_confirmed_at`).
   - Email change goes through rule 3 (fires on `email`; a BEFORE trigger may change any column of NEW).
   - Admin create is caught by rule 1; an admin password set by rule 4/4b.
   - Phone is disabled (LOW-5).
   - **No stale write-back:** after `Confirm`, every GoTrue write uses `UpdateOnly` with explicit columns, and
     `verifyPost` reloads the user before issuing the session (`verify.go:276-285`). So the stranger's hash held in
     memory is never written back after rule 2 wipes it.
   - **Race between two sign-ups:** a repeat `/signup` never updates an existing row. A simultaneous first insert ends
     in a unique-key failure, and rule 2 wipes whichever hash won at confirmation.
   - **Can rule 2 wipe a real password?** Not in the recommended flow: the password is written only after
     confirmation, when `old.email_confirmed_at` is already set. It wipes only passwords sent before confirmation.
     Those come from the old `/signup` sign-up, which the apps never call, so a third-party client using `signUp` would
     find the password gone (fail-safe).
   - **Rule 4's 10-minute check:**
     - Refresh never creates a session or changes `created_at`.
     - The clocks are GoTrue's `time.Now()` (written to `sessions.created_at`, timestamptz) and the DB's `now()` (the
       time the transaction started). Skew is negligible.
     - aal is handled by GoTrue (aal2 is needed once MFA exists).
     - A stolen refresh token can't mint a new session.
     - **But the check isn't tied to the requester:** see HIGH-1.
2. **Setting a password without proving the inbox, or locking an owner out:** HIGH-1 (stale stolen session plus the
   owner's next sign-in) and HIGH-2 (TOTP entrenchment). R3 stays an accepted, recoverable risk once H-2 is fixed.
   I found no path for an attacker who has never held a session or seen the inbox.
3. **Reset by typed code:** see MEDIUM-1 (no attempt counter, per-IP only, no IPv6 grouping, `/verify` has no
   captcha; the reset code is the same token as the sign-in code) and LOW-1 (enumeration through 429/422/timing).
4. **Password guessing on Free:** acceptable for launch with captcha + 15 characters **plus** a client blocklist, the
   password-changed notice as a hard gate, and log watching (MEDIUM-2). Optional client HIBP range check. Pro remains
   the upgrade path.
5. **The SQL:**
   - SECURITY INVOKER is right: GoTrue's role owns `auth.sessions`, and no SECURITY DEFINER is needed for the password
     guard.
   - `search_path = ''` with fully qualified names is correct; `now()`, `lower()` and `coalesce()` resolve from
     pg_catalog.
   - The revokes are fine. The raise rolls back PUT `/user` as a 500; no sign-in path writes a first password to a
     confirmed account, so sign-ins can't break.
   - Fixes: add rule 4b (deferred), reorder the migration (LOW-2), add the tests and mutants (MEDIUM-3). The H-2
     guard needs SECURITY DEFINER for its list lookup (empty `search_path`, EXECUTE revoked from app roles; add a pgTAP check that `prosecdef` is true for it and false for the password guards).
6. **Password rule:** **15 characters minimum, no composition rules**, as the design recommends. Reasons:
   - Without a leaked-password check, length is the main thing keeping reused passwords out: most passwords in breach
     lists are shorter than 15.
   - Composition rules push people to "Password1!"-style patterns that are at the top of stuffing lists.
   - On phones, Google Password Manager and iCloud Keychain generate and fill long passwords, and three or four words
     are easy to type.

   Pair it with: show/hide toggle, paste allowed, the autofill hints in §4.1, the client blocklist, 72-byte max checked
   on the client, and copy that says the password is optional (codes and Google still work). Change the hosted setting
   from today's mirror (`12`, all four character classes) to `15`, none.

## 4. Changes to the go-live gates

- **13a** adds: `kaisip_first_password_session` (deferrable, initially deferred) and `kaisip_mfa_staff_only` present;
  the MEDIUM-3 tests green; the new mutants fail them.
- **13b** adds: the binding probe (LOW-4).
- **15** becomes hard: the password-changed notice is ON and arrives, or the in-app replacement in MEDIUM-1 ships.
- **New 20:** Phone provider OFF; `auth.mfa_factors` has no learner rows.
- **New R10** in §8.1: code guessing with per-IP limits only, Medium; R3 note updated after H-2.

---

## Audit alignment (NIST 800-63B-4, ASVS 5.0)

Added 28 Nov 2026 in answer to the coordinator's follow-up. NIST text as the coordinator quoted it from SP 800-63B-4
(final). I didn't re-fetch it; section numbers are as quoted. OWASP ASVS 5.0.0 requirement numbers are given as
themes and marked *(check numbering)*, because I didn't have the text open. GoTrue facts are from the v2.199.0 clone
used above.

**Framing for the owner:** KaiSip is not a federal system, so NIST conformance is voluntary. An auditor will test
whether the *claim* is accurate. Use one of two claims:
- "Conforms to SP 800-63B-4 AAL1" (every SHALL met, with evidence), or
- "Aligned with SP 800-63B-4 AAL1 and ASVS 5.0 L1, with documented deviations D1–Dn and their compensating controls".

On Free the honest claim is the second. ASVS is easier to meet honestly, because several of its controls are "per the
application's documented security decisions". NIST's SHALLs are fixed values.

### Q1. Drop "sign in with an emailed code" as a standalone method?

**Yes, as a labelling and product change, with one caveat about what it really achieves.**
- 3.1.3 says email SHALL NOT be an out-of-band authenticator. Keeping "sign in with code" means either listing a
  deviation or not calling the code an authenticator.
- The clean model is two methods: **password (AAL1)** and **Google (federation under 800-63C; Google is the IdP)**.
  Emailed codes are used only for **email verification at sign-up** and **account recovery (4.2.1.2)**, and every
  recovery must end with binding a new authenticator (setting a password) or using Google.

**Caveat: hiding the button does not remove the capability.**
- GoTrue cannot tell a "sign-in code" from a "recovery code". `/otp` for a confirmed user and `/recover` both write
  the same `recovery_token`, and `POST /verify` turns either into a full session (`amr=otp`).
- The design's own sign-up also uses `/otp`.
- So anyone with the inbox can still sign in by "recovering". That is allowed: a recovery code yields a session by
  definition. But an auditor who reads the API will see that code sessions are full sessions.

**To make the framing true in the system, not just the UI:**
- (a) After any `amr=otp` session, the apps force "set a password" (or Google) before any study screen.
- (b) Optionally enforce it in the database. Add a RESTRICTIVE RLS policy on learner tables that requires
  `auth.jwt()->'amr'` to contain method `password` or `oauth`. A code or reset session can then only call PUT `/user`
  and must sign in again with the new password to reach data. This is cheap and testable, but every existing
  code-only learner must set a password at their next sign-in: a product decision.
- (c) Keep the recovery-code expiry at 10 minutes, well inside NIST's 24 h ceiling for emailed recovery codes.

**Better framing if the owner keeps code sign-in for convenience:** document it as deviation D1, "email OTP accepted
as a single-factor sign-in, treated as equivalent to account recovery". Compensating controls: the 8-digit code,
10-minute life, single use, captcha on sending, the per-IP verify limit and the security notices. ASVS does not demand
removal *(check numbering: V6 authentication / out-of-band)*.

**Objection to forcing passwords on everyone:** on Free there is no server-side breached-password check (see Q2).
Making every learner choose a password raises the number of weak or reused passwords. If code sign-in is dropped, do
it together with the server-side blocklist (Pro HIBP), not before.

### Q2. Is Pro needed for an honest AAL1 / ASVS L1–L2 claim?

**Mostly yes. But the session time-box can be done on Free, server-side, so a client-side cap is not needed.**

| NIST / ASVS control | On Free | Client-side only acceptable? | What closes it |
|---|---|---|---|
| 3.1.1.2 blocklist (SHALL) of common, expected or compromised values | Client check only; the API accepts any password of 15+ characters | **No**: the SHALL binds the *verifier* (server), and a raw API call skips it. An auditor marks this "control bypassable / not enforced at verifier" | **Pro** leaked-password protection (HIBP) on the server. Keep the client list for "expected" words (email, "kaisip", "cisa"), which HIBP doesn't cover |
| 3.1.1.2 length ≥15, no composition rules, no forced rotation, no hints or KBA | Met by dashboard settings (15, no required characters); GoTrue has no hints, KBA or rotation | n/a | Settings (§5 of the design) |
| 3.1.1.2 SHOULD allow ≥64 | GoTrue caps at **72 bytes** (bcrypt), which is 64+ ASCII characters but fewer for multi-byte text | SHOULD only | Document: "max 72 bytes (bcrypt)" |
| 2.1.3 AAL1 overall reauthentication timeout (SHALL; SHOULD ≤30 days) | Refresh tokens never expire on Free | **No**: a client "forget after 30 days" leaves a stolen refresh token valid forever. An auditor marks this "timeout not enforced server-side" | **Either** Pro time-box (30 days) **or on Free** a `pg_cron` job, sketched below |
| 3.2.2 ≤100 consecutive failures per account | Not available (see Q3) | No | Only the Teams-tier hook, or a documented deviation |
| ASVS: notify users after changes to authentication details *(check numbering, V6)* | Notification toggle; delivery on Free with custom SMTP *(verify)* | — | The gate-15 notice, or the in-app record from MEDIUM-1 |
| ASVS: invalidate other sessions after a password change; logout invalidates the session *(check numbering, V7)* | Met: `UpdatePassword` signs out other sessions; logout deletes the session | — | Probe |
| ASVS L2: absolute session lifetime and inactivity timeout per a documented risk decision *(check numbering, V7)* | Absolute: via the cron job below. Inactivity: possible the same way (`refreshed_at`) | — | Cron job; document the chosen values |
| Audit logging and retention (ASVS V16; also the auditor's own evidence) | Auth logs kept **1 day** on Free; failed sign-ins are **not** in `auth.audit_log_entries` | — | Pro (7 days) or a scheduled export; see Q4 |

**The Free-plan time-box (server-side), sketch:**
```sql
select cron.schedule('kaisip_session_timebox', '17 * * * *', $$
  delete from auth.sessions
  where created_at < now() - interval '30 days'            -- absolute AAL1 limit
     or coalesce(refreshed_at, created_at) < now() - interval '30 days'  -- optional inactivity
$$);
```
- Deleting a session cascades to its refresh tokens (`refresh_tokens_session_id_fkey ... on delete cascade`). GoTrue
  then refuses a refresh and refuses `/auth/v1/user` with `session_not_found` (`api/auth.go:181`).
- PostgREST still accepts the current access token until it expires (≤1 h, `jwt_expiry = 3600`), which is within
  tolerance. For immediate cut-off, add an RLS helper that checks the JWT's `session_id` still exists. That is one
  index lookup per request.
- *(verify)* that `postgres` may DELETE from `auth.sessions` on the hosted project. GoTrue's own grant to `postgres`
  is SELECT only (`20240612123726_enable_rls_update_grants.up.sql`), although hosted projects usually allow more.
  Prove it on a branch first.

**What an auditor would flag if KaiSip stays on Free (with the pg_cron time-box in place):**
1. No server-enforced blocklist (3.1.1.2 SHALL): a **finding**.
2. No per-account failed-attempt limit (3.2.2 SHALL): a **finding**, reducible to a documented deviation with
   compensating controls.
3. Email code used as a sign-in method if it is kept (3.1.3 SHALL NOT): a **finding** unless reframed (Q1).
4. Short log retention, and failed-sign-in events not tied to an account: an **observation on evidence quality**.
5. A dependence on a hosted auth version that can't be pinned: an **observation**, covered by gate 18.

**Recommendation:** Pro is needed for an honest "conforms to AAL1" claim on the blocklist item; item 2 still needs
Teams or a deviation. For an "aligned with ASVS 5.0 L1 with documented deviations" claim, Free plus the pg_cron
time-box plus the client blocklist is defensible, provided the deviations are written down.

### Q3. The 100-attempt per-account limit: compensating control and what is feasible

**What GoTrue gives you:**
- No per-account counter.
- A failed password sign-in writes **nothing** to the database, and its log line carries no user id or email.
  `ResourceOwnerPasswordGrant` returns the error with only an `error` field, and `sb-auth-user-id` is set only when a
  session is issued (`token.go`, `errors.go:112`). So **counting failures per account from the Auth logs is not
  feasible**: the account isn't in the failure record. Logs support per-IP and global counts only.
- The real control is the Password Verification Attempt hook, which receives `user_id` and the valid/invalid result
  and can reject (`token.go:193-215`). It needs the **Teams/Enterprise** tier, as the design says; Pro doesn't have it.

**Edge Function "front door": not a control.**
- The attacker can still call `/auth/v1/token?grant_type=password` directly. Captcha doesn't help: Turnstile tokens
  are minted in any browser from the public site key, so the function can't be the only source.
- GoTrue would also see the function's IP for every learner, so the per-IP limits would collapse onto one address.
- It counts only the attempts that pass through it, so an auditor would rightly call it bypassable.

**What would work if it ever becomes worth building:**
- The lock action should "disable that authenticator", as 3.2.2 puts it: **clear the password** (`encrypted_password
  = ''`). The guard always allows that. Don't use `banned_until`, which would also block code recovery.
- The owner then recovers with "Forgot password", which binds a new password.
- The missing piece is the per-account failure signal. Only the Teams hook (or leaving hosted GoTrue) provides it.

**Compensating control to document (deviation D2):**
- **Preventive:**
  - A captcha token is required on *every* password attempt (single use, verified server-side), so each guess costs a
    solved challenge.
  - The per-IP limit is 150 per 5 minutes with a burst of 30, shared with refresh.
  - The 15-character minimum plus the blocklist bounds the guessing space. State the numbers: with 15 characters and
    the top-N list removed, the chance of success within, say, 10⁶ captcha-gated guesses against one account is far
    below the 1-in-100-guesses bound that NIST's limit is meant to give.
- **Detective:** a scheduled check of Auth logs for `invalid_credentials` volume per IP and overall, with thresholds;
  the password-changed notice to the owner of the account.
- **Corrective:**
  - the remote switch that hides the password form;
  - the prepared migration that clears all passwords (§8.3);
  - clearing a targeted learner's password on a support report.
- **Residual risk:** a distributed, captcha-solving attack on one known address isn't stopped per account. Accepted by
  the owner, with a review date. **Trigger to upgrade:** any detected targeted attack, or an enterprise or auditor
  customer that requires 3.2.2 as written, means moving to the Teams hook (cost noted for the owner).

### Q4. Automated "operating effectively" tests vs configuration evidence

Constraint: once captcha is on, no automated job can call `/token?grant_type=password`, `/otp`, `/recover` or
`/signup` on production. Managed Turnstile can't be solved by a runner. So:

**A. Automated on production, scheduled GitHub Action, no captcha needed:**
- **Captcha enforced:** the `captcha` probe (no email sent, no account needed).
- **Public settings:** `/auth/v1/settings` shows `mailer_autoconfirm:false`, phone off, the expected providers;
  `/auth/v1/health` version recorded, and the three pre-register probes flagged for a re-run when it changes (gate 18).
- **/verify throttling:** 31 quick `POST /verify` calls with a wrong code for the test address return 429 on the 31st
  (this costs no email).
- **Read-only database checks** (a GitHub Actions secret holding a *read-only* role's connection string, an owner
  decision, never the service key):
  - the guard triggers exist and are enabled, with the right BEFORE/deferrable shape and `prosecdef` values;
  - `auth.mfa_factors` has no learner rows;
  - `cron.job` has the time-box job, and `cron.job_run_details` shows it succeeding;
  - **no session older than 30 days** (`count(*) = 0`). This is the operating-effectiveness evidence for 2.1.3;
  - no confirmed account got a password without a fresh session. Detect this by comparing `updated_at` with the
    newest session, and alert on any outlier.
- **Session controls with a dedicated test account:** using a refresh token stored as a secret, check that a
  refreshed token works; then log out and check that the old refresh is refused.
- **Auth configuration as JSON:** the Management API `GET /v1/projects/{ref}/config/auth` (min length, required
  characters, captcha on, HIBP, time-box, secure password change, notification toggles) diffed against a committed
  expected file. This needs the owner's personal access token as an Actions secret, scoped and rotated: an owner
  decision. It turns "dashboard screenshots" into dated, machine-checked evidence.

**B. Automated on a second, identical project** (Free allows two projects; or a Pro branch). Captcha there uses
Turnstile's documented always-pass test keys. Same settings otherwise, proved by the configuration diff in A.
- The password policy: a 14-character password is refused; 15 lowercase words are accepted; a blocklisted password is
  refused (once HIBP is on).
- H1 pre-register variants; the H-1 binding probe; reset by code; other sessions signed out after a change; 100+
  failed sign-ins (shows no lockout: evidence for deviation D2).
- Email-dependent steps need a test mailbox with an API (owner decision, possibly a new account), or the admin
  `generate_link` endpoint, which tests verification but not delivery. Keep the schedule weekly: email is capped at
  20 an hour.

**C. Configuration or manual evidence only:**
- the Supabase plan tier and log retention;
- the Cloudflare Turnstile widget settings (hostname, mode);
- Google OAuth client settings;
- Resend domain settings (SPF, DKIM and DMARC can be DNS-checked automatically);
- whether security notices are actually delivered on Free with custom SMTP (one manual test per release);
- MFA on the owner's Supabase, GitHub, Cloudflare, Google and Resend accounts;
- the quarterly access review of `private.beta_desk_admins` and `private.staff` (the query can be automated; the
  review and sign-off are manual);
- the restore drill;
- the deviation register and risk acceptance, with the owner's dated sign-off.

**Evidence hygiene the auditor will ask for:**
- Each scheduled run writes a dated artefact (JSON results plus the hosted version) kept for 90+ days.
- The test account holds no learner data.
- Secrets are in GitHub environments limited to `main`.
- A failing run opens an issue, so there is a record of exceptions and how they were fixed.
