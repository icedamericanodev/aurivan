/**
 * QA for mobile 1.9 ("Uplift Phase 3: progress you can see"), on real
 * content and the real screens. One describe per learner journey:
 *
 *  J1 first open of the day (Today)      J6 theme switch, fast toggles
 *  J2 a practice session to Results      J7 empty states, "next" lines, no bank size
 *  J3 finishing the day's plan           J8 bank grouping (E3)
 *  J4 You                                J9 Reset and restore vs the "seen" store
 *  J5 Reduce Motion (system and in-app)
 *
 * The screens' focus is driven by hand (setFocus) so a tab can be left and
 * revisited without unmounting, like the real tab navigator.
 *
 * What "moves" means here (the jest Reanimated mock lands every animation on
 * its end value at once, so we assert the DECISION to animate):
 *  - movingDigits(): odometer columns told to roll from one digit to another;
 *  - growingArcs(): ring arcs told to grow from below their value.
 *
 * Real bugs are pinned with it.failing: each one passes once the bug is fixed
 * (then turn it into a plain `it`).
 *
 * Gotcha: never `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import BankDomain from '../app/bank/[domain]';
import CaughtUp from '../app/caught-up';
import Milestones from '../app/milestones';
import Mistakes from '../app/mistakes';
import NotesHome from '../app/notes/index';
import Reports from '../app/reports';
import Results from '../app/results';
import Saved from '../app/saved';
import { EmptyArt, GrowthRings } from '../components/glyphs';
import { AreaRows, ReadinessBlock } from '../components/youReadiness';
import { ScaleBar, SpecimenRow } from '../components/fieldguide';
import { ClearingBody, ReadinessRow } from '../components/journey';
import { BadgeCell, BadgeListRow } from '../components/badges';
import { MilestoneMomentView, resetBadgeMomentsForTest } from '../components/milestones';
import { resetCelebrationsForTest, resetOncePerDayForTest, RollingText, setSystemReducedMotionForTest, ThemeFade } from '../components/motion';
import { EmptyState } from '../components/ui';
import { getAllQuestions, getDomainQuestions } from '../content/loader';
import { getCertification } from '../content/certifications';
import { buildBankList, type BankFilter } from '../engine/bank';
import { DAY_MS } from '../engine/srs';
import { flushSayLaterForTest } from '../lib/a11y';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { finishSession } from '../lib/finishSession';
import { shortSubtopic } from '../lib/format';
import { startFromIds } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
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
// A tab's focus, driven by the test: setFocus(false) leaves the tab, setFocus(true) comes back.
const mockFocus = { on: true, subs: new Set<(on: boolean) => void>(), params: {} as Record<string, string> };
jest.mock('expo-router', () => {
  const R = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, dismissTo: jest.fn() },
    useLocalSearchParams: () => mockFocus.params,
    useFocusEffect: (cb: () => void | (() => void)) => {
      const [on, setOn] = R.useState(mockFocus.on);
      R.useEffect(() => {
        mockFocus.subs.add(setOn);
        return () => {
          mockFocus.subs.delete(setOn);
        };
      }, []);
      R.useEffect(() => (on ? cb() : undefined), [cb, on]);
    },
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View: V } = jest.requireActual('react-native');
  return { SafeAreaView: V, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
// Force "Your readiness is holding" (7 days at 80%+ is slow to seed): the rest of lib/moments is real.
const mockMoments = { ready: false };
jest.mock('../lib/moments', () => {
  const actual = jest.requireActual('../lib/moments');
  return {
    ...actual,
    useTodayMoments: (a: never) => {
      const m = actual.useTodayMoments(a);
      return mockMoments.ready ? { ...m, ready: true } : m;
    },
  };
});
const mockSuccess = jest.fn();
const mockLight = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => mockSuccess(), selection: () => {}, error: () => {}, light: () => mockLight() } }));

// ── Harness ─────────────────────────────────────────────────────────────
let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  mockFocus.on = true; // the next screen mounts in view
};
const setFocus = (on: boolean) =>
  act(() => {
    mockFocus.on = on;
    mockFocus.subs.forEach((f) => f(on));
  });
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(r!.root);
const byNameIn = (root: ReactTestInstance, name: string) => root.findAll((n) => typeof n.type === 'function' && (n.type as { name?: string }).name === name);
const byName = (name: string) => r!.root.findAll((n) => typeof n.type === 'function' && (n.type as { name?: string }).name === name);
/** Odometer columns told to roll from one digit to another right now. */
const movingDigits = () => byName('DigitColumn').filter((n) => n.props.play && n.props.from !== n.props.to).length;
/** Ring arcs told to grow (from below their value). */
const growingArcs = () => byName('RingArc').filter((n) => n.props.animate && n.props.start < 1).length;
/** RollingText numerals whose decision is "play" (the roll itself may still be reduced away). */
const rollDecisions = () => r!.root.findAllByType(RollingText).filter((n) => n.props.play);
const plusTags = () => allText().match(/\+\d+/g) ?? [];
/** What a screen reader hears, in order: every label, plus visible words (text with a letter) not inside a label. */
const spoken = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance, hidden: boolean) => {
    if (typeof n.type !== 'string') return n.children.forEach((c) => typeof c !== 'string' && walk(c, hidden));
    const p = n.props;
    const h = hidden || p.accessibilityElementsHidden === true || p.importantForAccessibility === 'no-hide-descendants' || p.importantForAccessibility === 'no';
    if (h) return;
    if (p.accessible && p.accessibilityLabel) {
      out.push(String(p.accessibilityLabel));
      return; // a labelled group speaks for its children
    }
    n.children.forEach((c) => {
      if (typeof c === 'string') {
        if (/[A-Za-z]/.test(c)) out.push(c);
      } else walk(c, h);
    });
  };
  walk(r!.root, false);
  return out;
};

const CISA = getCertification('cisa')!;
const ALL = getAllQuestions('cisa');
const inDomain = (d: string) => ALL.filter((q) => q.domainId === d);
/** n answers spread over all five domains, `right` share correct. */
function seed(n: number, right = 0.75, offset = 0) {
  act(() => {
    CISA.domains.forEach((d) => {
      const qs = inDomain(d.id).slice(offset, offset + Math.ceil(n / CISA.domains.length));
      qs.forEach((q, i) => useProgress.getState().recordAnswer('cisa', q.id, i / qs.length < right));
    });
  });
}
function answerIn(domain: string, from: number, count: number, correct: boolean) {
  act(() => {
    for (const q of inDomain(domain).slice(from, from + count)) useProgress.getState().recordAnswer('cisa', q.id, correct);
  });
}

