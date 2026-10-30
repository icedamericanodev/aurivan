/**
 * QA for mobile 1.43 (PR #129): the journeys around the new "a miss waits for
 * tomorrow" rule, plus the Results and lesson edges the 1.43 tests leave open.
 *
 * 1. A miss, then the same day, then the next day (store + review queue).
 * 2. Re-spacing in Box 1 (a lucky guess or a Coach me answer, more than 4 hours
 *    after a miss): it waits for tomorrow too, as the web does (index.html
 *    updateReviewSchedule).
 * 3. A mock schedules its wrong answers for tomorrow when it is submitted.
 * 4. Results' review keeps display letters on a NON-identity shuffle (hard rule 4).
 * 5. Results edges: a practice set ended early, a perfect set, more than three notes.
 * 6. Every lesson's listed idea scene joins back to its body (all certifications).
 *
 * Gotcha: never write `act(() => store.action())`; use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { findNote, subtopicOfQuestion } from '../content/notes';
import { lessonsFor } from '../content/lessons';
import { ideaListText } from '../content/lessons/ideaList';
import type { Scene } from '../content/lessons/types';
import { missedNoteGroups } from '../engine/outline';
import { renderText, type Permutation } from '../engine/shuffle';
import { DAY_MS, dueIds, startOfNextDay } from '../engine/srs';
import { stripSpoken, CLEAN_SET_NOTICE } from '../engine/resultsCopy';
import { finishSession } from '../lib/finishSession';
import { startFromIds, startMock, startReview } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import Results from '../app/results';
import { OptionCard, PickNote } from '../components/quiz';
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
const HOUR = 3_600_000;
/** 10:00 local time on a plain weekday (no DST change near it). */
const MORNING = new Date(2026, 9, 21, 10, 0, 0, 0).getTime();
const cp = () => selectCert(useProgress.getState(), 'cisa');

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const hostLabelled = (re: RegExp) => root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel));

