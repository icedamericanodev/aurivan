/**
 * QA for PR #44, mobile 1.14.0 "Dress and Alive" (Phase 4b). Journey tests on
 * the real stores, screens and backup code, written by the QA pass.
 *
 * Journeys:
 *  J1  Look: pick a colour, a ground, a planter and a visitor; up to three
 *      keepsakes, a fourth refused politely, de-select works
 *  J2  earn a badge: its keepsake opens with its caption; the badge sheet says
 *      "On your plant: …"
 *  J3  complete a set: its planter opens, exactly once
 *  J4  Reset: back to a seed, the look and its unlocks kept
 *  J5  backup: round trip with a look; an old 1.13 file; tampered files
 *  J6  an unlock that vanishes after a restore falls back at render, and the
 *      stored choice comes back when it is re-earned
 *  J7  switching certification: one look per exam's plant
 *  J8  moods: one reaction per mood per day; a growth step is proud; Quiet
 *      look has no mood
 *  J9  the celebration budget: growth plus a milestone or the clearing is
 *      never a double moment
 *  J10 Reduce Motion: nothing moves, the end state shows
 *  J11 Show my plant OFF: no Look entry, no motion
 *  J12 never on question, mock, lesson or game screens
 *
 * The `// QA-BUG:` pins of this pass (QA_44.md) are flipped: each now
 * asserts the fixed behaviour and says which finding it closes ("Fixed").
 */
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import { router } from 'expo-router';
import { installFakePack } from '../../jest/fakePack';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import Badges from '../app/milestones';
import PlantLook from '../app/plant-look';
import YourPlant from '../app/plant';
import { pickCelebration, resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { claimReaction, relaunchPlantForTest, resetPlantReactionsForTest } from '../components/plant/LivePlant';
import { BACKUP_APP, BACKUP_SCHEMA } from '../engine/backup';
import { withLook, type CertPlant } from '../engine/plant';
import { keepsakeForBadge, lookItem, MAX_SHOWN_KEEPSAKES, plantMood, resolveLook, toggleKeepsake, unlockedLooks } from '../engine/plantLooks';
import { PROGRESS_VERSION, SETTINGS_VERSION } from '../engine/saveMigrations';
import { dayKey } from '../engine/streak';
import { checkBackupText, currentBackup, restoreBackup } from '../lib/backup';
import { haptic } from '../lib/haptics';
import { syncPlanters } from '../lib/milestones';
import { allCertMarks, plantLookView } from '../lib/plant';
import { CATALOG_VERSION } from '../engine/badgeCatalog';
import { useBackup } from '../store/backup';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { motion } from '../theme/tokens';
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
let r: ReactTestRenderer | undefined;
/** A stand-in pack a test installed (removed after it). */
let undoPack: (() => void) | undefined;
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
/** Opens the Look screen's closed "More to find" group (the planters and keepsakes still to earn, UX review P1). */
const openMore = () => {
  const b = root().findAll((n) => n.props.testID === 'look-more' && typeof n.props.onPress === 'function')[0];
  if (!b) throw new Error('no More to find');
  act(() => {
    b.props.onPress();
  });
};
/** A Look option's Pressable (it carries the role, state, label and onPress). */
const option = (id: string) => root().findAll((n) => n.props.testID === `look-${id}` && n.props.accessibilityRole !== undefined)[0];
const tap = (id: string) => {
  const n = option(id);
  if (!n) throw new Error(`no option ${id}`);
  act(() => {
    n.props.onPress?.();
  });
};
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
/** Every drawn plant (LivePlant or Plant: the composite with species, stage and size). */
const plants = () => root().findAll((n) => typeof n.type !== 'string' && typeof n.props.species === 'string' && typeof n.props.stage === 'number' && typeof n.props.size === 'number');
/** The moving layers (Animated.View wrappers carry a transformOrigin). */
const movingLayers = (within?: string) => {
  const scope = within ? root().findAll((n) => n.props.testID === within && typeof n.type === 'string')[0] : root();
  return scope.findAll((n) => typeof n.type === 'string' && JSON.stringify(n.props.style ?? '').includes('transformOrigin'));
};
/** The growth line's celebration on Today (the PlantNote's <Celebrate>). */
const growthNoteMode = () => root().findAll((n) => typeof n.type !== 'string' && n.props.celebration && n.findAll((m) => m.props.testID === 'plant-grew').length > 0)[0]?.props.celebration.mode;
/** A proud reaction's own tweens (30% and 70% of motion.plant.react). */
const proudCalls = (spy: jest.SpyInstance) => spy.mock.calls.filter((c) => (c[1] as { duration?: number } | undefined)?.duration === motion.plant.react * 0.3).length;
const cp = (cert = 'cisa') => selectCert(useProgress.getState(), cert);
const setPlant = (p: CertPlant | undefined, cert = 'cisa') =>
  act(() => {
    useProgress.getState().updatePlant(cert, () => p);
  });
const earn = (key: string, certId = 'cisa', at = Date.now()) =>
  act(() => {
    useProgress.setState((s) => {
      const c = selectCert(s, certId);
      const m = { ...(c.milestones ?? { earned: {} }), earned: { ...(c.milestones?.earned ?? {}), [key]: at } };
      return { byCert: { ...s.byCert, [certId]: { ...c, milestones: m } } };
    });
  });
const setWindow = (width: number, fontScale: number) =>
  act(() => {
    const w = Dimensions.get('window');
    Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } });
  });
const layout = (width: number) => {
  const sv = root().findAll((n) => typeof n.props.onLayout === 'function' && n.props.contentContainerStyle)[0];
  act(() => {
    sv.props.onLayout({ nativeEvent: { layout: { width, height: 800 } } });
  });
};
const motionOn = () => {
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
};
const today = () => dayKey(Date.now());
/** A plant grown some days ago (no growth today, so not proud). */
const grownAgo = (species: CertPlant['species'], name: string, growth: CertPlant['growth']) => plantNew(species, name, Date.now() - 5 * DAY, growth);
/** Today's plan, cleared. */
const clearPlan = (cert = 'cisa') =>
  act(() => {
    useProgress.setState((s) => ({
      days: { ...s.days, [cert]: { day: today(), certId: cert, items: [{ kind: 'review', count: 5 } as never], done: [true], start: { score: 0, domains: {} }, answered: 5, correct: 4, minutes: 5 } },
    }));
  });
