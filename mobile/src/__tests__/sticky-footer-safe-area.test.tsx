/** R-QHER: an absolute footer must own its safe area, not inherit screen padding.
 * These are component-contract tests, not native layout or tap-target acceptance.
 * Pixel three-button/gesture navigation and iOS still require device checks.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StickyFooter } from '../components/quiz';
import { space } from '../theme/tokens';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// The icon set is ES modules Jest can't load; the footer test needs no icons.
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
}));
jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const NativeView = jest.requireActual('react-native').View;
  return {
    SafeAreaView: function MockSafeAreaView(props: object) {
      return React.createElement(NativeView, props);
    },
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

let tree: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => tree?.unmount());
  tree = undefined;
});

it.each([false, true])('owns bottom and side safe areas with rule=%s', (rule) => {
  const onHeight = jest.fn();
  const onPress = jest.fn();
  act(() => {
    tree = create(
      <StickyFooter onHeight={onHeight} rule={rule}>
        <Pressable accessibilityRole="button" accessibilityLabel="Continue" onPress={onPress} />
      </StickyFooter>,
    );
  });

  const surface = tree!.root.findByType(SafeAreaView);
  // Native SafeAreaView adds these insets to the existing token padding.
  // In landscape the navigation bar may occupy a side instead of the bottom.
  expect(surface.props.edges).toEqual(['bottom', 'left', 'right']);
  const style = StyleSheet.flatten(surface.props.style);
  expect(style.paddingBottom).toBe(space.md);
  expect(style.paddingHorizontal).toBe(space.gutter);
  expect(style.height).toBeUndefined();
  expect(style.maxHeight).toBeUndefined();
  expect(surface.props.testID).toBe(rule ? 'footer-rule' : undefined);

  const measured = tree!.root.findAllByType(View).find((node) => typeof node.props.onLayout === 'function');
  expect(measured).toBeDefined();
  expect(StyleSheet.flatten(measured!.props.style)).toMatchObject({ position: 'absolute', bottom: 0 });
  // Forwards measured outer height; native inset contribution requires device validation.
  for (const height of [84, 108, 132, 176]) {
    act(() => measured!.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 393, height } } }));
    expect(onHeight).toHaveBeenLastCalledWith(height);
  }
  // Found by label: the Jest preset wraps Pressable, so its type isn't the import.
  const button = surface.find((n) => n.props.accessibilityLabel === 'Continue' && typeof n.props.onPress === 'function');
  act(() => button.props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
});
