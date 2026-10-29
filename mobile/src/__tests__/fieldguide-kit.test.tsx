/**
 * The Field Guide kit (mobile 1.51, DESIGN_SYSTEM.md §21): each component's
 * words, spoken labels and large-text fallback.
 *  - ScaleBar always carries "a study estimate, not a prediction"; no pass / ready words.
 *  - StemChart: one stop per area; too few yet is an outline with no number; below the line
 *    says so in words; from ×1.3 text (or a too-narrow column) it hands over to StemList.
 *  - Specimen: one button spoken in full, three states (earned, not yet, gated), no padlock.
 *  - KeyCaption, EmptyPlate, RunningHead and the plate button.
 */
import { Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { EmptyPlate, EMPTY_PLATE_TITLE, ESTIMATE_WORDS, KeyCaption, KeyList, Plate, RunningHead, ScaleBar, scaleSpoken, Specimen, SpecimenLabel, SpecimenRow, StemChart, type Stem } from '../components/fieldguide';
import { Button } from '../components/ui';
import { plate } from '../theme/tokens';

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
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const labels = () =>
  root()
    .findAll((n) => typeof n.type === 'string' && n.props.accessible === true && typeof n.props.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel as string);
const list = () => root().findAll((n) => typeof n.type === 'string' && n.props.testID === 'stem-list');
const atScale = (fontScale: number, run: () => void) => {
  const w = Dimensions.get('window');
  act(() => Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } }));
  try {
    run();
  } finally {
    act(() => Dimensions.set({ window: { ...w, fontScale: w.fontScale }, screen: { ...w, fontScale: w.fontScale } }));
  }
};
/** Lay out every view that measures itself at this width. */
const layout = (width: number) =>
  act(() => {
    for (const n of root().findAll((x) => typeof x.type === 'string' && typeof x.props.onLayout === 'function')) n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 52 } } });
  });

afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

const STEMS: Stem[] = [
  { key: '1', name: 'IS Audit', pct: 84, answered: 60, word: 'Strong', below: false, thin: false, spoken: 'IS Audit: Strong, 84 percent on latest tries, at or above the 70 line' },
  { key: '2', name: 'IT Governance', pct: 74, answered: 44, word: 'Steady', below: false, thin: false, spoken: 'IT Governance: Steady' },
  { key: '3', name: 'IS Acquisition', pct: null, answered: 18, word: 'Building', below: true, thin: true, spoken: 'IS Acquisition: Building, from 18 answers' },
  { key: '4', name: 'IS Operations', pct: 61, answered: 70, word: 'Building', below: true, thin: false, up: 3, spoken: 'IS Operations: Building, 61 percent' },
  { key: '5', name: 'Info Protection', pct: null, answered: 0, word: 'Not started', below: false, thin: false, spoken: 'Info Protection: not started' },
];

