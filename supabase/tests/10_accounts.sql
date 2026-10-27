-- Accounts core security tests (Uplift Phase 6, spec §2.7; accounts beta).
-- Two learners, A and B. Own rows only; anon denied; no client writes to
-- entitlements or private tables; server-only functions are server-only;
-- the deletion audit keeps only the keyed hash it is given; no content
-- catalogue in the database; deleting the auth user cascades every account
-- row.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(41);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid');

-- Fixtures written as the owner (postgres), as the service role would.
insert into public.profiles (id, terms_version, age_confirmed)
  values ('00000000-0000-0000-0000-00000000000b', '2026-11', true);
insert into public.entitlements (user_id, entitlement, active, source) values
  ('00000000-0000-0000-0000-00000000000a', 'premium_cisa', true, 'manual'),
  ('00000000-0000-0000-0000-00000000000b', 'premium_cisa', true, 'manual');

-- ── As learner A ───────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- profiles
select lives_ok($$ insert into public.profiles (terms_version, age_confirmed) values ('2026-11', true) $$,
  'A creates their own profile (id defaults to auth.uid())');
select throws_ok($$ insert into public.profiles (id, terms_version, age_confirmed)
                    values ('00000000-0000-0000-0000-00000000000b', '2026-11', true) $$,
  '42501', null, 'A cannot choose the id (no insert grant on id)');
select throws_ok($$ insert into public.profiles (terms_version, age_confirmed) values ('2026-11', false) $$,
  '23514', null, 'the 16+ box must be ticked');
select throws_ok($$ insert into public.profiles (terms_version, age_confirmed) values ('nov-2026', true) $$,
  '23514', null, 'terms_version must look like YYYY-MM');
select is((select count(*) from public.profiles)::int, 1, 'A sees exactly one profile');
select is((select count(*) from public.profiles where id <> auth.uid())::int, 0, 'A cannot see B''s profile');
select lives_ok($$ update public.profiles set terms_version = '2027-01' $$, 'A can update their terms version');
select throws_ok($$ update public.profiles set created_at = now() - interval '1 year' $$,
  '42501', null, 'A cannot change created_at');
select throws_ok($$ update public.profiles set id = '00000000-0000-0000-0000-00000000000b' $$,
  '42501', null, 'A cannot change the id');
select throws_ok($$ delete from public.profiles $$, '42501', null,
  'A cannot delete a profile (deletion is account deletion)');

-- entitlements
select is((select count(*) from public.entitlements)::int, 1, 'A sees only their own entitlement');
select throws_ok($$ insert into public.entitlements values (auth.uid(), 'all_access', true, null, 'manual', now()) $$,
  '42501', null, 'A cannot grant themselves an entitlement');
select throws_ok($$ update public.entitlements set active = true, expires_at = null $$,
  '42501', null, 'A cannot extend an entitlement');
select throws_ok($$ delete from public.entitlements $$, '42501', null, 'A cannot delete entitlements');

-- private tables
select throws_ok($$ select * from private.export_log $$, '42501', null, 'private.export_log is not reachable');
select throws_ok($$ select * from private.deletions $$, '42501', null, 'private.deletions is not reachable');

-- server-only functions
select throws_ok($$ select public.svc_claim_export(auth.uid()) $$, '42501', null,
  'learners cannot call svc_claim_export');
select throws_ok($$ select public.svc_export_due(auth.uid()) $$, '42501', null,
  'learners cannot call svc_export_due');
select throws_ok($$ select private.purge_expired_deletions() $$, '42501', null,
  'learners cannot call the deletion purge');
select throws_ok($$ select public.svc_record_deletion(repeat('ab', 32)) $$, '42501', null,
  'learners cannot call svc_record_deletion');

