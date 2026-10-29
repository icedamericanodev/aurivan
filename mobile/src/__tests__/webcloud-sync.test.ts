/**
 * Accounts beta §1.3 and §7 (W4, W5, W11, S5): the website as a sync
 * device (src/webcloud/device.ts) running the phone's own cycle
 * (lib/syncCore.ts).
 *
 * 1. Two surfaces, one account (the memory backend): a simulated phone and
 *    the website study apart, sync in different orders, and converge:
 *    every answer, saved question, mock, note read, note and study day on
 *    both; phone-only study (game scores, a mock's pace checks) never lost
 *    through the website; ids and mocks never duplicated, even on an older
 *    page that drops the `origin` marker; a further sync pushes nothing.
 * 2. The REST path end to end against the fake Supabase: sign in, Terms,
 *    first sync, the stamped app version (mobile/LIVE_VERSION, so a phone on
 *    the Play release doesn't pause), a conflict, the write limit, a gzip
 *    bomb that pauses sync as unreadable and changes nothing, "use the
 *    account's progress here" with its undo copy, Delete synced progress.
 */
import { CompressionStream, DecompressionStream, ReadableStream } from 'stream/web';
import { gzipSync } from 'zlib';
import { createMemoryBackend, type MemoryBackend } from '../cloud/memory/backend';
import { TERMS_VERSION } from '../engine/account';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { plan } from '../engine/syncPlan';
import { dayKey } from '../engine/streak';
import { confirmFirstSync, prepareFirstSync, syncCycle, type CycleCtx, type Device, type PhoneData } from '../lib/syncCore';
import { SYNC_OFF, type SyncMeta } from '../engine/syncMeta';
import { pageLocks } from '../webcloud/browser';
import { decodeSnapshot, streamGzip, type StreamEnv } from '../webcloud/codec';
import { SYNC_META_KEY, SYNC_MIRROR_KEY, SYNC_UNDO_KEY } from '../webcloud/config';
import { createWebDevice, type WebDevice } from '../webcloud/device';
import { createWebCloud, accountsAllowed, type WebCloud } from '../webcloud/index';
import { fromWeb } from '../webcloud/toWeb';
import { FAKE_KEY, FAKE_URL, FakeSupabase, memoryStorage, seqRandom } from '../../jest/webcloud-fakes';
import { BANK, clone, fakeWeb, QUESTION_IDS, webAnswer, type FakeWeb } from '../../jest/webcloud-web';

const T0 = new Date(2026, 9, 20, 9, 0, 0).getTime();
const DAY = 86_400_000;
const USER = 'mem-user-maya';
const LIVE = '1.48.0';
const ids = QUESTION_IDS;
const env = { CompressionStream, DecompressionStream, ReadableStream } as unknown as StreamEnv;
let now = T0;

// ── A simulated phone (the same shape as sync-core.test.ts) ──────────────
interface Phone {
  data: PhoneData;
  meta: SyncMeta;
  device: Device;
  ctx: CycleCtx;
}
function makePhone(memory: MemoryBackend): Phone {
  const p = {
    data: {
      settings: { onboarded: true, activeCertId: 'cisa', theme: 'system', shuffleOptions: true, dailyGoal: 40, haptics: true, gameRulesSeen: [], practiceTimer: false },
      progress: { byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} },
    } as PhoneData,
    meta: { ...SYNC_OFF, stamps: { settings: {}, progress: {} } },
  } as Phone;
  p.device = {
    read: () => clone(p.data),
    write: async (next) => {
      p.data = clone(next);
    },
    meta: () => p.meta,
    setMeta: (m) => {
      p.meta = { ...p.meta, ...m };
    },
    busy: () => false,
  };
  p.ctx = { port: memory.sync, device: p.device, deviceId: async () => '11111111-1111-4111-8111-111111111111', thisApp: LIVE, now: () => now, knownCertIds: ['cisa'], wait: async () => {} };
  return p;
}
type Cert = { answers?: Record<string, { attempts: number; lastAt: number }>; mocks?: { id: string; checkpoints?: number[] }[]; gameBest?: Record<string, number>; bookmarks?: string[]; notesRead?: string[]; qNotes?: Record<string, unknown> };
const certOf = (d: PhoneData) => ((d.progress as { byCert: Record<string, Cert> }).byCert.cisa ?? {}) as Cert;
function phoneAnswer(p: Phone, id: string, ok = true) {
  const prog = p.data.progress as { byCert: Record<string, Cert>; streak: { current: number; best: number; lastDay: string | null; recentDays?: string[] } };
  const cp = (prog.byCert.cisa ??= {});
  const a = (cp.answers ??= {}) as Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }>;
  const prev = a[id];
  a[id] = { attempts: (prev?.attempts ?? 0) + 1, correctCount: (prev?.correctCount ?? 0) + (ok ? 1 : 0), lastCorrect: ok, lastAt: now };
  const day = dayKey(now);
  if (prog.streak.lastDay !== day) prog.streak = { current: prog.streak.current + 1, best: Math.max(prog.streak.best, prog.streak.current + 1), lastDay: day, recentDays: [...(prog.streak.recentDays ?? []), day] };
}

