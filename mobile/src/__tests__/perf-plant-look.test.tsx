/**
 * Release bug hunt round 1: on the Look screen (a large save, every look open) each option tap
 * redrew every row's SVG thumbnail, about 3,000 components. Rows are memoised now (LookOption,
 * art compared by what it draws), so a tap redraws the preview, the two rows whose mark moved
 * and the rows whose own art really changed.
 *
 * Counts components that rendered (jest/perf/renderCounter.ts), never milliseconds.
 */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { renders, resetRenders } from '../../jest/perf/renderCounter';
import { Profiler } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { buildHeavySave } from '../../jest/perf/heavySave';
import PlantLook from '../app/plant-look';
import { colourwaysFor, GROUNDS, VISITORS } from '../engine/plantLooks';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
// Measured on the heavy save, before the fix -> after: visitor 1,176 -> 477, ground 1,463 -> 824, colour 2,598 -> 2,088.
// (A style tap changes every thumbnail, since each draws the plant in the chosen style: about 2,600 both ways.)
const BUDGET_VISITOR = 700;
const BUDGET_GROUND = 1100;
const BUDGET_COLOUR = 2350;
const option = (id: string) => r!.root.findAll((n) => n.props.testID === `look-${id}` && n.props.accessibilityRole !== undefined && typeof n.props.onPress === 'function')[0];
const tap = (id: string) => {
  const n = option(id);
  if (!n) throw new Error(`no option ${id}`);
  resetRenders();
  act(() => {
    n.props.onPress();
  });
  return renders().screen ?? 0;
};

beforeAll(() => {
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true } as never);
  act(() => {
    buildHeavySave(Date.now(), 150);
  });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

const mountLook = () => {
  act(() => {
    r = create(
      <Profiler id="screen" onRender={() => {}}>
        <PlantLook />
      </Profiler>,
    );
  });
};
const look = () => selectCert(useProgress.getState(), 'cisa').plant?.look;
/** Options of a group that are open and not chosen now, so a tap is a real change. */
const unchosen = (ids: string[]) =>
  r!.root
    .findAll((n) => typeof n.props.testID === 'string' && n.props.accessibilityRole === 'radio' && n.props.accessibilityState?.checked === false && !n.props.accessibilityState?.disabled)
    .map((n) => (n.props.testID as string).slice('look-'.length))
    .filter((id) => ids.includes(id));

describe('the Look screen on a large save', () => {
  it('a visitor tap redraws the preview and two rows, not every thumbnail; the choice is saved', () => {
    mountLook();
    const visitor = unchosen(VISITORS.map((x) => x.id))[0];
    expect(tap(visitor)).toBeLessThan(BUDGET_VISITOR);
    expect(look()?.visitor).toBe(visitor);
  });

  it('a colour tap redraws only what the colour changes', () => {
    mountLook();
    const way = unchosen(colourwaysFor('oak').map((x) => x.id))[0];
    expect(tap(way)).toBeLessThan(BUDGET_COLOUR);
    expect(look()?.colourway).toBe(way);
  });

  it('a ground tap redraws less; a style tap (every thumbnail changes) still saves the choice', () => {
    mountLook();
    const ground = unchosen(GROUNDS.map((x) => x.id))[0];
    if (ground) {
      expect(tap(ground)).toBeLessThan(BUDGET_GROUND);
      expect(look()?.ground).toBe(ground);
    }
    const other = look()?.style === 'storybook' ? 'botanical' : 'storybook';
    tap(other);
    expect(look()?.style).toBe(other);
  });
});
