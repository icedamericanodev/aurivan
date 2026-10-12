/**
 * Mobile 1.18 (expert panel, owner delegated): the plant's proud moments and
 * its breath.
 *
 * Plain English for the founder, what these tests pin:
 * - Proud only for something earned TODAY: a growth step (never a quiet
 *   back-fill) or a new keepsake from a LEARNING badge (never a game-only
 *   badge like Whole Grove, never Fresh Start, never a quiet fill).
 * - Each proud occasion plays its "stand tall" once, EVER: it is saved on the
 *   phone, so closing and reopening the app never replays it.
 * - At most 3 keepsake occasions in any 7 days make the plant proud (seeded
 *   clock); growth always does.
 * - The proud face lasts until local midnight, then the plant is idle again.
 * - The breath is about 2pt deep at any size (1.2%–2.0%), once per surface
 *   per app session, on You and Your plant only.
 * - No answering screen (practice, review, mock, lesson steps, games in play,
 *   answer feedback) can draw the plant, its face or any looping art.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import * as Reanimated from 'react-native-reanimated';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import YourPlant from '../app/plant';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { buildPlant, type GNode, type Lod, type PNode } from '../components/plant/art';
import { breathDepth, relaunchPlantForTest, resetPlantReactionsForTest } from '../components/plant/LivePlant';
import { plantNew, PLANT_SPECIES, type CertPlant } from '../engine/plant';
import {
  admitProud,
  growthOccasions,
  isLearningKeepsakeBadge,
  keepsakeOccasions,
  PROUD_KEEPSAKE_CAP,
  proudReactionId,
  proudToday,
  type ProudLog,
  type ProudOccasion,
} from '../engine/proud';
import { dayKey } from '../engine/streak';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { motion, plantArt } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null, BadgeShareCard: () => null }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => '/tmp/card.png'), releaseCapture: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: jest.fn(), selection: jest.fn(), error: jest.fn(), light: jest.fn() } }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => ({ granted: true }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: async () => {},
  scheduleNotificationAsync: async (req: { identifier: string }) => req.identifier,
}));

// ── Helpers ──────────────────────────────────────────────────────────────
const DAY = 86_400_000;
/** A seeded clock: Monday 12 Oct 2026, 10:00 local time. */
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
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
const plants = () => root().findAll((n) => typeof n.type !== 'string' && typeof n.props.species === 'string' && typeof n.props.stage === 'number' && typeof n.props.size === 'number');
const hero = () => plants().find((x: ReactTestInstance) => x.props.testID === 'plant-hero')!;
/** The stand-tall reactions started (their first tween is 30% of motion.plant.react; happy's too). */
const reactCalls = (spy: jest.SpyInstance) => spy.mock.calls.filter((c) => (c[1] as { duration?: number } | undefined)?.duration === motion.plant.react * 0.3).length;
/** The Breathe burst's out-breaths (only the breath uses motion.plant.breathOut). */
const breathCalls = (spy: jest.SpyInstance) => spy.mock.calls.filter((c) => (c[1] as { duration?: number } | undefined)?.duration === motion.plant.breathOut).length;
const setPlant = (p: CertPlant | undefined, cert = 'cisa') =>
  act(() => {
    useProgress.getState().updatePlant(cert, () => p);
  });
const earn = (key: string, at = Date.now(), certId = 'cisa') =>
  act(() => {
    useProgress.setState((s) => {
      const c = selectCert(s, certId);
      const m = { ...(c.milestones ?? { earned: {} }), earned: { ...(c.milestones?.earned ?? {}), [key]: at } };
      return { byCert: { ...s.byCert, [certId]: { ...c, milestones: m } } };
    });
  });
const motionOn = () => {
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
};
/** A plant grown some days ago (no growth today). */
const grownAgo = (growth: CertPlant['growth']) => plantNew('oak', 'Kai', Date.now() - 5 * DAY, growth);
const setNow = (ms: number) => jest.setSystemTime(ms);

