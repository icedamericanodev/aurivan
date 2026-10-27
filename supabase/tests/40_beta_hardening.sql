-- Accounts beta hardening (20261027000000_beta_hardening.sql).
-- The board is paused after every migration has run; no new password can be
-- set on a confirmed account (the Free-plan stand-in for the "password
-- verification" Auth hook), while new accounts, sign-ins and removing a
-- password keep working; the trigger function can't be called by app roles.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(13);

-- 1. The board stays paused for the beta.
select is((select posting_open from public.board_settings), false,
  'posting on the feedback board is paused after the migrations');
select is((select read_scope from public.board_settings), 'signed_in',
  'the read scope is unchanged (no post exists to read)');

-- 2. Passwords.
select has_trigger('auth', 'users', 'kaisip_refuse_new_password', 'the no-password trigger is on auth.users');

-- A new email-code account: the Auth server stores a random throwaway
-- password nobody knows, before the email is confirmed.
select lives_ok($$ insert into auth.users (id, email, encrypted_password)
                   values ('00000000-0000-0000-0000-0000000000e1', 'e1@test.invalid', '$2a$10$throwaway.first') $$,
  'a new, unconfirmed account can be created with the Auth server''s throwaway password');
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$throwaway.second'
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'a new throwaway password while the first code is pending is allowed (unconfirmed)');
select lives_ok($$ update auth.users set email_confirmed_at = now()
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'confirming the email (the code is entered) works');
select throws_ok($$ update auth.users set encrypted_password = '$2a$10$attacker.chosen'
                    where id = '00000000-0000-0000-0000-0000000000e1' $$,
  '42501', 'passwords_disabled', 'a confirmed account can''t be given a new password');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000e1'),
  '$2a$10$throwaway.second', 'the stored password is unchanged');
select lives_ok($$ update auth.users set email = 'e1-new@test.invalid', last_sign_in_at = now()
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'other changes to a confirmed account (sign-ins, an email change) still work');
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$throwaway.second'
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'writing back the same password (an update that touches every column) is allowed');
select lives_ok($$ update auth.users set encrypted_password = ''
                   where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'removing the password is allowed');

-- A Google account: confirmed from the start, no password.
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000e2', 'e2@test.invalid', now(), '');
select throws_ok($$ update auth.users set encrypted_password = '$2a$10$attacker.chosen'
                    where id = '00000000-0000-0000-0000-0000000000e2' $$,
  '42501', 'passwords_disabled', 'a Google account can''t be given a password either');

-- The function behind it is not callable by anyone but its owner.
select ok(not has_function_privilege('anon', 'private.refuse_new_password()', 'execute')
          and not has_function_privilege('authenticated', 'private.refuse_new_password()', 'execute'),
  'app roles cannot execute the trigger function');

select * from finish();
rollback;
