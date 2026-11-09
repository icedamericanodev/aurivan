-- Pre-login eligibility is available only to the CAPTCHA-protected Edge Function.
-- No browser role can query emails or enumerate the private admin table.
begin;
create function private.beta_desk_email_is_allowed(candidate_email text) returns boolean
language sql stable security definer set search_path = '' as
$$ select exists (
  select 1 from private.beta_desk_admins a
  join auth.users u on u.id = a.user_id
  where lower(u.email) = lower(btrim(candidate_email))
    and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous, false)
    and not coalesce(u.is_sso_user, false)
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until < now())
) $$;
revoke all on function private.beta_desk_email_is_allowed(text) from public, anon, authenticated;
grant execute on function private.beta_desk_email_is_allowed(text) to service_role;

-- Expose only an invoker wrapper; elevated helpers stay in the private schema.
create function public.beta_desk_email_is_allowed(candidate_email text) returns boolean
language sql stable security invoker set search_path = '' as
$$ select private.beta_desk_email_is_allowed(candidate_email) $$;
revoke all on function public.beta_desk_email_is_allowed(text) from public, anon, authenticated;
grant execute on function public.beta_desk_email_is_allowed(text) to service_role;
commit;
