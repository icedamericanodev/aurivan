/**
 * Mobile 2.2: the gentle practice countdown through the REAL screens (Practice, the question
 * screen, Results). Plain English for the founder, what these prove:
 * - Build a set offers Untimed, Count up and Countdown; it starts from the Timed switch and never
 *   picks Countdown by itself; the lengths come from the set ("10 questions · 15 min");
 * - a domain row keeps its one tap and gains "Choose length and timer", which opens Build a set
 *   with that domain chosen;
 * - the countdown only runs while a question waits for its answer; it stands still for the
 *   explanation, the background and a changed phone clock;
 * - a screen reader hears "5 minutes left." and "1 minute left." once each, never every second;
 * - at zero a calm sheet offers exactly two choices; nothing is submitted, the option picked but
 *   not checked stays picked, and the sheet is back after the app was closed until it is answered;
 * - each checked answer is recorded once, whatever is tapped twice;
 * - Results says truthfully how the time went;
 * - a mock exam behaves exactly as before.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write `act(() => store.action())`.
 */
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Practice from '../app/(tabs)/practice';
import Results from '../app/results';
import SessionScreen from '../app/session';
import { PaceStrip, TimesUpSheet } from '../components/pace';
import { OptionCard } from '../components/quiz';
import { Button, Chip } from '../components/ui';
import { topicQuestionIds } from '../engine/outline';
import { MAX_STEP_MS, readCountdown, remainingMs, stageOf } from '../engine/practiceCountdown';
import { scopeTopics } from '../lib/outline';
import { practiceSetLength, startMock, startPractice } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
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
jest.mock('../components/brand', () => ({ KaisipLockup: () => null, KaisipMark: () => null, PillarList: () => null }));
// Is the question screen the one in view? (false = another screen was pushed on top of it.)
let mockInView = true;
// The Practice route's params (a link with ?build=<domain id>).
let mockParams: Record<string, string | string[]> = {};
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true, canDismiss: () => false, dismissTo: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => mockInView,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const T0 = new Date(2026, 10, 19, 9, 0, 0).getTime();
const S = 1000;
const MIN = 60 * S;
const DAY = 24 * 60 * MIN;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
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
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const tick = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
const active = () => useSession.getState().active!;
const saved = () => readCountdown(active().countdown)!;
const strip = () => root().findAllByType(PaceStrip)[0]?.props;
const clock = () => (strip().clock as { text: string; spoken: string }).text;
const sheet = () => root().findAllByType(TimesUpSheet)[0];
const sheetOpen = () => Boolean(sheet()?.props.visible);
const options = () => root().findAllByType(OptionCard);
const pickFirst = () =>
  act(() => {
    options()[0].props.onPress();
  });
const answerFirst = () => {
  pickFirst();
  press('Check answer');
};
/** The chips inside Build a set, by their visible label. */
const panel = () => root().findAll((n) => n.props.testID === 'build-set')[0];
const chip = (label: string) => panel().findAllByType(Chip).filter((c) => c.props.label === label)[0];
const tapChip = (label: string) =>
  act(() => {
    chip(label).props.onPress();
  });
const startButton = () => panel().findAllByType(Button).filter((b) => String(b.props.label).startsWith('Start '))[0];

