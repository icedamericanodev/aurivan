-- Feedback board security tests (Uplift Phase 8, spec §4.8 "pgTAP", with the
-- Phase 6–7 review lessons: own rows only, with the OTHER learner's row
-- checked unchanged after each attempt; rate limits that a delete can't
-- reset; nothing in private reachable by an app role).
--
-- People: members A and B; staff S; reporters R1–R3 (accounts 30 days old);
-- Y, an account an hour old (it joins during the test); N, a session that
-- never accepted the Terms (no profile). Each member's PUBLIC id is fixed
-- here (3000…a for A, 3000…b for B, …) so the tests can name it: learners
-- never read account ids (fix round P8, SEC S4).
-- Read scope: the default 'signed_in' first, then 'everyone' (signed-out
-- reading, spec B1) and 'author_staff' (owner decision, Phase 9).
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(166);
-- 20261027000000_beta_hardening.sql pauses posting for the accounts beta;
-- these tests exercise the open board (rolled back at the end).
update public.board_settings set posting_open = true;

-- ── Fixtures (as the owner) ─────────────────────────────────────────
insert into auth.users (id, email, created_at) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-000000000005', 's@test.invalid', now() - interval '90 days'),
  ('00000000-0000-4000-8000-0000000000e1', 'r1@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000e2', 'r2@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000e3', 'r3@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000f1', 'y@test.invalid', now() - interval '1 hour'),
  ('00000000-0000-4000-8000-00000000000e', 'n@test.invalid', now() - interval '30 days');
insert into public.profiles (id, terms_version, age_confirmed)
  select id, '2026-11', true from auth.users where id <> '00000000-0000-4000-8000-00000000000e';
insert into private.staff (user_id, role) values ('00000000-0000-4000-8000-000000000005', 'admin');
insert into public.board_members (user_id, public_id, handle, guidelines_version, approved_posts) values
  ('00000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'Quiet Cedar 214', '2026-11', 1),
  ('00000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'Steady Oak 9', '2026-11', 1),
  ('00000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Calm Birch 1', '2026-11', 1),
  ('00000000-0000-4000-8000-0000000000e1', '30000000-0000-4000-8000-0000000000e1', 'Bright Elm 11', '2026-11', 1),
  ('00000000-0000-4000-8000-0000000000e2', '30000000-0000-4000-8000-0000000000e2', 'Bright Elm 12', '2026-11', 1),
  ('00000000-0000-4000-8000-0000000000e3', '30000000-0000-4000-8000-0000000000e3', 'Bright Elm 13', '2026-11', 1);
insert into public.board_posts (id, author_id, kind, title, body, visibility, hold_reason, locked, moderated_at, severity) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'idea', 'More practice on BCP test types', 'Please.', 'visible', null, false, null, 10),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000b', 'app', 'Timer keeps running when locked', '', 'visible', null, false, null, null),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000b', 'question', 'A post waiting for review', 'held', 'pending', 'recall', false, null, null),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-00000000000b', 'idea', 'A hidden post for testing', '', 'hidden', 'reports', false, null, null),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-00000000000a', 'idea', 'A removed post, yesterday', '', 'removed', null, false, now() - interval '1 day', null),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-00000000000a', 'idea', 'A removed post, long ago', '', 'removed', null, false, now() - interval '20 days', null),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-00000000000b', 'idea', 'A locked post for testing', '', 'visible', null, true, null, null),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-00000000000a', 'idea', 'A post A will withdraw', '', 'visible', null, false, null, null),
  ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-00000000000a', 'idea', 'A pending post of A', '', 'pending', 'new_member', false, null, null),
  ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-00000000000b', 'content', 'Exam content report target', 'Pasted words from a real exam item', 'visible', null, false, null, null),
  ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-00000000000b', 'idea', 'Three reporters target', '', 'visible', null, false, null, null),
  ('10000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-00000000000b', 'idea', 'Two old and one young reporter', '', 'visible', null, false, null, null),
  ('10000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-00000000000b', 'idea', 'A removed post of B', '', 'removed', null, false, now() - interval '1 day', null),
  ('10000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-00000000000b', 'idea', 'The duplicate to merge', '', 'visible', null, false, null, null),
  ('10000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-00000000000a', 'idea', 'The original to merge into', '', 'visible', null, false, null, null);
