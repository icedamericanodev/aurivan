/**
 * Phase 5a: the slip coach ("Your pattern") and Coach me (assisted answers
 * at half weight), plus saved-progress compatibility for both.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCertification } from '../content/certifications';
import { ASSISTED_WEIGHT, answerCredit, computeReadiness, type AnswerRecord } from '../engine/readiness';
import { readinessRange, RANGE_MIN_ANSWERS } from '../engine/readinessRange';
import { patternsOf, slipCoach, SLIP_COACH_MIN, type SlipInput } from '../engine/slipCoach';
import { eliminateTip } from '../engine/tips';
import { lastWholeWordIndex } from '../engine/games/priorityLens';
import { DAY_MS, INTERVAL_DAYS, nextReview } from '../engine/srs';
import { selectCert, useProgress } from '../store/progress';
import { useSession, type ActiveSession } from '../store/session';

// Use the library's in-memory mock. babel-jest hoists jest.mock() above the
// imports, so it still takes effect before any module loads AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const cisa = getCertification('cisa')!;

// ── Slip coach ──────────────────────────────────────────────────────────
// Key B, runner-up C (from the "Final two:" tip, ORIGINAL letters).
const TIPS = ['Eliminate: {{A}} is late and {{D}} is out of scope.', 'Final two: {{B}} beats {{C}} because it comes first.'];
const mk = (o: Partial<SlipInput>): SlipInput => ({ correct: 'B', tips: TIPS, stem: 'What should the auditor do?', ...o });

describe('slip coach', () => {
  it('stays quiet below 5 tagged mistakes and says how many are left', () => {
    const r = slipCoach([mk({ slip: 'role' }), mk({ slip: 'role' }), mk({}), mk({}), mk({}), mk({})]);
    expect(r).toEqual({ ready: false, tagged: 2, needed: SLIP_COACH_MIN - 2 });
  });

  it('names the runner-up pattern and routes to Trap Spotter', () => {
    const r = slipCoach([
      ...Array.from({ length: 3 }, () => mk({ slip: 'misread', picked: 'C' })),
      mk({ slip: 'role', picked: 'A' }),
      mk({ slip: 'knowledge', picked: 'D' }),
    ]);
    expect(r.ready).toBe(true);
    if (!r.ready) return;
    expect(r.pattern).toBe('runner-up');
    expect(r.count).toBe(3);
    expect(r.game).toBe('trap');
    expect(r.title).toBe('You often pick the runner-up');
  });

  it('counts priority misses from the tag and from "Misread" on a priority-word stem', () => {
    const stem = 'Which of the following should the auditor do FIRST?';
    expect(patternsOf(mk({ slip: 'misread', stem }))).toContain('priority');
    expect(patternsOf(mk({ slip: 'misread' }))).not.toContain('priority');
    const r = slipCoach([
      mk({ slip: 'priority', picked: 'A' }),
      mk({ slip: 'priority', picked: 'D' }),
      mk({ slip: 'misread', picked: 'A', stem }),
      mk({ slip: 'role', picked: 'A' }),
      mk({ slip: 'symptom', picked: 'D' }),
    ]);
    expect(r.ready && r.pattern).toBe('priority');
    expect(r.ready && r.game).toBe('priority');
  });

  it('spots over-confident misses and routes to Calibrated Sprint', () => {
    const r = slipCoach([
      ...Array.from({ length: 4 }, (_, i) => mk({ slip: (['role', 'symptom', 'tech-first', 'knowledge'] as const)[i], picked: 'A', confidence: 'sure' })),
      mk({ slip: 'misread', picked: 'D', confidence: 'unsure' }),
    ]);
    expect(r.ready && r.pattern).toBe('overconfident');
    expect(r.ready && r.game).toBe('sprint');
  });

  it('compares the runner-up on ORIGINAL letters (a correct pick is never a runner-up)', () => {
    expect(patternsOf(mk({ picked: 'B' }))).toEqual([]);
    expect(patternsOf(mk({ picked: 'C' }))).toEqual(['runner-up']);
  });

  it('falls back to the learner’s own tag; content gaps have no game', () => {
    const r = slipCoach(Array.from({ length: 5 }, () => mk({ slip: 'knowledge', picked: 'A' })));
    expect(r.ready && r.pattern).toBe('knowledge');
    expect(r.ready && r.game).toBeNull();
  });
});

describe('eliminateTip', () => {
  it('finds the Eliminate line, and is undefined for older tips', () => {
    expect(eliminateTip(TIPS)).toBe(TIPS[0]);
    expect(eliminateTip(['The trap is A.', 'Think like an auditor.'])).toBeUndefined();
  });
});

// ── Assisted answers at half weight ─────────────────────────────────────
/** `perDomain` answers per domain, `rate` share correct; `assisted` marks every answer as assisted. */
function answers(perDomain: number, rate: number, assisted = false): Record<string, AnswerRecord> {
  const out: Record<string, AnswerRecord> = {};
  for (const d of cisa.domains) {
    for (let i = 0; i < perDomain; i++) {
      const ok = i < Math.round(perDomain * rate);
      out[`d${d.id}_${i}`] = { attempts: 1, correctCount: ok ? 1 : 0, lastCorrect: ok, lastAt: 0, ...(assisted ? { lastAssisted: true } : {}) };
    }
  }
  return out;
}

