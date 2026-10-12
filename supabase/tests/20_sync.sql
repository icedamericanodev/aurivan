-- Sync snapshot security tests (Uplift Phase 7, spec §3.8 "pgTAP").
-- Two learners, A and B, each with a profile; C has a session but never
-- accepted the Terms (no profile). Own rows only; anon denied; rev, time and
-- keys are the server's; 60 writes per store per hour; the size cap; the
-- support checkpoints (newest 2, cleared on delete); cascade on account delete.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(32);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.invalid'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.invalid'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.invalid');
insert into public.profiles (id, terms_version, age_confirmed) values
  ('00000000-0000-0000-0000-00000000000a', '2026-11', true),
  ('00000000-0000-0000-0000-00000000000b', '2026-11', true);
-- B's progress, written as the owner (as another device would have).
insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state) values
  ('00000000-0000-0000-0000-00000000000b', 'progress', 1, '1.18.0', '11111111-1111-4111-8111-111111111111', '{"byCert":{}}');

-- ── As learner A ───────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                   values ('progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '{"byCert":{}}') $$,
  'A writes their own progress snapshot (user_id defaults to auth.uid())');
select is((select rev from public.sync_snapshots where store = 'progress'), 1::bigint, 'a new snapshot starts at rev 1');
select is((select count(*) from public.sync_snapshots)::int, 1, 'A sees exactly one snapshot: their own');

-- B's row: invisible and untouchable.
select is((select count(*) from public.sync_snapshots where device_id = '11111111-1111-4111-8111-111111111111')::int, 0,
  'A cannot read B''s snapshot');
select throws_ok($$ select user_id from public.sync_snapshots $$, '42501', null, 'A cannot even read the user_id column');
update public.sync_snapshots set state = '{"hacked":true}' where store = 'progress' and rev = 1 and device_id = '11111111-1111-4111-8111-111111111111';
delete from public.sync_snapshots where device_id = '11111111-1111-4111-8111-111111111111';
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
select throws_ok($$ select writes_in_window from public.sync_snapshots $$, '42501', null, 'A cannot read the server''s rate window');

-- Optimistic concurrency: an update at the right rev bumps it; a stale rev updates nothing.
update public.sync_snapshots set state = '{"byCert":{"cisa":{}}}' where store = 'progress' and rev = 1;
select is((select rev from public.sync_snapshots where store = 'progress'), 2::bigint, 'a write at the expected rev bumps rev to 2');
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
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222',
                            jsonb_build_object('x', repeat('a', 1999992))) $$,
  '23514', null, 'a 2,000,001-byte state fails the size check');
select lives_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                   values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222',
                           jsonb_build_object('x', repeat('a', 1999991))) $$,
  'a 2,000,000-byte state is accepted');
delete from public.sync_snapshots where store = 'settings';

-- ── C: a session without a profile (Terms never accepted) ───────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state)
                    values ('progress', 1, '1.18.0', '33333333-3333-4333-8333-333333333333', '{}') $$,
  '42501', null, 'no profile (Terms not accepted): no writes');

-- ── The rate limit: the 61st update in an hour ──────────────────────
reset role;
-- A's window started over an hour ago: the next update opens a new one. (The
-- trigger owns the window, so the owner sets it with the trigger off.)
alter table public.sync_snapshots disable trigger sync_snapshots_touch;
update public.sync_snapshots set writes_window_start = now() - interval '2 hours'
  where user_id = '00000000-0000-0000-0000-00000000000a' and store = 'progress';
alter table public.sync_snapshots enable trigger sync_snapshots_touch;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
do $$ begin
  for i in 1..60 loop
    update public.sync_snapshots set state = jsonb_build_object('n', i) where store = 'progress';
  end loop;
end $$;
select is((select rev from public.sync_snapshots where store = 'progress'), 62::bigint, '60 updates in an hour go through');
select throws_ok($$ update public.sync_snapshots set state = '{"n":61}' where store = 'progress' $$,
  'P0001', 'rate_limited', 'the 61st update in an hour raises rate_limited');

-- ── The owner's view: keys reverted, checkpoints kept ───────────────
reset role;
alter table public.sync_snapshots disable trigger sync_snapshots_touch;
update public.sync_snapshots set writes_window_start = now() - interval '2 hours'
  where user_id = '00000000-0000-0000-0000-00000000000a';
alter table public.sync_snapshots enable trigger sync_snapshots_touch;
update public.sync_snapshots set store = 'settings', user_id = '00000000-0000-0000-0000-00000000000b', rev = 999, writes_in_window = 0
  where user_id = '00000000-0000-0000-0000-00000000000a';
select is((select store || ' ' || rev from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000a'),
  'progress 63', 'changing user_id or store on update is reverted, and rev is the server''s');
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

-- ── Account deletion (auth.admin.deleteUser) cascades ───────────────
update public.sync_snapshots set state = '{"b":2}' where user_id = '00000000-0000-0000-0000-00000000000b';
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
select is((select count(*) from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000b')::int
          + (select count(*) from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000b')::int, 0,
  'deleting B''s account removes B''s snapshots and checkpoints');

select * from finish();
rollback;