insert into public.board_comments (id, post_id, author_id, body, visibility) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'Same here.', 'visible'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000b', 'Waiting comment', 'pending');
-- B's own rows that A will try to touch.
insert into public.board_votes (post_id, user_id) values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000b');
insert into public.board_notifications (user_id, kind, post_id) values ('00000000-0000-4000-8000-00000000000b', 'status', '10000000-0000-4000-8000-000000000002');
update public.board_posts set status = 'planned' where id = '10000000-0000-4000-8000-000000000002';

-- ── Signed out, default scope ('signed_in') ────────────────────────
set local role anon;
set local request.jwt.claims to '{"role":"anon"}';
select is((select read_scope from public.board_settings), 'signed_in', 'the default read scope is signed-in learners');
select is((select count(*)::int from public.board_posts), 0, 'signed out, by default nobody reads any post');
select is((select count(*)::int from public.board_feed('cisa', 'top')), 0, 'signed out, by default the feed is empty');
select is((select count(*)::int from public.board_members), 0, 'signed out, by default no member handle is readable');

-- ── Signed out, scope 'everyone' ───────────────────────────────────
reset role;
update public.board_settings set read_scope = 'everyone';
set local role anon;
select is((select count(*)::int from public.board_posts), 9, 'scope everyone: anon reads the visible posts only');
select is((select count(*)::int from public.board_posts where id = '10000000-0000-4000-8000-000000000003'), 0, 'anon cannot read a pending post');
select is((select count(*)::int from public.board_posts where id = '10000000-0000-4000-8000-000000000004'), 0, 'anon cannot read a hidden post');
select is((select count(*)::int from public.board_posts where id = '10000000-0000-4000-8000-000000000005'), 0, 'anon cannot read a removed post');
select is((select count(*)::int from public.board_comments), 1, 'anon reads the visible comment, not the pending one');
select is((select count(*)::int from public.board_status_events), 1, 'anon reads a visible post''s status history');
select is((select count(*)::int from public.board_feed('cisa', 'new')), 9, 'scope everyone: the signed-out feed lists the visible posts');
select throws_ok($$ select severity from public.board_posts $$, '42501', null, 'anon cannot read severity');
select throws_ok($$ select reach from public.board_posts $$, '42501', null, 'anon cannot read reach');
select throws_ok($$ select report_count from public.board_posts $$, '42501', null, 'anon cannot read report_count');
select throws_ok($$ select hold_reason from public.board_posts $$, '42501', null, 'anon cannot read hold_reason');
select throws_ok($$ select standing from public.board_members $$, '42501', null, 'anon cannot read a member''s standing');
select throws_ok($$ select * from public.board_votes $$, '42501', null, 'anon cannot read votes');
select throws_ok($$ select * from public.ugc_reports $$, '42501', null, 'anon cannot read reports');
select throws_ok($$ select * from public.member_blocks $$, '42501', null, 'anon cannot read blocks');
select throws_ok($$ select * from public.board_notifications $$, '42501', null, 'anon cannot read notices');
select throws_ok($$ select * from public.moderation_appeals $$, '42501', null, 'anon cannot read appeals');
select throws_ok($$ insert into public.board_posts (author_id, kind, title) values ('00000000-0000-4000-8000-00000000000a', 'idea', 'anon writes a post') $$,
  '42501', null, 'anon cannot write a post');
select throws_ok($$ insert into public.board_votes (post_id) values ('10000000-0000-4000-8000-000000000001') $$, '42501', null, 'anon cannot vote');
select throws_ok($$ update public.board_settings set posting_open = false $$, '42501', null, 'anon cannot pause posting');
select throws_ok($$ select private.is_staff() $$, '42501', null, 'anon cannot call a private helper');