// ── The website over the memory backend ──────────────────────────────────
interface Site {
  web: FakeWeb;
  local: ReturnType<typeof memoryStorage>;
  device: WebDevice;
  ctx: CycleCtx;
}
function makeSite(memory: MemoryBackend, state = {}): Site {
  const web = fakeWeb(state);
  const local = memoryStorage();
  const device = createWebDevice({ host: web.host, storage: local, bank: BANK, clock: { now: () => now } });
  return { web, local, device, ctx: { port: memory.sync, device, deviceId: async () => '22222222-2222-4222-8222-222222222222', thisApp: LIVE, now: () => now, knownCertIds: ['cisa'], wait: async () => {} } };
}
async function firstSync(ctx: CycleCtx, read: () => PhoneData, stamps: SyncMeta['stamps'], mode: 'merge' | 'replace' = 'merge') {
  const r = await prepareFirstSync({ port: ctx.port, thisApp: LIVE, now: ctx.now, knownCertIds: ['cisa'], read, stamps });
  if (!r.ok) throw new Error(`prepare: ${r.code}`);
  return { prep: r.prep, result: await confirmFirstSync(ctx, r.prep, mode, null) };
}
/** The mapped study on each side, side by side (answers, saved, mocks, notes read, notes, days). */
function sameStudy(p: Phone, s: Site) {
  const fromSite = fromWeb(s.web.state, BANK, now, new Set((certOf(s.device.mirror()).mocks ?? []).map((m) => m.id)));
  const c = certOf(p.data);
  const known = (m?: Record<string, unknown>) => Object.fromEntries(Object.entries(m ?? {}).filter(([id]) => BANK.question(id)));
  expect(known(fromSite.cert.answers)).toEqual(known(c.answers));
  expect(fromSite.cert.bookmarks ?? []).toEqual((c.bookmarks ?? []).filter(BANK.question));
  expect((fromSite.cert.mocks ?? []).map((m) => m.id).sort()).toEqual((c.mocks ?? []).map((m) => m.id).sort());
  expect(fromSite.cert.notesRead ?? []).toEqual(c.notesRead ?? []);
  expect(known(fromSite.cert.qNotes)).toEqual(known(c.qNotes));
  const days = (p.data.progress as { streak: { recentDays?: string[] } }).streak.recentDays ?? [];
  expect(fromSite.studyDays.filter((d) => days[0] && d >= days[0])).toEqual(days);
}

