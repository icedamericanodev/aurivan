-- Accounts beta migrations (20261027000000_beta_board_paused.sql,
-- 20261027000100_beta_no_passwords.sql).
-- The board is paused and its write entry points are closed even to the
-- service role (the export and deletion reads stay open). A confirmed
-- account never keeps a password, however it arrived (security audit H1:
-- an attacker pre-registers the victim's email with a password, then the
-- victim confirms with an email code), while every other change to an
-- account still works and no write ever fails because of it.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(22);

-- ── 1. The board stays paused, its writes closed ────────────────────
select is((select posting_open from public.board_settings), false,
  'posting on the feedback board is paused after the migrations');
select is((select read_scope from public.board_settings), 'signed_in',
  'the read scope is unchanged (no post exists to read)');
select ok(not has_function_privilege('service_role', 'public.svc_board_join(uuid, text, text, text)', 'execute')
          and not has_function_privilege('service_role', 'public.svc_board_attempt(uuid)', 'execute')
          and not has_function_privilege('service_role',
                'public.svc_board_write(uuid, text, uuid, text, text, text, text, uuid, text, text, uuid, boolean)', 'execute')
          and not has_function_privilege('service_role', 'public.svc_staff_act(uuid, text, text, uuid, text, jsonb)', 'execute'),
  'the service role cannot call the board''s write entry points while the board is off');
select ok(has_function_privilege('service_role', 'public.svc_board_counts(uuid)', 'execute')
          and has_function_privilege('service_role', 'public.svc_board_export(uuid)', 'execute'),
  'it can still read the board counts and export (account deletion, Download my data)');

-- ── 2. No passwords on confirmed accounts ───────────────────────────
select has_trigger('auth', 'users', 'kaisip_clear_password', 'the password-clearing trigger is on auth.users');

-- H1: pre-registration. The attacker signs up with the victim's address and
-- a password; the account is unconfirmed.
select lives_ok($$ insert into auth.users (id, email, encrypted_password)
                   values ('00000000-0000-0000-0000-0000000000e1', 'victim@test.invalid', '$2a$10$attacker.chosen') $$,
  'an unconfirmed sign-up with a password is accepted (nothing can use it yet)');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000e1'),
  '$2a$10$attacker.chosen', 'an unconfirmed account keeps its password (the Auth server''s own throwaway one, usually)');
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$throwaway.second'
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'a new throwaway password while the first code is pending works');
-- The victim enters the emailed code: the address is confirmed.
select lives_ok($$ update auth.users set email_confirmed_at = now()
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'confirming the email never fails');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000e1'), '',
  'the moment the account is confirmed, the pre-registered password is wiped');
-- A stolen fresh session tries to add a password.
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$thief.chosen'
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'setting a password on a confirmed account doesn''t fail (no sign-in flow can break)...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000e1'), '',
  '...but the password is wiped');
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$both', email_confirmed_at = now()
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'a password and a confirmation in one write...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000e1'), '',
  '...leave no password either');
select lives_ok($$ update auth.users set email = 'victim-new@test.invalid', last_sign_in_at = now()
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'other changes to a confirmed account (sign-ins, an email change) still work');
select is((select email from auth.users where id = '00000000-0000-0000-0000-0000000000e1'), 'victim-new@test.invalid',
  'and they are kept');

-- An account inserted already confirmed with a password (an admin create,
-- or sign-up with "Confirm email" off): no password survives the insert.
select lives_ok($$ insert into auth.users (id, email, email_confirmed_at, encrypted_password)
                   values ('00000000-0000-0000-0000-0000000000e2', 'e2@test.invalid', now(), '$2a$10$preset') $$,
  'inserting a confirmed account with a password works...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000e2'), '',
  '...and stores no password');

-- A Google account: confirmed from the start, no password, and none later.
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000e3', 'e3@test.invalid', now(), '');
update auth.users set encrypted_password = '$2a$10$later' where id = '00000000-0000-0000-0000-0000000000e3';
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000e3'), '',
  'a Google account never gets a password');
select lives_ok($$ update auth.users set encrypted_password = null
                   where id = '00000000-0000-0000-0000-0000000000e3' $$,
  'removing a password always works');

-- The function behind it is not callable by anyone but its owner.
select ok(not has_function_privilege('anon', 'private.clear_password_when_confirmed()', 'execute')
          and not has_function_privilege('authenticated', 'private.clear_password_when_confirmed()', 'execute'),
  'app roles cannot execute the trigger function');
select hasnt_trigger('auth', 'users', 'kaisip_refuse_new_password', 'the earlier raising trigger is gone');

select * from finish();
rollback;
