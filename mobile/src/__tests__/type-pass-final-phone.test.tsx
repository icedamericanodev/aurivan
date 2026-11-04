/**
 * Type pass, final round on the phone (design-notes/grove/TYPE_SCALE.md): the leftovers found in
 * the screenshot pass, each pinned so it does not drift back.
 *  - The chart's scale and "70 line" words are the chart label (E1 fg label, 13/17), the area
 *    name is never split by force, and the scale's strip is wide enough for "100".
 *    Verify round 1: every other chart label ("too few yet", the lines under a stem) is the chart
 *    label too and the name is fg name (600 13/17), so one chart has one size (row 176a).
 *  - "Go to Drills" is the size of its meta sentence; "Change" is the size of its row title.
 *  - The switch uses the website's Settings switch tokens, with a visible on thumb in dark where
 *    the platform draws the thumb outside the track.
 *  - Today's Accuracy tile: the raised %, and a value in words in `title`.
 *  - Settings opens with its own display title; section heads are the headline alone.
 *  - On this page, stacked: one fixed-width number column.
 */
import { Dimensions, StyleSheet, Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { gutterFor, lineLabelSpot, MIN_COLUMN, StemChart, type Stem } from '../components/fieldguide/StemChart';
import { AccuracyHeroTile } from '../components/groveToday';
import { DisclosureRow } from '../components/pathChooser';
import { Button, toggleInk } from '../components/ui';
import { accuracyTile } from '../engine/groveToday';
import { chartLabel, chartName, role } from '../theme/grove';
import { dark, light, type } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(''));
/** The host Text whose own words are exactly `words`, and its flattened style. */
const textStyle = (words: string) => {
  const t = root().findAll((n) => n.type === Text && textOf(n) === words)[0];
  return StyleSheet.flatten(t.props.style) as Record<string, unknown>;
};

const STEMS: Stem[] = [
  { key: '1', name: 'IS Audit', pct: 88, answered: 60, word: 'Strong', below: false, thin: false, spoken: 'IS Audit: Strong' },
];
const layout = (width: number) =>
  act(() => {
    for (const n of root().findAll((x) => typeof x.type === 'string' && typeof x.props.onLayout === 'function')) n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 52 } } });
  });

describe('the stem chart (item 2)', () => {
  it('the scale numbers and the "70 line" words are the 13/17 chart label; the name keeps its space', () => {
    const w = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } }));
    mount(<StemChart stems={STEMS} />);
    layout(340);
    for (const words of ['0', '50', '70', '100', '70 line']) expect([words, textStyle(words).fontSize, textStyle(words).lineHeight]).toEqual([words, chartLabel.fontSize, chartLabel.lineHeight]);
    // "IS Audit" is one string: it wraps only when its column is too narrow, never by a forced break.
    expect(textStyle('IS Audit')).toBeDefined();
    expect(root().findAll((n) => n.type === Text && textOf(n) === 'IS\nAudit')).toHaveLength(0);
  });

  it('one size in the chart: the name is fg name, "too few yet" and the lines under a stem are the chart label', () => {
    const w = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } }));
    const five: Stem[] = [
      { key: '1', name: 'IS Audit', pct: 84, answered: 60, word: 'Strong', below: false, thin: false, spoken: 'IS Audit: Strong' },
      { key: '2', name: 'IT Governance', pct: 74, answered: 44, word: 'Steady', below: false, thin: false, spoken: 'IT Governance: Steady' },
      { key: '3', name: 'IS Acquisition', pct: null, answered: 18, word: 'Building', below: true, thin: true, spoken: 'IS Acquisition: Building' },
      { key: '4', name: 'IS Operations', pct: 61, answered: 70, word: 'Building', below: true, thin: false, spoken: 'IS Operations: Building' },
      { key: '5', name: 'Info Protection', pct: null, answered: 0, word: 'Not started', below: false, thin: false, spoken: 'Info Protection: not started' },
    ];
    mount(<StemChart stems={five} />);
    // (440 - 32) / 5 = 81pt a column: the chart, not the list.
    layout(440);
    for (const words of ['IS Audit', 'IT Governance', 'Info Protection']) expect([words, textStyle(words).fontFamily, textStyle(words).fontSize, textStyle(words).lineHeight]).toEqual([words, chartName.fontFamily, 13, 17]);
    for (const words of ['too few\nyet', 'below 70']) expect([words, textStyle(words).fontSize, textStyle(words).lineHeight]).toEqual([words, chartLabel.fontSize, chartLabel.lineHeight]);
    // A name's box is its column less 4, so two names never meet ("IS Acquisition" ran into "IS Operations"),
    // and the longest name word ("Governance", about 72pt at 600 13pt) fits it at the floor.
    expect(textStyle('IT Governance').width).toBe((440 - 32) / 5 - 4);
    expect(MIN_COLUMN).toBe(78);
  });

  it('the scale strip holds "100" at the label size, grown with the text to x1.3', () => {
    expect(gutterFor(1)).toBe(32);
    expect(gutterFor(1.3)).toBeGreaterThan(gutterFor(1));
    // "line" beside the line's end is never narrower than its word.
    expect(lineLabelSpot({ lastPct: 68, line: 70, gap: 40, fs: 1 }).width).toBeGreaterThanOrEqual(22);
  });
});

