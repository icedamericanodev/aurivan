-- Aurivan: the feedback board (Uplift Phase 8). NOT APPLIED ANYWHERE.
-- Spec PHASE6_8.md §4.4 and its 12 Oct addendum. Append-only from the first
-- `supabase db push` (Phase 9, owner go-ahead).
--
-- Security model in plain English:
--  * RLS is ON for every table. App roles get only the columns they need
--    (column grants), so nobody reads another member's standing, trust, hold
--    reason, report count or moderation dates.
--  * WHO CAN READ the board is ONE value: public.board_settings.read_scope
--    (an open Phase 9 owner decision):
--      'signed_in'    (the default) every signed-in learner reads visible posts;
--      'author_staff' a learner reads only their own posts (and staff replies);
--      'everyone'     signed-out readers too (spec B1).
--    Switching is one line:  update public.board_settings set read_scope = 'author_staff';
--    Whatever the scope, an author always reads their own posts and staff read
--    everything. The app only adapts its words to the scope; the policies
--    below decide.
--  * Posts and comments are WRITTEN only by the `board-submit` Edge Function
--    (service role) after the filters and the leak guard, through
--    public.svc_board_write. Learners have no insert grant on them; their one
--    direct change is withdrawing their own (a trigger allows nothing else).
--  * Votes, follows, reports, blocks, appeals, read marks and the member row
--    are written directly by learners, own rows only, and need the Terms
--    (a profile row) and a member row in good standing. Counters, thresholds
--    and notices are triggers.
--  * Rate limits count in private.board_events, OUTSIDE the rows, so deleting
--    and re-adding (a vote, a block) can't reset them: deletes are counted
--    too, and never refused (security review P7 S1).
--  * Staff status comes ONLY from private.staff (never user_metadata). Staff
--    act through the `staff-action` Edge Function (service role), which calls
--    private.staff_act; every action is logged with its actor and reason.
--  * Helpers with elevated rights live in schema private with search_path ''.
--    App roles still have NO usage on schema private: a policy calls a helper
--    by its stored id, which needs only EXECUTE, and only two helpers have it
--    (private.is_staff and private.is_active_member, for authenticated; anon
--    executes nothing). Every other private function is revoked from public.
--  * board_settings.posting_open is a PAUSE valve (staff "Pause posting"). It
--    can stop new posts and comments in an app that already has the board; it
--    can never turn a feature on.
--  * Deleting an account cascades everything here (owner decision §9 #5), and
--    nulls the reporter on reports the learner made about others.

-- ── Staff ───────────────────────────────────────────────────────────
create table private.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('moderator', 'admin')),
  created_at timestamptz not null default now()
);
alter table private.staff enable row level security;   -- no policies: deny all but the owner and service_role
grant select on private.staff to service_role;

-- Is the signed-in learner staff? (policy helper: authenticated only)
create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as
$$ select exists (select 1 from private.staff s where s.user_id = (select auth.uid())) $$;

-- The role this statement runs as (inside a definer function current_user is
-- the owner, but the session's role setting is still the caller's).
create function private.app_role() returns text
language sql stable set search_path = '' as
$$ select coalesce(nullif(current_setting('role', true), 'none'), 'owner') $$;

-- ── Board-wide settings (a singleton) ───────────────────────────────
create table public.board_settings (
  id boolean primary key default true check (id),
  posting_open boolean not null default true,                       -- staff "Pause posting"
  guidelines_version text not null default '2026-11' check (guidelines_version ~ '^\d{4}-\d{2}$'),
  read_scope text not null default 'signed_in' check (read_scope in ('everyone', 'signed_in', 'author_staff')),
  updated_at timestamptz not null default now()
);
insert into public.board_settings default values;
alter table public.board_settings enable row level security;
revoke all on public.board_settings from anon, authenticated;
grant select on public.board_settings to anon, authenticated;
grant select, update on public.board_settings to service_role;
create policy board_settings_read on public.board_settings for select to anon, authenticated using (true);

-- ── Members (public handle, consent, standing) ─────────────────────
create table public.board_members (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  handle text not null check (handle ~ '^[A-Za-z][A-Za-z0-9 ._''-]{2,23}$' and handle !~ '  '),
  handle_kind text not null default 'pseudonym' check (handle_kind in ('pseudonym', 'chosen')),
  guidelines_version text not null check (guidelines_version ~ '^\d{4}-\d{2}$'),
  guidelines_accepted_at timestamptz not null default now(),
  standing text not null default 'active' check (standing in ('active', 'limited', 'suspended', 'banned')),
  standing_until timestamptz,
  standing_changed_at timestamptz,
  approved_posts int not null default 0 check (approved_posts >= 0),
  is_team boolean not null default false,                -- set from private.staff by a trigger
  handle_changed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index board_members_handle_uq on public.board_members (lower(handle));
alter table public.board_members enable row level security;
revoke all on public.board_members from anon, authenticated;
-- Column grants: nobody reads another member's standing, trust or consent dates.
-- A learner's OWN full row comes from board-submit { op: 'me' } (service role).
grant select (user_id, handle, is_team, created_at) on public.board_members to anon, authenticated;
grant insert (handle, handle_kind, guidelines_version) on public.board_members to authenticated;
grant update (handle, handle_kind, guidelines_version) on public.board_members to authenticated;
grant select, insert, update, delete on public.board_members to service_role;
create policy members_read_anon on public.board_members for select to anon
  using (exists (select 1 from public.board_settings s where s.read_scope = 'everyone'));
create policy members_read on public.board_members for select to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.board_settings s where s.read_scope in ('everyone', 'signed_in'))
         or (select private.is_staff()));
-- Joining needs the Terms and the "16 or older" box (a profile row: Phase 6 review N10).
create policy members_insert on public.board_members for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.profiles p where p.id = (select auth.uid())));
create policy members_update on public.board_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Can the signed-in learner vote and follow? A member in good standing (a
-- limit or suspension that has run out counts as good again).
create function private.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.board_members m
    where m.user_id = (select auth.uid())
      and (m.standing = 'active'
           or (m.standing in ('limited', 'suspended') and m.standing_until < now())))
$$;

-- ── Posts ───────────────────────────────────────────────────────────
create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,   -- §9 decision: cascade
  cert_id text not null default 'cisa' check (cert_id ~ '^[a-z0-9-]{2,20}$'),
  kind text not null check (kind in ('content', 'idea', 'app', 'question')),
  title text not null check (char_length(btrim(title)) between 8 and 100),
  body text not null default '' check (char_length(body) <= 2000),
  item_ref text check (item_ref ~ '^(q|note|lesson|card|app):[A-Za-z0-9_.:#-]{1,80}$'),
  discusses_answer boolean not null default false,
  status text not null default 'open' check (status in
    ('open', 'under_review', 'planned', 'in_progress', 'shipped', 'answered', 'not_planned', 'duplicate')),
  status_note text check (char_length(status_note) <= 500),
  shipped_in text check (shipped_in ~ '^\d{1,3}\.\d{1,3}(\.\d{1,3})?$'),
  visibility text not null default 'pending'
    check (visibility in ('pending', 'visible', 'hidden', 'removed', 'withdrawn')),
  hold_reason text check (hold_reason in ('new_member', 'recall', 'hold_words', 'links', 'reports', 'exam_report')),
  mod_reason text check (mod_reason in
    ('exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic')),
  moderated_at timestamptz,                                -- staff-only: when it was removed (appeals: 14 days)
  duplicate_of uuid references public.board_posts (id) on delete set null,
  official_comment_id uuid,
  locked boolean not null default false,
  severity smallint check (severity between 0 and 50),     -- staff-only (priority, support §11.2)
  reach smallint check (reach between 0 and 25),           -- staff-only
  vote_count int not null default 0,
  comment_count int not null default 0,
  report_count int not null default 0,
  search tsvector generated always as (to_tsvector('simple', title || ' ' || body)) stored,
  created_at timestamptz not null default now(),
  status_changed_at timestamptz,
  edited_at timestamptz,
  constraint not_planned_needs_reason check (status <> 'not_planned' or status_note is not null)
);
create index board_posts_top_idx on public.board_posts (cert_id, visibility, vote_count desc, id);
create index board_posts_new_idx on public.board_posts (cert_id, visibility, created_at desc, id);
create index board_posts_status_idx on public.board_posts (cert_id, visibility, status, status_changed_at desc);
create index board_posts_author_idx on public.board_posts (author_id, created_at desc);
create index board_posts_search_idx on public.board_posts using gin (search);
alter table public.board_posts enable row level security;
revoke all on public.board_posts from anon, authenticated;
grant select (id, author_id, cert_id, kind, title, body, item_ref, discusses_answer, status, status_note,
              shipped_in, visibility, duplicate_of, official_comment_id, locked, vote_count,
              comment_count, search, created_at, status_changed_at, edited_at)
  on public.board_posts to anon, authenticated;            -- no severity/reach/report_count/hold_reason/mod dates
