-- Password guard (20261128000000_password_guard.sql). Passwords are allowed,
-- but only one set by a session that has just proved the inbox survives.
-- The pre-registration takeover (security audit H1) and its variants stay
-- closed; a sign-in flow never fails because of the guard. A first password
-- must come from the requesting session itself (password audit HIGH-1, checked
-- at commit), and only staff may enrol an authenticator app (HIGH-2).
-- Design: docs/mobile/PASSWORD_SIGN_IN_DESIGN.md §3; audit:
-- docs/mobile/PASSWORD_DESIGN_AUDIT.md. Mutants: scripts/password_sql_mutants.py.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
--      or bash scripts/beta_desk/pg_local.sh supabase/tests/41_passwords.sql
begin;
select plan(75);

-- The Auth server writes as its own role, supabase_auth_admin, which owns the
-- auth tables and has NO execute grant on the guards (the triggers must still
-- fire, and the MFA guard must still read the private lists). Where this
-- session may become that role (the local shim, scripts/beta_desk/shim.sql),
-- the writes below run as it; on a stack where it can't, they run as the test
-- user. pgTAP's own bookkeeping always runs as the test user.
create function pg_temp.become_auth() returns void language plpgsql as $f$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin')
     and pg_has_role(current_user, 'supabase_auth_admin', 'MEMBER') then
    set local role supabase_auth_admin;
  end if;
end $f$;

-- One write as the Auth server (no commit-time check).
create function pg_temp.as_auth(p_sql text) returns void language plpgsql as $f$
begin
  perform pg_temp.become_auth();
  execute p_sql;
  reset role;
end $f$;

-- One write as the Auth server, then its COMMIT: the test file ends in
-- rollback, so the commit-time check is forced with SET CONSTRAINTS ...
-- IMMEDIATE, then deferred again for the next case. It also runs any check
-- still pending from earlier statements, so use it only where those are valid.
create function pg_temp.commit_as_auth(p_sql text) returns void language plpgsql as $f$
begin
  perform pg_temp.become_auth();
  execute p_sql;
  set constraints all immediate;   -- the COMMIT-time check runs here
  set constraints all deferred;
  reset role;
end $f$;

-- PUT /auth/v1/user as the Auth server runs it (internal/api/user.go,
-- models.User.UpdatePassword), in one transaction: write the hash, sign out
-- every OTHER session (LogoutAllExceptMe; every session when p_session is
-- NULL, as the admin API does), then COMMIT. p_sign_in_now adds a fresh
-- session of the same account just before the commit (a sign-in landing at
-- that moment).
create function pg_temp.put_user(p_user uuid, p_session uuid, p_hash text, p_sign_in_now boolean default false)
returns void language plpgsql as $f$
begin
  perform pg_temp.become_auth();
  update auth.users set encrypted_password = p_hash where id = p_user;
  delete from auth.sessions where user_id = p_user and (p_session is null or id <> p_session);
  if p_sign_in_now then
    insert into auth.sessions (id, user_id, created_at) values (gen_random_uuid(), p_user, now());
  end if;
  set constraints all immediate;   -- the COMMIT-time check runs here
  set constraints all deferred;
  reset role;
end $f$;

-- ── 0. The triggers and their functions ────────────────────────────
select has_trigger('auth', 'users', 'kaisip_password_guard', 'the password guard is on auth.users');
select hasnt_trigger('auth', 'users', 'kaisip_clear_password', 'the wipe-every-password trigger is gone');
select hasnt_function('private', 'clear_password_when_confirmed', 'and so is its function');
select ok(not has_function_privilege('anon', 'private.guard_password()', 'execute')
          and not has_function_privilege('authenticated', 'private.guard_password()', 'execute')
          and not has_function_privilege('anon', 'private.guard_first_password_session()', 'execute')
          and not has_function_privilege('authenticated', 'private.guard_first_password_session()', 'execute')
          and not has_function_privilege('anon', 'private.guard_mfa_enrol()', 'execute')
          and not has_function_privilege('authenticated', 'private.guard_mfa_enrol()', 'execute')
          and not has_function_privilege('service_role', 'private.guard_password()', 'execute')
          and not has_function_privilege('service_role', 'private.guard_first_password_session()', 'execute')
          and not has_function_privilege('service_role', 'private.guard_mfa_enrol()', 'execute'),
  'app roles and the service role cannot execute any of the three guards');
