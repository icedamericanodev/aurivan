-- Aurivan: progress sync (Uplift Phase 7). NOT APPLIED ANYWHERE.
-- One validated snapshot per store per learner (security.md §4.1; spec
-- PHASE6_8.md §3.7). Append-only from the first `supabase db push` (Phase 9).
--
-- Plain English:
--  * Each learner has at most two rows here: their progress and their study
--    settings, each one JSON snapshot. The app checks every pull with the
--    same checker as a backup file, so the server only bounds size and shape;
--    it never reads or "repairs" progress.
--  * `rev` is a counter the server bumps on every write. The app writes with
--    `where rev = <the rev it last saw>`: zero rows updated means another
--    device wrote first, and the app pulls, merges and tries again.
--  * The server sets `rev`, `updated_at` and the rate window itself (a
--    trigger); a client can't choose them, nor move a row to another learner
--    or store.
--  * Writing needs a profile row (the Terms and the "16 or older" box were
--    accepted: Phase 6 review N10), not only a session.
--  * At most 60 writes per store per hour (the app needs about 6 a day).
--  * A daily checkpoint of the progress row is kept for support (newest 2),
--    in schema private. "Delete synced progress" (the row's own delete)
--    clears the checkpoints too; deleting the account cascades everything.

create table public.sync_snapshots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  store text not null check (store in ('progress', 'settings')),
  store_version int not null check (store_version between 1 and 1000),
  app_version text not null check (app_version ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$'),
  device_id uuid not null,                       -- random per install (secure store), not a hardware id
  rev bigint not null default 1,
  state jsonb not null check (jsonb_typeof(state) = 'object'
                              and octet_length(state::text) <= 2000000),  -- jsonb text adds spaces; the app caps at 1.5 MB
  updated_at timestamptz not null default now(),
  writes_window_start timestamptz not null default now(),   -- server-owned rate window
  writes_in_window int not null default 0,                  -- server-owned
  primary key (user_id, store)
);
alter table public.sync_snapshots enable row level security;
revoke all on public.sync_snapshots from anon, authenticated;
-- Column grants: the app never reads or writes user_id or the rate window,
-- and never writes rev or updated_at (the trigger does).
grant select (store, store_version, app_version, device_id, rev, state, updated_at)
  on public.sync_snapshots to authenticated;
grant insert (store, store_version, app_version, device_id, state) on public.sync_snapshots to authenticated;
grant update (store_version, app_version, device_id, state)        on public.sync_snapshots to authenticated;
grant delete on public.sync_snapshots to authenticated;   -- "Delete synced progress" (compliance 4.7)
grant select on public.sync_snapshots to service_role;    -- export-my-data

create policy snap_select on public.sync_snapshots for select to authenticated
  using (user_id = (select auth.uid()));
create policy snap_insert on public.sync_snapshots for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.profiles p where p.id = (select auth.uid())));
create policy snap_update on public.sync_snapshots for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.profiles p where p.id = (select auth.uid())));
create policy snap_delete on public.sync_snapshots for delete to authenticated
  using (user_id = (select auth.uid()));

-- Server-set rev and time; 60 writes per store per hour.
create function private.sync_snapshots_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.rev := 1; new.updated_at := now();
    new.writes_window_start := now(); new.writes_in_window := 1;
    return new;
  end if;
  new.user_id := old.user_id; new.store := old.store;           -- immutable keys
  new.rev := old.rev + 1; new.updated_at := now();
  if now() - old.writes_window_start > interval '1 hour' then
    new.writes_window_start := now(); new.writes_in_window := 1;
  else
    new.writes_window_start := old.writes_window_start;
    new.writes_in_window := old.writes_in_window + 1;
    if new.writes_in_window > 60 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger sync_snapshots_touch before insert or update on public.sync_snapshots
  for each row execute function private.sync_snapshots_touch();

-- Support safety net: one daily checkpoint of the PROGRESS row, newest 2 kept.
create table private.sync_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  rev bigint not null,
  app_version text not null,
  state jsonb not null,
  taken_at timestamptz not null default now()
);
create index sync_history_user_idx on private.sync_history (user_id, taken_at desc);
alter table private.sync_history enable row level security;   -- no policies: deny all but the owner
grant select on private.sync_history to service_role;          -- a support restore, by hand

create function private.sync_history_keep() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.store = 'progress' and not exists (
       select 1 from private.sync_history h
       where h.user_id = old.user_id and h.taken_at > now() - interval '24 hours') then
    insert into private.sync_history (user_id, rev, app_version, state)
      values (old.user_id, old.rev, old.app_version, old.state);
    delete from private.sync_history h
      where h.user_id = old.user_id
        and h.id not in (select id from private.sync_history
                         where user_id = old.user_id order by taken_at desc, id desc limit 2);
  end if;
  return null;
end $$;
create trigger sync_history_keep after update on public.sync_snapshots
  for each row execute function private.sync_history_keep();

-- "Delete synced progress" also clears the checkpoints.
create function private.sync_history_clear() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.sync_history where user_id = old.user_id;
  return null;
end $$;
create trigger sync_history_clear after delete on public.sync_snapshots
  for each row execute function private.sync_history_clear();

revoke all on function private.sync_snapshots_touch(), private.sync_history_keep(),
                       private.sync_history_clear() from public, anon, authenticated;

-- The head query (SyncPort.head) selects only store, rev, app_version,
-- store_version, device_id and updated_at. The state is downloaded only when
-- `rev` changed, which keeps egress near zero for a learner on one device
-- (docs/mobile/SCALING.md).
