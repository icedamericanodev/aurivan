-- A minimal stand-in for what hosted Supabase provides (roles, auth.users,
-- auth.uid()), so the migrations and the Beta Desk tests run on a plain
-- local Postgres with no Docker. LOCAL TESTS ONLY: never run on the hosted project.
-- Used by scripts/beta_desk/pg_local.sh.
-- Minimal stand-in for what Supabase provides, for local tests only.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator noinherit login; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
create schema auth; create schema extensions;
create extension pgtap;
create table auth.users (
  id uuid primary key, instance_id uuid, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, confirmed_at timestamptz, last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}', is_anonymous boolean default false,
  phone text, created_at timestamptz default now(), updated_at timestamptz default now(), deleted_at timestamptz,
  banned_until timestamptz, is_sso_user boolean default false);
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade, provider text, provider_id text, identity_data jsonb, email text);
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '')::text $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
