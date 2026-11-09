/** Synthetic, in-memory lab journeys: no existing tester save is read or mutated. */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, PanResponder, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import { router } from 'expo-router';
import LabCatalog from '../app/labs';
import LabDetail from '../app/labs/[id]';
import Learn from '../app/(tabs)/learn';
import NoteSubtopic from '../app/notes/subtopic/[id]';
import { LabRange } from '../components/conceptLab';
import { useSettings } from '../store/settings';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { redirectLegacyPath } from '../lib/legacyLinks';

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
const adjust = (recovery: number, gap: number) => { const ranges = r!.root.findAllByType(LabRange); act(() => { ranges[0].props.onChange(recovery); ranges[1].props.onChange(gap); }); };
beforeEach(() => { mockParams = { id: 'cisa-lab-rto-rpo' }; jest.clearAllMocks(); useSettings.setState({ activeCertId: 'cisa', theme: 'light', motion: 'reduced' }); });
afterEach(() => { act(() => { r?.unmount(); }); r = undefined; });

it('opens the catalog lab and leaves existing progress untouched through exploration and application', () => {
  const before = useProgress.getState();
  mount(<LabCatalog />); press('Open lab'); expect(router.push).toHaveBeenCalledWith('/labs/cisa-lab-rto-rpo');
  act(() => { r!.unmount(); }); mount(<LabDetail />);
  expect(text()).toContain('3:20 PM'); expect(text()).toContain('1:30 PM');
  press('Experiment with recovery'); adjust(121, 15); expect(text()).toContain('RTO missed');
  press('Apply your judgment');
  press('Report the missed RPO, verify the usable data, and recommend a fix and retest.');
  press('Check reasoning'); expect(text()).toContain('Management owns the risk');
  press('Read the related lesson'); expect(router.push).toHaveBeenCalledWith('/lesson/cisa-l-d4-rpo-rto');
  press('Open the recovery study note'); expect(router.push).toHaveBeenCalledWith('/notes/subtopic/4B1.2');
  expect(useProgress.getState()).toBe(before);
});
it.each([[120, 15, 'RTO met', 'RPO met'], [120, 16, 'RTO met', 'RPO missed'], [121, 15, 'RTO missed', 'RPO met'], [121, 16, 'RTO missed', 'RPO missed']])('evaluates %i minutes and %i data gap in the rendered result', (recovery, gap, rto, rpo) => {
  mount(<LabDetail />); press('Experiment with recovery'); adjust(recovery as number, gap as number);
  const results = r!.root.findAll(n => n.props.testID === 'lab-result')[0];
  expect(textOf(results)).toContain(rto); expect(textOf(results)).toContain(rpo);
});
it('reset returns both controls and prediction to initial state', () => {
  mount(<LabDetail />); press('Experiment with recovery'); adjust(180, 0); press('Both met'); press('Reveal outcome');
  expect(text()).toContain('Compare each limit'); press('Reset scenario');
  expect(r!.root.findAllByType(LabRange).map(n => n.props.value)).toEqual([80, 30]);
  expect(text()).not.toContain('Compare each limit');
});
it('adjustable actions and increment alternatives are bounded and labelled', () => {
  mount(<LabDetail />); press('Experiment with recovery');
  const slider = () => r!.root.findAll(n => n.props.accessibilityRole === 'adjustable' && n.props.accessibilityLabel === 'Actual recovery time')[0];
  expect(slider().props.accessibilityValue).toMatchObject({ min: 0, max: 180, now: 80 });
  act(() => { slider().props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }); });
  expect(slider().props.accessibilityValue.now).toBe(81); press('Show precise controls'); press('Decrease Actual recovery time'); expect(slider().props.accessibilityValue.now).toBe(80);
  adjust(0, 60); const decrease = r!.root.findAll(n => n.props.accessibilityLabel === 'Decrease Actual recovery time' && n.props.disabled === true); expect(decrease.length).toBeGreaterThan(0);
});
it.each([undefined, '%', 'missing', '__proto__'])('handles invalid or absent lab ID %s', id => { mockParams = { id }; mount(<LabDetail />); expect(text()).toContain('Lab not found'); press('Browse labs'); expect(router.replace).toHaveBeenCalledWith('/labs'); });
it('does not expose a CISA lab through another certification deep link', () => { useSettings.setState({ activeCertId: 'cism' }); mount(<LabDetail />); expect(text()).toContain('Lab not found'); act(() => { r!.unmount(); }); mount(<LabCatalog />); expect(text()).toContain('No labs for this exam yet'); });
it('preserves deep links without legacy redirection', () => { expect(redirectLegacyPath('kaisip://labs/cisa-lab-rto-rpo')).toBe('kaisip://labs/cisa-lab-rto-rpo'); });
it('Learn keeps four reference tiles, then lab and final week, followed by lessons', () => {
  mount(<Learn />);
  const ids = r!.root.findAll(n => typeof n.type === 'string' && typeof n.props.testID === 'string').map(n => n.props.testID);
  for (const key of ['notes', 'glossary', 'principles', 'guide']) expect(ids).toContain(`learn-tile-${key}`);
  expect(ids.indexOf('learn-concept-lab')).toBeGreaterThan(ids.indexOf('learn-tile-guide'));
  expect(ids.indexOf('learn-concept-lab')).toBeLessThan(ids.indexOf('learn-tile-week'));
  expect(text()).toContain('Lessons');
  press('Interactive Concept Lab. Change the variables. See what happens. Featured: Understand RTO versus RPO.'); expect(router.push).toHaveBeenCalledWith('/labs');
});
it('Learn hides unsupported labs without hiding other reference content', () => { useSettings.setState({ activeCertId: 'cism' }); mount(<Learn />); expect(text()).not.toContain('Interactive Concept Lab'); });
it('related note preserves primary practice and adds a contextual link', () => { mockParams = { id: '4B1.2' }; mount(<NoteSubtopic />); expect(text()).toContain('Practice this concept'); press('Explore in Concept Lab'); expect(router.push).toHaveBeenCalledWith('/labs/cisa-lab-rto-rpo'); });
it.each(['light', 'dark'] as const)('renders controls and all stages at 200%% text in %s with reduced motion', theme => {
  useSettings.setState({ theme, motion: 'reduced' }); const w = Dimensions.get('window'); act(() => { Dimensions.set({ window: { ...w, width: 360, fontScale: 2 }, screen: { ...w, width: 360, fontScale: 2 } }); });
  mount(<LabDetail />); press('Experiment with recovery'); expect(r!.root.findAllByType(LabRange)).toHaveLength(2); press('Apply your judgment'); expect(text()).toContain('Source references');
});
it.each(['Accept the exercise because service returned within the approved RTO.', 'Ask IT to increase the RPO so it matches the recovery exercise.'])('explains why the plausible action is insufficient: %s', option => {
  mount(<LabDetail />); press('3. Apply'); press(option); press('Check reasoning');
  expect(text()).toContain('Look at both objectives');
  expect(text()).toMatch(/RTO only|hides the exception/);
});
it('offers a verified optional practice set without requiring it for the lab', () => {
  mount(<LabDetail />); press('3. Apply');
  expect(text()).toContain('Practice recovery concepts');
  useSession.setState({ active: null }); const before = useProgress.getState();
  press('Practice recovery concepts');
  expect(useSession.getState().active?.questionIds).toEqual(['d4_074', 'd4_082']);
  expect(router.push).toHaveBeenCalledWith('/session');
  expect(useProgress.getState()).toBe(before);
  useSession.setState({ active: null });
});

