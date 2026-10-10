/**
 * Build C, part 1: silent data collection.
 *
 * - Per-answer time (`ms`): from the question being shown to the answer,
 *   WITHOUT the time the app spent in the background. Capped.
 * - Last confidence (`lastConfidence`) on the answer record.
 * - A permanent `masteredAt` per subtopic: unassisted correct answers on
 *   two different days. Games never count. Never unset.
 * - Old saves load unchanged (every new field is optional).
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { act, create } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { noteSubtopics, subtopicOfQuestion } from '../content/notes';
import { addMs, elapsedMs, MAX_ANSWER_MS, pauseClock, resumeClock, startClock } from '../engine/answerClock';
import { FOOTING_CONFIDENCE } from '../engine/games/calibration';
import { noteCleanCorrect, recordMastery } from '../engine/mastery';
import { finishSession } from '../lib/finishSession';
import { startMock } from '../lib/sessions';
import { useAnswerClock } from '../lib/useAnswerClock';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const T0 = new Date(2026, 9, 5, 9, 0, 0).getTime(); // 5 Oct 2026, 09:00 local
const DAY = 24 * 3_600_000;

// ── The clock (pure) ──────────────────────────────────────────────────────
describe('answer clock', () => {
  it('counts foreground time from the moment the question is shown', () => {
    const c = startClock(T0);
    expect(elapsedMs(c, T0)).toBe(0);
    expect(elapsedMs(c, T0 + 12_345)).toBe(12_345);
  });

  it('leaves out the time the app spent in the background', () => {
    let c = startClock(T0);
    c = pauseClock(c, T0 + 10_000); // 10 s in, the phone is locked…
    // …while locked, the clock does not move.
    expect(elapsedMs(c, T0 + 70_000)).toBe(10_000);
    c = resumeClock(c, T0 + 70_000); // back after 60 s
    expect(elapsedMs(c, T0 + 75_000)).toBe(15_000);
  });

  it('pausing or resuming twice changes nothing; two breaks add up', () => {
    let c = startClock(T0);
    c = pauseClock(c, T0 + 1_000);
    expect(pauseClock(c, T0 + 5_000)).toBe(c); // a second pause keeps the first
    c = resumeClock(c, T0 + 3_000);
    expect(resumeClock(c, T0 + 4_000)).toBe(c);
    c = resumeClock(pauseClock(c, T0 + 4_000), T0 + 9_000);
    expect(elapsedMs(c, T0 + 10_000)).toBe(10_000 - 2_000 - 5_000);
  });

  it('never goes negative (clock moved back) and is capped', () => {
    expect(elapsedMs(startClock(T0), T0 - 5_000)).toBe(0);
    expect(resumeClock(pauseClock(startClock(T0), T0 + 10), T0).pausedMs).toBe(0);
    expect(elapsedMs(startClock(T0), T0 + 5 * 3_600_000)).toBe(MAX_ANSWER_MS);
    expect(addMs(MAX_ANSWER_MS - 1, 10)).toBe(MAX_ANSWER_MS);
    expect(addMs(undefined, 1_500)).toBe(1_500);
    expect(addMs(2_000, 1_500)).toBe(3_500);
  });
});

// ── The hook: wired to the app's background / foreground events ─────────
describe('useAnswerClock', () => {
  let listener: ((s: AppStateStatus) => void) | null = null;
  beforeEach(() => {
    jest.useFakeTimers({ now: T0 });
    listener = null;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
      listener = fn as (s: AppStateStatus) => void;
      return { remove: () => (listener = null) } as ReturnType<typeof AppState.addEventListener>;
    });
    Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function mount(initialKey: string) {
    const read: { current: () => number } = { current: () => -1 };
    function Probe({ k }: { k: string }) {
      read.current = useAnswerClock(k);
      return null;
    }
    let r!: ReturnType<typeof create>;
    act(() => {
      r = create(<Probe k={initialKey} />);
    });
    return { read, rerender: (k: string) => act(() => { r.update(<Probe k={k} />); }), r };
  }

  it('pauses in the background and restarts for each new question', () => {
    const { read, rerender } = mount('q1');
    jest.setSystemTime(T0 + 8_000);
    act(() => {
      listener?.('background');
    });
    jest.setSystemTime(T0 + 68_000); // a minute away from the app
    act(() => {
      listener?.('active');
    });
    jest.setSystemTime(T0 + 70_000);
    expect(read.current()).toBe(10_000);
    // Next question: the clock starts again from zero.
    rerender('q2');
    jest.setSystemTime(T0 + 73_000);
    expect(read.current()).toBe(3_000);
  });

  it('"inactive" (iOS control centre, a call screen) also pauses', () => {
    const { read } = mount('q1');
    jest.setSystemTime(T0 + 2_000);
    act(() => {
      listener?.('inactive');
    });
    jest.setSystemTime(T0 + 30_000);
    expect(read.current()).toBe(2_000);
  });
});

// ── The stores: ms + confidence on the answer record ─────────────────────
describe('answer record: time and confidence', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: T0 });
    useProgress.getState().resetCert('cisa');
  });
  afterEach(() => jest.useRealTimers());

  it('keeps the time and the confidence of the LAST answer', () => {
    const { recordAnswer } = useProgress.getState();
    recordAnswer('cisa', 'd1_001', true, 'sure', { ms: 41_234.6 });
    let a = selectCert(useProgress.getState(), 'cisa').answers.d1_001;
    expect(a).toMatchObject({ ms: 41_235, lastConfidence: 'sure' });
    // A later answer with no rating and no clock leaves both out: they always
    // describe the same answer as lastCorrect.
    recordAnswer('cisa', 'd1_001', false);
    a = selectCert(useProgress.getState(), 'cisa').answers.d1_001;
    expect('ms' in a).toBe(false);
    expect('lastConfidence' in a).toBe(false);
  });

  it('ignores a time that is not a real number', () => {
    useProgress.getState().recordAnswer('cisa', 'd1_002', true, 'guessing', { ms: Number.NaN });
    const a = selectCert(useProgress.getState(), 'cisa').answers.d1_002;
    expect('ms' in a).toBe(false);
    expect(a.lastConfidence).toBe('guessing');
  });

  it('Sure Footing levels are kept as their confidence', () => {
    useProgress.getState().recordAnswer('cisa', 'd1_003', true, FOOTING_CONFIDENCE.lean, { ms: 9_000, mastery: false });
    expect(selectCert(useProgress.getState(), 'cisa').answers.d1_003.lastConfidence).toBe(FOOTING_CONFIDENCE.lean);
  });

  it('a submitted mock records each question’s time and confidence', () => {
    useSession.getState().clear();
    const s = startMock('cisa', 3)!;
    const [a, b] = s.questionIds;
    useSession.getState().answer(a, { display: 'A', correct: true, ms: 65_000 });
    useSession.getState().answer(b, { display: 'B', correct: false, ms: 120_000, confidence: 'unsure' });
    finishSession();
    const answers = selectCert(useProgress.getState(), 'cisa').answers;
    expect(answers[a].ms).toBe(65_000);
    expect(answers[b]).toMatchObject({ ms: 120_000, lastConfidence: 'unsure' });
    useSession.getState().clear();
  });
});

// ── masteredAt: the rule (pure) ──────────────────────────────────────────
describe('subtopic mastery date (rule)', () => {
  it('needs unassisted correct answers on two different days', () => {
    const one = noteCleanCorrect(undefined, '2026-10-05');
    expect(one).toEqual({ firstDay: '2026-10-05' });
    expect(noteCleanCorrect(one, '2026-10-05')).toBe(one); // same day: nothing new
    expect(noteCleanCorrect(one, '2026-10-07')).toEqual({ firstDay: '2026-10-05', masteredAt: '2026-10-07' });
  });

  it('is permanent once set', () => {
    const done = { firstDay: '2026-10-05', masteredAt: '2026-10-07' };
    expect(noteCleanCorrect(done, '2026-10-20')).toBe(done);
  });

  it('wrong or assisted answers change nothing', () => {
    const map = { x: { firstDay: '2026-10-05' } };
    expect(recordMastery(map, 'x', '2026-10-06', { correct: false, assisted: false })).toBe(map);
    expect(recordMastery(map, 'x', '2026-10-06', { correct: true, assisted: true })).toBe(map);
    expect(recordMastery(map, undefined, '2026-10-06', { correct: true, assisted: false })).toBe(map);
    expect(recordMastery(map, 'x', '2026-10-06', { correct: true, assisted: false })?.x.masteredAt).toBe('2026-10-06');
  });
});

// ── masteredAt: in the store ─────────────────────────────────────────────
describe('subtopic mastery date (store)', () => {
  // Three questions from one study-notes subtopic ("4B1.2"-style id), so
  // "different questions, same subtopic" is covered.
  const note = noteSubtopics('cisa').find((s) => (s.practiceIds ?? []).length >= 3)!;
  const sub = note.id;
  const [q1, q2, q3] = note.practiceIds!.map((id) => ({ id }));
  const mastery = () => selectCert(useProgress.getState(), 'cisa').mastery?.[sub];

  it('maps a question to its note; an unlisted question has no subtopic', () => {
    expect(subtopicOfQuestion('cisa', q1.id)).toBe(sub);
    expect(subtopicOfQuestion('cisa', 'd9_999')).toBeUndefined();
    const unlisted = getAllQuestions('cisa').find((q) => !subtopicOfQuestion('cisa', q.id));
    if (unlisted) {
      useProgress.getState().recordAnswer('cisa', unlisted.id, true);
      expect(selectCert(useProgress.getState(), 'cisa').mastery).toBeUndefined();
    }
  });

  beforeEach(() => {
    jest.useFakeTimers({ now: T0 });
    useProgress.getState().resetCert('cisa');
  });
  afterEach(() => jest.useRealTimers());

  it('is set on the second day, from a different question in the same subtopic', () => {
    const { recordAnswer } = useProgress.getState();
    recordAnswer('cisa', q1.id, true, 'sure');
    recordAnswer('cisa', q2.id, true, 'sure'); // same day: still one day
    expect(mastery()).toEqual({ firstDay: '2026-10-05' });
    jest.setSystemTime(T0 + 2 * DAY);
    recordAnswer('cisa', q3.id, true);
    expect(mastery()?.masteredAt).toBe('2026-10-07');
  });

  it('a later wrong answer never unsets it', () => {
    const { recordAnswer } = useProgress.getState();
    recordAnswer('cisa', q1.id, true);
    jest.setSystemTime(T0 + DAY);
    recordAnswer('cisa', q1.id, true);
    jest.setSystemTime(T0 + 3 * DAY);
    recordAnswer('cisa', q1.id, false);
    recordAnswer('cisa', q2.id, false);
    expect(mastery()?.masteredAt).toBe('2026-10-06');
  });

  it('Coach me answers and game answers do not count', () => {
    const { recordAnswer } = useProgress.getState();
    recordAnswer('cisa', q1.id, true, 'sure', { assisted: true });
    recordAnswer('cisa', q2.id, true, undefined, { mastery: false });
    expect(mastery()).toBeUndefined();
    recordAnswer('cisa', q1.id, true);
    jest.setSystemTime(T0 + DAY);
    recordAnswer('cisa', q2.id, true, 'sure', { assisted: true });
    recordAnswer('cisa', q3.id, true, 'sure', { mastery: false });
    expect(mastery()).toEqual({ firstDay: '2026-10-05' });
  });
});

// ── Old saves ────────────────────────────────────────────────────────────
describe('a save from before Build C', () => {
  const OLD = {
    state: {
      byCert: {
        cisa: {
          answers: { d1_001: { attempts: 3, correctCount: 2, lastCorrect: true, lastAt: T0 - 5 * DAY } },
          review: {},
          bookmarks: [],
          mocks: [],
          lessonsDone: [],
          mistakes: {},
          gameBest: {},
          gameRecent: {},
          notesRead: [],
        },
      },
      streak: { current: 2, best: 5, lastDay: '2026-09-30' },
      today: { day: '2026-09-30', answered: 4 },
      days: {},
    },
    version: 2,
  };

  beforeAll(async () => {
    await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(OLD));
    await useProgress.persist.rehydrate();
  });

  it('loads unchanged, with none of the new fields', () => {
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.answers).toEqual(OLD.state.byCert.cisa.answers);
    expect(cp.mastery).toBeUndefined();
    expect(useProgress.getState().streak).toEqual(OLD.state.streak);
  });

  it('the next answer adds the new fields to that record only', () => {
    useProgress.getState().recordAnswer('cisa', 'd1_001', true, 'unsure', { ms: 30_000 });
    const a = selectCert(useProgress.getState(), 'cisa').answers.d1_001;
    expect(a).toMatchObject({ attempts: 4, correctCount: 3, ms: 30_000, lastConfidence: 'unsure' });
  });
});
