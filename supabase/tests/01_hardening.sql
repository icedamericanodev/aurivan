-- Schema-wide hardening checks (Uplift Phase 6). They hold for every table and
-- function in `public` and `private`, so Phases 7 and 8 inherit them for free.
-- When a later migration needs an exception, add it to the matching ALLOWLIST
-- below with a comment, never by weakening the query.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(14);

-- Functions owned by an extension (pgTAP itself, etc.) are not ours.
create temporary view our_functions as
  select p.oid, n.nspname, p.proname, p.prosecdef, p.proconfig
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
    and not exists (select 1 from pg_depend d
                    where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e');

create temporary view our_tables as
  select c.oid, n.nspname, c.relname, c.relrowsecurity, c.relkind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p');

-- ALLOWLISTS. Each entry is a deliberate exception; add one with a comment, never
-- by weakening a query below. (Phase 6 had only content_packs_read.)
--  anon may execute:          the board's two read functions (Phase 8). They run as
--                             the caller (security invoker), so RLS decides what anon
--                             sees: nothing at all unless board_settings.read_scope
--                             is 'everyone'.
--  authenticated may execute: the same two reads, and the two policy helpers the
--                             board's RLS calls (private.is_staff,
--                             private.is_active_member). App roles still have no
--                             usage on schema private (test 13): a policy calls a
--                             helper by its id, which needs only EXECUTE. Every other
--                             private helper, private.is_blocked_by included, is
--                             revoked from public (Phase 8 addendum).
--  anon may read (tables):    the board's public-read tables (Phase 8), column by
--                             column; their anon policies return rows only when
--                             read_scope is 'everyone'.
--  `using (true)` policies:   content_packs_read (Phase 6); board_settings_read
--                             (Phase 8: the pause valve, the guidelines version and
--                             the read scope, which the app needs before sign-in).
create temporary table allow (kind text, name text);
insert into allow values
  ('true_policy', 'content_packs_read'),
  ('true_policy', 'board_settings_read'),
  ('anon_exec', 'public.board_feed'),
  ('anon_exec', 'public.board_post'),
  ('auth_exec', 'public.board_feed'),
  ('auth_exec', 'public.board_post'),
  ('auth_exec', 'private.is_staff'),
  ('auth_exec', 'private.is_active_member'),
  ('anon_read', 'public.board_settings'),
  ('anon_read', 'public.board_members'),
  ('anon_read', 'public.board_posts'),
  ('anon_read', 'public.board_comments'),
  ('anon_read', 'public.board_status_events');

-- 1. RLS is on for every table, public and private (guard G6 at runtime).
select is_empty($$ select nspname || '.' || relname from our_tables where not relrowsecurity $$,
  'every table in public and private has row level security enabled');

-- 2. No security definer function in public (guard G7 at runtime).
select is_empty($$ select oid::regprocedure::text from our_functions
                   where nspname = 'public' and prosecdef $$,
  'no security definer function in schema public');

-- 3. Every function pins search_path to '' (definer or not).
select is_empty($$ select oid::regprocedure::text from our_functions
                   where not coalesce(proconfig, '{}') @> array['search_path=""'] $$,
  'every function in public and private sets search_path = ''''');

-- 4–5. Nothing executable by anon or authenticated unless allowlisted.
select is_empty($$ select oid::regprocedure::text from our_functions
                   where has_function_privilege('anon', oid, 'execute')
                     and nspname || '.' || proname not in (select name from allow where kind = 'anon_exec') $$,
  'anon can execute no function in public or private');
select is_empty($$ select oid::regprocedure::text from our_functions
                   where has_function_privilege('authenticated', oid, 'execute')
                     and nspname || '.' || proname not in (select name from allow where kind = 'auth_exec') $$,
  'authenticated can execute no function in public or private');

-- Privileges below are checked at table level AND column level: has_table_privilege
-- is true only for a table-wide grant, so a later `grant insert (col) on … to anon`
-- would slip past it. has_any_column_privilege is true for either (select, insert,
-- update and references are the privileges a column can carry).

-- 6. Private tables are never readable or writable by app roles.
select is_empty($$ select nspname || '.' || relname from our_tables
                   where nspname = 'private'
                     and (has_table_privilege('anon', oid, 'delete,truncate,trigger')
                       or has_any_column_privilege('anon', oid, 'select,insert,update,references')
                       or has_table_privilege('authenticated', oid, 'delete,truncate,trigger')
                       or has_any_column_privilege('authenticated', oid, 'select,insert,update,references')) $$,
  'anon and authenticated have no privilege on any private table or column');

-- 7. anon reads nothing in public unless allowlisted.
select is_empty($$ select nspname || '.' || relname from our_tables
                   where nspname = 'public' and has_any_column_privilege('anon', oid, 'select')
                     and nspname || '.' || relname not in (select name from allow where kind = 'anon_read') $$,
  'anon can read no table or column in public');

-- 8. anon never writes anywhere.
select is_empty($$ select nspname || '.' || relname from our_tables
                   where has_table_privilege('anon', oid, 'delete')
                      or has_any_column_privilege('anon', oid, 'insert,update') $$,
  'anon has no insert, update or delete privilege on any table or column');

-- 9. TRUNCATE, REFERENCES and TRIGGER bypass or sidestep RLS: never for app roles.
select is_empty($$ select nspname || '.' || relname from our_tables
                   where has_table_privilege('authenticated', oid, 'truncate,trigger')
                      or has_any_column_privilege('authenticated', oid, 'references')
                      or has_table_privilege('anon', oid, 'truncate,trigger')
                      or has_any_column_privilege('anon', oid, 'references') $$,
  'no truncate, references or trigger privilege for anon or authenticated');

-- 10. Every policy names its roles (no implicit `to public`).
select is_empty($$ select schemaname || '.' || tablename || ':' || policyname from pg_policies
                   where schemaname in ('public', 'private') and roles = '{public}' $$,
  'every policy is scoped to named roles');

-- 11. `using (true)` / `with check (true)` only where allowlisted.
select is_empty($$ select policyname from pg_policies
                   where schemaname in ('public', 'private')
                     and (qual = 'true' or with_check = 'true')
                     and policyname not in (select name from allow where kind = 'true_policy') $$,
  'no always-true policy outside the allowlist');

-- 12. Nobody but the owner can create objects in private.
select ok(not has_schema_privilege('anon', 'private', 'create')
          and not has_schema_privilege('authenticated', 'private', 'create'),
  'anon and authenticated cannot create objects in private');

-- 13. App roles cannot even look into private. Phase 8 kept this: its policy
--     helpers need only EXECUTE (allowlisted above), never USAGE on the schema.
select ok(not has_schema_privilege('anon', 'private', 'usage')
          and not has_schema_privilege('authenticated', 'private', 'usage'),
  'anon and authenticated have no usage on schema private');

-- 14. Every view in public runs as the caller (security_invoker), so the RLS of
--     the tables it reads applies (guard G6d at runtime). A plain view runs as
--     its owner and skips it. (A materialized view can't be security_invoker:
--     keep those out of public.)
select is_empty($$ select n.nspname || '.' || c.relname
                   from pg_class c join pg_namespace n on n.oid = c.relnamespace
                   where n.nspname = 'public' and c.relkind in ('v', 'm')
                     and not exists (select 1 from pg_depend d
                                     where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
                     and not exists (select 1 from unnest(coalesce(c.reloptions, '{}')) o
                                     where lower(o) in ('security_invoker=true', 'security_invoker=on',
                                                        'security_invoker=1', 'security_invoker=yes')) $$,
  'every view in public is security_invoker');

select * from finish();
rollback;
