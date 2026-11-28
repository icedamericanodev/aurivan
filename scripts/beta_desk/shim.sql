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
  -- The Auth server's role (GoTrue): owns the auth tables, as on hosted Supabase.
  if not exists (select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin noinherit; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
create schema auth; create schema extensions;
create extension pgtap;
-- auth.users, auth.sessions and auth.mfa_factors follow the columns GoTrue
-- v2.199.0 creates (supabase/auth migrations; extended 28 Nov 2026 for the
-- password guard, 20261128000000_password_guard.sql). confirmed_at is
-- generated there too; sessions.created_at has no default and may be NULL.
create table auth.users (
  instance_id uuid, id uuid primary key, aud varchar(255), role varchar(255), email varchar(255),
  encrypted_password varchar(255), email_confirmed_at timestamptz, invited_at timestamptz,
  confirmation_token varchar(255), confirmation_sent_at timestamptz,
  recovery_token varchar(255), recovery_sent_at timestamptz,
  email_change_token_new varchar(255), email_change varchar(255), email_change_sent_at timestamptz,
  email_change_token_current varchar(255) default '',
  email_change_confirm_status smallint default 0 check (email_change_confirm_status between 0 and 2),
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}', is_super_admin boolean,
  is_anonymous boolean not null default false,
  phone text unique default null, phone_confirmed_at timestamptz, phone_change text default '',
  phone_change_token varchar(255) default '', phone_change_sent_at timestamptz,
  confirmed_at timestamptz generated always as (least(email_confirmed_at, phone_confirmed_at)) stored,
  reauthentication_token varchar(255) default '', reauthentication_sent_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now(), deleted_at timestamptz,
  banned_until timestamptz, is_sso_user boolean not null default false);
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade, provider text, provider_id text, identity_data jsonb, email text);
create type auth.aal_level as enum ('aal1', 'aal2', 'aal3');
create type auth.factor_type as enum ('totp', 'webauthn', 'phone', 'recovery_code');
create type auth.factor_status as enum ('unverified', 'verified');
create table auth.sessions (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz, updated_at timestamptz, factor_id uuid, aal auth.aal_level, not_after timestamptz,
  refreshed_at timestamp, user_agent text, ip inet, tag text, oauth_client_id uuid,
  refresh_token_hmac_key text, refresh_token_counter bigint, scopes text);
create index sessions_user_id_idx on auth.sessions (user_id);
create index user_id_created_at_idx on auth.sessions (user_id, created_at);
create table auth.mfa_factors (
  id uuid primary key, user_id uuid not null references auth.users on delete cascade, friendly_name text,
  factor_type auth.factor_type not null, status auth.factor_status not null,
  created_at timestamptz not null, updated_at timestamptz not null, secret text,
  phone text unique default null, last_challenged_at timestamptz unique default null,
  web_authn_credential jsonb, web_authn_aaguid uuid, last_webauthn_challenge_data jsonb);
create index mfa_factors_user_id_idx on auth.mfa_factors (user_id);
create unique index mfa_factors_user_friendly_name_unique on auth.mfa_factors (friendly_name, user_id) where trim(friendly_name) <> '';
-- As on hosted Supabase: RLS on (no policies), owned by the Auth server's role,
-- which therefore runs the triggers on them with its own rights; postgres (the
-- migrations' role) has TRIGGER on the two tables the guards watch.
alter table auth.users enable row level security;
alter table auth.sessions enable row level security;
alter table auth.mfa_factors enable row level security;
alter table auth.users owner to supabase_auth_admin;
alter table auth.sessions owner to supabase_auth_admin;
alter table auth.mfa_factors owner to supabase_auth_admin;
alter table auth.identities owner to supabase_auth_admin;
alter type auth.aal_level owner to supabase_auth_admin;
alter type auth.factor_type owner to supabase_auth_admin;
alter type auth.factor_status owner to supabase_auth_admin;
grant usage on schema auth to supabase_auth_admin;
grant trigger on auth.users, auth.mfa_factors to postgres;
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '')::text $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
