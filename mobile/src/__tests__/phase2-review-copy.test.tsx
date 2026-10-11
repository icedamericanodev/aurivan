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
    expect(subtitle()).toContain('Your phone’s Reduce Motion');
    act(() => {
      r!.unmount();
    });
    Platform.OS = 'android';
    mount(<Settings />);
    expect(subtitle()).toContain('Your phone’s Remove animations');
    expect(subtitle()).not.toContain('Reduce Motion');
  });

  it('Reduced says what it does', () => {
    mount(<Settings />);
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
    expect(text).toContain('Review 56 due');
    expect(text).toMatch(/Also today about \d+ minutes/);
    expect(text).not.toMatch(/about \d+ min\b/);
  });

  it('a review row under "Also today" says "20 at a time" when the queue is bigger than one session (live count)', () => {
    const item = { kind: 'review' as const, count: 20, capped: true, due: 56 };
    expect(planText(item, 56).short).toBe('Spaced review · 20 at a time');
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
      useSession.getState().answer(FOUR[0], { display: 'A', correct: true, ms: 30_000 });
    });
    jest.setSystemTime(Date.now() + 60_000);
    act(() => {
      finishSession();
    });
    mount(<Results />);
    const stat = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^\d+ minutes?$/.test(n.props.accessibilityLabel))[0];
    expect(stat.props.accessibilityLabel).toBe('1 minute');
  });
});
