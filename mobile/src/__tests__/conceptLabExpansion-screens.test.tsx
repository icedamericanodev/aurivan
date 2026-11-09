/** Synthetic, in-memory lab journeys: no existing tester save is read or mutated. */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import LabDetail from '../app/labs/[id]';
import { useSettings } from '../store/settings';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { findPrinciple } from '../content/principles';
import { expansionLabs } from '../content/labs/expansion';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => new Proxy({ __esModule: true, ICON_STROKE: 2 }, { get: (t, k) => k in t ? t[k as keyof typeof t] : () => null }));
let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() }, useFocusEffect: jest.fn(), useLocalSearchParams: () => mockParams }));
jest.mock('react-native-safe-area-context', () => { const { View } = jest.requireActual('react-native'); return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }; });
// Simulate an installed second certification without replacing any real content.
jest.mock('../lib/activeCert', () => ({ useActiveCertId: () => jest.requireActual('../store/settings').useSettings((s: { activeCertId: string }) => s.activeCertId) }));
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => { act(() => { r = create(el); }); };
const textOf = (node: ReactTestInstance) => { const out: string[] = []; const walk = (n: ReactTestInstance | string) => typeof n === 'string' ? out.push(n) : n.children.forEach(walk); walk(node); return out.join(' '); };
const text = () => textOf(r!.root);
const press = (label: string) => { const b = r!.root.findAll(n => typeof n.props.onPress === 'function' && (n.props.label === label || n.props.accessibilityLabel === label))[0]; if (!b) throw new Error(`Missing ${label}`); act(() => { b.props.onPress(); }); };
beforeEach(() => { mockParams = { id: 'cisa-lab-rto-rpo' }; jest.clearAllMocks(); useSettings.setState({ activeCertId: 'cisa', theme: 'light', motion: 'reduced' }); });
afterEach(() => { act(() => { r?.unmount(); }); r = undefined; });

const outcome = () => textOf(r!.root.findAll(n => n.props.testID === 'expansion-outcome')[0]);
function changeScenario(lab: (typeof expansionLabs)[number]) {
  switch (lab.interaction) {
    case 'role-permissions': {
      const { duties, people, initialAssignments } = lab.config;
      // Change the first duty to another person's responsibility.
      press(`${duties[0]}: ${people[initialAssignments[0]]}. Change assignment`);
      press(people[(initialAssignments[0] + 1) % people.length]);
      break;
    }
    case 'risk-allocation': press('Increase Available audit hours'); break;
    case 'authority-mapping': {
      const i = lab.config.decisions.findIndex((d, j) => d.expectedRole !== lab.config.initialAssignments[j]);
      const d = lab.config.decisions[i];
      press(`${d.label}: ${lab.config.roles[lab.config.initialAssignments[i]]}. Change assignment`);
      press(lab.config.roles[d.expectedRole]); break;
    }
    case 'control-workflow': press(`Disable ${lab.config.steps[3]}`); break;
    case 'dependency-simulation': press('Increase Recovery resource budget'); break;
  }
}

it.each(expansionLabs)('$id changes its scenario, preserves it across stages, and resets without changing learner progress', lab => {
  mockParams = { id: lab.id };
  const before = useProgress.getState(); const session = useSession.getState();
  mount(<LabDetail />); expect(text()).toContain(lab.title); press('2. Experiment');
  const initialText = text();
  changeScenario(lab); const changedText = text(); expect(changedText).not.toBe(initialText);
  const changedOutcome = outcome();
  press('3. Apply'); press('2. Experiment'); expect(outcome()).toBe(changedOutcome);
  press('Reset scenario'); expect(text()).toBe(initialText);
  expect(useProgress.getState()).toBe(before); expect(useSession.getState()).toBe(session);
});

