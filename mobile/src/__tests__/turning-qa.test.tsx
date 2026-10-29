/**
 * QA: mobile 1.50 "The Turning" (the plant's form change), walked as learner
 * journeys on the real Your plant screen (DESIGN_SYSTEM §8.9, §8.10).
 *
 * form-reveal.test.tsx pins the component on its own (timing, skip, words,
 * haptics). This file pins what the screen around it does with it:
 * 1. the trigger: once ever (a restart, a restore, an undo-restore), never on
 *    a lowering restore, never for a storybook or a gated plant, and one
 *    grand Turning for two forms earned at once;
 * 2. the session moment: Today's growth spends it, Your plant then waits
 *    behind "See Kai's new form", and the tap plays it in full;
 * 3. skipping on the screen (a tap, a scroll drag, leaving the app,
 *    navigating away) always ends on the new form, written down as seen;
 * 4. Reduce Motion shows every word; Haptics off is silent;
 * 5. a Form IV choice made before the Turning is the form it turns into;
 * 6. the widget draws the new form after it.
 *
 * `it.skip` with a `// BUG:` line marks a bug found in this pass: the test
 * states the expected behaviour; each was run unskipped and failed for the
 * reason in its comment (turn it back on with the fix).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { StrictMode, Suspense } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, AppState, Dimensions, ScrollView, View, type AppStateStatus } from 'react-native';
import { setMockHoldAnimations, setMockReducedMotion } from '../../jest/reanimated-mock';
import * as reanimated from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import YourPlant from '../app/plant';
import { claimMoment, resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import * as art from '../components/plant/art';
import { FormReveal } from '../components/plant/FormReveal';
import { getDomainQuestions } from '../content/loader';
import { FORM_FACTS, plantNew, type CertPlant } from '../engine/plant';
import { SEE_NEW_FORM } from '../engine/plantForms';
import { motion } from '../theme/tokens';
import { flushSayLaterForTest } from '../lib/a11y';
import { checkBackupText, currentBackup, restoreBackup, undoRestore } from '../lib/backup';
import { checkPlant, plantSubtopics } from '../lib/plant';
import { collectSnapshot } from '../lib/widgetData';
import { selectCert, useProgress, type MockResult } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

// ── Harness ─────────────────────────────────────────────────────────────
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
const byTestID = (id: string) => (r ? r.root.findAll((n) => n.props.testID === id && typeof n.type === 'string') : []);
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(r!.root);
const anyHaptic = () =>
  (Haptics.notificationAsync as jest.Mock).mock.calls.length + (Haptics.selectionAsync as jest.Mock).mock.calls.length + (Haptics.impactAsync as jest.Mock).mock.calls.length;
const success = () => (Haptics.notificationAsync as jest.Mock).mock.calls.filter((c) => c[0] === 'success').length;
let say: jest.SpyInstance;
const said = () => {
  act(() => flushSayLaterForTest());
  return say.mock.calls.map((c) => c[0]);
};
/** Full motion starts its clock on the frame after mount (review O6): let that frame come. */
const nextFrame = () =>
  act(async () => {
    await new Promise((res) => setTimeout(res, 0));
  });
const motionOn = () => {
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
};
const cp = () => selectCert(useProgress.getState(), 'cisa');
const setPlant = (p: CertPlant | undefined) => {
  act(() => {
    useProgress.getState().updatePlant('cisa', () => p);
  });
};
const reveal = () => byTestID('plant-form-reveal');
const revealMode = () => (byTestID('plant-form-reveal-full').length ? 'full' : byTestID('plant-form-reveal-reduced').length ? 'reduced' : byTestID('plant-form-reveal-wait').length ? 'wait' : null);

const DAY = 86_400_000;
const T0 = Date.now() - 10 * DAY;
/** A botanical plant at `growth`, nothing pending, back-fill seen. */
const grown = (growth: 1 | 2 | 3 | 4 | 5 | 6, species: CertPlant['species'] = 'oak'): CertPlant => ({ ...plantNew(species, 'Kai', T0, growth), backfill: { at: T0, growth, seen: true } });
/** Every growth reached in order, one day apart; the last one `at` (pending when `pending`). */
const reachedTo = (growth: 3 | 4 | 5 | 6, at: number, pending: boolean): CertPlant => {
  const ids = ['sprout', 'shoot', 'bough', 'crown', 'elder'] as const;
  const reached: Record<string, number> = {};
  for (let g = 2; g <= growth; g++) reached[ids[g - 2]] = g === growth ? at : T0 + (g - 2) * DAY;
  return { ...plantNew('oak', 'Kai', T0 - DAY, growth), reached, ...(pending ? { pending: growth } : {}) };
};