describe('assisted answers count half toward readiness', () => {
  it('credit: 1 clean correct, 0.5 assisted correct, 0 wrong (assisted or not)', () => {
    const base = { attempts: 1, correctCount: 1, lastAt: 0 };
    expect(answerCredit({ ...base, lastCorrect: true })).toBe(1);
    expect(answerCredit({ ...base, lastCorrect: true, lastAssisted: true })).toBe(ASSISTED_WEIGHT);
    expect(ASSISTED_WEIGHT).toBe(0.5);
    expect(answerCredit({ ...base, lastCorrect: false, lastAssisted: true })).toBe(0);
  });

  it('all-correct assisted answers give exactly half the readiness of clean ones', () => {
    const clean = computeReadiness(cisa, answers(20, 1));
    const helped = computeReadiness(cisa, answers(20, 1, true));
    expect(clean.score).toBe(100);
    expect(helped.score).toBe(50);
    // Accuracy (plain "how many right") is unchanged; mastery is halved.
    expect(helped.domains[0].accuracy).toBe(1);
    expect(helped.domains[0].mastery).toBeCloseTo(0.5);
    expect(helped.domains[0].assisted).toBe(20);
  });

  it('records without lastAssisted (older saves) score exactly as before', () => {
    const r = computeReadiness(cisa, answers(20, 0.7));
    for (const d of r.domains) expect(d.credit).toBe(d.mastered);
  });

  it('the range counts assisted answers as half the evidence: wider, and later to appear', () => {
    const clean = readinessRange(cisa, computeReadiness(cisa, answers(40, 0.7)));
    const helped = readinessRange(cisa, computeReadiness(cisa, answers(40, 0.7, true)));
    expect(clean.enough && helped.enough).toBe(true);
    if (!clean.enough || !helped.enough) return;
    expect(helped.high - helped.low).toBeGreaterThan(clean.high - clean.low);
    expect(helped.centre).toBeLessThan(clean.centre);

    // 50 assisted answers = 25 effective: below the 40-answer gate.
    const few = readinessRange(cisa, computeReadiness(cisa, answers(10, 0.7, true)));
    expect(few.enough).toBe(false);
    if (!few.enough) expect(few.needed).toBe(RANGE_MIN_ANSWERS - 25);
  });
});

// ── Stores: recording, and old saves ────────────────────────────────────
describe('Coach me in the stores', () => {
  beforeEach(() => useProgress.getState().resetCert('cisa'));

  it('recordAnswer marks assisted answers; clean answers keep the old shape', () => {
    const { recordAnswer } = useProgress.getState();
    recordAnswer('cisa', 'd1_001', true, 'sure', { assisted: true });
    recordAnswer('cisa', 'd1_002', true, 'sure');
    const a = selectCert(useProgress.getState(), 'cisa').answers;
    expect(a.d1_001.lastAssisted).toBe(true);
    expect('lastAssisted' in a.d1_002).toBe(false);
    // A later clean answer clears the assisted mark.
    recordAnswer('cisa', 'd1_001', true, 'sure');
    expect(selectCert(useProgress.getState(), 'cisa').answers.d1_001.lastAssisted).toBeUndefined();
  });

  it('recordMistake keeps how sure the learner was', () => {
    useProgress.getState().recordMistake('cisa', 'd1_003', 'A', 'sure');
    expect(selectCert(useProgress.getState(), 'cisa').mistakes.d1_003.confidence).toBe('sure');
  });

  it('an older v2 save (no lastAssisted, no mistake confidence) still loads and scores the same', async () => {
    const answersOld = { d1_001: { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: 1 } };
    await AsyncStorage.setItem(
      'aurivan.progress.v1',
      JSON.stringify({
        state: {
          byCert: { cisa: { answers: answersOld, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: { d1_002: { picked: 'A', at: 1, slip: 'role' } }, gameBest: {} } },
          streak: { current: 1, best: 1, lastDay: '2026-10-06' },
          today: { day: '2026-10-06', answered: 1 },
          days: {},
        },
        version: 2,
      }),
    );
    await useProgress.persist.rehydrate();
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.answers.d1_001.lastAssisted).toBeUndefined();
    expect(cp.mistakes.d1_002.slip).toBe('role');
    expect(computeReadiness(cisa, cp.answers).domains[0].credit).toBe(1);
  });

  const session = (mode: ActiveSession['mode']): ActiveSession => ({
    id: 's',
    mode,
    certId: 'cisa',
    title: 't',
    questionIds: ['d1_001'],
    perms: { d1_001: ['A', 'B', 'C', 'D'] },
    index: 0,
    responses: {},
    flagged: [],
    startedAt: 0,
  });

  it('Coach me is never recorded in a mock exam', () => {
    useSession.getState().start(session('mock'));
    useSession.getState().markCoached('d1_001');
    expect(useSession.getState().active?.coached).toBeUndefined();
    useSession.getState().start(session('practice'));
    useSession.getState().markCoached('d1_001');
    expect(useSession.getState().active?.coached).toEqual(['d1_001']);
  });

  it('an older in-progress session (no coached / assisted) still loads', async () => {
    await AsyncStorage.setItem(
      'aurivan.session.v1',
      JSON.stringify({ state: { active: { ...session('practice'), responses: { d1_001: { display: 'A', correct: false } } } }, version: 1 }),
    );
    await useSession.persist.rehydrate();
    const a = useSession.getState().active!;
    expect(a.coached).toBeUndefined();
    expect(a.responses.d1_001.assisted).toBeUndefined();
  });
});

