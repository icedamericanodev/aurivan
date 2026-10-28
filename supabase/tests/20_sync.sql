-- Sync snapshot security tests (Uplift Phase 7, spec §3.8 "pgTAP"; review
-- fixes SEC_P7 S1/S2/S6, CR N3/N7; accounts beta: gzip snapshots, one
-- checkpoint).
-- Two learners, A and B, each with a profile; C has a session but never
-- accepted the Terms (no profile). Own rows only (B's row is unchanged after
-- A's attempts, not just still there); anon denied; rev, time and keys are
-- the server's, and a rev is never reused, even after delete + re-insert;
-- 20 writes per store per hour, counted outside the row so delete + insert
-- can't reset it (deletes are counted, never refused); the snapshot format
-- (base64 gzip only: the "H4sI" prefix, the alphabet, whole groups; the
-- encoding is the server's) and the size caps (progress 200,000 characters
-- zipped and 2,000,000 bytes unzipped; settings 32,768 and 98,304); state_gz
-- stored uncompressed; the support checkpoint (the newest one only, cleared
-- on delete); cascade on account delete; nothing in the realtime publication.
--
-- The fixtures are real base64 gzip (mtime 0) of small JSON objects; the
-- database only checks their shape, never their content:
--   {"byCert":{}}           13 bytes  H4sIAAAAAAACA6tWSqp0Ti0qUbKqrq0FAIu34fgNAAAA
--   {"byCert":{"cisa":{}}}  22 bytes  H4sIAAAAAAACA6tWSqp0Ti0qUbKqVkrOLE4E0rW1tQCPzxRaFgAAAA==
--   {}                       2 bytes  H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==
--
-- The window is reset as the table owner by moving private.sync_writes'
-- window_start back two hours (the trigger owns the count).
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(61);

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
insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state_gz, raw_bytes) values
  ('00000000-0000-0000-0000-00000000000b', 'progress', 1, '1.18.0', '11111111-1111-4111-8111-111111111111',
   'H4sIAAAAAAACA6tWSqp0Ti0qUbKqrq0FAIu34fgNAAAA', 13);

-- ── As learner A ───────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                   values ('progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6tWSqp0Ti0qUbKqrq0FAIu34fgNAAAA', 13) $$,
  'A writes their own progress snapshot (user_id defaults to auth.uid())');
select is((select encoding from public.sync_snapshots where store = 'progress'), 'gzip+base64',
  'the encoding is the server''s default');
select ok((select rev from public.sync_snapshots where store = 'progress') > 1700000000000,
  'a new snapshot gets a server rev (the write time in ms, so a re-made row never repeats one)');
select is((select count(*) from public.sync_snapshots)::int, 1, 'A sees exactly one snapshot: their own');

-- B's row: invisible and untouchable.
select is((select count(*) from public.sync_snapshots where device_id = '11111111-1111-4111-8111-111111111111')::int, 0,
  'A cannot read B''s snapshot');
select throws_ok($$ select user_id from public.sync_snapshots $$, '42501', null, 'A cannot even read the user_id column');
with u as (update public.sync_snapshots set state_gz = 'H4sIAAAAAAACA6tWykhMzk5NUbIqKSpNrQUAPpWxMg8AAAA=', raw_bytes = 15
           where device_id = '11111111-1111-4111-8111-111111111111' returning 1)
select is((select count(*) from u)::int, 0, 'A''s update of B''s row affects 0 rows');
with d as (delete from public.sync_snapshots
           where device_id = '11111111-1111-4111-8111-111111111111' returning 1)
select is((select count(*) from d)::int, 0, 'A''s delete of B''s row affects 0 rows');
select throws_ok($$ insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('00000000-0000-0000-0000-00000000000b', 'settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2) $$,
  '42501', null, 'A cannot insert with user_id = B (no insert grant on user_id)');

-- The server owns rev, updated_at and the keys.
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes, rev)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2, 99) $$,
  '42501', null, 'A cannot choose rev on insert');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes, encoding)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2, 'gzip+base64') $$,
  '42501', null, 'A cannot choose the encoding (the server''s default)');
select throws_ok($$ update public.sync_snapshots set encoding = 'gzip+base64' $$, '42501', null, 'A cannot change the encoding');
select throws_ok($$ update public.sync_snapshots set rev = 99 $$, '42501', null, 'A cannot set rev');
select throws_ok($$ update public.sync_snapshots set updated_at = now() - interval '1 year' $$, '42501', null, 'A cannot set updated_at');
select throws_ok($$ update public.sync_snapshots set store = 'settings' $$, '42501', null, 'A cannot change the store');
select throws_ok($$ update public.sync_snapshots set user_id = '00000000-0000-0000-0000-00000000000b' $$, '42501', null, 'A cannot change the owner');
select throws_ok($$ select * from private.sync_writes $$, '42501', null, 'A cannot read the server''s write counter');
select throws_ok($$ select private.sync_next_rev('00000000-0000-0000-0000-00000000000a', 'progress', 0, false) $$,
  '42501', null, 'A cannot call the counter function');