grant update (visibility) on public.board_posts to authenticated;   -- withdraw only (posts_guard)
grant select, insert, update, delete on public.board_posts to service_role;
create policy posts_read_anon on public.board_posts for select to anon
  using (visibility = 'visible'
         and exists (select 1 from public.board_settings s where s.read_scope = 'everyone'));
create policy posts_read on public.board_posts for select to authenticated
  using ((visibility = 'visible'
          and exists (select 1 from public.board_settings s where s.read_scope in ('everyone', 'signed_in')))
         or author_id = (select auth.uid())
         or (select private.is_staff()));
create policy posts_withdraw on public.board_posts for update to authenticated
  using (author_id = (select auth.uid()) and visibility in ('pending', 'visible'))
  with check (author_id = (select auth.uid()));

-- ── Comments (one level of replies) ────────────────────────────────
create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.board_comments (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  is_official boolean not null default false,
  visibility text not null default 'visible'
    check (visibility in ('pending', 'visible', 'hidden', 'removed', 'withdrawn')),
  hold_reason text check (hold_reason in ('new_member', 'recall', 'hold_words', 'links', 'reports', 'exam_report')),
  mod_reason text check (mod_reason in
    ('exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic')),
  moderated_at timestamptz,
  report_count int not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index board_comments_post_idx on public.board_comments (post_id, created_at);
create index board_comments_author_idx on public.board_comments (author_id, created_at desc);
alter table public.board_posts add constraint board_posts_official_fk
  foreign key (official_comment_id) references public.board_comments (id) on delete set null;
alter table public.board_comments enable row level security;
revoke all on public.board_comments from anon, authenticated;
grant select (id, post_id, author_id, parent_id, body, is_official, visibility, created_at, edited_at)
  on public.board_comments to anon, authenticated;
grant update (visibility) on public.board_comments to authenticated;   -- withdraw only (comments_guard_upd)
grant select, insert, update, delete on public.board_comments to service_role;
-- A visible comment is readable where its post is (the board_posts policies apply inside the subquery).
create policy comments_read_anon on public.board_comments for select to anon
  using (visibility = 'visible'
         and exists (select 1 from public.board_posts p where p.id = post_id and p.visibility = 'visible'));
create policy comments_read on public.board_comments for select to authenticated
  using ((visibility = 'visible'
          and exists (select 1 from public.board_posts p where p.id = post_id and p.visibility = 'visible'))
         or author_id = (select auth.uid())
         or (select private.is_staff()));
create policy comments_withdraw on public.board_comments for update to authenticated
  using (author_id = (select auth.uid()) and visibility in ('pending', 'visible'))
  with check (author_id = (select auth.uid()));

-- ── Votes, follows (own rows only; private) ────────────────────────
create table public.board_votes (
  post_id uuid not null references public.board_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index board_votes_user_idx on public.board_votes (user_id);
create table public.board_follows (
  post_id uuid not null references public.board_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index board_follows_user_idx on public.board_follows (user_id);
alter table public.board_votes enable row level security;
alter table public.board_follows enable row level security;
revoke all on public.board_votes, public.board_follows from anon, authenticated;
grant select, delete on public.board_votes, public.board_follows to authenticated;
grant insert (post_id) on public.board_votes, public.board_follows to authenticated;
grant select, insert, delete on public.board_votes, public.board_follows to service_role;
-- A vote needs a member in good standing, on a post the learner can see that is visible and unlocked.
create policy votes_select on public.board_votes for select to authenticated using (user_id = (select auth.uid()));
create policy votes_insert on public.board_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_active_member())
              and exists (select 1 from public.board_posts p where p.id = post_id
                          and p.visibility = 'visible' and not p.locked));
create policy votes_delete on public.board_votes for delete to authenticated using (user_id = (select auth.uid()));
create policy follows_select on public.board_follows for select to authenticated using (user_id = (select auth.uid()));
create policy follows_insert on public.board_follows for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.board_members m where m.user_id = (select auth.uid()))
              and exists (select 1 from public.board_posts p where p.id = post_id));
create policy follows_delete on public.board_follows for delete to authenticated using (user_id = (select auth.uid()));

-- ── Status history (readable wherever its post is) ─────────────────
create table public.board_status_events (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.board_posts (id) on delete cascade,
  from_status text,
  to_status text not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()          -- no actor here; the actor is in the private log
);
create index board_status_events_post_idx on public.board_status_events (post_id, created_at);
alter table public.board_status_events enable row level security;
revoke all on public.board_status_events from anon, authenticated;
grant select on public.board_status_events to anon, authenticated;
grant select, insert on public.board_status_events to service_role;
create policy status_read_anon on public.board_status_events for select to anon
  using (exists (select 1 from public.board_posts p where p.id = post_id and p.visibility = 'visible'));
create policy status_read on public.board_status_events for select to authenticated
  using (exists (select 1 from public.board_posts p where p.id = post_id));

-- ── In-app notices (no push) ────────────────────────────────────────
create table public.board_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('status', 'official', 'reply', 'removed', 'warned', 'suspended', 'appeal')),
  post_id uuid references public.board_posts (id) on delete cascade,
  comment_id uuid references public.board_comments (id) on delete set null,
  reason text check (reason in ('exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic')),
  by_person boolean,                                       -- removed: a person reviewed it (true) or the filter (false)
  outcome text check (outcome in ('upheld', 'restored')),  -- appeal outcome
  until_at timestamptz,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index board_notifications_user_idx on public.board_notifications (user_id, created_at desc);
alter table public.board_notifications enable row level security;
revoke all on public.board_notifications from anon, authenticated;
grant select on public.board_notifications to authenticated;
grant update (read_at) on public.board_notifications to authenticated;
grant select, insert on public.board_notifications to service_role;
create policy notif_select on public.board_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notif_update on public.board_notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Reports, blocks, appeals ───────────────────────────────────────
create table public.ugc_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  target_kind text not null check (target_kind in ('post', 'comment', 'member')),
  target_id uuid not null,
  reason text not null check (reason in
    ('exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic', 'other')),
  note text check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  unique (reporter_id, target_kind, target_id)
);
create index ugc_reports_open_idx on public.ugc_reports (status, created_at);
create index ugc_reports_target_idx on public.ugc_reports (target_kind, target_id);
alter table public.ugc_reports enable row level security;
revoke all on public.ugc_reports from anon, authenticated;
grant select (id, target_kind, target_id, reason, status, created_at) on public.ugc_reports to authenticated;
grant insert (target_kind, target_id, reason, note) on public.ugc_reports to authenticated;
grant select, update on public.ugc_reports to service_role;
create policy reports_select on public.ugc_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy reports_insert on public.ugc_reports for insert to authenticated
  with check (reporter_id = (select auth.uid())
              and exists (select 1 from public.profiles p where p.id = (select auth.uid())));

create table public.member_blocks (
  blocker_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index member_blocks_blocked_idx on public.member_blocks (blocked_id);
alter table public.member_blocks enable row level security;
revoke all on public.member_blocks from anon, authenticated;
grant select, delete on public.member_blocks to authenticated;
grant insert (blocked_id) on public.member_blocks to authenticated;
grant select on public.member_blocks to service_role;
create policy blocks_select on public.member_blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy blocks_insert on public.member_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid())
              and exists (select 1 from public.profiles p where p.id = (select auth.uid())));
create policy blocks_delete on public.member_blocks for delete to authenticated using (blocker_id = (select auth.uid()));

-- Has `p_owner` blocked `p_member`? Definer: the member can't read the
-- owner's blocks under RLS. Server-side only (board-submit and the comment
-- trigger): no app role may execute it (addendum: revoked from public).
create function private.is_blocked_by(p_owner uuid, p_member uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.member_blocks b where b.blocker_id = p_owner and b.blocked_id = p_member)
$$;

create table public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'comment', 'standing')),
  target_id uuid not null,
  note text check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'upheld', 'restored')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (user_id, target_kind, target_id)
);
create index moderation_appeals_open_idx on public.moderation_appeals (status, created_at);
alter table public.moderation_appeals enable row level security;
revoke all on public.moderation_appeals from anon, authenticated;
grant select on public.moderation_appeals to authenticated;
grant insert (target_kind, target_id, note) on public.moderation_appeals to authenticated;
grant select, update on public.moderation_appeals to service_role;
create policy appeals_select on public.moderation_appeals for select to authenticated using (user_id = (select auth.uid()));
create policy appeals_insert on public.moderation_appeals for insert to authenticated
  with check (user_id = (select auth.uid()));       -- appeals_guard: own removed item, within 14 days

