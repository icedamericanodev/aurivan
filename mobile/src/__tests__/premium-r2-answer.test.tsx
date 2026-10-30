/**
 * Premium round 2, spec 2: the answer as a Field Guide plate (Fig. 7).
 *
 *  - a running head: "Practice · IS Audit" / "Question 1 of 2" ("Review ·" in a review set);
 *  - the recap's "Question" head and two-line stem with "Show question";
 *  - the verdict word in ink (the leaf keeps its colour and its ✗ / ✓);
 *  - Fig. 7: after a miss "Your pick, and the best answer" with two rows (one stop each);
 *    after a right answer "Your answer" with one ✓ row;
 *  - KEY IDEA over the quotation and the Exam cue as a clay-keyed label;
 *  - the plate button over a hairline; a mock's footer and screens unchanged;
 *  - motion: the plate, then its rows 40 ms apart (`enter`); the 1.52 vine timing intact;
 *  - 200% text: the disc sits above its key from ×1.6.
 */
import { Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { startFromIds, startMock } from '../lib/sessions';
import { haptic } from '../lib/haptics';
import { originalToDisplay } from '../engine/shuffle';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import { AnswerPlate, FEEDBACK_DELAY, KeyIdeaCue, PLATE_ROW_STAGGER, StemRecap, StickyFooter, Verdict, VINE_ARRIVES, DISC_ABOVE_FROM } from '../components/quiz';
import { RunningHead } from '../components/fieldguide';
import { light, motion } from '../theme/tokens';
import { setMockReducedMotion } from '../../jest/reanimated-mock';

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
// A question from Domain 1 with a key idea, an Exam cue and a note for every wrong option.
const rich = bank.find(
  (q) =>
    q.domainId === '1' &&
    q.keyConcept &&
    q.tips.some((t) => t.startsWith('Exam cue:')) &&
    q.stem.length > 120 &&
    (['A', 'B', 'C', 'D'] as const).every((l) => l === q.correct || Boolean(q.wrongExplanations[l])),
)!;
const other = bank.find((q) => q.id !== rich.id)!;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const labelled = (re: RegExp) => root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel));
const byTestId = (id: string) => root().findAll((n) => typeof n.type === 'string' && n.props.testID === id);
const pressStarting = (prefix: string) => {
  const b = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(prefix) && typeof n.props.onPress === 'function')[0];
  if (!b) throw new Error(`no button starting "${prefix}"`);
  act(() => {
    b.props.onPress();
  });
};

/** Open a set on `rich`, pick a wrong (or the right) option by ORIGINAL letter and check it. */
function answer(right: boolean, mode: 'practice' | 'review' = 'practice') {
  startFromIds('cisa', [rich.id, other.id], 'T');
  if (mode === 'review') {
    act(() => {
      useSession.setState((s) => ({ active: { ...s.active!, mode: 'review' } }));
    });
  }
  act(() => {
    r = create(<SessionScreen />);
  });
  const perm = useSession.getState().active!.perms[rich.id];
  const original = right ? rich.correct : (['A', 'B', 'C', 'D'] as const).find((l) => l !== rich.correct)!;
  const display = originalToDisplay(original, perm);
  const card = root().findAll((n) => n.props.letter === display && typeof n.props.onPress === 'function' && n.props.state !== undefined)[0];
  act(() => {
    card.props.onPress();
  });
  pressStarting('Check answer');
  return { picked: display, best: originalToDisplay(rich.correct, perm) };
}

beforeEach(() => {
  jest.useFakeTimers();
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
});

describe('after a miss', () => {
  it('a running head names the set and the place in it (never the bank size)', () => {
    answer(false);
    const head = root().findByType(RunningHead);
    expect(head.props.section).toBe('Practice · IS Audit');
    expect(head.props.aside).toBe('Question 1 of 2');
  });

  it('the recap is the guide’s "Question" head and the stem in two lines, with "Show question"', () => {
    answer(false);
    expect(root().findByType(StemRecap).props.field).toBe(true);
    expect(labelled(/^Show question$/).length).toBe(1);
  });

  it('the verdict word is ink; the leaf keeps its colour and ✗', () => {
    answer(false);
    const v = root().findByType(Verdict);
    expect(v.props.field).toBe(true);
    const word = v.findAll((n) => typeof n.type === 'string' && n.props.children === 'Not quite')[0];
    expect(StyleSheet.flatten(word.props.style).color).toBe(light.ink);
  });

  it('Fig. 7 · Your pick, and the best answer: a header caption and two rows, one stop each', () => {
    const { picked, best } = answer(false);
    expect(allText()).toContain('Fig. 7 · Your pick, and the best answer');
    const caption = labelled(/^Figure 7, Your pick, and the best answer$/);
    expect(caption).toHaveLength(1);
    expect(caption[0].props.accessibilityRole).toBe('header');
    const pick = byTestId('answer-row-pick');
    const key = byTestId('answer-row-best');
    expect(pick).toHaveLength(1);
    expect(key).toHaveLength(1);
    expect(pick[0].props.accessible).toBe(true);
    expect(pick[0].props.accessibilityLabel).toMatch(new RegExp(`^Your pick, ${picked}, not the best answer: .+\\. Why not ${picked}: `));
    expect(key[0].props.accessibilityLabel).toMatch(new RegExp(`^Best answer, ${best}: `));
    // Colour is never alone: the ✗ / ✓ and the words.
    expect(allText()).toContain('✗ Your pick');
    expect(allText()).toContain('✓ Best answer');
  });

  it('KEY IDEA over the quotation, and the Exam cue as a clay-keyed label', () => {
    answer(false);
    const block = root().findByType(KeyIdeaCue);
    expect(block.props.keyIdea).toBe(rich.keyConcept);
    expect(labelled(/^Key idea: /)).toHaveLength(1);
    const cue = byTestId('exam-cue-label');
    expect(cue).toHaveLength(1);
    expect(cue[0].props.accessibilityLabel).toMatch(/^Exam cue, use it again: /);
    const key = cue[0].findAll((n) => typeof n.type === 'string' && n.props.children === 'Exam cue · use it again')[0];
    expect(StyleSheet.flatten(key.props.style).color).toBe(light.clay);
  });

  it('"Next question" is the plate button over a hairline', () => {
    answer(false);
    expect(root().findByType(StickyFooter).props.rule).toBe(true);
    expect(byTestId('footer-rule')).toHaveLength(1);
    const next = root().findAll((n) => n.props.label === 'Next question' && typeof n.props.onPress === 'function')[0];
    expect(next.props.shape).toBe('plate');
  });

  it('a review set says "Review ·"', () => {
    answer(false, 'review');
    expect(root().findByType(RunningHead).props.section).toBe('Review · IS Audit');
  });
});

