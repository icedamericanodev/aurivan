-- Feedback board: the re-review's findings (RR_P8, 12 Oct) as tests. Each
-- block is the reviewer's repro (rr8/pg/probes.sql P3 and P7) turned into a
-- test that fails on the code before the fix (8e1f488) and passes after it.
--
-- R1 report, then edit: a harmless first report must not hide what a post
--    says NOW. The staff queue's row has the live words, the first and the
--    latest reported words, the edit time and "edited since the report".
--    Dismiss carries the edit time the moderator saw: words edited since
--    are refused ('changed') and every report stays open.
-- R2 names: "admin" and "staff" inside a name are refused again, after the
--    everyday words that contain them are taken out ("Badminton", "Distaff").
-- (R3 is board-submit's Deno test; R4 is the app engine's, in Jest and Deno.)
--
-- One transaction: now() never moves, so report times are set back by hand.
-- People: A (author), B (the victim), Y (an hour-old account), staff S, and
-- N1–N7 (30 days old, never joined: for names).
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(39);
-- 20261027000000_beta_hardening.sql pauses posting for the accounts beta;
-- these tests exercise the open board (rolled back at the end).
update public.board_settings set posting_open = true;

-- ── Fixtures (as the owner) ─────────────────────────────────────────
insert into auth.users (id, email, created_at) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000f1', 'y@test.invalid', now() - interval '1 hour'),
  ('00000000-0000-4000-8000-000000000005', 's@test.invalid', now() - interval '90 days');
insert into auth.users (id, email, created_at)
  select ('00000000-0000-4000-8000-0000000001' || lpad(g::text, 2, '0'))::uuid, 'n' || g || '@test.invalid', now() - interval '30 days'
    from generate_series(1, 7) g;
insert into public.profiles (id, terms_version, age_confirmed) select id, '2026-11', true from auth.users;
insert into private.staff (user_id, role) values ('00000000-0000-4000-8000-000000000005', 'admin');
insert into public.board_members (user_id, public_id, handle, guidelines_version, approved_posts, standing) values
  ('00000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'Quiet Cedar 214', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'Steady Oak 9', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-0000000000f1', '30000000-0000-4000-8000-0000000000f1', 'Young Fir 1', '2026-11', 0, 'active'),
  ('00000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Calm Birch 1', '2026-11', 1, 'active');
insert into public.board_posts (id, author_id, kind, title, body, visibility) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'idea', 'A modest idea for timers', 'Could the timer pause?', 'visible'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'idea', 'Steady Oak 9 is a liar', 'He lives at 12 Elm St', 'visible'),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000a', 'idea', 'An untouched idea here', 'Nothing changes', 'visible');
insert into public.board_comments (id, post_id, author_id, body) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000a', 'Nice idea, thanks');

-- The staff queue's Reported row for one target (as the service role, like staff-action).
create function pg_temp.reported(p_id text) returns jsonb language sql as $$
  select i from jsonb_array_elements(public.svc_staff_queue('00000000-0000-4000-8000-000000000005', 'reported') -> 'items') i
   where i ->> 'id' = p_id
$$;
-- A Dismiss of every report on one target, with the edit time the moderator saw.
create function pg_temp.dismiss(p_id uuid, p_kind text, p_seen jsonb) returns jsonb language sql as $$
  select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'dismiss', 'report', p_id, null,
    jsonb_build_object('kind', p_kind, 'editedAt', p_seen))
$$;
-- The edit time on a queue row, as the app sends it back: whole milliseconds (null: never edited).
create function pg_temp.seen_ms(p_row jsonb) returns jsonb language sql as $$
  select to_jsonb(floor(extract(epoch from (p_row ->> 'editedAt')::timestamptz) * 1000)::bigint)
$$;

-- ── R1: benign report → abusive edit → the victim's report → edited back ─
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000001', 'spam') $$,
  'Y, an hour-old account, files a harmless report first');
