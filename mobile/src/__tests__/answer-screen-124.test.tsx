/**
 * Mobile 1.24, the answer screen and Results (stream S2):
 *  - after a miss the order is: verdict, your answer, best answer, Key idea,
 *    Exam cue, THEN the folded "Why", then Eliminate two / Final two;
 *  - no "Code d1_xxx" in the learner view;
 *  - the coach line is neutral unless a slip was tagged; no "error" buzz;
 *  - a right retest says "Back in your review tomorrow.";
 *  - screen-reader focus moves to the verdict, which says the best answer (no "below", no second announcement);
 *  - a one-question session ends back where it started (no Results page);
 *  - the mock footer has words, the navigator a summary and a sticky Submit;
 *  - Results: headline by sample size, calibration line, no tag soup,
 *    "Time's up", Android Back.
 */
import { AccessibilityInfo, BackHandler } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { getAllQuestions } from '../content/loader';
import { startFromIds, startMock } from '../lib/sessions';
import { finishSession } from '../lib/finishSession';
import { moveFocus } from '../lib/a11y';
import { haptic } from '../lib/haptics';
import { RETEST_LINE } from '../engine/srs';
import { NEUTRAL_MISS_LINE, RUNNER_UP_LINE } from '../engine/slipCoach';
import { TIMES_UP_DETAIL, TIMES_UP_LINE } from '../engine/resultsCopy';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import Results from '../app/results';
import { StickyFooter, Verdict } from '../components/quiz';

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
// A question with the full v2 tip set, a key idea and a long explanation (so "Why" folds).
const rich = bank.find(
  (q) =>
    q.keyConcept &&
    q.tips.some((t) => t.startsWith('Exam cue:')) &&
    q.tips.some((t) => t.startsWith('Eliminate:')) &&
    q.tips.some((t) => t.startsWith('Final two:')) &&
    q.explanation.length > 220,
)!;
const others = bank.filter((q) => q.id !== rich.id).slice(0, 2);

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const btn = (label: string) =>
  root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0];
