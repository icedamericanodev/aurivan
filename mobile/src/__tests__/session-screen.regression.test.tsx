/**
 * Regression for the lint cleanup that changed real logic:
 *  - SessionScreen reads the clock once on mount and resets per-question
 *    state during render (not in an effect);
 *  - LessonPlayer clears its "checked" gate in the same tap that changes scene.
 * Both screens are rendered with react-test-renderer against the real stores.
 *
 * Gotcha: zustand's persist `set` returns a promise, so never write
 * `act(() => store.action())` — the returned promise turns it into an
 * un-awaited async act and later updates silently stop rendering. Use braces.
 */
import { Profiler } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { startFromIds, startMock } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import LessonPlayer from '../app/lesson/[id]';
import { OptionCard, Verdict } from '../components/quiz';

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
    useSharedValue: (v: unknown) => ({ value: v }),
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
const mockReplace = jest.fn();
let mockLessonId = '';
jest.mock('expo-router', () => ({
  router: { replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), push: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({ id: mockLessonId }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const ids = getAllQuestions('cisa').slice(0, 3).map((q) => q.id);
let r: ReactTestRenderer | undefined;
let commits = 0;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(<Profiler id="p" onRender={() => { commits++; }}>{el}</Profiler>);
  });
};
const root = () => r!.root;
const btn = (label: string) =>
  root().findAll((n) => (n.props.label === label || n.props.accessibilityLabel === label) && typeof n.props.onPress === 'function')[0];
const press = (label: string) => act(() => { btn(label).props.onPress(); });
const cards = () => root().findAllByType(OptionCard);
const picked = () => cards().filter((n) => n.props.state === 'selected').length;
const clockLabel = () =>
  root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Time remaining'))[0]
    .props.accessibilityLabel as string;

beforeEach(() => {
  jest.useFakeTimers();
  commits = 0;
  mockReplace.mockClear();
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  act(() => { r?.unmount(); });
  r = undefined;
  jest.useRealTimers();
});

describe('practice: the next question starts clean', () => {
  it('clears the pick, verdict, confidence and Coach me, with no render loop', () => {
    startFromIds('cisa', ids, 'T');
    mount(<SessionScreen />);
    const first = useSession.getState().active!.questionIds[0];
    act(() => { cards()[0].props.onPress(); });
    expect(picked()).toBe(1);
    press('Sure');
    press('Check answer');
    expect(root().findAllByType(Verdict)).toHaveLength(1);
    expect(useSession.getState().active!.responses[first].confidence).toBe('sure');
    act(() => { useSession.getState().markCoached(first); });

    const before = commits;
    press('Next question');
    expect(useSession.getState().active!.index).toBe(1);
    expect(commits - before).toBeLessThanOrEqual(3); // reset-in-render costs one extra pass, not a loop
    expect(root().findAllByType(Verdict)).toHaveLength(0);
    expect(picked()).toBe(0);
    expect(btn('Check answer').props.disabled).toBe(true);
    // Confidence chips only appear after a pick, and the new pick starts unrated.
    act(() => { cards()[1].props.onPress(); });
    press('Check answer');
    const second = useSession.getState().active!.questionIds[1];
    expect(useSession.getState().active!.responses[second].confidence).toBeUndefined();
    expect(useSession.getState().active!.responses[second].assisted).toBeUndefined();
  });

  it('Coach me opened on Q1 does not carry over to Q2', () => {
    startFromIds('cisa', ids, 'T');
    mount(<SessionScreen />);
    const hasCoach = () => root().findAll((n) => n.props.accessibilityLabel === 'Coach me').length > 0;
    expect(hasCoach()).toBe(true);
    press('Coach me');
    expect(hasCoach()).toBe(false);
    act(() => { useSession.getState().goTo(1); });
    expect(useSession.getState().active!.coached).toEqual([ids[0]]);
    expect(hasCoach()).toBe(true); // Q2 offers Coach me again
  });
});

describe('mock exam: clock, resume, navigator', () => {
  it('the clock ticks every second and auto-submits at the deadline', () => {
    jest.setSystemTime(new Date(2026, 9, 7, 9, 0, 0));
    startMock('cisa', 3);
    mount(<SessionScreen />);
    const start = clockLabel();
    act(() => { jest.advanceTimersByTime(3000); });
    const ms = useSession.getState().active!.deadline! - Date.now();
    expect(clockLabel()).not.toBe(start);
    expect(useSession.getState().active!.finishedAt).toBeUndefined();
    act(() => { jest.advanceTimersByTime(ms + 1000); });
    expect(clockLabel()).toBe('Time remaining 00:00');
    expect(useSession.getState().active!.finishedAt).toBeDefined();
    expect(mockReplace).toHaveBeenCalledWith('/results');
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('a mock resumed after a kill (fresh mount, deadline already passed) submits at once', () => {
    jest.setSystemTime(new Date(2026, 9, 7, 9, 0, 0));
    startMock('cisa', 3);
    jest.setSystemTime(new Date(2026, 9, 7, 12, 0, 0)); // app reopened after the deadline
    mount(<SessionScreen />);
    expect(useSession.getState().active!.finishedAt).toBeDefined();
  });

  it('a resumed mock shows the saved pick, and the navigator jump shows each saved pick', () => {
    startMock('cisa', 3);
    const s = useSession.getState().active!;
    useSession.getState().answer(s.questionIds[0], { display: 'B', correct: false });
    useSession.getState().answer(s.questionIds[2], { display: 'C', correct: false });
    useSession.getState().toggleFlag(s.questionIds[2]);
    mount(<SessionScreen />); // fresh mount = app reopened
    expect(cards().find((n) => n.props.state === 'selected')!.props.letter).toBe('B');
    act(() => { useSession.getState().goTo(2); });
    expect(cards().find((n) => n.props.state === 'selected')!.props.letter).toBe('C');
    expect(btn('Unflag question')).toBeDefined();
    act(() => { useSession.getState().goTo(1); });
    expect(picked()).toBe(0);
    expect(root().findAllByType(Verdict)).toHaveLength(0); // never feedback in a mock
  });
});

describe('spaced review', () => {
  it('a miss is filed for review and a confident correct answer promotes it', () => {
    const qid = ids[0];
    useProgress.getState().recordAnswer('cisa', qid, false, undefined);
    const box1 = selectCert(useProgress.getState(), 'cisa').review[qid].box;
    useProgress.getState().recordAnswer('cisa', qid, true, 'sure');
    expect(selectCert(useProgress.getState(), 'cisa').review[qid].box).toBeGreaterThan(box1);
  });
});

describe('lesson player: the quick-check gate', () => {
  const lesson = CISA_LESSONS.find((l) => l.scenes.some((sc, i) => sc.type === 'check' && i > 0))!;
  const checkAt = lesson.scenes.findIndex((sc, i) => sc.type === 'check' && i > 0);
  const fwd = () => (checkAt === lesson.scenes.length - 1 ? 'Finish lesson' : 'Next');

  it('locks the check, unlocks after answering, and re-locks when the check is revisited', () => {
    mockLessonId = lesson.id;
    mount(<LessonPlayer />);
    expect(btn('Back').props.disabled).toBe(true);
    for (let i = 0; i < checkAt; i++) press('Next');
    expect(btn(fwd()).props.disabled).toBe(true);
    act(() => { cards()[0].props.onPress(); });
    expect(btn(fwd()).props.disabled).toBe(false);
    press('Back'); // the scene before the check is never gated
    expect(btn('Next').props.disabled).toBe(false);
    press('Next'); // revisit: the check re-mounts unanswered and is gated again
    expect(cards().every((n) => n.props.state === 'idle')).toBe(true);
    expect(btn(fwd()).props.disabled).toBe(true);
  });
});
