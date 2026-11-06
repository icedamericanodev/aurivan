/**
 * Release bug hunt round 3: at 320 dp wide with 200% text, a mock question showed about 2 lines of
 * its stem and no option. The fixed parts now shrink there:
 * - the footer: Previous, Flag and Questions share ONE row as square icon buttons (same spoken
 *   names), and Next has its own row: 2 rows, not 4;
 * - the pinned first pace note has a short form at large text ("Checks at 25, 50, 75%").
 * At ordinary widths and text sizes the footer keeps its words on every button.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import SessionScreen, { FIRST_PACE_SHORT } from '../app/session';
import { IconButton } from '../components/ui';
import { startMock } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
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
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const w = Dimensions.get('window');
const setWindow = (width: number, fontScale: number) =>
  act(() => {
    Dimensions.set({ window: { ...w, width, height: 640, fontScale }, screen: { ...w, width, height: 640, fontScale } });
  });
beforeEach(() => {
  jest.useFakeTimers();
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', theme: 'light' });
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  startMock('cisa', 30);
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  setWindow(w.width, w.fontScale);
  useSession.getState().clear();
  jest.useRealTimers();
});
const mount = () =>
  act(() => {
    r = create(<SessionScreen />);
  });
const labelled = (label: string) => r!.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
/** The words drawn on screen (screen-reader labels are left out: the spoken pace note stays in full). */
const text = () => {
  const out: string[] = [];
  const walk = (n: unknown): void => {
    if (typeof n === 'string') out.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') walk((n as { children?: unknown }).children ?? null);
  };
  walk(r!.toJSON());
  return out.join(' | ');
};

it('320 wide at 200% text: Previous, Flag and Questions are one row of icon buttons; Next has its own', () => {
  setWindow(320, 2);
  mount();
  const icons = r!.root.findAllByType(IconButton).map((n) => n.props.label);
  expect(icons).toEqual(expect.arrayContaining(['Previous question', 'Flag question', 'Questions, question navigator']));
  // Their spoken names stay, and the words are not drawn as full-width buttons any more.
  expect(labelled('Flag question').length).toBeGreaterThan(0);
  expect(text().split(' | ')).not.toContain('Questions');
  expect(r!.root.findAll((n) => n.props.label === 'Next' && typeof n.props.onPress === 'function').length).toBeGreaterThan(0);
  // The pinned first pace note in its short form.
  expect(text()).toContain(FIRST_PACE_SHORT);
  expect(text()).not.toContain('Pace checks at 25, 50 and 75% of the time.');
  // Flag still works from the icon button.
  const qid = useSession.getState().active!.questionIds[0];
  act(() => {
    r!.root.findAllByType(IconButton).find((n) => n.props.label === 'Flag question')!.props.onPress();
  });
  expect(useSession.getState().active!.flagged).toContain(qid);
});

it('a normal phone at normal text keeps the words on every button and the full pace note', () => {
  setWindow(393, 1);
  mount();
  expect(r!.root.findAllByType(IconButton).map((n) => n.props.label)).not.toContain('Flag question');
  expect(text().split(' | ')).toContain('Questions');
  expect(text()).toContain('Pace checks at 25, 50 and 75% of the time.');
});
