/**
 * QA for PR #42 (mobile 1.12.0 "Alive III: Learn and Play"). Spec:
 * scratchpad/uplift/PHASE3B.md. Every journey runs on the real content pack
 * and the real stores.
 *
 * Journeys:
 *  1. A lesson end to end: cover → scenes → check → Lesson complete →
 *     Next lesson / Practice this topic. The moment plays once per lesson,
 *     never on a revisit, and has a Reduce Motion path.
 *  2. Back navigation mid-lesson (footer Back, header close, taps mid-turn).
 *  3. Learn's list states (done / up next) after a lesson.
 *  4. Notes "Mark as read".
 *  5. Play: each game opens with its own header. Forecast (id `sprint`)
 *     keeps an old save's best and level. The recap sparkline with 0, 1 and
 *     many rounds.
 *  6. A round-end level up goes through the celebration budget.
 *  7. An old 1.11 save, and a backup of it restored on a new phone.
 *
 * Bugs that still reproduce are pinned as the CURRENT behaviour, marked
 * `// QA-BUG:`; flip the assertion once the fix lands.
 *
 * Gotcha: never `act(() => store.action())` — use braces.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import LessonPlayer, { lessonPracticeIds } from '../app/lesson/[id]';
import Learn from '../app/(tabs)/learn';
import Play from '../app/(tabs)/play';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import TrapScreen from '../app/game/trap';
import ForecastScreen from '../app/game/sprint';
import SignpostScreen from '../app/game/priority';
import DaylightScreen from '../app/game/daylight';
import RumorScreen from '../app/game/rumor';
import CallItScreen from '../app/game/callit';
import FieldScreen from '../app/game/field';
import CanopyScreen from '../app/game/canopy';
import StonesScreen from '../app/game/stones';
import { LessonBranch, Sparkline, TierLeaf } from '../components/glyphs';
import { RoundEnd } from '../components/game';
import { Celebrate, CheckDraw, claimDecor, pickCelebration, resetCelebrationsForTest } from '../components/motion';
import { planText } from '../components/journey';
import { Verdict } from '../components/quiz';
import { CISA_LESSONS } from '../content/lessons/cisa';
import { nextLesson } from '../content/lessons';
import { noteSubtopics } from '../content/notes';
import { GAMES, type GameId } from '../engine/games/registry';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { playableGames } from '../lib/games';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
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
let mockParams: Record<string, string | undefined> = {};
// Tab focus we control: Learn draws its ✓ when it comes back into view.
let mockFocused = true;
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), setParams: jest.fn(), canGoBack: () => true, canDismiss: () => false },
    useFocusEffect: (cb: () => void | (() => void)) => {
      const f = mockFocused;
      React.useEffect(() => (f ? cb() : undefined), [cb, f]);
    },
    useIsFocused: () => mockFocused,
    useLocalSearchParams: () => mockParams,
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockLight = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => mockLight() } }));
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.12.0' } } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  setNotificationHandler: () => {},
  getPermissionsAsync: async () => ({ granted: false }),
  requestPermissionsAsync: async () => ({ granted: false }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async (req: { identifier: string }) => req.identifier,
}));
jest.mock('expo-file-system', () => ({ File: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { router } = require('expo-router') as { router: Record<string, jest.Mock> };

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
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
const buttons = (label: string | RegExp) =>
  root().findAll(
    (n) =>
      typeof n.props.onPress === 'function' &&
      [n.props.label, n.props.accessibilityLabel].some((l) => typeof l === 'string' && (typeof label === 'string' ? l === label : label.test(l))),
  );
const press = (label: string | RegExp) => {
  const b = buttons(label).at(0);
  if (!b) throw new Error(`No button "${String(label)}"`);
  act(() => {
    b.props.onPress();
  });
};
const hasButton = (label: string | RegExp) => buttons(label).length > 0;
/** The Next / Finish button's disabled state (the keyed footer button). */
const nextDisabled = () => buttons(/^(Next|Finish lesson)$/)[0].props.disabled === true;
/** The scene counter in the lesson header ("Scene 3 of 7"). */
const sceneLabel = () =>
  root()
    .findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^Scene \d+ of \d+$/.test(n.props.accessibilityLabel))
    .at(0)?.props.accessibilityLabel as string | undefined;

