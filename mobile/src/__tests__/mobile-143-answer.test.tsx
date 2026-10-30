/**
 * Mobile 1.43, the answer screen (board 1, owner decisions):
 *  - Eliminate two and Final two sit INSIDE the "Read more" fold, after the
 *    explanation; "Read more" opens all of it, "Show less" closes all of it;
 *    nothing is dropped (Final two stays, even after a runner-up pick);
 *  - the rows carry the DISPLAY letter in their badge and in every spoken label
 *    (premium round 2, the Fig. 4 plate: "Your pick, B, not the best answer: … Why not B: …",
 *    "Best answer, D: …");
 *  - the pick's own note sits in its row as "Why not B: …", never a header,
 *    so "Why D" is the one "Why" heading on the screen;
 *  - at ×1.3 text the coach line starts at the gutter;
 *  - the dark wrongBg is the calmer #2C1A1D.
 */
import { Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { startFromIds } from '../lib/sessions';
import { displayToOriginal, originalToDisplay, renderText } from '../engine/shuffle';
import { tipParts } from '../engine/tips';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import { AnswerPlate, Verdict, VERDICT_INDENT, Vine } from '../components/quiz';
import { dark } from '../theme/tokens';

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
// The full v2 tip set, a key idea, a long explanation and a note for every wrong option.
const rich = bank.find(
  (q) =>
    q.keyConcept &&
    q.tips.some((t) => t.startsWith('Exam cue:')) &&
    q.tips.some((t) => t.startsWith('Eliminate:')) &&
    q.tips.some((t) => t.startsWith('Final two:')) &&
    q.explanation.length > 220 &&
    (['A', 'B', 'C', 'D'] as const).every((l) => l === q.correct || Boolean(q.wrongExplanations[l])),
)!;
const other = bank.find((q) => q.id !== rich.id)!;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const labelled = (re: RegExp) => root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel));
const pressStarting = (prefix: string) => {
  const b = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(prefix) && typeof n.props.onPress === 'function')[0];
  if (!b) throw new Error(`no button starting "${prefix}"`);
  act(() => {
    b.props.onPress();
  });
};