/** The breath's own out-breaths (motion.plant.breathOut ms, one per breath): only the Breathe burst uses that duration. */
const breathCalls = (spy: jest.SpyInstance) => spy.mock.calls.filter((c) => (c[1] as { duration?: number } | undefined)?.duration === motion.plant.breathOut).length;
/** A backup file of our own shape, with a given byCert. */
const fileWith = (byCert: Record<string, unknown>, appVersion = '1.14.0') =>
  JSON.stringify({
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    appVersion,
    stores: {
      settings: { version: SETTINGS_VERSION, state: { onboarded: true, activeCertId: 'cisa' } },
      progress: { version: PROGRESS_VERSION, state: { byCert, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 } } },
    },
  });
const okRead = (text: string) => {
  const read = checkBackupText(text);
  if (read.kind !== 'ok') throw new Error(read.code);
  return read;
};

beforeEach(() => {
  setWindow(393, 1);
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  resetPlantReactionsForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.setState({ byCert: {}, plantSettings: undefined, reports: undefined, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  });
  useSession.getState().clear();
  useBackup.getState().setUndo(null);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' }, badgesHidden: false });
  jest.mocked(router.push).mockClear();
  jest.mocked(haptic.success).mockClear();
  jest.mocked(haptic.selection).mockClear();
});
afterEach(() => {
  unmount();
  undoPack?.();
  undoPack = undefined;
  jest.restoreAllMocks();
});