const FIXED_NOW = 1_791_600_000_000;
const charter = CISA_LESSONS.find((l) => l.id === 'cisa-l-d1-charter')!;
const checkOf = (l: typeof charter) => l.scenes.find((s) => s.type === 'check')! as Extract<(typeof charter)['scenes'][number], { type: 'check' }>;
/** From the cover to the lesson's check (its last scene). */
const toCheck = (l = charter) => {
  for (let k = 0; k < l.scenes.length - 1; k++) press('Next');
};
/** The option card holding this text, whatever letter it shows under. */
const pickText = (text: string) => press(new RegExp(`^Option [A-D]: ${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 40)}`));

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', shuffleOptions: false, motion: 'system', gameRulesSeen: [], onboarded: true });
  useSeen.setState({ moments: {} });
  useSession.setState({ active: null });
  resetCelebrationsForTest();
  setMockReducedMotion(true);
  mockLight.mockClear();
  Object.values(router).forEach((f) => typeof f === 'function' && 'mockClear' in f && f.mockClear());
  mockParams = {};
  mockFocused = true;
});
afterEach(() => {
  unmount();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── 1. A lesson, end to end ─────────────────────────────────────────────
describe('Journey 1: a lesson from cover to Lesson complete', () => {
  it('cover → every scene in order → check gates Finish → verdict → Lesson complete → Next lesson', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    const total = charter.scenes.length;
    expect(allText()).toContain('In this lesson');
    expect(sceneLabel()).toBe(`Scene 1 of ${total}`);
    for (let k = 1; k < total; k++) {
      press('Next');
      expect(sceneLabel()).toBe(`Scene ${k + 1} of ${total}`);
    }
    // The check: Finish waits for an answer.
    expect(hasButton('Finish lesson')).toBe(true);
    expect(nextDisabled()).toBe(true);
    const check = checkOf(charter);
    pickText(check.options[check.correctIndex]);
    expect(root().findByType(Verdict).props.correct).toBe(true);
    expect(nextDisabled()).toBe(false);
    press('Finish lesson');
    expect(allText()).toContain('Lesson complete');
    expect(sceneLabel()).toBeUndefined();
    expect(selectCert(useProgress.getState(), 'cisa').lessonsDone).toEqual([charter.id]);
    // Next lesson: the next one not done, in the same domain.
    const after = nextLesson('cisa', [charter.id], charter.domainId)!;
    expect(after.domainId).toBe(charter.domainId);
    press('Next lesson');
    expect(router.replace).toHaveBeenCalledWith(`/lesson/${after.id}`);
  });

  it('with shuffled options the check grades the ORIGINAL answer, and a miss names the key as shown', () => {
    useSettings.setState({ shuffleOptions: true });
    const check = checkOf(charter);
    // Right answer, wherever it landed.
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toCheck();
    pickText(check.options[check.correctIndex]);
    expect(root().findByType(Verdict).props.correct).toBe(true);
    unmount();
    // A wrong answer: the coach line names the display letter of the key.
    mount(<LessonPlayer />);
    toCheck();
    const wrong = check.options.find((_, i) => i !== check.correctIndex)!;
    pickText(wrong);
    expect(root().findByType(Verdict).props.correct).toBe(false);
    const keyCard = root().findAll((n) => n.props.letter && n.props.text === check.options[check.correctIndex] && typeof n.props.onPress === 'function')[0];
    expect(allText()).toContain(`The best answer is ${keyCard.props.letter}.`);
    // A miss still lets the learner finish.
    expect(nextDisabled()).toBe(false);
  });

  it('"Practice this topic" starts a session on the lesson’s questions and replaces the lesson with it', () => {
    // The draw is shuffled from the clock: pin it so the test can compare.
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toCheck();
    pickText(checkOf(charter).options[checkOf(charter).correctIndex]);
    press('Finish lesson');
    const ids = lessonPracticeIds(charter, FIXED_NOW);
    const label = ids.length ? 'Practice this topic' : 'Practice IS Audit';
    press(label);
    const s = useSession.getState().active!;
    expect(s).toBeTruthy();
    if (ids.length) {
      expect(s.title).toBe(charter.title);
      expect([...s.questionIds].sort()).toEqual([...ids].sort());
    }
    expect(router.replace).toHaveBeenCalledWith('/session');
  });

  it('the moment plays ONCE per lesson: a revisit finishes quietly (no moment, no new leaf, no haptic)', () => {
    mockParams = { id: charter.id };
    const finish = () => {
      mount(<LessonPlayer />);
      toCheck();
      pickText(checkOf(charter).options[checkOf(charter).correctIndex]);
      press('Finish lesson');
    };
    finish();
    expect(useSeen.getState().moments['lesson-done']).toBe(1);
    expect(root().findByType(LessonBranch).props.fresh).toBe(0);
    expect(mockLight).toHaveBeenCalledTimes(1);
    unmount();
    // Revisit, even in a new app session.
    resetCelebrationsForTest();
    mockLight.mockClear();
    finish();
    expect(useSeen.getState().moments['lesson-done']).toBe(1);
    expect(root().findByType(LessonBranch).props.fresh).toBeNull();
    expect(root().findByType(Celebrate).props.celebration.run).toBe(0);
    expect(mockLight).not.toHaveBeenCalled();
    expect(allText()).toContain('IS Audit: 1 of');
  });

  it('Reduce Motion: the moment is static (the leaf is simply filled, nothing grows) with the same words and haptic', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toCheck();
    pickText(checkOf(charter).options[checkOf(charter).correctIndex]);
    press('Finish lesson');
    const cel = root().findByType(Celebrate).props.celebration;
    expect(cel.mode).toBe('static');
    expect(cel.settled).toBe(true);
    expect(root().findByType(LessonBranch).props.play).toBe(false);
    expect(allText()).toMatch(/A new leaf on your IS Audit branch: 1 of \d+ lessons\./);
    expect(mockLight).toHaveBeenCalledTimes(1);
  });

  it('motion on: the first lesson of a session plays in full, the next one in the same session is short (the budget)', () => {
    setMockReducedMotion(false);
    jest.useFakeTimers();
    const finishLesson = (l: typeof charter) => {
      mockParams = { id: l.id };
      mount(<LessonPlayer />);
      l.scenes.forEach((scene, k) => {
        // Lessons can carry several checks: each one gates Next until answered.
        if (scene.type === 'check') {
          expect(nextDisabled()).toBe(true);
          pickText(scene.options[scene.correctIndex]);
        }
        press(k === l.scenes.length - 1 ? 'Finish lesson' : 'Next');
        // Let each page turn finish (the footer ignores taps mid-turn).
        act(() => {
          jest.advanceTimersByTime(motion.dur.select + 10);
        });
      });
    };
    finishLesson(charter);
    expect(root().findByType(Celebrate).props.celebration.mode).toBe('full');
    expect(root().findByType(LessonBranch).props.play).toBe(true);
    unmount();
    const second = CISA_LESSONS.find((l) => l.domainId === charter.domainId && l.id !== charter.id)!;
    finishLesson(second);
    expect(root().findByType(Celebrate).props.celebration.mode).toBe('short');
    expect(root().findByType(LessonBranch).props.play).toBe(false);
  });
});