const press = (label: string) => {
  const b = btn(label);
  if (!b) throw new Error(`no button "${label}"`);
  act(() => {
    b.props.onPress();
  });
};
const optionCards = () => root().findAll((n) => n.props.letter !== undefined && n.props.state !== undefined && typeof n.props.text === 'string');
/** Tap the first option whose ORIGINAL letter is right (or wrong). */
function pickBy(right: boolean) {
  const s = useSession.getState().active!;
  const qid = s.questionIds[s.index];
  const q = bank.find((x) => x.id === qid)!;
  const perm = s.perms[qid];
  const card = optionCards().find((n) => (perm[['A', 'B', 'C', 'D'].indexOf(n.props.letter)] === q.correct) === right)!;
  act(() => {
    card.props.onPress();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(router.replace).mockClear();
  jest.mocked(router.back).mockClear();
  jest.mocked(moveFocus).mockClear();
  jest.mocked(haptic.error).mockClear();
  jest.mocked(haptic.selection).mockClear();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the answer screen after a miss', () => {
  const missRich = () => {
    startFromIds('cisa', [rich.id, ...others.map((o) => o.id)], 'T');
    mount(<SessionScreen />);
    pickBy(false);
    press('Check answer');
  };

  it('order: Not quite, your answer, best answer, Key idea, Exam cue, Why, Eliminate two, Final two', () => {
    missRich();
    const t = allText();
    const at = (s: string) => t.indexOf(s);
    const order = ['Not quite', 'Your answer ·', 'Best answer ·', 'Key idea', 'Exam cue', 'Why ', 'Eliminate two', 'Final two'].map(at);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('a right answer keeps the old order: Why first, then the whole vine', () => {
    startFromIds('cisa', [rich.id, ...others.map((o) => o.id)], 'T');
    mount(<SessionScreen />);
    pickBy(true);
    press('Check answer');
    const t = allText();
    expect(t.indexOf('Why ')).toBeGreaterThan(-1);
    expect(t.indexOf('Why ')).toBeLessThan(t.indexOf('Key idea'));
    expect(t).not.toContain('Read more');
  });

  it('the long Why is folded to two lines with Read more, and opens in place', () => {
    missRich();
    const why = root().findAll((n) => n.props.numberOfLines === 2 && typeof n.props.children === 'string' && n.props.children.length > 150);
    expect(why.length).toBeGreaterThan(0);
    press('Read more of the explanation');
    expect(btn('Show less of the explanation')).toBeDefined();
    expect(root().findAll((n) => n.props.numberOfLines === 2 && typeof n.props.children === 'string' && n.props.children.length > 150)).toHaveLength(0);
  });

  it('no "Code d1_xxx" in the learner view (it stays in the Report sheet)', () => {
    missRich();
    expect(allText()).not.toMatch(/Code d\d_\d+/);
    expect(allText()).not.toContain(rich.id);
    expect(btn('Report a problem') ?? root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /report/i.test(n.props.accessibilityLabel))[0]).toBeDefined();
  });

  it('the coach line is neutral for an untagged miss', () => {
    startFromIds('cisa', [others[0].id, others[1].id], 'T');
    mount(<SessionScreen />);
    pickBy(false);
    press('Check answer');
    const coach = root().findByType(Verdict).props.coach as string;
    // Neutral unless the runner-up tip applies (that line comes from the question itself).
    expect(coach).not.toContain('Check who you are');
    expect(allText()).not.toContain('Check who you are in the question.');
    expect([NEUTRAL_MISS_LINE, RUNNER_UP_LINE]).toContain(coach);
  });

  it('a tagged "acted as the wrong person" slip gets its own line', () => {
    const q = others[0];
    act(() => {
      useProgress.getState().recordMistake('cisa', q.id, 'A');
      useProgress.getState().tagMistake('cisa', q.id, 'role');
    });
    startFromIds('cisa', [q.id, others[1].id], 'T');
    mount(<SessionScreen />);
    pickBy(false);
    press('Check answer');
    // (A runner-up pick would still say so; otherwise the tagged slip's line.)
    expect(['Check who you are in the question.', RUNNER_UP_LINE]).toContain(root().findByType(Verdict).props.coach);
  });

  it('a miss gets the neutral tap, never the error buzz; a right answer keeps success', () => {
    startFromIds('cisa', [others[0].id, others[1].id], 'T');
    mount(<SessionScreen />);
    pickBy(false);
    press('Check answer');
    expect(haptic.error).not.toHaveBeenCalled();
    expect(haptic.selection).toHaveBeenCalled();
    press('Next question');
    pickBy(true);
    press('Check answer');
    expect(haptic.success).toHaveBeenCalled();
  });

  it('screen-reader focus moves to the verdict, whose label says the best answer (no separate announcement)', () => {
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    startFromIds('cisa', [others[0].id, others[1].id], 'T');
    mount(<SessionScreen />);
    pickBy(false);
    press('Check answer');
    expect(moveFocus).toHaveBeenCalledWith(expect.objectContaining({ current: expect.anything() }), 400);
    // UX review B3: said once, through the focused verdict, never also as an announcement that the focus move cuts off.
    const said = say.mock.calls.map((c) => String(c[0]));
    expect(said.some((s) => /Not quite/.test(s))).toBe(false);
    // The letter spoken is the DISPLAY letter of the original key (grading stays on original letters).
    const s = useSession.getState().active!;
    const qid = s.questionIds[s.index];
    const best = ['A', 'B', 'C', 'D'].find((d, i) => s.perms[qid][i] === bank.find((x) => x.id === qid)!.correct);
    const label = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(`Not quite. Best answer ${best}. `));
    expect(label.length).toBeGreaterThan(0);
    expect(String(label[0].props.accessibilityLabel)).not.toMatch(/below/i);
  });
});

describe('a right retest', () => {
  it('says "Back in your review tomorrow." and does not promote or fix the miss', () => {
    const q = others[0];
    // The learner missed it a minute ago.
    act(() => {
      useProgress.getState().recordAnswer('cisa', q.id, false, undefined);
      useProgress.getState().recordMistake('cisa', q.id, 'A');
    });
    startFromIds('cisa', [q.id], 'T');
    mount(<SessionScreen />);
    pickBy(true);
    press('Check answer');
    expect(allText()).toContain(RETEST_LINE);
    const s = selectCert(useProgress.getState(), 'cisa');
    expect(s.review[q.id].box).toBe(1);
    expect(s.mistakes[q.id].resolved).toBe(false);
  });

  it('is not said after a first right answer, or a wrong one', () => {
    startFromIds('cisa', [others[0].id, others[1].id], 'T');
    mount(<SessionScreen />);
    pickBy(true);
    press('Check answer');
    expect(allText()).not.toContain(RETEST_LINE);
  });
});

describe('one question on its own ends where it started', () => {
  it('the button says Done; it goes back, clears the session and opens no Results page', () => {
    startFromIds('cisa', [others[0].id], 'Saved question');
    mount(<SessionScreen />);
    pickBy(true);
    press('Check answer');
    expect(btn('Done')).toBeDefined();
    expect(btn('See results')).toBeUndefined();
    press('Done');
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalledWith('/results');
    expect(useSession.getState().active).toBeNull();
    // The answer still counted.
    expect(selectCert(useProgress.getState(), 'cisa').answers[others[0].id]).toBeDefined();
  });

  it('closing it asks nothing and goes back; a longer session keeps "See results"', () => {
    startFromIds('cisa', [others[0].id], 'Saved question');
    mount(<SessionScreen />);
    press('End session');
    expect(router.back).toHaveBeenCalled();
    expect(useSession.getState().active).toBeNull();
  });
});

describe('the mock exam footer and navigator', () => {
  it('Previous, Flag and Questions are words, and the navigator summarises and keeps Submit in a sticky footer', () => {
    startMock('cisa', 3);
    mount(<SessionScreen />);
    for (const word of ['Previous', 'Flag', 'Questions']) {
      const b = root().findAll((n) => n.props.label === word && typeof n.props.onPress === 'function');
      expect(b.length).toBeGreaterThan(0);
    }
    // Answer one, flag another, open the navigator.
    pickBy(true);
    press('Flag question');
    press('Questions, question navigator');
    expect(allText()).toContain('1 answered · 1 flagged · 2 left');
    const footers = root().findAllByType(StickyFooter);
    expect(footers.some((f) => f.findAll((n) => n.props.label === 'Submit exam').length > 0)).toBe(true);
  });
});

// ── Results ─────────────────────────────────────────────────────────────
/** Answer `n` questions in one practice session, the first `right` of them correctly, then finish it. */
function finished(n: number, right: number, confidences: (undefined | 'sure' | 'unsure' | 'guessing')[] = []) {
  const qs = bank.slice(100, 100 + n);
  startFromIds('cisa', qs.map((q) => q.id), 'T');
  const s = useSession.getState().active!;
  act(() => {
    qs.forEach((q, i) => {
      const perm = s.perms[q.id];
      const rightDisplay = (['A', 'B', 'C', 'D'] as const).find((d, k) => perm[k] === q.correct)!;
      const wrongDisplay = (['A', 'B', 'C', 'D'] as const).find((d, k) => perm[k] !== q.correct)!;
      useSession.getState().answer(q.id, { display: i < right ? rightDisplay : wrongDisplay, correct: i < right, ms: 30_000, confidence: confidences[i], ...(i === 0 ? { assisted: true } : {}) });
    });
    finishSession({ celebrate: false });
  });
}

describe('Results', () => {
  it('a handful of questions: the count, never "Strong work."; no percent anywhere', () => {
    finished(4, 3);
    mount(<Results />);
    const t = allText();
    expect(t).toContain('3 of 4 right');
    expect(t).not.toContain('Strong work');
    expect(t).not.toContain('Every miss is a lesson');
    // One miss: "Missed:", never "Most missed" (it would overstate).
    expect(t).toMatch(/(^| )Missed: .+\./);
    expect(t).not.toMatch(/Most missed/);
    // The count is said once (UX review S7): no "Correct" cell and no count in the ring's centre.
    expect(t.match(/3 of 4/g)).toHaveLength(1);
    expect(t).not.toMatch(/Correct 3/);
    // Mobile 1.39: these four are one domain, so there is no ring at all (rings are for mixed sets and mocks).
    const rings = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^(3 of 4 right|Score \d+ percent)\./.test(n.props.accessibilityLabel));
    expect(rings).toHaveLength(0);
    expect(t).not.toMatch(/\d+%|percent/);
  });

  it('eight or more: the encouraging bands are back', () => {
    finished(8, 7);
    mount(<Results />);
    expect(allText()).toContain('Strong work.');
  });

  it('the calibration line when enough answers were rated', () => {
    finished(10, 7, ['sure', 'sure', 'sure', 'sure', 'sure', 'sure', 'sure', 'unsure', 'unsure', 'unsure']);
    mount(<Results />);
    // Seven are right (the first seven); the sure ones are all right, the unsure ones all wrong.
    expect(allText()).toContain('How sure you felt: Sure 7 of 7 right · Unsure 0 of 3 right');
  });

  it('no calibration line when nothing was rated', () => {
    finished(10, 5);
    mount(<Results />);
    expect(allText()).not.toContain('How sure you felt');
  });

  it('no tag soup: a hinted miss row is one quiet line, in plain words', () => {
    finished(4, 0);
    mount(<Results />);
    const t = allText();
    expect(t).not.toContain('Hint used');
    expect(t).not.toContain('Quick pick');
    expect(t).not.toMatch(/[✓✗○]/);
    expect(t).toContain('You used a hint.');
    expect(t).toContain('Missed');
  });

  it('a timed mock that ran out of time says so, in words and aloud', () => {
    jest.setSystemTime(new Date(2026, 9, 7, 9, 0, 0));
    startMock('cisa', 3);
    jest.setSystemTime(new Date(2026, 9, 7, 13, 0, 0)); // well past the deadline
    act(() => {
      finishSession({ celebrate: false });
    });
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    mount(<Results />);
    expect(allText()).toContain(TIMES_UP_LINE);
    expect(allText()).toContain(TIMES_UP_DETAIL);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(say.mock.calls.map((c) => String(c[0])).some((s) => s.includes(TIMES_UP_LINE))).toBe(true);
  });

  it('a practice session that is not a timed mock says nothing about time', () => {
    finished(4, 2);
    mount(<Results />);
    expect(allText()).not.toContain('Time’s up');
  });

  it('Android Back leaves a practice Results like Done (clears and goes to Today)', () => {
    let handler: (() => boolean) | undefined;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_e, cb) => {
      handler = cb as () => boolean;
      return { remove: () => {} };
    });
    finished(4, 2);
    mount(<Results />);
    expect(handler).toBeDefined();
    act(() => {
      handler!();
    });
    expect(router.replace).toHaveBeenCalledWith('/home');
    expect(useSession.getState().active).toBeNull();
  });
});
