-- Feedback board: the fix round's regression tests (Uplift Phase 8 review,
-- 12 Oct). Each block is a repro from the reviews (CR_P8 B4 / N1–N5 / N12 /
-- nit 6, the SEC_P8 §E probes B1 and S1–S6, QA BUG-1) turned into a test
-- that fails on the code before the fix and passes after it.
--
-- People (all accounts have the Terms unless said): members A, B, C and the
-- reporters R1–R3 (30 days old, one approved post each: "trusted"); staff S;
-- Y and Z (an hour old, no approved post); BN (banned); NP (30 days old, no
-- approved post); O (Terms, never joined the board).
-- Public member ids are fixed: 3000…<letter> (learners never read account ids).
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(83);

-- ── Fixtures (as the owner) ─────────────────────────────────────────
insert into auth.users (id, email, created_at) values
  ('00000000-0000-4000-8000-00000000000a', 'a@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-00000000000b', 'b@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-00000000000c', 'c@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-000000000005', 's@test.invalid', now() - interval '90 days'),
  ('00000000-0000-4000-8000-0000000000e1', 'r1@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000e2', 'r2@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000e3', 'r3@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000f1', 'y@test.invalid', now() - interval '1 hour'),
  ('00000000-0000-4000-8000-0000000000f2', 'z@test.invalid', now() - interval '1 hour'),
  ('00000000-0000-4000-8000-0000000000b0', 'bn@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000a0', 'np@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000d0', 'o@test.invalid', now() - interval '30 days'),
  ('00000000-0000-4000-8000-0000000000e4', 'r4@test.invalid', now() - interval '3 days');
insert into public.profiles (id, terms_version, age_confirmed) select id, '2026-11', true from auth.users;
insert into private.staff (user_id, role) values ('00000000-0000-4000-8000-000000000005', 'admin');
insert into public.board_members (user_id, public_id, handle, guidelines_version, approved_posts, standing) values
  ('00000000-0000-4000-8000-00000000000a', '30000000-0000-4000-8000-00000000000a', 'Quiet Cedar 214', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-00000000000b', '30000000-0000-4000-8000-00000000000b', 'Steady Oak 9', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-00000000000c', '30000000-0000-4000-8000-00000000000c', 'Calm Ash 3', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Calm Birch 1', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-0000000000e1', '30000000-0000-4000-8000-0000000000e1', 'Bright Elm 11', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-0000000000e2', '30000000-0000-4000-8000-0000000000e2', 'Bright Elm 12', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-0000000000e3', '30000000-0000-4000-8000-0000000000e3', 'Bright Elm 13', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-0000000000e4', '30000000-0000-4000-8000-0000000000e4', 'Bright Elm 14', '2026-11', 1, 'active'),
  ('00000000-0000-4000-8000-0000000000f1', '30000000-0000-4000-8000-0000000000f1', 'Young Fir 1', '2026-11', 0, 'active'),
  ('00000000-0000-4000-8000-0000000000f2', '30000000-0000-4000-8000-0000000000f2', 'Young Fir 2', '2026-11', 0, 'active'),
  ('00000000-0000-4000-8000-0000000000b0', '30000000-0000-4000-8000-0000000000b0', 'Gray Moss 5', '2026-11', 1, 'banned'),
  ('00000000-0000-4000-8000-0000000000a0', '30000000-0000-4000-8000-0000000000a0', 'Pale Reed 4', '2026-11', 0, 'active');
insert into public.board_posts (id, author_id, kind, title, body, visibility, hold_reason) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000b', 'idea', 'B''s idea about BCP tests', 'Please.', 'visible', null),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000c', 'idea', 'C''s thread on timers', '', 'visible', null),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-00000000000a', 'idea', 'A''s abusive post here', 'something nasty about B', 'visible', null),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-00000000000b', 'content', 'B''s post that gets reported', 'Words.', 'visible', null),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-00000000000a', 'idea', 'A''s post A will withdraw', '', 'visible', null),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-00000000000a', 'idea', 'A''s post waiting for review', '', 'pending', 'new_member'),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-00000000000b', 'idea', 'B''s duplicate of the BCP idea', '', 'visible', null),
  ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-00000000000c', 'idea', 'C''s post that will be deleted', '', 'visible', null),
  ('10000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-00000000000c', 'idea', 'C''s post three people report', '', 'visible', null);
