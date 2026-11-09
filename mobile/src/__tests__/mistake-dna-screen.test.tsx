/** Mistake DNA journal integration: accessible evidence, retained notes and independent practice. */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { Dimensions } from 'react-native';
import { useSession } from '../store/session';
import { DAY_MS } from '../engine/srs';
import Mistakes from '../app/mistakes';
import { getAllQuestions } from '../content/loader';
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

const originalWindow = Dimensions.get('window');
let r: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  Dimensions.set({ window: originalWindow, screen: originalWindow });
});
const labels = () =>
  r!.root
    .findAll((x: ReactTestInstance) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string')
    .map((x) => x.props.accessibilityLabel as string);

/** `answered` answers (all right), plus 6 open mistakes tagged "Acted as the wrong person". */
function seed(answered: number, played: Record<string, number> = {}) {
  const qs = getAllQuestions('cisa');
  const answers: Record<string, { correct: number; wrong: number; lastCorrect: boolean; lastAt: number }> = {};
  for (const q of qs.slice(0, answered)) answers[q.id] = { correct: 1, wrong: 0, lastCorrect: true, lastAt: Date.now() };
  const mistakes: Record<string, { picked: string; at: number; slip: 'role'; resolved: boolean }> = {};
  for (const q of qs.slice(100, 106)) mistakes[q.id] = { picked: q.correct === 'A' ? 'B' : 'A', at: Date.now(), slip: 'role', resolved: false };
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa' });
  useProgress.setState({
    byCert: { cisa: { answers, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes, gameBest: played, gameRecent: {}, notesRead: [] } },
  } as never);
  act(() => {
    r = create(<Mistakes />);
  });
}


const text = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => typeof n === 'string' ? out.push(n) : n.children.forEach(walk);
  walk(r!.root);
  return out.join(' ');
};
const press = (label: string) => {
  const button = r!.root.findAll((x) => typeof x.props.onPress === 'function' && x.props.accessibilityLabel === label)[0];
  expect(button).toBeDefined();
  act(() => button.props.onPress());
};
it.each(['light', 'dark'] as const)('shows accessible evidence and real remediation in %s at large text', (theme) => {
  const w = Dimensions.get('window');
  Dimensions.set({ window: { ...w, width: 320, fontScale: 2 }, screen: { ...w, width: 320, fontScale: 2 } });
  seed(50);
  act(() => { useSettings.setState({ theme }); });
  expect(text()).toContain('Your Mistake DNA');
  expect(text()).toContain('Role confusion');
  expect(labels()).toContain('Drill it: Canopy Call');
  press('Explore pattern evidence');
  expect(text()).toContain('Thinking-pattern breakdown');
  expect(text()).toContain('6 of 6');
  expect(text()).toContain('Your tags');
  press('Drill it: Canopy Call');
  expect(router.push).toHaveBeenCalledWith('/game/canopy');
  act(() => { useSettings.setState({ theme: 'light' }); });
  Dimensions.set({ window: w, screen: w });
});
it('keeps a next action and study notes for corrected knowledge gaps', () => {
  seed(12);
  act(() => {
    const cp = selectCert(useProgress.getState(), 'cisa');
    useProgress.setState({ byCert: { cisa: { ...cp, mistakes: Object.fromEntries(Object.entries(cp.mistakes).map(([id, m]) => [id, { ...m, slip: 'knowledge', resolved: true }])) } } });
  });
  expect(text()).toContain('Concept needs review');
  expect(labels()).toContain('Practice other questions');
  expect(labels().some((x) => x.startsWith('Read the note:'))).toBe(true);
  press('Practice other questions');
  const session = useSession.getState().active!;
  expect(session.questionIds.length).toBeGreaterThan(0);
  const mistakes = selectCert(useProgress.getState(), 'cisa').mistakes;
  expect(session.questionIds.every((id: string) => !mistakes[id])).toBe(true);
  useSession.getState().clear();
});
it('handles certification reset and old-only evidence honestly', () => {
  seed(12);
  act(() => {
    const cp = selectCert(useProgress.getState(), 'cisa');
    useProgress.setState({ byCert: { cisa: { ...cp, mistakes: Object.fromEntries(Object.entries(cp.mistakes).map(([id, m]) => [id, { ...m, at: Date.now() - 29 * DAY_MS }])) } } });
  });
  expect(text()).toContain('Not enough evidence yet');
  expect(labels().some((l) => /^Drill it/.test(l))).toBe(false);
  act(() => { useProgress.getState().resetCert('cisa'); });
  expect(text()).toContain('0 classified');
  expect(text()).toContain('Nothing open right now');
});
