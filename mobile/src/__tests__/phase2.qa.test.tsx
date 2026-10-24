/**
 * QA, Uplift Phase 2 (mobile 1.8): motion foundations, touch, the answer
 * loop and the UI quick fixes, walked as journeys on REAL content.
 *
 * Most journeys run twice: with the phone's motion ON (the page turn really
 * waits 120 ms with the old page on screen, the risky path) and with Reduce
 * Motion ON (the shared jest mock's default). Fake timers drive the turn.
 *
 * Real bugs were pinned with `it.failing` (the test describes the RIGHT
 * behaviour). All three are fixed in the review round and now run as plain
 * tests, each with a "Was a bug" note.
 *
 * Gotcha: never `act(() => store.action())` (zustand persist returns a
 * promise, which turns act async). Use braces.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Alert, AccessibilityInfo, Dimensions, StyleSheet, View } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import SessionScreen from '../app/session';
import Results from '../app/results';
import GuidedStep from '../app/guided';
import Settings from '../app/settings';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import Practice from '../app/(tabs)/practice';
import Play from '../app/(tabs)/play';
import LessonPlayer from '../app/lesson/[id]';
import CanopyCall from '../app/game/canopy';
import FieldGuide from '../app/game/field';
import SteppingStones from '../app/game/stones';
import CallItFirst from '../app/game/callit';
import { GrowthRings } from '../components/glyphs';
import { PageTurn, Pop, setSystemReducedMotionForTest, StateLayer } from '../components/motion';
import { MatchTile } from '../components/game';
import { OptionCard, Verdict } from '../components/quiz';
import { Stem } from '../components/ui';
import { getCertification } from '../content/certifications';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { getNotes } from '../content/notes';
import { findQuestion, getAllQuestions } from '../content/loader';
import { LETTERS, type Letter } from '../content/types';
import { readBackup } from '../engine/backup';
import { spokenClockCoarse } from '../engine/pace';
import { DAY_MS, dueIds, type ReviewEntry } from '../engine/srs';
import { displayToOriginal, originalToDisplay } from '../engine/shuffle';
import { ensureTodayPlan } from '../lib/activity';
import { finishSession } from '../lib/finishSession';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { fieldTerms } from '../engine/games/fieldGuide';
import { scopeTopics } from '../lib/outline';
import { startFromIds, startMock, startReview } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
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
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: {
    replace: (...a: unknown[]) => mockReplace(...a),
    push: (...a: unknown[]) => mockPush(...a),
    back: jest.fn(),
    canGoBack: () => true,
    canDismiss: () => false,
    dismissTo: jest.fn(),
    setParams: jest.fn(),
  },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View: V } = jest.requireActual('react-native');
  return { SafeAreaView: V, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
}));
// Today's Exam-ready state (the real rule needs a week of logged readiness).
let mockReady = false;
jest.mock('../lib/moments', () => ({
  ...jest.requireActual('../lib/moments'),
  useTodayMoments: () => ({ ready: mockReady, dismissReady: () => {}, moment: null, reminders: null, pace: '' }),
}));

// Spied before anything mounts: motion.tsx registers the phone's Reduce Motion listener once per app.
const addA11yListener = jest.spyOn(AccessibilityInfo, 'addEventListener');
const phoneReduceMotion = (on: boolean) => {
  const calls = addA11yListener.mock.calls as unknown as [string, (v: boolean) => void][];
  const call = calls.find((c) => c[0] === 'reduceMotionChanged');
  if (!call) throw new Error('motion.tsx never listened for reduceMotionChanged');
  act(() => {
    call[1](on);
  });
};

// ── Rendering helpers ────────────────────────────────────────────────────
let r: ReactTestRenderer | undefined;
let r2: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
    r2?.unmount();
  });
  r = undefined;
  r2 = undefined;
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
const pressables = (from: ReactTestInstance = root()) =>
  from.findAll((n) => typeof n.props.onPress === 'function' && (typeof n.props.label === 'string' || typeof n.props.accessibilityLabel === 'string'));
const btn = (label: string | RegExp, from?: ReactTestInstance) =>
  pressables(from).find((n) =>
    [n.props.label, n.props.accessibilityLabel].some((l) => typeof l === 'string' && (typeof label === 'string' ? l === label : label.test(l))),
  );
const press = (label: string | RegExp, from?: ReactTestInstance) => {
  const b = btn(label, from);
  if (!b) throw new Error(`No button "${String(label)}"`);
  act(() => {
    b.props.onPress();
  });
};
const flat = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
const tick = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

// Session screen helpers
const active = () => useSession.getState().active!;
const stem = () => root().findAllByType(Stem).map((n) => n.props.children as string);
const cards = () => root().findAllByType(OptionCard);
const card = (d: Letter) => cards().find((n) => n.props.letter === d && typeof n.props.onPress === 'function');
const pageTurn = () => root().findAllByType(PageTurn)[0];
/** The PageTurn's own animated wrapper (its first View). */
const turnWrapper = () => pageTurn().findAllByType(View)[0];
const turning = () => flat(turnWrapper()).pointerEvents === 'none';
/** The display letter that is (or is not) the key, for the question on screen. */
const letterFor = (qid: string, right: boolean): Letter => {
  const s = active();
  const q = findQuestion('cisa', qid)!;
  const perm = s.perms[qid];
  const shown = LETTERS.slice(0, perm.length);
  return right ? originalToDisplay(q.correct, perm) : shown.find((d) => displayToOriginal(d, perm) !== q.correct)!;
};