// ── J1 Look ──────────────────────────────────────────────────────────────
describe('J1 the Look screen', () => {
  it('picks a colour, a ground, a planter and a visitor; each is one tap, saved at once, with a selection haptic', () => {
    // Crown: the third colourway (Bough), the robin (Shoot) and the stone ring (Crown) are open.
    setPlant(grownAgo('maple', 'Ada', 5));
    mount(<PlantLook />);
    layout(353);
    tap('maple-summer');
    tap('stone-ring');
    tap('terracotta');
    tap('robin');
    expect(cp().plant!.look).toEqual({ colourway: 'maple-summer', ground: 'stone-ring', planter: 'terracotta', visitor: 'robin' });
    expect(haptic.selection).toHaveBeenCalledTimes(4);
    // The screen shows the new choices as selected (radio state), and the preview wears them.
    for (const id of ['maple-summer', 'stone-ring', 'terracotta', 'robin']) expect(option(id).props.accessibilityState).toMatchObject({ checked: true });
    expect(option('maple-autumn').props.accessibilityState).toMatchObject({ checked: false });
    const preview = plants().find((p) => p.props.testID === 'look-preview')!;
    expect(preview.props.look).toMatchObject({ ground: 'stone-ring', planter: 'terracotta', visitor: 'robin' });
    // Trail blaze (Elder) is still closed and says how to open it, never as a guilt line.
    expect(option('trail-blaze').props.accessibilityState).toMatchObject({ disabled: true });
    expect(option('trail-blaze').props.accessibilityLabel).toMatch(/Opens when your plant reaches Elder\./);
    expect(allText()).not.toMatch(/\bstage\b|missing|Pokémon|Pokemon|buy|\$|unlocked!/i);
    // Growth is never touched by a look.
    expect(cp().plant!.growth).toBe(5);
  });

  it('keepsakes: up to three; a fourth is refused (no change, no crash); de-select puts one away', () => {
    setPlant(grownAgo('oak', 'Kai', 3));
    for (const k of ['dress-rehearsal', 'on-pace', 'snare-wise', 'signpost-reader']) earn(k, 'cisa', Date.now() - 3 * DAY);
    mount(<PlantLook />);
    // Never chosen: the first three earned are on show (UX review H1, decided; same day, so catalogue order).
    expect(cp().plant!.look?.keepsakes).toBeUndefined();
    for (const id of ['lantern', 'sundial', 'fox']) expect(option(id).props.accessibilityState).toMatchObject({ checked: true });
    // The fourth: disabled for a tap, and its spoken label says how to make room.
    const signpost = option('signpost');
    expect(signpost.props.accessibilityState).toMatchObject({ checked: false, disabled: true });
    expect(signpost.props.accessibilityLabel).toMatch(/Put one away to show this\./);
    expect(signpost.props.onPress).toBeUndefined();
    tap('signpost');
    expect(cp().plant!.look?.keepsakes).toBeUndefined();
    // The store refuses a fourth too, whatever calls it.
    act(() => {
      useProgress.getState().setPlantLook('cisa', { keepsakes: ['lantern', 'sundial', 'fox', 'signpost'] });
    });
    expect(cp().plant!.look?.keepsakes).toHaveLength(MAX_SHOWN_KEEPSAKES);
    expect(toggleKeepsake(['lantern', 'sundial', 'fox'], 'signpost')).toEqual(['lantern', 'sundial', 'fox']);
    // De-select, then the fourth fits.
    tap('sundial');
    expect(cp().plant!.look?.keepsakes).toEqual(['lantern', 'fox']);
    expect(option('signpost').props.accessibilityState).toMatchObject({ disabled: false });
    tap('signpost');
    expect(cp().plant!.look?.keepsakes).toEqual(['lantern', 'fox', 'signpost']);
    // Put every one away: "none on show" is the learner's own choice, kept as
    // an empty list, so the default three never come back by themselves.
    tap('lantern');
    tap('fox');
    tap('signpost');
    expect(cp().plant!.look?.keepsakes).toEqual([]);
    for (const id of ['lantern', 'sundial', 'fox', 'signpost']) expect(option(id).props.accessibilityState).toMatchObject({ checked: false, disabled: false });
  });

  it('the fourth keepsake is visibly muted and the section says why (Fixed: QA BUG-1, UX review H3)', () => {
    setPlant(grownAgo('oak', 'Kai', 3));
    for (const k of ['dress-rehearsal', 'on-pace', 'snare-wise', 'signpost-reader']) earn(k, 'cisa', Date.now() - 3 * DAY);
    /** Every style drawn inside an option (its art's opacity and its label's colour). */
    const looks = (id: string) => JSON.stringify(option(id).findAll((n) => typeof n.type === 'string').map((n) => n.props.style));
    act(() => {
      useProgress.getState().setPlantLook('cisa', { keepsakes: ['lantern', 'sundial'] });
    });
    mount(<PlantLook />);
    const openLooks = looks('signpost');
    expect(allText()).toMatch(/Show up to three/);
    expect(allText()).not.toMatch(/Tap one that’s on show to put it away/);
    unmount();
    act(() => {
      useProgress.getState().setPlantLook('cisa', { keepsakes: ['lantern', 'sundial', 'fox'] });
    });
    mount(<PlantLook />);
    // Visible, not only spoken: the section says three are on show and how to make room.
    expect(allText()).toMatch(/Three on show/);
    expect(allText()).toMatch(/Tap one that’s on show to put it away, then pick another\./);
    // The waiting row is drawn muted (its art at half strength, its name in ink2), unlike an open one.
    expect(looks('signpost')).not.toBe(openLooks);
    expect(looks('signpost')).toMatch(/"opacity":0\.5/);
    // A shown keepsake carries a ✓ (beside its ring), the waiting one none.
    expect(option('fox').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('works at 360 dp and 200% text: one column of rows, every section there', () => {
    setWindow(360, 2);
    setPlant(grownAgo('lotus', 'Nila', 4));
    mount(<PlantLook />);
    layout(360);
    for (const s of ['Colour', 'Ground', 'Planter', 'Visitor', 'Keepsakes']) expect(allText()).toContain(s);
    // Rows: no fixed tile width on any option.
    openMore();
    for (const id of ['lotus-pink', 'meadow', 'native', 'wren', 'lantern']) expect(option(id).props.style[0].width).toBeUndefined();
    // The lotus' own ground is a bowl: the terracotta pot is still offered (only the cactus' own pot is terracotta).
    expect(option('terracotta')).toBeDefined();
  });
});

// ── J2 Badge → keepsake ──────────────────────────────────────────────────
describe('J2 earning a badge opens its keepsake', () => {
  it('locked says which badge; once earned it opens with its skill caption and can be shown', () => {
    setPlant(grownAgo('oak', 'Kai', 2));
    mount(<PlantLook />);
    // Still to earn: in the closed "More to find" group, saying what to do and which badge (UX review P1, P2).
    expect(option('sundial')).toBeUndefined();
    openMore();
    expect(option('sundial').props.accessibilityState).toMatchObject({ disabled: true });
    expect(textOf(option('sundial'))).toMatch(/Finish a timed mock on pace \(the On Pace badge\)\./);
    unmount();
    earn('on-pace');
    mount(<PlantLook />);
    // Earned: it opens, and (no keepsake chosen yet) it is on show by default (UX review H1).
    expect(option('sundial').props.accessibilityState).toMatchObject({ disabled: false, checked: true });
    expect(textOf(option('sundial'))).toMatch(/You finished a timed mock on pace\./);
    expect(lookItem('sundial')!.caption).toBe('The sundial: you finished a timed mock on pace.');
    // No "Unlocked!" banner and no "n of m collected" anywhere.
    expect(allText().replace(/growth \d of 6/, '')).not.toMatch(/unlocked|collected|\b\d+ of \d+\b/i);
    tap('sundial');
    expect(cp().plant!.look?.keepsakes).toEqual([]);
    tap('sundial');
    expect(cp().plant!.look?.keepsakes).toEqual(['sundial']);
    // A higher tier opens the same keepsake (any tier counts).
    expect(keepsakeForBadge('long-memory')!.id).toBe('jay');
    earn('long-memory:50');
    expect(unlockedLooks(cp().plant!, allCertMarks(useProgress.getState().byCert))).toContain('jay');
  });

  it('the badge sheet adds one quiet line, "On your plant: the jay."; none when the plant is hidden', () => {
    setPlant(grownAgo('oak', 'Kai', 2));
    act(() => {
      useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...(m ?? { earned: {} }), backfill: { at: Date.now() - 90 * DAY, count: 0, seen: true }, catalog: CATALOG_VERSION } }));
    });
    earn('long-memory', 'cisa', Date.now() - 2 * DAY);
    mount(<Badges />);
    press(/^Long Memory · 25 recalls, Clay\. Pressed/);
    expect(allText()).toContain('On your plant: the jay.');
    expect(allText()).not.toMatch(/Unlocked!|\d+ of \d+ collected/i);
    unmount();
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    mount(<Badges />);
    press(/^Long Memory · 25 recalls, Clay\. Pressed/);
    expect(allText()).not.toContain('On your plant');
  });
});

// ── J3 Set → planter ─────────────────────────────────────────────────────
describe('J3 completing a set opens its planter exactly once', () => {
  it('Rooted complete → the root-woven basket opens; a second sync awards nothing new', () => {
    setPlant(grownAgo('bamboo', 'Bo', 3));
    const T0 = Date.now();
    act(() => {
      useProgress.setState((st) => ({
        byCert: {
          ...st.byCert,
          cisa: {
            ...cp(),
            milestones: { earned: { 'rooted:10': T0 - 50 * DAY, 'rooted:30': T0 - 30 * DAY, 'rooted:60': T0 - 2 * DAY }, days: 70, backfill: { at: T0 - 60 * DAY, count: 0, seen: true }, catalog: CATALOG_VERSION },
          },
        },
      }));
    });
    mount(<PlantLook />);
    openMore();
    expect(option('root-woven').props.accessibilityState).toMatchObject({ disabled: true });
    expect(textOf(option('root-woven'))).toMatch(/Opens when you finish the Rooted set in the Herbarium\./);
    unmount();
    let added: unknown;
    act(() => {
      added = syncPlanters('cisa', T0);
    });
    expect(added).toEqual(['rooted']);
    const planters = cp().milestones!.planters;
    act(() => {
      added = syncPlanters('cisa', T0 + DAY);
    });
    expect(added).toBeNull();
    expect(cp().milestones!.planters).toBe(planters);
    mount(<PlantLook />);
    expect(option('root-woven').props.accessibilityState).toMatchObject({ disabled: false });
    tap('root-woven');
    expect(cp().plant!.look?.planter).toBe('root-woven');
    // One planter, listed once (not per cert, not per sync).
    expect(root().findAll((n) => n.props.testID === 'look-root-woven' && typeof n.type === 'string')).toHaveLength(1);
  });
});

