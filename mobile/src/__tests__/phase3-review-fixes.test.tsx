/**
 * Mobile 1.9 review fixes (PR #39): the motion primitives' edge cases that
 * the code review and QA found, pinned so they stay fixed.
 *
 * - A celebration plays per OCCASION (Today stays mounted overnight), a
 *   once-ever occasion never replays, and a long background starts a new
 *   celebration session.
 * - Past the session budget even the short form is skipped (static).
 * - 'short' never blinks out something already drawn: it brightens.
 * - Nothing grows on a hidden screen, and an arc restarts only for a new run.
 * - The odometer: rows a gap apart, re-placed on a text-size change, plain
 *   text again once the roll is over; the Stepper rolls one step per change,
 *   the way time moved (a wrap too).
 * - The day's first view is saved: a cold relaunch the same day is still.
 *
 * The shared jest mock lands every animation on its end value at once (see
 * jest/reanimated-mock.ts), so these assert decisions and end states.
 */
import { cloneElement, useState } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AppState, Dimensions, StyleSheet, Text, type AppStateStatus } from 'react-native';
import * as Rea from 'react-native-reanimated';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { GrowthRings } from '../components/glyphs';
import {
  Celebrate,
  claimDecor,
  claimFirstView,
  columnRows,
  pickCelebration,
  resetCelebrationsForTest,
  resetOncePerDayForTest,
  ROLL,
  RollingText,
  SESSION_GAP_MS,
  setSystemReducedMotionForTest,
  useCelebration,
  useGrowth,
  type Celebration,
  type Growth,
} from '../components/motion';
import { Stepper } from '../components/ui';
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import { motion, type as typeScale } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));

// The app's foreground/background changes, driven by the test. Captured before
// any celebration starts (motion.tsx subscribes once, on the first one).
const appState: ((s: AppStateStatus) => void)[] = [];
jest.spyOn(AppState, 'addEventListener').mockImplementation((type, fn) => {
  if (type === 'change') appState.push(fn as (s: AppStateStatus) => void);
  return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
});
const goTo = (s: AppStateStatus) => act(() => appState.forEach((f) => f(s)));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const style = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
const yOf = (n: ReactTestInstance) => (style(n).transform as Record<string, number>[] | undefined)?.find((t) => 'translateY' in t)?.translateY;
const columns = () => r!.root.findAll((n) => typeof n.type === 'string' && yOf(n) !== undefined);
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
  });
};

beforeEach(() => {
  setFontScale(1);
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(null);
  useSettings.setState({ motion: 'system', theme: 'light', activeCertId: 'cisa', haptics: true });
  useSeen.setState({ values: {}, moments: {} });
  resetCelebrationsForTest();
  resetOncePerDayForTest();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

// ── Celebrations: per occasion, once ever, and the session ─────────────
describe('useCelebration occasions', () => {
  let cel: Celebration | null = null;
  function Screen({ due, id, once = false }: { due: boolean; id: string; once?: boolean }) {
    cel = useCelebration('clearing', due, undefined, id, once);
    return null;
  }

  it('a screen that stays mounted plays the next occasion (tomorrow’s clearing), never the same one twice', () => {
    mount(<Screen due id="cisa:2026-10-12" />);
    expect(cel!.run).toBe(1);
    act(() => r!.update(<Screen due={false} id="cisa:2026-10-12" />));
    act(() => r!.update(<Screen due id="cisa:2026-10-12" />));
    expect(cel!.run).toBe(1); // the same day again: still
    act(() => r!.update(<Screen due={false} id="cisa:2026-10-13" />));
    act(() => r!.update(<Screen due id="cisa:2026-10-13" />));
    expect(cel!.run).toBe(2);
    expect(useSeen.getState().moments.clearing).toBe(2);
  });

  it('once: plays the first time ever; a later launch shows it still and counts nothing', () => {
    mount(<Screen due id="exam-ready:cisa" once />);
    expect(cel!.run).toBe(1);
    act(() => r!.unmount());
    resetCelebrationsForTest(); // a new launch
    mount(<Screen due id="exam-ready:cisa" once />);
    expect(cel).toMatchObject({ run: 0, settled: true });
    expect(useSeen.getState().moments).toEqual({ clearing: 1, 'exam-ready:cisa': 1 });
    // Another cert has its own occasion.
    act(() => r!.update(<Screen due id="exam-ready:cissp" once />));
    expect(cel!.run).toBe(1);
  });

  it('a new session after more than 30 minutes in the background: one full celebration again', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 12, 9, 0, 0) });
    mount(<Screen due id="a" />);
    expect(cel!.mode).toBe('full');
    // A short break: the same session (the next one is short).
    goTo('background');
    act(() => jest.setSystemTime(Date.now() + 5 * 60_000));
    goTo('active');
    act(() => r!.update(<Screen due id="b" />));
    expect(cel!.mode).toBe('short');
    // A long one: a new session.
    goTo('background');
    act(() => jest.setSystemTime(Date.now() + SESSION_GAP_MS + 1000));
    goTo('active');
    act(() => r!.update(<Screen due id="c" />));
    expect(cel!.mode).toBe('full');
  });

  it('past the session budget even the short form is skipped: the end state just shows', () => {
    expect(claimDecor(motion.celebrate.sessionMs - motion.dur.short + 1)).toBe(true);
    expect(pickCelebration('milestone', false).mode).toBe('static');
  });
});

