/**
 * Mobile 1.18 (expert panel, owner delegated): the plant's proud moments and
 * its breath.
 *
 * Plain English for the founder, what these tests pin:
 * - Proud only for something earned TODAY: a growth step (never a quiet
 *   back-fill) or a new keepsake from a LEARNING badge (never a game-only
 *   badge like All Drills, never Study Return, never a quiet fill).
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

import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { act, type ReactTestRenderer } from 'react-test-renderer';

import { setMockReducedMotion } from '../../jest/reanimated-mock';



import { claimDecor, resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { buildPlant, type GNode, type Lod, type PNode } from '../components/plant/art';
import { breathDepth, claimReaction, relaunchPlantForTest, resetPlantReactionsForTest } from '../components/plant/LivePlant';
import { PLANT_SPECIES } from '../engine/plant';
import { keepsakeForBadge } from '../engine/plantLooks';
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
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { motion, plantArt } from '../theme/tokens';
// Mobile 1.40: these tests check the storybook plant, so they plant as an app from before 1.40 did (no style).
import { legacyPlantNew as plantNew } from '../../jest/legacyPlant';

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
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};

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

  it('only learning badges that give a keepsake: never games alone, Study Return, or a badge without a keepsake', () => {
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

  it.each(PLANT_SPECIES)('%s: flat wide closed eyes and a wide line smile (never happy’s look), blush, in both themes; Quiet look hides it', (species) => {
    // A one-curve stroke "M x0 y0 Q cx cy x1 y1", as numbers.
    const curve = (d: string) => {
      const [x0, y0, cx, cy, x1, y1] = (d.match(/-?[\d.]+/g) ?? []).map(Number);
      return { x0, y0, cx, cy, x1, y1, width: x1 - x0, rise: y0 - cy };
    };
    for (const theme of ['light', 'dark'] as const)
      for (const lod of ['small', 'full'] as Lod[]) {
        const proud = faceOf({ species, stage: 5, theme, lod, mood: 'proud' })!;
        const happy = faceOf({ species, stage: 5, theme, lod, mood: 'happy' })!;
        const idle = faceOf({ species, stage: 5, theme, lod, mood: 'idle' })!;
        expect(proud).not.toBeNull();
        // Closed eyes: no round pupils (idle and curious draw ellipses; proud draws none but the blush).
        expect(proud.children.filter((c) => c.t === 'ellipse' && c.fill === plantArt.ink)).toHaveLength(0);
        // PR #51 review: everything proud draws in ink is a LINE. Happy's mouth
        // is a filled open grin; proud has no filled ink shape at all.
        expect(paths(proud).filter((p) => p.fill === plantArt.ink)).toHaveLength(0);
        expect(paths(happy).filter((p) => p.fill === plantArt.ink)).toHaveLength(1);
        const [eyeL, eyeR, mouth] = paths(proud).filter((p) => p.fill === 'none');
        expect(paths(proud).filter((p) => p.fill === 'none')).toHaveLength(3);
        const happyEye = curve(paths(happy).filter((p) => p.fill === 'none')[0].d);
        for (const e of [eyeL, eyeR].map((p) => curve(p.d))) {
          // Still curving UP (content, never resting's "u" or blink's flat line)...
          expect(e.cy).toBeLessThan(e.y0);
          expect(e.y1).toBeCloseTo(e.y0, 1);
          expect(e.cx).toBeGreaterThan(e.x0);
          // ...but clearly FLATTER and WIDER than happy's tall "^": the cue that tells them apart at 64pt.
          expect(e.rise).toBeLessThan(happyEye.rise * 0.5);
          expect(e.width).toBeGreaterThan(happyEye.width * 1.2);
        }
        // The smile: a stroked ink line curving down in the middle, much wider than rest's smile.
        const m = curve(mouth.d);
        expect(mouth.stroke).toBe(plantArt.ink);
        expect(m.cy).toBeGreaterThan(m.y0);
        const restMouth = curve(paths(idle).find((p) => p.fill === 'none')!.d);
        expect(m.width).toBeGreaterThan(restMouth.width * 2);
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

// ── PR #51 review fixes ─────────────────────────────────────────────────
describe('PR #51 review: a proud moment only counts when it is really seen or new', () => {
  it('a reaction that could not play (the session’s motion budget was spent) is not written down: it plays later', () => {
    // Spend the whole decorative budget for this app session.
    expect(claimDecor(motion.celebrate.sessionMs)).toBe(true);
    expect(claimReaction('proud:keepsake:x')).toBe(false);
    // Not saved as played, in memory or on the phone.
    expect(useSeen.getState().reactions['proud:keepsake:x']).toBeUndefined();
    // A later session (budget fresh, memory gone): it still plays, once.
    relaunchPlantForTest();
    resetCelebrationsForTest();
    expect(claimReaction('proud:keepsake:x')).toBe(true);
    expect(useSeen.getState().reactions['proud:keepsake:x']).toBeDefined();
    expect(claimReaction('proud:keepsake:x')).toBe(false);
  });

  it('engine: after a Reset, re-earning a badge whose keepsake the plant kept is no new keepsake', () => {
    const today = dayKey(T0);
    const kept = [keepsakeForBadge('dress-rehearsal')!.id];
    expect(keepsakeOccasions([{ earned: { 'dress-rehearsal': T0 } }], today, kept)).toEqual([]);
    // A badge whose keepsake was never kept still counts.
    expect(keepsakeOccasions([{ earned: { 'dress-rehearsal': T0, 'loop-closed': T0 + 1 } }], today, kept)).toEqual([{ id: `keepsake:loop-closed:${T0 + 1}`, kind: 'keepsake', at: T0 + 1 }]);
  });
});
