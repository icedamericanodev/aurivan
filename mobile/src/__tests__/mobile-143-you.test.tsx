/** You keeps its cautious readiness estimate and report navigation without the domain chart card. */
import { Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { AREA_LINE_LABEL, AREAS_CAPTION, areaFigure, BAND_MIN_ANSWERS, STUDY_BAR_LINE } from '../engine/domainBand';
import { selectCert, useProgress } from '../store/progress';
import { getCertification } from '../content/certifications';
import { computeReadiness } from '../engine/readiness';
import You from '../app/(tabs)/you';
import { DomainRings } from '../components/journey';
import { lowEndLine, ReadinessBlock, readinessSpoken } from '../components/youReadiness';
import { READY_LOW } from '../engine/examReady';
import { readinessRange } from '../engine/readinessRange';
import { ScaleBar } from '../components/fieldguide';
import { router } from 'expo-router';
import { Button } from '../components/ui';

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

describe('the low end, said once (Grove panel Q1)', () => {
  it('names the low end, what the study bar asks, and how far off it is, from the study bar constant', () => {
    expect(lowEndLine(67)).toBe(
      `Your low end, 67, is the cautious end. The study bar is ${READY_LOW}, a goal, not an exam score. You’re ${READY_LOW - 67} under it.`,
    );
    expect(lowEndLine(READY_LOW)).toMatch(/You’re at or above it\.$/);
    expect(lowEndLine(READY_LOW + 4)).toMatch(/You’re at or above it\.$/);
    expect(lowEndLine(70, 75)).toContain('The study bar is 75');
    // Short text (Sky, 5 Nov): three short sentences, each about 12 words or fewer.
    for (const sentence of lowEndLine(67).split(/(?<=\.) /)) expect(sentence.split(' ').length).toBeLessThanOrEqual(12);
    // Grove copy rules: no dashes, none of the banned words.
    for (const line of [lowEndLine(40), lowEndLine(90)]) {
      expect(line).not.toMatch(/[\u2013\u2014]/);
      expect(line).not.toMatch(/\bpass|guarantee|official|you['’]re ready|evolve|runner-up/i);
    }
  });
});

describe('the You screen (Term Match since mobile 1.51)', () => {
  it('keeps the cautious readiness estimate and report link while removing the domain chart and plant card', () => {
    seedDomain('1', 40, 34);
    seedDomain('4', 40, 26);
    act(() => { r = create(<You />); });
    expect(root().findAllByType(ScaleBar)).toHaveLength(1);
    expect(root().findAllByType(DomainRings)).toHaveLength(0);
    const block = root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && /^Estimated readiness \d+ to \d+ percent, a study estimate, not a prediction\./.test(n.props.accessibilityLabel));
    expect(block).toHaveLength(1);
    expect(block[0].props.accessibilityRole).toBe('image');
    const t = allText();
    const range = readinessRange(cisa, computeReadiness(cisa, selectCert(useProgress.getState(), 'cisa').answers));
    expect(range.enough).toBe(true);
    if (range.enough) expect(t).toContain(lowEndLine(range.low));
    expect(root().findAll((n) => n.props.testID === 'areas-plate')).toHaveLength(0);
    expect(t).not.toContain('Five areas, one scale');
    expect(t).not.toMatch(/Plant yours|Your plant|Herbarium/);
    expect(t).toContain('Study tools');
    expect(t).toContain('Badges');
    const report = root().findAllByType(Button).find((n) => n.props.label === 'See report');
    expect(report?.props.accessibilityLabel).toBe('See report, your readiness report');
    act(() => report!.props.onPress());
    expect(router.push).toHaveBeenCalledWith('/readiness');
  });

  it('before the first range: no low-end sentence and no study-bar line (no scale bar is drawn yet)', () => {
    seedDomain('1', 34, 30);
    act(() => {
      r = create(<You />);
    });
    const t = allText();
    // Short text (Sky, 5 Nov): the study-bar words wait for the scale bar; one count line stands.
    expect(t).not.toContain(STUDY_BAR_LINE);
    expect(t).toContain('34 of 40 answers for your first range.');
    expect(t).not.toContain('A study bar, not an exam score.');
    expect(t).not.toContain('Your low end,');
  });

  it('not enough data: the bar with no bracket, and the countdown', () => {
    act(() => {
      r = create(<ReadinessBlock range={{ enough: false, answered: 5, needed: 35 }} />);
    });
    expect(readinessSpoken({ enough: false, answered: 5, needed: 35 })).toBe('Not enough data yet. 5 of 40 for your first range.');
    expect(allText()).toContain('Not enough data yet');
    expect(allText()).toContain('5 of 40 for your first range');
  });

  it('at ×1.3 text: the range stacks above its words', () => {
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