// Real study that supports an Elder on restore (the restore clamp reads it):
// every domain answered, every subtopic mastered, a 150-question mock, readiness held, 40 delayed recalls.
function mock(total: number, at: number): MockResult {
  return { id: `m${at}-${total}`, finishedAt: at, total, correct: Math.round(total * 0.8), minutesUsed: 10, byDomain: {}, timing: 'standard', unanswered: 0 };
}
function elderStudy() {
  const at = T0 - 20 * DAY;
  [40, 40, 12, 40, 40].forEach((n, i) => {
    for (const q of getDomainQuestions('cisa', String(i + 1)).slice(0, n)) useProgress.getState().recordAnswer('cisa', q.id, true, undefined, { at });
  });
  const mastery: Record<string, { firstDay: string; masteredAt: string }> = {};
  for (const s of plantSubtopics('cisa').flat()) mastery[s] = { firstDay: '2026-09-01', masteredAt: '2026-09-03' };
  const c = cp();
  useProgress.setState((st) => ({
    byCert: {
      ...st.byCert,
      cisa: {
        ...c,
        mastery,
        milestones: { ...(c.milestones ?? { earned: {} }), longIds: Object.keys(c.answers).slice(0, 40) },
        mocks: [mock(150, Date.now() - DAY)],
        moments: { ...(c.moments ?? {}), readySeenAt: Date.now() - 2 * DAY },
      },
    },
  }));
}
/** This phone's own data as a backup file, read back through the same checks a restore uses. */
function fileNow() {
  const read = checkBackupText(JSON.stringify(currentBackup(Date.now())));
  if (read.kind !== 'ok') throw new Error(read.code);
  return read.data;
}

beforeEach(async () => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  await AsyncStorage.clear();
  setMockReducedMotion(true);
  setMockHoldAnimations(false);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, plantForms: {}, plantFinal: {}, quietGrowth: {}, proud: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: undefined });
    useProgress.getState().updatePlant('cisa', () => undefined);
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
  (Haptics.notificationAsync as jest.Mock).mockClear();
  (Haptics.selectionAsync as jest.Mock).mockClear();
  (Haptics.impactAsync as jest.Mock).mockClear();
  say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  say.mockClear();
});
afterEach(() => {
  unmount();
  setMockHoldAnimations(false);
  jest.restoreAllMocks();
});

