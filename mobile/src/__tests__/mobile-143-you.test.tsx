/**
 * Mobile 1.43, You → Readiness (board 3, owner decisions; drawn as Field Guide plates since 1.51):
 *  - ONE readiness ring (no five domain rings, no separate 0–100 line), spoken
 *    "Estimated readiness 68 to 78 percent", with a notch at the 80 study bar;
 *  - every area shows a word; the percent only from 30 answers ("N answered"
 *    and a lighter bar below that); an area below its 70 line stands out by
 *    weight and word in `clay`, not by colour alone;
 *  - the two lines are labelled apart, and never called a pass mark;
 *  - Plant yours, badges and Study tools are still on You;
 *  - at ×1.3 text the ring stacks above the range and each area drops to two lines.
 */
import { Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { AREA_LINE_LABEL, AREAS_CAPTION, areaFigure, BAND_MIN_ANSWERS, STUDY_BAR_LINE } from '../engine/domainBand';
import { selectCert, useProgress } from '../store/progress';
import { getCertification } from '../content/certifications';
import { computeReadiness } from '../engine/readiness';
import You from '../app/(tabs)/you';
import { DomainRings } from '../components/journey';
import { AreaRows, ReadinessBlock, readinessSpoken } from '../components/youReadiness';
import { ScaleBar } from '../components/fieldguide';
import { light } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const NOW = Date.now();
const cisa = getCertification('cisa')!;

/** `n` answers in one domain, the first `right` of them right, three days ago. */
const seedDomain = (d: string, n: number, right: number) =>
  act(() => {
    getAllQuestions('cisa')
      .filter((q) => q.domainId === d)
      .slice(0, n)
      .forEach((q, i) => useProgress.getState().recordAnswer('cisa', q.id, i < right, undefined, { at: NOW - 3 * 86_400_000 }));
  });

const atScale = (fontScale: number, run: () => void) => {
  const w = Dimensions.get('window');
  act(() => Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } }));
  try {
    run();
  } finally {
    act(() => Dimensions.set({ window: { ...w, fontScale: w.fontScale }, screen: { ...w, fontScale: w.fontScale } }));
  }
};

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('the area words (engine/domainBand.ts)', () => {
  it('a word for every area; the percent only from 30 answers; below the 70 line is marked', () => {
    expect(areaFigure(0, 0)).toMatchObject({ word: 'Not started', pct: null, thin: false, below: false, spoken: 'not started' });
    // Mobile 1.51 (web parity): under 30 answers, "Too few yet": no band word and no line it hasn't earned.
    expect(areaFigure(12, 90)).toMatchObject({ word: 'Too few yet', pct: null, thin: true, below: false, spoken: 'too few yet, 12 answered' });
    expect(areaFigure(12, 50)).toMatchObject({ word: 'Too few yet', thin: true, below: false });
    expect(areaFigure(BAND_MIN_ANSWERS, 68)).toMatchObject({ word: 'Building', pct: 68, thin: false, below: true, spoken: 'Building, 68 percent on latest tries, below the 70 line' });
    expect(areaFigure(40, 75)).toMatchObject({ word: 'Steady', pct: 75, below: false });
  });

  it('the two lines are labelled apart, and never a pass mark', () => {
    expect(STUDY_BAR_LINE).toContain('80%');
    expect(STUDY_BAR_LINE).toContain('70%');
    expect(STUDY_BAR_LINE).toContain('A study bar, not an exam score.');
    expect(`${STUDY_BAR_LINE} ${AREA_LINE_LABEL} ${AREAS_CAPTION}`).not.toMatch(/\bpass/i);
    expect(AREA_LINE_LABEL).toBe('Area line 70%');
  });
});

describe('the You screen (Field Guide since mobile 1.51)', () => {
  it('one scale bar, spoken with the range and its words; no rings; the areas plate; Plant, the Herbarium and Study tools stay', () => {
    seedDomain('1', 40, 34);
    seedDomain('4', 40, 26);
    act(() => {
      r = create(<You />);
    });
    expect(root().findAllByType(ScaleBar)).toHaveLength(1);
    expect(root().findAllByType(DomainRings)).toHaveLength(0);
    const block = root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && /^Estimated readiness \d+ to \d+ percent, a study estimate, not a prediction\./.test(n.props.accessibilityLabel));
    expect(block).toHaveLength(1);
    expect(block[0].props.accessibilityRole).toBe('image');
    const t = allText();
    expect(t).toContain(STUDY_BAR_LINE);
    expect(t).toContain(AREAS_CAPTION);
    expect(t).toContain('Five areas, one scale');
    expect(t).not.toMatch(/inner ring|Thicker rings|notch/);
    expect(t).not.toMatch(/\bpass\b/i);
    // Below the line: IS Operations at 65% says "below 70" in words, and its word is clay (never colour alone).
    expect(t).toContain('below 70');
    const word = root().findAll((n) => typeof n.type === 'string' && n.props.children === 'building');
    expect(word.length).toBeGreaterThan(0);
    expect(StyleSheet.flatten(word[0].props.style).color).toBe(light.clay);
    // The rest of You is still here.
    expect(t).toContain('Study tools');
    expect(t).toMatch(/Plant yours|Your plant|Kai/);
    expect(t).toContain('Badges'); // Grove You C2: never "Herbarium" on screen
    expect(t).not.toContain('Herbarium');
  });

  it('thin data: "Too few yet", "not measured yet · N answered", an outline, and no number', () => {
    seedDomain('2', 12, 9);
    act(() => {
      r = create(<AreaRows cert={cisa} readiness={computeReadiness(cisa, selectCert(useProgress.getState(), 'cisa').answers)} />);
    });
    // The website's list words (Grove: no dash for a missing number).
    expect(allText()).toMatch(/IT Governance\s+Too few yet\s+not measured yet\s+· 12 answered/);
    // The ruler is an outline with no fill (dashed), never a lighter bar with a height it hasn't earned.
    const outline = root().findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style ?? {}).borderStyle === 'dashed' && StyleSheet.flatten(n.props.style ?? {}).height === 8);
    expect(outline).toHaveLength(1);
  });

  it('not enough data: the bar with no bracket, and the countdown', () => {
    act(() => {
      r = create(<ReadinessBlock range={{ enough: false, answered: 5, needed: 35 }} />);
    });
    expect(readinessSpoken({ enough: false, answered: 5, needed: 35 })).toBe('Not enough data yet. 5 of 40 for your first range.');
    expect(allText()).toContain('Not enough data yet');
    expect(allText()).toContain('5 of 40 for your first range');
  });

  it('at ×1.3 text: the range stacks above its words, and the areas become a list', () => {
    atScale(1.3, () => {
      act(() => {
        r = create(<ReadinessBlock range={{ enough: true, answered: 80, low: 68, high: 78, centre: 73 }} />);
      });
      const block = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'image' && typeof n.props.accessibilityLabel === 'string')[0];
      expect(block.props.accessibilityLabel).toBe('Estimated readiness 68 to 78 percent, a study estimate, not a prediction. The tick marks this app’s 80 percent study bar.');
      const row = block.findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style ?? {}).flexDirection === 'column');
      expect(row.length).toBeGreaterThan(0);
    });
  });
});