-- ── Scope 'signed_in' (the default) as learner A ───────────────────
reset role;
update public.board_settings set read_scope = 'signed_in';
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select is((select count(*)::int from public.board_posts where id = '10000000-0000-4000-8000-000000000002'), 1, 'A reads B''s visible post');
select is((select count(*)::int from public.board_posts where id = '10000000-0000-4000-8000-000000000003'), 0, 'A cannot read B''s pending post');
select is((select count(*)::int from public.board_posts where id = '10000000-0000-4000-8000-000000000009'), 1, 'A reads their own pending post');
select throws_ok($$ select severity from public.board_posts $$, '42501', null, 'A cannot read severity');
select throws_ok($$ insert into public.board_posts (author_id, kind, title) values ('00000000-0000-4000-8000-00000000000a', 'idea', 'A writes a post directly') $$,
  '42501', null, 'A cannot insert a post (no grant: only board-submit writes posts)');
select throws_ok($$ insert into public.board_comments (post_id, author_id, body) values ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'direct') $$,
  '42501', null, 'A cannot insert a comment (no grant)');
select lives_ok($$ update public.board_posts set visibility = 'withdrawn' where id = '10000000-0000-4000-8000-000000000008' $$, 'A withdraws their own post');
select is((select visibility from public.board_posts where id = '10000000-0000-4000-8000-000000000008'), 'withdrawn', 'A''s post is withdrawn');
select throws_ok($$ update public.board_posts set visibility = 'visible' where id = '10000000-0000-4000-8000-000000000009' $$,
  '42501', 'forbidden', 'A cannot publish their own pending post');
select throws_ok($$ update public.board_posts set visibility = 'withdrawn', title = 'Changed title here' where id = '10000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'A cannot change a title while withdrawing');
select throws_ok($$ update public.board_posts set status = 'shipped' where id = '10000000-0000-4000-8000-000000000001' $$, '42501', null, 'A cannot set a status');
select throws_ok($$ update public.board_posts set vote_count = 999 where id = '10000000-0000-4000-8000-000000000001' $$, '42501', null, 'A cannot set vote_count');
select throws_ok($$ update public.board_posts set locked = true where id = '10000000-0000-4000-8000-000000000001' $$, '42501', null, 'A cannot lock a post');
with u as (update public.board_posts set visibility = 'withdrawn' where id = '10000000-0000-4000-8000-000000000002' returning 1)
select is((select count(*)::int from u), 0, 'A''s withdraw of B''s post affects 0 rows');
with u as (update public.board_comments set visibility = 'withdrawn' where id = '20000000-0000-4000-8000-000000000002' returning 1)
select is((select count(*)::int from u), 0, 'A''s withdraw of B''s comment affects 0 rows');

-- Votes.
select lives_ok($$ insert into public.board_votes (post_id) values ('10000000-0000-4000-8000-000000000002') $$, 'A votes for B''s post');
select is((select vote_count from public.board_posts where id = '10000000-0000-4000-8000-000000000002'), 1, 'the count goes up by exactly one');
select is((select count(*)::int from public.board_follows where post_id = '10000000-0000-4000-8000-000000000002'), 1, 'voting follows the post');
select throws_ok($$ insert into public.board_votes (post_id) values ('10000000-0000-4000-8000-000000000002') $$, '23505', null, 'a second vote fails on the primary key');
select throws_ok($$ insert into public.board_votes (post_id) values ('10000000-0000-4000-8000-000000000004') $$, '42501', null, 'no vote on a hidden post');
select throws_ok($$ insert into public.board_votes (post_id) values ('10000000-0000-4000-8000-000000000007') $$, '42501', null, 'no vote on a locked post');
select throws_ok($$ insert into public.board_votes (post_id, user_id) values ('10000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-00000000000b') $$,
  '42501', null, 'A cannot vote as B');
select lives_ok($$ delete from public.board_votes where post_id = '10000000-0000-4000-8000-000000000002' $$, 'A takes the vote back');
select is((select vote_count from public.board_posts where id = '10000000-0000-4000-8000-000000000002'), 0, 'the count goes down by exactly one');
select is((select count(*)::int from public.board_votes), 0, 'A cannot see B''s vote');
with d as (delete from public.board_votes where user_id = '00000000-0000-4000-8000-00000000000b' returning 1)
select is((select count(*)::int from d), 0, 'A''s delete of B''s vote affects 0 rows');
with u as (update public.board_notifications set read_at = now() where user_id = '00000000-0000-4000-8000-00000000000b' returning 1)
select is((select count(*)::int from u), 0, 'A cannot mark B''s notice read');
select lives_ok($$ insert into public.board_votes (post_id) values ('10000000-0000-4000-8000-000000000001') $$, 'A votes for their own idea (used below)');

-- 100 votes a day, and taking a vote back counts too (so delete + re-vote can't reset it).
reset role;
insert into private.board_events (user_id, kind) select '00000000-0000-4000-8000-00000000000a', 'vote' from generate_series(1, 97);
set local role authenticated;
select is((select count(*)::int from public.board_votes), 1, 'A sees only their own vote');
select throws_ok($$ insert into public.board_votes (post_id) values ('10000000-0000-4000-8000-000000000011') $$,
  'P0001', 'rate_limited', 'the 101st vote change in a day is refused (the vote and the take-back above count)');
select lives_ok($$ delete from public.board_votes where post_id = '10000000-0000-4000-8000-000000000001' $$, 'taking a vote back is never refused');
select is((select vote_count from public.board_posts where id = '10000000-0000-4000-8000-000000000001'), 1, 'only B''s vote is left on A''s idea');

-- B's rows after all of A's attempts (checked as the owner).
reset role;
select is((select row(visibility, title, status)::text from public.board_posts where id = '10000000-0000-4000-8000-000000000002'),
  '(visible,"Timer keeps running when locked",planned)', 'B''s post is unchanged after A''s attempts');
select is((select visibility from public.board_comments where id = '20000000-0000-4000-8000-000000000002'), 'pending', 'B''s comment is unchanged');
select is((select count(*)::int from public.board_votes where user_id = '00000000-0000-4000-8000-00000000000b'), 1, 'B''s vote is still there');
select ok((select bool_and(read_at is null) from public.board_notifications where user_id = '00000000-0000-4000-8000-00000000000b'), 'B''s notices are still unread');

-- ── Reports ─────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000010', 'exam_content') $$,
  'R1 reports a post for sharing real exam content');
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000011', 'spam') $$, 'R1 reports another post as spam');
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000012', 'spam') $$, 'R1 reports a third post');
select throws_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000011', 'abuse') $$,
  '23505', null, 'a second report of the same post by the same learner fails');
