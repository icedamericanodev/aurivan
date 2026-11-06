/**
 * Type pass, verify round 2 on the phone (design-notes/grove/TYPE_SCALE.md rows 172 and 176a).
 * The area names under the stem chart are fg name (Figtree 600 13/17). Round 1 made room for them
 * by raising the list floor to 78pt a column, which hid the five-area chart on every phone up to
 * about 472pt. This round follows the web's method instead: each label block takes two columns
 * less 8 and every other block drops below its neighbours' (stemLabelLayout), so the chart is back
 * at 390pt with 13pt words, and no two words ever meet.
 */
import { Dimensions } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { chartFirstWidth, gutterFor, MIN_COLUMN, StemChart, stemLabelLayout, type Stem, type StemLabelLine } from '../components/fieldguide/StemChart';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

/** You's five CISA areas: one strong, one steady, one thin (18 answers), one below the line, one not started. */
const FIVE: Stem[] = [
  { key: '1', name: 'IS Audit', pct: 84, answered: 60, word: 'Strong', below: false, thin: false, spoken: 'IS Audit: Strong' },
  { key: '2', name: 'IT Governance', pct: 74, answered: 44, word: 'Steady', below: false, thin: false, spoken: 'IT Governance: Steady' },
  { key: '3', name: 'IS Acquisition', pct: null, answered: 18, word: 'Building', below: true, thin: true, spoken: 'IS Acquisition: 18 of 30' },
  { key: '4', name: 'IS Operations', pct: 61, answered: 70, word: 'Building', below: true, thin: false, spoken: 'IS Operations: Building' },
  { key: '5', name: 'Info Protection', pct: null, answered: 0, word: 'Not started', below: false, thin: false, spoken: 'Info Protection: not started' },
];
/** Results after a mixed set: every area has a "this set" line too. */
const RESULTS: Stem[] = FIVE.map((s) => ({ ...s, note: '2 of 3 this set' }));

const at = (screen: number, stems: readonly Stem[] = FIVE, fs = 1) => {
  const w = chartFirstWidth(screen);
  const gap = (w - gutterFor(fs)) / stems.length;
  return { w, gap, out: stemLabelLayout({ stems, line: 70, gap, gutter: gutterFor(fs), w, fs }) };
};
/** Two lines meet when they share a row and come closer than 8pt across. */
/** Two lines meet when their rows overlap by more than a line box's 4pt of air and they come closer than 8pt across. */
const meet = (a: StemLabelLine, b: StemLabelLine) => Math.min(a.y + a.lh, b.y + b.lh) - Math.max(a.y, b.y) > 4 && Math.abs(a.x - b.x) - a.w / 2 - b.w / 2 < 8;

describe('the stem chart at phone widths (verify round 2, finding 1)', () => {
  it('the floor is the web\'s 58pt a column again', () => {
    expect(MIN_COLUMN).toBe(58);
  });

  for (const screen of [375, 390, 393, 430]) {
    for (const [what, stems] of [['You', FIVE], ['Results', RESULTS]] as const) {
      it(`${what} at ${screen}pt: the chart, staggered, and no two words meet`, () => {
        const { w, gap, out } = at(screen, stems);
        expect(gap).toBeGreaterThanOrEqual(MIN_COLUMN);
        expect(out).not.toBeNull();
        expect(out!.staggered).toBe(true);
        const all = out!.columns.flatMap((c, i) => c.map((l) => ({ ...l, i })));
        for (const a of all) {
          // Every line stays inside the chart.
          expect(a.x - a.w / 2).toBeGreaterThanOrEqual(0);
          expect(a.x + a.w / 2).toBeLessThanOrEqual(w + 0.001);
          for (const b of all) if (a.i < b.i) expect([a.t, b.t, meet(a, b)]).toEqual([a.t, b.t, false]);
        }
        // Each odd block starts under the deepest line of the blocks beside it.
        for (let i = 1; i < out!.columns.length; i += 2) {
          const deepest = Math.max(...[i - 1, i + 1].filter((j) => j < out!.columns.length).flatMap((j) => out!.columns[j].map((l) => l.y + l.lh)));
          expect(out!.columns[i][0].y).toBeGreaterThan(deepest);
        }
      });
    }
  }

  it('at 390pt every name is one line except where the chart ends (13pt, never squeezed into one column)', () => {
    const { out } = at(390);
    const names = out!.columns.map((c) => c.filter((l) => l.kind === 'name').map((l) => l.t));
    expect(names).toEqual([['IS Audit'], ['IT Governance'], ['IS Acquisition'], ['IS Operations'], ['Info', 'Protection']]);
  });

  it('a chart too narrow even with the drop is the list', () => {
    // 4 areas in 200pt: (200 - 32) / 4 = 42pt a column, under the floor.
    const narrow = FIVE.slice(0, 4);
    expect((200 - gutterFor(1)) / 4).toBeLessThan(MIN_COLUMN);
    const gap = 42;
    // Called anyway, long names in tight columns that still meet give null (the list).
    const long = narrow.map((s) => ({ ...s, name: 'Acquisitionmanagement' }));
    expect(stemLabelLayout({ stems: long, line: 70, gap, gutter: 32, w: 200, fs: 1 })).toBeNull();
  });

  it('draws the chart, not the list, at 390pt (You)', () => {
    const win = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...win, fontScale: 1 }, screen: { ...win, fontScale: 1 } }));
    let r: ReactTestRenderer | undefined;
    act(() => {
      r = create(<StemChart stems={FIVE} />);
    });
    act(() => {
      for (const n of r!.root.findAll((x) => typeof x.type === 'string' && typeof x.props.onLayout === 'function')) n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: chartFirstWidth(390), height: 52 } } });
    });
    expect(r!.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'stem-list')).toHaveLength(0);
    expect(r!.root.findAll((n) => typeof n.type === 'string' && typeof n.props.testID === 'string' && n.props.testID.startsWith('area-column-'))).toHaveLength(5);
    act(() => r!.unmount());
    act(() => Dimensions.set({ window: win, screen: win }));
  });
});