beforeEach(() => {
  jest.useFakeTimers({ now: MORNING });
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

// ── 1. A miss, the same day, the next day ────────────────────────────────
describe('journey: a miss, then the same day, then the next day', () => {
  const q = bank[0].id;

  it('the miss is in the queue but not due today: Review is empty all day, full from local midnight', () => {
    useProgress.getState().recordAnswer('cisa', q, false, 'sure', { at: MORNING });
    useProgress.getState().recordMistake('cisa', q, 'A', 'sure');
    const midnight = startOfNextDay(MORNING);
    expect(cp().review[q]).toEqual({ box: 1, dueAt: midnight, lastSeen: MORNING, reps: 1 });
    // Today (and Practice's "Questions to revisit"): nothing due, so the review button finds nothing.
    expect(dueIds(cp().review, MORNING + 13 * HOUR)).toEqual([]);
    expect(startReview('cisa')).toBeNull();
    // Just before midnight: still nothing. At midnight: due.
    expect(dueIds(cp().review, midnight - 1)).toEqual([]);
    jest.setSystemTime(midnight);
    expect(startReview('cisa')?.questionIds).toEqual([q]);
  });

  it('next morning, right and sure: Box 2, due a day later, the mistake fixed', () => {
    useProgress.getState().recordAnswer('cisa', q, false, 'sure', { at: MORNING });
    useProgress.getState().recordMistake('cisa', q, 'A', 'sure');
    const nextMorning = MORNING + DAY_MS;
    useProgress.getState().recordAnswer('cisa', q, true, 'sure', { at: nextMorning });
    expect(cp().review[q]).toEqual({ box: 2, dueAt: nextMorning + DAY_MS, lastSeen: nextMorning, reps: 2 });
    expect(cp().mistakes[q].resolved).toBe(true);
    expect(cp().answers[q].lastRetest).toBeUndefined();
  });

  it('an entry saved before 1.43 (a miss due "now") keeps its time: still due, no migration needed', () => {
    useProgress.setState((s) => ({
      byCert: { ...s.byCert, cisa: { ...s.byCert.cisa!, review: { [q]: { box: 1, dueAt: MORNING - HOUR, lastSeen: MORNING - HOUR, reps: 1 } } } },
    }));
    expect(dueIds(cp().review, MORNING)).toEqual([q]);
  });
});

// ── 2. Re-spacing in Box 1 ───────────────────────────────────────────────
describe('Box 1 re-spacing after a miss (more than 4 hours later, so not a retest)', () => {
  const q = bank[1].id;
  const later = MORNING + 5 * HOUR; // 15:00, same day

  // Found by QA on PR #129: INTERVAL_DAYS[1] is 0, so a re-spaced Box 1 entry was due NOW, sooner
  // than the miss itself (which waits for midnight). Now clamped like the web: max(now + interval, tomorrow).
  it('a lucky guess on a missed question waits for tomorrow too, like the miss did', () => {
    useProgress.getState().recordAnswer('cisa', q, false, 'sure', { at: MORNING });
    useProgress.getState().recordAnswer('cisa', q, true, 'guessing', { at: later });
    expect(cp().review[q].dueAt).toBeGreaterThanOrEqual(startOfNextDay(later));
  });

  it('a right answer after Coach me on a missed question waits for tomorrow too', () => {
    useProgress.getState().recordAnswer('cisa', q, false, 'sure', { at: MORNING });
    useProgress.getState().recordAnswer('cisa', q, true, 'sure', { at: later, assisted: true });
    expect(cp().review[q].dueAt).toBeGreaterThanOrEqual(startOfNextDay(later));
  });

  it('inside 4 hours it is a retest and already waits for tomorrow (the clamp exists there)', () => {
    useProgress.getState().recordAnswer('cisa', q, false, 'sure', { at: MORNING });
    useProgress.getState().recordAnswer('cisa', q, true, 'guessing', { at: MORNING + HOUR });
    expect(cp().review[q].dueAt).toBe(startOfNextDay(MORNING));
  });
});

// ── 3. A mock schedules its misses when it is submitted ─────────────────
describe('a mock exam and the review queue', () => {
  it('a wrong mock answer is scheduled on submit, for the start of tomorrow (no same-day review)', () => {
    act(() => {
      startMock('cisa', 4);
    });
    const ids = useSession.getState().active!.questionIds;
    act(() => {
      ids.slice(0, 3).forEach((id, i) => useSession.getState().answer(id, { display: 'A', correct: i === 0, ms: 60_000, at: Date.now() }));
    });
    // Nothing is scheduled while the exam runs.
    expect(cp().review[ids[1]]).toBeUndefined();
    act(() => {
      finishSession({ celebrate: false });
    });
    const tomorrow = startOfNextDay(Date.now());
    expect(cp().review[ids[1]]).toMatchObject({ box: 1, dueAt: tomorrow });
    expect(cp().review[ids[2]]).toMatchObject({ box: 1, dueAt: tomorrow });
    // A question left blank goes in through queueForReview: it waits for tomorrow like a miss (QA note 1).
    expect(cp().review[ids[3]]).toMatchObject({ box: 1, dueAt: tomorrow });
  });
});

// ── 4. Results' review keeps the display letters (hard rule 4) ───────────
describe('Results review on a non-identity shuffle', () => {
  it('the badges and spoken labels use DISPLAY letters; the texts and the pick note come from the ORIGINAL letters', () => {
    const q = bank.find((x) => x.correct === 'A' && x.wrongExplanations.C)!;
    startFromIds('cisa', [q.id], 'Practice');
    // Force a known rotation: display A shows original B, B→C, C→D, D→A.
    const perm: Permutation = ['B', 'C', 'D', 'A'] as Permutation;
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, perms: { [q.id]: perm } } }));
    });
    // The learner taps display B, which is original C (wrong). The key, original A, shows as display D.
    act(() => {
      useProgress.getState().recordAnswer('cisa', q.id, false, undefined, { ms: 30_000 });
      useSession.getState().answer(q.id, { display: 'B', correct: false, ms: 30_000 });
      finishSession({ celebrate: false });
    });
    act(() => {
      r = create(<Results />);
    });
    const row = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Question 1, Missed') && typeof n.props.onPress === 'function')[0];
    act(() => {
      row.props.onPress();
    });
    const cards = root().findAllByType(OptionCard);
    const mine = cards.find((n) => n.props.state === 'wrong')!;
    const key = cards.find((n) => n.props.state === 'correct')!;
    expect(mine.props.letter).toBe('B');
    expect(mine.props.text).toBe(q.options.C);
    expect(key.props.letter).toBe('D');
    expect(key.props.text).toBe(q.options.A);
    // Premium round 2 (UX review P3): "Your pick" here too, as on the answer screen.
    expect(hostLabelled(/^Your pick, B, not the best answer: /)).toHaveLength(1);
    expect(hostLabelled(/^Best answer, D: /)).toHaveLength(1);
    const note = root().findByType(PickNote);
    expect(note.props.letter).toBe('B');
    expect(note.props.text).toBe(renderText(q.wrongExplanations.C!, perm));
    expect(allText()).toContain('Why D');
  });
});