// ── J4 Reset ─────────────────────────────────────────────────────────────
describe('J4 Reset', () => {
  it('back to a seed; the look and every unlock it had are kept, and the Look screen still offers them', () => {
    setPlant({ ...grownAgo('pine', 'Summit', 5), look: { colourway: 'pine-frost', ground: 'stone-ring', planter: 'banded', visitor: 'robin', keepsakes: ['lantern', 'sundial'] } });
    earn('dress-rehearsal', 'cisa', Date.now() - 4 * DAY);
    earn('on-pace', 'cisa', Date.now() - 4 * DAY);
    act(() => {
      useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...m!, planters: { examDay: Date.now() - 4 * DAY } } }));
    });
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    const p = cp().plant!;
    expect(p).toMatchObject({ species: 'pine', name: 'Summit', growth: 1 });
    expect(p.look).toEqual({ colourway: 'pine-frost', ground: 'stone-ring', planter: 'banded', visitor: 'robin', keepsakes: ['lantern', 'sundial'] });
    expect(cp().milestones?.earned ?? {}).toEqual({});
    expect(p.kept).toEqual(expect.arrayContaining(['pine-frost', 'stone-ring', 'banded', 'robin', 'lantern', 'sundial']));
    mount(<PlantLook />);
    for (const id of ['pine-frost', 'stone-ring', 'banded', 'robin', 'lantern', 'sundial']) expect(option(id).props.accessibilityState).toMatchObject({ checked: true, disabled: false });
    // Trail blaze was never earned, so it stays closed.
    expect(option('trail-blaze').props.accessibilityState).toMatchObject({ disabled: true });
    // A second Reset keeps them still (kept is carried, never lost).
    unmount();
    act(() => {
      useProgress.getState().resetCert('cisa');
    });
    expect(cp().plant!.kept).toEqual(expect.arrayContaining(['pine-frost', 'stone-ring', 'banded', 'robin', 'lantern', 'sundial']));
  });
});

// ── J5 Backup ────────────────────────────────────────────────────────────
describe('J5 backup with looks', () => {
  it('round trip: export, wipe, restore; the look and kept unlocks come back exactly', async () => {
    setPlant({ ...grownAgo('cactus', 'Spike', 2), look: { colourway: 'cactus-yellow', ground: 'meadow', planter: 'fieldstone', visitor: 'no-visitor', keepsakes: ['fox', 'clear-dawn'] }, kept: ['fieldstone', 'fox', 'clear-dawn', 'robin'] });
    const before = cp().plant!;
    const text = JSON.stringify(currentBackup());
    act(() => {
      useProgress.setState({ byCert: {}, plantSettings: undefined });
    });
    await act(async () => {
      expect((await restoreBackup(okRead(text).data, { fresh: true })).kind).toBe('ok');
    });
    expect(cp().plant!.look).toEqual(before.look);
    expect(cp().plant!.kept).toEqual(before.kept);
    // Kept unlocks still open everything it wore.
    const open = unlockedLooks(cp().plant!, allCertMarks(useProgress.getState().byCert));
    expect(resolveLook('cactus', cp().plant!.look, open)).toMatchObject({ planter: 'fieldstone', visitor: 'no-visitor', keepsakes: ['fox', 'clear-dawn'] });
  });

  it('an old 1.13 backup with no look restores; the plant wears the defaults', async () => {
    const read = okRead(fileWith({ cisa: { answers: {}, plant: { species: 'narra', name: 'Lila', plantedAt: Date.now() - 3 * DAY, growth: 1 } } }, '1.13.0'));
    await act(async () => {
      expect((await restoreBackup(read.data, { fresh: true })).kind).toBe('ok');
    });
    expect(cp().plant!.look).toBeUndefined();
    mount(<PlantLook />);
    expect(option('narra-fresh').props.accessibilityState).toMatchObject({ checked: true });
    expect(option('meadow').props.accessibilityState).toMatchObject({ checked: true });
    expect(option('native').props.accessibilityState).toMatchObject({ checked: true });
    expect(option('wren').props.accessibilityState).toMatchObject({ checked: true });
  });

  it.each([
    ['an unknown keepsake id', { keepsakes: ['dragon'] }],
    ['a keepsake in the ground slot', { ground: 'lantern' }],
    ['a planter in the visitor slot', { visitor: 'terracotta' }],
    ['a colourway in the planter slot', { planter: 'oak-autumn' }],
    ['a ground among the keepsakes', { keepsakes: ['fox', 'meadow'] }],
    ['five keepsakes', { keepsakes: ['fox', 'jay', 'cairn', 'lantern', 'sundial'] }],
    ['four keepsakes', { keepsakes: ['fox', 'jay', 'cairn', 'lantern'] }],
    ['a repeated keepsake', { keepsakes: ['fox', 'fox'] }],
    ['a look id with markup', { colourway: '<img src=x>' }],
    ['a number for an id', { ground: 7 }],
    ['keepsakes as text', { keepsakes: 'fox' }],
  ])('a tampered look (%s) is refused, never a crash, and the phone is untouched', (_why, look) => {
    const mine = { ...grownAgo('oak', 'Kai', 2), look: { ground: 'meadow' } };
    setPlant(mine);
    let out: ReturnType<typeof checkBackupText> | undefined;
    expect(() => {
      out = checkBackupText(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 1, look } } }));
    }).not.toThrow();
    expect(out).toEqual({ kind: 'error', code: 'bad-data' });
    expect(cp().plant).toBe(mine);
  });

  it('an unknown slot in a look is dropped (repaired), never copied into the app', () => {
    const read = okRead(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 1, look: { hat: 'crown', ground: 'meadow' } } } }));
    expect(read.data.progress.byCert.cisa.plant!.look).toEqual({ ground: 'meadow' });
  });

  it('a tampered kept list (unknown id) is refused too', () => {
    expect(checkBackupText(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 1, kept: ['golden-crown'] } } }))).toEqual({ kind: 'error', code: 'bad-data' });
  });

  it('the phone’s own broken look (an older build’s id) is repaired on export, so the backup restores', () => {
    // Bypasses withLook on purpose: what an older or broken build might have saved.
    setPlant({ ...grownAgo('oak', 'Kai', 2), look: { ground: 'lantern', visitor: 'robin', keepsakes: ['fox', 'dragon', 'fox'] } as never, kept: ['robin', 'nope'] });
    // The screens still draw (fallback at render).
    mount(<PlantLook />);
    expect(option('meadow').props.accessibilityState).toMatchObject({ checked: true });
    const read = okRead(JSON.stringify(currentBackup()));
    const p = read.data.progress.byCert.cisa.plant!;
    expect(p.look).toEqual({ visitor: 'robin', keepsakes: ['fox'] });
    expect(p.kept).toEqual(['robin']);
  });

  it('a hand-edited kept list can open every look with no evidence behind it (cosmetic only)', () => {
    // Observation, not a QA-BUG: `kept` is checked against the catalogue but
    // never against the restored badges or growth, so a file can open every
    // planter and keepsake. Cosmetics carry no readiness claim, so the harm
    // is nil; noted for the security pass.
    const all = ['fieldstone', 'five-stone', 'celadon', 'compass-rose', 'banded', 'root-woven', 'lantern', 'sundial', 'trail-blaze'];
    const read = okRead(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - DAY, growth: 1, kept: all } } }));
    const p = read.data.progress.byCert.cisa.plant!;
    expect(unlockedLooks(p, [])).toEqual(expect.arrayContaining(all));
  });
});

