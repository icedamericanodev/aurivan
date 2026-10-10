/**
 * Build D QA: the pace journeys end to end, through the real screens.
 *
 * Each describe is one journey from the Build D QA brief:
 * 1. Full mock at Standard: behind at 25%, ahead at 50%, then the deadline
 *    with questions unanswered, and the pacing panel's numbers.
 * 2. Mini mock at +50% with the clock hidden: the deadline, the "less than
 *    5 minutes" announcement and the pace checks all still happen.
 * 3. Untimed mock: labelled, out of pacing stats, counts for readiness, and
 *    its result can still be backed up.
 * 4. App killed mid-mock: the pace checks catch up on reopen, and a reopen
 *    after the deadline ends the exam AT the deadline (the results agree).
 * 5. Timed practice: the clock stops on the explanation, the 2:00 cue,
 *    nothing auto-submits, and Results show the median line and a tag.
 * 6. The "Practice at exam pace?" card.
 * 7. Daylight at each tier: flag and come back, pause, add a minute, and
 *    the light setting; the score and end screen.
 * 8. Saves: a 1.3 mock session and backups with the new fields.
 *
 * Bugs still open are pinned with `it.failing` (they flip to failures once
 * fixed, so the fixer turns them into plain `it`).
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, Alert, AppState, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import DaylightScreen from '../app/game/daylight';
import Practice from '../app/(tabs)/practice';
import Results from '../app/results';
import SessionScreen from '../app/session';
import { PaceStrip } from '../components/pace';
import { OptionCard } from '../components/quiz';
import { Stat } from '../components/ui';
import { findQuestion } from '../content/loader';
import { buildBackup, readBackup } from '../engine/backup';
import { pacingStats, pacingStatsLine } from '../engine/pace';
import { originalToDisplay } from '../engine/shuffle';
import { dayKey } from '../engine/streak';
import { finishSession } from '../lib/finishSession';
import { startMock, startPractice } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v, set: () => {} }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withSpring: id,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
    FadeOut: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/brand', () => ({ BrandLockup: () => null, PillarList: () => null }));
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
}));

const T0 = new Date(2026, 9, 12, 9, 0, 0).getTime();
const S = 1000;
const MIN = 60 * S;
const DAY = 24 * 60 * MIN;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
/** Unmount: the screen goes away (app killed, or the learner left). */
const unmount = () =>
  act(() => {
    r?.unmount();
    r = undefined;
  });
const find = (label: string) =>
  root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function');
const press = (label: string) =>
  act(() => {
    find(label)[0].props.onPress();
  });
