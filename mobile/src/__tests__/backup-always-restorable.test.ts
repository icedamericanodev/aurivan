/**
 * Build D fix C1: the app can never export a backup it would refuse to restore.
 *
 * The bug: an untimed mock finished more than 24 h after it started saved
 * minutesUsed > 1440, the backup checker refuses that, so every backup
 * (and the undo snapshot a restore needs) became unrestorable.
 *
 * Two fixes, both tested here:
 * - at the source: minutesUsed is the answer time for untimed mocks and is
 *   always 1..1440; answer `ms` is clamped to the answer clock's cap;
 * - at export: buildBackup runs the phone's data through the SAME rules a
 *   restore checks, in "fit" mode (numbers clamped, lists cut to caps,
 *   broken totals repaired). A property-style test throws many random but
 *   plausible store states at it and checks every export reads back.
 */
import { getAllQuestions } from '../content/loader';
import { MAX_ANSWER_MS } from '../engine/answerClock';
import { readBackup } from '../engine/backup';
import { createRng } from '../engine/random';
import { dayKey } from '../engine/streak';
import { originalToDisplay } from '../engine/shuffle';
import { checkBackupText, currentBackup } from '../lib/backup';
import { finishSession, MAX_SESSION_MINUTES } from '../lib/finishSession';
import { startMock } from '../lib/sessions';
import { selectCert, useProgress, type CertProgress, type MockResult } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const ids = getAllQuestions('cisa').map((q) => q.id);
const restorable = () => checkBackupText(JSON.stringify(currentBackup(Date.now())));

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: { cisa: '2026-12-01' }, practiceTimer: false, paceOffer: undefined });
});
afterEach(() => jest.useRealTimers());

describe('the source: minutes and answer times always fit', () => {
  it('an untimed mock started 2 days ago gives a result readBackup accepts', () => {
    startMock('cisa', 50, { timing: 'untimed' });
    const s = useSession.getState().active!;
    for (const id of s.questionIds.slice(0, 3)) {
      const q = getAllQuestions('cisa').find((x) => x.id === id)!;
      useSession.getState().answer(id, { display: originalToDisplay(q.correct, s.perms[id]), correct: true, ms: 80_000 });
    }
    jest.setSystemTime(T0 + 2 * DAY); // paused for two days, then submitted
    finishSession();
    const [m] = selectCert(useProgress.getState(), 'cisa').mocks;
    // The answer time (3 × 80 s), not two days of wall time.
    expect(m.minutesUsed).toBe(4);
    const file = JSON.stringify(currentBackup(Date.now()));
    expect(() => readBackup(file, ['cisa'])).not.toThrow();
    expect(restorable().kind).toBe('ok');
  });

  it('a timed mock reopened days later ends at its deadline (80 minutes)', () => {
    startMock('cisa', 50);
    jest.setSystemTime(T0 + 3 * DAY);
    finishSession();
    expect(selectCert(useProgress.getState(), 'cisa').mocks[0].minutesUsed).toBe(80);
    expect(useSession.getState().active!.finishedAt).toBe(T0 + 80 * MIN);
  });

  it('answer times are clamped to the 30-minute cap when recorded', () => {
    useProgress.getState().recordAnswer('cisa', ids[0], true, undefined, { ms: 3 * 60 * MIN, mastery: false });
    expect(selectCert(useProgress.getState(), 'cisa').answers[ids[0]].ms).toBe(MAX_ANSWER_MS);
  });
});