/** Today has made its plan; then, away from Today, every item gets done (not yet celebrated). */
function clearToday(stats = { answered: 31, correct: 25, minutes: 24 }) {
  mount(<Today />);
  unmount();
  act(() => {
    const d = useProgress.getState().days.cisa!;
    useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...d, done: d.done.map(() => true), celebrated: false, ...stats } } }));
  });
  mockSuccess.mockClear();
  mockLight.mockClear();
}
const clearing = () => r!.root.findByType(ClearingBody).props.celebration as { mode: string; settled: boolean; run: number };

/**
 * A 3- to 10-question practice in IS Audit, `right` of them right, then finished. Mobile 1.24 (UX review S7):
 * under 8 answers Results states the count once, in the headline, so nothing rolls there; the motion
 * tests below use 8+ questions, where the percent and "Correct" roll.
 */
function finishPractice(right: number, of = 3, mixed = false) {
  // `mixed`: half from IS Audit, half from IT Governance (mobile 1.39: Results draws rings only for a mixed set).
  const qs = mixed
    ? [...inDomain('1').slice(100, 100 + Math.ceil(of / 2)), ...inDomain('2').slice(100, 100 + Math.floor(of / 2))]
    : inDomain('1').slice(100, 100 + of);
  act(() => {
    startFromIds('cisa', qs.map((q) => q.id), 'Practice · IS Audit');
  });
  qs.forEach((q, i) => {
    act(() => {
      useSession.getState().answer(q.id, { display: 'A', correct: i < right, ms: 30_000 });
    });
  });
  act(() => {
    finishSession();
  });
}

const layout = (props: ReactTestInstance['props'], l: { y?: number; height?: number }) =>
  act(() => props.onLayout({ nativeEvent: { layout: { x: 0, y: l.y ?? 0, width: 390, height: l.height ?? 100 } } }));

let say: jest.SpyInstance;
/**
 * The screen-reader announcements so far. Celebration and milestone lines are
 * said after a short pause (lib/a11y.ts sayLater, so a screen change doesn't
 * cut them off): the waiting ones are said first.
 */
const heard = () => {
  flushSayLaterForTest();
  return say;
};
beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  mockFocus.on = true;
  mockFocus.params = {};
  mockMoments.ready = false;
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  resetBadgeMomentsForTest();
  useProgress.getState().resetCert('cisa');
  useProgress.setState({ days: {} });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: {} });
  mockSuccess.mockClear();
  mockLight.mockClear();
  (router.push as jest.Mock).mockClear();
  (router.replace as jest.Mock).mockClear();
  say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  say.mockClear(); // a re-spied method keeps its old calls
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ── J1 ───────────────────────────────────────────────────────────────────
describe('J1 first open of the day (Today)', () => {
  // Mobile 1.51 (Field Guide): Today's readiness is the scale bar. Its growth still follows the day's
  // rings record (`today:rings`), and the bar draws in when the range does.
  const todayRings = () => r!.root.findAllByType(ReadinessRow)[0].props.ringsGrowth as { play: boolean; from?: number[] };
  const growingArcs = () => (r!.root.findAllByType(ScaleBar)[0]?.props.growth?.play ? 1 : 0);
  const rangeRoll = () => r!.root.findAllByType(RollingText).find((n) => /\d–\d/.test(n.props.value))!.props;

  it('grows once on the first view, shows still on a revisit and a remount, grows again the next day, never after a fall', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 12, 9, 0, 0), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    setMockReducedMotion(false);
    seed(60);
    // Day 1, first view: the rings grow from 0 and the range rolls.
    mount(<Today />);
    expect(todayRings().play).toBe(true);
    expect(todayRings().from!.every((v) => v === 0)).toBe(true);
    expect(growingArcs()).toBeGreaterThan(0);
    expect(rangeRoll().play).toBe(true);
    expect(movingDigits()).toBeGreaterThan(0);
    // Leave the tab and come back with nothing new: everything just shows.
    setFocus(false);
    setFocus(true);
    expect(todayRings().play).toBe(false);
    expect(rangeRoll().play).toBe(false);
    expect(growingArcs()).toBe(0);
    expect(movingDigits()).toBe(0);
    // A remount the same day (the app kept running): still.
    unmount();
    mount(<Today />);
    expect(todayRings().play).toBe(false);
    expect(movingDigits()).toBe(0);
    unmount();

    // Day 2: the first view grows again (from 0).
    act(() => jest.setSystemTime(new Date(2026, 9, 13, 9, 0, 0)));
    mount(<Today />);
    expect(todayRings().play).toBe(true);
    expect(todayRings().from!.every((v) => v === 0)).toBe(true);
    expect(movingDigits()).toBeGreaterThan(0);
    setFocus(false);

    // Away from Today, IS Audit falls (a run of wrong answers).
    const before = useSeen.getState().values['today:rings:cisa'];
    answerIn('1', 40, 40, false);
    // Day 3: a fall never animates, not even as the day's count-up.
    act(() => jest.setSystemTime(new Date(2026, 9, 14, 9, 0, 0)));
    unmount();
    mount(<Today />);
    const now = useSeen.getState().values['today:rings:cisa'];
    expect(now[0]).toBeLessThan(before[0]);
    expect(todayRings().play).toBe(false);
    expect(growingArcs()).toBe(0);
    expect(rangeRoll().play).toBe(false);
    // The one thing that may move: the streak, which really went up (day 2 was a study day).
    const moving = r!.root.findAllByType(RollingText).filter((n) => n.findAll((c) => typeof c.type === 'function' && (c.type as { name?: string }).name === 'DigitColumn' && c.props.play && c.props.from !== c.props.to).length > 0);
    expect(moving.map((n) => n.props.value)).toEqual([String(useProgress.getState().streak?.current ?? 2)]);
  });

  it('a rise while Today is in the background grows from what was seen (the risen domain only), on return', () => {
    setMockReducedMotion(false);
    seed(60);
    mount(<Today />);
    setFocus(false);
    const seen = useSeen.getState().values['today:rings:cisa'];
    answerIn('3', 40, 30, true);
    setFocus(true);
    const g = todayRings();
    expect(g.play).toBe(true);
    // Only Operations (index 2) starts below its value; the rest start where they are.
    const now = useSeen.getState().values['today:rings:cisa'];
    expect(now[2]).toBeGreaterThan(seen[2]);
    expect(g.from).toEqual(seen); // the growth record in whole percent (the rings took it / 100)
    // The range rose with it, so the scale bar draws in once.
    expect(growingArcs()).toBe(1);
  });
});