// ── 2. Back mid-lesson ──────────────────────────────────────────────────
describe('Journey 2: back navigation mid-lesson', () => {
  it('footer Back walks back a scene at a time; on the cover there is no Back', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    press('Next');
    press('Next');
    expect(sceneLabel()).toBe(`Scene 3 of ${charter.scenes.length}`);
    press('Back');
    expect(sceneLabel()).toBe(`Scene 2 of ${charter.scenes.length}`);
    press('Back');
    expect(sceneLabel()).toBe(`Scene 1 of ${charter.scenes.length}`);
    expect(hasButton('Back')).toBe(false);
  });

  it('leaving an answered check and coming back shows it unanswered, with the same option order', () => {
    useSettings.setState({ shuffleOptions: true });
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toCheck();
    const order = () => root().findAll((n) => n.props.letter && typeof n.props.text === 'string' && typeof n.props.onPress === 'function').map((n) => n.props.text);
    const first = order();
    pickText(checkOf(charter).options[checkOf(charter).correctIndex]);
    press('Back');
    press('Next');
    expect(root().findAllByType(Verdict)).toHaveLength(0);
    expect(nextDisabled()).toBe(true);
    expect(order()).toEqual(first);
  });

  it('the header close leaves the lesson: nothing is marked done and no moment is spent', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toCheck();
    pickText(checkOf(charter).options[checkOf(charter).correctIndex]);
    const close = root().findAll((n) => n.props.icon === 'close' && typeof n.props.onBack === 'function')[0];
    act(() => {
      close.props.onBack();
    });
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(selectCert(useProgress.getState(), 'cisa').lessonsDone).toEqual([]);
    expect(useSeen.getState().moments['lesson-done']).toBeUndefined();
  });

  it('motion on: taps during a page turn are ignored (two quick Nexts move one scene; Back mid-turn does nothing)', () => {
    setMockReducedMotion(false);
    jest.useFakeTimers();
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    press('Next');
    act(() => {
      jest.advanceTimersByTime(motion.dur.select + 10);
    });
    press('Next');
    press('Next');
    act(() => {
      jest.advanceTimersByTime(motion.dur.select + 10);
    });
    expect(sceneLabel()).toBe(`Scene 3 of ${charter.scenes.length}`);
    press('Next');
    press('Back');
    act(() => {
      jest.advanceTimersByTime(motion.dur.select + 10);
    });
    expect(sceneLabel()).toBe(`Scene 4 of ${charter.scenes.length}`);
  });
});

