/**
 * Grove Phase 4b, the phone badges (design-notes/grove/phase4b/PHASE4B.md 5.1 to 5.6): "the pressed
 * paper tile".
 *
 * Plain English for the founder: these tests check
 * - the tile itself: earned is cream paper with two strips of tape; not yet is a pencilled outline
 *   whose solid part shows how close; gated is dotted and empty; the art is hidden from screen readers;
 * - the press on Results (the unlock): it waits at the pencilled mount until it plays, presses in
 *   full (glassine, press, tape) by 1080 ms, any tap ends it, and under Reduce Motion the taped tile
 *   is there at once with the same words and the same one success tap;
 * - the case: back row "You", "Every set counts on its own.", one card per set ("Groundwork" with
 *   "2 of 3 pressed"), no roman numbers, tile sizes at 320 / 375 / 390, the planter line, the list
 *   at text scale 2 with "Study for this";
 * - the sheet: the 120pt tile, "Pressed 11 Oct", "Share this badge", the vignette;
 * - the after-exam album opens with the plant; You's shelf tiles wear two strips of tape.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, Modal } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Badges from '../app/milestones';
import { BadgeCell, BadgeListRow, caseTileSize, PLANTER_SET_NAMES, planterLine } from '../components/badges';
import { MilestoneMomentView, MOMENT_TILE, resetBadgeMomentsForTest } from '../components/milestones';
import { resetCelebrationsForTest } from '../components/motion';
import { outlineLength, PRESS_TIMELINE, PressedTile } from '../components/pressedTile';
import { plantNew } from '../engine/plant';
import { plantersFor } from '../engine/plantLooks';
import type { MilestoneMoment } from '../lib/milestones';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { glassine, grovePlate, specimenTape } from '../theme/grove';
import { motion, space } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null, BadgeSharePanel: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(cb, [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockSuccess = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => mockSuccess(), selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
const labels = () => root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => n.props.onPress());
};
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const unmount = () => {
  act(() => r?.unmount());
  r = undefined;
};
const setWindow = (width: number, fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } }));
};
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type !== 'string');
/** A host view's style, flattened. */
const styleOf = (n: ReactTestInstance) => Object.assign({}, ...[n.props.style].flat(3).filter(Boolean)) as Record<string, unknown>;
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const DAY = 86_400_000;
const cp = () => selectCert(useProgress.getState(), 'cisa');
const earn = (key: string, at = Date.now()) =>
  act(() => {
    useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...(m ?? { earned: {} }), earned: { ...(m?.earned ?? {}), [key]: at } } }));
  });
const setPlant = () =>
  act(() => {
    useProgress.getState().updatePlant('cisa', () => plantNew('oak', 'Kai', Date.now() - 9 * DAY, 4));
  });
/** The pressed tiles under a node (PressedTile is memoised, so it is found by its props). */
const tilesIn = (n: ReactTestInstance) => n.findAll((x) => typeof x.type !== 'string' && typeof x.props.badge === 'string' && typeof x.props.size === 'number' && typeof x.props.state === 'string' && x.props.mark === undefined);

beforeEach(() => {
  jest.useFakeTimers({ now: T0, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  mockSuccess.mockClear();
  setMockReducedMotion(true);
  resetCelebrationsForTest();
  resetBadgeMomentsForTest();
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {}, plantSettings: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: {}, practiceTimer: false, badgesHidden: false, theme: 'light' });
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, badgeSort: undefined });
  setWindow(390, 1);
});
afterEach(() => {
  unmount();
  setWindow(390, 1);
  jest.useRealTimers();
});

