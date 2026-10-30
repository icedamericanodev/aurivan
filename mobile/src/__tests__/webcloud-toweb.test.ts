/**
 * Accounts beta §1.3: the account ↔ website mapping (src/webcloud/toWeb.ts).
 *
 * Property tests (seeded, 200 random learners each way):
 * - toWeb(fromWeb(x)) = x on the mapped fields, for website records x;
 * - fromWeb(toWeb(y)) = y on the mapped fields, for account copies y.
 * Then the details the plan names: mock ids round-trip ("web-" stripped
 * back, app mocks keep their id with `origin: 'app'`, even when an older page
 * drops the marker), every other website field is kept, bookmark copies and
 * tags, ids the website doesn't have are skipped there, and the rebuilt
 * derived counters (score, ds, answeredIds, missedQuestions).
 * Plus the engine change it needs (engine/webImport.ts readWebState and the
 * `origin` marker) and the syncMeta move (no behaviour change).
 */
import { createRng, type Rng } from '../engine/random';
import { stableStringify } from '../engine/syncMerge';
import { readWebState } from '../engine/webImport';
import { SYNC_OFF as ENGINE_SYNC_OFF } from '../engine/syncMeta';
import { SYNC_OFF as STORE_SYNC_OFF } from '../store/sync';
import { dayKey } from '../engine/streak';
import { fromWeb, rebuildDerived, toWeb, webChanges, noChanges, MAPPED_WEB_FIELDS, type AccountView, type WebState } from '../webcloud/toWeb';
import { BANK, NOTE_IDS, QUESTION_IDS } from '../../jest/webcloud-web';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = Date.UTC(2026, 9, 28, 9, 0, 0);
const DAY = 86_400_000;
const pickN = <T,>(r: Rng, list: readonly T[], n: number): T[] => {
  const out = new Set<T>();
  while (out.size < Math.min(n, list.length)) out.add(list[Math.floor(r() * list.length)]);
  return [...out];
};
const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const past = (r: Rng) => NOW - int(r, 1, 300) * DAY - int(r, 0, DAY - 1);
const oneOf = <T,>(r: Rng, list: readonly T[]) => list[Math.floor(r() * list.length)];
const sortObj = (o: Record<string, unknown>) => JSON.parse(stableStringify(o));

/** A random website record in the website's own (sanitised) shapes: mapped fields only. */
function randomWeb(r: Rng): WebState {
  const answerLog: Record<string, unknown> = {};
  for (const id of pickN(r, QUESTION_IDS, int(r, 0, 25))) {
    const attempts = int(r, 1, 6);
    const e: Record<string, unknown> = { attempts, correctCount: int(r, 0, attempts), lastCorrect: r() < 0.6, lastAt: past(r) };
    if (r() < 0.3) e.ms = int(r, 0, 600_000);
    if (r() < 0.3) e.lastConfidence = oneOf(r, ['sure', 'unsure', 'guessing']);
    if (r() < 0.1) e.lastRetest = true;
    answerLog[id] = e;
  }
  const review: Record<string, unknown> = {};
  for (const id of pickN(r, QUESTION_IDS, int(r, 0, 10))) {
    const lastSeen = past(r);
    review[id] = { box: int(r, 1, 5), dueAt: lastSeen + int(r, 1, 10) * DAY, lastSeen, reps: int(r, 0, 8) };
  }
  const mistakeLog: Record<string, unknown> = {};
  for (const id of pickN(r, QUESTION_IDS, int(r, 0, 10))) {
    const m: Record<string, unknown> = { at: past(r), resolved: r() < 0.4 };
    if (r() < 0.7) m.picked = oneOf(r, ['A', 'B', 'C', 'D']);
    if (r() < 0.3) m.confidence = oneOf(r, ['sure', 'unsure', 'guessing']);
    if (r() < 0.2) m.slip = oneOf(r, ['role', 'priority', 'misread']);
    if (r() < 0.1) m.fixedLater = true;
    mistakeLog[id] = m;
  }
  const mockHistory: Record<string, unknown>[] = [];
  const n = int(r, 0, 4);
  for (let i = 0; i < n; i++) {
    const total = int(r, 10, 150);
    const fromApp = r() < 0.4;
    const m: Record<string, unknown> = {
      id: fromApp ? `mock-${1_790_000_000_000 + i}` : `web-${(1000 + i).toString(36)}-${int(r, 10000, 99999)}`,
      finishedAt: NOW - (i + 1) * DAY - int(r, 0, 1000),
      total,
      correct: int(r, 0, total),
      minutesUsed: int(r, 1, 240),
      byDomain: { '1': { total: 5, correct: int(r, 0, 5) }, '4': { total: 7, correct: int(r, 0, 7) } },
    };
    if (r() < 0.5) m.timing = 'standard';
    if (r() < 0.5) m.minutesAllowed = 240;
    if (r() < 0.5) m.medianSec = int(r, 10, 200);
    if (r() < 0.5) m.unanswered = int(r, 0, Math.min(5, total));
    if (fromApp) m.origin = 'app';
    mockHistory.push(m);
  }
  const ticks = (k: number) => Object.fromEntries(pickN(r, NOTE_IDS, k).map((id) => [id, true]));
  const qNotes: Record<string, unknown> = {};
  for (const id of pickN(r, QUESTION_IDS, int(r, 0, 5))) qNotes[id] = { text: `note ${int(r, 1, 999)} on ${id}`, ts: past(r) };
  const studyDays = [...new Set(Array.from({ length: int(r, 0, 20) }, () => dayKey(past(r))))].sort();
  const bookmarks = pickN(r, QUESTION_IDS, int(r, 0, 6)).map((id) => BANK.copy(id)!);
  return { answerLog, review, bookmarks, mistakeLog, mockHistory, topicReviewed: ticks(int(r, 0, 6)), topicViewed: ticks(int(r, 0, 6)), topicTicksSchema: 2, qNotes, studyDays };
}