describe('after a right answer', () => {
  it('Fig. 7 · Your answer, with one ✓ row', () => {
    const { best } = answer(true);
    expect(allText()).toContain('Fig. 7 · Your answer');
    expect(byTestId('answer-row-pick')).toHaveLength(0);
    const key = byTestId('answer-row-best');
    expect(key).toHaveLength(1);
    expect(key[0].props.accessibilityLabel).toMatch(new RegExp(`^Best answer, ${best}, your pick: `));
    expect(root().findByType(AnswerPlate).props.pick).toBeUndefined();
  });
});

describe('motion', () => {
  /** The FadeIn wrappers inside the plate, outermost first, with their delay and duration. */
  const fades = () =>
    root()
      .findByType(AnswerPlate)
      .findAll((n) => typeof n.type === 'function' && n.type.name === 'FadeIn')
      .map((n) => ({ delay: n.props.delay as number, dur: n.props.dur as string }));

  it('the plate rises first, then its rows 40 ms apart (`enter`)', () => {
    answer(false);
    expect(PLATE_ROW_STAGGER).toBe(40);
    expect(fades()).toEqual([
      { delay: FEEDBACK_DELAY.rows, dur: 'enter' },
      { delay: FEEDBACK_DELAY.rows + 40, dur: 'enter' },
      { delay: FEEDBACK_DELAY.rows + 80, dur: 'enter' },
    ]);
    expect(motion.dur.enter).toBe(240);
  });

  it.each([['motion on', false], ['Reduce Motion', true]])('%s: the Key idea keeps the vine’s timing (nothing, and no tick, before it lands)', (_name, reduced) => {
    setMockReducedMotion(reduced);
    try {
      answer(false);
      jest.mocked(haptic.selection).mockClear();
      const host = byTestId('feedback-vine')[0];
      // The block's view says it is on screen whenever it is asked (as in motion-round2's vine test).
      const onScreen = (cb: (x: number, y: number) => void) => cb(0, 100);
      for (const v of root().findAll((n) => n.props.testID === 'feedback-vine')) if (v.instance) (v.instance as { measureInWindow?: unknown }).measureInWindow = onScreen;
      const layout = () => act(() => { host.props.onLayout?.({ nativeEvent: { layout: { x: 0, y: 400, width: 340, height: 200 } } }); });
      const block = () => root().findByType(KeyIdeaCue);
      layout();
      act(() => { jest.advanceTimersByTime((reduced ? motion.dur.reduced : VINE_ARRIVES) - 1); });
      layout();
      expect(block().props.visible).toBe(false);
      expect(haptic.selection).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(1); });
      layout();
      expect(block().props.visible).toBe(true);
      expect(haptic.selection).toHaveBeenCalledTimes(1);
    } finally {
      setMockReducedMotion(true);
    }
  });
});

describe('a mock is unchanged', () => {
  it('no running head, no plate, the paper fade over its footer', () => {
    startMock('cisa', 3);
    act(() => {
      r = create(<SessionScreen />);
    });
    expect(root().findAllByType(RunningHead)).toHaveLength(0);
    expect(root().findAllByType(AnswerPlate)).toHaveLength(0);
    expect(root().findByType(StickyFooter).props.rule).toBe(false);
  });
});

describe('200% text', () => {
  it('from ×1.6 the disc sits above its key; below it, beside', () => {
    const w = Dimensions.get('window');
    const at = (fontScale: number) => act(() => Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } }));
    try {
      at(1.3);
      answer(false);
      expect(StyleSheet.flatten(byTestId('answer-row-pick')[0].props.style).flexDirection).toBe('row');
      act(() => r!.unmount());
      r = undefined;
      useSession.getState().clear();
      at(DISC_ABOVE_FROM);
      answer(false);
      expect(StyleSheet.flatten(byTestId('answer-row-pick')[0].props.style).flexDirection).toBe('column');
    } finally {
      at(w.fontScale);
    }
  });
});
