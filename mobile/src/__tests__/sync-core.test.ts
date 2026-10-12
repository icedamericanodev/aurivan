/**
 * Uplift Phase 7 (sync, built OFF): the sync cycle (lib/syncCore.ts) with
 * two or three simulated phones against ONE memory backend (the account).
 * Spec §3.1 S1–S4 and §3.8 Jest 2–4, 7, 8, and the brief's "test it hard":
 * interleaved devices, clock skew, older app versions, corrupt snapshots,
 * partial writes. The rule under test: saved progress is never lost, and
 * never overwritten without the learner's choice.
 */
import { createMemoryBackend, type MemoryBackend } from '../cloud/memory/backend';
import { CERTIFICATIONS } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { TERMS_VERSION } from '../engine/account';
import { createRng } from '../engine/random';
import { dayKey } from '../engine/streak';
import { stableStringify } from '../engine/syncMerge';
import { CONFLICT_WAITS, MAX_PUSH_BYTES, phoneSides, syncCycle, confirmFirstSync, prepareFirstSync, type CycleCtx, type Device, type PhoneData } from '../lib/syncCore';
import { SYNC_OFF, type SyncMeta } from '../store/sync';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const DAY = 86_400_000;
const ids = getAllQuestions('cisa').map((q) => q.id);
const CERT_IDS = CERTIFICATIONS.map((c) => c.id);
const USER = 'mem-user-maya';
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

// ── A simulated phone ───────────────────────────────────────────────────
interface Phone {
  name: string;
  data: PhoneData;
  meta: SyncMeta;
  busy: boolean;
  failNextWrite: boolean;
  clockSkew: number;
  device: Device;
  ctx: CycleCtx;
  waits: number[];
  writes: number;
}

let memory: MemoryBackend;
let now = T0;

function blankPhone(): PhoneData {
  return {
    settings: { onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2026-12-01' }, theme: 'system', motion: 'system', shuffleOptions: true, dailyGoal: 20, reminder: { enabled: false, hour: 19, minute: 0 }, haptics: true, gameRulesSeen: [], practiceTimer: false, badgesHidden: false },
    progress: { byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {}, reports: [] },
  };
}

function makePhone(name: string, data = blankPhone(), deviceId = '11111111-1111-4111-8111-11111111111' + name.length): Phone {
  const p = { name, data, meta: { ...SYNC_OFF, stamps: { settings: {}, progress: {} } }, busy: false, failNextWrite: false, clockSkew: 0, waits: [] as number[], writes: 0 } as Phone;
  p.device = {
    read: () => clone(p.data),
    write: async (next, opts) => {
      if (p.failNextWrite) {
        p.failNextWrite = false;
        throw new Error('disk full');
      }
      p.writes++;
      p.data = { settings: clone(next.settings), progress: { ...clone(next.progress), days: (p.data.progress as { days?: unknown }).days } };
      void opts;
    },
    meta: () => p.meta,
    setMeta: (m) => {
      p.meta = { ...p.meta, ...m };
    },
    busy: () => p.busy,
  };
  p.ctx = {
    port: memory.sync,
    device: p.device,
    deviceId: async () => deviceId,
    thisApp: '1.18.0',
    now: () => now + p.clockSkew,
    knownCertIds: CERT_IDS,
    wait: async (ms) => {
      p.waits.push(ms);
    },
  };
  return p;
}

/** The phone answers a question (attempts +1, now). */
function answer(p: Phone, qid: string, correct = true) {
  const prog = p.data.progress as { byCert: Record<string, { answers?: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> }>; streak: { current: number; best: number; lastDay: string | null; recentDays?: string[] } };
  const cp = (prog.byCert.cisa ??= { answers: {} });
  const a = (cp.answers ??= {});
  const prev = a[qid];
  a[qid] = { attempts: (prev?.attempts ?? 0) + 1, correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0), lastCorrect: correct, lastAt: now + p.clockSkew };
  const day = dayKey(now + p.clockSkew);
  if (prog.streak.lastDay !== day) prog.streak = { current: prog.streak.current + 1, best: Math.max(prog.streak.best, prog.streak.current + 1), lastDay: day, recentDays: [...(prog.streak.recentDays ?? []), day] };
}
/** The phone changes a synced setting (and stamps it, like lib/sync.ts does). */
function setGoal(p: Phone, g: number) {
  (p.data.settings as { dailyGoal: number }).dailyGoal = g;
  p.meta = { ...p.meta, stamps: { ...p.meta.stamps, settings: { ...p.meta.stamps.settings, dailyGoal: now + p.clockSkew } } };
}