it('keeps the experiment concise and reveals timelines only on request', () => {
  mount(<LabDetail />); press('Experiment with recovery');
  expect(text()).toContain('Target RTO: 120 minutes');
  expect(text()).not.toMatch(/successful backup job alone/i);
  expect(r!.root.findAll(n => n.props.testID === 'lab-service-marker')).toHaveLength(0);
  press('Show timeline and explanation');
  expect(text()).toContain('3:20 PM');
  expect(text()).toContain('1:30 PM');
  expect(text()).toMatch(/successful backup job alone/i);
});

it.each([180, 60])('preserves vertical scrolling on the %i-minute range while allowing intentional input', max => {
  const spy = jest.spyOn(PanResponder, 'create');
  const change = jest.fn();
  try {
    mount(<LabRange label="Gesture range" value={Math.round(max / 2)} max={max} onChange={change} />);
    const config = spy.mock.calls[0][0];
    const e = (x: number) => ({ nativeEvent: { locationX: x } }) as GestureResponderEvent;
    const g = (dx = 0, dy = 0) => ({ dx, dy }) as PanResponderGestureState;
    const layout = r!.root.findAll(n => typeof n.type === 'string' && typeof n.props.onLayout === 'function')[0];
    act(() => layout.props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
    expect(config.onStartShouldSetPanResponderCapture!(e(90), g())).toBe(false);
    expect(config.onStartShouldSetPanResponder!(e(90), g())).toBe(false);
    expect(change).not.toHaveBeenCalled(); // touch-down is not a value change
    expect(config.onMoveShouldSetPanResponderCapture!(e(90), g(2, 30))).toBe(false);
    expect(config.onMoveShouldSetPanResponderCapture!(e(90), g(100, 1))).toBe(false); // vertical intent stays locked
    const pressable = () => r!.root.findAll(n => n.props.testID === `lab-range-${max}` && typeof n.props.onPress === 'function')[0];
    act(() => pressable().props.onPress(e(90))); // even an uncancelled release after vertical motion is ignored
    expect(change).not.toHaveBeenCalled();
    config.onStartShouldSetPanResponderCapture!(e(150), g());
    expect(config.onMoveShouldSetPanResponderCapture!(e(150), g(3, 1))).toBe(false); // jitter is not a drag
    act(() => pressable().props.onPress(e(150)));
    expect(change).toHaveBeenLastCalledWith(max / 2); // deliberate tap
    expect(config.onMoveShouldSetPanResponderCapture!(e(225), g(25, 2))).toBe(true);
    act(() => config.onPanResponderGrant!(e(225), g(25, 2)));
    expect(change).toHaveBeenLastCalledWith(Math.round(max * 0.75));
    act(() => config.onPanResponderMove!(e(-20), g(-20, 0)));
    expect(change).toHaveBeenLastCalledWith(0);
    act(() => config.onPanResponderMove!(e(330), g(330, 0)));
    expect(change).toHaveBeenLastCalledWith(max);
  } finally { spy.mockRestore(); }
});

it('ignores a malformed tap rather than putting NaN into the scenario', () => {
  const change = jest.fn();
  mount(<LabRange label="Touch tap" value={80} max={180} onChange={change} />);
  const pressable = r!.root.findAll(n => n.props.testID === 'lab-range-180' && typeof n.props.onPress === 'function')[0];
  act(() => pressable.props.onPress({ nativeEvent: {} }));
  expect(change).not.toHaveBeenCalled();
});
