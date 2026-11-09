/**
 * Release bug hunt round 1: on the Look screen (a large save, every look open) each option tap
 * redrew every row's SVG thumbnail, about 3,000 components. Rows are memoised now (LookOption,
 * art compared by what it draws), so a tap redraws the preview, the two rows whose mark moved
 * and the rows whose own art really changed.
 *
 * Counts components that rendered (jest/perf/renderCounter.ts), never milliseconds.
 */
// MUST load before react-test-renderer (React reads the devtools hook once).
/**
 * Release bug hunt round 1: on the Look screen (a large save, every look open) each option tap
 * redrew every row's SVG thumbnail, about 3,000 components. Rows are memoised now (LookOption,
 * art compared by what it draws), so a tap redraws the preview, the two rows whose mark moved
 * and the rows whose own art really changed.
 *
 * Counts components that rendered (jest/perf/renderCounter.ts), never milliseconds.
 */
// MUST load before react-test-renderer (React reads the devtools hook once).
import { resetRenders } from '../../jest/perf/renderCounter';
import { Profiler } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { buildHeavySave } from '../../jest/perf/heavySave';
import PlantLook from '../app/plant-look';

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

describe('the retired Look screen on a large save', () => {
  it('renders only the compatibility placeholder and preserves the heavy save', () => {
    const before = look();
    resetRenders();
    mountLook();
    expect(r!.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'plant-moved')).toHaveLength(1);
    expect(r!.root.findAll((n) => n.props.accessibilityRole === 'radio')).toHaveLength(0);
    expect(look()).toBe(before);
  });
});