select throws_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000003', 'spam') $$,
  '42501', 'forbidden', 'a post the reporter can''t see can''t be reported (no hiding posts by guessing ids)');
select throws_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('member', '00000000-0000-4000-8000-0000000000e1', 'spam') $$,
  '42501', 'forbidden', 'nobody reports themselves');
select throws_ok($$ select note from public.ugc_reports $$, '42501', null, 'even their own report''s reporter_id and note stay server-side');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}';
select is((select count(*)::int from public.ugc_reports), 0, 'R2 cannot see R1''s reports');
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000011', 'spam') $$, 'R2 reports the spam post');
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000012', 'spam') $$, 'R2 reports the third post');
reset role;
select is((select row(visibility, hold_reason)::text from public.board_posts where id = '10000000-0000-4000-8000-000000000010'),
  '(hidden,exam_report)', 'one "real exam content" report hides the post for everyone at once');
select is((select visibility from public.board_posts where id = '10000000-0000-4000-8000-000000000011'), 'visible', 'two reporters don''t hide a post');
select is((select report_count from public.board_posts where id = '10000000-0000-4000-8000-000000000011'), 2, 'each report counts once');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000011', 'spam') $$, 'R3 reports the spam post');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000012', 'off_topic') $$,
  'Y (an account an hour old) reports the third post');
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000001', 'off_topic') $$, 'Y''s second report');
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000002', 'off_topic') $$, 'Y''s third report');
select throws_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000007', 'off_topic') $$,
  'P0001', 'rate_limited', 'an account under a day old may report 3 times a day');
reset role;
select is((select row(visibility, hold_reason)::text from public.board_posts where id = '10000000-0000-4000-8000-000000000011'),
  '(hidden,reports)', 'the third reporter (accounts 7+ days old) hides the post');
select is((select visibility from public.board_posts where id = '10000000-0000-4000-8000-000000000012'), 'visible',
  'a reporter whose account is under 7 days old doesn''t count toward the three');