insert into public.board_comments (id, post_id, author_id, body) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-00000000000b', 'B comments on C''s thread');

-- ── CR B4 / SEC B1: a word staff add later never stops staff acting ─
insert into private.moderation_terms (kind, term) values ('reserved_handle', 'cedar'), ('block', 'oak');
set local role service_role;
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'ban', 'member', '30000000-0000-4000-8000-00000000000a', null, '{}') $$,
  'staff can ban a member whose name matches a reserved term added later');
select is((select standing from public.board_members where public_id = '30000000-0000-4000-8000-00000000000a'), 'banned', 'the ban took effect');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'unban', 'member', '30000000-0000-4000-8000-00000000000a', null, '{}') $$,
  'and unban them');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'suspend', 'member', '30000000-0000-4000-8000-00000000000a', null, '{"days":1}') $$,
  'and suspend them');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'unban', 'member', '30000000-0000-4000-8000-00000000000a', null, '{}') $$,
  'and lift the suspension');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'approve', 'post', '10000000-0000-4000-8000-000000000007', null, '{}') $$,
  'staff can approve their held post (the approved-post count moves)');
select is((select approved_posts from public.board_members where public_id = '30000000-0000-4000-8000-00000000000a'), 2, 'the approval counted');
reset role;
update public.board_settings set guidelines_version = '2026-12';
set local role service_role;
select lives_ok($$ select public.svc_board_join('00000000-0000-4000-8000-00000000000b', 'Steady Oak 9', 'pseudonym', '2026-12') $$,
  'a member re-accepts new guidelines with the same name, though a block word added later matches it');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-00000000000c', 'Oak Lover 2', 'chosen', '2026-12') $$,
  '22023', 'reserved_handle', 'a NEW name is still checked against the block word');
reset role;
update public.board_settings set guidelines_version = '2026-11';
update public.board_members set guidelines_version = '2026-11' where user_id = '00000000-0000-4000-8000-00000000000b';
delete from private.moderation_terms where term in ('cedar', 'oak');
select is((select count(*)::int from private.moderation_terms where kind = 'hold' and term in ('isaca official', 'official isaca')), 2,
  'the "ISACA official" hold terms are seeded');

-- ── SEC B1 c: staff rename an offensive name, logged ───────────────
set local role service_role;
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'rename', 'member', '30000000-0000-4000-8000-00000000000a', null, '{}') $$,
  'staff can rename a member');
select ok((select handle ~ '^Learner [0-9a-f]{6}$' and handle_kind = 'pseudonym' from public.board_members where public_id = '30000000-0000-4000-8000-00000000000a'),
  'the new name is a plain neutral pseudonym');
select is((select count(*)::int from private.moderation_log where action = 'rename' and actor_id = '00000000-0000-4000-8000-000000000005'), 1,
  'the rename is logged with its actor');
select is((select public_id::text from public.board_members where user_id = '00000000-0000-4000-8000-00000000000a'), '30000000-0000-4000-8000-00000000000a',
  'a rename keeps the public id (blocks and reports still point at the member)');

-- ── CR N3 / SEC B1 b: no direct name writes; look-alikes and ISACA marks ─
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select throws_ok($$ update public.board_members set handle = 'Fuck Cedar 1' $$,
  '42501', null, 'a learner cannot change their name over REST (board-submit''s full word list can''t be skipped)');