// ── 5.2 The pressed tile ────────────────────────────────────────────────
describe('the pressed tile (5.2)', () => {
  it('earned: cream paper (g.specimen), the emblem, two strips of tape at opposite corners; hidden from screen readers', () => {
    mount(<PressedTile badge="first-foothold" state="earned" size={84} />);
    const paper = root().findAll((n) => n.props.testID === 'tile-paper' && typeof n.type === 'string')[0];
    expect(styleOf(paper)).toMatchObject({ backgroundColor: '#E9E6DC', borderRadius: 16, opacity: 1 });
    const tapes = root().findAll((n) => n.props.testID === 'tile-tape' && typeof n.type === 'string');
    expect(tapes).toHaveLength(2);
    expect(tapes.map((t) => styleOf(t).backgroundColor)).toEqual([specimenTape, specimenTape]);
    // Opposite corners: one at the top right, one at the bottom left.
    expect(styleOf(tapes[0])).toEqual(expect.objectContaining({ top: expect.any(Number), right: expect.any(Number) }));
    expect(styleOf(tapes[1])).toEqual(expect.objectContaining({ bottom: expect.any(Number), left: expect.any(Number) }));
    // The glassine is gone at rest.
    const glass = root().findAll((n) => n.props.testID === 'tile-glassine' && typeof n.type === 'string')[0];
    expect(styleOf(glass)).toMatchObject({ backgroundColor: glassine, opacity: 0 });
    // A picture only.
    const box = root().findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants' && typeof n.type === 'string')[0];
    expect(box.props.accessible).toBe(false);
    expect(box.props.accessibilityElementsHidden).toBe(true);
  });

  it('the cream is the same paper in dark (never a dark tile), and the emblem keeps its light inks', () => {
    useSettings.setState({ theme: 'dark' });
    mount(<PressedTile badge="first-foothold" state="earned" size={84} />);
    const paper = root().findAll((n) => n.props.testID === 'tile-paper' && typeof n.type === 'string')[0];
    expect(String(styleOf(paper).backgroundColor).toUpperCase()).toBe('#E9E2D2');
  });

  it('not yet: a dashed control outline, its solid accent part as long as the progress; no tape', () => {
    mount(<PressedTile badge="long-memory" tier={2} state="open" size={84} progress={31 / 75} />);
    const solid = root().findAll((n) => n.props.testID === 'tile-progress')[0];
    const w = 84 - 1.5;
    const len = outlineLength(w, 16 - 0.75);
    expect(solid.props.strokeDasharray).toBe(`${((31 / 75) * len).toFixed(1)} ${len.toFixed(1)}`);
    expect(solid.props.stroke).toBe('#2B6E4A'); // accent (light)
    expect(root().findAll((n) => n.props.testID === 'tile-tape')).toHaveLength(0);
    expect(root().findAll((n) => n.props.testID === 'tile-paper')).toHaveLength(0);
    unmount();
    mount(<PressedTile badge="long-memory" tier={2} state="open" size={84} progress={0} />);
    expect(root().findAll((n) => n.props.testID === 'tile-progress')).toHaveLength(0);
  });

  it('gated: a dotted, empty outline (never a padlock), no progress', () => {
    mount(<PressedTile badge="mindset-shift" state="gated" size={84} progress={0.5} />);
    expect(root().findAll((n) => n.props.testID === 'tile-progress')).toHaveLength(0);
    const dotted = root().findAll((n) => typeof n.props.strokeDasharray === 'string' && n.props.strokeDasharray === '1.5 4');
    expect(dotted.length).toBeGreaterThan(0);
  });

  it('the press timeline: glassine at 120, pressed at 320, lifted by 760, tapes at 760 and 960, done by 1080 (inside the 1.2 s ceiling)', () => {
    const T = PRESS_TIMELINE;
    expect([T.glassIn, T.pressAt, T.glassOut, T.tape1, T.tape2]).toEqual([120, 320, 560, 760, 960]);
    expect(T.tape2 + T.tapeDur).toBe(T.done);
    expect(T.done).toBe(1080);
    expect(T.done).toBeLessThanOrEqual(motion.dur.celebrate);
    expect(T.glassOut + T.glassOutDur).toBeLessThanOrEqual(T.tape1);
  });

  it('waiting at the mount: no paper, no tape yet (the pencilled outline shows)', () => {
    setMockReducedMotion(false);
    mount(<PressedTile badge="took-root" state="earned" size={MOMENT_TILE} motion="pending" />);
    const paper = root().findAll((n) => n.props.testID === 'tile-paper' && typeof n.type === 'string')[0];
    expect(styleOf(paper).opacity).toBe(0);
    for (const t of root().findAll((n) => n.props.testID === 'tile-tape' && typeof n.type === 'string')) expect(styleOf(t).opacity).toBe(0);
  });
});

