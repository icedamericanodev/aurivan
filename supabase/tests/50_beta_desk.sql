-- Beta Desk (20261104000000_beta_desk.sql): the private tester tracker.
-- Proves, on the applied database:
--  1. Access: anon sees nothing; a learner who is not an admin sees and
--     changes nothing; an admin without the second sign-in step (aal1) sees
--     no tester; unconfirmed, anonymous, SSO, banned and deleted accounts on
--     the list are not admins; a listed account reads only the empty gate row
--     before MFA; a confirmed admin with MFA (aal2) reads and writes; the admin
--     list and the helpers are out of reach.
--  2. Saving: defaults; protected columns can't be written; updated_at trigger.
--  3. Duplicates: the same email in any case or spacing is refused, the CSV
--     import's "skip duplicates" keeps one row, and a learner can't use it to
--     test whether an email exists.
--  4. Dates: the 14-day review counts from the Google Play opt-in (never from
--     registration); the reward ends six calendar months after activation
--     (month ends and leap years included); nobody can write either one.
--  5. Rules: approval needs the terms on record and either the 14-day route
--     (opt-in, day 14, a passed participation check) or the feedback route
--     (feedback recorded, approval on or after it); a technical gap needs its
--     note; a reward needs an approval first.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(67);

-- Accounts: an admin, a learner, and listed accounts that must NOT count.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'owner@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000000d2', 'learner@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000000d3', 'unconfirmed@test.invalid', null);
insert into auth.users (id, email, email_confirmed_at, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000d4', null, now(), true);
insert into auth.users (id, email, email_confirmed_at, is_sso_user) values
  ('00000000-0000-0000-0000-0000000000d5', 'sso@test.invalid', now(), true);
insert into auth.users (id, email, email_confirmed_at, banned_until) values
  ('00000000-0000-0000-0000-0000000000d6', 'banned@test.invalid', now(), now() + interval '1 day');
insert into auth.users (id, email, email_confirmed_at, deleted_at) values
  ('00000000-0000-0000-0000-0000000000d7', 'deleted@test.invalid', now(), now());
insert into private.beta_desk_admins (user_id) values
  ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d3'),
  ('00000000-0000-0000-0000-0000000000d4'), ('00000000-0000-0000-0000-0000000000d5'),
  ('00000000-0000-0000-0000-0000000000d6'), ('00000000-0000-0000-0000-0000000000d7');

-- ── 1. Access ───────────────────────────────────────────────────────
select is((select count(*)::int from public.beta_desk_settings), 1, 'the settings row exists (a singleton)');
select throws_ok($$ insert into private.beta_desk_admins (user_id) values ('00000000-0000-0000-0000-00000000dead') $$, '23503', null,
  'the admin list holds only real accounts (by id)');
select ok(not exists (select 1 from pg_publication_tables where tablename in ('beta_testers', 'beta_desk_settings', 'beta_desk_gate')),
  'no Beta Desk table is in any publication (no realtime copies of tester data)');
select ok(not has_function_privilege('authenticated', 'private.beta_desk_touch()', 'execute')
          and not has_function_privilege('anon', 'private.beta_desk_is_admin()', 'execute')
          and not has_function_privilege('anon', 'private.beta_desk_is_listed()', 'execute'),
  'anon runs no Beta Desk helper; nobody calls the touch trigger');

-- anon
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select count(*) from public.beta_testers $$, '42501', null, 'anon cannot read testers');
select throws_ok($$ select count(*) from public.beta_desk_settings $$, '42501', null, 'anon cannot read the settings');
select throws_ok($$ select count(*) from public.beta_desk_gate $$, '42501', null, 'anon cannot read the gate');
select throws_ok($$ insert into public.beta_testers (email) values ('x@test.invalid') $$, '42501', null, 'anon cannot add a tester');
select throws_ok($$ select private.beta_desk_is_admin() $$, '42501', null, 'anon cannot call the admin check');
reset role;

-- The admin, before the second step (aal1): on the list, but no tester data.
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.beta_desk_gate), 1, 'a listed admin sees the gate row before MFA (so the page asks for the code)');
select is((select count(*)::int from public.beta_desk_settings), 0, 'an admin without MFA (aal1) reads no settings');
select throws_ok($$ insert into public.beta_testers (email) values ('aal1@test.invalid') $$, '42501', null,
  'an admin without MFA (aal1) cannot add a tester');
reset role;

-- The admin with MFA adds a tester (used by the checks below).
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.beta_desk_settings), 1, 'a confirmed admin with MFA (aal2) reads the settings');
select lives_ok($$ insert into public.beta_testers (full_name, email, device) values ('Ana Reyes', 'ana@test.invalid', 'Pixel 8') $$,
  'an admin with MFA adds a tester');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.beta_testers), 0, 'the same admin without MFA reads no tester');
reset role;

