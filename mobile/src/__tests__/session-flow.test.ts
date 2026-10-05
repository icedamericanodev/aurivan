/**
 * Regression tests for bugs found in review: mock submission must not give
 * study credit for skipped questions, early-ended practice must score only
 * what was answered, and sessions must never start empty.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { getAllQuestions } from '../content/loader';
import { finishSession, scoreSession } from '../lib/finishSession';
import { startFromIds, startMock } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';

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