describe('export: every state the phone can hold reads back', () => {
  /** A random but plausible cert, with the edges real use can reach. */
  function randomCert(seed: number): CertProgress {
    const rng = createRng(seed);
    const n = (max: number) => Math.floor(rng() * max);
    const pick = <T,>(xs: T[]) => xs[n(xs.length)];
    const answers: CertProgress['answers'] = {};
    for (let i = 0; i < 40; i++) {
      const attempts = 1 + n(5);
      answers[pick(ids)] = {
        attempts,
        correctCount: n(attempts + 1),
        lastCorrect: rng() < 0.6,
        lastAt: T0 - n(400) * DAY,
        // Daylight extended many times, or an old build that never capped.
        ...(rng() < 0.7 ? { ms: pick([0, 1, 45_000, MAX_ANSWER_MS, MAX_ANSWER_MS + 1, 3 * 3_600_000, 12.7 * 1000]) } : {}),
        // Build F: the last answer came from a game (skipped by milestones).
        ...(rng() < 0.3 ? { lastGame: true as const } : {}),
      };
    }
    // Logged mistakes, some already fixed on a later day (Loop Closed).
    const mistakes: CertProgress['mistakes'] = {};
    for (const qid of Object.keys(answers).slice(0, n(10))) {
      mistakes[qid] = { at: T0 - n(30) * DAY, ...(rng() < 0.5 ? { resolved: true } : {}), ...(rng() < 0.5 ? { fixedLater: true } : {}) };
    }
    const hitsOf = (len: number) => Array.from({ length: len }, (_, k) => ({ id: `card${k}`, ok: rng() < 0.8 }));
    const mocks: MockResult[] = Array.from({ length: n(8) }, (_, i) => {
      const total = pick([12, 50, 150]);
      return {
        id: `m${i}`,
        finishedAt: T0 - n(30) * DAY,
        total,
        correct: n(total + 1),
        // Long untimed mocks from 1.4.0: days of wall time.
        minutesUsed: pick([1, 80, 240, MAX_SESSION_MINUTES, 2 * DAY / MIN, 9 * DAY / MIN]),
        byDomain: { '1': { total: 10, correct: n(11) } },
        ...(rng() < 0.5 ? { timing: pick(['standard', 'plus25', 'plus50', 'untimed'] as const) } : {}),
        ...(rng() < 0.5 ? { minutesAllowed: pick([80, 360, 2000]) } : {}),
        ...(rng() < 0.5 ? { medianSec: pick([0, 90, 1800, 50_000]) } : {}),
        ...(rng() < 0.5 ? { unanswered: n(total + 1) } : {}),
        ...(rng() < 0.5 ? { checkpoints: Array.from({ length: n(14) }, () => pick([-3000, -2, 0, 0.15, 1, 4])) } : {}),
      };
    });
    return {
      answers,
      review: {},
      bookmarks: [],
      mocks,
      lessonsDone: [],
      mistakes,
      gameBest: { trap: n(10), sprint: pick([-40, 14, 2_000_000]), daylight: n(7) },
      gameRecent: { sprint: Array.from({ length: n(70) }, () => pick([-5000, 3, 9])) },
      notesRead: [],
      // Build F: game levels with their hit history and verdict runs (any length the
      // store could hold, plus an older build's over-long list and huge counts).
      ...(rng() < 0.7
        ? {
            gameGrowth: {
              trap: { tier: pick(['seedling', 'sapling', 'heartwood'] as const), up: n(3), down: n(3), hits: Array.from({ length: n(45) }, () => rng() < 0.5) },
              sprint: { tier: 'sapling' as const, up: pick([0, 2, 500]), down: 0, run: pick([0, 3, 2_000_000_000]) },
            },
          }
        : {}),
      // Build F: milestones (earned marks, the queue, counters, sure answers,
      // game misses, study days) and note cards of every Build F kind.
      ...(rng() < 0.7
        ? {
            milestones: {
              earned: Object.fromEntries(
                ['first-foothold', 'firm-footing:4', 'rooted:10', 'rooted:60', 'graduate', 'whole-grove', 'snare-wise'].filter(() => rng() < 0.5).map((k) => [k, T0 - n(90) * DAY]),
              ),
              ...(rng() < 0.5 ? { queue: ['rooted:10', 'graduate'] } : {}),
              ...(rng() < 0.5 ? { backfill: { at: T0 - n(30) * DAY, count: n(15), ...(rng() < 0.5 ? { seen: true } : {}) } } : {}),
              counts: { longRecall: n(40), graduated: pick([0, 50, 3_000_000_000]), loopFixed: n(12), gameFixes: n(12), paceRounds: n(4) },
              // Rolling windows and Long Memory's counted ids (an older build's
              // over-long lists too: export keeps the newest).
              ...(rng() < 0.6 ? { myths: hitsOf(pick([0, 3, 25, 40])), signposts: hitsOf(pick([0, 10, 18])) } : {}),
              ...(rng() < 0.5 ? { longIds: Object.keys(answers).slice(0, n(26)) } : {}),
              sure: Array.from({ length: n(70) }, () => rng() < 0.8),
              gameMisses: Object.fromEntries(Array.from({ length: n(6) }, () => [pick(ids), dayKey(T0 - n(20) * DAY)])),
              ...(rng() < 0.5 ? { cardMisses: { 'kt:D4:abc123': dayKey(T0 - n(5) * DAY), 'role:1A1.3:r001': dayKey(T0) } } : {}),
              days: n(100),
              lastDay: dayKey(T0 - n(5) * DAY),
              ...(rng() < 0.3 ? { returnedOn: dayKey(T0) } : {}),
            },
          }
        : {}),
      ...(rng() < 0.5
        ? {
            cards: {
              'role:1A1.3:r001': { box: 1, dueAt: T0, lastSeen: T0, reps: 1 },
              'seq:1A3.1:s001': { box: 2, dueAt: T0 + DAY, lastSeen: T0, reps: 2 },
              'flow:cisa-l-d1-engagement': { box: 1, dueAt: T0, lastSeen: T0, reps: 1 },
              'kt:D4:abc123': { box: pick([1, 3, 400]), dueAt: T0, lastSeen: T0, reps: 1 },
            },
          }
        : {}),
    };
  }

  it('200 random plausible states: every export passes the restore check', () => {
    for (let seed = 1; seed <= 200; seed++) {
      useProgress.setState({ byCert: { cisa: randomCert(seed) } });
      const read = restorable();
      if (read.kind !== 'ok') throw new Error(`seed ${seed}: ${read.code}`);
    }
  });

  it('fitting keeps good data exactly and only clamps what is out of range', () => {
    const good = randomCert(7);
    good.mocks = [{ id: 'a', finishedAt: T0, total: 50, correct: 30, minutesUsed: 2 * DAY / MIN, byDomain: {}, timing: 'untimed' }];
    useProgress.setState({ byCert: { cisa: good } });
    const read = restorable();
    if (read.kind !== 'ok') throw new Error(read.code);
    expect(read.data.progress.byCert.cisa.mocks![0]).toEqual({ ...good.mocks[0], minutesUsed: MAX_SESSION_MINUTES });
  });

  it('over-long rolling windows export their NEWEST results', () => {
    const cert = randomCert(3);
    const sure = [...Array.from({ length: 30 }, () => false), ...Array.from({ length: 50 }, () => true)];
    const myths = Array.from({ length: 40 }, (_, k) => ({ id: `r${k}`, ok: k >= 15 }));
    cert.milestones = { earned: {}, sure, myths };
    cert.gameGrowth = { trap: { tier: 'seedling', up: 0, down: 0, hits: [...Array.from({ length: 20 }, () => false), ...Array.from({ length: 30 }, () => true)] } };
    useProgress.setState({ byCert: { cisa: cert } });
    const read = restorable();
    if (read.kind !== 'ok') throw new Error(read.code);
    const back = read.data.progress.byCert.cisa;
    expect(back.milestones!.sure).toEqual(Array.from({ length: 50 }, () => true));
    expect(back.milestones!.myths).toHaveLength(25);
    expect(back.milestones!.myths![0].id).toBe('r15');
    expect(back.gameGrowth!.trap!.hits).toEqual(Array.from({ length: 30 }, () => true));
  });

  it('an old 1.1-shaped save (no new fields) exports and restores', () => {
    useProgress.setState({
      byCert: {
        cisa: {
          answers: { [ids[0]]: { attempts: 2, correctCount: 1, lastCorrect: true, lastAt: T0 } },
          review: {},
          bookmarks: [ids[1]],
          mocks: [{ id: 'mock-1', finishedAt: T0, total: 150, correct: 101, minutesUsed: 212, byDomain: { '1': { total: 27, correct: 19 } } }],
          lessonsDone: [],
          mistakes: {},
          gameBest: { trap: 8 },
        } as unknown as CertProgress,
      },
    });
    expect(restorable().kind).toBe('ok');
  });
});
