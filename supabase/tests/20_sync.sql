-- Sync snapshot security tests (Uplift Phase 7, spec §3.8 "pgTAP"; review
-- fixes SEC_P7 S1/S2/S6, CR N3/N7).
-- Two learners, A and B, each with a profile; C has a session but never
-- accepted the Terms (no profile). Own rows only (B's row is unchanged after
-- A's attempts, not just still there); anon denied; rev, time and keys are
-- the server's, and a rev is never reused, even after delete + re-insert;
-- 60 writes per store per hour, counted outside the row so delete + insert
-- can't reset it (deletes are counted, never refused); the size caps
-- (progress 2,000,000 bytes, settings 98,304); the support checkpoints
-- (newest 2, cleared on delete); cascade on account delete; nothing in the
-- realtime publication.
--
-- The window is reset as the table owner by moving private.sync_writes'
-- window_start back two hours (the trigger owns the count).
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(45);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.invalid'),
  ('00000000-0000-0000-0000-00000000000d', 'd@test.invalid');
insert into public.profiles (id, terms_version, age_confirmed) values
  ('00000000-0000-0000-0000-00000000000a', '2026-11', true),
  ('00000000-0000-0000-0000-00000000000b', '2026-11', true),
  ('00000000-0000-0000-0000-00000000000d', '2026-11', true);
-- B's progress, written as the owner (as another device would have).
insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state) values
  ('00000000-0000-0000-0000-00000000000b', 'progress', 1, '1.18.0', '11111111-1111-4111-8111-111111111111', '{"byCert":{}}');

-- ── As learner A ───────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                   values ('progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '{"byCert":{}}') $$,
  'A writes their own progress snapshot (user_id defaults to auth.uid())');
select ok((select rev from public.sync_snapshots where store = 'progress') > 1700000000000,
  'a new snapshot gets a server rev (the write time in ms, so a re-made row never repeats one)');
select is((select count(*) from public.sync_snapshots)::int, 1, 'A sees exactly one snapshot: their own');

-- B's row: invisible and untouchable.
select is((select count(*) from public.sync_snapshots where device_id = '11111111-1111-4111-8111-111111111111')::int, 0,
  'A cannot read B''s snapshot');
select throws_ok($$ select user_id from public.sync_snapshots $$, '42501', null, 'A cannot even read the user_id column');
with u as (update public.sync_snapshots set state = '{"hacked":true}'
           where device_id = '11111111-1111-4111-8111-111111111111' returning 1)
select is((select count(*) from u)::int, 0, 'A''s update of B''s row affects 0 rows');
with d as (delete from public.sync_snapshots
           where device_id = '11111111-1111-4111-8111-111111111111' returning 1)
select is((select count(*) from d)::int, 0, 'A''s delete of B''s row affects 0 rows');
select throws_ok($$ insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state)
                    values ('00000000-0000-0000-0000-00000000000b', 'settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '{}') $$,
  '42501', null, 'A cannot insert with user_id = B (no insert grant on user_id)');

-- The server owns rev, updated_at and the keys.
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state, rev)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '{}', 99) $$,
  '42501', null, 'A cannot choose rev on insert');
select throws_ok($$ update public.sync_snapshots set rev = 99 $$, '42501', null, 'A cannot set rev');
select throws_ok($$ update public.sync_snapshots set updated_at = now() - interval '1 year' $$, '42501', null, 'A cannot set updated_at');
select throws_ok($$ update public.sync_snapshots set store = 'settings' $$, '42501', null, 'A cannot change the store');
select throws_ok($$ update public.sync_snapshots set user_id = '00000000-0000-0000-0000-00000000000b' $$, '42501', null, 'A cannot change the owner');
select throws_ok($$ select * from private.sync_writes $$, '42501', null, 'A cannot read the server''s write counter');
select throws_ok($$ select private.sync_next_rev('00000000-0000-0000-0000-00000000000a', 'progress', 0, false) $$,
  '42501', null, 'A cannot call the counter function');