// ── J2 ───────────────────────────────────────────────────────────────────
describe('J2 practice session → Results', () => {
  // Mobile 1.51 (Field Guide): the rings gave way to the growth plate; the score that rolled in their centre is
  // the Score label row now, and it rolls the same way (once, on this Results' first look, at 60% or more).
  const resultRings = () => (r!.root.findAllByType(SpecimenRow).find((n) => n.props.label === 'Score')?.props.roll ?? { play: false }) as { play: boolean };
  const growingArcs = () => (resultRings().play ? 1 : 0);

  it('the rings and the score roll once; reopening the same Results shows them still', () => {
    setMockReducedMotion(false);
    finishPractice(8, 8, true);
    mount(<Results />);
    expect(resultRings().play).toBe(true);
    expect(growingArcs()).toBeGreaterThan(0);
    expect(movingDigits()).toBeGreaterThan(0);
    unmount();
    mount(<Results />);
    expect(resultRings().play).toBe(false);
    expect(growingArcs()).toBe(0);
    expect(movingDigits()).toBe(0);
  });

  it('60% exactly grows; below 60% nothing animates (same words either way)', () => {
    setMockReducedMotion(false);
    finishPractice(6, 10, true); // 60%, and 8+ answers so the numbers show (and roll)
    mount(<Results />);
    expect(movingDigits()).toBeGreaterThan(0);
    unmount();
    act(() => {
      useSession.getState().clear();
    });
    resetOncePerDayForTest();
    finishPractice(2, 5, true);
    mount(<Results />);
    expect(resultRings().play).toBe(false);
    expect(growingArcs()).toBe(0);
    expect(movingDigits()).toBe(0);
    expect(rollDecisions()).toHaveLength(0);
    // Mobile 1.24: five questions are a small sample, so the words are the count, not a percent.
    expect(allText()).toContain('2 of 5 right');
  });

  describe('the milestone moment', () => {
    const moment = () => r!.root.findByType(MilestoneMomentView);
    const momentBox = () => moment().parent!; // the View that reports its place
    const statsBox = () => {
      // The nearest box above it with its OWN onLayout (the composite and host View share one).
      const own = momentBox().props.onLayout;
      let n = momentBox().parent;
      while (n && !(typeof n.props.onLayout === 'function' && n.props.onLayout !== own)) n = n.parent;
      return n!;
    };
    const scroller = () => r!.root.findAll((n) => n.type === ScrollView && typeof n.props.onLayout === 'function')[0];

    function openWithMilestone(right: number) {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
      setMockReducedMotion(false);
      finishPractice(right);
      act(() => {
        useSession.getState().setMilestone('first-foothold');
      });
      mount(<Results />);
    }

    it('is announced at once, but moves (with its one success tap) only after the rings settle AND it is scrolled into view', () => {
      openWithMilestone(3);
      const words = heard().mock.calls.filter(([t]) => String(t).startsWith('A new badge, Groundwork: First Foothold'));
      expect(words).toHaveLength(1);
      expect(mockSuccess).not.toHaveBeenCalled();
      expect(moment().props.inView).toBe(false);
      // A 700pt screen; the moment's top is at 500 + 300 = 800, below the fold.
      layout(scroller().props, { height: 700 });
      layout(statsBox().props, { y: 500 });
      layout(momentBox().props, { y: 300 });
      act(() => jest.advanceTimersByTime(motion.dur.select + motion.dur.grow + 4 * motion.stagger.stat + 10));
      expect(moment().props.inView).toBe(false);
      expect(useSeen.getState().moments.milestone).toBeUndefined();
      // Scrolled 200pt: its top is now 96pt+ inside the screen.
      act(() => scroller().props.onScroll({ nativeEvent: { contentOffset: { x: 0, y: 200 }, layoutMeasurement: { width: 390, height: 700 } } }));
      expect(moment().props.inView).toBe(true);
      expect(useSeen.getState().moments.milestone).toBe(1);
      expect(mockSuccess).toHaveBeenCalledTimes(1);
      // In full (the session's one full celebration): the leaf pops.
      expect(byName('Pop').some((p) => p.props.trigger === 1)).toBe(true);
      // …and its words are not spoken a second time.
      expect(heard().mock.calls.filter(([t]) => String(t).startsWith('A new badge, Groundwork: First Foothold'))).toHaveLength(1);
    });

    it('already on screen: it still waits for the rings to settle first', () => {
      openWithMilestone(3);
      layout(scroller().props, { height: 900 });
      layout(statsBox().props, { y: 300 });
      layout(momentBox().props, { y: 200 });
      expect(moment().props.inView).toBe(false);
      act(() => jest.advanceTimersByTime(motion.dur.select + motion.dur.grow + 4 * motion.stagger.stat + 10));
      expect(moment().props.inView).toBe(true);
    });

    it('a session below 60% has no growth to wait for: in view = plays', () => {
      openWithMilestone(1);
      layout(scroller().props, { height: 900 });
      layout(statsBox().props, { y: 300 });
      layout(momentBox().props, { y: 200 });
      expect(moment().props.inView).toBe(true);
    });
  });
});

