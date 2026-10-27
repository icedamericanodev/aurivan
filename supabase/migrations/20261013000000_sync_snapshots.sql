-- KaiSip: progress sync (Uplift Phase 7). NOT APPLIED ANYWHERE.
-- One validated snapshot per store per learner (security.md §4.1; spec
-- PHASE6_8.md §3.7). Edited in place before the first apply (accounts beta,
-- 27 Oct 2026: gzip snapshots, one support checkpoint); append-only from the
-- first apply to the hosted project.
--
-- Plain English:
--  * Each learner has at most two rows here: their progress and their study
--    settings, each one JSON snapshot, gzipped and base64-encoded by the app
--    or the website before upload (`state_gz`). The phone and the web check
--    every pull with the same checker as a backup file, so the server only
--    bounds size and shape; it never reads, unzips or "repairs" progress.
--  * The snapshot format (one codec on every client, and in export-my-data):
--      state_gz  = base64( gzip( UTF-8 JSON text of the store ) ), standard
--                  alphabet with padding; gzip with mtime 0 and no file name,
--                  so it always starts with "H4sI" (1f 8b 08).
--      raw_bytes = the byte length of that UTF-8 JSON text before gzip.
--                  Readers refuse a row whose unzipped size differs, and
--                  never unzip more than 2,000,000 bytes (a gzip-bomb guard:
--                  the server can't check what is inside the gzip).
--      encoding  = 'gzip+base64', the only value today. A new format later
--                  is a new value plus a new migration; clients refuse any
--                  value they don't know.
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
--  * Sizes: the unzipped progress is at most 2,000,000 bytes (the app caps
--    it at 1.5 MB), its base64 gzip at most 700,000 characters (a heavy
--    learner is about 23 KB); settings at most 98,304 bytes unzipped (the
--    app caps them at 64 KB; real settings are a few hundred bytes) and
--    32,768 characters zipped. `state_gz` is stored uncompressed (storage
--    external): gzip doesn't shrink further, so Postgres shouldn't try.
--  * A daily checkpoint of the progress row is kept for support (the newest
--    one only), in schema private, for as long as the synced copy exists.
--    "Delete synced progress" (the row's own delete) clears it too;
--    deleting the account cascades everything. Turning sync off on a phone
--    deletes nothing here.

create table public.sync_snapshots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  store text not null check (store in ('progress', 'settings')),
  store_version int not null check (store_version between 1 and 1000),
  app_version text not null check (app_version ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$'),
  device_id uuid not null,                       -- random per install (secure store), not a hardware id
  rev bigint not null default 1,                 -- server-owned (the trigger), never reused
  encoding text not null default 'gzip+base64' check (encoding = 'gzip+base64'),
  -- base64 gzip: the gzip magic number ("H4sI"), the base64 alphabet only,
  -- whole 4-character groups, at most 700,000 characters (the length is
  -- checked first, so the pattern never scans an oversized value).
  state_gz text not null check (octet_length(state_gz) <= 700000
                                and octet_length(state_gz) % 4 = 0
                                and state_gz ~ '^H4sI[A-Za-z0-9+/]+={0,2}$'),
  raw_bytes int not null check (raw_bytes between 2 and 2000000),   -- the app caps at 1.5 MB
  updated_at timestamptz not null default now(),
  primary key (user_id, store),
  -- Settings are tiny: 96 KB unzipped here, 64 KB in the app (security review P7 S2).
  constraint sync_settings_size check (store <> 'settings' or (octet_length(state_gz) <= 32768 and raw_bytes <= 98304))
);
alter table public.sync_snapshots alter column state_gz set storage external;
alter table public.sync_snapshots enable row level security;
revoke all on public.sync_snapshots from anon, authenticated;
-- Column grants: the app never reads or writes user_id, never writes rev or
-- updated_at (the trigger does), and never chooses the encoding (the default).
grant select (store, store_version, app_version, device_id, rev, encoding, state_gz, raw_bytes, updated_at)
  on public.sync_snapshots to authenticated;
grant insert (store, store_version, app_version, device_id, state_gz, raw_bytes) on public.sync_snapshots to authenticated;
grant update (store_version, app_version, device_id, state_gz, raw_bytes)        on public.sync_snapshots to authenticated;
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

-- Support safety net: one daily checkpoint of the PROGRESS row, only the
-- newest kept, while the synced copy exists (the privacy notice says so).
-- Stored exactly as the row held it (still gzipped).
create table private.sync_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  rev bigint not null,
  app_version text not null,
  encoding text not null,
  state_gz text not null,
  raw_bytes int not null,
  taken_at timestamptz not null default now()
);
alter table private.sync_history alter column state_gz set storage external;
create index sync_history_user_idx on private.sync_history (user_id, taken_at desc);
alter table private.sync_history enable row level security;   -- no policies: deny all but the owner
grant select on private.sync_history to service_role;          -- a support restore, by hand

create function private.sync_history_keep() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.store = 'progress' and not exists (
       select 1 from private.sync_history h
       where h.user_id = old.user_id and h.taken_at > now() - interval '24 hours') then
    insert into private.sync_history (user_id, rev, app_version, encoding, state_gz, raw_bytes)
      values (old.user_id, old.rev, old.app_version, old.encoding, old.state_gz, old.raw_bytes);
    delete from private.sync_history h
      where h.user_id = old.user_id
        and h.id not in (select id from private.sync_history
                         where user_id = old.user_id order by taken_at desc, id desc limit 1);
  end if;
  return null;
end $$;
create trigger sync_history_keep after update on public.sync_snapshots
  for each row execute function private.sync_history_keep();

-- "Delete synced progress" also clears the checkpoint.
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
-- store_version, device_id and updated_at. The state (state_gz, raw_bytes,
-- encoding) is downloaded only when `rev` changed, which keeps egress near
-- zero for a learner on one device (docs/mobile/SCALING.md: egress is the
-- first Free-plan limit to run out).
--
-- Never add public.sync_snapshots or any private table to the
-- `supabase_realtime` publication (supabase/tests/20_sync.sql checks it).