set local role service_role;
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f2', 'AURlVAN Helper', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', 'a look-alike of the team name (lower-case L for I) is reserved');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f2', 'Cobit Fan', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', 'another ISACA mark (COBIT) is reserved');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f2', 'AAIA Pro', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', 'a shipped exam''s name (AAIA) is reserved');
select throws_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f2', 'Staff Pick', 'chosen', '2026-11') $$,
  '22023', 'reserved_handle', '"staff" as a word is reserved');
select lives_ok($$ select public.svc_board_join('00000000-0000-4000-8000-0000000000f2', 'Badminton Fan', 'chosen', '2026-11') $$,
  '"admin" inside another word is fine (Badminton Fan)');

-- ── SEC S4: readers never get account ids ──────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select throws_ok($$ select user_id from public.board_members $$, '42501', null, 'a learner cannot read members'' account ids');
select throws_ok($$ select created_at from public.board_members $$, '42501', null, 'nor their join dates');
select throws_ok($$ select author_id from public.board_posts $$, '42501', null, 'nor a post''s author account id');
select throws_ok($$ select author_id from public.board_comments $$, '42501', null, 'nor a comment''s');
select is((select author_member::text from public.board_feed('cisa', 'new') where id = '10000000-0000-4000-8000-000000000001'),
  '30000000-0000-4000-8000-00000000000b', 'the feed names the author by their public id');
select is((public.board_post('10000000-0000-4000-8000-000000000002') -> 'comments' -> 0 ->> 'authorId'),
  '30000000-0000-4000-8000-00000000000b', 'so does a post''s comment list');
set local role service_role;
select ok((public.svc_board_member('00000000-0000-4000-8000-0000000000e1') ->> 'memberId') = '30000000-0000-4000-8000-0000000000e1'
          and not (public.svc_board_member('00000000-0000-4000-8000-0000000000e1') ? 'userId'),
  'a learner''s own facts carry their public id, not their account id');

-- ── SEC S2 / QA O4: a blocked learner can't reach the blocker ──────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';
select lives_ok($$ insert into public.member_blocks (blocked_member) values ('30000000-0000-4000-8000-0000000000e2') $$, 'B blocks R2');
select throws_ok($$ insert into public.member_blocks (blocked_member) values ('30000000-0000-4000-8000-00000000000b') $$,
  '42501', 'forbidden', 'nobody blocks themselves');
set local role service_role;
select throws_ok($$ select public.svc_board_write('00000000-0000-4000-8000-0000000000e2', 'comment', '10000000-0000-4000-8000-000000000002', null, null,
                    'R2 replies to B anyway', null, '20000000-0000-4000-8000-000000000001', null) $$,
  '42501', 'forbidden', 'R2 cannot reply to a comment by B, who blocked R2 (on C''s post)');
select throws_ok($$ insert into public.board_comments (post_id, author_id, parent_id, body) values ('10000000-0000-4000-8000-000000000002',
                    '00000000-0000-4000-8000-0000000000e2', '20000000-0000-4000-8000-000000000001', 'direct reply') $$,
  '42501', 'forbidden', 'even a direct insert of that reply is refused by the trigger');
select is((public.svc_board_write('00000000-0000-4000-8000-0000000000e2', 'comment', '10000000-0000-4000-8000-000000000002', null, null,
           'R2 comments on C''s thread', null, null, null)) ->> 'visibility', 'visible', 'R2 may still comment on C''s post');
select is((select count(*)::int from public.board_notifications n join public.board_comments c on c.id = n.comment_id
           where n.user_id = '00000000-0000-4000-8000-00000000000b' and c.author_id = '00000000-0000-4000-8000-0000000000e2'), 0,
  'B (who follows C''s thread) gets no notice for R2''s comment');
select is((select count(*)::int from public.board_notifications n join public.board_comments c on c.id = n.comment_id
           where n.user_id = '00000000-0000-4000-8000-00000000000c' and c.author_id = '00000000-0000-4000-8000-0000000000e2'), 1,
  'C, who didn''t block R2, does');