describe('inline links (item 5)', () => {
  it('"Go to Drills" takes its meta sentence size, one weight up', () => {
    mount(<Button kind="ghost" inline="meta" label="Go to Drills" onPress={() => {}} />);
    const st = textStyle('Go to Drills');
    expect(st.fontSize).toBe(type.meta.fontSize);
    expect(st.lineHeight).toBe(type.meta.lineHeight);
  });

  it('"Change" is the same size as the row title beside it', () => {
    mount(<DisclosureRow title="Smart · All domains · 10 questions" action="Change" expanded={false} onPress={() => {}} />);
    expect(textStyle('Change').fontSize).toBe(textStyle('Smart · All domains · 10 questions').fontSize);
  });
});

describe('the switch (item 9)', () => {
  it('uses the website Settings switch tokens', () => {
    expect(toggleInk(light, false, 'ios')).toEqual({ onTrack: light.btn, offTrack: light.control, onThumb: light.onBtn, offThumb: light.raised });
    expect(toggleInk(dark, true, 'ios')).toEqual({ onTrack: dark.btn, offTrack: dark.control, onThumb: dark.onBtn, offThumb: dark.ink2 });
  });

  it('dark, where the thumb overhangs the track (Android, web): the on thumb is light on the dark card', () => {
    for (const os of ['android', 'web']) expect(toggleInk(dark, true, os).onThumb).toBe(dark.ink);
    expect(toggleInk(light, false, 'android').onThumb).toBe(light.onBtn);
  });
});

describe("Today's Accuracy tile (items 6 and 7)", () => {
  it('a percentage shows the raised %, as You does (never a typed "74%")', () => {
    mount(<AccuracyHeroTile tile={accuracyTile(100, 74)} />);
    const texts = root().findAll((n) => n.type === Text).map(textOf);
    expect(texts).toContain('74');
    expect(texts).toContain('%');
    expect(texts).not.toContain('74%');
  });

  it('"Too few yet" is a value in words (title, the serif of the date tile), and "30 answers" stays together', () => {
    mount(<AccuracyHeroTile tile={accuracyTile(12, 9)} />);
    expect(textStyle('Too few yet').fontSize).toBe(role.title.style.fontSize);
    expect(textStyle('Too few yet').fontFamily).toBe(role.title.style.fontFamily);
    expect(root().findAll((n) => n.type === Text && textOf(n) === 'Shows at 30 answers')).toHaveLength(1);
  });
});
