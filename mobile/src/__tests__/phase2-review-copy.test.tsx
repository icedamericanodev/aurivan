/**
 * Mobile 1.8 review fixes, the copy (PR #38: UX P4 and observations): Settings
 * names the phone's own motion setting and says what Reduced does; Today
 * spells out minutes and names the LIVE review queue ("· 20 at a time" on its
 * row); Results says "1 minute". The page-turn fixes are in
 * phase2-review-turns.test.tsx.
 *
 * Gotcha: never `act(() => store.action())` — use braces.
 */
import { Platform } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Settings from '../app/settings';
import Today from '../app/(tabs)/home';
import Results from '../app/results';
import { planText } from '../components/journey';
import { getAllQuestions } from '../content/loader';
import { ensureTodayPlan } from '../lib/activity';
import { finishSession } from '../lib/finishSession';
import { startFromIds } from '../lib/sessions';
import { DAY_MS, type ReviewEntry } from '../engine/srs';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
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
const ALL = getAllQuestions('cisa');
const FOUR = ALL.slice(10, 14).map((q) => q.id);

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 11, 9, 0, 0));
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', theme: 'light', motion: 'system', haptics: true, shuffleOptions: true });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('Settings → Motion names the phone’s own setting', () => {

/** Mobile 1.17: Settings → Appearance → Motion is a row that opens the choices in a sheet. */
const openMotionRow = (at: ReactTestInstance) =>
  act(() => {
    at.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel).startsWith('Motion, '))[0].props.onPress();
  });
  const subtitle = () =>
    root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Match my phone'))[0].props
      .accessibilityLabel as string;
  const os = Platform.OS;
  afterEach(() => {
    Platform.OS = os;
  });

  it('iOS: Reduce Motion; Android: Remove animations', () => {
    Platform.OS = 'ios';
    mount(<Settings />);
    openMotionRow(root());
    expect(subtitle()).toContain('Your phone’s Reduce Motion');
    act(() => {
      r!.unmount();
    });
    Platform.OS = 'android';
    mount(<Settings />);
    openMotionRow(root());
    expect(subtitle()).toContain('Your phone’s Remove animations');
    expect(subtitle()).not.toContain('Reduce Motion');
  });

  it('Reduced says what it does', () => {
    mount(<Settings />);
    openMotionRow(root());
    const reduced = root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Reduced'))[0];
    expect(reduced.props.accessibilityLabel).toContain('Short fades instead of slides; growth shows its end state.');
  });
});

describe('Today and Results copy', () => {
  it('minutes are spelled out on Today ("about 29 minutes"), as on the plan items', () => {
    const now = Date.now();
    const review: Record<string, ReviewEntry> = {};
    ALL.slice(0, 56).forEach((q) => (review[q.id] = { box: 2, dueAt: now - DAY_MS, lastSeen: now - 2 * DAY_MS, reps: 1 }));
    act(() => {
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, review } } }));
    });
    act(() => {
      ensureTodayPlan('cisa');
    });
    act(() => {
      startFromIds('cisa', FOUR, 'Practice');
    });
    mount(<Today />);
    const text = textOf(root());
    // Mobile 1.21: the panel's title names the activity; the queue is its meta ("8 of 56 due").
    expect(text).toContain('Spaced review About 10 min · 8 of 56 due · most overdue first');
    // Mobile 1.15 (C1): one minutes style everywhere, "About N min" (screen readers say "minutes").
    expect(text).toMatch(/Also today About \d+ min/);
    expect(text).not.toMatch(/about \d+ minutes/i);
  });

  it('a review row under "Also today" says how many TODAY takes when the queue is bigger (live count; mobile 1.15 C7)', () => {
    const item = { kind: 'review' as const, count: 20, capped: true, due: 56 };
    expect(planText(item, 56).short).toBe('Spaced review · 20 today');
    expect(planText({ kind: 'review', count: 8, due: 56 }, 56)).toEqual({ title: 'Review 56 due', meta: 'About 10 min · 8 today, most overdue first', short: 'Spaced review · 8 today' });
    expect(planText(item, 56).title).toBe('Review 56 due');
    // Reviews done since the morning: the live queue, and no cap line once it fits one session.
    expect(planText(item, 12)).toEqual({ title: 'Review 12 due', meta: expect.stringContaining('questions to revisit'), short: 'Spaced review' });
    expect(planText(item, 0).title).toBe('Review · all caught up');
  });

  it('Results says "1 minute", not "1 minutes"', () => {
    act(() => {
      startFromIds('cisa', FOUR.slice(0, 1), 'Practice');
    });
    act(() => {
      useSession.getState().answer(FOUR[0], { display: 'A', correct: true, ms: 60_000 });
    });
    jest.setSystemTime(Date.now() + 60_000);
    act(() => {
      finishSession();
    });
    mount(<Results />);
    // Mobile 1.11: the Time stat says its label and plain words ("Time: 1 minute").
    const stat = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^Time: /.test(n.props.accessibilityLabel))[0];
    expect(stat.props.accessibilityLabel).toBe('Time: 1 minute');
  });
});