// ── J6 A vanished unlock ─────────────────────────────────────────────────
describe('J6 an unlock that vanishes after a restore', () => {
  it('falls back at render; the stored choice is kept and comes back when re-earned', async () => {
    // A file whose plant wears a stone ring and the lantern, but nothing behind them (no growth, no badge).
    const read = okRead(fileWith({ cisa: { answers: {}, plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - 3 * DAY, growth: 1, look: { ground: 'stone-ring', visitor: 'robin', keepsakes: ['lantern'] } } } }));
    await act(async () => {
      expect((await restoreBackup(read.data, { fresh: true })).kind).toBe('ok');
    });
    expect(cp().plant!.look).toEqual({ ground: 'stone-ring', visitor: 'robin', keepsakes: ['lantern'] });
    mount(<PlantLook />);
    // Drawn with the defaults; the stored look is untouched.
    expect(option('meadow').props.accessibilityState).toMatchObject({ checked: true });
    expect(option('wren').props.accessibilityState).toMatchObject({ checked: true });
    openMore();
    expect(option('lantern').props.accessibilityState).toMatchObject({ checked: false, disabled: true });
    const preview = plants().find((p) => p.props.testID === 'look-preview')!;
    expect(preview.props.look).toMatchObject({ ground: 'meadow', visitor: 'wren', keepsakes: [] });
    expect(cp().plant!.look).toEqual({ ground: 'stone-ring', visitor: 'robin', keepsakes: ['lantern'] });
    unmount();
    // Re-earned: growth to Crown, and the Dress Rehearsal badge.
    act(() => {
      useProgress.getState().updatePlant('cisa', (p) => ({ ...p!, growth: 5, reached: { sprout: Date.now() - 2 * DAY, shoot: Date.now() - 2 * DAY, bough: Date.now() - 2 * DAY, crown: Date.now() - 2 * DAY } }));
    });
    earn('dress-rehearsal', 'cisa', Date.now() - DAY);
    mount(<PlantLook />);
    for (const id of ['stone-ring', 'robin', 'lantern']) expect(option(id).props.accessibilityState).toMatchObject({ checked: true });
  });

  it('a hidden keepsake stays chosen while there is room, and is let go only when the learner needs the slot', () => {
    setPlant({ ...grownAgo('oak', 'Kai', 2), look: { keepsakes: ['lantern', 'fox', 'jay'] } });
    earn('snare-wise', 'cisa', Date.now() - DAY);
    earn('long-memory', 'cisa', Date.now() - DAY);
    earn('even-keel', 'cisa', Date.now() - DAY);
    mount(<PlantLook />);
    // Lantern hidden (no badge): two shown, room for one.
    expect(option('cairn').props.accessibilityState).toMatchObject({ disabled: false });
    tap('cairn');
    expect(cp().plant!.look?.keepsakes).toEqual(['fox', 'jay', 'cairn']);
  });
});