/** First sync as the learner would accept it on the preview (merge). */
async function firstSync(p: Phone) {
  const r = await prepareFirstSync({ port: memory.sync, thisApp: '1.18.0', now: p.ctx.now, knownCertIds: CERT_IDS, read: p.device.read, stamps: p.meta.stamps });
  if (!r.ok) throw new Error(`prepare: ${r.code}`);
  return confirmFirstSync(p.ctx, r.prep, 'merge', null);
}
const answersOf = (p: Phone) => ((p.data.progress as { byCert: Record<string, { answers?: Record<string, { attempts: number }> }> }).byCert.cisa?.answers ?? {});
const syncedText = (p: Phone) => {
  const s = phoneSides(p.data, p.meta.stamps, { now, knownCertIds: CERT_IDS });
  return stableStringify({ s: s.settings.state, p: s.progress.state });
};

beforeEach(() => {
  now = T0;
  memory = createMemoryBackend({
    users: [{ userId: USER, email: 'maya@example.com', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: T0 - 30 * DAY }],
    signedIn: { userId: USER, authAt: T0 },
    now: () => now,
  });
});

// ── Two phones, step by step ────────────────────────────────────────────
describe('two phones, one account', () => {
  it('first syncs, then interleaved study: both end up with everything, nothing lost', async () => {
    const A = makePhone('A');
    const B = makePhone('Bb');
    answer(A, ids[0]);
    answer(B, ids[1]);
    expect((await firstSync(A)).kind).toBe('synced');
    expect((await firstSync(B)).kind).toBe('synced');
    // B now has A's answer too; A gets B's on its next sync.
    expect(Object.keys(answersOf(B)).sort()).toEqual([ids[0], ids[1]].sort());
    await syncCycle(A.ctx);
    expect(Object.keys(answersOf(A)).sort()).toEqual([ids[0], ids[1]].sort());

    // Both study at the same time, offline from each other; A pushes first, B conflicts and merges.
    now += 3_600_000;
    answer(A, ids[2]);
    answer(B, ids[3]);
    answer(B, ids[0], false);
    expect((await syncCycle(A.ctx)).kind).toBe('synced');
    const rb = await syncCycle(B.ctx);
    expect(rb).toEqual({ kind: 'synced', pulled: true, pushed: true });
    await syncCycle(A.ctx);
    expect(syncedText(A)).toBe(syncedText(B));
    expect(Object.keys(answersOf(A)).sort()).toEqual([ids[0], ids[1], ids[2], ids[3]].sort());
    // ids[0]: answered once on A, twice on B in total → max(1, 2) = 2 attempts, never inflated to 3.
    expect(answersOf(A)[ids[0]].attempts).toBe(2);
    // Nothing changed since: an idle cycle reads heads only.
    memory.control.calls.length = 0;
    expect((await syncCycle(A.ctx)).kind).toBe('idle');
    expect(memory.control.calls).toEqual(['sync.head', 'sync.head']);
  });

  it('a push that loses the race retries after 1 s, 3 s, 9 s, then says "offline", with nothing lost', async () => {
    const A = makePhone('A');
    answer(A, ids[0]);
    await firstSync(A);
    answer(A, ids[1]);
    for (let i = 0; i < 4; i++) memory.control.failNext('sync.push', 'conflict');
    // failNext covers one call at a time: re-arm before each retry.
    const wait = A.ctx.wait;
    A.ctx.wait = async (ms) => {
      memory.control.failNext('sync.push', 'conflict');
      await wait(ms);
    };
    const r = await syncCycle(A.ctx);
    expect(r).toEqual({ kind: 'failed', code: 'conflict' });
    expect(A.waits).toEqual([...CONFLICT_WAITS]);
    // The phone still has both answers; the next sync sends them.
    expect(Object.keys(answersOf(A))).toHaveLength(2);
    A.ctx.wait = wait;
    expect((await syncCycle(A.ctx)).kind).toBe('synced');
    expect(Object.keys((memory.control.snapshots(USER).progress!.state as { byCert: { cisa: { answers: object } } }).byCert.cisa.answers)).toHaveLength(2);
  });

  it('a reply lost after the server saved the push: the next sync pulls its own write and does not write again', async () => {
    const A = makePhone('A');
    answer(A, ids[0]);
    await firstSync(A);
    answer(A, ids[1]);
    memory.control.dropNextReply('sync.push');
    const r = await syncCycle(A.ctx);
    expect(r).toMatchObject({ kind: 'failed', code: 'offline' });
    const rev = memory.control.snapshots(USER).settings!.rev + memory.control.snapshots(USER).progress!.rev;
    expect((await syncCycle(A.ctx)).kind).toBe('synced');
    // Only the store whose reply was lost was pulled; nothing was written twice.
    expect(memory.control.snapshots(USER).settings!.rev + memory.control.snapshots(USER).progress!.rev).toBe(rev);
    expect((await syncCycle(A.ctx)).kind).toBe('idle');
  });

  it('a failed phone write changes nothing and is redone on the next sync', async () => {
    const A = makePhone('A');
    const B = makePhone('Bb');
    answer(A, ids[0]);
    await firstSync(A);
    answer(B, ids[1]);
    await firstSync(B);
    const before = clone(A.data);
    const metaBefore = clone(A.meta);
    A.failNextWrite = true;
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'failed', code: 'server' });
    expect(A.data).toEqual(before);
    expect(A.meta.lastRev).toEqual(metaBefore.lastRev);
    expect((await syncCycle(A.ctx)).kind).toBe('synced');
    expect(Object.keys(answersOf(A)).sort()).toEqual([ids[0], ids[1]].sort());
  });

  it('a pull waits while a quiz, lesson or game is open, then applies', async () => {
    const A = makePhone('A');
    const B = makePhone('Bb');
    answer(A, ids[0]);
    await firstSync(A);
    await firstSync(B);
    answer(B, ids[5]);
    await syncCycle(B.ctx);
    A.busy = true;
    const before = clone(A.data);
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'deferred' });
    expect(A.data).toEqual(before);
    expect(A.meta.deferredPull).toBe(true);
    A.busy = false;
    expect((await syncCycle(A.ctx)).kind).toBe('synced');
    expect(answersOf(A)[ids[5]]).toBeDefined();
    expect(A.meta.deferredPull).toBe(false);
  });
});

