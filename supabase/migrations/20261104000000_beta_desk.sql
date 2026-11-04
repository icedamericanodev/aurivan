-- KaiSip Beta Desk: the private tracker for Android beta testers (4 Nov 2026).
-- Applied sixth, after 20261027000100_beta_no_passwords.sql. Append-only once
-- applied (change it with a new migration file, never by editing this one).
--
-- What it is, in plain English:
--  * One table, public.beta_testers: one row per person who signed up to test
--    the Android app. It holds their name, email, device and the dates the
--    owner records by hand (registered, invited, opted in on Google Play,
--    feedback, the participation check, approval, reward activation).
--  * One settings row, public.beta_desk_settings: the registration target,
--    the signup form link and the eligibility terms offered to testers.
--  * Nothing here syncs with Google Forms or Google Play. Every date is typed
--    or imported by the owner. Only two dates are CALCULATED, by the database
--    itself so every device shows the same answer:
--      review_due_on  = opted_in_on + 14 days   (from the Google Play opt-in,
--                                                never from registration)
--      reward_ends_on = reward_activated_on + 6 months
--  * The reward is six months of CISA premium content and app features. Other
--    certifications are not part of it; the page says so beside every reward.
--
-- Security model:
--  * Only Beta Desk admins see or change anything. Admins are listed in
--    private.beta_desk_admins by email (lower case). A signed-in account is an
--    admin when its CONFIRMED email in auth.users is on that list. Sign-in is
--    an emailed code or Google (no passwords: 20261027000100), so holding the
--    inbox is what proves it. The list is not readable by any app role and is
--    filled by the owner in the SQL editor (never in a committed file, so no
--    personal email sits in the repository):
--        insert into private.beta_desk_admins (email) values ('owner@example.com');
--  * This list is separate from private.staff on purpose: a Desk admin gets no
--    power on the feedback board, and a board moderator sees no tester.
--  * RLS is ON for every table here. Policies are per command, `to
--    authenticated`, and pass only for an admin. anon gets nothing at all.
--  * The helper private.beta_desk_is_admin is security definer with
--    search_path '' and lives in schema private; authenticated may EXECUTE it
--    (a policy calls it by id, so no USAGE on schema private is needed).
--  * The page checks "am I an admin?" by reading the settings row: RLS shows it
--    to admins only, so a non-admin simply reads nothing.
--  * Duplicate emails are impossible: email_key (the email trimmed and in lower
--    case) is UNIQUE. The CSV import asks the database to skip a duplicate
--    instead of failing (on_conflict=email_key, ignore-duplicates).
--  * The rules a reward depends on are CHECK constraints, so no page bug can
--    break them: approval needs an opt-in date, a passed participation check,
--    the terms on record and day 14 reached; a reward needs an approval first.

-- ── Who may use the Beta Desk ───────────────────────────────────────
create table private.beta_desk_admins (
  email text primary key check (email = lower(btrim(email)) and length(email) between 3 and 254 and email like '%_@_%'),
  added_at timestamptz not null default now()
);
alter table private.beta_desk_admins enable row level security;   -- no policies: deny all but the owner and service_role
revoke all on private.beta_desk_admins from public, anon, authenticated;
grant select, insert, delete on private.beta_desk_admins to service_role;

-- Is the signed-in account a Beta Desk admin? (policy helper: authenticated only)
create function private.beta_desk_is_admin() returns boolean
language sql stable security definer set search_path = '' as
$$ select exists (
     select 1
     from auth.users u
     join private.beta_desk_admins a on a.email = lower(btrim(u.email))
     where u.id = (select auth.uid())
       and u.email_confirmed_at is not null
   ) $$;
revoke all on function private.beta_desk_is_admin() from public, anon;
grant execute on function private.beta_desk_is_admin() to authenticated, service_role;

-- Keeps updated_at honest on every change (trigger only; nobody calls it).
create function private.beta_desk_touch() returns trigger
language plpgsql set search_path = '' as
$$ begin
     new.updated_at := now();
     return new;
   end $$;
revoke all on function private.beta_desk_touch() from public, anon, authenticated;

-- ── Settings (a singleton) ──────────────────────────────────────────
create table public.beta_desk_settings (
  id boolean primary key default true check (id),
  registration_target int not null default 50 check (registration_target between 1 and 100000),
  signup_form_url text check (signup_form_url is null or (signup_form_url ~ '^https://' and length(signup_form_url) <= 500)),
  terms_offered text not null default 'Stay opted in to the Google Play beta for 14 days in a row and send feedback. Reward: 6 months of CISA premium content and app features. Other certifications are not included.'
    check (length(btrim(terms_offered)) between 1 and 1000),
  updated_at timestamptz not null default now()
);
insert into public.beta_desk_settings default values;
alter table public.beta_desk_settings enable row level security;
revoke all on public.beta_desk_settings from public, anon, authenticated;
grant select on public.beta_desk_settings to authenticated;
grant update (registration_target, signup_form_url, terms_offered) on public.beta_desk_settings to authenticated;
grant select, update on public.beta_desk_settings to service_role;
create policy beta_desk_settings_select on public.beta_desk_settings for select to authenticated
  using ((select private.beta_desk_is_admin()));
create policy beta_desk_settings_update on public.beta_desk_settings for update to authenticated
  using ((select private.beta_desk_is_admin()))
  with check ((select private.beta_desk_is_admin()));