select throws_ok($$ select * from public.svc_sync_checkpoint('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'A cannot call the checkpoint reader (service role only)');

-- Optimistic concurrency: an update at the right rev raises it; a stale rev updates nothing.
with b as (select rev from public.sync_snapshots where store = 'progress'),
     u as (update public.sync_snapshots set state_gz = 'H4sIAAAAAAACA6tWSqp0Ti0qUbKqVkrOLE4E0rW1tQCPzxRaFgAAAA==', raw_bytes = 22
           where store = 'progress' and rev = (select rev from b) returning rev)
select ok((select rev from u) > (select rev from b), 'a write at the expected rev raises rev');
update public.sync_snapshots set state_gz = 'H4sIAAAAAAACA6tWKi5JzElVsiopKk2tBQA71DvyDgAAAA==', raw_bytes = 14 where store = 'progress' and rev = 1;
select is((select state_gz from public.sync_snapshots where store = 'progress'), 'H4sIAAAAAAACA6tWSqp0Ti0qUbKqVkrOLE4E0rW1tQCPzxRaFgAAAA==',
  'a write at a stale rev changes nothing (the app reads 0 rows as a conflict)');

-- Shape: base64 gzip only.
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'eyJ4IjoxfQ==', 7) $$,
  '23514', null, 'plain base64 JSON (no gzip header) is refused');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', '{"x":1}', 7) $$,
  '23514', null, 'raw JSON text is refused');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sI!AAA', 2) $$,
  '23514', null, 'characters outside the base64 alphabet are refused');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAA', 2) $$,
  '23514', null, 'base64 must come in whole 4-character groups');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 1) $$,
  '23514', null, 'raw_bytes is at least 2 (the smallest object)');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('notes', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2) $$,
  '23514', null, 'only the progress and settings stores exist');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('settings', 1, 'v1.18', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2) $$,
  '23514', null, 'app_version must look like 1.18.0');
reset role;
select throws_ok($$ insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state_gz, raw_bytes, encoding)
                    values ('00000000-0000-0000-0000-00000000000d', 'settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2, 'zstd') $$,
  '23514', null, 'no encoding but gzip+base64, even for the table owner');
select is((select attstorage::text from pg_attribute
           where attrelid = 'public.sync_snapshots'::regclass and attname = 'state_gz'), 'e',
  'state_gz is stored uncompressed (storage external: gzip doesn''t shrink further)');
select is((select attstorage::text from pg_attribute
           where attrelid = 'private.sync_history'::regclass and attname = 'state_gz'), 'e',
  'the checkpoint''s state_gz is stored uncompressed too');
set local role authenticated;
-- The progress caps, on learner D's own progress row (A's is in use above).
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('progress', 1, '1.18.0', '44444444-4444-4444-8444-444444444444',
                            'H4sI' || repeat('A', 200000), 2000000) $$,
  '23514', null, 'a 200,004-character state_gz fails the progress cap');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('progress', 1, '1.18.0', '44444444-4444-4444-8444-444444444444', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2000001) $$,
  '23514', null, 'raw_bytes over 2,000,000 fails the progress cap');
select lives_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                   values ('progress', 1, '1.18.0', '44444444-4444-4444-8444-444444444444',
                           'H4sI' || repeat('A', 199996), 2000000) $$,
  'a 200,000-character progress state_gz of 2,000,000 bytes unzipped is accepted');
delete from public.sync_snapshots where store = 'progress';
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
-- Settings are tiny: 32,768 characters zipped, 98,304 bytes unzipped (the app: 64 KB).
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sI' || repeat('A', 32768), 98304) $$,
  '23514', null, 'a 32,772-character settings state_gz fails the settings cap');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 98305) $$,
  '23514', null, 'settings over 98,304 bytes unzipped fail the settings cap');
select lives_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                   values ('settings', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sI' || repeat('A', 32764), 98304) $$,
  'a 32,768-character settings state_gz of 98,304 bytes is accepted');
delete from public.sync_snapshots where store = 'settings';

-- ── C: a session without a profile (Terms never accepted) ───────────
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('progress', 1, '1.18.0', '33333333-3333-4333-8333-333333333333', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2) $$,
  '42501', null, 'no profile (Terms not accepted): no inserts');
reset role;
insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state_gz, raw_bytes) values
  ('00000000-0000-0000-0000-00000000000c', 'progress', 1, '1.18.0', '33333333-3333-4333-8333-333333333333', 'H4sIAAAAAAACA6tWSlayMqwFAM//2ywHAAAA', 7);
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$ update public.sync_snapshots set raw_bytes = 8 $$,
  '42501', null, 'no profile (Terms not accepted): no updates either');

-- ── The rate limit: the 21st update in an hour ──────────────────────
reset role;
-- A's window started over an hour ago: the next write opens a new one.
update private.sync_writes set window_start = now() - interval '2 hours'
  where user_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$ do $b$ begin
  for i in 1..20 loop
    update public.sync_snapshots set raw_bytes = 100 + i where store = 'progress';
  end loop;