// ── 1. The trigger ──────────────────────────────────────────────────────
describe('1. the trigger', () => {
  it('plays once, is saved to storage at once, and a restart (state reloaded from storage) never plays it again', async () => {
    motionOn();
    setPlant(grown(4));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    mount(<YourPlant />);
    expect(revealMode()).toBe('full');
    unmount();
    // The write reached storage (the app could be killed right now).
    await act(async () => {
      await new Promise((res) => setTimeout(res, 0));
    });
    const row = JSON.parse((await AsyncStorage.getItem('aurivan.seen.v1')) ?? '{}');
    expect(row.state?.plantForms?.cisa?.seen).toBe(3);
    // "Restart": forget the in-memory record, reload it from storage, open Your plant.
    useSeen.setState({ plantForms: {} });
    await act(async () => {
      await useSeen.persist.rehydrate();
    });
    resetCelebrationsForTest();
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0);
    expect(allText()).toContain('The Standard Oak');
    expect(byTestID('plant-hero')).toHaveLength(1);
  });

  it('a restore of a file with no grow-up waiting: no Turning (forms in a file are history), and undo-restore none either', async () => {
    elderStudy();
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 4 } } });
    const data = fileNow();
    await act(async () => {
      await restoreBackup(data);
    });
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0);
    unmount();
    await act(async () => {
      expect((await undoRestore()).kind).toBe('ok');
    });
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0);
    expect(allText()).toContain('The Broadcrown Oak');
  });

  it('a restore that LOWERS the plant (Elder → a Shoot file) never plays a Turning, and undoing it back to Elder neither', async () => {
    elderStudy();
    setPlant(grown(3));
    const shootFile = fileNow();
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 4 } } });
    await act(async () => {
      await restoreBackup(shootFile);
    });
    expect(cp().plant?.growth).toBe(3);
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0);
    unmount();
    await act(async () => {
      expect((await undoRestore()).kind).toBe('ok');
    });
    expect(cp().plant?.growth).toBe(6);
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0);
  });

  // BUG QA-TURN-1: the Turning was already seen on this phone, but the file still carries the
  // grow-up's `pending` (Your plant never clears it). writeAll forgets every form record, and the
  // next baseline reads the growth BEFORE `pending` (lib/plant.ts baselinePlantForms), so the
  // same Turning plays a second time.
  // FIXED: QA-TURN-1, a restore (or undo-restore) of a file that still carries the grow-up's `pending` replays a Turning already seen.
  it('a restore of a file taken after the Turning played (the grow-up still pending) never replays it', async () => {
    elderStudy();
    setPlant(reachedTo(6, Date.now() - DAY, true));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    // The learner came to Your plant from Results (Today not opened yet): the Turning plays.
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(1);
    unmount();
    expect(useSeen.getState().plantForms?.cisa?.seen).toBe(4);
    // The Turning was the grow-up's moment: its `pending` is cleared at once (QA-TURN-1 fix, part 1).
    expect(cp().plant?.pending).toBeUndefined();
    // A file that still carries it (taken by an earlier 1.50 build) restores as history (part 2).
    setPlant({ ...cp().plant!, pending: 6 });
    const file = fileNow(); // Settings → Back up now
    await act(async () => {
      await restoreBackup(file); // later: Restore that file
    });
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0); // fails: the grand Turning plays again
  });

  it('a storybook plant: no Turning when it crosses a form, and its record is never marked as revealed', () => {
    const { look: _l, ...story } = grown(4);
    setPlant(story);
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0);
    expect(allText()).not.toContain('Standard Oak');
    expect(useSeen.getState().plantForms?.cisa).toEqual({ seen: 2 });
  });

  it('a gated plant (Bough-level study, no delayed recalls) stays a Shoot: no Turning', () => {
    const at = Date.now() - 20 * DAY;
    [40, 40, 40, 40, 40].forEach((n, i) => {
      for (const q of getDomainQuestions('cisa', String(i + 1)).slice(0, n)) useProgress.getState().recordAnswer('cisa', q.id, true, undefined, { at });
    });
    const mastery: Record<string, { firstDay: string; masteredAt: string }> = {};
    for (const s of plantSubtopics('cisa').flat()) mastery[s] = { firstDay: '2026-09-01', masteredAt: '2026-09-03' };
    useProgress.setState((st) => ({ byCert: { ...st.byCert, cisa: { ...cp(), mastery, mocks: [mock(50, Date.now() - DAY)] } } }));
    setPlant(grown(3));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    act(() => {
      checkPlant('cisa');
    });
    expect(cp().plant?.growth).toBe(3);
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0);
  });

  it('two forms earned at once (Shoot → Elder after a long gap): ONE Turning, the grand tier (3.6 s), from Form II', async () => {
    motionOn();
    const timing = jest.spyOn(reanimated, 'withTiming');
    const build = jest.spyOn(art, 'buildPlant');
    // Shoot long ago, then Bough, Crown and Elder all reached on the same check.
    const now = Date.now();
    setPlant({ ...plantNew('oak', 'Kai', T0 - 60 * DAY, 6), reached: { sprout: T0 - 50 * DAY, shoot: T0 - 40 * DAY, bough: now, crown: now, elder: now } });
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    mount(<YourPlant />);
    await nextFrame();
    expect(reveal()).toHaveLength(1);
    expect(revealMode()).toBe('full');
    expect(timing.mock.calls.some((c) => c[0] === motion.turn.grand.total && (c[1] as { duration: number }).duration === motion.turn.grand.total)).toBe(true);
    expect(byTestID('plant-form-reveal-halo')).toHaveLength(1); // Form IV's ring: grand only
    // The old drawing is Form II (Shoot), the new one Elder.
    const stages = build.mock.calls.map((c) => c[0].stage);
    expect(stages).toContain(3);
    expect(stages).toContain(6);
    expect(stages).not.toContain(5);
    // The fact is Elder's, the name the Broadcrown Oak; one announcement.
    expect(allText()).toContain(FORM_FACTS[6]);
    expect(said()).toEqual(['Kai grows into a new form: the Broadcrown Oak.']);
    expect(useSeen.getState().plantForms?.cisa).toEqual({ seen: 4 });
    unmount();
    resetCelebrationsForTest();
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0); // never a second Turning for the skipped Form III
  });

  // QA-TURN-2 (fixed): Today's pointer follows formMoment (what this phone already showed), not the growth alone.
  // After Reset progress the forms record stays at "seen", so a re-earned Shoot plays no Turning, and Today
  // no longer sends the learner to see one.
  it('after a Reset, Today never promises a Turning that Your plant will not play', () => {
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 4 } } });
    act(() => {
      useProgress.getState().resetCert('cisa'); // Settings → Reset progress: back to a seed
    });
    expect(cp().plant?.growth).toBe(1);
    // Re-earned Shoot: Today's grow-up.
    setPlant({ ...cp().plant!, growth: 3, reached: { sprout: T0, shoot: Date.now() }, pending: 3 });
    mount(<Today />);
    const promised = allText().includes(SEE_NEW_FORM);
    unmount();
    mount(<YourPlant />);
    const played = reveal().length > 0;
    expect(promised).toBe(played);
  });
});