-- ── Private: audit log, filter terms, rate events ──────────────────
create table private.moderation_log (
  id bigint generated always as identity primary key,
  actor_id uuid,                        -- null = automatic (filter, threshold)
  action text not null check (action in ('hold', 'approve', 'hide', 'remove', 'restore', 'warn', 'limit', 'suspend',
    'ban', 'unban', 'status', 'official', 'merge', 'lock', 'unlock', 'delete_exam_content', 'pause', 'reopen',
    'appeal', 'uphold', 'dismiss')),
  target_kind text,
  target_id uuid,
  reason text check (char_length(reason) <= 40),
  detail text check (char_length(detail) <= 500),      -- never the learner's text
  at timestamptz not null default now()
);
create index moderation_log_at_idx on private.moderation_log (at desc);
create index moderation_log_target_idx on private.moderation_log (target_id);
alter table private.moderation_log enable row level security;
grant select, insert on private.moderation_log to service_role;

create table private.moderation_terms (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('block', 'hold', 'reserved_handle', 'link_domain')),
  -- A plain word or phrase (never a pattern, so a term can't slow the server down).
  term text not null check (char_length(term) between 2 and 80 and term = lower(term)),
  created_at timestamptz not null default now(),
  unique (kind, term)
);
alter table private.moderation_terms enable row level security;
grant select on private.moderation_terms to service_role;

-- Every rate-limited act, one row each, kept 2 days. Counted per user and
-- kind over the last hour and day; a delete is a row too.
create table private.board_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('post', 'comment', 'edit', 'vote', 'follow', 'report', 'block')),
  at timestamptz not null default now()
);
create index board_events_user_idx on private.board_events (user_id, kind, at desc);
alter table private.board_events enable row level security;

-- Defence in depth: nothing in private is reachable by an app role.
revoke all on all tables in schema private from anon, authenticated;
revoke all on all sequences in schema private from anon, authenticated;

-- ── Private helpers ─────────────────────────────────────────────────
-- Take one rate-limited act: refused (rate_limited) when the user already
-- has `p_hour` acts of this kind in the last hour or `p_day` in the last day
-- (null = no limit there). `p_refuse` false records without refusing (a
-- delete). One user's acts of one kind are counted one at a time (an
-- advisory lock), so two at once can't both slip under the limit.
create function private.board_take(p_user uuid, p_kind text, p_hour int, p_day int, p_refuse boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_hour int;
  v_day int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || p_kind, 8));
  if p_refuse then
    select count(*) filter (where e.at > now() - interval '1 hour'), count(*)
      into v_hour, v_day
      from private.board_events e
     where e.user_id = p_user and e.kind = p_kind and e.at > now() - interval '1 day';
    if (p_hour is not null and v_hour >= p_hour) or (p_day is not null and v_day >= p_day) then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;
  insert into private.board_events (user_id, kind) values (p_user, p_kind);
  delete from private.board_events e where e.user_id = p_user and e.at < now() - interval '2 days';
end $$;

-- Is the account younger than a day? (stricter limits for brand-new accounts)
create function private.account_is_new(p_user uuid, p_age interval default interval '24 hours') returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select u.created_at > now() - p_age from auth.users u where u.id = p_user), true)
$$;

