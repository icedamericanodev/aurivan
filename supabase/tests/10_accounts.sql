-- Accounts core security tests (Uplift Phase 6, spec §2.7).
-- Two learners, A and B. Own rows only; anon denied; no client writes to
-- entitlements or private tables; server-only functions are server-only;
-- deleting the auth user cascades every account row.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(34);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid');

-- Fixtures written as the owner (postgres), as the service role would.
insert into public.profiles (id, terms_version, age_confirmed)
  values ('00000000-0000-0000-0000-00000000000b', '2026-11', true);
insert into public.entitlements (user_id, entitlement, active, source) values
  ('00000000-0000-0000-0000-00000000000a', 'premium_cisa', true, 'manual'),
  ('00000000-0000-0000-0000-00000000000b', 'premium_cisa', true, 'manual');
insert into public.content_packs (cert_id, version, storage_path, sha256)
  values ('cisa', 1, 'packs/cisa/1.json', repeat('a', 64));
insert into private.content_pack_stats (cert_id, version, question_count) values ('cisa', 1, 42);

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

-- content catalogue and the private bank size
select is((select count(*) from public.content_packs)::int, 1, 'signed-in learners can read the catalogue');
select throws_ok($$ insert into public.content_packs (cert_id, version, storage_path, sha256)
                    values ('cism', 1, 'x', repeat('b', 64)) $$,
  '42501', null, 'learners cannot publish content packs');
select throws_ok($$ select question_count from private.content_pack_stats $$,
  '42501', null, 'question_count is not reachable by learners');
select throws_ok($$ select * from private.export_log $$, '42501', null, 'private.export_log is not reachable');
select throws_ok($$ select * from private.deletions $$, '42501', null, 'private.deletions is not reachable');

-- server-only functions
select throws_ok($$ select public.svc_claim_export(auth.uid()) $$, '42501', null,
  'learners cannot call svc_claim_export');
select throws_ok($$ select public.svc_record_deletion('00000000-0000-0000-0000-00000000000b') $$, '42501', null,
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
select throws_ok($$ select * from public.content_packs $$, '42501', null, 'anon cannot read the catalogue');
select throws_ok($$ insert into public.profiles (terms_version, age_confirmed) values ('2026-11', true) $$,
  '42501', null, 'anon cannot create a profile');
select throws_ok($$ select public.svc_claim_export('00000000-0000-0000-0000-00000000000a') $$, '42501', null,
  'anon cannot call server-only functions');

-- ── As the service role (Edge Functions) ───────────────────────────
reset role;
set local role service_role;
select is(public.svc_claim_export('00000000-0000-0000-0000-00000000000a'), true, 'the first export in an hour is allowed');
select is(public.svc_claim_export('00000000-0000-0000-0000-00000000000a'), false, 'a second export within the hour is refused');
select lives_ok($$ select public.svc_record_deletion('00000000-0000-0000-0000-00000000000a', 2, 3) $$,
  'the service role records a deletion');
reset role;
select results_eq(
  $$ select uid_sha256, board_posts, board_comments from private.deletions $$,
  $$ values (encode(sha256(convert_to('00000000-0000-0000-0000-00000000000a', 'UTF8')), 'hex'), 2, 3) $$,
  'the audit row keeps only a SHA-256 of the user id and the counts');

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

select * from finish();
rollback;