// ── J7 Cert switch ───────────────────────────────────────────────────────
describe('J7 switching certification', () => {
  it('each exam’s plant keeps its own look; badges open keepsakes for every plant', () => {
    // CISM's content must be on the phone for the app to study it (lib/activeCert.ts): a stand-in pack.
    undoPack = installFakePack('cism');
    setPlant({ ...grownAgo('oak', 'Kai', 3), look: { colourway: 'oak-spring', visitor: 'robin' } }, 'cisa');
    setPlant({ ...grownAgo('lotus', 'Nila', 2), look: { colourway: 'lotus-white', planter: 'terracotta' } }, 'cism');
    earn('dress-rehearsal', 'cism', Date.now() - DAY);
    mount(<PlantLook />);
    expect(option('oak-spring').props.accessibilityState).toMatchObject({ checked: true });
    // A CISM badge dresses the CISA plant too: its lantern is on show by default (UX review H1).
    expect(option('lantern').props.accessibilityState).toMatchObject({ checked: true, disabled: false });
    tap('lantern'); // put away on the CISA plant only
    expect(cp('cisa').plant!.look?.keepsakes).toEqual([]);
    unmount();
    act(() => {
      useSettings.setState({ activeCertId: 'cism' });
    });
    mount(<PlantLook />);
    expect(option('lotus-white').props.accessibilityState).toMatchObject({ checked: true });
    expect(option('terracotta').props.accessibilityState).toMatchObject({ checked: true });
    // The CISM plant has its own look: its lantern is still on show.
    expect(option('lantern').props.accessibilityState).toMatchObject({ checked: true, disabled: false });
    tap('meadow');
    unmount();
    act(() => {
      useSettings.setState({ activeCertId: 'cisa' });
    });
    expect(cp('cisa').plant!.look).toEqual({ colourway: 'oak-spring', visitor: 'robin', keepsakes: [] });
    expect(cp('cism').plant!.look).toEqual({ colourway: 'lotus-white', planter: 'terracotta', ground: 'meadow' });
  });
});

// ── J8 Moods ─────────────────────────────────────────────────────────────
describe('J8 moods', () => {
  const input = { marks: [], face: true, resting: false, planCleared: false, newTopicToday: false, newKeepsakeToday: false, today: '' };

  it('one reaction per occasion; Your plant and Today share it (mobile 1.18: the occasion is the keepsake itself)', () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo('oak', 'Kai', 3));
    const at = Date.now();
    earn('dress-rehearsal', 'cisa', at); // a new keepsake today: proud
    const id = `proud:keepsake:dress-rehearsal:${at}`;
    mount(<YourPlant />);
    expect(plants().find((x) => x.props.testID === 'plant-hero')!.props.reaction).toEqual({ id, mood: 'proud' });
    expect(proudCalls(spy)).toBe(1);
    unmount();
    // Back to Your plant, then Today, the same day: the same occasion, no second stretch.
    mount(<YourPlant />);
    unmount();
    mount(<Today />);
    expect(plants().find((x) => x.props.reaction)!.props.reaction).toEqual({ id, mood: 'proud' });
    expect(proudCalls(spy)).toBe(1);
    // A different occasion is a new one.
    expect(claimReaction(`proud:keepsake:on-pace:${at + DAY}`)).toBe(true);
  });

  it('on a day the plan is cleared, Today shows the plant, happy, with its visitor (Fixed: QA O-1)', () => {
    // Decided (FIXES_44): the cleared state shows the plant and its visitor at a
    // modest size under the clearing, so "comes on days you clear your plan" is true on Today.
    setPlant({ ...grownAgo('oak', 'Kai', 3), look: { keepsakes: ['lantern'] } });
    earn('dress-rehearsal', 'cisa', Date.now() - 3 * DAY);
    clearPlan();
    mount(<Today />);
    const host = root().findAll((n) => n.props.testID === 'today-plant-cleared' && typeof n.type === 'string')[0];
    expect(host).toBeDefined();
    const cleared = plants().find((x) => host.findAll((m) => m === x).length > 0);
    expect(cleared).toBeDefined();
    expect(cleared!.props.size).toBeLessThan(104);
    expect(cleared!.props.mood).toBe('happy');
    expect(cleared!.props.look).toMatchObject({ visitor: 'wren' });
    // Today is study-first: the plant and its visitor, never the keepsakes (UX review, decided).
    expect(cleared!.props.look.keepsakes).toEqual([]);
    expect(allText()).toMatch(/A wren came by: you cleared today’s plan\./);
  });

  it('the reaction never plays again after a relaunch on the same day (Fixed in 1.18: QA BUG-4)', () => {
    // Expert panel (mobile 1.18): an occasion's reaction plays once EVER; it
    // is written down (store/seen.ts), so a relaunch never replays it.
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo('oak', 'Kai', 3));
    clearPlan();
    mount(<YourPlant />);
    expect(proudCalls(spy)).toBe(1); // the happy stretch, once
    unmount();
    relaunchPlantForTest(); // a relaunch: memory gone, the phone's record kept
    resetCelebrationsForTest();
    mount(<YourPlant />);
    expect(proudCalls(spy)).toBe(1); // no replay
    expect(claimReaction(`cisa:happy:${today()}`)).toBe(false);
  });

  it('a growth step today shows proud (face and words); a new keepsake today too', () => {
    const p = grownAgo('oak', 'Kai', 3);
    const grew = { ...p, growth: 4 as const, reached: { ...p.reached, bough: Date.now() } };
    expect(plantLookView(grew, { ...input, today: today() }).mood).toBe('proud');
    expect(plantLookView(p, { ...input, today: today(), newKeepsakeToday: true }).mood).toBe('proud');
    expect(plantLookView(p, { ...input, today: today(), planCleared: true }).mood).toBe('happy');
    expect(plantLookView(p, { ...input, today: today(), newTopicToday: true }).mood).toBe('curious');
    expect(plantLookView(p, { ...input, today: today() }).mood).toBe('idle');
    // Resting wins, and is never sad.
    expect(plantMood({ face: true, resting: true, grewToday: true, newKeepsakeToday: true, planCleared: true, newTopicToday: true })).toBe('resting');
    setPlant(grew);
    mount(<YourPlant />);
    expect(plants().find((x) => x.props.testID === 'plant-hero')!.props.mood).toBe('proud');
    expect(root().findAll((n) => n.props.testID === 'plant-hero' && typeof n.type === 'string')[0].props.accessibilityLabel).toMatch(/Looking proud\./);
  });

  // Mobile 1.40 (spec §3.5): the posture (proud stands tall) plays for every style, a faceless one too;
  // only a plant with a face draws the mood and says it.
  it('Quiet look: no face and no mood words; the posture still answers a good day', () => {
    motionOn();
    act(() => {
      useProgress.getState().setPlantSettings({ quietLook: true });
    });
    const p = grownAgo('oak', 'Kai', 3);
    setPlant({ ...p, growth: 4, reached: { ...p.reached, bough: Date.now() } });
    clearPlan();
    mount(<YourPlant />);
    const hero = plants().find((x) => x.props.testID === 'plant-hero')!;
    expect(hero.props.mood).toBe('proud');
    expect(hero.props.quietLook).toBe(true);
    expect(root().findAll((n) => n.props.testID === 'plant-hero' && typeof n.type === 'string')[0].props.accessibilityLabel).not.toMatch(/Looking/);
    // No happy reaction was claimed (proud is the mood today).
    expect(claimReaction(`cisa:happy:${today()}`)).toBe(true);
  });

  it('a higher tier of a badge you already hold is no new keepsake, so no proud plant (Fixed: QA BUG-2)', () => {
    setPlant(grownAgo('oak', 'Kai', 3));
    earn('long-memory', 'cisa', Date.now() - 30 * DAY);
    earn('long-memory:50', 'cisa', Date.now());
    mount(<YourPlant />);
    expect(plants().find((x) => x.props.testID === 'plant-hero')!.props.mood).toBe('idle');
    unmount();
    // The badge's first tier on ANOTHER exam earlier counts too (keepsakes are the learner's).
    earn('on-pace:2', 'cisa', Date.now());
    earn('on-pace', 'cism', Date.now() - 9 * DAY);
    mount(<YourPlant />);
    expect(plants().find((x) => x.props.testID === 'plant-hero')!.props.mood).toBe('idle');
    unmount();
    // Mobile 1.18: a badge from games alone (Snare-wise, Field notes) is no reason to be proud.
    earn('snare-wise', 'cisa', Date.now());
    mount(<YourPlant />);
    expect(plants().find((x) => x.props.testID === 'plant-hero')!.props.mood).toBe('idle');
    unmount();
    // A truly new keepsake from a learning badge today still makes it proud.
    earn('slip-spotter', 'cisa', Date.now());
    mount(<YourPlant />);
    expect(plants().find((x) => x.props.testID === 'plant-hero')!.props.mood).toBe('proud');
  });

  it('planting with a back-filled growth is quiet that day: no proud face, no stretch (Fixed: QA BUG-3, code review M5)', () => {
    motionOn();
    setPlant(plantNew('oak', 'Kai', Date.now(), 4));
    mount(<YourPlant />);
    expect(plants().find((x) => x.props.testID === 'plant-hero')!.props.mood).toBe('idle');
    expect(claimReaction(`cisa:proud:${today()}`)).toBe(true); // never claimed: no stretch played
    unmount();
    // A real growth later the same day is proud again.
    act(() => {
      useProgress.getState().updatePlant('cisa', (p) => ({ ...p!, growth: 5, reached: { ...p!.reached, crown: Date.now() + 1 } }));
    });
    mount(<YourPlant />);
    expect(plants().find((x) => x.props.testID === 'plant-hero')!.props.mood).toBe('proud');
  });
});

