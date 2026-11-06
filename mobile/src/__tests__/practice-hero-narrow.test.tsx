/**
 * Release bug hunt round 1: the Practice hero's tile key "DOMAINS" broke mid-word ("DOMAIN / S")
 * on a 320dp phone, and on a 360dp phone at the next text size up (×1.15). When three tiles do not
 * fit, Domains now takes its own row (the layout already used when one area is picked), and Count
 * and Timed share the row under it. The font and the words never change.
 */
import { Dimensions, Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroTileRow, heroTilesFit } from '../app/(tabs)/practice';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View: V } = jest.requireActual('react-native');
  return { SafeAreaView: V, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const w0 = Dimensions.get('window');
const setWindow = (width: number, fontScale: number) =>
  act(() => {
    Dimensions.set({ window: { ...w0, width, fontScale }, screen: { ...w0, width, fontScale } });
  });
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  act(() => {
    Dimensions.set({ window: w0, screen: w0 });
  });
});

/** The host row that holds the Domains tile: does it hold the other two as well? */
const domainsShareARow = () => {
  const rows = r!.root.findAll((n) => n.type === View && n.props.style?.flexDirection === 'row');
  const holds = (n: (typeof rows)[number], t: string) => n.findAll((x) => x.type === Text && x.props.children === t).length > 0;
  const row = rows.find((n) => holds(n, 'Domains'))!;
  return holds(row, 'Count') && holds(row, 'Timed');
};
const mount = () =>
  act(() => {
    r = create(
      <HeroTileRow>
        <Text>Domains</Text>
        <Text>Count</Text>
        <Text>Timed</Text>
      </HeroTileRow>,
    );
  });

describe('the Practice hero tiles on narrow phones', () => {
  it.each([
    [320, 1, false],
    [360, 1.15, false],
    [360, 1, true],
    [393, 1.15, true],
    [412, 1, true],
  ])('%sdp at ×%s text: three in a row is %s', (width, fontScale, fits) => {
    expect(heroTilesFit(width, fontScale)).toBe(fits);
    setWindow(width, fontScale);
    mount();
    expect(domainsShareARow()).toBe(fits);
  });
});
