/**
 * Mobile 1.24: the end of Day 1. The first set (the same five questions for
 * everyone) ends on its own closing screen instead of the normal Results:
 * - "3 of 5" with no percentage ring, and one fact (the topic most missed, or "All five right.");
 * - the closing plate: tomorrow in one line, "The 2 you missed come back then.", a seed planted for you (oak), the reminder ask
 *   (mobile 1.39: one row, "Remind me tomorrow at [9:00 PM]", whose time chip opens the hour and minute steppers);
 * - "Done for today" is the one solid button; "Do 5 more" is a quiet link; never "Practice the ones you missed";
 * - the words "check" and "diagnose" never appear;
 * - the phone's permission box appears only when the ask is tapped, "Not now" is respected;
 * - a miss comes back tomorrow, not in a minute;
 * - the fixed set runs with no timer and no confidence chips.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, BackHandler, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Results from '../app/results';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { firstSetIds } from '../content/firstSet';
import { buildTodayPlan } from '../lib/activity';
import { finishSession } from '../lib/finishSession';
import { ANNOUNCE_DELAY, flushSayLaterForTest, moveFocus } from '../lib/a11y';
import { startFirstSet, startOfTomorrow } from '../lib/firstSet';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false, dismissTo: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));
// The phone's notifications: allowed or refused per test.
const mockEnsure = jest.fn(async () => true);
const mockSchedule = jest.fn(async () => {});
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: () => mockEnsure(),
  scheduleReminders: (...a: unknown[]) => (mockSchedule as (...x: unknown[]) => Promise<void>)(...a),
  cancelReminders: async () => {},
  initNotifications: () => {},
}));

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
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const pressable = (label: RegExp) =>
  root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel));
const press = async (label: RegExp) => {
  const n = pressable(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  await act(async () => {
    n.props.onPress();
  });
};

const NOW = new Date(2026, 9, 15, 21, 40, 0); // Thursday evening
const CERT = 'cisa';

/** Finish a first set with `right` answers right, in set order. */
const finishFirstSet = (right: number) => {
  act(() => {
    buildTodayPlan(CERT, false);
  });
  const session = startFirstSet(CERT)!;
  act(() => {
    session.questionIds.forEach((id, i) => {
      const ok = i < right;
      useSession.getState().answer(id, { display: 'A', correct: ok, ms: 20_000 });
      useProgress.getState().recordAnswer(CERT, id, ok, undefined, { ms: 20_000 });
      if (!ok) useProgress.getState().recordMistake(CERT, id, 'A');
    });
    finishSession();
  });
  return session;
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState(useSeen.getInitialState(), true);
  act(() => {
    useProgress.getState().resetCert(CERT);
    // byCert emptied too: a reset keeps the plant, and this suite is about the seed being planted.
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {}, byCert: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: CERT, onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, familiarity: 'some', examDates: { cisa: '2026-11-26' } });
  jest.mocked(router.push).mockClear();
  jest.mocked(router.replace).mockClear();
  mockEnsure.mockReset().mockResolvedValue(true);
  mockSchedule.mockClear();
});
afterEach(() => {
  unmount();
  jest.useRealTimers();
});

describe('the first set itself', () => {
  it('is the same five questions in the same order, with no timer and the first-set mark', () => {
    const s = startFirstSet(CERT)!;
    expect(s.questionIds).toEqual([...firstSetIds(CERT)]);
    expect(s.firstSet).toBe(true);
    expect(s.timed).toBeFalsy();
    expect(s.mode).toBe('practice');
    // Even with the practice timer switched on, the first set never has one.
    useSettings.setState({ practiceTimer: true });
    useSession.getState().clear();
    expect(startFirstSet(CERT)!.timed).toBeFalsy();
  });
});