// ── J3 ───────────────────────────────────────────────────────────────────
describe('J3 finishing the day’s plan (the clearing)', () => {
  it('fatigue: full the first 3 times this kind has played, short from the 4th', () => {
    setMockReducedMotion(false);
    clearToday();
    useSeen.setState({ moments: { clearing: 2 } });
    mount(<Today />);
    expect(clearing().mode).toBe('full');
    expect(movingDigits()).toBeGreaterThan(0);
    unmount();
    // The next day (a new app session), the 4th clearing.
    resetCelebrationsForTest();
    clearToday();
    mount(<Today />);
    expect(useSeen.getState().moments.clearing).toBe(4);
    expect(clearing().mode).toBe('short');
    expect(movingDigits()).toBe(0);
    expect(growingArcs()).toBe(0);
    // Short still has its words, spoken.
    expect(allText()).toContain('Today’s clearing');
    expect(heard().mock.calls.filter(([t]) => String(t).startsWith('Today’s clearing.'))).toHaveLength(2);
  });

  it('at most one FULL celebration per app session: after a milestone played in full, the clearing is short', () => {
    setMockReducedMotion(false);
    const m = { key: 'first-foothold', kind: 'milestone' as const, label: 'First Foothold', rule: 'Finish the diagnostic.', set: 'groundwork', setName: 'Groundwork', unlock: 'You’ve mapped where you stand.' };
    mount(<MilestoneMomentView moment={m as never} once="qa-s1" />);
    expect(useSeen.getState().moments.milestone).toBe(1);
    unmount();
    clearToday();
    mount(<Today />);
    expect(clearing().mode).toBe('short');
    expect(movingDigits()).toBe(0);
  });

  it('any touch skips it to the end state, and the touch still reaches the button (nothing captures it)', () => {
    setMockReducedMotion(false);
    clearToday();
    mount(<Today />);
    expect(clearing().settled).toBe(false);
    const frames = r!.root.findAll((n) => n.type === View && typeof n.props.onTouchStart === 'function');
    expect(frames.length).toBeGreaterThan(0);
    // No frame claims the touch (a responder would swallow the button press or the scroll).
    for (const f of frames) {
      expect(f.props.onStartShouldSetResponder).toBeUndefined();
      expect(f.props.onStartShouldSetResponderCapture).toBeUndefined();
      expect(f.props.onMoveShouldSetResponderCapture).toBeUndefined();
    }
    act(() => frames[0].props.onTouchStart({ nativeEvent: {} }));
    expect(clearing().settled).toBe(true);
    expect(movingDigits()).toBe(0);
    // The same tap's press goes through.
    const keepGoing = r!.root.find((n) => n.props.accessibilityRole === 'button' && /Do a little more/.test(String(n.props.accessibilityLabel ?? textOf(n))) && typeof n.props.onPress === 'function');
    act(() => keepGoing.props.onPress());
    expect((router.push as jest.Mock).mock.calls.length + (router.replace as jest.Mock).mock.calls.length).toBeGreaterThan(0);
  });

  it('the clearing plays once; later the same day it is shown still (no second count, haptic or announcement)', () => {
    setMockReducedMotion(false);
    clearToday();
    mount(<Today />);
    setFocus(false);
    setFocus(true);
    unmount();
    mount(<Today />);
    expect(useSeen.getState().moments.clearing).toBe(1);
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(heard().mock.calls.filter(([t]) => String(t).startsWith('Today’s clearing.'))).toHaveLength(1);
    expect(movingDigits()).toBe(0);
  });

  // BUG (Minor): useCelebration's `started` ref is set once per mount and never
  // reset, so with Today left open across midnight (useJourney rolls over to the
  // new day's plan by design) the NEXT day's clearing is never picked: no
  // announcement for screen-reader users, not counted for fatigue, no motion.
  it('Today left open overnight: the next day’s clearing is still announced and counted', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 12, 23, 58, 0), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    setMockReducedMotion(false);
    clearToday();
    mount(<Today />);
    expect(useSeen.getState().moments.clearing).toBe(1);
    // Midnight passes with Today open: the new day's plan is made.
    act(() => jest.advanceTimersByTime(5 * 60_000));
    const day2 = useProgress.getState().days.cisa!;
    expect(day2.day).not.toBe('2026-10-12');
    // The learner leaves Today, does the whole plan, and comes back.
    setFocus(false);
    act(() => {
      useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...day2, done: day2.done.map(() => true), celebrated: false, answered: 12, correct: 9, minutes: 10 } } }));
    });
    setFocus(true);
    expect(useProgress.getState().days.cisa!.celebrated).toBe(true); // the haptic part ran…
    expect(useSeen.getState().moments.clearing).toBe(2); // …but the moment itself never started
    expect(heard().mock.calls.filter(([t]) => String(t).startsWith('Today’s clearing.'))).toHaveLength(2);
  });
});

describe('J3b the exam-ready moment (T3)', () => {
  const readyLine = () => heard().mock.calls.filter(([t]) => String(t) === 'A quiet milestone. Your readiness is holding.').length;
  const readyRings = () => r!.root.findAllByType(GrowthRings)[0].props.grow as { play: boolean };

  it('plays once when it first shows; a revisit (blur → focus) is still; Reduce Motion is static with the same words', () => {
    setMockReducedMotion(false);
    seed(60);
    mockMoments.ready = true;
    mount(<Today />);
    expect(allText()).toContain('A quiet milestone');
    expect(readyRings().play).toBe(true);
    expect(readyLine()).toBe(1);
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    setFocus(false);
    setFocus(true);
    expect(readyLine()).toBe(1);
    expect(useSeen.getState().moments['exam-ready']).toBe(1);
    unmount();
    // Reduce Motion, a fresh look: static, the same words.
    resetCelebrationsForTest();
    useSeen.setState({ moments: {} });
    useSettings.setState({ motion: 'reduced' });
    mount(<Today />);
    expect(allText()).toContain('A quiet milestone');
    expect(growingArcs()).toBe(0);
  });

  // BUG (Minor): the exam-ready moment has no persisted "already played" mark
  // (the clearing has plan.celebrated). Every app launch while the panel is up
  // replays it: in full for launches 1–3, then short on every launch after,
  // its line re-announced each time, and it spends the session's ONE full
  // celebration, so a milestone on Results that session is always short.
  it('a later app launch (panel not dismissed) shows it still: no replay, no second announcement', () => {
    setMockReducedMotion(false);
    seed(60);
    mockMoments.ready = true;
    mount(<Today />);
    expect(readyLine()).toBe(1);
    unmount();
    // The app is closed and opened again later (in-memory state is fresh; saved stores are kept).
    resetCelebrationsForTest();
    resetOncePerDayForTest();
    mount(<Today />);
    expect(readyRings().play).toBe(false);
    expect(readyLine()).toBe(1);
    expect(useSeen.getState().moments['exam-ready']).toBe(1);
  });
});

