/**
 * Premium round 2 foundation, review fixes (mobile-ux-reviewer):
 *  - P1: the Herbarium row on You stacks at ×1.3 and up (the KeyList rule): emblems above, words full width.
 *  - P2: a Section head with " · " is spoken with a comma, like the running head.
 */
import { Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HerbariumEntry } from '../components/herbarium';
import { Section } from '../components/ui';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } });
  });
};

let r: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

const entry = () =>
  r!.root.find((n) => n.props.testID === 'herbarium-entry' && typeof n.type !== 'string');

describe('Herbarium row at large text', () => {
  it('is a row at 100% text', () => {
    setFontScale(1);
    act(() => {
      r = create(<HerbariumEntry pressed={[]} count={0} newBadge={false} onPress={() => {}} />);
    });
    expect(StyleSheet.flatten(entry().props.style).flexDirection).toBe('row');
  });

  it('stacks at 200% text', () => {
    setFontScale(2);
    act(() => {
      r = create(<HerbariumEntry pressed={[]} count={0} newBadge={false} onPress={() => {}} />);
    });
    expect(StyleSheet.flatten(entry().props.style).flexDirection).toBe('column');
  });
});

describe('Section head spoken label', () => {
  it('says the middle dot as a comma', () => {
    setFontScale(1);
    act(() => {
      r = create(<Section title="Part A · Information Systems Operations" variant="head" />);
    });
    const header = r!.root.find((n) => n.props.accessibilityRole === 'header' && typeof n.type === 'string');
    expect(header.props.accessibilityLabel).toBe('Part A, Information Systems Operations');
  });
});
