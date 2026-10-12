/**
 * This install's random id, for sync bookkeeping (which device wrote a
 * snapshot; spec §2.1 A3 and §3.7 `device_id`).
 *
 * - A random UUID, never a hardware id or advertising id.
 * - Kept in the secure key store, "this device only": NOT in AsyncStorage,
 *   so a phone restored from a backup gets a new id (it is a new install).
 * - Made the first time it is needed, then reused.
 */
import type { RandomPort, SecureKVPort } from './types';

const KEY = 'aurivan.device';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A version-4 UUID from 16 random bytes (RFC 9562 §5.4). */
export function uuidV4(bytes: Uint8Array): string {
  if (bytes.length < 16) throw new Error('uuid needs 16 random bytes');
  const b = Uint8Array.from(bytes.slice(0, 16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** True for an id this module made. */
export function isDeviceId(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

/** This install's id: the saved one, or a new one saved now. */
export async function getDeviceId(kv: SecureKVPort, random: RandomPort): Promise<string> {
  const saved = await kv.getItem(KEY);
  if (isDeviceId(saved)) return saved;
  const id = uuidV4(random.bytes(16));
  await kv.setItem(KEY, id, { thisDeviceOnly: true });
  return id;
}