// ── Random interleavings ────────────────────────────────────────────────
describe('random interleavings of three phones (40 seeded runs)', () => {
  it('after everyone syncs twice, all phones agree, and every answer ever made is there', async () => {
    for (let seed = 1; seed <= 40; seed++) {
      memory = createMemoryBackend({
        users: [{ userId: USER, email: 'maya@example.com', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: T0 - 30 * DAY }],
        signedIn: { userId: USER, authAt: T0 },
        now: () => now,
      });
      now = T0;
      const rng = createRng(seed);
      const phones = [makePhone('A'), makePhone('Bb'), makePhone('Ccc')];
      phones[2].clockSkew = seed % 5 === 0 ? 3 * DAY : 0; // one phone's clock is wrong sometimes
      const made = new Map<string, number>();
      const pool = ids.slice(0, 25);
      for (const p of phones) await firstSync(p);
      for (let step = 0; step < 30; step++) {
        now += Math.floor(rng() * 3_600_000);
        const p = phones[Math.floor(rng() * phones.length)];
        const r = rng();
        if (r < 0.5) {
          const q = pool[Math.floor(rng() * pool.length)];
          answer(p, q, rng() < 0.6);
          made.set(q, Math.max(made.get(q) ?? 0, answersOf(p)[q].attempts));
        } else if (r < 0.6) {
          setGoal(p, [10, 20, 40][Math.floor(rng() * 3)]);
        } else if (r < 0.65) {
          memory.control.setOffline(true);
          await syncCycle(p.ctx);
          memory.control.setOffline(false);
        } else if (r < 0.7) {
          memory.control.dropNextReply('sync.push');
          await syncCycle(p.ctx);
        } else {
          await syncCycle(p.ctx);
        }
      }
      // Some more syncs while a clock may still be wrong (they must not lose anything either).
      for (let round = 0; round < 3; round++) for (const p of phones) await syncCycle(p.ctx);
      for (const [q, attempts] of made) for (const p of phones) expect(answersOf(p)[q]?.attempts ?? 0).toBeGreaterThanOrEqual(attempts);
      // A wrong clock is put right, and real time passes its future times: then everyone agrees.
      for (const p of phones) p.clockSkew = 0;
      if (seed % 5 === 0) now += 4 * DAY;
      for (let round = 0; round < 2; round++) for (const p of phones) await syncCycle(p.ctx);
      const texts = phones.map(syncedText);
      expect(`${seed}: ${texts[1] === texts[0] && texts[2] === texts[0]}`).toBe(`${seed}: true`);
      for (const [q, attempts] of made) {
        for (const p of phones) expect(answersOf(p)[q]?.attempts ?? 0).toBeGreaterThanOrEqual(attempts);
      }
    }
  });
});

