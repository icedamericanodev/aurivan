/**
 * Mobile 1.8 review fixes (PR #38: UX H1–H3 and P1–P5, code review B1–B3 and
 * minors, QA's three pins). Run with the phone's motion ON unless a test says
 * otherwise, and fake timers, so the page turn's real 120 ms leaving phase is
 * on screen (the shared Reanimated mock defaults to Reduce Motion, which
 * would hide it).
 *
 * - A mock turns calmly: no leaving phase, nothing to tap on a stale page.
 * - Practice: mid-turn, the header and footer follow the page still on
 *   screen ("Next question", the old question's bookmark) and ignore taps.
 * - Screen readers hear "Question N of M" after each turn; Guided moves focus
 *   to the new topic's title; a lesson's Back on scene 2 hands focus to Next.
 * (The copy fixes are in phase2-review-copy.test.tsx.)
 *
 * Gotcha: never `act(() => store.action())` — use braces.
 */
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import SessionScreen from '../app/session';
import GuidedStep from '../app/guided';
import LessonPlayer from '../app/lesson/[id]';
import { PageTurn, setSystemReducedMotionForTest } from '../components/motion';
import { OptionCard } from '../components/quiz';
import { Stem } from '../components/ui';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { findQuestion, getAllQuestions } from '../content/loader';
import { ANNOUNCE_DELAY } from '../lib/a11y';
import { startFromIds, startMock } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { motion } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
// Focus moves are asserted by the ref they target (the test renderer has no native views).
const mockMoveFocus = jest.fn();
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: (...a: unknown[]) => mockMoveFocus(...a) }));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const btn = (label: string | RegExp) =>
  root()
    .findAll((n) => typeof n.props.onPress === 'function' && [n.props.label, n.props.accessibilityLabel].some((l) => typeof l === 'string' && (typeof label === 'string' ? l === label : label.test(l))))
    .at(0);
const press = (label: string | RegExp) => {
  const b = btn(label);
  if (!b) throw new Error(`No button "${String(label)}"`);
  act(() => {
    b.props.onPress();
  });
};
const tick = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
const active = () => useSession.getState().active!;
const stem = () => root().findAllByType(Stem).map((n) => n.props.children as string);
/** The PageTurn's own frame is untouchable only while the old page leaves. */
const leaving = () => (StyleSheet.flatten(root().findAllByType(PageTurn)[0].findAllByType(View)[0].props.style) ?? {}).pointerEvents === 'none';
const pickRight = () => {
  const qid = active().questionIds[active().index];
  const q = findQuestion('cisa', qid)!;
  const card = root()
    .findAllByType(OptionCard)
    .find((c) => typeof c.props.onPress === 'function' && c.props.text === q.options[q.correct]);
  act(() => {
    card!.props.onPress();
  });
};

const ALL = getAllQuestions('cisa');
const FOUR = ALL.slice(10, 14).map((q) => q.id);

let announce: jest.SpyInstance;
let focus: jest.SpyInstance;
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 11, 9, 0, 0));
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(null);
  mockParams = {};
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', theme: 'light', motion: 'system', haptics: true, shuffleOptions: true });
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  focus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
  mockMoveFocus.mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  announce.mockRestore();
  focus.mockRestore();
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('a mock with motion on turns calmly (full-motion session, fake timers)', () => {
  it('every tap lands on a settled page: Next, Flag, Previous, the navigator', () => {
    act(() => {
      startMock('cisa', 6);
    });
    const ids = [...active().questionIds];
    const stemOf = (i: number) => findQuestion('cisa', ids[i])!.stem;
    mount(<SessionScreen />);
    pickRight();
    press('Next');
    // No leaving phase: the next question is there at once (a short fade, no drift).
    expect(leaving()).toBe(false);
    expect(stem()).toEqual([stemOf(1)]);
    // So Flag, tapped straight away, flags the question the learner sees.
    press('Flag question');
    expect(active().flagged).toEqual([ids[1]]);
    expect(btn('Unflag question')).toBeDefined();
    press('Previous question');
    expect(stem()).toEqual([stemOf(0)]);
    expect(btn('Flag question')).toBeDefined(); // Q1 is not flagged
    tick(ANNOUNCE_DELAY);
    expect(announce).toHaveBeenCalledWith('Question 1 of 6');
    expect(announce).toHaveBeenCalledWith('Question 2 of 6');
  });
});