-- One in-app notice.
create function private.notify(p_user uuid, p_kind text, p_post uuid, p_comment uuid default null,
  p_reason text default null, p_by_person boolean default null, p_outcome text default null,
  p_until timestamptz default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.board_notifications (user_id, kind, post_id, comment_id, reason, by_person, outcome, until_at)
  select p_user, p_kind, p_post, p_comment, p_reason, p_by_person, p_outcome, p_until
   where p_user is not null;
$$;

-- A notice to a post's author and followers, once each, never to `p_except` (who caused it).
create function private.notify_post(p_post uuid, p_kind text, p_except uuid, p_comment uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.board_notifications (user_id, kind, post_id, comment_id)
  select distinct u, p_kind, p_post, p_comment
    from (select p.author_id as u from public.board_posts p where p.id = p_post
          union select f.user_id from public.board_follows f where f.post_id = p_post) w
   where u is distinct from p_except;
$$;

-- ── Triggers ────────────────────────────────────────────────────────
-- Posts: an app role may only withdraw its own pending or visible post
-- (RLS can't see OLD, so this closes "update anything I can see"). Anything
-- else from anon or authenticated is `forbidden` (42501). The service role
-- and staff actions change the rest, and so do this file's own triggers (a
-- vote's count: those updates run one trigger level deeper, so
-- pg_trigger_depth() > 1; a learner's own statement is always depth 1).
-- Also stamps a status change.
create function private.posts_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.app_role() in ('anon', 'authenticated') and pg_trigger_depth() = 1 then
    if new.visibility <> 'withdrawn' or old.visibility not in ('pending', 'visible')
       or (to_jsonb(new) - 'visibility' - 'search') is distinct from (to_jsonb(old) - 'visibility' - 'search') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end $$;
create trigger posts_guard before update on public.board_posts
  for each row execute function private.posts_guard();

-- Posts, after a change: the status history and its notices, and the official response's notice.
create function private.posts_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.board_status_events (post_id, from_status, to_status, note)
      values (new.id, old.status, new.status, new.status_note);
    perform private.notify_post(new.id, 'status', null);
  end if;
  if new.official_comment_id is not null and new.official_comment_id is distinct from old.official_comment_id then
    perform private.notify_post(new.id, 'official', null, new.official_comment_id);
  end if;
  return null;
end $$;
create trigger posts_after after update on public.board_posts
  for each row execute function private.posts_after();

-- Comments, before insert (the service role writes them): one level of
-- replies, on a visible and unlocked post, never from someone the post's
-- author blocked, and "official" only from staff.
create function private.comments_guard_ins() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_post public.board_posts%rowtype;
  v_staff boolean := exists (select 1 from private.staff s where s.user_id = new.author_id);
begin
  select * into v_post from public.board_posts p where p.id = new.post_id;
  -- Staff may still answer on a locked post (the official response).
  if not found or v_post.visibility <> 'visible' or (v_post.locked and not v_staff) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if new.parent_id is not null and not exists (
       select 1 from public.board_comments c where c.id = new.parent_id and c.post_id = new.post_id and c.parent_id is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if private.is_blocked_by(v_post.author_id, new.author_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  new.is_official := new.is_official and v_staff;
  return new;
end $$;
create trigger comments_guard_ins before insert on public.board_comments
  for each row execute function private.comments_guard_ins();

-- Comments, before update: an app role may only withdraw its own (as posts_guard).
create function private.comments_guard_upd() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.app_role() in ('anon', 'authenticated') and pg_trigger_depth() = 1 then
    if new.visibility <> 'withdrawn' or old.visibility not in ('pending', 'visible')
       or (to_jsonb(new) - 'visibility') is distinct from (to_jsonb(old) - 'visibility') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
create trigger comments_guard_upd before update on public.board_comments
  for each row execute function private.comments_guard_upd();

-- Comments, after any change: the post's visible-comment count, the author's
-- follow, and a "reply" notice to the post's author and followers.
create function private.comments_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.board_posts p
       set comment_count = (select count(*) from public.board_comments c where c.post_id = p.id and c.visibility = 'visible')
     where p.id = old.post_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.board_posts p
       set comment_count = (select count(*) from public.board_comments c where c.post_id = p.id and c.visibility = 'visible')
     where p.id = new.post_id and (tg_op = 'INSERT' or new.post_id is distinct from old.post_id or new.visibility is distinct from old.visibility);
  end if;
  if tg_op = 'INSERT' then
    insert into public.board_follows (post_id, user_id) values (new.post_id, new.author_id) on conflict do nothing;
    if new.visibility = 'visible' and not new.is_official then
      perform private.notify_post(new.post_id, 'reply', new.author_id, new.id);
    end if;
  end if;
  return null;
end $$;
create trigger comments_after after insert or update or delete on public.board_comments
  for each row execute function private.comments_after();

-- Votes: 100 a day per learner (a vote taken back counts too, and is never
-- refused), the count moves by exactly one, and voting follows the post.
create function private.votes_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if private.app_role() = 'authenticated' then
      perform private.board_take(new.user_id, 'vote', null, 100, true);
    end if;
    update public.board_posts set vote_count = vote_count + 1 where id = new.post_id;
    insert into public.board_follows (post_id, user_id) values (new.post_id, new.user_id) on conflict do nothing;
    return null;
  end if;
  update public.board_posts set vote_count = greatest(vote_count - 1, 0) where id = old.post_id;
  -- Counted unless the account itself is going (the cascade).
  if private.app_role() = 'authenticated' and exists (select 1 from auth.users u where u.id = old.user_id) then
    perform private.board_take(old.user_id, 'vote', null, null, false);
  end if;
  return null;
end $$;
create trigger votes_after after insert or delete on public.board_votes
  for each row execute function private.votes_after();

-- Follows: 200 changes a day per learner (deletes count, never refused).
create function private.follows_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.app_role() = 'authenticated' then
    if tg_op = 'INSERT' then
      perform private.board_take(new.user_id, 'follow', null, 200, true);
    elsif exists (select 1 from auth.users u where u.id = old.user_id) then
      perform private.board_take(old.user_id, 'follow', null, null, false);
    end if;
  end if;
  return null;
end $$;
create trigger follows_after after insert or delete on public.board_follows
  for each row execute function private.follows_after();

-- Reports, before insert: a real target the reporter can see (a visible post
-- or comment, or a member), never yourself.
create function private.reports_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.target_kind = 'post' and not exists (
       select 1 from public.board_posts p where p.id = new.target_id and p.visibility = 'visible' and p.author_id <> new.reporter_id) then
    raise exception 'forbidden' using errcode = '42501';
  elsif new.target_kind = 'comment' and not exists (
       select 1 from public.board_comments c where c.id = new.target_id and c.visibility = 'visible' and c.author_id <> new.reporter_id) then
    raise exception 'forbidden' using errcode = '42501';
  elsif new.target_kind = 'member' and (new.target_id = new.reporter_id or not exists (
       select 1 from public.board_members m where m.user_id = new.target_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger reports_guard before insert on public.ugc_reports
  for each row execute function private.reports_guard();

-- Reports, after insert: 10 a day (3 for an account under a day old). The
-- target's report count goes up. "Shares real exam content" hides it for
-- everyone at once; otherwise 3 different reporters, each with an account
-- at least 7 days old, hide it. Automatic hides are logged.
create function private.reports_after() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_verified int;
  v_hide text;
begin
  perform private.board_take(new.reporter_id, 'report', null,
    case when private.account_is_new(new.reporter_id) then 3 else 10 end, true);
  if new.target_kind = 'member' then
    return null;
  end if;
  select count(distinct r.reporter_id) into v_verified
    from public.ugc_reports r join auth.users u on u.id = r.reporter_id
   where r.target_kind = new.target_kind and r.target_id = new.target_id and r.status = 'open'
     and u.created_at <= now() - interval '7 days';
  v_hide := case when new.reason = 'exam_content' then 'exam_report' when v_verified >= 3 then 'reports' end;
  if new.target_kind = 'post' then
    update public.board_posts
       set report_count = report_count + 1,
           visibility = case when v_hide is not null and visibility = 'visible' then 'hidden' else visibility end,
           hold_reason = case when v_hide is not null and visibility = 'visible' then v_hide else hold_reason end
     where id = new.target_id;
  else
    update public.board_comments
       set report_count = report_count + 1,
           visibility = case when v_hide is not null and visibility = 'visible' then 'hidden' else visibility end,
           hold_reason = case when v_hide is not null and visibility = 'visible' then v_hide else hold_reason end
     where id = new.target_id;
  end if;
  if v_hide is not null then
    insert into private.moderation_log (actor_id, action, target_kind, target_id, reason)
      values (null, 'hide', new.target_kind, new.target_id, v_hide);
  end if;
  return null;
end $$;
create trigger reports_after after insert on public.ugc_reports
  for each row execute function private.reports_after();

-- Blocks: at most 500 per learner, 100 changes a day (deletes count), and
-- never a staff member (a learner can't hide moderation from themselves).
create function private.blocks_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if private.app_role() = 'authenticated' and exists (select 1 from auth.users u where u.id = old.blocker_id) then
      perform private.board_take(old.blocker_id, 'block', null, null, false);
    end if;
    return old;
  end if;
  if exists (select 1 from private.staff s where s.user_id = new.blocked_id)
     or (select count(*) from public.member_blocks b where b.blocker_id = new.blocker_id) >= 500 then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform private.board_take(new.blocker_id, 'block', null, 100, true);
  return new;
end $$;
create trigger blocks_guard before insert or delete on public.member_blocks
  for each row execute function private.blocks_guard();

-- Appeals: only your own removed post or comment, or your own standing,
-- within 14 days of the decision. Once per item (the unique key).
create function private.appeals_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.target_kind = 'post' and exists (
       select 1 from public.board_posts p where p.id = new.target_id and p.author_id = new.user_id
          and p.visibility = 'removed' and p.moderated_at > now() - interval '14 days') then
    null;
  elsif new.target_kind = 'comment' and exists (
       select 1 from public.board_comments c where c.id = new.target_id and c.author_id = new.user_id
          and c.visibility = 'removed' and c.moderated_at > now() - interval '14 days') then
    null;
  elsif new.target_kind = 'standing' and new.target_id = new.user_id and exists (
       select 1 from public.board_members m where m.user_id = new.user_id and m.standing <> 'active'
          and m.standing_changed_at > now() - interval '14 days') then
    null;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
  new.status := 'open';
  new.decided_at := null;
  insert into private.moderation_log (actor_id, action, target_kind, target_id)
    values (null, 'appeal', new.target_kind, new.target_id);
  return new;
end $$;
create trigger appeals_guard before insert on public.moderation_appeals
  for each row execute function private.appeals_guard();

-- Members: reserved names (the app's list plus private.moderation_terms
-- 'reserved_handle'), words on the block list, one name change a day, and a
-- fresh consent time when the guidelines version changes. Standing and trust
-- never change here except by the service role.
create function private.members_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_words text[];
  v_squashed text;
  v_term text;
begin
  -- Folded like the app's checkHandle: lower case, digits read as letters.
  v_words := regexp_split_to_array(translate(lower(new.handle), '013457', 'oieast'), '[^a-z]+');
  v_squashed := array_to_string(v_words, '');
  foreach v_term in array array['aurivan', 'isaca', 'cisa', 'cism', 'crisc', 'cgeit', 'admin', 'moderator', 'mod',
                                 'team', 'support', 'official', 'staff'] loop
    if (length(v_term) <= 4 and (v_term = any (v_words) or v_squashed = v_term))
       or (length(v_term) > 4 and position(v_term in v_squashed) > 0) then
      raise exception 'reserved_handle' using errcode = '22023';
    end if;
  end loop;
  -- Staff-added terms: a reserved name anywhere in the name; a blocked word as a whole word.
  for v_term in select t.term from private.moderation_terms t where t.kind = 'reserved_handle' loop
    if position(regexp_replace(v_term, '[^a-z]', '', 'g') in v_squashed) > 0 then
      raise exception 'reserved_handle' using errcode = '22023';
    end if;
  end loop;
  for v_term in select t.term from private.moderation_terms t where t.kind = 'block' loop
    if (' ' || array_to_string(v_words, ' ') || ' ') like ('% ' || v_term || ' %') then
      raise exception 'reserved_handle' using errcode = '22023';
    end if;
  end loop;
  if tg_op = 'UPDATE' then
    if private.app_role() in ('anon', 'authenticated') and pg_trigger_depth() = 1 then
      new.standing := old.standing; new.standing_until := old.standing_until;
      new.standing_changed_at := old.standing_changed_at; new.approved_posts := old.approved_posts;
      new.is_team := old.is_team; new.created_at := old.created_at; new.user_id := old.user_id;
    end if;
    if new.handle is distinct from old.handle then
      if old.handle_changed_at > now() - interval '24 hours' then
        raise exception 'rate_limited' using errcode = 'P0001';
      end if;
      new.handle_changed_at := now();
    end if;
    if new.guidelines_version is distinct from old.guidelines_version then
      new.guidelines_accepted_at := now();
    end if;
  else
    new.guidelines_accepted_at := now();
    new.is_team := exists (select 1 from private.staff s where s.user_id = new.user_id);
    if private.app_role() in ('anon', 'authenticated') then
      new.standing := 'active'; new.standing_until := null; new.approved_posts := 0;
    end if;
  end if;
  return new;
end $$;
create trigger members_guard before insert or update on public.board_members
  for each row execute function private.members_guard();

-- Staff changes keep the public "Aurivan team" mark in step.
create function private.staff_mark() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.board_members set is_team = false where user_id = old.user_id;
  else
    update public.board_members set is_team = true where user_id = new.user_id;
  end if;
  return null;
end $$;
create trigger staff_mark after insert or delete on private.staff
  for each row execute function private.staff_mark();

-- ── Server-only: board-submit (the service role, after the filters) ──
-- The learner's own member facts, for board-submit and { op: 'me' }.
-- Returns null when they haven't joined.
create function public.svc_board_member(p_user uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'userId', m.user_id, 'handle', m.handle, 'handleKind', m.handle_kind,
    'guidelinesVersion', m.guidelines_version, 'standing', m.standing,
    'standingUntil', m.standing_until, 'approvedPosts', m.approved_posts, 'isTeam', m.is_team,
    'newAccount', private.account_is_new(m.user_id),
    'postingOpen', s.posting_open, 'currentGuidelines', s.guidelines_version)
  from public.board_members m cross join public.board_settings s
  where m.user_id = p_user
$$;

-- Joins the board (or accepts a new guidelines version, or changes the
-- name) for `p_user`, after board-submit's name check. Needs the Terms (a
-- profile row); members_guard re-checks the name, once-a-day changes and
-- the consent time. Returns the member's own facts.
create function public.svc_board_join(p_user uuid, p_handle text, p_kind text, p_version text) returns jsonb
language plpgsql volatile security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_version is distinct from (select s.guidelines_version from public.board_settings s) then
    raise exception 'guidelines' using errcode = 'P0001';
  end if;
  insert into public.board_members as m (user_id, handle, handle_kind, guidelines_version)
    values (p_user, p_handle, p_kind, p_version)
  on conflict (user_id) do update
    set handle = excluded.handle, handle_kind = excluded.handle_kind, guidelines_version = excluded.guidelines_version
    where (m.handle, m.handle_kind, m.guidelines_version) is distinct from
          (excluded.handle, excluded.handle_kind, excluded.guidelines_version);
  return public.svc_board_member(p_user);
end $$;

-- The staff-maintained filter terms, as plain words (board-submit passes them to moderateText).
create function public.svc_moderation_terms() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'block', coalesce(jsonb_agg(t.term) filter (where t.kind = 'block'), '[]'),
    'hold', coalesce(jsonb_agg(t.term) filter (where t.kind = 'hold'), '[]'),
    'reserved', coalesce(jsonb_agg(t.term) filter (where t.kind = 'reserved_handle'), '[]'),
    'linkDomains', coalesce(jsonb_agg(t.term) filter (where t.kind = 'link_domain'), '[]'))
  from private.moderation_terms t
$$;

-- Writes a post or comment for `p_user` AFTER board-submit's filters, leak
-- guard and recall check (its verdict arrives as `p_hold`). Checks again
-- here what only the database knows: the member's standing and consent,
-- "pause posting", the rate limits, the target. Returns { id, visibility,
-- holdReason }. Errors: forbidden (42501), rate_limited / posting_paused /
-- banned / guidelines (P0001), invalid (22023).
--   p_op: 'post' | 'edit_post' | 'comment' | 'edit_comment'
create function public.svc_board_write(
  p_user uuid, p_op text, p_target uuid, p_kind text, p_title text, p_body text,
  p_item_ref text, p_parent uuid, p_hold text, p_cert text default 'cisa')
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_member public.board_members%rowtype;
  v_settings public.board_settings%rowtype;
  v_new boolean;
  v_vis text;
  v_hold text := p_hold;
  v_id uuid;
  v_post public.board_posts%rowtype;
begin
  if p_op not in ('post', 'edit_post', 'comment', 'edit_comment') then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if v_hold is not null and v_hold not in ('recall', 'hold_words', 'links') then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select * into v_settings from public.board_settings;
  select * into v_member from public.board_members m where m.user_id = p_user;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_member.standing = 'banned' then
    raise exception 'banned' using errcode = 'P0001';
  end if;
  if v_member.standing in ('limited', 'suspended') and coalesce(v_member.standing_until > now(), true) then
    raise exception 'banned' using errcode = 'P0001';
  end if;
  if v_member.guidelines_version <> v_settings.guidelines_version then
    raise exception 'guidelines' using errcode = 'P0001';
  end if;
  if not v_settings.posting_open then
    raise exception 'posting_paused' using errcode = 'P0001';
  end if;
  v_new := private.account_is_new(p_user);

  if p_op = 'post' then
    perform private.board_take(p_user, 'post', 3, case when v_new then 1 else 5 end, true);
    -- Until a member has one approved post, their posts wait for a person.
    if v_hold is null and v_member.approved_posts = 0 then
      v_hold := 'new_member';
    end if;
    v_vis := case when v_hold is null then 'visible' else 'pending' end;
    insert into public.board_posts (author_id, cert_id, kind, title, body, item_ref, visibility, hold_reason)
      values (p_user, coalesce(p_cert, 'cisa'), p_kind, p_title, coalesce(p_body, ''), p_item_ref, v_vis, v_hold)
      returning id into v_id;
    insert into public.board_follows (post_id, user_id) values (v_id, p_user) on conflict do nothing;
    if v_hold is not null then
      insert into private.moderation_log (actor_id, action, target_kind, target_id, reason)
        values (null, 'hold', 'post', v_id, v_hold);
    end if;
    return jsonb_build_object('id', v_id, 'visibility', v_vis, 'holdReason', v_hold);
  end if;

  if p_op = 'edit_post' then
    perform private.board_take(p_user, 'edit', null, 30, true);
    select * into v_post from public.board_posts p where p.id = p_target;
    if not found or v_post.author_id <> p_user or v_post.visibility not in ('pending', 'visible') or v_post.locked then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    -- An edit of a post still waiting keeps waiting; a held edit waits again.
    if v_hold is null and v_post.visibility = 'pending' then
      v_hold := coalesce(v_post.hold_reason, 'new_member');
    end if;
    v_vis := case when v_hold is null then 'visible' else 'pending' end;
    update public.board_posts
       set kind = p_kind, title = p_title, body = coalesce(p_body, ''), item_ref = p_item_ref,
           visibility = v_vis, hold_reason = v_hold, edited_at = now()
     where id = p_target;
    if v_hold is not null then
      insert into private.moderation_log (actor_id, action, target_kind, target_id, reason)
        values (null, 'hold', 'post', p_target, v_hold);
    end if;
    return jsonb_build_object('id', p_target, 'visibility', v_vis, 'holdReason', v_hold);
  end if;

  if p_op = 'comment' then
    perform private.board_take(p_user, 'comment', 20, case when v_new then 5 else 30 end, true);
    select * into v_post from public.board_posts p where p.id = p_target;
    if not found or v_post.visibility <> 'visible' or v_post.locked or private.is_blocked_by(v_post.author_id, p_user) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    v_vis := case when v_hold is null then 'visible' else 'pending' end;
    insert into public.board_comments (post_id, author_id, parent_id, body, visibility, hold_reason)
      values (p_target, p_user, p_parent, p_body, v_vis, v_hold)
      returning id into v_id;
    if v_hold is not null then
      insert into private.moderation_log (actor_id, action, target_kind, target_id, reason)
        values (null, 'hold', 'comment', v_id, v_hold);
    end if;
    return jsonb_build_object('id', v_id, 'visibility', v_vis, 'holdReason', v_hold);
  end if;

  -- edit_comment
  perform private.board_take(p_user, 'edit', null, 30, true);
  if not exists (select 1 from public.board_comments c where c.id = p_target and c.author_id = p_user
                  and c.visibility in ('pending', 'visible') and not c.is_official) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_vis := case when v_hold is null then 'visible' else 'pending' end;
  update public.board_comments set body = p_body, visibility = v_vis, hold_reason = v_hold, edited_at = now()
   where id = p_target;
  return jsonb_build_object('id', p_target, 'visibility', v_vis, 'holdReason', v_hold);
end $$;

-- ── Server-only: staff actions (staff-action Edge Function) ────────
-- Every staff action in one place (spec §4.4 B7), logged with the actor and
-- reason. `p_actor` must be in private.staff. Returns the target's new state.
--   post / comment: approve, hide, remove, remove_warn, delete_exam_content, restore
--   post:           status {status, note?, shippedIn?}, official {body}, merge {into}, lock, unlock
--   member:         warn, limit {days?}, suspend {days?}, ban, unban
--   board:          pause, reopen
--   appeal:         uphold, restore_appeal
--   report:         dismiss
create function private.staff_act(p_actor uuid, p_action text, p_kind text, p_target uuid, p_reason text, p_extra jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_author uuid;
  v_prev text;
  v_days int;
  v_until timestamptz;
  v_comment uuid;
  v_into uuid;
  v_appeal public.moderation_appeals%rowtype;
  v_reason text := p_reason;
  v_log_action text := p_action;
begin
  if not exists (select 1 from private.staff s where s.user_id = p_actor) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_reason is not null and v_reason not in
     ('exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic') then
    raise exception 'invalid' using errcode = '22023';
  end if;

  if p_kind in ('post', 'comment') and p_action in ('approve', 'hide', 'remove', 'remove_warn', 'delete_exam_content', 'restore') then
    if p_kind = 'post' then
      select author_id, visibility into v_author, v_prev from public.board_posts where id = p_target for update;
    else
      select author_id, visibility into v_author, v_prev from public.board_comments where id = p_target for update;
    end if;
    if not found then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    if p_action in ('remove', 'remove_warn', 'delete_exam_content') and v_reason is null then
      v_reason := case when p_action = 'delete_exam_content' then 'exam_content' end;
      if v_reason is null then
        raise exception 'invalid' using errcode = '22023';
      end if;
    end if;
    if p_kind = 'post' then
      update public.board_posts set
        visibility = case p_action when 'approve' then 'visible' when 'restore' then 'visible' when 'hide' then 'hidden' else 'removed' end,
        hold_reason = case when p_action in ('approve', 'restore') then null else hold_reason end,
        mod_reason = case when p_action in ('approve', 'restore', 'hide') then null else v_reason end,
        moderated_at = case when p_action in ('remove', 'remove_warn', 'delete_exam_content') then now() else moderated_at end,
        title = case when p_action = 'delete_exam_content' then 'Removed post' else title end,
        body = case when p_action = 'delete_exam_content' then '' else body end
      where id = p_target;
      -- The first approved post lifts the member's pre-moderation.
      if p_action = 'approve' and v_prev = 'pending' then
        update public.board_members set approved_posts = approved_posts + 1 where user_id = v_author;
      end if;
    else
      update public.board_comments set
        visibility = case p_action when 'approve' then 'visible' when 'restore' then 'visible' when 'hide' then 'hidden' else 'removed' end,
        hold_reason = case when p_action in ('approve', 'restore') then null else hold_reason end,
        mod_reason = case when p_action in ('approve', 'restore', 'hide') then null else v_reason end,
        moderated_at = case when p_action in ('remove', 'remove_warn', 'delete_exam_content') then now() else moderated_at end,
        body = case when p_action = 'delete_exam_content' then '-' else body end
      where id = p_target;
    end if;
    update public.ugc_reports set status = case when p_action in ('approve', 'restore') then 'dismissed' else 'actioned' end,
           handled_at = now()
     where target_kind = p_kind and target_id = p_target and status = 'open';
    if p_action in ('remove', 'remove_warn', 'delete_exam_content') then
      perform private.notify(v_author, 'removed', case when p_kind = 'post' then p_target end,
        case when p_kind = 'comment' then p_target end, v_reason, true);
      if p_action in ('remove_warn', 'delete_exam_content') then
        perform private.notify(v_author, 'warned', case when p_kind = 'post' then p_target end,
          case when p_kind = 'comment' then p_target end, v_reason);
        insert into private.moderation_log (actor_id, action, target_kind, target_id, reason)
          values (p_actor, 'warn', 'member', v_author, v_reason);
      end if;
      v_log_action := case when p_action = 'remove_warn' then 'remove' else p_action end;
    end if;

  elsif p_kind = 'post' and p_action = 'status' then
    if not exists (select 1 from public.board_posts where id = p_target) then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    update public.board_posts set
      status = p_extra ->> 'status',
      status_note = nullif(p_extra ->> 'note', ''),
      shipped_in = case when p_extra ->> 'status' = 'shipped' then nullif(p_extra ->> 'shippedIn', '') else shipped_in end
    where id = p_target;
    v_reason := null;

  elsif p_kind = 'post' and p_action = 'official' then
    insert into public.board_comments (post_id, author_id, body, is_official)
      values (p_target, p_actor, p_extra ->> 'body', true)
      returning id into v_comment;
    update public.board_comments set is_official = false
     where post_id = p_target and is_official and id <> v_comment;
    update public.board_posts set official_comment_id = v_comment where id = p_target;

  elsif p_kind = 'post' and p_action = 'merge' then
    v_into := (p_extra ->> 'into')::uuid;
    if v_into is null or v_into = p_target or not exists (select 1 from public.board_posts where id = v_into) then
      raise exception 'invalid' using errcode = '22023';
    end if;
    -- Votes and follows move without doubling up; the comments move too.
    insert into public.board_votes (post_id, user_id, created_at)
      select v_into, v.user_id, v.created_at from public.board_votes v where v.post_id = p_target
      on conflict do nothing;
    delete from public.board_votes where post_id = p_target;
    insert into public.board_follows (post_id, user_id, created_at)
      select v_into, f.user_id, f.created_at from public.board_follows f where f.post_id = p_target
      on conflict do nothing;
    delete from public.board_follows where post_id = p_target;
    update public.board_comments set post_id = v_into where post_id = p_target;
    update public.board_posts set duplicate_of = v_into, status = 'duplicate',
           status_note = coalesce(nullif(p_extra ->> 'note', ''), status_note), official_comment_id = null
     where id = p_target;

  elsif p_kind = 'post' and p_action in ('lock', 'unlock') then
    update public.board_posts set locked = (p_action = 'lock') where id = p_target;

  elsif p_kind = 'member' and p_action in ('warn', 'limit', 'suspend', 'ban', 'unban') then
    if not exists (select 1 from public.board_members where user_id = p_target) then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    v_days := least(greatest(coalesce((p_extra ->> 'days')::int, case p_action when 'limit' then 3 else 7 end), 1), 365);
    v_until := case when p_action in ('limit', 'suspend') then now() + make_interval(days => v_days) end;
    if p_action = 'warn' then
      perform private.notify(p_target, 'warned', null, null, v_reason);
    else
      update public.board_members set
        standing = case p_action when 'unban' then 'active' when 'ban' then 'banned' when 'limit' then 'limited' else 'suspended' end,
        standing_until = v_until, standing_changed_at = now()
      where user_id = p_target;
      if p_action in ('limit', 'suspend') then
        perform private.notify(p_target, 'suspended', null, null, v_reason, null, null, v_until);
      end if;
    end if;

  elsif p_kind = 'board' and p_action in ('pause', 'reopen') then
    update public.board_settings set posting_open = (p_action = 'reopen'), updated_at = now();

  elsif p_kind = 'appeal' and p_action in ('uphold', 'restore_appeal') then
    select * into v_appeal from public.moderation_appeals where id = p_target and status = 'open' for update;
    if not found then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    update public.moderation_appeals set status = case when p_action = 'uphold' then 'upheld' else 'restored' end,
           decided_at = now()
     where id = p_target;
    if p_action = 'restore_appeal' then
      if v_appeal.target_kind = 'post' then
        update public.board_posts set visibility = 'visible', mod_reason = null where id = v_appeal.target_id;
      elsif v_appeal.target_kind = 'comment' then
        update public.board_comments set visibility = 'visible', mod_reason = null where id = v_appeal.target_id;
      else
        update public.board_members set standing = 'active', standing_until = null, standing_changed_at = now()
         where user_id = v_appeal.user_id;
      end if;
    end if;
    perform private.notify(v_appeal.user_id, 'appeal',
      case when v_appeal.target_kind = 'post' then v_appeal.target_id end,
      case when v_appeal.target_kind = 'comment' then v_appeal.target_id end,
      null, true, case when p_action = 'uphold' then 'upheld' else 'restored' end);
    v_log_action := case when p_action = 'uphold' then 'uphold' else 'restore' end;

  elsif p_kind = 'report' and p_action = 'dismiss' then
    update public.ugc_reports set status = 'dismissed', handled_at = now() where id = p_target and status = 'open';

  else
    raise exception 'invalid' using errcode = '22023';
  end if;

  insert into private.moderation_log (actor_id, action, target_kind, target_id, reason, detail)
    values (p_actor, v_log_action, p_kind, p_target, v_reason,
            case when p_action = 'status' then p_extra ->> 'status' when p_action in ('limit', 'suspend') then v_days || ' days' end);
  return jsonb_build_object('ok', true, 'action', p_action);
end $$;

create function public.svc_staff_act(p_actor uuid, p_action text, p_kind text, p_target uuid, p_reason text, p_extra jsonb)
returns jsonb language sql volatile security invoker set search_path = '' as $$
  select private.staff_act(p_actor, p_action, p_kind, p_target, p_reason, coalesce(p_extra, '{}'::jsonb))
$$;

-- Is this user staff? (staff-action checks before anything else)
create function public.svc_is_staff(p_user uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from private.staff s where s.user_id = p_user)
$$;

-- The staff queue, one tab at a time (newest decisions last): held, reported,
-- appeals, members, log. Bodies appear here only (service role, staff only).
create function public.svc_staff_queue(p_actor uuid, p_tab text) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_out jsonb;
begin
  if not exists (select 1 from private.staff s where s.user_id = p_actor) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_tab = 'held' then
    select coalesce(jsonb_agg(x order by x ->> 'at'), '[]') into v_out from (
      select jsonb_build_object('kind', 'post', 'id', p.id, 'reason', p.hold_reason, 'at', p.created_at,
        'title', p.title, 'body', left(p.body, 600), 'handle', m.handle,
        'newMember', m.approved_posts = 0, 'priorActions',
          (select count(*) from private.moderation_log l where l.target_id = p.author_id and l.actor_id is not null)) x
        from public.board_posts p left join public.board_members m on m.user_id = p.author_id
       where p.visibility in ('pending', 'hidden') and p.hold_reason is not null
      union all
      select jsonb_build_object('kind', 'comment', 'id', c.id, 'postId', c.post_id, 'reason', c.hold_reason, 'at', c.created_at,
        'body', left(c.body, 600), 'handle', m.handle, 'newMember', coalesce(m.approved_posts, 0) = 0, 'priorActions',
          (select count(*) from private.moderation_log l where l.target_id = c.author_id and l.actor_id is not null))
        from public.board_comments c left join public.board_members m on m.user_id = c.author_id
       where c.visibility in ('pending', 'hidden') and c.hold_reason is not null) q;
  elsif p_tab = 'reported' then
    select coalesce(jsonb_agg(x order by x ->> 'at'), '[]') into v_out from (
      select jsonb_build_object('kind', r.target_kind, 'id', r.target_id, 'count', count(*),
        'reasons', jsonb_agg(distinct r.reason), 'at', min(r.created_at),
        'examContent', bool_or(r.reason = 'exam_content')) x
        from public.ugc_reports r where r.status = 'open'
       group by r.target_kind, r.target_id) q;
  elsif p_tab = 'appeals' then
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.target_kind, 'targetId', a.target_id,
      'note', a.note, 'at', a.created_at) order by a.created_at), '[]') into v_out
      from public.moderation_appeals a where a.status = 'open';
  elsif p_tab = 'members' then
    select coalesce(jsonb_agg(jsonb_build_object('userId', m.user_id, 'handle', m.handle, 'standing', m.standing,
      'until', m.standing_until, 'priorActions',
        (select count(*) from private.moderation_log l where l.target_id = m.user_id and l.actor_id is not null))
      order by m.standing_changed_at desc nulls last), '[]') into v_out
      from public.board_members m
     where m.standing <> 'active'
        or exists (select 1 from private.moderation_log l where l.target_id = m.user_id and l.actor_id is not null);
  elsif p_tab = 'log' then
    select coalesce(jsonb_agg(jsonb_build_object('action', l.action, 'kind', l.target_kind, 'reason', l.reason,
      'automatic', l.actor_id is null, 'at', l.at) order by l.at desc), '[]') into v_out
      from (select * from private.moderation_log order by at desc limit 50) l;
  else
    raise exception 'invalid' using errcode = '22023';
  end if;
  return jsonb_build_object('tab', p_tab, 'items', v_out,
    'postingOpen', (select s.posting_open from public.board_settings s),
    'waiting', (select count(*) from public.board_posts where visibility in ('pending', 'hidden') and hold_reason is not null)
             + (select count(*) from public.board_comments where visibility in ('pending', 'hidden') and hold_reason is not null)
             + (select count(distinct (target_kind, target_id)) from public.ugc_reports where status = 'open'));
end $$;

-- The daily digest's numbers: what has waited more than 12 hours. Counts
-- only: no learner text and no handles ever leave in an email.
create function public.svc_staff_digest() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'held', (select count(*) from public.board_posts where visibility in ('pending', 'hidden')
              and hold_reason is not null and created_at < now() - interval '12 hours')
          + (select count(*) from public.board_comments where visibility in ('pending', 'hidden')
              and hold_reason is not null and created_at < now() - interval '12 hours'),
    'reported', (select count(distinct (target_kind, target_id)) from public.ugc_reports
                  where status = 'open' and created_at < now() - interval '12 hours'),
    'appeals', (select count(*) from public.moderation_appeals where status = 'open' and created_at < now() - interval '12 hours'))
$$;

-- export-my-data's `board` section: the learner's own board rows only.
create function public.svc_board_export(p_user uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'member', (select jsonb_build_object('handle', m.handle, 'handleKind', m.handle_kind,
                 'guidelinesVersion', m.guidelines_version, 'guidelinesAcceptedAt', m.guidelines_accepted_at,
                 'standing', m.standing, 'standingUntil', m.standing_until, 'joinedAt', m.created_at)
                 from public.board_members m where m.user_id = p_user),
    'posts', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'kind', p.kind, 'title', p.title, 'body', p.body,
                 'itemRef', p.item_ref, 'status', p.status, 'visibility', p.visibility, 'createdAt', p.created_at,
                 'editedAt', p.edited_at) order by p.created_at)
                 from public.board_posts p where p.author_id = p_user), '[]'),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'postId', c.post_id, 'body', c.body,
                 'visibility', c.visibility, 'createdAt', c.created_at) order by c.created_at)
                 from public.board_comments c where c.author_id = p_user), '[]'),
    'votes', coalesce((select jsonb_agg(jsonb_build_object('postId', v.post_id, 'at', v.created_at) order by v.created_at)
                 from public.board_votes v where v.user_id = p_user), '[]'),
    'follows', coalesce((select jsonb_agg(jsonb_build_object('postId', f.post_id, 'at', f.created_at) order by f.created_at)
                 from public.board_follows f where f.user_id = p_user), '[]'),
    'reports', coalesce((select jsonb_agg(jsonb_build_object('kind', r.target_kind, 'targetId', r.target_id, 'reason', r.reason,
                 'note', r.note, 'status', r.status, 'at', r.created_at) order by r.created_at)
                 from public.ugc_reports r where r.reporter_id = p_user), '[]'),
    'blocks', coalesce((select jsonb_agg(jsonb_build_object('userId', b.blocked_id, 'at', b.created_at) order by b.created_at)
                 from public.member_blocks b where b.blocker_id = p_user), '[]'),
    'appeals', coalesce((select jsonb_agg(jsonb_build_object('kind', a.target_kind, 'targetId', a.target_id, 'note', a.note,
                 'status', a.status, 'at', a.created_at) order by a.created_at)
                 from public.moderation_appeals a where a.user_id = p_user), '[]'),
    'notices', coalesce((select jsonb_agg(jsonb_build_object('kind', n.kind, 'postId', n.post_id, 'reason', n.reason,
                 'at', n.created_at, 'readAt', n.read_at) order by n.created_at)
                 from public.board_notifications n where n.user_id = p_user), '[]'))