// ── J9 Celebration budget ────────────────────────────────────────────────
describe('J9 the celebration budget', () => {
  const grewToday = () => {
    const p = grownAgo('oak', 'Kai', 3);
    setPlant({ ...p, growth: 4, reached: { ...p.reached, bough: Date.now() }, pending: 4 });
  };
  const growthMode = () => plants().find((x) => x.props.growth)?.props.growth?.celebration.mode;

  it('alone, the growth plays in full (old growth drawn), with one success haptic', () => {
    motionOn();
    grewToday();
    mount(<Today />);
    expect(growthMode()).toBe('full');
    expect(movingLayers('today-plant')).toHaveLength(2); // the old growth + the plant layer
    expect(haptic.success).toHaveBeenCalledTimes(1);
    expect(cp().plant!.pending).toBeUndefined(); // seen: it never plays twice
  });

  it('a milestone played on Results first: the growth on Today is the short form (no double moment)', () => {
    motionOn();
    expect(pickCelebration('milestone', false).mode).toBe('full');
    grewToday();
    mount(<Today />);
    expect(growthMode()).toBe('short');
    expect(movingLayers('today-plant')).toHaveLength(1); // no old growth drawn: nothing swells or fades
    expect(allText()).toMatch(/Your plant grew/);
  });

  it('the clearing and a growth on the same visit: one full moment and one haptic', () => {
    motionOn();
    grewToday();
    clearPlan();
    mount(<Today />);
    // The clearing keeps the session's one full moment; the growth line is the short form.
    expect(growthNoteMode()).toBe('short');
    expect(haptic.success).toHaveBeenCalledTimes(1);
  });

  it('the growth sequence is that day’s proud moment: no reaction with it, nor later the same day (Fixed: QA BUG-5, UX H4, code review M3)', () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    grewToday();
    mount(<Today />);
    expect(growthMode()).toBe('full');
    expect(plants().find((x) => x.props.growth)!.props.reaction).toBeNull();
    expect(proudCalls(spy)).toBe(0);
    // The occasion is spent without playing (and without charging the budget), so Your plant won't stretch either.
    const spent = Object.keys(useSeen.getState().reactions).filter((k) => k.startsWith('proud:growth:cisa:'));
    expect(spent).toHaveLength(1);
    expect(claimReaction(spent[0])).toBe(false);
    unmount();
    mount(<YourPlant />);
    expect(proudCalls(spy)).toBe(0);
  });

  it('growth is never fatigued (rare), but still keeps one full moment per session', () => {
    motionOn();
    useSeen.setState({ moments: { 'plant-growth': 9 } });
    expect(pickCelebration('plant-growth', false).mode).toBe('full');
    expect(pickCelebration('plant-growth', false).mode).not.toBe('full');
  });
});