// ── 2. The session moment ───────────────────────────────────────────────
describe('2. the session moment budget (claimMoment)', () => {
  it('Today’s growth spends the moment: Your plant waits behind "See Kai’s new form"; the tap plays it in full; then the button is gone', async () => {
    motionOn();
    setPlant(reachedTo(4, Date.now(), true));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    mount(<Today />);
    expect(allText()).toContain(SEE_NEW_FORM);
    unmount();
    mount(<YourPlant />);
    expect(revealMode()).toBe('wait');
    expect(textOf(byTestID('plant-form-reveal-play')[0])).toContain('See Kai’s new form');
    expect(allText()).toContain(FORM_FACTS[4]);
    expect(allText()).not.toContain('The Standard Oak');
    expect(useSeen.getState().plantForms?.cisa?.seen).toBe(3); // counted as shown already
    // Hold the clock so "in full" is observable, then tap.
    // Today's own grow-up line was said on Today (its short pause had not run out in the test).
    act(() => flushSayLaterForTest());
    say.mockClear();
    setMockHoldAnimations(true);
    const press = byTestID('plant-form-reveal-play')[0].findAll((n) => typeof n.props.onPress === 'function')[0];
    act(() => press.props.onPress());
    expect(revealMode()).toBe('full');
    expect(byTestID('plant-form-reveal-play')).toHaveLength(0);
    expect(byTestID('plant-form-reveal-full')[0].props.accessibilityActions).toEqual([{ name: 'activate', label: 'Show the new form now' }]);
    expect(said()).toEqual([]); // still playing
    // Let it run to the end (its clock starts on the next frame).
    setMockHoldAnimations(false);
    await nextFrame();
    expect(byTestID('plant-form-reveal-play')).toHaveLength(0);
    expect(allText()).toContain('The Standard Oak');
    expect(said()).toEqual(['Kai grows into a new form: the Standard Oak.']);
  });

  it('an unnamed plant’s button says "See your oak’s new form"', () => {
    motionOn();
    setPlant({ ...grown(3), name: '' });
    useSeen.setState({ plantForms: { cisa: { seen: 1 } } });
    // A milestone already had the session's moment.
    claimMoment();
    mount(<YourPlant />);
    expect(revealMode()).toBe('wait');
    expect(textOf(byTestID('plant-form-reveal-play')[0])).toContain('See your oak’s new form');
  });
});