// ── 5. Results edges ─────────────────────────────────────────────────────
/** Answer the first `answered` of `ids`: right unless the 1-based index is in `missAt`. */
function play(ids: string[], answered: number, missAt: number[]) {
  startFromIds('cisa', ids, 'Practice');
  const s = useSession.getState().active!;
  act(() => {
    ids.slice(0, answered).forEach((id, i) => {
      const q = bank.find((x) => x.id === id)!;
      const perm = s.perms[id];
      const right = !missAt.includes(i + 1);
      const display = (['A', 'B', 'C', 'D'] as const).find((d, k) => (perm[k] === q.correct) === right)!;
      useProgress.getState().recordAnswer('cisa', id, right, undefined, { ms: 30_000 });
      useSession.getState().answer(id, { display, correct: right, ms: 30_000 });
    });
    finishSession({ celebrate: false });
  });
}

describe('Results edges', () => {
  it('a practice set ended early: the headline counts answered only; the strip says which were not answered', () => {
    const ids = bank.slice(100, 110).map((q) => q.id);
    play(ids, 4, [2]);
    act(() => {
      r = create(<Results />);
    });
    expect(allText()).toContain('3 of 4 right');
    expect(root().findAllByType(LeafStrip)).toHaveLength(1);
    expect(hostLabelled(/^Right: 1, 3 and 4\. Missed: 2\. Not answered: 5, 6, 7, 8, 9 and 10\.$/)).toHaveLength(1);
    expect(allText()).toContain('The one you missed comes back tomorrow');
  });

  it('a perfect set of 10: "All 10 right" said once on the strip, the clean-set line, no missed section', () => {
    expect(stripSpoken(Array(10).fill('right'))).toBe('All 10 right.');
    const ids = bank.slice(200, 210).map((q) => q.id);
    play(ids, 10, []);
    act(() => {
      r = create(<Results />);
    });
    expect(allText()).toContain('All 10 right');
    expect(allText()).toContain(CLEAN_SET_NOTICE.title);
    expect(allText()).not.toContain('What you missed');
    expect(hostLabelled(/^All 10 right\.$/)).toHaveLength(1);
  });

  it('misses across more than three notes: three rows, most-missed first, the rest counted once', () => {
    // Five misses on four different notes, one note missed twice.
    const withNote = bank.filter((q) => {
      const s = subtopicOfQuestion('cisa', q.id);
      return s && findNote('cisa', s);
    });
    const bySub = new Map<string, string[]>();
    for (const q of withNote) {
      const s = subtopicOfQuestion('cisa', q.id)!;
      bySub.set(s, [...(bySub.get(s) ?? []), q.id]);
    }
    const subs = [...bySub.entries()].filter(([, qs]) => qs.length >= 2).slice(0, 4);
    const order = [subs[0][1][0], subs[1][1][0], subs[2][1][0], subs[3][1][0], subs[3][1][1]];
    const g = missedNoteGroups(order, () => true, (id) => subtopicOfQuestion('cisa', id));
    expect(g.groups).toHaveLength(3);
    expect(g.groups[0]).toEqual({ id: subs[3][0], numbers: [4, 5] });
    expect(g.groups.map((x) => x.id)).toEqual([subs[3][0], subs[0][0], subs[1][0]]);
    expect(g.rest).toBe(1);
    play(order, 5, [1, 2, 3, 4, 5]);
    act(() => {
      r = create(<Results />);
    });
    expect(allText()).toContain('Read the note · questions 4 and 5');
    expect(allText()).toContain('And 1 more in your review.');
  });
});

// ── 6. Lesson idea lists, every certification ───────────────────────────
describe('listed idea scenes, every lesson in the registry', () => {
  it('join back to the body word for word, and use at most one "|" per item', () => {
    type Idea = Extract<Scene, { type: 'idea' }>;
    const all = ['cisa'].flatMap((id) => lessonsFor(id)).flatMap((l) => l.scenes.filter((s): s is Idea => s.type === 'idea' && Boolean(s.list)));
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      expect(ideaListText(s.list!)).toBe(s.body);
      for (const item of s.list!.items) expect(item.split('|').length).toBeLessThanOrEqual(2);
    }
  });
});