select is((select count(*)::int from private.moderation_log where actor_id is null and action = 'hide'), 2, 'each automatic hide is logged');

-- ── Blocks ──────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';
select lives_ok($$ insert into public.member_blocks (blocked_member) values ('30000000-0000-4000-8000-00000000000a') $$, 'B blocks A (by A''s public id)');
select is((select count(*)::int from public.board_feed('cisa', 'new') f where f.author_handle = 'Quiet Cedar 214'), 0,
  'B''s feed no longer shows A''s posts');
select is((select count(*)::int from jsonb_array_elements(public.board_post('10000000-0000-4000-8000-000000000002') -> 'comments') e
           where e ->> 'authorId' = '30000000-0000-4000-8000-00000000000a'), 0,
  'B no longer sees A''s comment on B''s post');
select throws_ok($$ insert into public.member_blocks (blocked_member) values ('30000000-0000-4000-8000-000000000005') $$,
  '42501', 'forbidden', 'nobody can block a staff member');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select is((select count(*)::int from public.member_blocks), 0, 'A cannot see B''s block');
with d as (delete from public.member_blocks where blocker_id = '00000000-0000-4000-8000-00000000000b' returning 1)
select is((select count(*)::int from d), 0, 'A cannot remove B''s block');
select throws_ok($$ select private.is_blocked_by('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'A cannot ask whether B blocked them');
set local role service_role;
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'comment', '10000000-0000-4000-8000-000000000002',
                    null, null, 'A comments on B''s post', null, null, null) $$,
  '42501', 'forbidden', 'A''s comment on the post of B, who blocked A, is refused');
select throws_ok($$ insert into public.board_comments (post_id, author_id, body) values ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'direct') $$,
  '42501', 'forbidden', 'even a direct insert of that comment is refused by the trigger');

-- ── Handles ─────────────────────────────────────────────────────────
-- Names are set and changed only through board-submit's join (the service
-- role, after the app's full name check): no direct write by a learner.
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}';
select throws_ok($$ insert into public.board_members (handle, guidelines_version) values ('Misty Rowan 77', '2026-11') $$,
  '42501', null, 'a learner cannot write a member row directly (only board-submit''s join)');
set local role service_role;
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f1', 'KaiSip Team', 'chosen', '2026-11') $$, '22023', 'reserved_handle', '"KaiSip Team" is reserved');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f1', 'ISACA_mod', 'chosen', '2026-11') $$, '22023', 'reserved_handle', '"ISACA_mod" is reserved');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f1', 'support', 'chosen', '2026-11') $$, '22023', 'reserved_handle', '"support" is reserved');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f1', 'quiet cedar 214', 'chosen', '2026-11') $$, '23505', null, 'handles are unique, whatever the case');
select lives_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f1', 'Misty Rowan 77', 'pseudonym', '2026-11') $$, 'Y joins with a pseudonym');
select lives_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f1', 'Misty Rowan 78', 'pseudonym', '2026-11') $$, 'Y changes their name once');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f1', 'Misty Rowan 79', 'pseudonym', '2026-11') $$, 'P0001', 'rate_limited', 'a second name change within 24 hours is refused');
set local role authenticated;
select throws_ok($$ update public.board_members set standing = 'active', approved_posts = 9 $$, '42501', null, 'Y cannot set their own standing or trust');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000e","role":"authenticated"}';
select throws_ok($$ insert into public.board_members (handle, guidelines_version) values ('Calm Pine 5', '2026-11') $$,
  '42501', null, 'a session without the Terms (no profile) cannot join');

-- ── Appeals ─────────────────────────────────────────────────────────
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select lives_ok($$ insert into public.moderation_appeals (target_kind, target_id, note) values ('post', '10000000-0000-4000-8000-000000000005', 'Please look again') $$,
  'A appeals their own post removed yesterday');
select throws_ok($$ insert into public.moderation_appeals (target_kind, target_id) values ('post', '10000000-0000-4000-8000-000000000005') $$, '23505', null, 'only once');
select throws_ok($$ insert into public.moderation_appeals (target_kind, target_id) values ('post', '10000000-0000-4000-8000-000000000006') $$,
  '42501', 'forbidden', 'not after 14 days');