// ── 3. Skipping on the screen ───────────────────────────────────────────
describe('3. skipping always ends on the new form, seen, with nothing left over', () => {
  const playHeld = () => {
    motionOn();
    setPlant(grown(4));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    setMockHoldAnimations(true);
    mount(<YourPlant />);
    expect(revealMode()).toBe('full');
    expect(useSeen.getState().plantForms?.cisa?.seen).toBe(3);
    setMockHoldAnimations(false); // the 120 ms dissolve lands; the clock stays where it was held
  };
  const endState = () => {
    const stage = byTestID('plant-form-reveal-full')[0];
    expect(stage.props.accessibilityActions).toBeUndefined(); // not playing any more
    expect(byTestID('plant-form-reveal')[0].props.onTouchStart).toBeUndefined();
    expect(byTestID('plant-form-reveal-words')[0].props.accessibilityElementsHidden).toBe(false);
    expect(allText()).toContain('The Standard Oak');
    expect(said()).toEqual(['Kai grows into a new form: the Standard Oak.']);
    expect(useSeen.getState().plantForms?.cisa?.seen).toBe(3);
  };

  it('a tap', () => {
    playHeld();
    act(() => byTestID('plant-form-reveal')[0].props.onTouchStart());
    endState();
  });

  it('a scroll drag on Your plant', () => {
    playHeld();
    const sv = r!.root.findAllByType(ScrollView).find((s) => typeof s.props.onScrollBeginDrag === 'function');
    expect(sv).toBeDefined();
    act(() => sv!.props.onScrollBeginDrag({ nativeEvent: {} }));
    endState();
  });

  it('leaving the app', () => {
    const listeners: ((s: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, fn) => {
      listeners.push(fn as (s: AppStateStatus) => void);
      return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
    });
    playHeld();
    act(() => listeners.forEach((l) => l('background')));
    endState();
  });

  it('navigating away mid-play: nothing said or buzzed off screen, and the next visit shows the new form plainly', () => {
    playHeld();
    setMockHoldAnimations(true);
    unmount();
    expect(said()).toEqual([]);
    expect(success()).toBe(0);
    setMockHoldAnimations(false);
    resetCelebrationsForTest();
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(0);
    expect(byTestID('plant-hero')).toHaveLength(1);
    expect(allText()).toContain('The Standard Oak');
  });

  it('the screen leaves no light, motes or old form behind once it ends', () => {
    playHeld();
    const layersWhilePlaying = byTestID('plant-form-reveal-full')[0].findAll((n) => typeof n.type === 'string' && n.props.pointerEvents === 'none').length;
    act(() => byTestID('plant-form-reveal')[0].props.onTouchStart());
    const layersAfter = byTestID('plant-form-reveal-full')[0].findAll((n) => typeof n.type === 'string' && n.props.pointerEvents === 'none').length;
    // The old tree, both silhouettes and the gathered light are taken off the stage (motes too).
    expect(layersAfter).toBeLessThanOrEqual(layersWhilePlaying - 4);
  });
});

// ── 4. Reduce Motion and haptics ────────────────────────────────────────
describe('4. Reduce Motion and haptics', () => {
  it('Reduce Motion on Your plant: every word at once and readable, never the waiting button', () => {
    setPlant(grown(4));
    useSeen.setState({ plantForms: { cisa: { seen: 2 } } });
    claimMoment(); // even with the moment spent
    mount(<YourPlant />);
    expect(revealMode()).toBe('reduced');
    const words = byTestID('plant-form-reveal-words')[0];
    expect(words.props.accessibilityElementsHidden).toBe(false);
    const t = textOf(words);
    for (const w of ['A new form', FORM_FACTS[4], 'The Standard Oak', 'A clear stem and an upright oval crown; the first acorns.']) expect(t).toContain(w);
    expect(byTestID('plant-form-reveal-play')).toHaveLength(0);
    expect(said()).toEqual(['Kai grows into a new form: the Standard Oak.']);
    expect(success()).toBe(1);
  });

  it('Haptics off: zero haptic calls of any kind, through a full Turning, a wait-then-tap and a skip', () => {
    useSettings.setState({ haptics: false });
    motionOn();
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />); // full, runs to the end
    unmount();
    claimMoment();
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />); // waits
    act(() => byTestID('plant-form-reveal-play')[0].findAll((n) => typeof n.props.onPress === 'function')[0].props.onPress());
    unmount();
    resetCelebrationsForTest();
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    setMockHoldAnimations(true);
    mount(<YourPlant />);
    setMockHoldAnimations(false);
    act(() => byTestID('plant-form-reveal')[0].props.onTouchStart());
    expect(anyHaptic()).toBe(0);
  });
});