// ── 5.4 The press on Results ─────────────────────────────────────────────
describe('the unlock: the press (5.4)', () => {
  const m: MilestoneMoment = { key: 'took-root', label: 'Took Root', rule: 'r', kind: 'milestone', set: 'evergreen', setName: 'Evergreen', unlock: 'You cleared a whole topic.' };
  const tile = () => byTestID('moment-tile')[0];
  const paperOpacity = () => styleOf(root().findAll((n) => n.props.testID === 'tile-paper' && typeof n.type === 'string')[0]).opacity;

  it('same words from the first frame: caption, the name in label, the line; no medallion and no leaves', () => {
    setMockReducedMotion(false);
    mount(<MilestoneMomentView moment={m} once="w1" inView={false} />);
    const t = allText();
    expect(t).toContain('A new badge · Evergreen');
    expect(t).toContain('Took Root');
    expect(t).toContain('You cleared a whole topic.');
    expect(root().findAll((n) => typeof n.type === 'function' && /^(Medallion|LeafFall)$/.test((n.type as { name?: string }).name ?? ''))).toHaveLength(0);
    expect(labels()).toContain('A new badge, Evergreen: Took Root. You cleared a whole topic.');
    // The tile's own 76pt column.
    const col = root().findAll((n) => typeof n.type === 'string' && styleOf(n).width === 76);
    expect(col.length).toBeGreaterThan(0);
  });

  it('in full: waits at the pencilled mount, then presses; the one success tap at 320 ms; the end state taped, glassine gone', () => {
    setMockReducedMotion(false);
    mount(<MilestoneMomentView moment={m} once="f1" inView={false} />);
    expect(tile().props.motion).toBe('pending');
    expect(paperOpacity()).toBe(0);
    act(() => r!.update(<MilestoneMomentView moment={m} once="f1" inView />));
    expect(tile().props.motion).toBe('moment');
    expect(mockSuccess).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(PRESS_TIMELINE.pressAt));
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    // Ended after the ceiling: the last frame, and no second tap.
    act(() => jest.advanceTimersByTime(motion.dur.celebrate));
    expect(tile().props.motion).toBe('end');
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  it('the press lands on its last frame: the paper on, pressed flat (scale 1), the glassine lifted away, both tapes down', () => {
    mount(<PressedTile testID="a" badge="took-root" state="earned" size={MOMENT_TILE} motion="moment" run={1} />);
    // The test clock lands every animation on its end value; a re-render shows it.
    act(() => r!.update(<PressedTile testID="b" badge="took-root" state="earned" size={MOMENT_TILE} motion="moment" run={1} />));
    const host = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
    expect(styleOf(host('tile-paper')[0])).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] });
    expect(styleOf(host('tile-glassine')[0]).opacity).toBe(0);
    for (const t of host('tile-tape')) expect(styleOf(t)).toMatchObject({ opacity: 1 });
  });

  it('any tap ends it at the last frame at once (and its one tap comes then)', () => {
    setMockReducedMotion(false);
    mount(<MilestoneMomentView moment={m} once="t1" />);
    expect(tile().props.motion).toBe('moment');
    const frame = root().findAll((n) => typeof n.props.onTouchStart === 'function')[0];
    act(() => frame.props.onTouchStart());
    expect(tile().props.motion).toBe('end');
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(1000));
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  it('Reduce Motion: the taped tile at once, the same words, the same one success tap', () => {
    setMockReducedMotion(true);
    mount(<MilestoneMomentView moment={m} once="r1" />);
    expect(tile().props.motion).toBe('end');
    expect(paperOpacity()).toBe(1);
    for (const t of root().findAll((n) => n.props.testID === 'tile-tape' && typeof n.type === 'string')) expect(styleOf(t).opacity).toBe(1);
    expect(allText()).toContain('A new badge · Evergreen');
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  it('a repeat (the session’s full moment spent) shows the end state; a higher tier never waits at the mount', () => {
    setMockReducedMotion(false);
    mount(<MilestoneMomentView moment={m} once="a1" />);
    unmount();
    mount(<MilestoneMomentView moment={{ ...m, key: 'loop-closed', label: 'Loop Closed' }} once="a2" />);
    const cel = root().findAll((n) => n.props.celebration !== undefined)[0].props.celebration as { mode: string };
    expect(cel.mode).not.toBe('full');
    expect(tile().props.motion).toBe('end');
    unmount();
    resetCelebrationsForTest();
    mount(<MilestoneMomentView moment={{ ...m, key: 'rooted:30', label: 'Rooted · 30 days', tier: 2, tierUp: true }} once="a3" inView={false} />);
    expect(tile().props.motion).toBe('end');
  });
});

// ── 5.1 The case ─────────────────────────────────────────────────────────
describe('the case (5.1)', () => {
  it('back row "You", the title, the italic line and the promise; one card per set with "2 of 3 pressed"; no roman numbers', () => {
    earn('first-foothold', T0 - 2 * DAY);
    earn('topic-clear', T0 - DAY);
    mount(<Badges />);
    expect(labels()).toContain('Back to You');
    const t = allText();
    expect(t).toMatch(/^You Badges Every set counts on its own\. Earned by what you’ve mastered\. Once earned, a badge stays\./);
    expect(t).toContain('Groundwork 2 of 3 pressed');
    expect(t).not.toMatch(/\bSheet\b|\bSheet [IVX]+\b|Herbarium|Fig\.|Plate|Field guide|Field record/);
    expect(t).not.toMatch(/[–—]/);
    // Said as before, the set and its own count, never a total across sets.
    expect(labels()).toContain('Groundwork, 2 of 3');
    // Set heads are headline (F4), never the tracked kicker.
    const head = root().findAll((n) => n.props.accessibilityRole === 'header' && n.props.accessibilityLabel === 'Groundwork, 2 of 3')[0];
    expect(head.findAll((n) => n.props.v === 'headline').length).toBeGreaterThan(0);
  });

  it('tiles: 3 across at min(84, cell - 12) at 320, 375 and 390, never four across', () => {
    for (const w of [320, 375, 390]) {
      setWindow(w, 1);
      mount(<Badges />);
      const cell = root().findAllByType(BadgeCell)[0];
      // The card's inner width: the screen less the built page gutters, the card's padding and its 1pt edges.
      const inner = w - space.gutter * 2 - grovePlate.pad * 2 - 2;
      const cellW = Math.floor((inner - 2 * space.xs) / 3);
      expect(caseTileSize(Math.floor((inner - 3 * space.xs) / 4))).toBeLessThan(84);
      expect(cell.props.width).toBe(cellW);
      expect(cell.props.size).toBe(caseTileSize(cellW));
      expect(cell.props.size).toBeLessThanOrEqual(84);
      unmount();
    }
  });

  it('two columns from text scale 1.3; from text scale 2 one column of rows (56pt tile) with "Study for this" on a not-yet row', () => {
    setWindow(390, 1.3);
    mount(<Badges />);
    const two = root().findAllByType(BadgeCell)[0].props.width as number;
    expect(two).toBe(Math.floor((390 - space.gutter * 2 - grovePlate.pad * 2 - 2 - space.xs) / 2));
    unmount();
    setWindow(390, 2);
    mount(<Badges />);
    expect(root().findAllByType(BadgeCell)).toHaveLength(0);
    const rows = root().findAllByType(BadgeListRow);
    expect(rows.length).toBeGreaterThan(20);
    expect(tilesIn(rows[0])[0].props.size).toBe(56);
    expect(labels()).toContain('Study for this: First Foothold');
  });

  it('the planter line ends each counted set, from data; "is in Look" once complete; none for Field notes or with the plant hidden', () => {
    setPlant();
    mount(<Badges />);
    expect(textOf(root().findAll((n) => n.props.testID === 'planter-line-groundwork')[0])).toContain("Completing Groundwork adds the fieldstone planter to your plant's looks.");
    expect(root().findAll((n) => n.props.testID === 'planter-line-fieldNotes')).toHaveLength(0);
    unmount();
    earn('first-foothold', T0 - 3 * DAY);
    earn('topic-clear', T0 - 2 * DAY);
    earn('ten-topics', T0 - DAY);
    mount(<Badges />);
    expect(allText()).toContain('The fieldstone planter is in Look.');
    unmount();
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    mount(<Badges />);
    expect(root().findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('planter-line-'))).toHaveLength(0);
  });

  it('planterLine follows the formula; the phone’s set names match the planters’ own captions', () => {
    expect(planterLine('oak', 'groundwork', false)!.line).toBe("Completing Groundwork adds the fieldstone planter to your plant's looks.");
    expect(planterLine('oak', 'groundwork', true)!.line).toBe('The fieldstone planter is in Look.');
    expect(planterLine('oak', 'moments', false)).toBeNull();
    expect(planterLine('oak', 'fieldNotes', false)).toBeNull();
    for (const item of plantersFor('oak')) {
      if (item.unlock.kind !== 'set') continue;
      expect(item.caption).toContain(PLANTER_SET_NAMES[item.unlock.set]);
    }
  });
});