-- A signed-in learner who is not an admin (even with MFA).
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated","aal":"aal2"}';
select throws_ok($$ select private.beta_desk_is_admin() $$, '42501', null,
  'a learner cannot call the helper by name (no usage on schema private; only the policies call it)');
select is((select count(*)::int from public.beta_desk_gate), 0, 'a learner does not see the gate row (the page says "No access")');
select is((select count(*)::int from public.beta_testers), 0, 'a learner reads no tester');
select is((select count(*)::int from public.beta_desk_settings), 0, 'a learner reads no settings');
select throws_ok($$ insert into public.beta_testers (email) values ('mallory@test.invalid') $$, '42501', null,
  'a learner cannot add a tester');
select throws_ok($$ insert into public.beta_testers (email) values ('ana@test.invalid') on conflict (email_key) do nothing $$, '42501', null,
  'a learner gets the same refusal for an email that exists (no way to test who is a tester)');
update public.beta_testers set notes = 'changed by learner';
delete from public.beta_testers;
update public.beta_desk_settings set registration_target = 1;
select throws_ok($$ select user_id from private.beta_desk_admins $$, '42501', null, 'a learner cannot read the admin list');
select throws_ok($$ insert into private.beta_desk_admins (user_id) values ('00000000-0000-0000-0000-0000000000d2') $$, '42501', null,
  'a learner cannot add themselves to the admin list');
reset role;
select is((select notes from public.beta_testers where email_key = 'ana@test.invalid'), '',
  'a learner''s update changed nothing');
select is((select count(*)::int from public.beta_testers), 1, 'a learner''s delete removed nothing');
select is((select registration_target from public.beta_desk_settings), 50, 'a learner cannot change the settings');

-- Listed accounts that must not count, each with MFA claims.
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.beta_testers), 0, 'an unconfirmed account on the list reads no tester');
select is((select count(*)::int from public.beta_desk_gate), 0, 'an unconfirmed account on the list does not pass the gate');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.beta_testers), 0, 'an anonymous account on the list reads no tester');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d5","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.beta_testers), 0, 'an SSO account on the list reads no tester');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d6","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.beta_testers), 0, 'a banned account on the list reads no tester');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d7","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.beta_testers), 0, 'a deleted account on the list reads no tester');
reset role;

-- ── 2. Saving (as the admin with MFA from here on) ──────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal2"}';
select is((select registered_on from public.beta_testers where email_key = 'ana@test.invalid'), current_date,
  'registered_on defaults to today');
select is((select (participation, completion, source) from public.beta_testers where email_key = 'ana@test.invalid'),
  row('unchecked'::text, 'pending'::text, 'manual'::text), 'a new tester starts unchecked, pending, added by hand');
select throws_ok($$ update public.beta_testers set id = gen_random_uuid() $$, '42501', null, 'an admin cannot change a record''s id');
select throws_ok($$ update public.beta_testers set source = 'form_csv' $$, '42501', null, 'an admin cannot change where a record came from');
select throws_ok($$ update public.beta_testers set created_at = now() - interval '1 year' $$, '42501', null, 'an admin cannot back-date created_at');
select throws_ok($$ update public.beta_testers set updated_at = now() - interval '1 year' $$, '42501', null, 'an admin cannot set updated_at');
select throws_ok($$ update public.beta_testers set email_key = 'x' $$, '428C9', null, 'nobody writes the email key');
select lives_ok($$ update public.beta_desk_settings set registration_target = 60, signup_form_url = 'https://forms.gle/example' $$,
  'an admin changes the settings');
select throws_ok($$ update public.beta_desk_settings set signup_form_url = 'javascript:alert(1)' $$, '23514', null,
  'the signup form link must be https');
select throws_ok($$ insert into public.beta_testers (email) values ('not-an-email') $$, '23514', null,
  'an email must look like an email');
select has_trigger('public', 'beta_testers', 'beta_testers_touch', 'updated_at is refreshed on every change (trigger)');

-- ── 3. Duplicates ───────────────────────────────────────────────────
select throws_ok($$ insert into public.beta_testers (email) values ('  ANA@test.INVALID ') $$, '23505', null,
  'the same email in another case or with spaces is refused');
select lives_ok($$ insert into public.beta_testers (email, source) values (' Ana@Test.invalid', 'form_csv'), ('ben@test.invalid', 'form_csv')
                   on conflict (email_key) do nothing $$,
  'a CSV import that repeats an email skips it instead of failing');
select is((select count(*)::int from public.beta_testers), 2, 'the import added only the new tester');
select is((select source from public.beta_testers where email_key = 'ana@test.invalid'), 'manual',
  'the existing tester was left as it was');

-- ── 4. Dates ────────────────────────────────────────────────────────
update public.beta_testers set registered_on = '2026-10-01', invited_on = '2026-10-20', opted_in_on = '2026-10-25'
  where email_key = 'ana@test.invalid';
select is((select review_due_on from public.beta_testers where email_key = 'ana@test.invalid'), '2026-11-08'::date,
  'the 14-day review counts from the Google Play opt-in, not from registration');
