-- Service-only pre-email admission. No address list or lookup is exposed to app roles.
-- A single bounded counter avoids retaining submitted email addresses or IP addresses.
create table private.beta_desk_sign_in_limit (
  id boolean primary key default true check (id),
  window_start timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0)
);
alter table private.beta_desk_sign_in_limit enable row level security;
revoke all on private.beta_desk_sign_in_limit from public, anon, authenticated;
insert into private.beta_desk_sign_in_limit (id) values (true);

create or replace function private.beta_desk_sign_in_check(p_email text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz;
  v_attempts integer;
begin
  -- Lock the singleton so parallel requests cannot bypass the shared limit.
  select window_start, attempts into strict v_start, v_attempts
    from private.beta_desk_sign_in_limit where id = true for update;
  if v_start <= now() - interval '5 minutes' then
    v_start := now();
    v_attempts := 0;
  end if;
  if v_attempts >= 60 then return 'rate_limited'; end if;
  update private.beta_desk_sign_in_limit
    set window_start = v_start, attempts = v_attempts + 1 where id = true;
  if exists (
    select 1 from private.beta_desk_admins a join auth.users u on u.id = a.user_id
    where lower(u.email) = lower(btrim(p_email))
      and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous, false)
      and not coalesce(u.is_sso_user, false)
      and u.deleted_at is null
      and (u.banned_until is null or u.banned_until < now())
  ) then return 'allowed'; end if;
  return 'not_admin';
end;
$$;
revoke all on function private.beta_desk_sign_in_check(text) from public, anon, authenticated;
grant execute on function private.beta_desk_sign_in_check(text) to service_role;

-- PostgREST exposes only this invoker wrapper, executable by the service role.
create or replace function public.beta_desk_sign_in_check(p_email text)
returns text language sql security invoker set search_path = '' as $$
  select private.beta_desk_sign_in_check(p_email);
$$;
revoke all on function public.beta_desk_sign_in_check(text) from public, anon, authenticated;
grant execute on function public.beta_desk_sign_in_check(text) to service_role;
grant usage on schema private to service_role;