describe('two surfaces, one account (memory backend phone + website device)', () => {
  let memory: MemoryBackend;
  beforeEach(() => {
    now = T0;
    memory = createMemoryBackend({
      users: [{ userId: USER, email: 'maya@example.com', providers: ['email'], termsVersion: TERMS_VERSION, createdAt: T0 - 30 * DAY }],
      signedIn: { userId: USER, authAt: T0 },
      now: () => now,
    });
  });

  it('converge both ways, keep phone-only study, never duplicate, and go quiet', async () => {
    const phone = makePhone(memory);
    phoneAnswer(phone, ids[0]);
    phoneAnswer(phone, ids[1], false);
    const pc = certOf(phone.data);
    pc.gameBest = { daylight: 7 };
    pc.mocks = [{ id: `mock-${T0 - DAY}`, finishedAt: T0 - DAY, total: 20, correct: 12, minutesUsed: 25, byDomain: { '1': { total: 20, correct: 12 } }, checkpoints: [0.1, -0.05] } as never];
    expect((await firstSync(phone.ctx, phone.device.read, phone.meta.stamps)).result.kind).toBe('synced');

    // The website studied on its own before signing in.
    now += 3_600_000;
    const site = makeSite(memory, {
      mockHistory: [{ id: 'web-lz1-abc12', finishedAt: now - 1000, total: 30, correct: 20, minutesUsed: 40, byDomain: { '2': { total: 30, correct: 20 } }, type: 'mini' }],
      bookmarks: [BANK.copy(ids[3])],
      qNotes: { [ids[2]]: { text: 'remember: risk first', ts: now - 500 } },
      score: { t: 50, c: 30 },
    });
    webAnswer(site.web, ids[2], true, now - 2000);
    webAnswer(site.web, ids[1], true, now - 1500);
    site.web.exam = '2026-12-15';
    const first = await firstSync(site.ctx, site.device.read, site.device.meta().stamps);
    expect(first.prep.case).toBe('both');
    expect(first.result.kind).toBe('synced');

    // The phone pulls the website's study.
    expect((await syncCycle(phone.ctx)).kind).toBe('synced');
    expect(Object.keys(certOf(phone.data).answers ?? {}).sort()).toEqual([ids[0], ids[1], ids[2]].sort());
    expect(certOf(phone.data).mocks!.map((m) => m.id).sort()).toEqual([`mock-${T0 - DAY}`, 'web-web-lz1-abc12']);
    expect((phone.data.settings as { examDates?: Record<string, string> }).examDates?.cisa).toBe('2026-12-15');
    // Phone-only study survived the website's push: game score and the mock's pace checks.
    expect(certOf(phone.data).gameBest).toEqual({ daylight: 7 });
    expect(certOf(phone.data).mocks!.find((m) => m.id.startsWith('mock-'))!.checkpoints).toEqual([0.1, -0.05]);
    // The website got the phone's study back, in its own shapes; nothing else of its record changed.
    expect((await syncCycle(site.ctx)).kind).toBe('idle');
    const ml = site.web.state.mockHistory as { id: string; origin?: string; type?: string }[];
    expect(ml.map((m) => [m.id, m.origin ?? null]).sort()).toEqual([['web-lz1-abc12', null], [`mock-${T0 - DAY}`, 'app']].sort());
    expect(ml.find((m) => m.id === 'web-lz1-abc12')!.type).toBe('mini');
    sameStudy(phone, site);
    // The older counters: 50 kept + the recount.
    expect((site.web.state.score as { t: number }).t).toBeGreaterThanOrEqual(50);

    // Quiet: nothing changed, nothing is pushed by either side.
    const pushes = () => memory.control.calls.filter((c) => c === 'sync.push').length;
    const before = pushes();
    expect((await syncCycle(site.ctx)).kind).toBe('idle');
    expect((await syncCycle(phone.ctx)).kind).toBe('idle');
    expect(pushes()).toBe(before);

    // Both study apart again (the same question on both), then sync in the other order.
    now += DAY;
    webAnswer(site.web, ids[0], false, now);
    webAnswer(site.web, ids[4], true, now + 10);
    now += 60_000;
    phoneAnswer(phone, ids[0]);
    phoneAnswer(phone, ids[5]);
    expect((await syncCycle(site.ctx)).kind).toBe('synced');
    expect((await syncCycle(phone.ctx)).kind).toBe('synced');
    expect((await syncCycle(site.ctx)).kind).toBe('synced');
    sameStudy(phone, site);
    // The later answer wins its result; attempts are never double counted.
    expect(certOf(phone.data).answers![ids[0]]).toMatchObject({ attempts: 2, lastAt: now });
    expect((await syncCycle(site.ctx)).kind).toBe('idle');
    expect((await syncCycle(phone.ctx)).kind).toBe('idle');
  });

  it('a lost or damaged mirror never pushes a blank picture over the account (security audit of 6f4469e, HIGH)', async () => {
    const phone = makePhone(memory);
    phoneAnswer(phone, ids[0]);
    certOf(phone.data).gameBest = { daylight: 9 };
    await firstSync(phone.ctx, phone.device.read, phone.meta.stamps);
    const site = makeSite(memory);
    await firstSync(site.ctx, site.device.read, site.device.meta().stamps);
    expect(site.device.meta().lastRev.progress).not.toBeNull();
    for (const damage of [() => site.local.removeItem(SYNC_MIRROR_KEY), () => site.local.setItem(SYNC_MIRROR_KEY, '{"v":1,"settings":')]) {
      damage();
      // Without the mirror the record's revs mean nothing: forgotten, so the cycle pulls and merges first.
      expect(site.device.meta().lastRev).toEqual({ settings: null, progress: null });
      expect(site.device.meta().lastPushedHash).toEqual({ settings: null, progress: null });
      now += 60_000;
      webAnswer(site.web, ids[11], true, now);
      const calls = memory.control.calls.length;
      expect((await syncCycle(site.ctx)).kind).toBe('synced');
      const mine = memory.control.calls.slice(calls);
      expect(mine.indexOf('sync.pull')).toBeGreaterThanOrEqual(0);
      expect(mine.indexOf('sync.pull')).toBeLessThan(mine.indexOf('sync.push'));
      const acct = memory.control.snapshots(USER).progress!.state as { byCert: { cisa: Cert } };
      expect(acct.byCert.cisa.gameBest).toEqual({ daylight: 9 });
      expect(Object.keys(acct.byCert.cisa.answers ?? {})).toEqual(expect.arrayContaining([ids[0], ids[11]]));
    }
  });

  it('an older page that drops the mocks\' origin marker never duplicates a mock', async () => {
    const phone = makePhone(memory);
    phoneAnswer(phone, ids[0]);
    certOf(phone.data).mocks = [{ id: 'mock-1790000000000', finishedAt: T0 - DAY, total: 10, correct: 5, minutesUsed: 9, byDomain: {} } as never];
    await firstSync(phone.ctx, phone.device.read, phone.meta.stamps);
    const site = makeSite(memory);
    site.web.stripOrigin = true;
    await firstSync(site.ctx, site.device.read, site.device.meta().stamps);
    expect((site.web.state.mockHistory as { origin?: string }[])[0].origin).toBeUndefined();
    now += 60_000;
    webAnswer(site.web, ids[1], true, now);
    for (let i = 0; i < 3; i++) {
      await syncCycle(site.ctx);
      await syncCycle(phone.ctx);
    }
    expect(certOf(phone.data).mocks!.map((m) => m.id)).toEqual(['mock-1790000000000']);
    expect((site.web.state.mockHistory as unknown[]).length).toBe(1);
  });

  it('a website exam date changed later wins by its stamp; the phone\'s other settings are untouched', async () => {
    const phone = makePhone(memory);
    phoneAnswer(phone, ids[0]);
    await firstSync(phone.ctx, phone.device.read, phone.meta.stamps);
    const site = makeSite(memory);
    await firstSync(site.ctx, site.device.read, site.device.meta().stamps);
    now += DAY;
    site.web.exam = '2027-01-20';
    expect((await syncCycle(site.ctx)).kind).toBe('synced');
    await syncCycle(phone.ctx);
    expect(phone.data.settings).toMatchObject({ examDates: { cisa: '2027-01-20' }, dailyGoal: 40, theme: 'system' });
    expect(memory.control.snapshots(USER).settings!.state).toMatchObject({ dailyGoal: 40 });
  });

  it('never applies a pull under an open practice set (deferred), then does after', async () => {
    const phone = makePhone(memory);
    phoneAnswer(phone, ids[0]);
    await firstSync(phone.ctx, phone.device.read, phone.meta.stamps);
    const site = makeSite(memory);
    await firstSync(site.ctx, site.device.read, site.device.meta().stamps);
    now += 60_000;
    phoneAnswer(phone, ids[7]);
    await syncCycle(phone.ctx);
    site.web.busy = true;
    const writes = site.web.writes;
    expect((await syncCycle(site.ctx)).kind).toBe('deferred');
    expect(site.web.writes).toBe(writes);
    site.web.busy = false;
    expect((await syncCycle(site.ctx)).kind).toBe('synced');
    expect(Object.keys(site.web.state.answerLog as object)).toContain(ids[7]);
  });
});