it.each(expansionLabs)('$id provides specific correct and incorrect reasoning, retries, and verified study links', lab => {
  mockParams = { id: lab.id }; mount(<LabDetail />); press('3. Apply');
  const before = useProgress.getState();
  for (const index of [(lab.apply.correctIndex + 1) % lab.apply.options.length, lab.apply.correctIndex]) {
    press(lab.apply.options[index].text); press('Check reasoning');
    expect(text()).toContain(lab.apply.options[index].feedback);
    expect(text()).toContain(index === lab.apply.correctIndex ? 'Reasoning supported' : 'Review the evidence');
    press('Try the application again'); expect(text()).not.toContain(lab.apply.options[index].feedback);
  }
  press('Read the related lesson'); expect(router.push).toHaveBeenCalledWith(`/lesson/${lab.lessonId}`);
  press('Open the related study note'); expect(router.push).toHaveBeenCalledWith(`/notes/subtopic/${lab.noteId}`);
  for (const id of lab.principleIds ?? []) {
    press(`Read principle: ${findPrinciple(lab.certId, id)!.title}`); expect(router.push).toHaveBeenCalledWith(`/principles/${id}`);
  }
  if (lab.questionIds?.length) {
    useSession.setState({ active: null }); press('Practice this concept');
    expect(useSession.getState().active?.questionIds).toEqual(lab.questionIds);
    expect(router.push).toHaveBeenCalledWith('/session'); useSession.setState({ active: null });
  }
  expect(useProgress.getState()).toBe(before);
});

it.each(expansionLabs)('$id remains unavailable under another certification', lab => {
  mockParams = { id: lab.id }; useSettings.setState({ activeCertId: 'cism' }); mount(<LabDetail />);
  expect(text()).toContain('Lab not found');
});

it.each(['light', 'dark'] as const)('renders every expansion with 200%% font scale and reduced motion in %s', theme => {
  const dimensions = Dimensions.get('window');
  try {
    useSettings.setState({ theme, motion: 'reduced' });
    act(() => Dimensions.set({ window: { ...dimensions, width: 320, fontScale: 2 }, screen: { ...dimensions, width: 320, fontScale: 2 } }));
    for (const lab of expansionLabs) {
      mockParams = { id: lab.id }; mount(<LabDetail />);
      press('2. Experiment'); expect(outcome().length).toBeGreaterThan(20);
      press('3. Apply'); expect(text()).toContain('Source references');
      act(() => r!.unmount()); r = undefined;
    }
  } finally {
    act(() => Dimensions.set({ window: dimensions, screen: dimensions }));
  }
});

it('risk controls reach their allowed boundaries without producing invalid model values', () => {
  const lab = expansionLabs.find(l => l.interaction === 'risk-allocation')!;
  if (lab.interaction !== 'risk-allocation') throw new Error('Missing risk lab');
  mockParams = { id: lab.id }; mount(<LabDetail />); press('2. Experiment');
  const area = lab.config.areas[0]; press(`Adjust ${area.name} assumptions`);
  for (const direction of ['Increase', 'Decrease']) {
    const label = `${direction} ${area.name} control effectiveness`;
    for (let i = 0; i < 7; i++) {
      const control = r!.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
      if (!control.props.disabled) act(() => control.props.onPress());
    }
    expect(text()).toContain(`${area.name} control effectiveness: ${direction === 'Increase' ? 4 : 0}`);
  }
});

it('dependency controls keep at least one supporting system and explain the constraint', () => {
  const lab = expansionLabs.find(l => l.interaction === 'dependency-simulation')!;
  if (lab.interaction !== 'dependency-simulation') throw new Error('Missing dependency lab');
  mockParams = { id: lab.id }; mount(<LabDetail />); press('2. Experiment');
  const process = lab.config.processes[0];
  for (const system of process.dependencies) press(`✓ ${process.name} needs ${lab.config.systems[system].name}`);
  expect(text()).toMatch(/keep at least one/i);
  expect(outcome().length).toBeGreaterThan(20);
});