const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
  });
};

const motionOn = (on: boolean) => {
  setMockReducedMotion(!on);
  setSystemReducedMotionForTest(null);
};

const CISA = getCertification('cisa')!;
const ALL = getAllQuestions('cisa');
/** Two questions from each of the five domains: ten real questions. */
const TEN = CISA.domains.flatMap((d) => ALL.filter((q) => q.domainId === d.id).slice(5, 7)).map((q) => q.id);

let alertSpy: jest.SpyInstance;
beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 11, 9, 0, 0));
  setFontScale(1);
  motionOn(false); // the mock's default: Reduce Motion on
  mockReady = false;
  mockParams = {};
  mockReplace.mockClear();
  mockPush.mockClear();
  (Haptics.impactAsync as jest.Mock).mockClear();
  (Haptics.selectionAsync as jest.Mock).mockClear();
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', theme: 'light', motion: 'system', haptics: true, shuffleOptions: true });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  unmount();
  alertSpy.mockRestore();
  // Only when this test kept fake timers (a few switch to real ones for storage).
  if ('clock' in setTimeout) jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ══ Journey 1: practice, 10 questions, fast "Next" taps ═══════════════
describe.each([
  ['motion on', true],
  ['Reduce Motion', false],
])('J1 practice, 10 real questions, double taps on Next (%s)', (_name, on) => {
  beforeEach(() => motionOn(on));

  it('grades every question on its ORIGINAL letter, shows each once in order, and Results agrees', () => {
    act(() => {
      startFromIds('cisa', TEN, 'Practice · All domains');
    });
    // Shuffle is on: at least one question's options really moved.
    expect(TEN.some((id) => active().perms[id].join('') !== LETTERS.slice(0, active().perms[id].length).join(''))).toBe(true);
    mount(<SessionScreen />);

    const seen: string[] = [];
    const expected: Record<string, boolean> = {};
    for (let i = 0; i < 10; i++) {
      const qid = active().questionIds[i];
      expect(active().index).toBe(i);
      // The page on screen is this question (never the last one, never a skip).
      expect(stem()).toEqual([findQuestion('cisa', qid)!.stem]);
      expect(turning()).toBe(false);
      seen.push(qid);

      const right = i % 2 === 0;
      expected[qid] = right;
      const d = letterFor(qid, right);
      act(() => {
        card(d)!.props.onPress();
      });
      press('Check answer');
      const resp = active().responses[qid];
      expect(resp.display).toBe(d);
      expect(resp.correct).toBe(right);
      // The answer screen marks the key at its SHUFFLED letter.
      const q = findQuestion('cisa', qid)!;
      const best = cards().find((n) => n.props.state === 'correct');
      expect(best?.props.letter).toBe(originalToDisplay(q.correct, active().perms[qid]));
      if (!right) {
        // The journal files the ORIGINAL letter picked, not the display one.
        const m = selectCert(useProgress.getState(), 'cisa').mistakes[qid];
        expect(m).toBeDefined();
        expect(JSON.stringify(m)).toContain(displayToOriginal(d, active().perms[qid]));
      }
      expect(root().findAllByType(Verdict)).toHaveLength(1);

      if (i < 9) {
        // A double tap: the same handler twice before the screen re-renders...
        const next = btn('Next question')!.props.onPress as () => void;
        act(() => {
          next();
          next();
        });
        expect(active().index).toBe(i + 1);
        if (on) {
          // Mid-turn: the OLD page fades out and can't be tapped, but stays readable.
          expect(turning()).toBe(true);
          expect(turnWrapper().props.importantForAccessibility).not.toBe('no-hide-descendants');
          expect(stem()).toEqual([]); // the old page was the answer screen (no stem)
          // The footer follows the page on screen: still "Next question", and a
          // third tap a moment later does nothing.
          expect(btn('Check answer')).toBeUndefined();
          press('Next question');
          expect(active().index).toBe(i + 1);
          tick(motion.dur.select);
        }
        // The new question: a disabled "Check answer".
        expect(btn('Next question')).toBeUndefined();
        expect(btn('Check answer')!.props.disabled).toBe(true);
        expect(turning()).toBe(false);
      } else {
        const done = btn('See results')!.props.onPress as () => void;
        act(() => {
          done();
          done();
        });
      }
    }
    expect(seen).toEqual(TEN);
    expect(new Set(seen).size).toBe(10);
    expect(mockReplace.mock.calls.filter((c) => c[0] === '/results')).toHaveLength(1);
    // Recorded once per question (a double tap on "See results" never records twice).
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toHaveLength(10);

    unmount();
    mount(<Results />);
    const label = root().find((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Score ')).props
      .accessibilityLabel as string;
    expect(label).toMatch(/^Score 50 percent\./);
    for (const dom of CISA.domains) {
      const ids = TEN.filter((id) => findQuestion('cisa', id)!.domainId === dom.id);
      const ok = ids.filter((id) => expected[id]).length;
      expect(label).toContain(`${dom.short} ${ok} of ${ids.length}`);
    }
    expect(btn('Practice the 5 you missed')).toBeDefined();
  });
});

// ══ Journey 2: mock exam, Previous/Next mid-turn, flags, kill, finish ═══
describe('J2 mock exam with motion on', () => {
  beforeEach(() => motionOn(true));

  it('Previous/Next (calm turns), flags, navigator, a kill and resume, and Finish → Results', async () => {
    const T0 = new Date(2026, 9, 11, 9, 0, 0).getTime();
    act(() => {
      startMock('cisa', 6);
    });
    const ids = [...active().questionIds];
    const stemOf = (i: number) => findQuestion('cisa', ids[i])!.stem;
    mount(<SessionScreen />);
    expect(stem()).toEqual([stemOf(0)]);

    // Q1: right, flagged.
    const a0 = letterFor(ids[0], true);
    act(() => {
      card(a0)!.props.onPress();
    });
    press('Flag question');
    expect(active().responses[ids[0]].correct).toBe(true);
    expect(root().findAllByType(Verdict)).toHaveLength(0); // never feedback in a mock

    // Next, then Previous: a mock turns calmly (a short fade, no leaving
    // phase), so every tap lands on a settled page, as in the real exam.
    press('Next');
    expect(turning()).toBe(false);
    expect(stem()).toEqual([stemOf(1)]);
    press('Previous question');
    expect(active().index).toBe(0);
    expect(turning()).toBe(false);
    expect(stem()).toEqual([stemOf(0)]);
    expect(cards().find((n) => n.props.state === 'selected')!.props.letter).toBe(a0);
    expect(btn('Unflag question')).toBeDefined();

    // Q2 wrong, Q3 skipped + flagged, Q4 right.
    press('Next');
    tick(motion.dur.select);
    expect(stem()).toEqual([stemOf(1)]);
    const a1 = letterFor(ids[1], false);
    act(() => {
      card(a1)!.props.onPress();
    });
    press('Next');
    tick(motion.dur.select);
    expect(stem()).toEqual([stemOf(2)]);
    expect(cards().filter((n) => n.props.state === 'selected')).toHaveLength(0);
    press('Flag question');
    press('Next');
    tick(motion.dur.select);
    const a3 = letterFor(ids[3], true);
    act(() => {
      card(a3)!.props.onPress();
    });

    // Navigator: back to Q2 (a backwards turn), its pick still there.
    press('Questions, question navigator');
    expect(btn('Question 1, answered, flagged')).toBeDefined();
    expect(btn('Question 3, not answered, flagged')).toBeDefined();
    press('Question 2, answered');
    tick(motion.dur.select);
    expect(stem()).toEqual([stemOf(1)]);
    expect(cards().find((n) => n.props.state === 'selected')!.props.letter).toBe(a1);

    // ── Kill the app, 5 minutes pass, reopen ──
    const before = JSON.parse(JSON.stringify(active()));
    unmount();
    // What is on disk when the app dies (the store writes on every change).
    const disk = await AsyncStorage.getItem('aurivan.session.v1');
    expect(disk).not.toBeNull();
    // A cold start: empty memory, the same disk, 5 minutes later.
    act(() => {
      useSession.setState({ active: null });
    });
    await AsyncStorage.setItem('aurivan.session.v1', disk!);
    jest.setSystemTime(T0 + 5 * 60_000);
    await act(async () => {
      await useSession.persist.rehydrate();
    });
    expect(active().index).toBe(1);
    expect(active().responses).toEqual(before.responses);
    expect(active().flagged).toEqual(before.flagged);
    expect(active().deadline).toBe(before.deadline);
    mount(<SessionScreen />);
    expect(stem()).toEqual([stemOf(1)]);
    expect(cards().find((n) => n.props.state === 'selected')!.props.letter).toBe(a1);
    const clock = root().find((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Time left')).props
      .accessibilityLabel as string;
    expect(clock.startsWith(`Time left ${spokenClockCoarse(before.deadline - Date.now())}`)).toBe(true);

    // Jump to the last question and finish.
    press('Questions, question navigator');
    press(/^Question 6, /);
    tick(motion.dur.select);
    expect(stem()).toEqual([stemOf(5)]);
    press('Finish');
    const [title, body, buttons] = alertSpy.mock.calls.at(-1)!;
    expect(title).toBe('Submit exam?');
    expect(body).toMatch(/You have 3 unanswered questions/);
    act(() => {
      (buttons as { text: string; onPress?: () => void }[]).find((b) => b.text === 'Submit')!.onPress!();
    });
    expect(active().finishedAt).toBeDefined();
    expect(mockReplace).toHaveBeenCalledWith('/results');

    unmount();
    mount(<Results />);
    const label = root().find((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Score ')).props
      .accessibilityLabel as string;
    // 2 right of 6 (unanswered count as wrong in a mock).
    expect(label).toMatch(/^Score 33 percent\./);
  });

  it('a double tap on Next in a mock moves exactly as many questions as taps, and lands on a settled page', () => {
    act(() => {
      startMock('cisa', 6);
    });
    mount(<SessionScreen />);
    press('Next');
    press('Next'); // mid-turn
    expect(active().index).toBe(2);
    tick(motion.dur.select);
    expect(turning()).toBe(false);
    expect(stem()).toEqual([findQuestion('cisa', active().questionIds[2])!.stem]);
  });

  // Was a bug (fixed): the option rows were reused from question to question
  // (keyed by letter), so the previous pick's ink ring and badge started ON on
  // the next, unanswered question. Each page is now a fresh subtree.
  it('the next question arrives with no ghost of the previous pick (ring and badge start off)', () => {
    act(() => {
      startMock('cisa', 6);
    });
    mount(<SessionScreen />);
    const ids = active().questionIds;
    const pick = letterFor(ids[0], true);
    act(() => {
      card(pick)!.props.onPress();
    });
    press('Next');
    tick(motion.dur.select); // the swap: the new question's first frame
    expect(stem()).toEqual([findQuestion('cisa', ids[1])!.stem]);
    const row = card(pick)!;
    expect(row.props.state).toBe('idle');
    const layers = row.findAllByType(StateLayer);
    expect(layers.every((l) => l.props.on === false)).toBe(true);
    // What is DRAWN on that first frame: each layer's opacity.
    const drawn = layers.map((l) => flat(l.findAllByType(View)[0]).opacity);
    expect(drawn).toEqual(drawn.map(() => 0));
  });
});

// ══ Journey 3: Guided "Next topic" page turn ══════════════════════════
describe.each([
  ['motion on', true],
  ['Reduce Motion', false],
])('J3 Guided "Next topic" (%s)', (_name, on) => {
  beforeEach(() => motionOn(on));

  it('turns to the next topic once (even on a double tap), read from the top', () => {
    mount(<GuidedStep />);
    const heading = () =>
      root()
        .findAll((n) => n.props.accessibilityRole === 'header' && n.props.v === 'hero')
        .map((n) => textOf(n));
    const first = heading()[0];
    const topics = scopeTopics('cisa');
    const nextBtn = btn(/^Next topic: /)!;
    const nextName = (nextBtn.props.label as string).replace(/^Next topic: /, '');
    expect(first).not.toBe(nextName);
    const moveOn = nextBtn.props.onPress as () => void;
    act(() => {
      moveOn();
      moveOn();
    });
    const cursor = selectCert(useProgress.getState(), 'cisa').studyPath?.guided?.all;
    expect(topics.find((t) => t.id === cursor)?.name).toBe(nextName);
    if (on) {
      expect(turning()).toBe(true);
      expect(heading()).toEqual([first]); // the old topic is still leaving
      tick(motion.dur.select);
    }
    expect(turning()).toBe(false);
    expect(heading()).toEqual([nextName]);
    // The footer starts the topic on screen.
    expect(btn('Start this step')!.props.accessibilityHint).toContain(nextName);
  });
});

// ══ Journey 4: Settings → Motion ══════════════════════════════════════

/** Mobile 1.17: Settings → Appearance → Motion is a row that opens the choices in a sheet. */
const openMotionRow = (at: ReactTestInstance) =>
  act(() => {
    at.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && String(n.props.accessibilityLabel).startsWith('Motion, '))[0].props.onPress();
  });

describe('J4 Settings → Motion', () => {
  const startThree = () => {
    act(() => {
      startFromIds('cisa', TEN.slice(0, 3), 'Practice');
    });
    mount(<SessionScreen />);
  };
  const answerAndNext = () => {
    const qid = active().questionIds[active().index];
    act(() => {
      card(letterFor(qid, true))!.props.onPress();
    });
    press('Check answer');
    press('Next question');
  };

  it('"Reduced" applies at once to a screen that is already open (no restart), and "Match my phone" undoes it', () => {
    motionOn(true);
    startThree();
    act(() => {
      r2 = create(<Settings />);
    });
    // Mobile 1.17: each choice closes the Motion sheet, so it is opened before each one.
    const radio = (title: string) => {
      if (!r2!.root.findAll((n) => n.props.accessibilityRole === 'radio').length) openMotionRow(r2!.root);
      return r2!.root.findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel?.startsWith(title))[0];
    };
    const reducedRow = radio('Reduced');
    act(() => {
      reducedRow.props.onPress();
    });
    expect(useSettings.getState().motion).toBe('reduced');
    expect(radio('Reduced').props.accessibilityState.checked).toBe(true);
    answerAndNext();
    expect(turning()).toBe(false); // a cross-fade, no 120 ms wait with the old page
    expect(stem()).toEqual([findQuestion('cisa', TEN[1])!.stem]);
    const matchRow = radio('Match my phone');
    act(() => {
      matchRow.props.onPress();
    });
    answerAndNext();
    expect(turning()).toBe(true); // full motion again
    tick(motion.dur.select);
    expect(stem()).toEqual([findQuestion('cisa', TEN[2])!.stem]);
  });

  it('the phone’s own Reduce Motion switch changes an open session live, and Settings says so', () => {
    motionOn(true);
    startThree();
    act(() => {
      r2 = create(<Settings />);
    });
    openMotionRow(r2!.root);
    const match = () => r2!.root.findAll((n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityLabel?.startsWith('Match my phone'))[0];
    expect(match().props.accessibilityLabel).not.toMatch(/Reduce Motion is on/);
    phoneReduceMotion(true);
    expect(match().props.accessibilityLabel).toMatch(/Reduce Motion is on/);
    answerAndNext();
    expect(turning()).toBe(false);
    phoneReduceMotion(false);
    answerAndNext();
    expect(turning()).toBe(true);
    tick(motion.dur.select);
  });

  it('the choice is in a backup; restoring it applies it; an older backup without it keeps this phone’s choice', async () => {
    jest.useRealTimers();
    act(() => {
      useSettings.getState().setMotion('reduced');
      useSettings.getState().setTheme('dark');
    });
    const file = JSON.parse(JSON.stringify(currentBackup(Date.now())));
    expect(file.stores.settings.state.motion).toBe('reduced');

    act(() => {
      useSettings.getState().setMotion('system');
    });
    const ok = checkBackupText(JSON.stringify(file));
    if (ok.kind !== 'ok') throw new Error(`refused: ${ok.code}`);
    await act(async () => {
      expect((await restoreBackup(ok.data, { fresh: true })).kind).toBe('ok');
    });
    expect(useSettings.getState().motion).toBe('reduced');

    // A 1.7 file has no motion key: it restores, and this phone's Reduced
    // choice (an accessibility setting) is kept, not silently undone.
    const old = JSON.parse(JSON.stringify(file));
    delete old.stores.settings.state.motion;
    const ok2 = checkBackupText(JSON.stringify(old));
    if (ok2.kind !== 'ok') throw new Error(`old file refused: ${ok2.code}`);
    await act(async () => {
      expect((await restoreBackup(ok2.data, { fresh: true })).kind).toBe('ok');
    });
    expect(useSettings.getState().motion).toBe('reduced');
    expect(useSettings.getState().theme).toBe('dark'); // the rest of the file still applies
  });

  it('an unknown motion value in a backup is refused (the whole file, nothing applied)', () => {
    const file = JSON.parse(JSON.stringify(currentBackup(Date.now())));
    for (const bad of ['bouncy', 'Reduced', 1, true, {}]) {
      file.stores.settings.state.motion = bad;
      const out = checkBackupText(JSON.stringify(file));
      expect(out.kind).toBe('error');
      expect(() => readBackup(JSON.stringify(file), ['cisa', 'cism', 'crisc', 'aaia', 'cissp'])).toThrow();
    }
  });

  it('an older on-phone save (no motion key) loads as "Match my phone" and keeps everything else', async () => {
    jest.useRealTimers();
    const version = useSettings.persist.getOptions().version;
    // A fresh launch: memory at the defaults (this write goes to disk too, so the old save is written after it).
    act(() => {
      useSettings.setState(useSettings.getInitialState());
    });
    await AsyncStorage.setItem(
      'aurivan.settings.v1',
      JSON.stringify({ state: { onboarded: true, activeCertId: 'cisa', theme: 'dark', dailyGoal: 30, haptics: false }, version }),
    );
    await act(async () => {
      await useSettings.persist.rehydrate();
    });
    expect(useSettings.getState().motion).toBe('system');
    expect(useSettings.getState().theme).toBe('dark');
    expect(useSettings.getState().dailyGoal).toBe(30);
  });
});

// ══ Journey 5: the quick fixes ════════════════════════════════════════
describe('J5 quick fixes', () => {
  /** `n` reviews due now, plus `later` falling due at 13:00 today. */
  const seedReviews = (n: number, later = 0) => {
    const now = Date.now();
    const review: Record<string, ReviewEntry> = {};
    ALL.slice(0, n).forEach((q) => (review[q.id] = { box: 2, dueAt: now - DAY_MS, lastSeen: now - 2 * DAY_MS, reps: 1 }));
    ALL.slice(n, n + later).forEach((q) => (review[q.id] = { box: 2, dueAt: now + 4 * 3_600_000, lastSeen: now - DAY_MS, reps: 1 }));
    act(() => {
      useProgress.setState((s) => ({ days: {}, byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, review } } }));
    });
  };
  /** The review count each screen shows. */
  const todayReview = () => {
    mount(<Today />);
    // Mobile 1.21: the panel says "Questions to revisit" / "16 of 55 due · most overdue first" (no count in the title).
    const m = allText().match(/Review (\d+) due|\d+ of (\d+) due|(\d+) questions? to revisit/);
    unmount();
    return m ? Number(m[1] ?? m[2] ?? m[3]) : null;
  };
  const trailDue = (Screen: () => React.ReactElement | null) => {
    mount(<Screen />);
    const row = root().find((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Questions to revisit, ') && typeof n.props.onPress === 'function');
    const m = (row.props.accessibilityLabel as string).match(/Questions to revisit, (\d+) due/);
    unmount();
    return m ? Number(m[1]) : null;
  };

  it('Today in the Exam-ready state draws the rings once, in the panel', () => {
    mockReady = true;
    mount(<Today />);
    const rings = root().findAllByType(GrowthRings);
    expect(rings).toHaveLength(1);
    expect(rings[0].props.colors).toBe('#A9D9BA'); // the panel's own rings (sap), not the readiness row's
  });

  it('Review counts agree on Today, Practice and You when the day starts (55 due)', () => {
    seedReviews(55);
    act(() => {
      ensureTodayPlan('cisa');
    });
    expect(todayReview()).toBe(55);
    expect(trailDue(Practice)).toBe(55);
    expect(trailDue(You)).toBe(55);
  });

  // Was a bug (fixed): Today's review title was frozen with the morning's plan
  // while Practice and You count live. Today now names the live queue.
  it('Review counts still agree after some reviews are done mid-day', () => {
    seedReviews(55, 5);
    act(() => {
      ensureTodayPlan('cisa');
    });
    // Do 10 of today's reviews right, then stop (the item is not finished yet).
    act(() => {
      startReview('cisa');
    });
    const s = active();
    s.questionIds.slice(0, 10).forEach((id) => {
      act(() => {
        useProgress.getState().recordAnswer('cisa', id, true, 'sure');
      });
    });
    act(() => {
      useSession.getState().clear();
    });
    jest.setSystemTime(Date.now() + 5 * 3_600_000); // 14:00: 5 more fell due at 13:00
    const live = dueIds(selectCert(useProgress.getState(), 'cisa').review, Date.now()).length;
    expect(live).toBe(50);
    expect(trailDue(You)).toBe(live);
    expect(trailDue(Practice)).toBe(live);
    expect(todayReview()).toBe(live); // Today still says 55
  });

  it('"Also today" shows minutes (a paused 10-question practice: about 12 min)', () => {
    act(() => {
      startFromIds('cisa', TEN, 'Practice · All domains');
    });
    mount(<Today />);
    expect(allText()).toMatch(/Also today About \d+ min/);
    expect(allText()).not.toMatch(/Also today \d+ more/);
  });

  // Was a bug (fixed): a paused TIMED mock added its unanswered questions at
  // 1.2 min each, even with far less time left on the exam clock.
  it('"Also today" never promises more time than a paused mock has left on its clock', () => {
    const T0 = Date.now();
    act(() => {
      startMock('cisa', 50);
    });
    const left = active().deadline! - T0;
    jest.setSystemTime(active().deadline! - 5 * 60_000); // paused, 5 minutes left
    expect(left).toBeGreaterThan(5 * 60_000);
    mount(<Today />);
    const m = allText().match(/Also today About (\d+) min/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeLessThanOrEqual(5);
  });

  it('You with no mocks offers "Start a mini mock" (a third of the exam), and not once a mock is done', () => {
    mount(<You />);
    expect(allText()).toContain('No mocks yet');
    press('Start a mini mock');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/mock-start', params: { questions: String(Math.round(CISA.exam.questions / 3)) } });
    unmount();
    // Finish a small mock through the real finish path (it files the mock in history).
    act(() => {
      startMock('cisa', 3);
    });
    act(() => {
      finishSession();
    });
    mount(<You />);
    expect(allText()).not.toContain('No mocks yet');
    expect(btn('Start a mini mock')).toBeUndefined();
  });

  it('a one-domain practice played through the screen: Results shows no ring (mobile 1.39) and the right button copy', () => {
    const d2 = ALL.filter((q) => q.domainId === CISA.domains[1].id).slice(0, 4).map((q) => q.id);
    act(() => {
      startFromIds('cisa', d2, 'Practice · one domain');
    });
    mount(<SessionScreen />);
    d2.forEach((qid, i) => {
      act(() => {
        card(letterFor(qid, i !== 2))!.props.onPress();
      });
      press('Check answer');
      press(i === 3 ? 'See results' : 'Next question');
    });
    unmount();
    mount(<Results />);
    // Mobile 1.39: the domain rings only for a mixed-domain set or a mock.
    expect(root().findAllByType(GrowthRings)).toHaveLength(0);
    // Four questions are a handful (mobile 1.24, UX review S7): the count is said once, in the headline,
    // never repeated as "All IT Governance · 3 of 4".
    expect(allText()).toContain('3 of 4 right');
    expect(allText()).not.toContain(`All ${CISA.domains[1].short} ·`);
    expect(btn('Practice the one you missed')).toBeDefined();
  });

  it('every lesson’s first scene has no Back; the second one has it', () => {
    for (const lesson of CISA_LESSONS.slice(0, 5)) {
      mockParams = { id: lesson.id };
      mount(<LessonPlayer />);
      expect(btn('Back')).toBeUndefined();
      expect(btn('Previous step')).toBeUndefined();
      const nextBtn = btn('Next');
      if (nextBtn && !nextBtn.props.disabled) {
        press('Next');
        // Mobile 1.22: the round "Previous step" (a full "Back" pill on a check).
        expect(btn(lesson.scenes[1].type === 'check' ? 'Back' : 'Previous step')).toBeDefined();
      }
      unmount();
    }
  });

  it('Play says "All at Seedling" exactly once for a new learner', () => {
    mount(<Play />);
    expect(allText().match(/All at Seedling/g)).toHaveLength(1);
  });
});

// ══ Journey 6: bookmark pop and haptic ════════════════════════════════
describe.each([
  ['motion on', true],
  ['Reduce Motion', false],
])('J6 bookmark (%s)', (_name, on) => {
  beforeEach(() => motionOn(on));

  it('saving pops the mark and taps once; un-saving is silent; Haptics off silences it', () => {
    act(() => {
      startFromIds('cisa', TEN.slice(0, 2), 'Practice');
    });
    mount(<SessionScreen />);
    const qid = active().questionIds[0];
    const pop = () => root().findAllByType(Pop).find((n) => n.props.trigger !== undefined)!;
    const popStyle = () => flat(pop().findAllByType(View)[0]);
    expect(pop().props.trigger).toBe(0);

    press('Save question');
    expect(selectCert(useProgress.getState(), 'cisa').bookmarks).toContain(qid);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(pop().props.trigger).toBe(1);
    act(() => {
      r!.update(<SessionScreen />);
    });
    expect(popStyle().opacity).toBe(1);
    expect(popStyle().transform).toEqual([{ scale: 1 }]); // the end state, either way

    press('Remove from saved');
    expect(selectCert(useProgress.getState(), 'cisa').bookmarks).not.toContain(qid);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(pop().props.trigger).toBe(1); // no pop for un-saving

    act(() => {
      useSettings.setState({ haptics: false });
    });
    press('Save question');
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1); // silenced
    expect(pop().props.trigger).toBe(2); // the pop is visual, it stays
  });
});

// ══ Journey 7: games that use MatchTile / OptionCard selection ═════════
describe.each([
  ['motion on', true],
  ['Reduce Motion', false],
])('J7 game regressions (%s)', (_name, on) => {
  beforeEach(() => motionOn(on));
  const rerender = (el: React.ReactElement) =>
    act(() => {
      r!.update(el);
    });
  /** A tap the way a finger does it: press in, press, press out. */
  const tap = (n: ReactTestInstance) =>
    act(() => {
      n.props.onPressIn?.({ nativeEvent: {} });
      n.props.onPress();
      n.props.onPressOut?.({ nativeEvent: {} });
    });
  /** The tile's own box (the Pressable that carries its name). */
  const tileBox = (t: ReactTestInstance) => flat(pressables(t)[0]);
  const ringOpacity = (t: ReactTestInstance) => flat(t.findAllByType(StateLayer)[0].findAllByType(View)[0]).opacity;
  const xOf = (t: ReactTestInstance) =>
    (flat(t.findAllByType(View)[0]).transform as Record<string, number>[] | undefined)?.find((s) => 'translateX' in s)?.translateX ?? 0;

  it('Field Guide: the picked term shows its ring (a layer), the tile never resizes, and a wrong pair shakes and settles at rest', () => {
    const defOf = new Map(fieldTerms(getNotes('cisa')).map((t) => [t.term, t.definition]));
    mount(<FieldGuide />);
    press('Start');
    const tiles = () => root().findAllByType(MatchTile);
    const terms = () => tiles().filter((t) => /^Term \d of 4: /.test(t.props.spoken));
    const boxBefore = tileBox(terms()[0]);
    tap(pressables(terms()[0])[0]);
    rerender(<FieldGuide />);
    const picked = terms()[0];
    expect(picked.props.state).toBe('selected');
    expect(pressables(picked)[0].props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(picked.findAllByType(StateLayer)[0].props.on).toBe(true);
    expect(ringOpacity(picked)).toBe(1);
    // Selecting never reflows the tile: same border and padding.
    const boxAfter = tileBox(picked);
    expect([boxAfter.borderWidth, boxAfter.paddingVertical, boxAfter.paddingHorizontal]).toEqual([
      boxBefore.borderWidth,
      boxBefore.paddingVertical,
      boxBefore.paddingHorizontal,
    ]);
    for (const t of terms().slice(1)) expect(ringOpacity(t)).toBe(0);

    // A wrong meaning: both tiles get a new shake trigger and come to rest at 0.
    const right = defOf.get(picked.props.text as string);
    const wrong = tiles().find((t) => /^Meaning /.test(t.props.spoken) && t.props.text !== right)!;
    tap(pressables(wrong)[0]);
    rerender(<FieldGuide />);
    const shook = tiles().filter((t) => t.props.shake > 0);
    expect(shook).toHaveLength(2);
    for (const t of shook) {
      expect(t.props.state).toBe('wrong');
      expect(xOf(t)).toBe(0);
      expect(t.findAllByType(StateLayer)[0].props.on).toBe(false);
    }
  });

  it('Canopy: a call answers at once; the pick is checked for screen readers; no tile keeps a selection ring', () => {
    mount(<CanopyCall />);
    press('Start');
    const rows = root().findAllByType(MatchTile).filter((t) => t.props.radio);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    tap(pressables(rows[0])[0]);
    rerender(<CanopyCall />);
    const after = root().findAllByType(MatchTile).filter((t) => t.props.radio);
    expect(after[0].props.checked).toBe(true);
    expect(after.every((t) => t.props.locked)).toBe(true);
    expect(after.some((t) => t.props.state === 'correct')).toBe(true);
    for (const t of after) expect(t.findAllByType(StateLayer)[0].props.on).toBe(false);
  });

  it('Stepping Stones: placing a stone by tap still works through the press feedback', () => {
    mount(<SteppingStones />);
    press('Start');
    const place = btn(/^Place next: /)!;
    const label = (place.props.accessibilityLabel as string).replace(/^Place next: /, '');
    tap(place);
    expect(btn(new RegExp(`^Step \\d: ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\. Tap to take it back\\.$`))).toBeDefined();
  });

  it('Call It First: principle, then the options; one tap answers and no option is left looking selected', () => {
    mount(<CallItFirst />);
    press('Start');
    const principle = cards().filter((c) => typeof c.props.onPress === 'function');
    expect(principle).toHaveLength(3);
    tap(principle[0]);
    const answers = cards().filter((c) => typeof c.props.onPress === 'function');
    expect(answers).toHaveLength(4);
    tap(answers[0]);
    rerender(<CallItFirst />);
    expect(Object.keys(selectCert(useProgress.getState(), 'cisa').answers)).toHaveLength(1);
    const states = cards().map((c) => c.props.state);
    expect(states).toContain('correct');
    expect(states).not.toContain('selected');
    for (const c of cards()) {
      for (const l of c.findAllByType(StateLayer)) expect(l.props.on).toBe(false);
    }
  });
});
