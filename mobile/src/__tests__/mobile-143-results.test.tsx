/**
 * Mobile 1.43, Results (board 2, owner decisions):
 *  - the headline leads with the count at every size ("8 of 10 right");
 *  - a leaf strip for practice sets up to 20 (rows of 10, numbers only under
 *    misses, one spoken image); a mock or a longer set gets one line instead;
 *  - "The N you missed come back tomorrow", on the paper, only when misses were
 *    scheduled (never on a mock), and it is TRUE: a fresh miss is due at the
 *    start of the next local day (engine/srs.ts); a clean set gets its own line;
 *  - "What you missed": note rows grouped by note with their question numbers,
 *    at most three, then "And N more…", and "See answers" to the review list;
 *  - "Practice the N you missed" is a ghost link (48pt), Done the one primary;
 *  - "Per question" beside the exam pace.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { getCertification } from '../content/certifications';
import { subtopicOfQuestion } from '../content/notes';
import { missedNoteGroups } from '../engine/outline';
import { practicePace } from '../engine/pace';
import {
  andList,
  CLEAN_SET_NOTICE,
  missedLine,
  missedNotice,
  moreMissedLine,
  noteKicker,
  resultsHeadline,
  stripSpoken,
  STRIP_MAX,
} from '../engine/resultsCopy';
import { dueIds, startOfNextDay } from '../engine/srs';
import { finishSession } from '../lib/finishSession';
import { startFromIds, startMock } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import Results from '../app/results';
import { LeafStrip } from '../components/leafStrip';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));

const bank = getAllQuestions('cisa');
const cert = getCertification('cisa')!;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const hostLabelled = (re: RegExp) => root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel));

/** A practice set of `n` questions from one domain where the questions at `missAt` (1-based) are missed. */
function practiceSet(n: number, missAt: number[], domainId = '1') {
  const qs = bank.filter((q) => q.domainId === domainId).slice(40, 40 + n);
  startFromIds('cisa', qs.map((q) => q.id), 'Practice · IS Audit');
  const s = useSession.getState().active!;
  act(() => {
    qs.forEach((q, i) => {
      const perm = s.perms[q.id];
      const right = !missAt.includes(i + 1);
      const display = (['A', 'B', 'C', 'D'] as const).find((d, k) => (perm[k] === q.correct) === right)!;
      // Recorded like the session screen does: the answer, then (a miss) the mistake.
      useProgress.getState().recordAnswer('cisa', q.id, right, undefined, { ms: 40_000 });
      useSession.getState().answer(q.id, { display, correct: right, ms: 40_000 });
    });
    finishSession({ celebrate: false });
  });
  return qs;
}