describe('the closing screen', () => {
  it('shows "3 of 5" and the fact, with no percentage ring and none of the old words', () => {
    finishFirstSet(3);
    mount(<Results />);
    const t = allText();
    expect(t).toContain('3 of 5');
    expect(t).toMatch(/Most missed: .+\.|come back/);
    expect(t).toContain('The 2 you missed come back then.');
    expect(t).toContain('Done for today');
    expect(t).toContain('Do 5 more');
    expect(t).not.toMatch(/check|diagnos/i);
    expect(t).not.toMatch(/Practice the|Review answers|score|%/);
    // The header is read as one sentence.
    const head = root().findAll((n) => n.props.accessibilityRole === 'header' && n.props.accessibilityLabel === '3 of 5 right');
    expect(head.length).toBeGreaterThan(0);
  });

  it('all five right says so', () => {
    finishFirstSet(5);
    mount(<Results />);
    expect(allText()).toContain('All five right.');
    expect(allText()).not.toMatch(/you missed/);
  });

  it('says how far the first range is: "5 of 40 for your first range"', () => {
    finishFirstSet(4);
    mount(<Results />);
    expect(allText()).toContain('5 of 40 for your first range');
  });

  it('previews tomorrow in one line, never the reviews', () => {
    finishFirstSet(3);
    mount(<Results />);
    const t = allText();
    expect(t).toContain('Tomorrow');
    expect(t).toMatch(/\d+ questions, about \d+ min|-minute lesson on/);
    expect(t).not.toMatch(/Spaced review/);
  });

  it('plants an oak seed on its own, and offers a different plant', async () => {
    finishFirstSet(3);
    expect(selectCert(useProgress.getState(), CERT).plant).toBeUndefined();
    mount(<Results />);
    expect(selectCert(useProgress.getState(), CERT).plant?.species).toBe('oak');
    expect(allText()).toMatch(/is planted\. It grows as you learn\./);
    await press(/^Choose a different plant$/);
    expect(router.push).toHaveBeenCalledWith({ pathname: '/plant-pick', params: { mode: 'species' } });
  });

  it('a learner who turned plants off gets no seed and no plant words', () => {
    useProgress.setState({ plantSettings: { promptHidden: true, showPlant: false } });
    finishFirstSet(3);
    mount(<Results />);
    expect(selectCert(useProgress.getState(), CERT).plant).toBeUndefined();
    expect(allText()).not.toMatch(/planted|plant/i);
  });

  it('a miss comes back tomorrow, not in a minute', () => {
    const s = finishFirstSet(3);
    const missed = s.questionIds.slice(3);
    // Before the screen: misses are due at once (the normal rule).
    for (const id of missed) expect(selectCert(useProgress.getState(), CERT).review[id].dueAt).toBeLessThanOrEqual(Date.now());
    mount(<Results />);
    const tomorrow = startOfTomorrow(Date.now());
    for (const id of missed) expect(selectCert(useProgress.getState(), CERT).review[id].dueAt).toBe(tomorrow);
    // Right answers were never queued.
    for (const id of s.questionIds.slice(0, 3)) expect(selectCert(useProgress.getState(), CERT).review[id]).toBeUndefined();
  });

  it('counts toward the readiness range like any five answers', () => {
    finishFirstSet(3);
    expect(Object.keys(selectCert(useProgress.getState(), CERT).answers)).toHaveLength(5);
  });
});

describe('the buttons', () => {
  it('"Done for today" ends the set and goes to Today', async () => {
    finishFirstSet(3);
    mount(<Results />);
    await press(/^Done for today$/);
    expect(useSession.getState().active).toBeNull();
    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  it('Android Back means "Done for today"', () => {
    finishFirstSet(3);
    let handler: (() => boolean) | undefined;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_: string, h: () => boolean) => {
      handler = h;
      return { remove: () => {} };
    }) as never);
    mount(<Results />);
    expect(handler?.()).toBe(true);
    expect(router.replace).toHaveBeenCalledWith('/home');
  });

  it('"Do 5 more" starts an ordinary five-question set', async () => {
    finishFirstSet(3);
    mount(<Results />);
    await press(/^Do 5 more$/);
    const s = useSession.getState().active!;
    expect(s.questionIds).toHaveLength(5);
    expect(s.firstSet).toBeUndefined();
    expect(s.finishedAt).toBeUndefined();
    expect(router.replace).toHaveBeenCalledWith('/session');
  });
});

