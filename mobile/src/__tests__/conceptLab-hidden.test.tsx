/**
 * Mobile 2.2: the Concept Lab is HIDDEN from learners (owner decision, 19 Nov 2026; the one switch is
 * CONCEPT_LAB_ENABLED in content/labs/enabled.ts). With the switch off:
 * - Learn draws no lab tile, and a study note draws no "Explore in Concept Lab" link;
 * - nothing shown or spoken (labels, hints) on those screens names the lab;
 * - the /labs and /labs/<id> screens show nothing and open Learn (old links never crash);
 * - the rest of Learn and the note (the reference tiles, "Practice this concept") is untouched.
 * The lab itself is still tested, with the switch forced on, in conceptLab*.test.ts(x).
 * Synthetic, in-memory only: no saved learner data is read or changed (the lab never saved any).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import LabCatalog from '../app/labs';
import LabDetail from '../app/labs/[id]';
import Learn from '../app/(tabs)/learn';
import NoteSubtopic from '../app/notes/subtopic/[id]';
import { CONCEPT_LAB_ENABLED, findLab, labForNote, labsFor } from '../content/labs';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

// Forced OFF here, so this file keeps proving the hidden behaviour even after the lab is switched back on.
jest.mock('../content/labs/enabled', () => ({ CONCEPT_LAB_ENABLED: false }));
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => new Proxy({ __esModule: true, ICON_STROKE: 2 }, { get: (t, k) => (k in t ? t[k as keyof typeof t] : () => null) }));
let mockParams: Record<string, string | undefined> = {};
let mockCanDismiss = false;
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true, canDismiss: () => mockCanDismiss, setParams: jest.fn() },
  // Focus = mounted, as on a phone once the router has placed the screen.
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/activeCert', () => ({ useActiveCertId: () => jest.requireActual('../store/settings').useSettings((s: { activeCertId: string }) => s.activeCertId) }));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
/** Every word drawn on screen. */
const text = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' ');
};
/** Every word a screen reader could say: the labels and hints of everything on screen. */
const spoken = () =>
  r!.root
    .findAll(() => true)
    .flatMap((n) => [n.props.accessibilityLabel, n.props.accessibilityHint, n.props.label, n.props.spoken, n.props.hint])
    .filter((v): v is string => typeof v === 'string')
    .join(' ');
const testIds = () => r!.root.findAll((n) => typeof n.type === 'string' && typeof n.props.testID === 'string').map((n) => n.props.testID as string);
const LAB_WORDS = /concept lab|\/labs/i;

beforeEach(() => {
  mockParams = { id: 'cisa-lab-rto-rpo' };
  mockCanDismiss = false;
  jest.clearAllMocks();
  useSettings.setState({ activeCertId: 'cisa', theme: 'light', motion: 'reduced' });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

it('ships hidden in mobile 2.2 (owner decision, 19 Nov 2026)', () => {
  // The real file, not this test's stand-in. When the lab comes back (after its redesign and learner
  // testing), change the switch to true AND this line to toBe(true), in the same change.
  expect(jest.requireActual('../content/labs/enabled').CONCEPT_LAB_ENABLED).toBe(false);
});

it('with the switch off, no screen can find a lab', () => {
  expect(CONCEPT_LAB_ENABLED).toBe(false);
  expect(labsFor('cisa')).toEqual([]);
  expect(findLab('cisa', 'cisa-lab-rto-rpo')).toBeUndefined();
  expect(labForNote('cisa', '4B1.2')).toBeUndefined();
});

it('Learn draws no lab tile and says nothing about the lab; its other tiles stay', () => {
  mount(<Learn />);
  const ids = testIds();
  expect(ids).not.toContain('learn-concept-lab');
  for (const key of ['notes', 'glossary', 'principles', 'guide']) expect(ids).toContain(`learn-tile-${key}`);
  expect(text()).toContain('Lessons');
  expect(text()).not.toMatch(LAB_WORDS);
  expect(spoken()).not.toMatch(LAB_WORDS);
  // Nothing on Learn opens a lab screen.
  const pressables = r!.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.disabled !== true);
  expect(pressables.filter((n) => LAB_WORDS.test(`${n.props.accessibilityLabel ?? ''} ${n.props.accessibilityHint ?? ''}`))).toHaveLength(0);
});

it('the related study note keeps "Practice this concept" and has no lab link', () => {
  mockParams = { id: '4B1.2' };
  mount(<NoteSubtopic />);
  expect(text()).toContain('Practice this concept');
  expect(text()).not.toMatch(LAB_WORDS);
  expect(spoken()).not.toMatch(LAB_WORDS);
});

describe.each([
  ['/labs', () => <LabCatalog />],
  ['/labs/cisa-lab-rto-rpo', () => <LabDetail />],
])('the old %s screen', (_path, screen) => {
  it('shows nothing of the lab and opens Learn (a cold link: nothing under it, so a replace)', () => {
    const before = useProgress.getState();
    mount(screen());
    expect(testIds()).toEqual(['concept-lab-hidden']);
    expect(text()).toBe('');
    expect(spoken()).toBe('');
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/learn');
    expect(router.push).not.toHaveBeenCalled();
    // No saved progress is read into a new shape or changed by the redirect.
    expect(useProgress.getState()).toBe(before);
  });

  it('goes back to the Learn tab already under it, never a second set of tabs', () => {
    mockCanDismiss = true;
    mount(screen());
    expect(router.dismissTo).toHaveBeenCalledTimes(1);
    expect(router.dismissTo).toHaveBeenCalledWith('/learn');
    expect(router.replace).not.toHaveBeenCalled();
  });
});

it.each([undefined, '%', 'missing', '__proto__'])('a broken lab link (%s) opens Learn too, without a crash', (id) => {
  mockParams = { id };
  mount(<LabDetail />);
  expect(testIds()).toEqual(['concept-lab-hidden']);
  expect(router.replace).toHaveBeenCalledWith('/learn');
});

it('another exam is the same: no tile, and the old screens open Learn', () => {
  useSettings.setState({ activeCertId: 'cism' });
  mount(<LabCatalog />);
  expect(testIds()).toEqual(['concept-lab-hidden']);
  expect(router.replace).toHaveBeenCalledWith('/learn');
});