-- Optimistic concurrency: an update at the right rev raises it; a stale rev updates nothing.
with b as (select rev from public.sync_snapshots where store = 'progress'),
     u as (update public.sync_snapshots set state = '{"byCert":{"cisa":{}}}'
           where store = 'progress' and rev = (select rev from b) returning rev)
select ok((select rev from u) > (select rev from b), 'a write at the expected rev raises rev');
update public.sync_snapshots set state = '{"stale":true}' where store = 'progress' and rev = 1;
select is((select state from public.sync_snapshots where store = 'progress'), '{"byCert":{"cisa":{}}}'::jsonb,
  'a write at a stale rev changes nothing (the app reads 0 rows as a conflict)');

-- Shape and size.
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '[1,2]') $$,
  '23514', null, 'a state must be a JSON object');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                    values ('notes', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '{}') $$,
  '23514', null, 'only the progress and settings stores exist');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                    values ('settings', 1, 'v1.18', '22222222-2222-4222-8222-222222222222', '{}') $$,
  '23514', null, 'app_version must look like 1.18.0');
-- The progress cap, on learner D's own progress row (A's is in use above).
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                    values ('progress', 1, '1.18.0', '44444444-4444-4444-8444-444444444444',
                            jsonb_build_object('x', repeat('a', 1999992))) $$,
  '23514', null, 'a 2,000,001-byte state fails the size check');
select lives_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                   values ('progress', 1, '1.18.0', '44444444-4444-4444-8444-444444444444',
                           jsonb_build_object('x', repeat('a', 1999991))) $$,
  'a 2,000,000-byte progress state is accepted');
delete from public.sync_snapshots where store = 'progress';
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
-- Settings are tiny: 98,304 bytes of jsonb text at most (the app: 64 KB).
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222',
                            jsonb_build_object('x', repeat('a', 98296))) $$,
  '23514', null, 'a 98,305-byte settings state fails the settings cap');
select lives_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                   values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222',
                           jsonb_build_object('x', repeat('a', 98295))) $$,
  'a 98,304-byte settings state is accepted');
delete from public.sync_snapshots where store = 'settings';

-- ── C: a session without a profile (Terms never accepted) ───────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                    values ('progress', 1, '1.18.0', '33333333-3333-4333-8333-333333333333', '{}') $$,
  '42501', null, 'no profile (Terms not accepted): no inserts');
reset role;
insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state) values
  ('00000000-0000-0000-0000-00000000000c', 'progress', 1, '1.18.0', '33333333-3333-4333-8333-333333333333', '{"c":1}');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$ update public.sync_snapshots set state = '{"c":2}' $$,
  '42501', null, 'no profile (Terms not accepted): no updates either');

-- ── The rate limit: the 61st update in an hour ──────────────────────
reset role;
-- A's window started over an hour ago: the next write opens a new one.
update private.sync_writes set window_start = now() - interval '2 hours'
  where user_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$ do $b$ begin
  for i in 1..60 loop
    update public.sync_snapshots set state = jsonb_build_object('n', i) where store = 'progress';
  end loop;
end $b$ $$, '60 updates in an hour go through');
select throws_ok($$ update public.sync_snapshots set state = '{"n":61}' where store = 'progress' $$,
  'P0001', 'rate_limited', 'the 61st update in an hour raises rate_limited');

-- ── Delete + insert can't reset the count, and never reuses a rev ───
reset role;
update private.sync_writes set window_start = now() - interval '2 hours'
  where user_id = '00000000-0000-0000-0000-00000000000a';
create temporary table rev_before as
  select rev from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000a' and store = 'progress';