-- ── As learner B: A's profile changes did not leak; B cannot touch A ──
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select terms_version from public.profiles), '2026-11', 'B sees only B''s profile, unchanged');
update public.profiles set terms_version = '2030-01' where id = '00000000-0000-0000-0000-00000000000a';
reset role;
select is((select terms_version from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  '2027-01', 'B''s update of A''s profile changed nothing');

-- ── As anon (no JWT) ───────────────────────────────────────────────
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select * from public.entitlements $$, '42501', null, 'anon cannot read entitlements');
select throws_ok($$ insert into public.profiles (terms_version, age_confirmed) values ('2026-11', true) $$,
  '42501', null, 'anon cannot create a profile');
select throws_ok($$ select public.svc_claim_export('00000000-0000-0000-0000-00000000000a') $$, '42501', null,
  'anon cannot call server-only functions');

-- ── As the service role (Edge Functions) ───────────────────────────
reset role;
set local role service_role;
select is(public.svc_export_due('00000000-0000-0000-0000-00000000000a'), true, 'an export is due before the first one');
select is(public.svc_claim_export('00000000-0000-0000-0000-00000000000a'), true, 'the first export in an hour is allowed');
select is(public.svc_export_due('00000000-0000-0000-0000-00000000000a'), false, 'the cheap check sees the hour is used');
select is(public.svc_claim_export('00000000-0000-0000-0000-00000000000a'), false, 'a second export within the hour is refused');
-- The Edge Function sends HMAC-SHA-256(DELETION_PEPPER, id) as hex; the
-- database never sees the id or the pepper. Records older than 3 years go
-- at the next deletion (fixtures written as the owner).
reset role;
insert into private.deletions (deleted_on, uid_hmac) values
  ((now() at time zone 'utc')::date - interval '3 years 1 day', repeat('0', 64)),
  ((now() at time zone 'utc')::date - interval '2 years', repeat('1', 64));
set local role service_role;
select lives_ok($$ select public.svc_record_deletion(repeat('ab', 32), 2, 3) $$,
  'the service role records a deletion with the keyed hash');
select throws_ok($$ select public.svc_record_deletion('00000000-0000-0000-0000-00000000000a', 0, 0) $$,
  '23514', null, 'the audit row refuses anything but 64 lowercase hex characters (never a raw user id)');
select throws_ok($$ select public.svc_record_deletion(upper(repeat('ab', 32)), 0, 0) $$,
  '23514', null, 'the audit hash must be lowercase hex');
reset role;
select results_eq(
  $$ select uid_hmac, deleted_on, board_posts, board_comments from private.deletions where uid_hmac = repeat('ab', 32) $$,
  $$ values (repeat('ab', 32), (now() at time zone 'utc')::date, 2, 3) $$,
  'the audit row keeps only the keyed hash it was given, the day (not the time) and the counts');
select results_eq(
  $$ select uid_hmac from private.deletions where uid_hmac <> repeat('ab', 32) $$,
  $$ values (repeat('1', 64)) $$,
  'a record older than 3 years is purged at the next deletion; a 2-year-old one stays');
select hasnt_column('private', 'deletions', 'at', 'no exact time of deletion is kept');
select hasnt_column('private', 'deletions', 'uid_sha256', 'no plain SHA-256 column (it could be joined with the phone''s hash)');

-- ── Deleting the auth user cascades every account row ───────────────
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*) from public.entitlements where user_id = '00000000-0000-0000-0000-00000000000a')
  + (select count(*) from private.export_log where user_id = '00000000-0000-0000-0000-00000000000a'),
  0::bigint, 'deleting A removes A''s profile, entitlements and export log');
select is(
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-00000000000b')
  + (select count(*) from public.entitlements where user_id = '00000000-0000-0000-0000-00000000000b'),
  2::bigint, 'B''s rows are untouched');

-- ── Content never lives in Postgres ─────────────────────────────────
select hasnt_table('public', 'content_packs', 'no content-pack catalogue in public');
select hasnt_table('private', 'content_pack_stats', 'no bank-size table in private');

select * from finish();
rollback;