// ── J4 ───────────────────────────────────────────────────────────────────
describe('J4 You', () => {
  // Mobile 1.43: one readiness figure; it grows from the low end last seen (a scale bar since 1.51, Field Guide).
  // The areas' lines of growth trace in with the same growth (AreaRows `play`).
  const youRings = () => r!.root.findAllByType(ReadinessBlock)[0].props.growth as { play: boolean; from?: number[] };
  const growingArcs = () => (r!.root.findAllByType(AreaRows)[0].props.play ? 1 : 0);

  it('first look of the day grows from 0 with no "+N"; a rise since the last look grows from there with "+N" on that domain only; a revisit is still', () => {
    setMockReducedMotion(false);
    seed(60);
    mount(<You />);
    expect(youRings().play).toBe(true);
    expect(plusTags()).toEqual([]);
    setFocus(false);
    const seen = useSeen.getState().values['you:rings:cisa'];
    answerIn('2', 40, 20, true);
    setFocus(true);
    const now = useSeen.getState().values['you:rings:cisa'];
    expect(now[1]).toBeGreaterThan(seen[1]);
    expect(youRings().play).toBe(true);
    expect(plusTags()).toEqual([`+${now[1] - seen[1]}`]);
    expect(growingArcs()).toBe(1);
    // The "answered" stat rolls up from the old count.
    expect(movingDigits()).toBeGreaterThan(0);
    // Revisit with nothing new: no tags, nothing moves.
    setFocus(false);
    setFocus(true);
    expect(youRings().play).toBe(false);
    expect(plusTags()).toEqual([]);
    expect(growingArcs()).toBe(0);
    expect(movingDigits()).toBe(0);
    // Remount (same app session): still.
    unmount();
    mount(<You />);
    expect(youRings().play).toBe(false);
    expect(movingDigits()).toBe(0);
  });

  it('a fall since the last look is just shown: no "+N", no growth, no roll of the accuracy', () => {
    setMockReducedMotion(false);
    seed(60, 0.9);
    mount(<You />);
    setFocus(false);
    answerIn('1', 40, 30, false);
    setFocus(true);
    expect(plusTags()).toEqual([]);
    expect(growingArcs()).toBe(0);
    // "answered" went up (it may roll); accuracy went down and must not roll.
    const accuracy = byName('SpecimenRow').find((s) => s.props.label === 'Accuracy')!;
    const accRoll = accuracy.findAllByType(RollingText)[0];
    expect(accRoll.props.from === accRoll.props.value || !accRoll.props.play).toBe(true);
  });
});

describe('J4b Badges: what moved since the last look', () => {
  const earn = (key: string) =>
    act(() => {
      useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...(m ?? { earned: {} }), earned: { ...(m?.earned ?? {}), [key]: Date.now() } } }));
    });
  // Each medallion is a cell (or a row at large text) whose `press` says it presses in, and when.
  const pressOf = (name: string) =>
    [...r!.root.findAllByType(BadgeCell), ...r!.root.findAllByType(BadgeListRow)].find((n) => n.props.mark.name === name)?.props.press as number | undefined;

  it('a badge earned since the last visit presses in once; a revisit shows it still', () => {
    setMockReducedMotion(false);
    mount(<Milestones />);
    unmount();
    earn('first-foothold');
    mount(<Milestones />);
    expect(pressOf('First Foothold')).toEqual(expect.any(Number));
    unmount();
    mount(<Milestones />);
    expect(pressOf('First Foothold')).toBeUndefined();
  });
});

// ── J5 ───────────────────────────────────────────────────────────────────
describe('J5 Reduce Motion (system and in-app)', () => {
  type Way = 'system' | 'in-app';
  const reduce = (way: Way) => {
    setMockReducedMotion(false);
    if (way === 'system') setSystemReducedMotionForTest(true);
    else useSettings.setState({ motion: 'reduced' });
  };

  /** The clearing's end state in full motion, after a tap skipped it. */
  function fullClearingWords() {
    setMockReducedMotion(false);
    clearToday();
    mount(<Today />);
    act(() => r!.root.findAll((n) => n.type === View && typeof n.props.onTouchStart === 'function')[0].props.onTouchStart({ nativeEvent: {} }));
    const words = spoken();
    const line = heard().mock.calls.map(([t]) => String(t)).find((t) => t.startsWith('Today’s clearing.'));
    unmount();
    return { words, line };
  }

  for (const way of ['system', 'in-app'] as Way[]) {
    it(`${way}: the clearing has the same words and spoken line as in full motion, and nothing moves`, () => {
      seed(60);
      const full = fullClearingWords();
      // The same day, the same plan, celebrated again from scratch.
      resetCelebrationsForTest();
      resetOncePerDayForTest();
      useSeen.setState({ values: {}, moments: {} });
      act(() => {
        useProgress.setState((s) => ({ days: { ...s.days, cisa: { ...s.days.cisa!, celebrated: false } } }));
      });
      heard().mockClear();
      mockSuccess.mockClear();
      reduce(way);
      mount(<Today />);
      expect(clearing().mode).toBe('static');
      expect(spoken()).toEqual(full.words);
      expect(heard().mock.calls.map(([t]) => String(t)).find((t) => t.startsWith('Today’s clearing.'))).toBe(full.line);
      expect(movingDigits()).toBe(0);
      expect(growingArcs()).toBe(0);
      expect(byName('LeafFall').every((n) => n.children.length === 0)).toBe(true);
      expect(mockSuccess).toHaveBeenCalledTimes(1); // the haptic is kept
    });

    it(`${way}: Results, You and Today's first view of the day show their end state at once, same words`, () => {
      seed(60);
      finishPractice(8, 8, true); // mixed: the score in the rings rolls (1.43: a one-domain set has nothing that rolls)
      reduce(way);
      mount(<Results />);
      expect(growingArcs()).toBe(0);
      expect(movingDigits()).toBe(0);
      const reducedResults = spoken();
      unmount();
      mount(<You />);
      expect(growingArcs()).toBe(0);
      expect(movingDigits()).toBe(0);
      unmount();
      mount(<Today />);
      expect(growingArcs()).toBe(0);
      expect(movingDigits()).toBe(0);
      unmount();
      // Full motion, the same Results: the same words once it has landed.
      setSystemReducedMotionForTest(null);
      useSettings.setState({ motion: 'system' });
      resetOncePerDayForTest();
      mount(<Results />);
      expect(movingDigits()).toBeGreaterThan(0);
      expect(spoken()).toEqual(reducedResults);
    });
  }

  it('full motion: every rolling number is heard by its FINAL value, through one labelled stop (Today, You, Results, the clearing)', () => {
    setMockReducedMotion(false);
    seed(60);
    const check = () => {
      const rolling = r!.root.findAllByType(RollingText).filter((n) => byNameIn(n, 'DigitColumn').length > 0);
      expect(rolling.length).toBeGreaterThan(0);
      for (const n of rolling) {
        let up: ReactTestInstance | null = n;
        while (up && !(typeof up.type === 'string' && up.props.accessible && up.props.accessibilityLabel)) up = up.parent;
        expect(up).not.toBeNull();
        for (const num of String(n.props.value).match(/\d+/g) ?? []) expect(String(up!.props.accessibilityLabel)).toContain(num);
      }
    };
    mount(<Today />);
    check();
    unmount();
    mount(<You />);
    check();
    unmount();
    finishPractice(8, 8, true); // mixed: the rings' score rolls
    mount(<Results />);
    check();
    unmount();
    act(() => {
      useSession.getState().clear();
    });
    clearToday();
    mount(<Today />);
    check();
  });

  it('switching Reduce Motion on in the middle of a full clearing: it stops at its end state, same words', () => {
    setMockReducedMotion(false);
    clearToday();
    mount(<Today />);
    expect(clearing().mode).toBe('full');
    act(() => {
      setSystemReducedMotionForTest(true);
    });
    expect(byName('LeafFall').every((n) => n.children.length === 0)).toBe(true);
    expect(allText()).toContain('Today’s clearing');
  });
});