describe('practice with motion on: the header and footer follow the page on screen', () => {
  it('mid-turn the footer still reads "Next question" and ignores taps; the bookmark is the old question’s', () => {
    act(() => {
      startFromIds('cisa', FOUR, 'Practice');
    });
    mount(<SessionScreen />);
    // Save Q1, answer it.
    press('Save question');
    expect(selectCert(useProgress.getState(), 'cisa').bookmarks).toEqual([FOUR[0]]);
    pickRight();
    press('Check answer');
    press('Next question');
    expect(active().index).toBe(1);
    expect(leaving()).toBe(true);
    // The footer belongs to the answer page still on screen...
    expect(btn('Check answer')).toBeUndefined();
    expect(btn('Next question')).toBeDefined();
    press('Next question');
    expect(active().index).toBe(1); // ...and a tap there does nothing.
    // The header's bookmark is still Q1's (saved), and is inert too.
    press('Remove from saved');
    expect(selectCert(useProgress.getState(), 'cisa').bookmarks).toEqual([FOUR[0]]);
    tick(motion.dur.select);
    // The new page: Q2's own state.
    expect(leaving()).toBe(false);
    expect(btn('Check answer')!.props.disabled).toBe(true);
    expect(btn('Save question')).toBeDefined();
    tick(ANNOUNCE_DELAY);
    expect(announce).toHaveBeenCalledWith('Question 2 of 4');
  });

  it('the footer is ONE button that changes its label (screen-reader focus stays on it)', () => {
    act(() => {
      startFromIds('cisa', FOUR, 'Practice');
    });
    mount(<SessionScreen />);
    const primary = () => root().findAll((n) => n.props.label !== undefined && ['Check answer', 'Next question', 'See results'].includes(n.props.label) && typeof n.type !== 'string');
    expect(primary()).toHaveLength(1);
    pickRight();
    press('Check answer');
    expect(primary()).toHaveLength(1);
    expect(primary()[0].props.label).toBe('Next question');
  });
});

describe('Guided with motion on', () => {
  it('after "Next topic", focus moves to the new topic’s title, and "Start this step" waits for the page', () => {
    mount(<GuidedStep />);
    const nextBtn = btn(/^Next topic: /)!;
    const nextName = (nextBtn.props.label as string).replace(/^Next topic: /, '');
    act(() => {
      nextBtn.props.onPress();
    });
    expect(leaving()).toBe(true);
    // The leaving page is never hidden from screen readers (focus would jump off the button).
    expect(root().findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants' && textOf(n).includes('Next topic')).length).toBe(0);
    // Mid-turn, "Start this step" ignores the tap (it would start the topic not yet shown).
    press('Start this step');
    expect(useSession.getState().active).toBeNull();
    expect(mockMoveFocus).not.toHaveBeenCalled();
    tick(motion.dur.select);
    expect(leaving()).toBe(false);
    // At the swap, focus goes to the new page's title: a header that reads the topic's name.
    expect(mockMoveFocus).toHaveBeenCalledTimes(1);
    const title = root().find((n) => n.props.accessible === true && n.props.accessibilityRole === 'header' && n.type === View && textOf(n) === nextName);
    expect(title).toBeDefined();
  });
});

describe('a lesson’s Back on scene 2', () => {
  it('hands screen-reader focus to Next, because Back itself disappears on scene 1', () => {
    const lesson = CISA_LESSONS.find((l) => l.scenes.length > 2 && l.scenes[0].type !== 'check')!;
    mockParams = { id: lesson.id };
    mount(<LessonPlayer />);
    press('Next');
    // Mobile 1.12: scenes turn like pages, and the footer follows the page on screen:
    // while scene 1 is leaving there is still no Back (mobile 1.22: the round "Previous step").
    expect(btn('Previous step')).toBeUndefined();
    tick(motion.dur.select);
    expect(btn('Previous step')).toBeDefined();
    press('Previous step');
    expect(mockMoveFocus).toHaveBeenCalledTimes(1);
    tick(motion.dur.select);
    expect(btn('Previous step')).toBeUndefined();
    // Going forward again (Back reappears) moves nothing.
    press('Next');
    tick(motion.dur.select);
    expect(mockMoveFocus).toHaveBeenCalledTimes(1);
  });
});