beforeEach(() => {
  jest.useFakeTimers({ now: T0, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  resetPlantReactionsForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, reactions: {}, proud: {} });
  act(() => {
    useProgress.setState({
      byCert: { cisa: { answers: {}, review: {}, mistakes: {}, mocks: [], milestones: { earned: {}, backfill: { at: T0 - 90 * DAY, count: 0, seen: true }, catalog: 2 } } as never },
      plantSettings: undefined,
      streak: { current: 0, best: 0, lastDay: null },
      today: { day: '', answered: 0 },
      days: {},
    });
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' }, badgesHidden: false });
});
afterEach(() => {
  unmount();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ── The rules (engine/proud.ts) ─────────────────────────────────────────
describe('what may make the plant proud (engine)', () => {
  const today = dayKey(T0);

  it('only learning badges that give a keepsake: never games alone, Fresh Start, or a badge without a keepsake', () => {
    for (const b of ['first-foothold', 'topic-clear', 'whole-map', 'long-memory', 'graduate', 'loop-closed', 'took-root', 'slip-spotter', 'dress-rehearsal', 'on-pace'])
      expect([b, isLearningKeepsakeBadge(b)]).toEqual([b, true]);
    for (const b of ['whole-grove', 'snare-wise', 'even-keel', 'signpost-reader', 'myth-clearer', 'sure-footed-pace', 'back-on-path', 'fresh-start', 'firm-footing', 'rooted', 'made-up'])
      expect([b, isLearningKeepsakeBadge(b)]).toEqual([b, false]);
  });

  it('a growth step reached today counts; a back-filled one or one from another day does not', () => {
    const p = plantNew('oak', 'Kai', T0, 4); // planted today with growth filled in quietly
    expect(growthOccasions('cisa', p, today)).toEqual([]);
    const grew = { ...p, growth: 5 as const, reached: { ...p.reached, crown: T0 + 1000 } };
    expect(growthOccasions('cisa', grew, today)).toEqual([{ id: `growth:cisa:crown:${T0 + 1000}`, kind: 'growth', at: T0 + 1000 }]);
    expect(growthOccasions('cisa', grew, dayKey(T0 + DAY))).toEqual([]);
  });

  it('a keepsake counts on the day its badge’s FIRST tier was earned live, on any exam; quiet fills never', () => {
    expect(keepsakeOccasions([{ earned: { 'long-memory': T0 } }], today)).toEqual([{ id: `keepsake:long-memory:${T0}`, kind: 'keepsake', at: T0 }]);
    // A higher tier of a badge already held (here or on another exam) is no new keepsake.
    expect(keepsakeOccasions([{ earned: { 'long-memory': T0 - 30 * DAY, 'long-memory:75': T0 } }], today)).toEqual([]);
    expect(keepsakeOccasions([{ earned: { 'on-pace:2': T0 } }, { earned: { 'on-pace': T0 - 9 * DAY } }], today)).toEqual([]);
    // Game-only badges never.
    expect(keepsakeOccasions([{ earned: { 'whole-grove': T0, 'snare-wise': T0 } }], today)).toEqual([]);
    // Saved quietly by the back-fill or the catalogue fill: never an occasion.
    expect(keepsakeOccasions([{ earned: { 'long-memory': T0 }, backfill: { at: T0 } }], today)).toEqual([]);
    expect(keepsakeOccasions([{ earned: { 'took-root': T0 }, backfill: { at: T0 - DAY }, catalogFill: { at: T0 } }], today)).toEqual([]);
  });

  it('keepsakes are capped at 3 in any rolling 7 days (seeded clock); growth always counts', () => {
    const k = (badge: string, at: number): ProudOccasion => ({ id: `keepsake:${badge}:${at}`, kind: 'keepsake', at });
    let log: ProudLog = {};
    const days = ['first-foothold', 'topic-clear', 'long-memory', 'loop-closed'];
    days.forEach((b, i) => {
      log = admitProud(log, [k(b, T0 + i * DAY)], T0 + i * DAY);
    });
    expect(PROUD_KEEPSAKE_CAP).toBe(3);
    expect(Object.values(log).map((e) => e.capped ?? false)).toEqual([false, false, false, true]);
    // The 4th day's keepsake is not proud; the same day's growth still is.
    const fourth = [k('loop-closed', T0 + 3 * DAY)];
    expect(proudToday(log, fourth, T0 + 3 * DAY)).toEqual({ grew: false, keepsake: false, ids: [] });
    const grow: ProudOccasion = { id: `growth:cisa:crown:${T0 + 3 * DAY + 1}`, kind: 'growth', at: T0 + 3 * DAY + 1 };
    expect(proudToday(log, [...fourth, grow], T0 + 3 * DAY)).toEqual({ grew: true, keepsake: false, ids: [grow.id] });
    // Rolling: 7 days after the first, a slot opens again.
    log = admitProud(log, [k('took-root', T0 + 6 * DAY)], T0 + 6 * DAY);
    expect(log[`keepsake:took-root:${T0 + 6 * DAY}`].capped).toBe(true);
    log = admitProud(log, [k('whole-map', T0 + 7 * DAY)], T0 + 7 * DAY);
    expect(log[`keepsake:whole-map:${T0 + 7 * DAY}`].capped).toBeUndefined();
  });

  it('an occasion is written once (same object back when nothing is new); old entries are dropped', () => {
    const o: ProudOccasion = { id: `keepsake:lantern:${T0}`, kind: 'keepsake', at: T0 };
    const log = admitProud({}, [o], T0);
    expect(admitProud(log, [o], T0 + 1000)).toBe(log);
    expect(admitProud(log, [], T0 + 15 * DAY)).toEqual({});
  });

  it('the reaction id is stable for the same occasions, and new for a new one', () => {
    expect(proudReactionId([])).toBeNull();
    expect(proudReactionId(['b', 'a'])).toBe(proudReactionId(['a', 'b']));
    expect(proudReactionId(['a', 'c'])).not.toBe(proudReactionId(['a']));
  });
});

// ── On the screens ──────────────────────────────────────────────────────
describe('proud on the screens', () => {
  it('a new learning keepsake: proud and one stand-tall on Your plant; a game-only badge: neither', () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo(3));
    earn('whole-grove', T0 - 60_000);
    mount(<YourPlant />);
    expect(hero().props.mood).toBe('idle');
    expect(reactCalls(spy)).toBe(0);
    unmount();
    earn('dress-rehearsal', T0 - 30_000);
    mount(<YourPlant />);
    expect(hero().props.mood).toBe('proud');
    expect(reactCalls(spy)).toBe(1);
  });

  it('a relaunch never replays the proud reaction: the occasion is saved on the phone and loaded back', async () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo(3));
    earn('dress-rehearsal', T0 - 30_000);
    mount(<YourPlant />);
    expect(reactCalls(spy)).toBe(1);
    unmount();
    // Let the seen store's save reach the phone's storage.
    await act(async () => {
      await Promise.resolve();
    });
    const raw = (await AsyncStorage.getItem('aurivan.seen.v1')) ?? '{}';
    expect(Object.keys(JSON.parse(raw).state.reactions)).toEqual([`proud:keepsake:dress-rehearsal:${T0 - 30_000}`]);
    // The relaunch: memory gone, the seen store emptied, then loaded back from
    // what the phone saved (put back, since emptying the store saves too).
    relaunchPlantForTest();
    resetCelebrationsForTest();
    useSeen.setState({ reactions: {}, proud: {} });
    await AsyncStorage.setItem('aurivan.seen.v1', raw);
    await act(async () => {
      await useSeen.persist.rehydrate();
    });
    expect(Object.keys(useSeen.getState().reactions)).toHaveLength(1);
    mount(<YourPlant />);
    expect(hero().props.mood).toBe('proud'); // the face stays for the day
    expect(reactCalls(spy)).toBe(1); // no second stand-tall
    unmount();
    mount(<Today />);
    expect(reactCalls(spy)).toBe(1);
  });

  it('the cap on the screens: a 4th keepsake within 7 days leaves the plant as it was (no face, no stand-tall)', () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo(3));
    ['first-foothold', 'topic-clear', 'loop-closed', 'slip-spotter'].forEach((b, i) => {
      setNow(T0 + i * DAY);
      earn(b, T0 + i * DAY);
      mount(<YourPlant />);
      expect([b, hero().props.mood]).toEqual([b, i < 3 ? 'proud' : 'idle']);
      unmount();
    });
    expect(reactCalls(spy)).toBe(3);
    // Growth that same day always makes it proud.
    const p = grownAgo(3);
    setPlant({ ...p, growth: 4, reached: { ...p.reached, bough: Date.now() } });
    mount(<YourPlant />);
    expect(hero().props.mood).toBe('proud');
    expect(reactCalls(spy)).toBe(4);
  });

  it('the proud face lasts until local midnight, then idle', () => {
    setPlant(grownAgo(3));
    earn('dress-rehearsal', T0);
    mount(<YourPlant />);
    expect(hero().props.mood).toBe('proud');
    unmount();
    setNow(new Date(2026, 9, 12, 23, 59, 0).getTime());
    mount(<YourPlant />);
    expect(hero().props.mood).toBe('proud');
    unmount();
    setNow(new Date(2026, 9, 13, 0, 1, 0).getTime());
    mount(<YourPlant />);
    expect(hero().props.mood).toBe('idle');
  });

  it('Quiet look: no face, no reaction; the single breath stays', () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    act(() => {
      useProgress.getState().setPlantSettings({ quietLook: true });
    });
    setPlant(grownAgo(3));
    earn('dress-rehearsal', T0);
    mount(<YourPlant />);
    expect(hero().props.mood).toBe('idle');
    expect(reactCalls(spy)).toBe(0);
    expect(breathCalls(spy)).toBe(1);
  });
});