// ── J6 ───────────────────────────────────────────────────────────────────
describe('J6 theme switch with fast toggles', () => {
  const LIGHT = '#F3F1EA';
  const DARK = '#111613';
  const veils = () => r!.root.findAll((n) => n.props.testID === 'theme-fade' && typeof n.type === 'string');
  const flat = (n: ReactTestInstance) => Object.assign({}, ...[n.props.style].flat(3).filter(Boolean));

  it('light → dark → light → dark in quick taps: one veil at a time, in the paper just left, never takes touches, then gone', () => {
    jest.useFakeTimers();
    mount(<ThemeFade isDark={false} bg={LIGHT} />);
    const order: [boolean, string][] = [[true, DARK], [false, LIGHT], [true, DARK]];
    for (const [isDark, bg] of order) {
      act(() => r!.update(<ThemeFade isDark={isDark} bg={bg} />));
      expect(veils()).toHaveLength(1);
      expect(flat(veils()[0]).backgroundColor).toBe(isDark ? LIGHT : DARK);
      expect(flat(veils()[0]).pointerEvents).toBe('none');
      expect(veils()[0].props.importantForAccessibility).toBe('no-hide-descendants');
    }
    act(() => jest.advanceTimersByTime(50));
    expect(veils()).toHaveLength(0);
  });

  it('System → Light while the phone is light (no flip): no veil; Reduce Motion still only fades', () => {
    jest.useFakeTimers();
    mount(<ThemeFade isDark={false} bg={LIGHT} />);
    act(() => r!.update(<ThemeFade isDark={false} bg={LIGHT} />));
    expect(veils()).toHaveLength(0);
    useSettings.setState({ motion: 'reduced' });
    act(() => r!.update(<ThemeFade isDark bg={DARK} />));
    expect(veils()).toHaveLength(1);
    act(() => jest.advanceTimersByTime(50));
    expect(veils()).toHaveLength(0);
  });
});