/** Open the session, pick a WRONG option (by original letter) and check it. Returns the picked and best DISPLAY letters. */
function miss(pickOriginal?: string) {
  startFromIds('cisa', [rich.id, other.id], 'T');
  act(() => {
    r = create(<SessionScreen />);
  });
  const s = useSession.getState().active!;
  const perm = s.perms[rich.id];
  const wrong = pickOriginal ?? (['A', 'B', 'C', 'D'] as const).find((l) => l !== rich.correct)!;
  const display = originalToDisplay(wrong as 'A', perm);
  const card = root().findAll((n) => n.props.letter === display && typeof n.props.onPress === 'function' && n.props.state !== undefined)[0];
  act(() => {
    card.props.onPress();
  });
  pressStarting('Check answer');
  return { picked: display, best: originalToDisplay(rich.correct, perm), perm };
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

describe('the Read more fold holds Eliminate two and Final two', () => {
  it('folded: the explanation shows two lines and the two tips are not on screen; Read more names what it opens', () => {
    miss();
    expect(allText()).not.toContain('Eliminate two');
    expect(allText()).not.toContain('Final two');
    expect(labelled(/^Read more: the full explanation, Eliminate two and Final two$/).length).toBeGreaterThan(0);
  });

  it('Read more opens the explanation and both tips, after "Why"; Show less closes all of it', () => {
    miss();
    pressStarting('Read more');
    const t = allText();
    expect(t.indexOf('Eliminate two')).toBeGreaterThan(t.search(/Why [A-D]\b/));
    expect(t.indexOf('Final two')).toBeGreaterThan(t.indexOf('Eliminate two'));
    // The whole explanation, no line limit.
    expect(root().findAll((n) => n.props.numberOfLines === 2 && typeof n.props.children === 'string' && n.props.children.length > 150)).toHaveLength(0);
    pressStarting('Show less');
    expect(allText()).not.toContain('Eliminate two');
    expect(allText()).not.toContain('Final two');
  });

  it('the vine inside the fold is drawn when the fold opens (no scroll needed)', () => {
    miss();
    pressStarting('Read more');
    const vines = root().findAllByType(Vine);
    expect(vines[vines.length - 1].props.visible).toBe(true);
  });

  it('Final two is never dropped, even after picking the runner-up', () => {
    const finalTwo = rich.tips.find((t) => t.startsWith('Final two:'))!;
    const runner = [...finalTwo.matchAll(/\{\{([A-D])\}\}/g)].map((m) => m[1]).find((l) => l !== rich.correct);
    const { perm } = miss(runner);
    pressStarting('Read more');
    expect(allText()).toContain(renderText(tipParts(finalTwo, 0).body, perm));
  });
});

describe('the answer rows (the Fig. 4 plate, premium round 2)', () => {
  it('say the DISPLAY letter in their spoken labels, and show it in the disc', () => {
    const { picked, best } = miss();
    const plate = root().findByType(AnswerPlate);
    expect(plate.props.pick.letter).toBe(picked);
    expect(plate.props.best.letter).toBe(best);
    expect(labelled(new RegExp(`^Your pick, ${picked}, not the best answer: `)).length).toBe(1);
    expect(labelled(new RegExp(`^Best answer, ${best}: `)).length).toBe(1);
    // The keys carry no "· B" on screen; the disc does.
    expect(allText()).not.toMatch(/Your pick ·|Best answer ·/);
    // "Your pick" replaces "Your answer" on this screen.
    expect(allText()).not.toContain('Your answer');
  });

  it('the pick’s note sits in its row as "Why not B", and "Why D" is the one Why heading', () => {
    const { picked, best, perm } = miss();
    const plate = root().findByType(AnswerPlate);
    // The note of the option the learner picked: found by its ORIGINAL letter, shown with display letters.
    const note = renderText(rich.wrongExplanations[displayToOriginal(picked, perm)]!, perm);
    expect(plate.props.pick.why).toBe(note);
    // One stop for the row, its note included.
    expect(labelled(new RegExp(`^Your pick, ${picked}, not the best answer: .*\\. Why not ${picked}: `)).length).toBe(1);
    const whyHeaders = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header' && typeof n.props.children === 'string' && /^Why /.test(n.props.children));
    expect(whyHeaders.map((n) => n.props.children)).toEqual([`Why ${best}`]);
    // Order: your pick, its note, the best answer.
    const t = allText();
    expect(t.indexOf('✗ Your pick')).toBeLessThan(t.indexOf(`Why not ${picked}`));
    expect(t.indexOf(`Why not ${picked}`)).toBeLessThan(t.indexOf('✓ Best answer'));
  });
});

describe('large text and the calmer red', () => {
  it('the coach line starts under the word at ×1, and at the gutter from ×1.3', () => {
    const coachMargin = () => {
      const coach = root().findAll((n) => n.props.children === 'Clean read.' && n.props.style !== undefined)[0];
      return StyleSheet.flatten(coach.props.style).marginLeft;
    };
    const w = Dimensions.get('window');
    const at = (fontScale: number) => act(() => Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } }));
    try {
      at(1);
      act(() => {
        r = create(<Verdict correct coach="Clean read." />);
      });
      expect(coachMargin()).toBe(VERDICT_INDENT);
      act(() => r!.unmount());
      at(1.3);
      act(() => {
        r = create(<Verdict correct coach="Clean read." />);
      });
      expect(coachMargin()).toBe(0);
    } finally {
      at(w.fontScale);
    }
  });

  it('dark wrongBg is #2C1A1D', () => {
    expect(dark.wrongBg).toBe('#2C1A1D');
  });
});