describe('Celebrate, short', () => {
  function Moment({ due }: { due: boolean }) {
    const cel = useCelebration('milestone', due, undefined, 'm');
    return (
      <Celebrate celebration={cel}>
        <Text>Rooted</Text>
      </Celebrate>
    );
  }
  const opacitySteps = (timing: jest.SpyInstance) => timing.mock.calls.filter((c) => (c[1] as { duration?: number })?.duration === 0).map((c) => c[0]);

  it('new on screen: it cross-fades in from 0; already drawn: it only brightens (never blinks out)', () => {
    jest.useFakeTimers();
    const timing = jest.spyOn(Rea, 'withTiming');
    useSeen.setState({ moments: { milestone: motion.celebrate.fullTimes } }); // short from now on
    mount(<Moment due />);
    expect(opacitySteps(timing)).toEqual([0]);
    act(() => r!.unmount());
    timing.mockClear();
    // Drawn first (out of view), then it comes into view.
    mount(<Moment due={false} />);
    act(() => jest.advanceTimersByTime(50)); // a frame has been painted
    act(() => r!.update(<Moment due />));
    expect(opacitySteps(timing)).toEqual([0.55]);
    timing.mockRestore();
  });
});

// ── Growth: nothing on a hidden screen ─────────────────────────────────
describe('growth off screen', () => {
  it('useGrowth: while the screen is out of view, nothing plays (the run is kept for the return)', () => {
    let g: Growth | null = null;
    function P({ v, active }: { v: number[]; active: boolean }) {
      g = useGrowth('k', v, { active });
      return null;
    }
    useSeen.setState({ values: { k: [10] }, moments: {} });
    mount(<P v={[14]} active />);
    expect(g).toMatchObject({ play: true, run: 1 });
    act(() => r!.update(<P v={[15]} active={false} />));
    expect(g).toMatchObject({ play: false, run: 1 });
  });

  it('since: a rise from what was seen (even from all zeros) earns a "+N"; the day’s count-up from 0 does not', () => {
    let g: Growth | null = null;
    function P({ k, v }: { k: string; v: number[] }) {
      g = useGrowth(k, v, { firstOfDay: true });
      return null;
    }
    useSeen.setState({ values: { seenZero: [0, 0] }, moments: {} });
    mount(<P k="seenZero" v={[12, 0]} />);
    expect(g).toMatchObject({ play: true, from: [0, 0], since: true });
    act(() => r!.unmount());
    mount(<P k="firstLook" v={[12, 5]} />);
    expect(g).toMatchObject({ play: true, from: [0, 0], since: false });
  });

  it('RingArc: a new start value with the same run (an answer while hidden) never replays the growth', () => {
    const timing = jest.spyOn(Rea, 'withTiming');
    const grows = () => timing.mock.calls.filter((c) => (c[1] as { duration?: number })?.duration === motion.dur.grow).length;
    const el = (m: number, run = 1) => (
      <GrowthRings preset="today" mastery={[m, 0.4]} weights={[50, 50]} colors="#000" track="#eee" grow={{ play: true, from: [0.2, 0.4], run }} />
    );
    mount(el(0.5));
    const once = grows();
    expect(once).toBe(1); // the second arc starts at its value: nothing to grow
    act(() => r!.update(el(0.55)));
    act(() => r!.update(el(0.6)));
    expect(grows()).toBe(once);
    act(() => r!.update(el(0.6, 2)));
    expect(grows()).toBe(once + 1);
    timing.mockRestore();
  });
});