$$;

-- delete-account's audit counts (private.deletions keeps only the numbers).
create function public.svc_board_counts(p_user uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'posts', (select count(*) from public.board_posts where author_id = p_user),
    'comments', (select count(*) from public.board_comments where author_id = p_user))
$$;

-- ── Reads (the app; RLS applies: security invoker) ─────────────────
-- One page of the board: visible posts with their author's handle and the
-- team mark, without authors the viewer blocked or posts they reported.
-- Tabs: top (votes), new (newest), shipped (newest shipped). Keyset paging
-- on (p_after_key, p_after_id); at most 50 a page. Signed out, the same
-- query without the viewer's own rows (anon can't read votes or blocks).
create function public.board_feed(
  p_cert text, p_tab text, p_kind text default null, p_q text default null,
  p_after_key bigint default null, p_after_id uuid default null, p_limit int default 20)
returns table (id uuid, kind text, title text, status text, shipped_in text, author_handle text, is_team boolean,
               vote_count int, comment_count int, voted boolean, team_replied boolean, created_at timestamptz,
               sort_key bigint)
language plpgsql stable security invoker set search_path = '' as $$
#variable_conflict use_column
declare
  v_me uuid := (select auth.uid());
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  if p_tab not in ('top', 'new', 'shipped') then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if v_me is null then
    return query
      select p.id, p.kind, p.title, p.status, p.shipped_in, m.handle, coalesce(m.is_team, false),
             p.vote_count, p.comment_count, false, p.official_comment_id is not null, p.created_at, k.key
        from public.board_posts p
        left join public.board_members m on m.user_id = p.author_id
        cross join lateral (select case p_tab when 'top' then p.vote_count::bigint
                                 when 'shipped' then (extract(epoch from p.status_changed_at) * 1000)::bigint
                                 else (extract(epoch from p.created_at) * 1000)::bigint end as key) k
       where p.cert_id = p_cert and p.visibility = 'visible'
         and (p_tab <> 'shipped' or p.status = 'shipped')
         and (p_kind is null or p.kind = p_kind)
         and (p_q is null or p.search @@ plainto_tsquery('simple', p_q))
         and (p_after_key is null or (k.key, p.id) < (p_after_key, p_after_id))
       order by k.key desc, p.id desc
       limit v_limit;
    return;
  end if;
  return query
    select p.id, p.kind, p.title, p.status, p.shipped_in, m.handle, coalesce(m.is_team, false),
           p.vote_count, p.comment_count,
           exists (select 1 from public.board_votes v where v.post_id = p.id and v.user_id = v_me),
           p.official_comment_id is not null, p.created_at, k.key
      from public.board_posts p
      left join public.board_members m on m.user_id = p.author_id
      cross join lateral (select case p_tab when 'top' then p.vote_count::bigint
                               when 'shipped' then (extract(epoch from p.status_changed_at) * 1000)::bigint
                               else (extract(epoch from p.created_at) * 1000)::bigint end as key) k
     where p.cert_id = p_cert and p.visibility = 'visible'
       and (p_tab <> 'shipped' or p.status = 'shipped')
       and (p_kind is null or p.kind = p_kind)
       and (p_q is null or p.search @@ plainto_tsquery('simple', p_q))
       and not exists (select 1 from public.member_blocks b where b.blocker_id = v_me and b.blocked_id = p.author_id)
       -- ugc_reports is the viewer's own rows only (RLS), so this is "posts I reported".
       and not exists (select 1 from public.ugc_reports r where r.target_kind = 'post' and r.target_id = p.id)
       and (p_after_key is null or (k.key, p.id) < (p_after_key, p_after_id))
     order by k.key desc, p.id desc
     limit v_limit;