grant select on rev_before to authenticated;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
delete from public.sync_snapshots where store = 'progress';
insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
  values ('progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '{"again":1}');
select ok((select rev from public.sync_snapshots where store = 'progress') > (select rev from rev_before),
  'after delete + re-insert the rev is higher than before the delete (never reused)');
select lives_ok($$ do $b$ begin
  for i in 1..29 loop
    delete from public.sync_snapshots where store = 'progress';
    insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
      values ('progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', jsonb_build_object('n', i));
  end loop;
end $b$ $$, '30 delete + insert pairs (60 writes) go through');
select lives_ok($$ delete from public.sync_snapshots where store = 'progress' $$,
  'a delete over the limit still goes through (Delete synced progress always works)');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                    values ('progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '{"n":99}') $$,
  'P0001', 'rate_limited', 'the insert after 60 counted writes raises rate_limited: delete + insert can''t reset the window');

-- ── The owner's view: keys reverted, checkpoints kept ───────────────
reset role;
update private.sync_writes set window_start = now() - interval '2 hours'
  where user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state) values
  ('00000000-0000-0000-0000-00000000000a', 'progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '{"back":1}');
with b as (select rev from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000a'),
     u as (update public.sync_snapshots set store = 'settings', user_id = '00000000-0000-0000-0000-00000000000b', rev = 5
           where user_id = '00000000-0000-0000-0000-00000000000a' returning user_id, store, rev)
select ok((select store from u) = 'progress'
          and (select user_id from u) = '00000000-0000-0000-0000-00000000000a'
          and (select rev from u) > (select rev from b),
  'changing user_id or store on update is reverted, and rev is the server''s');
-- Two older checkpoints from earlier days, then a write: still at most 2.
insert into private.sync_history (user_id, rev, app_version, state, taken_at) values
  ('00000000-0000-0000-0000-00000000000a', 1, '1.17.0', '{}', now() - interval '3 days'),
  ('00000000-0000-0000-0000-00000000000a', 2, '1.17.0', '{}', now() - interval '2 days');
delete from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a' and taken_at > now() - interval '1 day';
update public.sync_snapshots set state = '{"later":true}' where user_id = '00000000-0000-0000-0000-00000000000a';
select is((select count(*) from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a')::int, 2,
  'private.sync_history keeps at most 2 checkpoints per learner');
select is((select max(taken_at) from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a'), now(),
  'the newest checkpoint is today''s');
update public.sync_snapshots set state = '{"again":true}' where user_id = '00000000-0000-0000-0000-00000000000a';
select is((select count(*) from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a' and taken_at = now())::int, 1,
  'at most one checkpoint a day');

-- ── anon reads and writes nothing ───────────────────────────────────
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select throws_ok($$ select * from public.sync_snapshots $$, '42501', null, 'anon cannot read snapshots');
select throws_ok($$ select * from private.sync_history $$, '42501', null, 'anon cannot reach the checkpoints');

-- ── A deletes their synced progress ("Delete synced progress") ──────
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select throws_ok($$ select * from private.sync_history $$, '42501', null, 'learners cannot reach the checkpoints');
delete from public.sync_snapshots;
reset role;
select is((select count(*) from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000a')::int
          + (select count(*) from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a')::int, 0,
  'deleting their own snapshots clears the checkpoints too');
select is((select count(*) from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000b')::int, 1,
  'B''s snapshot survived A''s update and delete attempts');
select is((select state from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000b'), '{"byCert":{}}'::jsonb,
  'B''s state is unchanged by A''s attempts');
select ok((select count(*) from private.sync_writes where user_id = '00000000-0000-0000-0000-00000000000a') > 0,
  'A''s write counter outlives the delete of A''s rows');

-- ── Account deletion (auth.admin.deleteUser) cascades ───────────────
update public.sync_snapshots set state = '{"b":2}' where user_id = '00000000-0000-0000-0000-00000000000b';
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
select is((select count(*) from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000b')::int
          + (select count(*) from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000b')::int
          + (select count(*) from private.sync_writes where user_id = '00000000-0000-0000-0000-00000000000b')::int, 0,
  'deleting B''s account removes B''s snapshots, checkpoints and write counter');

-- ── Realtime never carries snapshots or checkpoints ─────────────────
select is((select count(*)::int from pg_publication_tables
           where (schemaname, tablename) in (('public', 'sync_snapshots'), ('private', 'sync_writes'), ('private', 'sync_history'))), 0,
  'no sync table is in any publication (supabase_realtime included)');

select * from finish();
rollback;