reset role;
update public.ugc_reports set created_at = now() - interval '2 hours' where target_id = '10000000-0000-4000-8000-000000000001';
set local role service_role;
select is(public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'edit_post', '10000000-0000-4000-8000-000000000001', 'idea',
           'Steady Oak 9 is a liar', 'Steady Oak 9 is a fraud, everyone ignore him', null, null, null) ->> 'visibility', 'visible',
  'A edits it into an insult no word list catches, and it stays up');
select is(pg_temp.reported('10000000-0000-4000-8000-000000000001') ->> 'title', 'Steady Oak 9 is a liar',
  'the queue shows the title live NOW, not the first report''s');
select ok(pg_temp.reported('10000000-0000-4000-8000-000000000001') ->> 'body' like '%a fraud, everyone ignore him%',
  'and the body live now');
select is((pg_temp.reported('10000000-0000-4000-8000-000000000001') ->> 'editedSinceReport')::boolean, true,
  'it says the words were edited after the report');
select is(pg_temp.reported('10000000-0000-4000-8000-000000000001') ->> 'firstSnapshot', E'A modest idea for timers\nCould the timer pause?',
  'and keeps the words as first reported');
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000001', 'abuse') $$,
  'B, the victim, reports the abusive version');
reset role;
update public.ugc_reports set created_at = now() - interval '1 hour' where target_id = '10000000-0000-4000-8000-000000000001' and reason = 'abuse';
set local role service_role;
select is(public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'edit_post', '10000000-0000-4000-8000-000000000001', 'idea',
           'A modest idea for timers', 'Could the timer pause? Thanks.', null, null, null) ->> 'visibility', 'visible',
  'A edits it back to something harmless');
select is(pg_temp.reported('10000000-0000-4000-8000-000000000001') ->> 'body', 'Could the timer pause? Thanks.', 'the queue shows the harmless words live now');
select is(pg_temp.reported('10000000-0000-4000-8000-000000000001') ->> 'lastSnapshot', E'Steady Oak 9 is a liar\nSteady Oak 9 is a fraud, everyone ignore him',
  'AND the words the victim reported (the latest report''s copy)');
select is(pg_temp.reported('10000000-0000-4000-8000-000000000001') ->> 'firstSnapshot', E'A modest idea for timers\nCould the timer pause?',
  'the first report''s copy stays the first');
select is((pg_temp.reported('10000000-0000-4000-8000-000000000001') ->> 'count')::int, 2, 'one row for the post, with both reports');
select ok(pg_temp.reported('10000000-0000-4000-8000-000000000001') ->> 'editedAt' is not null, 'the row carries the edit time');

-- Dismiss: refused from an older view of the words, accepted once they were seen.
select throws_ok($$ select pg_temp.dismiss('10000000-0000-4000-8000-000000000001', 'post', null) $$, 'P0001', 'changed',
  'a Dismiss that saw no edit is refused: the words changed since');
select throws_ok($$ select pg_temp.dismiss('10000000-0000-4000-8000-000000000001', 'post',
                    to_jsonb(floor(extract(epoch from now() - interval '1 day') * 1000)::bigint)) $$, 'P0001', 'changed',
  'so is one that saw an older edit');
select is((select count(*)::int from public.ugc_reports where target_id = '10000000-0000-4000-8000-000000000001' and status = 'open'), 2,
  'and neither closed a report: the victim''s stays open');
select lives_ok($$ select pg_temp.dismiss('10000000-0000-4000-8000-000000000001', 'post',
                   pg_temp.seen_ms(pg_temp.reported('10000000-0000-4000-8000-000000000001'))) $$,
  'a Dismiss with the edit time from the queue row goes through');
select is((select count(*)::int from public.ugc_reports where target_id = '10000000-0000-4000-8000-000000000001' and status = 'open'), 0,
  'and closes every report on the post');