// ── Clock skew ──────────────────────────────────────────────────────────
describe('clock skew', () => {
  it('a phone whose clock was days ahead: nothing is lost, and once its clock is right a later choice wins', async () => {
    const A = makePhone('A');
    const B = makePhone('Bb');
    B.clockSkew = 5 * DAY;
    await firstSync(A);
    await firstSync(B);
    setGoal(B, 40);
    answer(B, ids[11]);
    await syncCycle(B.ctx);
    now += 60_000;
    answer(A, ids[12]);
    await syncCycle(A.ctx);
    await syncCycle(B.ctx);
    // Answers from both phones, whatever the clocks said.
    for (const p of [A, B]) expect(Object.keys(answersOf(p)).sort()).toEqual([ids[11], ids[12]].sort());
    // B's clock is put right. Its stamp is now more than a day ahead, so it is pulled back to now:
    // a choice made later on A wins on both phones.
    B.clockSkew = 0;
    now += 60_000;
    await syncCycle(B.ctx);
    now += 60_000;
    setGoal(A, 10);
    await syncCycle(A.ctx);
    await syncCycle(B.ctx);
    expect((A.data.settings as { dailyGoal: number }).dailyGoal).toBe(10);
    expect((B.data.settings as { dailyGoal: number }).dailyGoal).toBe(10);
  });
});

// ── Untrusted pulls ─────────────────────────────────────────────────────
describe('hostile or unreadable snapshots pause sync and leave the phone byte-identical (§3.8 #2)', () => {
  const cases: [string, unknown, string?][] = [
    ['__proto__', JSON.parse('{"__proto__":{"x":1},"byCert":{},"streak":{"current":0,"best":0,"lastDay":null}}')],
    ['1.6 M characters', { byCert: {}, streak: { current: 0, best: 0, lastDay: null }, junk: 'x'.repeat(1_600_000) }],
    ['an unknown cert', { byCert: { zz9: {} }, streak: { current: 0, best: 0, lastDay: null } }],
    ['correct > total', { byCert: { cisa: { answers: { [ids[0]]: { attempts: 1, correctCount: 4, lastCorrect: true, lastAt: T0 } } } }, streak: { current: 0, best: 0, lastDay: null } }],
    ['a timestamp past 2100', { byCert: { cisa: { answers: { [ids[0]]: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: Date.UTC(2150, 0, 1) } } } }, streak: { current: 0, best: 0, lastDay: null } }],
    ['no streak', { byCert: {} }],
  ];
  it.each(cases)('%s', async (_name, state) => {
    const A = makePhone('A');
    answer(A, ids[3]);
    await firstSync(A);
    const before = clone(A.data);
    const snap = memory.control.writeSnapshot(USER, 'progress', { state });
    memory.control.calls.length = 0;
    const r = await syncCycle(A.ctx);
    expect(r).toEqual({ kind: 'paused', reason: 'unreadable' });
    expect(stableStringify(A.data)).toBe(stableStringify(before));
    // Never "repaired" by pushing over it.
    expect(memory.control.calls).not.toContain('sync.push');
    expect(memory.control.snapshots(USER).progress!.rev).toBe(snap.rev);
  });

  it('a snapshot from a newer minor app pauses ("newer") and is never pushed over; a newer patch with new data too', async () => {
    const A = makePhone('A');
    answer(A, ids[3]);
    await firstSync(A);
    answer(A, ids[4]);
    memory.control.writeSnapshot(USER, 'progress', { state: { byCert: {}, streak: { current: 0, best: 0, lastDay: null } }, appVersion: '1.19.0' });
    memory.control.calls.length = 0;
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'paused', reason: 'newer' });
    expect(memory.control.calls).not.toContain('sync.push');
    expect(memory.control.calls).not.toContain('sync.pull');
    // A newer PATCH whose data this app can't read is "newer" too (most likely new data, not damage).
    memory.control.writeSnapshot(USER, 'progress', { state: { byCert: {}, streak: { current: 0, best: 'many', lastDay: null } }, appVersion: '1.18.2' });
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'paused', reason: 'newer' });
    expect(answersOf(A)[ids[4]]).toBeDefined();
  });

  it('a snapshot from an older app merges (fields it never had are kept from this phone)', async () => {
    const A = makePhone('A');
    answer(A, ids[3]);
    (A.data.progress as { byCert: { cisa: Record<string, unknown> } }).byCert.cisa.lessonsDone = ['cisa-l-d1-engagement'];
    await firstSync(A);
    memory.control.writeSnapshot(USER, 'progress', {
      state: { byCert: { cisa: { answers: { [ids[9]]: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 - DAY } }, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {} } }, streak: { current: 1, best: 1, lastDay: dayKey(T0 - DAY) } },
      appVersion: '1.1.0',
    });
    expect((await syncCycle(A.ctx)).kind).toBe('synced');
    expect(Object.keys(answersOf(A)).sort()).toEqual([ids[3], ids[9]].sort());
    expect((A.data.progress as { byCert: { cisa: { lessonsDone: string[] } } }).byCert.cisa.lessonsDone).toEqual(['cisa-l-d1-engagement']);
  });
});

