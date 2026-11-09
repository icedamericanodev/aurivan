/**
 * Grove Phase 4b, the phone badges (design-notes/grove/phase4b/PHASE4B.md 5.1 to 5.6): "the earned
 * paper tile".
 *
 * Plain English for the founder: these tests check
 * - the tile itself: earned is cream paper with two strips of tape; not yet is a pencilled outline
 *   whose solid part shows how close; gated is dotted and empty; the art is hidden from screen readers;
 * - the press on Results (the unlock): it waits at the pencilled mount until it plays, presses in
 *   full (glassine, press, tape) by 1080 ms, any tap ends it, and under Reduce Motion the taped tile
 *   is there at once with the same words and the same one success tap;
 * - the case: back row "You", "Every set counts on its own.", one card per set ("Groundwork" with
 *   "2 of 3 earned"), no roman numbers, tile sizes at 320 / 375 / 390, the planter line, the list
 *   at text scale 2 with "Study for this";
 * - the sheet: the 120pt tile, "Earned 11 Oct", "Share this badge", the vignette;
 * - the after-exam album opens with the plant; You's shelf tiles wear two strips of tape.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, Modal } from 'react-native';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Badges from '../app/milestones';
import { BadgeCell, BadgeListRow, caseTileSize } from '../components/badges';
import { MilestoneMomentView, MOMENT_TILE, resetBadgeMomentsForTest } from '../components/milestones';
import { resetCelebrationsForTest } from '../components/motion';
import { outlineLength, PRESS_TIMELINE, PressedTile } from '../components/pressedTile';
import { plantNew } from '../engine/plant';
import type { MilestoneMoment } from '../lib/milestones';
import { selectCert, useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { grovePlate } from '../theme/grove';
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
/** The earned tiles under a node (PressedTile is memoised, so it is found by its props). */
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