end $b$ $$, '20 updates in an hour go through');
select throws_ok($$ update public.sync_snapshots set raw_bytes = 161 where store = 'progress' $$,
  'P0001', 'rate_limited', 'the 21st update in an hour raises rate_limited');

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
insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
  values ('progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2);
select ok((select rev from public.sync_snapshots where store = 'progress') > (select rev from rev_before),
  'after delete + re-insert the rev is higher than before the delete (never reused)');
select lives_ok($$ do $b$ begin
  for i in 1..9 loop
    delete from public.sync_snapshots where store = 'progress';
    insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
      values ('progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2 + i);
  end loop;
end $b$ $$, '10 delete + insert pairs (20 writes) go through');
select lives_ok($$ delete from public.sync_snapshots where store = 'progress' $$,
  'a delete over the limit still goes through (Delete synced progress always works)');
select throws_ok($$ insert into public.sync_snapshots (store, store_version, app_version, device_id, state_gz, raw_bytes)
                    values ('progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 99) $$,
  'P0001', 'rate_limited', 'the insert after 20 counted writes raises rate_limited: delete + insert can''t reset the window');

-- ── The owner's view: keys reverted, checkpoints kept ───────────────
reset role;
update private.sync_writes set window_start = now() - interval '2 hours'
  where user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.sync_snapshots (user_id, store, store_version, app_version, device_id, state_gz, raw_bytes) values
  ('00000000-0000-0000-0000-00000000000a', 'progress', 1, '1.18.0', '22222222-2222-4222-8222-222222222222', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 3);
with b as (select rev from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000a'),
     u as (update public.sync_snapshots set store = 'settings', user_id = '00000000-0000-0000-0000-00000000000b', rev = 5
           where user_id = '00000000-0000-0000-0000-00000000000a' returning user_id, store, rev)
select ok((select store from u) = 'progress'
          and (select user_id from u) = '00000000-0000-0000-0000-00000000000a'
          and (select rev from u) > (select rev from b),
  'changing user_id or store on update is reverted, and rev is the server''s');
-- Two older checkpoints from earlier days, then a write: only the newest is kept.
insert into private.sync_history (user_id, rev, app_version, encoding, state_gz, raw_bytes, taken_at) values
  ('00000000-0000-0000-0000-00000000000a', 1, '1.17.0', 'gzip+base64', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2, now() - interval '3 days'),
  ('00000000-0000-0000-0000-00000000000a', 2, '1.17.0', 'gzip+base64', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2, now() - interval '2 days');
delete from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a' and taken_at > now() - interval '1 day';
update public.sync_snapshots set state_gz = 'H4sIAAAAAAACA6tWSqp0Ti0qUbKqVkrOLE4E0rW1tQCPzxRaFgAAAA==', raw_bytes = 22 where user_id = '00000000-0000-0000-0000-00000000000a';
select is((select count(*) from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a')::int, 1,
  'private.sync_history keeps at most 1 checkpoint per learner');
select is((select max(taken_at) from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a'), now(),
  'the kept checkpoint is today''s');
select results_eq(
  $$ select encoding, state_gz, raw_bytes from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('gzip+base64'::text, 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA=='::text, 3) $$,
  'the checkpoint is the row as it was before the write, still gzipped');
set local role service_role;
select results_eq(
  $$ select encoding, state_gz, raw_bytes from public.svc_sync_checkpoint('00000000-0000-0000-0000-00000000000a') $$,
  $$ values ('gzip+base64'::text, 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA=='::text, 3) $$,
  'the service role reads the learner''s checkpoint for Download my data');
select is((select count(*)::int from public.svc_sync_checkpoint('00000000-0000-0000-0000-00000000000b')), 0,
  'and only the learner it names (B has none)');
reset role;
update public.sync_snapshots set state_gz = 'H4sIAAAAAAACA6tWKi5JzElVsiopKk2tBQA71DvyDgAAAA==', raw_bytes = 14 where user_id = '00000000-0000-0000-0000-00000000000a';
select is((select count(*) from private.sync_history where user_id = '00000000-0000-0000-0000-00000000000a')::int, 1,
  'at most one checkpoint a day, and still only one');

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
select results_eq(
  $$ select state_gz, raw_bytes from public.sync_snapshots where user_id = '00000000-0000-0000-0000-00000000000b' $$,
  $$ values ('H4sIAAAAAAACA6tWSqp0Ti0qUbKqrq0FAIu34fgNAAAA'::text, 13) $$,
  'B''s state is unchanged by A''s attempts');
select ok((select count(*) from private.sync_writes where user_id = '00000000-0000-0000-0000-00000000000a') > 0,
  'A''s write counter outlives the delete of A''s rows');

-- ── Account deletion (auth.admin.deleteUser) cascades ───────────────
update public.sync_snapshots set raw_bytes = 14 where user_id = '00000000-0000-0000-0000-00000000000b';
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
