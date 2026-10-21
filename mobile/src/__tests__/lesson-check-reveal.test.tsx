/**
 * Mobile 1.37: after a lesson check is answered, the page scrolls so the
 * verdict and its explanation sit above the sticky Back / Next bar (learners
 * were tapping Next without seeing why), and screen-reader focus moves to the
 * verdict, as on the practice answer screen.
 *
 * - revealScrollY (pure maths): scroll just enough that the explanation clears
 *   the bar, never past the verdict's top, never backwards.
 * - The player: one scroll per pick, animated unless Reduce Motion is on.
 * - Accessibility: focus moves to the verdict (whose label says the outcome);
 *   no separate announcement that would talk over it.
 *
 * Real content and real stores. Never `act(() => store.action())`: use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { ScrollView, View } from 'react-native';
import LessonPlayer from '../app/lesson/[id]';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { REVEAL_GAP, revealScrollY } from '../components/lesson';
import { setSystemReducedMotionForTest } from '../components/motion';
import { StickyFooter, Verdict } from '../components/quiz';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { space } from '../theme/tokens';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  const { Pinwheel, Rings, Sprig, Sprout } = jest.requireActual('../components/glyphs');
  return new Proxy({ __esModule: true, ICON_STROKE: 2, Pinwheel, Rings, Sprig, Sprout } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return { SafeAreaView: RNView, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockSay = jest.fn();
const mockMoveFocus = jest.fn();
jest.mock('../lib/a11y', () => ({
  ...jest.requireActual('../lib/a11y'),
  sayLater: (...args: unknown[]) => mockSay(...args),
  moveFocus: (...args: unknown[]) => mockMoveFocus(...args),
}));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

/** The player's anchor line: every non-cover scene starts this far down the scroll content. */
const ANCHOR = space.xxl + space.md;
/** A phone-ish scroll view and footer for the maths below. */
const VIEWPORT = 700;
const FOOTER = 100;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const pressables = (label: string | RegExp) => {
  const hits = root().findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      typeof n.props.accessibilityLabel === 'string' &&
      (typeof label === 'string' ? n.props.accessibilityLabel === label : label.test(n.props.accessibilityLabel)),
  );
  const set = new Set(hits);
  return hits.filter((n) => {
    for (let p = n.parent; p; p = p.parent) if (set.has(p)) return false;
    return true;
  });
};
const press = (label: string | RegExp) =>
  act(() => {
    pressables(label)[0].props.onPress();
  });

const charter = CISA_LESSONS.find((l) => l.id === 'cisa-l-d1-charter')!;
const check = charter.scenes.find((s) => s.type === 'check')! as Extract<(typeof charter.scenes)[number], { type: 'check' }>;
const wrongText = check.options.find((_, i) => i !== check.correctIndex)!;

/** Open the charter lesson, lay out the scroll view and the footer, and walk to the check (its last scene). */
function openCheck() {
  mockParams = { id: charter.id };
  act(() => {
    r = create(<LessonPlayer />);
  });
  act(() => {
    root().findByType(ScrollView).props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 393, height: VIEWPORT } } });
    root().findByType(StickyFooter).props.onHeight(FOOTER);
  });
  for (let k = 0; k < charter.scenes.length - 1; k++) {
    press('Next');
    // With motion on, the page turn plays on a timer (Next is ignored mid-turn): let it finish.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  }
}
/** The View that measures the answer block (the innermost View with onLayout around the Verdict). */
const answerBlock = (): ReactTestInstance => {
  const hits = root().findAll((n) => n.type === View && typeof n.props.onLayout === 'function' && n.findAllByType(Verdict).length > 0);
  return hits[hits.length - 1];
};
const layoutAnswer = (y: number, height: number) =>
  act(() => {
    answerBlock().props.onLayout({ nativeEvent: { layout: { x: 0, y, width: 353, height } } });
  });

let scrollSpy: jest.SpyInstance;
beforeEach(() => {
  jest.useFakeTimers();
  mockSay.mockClear();
  mockMoveFocus.mockClear();
  mockParams = {};
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', shuffleOptions: false, motion: 'system' });
  // The test Reanimated reports Reduce Motion ON by default: turn it off so the normal (animated) path runs.
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
  // Jest's ScrollView is a class: spy on its scrollTo (as badges-screens.test.tsx does).
  scrollSpy = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  scrollSpy.mockRestore();
  // Back to the suite-wide default (Reduce Motion on, nothing live).
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  jest.useRealTimers();
});