// ── The breath ──────────────────────────────────────────────────────────
describe('the breath', () => {
  it('is about 2pt deep at any size, clamped to 1.2%–2.0%', () => {
    expect(breathDepth(64)).toBe(0.02); // 2/64 = 3.1%, clamped
    expect(breathDepth(104)).toBeCloseTo(2 / 104, 10); // 1.92%
    expect(breathDepth(140)).toBeCloseTo(2 / 140, 10); // 1.43%
    expect(breathDepth(200)).toBe(0.012); // 2/200 = 1.0%, clamped up
    for (const s of [64, 104, 140, 200]) {
      expect(breathDepth(s)).toBeGreaterThanOrEqual(0.012);
      expect(breathDepth(s)).toBeLessThanOrEqual(0.02);
    }
    // LivePlant reads its depth from this one function.
    const src = readFileSync(join(__dirname, '../components/plant/LivePlant.tsx'), 'utf8');
    expect(src).toMatch(/const amp = breathDepth\(size\);/);
  });

  it('one breath, 2 s in and 2.4 s out, never looped', () => {
    expect(motion.plant).toMatchObject({ breath: 2000, breathOut: 2400, breaths: 1 });
  });

  it('once per surface per app session: Your plant breathes once, then not on the next visit; a new session breathes again', () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo(3));
    mount(<YourPlant />);
    expect(breathCalls(spy)).toBe(1);
    unmount();
    mount(<YourPlant />);
    expect(breathCalls(spy)).toBe(1);
    unmount();
    relaunchPlantForTest();
    mount(<YourPlant />);
    expect(breathCalls(spy)).toBe(2);
  });

  it('Today never breathes; You does once; nothing breathes under Reduce Motion', () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo(3));
    mount(<Today />);
    expect(breathCalls(spy)).toBe(0);
    unmount();
    mount(<You />);
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(breathCalls(spy)).toBe(1);
    unmount();
    relaunchPlantForTest();
    setMockReducedMotion(true);
    setSystemReducedMotionForTest(true);
    mount(<YourPlant />);
    expect(breathCalls(spy)).toBe(1);
  });

  it('only You and Your plant pass `breathe` to the plant; no other screen can', () => {
    const SRC = join(__dirname, '..');
    const files = readdirSync(SRC, { recursive: true })
      .map(String)
      .filter((f) => /\.tsx$/.test(f) && !f.startsWith('__tests__'));
    const surfaces: string[] = [];
    for (const f of files) {
      const src = readFileSync(join(SRC, f), 'utf8');
      // Every <LivePlant …/> element, up to its end.
      for (const m of src.matchAll(/<LivePlant\b[\s\S]*?\/>/g)) {
        const b = /\bbreathe=\{?["'`]?([\w-]*)/.exec(m[0]);
        if (b) surfaces.push(`${f}:${b[1]}`);
      }
    }
    expect(surfaces.sort()).toEqual(['app/(tabs)/you.tsx:you', 'app/plant.tsx:plant']);
  });
});