select throws_ok($$ insert into public.moderation_appeals (target_kind, target_id) values ('post', '10000000-0000-4000-8000-000000000013') $$,
  '42501', 'forbidden', 'not someone else''s removed post');
select throws_ok($$ insert into public.moderation_appeals (target_kind, target_id) values ('post', '10000000-0000-4000-8000-000000000001') $$,
  '42501', 'forbidden', 'not a post that wasn''t removed');

-- ── Staff tables and server-only functions ─────────────────────────
select throws_ok($$ select * from private.staff $$, '42501', null, 'A cannot read the staff list');
select throws_ok($$ select * from private.moderation_log $$, '42501', null, 'A cannot read the moderation log');
select throws_ok($$ select * from private.moderation_terms $$, '42501', null, 'A cannot read the filter terms');
select throws_ok($$ select private.staff_act('00000000-0000-4000-8000-00000000000a', 'pause', 'board', null, null, '{}') $$, '42501', null, 'A cannot run a staff action');
select throws_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'pause', 'board', null, null, '{}') $$, '42501', null, 'A cannot call the staff entry point, even naming S');
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'post', null, 'idea', 'Straight to the table', '', null, null, null) $$,
  '42501', null, 'A cannot call board-submit''s writer directly (no filters skipped)');
reset role;   -- the catalogue checks below name private functions, which A can't even look up
select ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
                      lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                      where n.nspname = 'private' and a.grantee = 0 and a.privilege_type = 'EXECUTE'),
  'no private function is executable by PUBLIC (is_active_member and is_blocked_by included)');
select ok(not has_function_privilege('authenticated', 'private.is_blocked_by(uuid, uuid)', 'execute')
          and not has_function_privilege('anon', 'private.is_active_member()', 'execute'),
  'is_blocked_by is server-only, and anon executes no policy helper');

-- ── board-submit's writer (the service role, after the filters) ────
reset role;
set local role service_role;
select is((public.svc_board_join('00000000-0000-4000-8000-0000000000e1', 'Bright Elm 11', 'pseudonym', '2026-11')) ->> 'handle', 'Bright Elm 11',
  'joining again with the same details changes nothing (no name-change counted)');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-00000000000e', 'Calm Pine 6', 'pseudonym', '2026-11') $$,
  '42501', 'forbidden', 'board-submit''s join also needs the Terms');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000e1', 'Bright Elm 11', 'pseudonym', '2025-01') $$,
  'P0001', 'guidelines', 'joining needs the current guidelines version');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000e2', 'Aurivan Helper', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', 'the reserved-name check runs for board-submit''s join too');
select is((public.svc_board_write('00000000-0000-4000-8000-0000000000f1', 'post', null, 'idea', 'A first idea from Y', '', null, null, null)) ->> 'holdReason',
  'new_member', 'a new member''s first post waits for review');
select is((public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'post', null, 'idea', 'A trusted member posts this', '', null, null, null)) ->> 'visibility',
  'visible', 'a member with an approved post posts straight away');
select is((public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'post', null, 'idea', 'This looked like recall', '', null, null, 'recall')) ->> 'visibility',
  'pending', 'a post the recall check flagged waits for review');
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-0000000000f1', 'post', null, 'idea', 'A second post on day one', '', null, null, null) $$,
  'P0001', 'rate_limited', 'an account under a day old posts once a day');
select lives_ok($$ select public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'post', null, 'idea', 'A third post this hour', '', null, null, null) $$, 'a third post in an hour');
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'post', null, 'idea', 'A fourth post this hour', '', null, null, null) $$,
  'P0001', 'rate_limited', 'a fourth post in an hour is refused (withdrawing one doesn''t give it back)');
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-0000000000e1', 'comment', '10000000-0000-4000-8000-000000000007', null, null, 'On a locked post', null, null, null) $$,
  '42501', 'forbidden', 'no comment on a locked post');
select is((public.svc_board_write('00000000-0000-4000-8000-0000000000e1', 'comment', '10000000-0000-4000-8000-000000000001', null, null, 'A top comment', null, null, null)) ->> 'visibility',
  'visible', 'a comment goes live after the filters');