// ── Never overwrite ─────────────────────────────────────────────────────
describe('never overwritten without the learner’s choice', () => {
  it('#3: an empty phone is never pushed over the account’s progress (it merges back instead)', async () => {
    const A = makePhone('A');
    answer(A, ids[0]);
    answer(A, ids[1]);
    await firstSync(A);
    const rev = memory.control.snapshots(USER).progress!.rev;
    // The phone's progress vanished (Reset, or storage cleared): never sent as "the truth".
    A.data.progress = blankPhone().progress;
    await syncCycle(A.ctx);
    expect(memory.control.snapshots(USER).progress!.rev).toBe(rev);
    expect(Object.keys(answersOf(A)).sort()).toEqual([ids[0], ids[1]].sort());
  });

  it('the account’s copy deleted from another device: sync stops here and nothing is re-uploaded', async () => {
    const A = makePhone('A');
    answer(A, ids[0]);
    await firstSync(A);
    await memory.sync.deleteAll();
    memory.control.calls.length = 0;
    expect(await syncCycle(A.ctx)).toEqual({ kind: 'stopped' });
    expect(A.meta.enabled).toBe(false);
    expect(memory.control.calls).not.toContain('sync.push');
    expect(answersOf(A)[ids[0]]).toBeDefined();
  });

  it('#7: device-local fields never leave the phone', async () => {
    const A = makePhone('A');
    (A.data.settings as Record<string, unknown>).theme = 'dark';
    (A.data.settings as Record<string, unknown>).reminder = { enabled: true, hour: 6, minute: 30 };
    (A.data.settings as Record<string, unknown>).fitChanges = 4;
    (A.data.progress as Record<string, unknown>).plantSettings = { showPlant: false };
    (A.data.progress as Record<string, unknown>).today = { day: dayKey(T0), answered: 9 };
    answer(A, ids[0]);
    await firstSync(A);
    const snaps = memory.control.snapshots(USER);
    for (const k of ['reminder', 'theme', 'motion', 'haptics', 'onboarded', 'fitChanges', 'fitAskDays']) expect(snaps.settings!.state).not.toHaveProperty(k);
    for (const k of ['days', 'today', 'plantSettings']) expect(snaps.progress!.state).not.toHaveProperty(k);
    // And a pull keeps this phone's own values.
    const B = makePhone('Bb');
    await firstSync(B);
    expect((B.data.settings as Record<string, unknown>).theme).toBe('system');
    expect((B.data.settings as Record<string, unknown>).reminder).toEqual({ enabled: false, hour: 19, minute: 0 });
  });

  it('#8: pushes are refused above 1,500,000 UTF-8 bytes (paused, kept on the phone)', async () => {
    const A = makePhone('A');
    await firstSync(A);
    const answers: Record<string, unknown> = {};
    // Long ids made of 3-byte characters: under the character cap, over the byte cap.
    for (let i = 0; i < 4200; i++) answers[`${'€'.repeat(100)}${i}`] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: T0 };
    (A.data.progress as { byCert: Record<string, unknown> }).byCert.cisa = { answers };
    memory.control.calls.length = 0;
    const r = await syncCycle(A.ctx);
    expect(r).toEqual({ kind: 'paused', reason: 'toobig' });
    expect(memory.control.calls).not.toContain('sync.push');
    expect(Object.keys(answersOf(A))).toHaveLength(4200);
    expect(MAX_PUSH_BYTES).toBe(1_500_000);
  });

  it('the server’s write limit: rate_limited comes back with its Retry-After, nothing lost', async () => {
    const A = makePhone('A');
    await firstSync(A);
    memory.control.failNext('sync.push', 'rate_limited');
    answer(A, ids[7]);
    const r = await syncCycle(A.ctx);
    expect(r).toMatchObject({ kind: 'failed', code: 'rate_limited' });
    expect(answersOf(A)[ids[7]]).toBeDefined();
  });
});