// ── J10 Reduce Motion ────────────────────────────────────────────────────
describe('J10 Reduce Motion', () => {
  it('Your plant: no breath, no reaction; the plant layer at rest', () => {
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo('oak', 'Kai', 4));
    clearPlan();
    mount(<YourPlant />);
    expect(breathCalls(spy)).toBe(0);
    expect(claimReaction(`cisa:happy:${today()}`)).toBe(true); // never claimed
    const st = JSON.stringify(movingLayers().map((l) => l.props.style));
    expect(st).toContain('"rotate":"0deg"');
    expect(st).toContain('"opacity":1');
    // The mood still shows on the face (a pose, not a move).
    expect(plants().find((x) => x.props.testID === 'plant-hero')!.props.mood).toBe('happy');
  });

  it('with motion on, the same screen breathes (the burst is ≤ 5 s)', () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo('oak', 'Kai', 4));
    mount(<YourPlant />);
    expect(breathCalls(spy)).toBe(motion.plant.breaths);
    expect((motion.plant.breath + motion.plant.breathOut) * motion.plant.breaths).toBeLessThanOrEqual(5000);
    // Once per surface per app session (UX review P6): coming back does not breathe again.
    unmount();
    mount(<YourPlant />);
    expect(breathCalls(spy)).toBe(motion.plant.breaths);
  });

  it('Today’s growth: static (no old growth drawn), the line and one haptic still there', () => {
    const p = grownAgo('oak', 'Kai', 3);
    setPlant({ ...p, growth: 4, reached: { ...p.reached, bough: Date.now() }, pending: 4 });
    mount(<Today />);
    expect(plants().find((x) => x.props.growth)!.props.growth.celebration.mode).toBe('static');
    expect(movingLayers('today-plant')).toHaveLength(1);
    expect(allText()).toMatch(/Your plant grew/);
    expect(haptic.success).toHaveBeenCalledTimes(1);
    expect(plants().find((x) => x.props.growth)!.props.stage).toBe(4); // the end state
  });

  it('Today never breathes (Breathe is You and Your plant only), even with motion on', () => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    setPlant(grownAgo('oak', 'Kai', 4));
    mount(<Today />);
    expect(plants().length).toBeGreaterThan(0);
    expect(breathCalls(spy)).toBe(0);
  });
});

// ── J11 Show my plant OFF ────────────────────────────────────────────────
describe('J11 Show my plant OFF', () => {
  beforeEach(() => {
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    const p = grownAgo('oak', 'Kai', 3);
    setPlant({ ...p, growth: 4, reached: { ...p.reached, bough: Date.now() }, pending: 4, look: { keepsakes: ['lantern'] } });
    earn('dress-rehearsal', 'cisa', Date.now() - DAY);
  });

  it.each([
    ['Today', () => <Today />],
    ['You', () => <You />],
    ['Your plant', () => <YourPlant />],
    ['Look', () => <PlantLook />],
  ])('%s: no plant drawn, no Look entry, no motion, no growth haptic', (_name, el) => {
    motionOn();
    const spy = jest.spyOn(Reanimated, 'withTiming');
    mount(el());
    expect(plants()).toHaveLength(0);
    expect(allText()).not.toMatch(/Change its look/);
    expect(breathCalls(spy)).toBe(0);
    expect(haptic.success).not.toHaveBeenCalled();
    expect(claimReaction(`cisa:proud:${today()}`)).toBe(true);
    // The grow-up waits (pending kept) and the look is kept.
    expect(cp().plant!.pending).toBe(4);
    expect(cp().plant!.look).toEqual({ keepsakes: ['lantern'] });
  });

  it('Look says the plant is hidden and offers Settings', () => {
    mount(<PlantLook />);
    expect(allText()).toMatch(/Your plant is hidden/);
    expect(root().findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('look-'))).toHaveLength(0);
  });
});

// ── J12 Never on focus screens ───────────────────────────────────────────
describe('J12 never on question, mock, lesson or game screens (transitive imports)', () => {
  const SRC = join(__dirname, '..');
  const resolveImport = (from: string, spec: string): string | null => {
    const base = resolve(dirname(from), spec);
    for (const c of [`${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts'), base]) if (existsSync(c)) {
      try {
        readFileSync(c, 'utf8');
        return c;
      } catch {
        // a directory
      }
    }
    return null;
  };
  const reach = (entry: string): Set<string> => {
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
    return seen;
  };
  const screens = [
    'app/session.tsx',
    'app/mock-start.tsx',
    'app/results.tsx',
    'app/guided.tsx',
    ...readdirSync(join(SRC, 'app/game')).map((f) => `app/game/${f}`),
    ...readdirSync(join(SRC, 'app/lesson')).map((f) => `app/lesson/${f}`),
  ];
  it.each(screens)('%s never reaches the plant, its look or its motion', (f) => {
    const files = [...reach(join(SRC, f))].map((x) => x.slice(SRC.length + 1));
    expect(files.length).toBeGreaterThan(3);
    expect(files.filter((x) => x.startsWith('components/plant/'))).toEqual([]);
    for (const x of files.filter((y) => y !== 'lib/plant.ts')) expect(readFileSync(join(SRC, x), 'utf8')).not.toMatch(/usePlantView\(|<LivePlant\b|<Plant\b|<PlantButton|<KeepsakeIcon|plantLookView\(/);
  });

  it('the Look screen is reached only from Your plant (and, from 1.40, Settings › Change its look)', () => {
    const users = readdirSync(join(SRC, 'app'), { recursive: true })
      .map(String)
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => readFileSync(join(SRC, 'app', f), 'utf8').includes("'/plant-look'"));
    expect(users.sort()).toEqual(['plant.tsx', 'settings.tsx']);
  });
});

// ── Store-level guards the journeys lean on ──────────────────────────────
describe('look guards', () => {
  it('withLook takes only catalogue ids of the right slot; null puts a slot back', () => {
    const p = grownAgo('oak', 'Kai', 3);
    expect(withLook(p, { ground: 'lantern' })).toBe(p);
    expect(withLook(p, { visitor: 'dragon' })).toBe(p);
    const a = withLook(p, { ground: 'stone-ring', keepsakes: ['fox', 'fox', 'jay', 'cairn', 'lantern'] });
    expect(a.look).toEqual({ ground: 'stone-ring', keepsakes: ['fox', 'jay', 'cairn'] });
    expect(withLook(a, { ground: null, keepsakes: null }).look).toBeUndefined();
  });
});
