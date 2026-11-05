/**
 * Mobile 1.43, the answer screen (board 1, owner decisions), as rebuilt in Grove Phase 4
 * (PHASE4.md section 4, the 4.6 fallback while O1 is open):
 *  - one order: verdict, the answer card, Key idea, "How to think about it", then "Why D";
 *  - after a miss the Exam cue and the tip the coach named are open; the others sit in the
 *    "Read more" fold, after the button; nothing is dropped (Final two stays, even after a runner-up pick);
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
import { AnswerPlate, TipsCard, Verdict, VERDICT_INDENT } from '../components/quiz';
import { dark, light } from '../theme/tokens';

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

// Grove Phase 4 (PHASE4.md 4.2, with the 4.6 fallback while O1 is open): ONE order in every state.
// Verdict, the answer card, Key idea, "How to think about it", then "Why D". After a miss the Exam cue
// and the row the coach line named are open; the other tips wait under "Read more", right after it.
const finalTwoTip = rich.tips.find((t) => t.startsWith('Final two:'))!;
const eliminateTipText = rich.tips.find((t) => t.startsWith('Eliminate:'))!;
const runnerUpOf = () => [...finalTwoTip.matchAll(/\{\{([A-D])\}\}/g)].map((m) => m[1]).find((l) => l !== rich.correct)!;
const ruledOut = () => [...eliminateTipText.matchAll(/\{\{([A-D])\}\}/g)].map((m) => m[1]).find((l) => l !== rich.correct)!;

describe('the answer screen order (Grove Phase 4)', () => {
  it('a miss on an option to rule out: card, Key idea, the tips the coach named and the Exam cue, then Why; Final two waits under Read more', () => {
    const { picked, best } = miss(ruledOut());
    const t = allText();
    const order = ['Not quite', '✗ Your answer', `Why not ${picked}`, '✓ Best answer', 'Key idea', 'How to think about it', 'Eliminate two', 'Exam cue', `Why ${best}`].map((s) => t.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(t).not.toContain('Final two');
    expect(labelled(/^Read more: the full explanation and Final two$/).length).toBeGreaterThan(0);
  });

  it('a miss on the closest wrong choice: Final two and the Exam cue are open; Eliminate two waits', () => {
    const { best } = miss(runnerUpOf());
    const t = allText();
    expect(t.indexOf('How to think about it')).toBeLessThan(t.indexOf('Final two'));
    expect(t.indexOf('Final two')).toBeLessThan(t.indexOf('Exam cue'));
    expect(t.indexOf('Exam cue')).toBeLessThan(t.indexOf(`Why ${best}`));
    expect(t).not.toContain('Eliminate two');
  });

  it('Read more opens the rest after the button, in the written order; Show less closes it', () => {
    miss(runnerUpOf());
    pressStarting('Read more');
    const t = allText();
    expect(t.indexOf('Show less')).toBeLessThan(t.lastIndexOf('Eliminate two'));
    // The whole explanation, no line limit.
    expect(root().findAll((n) => n.props.numberOfLines === 2 && typeof n.props.children === 'string' && n.props.children.length > 150)).toHaveLength(0);
    // The tips inside the fold draw as it opens (no scroll needed).
    const more = root().findAllByType(TipsCard).find((n) => n.props.testID === 'answer-tips-more')!;
    expect(more.props.visible).toBe(true);
    pressStarting('Show less');
    expect(allText()).not.toContain('Eliminate two');
  });

  it('a long Why is cut to two lines on screen only: the screen reader gets the whole text', () => {
    miss(runnerUpOf());
    const folded = root().findAll((n) => typeof n.type === 'string' && n.props.numberOfLines === 2 && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.length > 150);
    expect(folded.length).toBeGreaterThan(0);
  });

  it('a right answer: every tip open in the written order, then the whole Why; nothing folds', () => {
    startFromIds('cisa', [rich.id, other.id], 'T');
    act(() => {
      r = create(<SessionScreen />);
    });
    const perm = useSession.getState().active!.perms[rich.id];
    const best = originalToDisplay(rich.correct, perm);
    const card = root().findAll((n) => n.props.letter === best && typeof n.props.onPress === 'function' && n.props.state !== undefined)[0];
    act(() => {
      card.props.onPress();
    });
    pressStarting('Check answer');
    const t = allText();
    const order = ['Correct', '✓ Your answer · the best', 'Key idea', 'How to think about it', 'Eliminate two', 'Final two', 'Exam cue', `Why ${best}`].map((s) => t.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(labelled(/^Read more/)).toHaveLength(0);
    expect(labelled(new RegExp(`^Your answer, ${best}, the best: `)).length).toBe(1);
  });

  it('Final two is never dropped, even after picking the runner-up', () => {
    const { perm } = miss(runnerUpOf());
    expect(allText()).toContain(renderText(tipParts(finalTwoTip, 0).body, perm));
  });
});

describe('the answer card (Grove Phase 4, 4.2 step 2)', () => {
  it('says the DISPLAY letter in every spoken label and shows it in the badge; "Why not B" is its own stop', () => {
    const { picked, best, perm } = miss();
    const plate = root().findByType(AnswerPlate);
    expect(plate.props.pick.letter).toBe(picked);
    expect(plate.props.best.letter).toBe(best);
    expect(labelled(new RegExp(`^Your answer, ${picked}, not the best: `)).length).toBe(1);
    expect(labelled(new RegExp(`^Best answer, ${best}: `)).length).toBe(1);
    // The note of the option the learner picked: found by its ORIGINAL letter, shown with display letters.
    const note = renderText(rich.wrongExplanations[displayToOriginal(picked, perm)]!, perm);
    expect(plate.props.pick.why).toBe(note);
    expect(labelled(new RegExp(`^Why not ${picked}: `)).length).toBe(1);
    // "Why not B" is never a heading: "Why D" is the one Why heading.
    const whyHeaders = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'header' && typeof n.props.children === 'string' && /^Why /.test(n.props.children));
    expect(whyHeaders.map((n) => n.props.children)).toEqual([`Why ${best}`]);
  });

  it('no tinted fills: one raised card; the state colour is on the badge and the caption only', () => {
    miss();
    const [card] = root().findAll((n) => n.props.testID === 'answer-plate' && typeof n.type === 'string');
    const flat = StyleSheet.flatten(card.props.style);
    expect([light.raised, dark.raised]).toContain(flat.backgroundColor);
    expect([light.wrongBg, dark.wrongBg]).not.toContain(flat.backgroundColor);
    for (const id of ['answer-row-pick', 'answer-row-best']) {
      const [row] = root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
      expect(StyleSheet.flatten(row.props.style).backgroundColor).toBeUndefined();
    }
  });

  it('the source row carries "Report a problem" (it stays in More too)', () => {
    miss();
    const [link] = root().findAll((n) => n.props.testID === 'answer-report-link' && typeof n.props.onPress === 'function');
    expect(link.props.accessibilityLabel).toBe('Report a problem with this question');
  });
});

describe('the verdict word', () => {
  it('"Not quite" in the miss tone, "Correct" in the correct tone (hero, never ink)', () => {
    act(() => {
      r = create(<Verdict correct={false} coach="Coach." field />);
    });
    const word = root().findAll((n) => typeof n.type === 'string' && n.props.children === 'Not quite')[0];
    expect(StyleSheet.flatten(word.props.style).color).toBe(light.wrong);
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