// ── The REST path, end to end ────────────────────────────────────────────
describe('the website over REST (fake Supabase)', () => {
  let server: FakeSupabase;
  let cloud: WebCloud;
  let web: FakeWeb;
  let local: ReturnType<typeof memoryStorage>;
  const gz = streamGzip(env);
  const make = () => {
    web = fakeWeb();
    local = memoryStorage();
    cloud = createWebCloud({ fetch: server.fetch, stores: { local, session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock: { now: () => now }, gzip: env, host: web.host, bank: BANK, appVersion: LIVE, origin: 'https://kaisip.com', url: FAKE_URL, apiKey: FAKE_KEY, wait: async () => {} });
  };
  const signIn = async () => {
    await cloud.auth.sendEmailCode('maya@example.com');
    return cloud.auth.verifyEmailCode('maya@example.com', server.codes.get('maya@example.com')!);
  };
  beforeEach(() => {
    now = T0;
    server = new FakeSupabase(() => now);
    make();
  });

  it('a shared computer keeps the sync record, the mirror and the undo copy in sessionStorage too (M2)', async () => {
    const session = memoryStorage();
    cloud = createWebCloud({ fetch: server.fetch, stores: { local, session }, random: seqRandom(), lock: pageLocks(), clock: { now: () => now }, gzip: env, host: web.host, bank: BANK, appVersion: LIVE, origin: 'https://kaisip.com', url: FAKE_URL, apiKey: FAKE_KEY, wait: async () => {} });
    await cloud.auth.sendEmailCode('maya@example.com');
    await cloud.auth.verifyEmailCode('maya@example.com', server.codes.get('maya@example.com')!, { shared: true });
    await cloud.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    webAnswer(web, ids[0], true, now - 1000);
    const prep = await cloud.prepareFirst();
    if (!prep.ok) throw new Error('prep');
    await cloud.confirmFirst(prep.prep, 'replace');
    const syncKeys = [SYNC_META_KEY, SYNC_MIRROR_KEY, SYNC_UNDO_KEY];
    for (const k of syncKeys) {
      expect(session.getItem(k)).not.toBeNull();
      expect(local.getItem(k)).toBeNull();
    }
    expect(cloud.device.meta().enabled).toBe(true);
    // Forgetting (sign-out) clears both storages.
    cloud.device.forget();
    cloud.device.dropUndo();
    for (const k of syncKeys) expect(session.getItem(k)).toBeNull();
  });

  it('pushes are stamped with the store versions passed in (the Play release\'s), not the engine\'s', async () => {
    cloud = createWebCloud({ fetch: server.fetch, stores: { local, session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock: { now: () => now }, gzip: env, host: web.host, bank: BANK, appVersion: LIVE, storeVersions: { progress: 2, settings: 1 }, origin: 'https://kaisip.com', url: FAKE_URL, apiKey: FAKE_KEY, wait: async () => {} });
    const info = await signIn();
    await cloud.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    webAnswer(web, ids[0], true, now - 1000);
    const prep = await cloud.prepareFirst();
    if (!prep.ok) throw new Error('prep');
    await cloud.confirmFirst(prep.prep, 'merge');
    expect(server.row(info.userId, 'progress')!.store_version).toBe(2);
    expect(server.row(info.userId, 'settings')!.store_version).toBe(1);
    expect(() => createWebCloud({ fetch: server.fetch, stores: { local, session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock: { now: () => now }, gzip: env, host: web.host, bank: BANK, appVersion: LIVE, storeVersions: { progress: 0, settings: 1 }, origin: 'https://kaisip.com' })).toThrow();
    expect(() => createWebCloud({ fetch: server.fetch, stores: { local, session: memoryStorage() }, random: seqRandom(), lock: pageLocks(), clock: { now: () => now }, gzip: env, host: web.host, bank: BANK, appVersion: LIVE, origin: 'https://kaisip.pages.dev' })).toThrow(/only on/);
  });

  it('only on https://kaisip.com', () => {
    expect(accountsAllowed('https://kaisip.com')).toBe(true);
    for (const o of ['null', 'file://', 'https://www.kaisip.com', 'https://kaisip.pages.dev', 'http://kaisip.com']) expect(accountsAllowed(o)).toBe(false);
  });

  it('first sync, then pushes stamped with LIVE_VERSION and the engine\'s store versions; a Play phone doesn\'t pause (W11)', async () => {
    const info = await signIn();
    webAnswer(web, ids[0], true, now - 1000);
    // Before the Terms: the server refuses writes (no profile row).
    const early = await cloud.prepareFirst();
    expect(early.ok).toBe(true);
    if (!early.ok) return;
    expect((await cloud.confirmFirst(early.prep, 'merge')).kind).toBe('failed');
    await cloud.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    expect((await cloud.syncNow()).kind).toBe('synced');
    const row = server.row(info.userId, 'progress')!;
    expect(row.app_version).toBe(LIVE);
    expect(row.store_version).toBe(PROGRESS_VERSION);
    expect(server.row(info.userId, 'settings')!.store_version).toBe(SETTINGS_VERSION);
    expect(row.state_gz.startsWith('H4sI')).toBe(true);
    const state = await decodeSnapshot(row, gz);
    expect(Object.keys((state as { byCert: { cisa: { answers: object } } }).byCert.cisa.answers)).toEqual([ids[0]]);
    // A phone on the Play release reads it: no "newer app" pause.
    expect(plan({ head: { rev: row.rev, appVersion: row.app_version }, meta: { lastRev: null, lastPushedHash: null }, setUp: true, switchPending: false, localHash: 'x', localEmpty: false, thisApp: LIVE }).kind).not.toBe('pause');
    // Nothing new: the next cycle sends nothing.
    const writes = server.calls.filter((c) => c.method === 'POST' || c.method === 'PATCH').length;
    expect((await cloud.syncNow()).kind).toBe('idle');
    expect(server.calls.filter((c) => c.method === 'POST' || c.method === 'PATCH').length).toBe(writes);
  });

  it('another device wrote first: conflict, pull, merge, push at the new rev', async () => {
    const info = await signIn();
    await cloud.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    webAnswer(web, ids[0], true, now - 1000);
    const prep = await cloud.prepareFirst();
    if (!prep.ok) throw new Error('prep');
    await cloud.confirmFirst(prep.prep, 'merge');
    // The phone writes directly on the server.
    const phoneState = await decodeSnapshot(server.row(info.userId, 'progress')!, gz);
    const pcs = (phoneState as { byCert: { cisa: { answers: Record<string, unknown> } } }).byCert.cisa;
    pcs.answers[ids[9]] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: now };
    now += 60_000;
    const raw = Buffer.from(JSON.stringify(phoneState));
    server.putRow(info.userId, 'progress', { state_gz: gzipSync(raw).toString('base64'), raw_bytes: raw.length });
    webAnswer(web, ids[8], true, now);
    expect((await cloud.syncNow()).kind).toBe('synced');
    const merged = await decodeSnapshot(server.row(info.userId, 'progress')!, gz);
    expect(Object.keys((merged as { byCert: { cisa: { answers: object } } }).byCert.cisa.answers).sort()).toEqual([ids[0], ids[8], ids[9]].sort());
    expect(Object.keys(web.state.answerLog as object).sort()).toEqual([ids[0], ids[8], ids[9]].sort());
  });

  it('a gzip bomb on the server pauses sync as unreadable and changes nothing here (S5)', async () => {
    const info = await signIn();
    await cloud.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    webAnswer(web, ids[0], true, now - 1000);
    const prep = await cloud.prepareFirst();
    if (!prep.ok) throw new Error('prep');
    await cloud.confirmFirst(prep.prep, 'merge');
    const before = clone(web.state);
    const mirror = local.getItem(SYNC_MIRROR_KEY);
    now += 60_000;
    server.putRow(info.userId, 'progress', { state_gz: gzipSync(Buffer.alloc(10_000_000)).toString('base64'), raw_bytes: 1_999_999 });
    expect(await cloud.syncNow()).toEqual({ kind: 'paused', reason: 'unreadable' });
    expect(web.state).toEqual(before);
    expect(local.getItem(SYNC_MIRROR_KEY)).toBe(mirror);
    // The same copy isn't downloaded again on the next try.
    const pulls = server.calls.filter((c) => c.path.includes('state_gz')).length;
    expect((await cloud.syncNow()).kind).toBe('paused');
    expect(server.calls.filter((c) => c.path.includes('state_gz')).length).toBe(pulls);
  });

  it('the write limit and the network read as calm results', async () => {
    await signIn();
    await cloud.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    webAnswer(web, ids[0], true, now - 1000);
    const prep = await cloud.prepareFirst();
    if (!prep.ok) throw new Error('prep');
    await cloud.confirmFirst(prep.prep, 'merge');
    now += 1000;
    webAnswer(web, ids[1], true, now);
    server.force('/rest/v1/sync_snapshots?select=store,rev,app_version,store_version,device_id,updated_at&store=eq.progress&rev', 400, { code: 'P0001', message: 'rate_limited' });
    expect(await cloud.syncNow()).toMatchObject({ kind: 'failed', code: 'rate_limited' });
    server.offline = true;
    expect(await cloud.syncNow()).toMatchObject({ kind: 'failed', code: 'offline' });
    server.offline = false;
    expect((await cloud.syncNow()).kind).toBe('synced');
  });

  it('"use the account\'s progress here" keeps this browser\'s record as the 7-day undo copy, and undo restores it', async () => {
    // The account already has progress from another device.
    const info = await signIn();
    await cloud.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    const acct = { byCert: { cisa: { answers: { [ids[5]]: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: now - 5000 } } } }, streak: { current: 1, best: 1, lastDay: dayKey(now - 5000) }, changedAt: {} };
    const raw = Buffer.from(JSON.stringify(acct));
    server.putRow(info.userId, 'progress', { state_gz: gzipSync(raw).toString('base64'), raw_bytes: raw.length });
    webAnswer(web, ids[6], true, now - 1000);
    const mine = clone(web.state);
    const prep = await cloud.prepareFirst();
    if (!prep.ok) throw new Error('prep');
    expect(prep.prep.case).toBe('both');
    expect((await cloud.confirmFirst(prep.prep, 'replace')).kind).not.toBe('failed');
    expect(Object.keys(web.state.answerLog as object)).toEqual([ids[5]]);
    expect(JSON.parse(local.getItem(SYNC_UNDO_KEY)!).state).toEqual(mine);
    expect(cloud.device.undo()?.state).toEqual(mine);
    now += 8 * DAY;
    expect(cloud.device.undo()).toBeNull();
  });

  it('a different account in the same browser never syncs until the learner chooses', async () => {
    await signIn();
    await cloud.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    webAnswer(web, ids[0], true, now - 1000);
    const prep = await cloud.prepareFirst();
    if (!prep.ok) throw new Error('prep');
    await cloud.confirmFirst(prep.prep, 'merge');
    await cloud.auth.signOut('local');
    await cloud.auth.sendEmailCode('other@example.com');
    await cloud.auth.verifyEmailCode('other@example.com', server.codes.get('other@example.com')!);
    expect(cloud.accountChanged()).toBe(true);
    const calls = server.calls.length;
    expect((await cloud.syncNow()).kind).toBe('idle');
    expect(server.calls.length).toBe(calls);
  });

  it('Delete synced progress removes both rows; this browser stops syncing (remote deleted)', async () => {
    const info = await signIn();
    await cloud.auth.acceptTerms({ termsVersion: TERMS_VERSION, ageConfirmed: true });
    webAnswer(web, ids[0], true, now - 1000);
    const prep = await cloud.prepareFirst();
    if (!prep.ok) throw new Error('prep');
    await cloud.confirmFirst(prep.prep, 'merge');
    await cloud.sync.deleteAll();
    expect(server.row(info.userId, 'progress')).toBeUndefined();
    expect(await cloud.syncNow()).toEqual({ kind: 'stopped' });
    expect(cloud.device.meta().enabled).toBe(false);
    // The website's own progress stays.
    expect(Object.keys(web.state.answerLog as object)).toEqual([ids[0]]);
  });
});