describe('the memory backend plays the server’s sync rules', () => {
  it('rev concurrency, the 60-writes-an-hour window, Terms, a uuid device id, no shared objects', async () => {
    const push = (expectedRev: number | null, state: object = { a: 1 }, extra: Record<string, unknown> = {}) =>
      memory.sync.push({ store: 'settings', expectedRev, storeVersion: 1, appVersion: '1.18.0', deviceId: '11111111-1111-4111-8111-111111111111', state, ...extra });
    const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: { code: string }) => e.code);
    expect(await code(push(null, { a: 1 }, { deviceId: 'not-a-uuid' }))).toBe('invalid');
    const state = { a: { b: 1 } };
    expect((await push(null, state)).rev).toBe(1);
    state.a.b = 2; // the app changing its object later never changes the "server"
    expect((await memory.sync.pull('settings'))!.state).toEqual({ a: { b: 1 } });
    for (let rev = 1; rev < 60; rev++) await push(rev);
    const limited = await push(60).catch((e: { code: string; retryAfterSec?: number }) => e);
    expect(limited).toMatchObject({ code: 'rate_limited' });
    expect((limited as { retryAfterSec: number }).retryAfterSec).toBeGreaterThan(0);
    now += 3_600_001;
    expect((await push(60)).rev).toBe(61);
  });
});

describe('Download my data with synced progress', () => {
  it('the file holds the synced snapshots and restores as a backup (the device-only fields are filled in)', async () => {
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const { readBackup } = require('../engine/backup') as typeof import('../engine/backup');
    const A = makePhone('A');
    answer(A, ids[0]);
    answer(A, ids[1]);
    await firstSync(A);
    const text = await memory.auth.exportMyData({ appVersion: '1.18.0' });
    const data = readBackup(text, CERT_IDS, undefined, '1.18.0');
    expect(Object.keys(data.progress.byCert.cisa.answers!).sort()).toEqual([ids[0], ids[1]].sort());
    expect(data.settings.activeCertId).toBe('cisa');
    // Nothing device-local was ever in the account: the file's are neutral placeholders.
    expect(JSON.parse(text).stores.settings.state).not.toHaveProperty('reminder');
  });
});

describe('the screenshot seed (SHOTS=cloud)', () => {
  it('its account copies are what they claim: "progress" passes the checker, the others don’t', () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { readSnapshot } = require('../engine/syncMerge') as typeof import('../engine/syncMerge');
    const { shotsSeed, DEMO_USER_ID } = require('../cloud/memory/seed') as typeof import('../cloud/memory/seed');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const g = globalThis as { localStorage?: unknown };
    const ctx = { now: T0, knownCertIds: CERT_IDS, thisApp: '1.18.0' };
    try {
      for (const remote of ['progress', 'unreadable', 'newer'] as const) {
        g.localStorage = { getItem: () => JSON.stringify({ signedIn: true, remote }) };
        const snap = shotsSeed(T0).snapshots![DEMO_USER_ID]!.progress!;
        const read = () => readSnapshot('progress', snap, ctx);
        if (remote === 'progress') expect(read).not.toThrow();
        else expect(read).toThrow(remote === 'newer' ? /newer/ : /unknown-cert/);
      }
    } finally {
      delete g.localStorage;
    }
  });
});