select is((select review_due_on from public.beta_testers where email_key = 'ben@test.invalid'), null::date,
  'no opt-in, no review date');
select throws_ok($$ update public.beta_testers set review_due_on = '2026-01-01' $$, '428C9', null,
  'nobody writes the review date');
select throws_ok($$ update public.beta_testers set reward_ends_on = '2099-01-01' $$, '428C9', null,
  'nobody writes the reward end date');
select throws_ok($$ update public.beta_testers set opted_in_on = '2026-10-19' where email_key = 'ana@test.invalid' $$, '23514', null,
  'an opt-in cannot come before the invitation');

-- ── 5. Rules ────────────────────────────────────────────────────────
select throws_ok($$ update public.beta_testers set completion = 'approved', approved_on = '2026-11-08', terms_offered = 'T'
                   where email_key = 'ana@test.invalid' $$, '23514', null,
  'approval needs a passed participation check');
update public.beta_testers set participation = 'continuous', participation_checked_on = '2026-11-08', terms_offered = 'Stay 14 days; 6 months of CISA'
  where email_key = 'ana@test.invalid';
select throws_ok($$ update public.beta_testers set completion = 'approved', approved_on = '2026-11-07' where email_key = 'ana@test.invalid' $$,
  '23514', null, 'approval before day 14 after the opt-in is refused');
select lives_ok($$ update public.beta_testers set completion = 'approved', approved_on = '2026-11-08' where email_key = 'ana@test.invalid' $$,
  'approval on day 14 with a passed check and terms on record works');
select throws_ok($$ update public.beta_testers set reward_activated_on = '2026-11-07' where email_key = 'ana@test.invalid' $$, '23514', null,
  'a reward cannot start before the approval');
select throws_ok($$ update public.beta_testers set reward_activated_on = '2026-11-09' where email_key = 'ben@test.invalid' $$, '23514', null,
  'a tester who is not approved cannot get a reward');
select throws_ok($$ update public.beta_testers set participation = 'interrupted_technical', participation_checked_on = current_date
                   where email_key = 'ben@test.invalid' $$, '23514', null,
  'a technical gap needs a note saying what went wrong');

update public.beta_testers set reward_activated_on = '2026-08-31', approved_on = '2026-08-30', opted_in_on = '2026-08-01', invited_on = '2026-07-30'
  where email_key = 'ana@test.invalid';
select is((select reward_ends_on from public.beta_testers where email_key = 'ana@test.invalid'), '2027-02-28'::date,
  'six months from 31 Aug ends on 28 Feb (the month is shorter)');
update public.beta_testers set reward_activated_on = '2027-08-31', approved_on = '2027-08-31' where email_key = 'ana@test.invalid';
select is((select reward_ends_on from public.beta_testers where email_key = 'ana@test.invalid'), '2028-02-29'::date,
  'six months from 31 Aug 2027 ends on 29 Feb 2028 (a leap year)');
update public.beta_testers set reward_activated_on = '2026-11-10', approved_on = '2026-11-09' where email_key = 'ana@test.invalid';
select is((select reward_ends_on from public.beta_testers where email_key = 'ana@test.invalid'), '2027-05-10'::date,
  'six months from 10 Nov 2026 ends on 10 May 2027');

-- The feedback route (20261104010000): one piece of feedback qualifies, without the 14 days.
update public.beta_testers set terms_offered = 'T' where email_key = 'ben@test.invalid';
select throws_ok($$ update public.beta_testers set completion = 'approved', approved_on = current_date where email_key = 'ben@test.invalid' $$,
  '23514', null, 'no opt-in and no feedback: approval is refused');
update public.beta_testers set last_feedback_on = current_date - 2 where email_key = 'ben@test.invalid';
select throws_ok($$ update public.beta_testers set completion = 'approved', approved_on = current_date - 3 where email_key = 'ben@test.invalid' $$,
  '23514', null, 'approval cannot come before the feedback it relies on');
select lives_ok($$ update public.beta_testers set completion = 'approved', approved_on = current_date where email_key = 'ben@test.invalid' $$,
  'one piece of feedback qualifies a tester who never reached 14 days');
select throws_ok($$ update public.beta_testers set terms_offered = '' where email_key = 'ben@test.invalid' $$,
  '23514', null, 'the feedback route still needs the terms on record');
update public.beta_testers set completion = 'pending', approved_on = null where email_key = 'ben@test.invalid';
reset role;
select ok((select terms_offered like '%14 consecutive days%' and terms_offered like '%CISA premium%'
                  and terms_offered like '%activated%' and terms_offered not like '%or send%'
           from public.beta_desk_settings), 'the default terms are the live form''s: 14 consecutive days, CISA only, from activation');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated","aal":"aal2"}';

-- An admin deletes a record.
select lives_ok($$ delete from public.beta_testers where email_key = 'ben@test.invalid' $$, 'an admin deletes a tester record');
reset role;

select * from finish();
rollback;