let said: string[];
let appState: ((s: AppStateStatus) => void) | undefined;
const goTo = (s: AppStateStatus) =>
  act(() => {
    appState?.(s);
  });

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  appState = undefined;
  mockInView = true;
  mockParams = {};
  // The countdown's own AppState listener is the last one the session screen adds (after the answer clock's).
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
    const mine = fn as unknown as (s: AppStateStatus) => void;
    const earlier = appState;
    appState = (s) => {
      earlier?.(s);
      mine(s);
    };
    return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
  });
  Object.defineProperty(AppState, 'currentState', { value: 'active' as AppStateStatus, configurable: true });
  said = [];
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation((t) => {
    said.push(t);
  });
  jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation((t) => {
    said.push(t);
  });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', practiceTimer: false, paceOffer: 'dismissed', examDates: {}, onboarded: true });
});
afterEach(() => {
  unmount();
  useSession.getState().clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Practice: Build a set has a Timer choice', () => {
  it('starts from the Timed switch (off = Untimed, on = Count up) and never picks Countdown itself', () => {
    mount(<Practice />);
    press('Build a set');
    expect(chip('Untimed').props.selected).toBe(true);
    expect(chip('Count up').props.selected).toBe(false);
    expect(chip('Countdown').props.selected).toBe(false);
    expect(startButton().props.label).toBe('Start 10 questions');
    expect(root().findAll((n) => n.props.testID === 'build-set-countdown')).toHaveLength(0);
    unmount();
    // A learner whose saved setting is only "Timed practice: on" gets COUNT UP, as before.
    useSettings.setState({ practiceTimer: true });
    mount(<Practice />);
    press('Build a set');
    expect(chip('Count up').props.selected).toBe(true);
    expect(chip('Countdown').props.selected).toBe(false);
    press('Start 10 questions, timed');
    expect(active().timed).toBe(true);
    expect(active().countdown).toBeUndefined();
  });

  it('Countdown offers three lengths from the set, and starts a set with that budget', () => {
    mount(<Practice />);
    press('Build a set');
    tapChip('Countdown');
    expect(panel().findAllByType(Chip).map((c) => c.props.label).filter((l: string) => / min$/.test(l))).toEqual(['10 min', '15 min', '20 min']);
    expect(chip('15 min').props.selected).toBe(true);
    // Spoken in full, with the pace it stands for.
    expect(chip('15 min').props.accessibilityLabel).toBe('15 minutes, about 90 seconds a question');
    expect(startButton().props.label).toBe('Start 10 questions · 15 min');
    expect(startButton().props.accessibilityLabel).toBe('Start 10 questions with a 15 minute countdown');
    expect(allText()).toContain('At zero you choose: finish, or keep going untimed.');
    // A longer set: the lengths follow it, and the pace chosen is kept.
    act(() => {
      root().findAll((n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel === '20 questions' && typeof n.props.onPress === 'function').at(-1)!.props.onPress();
    });
    expect(startButton().props.label).toBe('Start 20 questions · 30 min');
    tapChip('40 min');
    expect(startButton().props.label).toBe('Start 20 questions · 40 min');
    act(() => {
      startButton().props.onPress();
    });
    expect(active().questionIds).toHaveLength(20);
    expect(active().countdown).toEqual({ budgetMs: 40 * MIN, usedMs: 0 });
    expect(active().timed).toBe(true);
    expect(active().deadline).toBeUndefined();
    // One set's choice: the saved "Timed practice" setting is untouched.
    expect(useSettings.getState().practiceTimer).toBe(false);
  });

  it('flipping the Timed switch afterwards wins over the chip chosen here', () => {
    mount(<Practice />);
    press('Build a set');
    tapChip('Countdown');
    act(() => {
      root().findAll((n) => n.props.testID === 'timed-switch')[0].props.onPress();
    });
    expect(chip('Count up').props.selected).toBe(true);
    expect(chip('Countdown').props.selected).toBe(false);
  });

  it('fewer questions than asked: the button and a line say the real length', () => {
    const topic = scopeTopics('cisa', '4').find((t) => {
      const n = practiceSetLength('cisa', { count: 50, domainId: '4', ids: topicQuestionIds(t) });
      return n > 0 && n < 50;
    })!;
    const real = practiceSetLength('cisa', { count: 50, domainId: '4', ids: topicQuestionIds(topic) });
    mount(<Practice />);
    press('Build a set');
    tapChip('IS Operations');
    act(() => {
      panel().findAllByType(Chip).filter((c) => c.props.accessibilityLabel === `Topic ${topic.name}`)[0].props.onPress();
    });
    act(() => {
      root().findAll((n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel === '50 questions' && typeof n.props.onPress === 'function').at(-1)!.props.onPress();
    });
    const word = real === 1 ? 'question' : 'questions';
    expect(startButton().props.label).toBe(`Start ${real} ${word}`);
    expect(allText()).toContain(`These choices give ${real} ${word}.`);
    tapChip('Countdown');
    const minutes = Math.ceil((real * 90) / 60);
    expect(startButton().props.label).toBe(`Start ${real} ${word} · ${minutes} min`);
    act(() => {
      startButton().props.onPress();
    });
    expect(active().questionIds).toHaveLength(real);
    expect(active().countdown).toEqual({ budgetMs: minutes * MIN, usedMs: 0 });
  });
});

describe('Practice: a domain row keeps its one tap and gains "Choose length and timer"', () => {
  it('the small button opens Build a set with that domain chosen', () => {
    mount(<Practice />);
    expect(root().findAll((n) => n.props.testID === 'build-set')).toHaveLength(0);
    press('Choose length and timer for IS Operations');
    expect(chip('IS Operations').props.selected).toBe(true);
    expect(chip('All domains').props.selected).toBe(false);
    // Nothing started yet: it only opened the choices.
    expect(useSession.getState().active).toBeNull();
    // Another domain's button moves the choice.
    press('Choose length and timer for IS Audit');
    expect(chip('IS Audit').props.selected).toBe(true);
    expect(chip('IS Operations').props.selected).toBe(false);
    tapChip('Countdown');
    act(() => {
      startButton().props.onPress();
    });
    expect(active()).toMatchObject({ title: 'IS Audit', timed: true, countdown: { budgetMs: 15 * MIN, usedMs: 0 } });
  });

  it('a link (/practice?build=<domain id>) opens Build a set the same way; an unknown id is ignored', () => {
    mockParams = { build: '4' };
    mount(<Practice />);
    expect(chip('IS Operations').props.selected).toBe(true);
    expect(useSession.getState().active).toBeNull(); // a link never starts a set by itself
    unmount();
    for (const bad of ['99', 'constructor', '']) {
      mockParams = { build: bad };
      mount(<Practice />);
      expect(root().findAll((n) => n.props.testID === 'build-set')).toHaveLength(0);
      unmount();
    }
  });

  it('a link that repeats a key (?build=1&build=2, ?section=a&section=b) is ignored and does not loop', () => {
    // The router gives a NEW array each render for a repeated key; the screen must not re-render forever.
    const params = { get build() { return ['1', '2']; }, get section() { return ['drills', 'drills']; } };
    mockParams = params as unknown as Record<string, string | string[]>;
    expect(() => mount(<Practice />)).not.toThrow();
    expect(root().findAll((n) => n.props.testID === 'build-set')).toHaveLength(0);
    expect(useSession.getState().active).toBeNull();
    unmount();
    mockParams = {};
  });

  it('every domain row has the button, 48pt wide, and the focus row has it too', () => {
    mount(<Practice />);
    const buttons = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Choose length and timer for ') && n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && typeof n.props.style === 'function');
    // Five domain rows and the focus area's row.
    expect(buttons).toHaveLength(6);
    for (const b of buttons) {
      const style = b.props.style({ pressed: false });
      expect(style.width).toBeGreaterThanOrEqual(48);
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
      expect(b.props.accessibilityHint).toBe('Opens Build a set with this domain chosen');
    }
  });

  it('the row itself still starts 10 questions in that domain in one tap, with no countdown', () => {
    mount(<Practice />);
    const rows = root().findAll((n) => n.props.accessibilityHint === 'Starts a set in this domain' && typeof n.props.onPress === 'function');
    expect(rows.length).toBeGreaterThanOrEqual(5);
    act(() => {
      rows.filter((n) => String(n.props.accessibilityLabel).startsWith('Domain 4,'))[0].props.onPress();
    });
    expect(active()).toMatchObject({ mode: 'practice', title: 'IS Operations' });
    expect(active().questionIds).toHaveLength(10);
    expect(active().timed).toBeUndefined();
    expect(active().countdown).toBeUndefined();
  });
});

describe('the countdown on the question screen', () => {
  it('counts down only while a question waits for its answer', () => {
    startPractice('cisa', { count: 10, countdownSec: 90 });
    mount(<SessionScreen />);
    expect(clock()).toBe('15:00');
    expect(strip().clockUnit).toBe('left');
    tick(45 * S);
    expect(clock()).toBe('14:15');
    answerFirst();
    // The explanation is open: the clock stands still, however long they read (as count up does).
    expect(strip().clockUnit).toBe('left · paused');
    expect(strip().clock.spoken).toBe('Time left 14 minutes, paused');
    expect(saved().usedMs).toBe(45 * S); // saved the moment it stopped
    tick(20 * MIN);
    expect(clock()).toBe('14:15');
    expect(saved().usedMs).toBe(45 * S);
    press('Next question');
    tick(15 * S);
    expect(clock()).toBe('14:00');
    expect(strip().clockUnit).toBe('left');
    expect(active().finishedAt).toBeUndefined();
    expect(sheetOpen()).toBe(false);
  });

  it('the background stops it and saves at once; the time away is never counted', () => {
    startPractice('cisa', { count: 10, countdownSec: 90 });
    mount(<SessionScreen />);
    tick(30 * S);
    goTo('background');
    expect(saved().usedMs).toBe(30 * S); // on disk before the app can be closed
    tick(3 * 60 * MIN);
    expect(saved().usedMs).toBe(30 * S);
    goTo('active');
    expect(clock()).toBe('14:30');
    tick(10 * S);
    expect(clock()).toBe('14:20');
    // "inactive" (a call screen, the app switcher) stops it too.
    goTo('inactive');
    tick(5 * MIN);
    goTo('active');
    expect(clock()).toBe('14:20');
    expect(saved().usedMs).toBe(40 * S);
  });

  it('another screen on top of the question (the session is set aside) stops it too', () => {
    startPractice('cisa', { count: 10, countdownSec: 90 });
    mount(<SessionScreen />);
    const first = active().questionIds[0];
    tick(20 * S);
    act(() => {
      mockInView = false;
      useSession.getState().toggleFlag(first); // any change redraws the screen, which then knows it is covered
    });
    expect(saved().usedMs).toBe(20 * S);
    tick(30 * MIN);
    expect(saved().usedMs).toBe(20 * S);
    expect(sheetOpen()).toBe(false);
    act(() => {
      mockInView = true;
      useSession.getState().toggleFlag(first);
    });
    tick(10 * S);
    expect(clock()).toBe('14:30');
  });

  it('killed and reopened: it carries on from the time that was left', () => {
    startPractice('cisa', { count: 10, countdownSec: 90 });
    mount(<SessionScreen />);
    tick(4 * MIN);
    goTo('background');
    unmount(); // the app is closed
    jest.setSystemTime(Date.now() + 7 * DAY); // ... for a week
    mount(<SessionScreen />);
    expect(clock()).toBe('11:00');
    tick(10 * S);
    expect(clock()).toBe('10:50');
    expect(sheetOpen()).toBe(false);
  });

  it('changing the phone clock mid-set cannot end the set or give time back', () => {
    startPractice('cisa', { count: 10, countdownSec: 90 });
    mount(<SessionScreen />);
    tick(60 * S);
    // A day FORWARD: at most one capped tick is added.
    jest.setSystemTime(Date.now() + DAY);
    tick(S);
    answerFirst();
    expect(saved().usedMs).toBeGreaterThanOrEqual(61 * S);
    expect(saved().usedMs).toBeLessThanOrEqual(61 * S + MAX_STEP_MS);
    expect(stageOf(saved())).toBe('running');
    expect(sheetOpen()).toBe(false);
    const used = saved().usedMs;
    press('Next question');
    // Two days BACKWARD: nothing is given back, and it keeps counting.
    jest.setSystemTime(Date.now() - 2 * DAY);
    tick(10 * S);
    answerFirst();
    expect(saved().usedMs).toBeGreaterThanOrEqual(used + 9 * S);
    expect(saved().usedMs).toBeLessThanOrEqual(used + 10 * S + MAX_STEP_MS);
  });

  it('a screen reader hears two cues only, never a line each second', () => {
    startPractice('cisa', { count: 10, countdownSec: 60 }); // 10 minutes
    mount(<SessionScreen />);
    said.length = 0;
    tick(4 * MIN + 59 * S);
    expect(said).toEqual([]);
    tick(2 * S);
    expect(said).toEqual(['5 minutes left.']);
    tick(3 * MIN + 58 * S);
    expect(said).toEqual(['5 minutes left.']);
    tick(2 * S);
    expect(said).toEqual(['5 minutes left.', '1 minute left.']);
    // The last minute is in words on the strip too (never colour alone).
    expect(strip().line).toEqual({ text: 'Last minute. Nothing is submitted at zero.', tone: 'soon' });
    expect(strip().lineShort).toBe('Last minute');
    tick(58 * S);
    // Ten minutes of ticks: two announcements. The strip's own label moves in whole minutes / 10 s steps.
    expect(said).toEqual(['5 minutes left.', '1 minute left.']);
    expect(strip().clock.spoken).toBe('Time left 10 seconds or less');
  });

  it('"Hide the clock": words instead of ticking numbers, and the same two cues', () => {
    mount(<Practice />);
    press('Build a set');
    tapChip('Countdown');
    tapChip('10 min');
    expect(chip('Hide the clock').props.selected).toBe(false); // never on by itself
    tapChip('Hide the clock');
    act(() => {
      startButton().props.onPress();
    });
    expect(active()).toMatchObject({ hideClock: true, countdown: { budgetMs: 10 * MIN, usedMs: 0 } });
    unmount();
    mount(<SessionScreen />);
    said.length = 0;
    expect(strip().clock).toBe('hidden');
    expect(strip().hiddenSpoken).toBe('Clock hidden. The countdown is running.');
    expect(strip().line).toBeNull();
    tick(5 * MIN + S);
    // The last five minutes are said in words on the strip, and aloud once.
    expect(strip().line).toEqual({ text: 'Less than 5 minutes left.', tone: 'soon' });
    expect(said).toEqual(['5 minutes left.']);
    answerFirst();
    expect(strip().hiddenSpoken).toBe('Clock hidden. The countdown is paused.');
    expect(strip().line).toBeNull();
    press('Next question');
    tick(5 * MIN);
    // Zero is the same gentle stop, clock hidden or not.
    expect(sheetOpen()).toBe(true);
    expect(strip().hiddenSpoken).toBe('Clock hidden. The countdown is over.');
    expect(active().finishedAt).toBeUndefined();
  });

  it('a set that starts at 5 minutes, or is reopened under a mark, says nothing for that mark', () => {
    startPractice('cisa', { count: 5, countdownSec: 60 }); // exactly 5 minutes
    mount(<SessionScreen />);
    said.length = 0;
    tick(2 * MIN);
    expect(said).toEqual([]);
    goTo('background');
    unmount();
    mount(<SessionScreen />); // reopened with 3 minutes left
    tick(90 * S);
    expect(said).toEqual([]);
    tick(31 * S);
    expect(said).toEqual(['1 minute left.']);
  });
});

describe('at zero: a calm sheet with exactly two choices', () => {
  /** A 10-question set with a 10 minute budget, taken to zero on question 2 with an option picked. */
  const toZero = () => {
    startPractice('cisa', { count: 10, countdownSec: 60 });
    mount(<SessionScreen />);
    tick(30 * S);
    answerFirst();
    press('Next question');
    tick(9 * MIN);
    pickFirst(); // picked, NOT checked
    said.length = 0;
    tick(31 * S);
  };

  it('stops once, submits nothing, and keeps the option that was picked but not checked', () => {
    toZero();
    expect(sheetOpen()).toBe(true);
    expect(clock()).toBe('00:00');
    expect(saved()).toEqual({ budgetMs: 10 * MIN, usedMs: 10 * MIN, expiredAfter: 1 });
    // Exactly two buttons, and the sheet's words.
    const box = root().findAll((n) => n.props.testID === 'times-up-sheet')[0];
    expect(box.findAllByType(Button).map((b) => b.props.label)).toEqual(['Keep going untimed', 'Finish now']);
    expect(sheet().props).toMatchObject({ answered: 1, total: 10 });
    expect(allText()).toContain('You answered 1 of 10. Nothing was submitted, and questions you have not answered are not marked wrong.');
    // The title is the header a screen reader lands on; there is no separate "time's up" announcement.
    expect(box.findAll((n) => n.props.accessibilityRole === 'header' && n.props.accessibilityLabel === 'Time’s up').length).toBeGreaterThan(0);
    expect(said).toEqual([]);
    // Nothing finished, nothing recorded for the question on screen, the pick still there.
    expect(active().finishedAt).toBeUndefined();
    expect(Object.keys(active().responses)).toHaveLength(1);
    expect(active().index).toBe(1);
    expect(options()[0].props.state).toBe('selected');
    // Waiting changes nothing: no auto-submit, no second expiry, no more speech.
    const atZero = active();
    tick(30 * MIN);
    expect(active()).toBe(atZero);
    expect(sheetOpen()).toBe(true);
    expect(said).toEqual([]);
  });

  it('"Keep going untimed": the same set carries on with no timer, and the pick is still there to check', () => {
    toZero();
    const second = active().questionIds[1];
    press('Keep going untimed');
    expect(sheetOpen()).toBe(false);
    expect(saved().after).toBe('untimed');
    expect(strip().clock).toBe('untimed');
    expect(options()[0].props.state).toBe('selected');
    expect(active().questionIds).toHaveLength(10);
    // Check the answer that was in progress: recorded once.
    press('Check answer');
    expect(Object.keys(active().responses)).toHaveLength(2);
    expect(selectCert(useProgress.getState(), 'cisa').answers[second].attempts).toBe(1);
    // No timer any more: an hour later nothing has ended and the sheet has not come back.
    press('Next question');
    tick(60 * MIN);
    expect(active().finishedAt).toBeUndefined();
    expect(sheetOpen()).toBe(false);
    expect(saved()).toEqual({ budgetMs: 10 * MIN, usedMs: 10 * MIN, expiredAfter: 1, after: 'untimed' });
  });

  it('tapping "Keep going untimed" twice is one answer', () => {
    toZero();
    const keep = find('Keep going untimed')[0].props.onPress;
    act(() => {
      keep();
    });
    const once = active();
    act(() => {
      keep();
    });
    expect(active()).toBe(once);
    expect(said.filter((t) => t.startsWith('No timer now'))).toHaveLength(0); // still waiting on its short pause
    tick(S);
    expect(said.filter((t) => t.startsWith('No timer now'))).toHaveLength(1);
  });

  it('"Finish now": ends with what was answered; the unchecked pick and the rest are not marked wrong', () => {
    toZero();
    const [first, ...rest] = active().questionIds;
    const finish = find('Finish now')[0].props.onPress;
    act(() => {
      finish();
    });
    const done = active();
    expect(done.finishedAt).toBeDefined();
    expect(saved().after).toBe('finished');
    expect(Object.keys(done.responses)).toEqual([first]);
    // Tapped again (or the other button): one stable result.
    act(() => {
      finish();
    });
    expect(active()).toBe(done);
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(Object.keys(cp.answers)).toEqual([first]);
    expect(cp.answers[first].attempts).toBe(1);
    for (const id of rest) {
      expect(cp.answers[id]).toBeUndefined();
      expect(cp.mistakes[id]).toBeUndefined();
      expect(cp.review[id]).toBeUndefined();
    }
  });

  it('"Finish now" with nothing answered just leaves: no empty Results', () => {
    startPractice('cisa', { count: 10, countdownSec: 60 });
    mount(<SessionScreen />);
    tick(10 * MIN + S);
    expect(sheetOpen()).toBe(true);
    expect(sheet().props.answered).toBe(0);
    press('Finish now');
    expect(useSession.getState().active).toBeNull();
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toHaveLength(0);
  });

  it('closed at zero and reopened: the sheet is back, until it is answered', () => {
    toZero();
    goTo('background');
    unmount();
    jest.setSystemTime(Date.now() + DAY);
    mount(<SessionScreen />);
    expect(sheetOpen()).toBe(true);
    expect(sheet().props).toMatchObject({ answered: 1, total: 10 });
    expect(active().finishedAt).toBeUndefined();
    press('Keep going untimed');
    expect(sheetOpen()).toBe(false);
    unmount();
    mount(<SessionScreen />);
    expect(sheetOpen()).toBe(false); // answered: never again
    expect(strip().clock).toBe('untimed');
  });

  it('time running out in the same second as "Check answer": the answer is recorded once', () => {
    startPractice('cisa', { count: 10, countdownSec: 60 });
    mount(<SessionScreen />);
    const first = active().questionIds[0];
    tick(9 * MIN + 59 * S + 500);
    pickFirst();
    tick(499); // 1 ms before zero
    press('Check answer');
    expect(Object.keys(active().responses)).toEqual([first]);
    expect(selectCert(useProgress.getState(), 'cisa').answers[first].attempts).toBe(1);
    // Checked in time: the clock stopped just short of zero and stays there while they read.
    expect(stageOf(saved())).toBe('running');
    expect(remainingMs(saved())).toBeLessThanOrEqual(S);
    tick(5 * MIN);
    expect(sheetOpen()).toBe(false);
    // The next question starts: zero arrives, once, with one question answered.
    press('Next question');
    tick(2 * S);
    expect(sheetOpen()).toBe(true);
    expect(saved().expiredAfter).toBe(1);
    expect(Object.keys(active().responses)).toEqual([first]);
    expect(selectCert(useProgress.getState(), 'cisa').answers[first].attempts).toBe(1);
  });
});

describe('Results says truthfully how the time went', () => {
  const line = () => root().findAll((n) => n.props.testID === 'results-countdown');

  it('ran out, kept going untimed', () => {
    startPractice('cisa', { count: 10, countdownSec: 60 });
    mount(<SessionScreen />);
    answerFirst();
    press('Next question');
    tick(10 * MIN + S);
    press('Keep going untimed');
    answerFirst();
    unmount();
    act(() => {
      useSession.getState().finish();
    });
    mount(<Results />);
    expect(allText()).toContain('Time ran out after 1 of 10. You kept going untimed.');
    expect(line().length).toBeGreaterThan(0);
    // Quiet ink: the line never takes a colour of its own (so never the miss colour).
    const words = line()[0].findAll((n) => n.props.accessibilityLabel === 'Time ran out after 1 of 10. You kept going untimed.');
    expect(words.length).toBeGreaterThan(0);
    expect(words.every((n) => n.props.color === undefined)).toBe(true);
  });

  it('ran out, finished there; and a set with no countdown has no such line', () => {
    startPractice('cisa', { count: 10, countdownSec: 60 });
    mount(<SessionScreen />);
    answerFirst();
    press('Next question');
    tick(10 * MIN + S);
    press('Finish now');
    unmount();
    mount(<Results />);
    expect(allText()).toContain('Time ran out after 1 of 10. You finished there.');
    unmount();
    useSession.getState().clear();
    startPractice('cisa', { count: 3, timed: true });
    mount(<SessionScreen />);
    answerFirst();
    unmount();
    act(() => {
      useSession.getState().finish();
    });
    mount(<Results />);
    expect(line()).toHaveLength(0);
    expect(allText()).not.toContain('Time ran out');
  });
});

describe('the other timers are as they were', () => {
  it('count-up practice: the same strip, and no time’s-up sheet exists', () => {
    startPractice('cisa', { count: 3, timed: true });
    mount(<SessionScreen />);
    expect(clock()).toBe('00:00');
    tick(45 * S);
    expect(clock()).toBe('00:45');
    expect(strip().clockUnit).toBe('so far');
    expect(root().findAllByType(TimesUpSheet)).toHaveLength(0);
    tick(3 * 60 * MIN);
    expect(active().finishedAt).toBeUndefined();
  });

  it('untimed practice: no strip and no sheet', () => {
    startPractice('cisa', { count: 3 });
    mount(<SessionScreen />);
    expect(root().findAllByType(PaceStrip)).toHaveLength(0);
    expect(root().findAllByType(TimesUpSheet)).toHaveLength(0);
  });

  it('a mock exam: its deadline still submits it by itself, and it never shows the practice sheet', () => {
    startMock('cisa', 5);
    const deadline = active().deadline!;
    mount(<SessionScreen />);
    expect(strip().clockUnit).toBe('left');
    expect(root().findAllByType(TimesUpSheet)).toHaveLength(0);
    tick(deadline - Date.now() - 2 * S);
    expect(active().finishedAt).toBeUndefined();
    tick(3 * S);
    // Submitted on the clock, as before: unanswered count as not correct, and the result is saved.
    expect(active().finishedAt).toBeDefined();
    expect(active().countdown).toBeUndefined();
    expect(selectCert(useProgress.getState(), 'cisa').mocks[0]).toMatchObject({ total: 5, correct: 0, unanswered: 5 });
    expect(root().findAllByType(TimesUpSheet)).toHaveLength(0);
  });
});