// ── 3. Learn list states ────────────────────────────────────────────────
describe('Journey 3: Learn list states', () => {
  const rows = () =>
    root()
      .findAll((n) => typeof n.props.onPress === 'function' && /^IS Audit lesson \d+:/.test(String(n.props.accessibilityLabel)))
      .map((n) => n.props.accessibilityLabel as string);

  it('fresh: lesson 1 is up next on the cover and in its open group; nothing is done', () => {
    mockParams = { domain: '1' };
    mount(<Learn />);
    const r0 = rows();
    expect(r0[0]).toMatch(/, up next$/);
    expect(r0.slice(1).every((x) => /, \d+ min$/.test(x))).toBe(true);
    expect(allText()).toContain(`Up next · IS Audit`);
    expect(allText()).toContain('0 of');
  });

  it('after finishing lesson 1 in the player: Learn shows it done and lesson 2 up next; the group says 1 of N', () => {
    mockParams = { id: charter.id };
    mount(<LessonPlayer />);
    toCheck();
    pickText(checkOf(charter).options[checkOf(charter).correctIndex]);
    press('Finish lesson');
    unmount();
    mockParams = { domain: '1' };
    mount(<Learn />);
    const r1 = rows();
    const inDomain = CISA_LESSONS.filter((l) => l.domainId === '1').length;
    expect(r1[0]).toBe(`IS Audit lesson 1: ${charter.title}, done`);
    expect(r1[1]).toMatch(/, up next$/);
    expect(root().findAll((n) => n.props.accessibilityState?.expanded === true && String(n.props.accessibilityLabel).includes(`1 of ${inDomain} done`)).length).toBeGreaterThan(0);
  });

  it('every lesson of a domain done: the group says All done and the cover moves on', () => {
    for (const l of CISA_LESSONS.filter((x) => x.domainId === '1')) useProgress.getState().completeLesson('cisa', l.id);
    mount(<Learn />);
    const allDone = new Set(root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /lessons?, All done$/.test(n.props.accessibilityLabel)).map((n) => n.props.accessibilityLabel));
    expect([...allDone]).toHaveLength(1);
    expect([...allDone][0]).toMatch(/^Information System Auditing Process, /);
    expect(allText()).not.toContain('Up next · IS Audit');
  });

  it('QA-BUG: finishing a lesson buzzes twice (Lesson complete, then again on return to Learn)', () => {
    // Learn on view, then the learner opens a lesson (Learn loses focus).
    mount(<Learn />);
    mockFocused = false;
    act(() => {
      r!.update(<Learn />);
    });
    // The lesson is finished (Lesson complete gives its one light haptic).
    mockParams = { id: charter.id };
    let lr!: ReactTestRenderer;
    act(() => {
      lr = create(<LessonPlayer />);
    });
    const lroot = lr.root;
    const pressIn = (label: string | RegExp) =>
      act(() => {
        lroot
          .findAll((n) => typeof n.props.onPress === 'function' && [n.props.label, n.props.accessibilityLabel].some((l) => typeof l === 'string' && (typeof label === 'string' ? l === label : label.test(l))))[0]
          .props.onPress();
      });
    for (let k = 0; k < charter.scenes.length - 1; k++) pressIn('Next');
    pressIn(new RegExp(`^Option [A-D]: ${checkOf(charter).options[checkOf(charter).correctIndex].slice(0, 30)}`));
    pressIn('Finish lesson');
    expect(mockLight).toHaveBeenCalledTimes(1);
    act(() => {
      lr.unmount();
    });
    // Back to Learn.
    mockFocused = true;
    act(() => {
      r!.update(<Learn />);
    });
    expect(root().findAll((n) => n.type === CheckDraw && n.props.play === true)).toHaveLength(1);
    // QA-BUG: one lesson-done occasion gives TWO light haptics (T1 says one). Expected 1.
    expect(mockLight).toHaveBeenCalledTimes(2);
  });

  it('QA-BUG: lessons that arrive by a backup restore draw their ✓ (and buzz) on Learn as if just finished', async () => {
    mount(<Learn />);
    mockFocused = false;
    act(() => {
      r!.update(<Learn />);
    });
    // Settings → Your data → restore a backup that has three lessons done.
    const donor = CISA_LESSONS.filter((l) => l.domainId === '1').slice(0, 3).map((l) => l.id);
    act(() => {
      for (const id of donor) useProgress.getState().completeLesson('cisa', id);
    });
    const text = JSON.stringify(currentBackup());
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    const read = checkBackupText(text);
    if (read.kind !== 'ok') throw new Error(read.code);
    await act(async () => {
      await restoreBackup(read.data);
    });
    mockLight.mockClear();
    mockFocused = true;
    act(() => {
      r!.update(<Learn />);
    });
    // QA-BUG: nothing was finished just now; expected 0 ✓ draws and no haptic.
    expect(root().findAll((n) => n.type === CheckDraw && n.props.play === true)).toHaveLength(3);
    expect(mockLight).toHaveBeenCalledTimes(1);
  });
});

