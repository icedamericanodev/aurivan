/**
 * Release bug hunt round 1: submitting a full 150-question mock on a large save
 * saved the whole progress store about 200 times in a row (one save per recorded
 * answer and mistake, about 54 MB of JSON), so the phone could freeze on Submit.
 * Now finishSession saves each store once (store/storage.ts batchSaves).
 *
 * Counts saves, never milliseconds, so it cannot flake. Also checks the one save
 * holds the final state (every answer, the mock result) and grading stays on the
 * ORIGINAL letters.
 */
import { buildHeavySave } from '../../jest/perf/heavySave';
import { getAllQuestions } from '../content/loader';
import { displayToOriginal } from '../engine/shuffle';
import { finishSession } from '../lib/finishSession';
import { startMock } from '../lib/sessions';
import { batchSaves } from '../store/storage';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'aurivan.progress.v1';
let calls: { key: string; value: string }[] = [];
function countSaves() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-async-storage/async-storage');
  const AS = mod.default ?? mod;
  const real = AS.setItem;
  AS.setItem = (k: string, v: string) => {
    calls.push({ key: k, value: v });
    return real(k, v);
  };
}
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeAll(() => {
  useSettings.setState(useSettings.getInitialState(), true);
  useProgress.setState(useProgress.getInitialState(), true);
  buildHeavySave(Date.now(), 120);
  countSaves();
});

describe('Submit on a large save', () => {
  it.each([150, 50])('a %i-question mock saves the progress store a handful of times, not once per answer', async (n) => {
    useSession.getState().clear();
    startMock('cisa', n);
    const s = useSession.getState().active!;
    const bank = getAllQuestions('cisa');
    // Every question answered, one in three wrong (display letters on screen).
    s.questionIds.forEach((id, i) => {
      const q = bank.find((x) => x.id === id)!;
      const k = s.perms[id].findIndex((o) => (i % 3 === 0 ? o !== q.correct : o === q.correct));
      const display = (['A', 'B', 'C', 'D'] as const)[k];
      useSession.getState().answer(id, { display, correct: i % 3 !== 0, ms: 30_000 });
    });
    const mocksBefore = selectCert(useProgress.getState(), 'cisa').mocks.length;
    await flush();
    calls = [];
    finishSession();
    await flush();
    const progressSaves = calls.filter((c) => c.key === KEY);
    expect(progressSaves.length).toBeGreaterThanOrEqual(1);
    expect(progressSaves.length).toBeLessThanOrEqual(3);
    // The save holds the final state: the new mock result is in it.
    const last = JSON.parse(progressSaves[progressSaves.length - 1].value);
    expect(last.state.byCert.cisa.mocks).toHaveLength(mocksBefore + 1);
    // Mistakes are filed with the ORIGINAL letter picked.
    const wrongId = s.questionIds[0];
    const r = useSession.getState().active!.responses[wrongId];
    expect(last.state.byCert.cisa.mistakes[wrongId].picked).toBe(displayToOriginal(r.display, s.perms[wrongId]));
  });
});

describe('batchSaves', () => {
  it('saves once at the end with the newest state, and still saves when the work throws', async () => {
    await flush();
    calls = [];
    expect(() =>
      batchSaves(() => {
        for (let i = 0; i < 20; i++) useProgress.getState().toggleBookmark('cisa', getAllQuestions('cisa')[i].id);
        throw new Error('boom');
      }),
    ).toThrow('boom');
    await flush();
    const progressSaves = calls.filter((c) => c.key === KEY);
    expect(progressSaves).toHaveLength(1);
    const saved = JSON.parse(progressSaves[0].value).state.byCert.cisa.bookmarks;
    expect(saved).toEqual(selectCert(useProgress.getState(), 'cisa').bookmarks);
  });
});