// ── 5.2 The earned tile ────────────────────────────────────────────────
describe('the earned tile (5.2)', () => {
  it('earned tiles keep original emblem artwork without tape and hide decorative art from screen readers', () => {
    mount(<PressedTile badge="first-foothold" state="earned" size={84} />);
    expect(root().findAll((n) => n.props.testID === 'tile-paper').length).toBeGreaterThan(0);
    expect(root().findAll((n) => n.props.testID === 'tile-tape')).toHaveLength(0);
    const box = root().findAll((n) => n.props.importantForAccessibility === 'no-hide-descendants' && typeof n.type === 'string')[0];
    expect(box.props.accessible).toBe(false);
  });

  it('the warm badge artwork remains present in dark theme', () => {
    useSettings.setState({ theme: 'dark' });
    mount(<PressedTile badge="first-foothold" state="earned" size={84} />);
    expect(root().findAll((n) => n.props.testID === 'tile-paper').length).toBeGreaterThan(0);
  });

  it('not yet: a dashed control outline, its solid accent part as long as the progress; no tape', () => {
    mount(<PressedTile badge="long-memory" tier={2} state="open" size={84} progress={31 / 75} />);
    const solid = root().findAll((n) => n.props.testID === 'tile-progress')[0];
    const w = 84 - 1.5;
    const len = outlineLength(w, Math.round(84 * 0.27) - 0.75);
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

  it('the brief press ends within the existing celebration ceiling', () => {
    expect(PRESS_TIMELINE.pressAt).toBeLessThan(PRESS_TIMELINE.done);
    expect(PRESS_TIMELINE.done).toBeLessThanOrEqual(motion.dur.celebrate);
  });

  it('a pending badge waits as an outline until its moment is visible', () => {
    setMockReducedMotion(false);
    mount(<PressedTile badge="took-root" state="earned" size={MOMENT_TILE} motion="pending" />);
    expect(root().findAll((n) => n.props.testID === 'tile-paper')).toHaveLength(0);
  });
});

// ── 5.4 The press on Results ─────────────────────────────────────────────
describe('the unlock: the press (5.4)', () => {
  const m: MilestoneMoment = { key: 'took-root', label: 'Topic Recall', rule: 'r', kind: 'milestone', set: 'evergreen', setName: 'Evergreen', unlock: 'You cleared a whole topic.' };
  const tile = () => byTestID('moment-tile')[0];
  const paperOpacity = () => { const p = root().findAll((n) => n.props.testID === 'tile-paper' && typeof n.type === 'string')[0]; return p ? styleOf(p).opacity : 0; };

  it('same words from the first frame: caption, the name in label, the line; no medallion and no leaves', () => {
    setMockReducedMotion(false);
    mount(<MilestoneMomentView moment={m} once="w1" inView={false} />);
    const t = allText();
    expect(t).toContain('A new badge · Evergreen');
    expect(t).toContain('Topic Recall');
    expect(t).toContain('You cleared a whole topic.');
    expect(root().findAll((n) => typeof n.type === 'function' && /^(Medallion|LeafFall)$/.test((n.type as { name?: string }).name ?? ''))).toHaveLength(0);
    expect(labels()).toContain('A new badge, Evergreen: Topic Recall. You cleared a whole topic.');
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

  it('the press lands on its last frame: the paper on, earned flat (scale 1), the glassine lifted away, both tapes down', () => {
    mount(<PressedTile testID="a" badge="took-root" state="earned" size={MOMENT_TILE} motion="moment" run={1} />);
    // The test clock lands every animation on its end value; a re-render shows it.
    act(() => r!.update(<PressedTile testID="b" badge="took-root" state="earned" size={MOMENT_TILE} motion="moment" run={1} />));
    const host = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
    expect(styleOf(host('tile-paper')[0])).toMatchObject({ opacity: 1, transform: [{ scale: 1 }] });
    expect(host('tile-glassine')).toHaveLength(0);
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
    mount(<MilestoneMomentView moment={{ ...m, key: 'loop-closed', label: 'Mistakes Fixed' }} once="a2" />);
    const cel = root().findAll((n) => n.props.celebration !== undefined)[0].props.celebration as { mode: string };
    expect(cel.mode).not.toBe('full');
    expect(tile().props.motion).toBe('end');
    unmount();
    resetCelebrationsForTest();
    mount(<MilestoneMomentView moment={{ ...m, key: 'rooted:30', label: 'Study Days · 30 days', tier: 2, tierUp: true }} once="a3" inView={false} />);
    expect(tile().props.motion).toBe('end');
  });
});

// ── 5.1 The case ─────────────────────────────────────────────────────────
describe('the case (5.1)', () => {
  it('back row "You", the title, the italic line and the promise; one card per set with "2 of 3 earned"; no roman numbers', () => {
    earn('first-foothold', T0 - 2 * DAY);
    earn('topic-clear', T0 - DAY);
    mount(<Badges />);
    expect(labels()).toContain('Back to You');
    const t = allText();
    expect(t).toContain('You Badges');
    expect(labels()).toContain('About badges');
    expect(t).toContain('Groundwork 2 of 3 earned');
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
    expect(labels()).toContain('Study for this: First Review');
  });

  it('existing plant owners see badges without planter rewards and keep their saved data', () => {
    setPlant();
    earn('first-foothold', T0 - DAY);
    mount(<Badges />);
    expect(root().findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('planter-line-'))).toHaveLength(0);
    expect(cp().plant?.name).toBe('Kai');
    expect(cp().milestones?.earned['first-foothold']).toBe(T0 - DAY);
  });

  it('badge guidance is accessible through the information button', () => {
    mount(<Badges />);
    press(/^About badges$/);
    expect(allText()).toContain('Once earned, a badge stays.');
    expect(allText()).toContain('retests within four hours');
  });
});

// ── 5.3 The sheet ────────────────────────────────────────────────────────
describe('the sheet (5.3)', () => {
  it('earned: the 120pt tile, "Earned 11 Oct" (said "Earned 11 October"), the line, headline "The rule", "Share this badge"', () => {
    earn('first-foothold', T0 - DAY);
    mount(<Badges />);
    press(/^First Review\. Earned 11 October/);
    const sheet = root().findByType(Modal);
    expect(tilesIn(sheet).find((t) => t.props.testID === 'sheet-tile')!.props.size).toBe(120);
    const t = textOf(sheet);
    expect(t).toContain('Earned 11 Oct');
    expect(t).not.toMatch(/\bSheet [IVX]+\b/);
    const rule = sheet.findAll((n) => n.props.v === 'headline' && n.props.children === 'The rule');
    expect(rule.length).toBeGreaterThan(0);
  });

  it('earned badge details show the requirement without a plant vignette', () => {
    setPlant();
    earn('long-memory', T0 - DAY);
    mount(<Badges />);
    press(/^Lasting Recall · 25 recalls, Bronze\. Earned/);
    expect(root().findAll((n) => n.props.testID === 'sheet-vignette')).toHaveLength(0);
    expect(allText()).not.toContain('On your plant:');
  });
});

// ── 5.5 The album ────────────────────────────────────────────────────────
describe('the after-exam album (5.5)', () => {
  it('after the exam opens with badge sets and preserves the existing plant save', () => {
    setPlant();
    useSettings.setState({ examDates: { cisa: '2026-10-01' } });
    mount(<Badges />);
    expect(root().findAll((n) => n.props.testID === 'album-plant')).toHaveLength(0);
    expect(root().findAll((n) => n.props.testID === 'still-to-collect')).toHaveLength(0);
    expect(cp().plant?.name).toBe('Kai');
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
      expect(host('tile-glassine')).toHaveLength(0);
      for (const t of host('tile-tape')) expect(styleOf(t).opacity).toBe(1);
      unmount();
    }
  });

  it('the case under Reduce Motion: a badge new since the last visit is simply there, earned and taped', () => {
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
