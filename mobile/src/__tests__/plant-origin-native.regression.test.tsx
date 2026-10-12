/**
 * Regression: "Transform origin must have exactly 3 values" on a real phone
 * when planting (reported on the Android emulator with the sunflower).
 *
 * React Native parses a transform-origin STRING with a regex that does not
 * understand decimals: "100.0px" is read as "0", "0", "0px", so the origin gets
 * too many values and the screen crashes. The web build accepts the same string,
 * so web screenshots never showed it. This test runs every origin the plant
 * layers produce through React Native's own parser, for every species, growth
 * step and size the app uses.
 */
import { create, act, type ReactTestRenderer } from 'react-test-renderer';
import { baseOrigin, LivePlant, originPx } from '../components/plant/LivePlant';
import { buildPlant } from '../components/plant/art';
import { PLANT_SPECIES } from '../engine/plant';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]) }));

// React Native's own origin parser (the one that crashed on the phone). It ships without types.
const processTransformOrigin = jest.requireActual<{ default: (o: string) => (string | number)[] }>(
  'react-native/Libraries/StyleSheet/processTransformOrigin',
).default;

type Node = { props: { style?: unknown }; type: unknown };

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

function origins(r: ReactTestRenderer): unknown[] {
  return r.root
    .findAll((n: Node) => typeof n.type === 'string' && 'transformOrigin' in flatten(n.props.style))
    .map((n: Node) => flatten(n.props.style).transformOrigin);
}

describe('plant transform origins parse on native', () => {
  const SIZES = [64, 104, 140, 200];
  const STAGES = [1, 2, 3, 4, 5, 6] as const;

  it.each(PLANT_SPECIES)('%s: every size and growth step gives a valid 3-value origin', (species) => {
    for (const size of SIZES) {
      for (const stage of STAGES) {
        let r!: ReactTestRenderer;
        act(() => {
          // plantIn adds the onboarding sprout layer on top of the plant layer.
          r = create(<LivePlant species={species} stage={stage} size={size} theme="light" plantIn />);
        });
        const found = origins(r);
        expect(found.length).toBeGreaterThan(0);
        for (const o of found) {
          const parsed = processTransformOrigin(o as string);
          expect(parsed).toHaveLength(3);
          expect(typeof parsed[0]).toBe('number');
          expect(typeof parsed[1]).toBe('number');
          // The pivot stays inside the plant's square.
          expect(parsed[0] as number).toBeGreaterThanOrEqual(0);
          expect(parsed[0] as number).toBeLessThanOrEqual(size);
          expect(parsed[1] as number).toBeGreaterThanOrEqual(0);
          expect(parsed[1] as number).toBeLessThanOrEqual(size + 16);
        }
        act(() => r.unmount());
      }
    }
  });

  it.each(PLANT_SPECIES)('%s: the growth sequence old-plant origin parses too', (species) => {
    for (const size of SIZES) {
      for (const stage of STAGES) {
        const built = buildPlant({ species, stage, theme: 'light' });
        for (const viewBox of [built.frame, '0 0 200 200']) {
          const parsed = processTransformOrigin(baseOrigin(built, viewBox, size));
          expect(parsed).toHaveLength(3);
        }
      }
    }
  });

  it('originPx always gives whole, non-negative pixels the native parser reads back exactly', () => {
    for (const [x, y] of [[100, 152.5], [0.04, 10.0], [120.96, 99.5], [-3.2, 7], [200, 200], [10.05, 100.0]]) {
      const parsed = processTransformOrigin(originPx(x, y));
      expect(parsed).toEqual([Math.max(0, Math.round(x)), Math.max(0, Math.round(y)), 0]);
    }
  });
});