// ── 5.3 The sheet ────────────────────────────────────────────────────────
describe('the sheet (5.3)', () => {
  it('earned: the 120pt tile, "Pressed 11 Oct" (said "Earned 11 October"), the line, headline "The rule", "Share this badge"', () => {
    earn('first-foothold', T0 - DAY);
    mount(<Badges />);
    press(/^First Foothold\. Earned 11 October/);
    const sheet = root().findByType(Modal);
    expect(tilesIn(sheet).find((t) => t.props.testID === 'sheet-tile')!.props.size).toBe(120);
    const t = textOf(sheet);
    expect(t).toContain('Pressed 11 Oct');
    expect(t).not.toMatch(/\bSheet [IVX]+\b/);
    const rule = sheet.findAll((n) => n.props.v === 'headline' && n.props.children === 'The rule');
    expect(rule.length).toBeGreaterThan(0);
  });

  it('the vignette: the tile beside the plant wearing the keepsake, with "On your plant: the jay."; none when it is not on show', () => {
    setPlant();
    earn('long-memory', T0 - DAY);
    // The learner shows the jay (Your plant, Change its look).
    act(() => {
      useProgress.getState().updatePlant('cisa', (p) => (p ? { ...p, look: { ...(p.look ?? {}), keepsakes: ['jay'] } } : p));
    });
    mount(<Badges />);
    press(/^Long Memory · 25 recalls, Clay\. Earned/);
    expect(allText()).toContain('On your plant: the jay.');
    expect(root().findAll((n) => n.props.testID === 'sheet-vignette').length).toBeGreaterThan(0);
    unmount();
    act(() => {
      useProgress.getState().updatePlant('cisa', (p) => (p ? { ...p, look: { ...(p.look ?? {}), keepsakes: [] } } : p));
    });
    mount(<Badges />);
    press(/^Long Memory · 25 recalls, Clay\. Earned/);
    expect(root().findAll((n) => n.props.testID === 'sheet-vignette')).toHaveLength(0);
  });
});

