/**
 * QA Build C — the quiet data, collected through the real screens.
 *
 * quiet-data.test.tsx covers the clock and the store on their own. Here the
 * session screen and the three games are rendered against the real stores,
 * the app goes to the background mid-question, and we check what lands on
 * the answer record:
 * - practice, review and mock (including going back to a question) record
 *   `ms`, with background time left out;
 * - Snare Spotter, Sure Footing and Signpost record `ms` too;
 * - `masteredAt` needs unassisted correct answers on two different days:
 *   not one day, not Coach me, not games — and a mock counts on the day it
 *   was taken.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { AppState, type AppStateStatus } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import SessionScreen from '../app/session';
import TrapSpotter from '../app/game/trap';
import SureFooting from '../app/game/sprint';
import Signpost from '../app/game/priority';
import { OptionCard } from '../components/quiz';
import { getAllQuestions } from '../content/loader';
import { noteSubtopics, subtopicOfQuestion } from '../content/notes';
import { originalToDisplay } from '../engine/shuffle';
import { finishSession } from '../lib/finishSession';
import { startFromIds, startMock, startReview } from '../lib/sessions';
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
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const T0 = new Date(2026, 9, 5, 9, 0, 0).getTime(); // Mon 5 Oct 2026, 09:00 local
const DAY = 24 * 3_600_000;
const S = 1000;

// AppState: every screen's listener, so the test can send the app to the background.
const listeners = new Set<(s: AppStateStatus) => void>();
const appGoes = (state: AppStateStatus) =>
  act(() => {
    listeners.forEach((l) => l(state));
  });
let clock = T0;
const wait = (ms: number) => {
  clock += ms;
  jest.setSystemTime(clock);
};
/** Background for `ms`, then back in front. */
const away = (ms: number) => {
  appGoes('background');
  wait(ms);
  appGoes('active');
};

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const press = (label: string) =>
  act(() => {
    root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0].props.onPress();
  });
const cards = () => root().findAllByType(OptionCard);
const tap = (o: ReactTestInstance) =>
  act(() => {
    o.props.onPress();
  });
const answers = () => selectCert(useProgress.getState(), 'cisa').answers;
const session = () => useSession.getState().active!;
const qidAt = (i: number) => session().questionIds[i];
const goTo = (i: number) =>
  act(() => {
    useSession.getState().goTo(i);
  });

beforeEach(() => {
  clock = T0;
  jest.useFakeTimers({ now: T0 });
  listeners.clear();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
    listeners.add(fn as (s: AppStateStatus) => void);
    return { remove: () => listeners.delete(fn as (s: AppStateStatus) => void) } as ReturnType<typeof AppState.addEventListener>;
  });
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', gameRulesSeen: ['trap', 'sprint', 'priority'] });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  useSession.getState().clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── Practice and review ──────────────────────────────────────────────────
describe('answer time: practice and review', () => {
  it('practice: shown → Check answer, background left out, saved with the confidence', () => {
    startFromIds('cisa', getAllQuestions('cisa').slice(0, 3).map((q) => q.id), 'T');
    mount(<SessionScreen />);
    const q = qidAt(0);
    wait(6 * S);
    away(90 * S); // a phone call
    wait(4 * S);
    tap(cards()[1]);
    press('Unsure');
    wait(2 * S);
    press('Check answer');
    expect(answers()[q]).toMatchObject({ ms: 12 * S, lastConfidence: 'unsure' });
    expect(session().responses[q].ms).toBe(12 * S);
    // The next question starts its own clock.
    press('Next question');
    wait(3 * S);
    tap(cards()[0]);
    press('Check answer');
    expect(answers()[qidAt(1)].ms).toBe(3 * S);
  });

  it('review: the due question is timed the same way', () => {
    const ids = getAllQuestions('cisa').slice(10, 12).map((q) => q.id);
    useProgress.getState().queueForReview('cisa', ids);
    startReview('cisa');
    expect(session().mode).toBe('review');
    mount(<SessionScreen />);
    const q = qidAt(0);
    wait(5 * S);
    away(10 * 60 * S); // locked the phone for 10 minutes
    wait(3 * S);
    tap(cards()[2]);
    press('Sure');
    press('Check answer');
    expect(answers()[q]).toMatchObject({ ms: 8 * S, lastConfidence: 'sure' });
  });

  it('time spent while "inactive" (control centre) is left out too', () => {
    startFromIds('cisa', [getAllQuestions('cisa')[20].id], 'T');
    mount(<SessionScreen />);
    wait(2 * S);
    appGoes('inactive');
    wait(40 * S);
    appGoes('active');
    wait(1 * S);
    tap(cards()[0]);
    press('Check answer');
    expect(answers()[qidAt(0)].ms).toBe(3 * S);
  });
});

