-- KaiSip: accounts core (Uplift Phase 6). NOT APPLIED ANYWHERE.
-- Replaces the 2026-10-05 draft (never applied), which is why this file was
-- rewritten in place, and edited in place once more before the first apply
-- (accounts beta, 27 Oct 2026: the content-pack catalogue removed, the
-- deletion audit keyed with a server pepper). From the first apply to the
-- hosted project, migrations are APPEND-ONLY: change a live table with a new
-- file.
--
-- Content (question banks, notes) is never stored in Postgres: it ships in
-- the app and as static files on the website (docs/mobile/ACCOUNTS_BETA_PLAN.md).
--
-- Security model in plain English:
--  * RLS is ON for every table, public AND private, in the file that creates it.
--  * Policies are per command, `to authenticated`, and use (select auth.uid()).
--  * anon gets nothing in this file.
--  * Helpers with elevated rights live in schema `private` (not exposed by the
--    Data API), always `security definer set search_path = ''`. No function in
--    `public` is ever `security definer` (scripts/check_rls.sh, guard G7).
--  * Only the service role (Edge Functions, never the app) writes entitlements,
--    deletes accounts or touches private tables. It reaches private tables only
--    through the two `svc_*` functions below: `security invoker`, executable by
--    service_role alone, so RLS and grants still apply to everyone else.
--  * The normalised progress tables of the first draft (answers,
--    review_entries, bookmarks, mock_results) are gone: progress sync is one
--    validated snapshot per store (Phase 7, 20261013000000_sync_snapshots.sql).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- New objects in public get no automatic rights; each table grants what it needs.
-- (Supabase grants anon/authenticated ALL on new public objects by default.)
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
-- PUBLIC's EXECUTE on new functions is a GLOBAL built-in default, which a
-- per-schema REVOKE cannot remove (PostgreSQL docs, ALTER DEFAULT PRIVILEGES).
-- So every function below revokes it explicitly, and the pgTAP hardening test
-- (supabase/tests/01_hardening.sql) fails if any function in public or
-- private is executable by anon or authenticated without being allowlisted.
-- (Not revoked globally: that would also strip pgTAP and other extensions.)

-- ── Profiles: the minimum to run an account ─────────────────────────
-- No name, no email copy (email stays in auth.users), no cert.
create table public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  terms_version text not null check (terms_version ~ '^\d{4}-\d{2}$'),   -- e.g. '2026-11'
  age_confirmed boolean not null check (age_confirmed),                  -- "16 or older" ticked
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (terms_version, age_confirmed) on public.profiles to authenticated;  -- id/created_at default
grant update (terms_version) on public.profiles to authenticated;
grant select on public.profiles to service_role;                                  -- export-my-data
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- No delete policy: deletion is account deletion (Edge Function, cascade).

-- ── Entitlements (kept for the later RevenueCat phase; hardened) ─────
create table public.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement text not null check (entitlement ~ '^[a-z0-9_]{2,40}$'),
  active boolean not null default false,
  expires_at timestamptz,
  source text not null default 'revenuecat' check (source in ('revenuecat', 'manual')),
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement)
);
alter table public.entitlements enable row level security;
revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;
grant select, insert, update, delete on public.entitlements to service_role;
create policy entitlements_select on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()));
-- No write grant or policy: only the service role (a future webhook) writes.

-- ── Audit of deletions (no email, no uid, not even a plain hash of it) ──
-- `uid_hmac` is HMAC-SHA-256(DELETION_PEPPER, user id), computed in the
-- delete-account Edge Function with a Function secret the database never
-- sees. A plain SHA-256 of the id could be joined with the hash the phone
-- keeps (syncedAccountHash); the keyed hash can't, without the pepper.
create table private.deletions (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  uid_hmac text not null check (uid_hmac ~ '^[0-9a-f]{64}$'),
  board_posts int not null default 0 check (board_posts >= 0),
  board_comments int not null default 0 check (board_comments >= 0)
);
alter table private.deletions enable row level security;
grant select, insert on private.deletions to service_role;

-- ── Export rate limit (once an hour) ────────────────────────────────
create table private.export_log (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_at timestamptz not null
);
alter table private.export_log enable row level security;
grant select, insert, update on private.export_log to service_role;

-- ── Server-only entry points (Edge Functions holding the service role) ──
-- `security invoker`: they run with the caller's rights, and only
-- service_role may call them. PostgREST lists them, but anon and
-- authenticated get "permission denied".

-- export-my-data: atomically claims the hourly export slot.
-- true = go ahead; false = an export already ran in the last hour.
create function public.svc_claim_export(p_user uuid) returns boolean
language plpgsql volatile security invoker set search_path = '' as $$
declare
  claimed boolean;
begin
  insert into private.export_log as l (user_id, last_at)
    values (p_user, now())
  on conflict (user_id) do update
    set last_at = excluded.last_at
    where l.last_at <= now() - interval '1 hour'
  returning true into claimed;
  return coalesce(claimed, false);
end $$;

-- delete-account: writes the audit row after auth.admin.deleteUser. It is
-- given the keyed hash (64 lowercase hex characters), never the user id, so
-- the id doesn't reach this function, its logs or the table.
create function public.svc_record_deletion(
  p_uid_hmac text, p_board_posts int default 0, p_board_comments int default 0
) returns void
language sql volatile security invoker set search_path = '' as $$
  insert into private.deletions (uid_hmac, board_posts, board_comments)
  values (p_uid_hmac,
          greatest(coalesce(p_board_posts, 0), 0),
          greatest(coalesce(p_board_comments, 0), 0));
$$;

revoke all on function public.svc_claim_export(uuid) from public, anon, authenticated;
revoke all on function public.svc_record_deletion(text, int, int) from public, anon, authenticated;
grant execute on function public.svc_claim_export(uuid) to service_role;
grant execute on function public.svc_record_deletion(text, int, int) to service_role;

-- In-app account deletion (Apple 5.1.1(v), Google Play): the
-- `delete-account` Edge Function verifies the JWT and a recent sign-in,
-- reads the board counts, calls auth.admin.deleteUser(uid) FIRST, then
-- writes the audit row, clears storage (none yet) and revokes an Apple token
-- when it has a fresh Apple code (each best-effort, logged, never undoing
-- the deletion). Every user table above cascades from auth.users; Phase 7
-- and 8 tables must do the same.
