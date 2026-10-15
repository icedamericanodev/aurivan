-- KaiSip: progress sync (Uplift Phase 7). NOT APPLIED ANYWHERE.
-- One validated snapshot per store per learner (security.md §4.1; spec
-- PHASE6_8.md §3.7). Append-only from the first `supabase db push` (Phase 9).
--
-- Plain English:
--  * Each learner has at most two rows here: their progress and their study
--    settings, each one JSON snapshot. The app checks every pull with the
--    same checker as a backup file, so the server only bounds size and shape;
--    it never reads or "repairs" progress.
--  * `rev` is a number the server raises on every write and NEVER reuses,
--    not even after the row is deleted and made again (security review P7
--    S1, code review N7): it is the write time in milliseconds, or one more
--    than the last rev this learner's store ever had, whichever is larger.
--    The app writes with `where rev = <the rev it last saw>`: zero rows
--    updated means another device wrote first, and the app pulls, merges and
--    tries again. A stale phone can never match a re-made row by accident.
--  * The server sets `rev` and `updated_at` itself (a trigger); a client
--    can't choose them, nor move a row to another learner or store.
--  * Writing needs a profile row (the Terms and the "16 or older" box were
--    accepted: Phase 6 review N10), not only a session.
--  * At most 60 writes per store per hour (the app needs about 6 a day),
--    counted OUTSIDE the row (private.sync_writes), so deleting and
--    re-inserting can't reset the count: deletes count too. A delete is
--    never refused ("Delete synced progress" must always work); only inserts
--    and updates over the limit are.
--  * The progress state is at most 2,000,000 bytes (the app caps it at
--    1.5 MB); the settings state at most 96 KB (the app caps it at 64 KB;
--    real settings are a few hundred bytes). jsonb text adds spaces, hence
--    the margins.
--  * A daily checkpoint of the progress row is kept for support (newest 2),
--    in schema private, for as long as the synced copy exists. "Delete
--    synced progress" (the row's own delete) clears the checkpoints too;
--    deleting the account cascades everything. Turning sync off on a phone
--    deletes nothing here.

create table public.sync_snapshots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  store text not null check (store in ('progress', 'settings')),
  store_version int not null check (store_version between 1 and 1000),
  app_version text not null check (app_version ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$'),
  device_id uuid not null,                       -- random per install (secure store), not a hardware id
  rev bigint not null default 1,                 -- server-owned (the trigger), never reused
  state jsonb not null check (jsonb_typeof(state) = 'object'
                              and octet_length(state::text) <= 2000000),  -- jsonb text adds spaces; the app caps at 1.5 MB
  updated_at timestamptz not null default now(),
  primary key (user_id, store),
  -- Settings are tiny: 96 KB here, 64 KB in the app (security review P7 S2).
  constraint sync_settings_size check (store <> 'settings' or octet_length(state::text) <= 98304)
);
alter table public.sync_snapshots enable row level security;
revoke all on public.sync_snapshots from anon, authenticated;
-- Column grants: the app never reads or writes user_id, and never writes
-- rev or updated_at (the trigger does).
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

-- The write counter and each store's highest rev, outside the row, so a
-- delete followed by an insert neither resets the count nor reuses a rev.
create table private.sync_writes (
  user_id uuid not null references auth.users (id) on delete cascade,
  store text not null,
  window_start timestamptz not null,
  n int not null,
  last_rev bigint not null,
  primary key (user_id, store)
);
alter table private.sync_writes enable row level security;   -- no policies: deny all but the owner

-- Counts one write (or delete) and returns the next rev: the write time in
-- ms, or one more than the store's last rev (or than `p_old_rev`), whichever
-- is larger. Over 60 in the hour and `p_refuse`: rate_limited (the whole
-- statement rolls back, the count included).
create function private.sync_next_rev(p_user uuid, p_store text, p_old_rev bigint, p_refuse boolean) returns bigint
language plpgsql set search_path = '' as $$
declare
  v_n int;
  v_rev bigint := greatest((extract(epoch from clock_timestamp()) * 1000)::bigint, coalesce(p_old_rev, 0) + 1);
begin
  insert into private.sync_writes as w (user_id, store, window_start, n, last_rev)
    values (p_user, p_store, now(), 1, v_rev)
  on conflict (user_id, store) do update
    set n = case when now() - w.window_start > interval '1 hour' then 1 else w.n + 1 end,
        window_start = case when now() - w.window_start > interval '1 hour' then now() else w.window_start end,
        last_rev = greatest(w.last_rev + 1, excluded.last_rev)
  returning w.n, w.last_rev into v_n, v_rev;
  if p_refuse and v_n > 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return v_rev;
end $$;

-- Server-set rev and time, immutable keys, 60 writes per store per hour.
-- SECURITY DEFINER (schema private, search_path '') only because it writes
-- private.sync_writes, which the app's role can't reach.
create function private.sync_snapshots_touch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    -- Counted, never refused. Skipped when the account itself is being
    -- deleted (the cascade): its counter row goes with it.
    if exists (select 1 from auth.users u where u.id = old.user_id) then
      perform private.sync_next_rev(old.user_id, old.store, old.rev, false);
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    new.rev := private.sync_next_rev(new.user_id, new.store, 0, true);
    new.updated_at := now();
    return new;
  end if;
  new.user_id := old.user_id; new.store := old.store;           -- immutable keys
  new.rev := private.sync_next_rev(old.user_id, old.store, old.rev, true);
  new.updated_at := now();
  return new;
end $$;
create trigger sync_snapshots_touch before insert or update or delete on public.sync_snapshots
  for each row execute function private.sync_snapshots_touch();

-- Support safety net: one daily checkpoint of the PROGRESS row, newest 2 kept
-- while the synced copy exists (the privacy notice says so).
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
                       private.sync_history_clear(), private.sync_next_rev(uuid, text, bigint, boolean)
  from public, anon, authenticated;

-- The head query (SyncPort.head) selects only store, rev, app_version,
-- store_version, device_id and updated_at. The state is downloaded only when
-- `rev` changed, which keeps egress near zero for a learner on one device
-- (docs/mobile/SCALING.md).
--
-- Never add public.sync_snapshots or any private table to the
-- `supabase_realtime` publication (supabase/tests/20_sync.sql checks it).