describe('ScaleBar', () => {
  it('the range always travels with "a study estimate, not a prediction", and the study bar is said', () => {
    const range = { enough: true as const, answered: 120, low: 64, high: 72, centre: 68 };
    act(() => {
      r = create(<ScaleBar range={range} />);
    });
    layout(340);
    expect(allText()).toContain(ESTIMATE_WORDS);
    expect(allText()).toContain('64–72');
    expect(scaleSpoken(range)).toBe('Estimated readiness 64 to 72 percent, a study estimate, not a prediction. The tick marks this app’s 80 percent study bar.');
    expect(labels()).toContain(scaleSpoken(range));
    expect(`${allText()} ${labels().join(' ')}`).not.toMatch(/\bpass|you'?re ready|official/i);
  });

  it('before the first range: the countdown, no bracket and no estimate words', () => {
    act(() => {
      r = create(<ScaleBar range={{ enough: false, answered: 12, needed: 28 }} />);
    });
    layout(340);
    expect(allText()).toContain('Not enough data yet');
    expect(allText()).toContain('12 of 40 for your first range');
    expect(allText()).not.toContain(ESTIMATE_WORDS);
  });
});

describe('StemChart', () => {
  it('one stop per area, left to right; too few yet and not started are words, never a number', () => atScale(1, () => {
    act(() => {
      r = create(<StemChart stems={STEMS} />);
    });
    layout(340);
    expect(labels()).toEqual(STEMS.map((s) => s.spoken));
    // The chart sets "not started" and "too few yet" on two lines, like the names.
    const t = allText().replace(/\n/g, ' ');
    expect(allText()).toContain('not\nstarted');
    expect(t).toContain('too few yet');
    expect(t).toContain('18 answered');
    expect(t).toContain('not started');
    expect(t).toContain('70 line');
    // Below the line: the word in clay AND the words "below 70" (never colour alone).
    expect(t).toContain('below 70');
    expect(t).toContain('↑3');
    expect(list()).toHaveLength(0);
  }));

  it('hands over to the list at ×1.3 text, and when a column would be too narrow', () => {
    atScale(1.3, () => {
      act(() => {
        r = create(<StemChart stems={STEMS} />);
      });
      layout(340);
      expect(list()).toHaveLength(1);
      expect(labels()).toEqual(STEMS.map((s) => s.spoken));
    });
    act(() => r?.unmount());
    atScale(1, () => {
      act(() => {
        r = create(<StemChart stems={STEMS} />);
      });
      layout(240);
      expect(list()).toHaveLength(1);
    });
    // The list's too-few-yet bar is an outline with no fill.
    expect(allText()).toContain('too few yet');
  });

  // UX review H1: the "70 line" label is drawn after the stems, so the last column's stem never paints over it.
  it('draws the "70 line" label after every stem', () => atScale(1, () => {
    act(() => {
      r = create(<StemChart stems={STEMS} />);
    });
    layout(340);
    const drawing = root().find((n) => typeof n.type === 'string' && n.props.accessibilityElementsHidden === true);
    const kids = drawing.children.filter((k): k is ReactTestInstance => typeof k !== 'string');
    const lastStem = kids.map((k) => (typeof k.type === 'function' && k.type.name === 'StemColumn' ? 1 : 0)).lastIndexOf(1);
    const lineLabel = kids.findIndex((k) => textOf(k) === '70 line');
    expect(lastStem).toBeGreaterThan(-1);
    expect(lineLabel).toBeGreaterThan(lastStem);
  }));

  // UX review H2: between ×1.15 and ×1.29 the columns need room for the grown names, or the list takes over;
  // where the chart stays (×1.1 on a wide plate) it grows taller with the words under the soil.
  it('grows with the text below ×1.3: a column too narrow for grown names hands over, a wide one gets taller', () => {
    const height = () => root().findAll((n) => typeof n.type === 'string' && typeof n.props.style === 'object' && n.props.style?.height > 200 && n.props.accessibilityElementsHidden === undefined)[0]?.props.style.height as number;
    let base = 0;
    atScale(1, () => {
      act(() => {
        r = create(<StemChart stems={STEMS} />);
      });
      layout(340);
      base = height();
    });
    act(() => r?.unmount());
    atScale(1.2, () => {
      act(() => {
        r = create(<StemChart stems={STEMS} />);
      });
      // (340 - 24) / 5 = 63pt a column, under 58 × 1.2: the list, never truncated names.
      layout(340);
      expect(list()).toHaveLength(1);
    });
    act(() => r?.unmount());
    atScale(1.2, () => {
      act(() => {
        r = create(<StemChart stems={STEMS} />);
      });
      layout(420);
      expect(list()).toHaveLength(0);
      expect(height()).toBeGreaterThan(base);
    });
  });
});

describe('ScaleBar, the tick named', () => {
  const range = { enough: true as const, answered: 120, low: 64, high: 72, centre: 68 };
  it('Today names the tick "study bar" under its 80 where the bar has room; a narrow bar keeps the number alone', () => {
    act(() => {
      r = create(<ScaleBar range={range} markLabel="study bar" />);
    });
    layout(340);
    expect(allText()).toContain('study bar');
    // Every number on one baseline (UX review P2): 0, 50, 80 and 100 all sit at the same top.
    const tops = root()
      .findAll((n) => typeof n.type === 'string' && n.props.style?.position === 'absolute' && /^(0|50|80|100)$/.test(textOf(n)))
      .map((n) => n.props.style.top as number);
    expect(new Set(tops).size).toBe(1);
    act(() => r?.unmount());
    act(() => {
      r = create(<ScaleBar range={range} markLabel="study bar" />);
    });
    layout(200);
    expect(allText()).not.toContain('study bar');
    expect(allText()).toContain('80');
  });

  it('You leaves it out: the number alone', () => {
    act(() => {
      r = create(<ScaleBar range={range} />);
    });
    layout(340);
    expect(allText()).not.toContain('study bar');
  });
});

describe('Specimen', () => {
  const base = { badge: 'first-foothold', width: 100, size: 56, onPress: () => {} };
  it('earned, not yet and gated: one button each, spoken in full, the gate in words', () => {
    act(() => {
      r = create(
        <>
          <Specimen {...base} state="earned" name="First Foothold" line="Pressed 3 Oct" spoken="First Foothold. Earned 3 Oct." />
          <Specimen {...base} badge="rooted" tier={1} state="earned" name="Rooted" tierCaption="10 days" line="Pressed 14 Oct" spoken="Rooted, Clay. Earned 14 Oct." />
          <Specimen {...base} badge="ten-topics" state="open" name="Ten Topics Clear" line="7 of 10 topics" spoken="Ten Topics Clear. Not yet." />
          <Specimen {...base} badge="mindset-shift" state="gated" name="Mindset Shift" line="Opens after 3 weeks of first tries" spoken="Mindset Shift. Not yet. Opens after 3 weeks of first tries." />
        </>,
      );
    });
    const buttons = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button');
    expect(buttons.map((b) => b.props.accessibilityLabel)).toEqual([
      'First Foothold. Earned 3 Oct.',
      'Rooted, Clay. Earned 14 Oct.',
      'Ten Topics Clear. Not yet.',
      'Mindset Shift. Not yet. Opens after 3 weeks of first tries.',
    ]);
    const t = allText();
    expect(t).toContain('Clay · 10 days');
    expect(t).toContain('Opens after 3 weeks of first tries');
    expect(t).not.toMatch(/lock|\?/i);
  });
});

describe('the small pieces', () => {
  it('KeyCaption is one stop; EmptyPlate says what comes next; the running head says where you are', () => {
    act(() => {
      r = create(
        <>
          <RunningHead section="Field guide · Today" aside="Thu 29 Oct" asideLabel="Thursday 29 October" />
          <Plate fig={{ n: 5, title: 'Five areas, one scale' }} />
          <KeyCaption label="KEY">One line of growth per area.</KeyCaption>
          <EmptyPlate body="IS Acquisition needs a few more answers before it is measured." />
          <SpecimenLabel>
            <SpecimenRow label="Days to exam" value="38" />
            <SpecimenRow label="Study days in a row" word="Starts today" />
          </SpecimenLabel>
          <KeyList items={[{ key: 'a', title: 'Change management', right: 'question 3', mark: 'missed', spoken: 'Question 3, missed: Change management' }]} />
        </>,
      );
    });
    const l = labels();
    expect(l).toContain('Key: One line of growth per area.');
    expect(l).toContain(`${EMPTY_PLATE_TITLE}. IS Acquisition needs a few more answers before it is measured.`);
    expect(l).toContain('Days to exam: 38');
    expect(l).toContain('Study days in a row: Starts today');
    expect(l).toContain('Question 3, missed: Change management');
    const fig = root().findAll((n) => n.props?.accessibilityRole === 'header' && n.props.accessibilityLabel === 'Figure 5, Five areas, one scale');
    expect(fig.length).toBeGreaterThan(0);
    expect(allText()).toContain('Fig. 5 · Five areas, one scale');
    expect(root().findAll((n) => n.props?.accessibilityLabel === 'Field guide, Today').length).toBeGreaterThan(0);
  });

  it('the plate button: 52 tall with 12pt corners', () => {
    act(() => {
      r = create(<Button label="Continue" shape="plate" onPress={() => {}} />);
    });
    const btn = root().find((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button');
    const st = StyleSheet.flatten(btn.props.style);
    expect(st.minHeight).toBe(plate.button);
    expect(st.borderRadius).toBe(plate.buttonRadius);
  });
});
