/** Mistake DNA journal integration: accessible evidence, retained notes and independent practice. */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { Dimensions, Modal } from 'react-native';
import { GAMES } from '../engine/games/registry';
import { FeatureInfo } from '../components/featureInfo';
import { useSession } from '../store/session';
import { DAY_MS } from '../engine/srs';
import Mistakes, { SLIPS, slipsFor } from '../app/mistakes';
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
  expect(text()).toContain('Your mistake patterns');
  // Mobile 2.2: the learner never sees "DNA" (it reads as a fixed trait).
  expect(text()).not.toMatch(/DNA/);
  expect(text()).toContain('Role confusion');
  expect(labels()).toContain(`Drill it: ${GAMES.canopy.name}`);
  press('Show details');
  expect(text()).toContain('Thinking-pattern breakdown');
  expect(text()).toContain('6 of 6');
  expect(text()).toContain('From your tags');
  press(`Drill it: ${GAMES.canopy.name}`);
  expect(router.push).toHaveBeenCalledWith('/game/canopy');
  act(() => { useSettings.setState({ theme: 'light' }); });
});
it('keeps a next action and study notes for corrected knowledge gaps', () => {
  seed(12);
  act(() => {
    const cp = selectCert(useProgress.getState(), 'cisa');
    useProgress.setState({ byCert: { cisa: { ...cp, mistakes: Object.fromEntries(Object.entries(cp.mistakes).map(([id, m]) => [id, { ...m, slip: 'knowledge', resolved: true }])) } } });
  });
  expect(text()).toContain('Concept needs review');
  expect(labels()).toContain('Practice other questions');
  expect(labels().some((x) => x.startsWith('Read a related study note:'))).toBe(true);
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
  // Mobile 2.2 (UX review): with no saved mistakes there is no pattern summary at all, only the empty state.
  expect(text()).not.toContain('Your mistake patterns');
  expect(labels()).not.toContain('Show details');
  expect(text()).toContain('Nothing open right now');
  expect(text()).not.toMatch(/\b0 open\b/);
});
it('uses one help entry for the whole journal, with a visible coaching cue', () => {
  seed(50);
  expect(r!.root.findAllByType(FeatureInfo)).toHaveLength(1);
  expect(text()).not.toContain('the bars do not add up to 100%');
  expect(text()).toContain('Ask who you are in the question');
  expect(text()).not.toContain('tagged by you');
  press('How mistake patterns work');
  expect(text()).toContain('the bars do not add up to 100%');
  expect(text()).toContain('once each has 5 mistakes with a pattern');
  press('Close, How mistake patterns work');
  expect(text()).not.toContain('the bars do not add up to 100%');
  press('How mistake patterns work');
  act(() => { r!.root.findAllByType(Modal).find((m) => m.props.visible)?.props.onRequestClose(); });
  expect(text()).not.toContain('the bars do not add up to 100%');
  press('Show details');
  expect(r!.root.findAllByType(FeatureInfo)).toHaveLength(1);
  expect(text()).toContain('6 with a pattern');
});
// Mobile 2.2 code review: the journal stays mounted under a practice session opened from it, so a clock
// frozen when the screen opened would leave out misses made in that session (the engine drops any miss
// dated after its clock). The clock must move with the saved mistakes.
it('counts misses made after the journal opened (the clock moves with the saved mistakes)', () => {
  jest.useFakeTimers({ now: new Date('2026-11-19T09:00:00Z') });
  try {
    seed(50);
    press('Show details');
    expect(text()).toContain('6 with a pattern');
    // An hour later, a practice session opened from the journal saves three more "role" misses.
    jest.setSystemTime(new Date('2026-11-19T10:00:00Z'));
    act(() => {
      const cp = selectCert(useProgress.getState(), 'cisa');
      const extra = Object.fromEntries(getAllQuestions('cisa').slice(200, 203).map((q) => [q.id, { picked: q.correct === 'A' ? 'B' : 'A', at: Date.now(), slip: 'role' as const, resolved: false }]));
      useProgress.setState({ byCert: { cisa: { ...cp, mistakes: { ...cp.mistakes, ...extra } } } } as never);
    });
    expect(text()).toContain('9 with a pattern');
  } finally {
    jest.useRealTimers();
  }
});

test('the slip tags name the qualifier in the course style (CISA unchanged)', () => {
  // Capitals (CISA, every course today): the same list, word for word.
  expect(slipsFor()).toBe(SLIPS);
  expect(SLIPS.find((x) => x.id === 'priority')!.label).toBe('Missed FIRST or BEST');
  // A lowercase course (The IIA's style): the words as its questions write them.
  expect(slipsFor('lowercase').find((x) => x.id === 'priority')!.label).toBe('Missed “first” or “best”');
  expect(slipsFor('lowercase').filter((x) => x.id !== 'priority')).toEqual(SLIPS.filter((x) => x.id !== 'priority'));
});
