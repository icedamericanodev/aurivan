/**
 * Mobile 1.51 (Field Guide): a set remembers where each area stood when it began (ActiveSession.before),
 * so Results' growth plate (Fig. 6) can show this set's change honestly.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Results from '../app/results';
import { getAllQuestions } from '../content/loader';
import { finishSession } from '../lib/finishSession';
import { startFromIds } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';

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
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const labels = () =>
  r!.root.findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const d4 = getAllQuestions('cisa').filter((q) => q.domainId === '4');

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  act(() => {
    useSession.getState().clear();
  });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

it('a set keeps where each area stood as it began, and Results says the set’s growth in words and numbers', () => {
  // 40 earlier answers in IS Operations, 24 right (60%).
  act(() => {
    d4.slice(0, 40).forEach((q, i) => useProgress.getState().recordAnswer('cisa', q.id, i < 24, undefined, { at: Date.now() - 3 * 86_400_000 }));
  });
  const ids = d4.slice(40, 50).map((q) => q.id);
  act(() => {
    startFromIds('cisa', ids, 'Practice · IS Operations');
  });
  expect(useSession.getState().active!.before!['4']).toEqual([40, 60]);
  act(() => {
    for (const id of ids) {
      const q = d4.find((x) => x.id === id)!;
      useSession.getState().answer(id, { display: q.correct, correct: true, ms: 30_000 });
      useProgress.getState().recordAnswer('cisa', id, true);
    }
    finishSession();
  });
  act(() => {
    r = create(<Results />);
  });
  const t = textOf(r!.root);
  // 34 of 50 now: 68%, up 8 from 60.
  expect(t).toContain('IS Operations, new growth');
  expect(t).toContain('IS Operations grew 8 points in this set');
  expect(t).toContain('10 of 10 this set');
  expect(labels().some((l) => l.startsWith('IS Operations: Building, 68 percent on latest tries, below the 70 line, up 8 points in this set.'))).toBe(true);
  expect(t).not.toMatch(/\bpass\b|you'?re ready/i);
});