describe('revealScrollY: how far to scroll after a check is answered', () => {
  it('scrolls just enough for the explanation to clear the bar (the picked option stays in view)', () => {
    // Explanation ends at 900; the visible area above the bar is 600 tall.
    expect(revealScrollY({ top: 600, bottom: 900 }, VIEWPORT, FOOTER, 0)).toBe(900 + REVEAL_GAP - 600);
  });

  it('a long explanation: stops with the verdict at the top, never past it', () => {
    expect(revealScrollY({ top: 600, bottom: 2000 }, VIEWPORT, FOOTER, 0)).toBe(600 - REVEAL_GAP);
  });

  it('no scroll when it already fits, or when the learner has already scrolled further', () => {
    expect(revealScrollY({ top: 200, bottom: 450 }, VIEWPORT, FOOTER, 0)).toBeNull();
    expect(revealScrollY({ top: 600, bottom: 900 }, VIEWPORT, FOOTER, 500)).toBeNull();
  });

  it('an unmeasured scroll view (height 0): leads with the verdict', () => {
    expect(revealScrollY({ top: 600, bottom: 900 }, 0, FOOTER, 0)).toBe(600 - REVEAL_GAP);
  });
});

describe('the lesson player after a check is answered', () => {
  it('scrolls the verdict and explanation into view above the bar, once, animated', () => {
    openCheck();
    scrollSpy.mockClear();
    press(/^Option [A-D]: The audit committee/);
    // Nothing moves until the answer block has been laid out (its size is only known then).
    expect(scrollSpy).not.toHaveBeenCalled();
    layoutAnswer(500, 300);
    // The scene starts ANCHOR down the content: the explanation ends at ANCHOR + 800.
    const expected = ANCHOR + 800 + REVEAL_GAP - (VIEWPORT - FOOTER);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({ y: expected, animated: true });
    // A later re-layout (e.g. the leaf's spring settling) does not scroll again.
    layoutAnswer(500, 310);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('a miss scrolls too; a long explanation stops with the verdict at the top', () => {
    openCheck();
    scrollSpy.mockClear();
    press(new RegExp(`^Option [A-D]: ${wrongText.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    layoutAnswer(500, 1200);
    expect(scrollSpy).toHaveBeenCalledWith({ y: ANCHOR + 500 - REVEAL_GAP, animated: true });
  });

  it('Reduce Motion (the in-app setting): the scroll jumps instead of gliding', () => {
    useSettings.setState({ motion: 'reduced' });
    openCheck();
    scrollSpy.mockClear();
    press(/^Option [A-D]: The audit committee/);
    layoutAnswer(500, 300);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy.mock.calls[0][0]).toMatchObject({ animated: false });
  });

  it('Reduce Motion (the phone setting): the scroll jumps too', () => {
    setSystemReducedMotionForTest(true);
    openCheck();
    scrollSpy.mockClear();
    press(/^Option [A-D]: The audit committee/);
    layoutAnswer(500, 300);
    expect(scrollSpy.mock.calls[0][0]).toMatchObject({ animated: false });
  });

  it('screen readers: focus moves to the verdict, whose label says the outcome; no announcement on top', () => {
    openCheck();
    mockMoveFocus.mockClear();
    mockSay.mockClear();
    press(new RegExp(`^Option [A-D]: ${wrongText.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    // Not yet: focus waits for the answer block's layout (and so for the scroll).
    expect(mockMoveFocus).not.toHaveBeenCalled();
    layoutAnswer(500, 300);
    const verdict = root().findByType(Verdict);
    // The focus move targets the Verdict's own ref (React 19: ref is a prop).
    const verdictRef = (verdict.props as { ref?: unknown }).ref;
    expect(verdictRef).toBeTruthy();
    expect(mockMoveFocus).toHaveBeenCalledWith(verdictRef, 400);
    // The verdict is one header stop that says it all (the best answer's letter included).
    const label = root().find((n) => n.type === View && n.props.accessibilityRole === 'header' && /^Not quite\./.test(n.props.accessibilityLabel ?? '')).props.accessibilityLabel;
    expect(label).toMatch(/^Not quite\. The best answer is [A-D]\.$/);
    // No separate "Not quite" announcement to talk over the focus move.
    expect(mockSay.mock.calls.some(([text]) => /Correct|Not quite/.test(String(text)))).toBe(false);
  });
});