// ── J7 ───────────────────────────────────────────────────────────────────
describe('J7 empty states', () => {
  /** Bank sizes that must never be shown: the whole bank and each domain's size. */
  const BANK_SIZES = [ALL.length, ...CISA.domains.map((d) => inDomain(d.id).length)].map(String);
  const noBankSize = () => {
    for (const n of BANK_SIZES) expect(allText()).not.toMatch(new RegExp(`(^|\\D)${n}(\\D|$)`));
  };
  const art = () => r!.root.findAllByType(EmptyArt).map((n) => n.props.art);
  const nextLine = () => r!.root.findAllByType(EmptyState)[0]?.props.next as string | undefined;

  it('caught up: the "next review" line comes from the learner’s own queue (date and count)', () => {
    const now = new Date(2026, 9, 12, 10, 0, 0).getTime();
    jest.useFakeTimers({ now, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const qs = inDomain('4').slice(0, 9);
    act(() => {
      // 4 lucky guesses (due tomorrow), 3 unsure hits (also tomorrow, box 2), 2 confident (no review).
      qs.slice(0, 4).forEach((q) => useProgress.getState().recordAnswer('cisa', q.id, true, 'guessing'));
      qs.slice(4, 7).forEach((q) => useProgress.getState().recordAnswer('cisa', q.id, true, 'unsure'));
      qs.slice(7).forEach((q) => useProgress.getState().recordAnswer('cisa', q.id, true, 'sure'));
    });
    mount(<CaughtUp />);
    expect(art()).toEqual(['fern']);
    expect(nextLine()).toBe('Next review: tomorrow · 7 questions');
    expect(allText()).toContain('Next review: tomorrow · 7 questions');
    noBankSize();
    unmount();
    // The next day the learner reviews all 7, sure and right: the 4 guesses move to
    // box 2 (back in 1 day), the 3 unsure hits to box 3 (back in 3 days).
    act(() => jest.setSystemTime(now + DAY_MS + 1000));
    act(() => {
      qs.slice(0, 7).forEach((q) => useProgress.getState().recordAnswer('cisa', q.id, true, 'sure'));
    });
    mount(<CaughtUp />);
    expect(nextLine()).toBe('Next review: tomorrow · 4 questions');
    unmount();
    // A day later (14 Oct) the 4 are done again (box 3, back on 17 Oct): next come the 3 unsure ones, on 16 Oct (a date, not "tomorrow").
    act(() => jest.setSystemTime(now + 2 * DAY_MS + 2000));
    act(() => {
      qs.slice(0, 4).forEach((q) => useProgress.getState().recordAnswer('cisa', q.id, true, 'sure'));
    });
    mount(<CaughtUp />);
    expect(nextLine()).toBe('Next review: 16 Oct · 3 questions');
  });

  it('caught up with nothing scheduled: no "next" line at all', () => {
    mount(<CaughtUp />);
    expect(nextLine()).toBeUndefined();
    expect(allText()).toContain('All caught up');
  });

  // BUG (Minor): upcomingReview counts every review entry, including questions
  // that a content update removed. newSession drops those ids, so "Next
  // review: tomorrow · 1 question" leads tomorrow to… "All caught up" again.
  it('caught up: a retired question in the queue is not counted in the "next review" line', () => {
    const now = Date.now();
    act(() => {
      const cp = useProgress.getState().byCert.cisa!;
      useProgress.setState((s) => ({
        byCert: { ...s.byCert, cisa: { ...cp, review: { ...cp.review, d9_retired: { box: 2, dueAt: now + DAY_MS, lastSeen: now, reps: 1 } } } },
      }));
    });
    mount(<CaughtUp />);
    expect(nextLine()).toBeUndefined();
  });

  it('Saved, Mistakes, Reports: each has its own drawing, words, and no bank size', () => {
    mount(<Saved />);
    expect(art()).toEqual(['bookmark']);
    expect(allText()).toContain('Nothing saved yet');
    noBankSize();
    unmount();
    mount(<Mistakes />);
    expect(art()).toEqual(['pressed']);
    expect(allText()).toContain('Nothing open right now');
    expect(nextLine()).toBeUndefined(); // nothing cleared yet: no line
    noBankSize();
    unmount();
    mount(<Reports />);
    expect(art()).toEqual(['fieldbook']);
    expect(allText()).toContain('No reports yet');
    noBankSize();
  });

  it('notes search with no match: the field book, and no counts of the notes', () => {
    mount(<NotesHome />);
    const field = r!.root.findAllByType(TextInput)[0];
    act(() => field.props.onChangeText('zzqxv'));
    expect(art()).toContain('fieldbook');
    expect(allText()).toContain('No matches');
    noBankSize();
  });

  it('bank filters: each empty filter has its own drawing and words, and no bank size', () => {
    mockFocus.params = { domain: '1' };
    mount(<BankDomain />);
    const chip = (label: string) => r!.root.find((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === label || (typeof n.props.onPress === 'function' && textOf(n) === label));
    const expected: Record<string, [string, string]> = { Missed: ['pressed', 'No missed questions here yet'], Saved: ['bookmark', 'Nothing saved here yet'] };
    for (const [label, [kind, title]] of Object.entries(expected)) {
      act(() => chip(label).props.onPress());
      expect(art()).toEqual([kind]);
      expect(allText()).toContain(title);
      noBankSize();
    }
  });
});

// ── J8 ───────────────────────────────────────────────────────────────────
describe('J8 bank grouping (E3) on real content', () => {
  it('a topic header only over 2+ rows; a lone row names its own topic; headers never give a topic size', () => {
    // A realistic learner: some answered (some missed), some saved.
    const answers: Record<string, { correct: boolean }> = {};
    const bookmarks: string[] = [];
    ALL.forEach((q, i) => {
      if (i % 3 === 0) answers[q.id] = { correct: i % 2 === 0 };
      if (i % 17 === 0) bookmarks.push(q.id);
    });
    let lone = 0;
    let grouped = 0;
    for (const d of CISA.domains) {
      const qs = getDomainQuestions('cisa', d.id);
      for (const filter of ['all', 'new', 'missed', 'saved'] as BankFilter[]) {
        const items = buildBankList(qs, answers as never, bookmarks, filter, shortSubtopic);
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.kind === 'topic') {
            // Its rows: the question rows right under it that are not lone rows.
            const rows: typeof items = [];
            for (let k = i + 1; k < items.length; k++) {
              const x = items[k];
              if (x.kind !== 'question' || x.ownTopic) break;
              rows.push(x);
            }
            expect(rows.length).toBeGreaterThanOrEqual(2);
            for (const row of rows) expect(row.kind === 'question' && row.topic).toBe(it.title);
            // Every row of this topic is under this header (no stray row of it elsewhere).
            expect(items.filter((x) => x.kind === 'question' && x.topic === it.title)).toHaveLength(rows.length);
            // The learner's own counts only: never "N questions" for the topic.
            const all = qs.filter((q) => (shortSubtopic(q.subtopic) || 'Other') === it.title).length;
            expect(it.summary).not.toMatch(new RegExp(`(^|\\D)${all}\\s*(questions?|in all|total)`));
            grouped++;
          } else {
            const prev = items[i - 1];
            if (it.ownTopic) {
              lone++;
              // Not under a header for its own topic.
              expect(prev === undefined || prev.kind === 'question' || prev.title !== it.topic).toBe(true);
              const sameTopic = items.filter((x) => x.kind === 'question' && x.topic === it.topic);
              expect(sameTopic).toHaveLength(1);
            }
          }
        }
      }
    }
    expect(lone).toBeGreaterThan(0);
    expect(grouped).toBeGreaterThan(0);
  });
});

// ── J9 ───────────────────────────────────────────────────────────────────
describe('J9 Reset and restore vs the seen store', () => {
  it('after a cleared day and a Reset: no clearing, no growth, no leaf pops, no haptic; the seen store keeps its counts', () => {
    setMockReducedMotion(false);
    seed(60);
    clearToday();
    mount(<Today />);
    expect(useSeen.getState().moments.clearing).toBe(1);
    // Settings (pushed over Today) → Reset.
    setFocus(false);
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    mockSuccess.mockClear();
    mockLight.mockClear();
    heard().mockClear(); // what was said before the reset (some of it after its pause)
    setFocus(true);
    expect(allText()).not.toContain('Today’s clearing');
    expect(heard()).not.toHaveBeenCalledWith(expect.stringMatching(/^Today’s clearing\./));
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(mockLight).not.toHaveBeenCalled();
    expect(growingArcs()).toBe(0);
    expect(movingDigits()).toBe(0);
    // Presentation memory survives a reset (fatigue keeps counting; values now 0).
    expect(useSeen.getState().moments.clearing).toBe(1);
    expect(useSeen.getState().values['today:rings:cisa'].every((v) => v === 0)).toBe(true);
    // Next launch: still nothing celebrates.
    unmount();
    resetCelebrationsForTest();
    mount(<Today />);
    expect(movingDigits()).toBe(0);
    expect(growingArcs()).toBe(0);
  });

  it('restore: no clearing replays (today’s plan is rebuilt), and the seen store is not in the backup file', async () => {
    setMockReducedMotion(false);
    seed(60);
    clearToday();
    mount(<Today />);
    const file = currentBackup();
    expect(JSON.stringify(file)).not.toMatch(/today:rings|you:rings|aurivan\.seen|"moments":\{"clearing"/);
    setFocus(false);
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    const ready = checkBackupText(JSON.stringify(file));
    expect(ready.kind).toBe('ok');
    await act(async () => {
      await restoreBackup((ready as Extract<typeof ready, { kind: 'ok' }>).data, { fresh: true });
    });
    mockSuccess.mockClear();
    heard().mockClear(); // what was said before the restore (some of it after its pause)
    setFocus(true);
    expect(allText()).not.toContain('Today’s clearing');
    expect(heard()).not.toHaveBeenCalledWith(expect.stringMatching(/^Today’s clearing\./));
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(useSeen.getState().moments.clearing).toBe(1);
  });
});

// ── Review fixes (PR #39) on the real screens ─────────────────────────────
describe('Review fixes on the real screens', () => {
  // Mobile 1.43: each area row says its own rise ("IT Governance: …. Up 9 since you last looked").
  const ringsLabel = () =>
    r!.root
      .findAll((n) => typeof n.type === 'string' && n.props.accessible && typeof n.props.accessibilityLabel === 'string' && /^(IS Audit|IT Governance|IS Acquisition|IS Operations|Info Protection): /.test(n.props.accessibilityLabel))
      .map((n) => n.props.accessibilityLabel as string)
      .join(' | ');

  it('You: the "+N" tags are spoken with the area rows ("IT Governance: … Up 9 since you last looked"), and only after a real rise', () => {
    setMockReducedMotion(false);
    seed(60);
    mount(<You />);
    expect(ringsLabel()).not.toContain('since you last looked');
    setFocus(false);
    const seen = useSeen.getState().values['you:rings:cisa'];
    answerIn('2', 40, 20, true);
    setFocus(true);
    const now = useSeen.getState().values['you:rings:cisa'];
    expect(ringsLabel()).toContain(`Up ${now[1] - seen[1]} since you last looked`);
    expect(ringsLabel()).toMatch(new RegExp(`${CISA.domains[1].short}: [^|]*Up ${now[1] - seen[1]} since you last looked`));
    // A revisit with nothing new: the line is gone with the tags.
    setFocus(false);
    setFocus(true);
    expect(ringsLabel()).not.toContain('since you last looked');
  });

  it('a restore to more progress is not shown as growth earned since the last look (no "+N", nothing spoken)', async () => {
    setMockReducedMotion(false);
    seed(60);
    answerIn('2', 40, 20, true);
    const file = currentBackup();
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    seed(10);
    mount(<You />);
    setFocus(false);
    const ready = checkBackupText(JSON.stringify(file));
    await act(async () => {
      await restoreBackup((ready as Extract<typeof ready, { kind: 'ok' }>).data, { fresh: true });
    });
    expect(useSeen.getState().values['you:rings:cisa']).toBeUndefined();
    setFocus(true);
    expect(plusTags()).toEqual([]);
    expect(growingArcs()).toBe(0);
    expect(ringsLabel()).not.toContain('Since you last looked');
  });

  it('Today: a cold relaunch the same day does not count up again (the day’s first view is saved)', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 12, 9, 0, 0), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    setMockReducedMotion(false);
    seed(60);
    // Mobile 1.51: Today's scale bar draws in on the day's first view only.
    const scaleDraws = () => (r!.root.findAllByType(ScaleBar)[0]?.props.growth?.play ? 1 : 0);
    mount(<Today />);
    expect(scaleDraws()).toBeGreaterThan(0);
    unmount();
    resetCelebrationsForTest(); // a new launch: memory is fresh, saved stores are kept
    mount(<Today />);
    expect(scaleDraws()).toBe(0);
    expect(movingDigits()).toBe(0);
  });

  it('Results: a new scroll drag ends a playing milestone moment at once', () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    setMockReducedMotion(false);
    finishPractice(1); // below 60%: nothing to wait for, in view = plays
    act(() => {
      useSession.getState().setMilestone('first-foothold');
    });
    mount(<Results />);
    const scroller = r!.root.findAll((n) => n.type === ScrollView && typeof n.props.onLayout === 'function')[0];
    for (const n of r!.root.findAll((x) => typeof x.type === 'string' && typeof x.props.onLayout === 'function')) layout(n.props, { y: 0, height: 900 });
    const cel = () => r!.root.findByType(MilestoneMomentView).findAll((n) => n.props.celebration !== undefined)[0].props.celebration as { mode: string; settled: boolean };
    expect(cel()).toMatchObject({ mode: 'full', settled: false });
    expect(mockSuccess).toHaveBeenCalledTimes(1); // its one tap, with the motion
    act(() => scroller.props.onScrollBeginDrag());
    expect(cel().settled).toBe(true);
  });

  it('Today’s due count and the caught-up line leave out questions the bank no longer has', () => {
    const now = Date.now();
    act(() => {
      const cp = useProgress.getState().byCert.cisa!;
      useProgress.setState((s) => ({
        byCert: { ...s.byCert, cisa: { ...cp, review: { ...cp.review, d9_retired: { box: 1, dueAt: now - 1000, lastSeen: now - DAY_MS, reps: 1 } } } },
      }));
    });
    mount(<You />);
    expect(allText()).not.toMatch(/Misses and unsure answers come back here/);
    expect(spoken().some((l) => l === 'Questions to revisit, all caught up')).toBe(true);
  });
});
