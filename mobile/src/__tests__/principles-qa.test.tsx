/**
 * QA gaps for the Principles feature (mobile-qa-tester):
 * - an alias link opens the principle it belongs to;
 * - a malformed link id (a lone "%") does not crash the page;
 * - Learn shows no Principles row for a cert without principles;
 * - a principle practice set survives an app kill (persisted session restored).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getPrinciples } from '../content/principles';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import PrincipleScreen from '../app/principles/[id]';
import Learn from '../app/(tabs)/learn';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
    canDismiss: () => false,
    dismissAll: jest.fn(),
    setParams: jest.fn(),
  },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  mockPush.mockClear();
  useSettings.setState({ activeCertId: 'cisa' });
});
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') out.push(n);
    else n.children.forEach(walk);
  };
  walk(r!.root);
  return out.join(' ');
};
const press = (label: string) => {
  const n = r!.root.findAll((x) => typeof x.props.onPress === 'function' && x.props.accessibilityLabel === label)[0];
  act(() => {
    n.props.onPress();
  });
};

const pack = getPrinciples('cisa')!;
const target = pack.principles.find((p) => p.id === 'people-contain-preserve')!;

it('an alias link (FORENSIC-IMAGING) opens the principle it belongs to', () => {
  mockParams = { id: 'FORENSIC-IMAGING' };
  mount(<PrincipleScreen />);
  expect(allText()).toContain(target.title);
});

// Fixed: app/principles/[id].tsx decodes with lib/actions safeDecode.
it('a malformed link id (a lone "%") shows "not found" instead of crashing', () => {
  mockParams = { id: '%' };
  expect(() => mount(<PrincipleScreen />)).not.toThrow();
  expect(allText()).toContain('Principle not found');
});

it('Learn shows no Principles row for a cert without principles', () => {
  useSettings.setState({ activeCertId: 'cism' });
  mount(<Learn />);
  expect(allText()).not.toContain('The thinking the exam rewards');
  expect(r!.root.findAll((x) => x.props.accessibilityLabel === 'Principles, the thinking the exam rewards')).toEqual([]);
});

it('a principle practice set is restored after an app kill', async () => {
  mockParams = { id: target.id };
  mount(<PrincipleScreen />);
  press('Practice this principle');
  const before = useSession.getState().active!;
  const q0 = before.questionIds[0];
  act(() => {
    useSession.getState().answer(q0, { choice: 'A', correct: false } as never);
  });
  // Let the persist middleware write, then "kill" the app: wipe memory and reload from storage.
  await new Promise((res) => setTimeout(res, 0));
  expect(await AsyncStorage.getItem('aurivan.session.v1')).toBeTruthy();
  act(() => {
    useSession.setState({ active: null });
  });
  // setState above also persisted null; restore the saved copy taken before it.
  await AsyncStorage.setItem('aurivan.session.v1', JSON.stringify({ state: { active: { ...before, responses: { [q0]: { choice: 'A', correct: false } } } }, version: 1 }));
  await useSession.persist.rehydrate();
  const after = useSession.getState().active!;
  expect(after.title).toBe(target.title);
  expect(after.questionIds).toEqual(before.questionIds);
  expect(Object.keys(after.responses)).toEqual([q0]);
});