-- Abuse reported, then edited to harmless: the reported words are still there.
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';
insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000002', 'personal_info');
reset role;
update public.ugc_reports set created_at = now() - interval '1 hour' where target_id = '10000000-0000-4000-8000-000000000002';
set local role service_role;
select public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'edit_post', '10000000-0000-4000-8000-000000000002', 'idea',
  'A calm note about timers', 'All fine here', null, null, null);
select is(pg_temp.reported('10000000-0000-4000-8000-000000000002') ->> 'title', 'A calm note about timers', 'live: the harmless edit');
select ok(pg_temp.reported('10000000-0000-4000-8000-000000000002') ->> 'firstSnapshot' like '%12 Elm St%', 'reported: the address it held');
select is((pg_temp.reported('10000000-0000-4000-8000-000000000002') ->> 'editedSinceReport')::boolean, true, 'edited since the report');

-- Never edited: nothing about edits, and Dismiss needs no edit time.
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';
insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000003', 'spam');
reset role;
set local role service_role;
select is(pg_temp.reported('10000000-0000-4000-8000-000000000003') ->> 'editedAt', null, 'an unedited post has no edit time');
select is((pg_temp.reported('10000000-0000-4000-8000-000000000003') ->> 'editedSinceReport')::boolean, false, 'and isn''t "edited since"');
select lives_ok($$ select pg_temp.dismiss('10000000-0000-4000-8000-000000000003', 'post', null) $$, 'its Dismiss goes through');

-- A comment: the same live words and the same Dismiss check.
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';
insert into public.ugc_reports (target_kind, target_id, reason) values ('comment', '20000000-0000-4000-8000-000000000001', 'spam');
reset role;
update public.ugc_reports set created_at = now() - interval '1 hour' where target_id = '20000000-0000-4000-8000-000000000001';
set local role service_role;
select public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'edit_comment', '20000000-0000-4000-8000-000000000001', null, null,
  'Steady Oak 9 is a liar', null, null, null);
select is(pg_temp.reported('20000000-0000-4000-8000-000000000001') ->> 'body', 'Steady Oak 9 is a liar', 'a reported comment: its live words');
select is(pg_temp.reported('20000000-0000-4000-8000-000000000001') ->> 'firstSnapshot', 'Nice idea, thanks', 'and its reported words');
select throws_ok($$ select pg_temp.dismiss('20000000-0000-4000-8000-000000000001', 'comment', null) $$, 'P0001', 'changed',
  'its Dismiss from an older view is refused too');

-- ── R2: "admin" and "staff" inside a name (svc_board_join → members_guard) ─
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000101', 'AdminTeam', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', '"AdminTeam" is refused');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000101', 'SiteAdmin', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', '"SiteAdmin" is refused');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000101', 'BoardStaff', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', '"BoardStaff" is refused');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000101', 'StaffPick', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', '"StaffPick" is refused');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000101', 'Ad Min Help', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', '"Ad Min Help" is refused (spaces don''t hide it)');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000101', 'Badminton Admin', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', '"Badminton Admin" is refused (the everyday word is taken out, the rest still counts)');
select lives_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000102', 'Badminton Fan', 'chosen', '2026-11') $$,
  '"Badminton Fan" is fine');
select lives_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000103', 'Distaff Pine', 'chosen', '2026-11') $$,
  '"Distaff Pine" is fine');
select lives_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000104', 'Flagstaff Hiker', 'chosen', '2026-11') $$,
  '"Flagstaff Hiker" is fine (its "l" reads as "i" first)');
select lives_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000105', 'Stafford Reed', 'chosen', '2026-11') $$,
  '"Stafford Reed" is fine');
select lives_ok($$ select public.svc_board_join('00000000-0000-4000-8000-000000000106', 'Quarterstaff Pine', 'chosen', '2026-11') $$,
  '"Quarterstaff Pine" is fine');
select is((select count(*)::int from public.board_members where user_id = '00000000-0000-4000-8000-000000000101'), 0,
  'none of the refused names made a member');

select * from finish();
rollback;
