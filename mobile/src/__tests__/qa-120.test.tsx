/**
 * QA for mobile 1.20 (PR #58): the critical journeys around the new
 * lessons ⇄ notes links, walked through the real screens and stores.
 *
 *  1. practice → wrong answer (real "Check answer") → Read the note → Back:
 *     the same answer and explanation, the answer counted ONCE, one mistake;
 *  2. kill the app on the note page → reopen → resume: the session, its
 *     answer and the note row come back (the session store survives; the
 *     note page writes nothing to it);
 *  3. a session saved by 1.19 with the old `support` flag still loads and
 *     offers the note (no crash, no old "A short read…" row);
 *  4. a lesson's Report a problem never shows on an UNANSWERED check;
 *  5. readiness "Lessons and notes ›" → Learn: checked against expo-router's
 *     OWN StackRouter (the one app/_layout.tsx's <Stack> runs): the root
 *     stack must hold ONE (tabs) afterwards. As committed in 7e685d1,
 *     router.navigate stacked a second (tabs) navigator (QA report, S1);
 *  6. a set started from a note / Lesson complete that sits ABOVE an old
 *     session or Results: exactly one session screen is left mounted and
 *     Results opens once. As committed, the old session screen stayed under
 *     the note and both screens replaced to /results (QA report, S2).
 *
 * Screens that would be stacked are mounted side by side (one renderer
 * each); the router mock mounts / unmounts them as expo-router would.
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())`, use braces.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { lessonPreparing, lessonsFor } from '../content/lessons';
import { findQuestion } from '../content/loader';
import { findNote, noteDomain } from '../content/notes';
import { originalToDisplay, displayToOriginal } from '../engine/shuffle';
import { LETTERS } from '../content/types';
import { finishSession } from '../lib/finishSession';
import { startFromIds } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import SessionScreen from '../app/session';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import ReadinessReport from '../app/readiness';
import LessonPlayer from '../app/lesson/[id]';
import Results from '../app/results';
import { OptionCard } from '../components/quiz';
import { getCertification } from '../content/certifications';

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
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismissTo: jest.fn(),
    dismissAll: jest.fn(),
    canGoBack: () => true,
    canDismiss: () => true,
    setParams: jest.fn(),
  },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const push = router.push as jest.Mock;
const replace = router.replace as jest.Mock;
const navigate = router.navigate as jest.Mock;
const dismissTo = router.dismissTo as jest.Mock;
const dismissAll = router.dismissAll as jest.Mock;

// ── Renderers: several screens can be mounted at once, like a real stack ──
const screens: ReactTestRenderer[] = [];
const mount = (el: React.ReactElement): ReactTestRenderer => {
  let r: ReactTestRenderer;
  act(() => {
    r = create(el);
  });
  screens.push(r!);
  return r!;
};
const unmount = (r: ReactTestRenderer) =>
  act(() => {
    r.unmount();
    screens.splice(screens.indexOf(r), 1);
  });
const textOf = (r: ReactTestRenderer) => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r.root);
  return out.join(' ');
};
/** The outermost pressable whose label (visible or spoken) matches. */
const pressables = (r: ReactTestRenderer, label: string | RegExp) => {
  const match = (v: unknown) => typeof v === 'string' && (typeof label === 'string' ? v === label : label.test(v));
  const hits = r.root.findAll((n) => typeof n.props.onPress === 'function' && (match(n.props.accessibilityLabel) || match(n.props.label)));
  const set = new Set(hits);
  const inside = (n: ReactTestInstance) => {
    for (let p = n.parent; p; p = p.parent) if (set.has(p)) return true;
    return false;
  };
  return hits.filter((n) => !inside(n));
};
const press = (r: ReactTestRenderer, label: string | RegExp) => {
  const hit = pressables(r, label)[0];
  if (!hit) throw new Error(`nothing to press: ${String(label)}`);
  act(() => {
    hit.props.onPress();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  [push, replace, navigate, dismissTo, dismissAll].forEach((m) => m.mockReset());
  mockParams = {};
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
});
afterEach(() => {
  while (screens.length) unmount(screens[screens.length - 1]);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── Fixtures from the real content ──────────────────────────────────────
/** A question a study note lists (and that is in the bank). */
const noted = (() => {
  for (const d of ['1', '2', '3', '4', '5'])
    for (const t of noteDomain('cisa', d)?.topics ?? [])
      for (const s of t.subtopics) for (const q of s.practiceIds ?? []) if (findQuestion('cisa', q)) return { qid: q, sub: s.id, name: s.name };
  throw new Error('no noted question');
})();
/** A second noted question in another subtopic (so a set has two questions). */
const noted2 = (() => {
  for (const d of ['1', '2', '3', '4', '5'])
    for (const t of noteDomain('cisa', d)?.topics ?? [])
      for (const s of t.subtopics)
        for (const q of s.practiceIds ?? []) if (q !== noted.qid && s.id !== noted.sub && findQuestion('cisa', q)) return { qid: q, sub: s.id };
  throw new Error('no second noted question');
})();

/** Tap the option on screen that is right (or wrong), then "Check answer": the learner's real path. */
const answerByUi = (r: ReactTestRenderer, right: boolean) => {
  const a = useSession.getState().active!;
  const qid = a.questionIds[a.index];
  const q = findQuestion('cisa', qid)!;
  const perm = a.perms[qid];
  const display = right
    ? originalToDisplay(q.correct, perm)
    : LETTERS.slice(0, perm.length).find((d) => displayToOriginal(d, perm) !== q.correct)!;
  act(() => {
    r.root.findAllByType(OptionCard).find((n) => n.props.letter === display)!.props.onPress();
  });
  press(r, 'Check answer');
};
const cp = () => selectCert(useProgress.getState(), 'cisa');

// ── 1. Practice → wrong → note → Back ───────────────────────────────────
describe('journey: practice miss → Read the note → Back', () => {
  it('the same answer and explanation are there, and the answer was counted once', () => {
    startFromIds('cisa', [noted.qid, noted2.qid], 'Quick 10');
    const session = mount(<SessionScreen />);
    answerByUi(session, false);
    expect(cp().answers[noted.qid]).toMatchObject({ attempts: 1, correctCount: 0 });
    expect(Object.keys(cp().mistakes)).toEqual([noted.qid]);
    const before = textOf(session);

    // Read the note (pushed): the note page mounts ABOVE the session, which stays mounted.
    // Copy renamed in the UX pass (mobile 1.20): the spoken label names the reading time and "the idea".
    press(session, new RegExp(`^Read the note: ${noted.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, about \\d+ minutes?, the idea this question tests$`));
    expect(push).toHaveBeenLastCalledWith(`/notes/subtopic/${encodeURIComponent(noted.sub)}`);
    mockParams = { id: noted.sub };
    const note = mount(<NoteSubtopicScreen />);
    expect(textOf(note)).toContain(noted.name);
    press(note, 'Mark as read'); // reading writes progress, never the session
    // Back.
    unmount(note);

    const s = useSession.getState().active!;
    expect(s.index).toBe(0);
    expect(Object.keys(s.responses)).toEqual([noted.qid]);
    expect(textOf(session)).toBe(before); // explanation, note row, footer: unchanged
    expect(pressables(session, 'Next question')).toHaveLength(1); // not "Check answer" again
    expect(cp().answers[noted.qid]).toMatchObject({ attempts: 1, correctCount: 0 });
    expect(Object.keys(cp().mistakes)).toEqual([noted.qid]);
    expect(replace).not.toHaveBeenCalled();
  });
});

// ── 2. Kill on the note page → reopen → resume ─────────────────────────
describe('journey: kill the app on the note page, then resume', () => {
  it('the saved session comes back on the same answer, with the note row, nothing counted twice', async () => {
    jest.useRealTimers(); // the storage mock resolves on real timers
    startFromIds('cisa', [noted.qid, noted2.qid], 'Quick 10');
    const session = mount(<SessionScreen />);
    answerByUi(session, false);
    press(session, /^Read the note: /);
    mockParams = { id: noted.sub };
    mount(<NoteSubtopicScreen />);
    const saved = useSession.getState().active!;
    // Let the persisted write land, then "kill": every screen goes, memory is wiped.
    await new Promise((res) => setTimeout(res, 20));
    while (screens.length) unmount(screens[screens.length - 1]);
    const raw = (await AsyncStorage.getItem('aurivan.session.v1'))!;
    expect(JSON.parse(raw).state.active.id).toBe(saved.id);
    // Memory wiped (this write is the test's, not the app's: put the saved copy back, as the phone kept it).
    useSession.setState({ active: null });
    await AsyncStorage.setItem('aurivan.session.v1', raw);
    await useSession.persist.rehydrate();

    // Reopen → Today → Resume pushes /session (no route params are involved).
    const again = mount(<SessionScreen />);
    const s = useSession.getState().active!;
    expect(s.id).toBe(saved.id);
    expect(s.index).toBe(0);
    expect(s.responses[noted.qid]).toMatchObject({ correct: false });
    expect(pressables(again, /^Read the note: /)).toHaveLength(1);
    expect(pressables(again, 'Next question')).toHaveLength(1);
    expect(cp().answers[noted.qid].attempts).toBe(1);
  });
});

// ── 3. A 1.19 save with the old `support` flag ─────────────────────────
describe('saves: a session saved by 1.19 (Smart, with `support`) still loads', () => {
  it('resumes on a missed weak spot: the 1.20 note row, not the old support row', async () => {
    jest.useRealTimers();
    startFromIds('cisa', [noted.qid, noted2.qid], 'Smart practice');
    const s0 = useSession.getState().active!;
    const q = findQuestion('cisa', noted.qid)!;
    const wrong = LETTERS.slice(0, s0.perms[noted.qid].length).find((d) => displayToOriginal(d, s0.perms[noted.qid]) !== q.correct)!;
    // The 1.19 shape: Smart path, a "weak" reason, support on, one wrong answer.
    const old = {
      ...s0,
      path: { mode: 'smart', scope: 'all' },
      reasons: { [noted.qid]: 'weak', [noted2.qid]: 'new' },
      support: true,
      responses: { [noted.qid]: { display: wrong, correct: false, ms: 30_000 } },
    };
    useSession.setState({ active: null });
    await AsyncStorage.setItem('aurivan.session.v1', JSON.stringify({ state: { active: old }, version: 1 }));
    await useSession.persist.rehydrate();
    expect(useSession.getState().active!.support).toBe(true);
    const session = mount(<SessionScreen />);
    expect(pressables(session, /^Read the note: /)).toHaveLength(1);
    expect(textOf(session)).not.toContain('A short read, then try more like this');
    // And it carries on.
    press(session, 'Next question');
    expect(useSession.getState().active!.index).toBe(1);
  });
});

// ── 4. Lesson player: Report a problem waits for the check ─────────────
describe('lesson player: Report a problem on a check scene', () => {
  const lesson = lessonsFor('cisa').find((l) => l.scenes.findIndex((s) => s.type === 'check') > 0)!;
  const checkAt = lesson.scenes.findIndex((s) => s.type === 'check');

  it('is absent until the check is answered (it never hints at the answer), then names the step', () => {
    mockParams = { id: lesson.id };
    const r = mount(<LessonPlayer />);
    for (let i = 0; i < checkAt; i++) {
      press(r, 'Next');
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    expect(r.root.findAllByType(OptionCard).length).toBeGreaterThan(0);
    // The full row waits for the answer; mobile 1.22: the header's flag is there on every scene.
    expect(pressables(r, 'Report a problem with this lesson step')).toHaveLength(0);
    expect(pressables(r, 'Report a problem with this step')).toHaveLength(1);
    act(() => {
      r.root.findAllByType(OptionCard)[0].props.onPress();
    });
    expect(pressables(r, 'Report a problem with this lesson step')).toHaveLength(1);
  });
});

// ── 5 + A. Readiness → Learn, against expo-router's real stack router ──
/**
 * A model of the ROOT stack, run by expo-router's own StackRouter (the one
 * app/_layout.tsx's <Stack> uses). Only the mapping from an href to the
 * root-level action is modelled, as expo-router's getNavigateAction makes it:
 * from a pushed root screen (readiness), "/learn" diverges at the root
 * stack, so the action targets the root with name "(tabs)".
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { StackRouter } = require('expo-router/build/layouts/StackClient');
type Route = { key: string; name: string; params?: Record<string, unknown> };
type StackState = { key: string; index: number; routes: Route[]; routeNames: string[]; preloadedRoutes: Route[] };
const ROOT_NAMES = ['(tabs)', 'readiness', 'session', 'results', 'notes/subtopic/[id]', 'lesson/[id]'];
const TABS = ['home', 'learn', 'play', 'practice', 'you'];
const rootOptions = { routeNames: ROOT_NAMES, routeParamList: {}, routeGetIdList: {} };
const makeRoot = () => {
  const sr = StackRouter({});
  let state: StackState = sr.getInitialState(rootOptions);
  const apply = (type: string, name: string, params?: Record<string, unknown>) => {
    const next = sr.getStateForAction(state, { type, payload: { name, params } }, rootOptions);
    if (next) state = next;
  };
  const toRoot = (href: string | { pathname: string; params?: Record<string, string> }) => {
    const pathname = typeof href === 'string' ? href : href.pathname;
    const params = typeof href === 'string' ? undefined : href.params;
    const tab = pathname.replace(/^\//, '');
    return TABS.includes(tab) ? { name: '(tabs)', params: { screen: tab, params } } : { name: tab, params };
  };
  return {
    get state() {
      return state;
    },
    push: (href: string) => apply('PUSH', toRoot(href).name, toRoot(href).params),
    navigate: (href: Parameters<typeof toRoot>[0]) => apply('NAVIGATE', toRoot(href).name, toRoot(href).params),
    dismissTo: (href: Parameters<typeof toRoot>[0]) => apply('POP_TO', toRoot(href).name, toRoot(href).params),
    tabsCount: () => state.routes.filter((r) => r.name === '(tabs)').length,
    names: () => state.routes.map((r) => r.name),
  };
};

describe('router model (expo-router StackRouter): reaching a tab from a pushed screen', () => {
  it('navigate stacks a SECOND (tabs) on top; dismissTo returns to the one already there', () => {
    const a = makeRoot();
    a.push('/readiness');
    a.navigate({ pathname: '/learn', params: { domain: '3' } });
    expect(a.names()).toEqual(['(tabs)', 'readiness', '(tabs)']);
    expect(a.tabsCount()).toBe(2);

    const b = makeRoot();
    b.push('/readiness');
    b.dismissTo({ pathname: '/learn', params: { domain: '3' } });
    expect(b.names()).toEqual(['(tabs)']);
    expect(b.state.routes[0].params).toEqual({ screen: 'learn', params: { domain: '3' } });
  });
});

describe('readiness "Lessons and notes ›" → Learn (real root StackRouter)', () => {
  it('leaves ONE (tabs) in the root stack, on Learn with ?domain=', () => {
    const stack = makeRoot();
    stack.push('/readiness');
    navigate.mockImplementation((href) => stack.navigate(href));
    dismissTo.mockImplementation((href) => stack.dismissTo(href));
    push.mockImplementation((href) => stack.push(href));
    const r = mount(<ReadinessReport />);
    const d = getCertification('cisa')!.domains[2];
    press(r, `Lessons and notes for ${d.name}`);
    expect(stack.names()).toEqual(['(tabs)']);
    expect(stack.state.routes[0].params).toEqual({ screen: 'learn', params: { domain: d.id } });
  });
});

// ── 6. Starting a set from a screen that sits above a session / Results ──
/** The screens above the tabs, bottom to top, each in its own renderer. */
let above: { kind: string; r: ReactTestRenderer }[] = [];
const open = (kind: string, el: React.ReactElement) => {
  const r = mount(el);
  above.push({ kind, r });
  return r;
};
const close = (e: { kind: string; r: ReactTestRenderer }) => {
  unmount(e.r);
  above = above.filter((x) => x !== e);
};
const sessionsMounted = () => above.filter((e) => e.kind === 'session').length;
const resultsCalls = () => replace.mock.calls.filter(([to]) => to === '/results').length;
/** The router as expo-router runs it for these screens (root stack only). */
const wireStack = () => {
  above = [];
  push.mockImplementation((href: string) => {
    if (href === '/session') open('session', <SessionScreen />);
  });
  replace.mockImplementation((href: string) => {
    if (href !== '/session') return;
    const top = above[above.length - 1];
    if (top) close(top);
    open('session', <SessionScreen />);
  });
  dismissAll.mockImplementation(() => {
    while (above.length) close(above[above.length - 1]);
  });
};
const discardAndStart = () =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
    buttons?.find((b) => b.style === 'destructive')?.onPress?.();
  });
/** A question a lesson prepares for (so a miss offers "Review the lesson"). */
const prepped = (() => {
  for (const l of lessonsFor('cisa')) for (const q of l.prepares ?? []) if (findQuestion('cisa', q)) return { qid: q, lesson: l };
  throw new Error('no prepared question');
})();

describe('a set started above an old session or Results', () => {
  afterEach(() => {
    above = [];
  });

  it('session → miss → Read the note → Practice this concept → Discard and start: one session screen, Results once', () => {
    wireStack();
    discardAndStart();
    startFromIds('cisa', [noted.qid, noted2.qid], 'Quick 10');
    const first = open('session', <SessionScreen />);
    answerByUi(first, false);
    press(first, /^Read the note: /);
    mockParams = { id: noted.sub };
    const note = open('note', <NoteSubtopicScreen />);
    press(note, 'Practice this concept');
    expect(Alert.alert).toHaveBeenCalledWith('Replace your unfinished session?', expect.any(String), expect.any(Array));
    expect(useSession.getState().active!.title).toBe(noted.name);
    expect(sessionsMounted()).toBe(1);
    act(() => {
      finishSession();
    });
    expect(resultsCalls()).toBe(1);
  });

  it('session → miss → Review the lesson → Practice this topic → Discard and start: one session screen, Results once', () => {
    wireStack();
    discardAndStart();
    startFromIds('cisa', [prepped.qid], 'Quick 10');
    const first = open('session', <SessionScreen />);
    answerByUi(first, false);
    press(first, /^Take the lesson: /); // was "Review the lesson:", then "Lesson:" (1.20), now "Take the lesson:" (1.22)
    mockParams = { id: prepped.lesson.id };
    const player = open('lesson', <LessonPlayer />);
    const scenes = prepped.lesson.scenes;
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].type === 'check') {
        act(() => {
          player.root.findAllByType(OptionCard)[0].props.onPress();
        });
      }
      press(player, i === scenes.length - 1 ? 'Finish lesson' : 'Next');
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    expect(textOf(player)).toContain('Lesson complete');
    press(player, /^Practice /);
    expect(Alert.alert).toHaveBeenCalled();
    expect(sessionsMounted()).toBe(1);
    act(() => {
      finishSession();
    });
    expect(resultsCalls()).toBe(1);
  });

  it('Results → Read the notes for what you missed → note → Practice this concept: the old Results is not left under the new set', () => {
    wireStack();
    startFromIds('cisa', [noted.qid], 'Quick 10');
    const first = open('session', <SessionScreen />);
    answerByUi(first, false);
    act(() => {
      finishSession();
    });
    close(above[0]); // Session replaced by Results
    const results = open('results', <Results />);
    press(results, 'Notes for what you missed'); // was "Read the notes for what you missed" before the UX pass
    press(results, /^Read the note: /);
    mockParams = { id: noted.sub };
    const note = open('note', <NoteSubtopicScreen />);
    press(note, 'Practice this concept'); // a finished session: no question asked
    expect(above.map((e) => e.kind)).toEqual(['session']);
  });
});

// Fixture guards.
it('fixtures resolve', () => {
  expect(findNote('cisa', noted.sub)).toBeDefined();
  expect(findNote('cisa', noted2.sub)).toBeDefined();
  expect(lessonPreparing('cisa', noted.qid) === undefined || typeof lessonPreparing('cisa', noted.qid)!.id === 'string').toBe(true);
});
