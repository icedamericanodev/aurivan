-- KaiSip: accounts beta, no passwords (27 Oct 2026). NOT APPLIED ANYWHERE.
-- Applied fifth, after 20261027000000_beta_board_paused.sql. Append-only
-- once applied.
--
-- KaiSip signs in with an emailed code or Google, never a password.
-- The Auth server's API still accepts passwords, and the "password
-- verification" Auth hook that could refuse them is not on the Free plan.
-- Two attacks this closes:
--  * Pre-registration (security audit H1, 27 Oct 2026): an attacker calls
--    signUp with the VICTIM's email and a password. Later the victim signs
--    in with an email code, which confirms the address, and the attacker's
--    password would survive as a second way into the victim's account.
--  * A stolen fresh session adding a password, to keep a way in after the
--    learner signs out everywhere.
--
-- The rule: on a CONFIRMED account, any password that arrives is wiped
-- (set to ''), whether it was set before confirmation or after it:
--  * a row inserted already confirmed with a password (admin create, or
--    sign-up with "Confirm email" off);
--  * the moment an account becomes confirmed, if it carries a password (the
--    Auth server's own throwaway password for new email-code accounts, or an
--    attacker's);
--  * a new password set on a confirmed account.
-- It clears rather than raises, so no sign-in flow ever fails because of it:
-- the Auth server's write succeeds, and password sign-in simply never
-- matches. Unconfirmed accounts are left alone (their throwaway password
-- can't be used: unconfirmed email accounts can't sign in).
--
-- GO-LIVE GATE: "Confirm email" must be ON in Auth settings. With it off,
-- signUp makes an already-confirmed account and this trigger is the only
-- thing standing between a stranger and a password on that address.
--
-- The function lives in schema private (not exposed by the Data API) and
-- nobody may call it directly; a trigger needs no EXECUTE grant.
-- Emergency brake, if it ever disturbs a real sign-in flow (no app release):
--   drop trigger kaisip_clear_password on auth.users;
-- then fix it in a new migration.

create function private.clear_password_when_confirmed() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_arrived boolean;
begin
  if new.email_confirmed_at is null or coalesce(new.encrypted_password, '') = '' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    v_arrived := true;
  else
    v_arrived := old.email_confirmed_at is null
                 or new.encrypted_password is distinct from old.encrypted_password;
  end if;
  if v_arrived then
    new.encrypted_password := '';
  end if;
  return new;
end $$;
revoke all on function private.clear_password_when_confirmed() from public, anon, authenticated;

create trigger kaisip_clear_password
  before insert or update of email_confirmed_at, encrypted_password on auth.users
  for each row execute function private.clear_password_when_confirmed();