// ── 5. The Form IV choice ───────────────────────────────────────────────
describe('5. the Form IV choice', () => {
  it('a final chosen before the Turning (Settings → Change its look) is the form it turns into: name, look line and drawing', async () => {
    motionOn();
    const build = jest.spyOn(art, 'buildPlant');
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } }, plantFinal: { cisa: 'moot' } });
    mount(<YourPlant />);
    await nextFrame();
    expect(revealMode()).toBe('full');
    const t = textOf(byTestID('plant-form-reveal-words')[0]);
    expect(t).toContain('The Moot Oak');
    expect(t).toContain('Long level limbs roof a ring of five stones; the crown sits in tiers.');
    expect(t).not.toContain('Broadcrown');
    const newDrawing = build.mock.calls.find((c) => c[0].stage === 6)![0];
    expect(newDrawing.look?.final).toBe('moot');
    const oldDrawing = build.mock.calls.find((c) => c[0].stage === 5)![0];
    expect(oldDrawing.look?.final).toBeUndefined(); // the old form had no choice yet
    expect(said()).toEqual(['Kai grows into a new form: the Moot Oak.']);
  });

  it('a final chosen while the Turning waits for its tap is the one it plays', () => {
    motionOn();
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    claimMoment();
    mount(<YourPlant />);
    expect(revealMode()).toBe('wait');
    // Scroll down → "Its final form" → Lookout → back (Your plant stays mounted under the Look screen).
    act(() => {
      useSeen.getState().setPlantFinal('cisa', 'lookout');
    });
    act(() => byTestID('plant-form-reveal-play')[0].findAll((n) => typeof n.props.onPress === 'function')[0].props.onPress());
    expect(textOf(byTestID('plant-form-reveal-words')[0])).toContain('The Lookout Oak');
  });

  // BUG QA-TURN-3 (Minor, performance): Your plant passes `fromLook` as a new object on every
  // render (plant.tsx `{ ...view.look.art, final: undefined }`), and FormReveal's layers memo
  // depends on it, so both full drawings are rebuilt on the screen's very next render, which
  // the reveal's own "written down as shown" store write causes right after mount.
  // FIXED: QA-TURN-3, plant.tsx passes a new `fromLook` object every render, so both drawings are rebuilt right after the Turning starts.
  it('on Your plant the two drawings are built once per Turning (never rebuilt by the screen re-rendering)', () => {
    motionOn();
    setMockHoldAnimations(true);
    const build = jest.spyOn(art, 'buildPlant');
    setPlant(grown(6));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    const turnBuilds = build.mock.calls.filter((c) => c[0].fit === false && (c[0].stage === 5 || c[0].stage === 6)).length;
    expect(turnBuilds).toBe(2); // fails: 4 (rebuilt after the seen-write re-render)
  });
});

// ── 6. The widget ───────────────────────────────────────────────────────
describe('6. the widget', () => {
  it('after a Turning seen through Today, the widget snapshot draws the new form (growth and final)', () => {
    motionOn();
    setPlant(reachedTo(6, Date.now(), true));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } }, plantFinal: { cisa: 'holdfast' } });
    mount(<Today />); // the grow-up shows: pending cleared
    unmount();
    mount(<YourPlant />);
    unmount();
    const snap = collectSnapshot(Date.now()).plant;
    expect(snap && 'growth' in snap ? snap.growth : null).toBe(6);
    expect(snap && 'final' in snap ? snap.final : null).toBe('holdfast');
  });

  // BUG QA-TURN-4: the widget hides a growth while `pending` is set (lib/widgetData.ts plantSnap:
  // "the moment is the app's"), and only Today clears it. A learner who goes Results → You →
  // Your plant sees the Turning, and the home-screen widget still draws the OLD form until they
  // next open Today.
  // FIXED: QA-TURN-4, the widget keeps the old form after a Turning seen without opening Today (only Today clears `pending`).
  it('after a Turning seen straight from Results (Today not opened), the widget draws the new form', () => {
    motionOn();
    setPlant(reachedTo(6, Date.now(), true));
    useSeen.setState({ plantForms: { cisa: { seen: 3 } } });
    mount(<YourPlant />);
    expect(reveal()).toHaveLength(1);
    unmount();
    const snap = collectSnapshot(Date.now()).plant;
    expect(snap && 'growth' in snap ? snap.growth : null).toBe(6); // fails: 5 (the old Crown)
  });
});

