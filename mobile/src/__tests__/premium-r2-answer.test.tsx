/**
 * Premium round 2, spec 2: the answer as a Field Guide plate (Fig. 4).
 *
 *  - a running head: "Practice · IS Audit" / "Question 1 of 2" ("Review ·" in a review set);
 *  - the recap's "Question" head and two-line stem with "Show question";
 *  - the verdict word in ink (the leaf keeps its colour and its ✗ / ✓);
 *  - Fig. 4: after a miss "Your pick, and the best answer" with two rows (one stop each);
 *    after a right answer "Your answer" with one ✓ row;
 *  - KEY IDEA over the quotation and the Exam cue as a clay-keyed label (after a right answer too,
 *    under Why, with Eliminate / Final two left on the vine; UX review P2);
 *  - the coach line: a tagged slip wins over "rule out first", never over "final two" (UX review P1);
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
import { AnswerPlate, FEEDBACK_DELAY, KeyIdeaCue, PLATE_ROW_STAGGER, StemRecap, StickyFooter, Verdict, Vine, VINE_ARRIVES, DISC_ABOVE_FROM, WhyBlock } from '../components/quiz';
import type { Letter } from '../content/types';
import { finalTwoLine, pickCoachKind, ruleOutLine } from '../engine/pickCoach';
import { SLIP_LINE } from '../engine/slipCoach';
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
function answer(right: boolean, mode: 'practice' | 'review' = 'practice', pickOriginal?: Letter) {
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
  const original = right ? rich.correct : (pickOriginal ?? (['A', 'B', 'C', 'D'] as const).find((l) => l !== rich.correct)!);
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

  it('the caption "Your pick, and the best answer" (no book label): a header and two rows, one stop each', () => {
    const { picked, best } = answer(false);
    expect(allText()).toContain('Your pick, and the best answer');
    const caption = labelled(/^Your pick, and the best answer$/);
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
  it('"Your answer" (no book label), with one ✓ row', () => {
    const { best } = answer(true);
    expect(allText()).toContain('Your answer');
    expect(byTestId('answer-row-pick')).toHaveLength(0);
    const key = byTestId('answer-row-best');
    expect(key).toHaveLength(1);
    expect(key[0].props.accessibilityLabel).toMatch(new RegExp(`^Best answer, ${best}, your pick: `));
    expect(root().findByType(AnswerPlate).props.pick).toBeUndefined();
  });

  it('Why first, then KEY IDEA and the Exam cue label, then Eliminate / Final two on the vine (UX review P2)', () => {
    answer(true);
    // Tree order is reading order.
    const order = root()
      .findAll((n) => n.type === WhyBlock || n.type === KeyIdeaCue || n.type === Vine)
      .map((n) => (n.type === WhyBlock ? 'why' : n.type === KeyIdeaCue ? 'key' : 'vine'));
    expect(order).toEqual(['why', 'key', 'vine']);
    expect(root().findByType(KeyIdeaCue).props.keyIdea).toBe(rich.keyConcept);
    expect(byTestId('exam-cue-label')).toHaveLength(1);
    // The vine keeps the other two tips and no Key idea leaf (so it never ticks a second time).
    const vine = root().findByType(Vine);
    expect(vine.props.keyIdea).toBeUndefined();
    expect(vine.props.tips).toHaveLength(2);
    expect(vine.props.tips.some((t: string) => t.startsWith('Exam cue'))).toBe(false);
    // Both live in the one feedback-vine view that carries the vine's timing.
    const host = root().findAll((n) => n.props.testID === 'feedback-vine')[0];
    expect(host.findAllByType(KeyIdeaCue)).toHaveLength(1);
    expect(host.findAllByType(Vine)).toHaveLength(1);
  });
});

describe('the coach line after a miss (UX review P1)', () => {
  const wrong = (['A', 'B', 'C', 'D'] as const).filter((l) => l !== rich.correct);
  const ruleOut = wrong.find((l) => pickCoachKind(rich.tips, rich.correct, l) === 'rule-out')!;
  const finalTwo = wrong.find((l) => pickCoachKind(rich.tips, rich.correct, l) === 'final-two')!;
  /** The learner tagged an earlier miss on this question "Misread". */
  const tag = () =>
    act(() => {
      useProgress.getState().recordMistake('cisa', rich.id, ruleOut);
      useProgress.getState().tagMistake('cisa', rich.id, 'misread');
    });
  const coach = () => root().findByType(Verdict).props.coach as string;

  it('untagged, a rule-out pick hears "rule out first"', () => {
    const { picked } = answer(false, 'practice', ruleOut);
    expect(coach()).toBe(ruleOutLine(picked));
  });

  it('a tagged slip wins over "rule out first": the learner’s own words', () => {
    tag();
    answer(false, 'practice', ruleOut);
    expect(coach()).toBe(SLIP_LINE.misread);
  });

  it('reaching the final two still says so, even with a tagged slip', () => {
    tag();
    const { picked, best } = answer(false, 'practice', finalTwo);
    expect(coach()).toBe(finalTwoLine(picked, best));
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

  it.each([
    ['motion on, a miss', false, false],
    ['Reduce Motion, a miss', true, false],
    ['motion on, a right answer', false, true],
    ['Reduce Motion, a right answer', true, true],
  ])('%s: the Key idea keeps the vine’s timing (nothing, and no tick, before it lands; then one)', (_name, reduced, right) => {
    setMockReducedMotion(reduced);
    try {
      answer(right);
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
  it('on a wide screen the Exam cue takes a margin column, but not from ×1.3 text (UX review P4)', () => {
    const w = Dimensions.get('window');
    const at = (fontScale: number) => act(() => Dimensions.set({ window: { ...w, width: 700, fontScale }, screen: { ...w, width: 700, fontScale } }));
    const direction = () => {
      const outer = r!.root.findByType(KeyIdeaCue).children[0] as ReactTestInstance;
      return StyleSheet.flatten(outer.props.style).flexDirection;
    };
    const el = <KeyIdeaCue keyIdea="Independence first." cues={[{ label: 'Exam cue', body: 'Look for who owns it.' }]} visible={false} />;
    try {
      at(1);
      act(() => { r = create(el); });
      expect(direction()).toBe('row');
      act(() => r!.unmount());
      at(1.3);
      act(() => { r = create(el); });
      expect(direction()).toBeUndefined();
    } finally {
      at(w.fontScale);
      act(() => Dimensions.set({ window: w, screen: w }));
    }
  });

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
