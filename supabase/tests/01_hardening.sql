-- Schema-wide hardening checks (Uplift Phase 6). They hold for every table and
-- function in `public` and `private`, so Phases 7 and 8 inherit them for free.
-- When a later migration needs an exception, add it to the matching ALLOWLIST
-- below with a comment, never by weakening the query.
--
-- Run: supabase test db   (CI: .github/workflows/supabase.yml)
begin;
select plan(12);

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

-- ALLOWLISTS (empty in Phase 6).
--  anon may execute:          Phase 8 adds private.is_staff and the board read RPCs.
--  authenticated may execute: Phase 8 adds private.is_staff, private.is_active_member,
--                             private.is_blocked_by and the board RPCs.
--  anon may read (tables):    Phase 8 adds the board's public-read tables.
--  `using (true)` policies:   content_packs_read; Phase 8 adds the board's public reads.
create temporary table allow (kind text, name text);
insert into allow values ('true_policy', 'content_packs_read');

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

-- 6. Private tables are never readable or writable by app roles.
select is_empty($$ select nspname || '.' || relname from our_tables
                   where nspname = 'private'
                     and (has_table_privilege('anon', oid, 'select,insert,update,delete,truncate,references,trigger')
                       or has_table_privilege('authenticated', oid, 'select,insert,update,delete,truncate,references,trigger')) $$,
  'anon and authenticated have no privilege on any private table');

-- 7. anon reads nothing in public unless allowlisted.
select is_empty($$ select nspname || '.' || relname from our_tables
                   where nspname = 'public' and has_table_privilege('anon', oid, 'select')
                     and nspname || '.' || relname not in (select name from allow where kind = 'anon_read') $$,
  'anon can read no table in public');

-- 8. anon never writes anywhere.
select is_empty($$ select nspname || '.' || relname from our_tables
                   where has_table_privilege('anon', oid, 'insert,update,delete') $$,
  'anon has no insert, update or delete privilege on any table');

-- 9. TRUNCATE, REFERENCES and TRIGGER bypass or sidestep RLS: never for app roles.
select is_empty($$ select nspname || '.' || relname from our_tables
                   where has_table_privilege('authenticated', oid, 'truncate,references,trigger')
                      or has_table_privilege('anon', oid, 'truncate,references,trigger') $$,
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

-- 12. The private schema is not exposed to anon (Phase 8 grants USAGE to
--     authenticated and anon for policy helpers only; test 6 still holds then).
select ok(not has_schema_privilege('anon', 'private', 'create')
          and not has_schema_privilege('authenticated', 'private', 'create'),
  'nobody but the owner can create objects in private');

select * from finish();
rollback;