// ── 4. Notes Mark as read ───────────────────────────────────────────────
describe('Journey 4: notes Mark as read', () => {
  const note = noteSubtopics('cisa')[0];
  const draws = () => root().findAll((n) => n.type === CheckDraw);

  it('marking draws the ✓ and saves it; tapping again unmarks; a note opened already read shows it still', () => {
    mockParams = { id: encodeURIComponent(note.id) };
    mount(<NoteSubtopicScreen />);
    expect(hasButton('Mark as read')).toBe(true);
    expect(draws()).toHaveLength(0);
    press('Mark as read');
    expect(selectCert(useProgress.getState(), 'cisa').notesRead).toEqual([note.id]);
    expect(hasButton('Marked as read')).toBe(true);
    expect(draws().map((d) => d.props.play)).toEqual([true]);
    press('Marked as read');
    expect(selectCert(useProgress.getState(), 'cisa').notesRead).toEqual([]);
    expect(draws()).toHaveLength(0);
    unmount();
    // Opened already read: the ✓ is simply there.
    useProgress.getState().setNoteRead('cisa', note.id, true);
    mount(<NoteSubtopicScreen />);
    expect(draws().map((d) => d.props.play)).toEqual([false]);
  });

  it('Learn’s Study notes row counts the read note', () => {
    useProgress.getState().setNoteRead('cisa', note.id, true);
    mount(<Learn />);
    expect(allText()).toContain(`1 of ${noteSubtopics('cisa').length} read`);
  });
});

// ── 5. Play ─────────────────────────────────────────────────────────────
const SCREENS: Record<GameId, () => React.ReactElement> = {
  trap: () => <TrapScreen />,
  sprint: () => <ForecastScreen />,
  priority: () => <SignpostScreen />,
  daylight: () => <DaylightScreen />,
  rumor: () => <RumorScreen />,
  callit: () => <CallItScreen />,
  field: () => <FieldScreen />,
  canopy: () => <CanopyScreen />,
  stones: () => <StonesScreen />,
};