-- ── SEC S3: the reported words stay for the moderators after an edit ─
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000003', 'abuse') $$,
  'R1 reports A''s abusive post');
select throws_ok($$ select snapshot from public.ugc_reports $$, '42501', null, 'the copy of the reported words is staff-only');
set local role service_role;
select is((public.svc_board_write('00000000-0000-4000-8000-00000000000a', 'edit_post', '10000000-0000-4000-8000-000000000003', 'idea',
           'A''s lovely post here', 'all good', null, null, null)) ->> 'visibility', 'visible', 'A edits the reported post');
select ok((select snapshot like '%something nasty about B%' from public.ugc_reports where target_id = '10000000-0000-4000-8000-000000000003'),
  'the report keeps the words as they were when reported');
select ok((select bool_or(i ->> 'snapshot' like '%something nasty about B%' and i ->> 'handle' is not null)
           from jsonb_array_elements(public.svc_staff_queue('00000000-0000-4000-8000-000000000005', 'reported') -> 'items') i),
  'the staff queue shows them, with who wrote them');

-- ── SEC S1: who can hide a post with one report ────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000b0","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000004', 'exam_content') $$,
  'a banned member''s report is taken (for the queue)');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000f1","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000004', 'exam_content') $$,
  'so is a brand-new account''s');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000a0","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000004', 'exam_content') $$,
  'and a member''s with no approved post');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000d0","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000004', 'exam_content') $$,
  'and a reader''s who never joined the board (reporting needs only the Terms)');
reset role;
select is((select visibility from public.board_posts where id = '10000000-0000-4000-8000-000000000004'), 'visible',
  'none of those four hides the post on their own');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000004', 'exam_content') $$,
  'a trusted member reports it as real exam content');
reset role;
select is((select row(visibility, hold_reason)::text from public.board_posts where id = '10000000-0000-4000-8000-000000000004'), '(hidden,exam_report)',
  'a trusted reporter''s "real exam content" hides it at once');
set local role service_role;
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'restore', 'post', '10000000-0000-4000-8000-000000000004', null, '{}') $$,
  'staff look and put it back');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000004', 'exam_content') $$,
  'another trusted member reports it again');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000004', 'spam') $$, 'and a second one');
reset role;
select is((select visibility from public.board_posts where id = '10000000-0000-4000-8000-000000000004'), 'visible',
  'a reviewed post isn''t hidden again by one report, or two');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000004', 'spam') $$, 'a third trusted member reports it');
reset role;
select is((select row(visibility, hold_reason)::text from public.board_posts where id = '10000000-0000-4000-8000-000000000004'), '(hidden,reports)',
  'three trusted reporters hide even a reviewed post');

-- A trusted reporter whose account is under 7 days old doesn't count toward the three.
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000010', 'spam');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}';
insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000010', 'spam');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e4","role":"authenticated"}';
insert into public.ugc_reports (target_kind, target_id, reason) values ('post', '10000000-0000-4000-8000-000000000010', 'spam');
reset role;
select is((select visibility from public.board_posts where id = '10000000-0000-4000-8000-000000000010'), 'visible',
  'a third reporter whose account is 3 days old doesn''t make three');

-- ── CR N4: member reports, dismissed by the queue's id ─────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('member', '30000000-0000-4000-8000-00000000000c', 'abuse') $$,
  'R3 reports a member by their public id');
select throws_ok($$ insert into public.ugc_reports (target_kind, target_id, reason) values ('member', '30000000-0000-4000-8000-0000000000e3', 'spam') $$,
  '42501', 'forbidden', 'nobody reports themselves');
set local role service_role;
select ok((select bool_or(i ->> 'kind' = 'member' and i ->> 'id' = '30000000-0000-4000-8000-00000000000c' and i ->> 'handle' = 'Calm Ash 3')
           from jsonb_array_elements(public.svc_staff_queue('00000000-0000-4000-8000-000000000005', 'reported') -> 'items') i),
  'the queue lists the member report with their name');