end $$;

-- One post with its comments (without blocked authors or reported ones),
-- the official response and the status history. null when the viewer
-- can't see it.
create function public.board_post(p_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_post jsonb;
begin
  select jsonb_build_object('id', p.id, 'kind', p.kind, 'title', p.title, 'body', p.body, 'itemRef', p.item_ref,
           'discussesAnswer', p.discusses_answer, 'status', p.status, 'statusNote', p.status_note,
           'shippedIn', p.shipped_in, 'visibility', p.visibility, 'authorId', p.author_id,
           'authorHandle', m.handle, 'isTeam', coalesce(m.is_team, false), 'locked', p.locked,
           'voteCount', p.vote_count, 'commentCount', p.comment_count, 'createdAt', p.created_at,
           'officialCommentId', p.official_comment_id,
           'history', coalesce((select jsonb_agg(jsonb_build_object('status', e.to_status, 'note', e.note, 'at', e.created_at)
                                  order by e.created_at) from public.board_status_events e where e.post_id = p.id), '[]'))
    into v_post
    from public.board_posts p left join public.board_members m on m.user_id = p.author_id
   where p.id = p_id;
  if v_post is null then
    return null;
  end if;
  if v_me is null then
    return v_post || jsonb_build_object('voted', false, 'following', false,
      'comments', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'parentId', c.parent_id, 'authorId', c.author_id,
                   'authorHandle', m.handle, 'isTeam', coalesce(m.is_team, false), 'body', c.body, 'isOfficial', c.is_official,
                   'createdAt', c.created_at, 'editedAt', c.edited_at) order by c.created_at)
                   from public.board_comments c left join public.board_members m on m.user_id = c.author_id
                  where c.post_id = p_id and c.visibility = 'visible'), '[]'));
  end if;
  return v_post || jsonb_build_object(
    'voted', exists (select 1 from public.board_votes v where v.post_id = p_id and v.user_id = v_me),
    'following', exists (select 1 from public.board_follows f where f.post_id = p_id and f.user_id = v_me),
    'comments', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'parentId', c.parent_id, 'authorId', c.author_id,
                 'authorHandle', m.handle, 'isTeam', coalesce(m.is_team, false), 'body', c.body, 'isOfficial', c.is_official,
                 'createdAt', c.created_at, 'editedAt', c.edited_at) order by c.created_at)
                 from public.board_comments c left join public.board_members m on m.user_id = c.author_id
                where c.post_id = p_id and (c.visibility = 'visible' or c.author_id = v_me)
                  and not exists (select 1 from public.member_blocks b where b.blocker_id = v_me and b.blocked_id = c.author_id)
                  and not exists (select 1 from public.ugc_reports r       -- own rows only (RLS)
                                   where r.target_kind = 'comment' and r.target_id = c.id)), '[]'));