describe('Journey 5: Play', () => {
  it('every playable game opens (after its intro) on its own header: "<name>, 1 of N", one header stop', () => {
    const ids = playableGames('cisa');
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      mount(SCREENS[id]());
      if (hasButton('Start')) press('Start');
      const head = root().findAll(
        (n) => n.props.accessible === true && n.props.accessibilityRole === 'header' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith(`${GAMES[id].name}, 1 of `),
      );
      // The game id in the failure message tells which game lost its header.
      expect({ id, hasHeader: head.length > 0 }).toEqual({ id, hasHeader: true });
      unmount();
    }
  });

  it('Forecast’s first play opens on its intro with the scoring rules; Start marks them seen', () => {
    mount(<ForecastScreen />);
    expect(allText()).toContain('How scoring works');
    expect(root().findAll((n) => n.props.accessibilityRole === 'header' && String(n.props.accessibilityLabel).startsWith('Forecast, 1 of')).length).toBe(0);
    press('Start');
    expect(useSettings.getState().gameRulesSeen).toContain('sprint');
    expect(root().findAll((n) => n.props.accessibilityRole === 'header' && String(n.props.accessibilityLabel).startsWith('Forecast, 1 of')).length).toBeGreaterThan(0);
  });

  describe('the recap sparkline', () => {
    const recap = () => <RoundEnd certId="cisa" game="trap" score={4} max={5} onAgain={() => {}} />;
    const setRecent = (v: number[] | undefined) =>
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...selectCert(s, 'cisa'), gameRecent: v ? { trap: v } : {} } } }));

    it('0 rounds: no trend and no sparkline', () => {
      setRecent(undefined);
      mount(recap());
      expect(root().findAllByType(Sparkline)).toHaveLength(0);
      expect(allText()).not.toContain('Last ');
    });

    it('1 round: no trend and no sparkline (one point is not a trend)', () => {
      setRecent([4]);
      mount(recap());
      expect(root().findAllByType(Sparkline)).toHaveLength(0);
      expect(allText()).not.toContain('Last 1 rounds');
    });

    it('many rounds: the sparkline, the scores printed under it, one spoken sentence; negatives and flat runs too', () => {
      setRecent([2, -5, 4, 4, 5]);
      mount(recap());
      const spark = root().findByType(Sparkline);
      expect(spark.props.values).toEqual([2, -5, 4, 4, 5]);
      expect(allText()).toContain('Last 5 rounds');
      expect(allText()).toContain('2  ·  −5  ·  4  ·  4  ·  5');
      const spoken = new Set(root().findAll((n) => n.props.accessible === true && String(n.props.accessibilityLabel).startsWith('Your last ')).map((n) => n.props.accessibilityLabel));
      expect([...spoken]).toEqual(['Your last 5 rounds: 2, minus 5, 4, 4, 5.']);
      unmount();
      setRecent([3, 3]);
      mount(recap());
      expect(root().findByType(Sparkline).props.values).toEqual([3, 3]);
    });

    it('the Sparkline itself draws nothing for 0 or 1 values (no crash, no NaN path)', () => {
      for (const v of [[], [7]]) {
        mount(<Sparkline values={v} color="#000000" paper="#ffffff" />);
        expect(r!.toJSON()).toBeNull();
        unmount();
      }
    });
  });
});