select is((select prosecdef from pg_proc where oid = 'private.guard_password()'::regprocedure), false,
  'the password guard runs as the caller, not as its owner');
select is((select prosecdef from pg_proc where oid = 'private.guard_first_password_session()'::regprocedure), false,
  'so does the commit-time check');
select is((select prosecdef from pg_proc where oid = 'private.guard_mfa_enrol()'::regprocedure), true,
  'the MFA guard runs as its owner (the Auth server''s role cannot read the private lists)');
select ok((select bool_and(coalesce(proconfig, '{}') @> array['search_path=""']) from pg_proc
           where oid in ('private.guard_password()'::regprocedure, 'private.guard_first_password_session()'::regprocedure,
                         'private.guard_mfa_enrol()'::regprocedure)),
  'all three pin search_path to ''''');
-- tgtype bits: 1 row, 2 before, 4 insert, 8 delete, 16 update, 32 truncate.
select trigger_is('auth', 'users', 'kaisip_password_guard', 'private', 'guard_password',
  'kaisip_password_guard calls private.guard_password');
select is((select tgtype::int from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'kaisip_password_guard'),
  23, 'kaisip_password_guard is BEFORE INSERT OR UPDATE, FOR EACH ROW');
select is((select array_agg(a.attname::text order by a.attname) from pg_trigger t
           join pg_attribute a on a.attrelid = t.tgrelid and a.attnum = any (t.tgattr)
           where t.tgrelid = 'auth.users'::regclass and t.tgname = 'kaisip_password_guard'),
  array['email', 'email_confirmed_at', 'encrypted_password'],
  'it fires on updates of email_confirmed_at, encrypted_password and email');
select trigger_is('auth', 'users', 'kaisip_first_password_session', 'private', 'guard_first_password_session',
  'kaisip_first_password_session calls private.guard_first_password_session');
select is((select tgtype::int from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'kaisip_first_password_session'),
  17, 'kaisip_first_password_session is AFTER UPDATE, FOR EACH ROW');
select ok((select tgconstraint <> 0 and tgdeferrable and tginitdeferred from pg_trigger
           where tgrelid = 'auth.users'::regclass and tgname = 'kaisip_first_password_session'),
  'it is a constraint trigger, deferrable and initially deferred (checked at commit)');
select is((select array_agg(a.attname::text order by a.attname) from pg_trigger t
           join pg_attribute a on a.attrelid = t.tgrelid and a.attnum = any (t.tgattr)
           where t.tgrelid = 'auth.users'::regclass and t.tgname = 'kaisip_first_password_session'),
  array['encrypted_password'], 'it fires on updates of encrypted_password');
select trigger_is('auth', 'mfa_factors', 'kaisip_mfa_staff_only', 'private', 'guard_mfa_enrol',
  'kaisip_mfa_staff_only calls private.guard_mfa_enrol');
select is((select tgtype::int from pg_trigger where tgrelid = 'auth.mfa_factors'::regclass and tgname = 'kaisip_mfa_staff_only'),
  23, 'kaisip_mfa_staff_only is BEFORE INSERT OR UPDATE, FOR EACH ROW');
select is((select array_agg(a.attname::text order by a.attname) from pg_trigger t
           join pg_attribute a on a.attrelid = t.tgrelid and a.attnum = any (t.tgattr)
           where t.tgrelid = 'auth.mfa_factors'::regclass and t.tgname = 'kaisip_mfa_staff_only'),
  array['user_id'], 'it fires on updates of user_id (a factor moved to another account)');
select is((select count(*)::int from pg_trigger
           where tgname in ('kaisip_password_guard', 'kaisip_first_password_session', 'kaisip_mfa_staff_only')
             and tgenabled = 'O'),
  3, 'all three triggers are enabled');

-- ── 1. A first password comes from the requesting session (HIGH-1, at commit)
-- c1: a Google or code account. A thief holds an old session (2 hours); the
-- owner has just signed in again (1 minute), e.g. after the thief's
-- "sign out other devices".
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000c1', 'c1@test.invalid', now() - interval '1 day', '');
insert into auth.sessions (id, user_id, created_at) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', now() - interval '1 minute');
select throws_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c1',
                                            '00000000-0000-0000-0000-0000000000b1', '$2a$10$thief.chosen') $$,
  'P0001', 'kaisip_password_needs_recent_sign_in',
  'H-1: the thief''s old session cannot add a first password, even right after the owner''s fresh sign-in');
select is((select count(*)::int from auth.sessions where id = '00000000-0000-0000-0000-0000000000b2'), 1,
  'the refused write rolled back: the owner''s fresh session is still there');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000c1'), '',
  'and no password was saved');
select lives_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c1',
                                           '00000000-0000-0000-0000-0000000000b2', '$2a$10$owner.fresh') $$,
  'the owner''s own fresh session adds a first password (checked at commit)');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000c1'),
  '$2a$10$owner.fresh', 'and it is kept');

-- c8: the owner's fresh session sets a first password while another fresh
-- sign-in of the same account lands before the commit: two fresh sessions are
-- fine (the rule is "none old", not "exactly one").
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000c8', 'c8@test.invalid', now() - interval '1 day', '');
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000c8', now() - interval '1 minute');
select lives_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c8',
                                           '00000000-0000-0000-0000-0000000000b9', '$2a$10$c8.owner', true) $$,
  'a fresh session adds a first password even if another fresh sign-in lands at the same moment');

-- c9: ANOTHER account's old sessions don't count against this one at commit.
insert into auth.users (id, email, email_confirmed_at, encrypted_password) values
  ('00000000-0000-0000-0000-0000000000c9', 'c9@test.invalid', now() - interval '1 day', ''),
  ('00000000-0000-0000-0000-0000000000ca', 'ca@test.invalid', now() - interval '1 day', '');
insert into auth.sessions (id, user_id, created_at) values
  ('00000000-0000-0000-0000-0000000000ba', '00000000-0000-0000-0000-0000000000c9', now() - interval '1 minute'),
  ('00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000ca', now() - interval '3 hours');
select lives_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c9',
                                           '00000000-0000-0000-0000-0000000000ba', '$2a$10$c9.owner') $$,
  'another account''s old session does not block a first password at commit');

-- cb: a first password, then the account is deleted in the same transaction:
-- nothing is left to check at commit.
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000cb', 'cb@test.invalid', now() - interval '1 day', '');
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000bc', '00000000-0000-0000-0000-0000000000cb', now());
select lives_ok($$ select pg_temp.commit_as_auth($q$
                     update auth.users set encrypted_password = '$2a$10$cb.gone' where id = '00000000-0000-0000-0000-0000000000cb';
                     delete from auth.users where id = '00000000-0000-0000-0000-0000000000cb' $q$) $$,
  'an account deleted after its first password, before the commit, is not checked');

-- c2: an old session asks while the owner holds a fresh one (so the check
-- before the write passes), and another fresh sign-in of the same account
-- lands just before the commit: the old requester is still there, so it is
-- refused.
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000c2', 'c2@test.invalid', now() - interval '1 day', '');
insert into auth.sessions (id, user_id, created_at) values
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c2', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-0000000000c2', now() - interval '1 minute');
select throws_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c2',
                                            '00000000-0000-0000-0000-0000000000b3', '$2a$10$thief.chosen', true) $$,
  'P0001', 'kaisip_password_needs_recent_sign_in',
  'a sign-in landing at the same moment does not make an old requesting session fresh');

-- c3: the same with a requesting session that has no created_at: it counts
-- as old.
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000c3', 'c3@test.invalid', now() - interval '1 day', '');
insert into auth.sessions (id, user_id, created_at) values
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000c3', null),
  ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000c3', now() - interval '1 minute');
select throws_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c3',
                                            '00000000-0000-0000-0000-0000000000b4', '$2a$10$thief.chosen', true) $$,
  'P0001', 'kaisip_password_needs_recent_sign_in',
  'a session with no created_at counts as old');

-- c4: the admin API signs out EVERY session (UpdatePassword(tx, nil)), so
-- nothing fresh is left at commit, even though the account signed in just now.
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000c4', 'c4@test.invalid', now() - interval '1 day', '');
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000c4', now());
select throws_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c4', null, '$2a$10$admin.set') $$,
  'P0001', 'kaisip_password_needs_recent_sign_in',
  'the admin API cannot add a first password, even when the account signed in a moment ago');

-- c5: changing an EXISTING password is left to the Auth server (rule 5).
-- Its password is set the way the apps do it (a fresh session, checked), and
-- that session is then two hours old.
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000c5', 'c5@test.invalid', now() - interval '1 day', '');
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000c5', now());
do $$ begin perform pg_temp.put_user('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000b6', '$2a$10$c5.old'); end $$;
update auth.sessions set created_at = now() - interval '2 hours' where id = '00000000-0000-0000-0000-0000000000b6';
select lives_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c5',
                                           '00000000-0000-0000-0000-0000000000b6', '$2a$10$c5.new') $$,
  'changing an existing password from an old session is not refused at commit (the Auth server''s rules apply)');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000c5'),
  '$2a$10$c5.new', 'and the new password is kept');

-- c6: clearing a password is never refused, whatever the sessions.
insert into auth.users (id, email, email_confirmed_at, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000c6', 'c6@test.invalid', now() - interval '1 day', '');
select lives_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c6', null, null) $$,
  'removing a password is never refused at commit');

-- c7: an UNCONFIRMED account (a new email-code sign-up) gets the Auth
-- server's throwaway password with no session at all: allowed before the
-- write and at commit (rule 2 wipes it at confirmation).
insert into auth.users (id, email, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000c7', 'c7@test.invalid', '');
select lives_ok($$ select pg_temp.put_user('00000000-0000-0000-0000-0000000000c7', null, '$2a$10$throwaway') $$,
  'an unconfirmed account takes a password with no session (it cannot sign in yet)');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000c7'),
  '$2a$10$throwaway', 'and keeps it until it is confirmed');

-- ── 2. H1 on the sign-up confirmation path (the one the Auth server leaves open)
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

-- ── 3. The real owner's sign-up: the fresh session saves their password ─
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', now());
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$owner.chosen'
                   where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'right after the code, the owner''s own new session saves a password');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'),
  '$2a$10$owner.chosen', 'and it is kept');
-- A sign-in's write, touching every column the two password triggers watch,
-- run to its commit: both triggers fire, nothing is refused.
select lives_ok($$ select pg_temp.commit_as_auth($q$
                     update auth.users set last_sign_in_at = now(), encrypted_password = encrypted_password,
                            email = email, email_confirmed_at = email_confirmed_at
                     where id = '00000000-0000-0000-0000-0000000000f1' $q$) $$,
  'other changes to the account still work, through to the commit...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'),
  '$2a$10$owner.chosen', '...and keep the password');

-- ── 4. Changing an existing password: the Auth server's rules, never the session age
delete from auth.sessions where user_id = '00000000-0000-0000-0000-0000000000f1';
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$owner.changed'
                   where id = '00000000-0000-0000-0000-0000000000f1' $$,
  'a change (or a re-hash during a password sign-in) is not blocked by an old or missing session');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f1'),
  '$2a$10$owner.changed', 'and the changed password is kept');

-- ── 5. Email change (rule 3) ───────────────────────────────────────
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

-- ── 6. H1 on the code path: the Auth server clears first (to null), then confirms
insert into auth.users (id, email, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000f2', 'f2@test.invalid', '$2a$10$attacker.chosen');
select lives_ok($$ update auth.users set encrypted_password = null
                   where id = '00000000-0000-0000-0000-0000000000f2' $$,
  'removing a password always works (the Auth server''s own clear)');
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-0000000000f2';
select is((select coalesce(encrypted_password, '') from auth.users where id = '00000000-0000-0000-0000-0000000000f2'), '',
  'after a code confirmation there is no password');

-- ── 7. A password and a confirmation in one write (Google, if the server ever confirmed first)
insert into auth.users (id, email, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000f3', 'f3@test.invalid', '$2a$10$attacker.chosen');
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$both', email_confirmed_at = now()
                   where id = '00000000-0000-0000-0000-0000000000f3' $$,
  'a password and a confirmation in one write...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f3'), '',
  '...leave no password');
-- f8: the same on an account that had NO password (an invite being accepted),
-- with no session yet: the wipe wins, nothing is refused.
insert into auth.users (id, email, encrypted_password)
  values ('00000000-0000-0000-0000-0000000000f8', 'f8@test.invalid', null);
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$invite', email_confirmed_at = now()
                   where id = '00000000-0000-0000-0000-0000000000f8' $$,
  'a password and a confirmation in one write on an account that had none never fails...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f8'), '',
  '...and leaves no password');

-- ── 8. Inserted already confirmed with a password (rule 1) ─────────
select lives_ok($$ insert into auth.users (id, email, email_confirmed_at, encrypted_password)
                   values ('00000000-0000-0000-0000-0000000000f4', 'f4@test.invalid', now(), '$2a$10$preset') $$,
  'inserting a confirmed account with a password works...');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f4'), '',
  '...and stores no password (admin create, or "Confirm email" off)');

-- ── 9. A first password needs a sign-in in the last 10 minutes (rule 4, before the write)
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
-- f5 confirms it is them again (Google, a password or a reset code): a new session.
insert into auth.sessions (id, user_id, created_at)
  values ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000f5', now() - interval '9 minutes');
select lives_ok($$ update auth.users set encrypted_password = '$2a$10$owner.later'
                   where id = '00000000-0000-0000-0000-0000000000f5' $$,
  '"Set a password later": within 10 minutes of a new sign-in it works');
select is((select encrypted_password from auth.users where id = '00000000-0000-0000-0000-0000000000f5'),
  '$2a$10$owner.later', 'and it is kept');

-- ── 10. Unconfirmed accounts and clearing ──────────────────────────
select lives_ok($$ insert into auth.users (id, email, encrypted_password)
                   values ('00000000-0000-0000-0000-0000000000f7', 'f7@test.invalid', '$2a$10$throwaway') $$,
  'a new email-code account with the Auth server''s throwaway password is created normally');
select lives_ok($$ update auth.users set encrypted_password = ''
                   where id = '00000000-0000-0000-0000-0000000000f5' $$,
  'clearing a password on a confirmed account always works');
select hasnt_trigger('auth', 'users', 'kaisip_refuse_new_password', 'the earliest raising trigger is still gone');

-- ── 11. Authenticator apps are for staff only (HIGH-2) ─────────────
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'learner@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000000d2', 'desk-admin@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000000d3', 'board-staff@test.invalid', now());
insert into private.beta_desk_admins (user_id) values ('00000000-0000-0000-0000-0000000000d2');
insert into private.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000d3', 'moderator');
select throws_ok($$ select pg_temp.as_auth($q$ insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
                    values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', 'thief', 'totp', 'unverified', now(), now()) $q$) $$,
  'P0001', 'kaisip_mfa_staff_only',
  'a learner''s account cannot enrol an authenticator app (a thief could lock the owner out)');
select throws_ok($$ select pg_temp.as_auth($q$ insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, phone)
                    values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', 'phone', 'phone', 'unverified', now(), now(), '15550001') $q$) $$,
  'P0001', 'kaisip_mfa_staff_only',
  'nor any other second factor (phone)');
select is((select count(*)::int from auth.mfa_factors where user_id = '00000000-0000-0000-0000-0000000000d1'), 0,
  'and the learner has no factor');
select lives_ok($$ select pg_temp.as_auth($q$ insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
                   values ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d2', 'desk', 'totp', 'unverified', now(), now()) $q$) $$,
  'a Beta Desk admin can still set up an authenticator app');
select lives_ok($$ select pg_temp.as_auth($q$ update auth.mfa_factors set status = 'verified', updated_at = now()
                   where id = '00000000-0000-0000-0000-0000000000e2' $q$) $$,
  'and verify it (the second step of the Beta Desk sign-in)');
select lives_ok($$ select pg_temp.as_auth($q$ insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
                   values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d3', 'board', 'totp', 'unverified', now(), now()) $q$) $$,
  'board staff can still set up an authenticator app');
delete from private.beta_desk_admins where user_id = '00000000-0000-0000-0000-0000000000d2';
select is((select status::text from auth.mfa_factors where id = '00000000-0000-0000-0000-0000000000e2'), 'verified',
  'an admin taken off the list keeps the factor already enrolled (new rows only)...');
select throws_ok($$ select pg_temp.as_auth($q$ insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at)
                    values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d2', 'second', 'totp', 'unverified', now(), now()) $q$) $$,
  'P0001', 'kaisip_mfa_staff_only',
  '...but cannot enrol a new one');

select throws_ok($$ select pg_temp.as_auth($q$ update auth.mfa_factors set user_id = '00000000-0000-0000-0000-0000000000d1'
                    where id = '00000000-0000-0000-0000-0000000000e2' $q$) $$,
  'P0001', 'kaisip_mfa_staff_only',
  'and no factor can be moved onto a learner''s account');

select * from finish();
rollback;
