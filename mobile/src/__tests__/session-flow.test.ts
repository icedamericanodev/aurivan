/**
 * Regression tests for bugs found in review: mock submission must not give
 * study credit for skipped questions, early-ended practice must score only
 * what was answered, and sessions must never start empty.
 */
import { getAllQuestions } from '../content/loader';
import { finishSession, scoreSession } from '../lib/finishSession';
import { startFromIds, startMock } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';

// Use the library's in-memory mock. babel-jest hoists jest.mock() above the
// imports, so it still takes effect before any module loads AsyncStorage.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useProgress.setState({ streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 } });
  useSession.getState().clear();
});

describe('session lifecycle', () => {
  it('refuses to start a session whose questions no longer exist', () => {
    expect(startFromIds('cisa', ['d9_999', 'gone'], 'Saved')).toBeNull();
    expect(useSession.getState().active).toBeNull();
  });

  it('submitting an untouched mock gives no streak/goal/readiness credit but queues reviews', () => {
    const s = startMock('cisa', 10)!;
    expect(s.questionIds).toHaveLength(10);
    finishSession();
    const p = useProgress.getState();
    const cp = selectCert(p, 'cisa');
    expect(Object.keys(cp.answers)).toHaveLength(0);
    expect(p.today.answered).toBe(0);
    expect(p.streak.current).toBe(0);
    expect(Object.keys(cp.review)).toHaveLength(10);
    expect(cp.mocks[0]).toMatchObject({ total: 10, correct: 0 });
    expect(useSession.getState().active?.finishedAt).toBeDefined();
  });

  it('records the deadline, not "now", when a mock is submitted late', () => {
    startMock('cisa', 5);
    const a = useSession.getState().active!;
    useSession.setState({ active: { ...a, startedAt: Date.now() - 3 * 3_600_000, deadline: Date.now() - 2 * 3_600_000 } });
    finishSession();
    expect(selectCert(useProgress.getState(), 'cisa').mocks[0].minutesUsed).toBe(60);
  });

  it('a custom set (e.g. "Practice this concept") holds exactly the given questions, in order', () => {
    const s = startFromIds('cisa', ['d4_062', 'd4_005', 'gone_001', 'd4_005', 'd4_020'], 'Recovery objectives')!;
    // Missing ids dropped, the repeat asked once, nothing else added.
    expect(s.questionIds).toEqual(['d4_062', 'd4_005', 'd4_020']);
    expect(Object.keys(s.perms).sort()).toEqual(['d4_005', 'd4_020', 'd4_062']);
    // Plain practice mode: the session screen records each answer to
    // progress + spaced review exactly as for any other practice.
    expect(s.mode).toBe('practice');
    expect(s.deadline).toBeUndefined();
    expect(s.title).toBe('Recovery objectives');
  });

  it('early-ended practice scores domains on answered questions only', () => {
    const ids = getAllQuestions('cisa').slice(0, 10).map((q) => q.id);
    startFromIds('cisa', ids, 'Practice');
    const { answer } = useSession.getState();
    answer(ids[0], { display: 'A', correct: true });
    answer(ids[1], { display: 'B', correct: false });
    const score = scoreSession(useSession.getState().active!);
    const totals = Object.values(score.byDomain).reduce((n, d) => n + d.total, 0);
    expect(score.answered).toBe(2);
    expect(totals).toBe(2);
  });
});