select throws_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'dismiss', 'report', '30000000-0000-4000-8000-00000000000c', null, '{}') $$,
  '22023', 'invalid', 'dismiss needs the kind of thing reported');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'dismiss', 'report', '30000000-0000-4000-8000-00000000000c', null, '{"kind":"member"}') $$,
  'staff dismiss it with the queue''s id');
select is((select count(*)::int from public.ugc_reports where target_id = '30000000-0000-4000-8000-00000000000c' and status = 'open'), 0,
  'no open report on that member is left');

-- ── CR N5 / SEC N5: deleting a reported post closes its reports ────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated"}';
select lives_ok($$ insert into public.ugc_reports (target_kind, target_id, reason, note) values ('post', '10000000-0000-4000-8000-000000000009', 'abuse', 'harasses B') $$,
  'R2 reports C''s post with a note');
reset role;
delete from public.board_posts where id = '10000000-0000-4000-8000-000000000009';
select is((select row(status, snapshot, note)::text from public.ugc_reports where target_id = '10000000-0000-4000-8000-000000000009'),
  '(actioned,,)', 'its report is closed, and neither the reported words nor the note stay behind');

-- ── CR N1: the team's name shows on a learner's own post in 'author_staff' ─
set local role service_role;
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'official', 'post', '10000000-0000-4000-8000-000000000003', null, '{"body":"We are on it."}') $$,
  'the team answers A''s post');
reset role;
insert into public.board_comments (post_id, author_id, body) values ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000005', 'A plain staff comment');
update public.board_settings set read_scope = 'author_staff';
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select ok((select bool_and(c ->> 'authorHandle' = 'Calm Birch 1' and (c ->> 'isTeam')::boolean)
           from jsonb_array_elements(public.board_post('10000000-0000-4000-8000-000000000003') -> 'comments') c),
  'author_staff: A sees the team''s name and badge on both staff comments');
reset role;
update public.board_settings set read_scope = 'signed_in';

-- ── CR N2: your own withdrawn or removed comments don't come back ──
insert into public.board_comments (id, post_id, author_id, body, visibility) values
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'A''s comment A will withdraw', 'visible'),
  ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'A''s removed comment', 'removed'),
  ('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a', 'A''s comment waiting', 'pending');
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select lives_ok($$ update public.board_comments set visibility = 'withdrawn' where id = '20000000-0000-4000-8000-000000000011' $$, 'A withdraws a comment');
select is((select string_agg(c ->> 'body', ',' order by c ->> 'body')
           from jsonb_array_elements(public.board_post('10000000-0000-4000-8000-000000000001') -> 'comments') c
           where c ->> 'authorId' = '30000000-0000-4000-8000-00000000000a'), 'A''s comment waiting',
  'A sees their waiting comment, but not the withdrawn or the removed one');
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}';
select is((select count(*)::int from jsonb_array_elements(public.board_post('10000000-0000-4000-8000-000000000001') -> 'comments') c
           where c ->> 'authorId' = '30000000-0000-4000-8000-00000000000a'), 0, 'another learner sees none of the three');

-- ── SEC N3: an item its author withdrew stays withdrawn ────────────
set local request.jwt.claims to '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
select lives_ok($$ update public.board_posts set visibility = 'withdrawn' where id = '10000000-0000-4000-8000-000000000006' $$, 'A withdraws a post');
set local role service_role;
select throws_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'restore', 'post', '10000000-0000-4000-8000-000000000006', null, '{}') $$,
  'P0002', 'not_found', 'staff can''t put back a post its author withdrew');
select throws_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'approve', 'post', '10000000-0000-4000-8000-000000000006', null, '{}') $$,
  'P0002', 'not_found', 'nor approve it');

