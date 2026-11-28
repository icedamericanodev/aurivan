-- KaiSip: passwords allowed, the pre-registration takeover still blocked
-- (28 Nov 2026; owner decision: Google or email + password; emailed 8-digit codes only confirm an email address and reset a password). NOT APPLIED ANYWHERE. Applied after
-- 20261109000000_beta_desk_sign_in.sql. Append-only once applied.
-- Design: docs/mobile/PASSWORD_SIGN_IN_DESIGN.md (§3); security audit:
-- docs/mobile/PASSWORD_DESIGN_AUDIT.md (HIGH-1, HIGH-2, LOW-2 are fixed here).
--
-- Replaces the trigger of 20261027000100_beta_no_passwords.sql (that file
-- stays exactly as it was applied). That trigger wiped EVERY password on a
-- confirmed account. The new guard keeps a password only when it was set by
-- a session that had just proved the inbox:
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
--  4b. ...and that session must be THE ONE MAKING THE REQUEST (audit HIGH-1).
--     Checked again at COMMIT by a deferred constraint trigger: PUT
--     /auth/v1/user deletes every OTHER session of the account in the same
--     transaction (models.User.UpdatePassword -> LogoutAllExceptMe), so at
--     commit every session left must be under 10 minutes old, and at least
--     one must exist. A thief's old session can no longer ride on the owner's
--     fresh sign-in, and the admin API (which deletes every session) is still
--     refused.
--  5. Changing an existing password is left to the Auth server (current
--     password or a code/reset session, the 24-hour rule, other sessions
--     signed out). It is not checked here: the Auth server may re-write the
--     hash during a password sign-in (internal/models/user.go Authenticate),
--     before the new session exists.
-- Clearing a password is always allowed. Unconfirmed accounts keep what they
-- hold (they can't sign in; rule 2 runs at confirmation).
--
--  6. Authenticator apps (MFA factors) are for STAFF only (audit HIGH-2): only
--     an account in private.beta_desk_admins or private.staff may enrol a
--     factor (or have one moved to it). With passwords, a thief who got a password in could enrol TOTP
--     and lock the real owner out ("Forgot password" and removing the factor
--     both need aal2). Existing factors are untouched (new rows only), so the
--     Beta Desk admins and board staff keep their authenticator apps. To add
--     a staff member: put the account on the list FIRST, then they enrol.
--
-- GO-LIVE GATES (docs/WEB_LAUNCH_PLAN.md 13a to 20): "Confirm email" must be
-- ON; the Phone provider stays OFF (rules 1 to 4 watch the email columns
-- only: extend this guard before phone is ever enabled).
-- Restores (SCALING.md §7) load data with session_replication_role =
-- replica, so these triggers do not fire and restored passwords survive.
-- Emergency brakes, if a guard ever disturbs a real flow (no app release;
-- re-run the three `cloud_smoke.sh pre-register` probes first). Graded: undo
-- only the part that misbehaves.
--  * Only ADDING a first password is refused wrongly: switch off rule 4b and
--    keep kaisip_password_guard (rules 1 to 4, the H1 fix). Ownership-free
--    (works even if `drop trigger` on auth.users is not allowed):
--      create or replace function private.guard_first_password_session() returns trigger
--        language plpgsql set search_path = '' as $b$ begin return null; end $b$;
--    or, if allowed: drop trigger kaisip_first_password_session on auth.users;
--  * Only staff can't enrol an authenticator app:
--      create or replace function private.guard_mfa_enrol() returns trigger
--        language plpgsql security definer set search_path = '' as $b$ begin return new; end $b$;
--    or, if allowed: drop trigger kaisip_mfa_staff_only on auth.mfa_factors;
--  * A sign-in or confirmation itself fails (last resort): also
--      drop trigger kaisip_password_guard on auth.users;
--    (the Auth server still clears pre-registered passwords on the code, reset
--    and Google paths, and the apps never call /signup).
-- Then fix it in a new migration. Runbook: docs/mobile/ACCOUNTS_BETA_PLAN.md
-- "Applying the password guard".
--
-- Order (audit LOW-2): the new functions and triggers are created FIRST and
-- the old trigger is dropped LAST, so even if this file ever ran outside one
-- transaction there is no moment without a guard (while both exist, the old
-- one simply wipes every password: the safe side).
--
-- The functions live in schema private (not exposed by the Data API) with
-- search_path '' and fully qualified names, and nobody may call them
-- directly (a trigger needs no EXECUTE grant at fire time). The two password
-- guards run as the caller (the Auth server's role, which owns
-- auth.sessions). Only the MFA guard is SECURITY DEFINER: the Auth server's
-- role can't read the private lists.

-- ── Rules 1 to 4: before each write ─────────────────────────────────
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
revoke all on function private.guard_password() from public, anon, authenticated, service_role;

create trigger kaisip_password_guard
  before insert or update of email_confirmed_at, encrypted_password, email on auth.users
  for each row execute function private.guard_password();

-- ── Rule 4b: at commit, the requesting session itself must be fresh ──
-- Runs at COMMIT. PUT /auth/v1/user has by then deleted every OTHER session of
-- the account in the same transaction (models.LogoutAllExceptMe), so what is
-- left is the requester's own session. A session with no created_at counts
-- as old. An account deleted later in the same transaction is skipped (its
-- sessions went with it, and so did the password).
create function private.guard_first_password_session() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.email_confirmed_at is null
     or coalesce(new.encrypted_password, '') = ''
     or coalesce(old.encrypted_password, '') <> '' then
    return null;                       -- not a first password on a confirmed account
  end if;
  if not exists (select 1 from auth.users u where u.id = new.id) then
    return null;                       -- the account is gone by commit
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
revoke all on function private.guard_first_password_session() from public, anon, authenticated, service_role;

create constraint trigger kaisip_first_password_session
  after update of encrypted_password on auth.users
  deferrable initially deferred
  for each row execute function private.guard_first_password_session();

-- ── Rule 6: only staff may enrol an MFA factor ──────────────────────
create function private.guard_mfa_enrol() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.beta_desk_admins a where a.user_id = new.user_id)
     and not exists (select 1 from private.staff s where s.user_id = new.user_id) then
    raise exception 'kaisip_mfa_staff_only'
      using errcode = 'P0001',
            hint = 'Authenticator apps are for KaiSip staff. Add the account to the staff list first.';
  end if;
  return new;
end $$;
revoke all on function private.guard_mfa_enrol() from public, anon, authenticated, service_role;

create trigger kaisip_mfa_staff_only
  before insert or update of user_id on auth.mfa_factors
  for each row execute function private.guard_mfa_enrol();

-- ── Retire the wipe-every-password rule (last: audit LOW-2) ─────────
drop trigger kaisip_clear_password on auth.users;
drop function private.clear_password_when_confirmed();