// ── Mock exams ───────────────────────────────────────────────────────────
describe('answer time: mock exam (no feedback, revisits allowed)', () => {
  it('changing the answer in one visit counts from when the question was shown', () => {
    startMock('cisa', 3);
    mount(<SessionScreen />);
    const q = qidAt(0);
    wait(20 * S);
    tap(cards()[0]);
    expect(session().responses[q].ms).toBe(20 * S);
    wait(5 * S);
    tap(cards()[1]); // changed my mind, same visit
    expect(session().responses[q].ms).toBe(25 * S);
  });

  it('going back and changing the answer ADDS the new visit; background is left out', () => {
    startMock('cisa', 3);
    mount(<SessionScreen />);
    const q = qidAt(0);
    wait(30 * S);
    tap(cards()[0]); // visit 1: 30 s
    goTo(1);
    wait(50 * S);
    tap(cards()[2]); // Q2: 50 s
    goTo(0);
    wait(4 * S);
    away(5 * 60 * S);
    wait(6 * S);
    tap(cards()[3]); // visit 2: 10 s more
    expect(session().responses[q].ms).toBe(40 * S);
    expect(session().responses[qidAt(1)].ms).toBe(50 * S);
    // Submitted: the answer records keep the totals.
    act(() => {
      finishSession();
    });
    expect(answers()[q].ms).toBe(40 * S);
    expect(answers()[qidAt(1)].ms).toBe(50 * S);
  });

  it('a paused mock resumed later keeps the earlier time and adds the new visit', () => {
    startMock('cisa', 3);
    mount(<SessionScreen />);
    const q = qidAt(0);
    wait(12 * S);
    tap(cards()[0]);
    act(() => {
      r!.unmount();
    }); // Pause → Today; the app may even be closed
    r = undefined;
    wait(30 * 60 * S);
    mount(<SessionScreen />);
    wait(5 * S);
    tap(cards()[1]);
    expect(session().responses[q].ms).toBe(17 * S);
  });

  // BUG (Minor): a mock visit that ends WITHOUT an answer (read it, flagged
  // it, moved on) is not counted. The learner reads Q1 for 60 s, skips it,
  // comes back and answers in 10 s: the record says 10 s. The session store
  // documents "Mock exams add up every visit until the last change of
  // answer", and the commit says "a mock adds up every visit to a question".
  // Cause: session.tsx only writes `ms` inside pick(); the time of a visit is
  // dropped when the question changes without a pick.
  it.failing('a first visit without an answer still counts when the learner comes back and answers', () => {
    startMock('cisa', 3);
    mount(<SessionScreen />);
    const q = qidAt(0);
    wait(60 * S); // read it, not sure
    act(() => {
      useSession.getState().toggleFlag(q);
    });
    goTo(1);
    wait(20 * S);
    tap(cards()[0]);
    goTo(0);
    wait(10 * S);
    tap(cards()[1]);
    expect(session().responses[q].ms).toBe(70 * S);
  });
});

// ── Games ────────────────────────────────────────────────────────────────
describe('answer time: games (background left out, never mastery)', () => {
  const onlyAnswer = () => {
    const recs = Object.values(answers());
    expect(recs).toHaveLength(1);
    return recs[0];
  };

  it('Snare Spotter: from the question to the final answer (both steps)', () => {
    mount(<TrapSpotter />);
    wait(7 * S);
    tap(cards()[0]); // step 1: which option is the snare?
    away(2 * 60 * S);
    wait(5 * S);
    const open = cards().find((c) => !c.props.disabled)!;
    tap(open); // step 2: the answer
    expect(onlyAnswer().ms).toBe(12 * S);
    expect(selectCert(useProgress.getState(), 'cisa').mastery).toBeUndefined();
  });

  it('Sure Footing: timed, and the footing is kept as the confidence', () => {
    mount(<SureFooting />);
    wait(4 * S);
    press('Lean: plus 2 if right, minus 1 if wrong');
    away(45 * S);
    wait(2 * S);
    tap(cards()[0]);
    expect(onlyAnswer()).toMatchObject({ ms: 6 * S, lastConfidence: 'unsure' });
  });

  it('Signpost: timed from the question, through step 1, to the answer', () => {
    mount(<Signpost />);
    wait(3 * S);
    const meaning = root().findAll((n) => n.props.kind === 'secondary' && typeof n.props.onPress === 'function' && typeof n.props.label === 'string')[0];
    act(() => {
      meaning.props.onPress();
    });
    away(20 * S);
    wait(5 * S);
    tap(cards()[0]);
    expect(onlyAnswer().ms).toBe(8 * S);
  });
});

