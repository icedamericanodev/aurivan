-- KaiSip: accounts beta hardening (27 Oct 2026). NOT APPLIED ANYWHERE.
-- Applied fourth, after 20261014000000_feedback_board.sql (which must be
-- applied even with the board off: delete-account and export-my-data call
-- its svc_board_counts / svc_board_export). Append-only once applied.
--
-- Plain English:
--  1. The feedback board stays paused for the beta. Nothing in the apps
--     opens it (the board has its own build flag, off), and this closes the
--     server side too: posting_open = false, which only staff (admin) can
--     reopen. Reading board_settings stays open to anon on purpose: the
--     keep-awake job and the apps read it before sign-in.
--  2. No passwords. KaiSip signs in with an email code or Google, never a
--     password. On the Free plan the "password verification" Auth hook is
--     not available, so a trigger stands in for it: once an account is
--     confirmed, nobody can set a new password on it. Without this, someone
--     holding a stolen fresh session could add a password and keep a second
--     way in after the learner signs out everywhere.
--       * Unconfirmed accounts are left alone: the Auth server gives every
--         new email-code account a random throwaway password it never
--         reveals, and may set a new one while the first code is pending.
--       * Removing a password (empty or null) is always allowed.
--       * The function lives in schema private (not exposed by the Data API)
--         and nobody may call it directly; a trigger needs no EXECUTE grant.
--     If this ever blocks a real sign-in flow, the emergency brake is
--       drop trigger kaisip_refuse_new_password on auth.users;
--     (one statement, no app release), then fix it in a new migration.

-- 1. The board stays paused.
update public.board_settings set posting_open = false, updated_at = now();

-- 2. Refuse a new password on a confirmed account.
create function private.refuse_new_password() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.email_confirmed_at is not null
     and coalesce(new.encrypted_password, '') <> ''
     and new.encrypted_password is distinct from old.encrypted_password then
    raise exception 'passwords_disabled' using errcode = '42501',
      hint = 'KaiSip accounts sign in with an email code or Google only.';
  end if;
  return new;
end $$;
revoke all on function private.refuse_new_password() from public, anon, authenticated;

create trigger kaisip_refuse_new_password
  before update of encrypted_password on auth.users
  for each row execute function private.refuse_new_password();
