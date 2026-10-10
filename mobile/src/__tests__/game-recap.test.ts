/**
 * End-of-round recap and the small per-game score history:
 * - each miss names its snare or deciding word, with one line on why;
 * - "Missed questions are in your review." only when an answer was wrong;
 * - history is capped, shows the last 5, and old saves (no history) load.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllQuestions } from '../content/loader';
import type { PackQuestion } from '../content/types';
import {
  clip,
  firstSentence,
  HISTORY_CAP,
  lastScores,
  pickMiss,
  pushScore,
  REVIEW_LINE,
  reviewLine,
  signpostMiss,
  snareMiss,
  trendSpoken,
} from '../engine/games/recap';
import { priorityWord, PRIORITY_MEANING } from '../engine/games/priorityLens';
import { trapLetter, trapPool } from '../engine/games/trapSpotter';
import { selectCert, useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const bank = getAllQuestions('cisa');
const id = (t: string) => t;

const q: PackQuestion = {
  id: 'x1',
  certId: 'cisa',
  domainId: '1',
  subtopic: 's',
  difficulty: 'application',
  stem: 'Which of the following should the IS auditor do FIRST when planning the audit?',
  options: { A: 'Interview staff', B: 'Run tests', C: 'Do a risk assessment', D: 'Write the report' },
  correct: 'C',
  explanation: 'Risk drives the plan. Everything else follows.',
  wrongExplanations: { A: 'Interviews come after scoping. They need a plan.', B: 'Tests need a plan first.', D: 'The report comes last.' },
  tips: ['Final two: {{C}} beats {{A}} because risk sets scope.'],
  related: [],
};

describe('recap: one line per miss', () => {
  it('Snare Spotter names the real snare and why it loses', () => {
    expect(trapLetter(q)).toBe('A');
    const m = snareMiss(q, false, true, id)!;
    expect(m.tag).toBe('Snare: Interview staff');
    expect(m.why).toBe('Interviews come after scoping.');
    expect(m.answerWrong).toBe(false);
    // A clean item (snare spotted, answer right) is not a miss.
    expect(snareMiss(q, true, true, id)).toBeNull();
  });

  it('Signpost names the deciding word and what it asks for', () => {
    const m = signpostMiss(q, true, false)!;
    expect(m.tag).toBe('Signpost word: FIRST');
    expect(m.why).toBe(PRIORITY_MEANING.FIRST);
    expect(m.answerWrong).toBe(true);
    expect(signpostMiss(q, true, true)).toBeNull();
  });

  it('Sure Footing names the snare when you took it, else the deciding word', () => {
    expect(pickMiss(q, 'A', false, id)!.tag).toBe('Snare: Interview staff');
    const other = pickMiss(q, 'B', false, id)!;
    expect(other.tag).toBe('Signpost word: FIRST');
    expect(other.why).toBe('Tests need a plan first.');
    expect(pickMiss(q, 'C', true, id)).toBeNull();
  });

  it('renders letter tokens with the round shuffle', () => {
    const tokens = { ...q, wrongExplanations: { ...q.wrongExplanations, A: 'Unlike {{C}}, this skips scoping.' } };
    expect(snareMiss(tokens, false, false, (t) => t.replace('{{C}}', 'B'))!.why).toBe('Unlike B, this skips scoping.');
  });

  it('works on every real snare question (tag and why always filled, one line)', () => {
    for (const x of trapPool(bank)) {
      const m = snareMiss(x, false, false, id)!;
      expect(m.tag.startsWith('Snare: ')).toBe(true);
      expect(m.why.length).toBeGreaterThan(0);
      expect(m.why.length).toBeLessThanOrEqual(181);
    }
    for (const x of bank.filter((b) => priorityWord(b.stem))) expect(signpostMiss(x, false, false)!.why.length).toBeGreaterThan(0);
  });

  it('says misses are in review only when an answer was wrong', () => {
    expect(reviewLine([snareMiss(q, false, true, id)!])).toBeNull();
    expect(reviewLine([snareMiss(q, false, false, id)!])).toBe(REVIEW_LINE);
    expect(REVIEW_LINE).toBe('Missed questions are in your review.');
    expect(reviewLine([])).toBeNull();
  });

  it('trims long text at a word', () => {
    expect(firstSentence('One. Two.')).toBe('One.');
    expect(clip('a '.repeat(80), 20).endsWith('…')).toBe(true);
    expect(clip('short')).toBe('short');
  });
});

describe('score history', () => {
  it('is capped, oldest first, and shows the last 5', () => {
    let h: number[] | undefined;
    for (let s = 1; s <= 14; s++) h = pushScore(h, s);
    expect(h).toHaveLength(HISTORY_CAP);
    expect(h![h!.length - 1]).toBe(14);
    expect(lastScores(h)).toEqual([10, 11, 12, 13, 14]);
    expect(lastScores(undefined)).toEqual([]);
  });

  it('reads aloud as a plain sentence', () => {
    expect(trendSpoken([4, 6, 7], 8)).toBe('Your last 3 rounds: 4, 6, 7. Best 8.');
    expect(trendSpoken([5], undefined)).toBe('Your last round: 5.');
  });

  it('an old save with a best score but no history still loads, then grows a history', async () => {
    const old = {
      state: {
        byCert: {
          cisa: { answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: { trap: 7, sprint: 14 }, notesRead: [] },
        },
        streak: { current: 0, best: 0, lastDay: null },
        today: { day: '', answered: 0 },
        days: {},
      },
      version: 2,
    };
    await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(old));
    await useProgress.persist.rehydrate();
    const before = selectCert(useProgress.getState(), 'cisa');
    expect(before.gameBest).toEqual({ trap: 7, sprint: 14 });
    expect(before.gameRecent).toEqual({});
    useProgress.getState().recordGame('cisa', 'trap', 5);
    const after = selectCert(useProgress.getState(), 'cisa');
    expect(after.gameBest.trap).toBe(7); // the best is kept
    expect(after.gameRecent.trap).toEqual([5]);
    expect(after.gameRecent.sprint).toBeUndefined();
  });
});
