-- Feedback board: the mobile security audit's fixes (21 Oct 2026) as tests.
--
-- M2 roles: a 'moderator' keeps the everyday tools (lock, hide, suspend, lift
--    a suspension), but only an 'admin' may pause or reopen the board, ban,
--    lift a ban (unban, or restore a banned member's standing appeal), or
--    take any member action against a staff account. (The MFA half of M2 is
--    in the staff-action Edge Function's Deno tests.)
-- L2 board_feed: a cert id of the wrong shape is refused before any row is
--    read, and search text is trimmed and cut to 100 characters.
-- L5 edit_comment: refused when the post is locked or no longer visible.
--
-- People: A (author), B (a learner), Z (banned, with an open standing
-- appeal), moderators M and M2, admin S.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(33);

-- ── Fixtures (as the owner) ─────────────────────────────────────────
insert into auth.users (id, email, created_at) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-00000000000c', 'z@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-000000000006', 'm@test.invalid', now() - interval '90 days'),
  ('00000000-0000-4000-8000-000000000007', 'm2@test.invalid', now() - interval '90 days'),
  ('00000000-0000-4000-8000-000000000005', 's@test.invalid', now() - interval '90 days');
insert into public.profiles (id, terms_version, age_confirmed) select id, '2026-11', true from auth.users;
insert into private.staff (user_id, role) values
  ('00000000-0000-4000-8000-000000000006', 'moderator'),
  ('00000000-0000-4000-8000-000000000007', 'moderator'),
  ('00000000-0000-4000-8000-000000000005', 'admin');
insert into public.board_members (user_id, public_id, handle, guidelines_version, approved_posts, standing, standing_changed_at) values
  ('00000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'Quiet Cedar 214', '2026-11', 1, 'active', null),
  ('00000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'Steady Oak 9', '2026-11', 1, 'active', null),
  ('00000000-0000-4000-8000-00000000000c', '30000000-0000-4000-8000-00000000000c', 'Still Pine 3', '2026-11', 1, 'banned', now()),
  ('00000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 'Bright Elm 2', '2026-11', 1, 'active', null),
  ('00000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000007', 'Soft Ash 4', '2026-11', 1, 'active', null),
  ('00000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Calm Birch 1', '2026-11', 1, 'active', null);
insert into public.board_posts (id, author_id, kind, title, body, visibility) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'idea', 'A modest idea for timers', 'Could the timer pause?', 'visible'),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'idea', 'Dark mode for the notes', 'Easier at night', 'visible');
insert into public.board_comments (id, post_id, author_id, body) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'Nice idea, thanks'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000a', 'Yes please');
-- Z appeals the ban (appeals_guard: own standing, changed in the last 14 days).
insert into public.moderation_appeals (id, user_id, target_kind, target_id, note) values
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000c', 'standing',
   '00000000-0000-4000-8000-00000000000c', 'Please let me back');

-- One staff action, as the service role (like staff-action). M = moderator, S = admin.
create function pg_temp.act(p_actor text, p_action text, p_kind text, p_target text) returns jsonb language sql as $$
  select public.svc_staff_act(p_actor::uuid, p_action, p_kind, p_target::uuid, null, '{}')
$$;
-- A's edit of one of their comments (board-submit's edit_comment).
create function pg_temp.edit(p_comment text, p_body text) returns jsonb language sql as $$
  select public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'edit_comment', p_comment::uuid, null, null,
    p_body, null, null, null)
$$;

-- ── M2: what a moderator may and may not do ─────────────────────────
set local role service_role;
select throws_ok($$ select pg_temp.act('00000000-0000-4000-8000-00000000000b', 'lock', 'post', '10000000-0000-4000-8000-000000000002') $$,
  '42501', 'forbidden', 'a learner (not staff) can''t even lock a post');
select lives_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'lock', 'post', '10000000-0000-4000-8000-000000000002') $$,
  'a moderator locks a post');
select lives_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'unlock', 'post', '10000000-0000-4000-8000-000000000002') $$,
  'and unlocks it');
select lives_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'suspend', 'member', '30000000-0000-4000-8000-00000000000b') $$,
  'a moderator suspends a learner');
select lives_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'unban', 'member', '30000000-0000-4000-8000-00000000000b') $$,
  'and lifts a suspension (unban of someone not banned)');
select is((select standing from public.board_members where user_id = '00000000-0000-4000-8000-00000000000b'), 'active',
  'B is active again');

select throws_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'pause', 'board', null) $$, '42501', 'forbidden',
  'a moderator can''t pause the board');
select throws_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'reopen', 'board', null) $$, '42501', 'forbidden',
  'or reopen it');