describe('the reminder ask', () => {
  it('is one row, "Remind me tomorrow at [time]", for the hour they are studying now', () => {
    finishFirstSet(3);
    mount(<Results />);
    const ask = pressable(/^Remind me tomorrow at /);
    expect(ask.length).toBeGreaterThan(0);
    // Spoken as the whole sentence; seen as the button's words and the time chip beside it.
    expect(String(ask[0].props.accessibilityLabel)).toMatch(/^Remind me tomorrow at (9:00 PM|21:00)$/);
    expect(allText()).toContain('Remind me tomorrow at');
    expect(pressable(/^Reminder time, (9:00 PM|21:00)$/).length).toBeGreaterThan(0);
    // Mobile 1.39: no Earlier / Later links any more; "Not now" is the only other choice.
    expect(pressable(/^One hour (earlier|later)$/)).toHaveLength(0);
    // Nothing asked of the phone yet.
    expect(mockEnsure).not.toHaveBeenCalled();
    expect(useSettings.getState().reminder.enabled).toBe(false);
  });

  it('a tap asks the phone, turns reminders on at that time and schedules them', async () => {
    finishFirstSet(3);
    mount(<Results />);
    await press(/^Remind me tomorrow at /);
    expect(mockEnsure).toHaveBeenCalledTimes(1);
    const rem = useSettings.getState().reminder;
    expect(rem).toMatchObject({ enabled: true, hour: 21, minute: 0 });
    expect(mockSchedule).toHaveBeenCalled();
    expect(useSeen.getState().reminderAsk.first).toBe('on');
    expect(allText()).toMatch(/Done\. I’ll remind you at/);
  });

  it('the time chip opens the steppers; the time can move by hours and 15 minutes before the tap', async () => {
    finishFirstSet(3);
    mount(<Results />);
    expect(pressable(/^Hour earlier$/)).toHaveLength(0); // the sheet is closed until the chip is tapped
    await press(/^Reminder time, /);
    await press(/^Hour earlier$/);
    await press(/^Minutes later$/);
    await press(/^Done, Study time$/);
    // Nothing is saved by the sheet itself: only the button turns the reminder on.
    expect(useSettings.getState().reminder.enabled).toBe(false);
    expect(pressable(/^Reminder time, (8:15 PM|20:15)$/).length).toBeGreaterThan(0);
    await press(/^Remind me tomorrow at /);
    expect(useSettings.getState().reminder).toMatchObject({ enabled: true, hour: 20, minute: 15 });
  });

  it('if the phone says no: nothing is turned on, the learner is told how to change it, and it is not asked again', async () => {
    mockEnsure.mockResolvedValue(false);
    finishFirstSet(3);
    mount(<Results />);
    await press(/^Remind me tomorrow at /);
    expect(useSettings.getState().reminder.enabled).toBe(false);
    expect(useSeen.getState().reminderAsk.first).toBe('blocked');
    expect(allText()).toMatch(/Notifications are off for KaiSip on this phone/);
  });

  it('"Not now" is respected: no prompt, no reminder, and the block goes away', async () => {
    finishFirstSet(3);
    mount(<Results />);
    await press(/^Not now$/);
    expect(mockEnsure).not.toHaveBeenCalled();
    expect(useSettings.getState().reminder.enabled).toBe(false);
    expect(useSeen.getState().reminderAsk.first).toBe('later');
    expect(allText()).not.toMatch(/Remind me tomorrow at/);
  });

  it('"Not now" says so, and focus moves to "Done for today" (never left on a removed button)', async () => {
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    finishFirstSet(3);
    mount(<Results />);
    jest.mocked(moveFocus).mockClear();
    await press(/^Not now$/);
    flushSayLaterForTest();
    expect(say).toHaveBeenCalledWith('No reminder set. You can choose one in Settings.');
    const call = jest.mocked(moveFocus).mock.calls.find((c) => c[1] === ANNOUNCE_DELAY + 50);
    expect(call).toBeDefined();
    // The ref is the footer's solid button.
    const target = (call![0] as { current: { props?: { accessibilityLabel?: string } } | null }).current;
    expect(target).not.toBeNull();
    say.mockRestore();
  });

  it('closing the time sheet says the new time and puts focus back on the chip', async () => {
    const say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    finishFirstSet(3);
    mount(<Results />);
    await press(/^Reminder time, /);
    await press(/^Hour earlier$/);
    jest.mocked(moveFocus).mockClear();
    await press(/^Done, Study time$/);
    flushSayLaterForTest();
    expect(jest.mocked(moveFocus).mock.calls.some((c) => c[1] === ANNOUNCE_DELAY)).toBe(true);
    expect(say.mock.calls.map((c) => String(c[0])).some((s) => /^Study time (8:00 PM|20:00)/.test(s))).toBe(true);
    say.mockRestore();
  });

  it('already answered (or already on): the closing screen does not ask again', () => {
    useSeen.setState({ reminderAsk: { first: 'later' } });
    finishFirstSet(3);
    mount(<Results />);
    expect(allText()).not.toMatch(/Remind me tomorrow at/);
    unmount();
    useSeen.setState({ reminderAsk: {} });
    useSettings.setState({ reminder: { enabled: true, hour: 8, minute: 0, days: [0, 1, 2, 3, 4, 5, 6] } });
    mount(<Results />);
    expect(allText()).not.toMatch(/Remind me tomorrow at/);
  });
});

describe('light, dark and 200% text', () => {
  const setScale = (fontScale: number) => {
    const w = Dimensions.get('window');
    act(() => {
      Dimensions.set({ window: { ...w, width: 393, fontScale }, screen: { ...w, width: 393, fontScale } });
    });
  };
  afterEach(() => setScale(1));

  it.each([
    ['light', 1],
    ['dark', 1],
    ['light', 2],
    ['dark', 2],
  ] as const)('%s at %sx text: every line and every button is still there, and each button has a name', (theme, scale) => {
    useSettings.setState({ theme });
    setScale(scale);
    finishFirstSet(3);
    mount(<Results />);
    const t = allText();
    for (const line of ['3 of 5 right', 'The 2 you missed come back then.', 'Done for today', 'Do 5 more', 'Choose a different plant']) expect(t).toContain(line);
    // Nothing is clipped by a line cap, and every pressable has a spoken name.
    const names = new Set(pressable(/./).map((p) => String(p.props.accessibilityLabel)));
    for (const name of ['Done for today', 'Do 5 more', 'Choose a different plant', 'Not now']) expect(names).toContain(name);
    expect([...names].some((n) => /^Remind me tomorrow at /.test(n))).toBe(true);
    expect([...names].some((n) => /^Reminder time, /.test(n))).toBe(true);
    const capped = root().findAll((n) => typeof n.type === 'string' && n.props.numberOfLines !== undefined);
    expect(capped).toHaveLength(0);
  });
});