const has = (label: string) => find(label).length > 0;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const labels = () => root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const strip = () => root().findByType(PaceStrip).props;
/** One act per call: intervals run inside, React renders once at the end (catch-up included). */
const tick = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
/** One second at a time, like the real interval (Daylight). */
const tickSeconds = (ms: number) => {
  for (let t = 0; t < ms; t += S) {
    act(() => {
      jest.advanceTimersByTime(S);
    });
  }
};
const active = () => useSession.getState().active!;
const cp = () => selectCert(useProgress.getState(), 'cisa');
const paceAnnouncements = () => announce.mock.calls.map(([t]) => String(t)).filter((t) => t.startsWith('Pace check'));
/** Mock: pick the first option on screen, then Next. */
const answerAndNext = () => {
  act(() => {
    root().findAllByType(OptionCard)[0].props.onPress();
  });
  press('Next');
};
let announce: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(
    () => ({ remove: () => {} }) as ReturnType<typeof AppState.addEventListener>,
  );
  Object.defineProperty(AppState, 'currentState', { value: 'active' as AppStateStatus, configurable: true });
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  announce.mockClear();
  useProgress.getState().resetCert('cisa');
  useProgress.setState({ today: { day: '', answered: 0 } }); // resetCert keeps today's count
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', practiceTimer: false, paceOffer: undefined, examDates: {}, onboarded: true });
});
afterEach(() => {
  unmount();
  useSession.getState().clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── 1. Full mock at Standard ─────────────────────────────────────────────
describe('journey 1: full mock at Standard', () => {
  it('behind at 25%, ahead at 50%, behind at 75%, then the deadline: the pacing panel adds up', () => {
    startMock('cisa'); // 150 questions, 4 hours, target 90 s
    mount(<SessionScreen />);
    expect(strip().clock).toMatchObject({ text: '4:00:00' });

    // Slow start: 20 answered by the 60-minute check. A target learner had 40.
    tick(30 * MIN);
    for (let i = 0; i < 20; i++) answerAndNext();
    tick(30 * MIN);
    expect(active().checkpoints).toHaveLength(1);
    expect(strip().line).toEqual({ text: 'About 30 min behind. Flag anything past 2 minutes and move on.', tone: 'behind' });

    // Fast stretch: 90 answered by the 2-hour check (8100 s of work at target, 7200 s used).
    for (let i = 0; i < 70; i++) answerAndNext();
    tick(60 * MIN);
    expect(active().checkpoints).toHaveLength(2);
    expect(strip().line).toEqual({ text: 'Ahead. Use the time to re-read the stems.', tone: 'ahead' });

    // Two parked (flagged, unanswered) questions count as done for the 75% check.
    for (let i = 0; i < 2; i++) {
      press('Flag question');
      press('Next');
    }
    tick(60 * MIN);
    expect(active().checkpoints!.map((k) => k.done)).toEqual([20, 90, 92]);
    expect(strip().line.tone).toBe('behind');
    // Each check announced once, in order.
    expect(paceAnnouncements()).toEqual([
      'Pace check. About 30 min behind. Flag anything past 2 minutes and move on.',
      'Pace check. Ahead. Use the time to re-read the stems.',
      'Pace check. About 42 min behind. Flag anything past 2 minutes and move on.',
    ]);

    // Let it run out: submitted for the learner AT the deadline.
    tick(60 * MIN);
    expect(active().finishedAt).toBe(T0 + 240 * MIN);
    const [m] = cp().mocks;
    expect(m).toMatchObject({ timing: 'standard', total: 150, minutesAllowed: 240, minutesUsed: 240, unanswered: 60 });
    expect(m.checkpoints!.map((d) => Math.round(d * 1000) / 1000)).toEqual([0.5, -0.125, 0.233]);
    // The 60 unanswered questions are queued for review, not recorded as answers.
    expect(Object.keys(cp().answers)).toHaveLength(90);

    unmount();
    mount(<Results />);
    const l = labels();
    // Review fix P7: the panel's values are spoken in words (the screen still shows "4 h of 4 h").
    expect(l).toContain('Time used: 4 hours of 4 hours');
    expect(l).toContain('Pace checks: 25 percent: 30 minutes behind; 50 percent: 15 minutes ahead; 75 percent: 42 minutes behind');
    expect(l).toContain('Unanswered when time ran out: 60');
    expect(l).toContain('240 minutes');
    // The You tab's pacing line counts this timed mock.
    expect(pacingStatsLine(pacingStats(cp().mocks))).toMatch(/^Pace over 1 timed mock: median \d+ s per question\. Finished with every question answered: 0 of 1\.$/);
  });
});

// ── 2. Mini mock at +50% with the clock hidden ───────────────────────────
describe('journey 2: mini mock at +50% with "Hide the clock"', () => {
  it('no numbers ever; checks at 30 / 60 / 90 min against 135 s; one 5-minute warning; submitted at 2 h', () => {
    startMock('cisa', 50, { timing: 'plus50', hideClock: true });
    expect(active().deadline).toBe(T0 + 120 * MIN);
    mount(<SessionScreen />);
    expect(strip().clock).toBe('hidden');

    for (let i = 0; i < 5; i++) answerAndNext();
    tick(30 * MIN);
    // 5 done × 135 s = 675 s of work in 1800 s: 19 minutes behind.
    expect(active().checkpoints).toHaveLength(1);
    expect(strip().line).toEqual({ text: 'About 19 min behind. Flag anything past 2 minutes and move on.', tone: 'behind' });

    for (let i = 0; i < 25; i++) answerAndNext();
    tick(30 * MIN);
    // 30 × 135 = 4050 s in 3600 s: ahead.
    expect(strip().line.tone).toBe('ahead');
    tick(30 * MIN);
    expect(active().checkpoints!.map((k) => k.at)).toEqual([0.25, 0.5, 0.75]);
    expect(strip().clock).toBe('hidden');

    tick(25 * MIN + 30 * S); // 4.5 minutes left
    // Review fix P4: the hidden-clock warning uses the calm 'soon' tone (clock icon, clay).
    expect(strip().line).toEqual({ text: 'Less than 5 minutes left.', tone: 'soon' });
    tick(2 * MIN);
    expect(announce.mock.calls.filter(([t]) => t === 'Less than 5 minutes left.')).toHaveLength(1);
    expect(active().finishedAt).toBeUndefined();

    tick(3 * MIN);
    expect(active().finishedAt).toBeDefined();
    expect(cp().mocks[0]).toMatchObject({ timing: 'plus50', finishedAt: T0 + 120 * MIN, minutesAllowed: 120, minutesUsed: 120, unanswered: 20 });
    expect(cp().mocks[0].checkpoints).toHaveLength(3);
    // The clock was never read out as numbers.
    expect(announce.mock.calls.some(([t]) => /Time left/.test(String(t)))).toBe(false);

    unmount();
    mount(<Results />);
    expect(allText()).toContain('Mini mock · +50% time');
    expect(labels()).toContain('Time used: 2 hours of 2 hours');
    expect(labels()).toContain('Unanswered when time ran out: 20');
  });
});

// ── 3. Untimed mock ──────────────────────────────────────────────────────
describe('journey 3: untimed mock', () => {
  it('labelled Untimed in the strip and on Results; the pause dialog has no clock; out of pacing stats; counts for readiness', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    startMock('cisa', 50, { timing: 'untimed' });
    mount(<SessionScreen />);
    expect(strip().clock).toBe('untimed');
    expect(strip().line).toBeUndefined();
    answerAndNext();
    answerAndNext();
    press('Pause exam');
    expect(alert).toHaveBeenCalledWith('Pause exam?', 'Your answers are saved. Resume from Today.', expect.anything());
    tick(5 * 60 * MIN);
    expect(active().finishedAt).toBeUndefined();
    act(() => {
      finishSession();
    });
    const [m] = cp().mocks;
    expect(m.timing).toBe('untimed');
    expect(m.minutesAllowed).toBeUndefined();
    expect(m.checkpoints).toBeUndefined();
    expect(pacingStatsLine(pacingStats(cp().mocks))).toBeNull();
    expect(Object.keys(cp().answers)).toHaveLength(2);
    unmount();
    mount(<Results />);
    expect(allText()).toContain('Mini mock · untimed');
    expect(labels().some((t) => t.startsWith('Time used'))).toBe(false);
  });

  // Found in QA (fixed in e6904f4): an untimed mock has no deadline, so its
  // minutesUsed was uncapped wall time. Resumed the next day it passed the
  // backup checker's 1440-minute limit, and the learner's OWN backup was
  // refused as "damaged" (and Restore could not take its undo snapshot).
  it('an untimed mock resumed the next day can still be backed up and restored', () => {
    startMock('cisa', 50, { timing: 'untimed' });
    mount(<SessionScreen />);
    answerAndNext();
    unmount();
    jest.setSystemTime(T0 + 26 * 60 * MIN); // the next morning
    mount(<SessionScreen />);
    answerAndNext();
    act(() => {
      finishSession();
    });
    const p = useProgress.getState();
    const settings = useSettings.getState();
    const file = buildBackup(
      {
        settings: { onboarded: true, activeCertId: 'cisa', examDates: {}, theme: settings.theme, shuffleOptions: true, dailyGoal: 20, reminder: settings.reminder, haptics: true, gameRulesSeen: [] },
        progress: { byCert: p.byCert, streak: p.streak, today: p.today },
      },
      { now: Date.now(), appVersion: '1.4.0' },
    );
    expect(() => readBackup(JSON.stringify(file), ['cisa'])).not.toThrow();
  });
});

// ── 4. App killed mid-mock ───────────────────────────────────────────────
describe('journey 4: app killed mid-mock, reopened later', () => {
  it('reopened at 55%: the 25% and 50% checks are recorded at once, judged at their own moments, announced once', () => {
    startMock('cisa', 50); // 80 min, checks at 20 / 40 / 60
    mount(<SessionScreen />);
    for (let i = 0; i < 4; i++) answerAndNext();
    press('Flag question');
    unmount(); // killed
    jest.setSystemTime(T0 + 44 * MIN);
    mount(<SessionScreen />);
    const checks = active().checkpoints!;
    expect(checks.map((k) => [k.at, k.done])).toEqual([
      [0.25, 5],
      [0.5, 5],
    ]);
    // 5 × 90 s = 450 s: at 1200 s that is 13 min behind; at 2400 s, 33 min behind.
    expect(checks.map((k) => k.minutes)).toEqual([13, 33]);
    expect(paceAnnouncements()).toEqual(['Pace check. About 33 min behind. Flag anything past 2 minutes and move on.']);
    // Answers and flags survived the kill.
    expect(Object.keys(active().responses)).toHaveLength(4);
    expect(active().flagged).toHaveLength(1);
    expect(strip().clock).toMatchObject({ text: '36:00' });
  });

  it('reopened after the deadline: ends AT the deadline with all three checks, timed out', () => {
    startMock('cisa', 50);
    mount(<SessionScreen />);
    for (let i = 0; i < 3; i++) answerAndNext();
    unmount();
    jest.setSystemTime(T0 + 140 * MIN);
    mount(<SessionScreen />);
    expect(active().finishedAt).toBeDefined();
    const [m] = cp().mocks;
    expect(m).toMatchObject({ minutesUsed: 80, minutesAllowed: 80, unanswered: 47, finishedAt: T0 + 80 * MIN });
    expect(m.checkpoints).toHaveLength(3);
    unmount();
    mount(<Results />);
    expect(labels()).toContain('Time used: 1 hour 20 minutes of 1 hour 20 minutes');
    expect(labels()).toContain('Unanswered when time ran out: 47');
  });

  // Found in QA (fixed in e6904f4): finish() stamped finishedAt = now, so a
  // mock reopened after its deadline showed "140 minutes" in the Results
  // stat row, above a pacing panel saying "1 h 20 min of 1 h 20 min".
  it('reopened after the deadline: the Results "minutes" stat agrees with the time allowed', () => {
    startMock('cisa', 50);
    mount(<SessionScreen />);
    answerAndNext();
    unmount();
    jest.setSystemTime(T0 + 140 * MIN);
    mount(<SessionScreen />);
    unmount();
    mount(<Results />);
    const minutes = root().findAllByType(Stat).find((n) => n.props.label === 'minutes')!;
    expect(minutes.props.value).toBe('80');
  });
});

// ── 5. Practice with Timed on ────────────────────────────────────────────
describe('journey 5: timed practice', () => {
  /** Tap the option that is the key for the question on screen. */
  const tapRight = () => {
    const s = active();
    const id = s.questionIds[s.index];
    const display = originalToDisplay(findQuestion('cisa', id)!.correct, s.perms[id]);
    act(() => {
      root().findAllByType(OptionCard).find((n) => n.props.letter === display)!.props.onPress();
    });
  };

  it('clock stops on the explanation, the 2:00 cue, nothing auto-submits, and Results show the median and a tag', () => {
    startPractice('cisa', { count: 3, timed: true, title: 'Quick 10' });
    mount(<SessionScreen />);
    tick(119 * S);
    expect(strip().line).toBeNull();
    tick(2 * S);
    // Review fix U-H1: practice has no Flag button, so the cue speaks about the exam, in the 'soon' tone.
    expect(strip().line).toEqual({ text: 'Over 2 minutes on this one. On the exam, flag it and move on.', tone: 'soon' });
    // Waiting much longer submits nothing.
    tick(70 * S); // 3:11 on this question
    expect(Object.keys(active().responses)).toHaveLength(0);
    expect(active().finishedAt).toBeUndefined();
    tapRight();
    press('Check answer');
    const frozen = strip().clock.text;
    expect(frozen).toBe('03:11');
    expect(strip().clockUnit).toBe('paused');
    expect(strip().line).toBeNull(); // no cue on the explanation
    tick(5 * MIN);
    expect(strip().clock.text).toBe(frozen);
    press('Next question');
    tick(40 * S);
    expect(strip().clock.text).toBe('03:51');
    tapRight();
    press('Check answer');
    press('Next question');
    tick(50 * S);
    tapRight();
    press('Check answer');
    press('See results');
    expect(active().finishedAt).toBeDefined();
    unmount();
    mount(<Results />);
    expect(allText()).toContain('Median 50 s per question · exam pace 96 s');
    // Review fix O2: the tag was renamed from "Slow and right".
    expect(allText()).toContain('Took its time');
  });
});

// ── 6. The offer card ────────────────────────────────────────────────────
describe('journey 6: the "Practice at exam pace?" card', () => {
  it('not offered far out; offered near the exam; accepted once it never returns, even with the timer switched off again', () => {
    useSettings.setState({ examDates: { cisa: dayKey(T0 + 40 * DAY) } });
    mount(<Practice />);
    expect(allText()).not.toContain('Practice at exam pace?');
    unmount();
    useSettings.setState({ examDates: { cisa: dayKey(T0 + 14 * DAY) } });
    mount(<Practice />);
    expect(allText()).toContain('Practice at exam pace?');
    press('Turn on Timed');
    expect(useSettings.getState().practiceTimer).toBe(true);
    unmount();
    // The learner turns the default off later in Settings: the card stays gone.
    act(() => {
      useSettings.getState().setPracticeTimer(false);
    });
    mount(<Practice />);
    expect(allText()).not.toContain('Practice at exam pace?');
  });

  // QA B3 (fixed in 5265d03): the card used to ask "Turn on Timed?" while the
  // Timed switch on the same screen was already on, because practice.tsx
  // checked the default instead of the switch; and the dismiss button then
  // reset the switch. Now the card reads the switch, and only accepting resets it.
  it('the card hides while the Timed switch on the screen is on', () => {
    useSettings.setState({ examDates: { cisa: dayKey(T0 + 14 * DAY) } });
    mount(<Practice />);
    act(() => {
      root().findAll((n) => n.props.accessibilityLabel === 'Timed' && typeof n.props.onValueChange === 'function')[0].props.onValueChange(true);
    });
    expect(allText()).not.toContain('Practice at exam pace?');
  });
});

// ── 7. Daylight at each tier ─────────────────────────────────────────────
describe('journey 7: Daylight', () => {
  const tapFirst = () =>
    act(() => {
      root().findAllByType(OptionCard)[0].props.onPress();
    });
  const right = () => Object.values(cp().answers).filter((a) => a.lastCorrect).length;
  const scoreLabel = () => labels().find((t) => t.startsWith('Score '))!;

  it('Seedling: flag, pause, add a minute, then the light sets; timed-out questions go to review unanswered', () => {
    mount(<DaylightScreen />);
    press('Start'); // Seedling suggested: 10:00
    tickSeconds(10 * S);
    press('Flag & move on');
    press('Pause');
    tickSeconds(60 * S);
    expect(strip().clock.text).toBe('09:50');
    press('Resume');
    press('Add a minute');
    expect(strip().clock.text).toBe('10:50');
    for (let i = 0; i < 3; i++) {
      tickSeconds(20 * S);
      tapFirst();
      press('Next question');
    }
    const answeredToday = useProgress.getState().today.answered;
    expect(answeredToday).toBe(3);
    tickSeconds(10 * MIN); // the light sets
    expect(allText()).toContain('The light set before these');
    expect(allText()).toContain('Light used: 11:00 of 11:00');
    expect(allText()).not.toContain('finished in time');
    // Two left: the never-reached one and the flagged one. In review, not answered.
    expect(Object.keys(cp().answers)).toHaveLength(3);
    const timedOut = Object.keys(cp().review).filter((id) => !cp().answers[id]);
    expect(timedOut).toHaveLength(2);
    for (const id of timedOut) expect(cp().review[id].dueAt).toBeLessThanOrEqual(Date.now());
    expect(useProgress.getState().today.answered).toBe(3);
    // Score: correct answers only, no bonus.
    expect(scoreLabel()).toBe(`Score ${right()} out of 6`);
    expect(cp().gameBest.daylight).toBe(right());
  });

  it('Sapling: a flagged question comes back last with its time kept; all answered in time earns the +1', () => {
    mount(<DaylightScreen />);
    press('Sapling, 96 seconds a question');
    press('Start');
    const firstText = root().findAllByType(OptionCard)[0].props.text;
    tickSeconds(15 * S);
    press('Flag & move on');
    for (let i = 0; i < 4; i++) {
      tickSeconds(30 * S);
      tapFirst();
      press('Next question');
    }
    expect(allText()).toContain('Flagged earlier');
    expect(root().findAllByType(OptionCard)[0].props.text).toBe(firstText);
    expect(has('Flag & move on')).toBe(false); // nothing left to move on to
    tickSeconds(10 * S);
    tapFirst();
    // 15 s on the first visit + 10 s now.
    expect(allText()).toMatch(/· 25 s/);
    press('See results');
    expect(allText()).toContain('Light used: 02:25 of 08:00 · finished in time, +1');
    expect(allText()).toContain('your light gave 96 s');
    expect(scoreLabel()).toBe(`Score ${right() + 1} out of 6`);
  });

  it('Heartwood: 6:40 of light, no "Add a minute", and the light sets on an unanswered round with a score of 0', () => {
    mount(<DaylightScreen />);
    press('Heartwood, 80 seconds a question');
    press('Start');
    expect(strip().clock.text).toBe('06:40');
    expect(has('Add a minute')).toBe(false);
    tickSeconds(400 * S);
    expect(allText()).toContain('Light used: 06:40 of 06:40');
    expect(scoreLabel()).toBe('Score 0 out of 6');
    expect(Object.keys(cp().answers)).toHaveLength(0);
    expect(Object.keys(cp().review)).toHaveLength(5);
    expect(useProgress.getState().today.answered).toBe(0);
  });
});

// ── 8. Saves ─────────────────────────────────────────────────────────────
describe('journey 8: saves', () => {
  it('a mock session saved by 1.3 (no timing, no checks, no answer dates) resumes, gets checks and finishes', async () => {
    startMock('cisa', 50);
    const s = active();
    const { timing: _t, ...old } = s;
    const blob = { state: { active: { ...old, responses: { [s.questionIds[0]]: { display: 'A', correct: true, ms: 50_000 } } } }, version: 1 };
    jest.useRealTimers(); // the storage mock resolves on real timers
    useSession.setState({ active: null });
    await AsyncStorage.setItem('aurivan.session.v1', JSON.stringify(blob));
    await useSession.persist.rehydrate();
    jest.useFakeTimers({ now: T0 + 21 * MIN });
    expect(active().timing).toBeUndefined();
    mount(<SessionScreen />);
    // Standard pace for an old session: 1 done at 20 min is behind.
    expect(active().checkpoints).toHaveLength(1);
    expect(strip().line.tone).toBe('behind');
    act(() => {
      finishSession();
    });
    expect(cp().mocks[0]).toMatchObject({ timing: 'standard', medianSec: 50, unanswered: 49 });
  });

  it('a real finished mock (float deviations, all new fields) survives a backup round trip', () => {
    startMock('cisa', 50, { timing: 'plus25' });
    mount(<SessionScreen />);
    for (let i = 0; i < 7; i++) answerAndNext();
    tick(60 * MIN);
    act(() => {
      finishSession();
    });
    const p = useProgress.getState();
    const file = buildBackup(
      {
        settings: { onboarded: true, activeCertId: 'cisa', examDates: {}, theme: 'light', shuffleOptions: true, dailyGoal: 20, reminder: { enabled: false, hour: 19, minute: 0 }, haptics: true, gameRulesSeen: [], practiceTimer: true, paceOffer: 'dismissed' },
        progress: { byCert: p.byCert, streak: p.streak, today: p.today },
      },
      { now: Date.now(), appVersion: '1.4.0' },
    );
    const data = readBackup(JSON.stringify(file), ['cisa']);
    expect(data.progress.byCert.cisa.mocks![0]).toEqual(cp().mocks[0]);
    expect(cp().mocks[0].checkpoints).toHaveLength(2);
    expect(data.settings).toMatchObject({ practiceTimer: true, paceOffer: 'dismissed' });
  });
});