// ── The odometer ───────────────────────────────────────────────────────
describe('RollingText', () => {
  const el = <RollingText value="7" from="3" play run={1} style={{ fontSize: 16, lineHeight: 20 }} maxScale={2} color="#000" />;
  const pitch = (scale: number) => Math.round(20 * scale + 16 * scale * ROLL.gap);

  it('rows sit a blank gap apart, inside a window trimmed to the figures', () => {
    mount(el);
    act(() => r!.update(cloneElement(el)));
    expect(yOf(columns()[0])).toBe(-(7 + 1) * pitch(1));
    expect(style(columns()[0]).opacity).toBeCloseTo(1); // on a row: fully opaque (it dims only between rows)
    const clip = r!.root.findAll((n) => typeof n.type === 'string' && style(n).overflow === 'hidden')[0];
    const trim = Math.round(16 * ROLL.trim);
    expect(style(clip)).toMatchObject({ top: trim, height: 20 - 2 * trim });
  });

  it('a text-size change after a roll re-places the column at the new size', () => {
    mount(el);
    act(() => r!.update(cloneElement(el)));
    setFontScale(1.5);
    act(() => r!.update(cloneElement(el)));
    expect(yOf(columns()[0])).toBe(-(7 + 1) * pitch(1.5));
  });

  it('once the roll is over it is plain text again (no animated nodes left behind)', () => {
    jest.useFakeTimers();
    mount(el);
    expect(columns()).toHaveLength(1);
    act(() => jest.advanceTimersByTime(motion.dur.grow + 2 * motion.stagger.digit));
    expect(columns()).toHaveLength(0);
    expect(r!.root.findAllByType(Text).map((t) => t.props.children)).toEqual(['7']);
    // A new run rolls again.
    act(() => r!.update(<RollingText value="9" from="7" play run={2} style={{ fontSize: 16, lineHeight: 20 }} maxScale={2} color="#000" />));
    expect(columns()).toHaveLength(1);
  });
});

describe('Stepper', () => {
  const pitch = Math.round(typeScale.label.lineHeight! + typeScale.label.fontSize! * ROLL.gap);
  const rowsOf = () => columns().map((c) => -yOf(c)! / pitch);

  it('a wrap is one step (12 → 1), and the hour rolls the way TIME moved, not the way it was last pressed', () => {
    function Time() {
      const [t, setT] = useState({ h: 12, dir: 1 as 1 | -1 });
      const move = (d: 1 | -1) => setT((x) => ({ h: ((x.h - 1 + d + 12) % 12) + 1, dir: d }));
      return (
        <>
          <Stepper label="Hour" value={String(t.h)} dir={t.dir} onInc={() => move(1)} onDec={() => move(-1)} />
        </>
      );
    }
    mount(<Time />);
    const adj = () => r!.root.find((n) => n.props.accessibilityRole === 'adjustable' && typeof n.type === 'string');
    act(() => adj().props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }));
    act(() => r!.update(<Time />));
    // "12" → "1": the one digit rolls in from its neighbour 0, one row up.
    expect(rowsOf()).toEqual([columnRows(0, 1, 1)[1]]);
  });

  it('a value moved from outside (the minutes wrapping the hour) rolls with the given direction', () => {
    const el2 = (v: string, dir: 1 | -1) => <Stepper label="Hour" value={v} dir={dir} onInc={() => {}} onDec={() => {}} />;
    mount(el2('8', 1));
    act(() => r!.update(el2('7', -1)));
    act(() => r!.update(el2('7', -1)));
    expect(rowsOf()).toEqual([columnRows(8, 7, -1)[1]]);
  });
});

// ── The day's first view survives a cold relaunch ──────────────────────
describe('first view of the day', () => {
  it('is saved: a new launch the same day does not count up again; the next day does', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 12, 9, 0, 0) });
    expect(claimFirstView('growth:today:rings:cisa')).toBe(true);
    resetCelebrationsForTest(); // a new launch: in-memory state is fresh, the seen store is kept
    expect(claimFirstView('growth:today:rings:cisa')).toBe(false);
    act(() => jest.setSystemTime(new Date(2026, 9, 13, 8, 0, 0)));
    expect(claimFirstView('growth:today:rings:cisa')).toBe(true);
  });
});