/** The mapped fields of a website record, in a comparable form (bookmarks and ticks as id sets). */
function webView(w: WebState) {
  const ids = (x: unknown) => Object.keys((x ?? {}) as object).sort();
  return sortObj({
    answerLog: w.answerLog ?? {},
    review: w.review ?? {},
    bookmarks: ((w.bookmarks ?? []) as { id: string }[]).map((b) => b.id).sort(),
    mistakeLog: w.mistakeLog ?? {},
    mockHistory: w.mockHistory ?? [],
    topicReviewed: ids(w.topicReviewed),
    topicViewed: ids(w.topicViewed),
    qNotes: w.qNotes ?? {},
    studyDays: w.studyDays ?? [],
  });
}

/** A random account copy (byCert.cisa, mapped fields only, in the checker's canonical form). */
function randomAccount(r: Rng): AccountView {
  // Built from a random website record through the reader, then given app-made mocks and tombstone-free notes:
  // every field is then exactly what a checked snapshot holds.
  const web = randomWeb(r);
  const read = readWebState(web, BANK, NOW);
  const cert = read.cert;
  if (r() < 0.7) {
    cert.mocks = [...(cert.mocks ?? []), { id: `mock-${1_780_000_000_000 + int(r, 1, 1e6)}`, finishedAt: NOW - 500 * DAY, total: 20, correct: 11, minutesUsed: 30, byDomain: { '2': { total: 20, correct: 11 } } }];
  }
  delete cert.notesEverRead;
  return { cert, studyDays: read.studyDays };
}
const accountView = (a: AccountView) => {
  const c = { ...a.cert };
  delete c.notesEverRead;
  if (c.mocks) c.mocks = [...c.mocks].sort((x, y) => (x.id < y.id ? -1 : 1));
  return sortObj({ cert: c, studyDays: a.studyDays });
};

describe('round trips (property tests, 200 learners each way)', () => {
  it('toWeb(fromWeb(x)) = x on the mapped fields', () => {
    const r = createRng(20261028);
    for (let i = 0; i < 200; i++) {
      const x = randomWeb(r);
      const back = toWeb(fromWeb(x, BANK, NOW), {}, BANK);
      expect(webView(back)).toEqual(webView(x));
    }
  });

  it('fromWeb(toWeb(y)) = y on the mapped fields', () => {
    const r = createRng(7);
    for (let i = 0; i < 200; i++) {
      const y = randomAccount(r);
      const back = fromWeb(toWeb(y, {}, BANK), BANK, NOW);
      expect(accountView(back)).toEqual(accountView(y));
    }
  });

  it('a record unchanged since the last sync shows no changes (nothing to push)', () => {
    const r = createRng(99);
    for (let i = 0; i < 50; i++) {
      const y = randomAccount(r);
      const web = toWeb(y, randomWeb(r), BANK);
      expect(noChanges(webChanges(web, toWeb(y, web, BANK)))).toBe(true);
    }
  });
});