// ── Review findings P2 and P3 (FormReveal's waiting button and its one moment) ──
describe('review P2 / P3', () => {
  const props = {
    species: 'oak' as const,
    from: 2 as const,
    to: 3 as const,
    theme: 'light' as const,
    size: 200,
    accessibilityLabel: 'Kai, your oak. Whip Oak form. Growth: Shoot.',
    fact: FORM_FACTS[3],
    name: 'Whip Oak',
    lookLine: 'One straight leader with lobed leaves at each node.',
    announce: 'Kai grows into a new form: the Whip Oak.',
    playLabel: 'See Kai’s new form',
    look: { style: 'botanical' as const },
    testID: 'rv',
  };
  const mode = () => (['full', 'reduced', 'wait'] as const).find((m) => byTestID(`rv-${m}`).length) ?? null;
  const tapPlay = () =>
    act(() => {
      byTestID('rv-play')[0].findAll((n) => typeof n.props.onPress === 'function')[0].props.onPress();
    });

  // FIXED: QA-TURN-5 (review P2a), the second tap of a quick double-tap on "See Kai’s new form" lands on the now-playing Turning and skips it.
  it('P2a: a quick double-tap on "See Kai’s new form" still plays the Turning the learner asked for', () => {
    motionOn();
    claimMoment(); // the session's moment was spent elsewhere
    setMockHoldAnimations(true);
    mount(<FormReveal {...props} />);
    tapPlay(); // tap 1
    setMockHoldAnimations(false);
    // Tap 2, a few milliseconds later: its touch reaches the reveal's "any tap skips" handler.
    act(() => {
      byTestID('rv')[0].props.onTouchStart?.();
    });
    expect(byTestID('rv-full')[0].props.accessibilityActions).toEqual([{ name: 'activate', label: 'Show the new form now' }]); // fails: undefined (skipped)
    expect(said()).toEqual([]); // fails: already announced
  });

  // FIXED: QA-TURN-6 (review P2b), play() always sets 'full': Reduce Motion switched on while the Turning waits still plays the full 2.4 to 3.6 s motion.
  it('P2b: Reduce Motion turned on while it waits: the tap plays the 120 ms cross-fade, not the full Turning', () => {
    motionOn();
    claimMoment();
    mount(<FormReveal {...props} />);
    expect(mode()).toBe('wait');
    act(() => {
      useSettings.setState({ motion: 'reduced' }); // Settings → Motion → Reduced, then back to Your plant
    });
    tapPlay();
    expect(mode()).toBe('reduced'); // fails: 'full'
  });

  it('P3: under StrictMode the first render keeps its claim: full motion, and the moment is spent once', () => {
    motionOn();
    mount(
      <StrictMode>
        <FormReveal {...props} />
      </StrictMode>,
    );
    expect(mode()).toBe('full'); // React 19 keeps the first initializer result in StrictMode
  });

  // FIXED: QA-TURN-7 (review P3), claimMoment() runs in a useState initializer: a first render React throws away (a suspended or interrupted render) spends the moment, and the committed one waits behind the button.
  it('P3: a first render that React discards (suspended) does not spend the session’s moment', async () => {
    motionOn();
    let ready = false;
    let release!: () => void;
    const gate = new Promise<void>((res) => {
      release = () => {
        ready = true;
        res();
      };
    });
    function Late() {
      if (!ready) throw gate;
      return null;
    }
    mount(
      <View>
        <Suspense fallback={null}>
          <FormReveal {...props} />
          <Late />
        </Suspense>
      </View>,
    );
    await act(async () => {
      release();
      await gate;
    });
    expect(mode()).toBe('full'); // fails: 'wait' (the discarded render claimed the moment)
  });
});