select is((public.svc_board_write('00000000-0000-4000-8000-0000000000e2', 'comment', '10000000-0000-4000-8000-000000000001', null, null, 'A reply', null,
           (select id from public.board_comments where body = 'A top comment'), null)) ->> 'visibility',
  'visible', 'a reply to a top comment is allowed');
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-0000000000e1', 'comment', '10000000-0000-4000-8000-000000000001', null, null, 'A reply to a reply', null,
                    (select id from public.board_comments where body = 'A reply'), null) $$,
  '42501', 'forbidden', 'a reply to a reply is refused (one level only)');
reset role;
update public.board_settings set posting_open = false;
set local role service_role;
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-0000000000e1', 'post', null, 'idea', 'While posting is paused', '', null, null, null) $$,
  'P0001', 'posting_paused', 'paused: no new posts');
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-0000000000e1', 'comment', '10000000-0000-4000-8000-000000000001', null, null, 'Paused comment', null, null, null) $$,
  'P0001', 'posting_paused', 'paused: no new comments');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}';
select lives_ok($$ insert into public.board_votes (post_id) values ('10000000-0000-4000-8000-000000000001') $$, 'paused: voting still works');
reset role;
update public.board_settings set posting_open = true, guidelines_version = '2027-01';
set local role service_role;
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-0000000000e1', 'post', null, 'idea', 'Before the new guidelines', '', null, null, null) $$,
  'P0001', 'guidelines', 'a new guidelines version must be accepted before posting again');
reset role;
update public.board_settings set guidelines_version = '2026-11';
update public.board_members set standing = 'banned' where user_id = '00000000-0000-4000-8000-0000000000e3';
set local role service_role;
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-0000000000e3', 'post', null, 'idea', 'A banned member posts', '', null, null, null) $$,
  'P0001', 'banned', 'a banned member cannot post');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated"}';
select throws_ok($$ insert into public.board_votes (post_id) values ('10000000-0000-4000-8000-000000000001') $$, '42501', null, 'a banned member cannot vote');

-- ── Staff actions (staff-action: the service role, actor checked) ──
reset role;
set local role service_role;
select throws_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-00000000000a', 'pause', 'board', null, null, '{}') $$,
  '42501', 'forbidden', 'a learner named as the actor is refused');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'approve', 'post',
                    (select id from public.board_posts where title = 'A first idea from Y'), null, '{}') $$, 'S approves Y''s first post');
select is((select row(p.visibility, m.approved_posts)::text from public.board_posts p join public.board_members m on m.user_id = p.author_id
           where p.title = 'A first idea from Y'), '(visible,1)', 'it is visible, and Y''s pre-moderation is lifted');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'remove_warn', 'post', '10000000-0000-4000-8000-000000000012', 'abuse', '{}') $$,
  'S removes a post and warns its author');
select is((select string_agg(kind || ':' || coalesce(reason, ''), ',' order by kind) from public.board_notifications
           where user_id = '00000000-0000-4000-8000-00000000000b' and post_id = '10000000-0000-4000-8000-000000000012'),
  'removed:abuse,warned:abuse', 'the author gets the removal notice with its reason, and the warning');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'status', 'post', '10000000-0000-4000-8000-000000000001', null,
                    '{"status":"in_progress"}') $$, 'S sets a status');
select is((select count(*)::int from public.board_status_events where post_id = '10000000-0000-4000-8000-000000000001' and to_status = 'in_progress'), 1,
  'the change is in the public status history');
select is((select count(distinct user_id)::int from public.board_notifications where post_id = '10000000-0000-4000-8000-000000000001' and kind = 'status'), 4,
  'the author and the followers (B and R2 voted, R1 commented) are told');
select is((select count(*)::int from public.board_notifications where post_id = '10000000-0000-4000-8000-000000000001' and kind = 'status'), 4,
  'once each');
select throws_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'status', 'post', '10000000-0000-4000-8000-000000000001', null,
                    '{"status":"not_planned"}') $$, '23514', null, '"Not planned" needs a reason');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'official', 'post', '10000000-0000-4000-8000-000000000001', null,
                    '{"body":"Thanks. This is on our list."}') $$, 'S pins an official response');