describe('mock ids', () => {
  const mock = (id: string) => ({ id, finishedAt: NOW - DAY, total: 10, correct: 5, minutesUsed: 12, byDomain: {} });

  it('a website mock is "web-…" in the account and loses the prefix on the way back', () => {
    const acct = fromWeb({ mockHistory: [mock('web-lz1-abc12')] }, BANK, NOW);
    expect(acct.cert.mocks!.map((m) => m.id)).toEqual(['web-web-lz1-abc12']);
    const web = toWeb(acct, {}, BANK);
    expect((web.mockHistory as { id: string; origin?: string }[]).map((m) => [m.id, m.origin])).toEqual([['web-lz1-abc12', undefined]]);
  });

  it('an app mock keeps its id on the website, marked origin "app", and reads back without a prefix', () => {
    const web = toWeb({ cert: { mocks: [{ ...mock('mock-1790000000000'), checkpoints: [0.1, -0.05] }] }, studyDays: [] }, {}, BANK);
    expect(web.mockHistory).toEqual([{ ...mock('mock-1790000000000'), origin: 'app' }]);
    expect(fromWeb(web, BANK, NOW).cert.mocks!.map((m) => m.id)).toEqual(['mock-1790000000000']);
  });

  it('an older page that drops the marker still reads app mocks back by id (the account copy names them)', () => {
    const web = { mockHistory: [mock('mock-1790000000000')] };
    expect(fromWeb(web, BANK, NOW).cert.mocks!.map((m) => m.id)).toEqual(['web-mock-1790000000000']);
    expect(fromWeb(web, BANK, NOW, new Set(['mock-1790000000000'])).cert.mocks!.map((m) => m.id)).toEqual(['mock-1790000000000']);
  });

  it('keeps the website\'s own full / mini label', () => {
    const before = { mockHistory: [{ ...mock('web-a1'), type: 'mini' }] };
    const web = toWeb(fromWeb(before, BANK, NOW), before, BANK);
    expect((web.mockHistory as { type?: string }[])[0].type).toBe('mini');
  });

  it('a website export (file import, engine/webImport.ts) honours the marker too: no duplicate of the phone\'s own mock', () => {
    const read = readWebState({ mockHistory: [{ ...mock('mock-1'), origin: 'app' }, mock('web-2')] }, BANK, NOW);
    expect(read.cert.mocks!.map((m) => m.id).sort()).toEqual(['mock-1', 'web-web-2']);
  });
});

describe('toWeb keeps the website whole', () => {
  it('every field it doesn\'t map is kept as it is (theme, plant, the mock in progress, logs …)', () => {
    const before: WebState = { plant: { species: 'narra' }, readinessLog: [{ day: '2026-10-01', min: 40 }], confidenceLog: [{ qId: 'x' }], mockQueueIds: ['d1_001'], selectedDomain: '3', glossMastered: { a: true }, finalWeekDone: {}, cleanLog: { d1_001: { first: 1, last: 2 } } };
    const after = toWeb({ cert: {}, studyDays: [] }, before, BANK);
    for (const k of Object.keys(before)) expect(after[k]).toEqual(before[k]);
    for (const k of MAPPED_WEB_FIELDS) expect(after).toHaveProperty(k);
  });

  it('bookmarks: bank copies, the website\'s order first, its tags kept; unknown ids skipped (the account keeps them)', () => {
    const [a, b, c] = QUESTION_IDS;
    const before = { bookmarks: [{ ...BANK.copy(c), tag: 'tricky-wording' }, BANK.copy(a)] };
    const after = toWeb({ cert: { bookmarks: [a, b, c, 'd9_999_retired'] }, studyDays: [] }, before, BANK);
    expect((after.bookmarks as { id: string; tag?: string }[]).map((x) => [x.id, x.tag])).toEqual([
      [c, 'tricky-wording'],
      [a, undefined],
      [b, undefined],
    ]);
  });

  it('notes: a deleted note (tombstone) is simply absent on the website; ticks keep the website\'s own value', () => {
    const [a, b] = QUESTION_IDS;
    const note = NOTE_IDS[0];
    const after = toWeb({ cert: { qNotes: { [a]: { text: '', ts: NOW - DAY }, [b]: { text: 'mine', ts: NOW - DAY } }, notesRead: [note] }, studyDays: [] }, { topicReviewed: { [note]: NOW - 5 * DAY } }, BANK);
    expect(after.qNotes).toEqual({ [b]: { text: 'mine', ts: NOW - DAY } });
    expect(after.topicReviewed).toEqual({ [note]: NOW - 5 * DAY });
    expect(after.topicTicksSchema).toBe(2);
  });

  it('study days: the account\'s plus the older ones the website kept', () => {
    const after = toWeb({ cert: {}, studyDays: ['2026-10-01', '2026-10-02'] }, { studyDays: ['2025-01-01', '2026-10-01'] }, BANK);
    expect(after.studyDays).toEqual(['2025-01-01', '2026-10-01', '2026-10-02']);
  });
});