// ── 5.5 The album ────────────────────────────────────────────────────────
describe('the after-exam album (5.5)', () => {
  it('opens with the plant on its soil line and its name in title; no Next panel; with Show my plant off it opens with the sets', () => {
    setPlant();
    useSettings.setState({ examDates: { cisa: '2026-10-01' } });
    mount(<Badges />);
    const album = root().findAll((n) => n.props.testID === 'album-plant' && typeof n.type === 'string');
    expect(album).toHaveLength(1);
    expect(album[0].findAll((n) => n.props.v === 'title' && n.props.children === 'Kai').length).toBeGreaterThan(0);
    expect(root().findAll((n) => n.props.testID === 'still-to-collect')).toHaveLength(0);
    unmount();
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    mount(<Badges />);
    expect(root().findAll((n) => n.props.testID === 'album-plant')).toHaveLength(0);
  });

  it('before the exam there is no album plant', () => {
    setPlant();
    mount(<Badges />);
    expect(root().findAll((n) => n.props.testID === 'album-plant')).toHaveLength(0);
    expect(cp().plant?.name).toBe('Kai');
  });
});

// ── Section 8: Reduce Motion shows the end state ─────────────────────────
describe('Reduce Motion end states everywhere a tile moves', () => {
  it('a press-in (the case, a sheet opening), a waiting tile and a moment all show the taped tile at once', () => {
    setMockReducedMotion(true);
    for (const kind of ['press', 'moment', 'pending'] as const) {
      mount(<PressedTile badge="first-foothold" state="earned" size={84} motion={kind} run={1} delay={200} />);
      const host = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
      expect(styleOf(host('tile-paper')[0])).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] });
      expect(styleOf(host('tile-glassine')[0]).opacity).toBe(0);
      for (const t of host('tile-tape')) expect(styleOf(t).opacity).toBe(1);
      unmount();
    }
  });

  it('the case under Reduce Motion: a badge new since the last visit is simply there, pressed and taped', () => {
    setMockReducedMotion(true);
    useSeen.setState({ caseSeen: { cisa: T0 - 2 * DAY } });
    earn('first-foothold', T0 - DAY);
    mount(<Badges />);
    const cell = root().findAllByType(BadgeCell).find((c) => c.props.mark.key === 'first-foothold')!;
    expect(cell.props.press).toBeDefined();
    const paper = cell.findAll((n) => n.props.testID === 'tile-paper' && typeof n.type === 'string')[0];
    expect(styleOf(paper).opacity).toBe(1);
  });
});