beforeEach(() => {
  jest.useFakeTimers();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

describe('the words (engine/resultsCopy.ts)', () => {
  it('the headline is the count at every size', () => {
    expect(resultsHeadline(8, 10)).toBe('8 of 10 right');
    expect(resultsHeadline(150, 150)).toBe('All 150 right');
  });

  it('the strip is spoken once, by question number', () => {
    expect(stripSpoken(['right', 'right', 'missed', 'right', 'right', 'right', 'missed', 'right', 'right', 'right'])).toBe('Right: 1, 2, 4, 5, 6, 8, 9 and 10. Missed: 3 and 7.');
    expect(stripSpoken(['right', 'right'])).toBe('All 2 right.');
    expect(stripSpoken(['missed', 'blank'])).toBe('None right. Missed: 1. Not answered: 2.');
    expect(andList([3])).toBe('3');
  });

  it('notices, the line that replaces the strip, and the note kickers', () => {
    expect(missedNotice(2)).toEqual({ title: 'The 2 you missed come back tomorrow', body: 'In your review, spaced so they stick. Nothing to redo now.' });
    expect(missedNotice(1).title).toBe('The one you missed comes back tomorrow');
    expect(CLEAN_SET_NOTICE.title).toBe('A clean set');
    expect(missedLine(12, 0)).toBe('12 missed. Each one is in Review answers below.');
    expect(missedLine(20, 10)).toBe('20 missed, 10 of them left blank: a blank counts as not correct.');
    expect(missedLine(0, 0)).toBe('None missed.');
    expect(noteKicker([3])).toBe('Read the note · question 3');
    expect(noteKicker([3, 7])).toBe('Read the note · questions 3 and 7');
    expect(moreMissedLine(2, false)).toBe('And 2 more in your review.');
    expect(moreMissedLine(2, true)).toBe('And 2 more in Review answers below.');
    expect(moreMissedLine(0, false)).toBeNull();
    expect(STRIP_MAX).toBe(20);
  });

  it('note groups: misses on one note are one row with both numbers; at most three; the rest counted', () => {
    const order = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const missed = new Set(['b', 'c', 'd', 'e', 'f', 'g']);
    const noteOf: Record<string, string> = { b: 'N1', c: 'N2', d: 'N1', e: 'N3', f: 'N4' }; // g has no note
    const out = missedNoteGroups(order, (q) => missed.has(q), (q) => noteOf[q]);
    expect(out.groups).toEqual([
      { id: 'N1', numbers: [2, 4] },
      { id: 'N2', numbers: [3] },
      { id: 'N3', numbers: [5] },
    ]);
    // f (a fourth note) and g (no note) are not covered by a row.
    expect(out.rest).toBe(2);
  });

  it('per question: the typical time beside the exam pace, from three timed answers', () => {
    expect(practicePace([42_000, 40_000, 44_000], cert.exam)).toEqual({ own: 42, exam: 96 });
    expect(practicePace([42_000, 40_000], cert.exam)).toBeNull();
  });
});

describe('the screen', () => {
  it('a 10-question practice with 2 misses: count first, the strip, the true notice, grouped notes, the quiet link', () => {
    const qs = practiceSet(10, [3, 7]);
    act(() => {
      r = create(<Results />);
    });
    const t = allText();
    expect(t).toContain('8 of 10 right');
    expect(t).not.toMatch(/Strong work|Getting there|Every miss is a lesson/);
    // The strip: one image, spoken once.
    expect(root().findAllByType(LeafStrip)).toHaveLength(1);
    expect(hostLabelled(/^Right: 1, 2, 4, 5, 6, 8, 9 and 10\. Missed: 3 and 7\.$/)).toHaveLength(1);
    // The notice is on screen and true: the two misses are not due today, and are due from midnight.
    expect(t).toContain('The 2 you missed come back tomorrow');
    const review = selectCert(useProgress.getState(), 'cisa').review;
    const missedIds = [qs[2].id, qs[6].id];
    expect(dueIds(review, Date.now()).filter((id) => missedIds.includes(id))).toEqual([]);
    expect(dueIds(review, startOfNextDay(Date.now())).filter((id) => missedIds.includes(id)).sort()).toEqual([...missedIds].sort());
    // What you missed: grouped by note with numbers, and See answers.
    expect(t).toContain('What you missed');
    expect(hostLabelled(/^See answers/).length).toBeGreaterThan(0);
    const notes = missedNoteGroups(qs.map((q) => q.id), (id) => missedIds.includes(id), (id) => subtopicOfQuestion('cisa', id));
    if (notes.groups.length) expect(t).toContain(noteKicker(notes.groups[0].numbers));
    // One primary; the practice link is a ghost with a 48pt target.
    const practice = root().findAll((n) => n.props.label === 'Practice the 2 you missed' && typeof n.props.onPress === 'function')[0];
    expect(practice.props.kind).toBe('ghost');
    // Review answers is still there, with every question.
    expect(t).toContain('Review answers');
    expect(t).toContain('Question 10');
  });

  it('a clean set: the encouraging line, no "come back", no practice link', () => {
    practiceSet(8, []);
    act(() => {
      r = create(<Results />);
    });
    expect(allText()).toContain('All 8 right');
    expect(allText()).toContain(CLEAN_SET_NOTICE.title);
    expect(allText()).not.toContain('come back tomorrow');
    expect(allText()).not.toContain('you missed');
  });

  it('more than 20 questions: one line instead of the strip', () => {
    practiceSet(25, [2, 9, 14]);
    act(() => {
      r = create(<Results />);
    });
    expect(root().findAllByType(LeafStrip)).toHaveLength(0);
    expect(allText()).toContain('3 missed. Each one is in Review answers below.');
  });

  it('a mock: no strip, no "come back tomorrow" notice; the pacing and the review stay', () => {
    act(() => {
      startMock('cisa', 6);
    });
    const ids = useSession.getState().active!.questionIds;
    act(() => {
      ids.slice(0, 4).forEach((id, i) => useSession.getState().answer(id, { display: 'A', correct: i < 2, ms: 60_000, at: Date.now() }));
      finishSession({ celebrate: false });
    });
    act(() => {
      r = create(<Results />);
    });
    const t = allText();
    expect(root().findAllByType(LeafStrip)).toHaveLength(0);
    expect(t).not.toContain('come back tomorrow');
    expect(t).not.toContain(CLEAN_SET_NOTICE.title);
    expect(t).toContain('2 of 6 right');
    expect(t).toContain('left blank');
    expect(t).toContain('Review answers');
    expect(t).toContain('Practice scores are not scaled exam scores.');
  });
});