select is((select c.is_official from public.board_posts p join public.board_comments c on c.id = p.official_comment_id
           where p.id = '10000000-0000-4000-8000-000000000001'), true, 'the official response is a staff comment marked official');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'merge', 'post', '10000000-0000-4000-8000-000000000014', null,
                    '{"into":"10000000-0000-4000-8000-000000000015"}') $$, 'S merges a duplicate');
select is((select row(status, duplicate_of)::text from public.board_posts where id = '10000000-0000-4000-8000-000000000014'),
  '(duplicate,10000000-0000-4000-8000-000000000015)', 'the duplicate points at the original');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'delete_exam_content', 'post', '10000000-0000-4000-8000-000000000010', null, '{}') $$,
  'S deletes exam content');
select is((select row(visibility, title, body, mod_reason)::text from public.board_posts where id = '10000000-0000-4000-8000-000000000010'),
  '(removed,"Removed post","",exam_content)', 'the text is gone for good; only the action is logged');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'pause', 'board', null, null, '{}') $$, 'S pauses posting');
select is((select posting_open from public.board_settings), false, 'posting is paused');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'reopen', 'board', null, null, '{}') $$, 'S reopens posting');
select is((select count(*)::int from private.moderation_log where actor_id = '00000000-0000-4000-8000-000000000005'), 10,
  'every staff action is logged with its actor (a removal with a warning is two lines; the refused status none)');
select is((public.svc_staff_queue('00000000-0000-4000-8000-000000000005', 'held') ->> 'tab'), 'held', 'S reads the queue');
select ok((public.svc_staff_digest() ->> 'held') is not null and public.svc_staff_digest()::text !~ 'Quiet|Steady|@', 'the digest holds counts only');

-- Scope 'author_staff': a learner reads only their own posts.
reset role;
update public.board_settings set read_scope = 'author_staff';
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select is((select count(*)::int from public.board_posts), 0, 'scope author_staff: R1 (who has no posts) reads none');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select ok((select bool_and(author_member = '30000000-0000-4000-8000-00000000000a') from public.board_posts), 'scope author_staff: A reads only their own posts');
select is((select count(*)::int from public.board_comments where is_official), 1, 'scope author_staff: A still reads the team''s reply on their post');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated"}';
select ok((select count(*) from public.board_posts) >= 15, 'staff read every post in any scope');
reset role;
update public.board_settings set read_scope = 'signed_in';

-- ── Account deletion cascades (owner decision §9 #5) ───────────────
insert into public.ugc_reports (reporter_id, target_kind, target_id, reason)
  values ('00000000-0000-4000-8000-00000000000a', 'post', '10000000-0000-4000-8000-000000000002', 'other');
insert into public.board_votes (post_id, user_id) values ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a');
delete from auth.users where id = '00000000-0000-4000-8000-00000000000a';
select is((select count(*)::int from public.board_posts where author_id = '00000000-0000-4000-8000-00000000000a'), 0, 'A''s posts are deleted');
select is((select count(*)::int from public.board_comments where author_id = '00000000-0000-4000-8000-00000000000a'), 0, 'A''s comments are deleted');
select is((select count(*)::int from public.board_votes where user_id = '00000000-0000-4000-8000-00000000000a')
          + (select count(*)::int from public.board_follows where user_id = '00000000-0000-4000-8000-00000000000a'), 0, 'A''s votes and follows are deleted');
select is((select count(*)::int from public.member_blocks where blocked_member = '30000000-0000-4000-8000-00000000000a')
          + (select count(*)::int from public.moderation_appeals where user_id = '00000000-0000-4000-8000-00000000000a'), 0, 'blocks of A and A''s appeals are deleted');
select is((select count(*)::int from public.ugc_reports where reporter_id is null and reason = 'other'), 1, 'A''s report stays for the team, without A');

-- Realtime would skip the column grants: nothing here is published.
select is((select count(*)::int from pg_publication_tables
           where schemaname = 'private' or tablename like 'board\_%' or tablename in ('ugc_reports', 'member_blocks', 'moderation_appeals')), 0,
  'no board or private table is in any publication (supabase_realtime included)');

select * from finish();
rollback;