// ── Review fixes: countdown, spaced review, whole-word highlight ─────────
describe('readiness countdown never jumps back up', () => {
  beforeEach(() => useProgress.getState().resetCert('cisa'));

  const neededNow = () => {
    const r = readinessRange(cisa, computeReadiness(cisa, selectCert(useProgress.getState(), 'cisa').answers));
    return r.enough ? 0 : r.needed;
  };

  it('each answer (clean, assisted, wrong, or a redo) never increases "N more answers"', () => {
    const { recordAnswer } = useProgress.getState();
    // A fixed, varied script: new questions, redos, clean to assisted and back.
    const ids = Array.from({ length: 30 }, (_, i) => `d${(i % 5) + 1}_${String(i).padStart(3, '0')}`);
    let before = neededNow();
    expect(before).toBe(RANGE_MIN_ANSWERS);
    for (let step = 0; step < 200; step++) {
      const id = ids[(step * 7) % ids.length];
      const assisted = step % 3 === 0;
      recordAnswer('cisa', id, step % 4 !== 0, 'sure', { assisted });
      const after = neededNow();
      expect(after).toBeLessThanOrEqual(before);
      before = after;
    }
  });

  it('redoing a clean answer with Coach me does not raise the countdown', () => {
    const { recordAnswer } = useProgress.getState();
    recordAnswer('cisa', 'd1_001', true, 'sure');
    const before = neededNow();
    recordAnswer('cisa', 'd1_001', true, 'sure', { assisted: true });
    expect(neededNow()).toBe(before);
  });

  it('an assisted first answer counts half: two of them take one off the count', () => {
    const { recordAnswer } = useProgress.getState();
    recordAnswer('cisa', 'd1_001', true, 'sure', { assisted: true });
    recordAnswer('cisa', 'd1_002', true, 'sure', { assisted: true });
    expect(neededNow()).toBe(RANGE_MIN_ANSWERS - 1);
  });
});

describe('spaced review after Coach me', () => {
  const now = 1_000_000;
  const inBox2 = { box: 2, dueAt: now, lastSeen: now - DAY_MS, reps: 1 };

  it('an assisted correct answer stays in its box (shorter wait than a clean promotion)', () => {
    const clean = nextReview(inBox2, true, 'sure', now)!;
    const assisted = nextReview(inBox2, true, 'sure', now, true)!;
    expect(clean.box).toBe(3);
    expect(assisted.box).toBe(2);
    expect(assisted.dueAt).toBe(now + INTERVAL_DAYS[2] * DAY_MS);
    expect(assisted.dueAt).toBeLessThan(clean.dueAt);
  });

  it('an assisted correct answer never graduates a Box 5 question', () => {
    expect(nextReview({ box: 5, dueAt: now, lastSeen: now, reps: 4 }, true, 'sure', now)).toBeNull();
    expect(nextReview({ box: 5, dueAt: now, lastSeen: now, reps: 4 }, true, 'sure', now, true)?.box).toBe(5);
  });

  it('the store passes the assisted flag through to the schedule', () => {
    useProgress.getState().resetCert('cisa');
    const { recordAnswer } = useProgress.getState();
    recordAnswer('cisa', 'd1_001', false, 'sure'); // missed → Box 1
    recordAnswer('cisa', 'd1_001', true, 'sure', { assisted: true });
    expect(selectCert(useProgress.getState(), 'cisa').review.d1_001.box).toBe(1);
    recordAnswer('cisa', 'd1_001', true, 'sure');
    expect(selectCert(useProgress.getState(), 'cisa').review.d1_001.box).toBe(2);
  });
});

describe('priority-word highlight matches whole words only', () => {
  it('skips the word inside a longer word', () => {
    expect(lastWholeWordIndex('What is MOST likely, ALMOST always?', 'MOST')).toBe(8);
    expect(lastWholeWordIndex('MOSTLY fine', 'MOST')).toBe(-1);
    expect(lastWholeWordIndex('BEST', 'BEST')).toBe(0);
    expect(lastWholeWordIndex('', 'BEST')).toBe(-1);
  });

  it('picks the last whole-word match', () => {
    expect(lastWholeWordIndex('FIRST, then FIRST.', 'FIRST')).toBe(12);
  });
});