// ── 6. Level up through the budget ──────────────────────────────────────
describe('Journey 6: the round-end level up goes through the celebration budget', () => {
  const levelUp = () => (
    <RoundEnd certId="cisa" game="stones" score={15} max={15} onAgain={() => {}} news={{ change: 'up', tier: 'sapling', best: true, moment: null }} />
  );
  const mode = () => root().findByType(Celebrate).props.celebration.mode;

  it('motion on, first of the session: full, the leaf grows from the level before, one haptic', () => {
    setMockReducedMotion(false);
    jest.useFakeTimers();
    mount(levelUp());
    expect(mode()).toBe('full');
    expect(root().findByType(TierLeaf).props.tier).toBe('seedling');
    act(() => {
      jest.advanceTimersByTime(motion.dur.celebrate);
    });
    expect(root().findAllByType(TierLeaf).map((t) => t.props.tier)).toContain('sapling');
    expect(mockLight).toHaveBeenCalledTimes(1);
  });

  it('after another full moment this session (Lesson complete): short, the new level at once, one haptic', () => {
    setMockReducedMotion(false);
    pickCelebration('lesson-done', false);
    mount(levelUp());
    expect(mode()).toBe('short');
    expect(root().findByType(TierLeaf).props.tier).toBe('sapling');
    expect(mockLight).toHaveBeenCalledTimes(1);
  });

  it('the session budget spent: static (not even the short cross-fade)', () => {
    setMockReducedMotion(false);
    while (claimDecor(100));
    mount(levelUp());
    expect(mode()).toBe('static');
    expect(root().findByType(TierLeaf).props.tier).toBe('sapling');
  });

  it('fatigue: the 4th level up ever is short even in a fresh session', () => {
    setMockReducedMotion(false);
    useSeen.setState({ moments: { 'level-up': 3 } });
    mount(levelUp());
    expect(mode()).toBe('short');
    expect(useSeen.getState().moments['level-up']).toBe(4);
  });

  it('Reduce Motion: static, the words on screen, one haptic', () => {
    mount(levelUp());
    expect(mode()).toBe('static');
    expect(allText()).toContain('Sapling');
    expect(mockLight).toHaveBeenCalledTimes(1);
  });

  it('QA-BUG: a full level up that the learner skips (a tap) before the leaf grows loses its haptic', () => {
    setMockReducedMotion(false);
    jest.useFakeTimers();
    mount(levelUp());
    expect(mode()).toBe('full');
    // Any touch inside the celebration skips it.
    const frame = root().findAll((n) => typeof n.props.onTouchStart === 'function')[0];
    act(() => {
      frame.props.onTouchStart();
    });
    act(() => {
      jest.advanceTimersByTime(motion.dur.celebrate * 2);
    });
    expect(root().findByType(TierLeaf).props.tier).toBe('sapling');
    // QA-BUG: expected 1 (T1: "one light haptic"; short/static still buzz). Currently 0.
    expect(mockLight).toHaveBeenCalledTimes(0);
  });
});

// ── 7. An old 1.11 save, and a restore ──────────────────────────────────
const T0 = 1_791_500_000_000;
const SETTINGS_1_11 = {
  state: {
    onboarded: true,
    activeCertId: 'cisa',
    examDates: { cisa: '2026-12-10' },
    theme: 'system',
    motion: 'system',
    shuffleOptions: true,
    dailyGoal: 20,
    reminder: { enabled: false, hour: 19, minute: 0 },
    haptics: true,
    gameRulesSeen: ['sprint', 'trap'],
    practiceTimer: false,
    studyMode: 'smart',
  },
  version: 1,
};
const PROGRESS_1_11 = {
  state: {
    byCert: {
      cisa: {
        answers: { d1_001: { attempts: 2, correctCount: 2, lastCorrect: true, lastAt: T0 } },
        review: {},
        bookmarks: ['d2_010'],
        mocks: [],
        lessonsDone: ['cisa-l-d1-charter'],
        mistakes: {},
        gameBest: { sprint: 13, trap: 5 },
        gameRecent: { sprint: [4, -2, 13], trap: [5] },
        notesRead: [noteSubtopics('cisa')[0].id],
        gameGrowth: { sprint: { tier: 'sapling', up: 1, down: 0, hits: [true, true, false], run: 2 } },
        milestones: { earned: { 'first-foothold': T0 }, queue: [], counts: {} },
      },
    },
    streak: { current: 2, best: 4, lastDay: '2026-10-10', recentDays: ['2026-10-09', '2026-10-10'] },
    today: { day: '2026-10-10', answered: 3 },
    days: {
      cisa: {
        day: '2026-10-10',
        certId: 'cisa',
        items: [{ kind: 'game', gameId: 'sprint', label: 'Sure Footing · 4 min' }],
        done: [false],
        start: { score: 20, domains: {} },
        answered: 0,
        correct: 0,
        minutes: 0,
        celebrated: false,
        credit: [0],
      },
    },
  },
  version: 2,
};

