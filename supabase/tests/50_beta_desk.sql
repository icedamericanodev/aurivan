-- Beta Desk (20261104000000_beta_desk.sql): the private tester tracker.
-- Proves, on the applied database:
--  1. Access: anon sees nothing; a signed-in learner who is not an admin sees
--     and changes nothing; an admin whose email is not confirmed is not an
--     admin; a confirmed admin reads and writes; the admin list is unreadable.
--  2. Saving: a tester saves with defaults; updated_at has its trigger.
--  3. Duplicates: the same email in any case or spacing is refused, and the
--     CSV import's "skip duplicates" (on conflict do nothing) keeps one row.
--  4. Dates: the 14-day review counts from the Google Play opt-in (never from
--     registration); the reward ends six calendar months after activation
--     (month ends and leap years included); nobody can write either one.
--  5. Rules: approval needs an opt-in, day 14, a passed participation check
--     and the terms on record; a technical gap needs its note; a reward needs
--     an approval first.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(44);

-- Accounts used below: an admin (confirmed), a learner (not an admin), and an
-- admin address whose account never confirmed its email.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000d1', 'Owner@Test.invalid', now()),
  ('00000000-0000-0000-0000-0000000000d2', 'learner@test.invalid', now()),
  ('00000000-0000-0000-0000-0000000000d3', 'unconfirmed@test.invalid', null);
insert into private.beta_desk_admins (email) values ('owner@test.invalid'), ('unconfirmed@test.invalid');

-- ── 1. Access ───────────────────────────────────────────────────────
select is((select count(*)::int from public.beta_desk_settings), 1, 'the settings row exists (a singleton)');
select throws_ok($$ insert into private.beta_desk_admins (email) values ('Mixed@Case.invalid') $$, '23514', null,
  'admin emails are stored trimmed and in lower case');

-- anon
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select count(*) from public.beta_testers $$, '42501', null, 'anon cannot read testers');
select throws_ok($$ select count(*) from public.beta_desk_settings $$, '42501', null, 'anon cannot read the settings');
select throws_ok($$ insert into public.beta_testers (email) values ('x@test.invalid') $$, '42501', null, 'anon cannot add a tester');
select throws_ok($$ select private.beta_desk_is_admin() $$, '42501', null, 'anon cannot call the admin check');
reset role;

-- The admin adds a tester (used by the learner checks next).
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select is((select count(*)::int from public.beta_desk_settings), 1,
  'a confirmed account on the admin list is an admin: it reads the settings (email matched in any case)');
select lives_ok($$ insert into public.beta_testers (full_name, email, device) values ('Ana Reyes', 'ana@test.invalid', 'Pixel 8') $$,
  'an admin adds a tester');
reset role;

-- a signed-in learner who is not an admin
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select throws_ok($$ select private.beta_desk_is_admin() $$, '42501', null,
  'a learner cannot call the helper by name (no usage on schema private; only the policies call it)');
select is((select count(*)::int from public.beta_testers), 0, 'a learner reads no tester');
select is((select count(*)::int from public.beta_desk_settings), 0, 'a learner reads no settings (this is how the page knows "not an admin")');
select throws_ok($$ insert into public.beta_testers (email) values ('mallory@test.invalid') $$, '42501', null,
  'a learner cannot add a tester');
update public.beta_testers set notes = 'changed by learner';
delete from public.beta_testers;
update public.beta_desk_settings set registration_target = 1;
select throws_ok($$ select email from private.beta_desk_admins $$, '42501', null, 'a learner cannot read the admin list');
select throws_ok($$ insert into private.beta_desk_admins (email) values ('learner@test.invalid') $$, '42501', null,
  'a learner cannot add themselves to the admin list');
reset role;
select is((select notes from public.beta_testers where email_key = 'ana@test.invalid'), '',
  'a learner''s update changed nothing');
select is((select count(*)::int from public.beta_testers), 1, 'a learner''s delete removed nothing');
select is((select registration_target from public.beta_desk_settings), 50, 'a learner cannot change the settings');

-- an admin address whose email was never confirmed
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}';
select is((select count(*)::int from public.beta_desk_settings), 0, 'an unconfirmed email on the admin list is not an admin');
select is((select count(*)::int from public.beta_testers), 0, 'an unconfirmed account reads no tester');
reset role;

-- ── 2. Saving (as the admin from here on) ───────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select is((select registered_on from public.beta_testers where email_key = 'ana@test.invalid'), current_date,
  'registered_on defaults to today');
select is((select (participation, completion, source) from public.beta_testers where email_key = 'ana@test.invalid'),
  row('unchecked'::text, 'pending'::text, 'manual'::text), 'a new tester starts unchecked, pending, added by hand');
select lives_ok($$ update public.beta_desk_settings set registration_target = 60, signup_form_url = 'https://forms.gle/example' $$,
  'an admin changes the settings');
select throws_ok($$ update public.beta_desk_settings set signup_form_url = 'javascript:alert(1)' $$, '23514', null,
  'the signup form link must be https');
select throws_ok($$ insert into public.beta_testers (email) values ('not-an-email') $$, '23514', null,
  'an email must look like an email');

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
select has_trigger('public', 'beta_testers', 'beta_testers_touch', 'updated_at is refreshed on every change (trigger)');

-- An admin deletes a record.
select lives_ok($$ delete from public.beta_testers where email_key = 'ben@test.invalid' $$, 'an admin deletes a tester record');
reset role;

select * from finish();
rollback;
