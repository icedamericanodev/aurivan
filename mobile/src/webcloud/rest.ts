/**
 * The website's SyncPort (accounts beta §1.1): the learner's two synced
 * snapshots in `public.sync_snapshots`, through the database's REST API
 * (PostgREST). The same port the phone's sync cycle (lib/syncCore.ts) uses.
 *
 * Plain English for the founder:
 * - head: only rev, app version, store version, device and time, so the
 *   (bigger) data is downloaded only when it changed. Saves egress.
 * - pull: the zipped copy, unzipped and checked by codec.ts. A copy that
 *   can't be read comes back with `state: null`, which the sync cycle's
 *   strict checker refuses, so sync PAUSES as "unreadable" (never crashes,
 *   never changes this browser's progress).
 * - push: zipped by codec.ts (too large: "too_big", sync pauses). A first
 *   copy is inserted; an existing one is updated ONLY where the server's rev
 *   is still the one this browser saw (`rev=eq.<rev>`). Zero rows updated,
 *   or an insert that finds a row, means another device wrote first:
 *   'conflict', and the cycle pulls, merges and tries again.
 * - The database's row rules (RLS) limit every call to the signed-in
 *   learner's own rows; this code never names a user id in a filter.
 *
 * Pure TypeScript: no React, no storage. The network comes through auth.ts.
 */
import { CloudError, type SnapshotHead, type SyncPort, type SyncStore } from '../cloud/types';
import { decodeSnapshot, encodeSnapshot, type GzipPort } from './codec';
import { toCloudError } from './errors';
import type { WebAuth } from './auth';

const HEAD_COLS = 'store,rev,app_version,store_version,device_id,updated_at';
const PULL_COLS = `${HEAD_COLS},encoding,state_gz,raw_bytes`;
const SEMVER = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORES: readonly SyncStore[] = ['settings', 'progress'];

/** One row's head, checked (a row that doesn't look like the table's is a server problem). */
function headOf(store: SyncStore, row: unknown): SnapshotHead {
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new CloudError('server');
  const r = row as Record<string, unknown>;
  const updatedAt = typeof r.updated_at === 'string' ? Date.parse(r.updated_at) : NaN;
  if (
    r.store !== store ||
    typeof r.rev !== 'number' ||
    !Number.isSafeInteger(r.rev) ||
    typeof r.app_version !== 'string' ||
    !SEMVER.test(r.app_version) ||
    typeof r.store_version !== 'number' ||
    !Number.isInteger(r.store_version) ||
    typeof r.device_id !== 'string' ||
    !Number.isFinite(updatedAt)
  ) {
    throw new CloudError('server');
  }
  return { store, rev: r.rev, appVersion: r.app_version, storeVersion: r.store_version, deviceId: r.device_id, updatedAt };
}

export function createRestSync(auth: Pick<WebAuth, 'authedFetch'>, gz: GzipPort): SyncPort {
  /** A signed-in REST call → the rows (an array), or a CloudError. */
  const rows = async (path: string, init: { method: string; headers?: Record<string, string>; body?: string }): Promise<unknown[]> => {
    const res = await auth.authedFetch(`/rest/v1/${path}`, init, 'rest');
    const text = await res.text();
    if (res.status < 200 || res.status >= 300) throw toCloudError('rest', res.status, text, res);
    if (res.status === 204 || text === '') return [];
    try {
      const v: unknown = JSON.parse(text);
      if (!Array.isArray(v)) throw new CloudError('server');
      return v;
    } catch (e) {
      throw e instanceof CloudError ? e : new CloudError('server');
    }
  };
  const checkStore = (s: SyncStore) => {
    if (!STORES.includes(s)) throw new CloudError('invalid', undefined, 'store');
  };

  return {
    async head(store) {
      checkStore(store);
      const found = await rows(`sync_snapshots?select=${HEAD_COLS}&store=eq.${store}&limit=1`, { method: 'GET' });
      return found.length ? headOf(store, found[0]) : null;
    },

    async pull(store) {
      checkStore(store);
      const found = await rows(`sync_snapshots?select=${PULL_COLS}&store=eq.${store}&limit=1`, { method: 'GET' });
      if (!found.length) return null;
      const head = headOf(store, found[0]);
      const row = found[0] as Record<string, unknown>;
      try {
        return { ...head, state: await decodeSnapshot({ encoding: row.encoding, state_gz: row.state_gz, raw_bytes: row.raw_bytes }, gz) };
      } catch {
        // Unreadable (a bomb, a damaged or odd copy): null fails the strict checker, so the cycle pauses.
        return { ...head, state: null };
      }
    },

    async push(i) {
      checkStore(i.store);
      if (!SEMVER.test(i.appVersion) || !Number.isInteger(i.storeVersion) || !UUID_RE.test(i.deviceId)) throw new CloudError('invalid', undefined, 'row');
      if (!i.state || typeof i.state !== 'object' || Array.isArray(i.state)) throw new CloudError('invalid', undefined, 'state');
      const enc = await encodeSnapshot(i.store, i.state, gz);
      const cols = { store_version: i.storeVersion, app_version: i.appVersion, device_id: i.deviceId, state_gz: enc.state_gz, raw_bytes: enc.raw_bytes };
      const headers = { prefer: 'return=representation' };
      let out: unknown[];
      if (i.expectedRev === null) {
        // A row already there answers 409: another device wrote first.
        out = await rows(`sync_snapshots?select=${HEAD_COLS}`, { method: 'POST', headers, body: JSON.stringify({ store: i.store, ...cols }) });
      } else {
        if (!Number.isSafeInteger(i.expectedRev)) throw new CloudError('invalid', undefined, 'row');
        out = await rows(`sync_snapshots?select=${HEAD_COLS}&store=eq.${i.store}&rev=eq.${i.expectedRev}`, { method: 'PATCH', headers, body: JSON.stringify(cols) });
      }
      // Zero rows: the server's rev moved on (or the row was deleted): another device wrote first.
      if (!out.length) throw new CloudError('conflict');
      return headOf(i.store, out[0]);
    },

    async deleteAll() {
      await rows('sync_snapshots?store=in.(progress,settings)', { method: 'DELETE', headers: { prefer: 'return=minimal' } });
    },
  };
}