describe('the rebuilt counters (score, ds, answeredIds, missedQuestions)', () => {
  it('recount answerLog, keep what was counted before answerLog existed, and list the open mistakes', () => {
    const [a, b, c, d] = QUESTION_IDS.filter((id) => BANK.domainOf(id) === '1').slice(0, 4);
    const e = QUESTION_IDS.find((id) => BANK.domainOf(id) === '4')!;
    const old = QUESTION_IDS.find((id) => BANK.domainOf(id) === '2')!;
    const before: WebState = {
      // 100 answers counted, only 3 of them in answerLog (the rest are from before web v12.3).
      score: { t: 100, c: 60 },
      ds: { '1': { t: 70, c: 40 }, '2': { t: 30, c: 20 } },
      answerLog: { [a]: { attempts: 3, correctCount: 2, lastCorrect: true, lastAt: NOW - DAY } },
      answeredIds: { '2': { [old]: true }, all: {} },
      missedQuestions: [BANK.copy(old)],
    };
    const after = toWeb(
      {
        cert: {
          answers: {
            [a]: { attempts: 4, correctCount: 3, lastCorrect: true, lastAt: NOW },
            [b]: { attempts: 2, correctCount: 0, lastCorrect: false, lastAt: NOW },
            [e]: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: NOW },
          },
          mistakes: { [b]: { at: NOW - 2 * DAY }, [c]: { at: NOW - 3 * DAY }, [d]: { at: NOW - DAY, resolved: true } },
        },
        studyDays: [],
      },
      before,
      BANK,
    );
    // 97 / 58 kept from before answerLog; 7 answers / 4 right recounted.
    expect(after.score).toEqual({ t: 104, c: 62 });
    expect((after.ds as Record<string, unknown>)['1']).toEqual({ t: 67 + 6, c: 38 + 3 });
    expect((after.ds as Record<string, unknown>)['2']).toEqual({ t: 30, c: 20 });
    expect((after.ds as Record<string, unknown>)['4']).toEqual({ t: 1, c: 1 });
    expect(after.answeredIds).toMatchObject({ '1': { [a]: true, [b]: true }, '2': { [old]: true }, '4': { [e]: true }, all: {} });
    // The older miss with no mistake entry stays; then the open mistakes, oldest first; the fixed one is gone.
    expect((after.missedQuestions as { id: string }[]).map((q) => q.id)).toEqual([old, c, b]);
  });

  it('is stable: rebuilding twice gives the same counters', () => {
    const r = createRng(5);
    const web = randomWeb(r);
    web.score = { t: 500, c: 300 };
    const once = toWeb(fromWeb(web, BANK, NOW), web, BANK);
    const twice = rebuildDerived(once, once, BANK);
    expect(twice.score).toEqual(once.score);
    expect(twice.ds).toEqual(once.ds);
  });
});

describe('the syncMeta move (no behaviour change)', () => {
  it('store/sync.ts re-exports the engine\'s SYNC_OFF', () => {
    expect(STORE_SYNC_OFF).toBe(ENGINE_SYNC_OFF);
    expect(ENGINE_SYNC_OFF).toEqual({
      enabled: false,
      accountHash: null,
      lastRev: { settings: null, progress: null },
      lastAt: { settings: null, progress: null },
      lastPushedHash: { settings: null, progress: null },
      pausedRev: { settings: null, progress: null },
      lastSyncAt: null,
      pausedReason: null,
      deferredPull: false,
    });
  });
});