end $$;

-- Staff priority (support §11.2), service role only: severity + verified
-- votes (accounts at least 7 days old, capped) + reach + private reports (capped).
create view private.board_priority with (security_invoker = true) as
  select p.id, p.title, p.status,
         coalesce(p.severity, 0)
         + least(2 * (select count(*) from public.board_votes v join auth.users u on u.id = v.user_id
                       where v.post_id = p.id and u.created_at <= now() - interval '7 days'), 40)
         + coalesce(p.reach, 0)
         + least(3 * (select count(distinct r.reporter_id) from public.ugc_reports r
                       where r.target_kind = 'post' and r.target_id = p.id), 15) as priority
    from public.board_posts p
   where p.visibility = 'visible';
grant select on private.board_priority to service_role;
revoke all on private.board_priority from anon, authenticated;

-- ── Function rights ─────────────────────────────────────────────────
-- Nothing is executable by PUBLIC (every role) by default here (addendum:
-- including the policy helpers). Then exactly:
--  * authenticated: the two policy helpers and the two reads;
--  * anon: the two reads (they return only what RLS lets anon see);
--  * service_role: the svc_* entry points and the private helpers they call.
revoke all on function
  private.is_staff(), private.app_role(), private.is_active_member(), private.is_blocked_by(uuid, uuid),
  private.board_take(uuid, text, int, int, boolean), private.account_is_new(uuid, interval),
  private.notify(uuid, text, uuid, uuid, text, boolean, text, timestamptz), private.notify_post(uuid, text, uuid, uuid),
  private.posts_guard(), private.posts_after(), private.comments_guard_ins(), private.comments_guard_upd(),
  private.comments_after(), private.votes_after(), private.follows_after(), private.reports_guard(),
  private.reports_after(), private.blocks_guard(), private.appeals_guard(), private.members_guard(),
  private.staff_mark(), private.staff_act(uuid, text, text, uuid, text, jsonb),
  public.svc_board_member(uuid), public.svc_moderation_terms(), public.svc_board_join(uuid, text, text, text),
  public.svc_board_write(uuid, text, uuid, text, text, text, text, uuid, text, text),
  public.svc_staff_act(uuid, text, text, uuid, text, jsonb), public.svc_is_staff(uuid),
  public.svc_staff_queue(uuid, text), public.svc_staff_digest(), public.svc_board_export(uuid),
  public.svc_board_counts(uuid),
  public.board_feed(text, text, text, text, bigint, uuid, int), public.board_post(uuid)
  from public, anon, authenticated;