-- ── CR N12: a post about a practice question's answer is folded ────
-- (The writer runs in its own statement: one statement can't see rows its own function call wrote.)
create temporary table written (k text, r jsonb);
grant all on written to service_role;
insert into written select 'content', public.svc_board_write('00000000-0000-4000-8000-0000000000e1', 'post', null, 'content',
  'About the answer to a practice question', 'It says B.', 'q:d1_001', null, null);
insert into written select 'flagged', public.svc_board_write('00000000-0000-4000-8000-0000000000e1', 'post', null, 'idea',
  'The answer here seems wrong to me', '', null, null, null, 'cisa', null, true);
select ok((select p.discusses_answer from public.board_posts p join written w on p.id = (w.r ->> 'id')::uuid where w.k = 'content'),
  'a Content post that links a practice question is folded');
select ok((select p.discusses_answer from public.board_posts p join written w on p.id = (w.r ->> 'id')::uuid where w.k = 'flagged'),
  'so is one board-submit''s answer-talk check flagged');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'spoiler', 'post',
                    (select id from public.board_posts where title = 'The answer here seems wrong to me'), null, '{"on":false}') $$, 'staff can unfold it');
select ok(not (select discusses_answer from public.board_posts where title = 'The answer here seems wrong to me'), 'it is unfolded');

-- ── QA BUG-1: the same draft sent twice is one post ────────────────
select is((public.svc_board_write('00000000-0000-4000-8000-0000000000e3', 'post', null, 'idea', 'Bigger text on the results screen', '', null, null, null,
           'cisa', '40000000-0000-4000-8000-000000000001')) ->> 'id',
          (public.svc_board_write('00000000-0000-4000-8000-0000000000e3', 'post', null, 'idea', 'Bigger text on the results screen', '', null, null, null,
           'cisa', '40000000-0000-4000-8000-000000000001')) ->> 'id',
  'sending the same draft again returns the first post');
select is((select count(*)::int from public.board_posts where author_id = '00000000-0000-4000-8000-0000000000e3' and title = 'Bigger text on the results screen'), 1,
  'and makes no second post');
reset role;
select is((select count(*)::int from private.board_events where user_id = '00000000-0000-4000-8000-0000000000e3' and kind = 'post'), 1,
  'nor counts against the post limit twice');

-- ── SEC S6: refused texts aren't free ──────────────────────────────
reset role;
insert into private.board_events (user_id, kind) select '00000000-0000-4000-8000-00000000000c', 'attempt' from generate_series(1, 30);
set local role service_role;
select throws_ok($$ select public.svc_board_attempt('00000000-0000-4000-8000-00000000000c') $$, 'P0001', 'rate_limited',
  'the 31st write attempt in an hour is refused, whatever the filters would say');
select lives_ok($$ select public.svc_board_attempt('00000000-0000-4000-8000-0000000000e2') $$, 'another learner''s attempt is counted on its own');
set local role authenticated;
select throws_ok($$ select public.svc_board_attempt('00000000-0000-4000-8000-0000000000e2') $$, '42501', null, 'learners can''t call the counter');

-- ── CR nit 6: a merge brings no second official response ───────────
set local role service_role;
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'official', 'post', '10000000-0000-4000-8000-000000000008', null, '{"body":"Merged soon."}') $$,
  'the duplicate has an official response');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'official', 'post', '10000000-0000-4000-8000-000000000001', null, '{"body":"On our list."}') $$,
  'so does the original');
select lives_ok($$ select public.svc_staff_act('00000000-0000-4000-8000-000000000005', 'merge', 'post', '10000000-0000-4000-8000-000000000008', null,
                    '{"into":"10000000-0000-4000-8000-000000000001"}') $$, 'staff merge them');
reset role;
select is((select count(*)::int from public.board_comments where post_id = '10000000-0000-4000-8000-000000000001' and is_official), 1,
  'the original keeps one official response');

select * from finish();
rollback;