select is((select posting_open from public.board_settings), true, 'posting is still open');
select throws_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'ban', 'member', '30000000-0000-4000-8000-00000000000b') $$,
  '42501', 'forbidden', 'a moderator can''t ban a learner');
select throws_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'unban', 'member', '30000000-0000-4000-8000-00000000000c') $$,
  '42501', 'forbidden', 'or lift a ban');
select throws_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'restore_appeal', 'appeal', '40000000-0000-4000-8000-000000000001') $$,
  '42501', 'forbidden', 'or lift a ban through the member''s appeal');
select is((select standing from public.board_members where user_id = '00000000-0000-4000-8000-00000000000c'), 'banned',
  'Z is still banned');
select throws_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'suspend', 'member', '30000000-0000-4000-8000-000000000007') $$,
  '42501', 'forbidden', 'a moderator can''t suspend another moderator (by public id)');
select throws_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'warn', 'member', '00000000-0000-4000-8000-000000000005') $$,
  '42501', 'forbidden', 'or warn an admin (by account id)');
select throws_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000006', 'rename', 'member', '30000000-0000-4000-8000-000000000005') $$,
  '42501', 'forbidden', 'or rename an admin');
select is((select array_agg(action order by id) from private.moderation_log where actor_id = '00000000-0000-4000-8000-000000000006'),
  array['lock', 'unlock', 'suspend', 'unban'], 'the log has the moderator''s four allowed actions and none of the refused ones');

-- ── M2: an admin may ────────────────────────────────────────────────
select lives_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000005', 'pause', 'board', null) $$, 'an admin pauses the board');
select is((select posting_open from public.board_settings), false, 'posting is paused');
select lives_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000005', 'reopen', 'board', null) $$, 'and reopens it');
select lives_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000005', 'ban', 'member', '30000000-0000-4000-8000-00000000000b') $$,
  'an admin bans a learner');
select lives_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000005', 'restore_appeal', 'appeal', '40000000-0000-4000-8000-000000000001') $$,
  'an admin restores a banned member through their appeal');
select is((select standing from public.board_members where user_id = '00000000-0000-4000-8000-00000000000c'), 'active',
  'Z is active again');
select lives_ok($$ select pg_temp.act('00000000-0000-4000-8000-000000000005', 'suspend', 'member', '30000000-0000-4000-8000-000000000007') $$,
  'an admin may act on a moderator');

-- ── L5: edit_comment needs a visible, unlocked post ─────────────────
select lives_ok($$ select pg_temp.edit('20000000-0000-4000-8000-000000000001', 'Nice idea, thanks a lot') $$,
  'A edits their comment on an open post');
select pg_temp.act('00000000-0000-4000-8000-000000000006', 'lock', 'post', '10000000-0000-4000-8000-000000000001');
select throws_ok($$ select pg_temp.edit('20000000-0000-4000-8000-000000000001', 'Changed while locked') $$, '42501', 'forbidden',
  'not once staff locked the post');
select pg_temp.act('00000000-0000-4000-8000-000000000006', 'hide', 'post', '10000000-0000-4000-8000-000000000002');
select throws_ok($$ select pg_temp.edit('20000000-0000-4000-8000-000000000002', 'Changed while hidden') $$, '42501', 'forbidden',
  'nor on a post staff hid');
select is((select body from public.board_comments where id = '20000000-0000-4000-8000-000000000001'), 'Nice idea, thanks a lot',
  'the comment keeps its words from before the lock');

-- ── L2: board_feed bounds its inputs (anon can call it) ─────────────
reset role;
update public.board_settings set read_scope = 'everyone';
set local role anon;
select throws_ok($$ select * from public.board_feed('CISA; drop', 'new') $$, '22023', 'invalid', 'a cert id of the wrong shape is refused');
select throws_ok($$ select * from public.board_feed(null, 'new') $$, '22023', 'invalid', 'and so is no cert id');
-- The open post's word, then 200 spaces, then a word no post has. Cut at 100
-- characters, only "timers" is searched, so the post is found (uncut, it
-- would need "zebra" too and find nothing).
select is((select count(*)::int from public.board_feed('cisa', 'new', null, 'timers' || repeat(' ', 200) || 'zebra')), 1,
  'search text past 100 characters is ignored');
select is((select count(*)::int from public.board_feed('cisa', 'new', null, '   ')), 1, 'blank search text means no search');
select lives_ok($$ select * from public.board_feed('cisa', 'new', null, repeat('word ', 200000)) $$,
  'a megabyte of search text is cut, not searched');

select * from finish();
rollback;