// ── Never while answering ───────────────────────────────────────────────
describe('never on an answering screen: no plant, face or ambient motion', () => {
  const SRC = join(__dirname, '..');
  const resolveImport = (from: string, spec: string): string | null => {
    const base = resolve(dirname(from), spec);
    for (const c of [`${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')]) if (existsSync(c)) return c;
    return null;
  };
  const reach = (entry: string): string[] => {
    const seen = new Set<string>();
    const todo = [entry];
    while (todo.length) {
      const f = todo.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      for (const m of readFileSync(f, 'utf8').matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
        const to = resolveImport(f, m[1]);
        if (to && to.startsWith(SRC) && !to.includes('/content/generated/')) todo.push(to);
      }
    }
    return [...seen].map((x) => x.slice(SRC.length + 1));
  };
  // Practice and review run in session.tsx (its quiz and answer feedback in
  // components/quiz.tsx), the mock in mock-start + session, lesson steps in
  // lesson/[id], and every game in app/game.
  const screens = [
    'app/session.tsx',
    'app/mock-start.tsx',
    'app/guided.tsx',
    ...readdirSync(join(SRC, 'app/game')).map((f) => `app/game/${f}`),
    ...readdirSync(join(SRC, 'app/lesson')).map((f) => `app/lesson/${f}`),
  ];
  it.each(screens)('%s', (screen) => {
    const files = reach(join(SRC, screen));
    expect(files).toContain('components/ui.tsx');
    // No plant drawing, face or motion module is even imported.
    expect(files.filter((x) => x.startsWith('components/plant/'))).toEqual([]);
    let panels = 0;
    for (const f of files) {
      const src = readFileSync(join(SRC, f), 'utf8');
      if (f !== 'lib/plant.ts') expect([f, /usePlantView\(|<LivePlant\b|<Plant\b|<PlantButton|<KeepsakeIcon/.test(src)]).toEqual([f, false]);
      // Looping art: only the hero panel's frond sway loops, and every hero panel here is still.
      if (f !== 'components/glyphs.tsx') expect([f, /withRepeat\(/.test(src)]).toEqual([f, false]);
      if (f !== 'components/ui.tsx' && f !== 'components/glyphs.tsx') expect([f, /<Botany\b/.test(src)]).toEqual([f, false]);
      // Each hero panel's props (up to the line that closes its opening tag) say sway={false}.
      for (const m of src.matchAll(/<HeroPanel\b[\s\S]*?\n\s*\/?>\s*\n/g)) {
        panels++;
        expect([f, m[0].includes('sway={false}')]).toEqual([f, true]);
      }
    }
    // The lesson cover's forest panel is checked (the scan is not empty).
    if (screen.startsWith('app/lesson/')) expect(panels).toBeGreaterThan(0);
  });
});

// ── The proud face (redrawn in 1.18) ────────────────────────────────────
describe('the proud face', () => {
  const faceOf = (o: Parameters<typeof buildPlant>[0]): GNode | null => {
    const find = (n: PNode): GNode | null => (n.t === 'g' ? (n.id === 'face' ? n : n.children.map(find).find(Boolean) ?? null) : null);
    return find(buildPlant(o).root);
  };
  const paths = (g: GNode) => g.children.filter((c): c is Extract<PNode, { t: 'path' }> => c.t === 'path');
  const colours = (g: GNode) => new Set(g.children.flatMap((c) => [c.fill, c.stroke]).filter((x): x is string => !!x && x !== 'none'));

  it.each(PLANT_SPECIES)('%s: closed eyes in upward arcs, a wide warm grin and blush, in both themes; Quiet look hides it', (species) => {
    for (const theme of ['light', 'dark'] as const)
      for (const lod of ['small', 'full'] as Lod[]) {
        const proud = faceOf({ species, stage: 5, theme, lod, mood: 'proud' })!;
        const happy = faceOf({ species, stage: 5, theme, lod, mood: 'happy' })!;
        const idle = faceOf({ species, stage: 5, theme, lod, mood: 'idle' })!;
        expect(proud).not.toBeNull();
        // Closed eyes: no round pupils (idle and curious draw ellipses; proud draws none but the blush).
        expect(proud.children.filter((c) => c.t === 'ellipse' && c.fill === plantArt.ink)).toHaveLength(0);
        // Two eye strokes curving UP: the control point sits above both ends ("happy arcs", never resting's "u").
        const eyes = paths(proud).filter((p) => p.fill === 'none');
        expect(eyes).toHaveLength(2);
        for (const e of eyes) {
          const [x0, y0, cx, cy, x1, y1] = (e.d.match(/-?[\d.]+/g) ?? []).map(Number);
          expect(cy).toBeLessThan(y0);
          expect(y1).toBeCloseTo(y0, 1);
          expect(x1 - x0).toBeGreaterThan(0);
          expect(cx).toBeGreaterThan(x0);
        }
        // The grin: one filled ink crescent, wider than rest's smile.
        const grin = paths(proud).filter((p) => p.fill === plantArt.ink);
        expect(grin).toHaveLength(1);
        const width = (d: string) => {
          const xs = (d.match(/[MQ]\s*(-?[\d.]+)/g) ?? []).map((m) => Number(m.slice(1)));
          return Math.max(...xs) - Math.min(...xs);
        };
        const restMouth = paths(idle).find((p) => p.fill === 'none')!;
        expect(width(grin[0].d)).toBeGreaterThan(width(restMouth.d) * 1.8);
        // A faint blush, a little warmer than happy's.
        const blush = (g: GNode) => g.children.filter((c) => c.t === 'ellipse' && c.fill === plantArt.blush).map((c) => c.opacity ?? 1);
        expect(blush(proud)).toHaveLength(2);
        expect(Math.min(...blush(proud))).toBeGreaterThan(Math.max(...blush(happy)));
        // Distinct from happy and from rest; only the plant's own tokens.
        expect(JSON.stringify(proud)).not.toBe(JSON.stringify(happy));
        expect(JSON.stringify(proud)).not.toBe(JSON.stringify(idle));
        for (const c of colours(proud)) expect([plantArt.ink, plantArt.blush]).toContain(c);
        // Quiet look: no face at all.
        expect(faceOf({ species, stage: 5, theme, lod, mood: 'proud', quietLook: true })).toBeNull();
      }
  });
});