// ── masteredAt through the screens ───────────────────────────────────────
describe('masteredAt: two different days, unassisted, not games', () => {
  const note = noteSubtopics('cisa').find((s) => (s.practiceIds ?? []).length >= 4)!;
  const ids = note.practiceIds!;
  const mastery = () => selectCert(useProgress.getState(), 'cisa').mastery?.[note.id];

  /** Answer the one question of a practice session correctly (or not), optionally after Coach me. */
  function practiceOne(id: string, opts: { correct?: boolean; coach?: boolean } = {}) {
    startFromIds('cisa', [id], 'T');
    mount(<SessionScreen />);
    if (opts.coach) press('Coach me');
    const q = getAllQuestions('cisa').find((x) => x.id === id)!;
    const right = originalToDisplay(q.correct, session().perms[id]);
    const letter = opts.correct === false ? (right === 'A' ? 'B' : 'A') : right;
    tap(cards().find((c) => c.props.letter === letter)!);
    press('Check answer');
    act(() => {
      r!.unmount();
    });
    r = undefined;
    useSession.getState().clear();
  }

  it('one day of correct answers is not enough; a second day sets it', () => {
    practiceOne(ids[0]);
    wait(2 * 3_600_000);
    practiceOne(ids[1]);
    expect(mastery()).toMatchObject({ firstDay: '2026-10-05' });
    expect(mastery()?.masteredAt).toBeUndefined();
    wait(DAY);
    practiceOne(ids[2]);
    expect(mastery()).toMatchObject({ firstDay: '2026-10-05', masteredAt: '2026-10-06' });
  });

  it('Coach me on day 2 does not count; wrong answers do not count', () => {
    practiceOne(ids[0]);
    wait(DAY);
    practiceOne(ids[1], { coach: true });
    practiceOne(ids[2], { correct: false });
    expect(answers()[ids[1]].lastAssisted).toBe(true);
    expect(mastery()).toMatchObject({ firstDay: '2026-10-05' });
    expect(mastery()?.masteredAt).toBeUndefined();
  });

  it('a mock answered on another day counts (no Coach me in a mock)', () => {
    practiceOne(ids[0]);
    wait(DAY);
    // A mock whose questions include one from this subtopic.
    const s = startMock('cisa', 3)!;
    const swapped = { ...s, questionIds: [ids[1], ...s.questionIds.slice(1)], perms: { ...s.perms, [ids[1]]: ['A', 'B', 'C', 'D'] as const } };
    act(() => {
      useSession.getState().start(swapped as typeof s);
    });
    const q = getAllQuestions('cisa').find((x) => x.id === ids[1])!;
    act(() => {
      useSession.getState().answer(ids[1], { display: q.correct, correct: true, ms: 30 * S });
    });
    act(() => {
      finishSession();
    });
    expect(mastery()?.masteredAt).toBe('2026-10-06');
  });

  // BUG (Minor): a mock is graded when it is SUBMITTED, and an expired mock is
  // only submitted when the learner opens it again. Every answer is then
  // stamped with that later day: a learner who practised subtopic X on Monday
  // and answered an X question in a Monday mock, then reopened the app on
  // Wednesday, gets masteredAt = Wednesday — mastery from ONE day of answers.
  // Cause: lib/finishSession.ts records mock answers with recordAnswer, which
  // uses Date.now() (store/progress.ts:196), not the exam's end time (endedAt,
  // which finishSession already computes for the mock result).
  it.failing('an expired mock reopened two days later does not create mastery from one day of answers', () => {
    practiceOne(ids[0]); // Monday 09:00
    const s = startMock('cisa', 3)!;
    const swapped = { ...s, questionIds: [ids[1], ...s.questionIds.slice(1)], perms: { ...s.perms, [ids[1]]: ['A', 'B', 'C', 'D'] as const } };
    act(() => {
      useSession.getState().start(swapped as typeof s);
    });
    const q = getAllQuestions('cisa').find((x) => x.id === ids[1])!;
    act(() => {
      useSession.getState().answer(ids[1], { display: q.correct, correct: true, ms: 30 * S });
    });
    // The app is closed; the mock's deadline passes. Wednesday the learner opens it.
    wait(2 * DAY);
    mount(<SessionScreen />); // the screen sees the deadline passed and submits
    expect(useSession.getState().active?.finishedAt).toBeDefined();
    expect(mastery()?.masteredAt).toBeUndefined();
  });

  it('subtopicOfQuestion: the note used here really owns these questions', () => {
    for (const id of ids) expect(subtopicOfQuestion('cisa', id)).toBe(note.id);
  });
});