create trigger beta_desk_settings_touch before update on public.beta_desk_settings
  for each row execute function private.beta_desk_touch();

-- ── Testers ─────────────────────────────────────────────────────────
create table public.beta_testers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default '' check (length(full_name) <= 120),
  email text not null check (length(btrim(email)) between 3 and 254 and btrim(email) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- The duplicate guard: the same address in any case or spacing is one tester.
  email_key text generated always as (lower(btrim(email))) stored,
  device text not null default '' check (length(device) <= 120),
  source text not null default 'manual' check (source in ('manual', 'form_csv')),

  -- 1. Registration (the form's timestamp, or the day the owner added them)
  registered_on date not null default current_date,
  -- 2. Invitation to the Google Play closed test (owner sends it, then records it)
  invited_on date,
  -- 3. The ACTUAL Google Play opt-in (owner checks Play Console, then records it)
  opted_in_on date,
  -- Calculated: the 14-day review counts from the opt-in, never from registration.
  review_due_on date generated always as (opted_in_on + 14) stored,
  -- 4. Feedback
  last_feedback_on date,
  feedback_summary text not null default '' check (length(feedback_summary) <= 2000),
  -- 5. Manual check of continuous participation
  --    unchecked              not reviewed yet
  --    continuous             stayed opted in every day
  --    interrupted_technical  a gap caused by a technical issue (needs a note), accepted by the owner
  --    interrupted            left or paused for another reason (not eligible)
  participation text not null default 'unchecked'
    check (participation in ('unchecked', 'continuous', 'interrupted_technical', 'interrupted')),
  participation_checked_on date,
  technical_issues text not null default '' check (length(technical_issues) <= 2000),
  -- The eligibility terms this tester was offered (copied from settings when added)
  terms_offered text not null default '' check (length(terms_offered) <= 1000),
  -- 6. Completion approval
  completion text not null default 'pending' check (completion in ('pending', 'approved', 'not_eligible')),
  approved_on date,
  -- 7. Reward: six months of CISA premium, from the day it is actually switched on
  reward_activated_on date,
  -- Calculated: six calendar months (31 Aug + 6 months = 28 or 29 Feb).
  reward_ends_on date generated always as ((reward_activated_on + interval '6 months')::date) stored,
  -- Follow-up reminder and notes
  follow_up_on date,
  follow_up_note text not null default '' check (length(follow_up_note) <= 300),
  notes text not null default '' check (length(notes) <= 4000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint beta_testers_email_unique unique (email_key),
  -- An opt-in comes after the invitation (when the invitation is recorded).
  constraint beta_testers_optin_after_invite check (opted_in_on is null or invited_on is null or opted_in_on >= invited_on),
  -- A participation result needs the day it was checked; a technical gap needs its note.
  constraint beta_testers_participation_dated check (participation = 'unchecked' or participation_checked_on is not null),
  constraint beta_testers_technical_noted check (participation <> 'interrupted_technical' or length(btrim(technical_issues)) > 0),
  -- Approval rules: opted in, day 14 reached, participation passed, terms on record.
  constraint beta_testers_approval_date check ((completion = 'approved') = (approved_on is not null)),
  constraint beta_testers_approval_rules check (
    completion <> 'approved' or (
      opted_in_on is not null
      and approved_on >= opted_in_on + 14
      and participation in ('continuous', 'interrupted_technical')
      and length(btrim(terms_offered)) > 0)),
  -- A reward needs an approval, and starts on or after it.
  constraint beta_testers_reward_after_approval check (
    reward_activated_on is null or (completion = 'approved' and reward_activated_on >= approved_on))
);
create index beta_testers_registered_idx on public.beta_testers (registered_on desc);
alter table public.beta_testers enable row level security;
revoke all on public.beta_testers from public, anon, authenticated;
-- Column grants: the calculated columns, id and the timestamps are never written by the page.
grant select, delete on public.beta_testers to authenticated;
grant insert (full_name, email, device, source, registered_on, invited_on, opted_in_on, last_feedback_on, feedback_summary,
              participation, participation_checked_on, technical_issues, terms_offered, completion, approved_on,
              reward_activated_on, follow_up_on, follow_up_note, notes)
  on public.beta_testers to authenticated;
grant update (full_name, email, device, registered_on, invited_on, opted_in_on, last_feedback_on, feedback_summary,
              participation, participation_checked_on, technical_issues, terms_offered, completion, approved_on,
              reward_activated_on, follow_up_on, follow_up_note, notes)
  on public.beta_testers to authenticated;
grant select, insert, update, delete on public.beta_testers to service_role;

create policy beta_testers_select on public.beta_testers for select to authenticated
  using ((select private.beta_desk_is_admin()));
create policy beta_testers_insert on public.beta_testers for insert to authenticated
  with check ((select private.beta_desk_is_admin()));
create policy beta_testers_update on public.beta_testers for update to authenticated
  using ((select private.beta_desk_is_admin()))
  with check ((select private.beta_desk_is_admin()));
create policy beta_testers_delete on public.beta_testers for delete to authenticated
  using ((select private.beta_desk_is_admin()));
create trigger beta_testers_touch before update on public.beta_testers
  for each row execute function private.beta_desk_touch();
