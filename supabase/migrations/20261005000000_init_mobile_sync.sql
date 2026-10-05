-- Aurivan — Phase 3 schema: accounts, progress sync, entitlements, content packs.
-- NOT applied yet. Review with the mobile-security-auditor agent, then apply
-- with the Supabase CLI (`supabase db push`) or the Supabase MCP.
--
-- Security model in plain English:
--   * Row-level security (RLS) is ON for every table.
--   * A learner can only ever read/write THEIR OWN rows (auth.uid()).
--   * Entitlements (who paid) are written ONLY by the server (RevenueCat
--     webhook running with the service role) — never by the app.

-- One row per learner (created on first sign-in).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  active_cert_id text not null default 'cisa',
  created_at timestamptz not null default now()
);

-- Latest result per question (mirrors store/progress.ts `answers`).
create table public.answers (
  user_id uuid not null references auth.users (id) on delete cascade,
  cert_id text not null,
  question_id text not null,
  attempts int not null default 0 check (attempts >= 0),
  correct_count int not null default 0 check (correct_count >= 0),
  last_correct boolean not null,
  last_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, cert_id, question_id)
);

-- Spaced-repetition queue (mirrors engine/srs.ts ReviewEntry).
create table public.review_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  cert_id text not null,
  question_id text not null,
  box smallint not null check (box between 1 and 5),
  due_at timestamptz not null,
  last_seen timestamptz,
  reps int not null default 0,
  primary key (user_id, cert_id, question_id)
);

create table public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  cert_id text not null,
  question_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, cert_id, question_id)
);

create table public.mock_results (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  cert_id text not null,
  finished_at timestamptz not null,
  total int not null,
  correct int not null,
  minutes_used int not null,
  by_domain jsonb not null default '{}'::jsonb
);
create index mock_results_user_idx on public.mock_results (user_id, cert_id, finished_at desc);

-- What each learner has unlocked (written by the RevenueCat webhook only).
create table public.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement text not null,            -- e.g. 'premium_cisa', 'all_access'
  active boolean not null default false,
  expires_at timestamptz,
  source text not null default 'revenuecat',
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement)
);

-- Downloadable content packs (public catalogue; files live in Storage).
create table public.content_packs (
  cert_id text not null,
  version int not null,
  storage_path text not null,
  sha256 text not null,
  question_count int not null,
  min_app_version text not null default '1.0.0',
  published_at timestamptz not null default now(),
  primary key (cert_id, version)
);

-- ── Row-level security ──────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.answers        enable row level security;
alter table public.review_entries enable row level security;
alter table public.bookmarks      enable row level security;
alter table public.mock_results   enable row level security;
alter table public.entitlements   enable row level security;
alter table public.content_packs  enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own answers" on public.answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reviews" on public.review_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own bookmarks" on public.bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own mocks" on public.mock_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Learners may READ their entitlements; no insert/update/delete policy,
-- so only the service role (which bypasses RLS) can change them.
create policy "read own entitlements" on public.entitlements
  for select using (auth.uid() = user_id);
-- Anyone signed in may read the content catalogue.
create policy "read content catalogue" on public.content_packs
  for select to authenticated using (true);

-- In-app account deletion (Apple 5.1.1(v)): deleting the auth user
-- cascades to every table above. Called from an Edge Function that
-- verifies the user's JWT, then runs auth.admin.deleteUser(uid).