async function loadSave() {
  useSettings.setState(useSettings.getInitialState());
  useProgress.setState(useProgress.getInitialState());
  await new Promise((done) => setTimeout(done, 0));
  await AsyncStorage.clear();
  await AsyncStorage.setItem('aurivan.settings.v1', JSON.stringify(SETTINGS_1_11));
  await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(PROGRESS_1_11));
  await useSettings.persist.rehydrate();
  await useProgress.persist.rehydrate();
}

describe('Journey 7: an old 1.11 save and a backup restore', () => {
  it('a 1.11 save loads: Forecast keeps its best, level and history; Play shows them under the new name', async () => {
    await loadSave();
    const cp = selectCert(useProgress.getState(), 'cisa');
    expect(cp.gameBest).toEqual({ sprint: 13, trap: 5 });
    expect(cp.gameGrowth?.sprint?.tier).toBe('sapling');
    expect(cp.gameRecent.sprint).toEqual([4, -2, 13]);
    expect(cp.lessonsDone).toEqual(['cisa-l-d1-charter']);
    mount(<Play />);
    expect(allText()).not.toContain('Sure Footing');
    const row = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Forecast.'));
    const hero = root().findAll((n) => n.props.title === 'Forecast');
    // Featured or a row: either way the best and the level show.
    if (row.length) {
      expect(row[0].props.accessibilityLabel).toContain('Your level: Sapling');
      expect(row[0].props.accessibilityLabel).toContain('Best score 13');
    } else {
      expect(hero.length).toBeGreaterThan(0);
      expect(allText()).toContain('Best 13.');
      expect(allText()).toContain('Sapling');
    }
  });

  it('a 1.11 learner who saw the rules goes straight into the round; the old plan label shows the new name', async () => {
    await loadSave();
    mount(<ForecastScreen />);
    expect(allText()).not.toContain('How scoring works');
    expect(root().findAll((n) => n.props.accessibilityRole === 'header' && String(n.props.accessibilityLabel) === `Forecast, 1 of ${GAMES.sprint.size}`).length).toBeGreaterThan(0);
    const item = useProgress.getState().days.cisa!.items[0];
    expect(planText(item as Parameters<typeof planText>[0]).title).toBe('Forecast');
    // Learn and notes see the old progress.
    unmount();
    mount(<Learn />);
    expect(allText()).toContain(`1 of ${noteSubtopics('cisa').length} read`);
    expect(root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^Information System Auditing Process, \d+ lessons, 1 of \d+ done$/.test(n.props.accessibilityLabel)).length).toBeGreaterThan(0);
  });

  it('a backup of the 1.11 save restores on a new phone unchanged, and Forecast’s round end reads it', async () => {
    await loadSave();
    const before = JSON.parse(JSON.stringify(selectCert(useProgress.getState(), 'cisa')));
    const text = JSON.stringify(currentBackup());
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: true });
    useProgress.setState(useProgress.getInitialState());
    useBackup.setState({ lastBackupAt: null, undo: null });
    const read = checkBackupText(text);
    if (read.kind !== 'ok') throw new Error(`backup refused: ${read.code}`);
    await restoreBackup(read.data);
    const after = JSON.parse(JSON.stringify(selectCert(useProgress.getState(), 'cisa')));
    expect(after.gameBest).toEqual(before.gameBest);
    expect(after.gameGrowth).toEqual(before.gameGrowth);
    expect(after.gameRecent).toEqual(before.gameRecent);
    expect(after.lessonsDone).toEqual(before.lessonsDone);
    expect(after.notesRead).toEqual(before.notesRead);
    expect(useSettings.getState().gameRulesSeen).toEqual(['sprint', 'trap']);
    // The recap after the restore draws the old history.
    mount(<RoundEnd certId="cisa" game="sprint" score={6} max={24} onAgain={() => {}} />);
    expect(root().findByType(Sparkline).props.values).toEqual([4, -2, 13]);
    expect(allText()).toContain('Round complete · Forecast');
    expect(allText()).toContain('best 13');
  });
});