grant execute on function private.is_staff(), private.is_active_member() to authenticated;
grant execute on function public.board_feed(text, text, text, text, bigint, uuid, int), public.board_post(uuid)
  to anon, authenticated;
grant execute on function
  private.is_staff(), private.app_role(), private.is_blocked_by(uuid, uuid), private.account_is_new(uuid, interval),
  private.board_take(uuid, text, int, int, boolean), private.notify(uuid, text, uuid, uuid, text, boolean, text, timestamptz),
  private.notify_post(uuid, text, uuid, uuid), private.staff_act(uuid, text, text, uuid, text, jsonb),
  public.svc_board_member(uuid), public.svc_moderation_terms(), public.svc_board_join(uuid, text, text, text),
  public.svc_board_write(uuid, text, uuid, text, text, text, text, uuid, text, text),
  public.svc_staff_act(uuid, text, text, uuid, text, jsonb), public.svc_is_staff(uuid),
  public.svc_staff_queue(uuid, text), public.svc_staff_digest(), public.svc_board_export(uuid),
  public.svc_board_counts(uuid), public.board_feed(text, text, text, text, bigint, uuid, int), public.board_post(uuid)
  to service_role;

-- Never add a board table or any private table to the `supabase_realtime`
-- publication (supabase/tests/30_board.sql checks it): a realtime channel
-- would skip the column grants above.
