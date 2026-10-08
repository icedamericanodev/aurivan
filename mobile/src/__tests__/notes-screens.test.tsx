/**
 * Study notes screens, rendered with react-test-renderer against the real
 * stores and a v2 fixture (the two gold-standard samples).
 *
 * - Every section of a subtopic renders, in light and dark, with the table
 *   both side by side and stacked (large text); a broken drawing is skipped.
 * - Notes home, a domain, and a subtopic render; "Mark as read" saves;
 *   "Practice this domain" starts a session; search finds a note.
 * - The Learn tab shows the Study notes row only when there are notes.
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { NoteBody } from '../components/notes';
import { clearNotesCache, findNote, getNotes } from '../content/notes';
import type { NoteSubtopic } from '../content/notes/types';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import NotesHome from '../app/notes';
import NotesDomain from '../app/notes/[domain]';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import Learn from '../app/(tabs)/learn';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withSpring: id,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
    FadeOut: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
// The notes pack: the v2 fixture (or empty, to test the hidden entry).
let mockNotesOn = true;
jest.mock('../content/generated', () => {
  const actual = jest.requireActual('../content/generated');
  const { buildNotesPack, emptyPack } = jest.requireActual('../../scripts/notes-pack.cjs');
  const pack = buildNotesPack(jest.requireActual('./fixtures/notes-v2.json')).pack;
  return {
    generatedPacks: actual.generatedPacks,
    generatedNotes: { cisa: () => (mockNotesOn ? pack : emptyPack('cisa')) },
  };
});

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
/** Every string rendered, joined (what a sighted learner can read). */
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => {
    if (typeof n === 'string') out.push(n);
    else n.children.forEach(walk);
  };
  walk(root());
  return out.join(' ');
};
const pressable = (label: string) =>
  root().findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
const press = (label: string) =>
  act(() => {
    pressable(label).props.onPress();
  });
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 390, fontScale }, screen: { ...w, width: 390, fontScale } });
  });
};

const note = (id: string) => findNote('cisa', id)!;
const SECTIONS = ['In one line', 'Why it matters', 'How it works', 'Compare', 'Example', 'How ISACA thinks', 'Exam traps', 'Key terms'];

beforeEach(() => {
  mockNotesOn = true;
  clearNotesCache();
  mockPush.mockClear();
  mockParams = {};
  setFontScale(1);
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light' });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('NoteBody: every section renders', () => {
  it.each(['light', 'dark'] as const)('4B1.2 and 1A1.1 in %s, in schema order', (theme) => {
    useSettings.setState({ theme });
    for (const id of ['4B1.2', '1A1.1']) {
      const n = note(id);
      mount(<NoteBody note={n} />);
      const text = allText();
      for (const s of SECTIONS) expect(text).toContain(s);
      // Fixed order: each heading appears after the one before it.
      const at = SECTIONS.map((s) => text.indexOf(s));
      expect([...at].sort((a, b) => a - b)).toEqual(at);
      expect(text).toContain(n.definition);
      expect(text).toContain(n.isacaRule);
      for (const t of n.examTraps) expect(text).toContain(t.trap);
      for (const k of n.keyTerms) expect(text).toContain(k.term);
      for (const col of n.compare!.columns) expect(text).toContain(col);
      act(() => {
        r!.unmount();
      });
      r = undefined;
    }
  });

  it('draws the illustration with its spoken description and caption (1A1.1)', () => {
    const n = note('1A1.1');
    mount(<NoteBody note={n} />);
    const ill = n.illustrations![0];
    const image = root().findAll((x) => x.props.accessibilityRole === 'image');
    expect(image.length).toBeGreaterThan(0);
    expect(image[0].props.accessibilityLabel).toBe(ill.label);
    expect(allText()).toContain('Illustration');
    expect(allText()).toContain(ill.caption!);
    expect(allText()).toContain('Analogy and memory aid');
  });

  it('stacks the compare table at large text, side by side otherwise', () => {
    const n = note('4B1.2');
    mount(<NoteBody note={n} />);
    expect(allText()).toContain('Scroll sideways to see every column.');
    act(() => {
      r!.unmount();
    });
    setFontScale(2);
    mount(<NoteBody note={n} />);
    expect(allText()).not.toContain('Scroll sideways');
    // One screen-reader stop per row, naming each column.
    const rows = root().findAll((x) => typeof x.props.accessibilityLabel === 'string' && x.props.accessibilityLabel.startsWith('Measured.'));
    expect(rows[0].props.accessibilityLabel).toContain('RPO: Backward from the disruption');
  });

  it('skips a drawing that cannot be parsed, without crashing', () => {
    const n = note('1A1.1');
    const broken: NoteSubtopic = { ...n, illustrations: [{ ...n.illustrations![0], svg: '<svg viewBox="0 0 1 1"><rect fill="x"' }] };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mount(<NoteBody note={broken} />);
    spy.mockRestore();
    expect(allText()).not.toContain('Illustration');
    expect(allText()).toContain('Example');
  });

  it('leaves out optional sections the note does not have', () => {
    const n = note('4B1.2');
    mount(<NoteBody note={{ ...n, compare: undefined, analogy: undefined, memoryAid: undefined }} />);
    const text = allText();
    expect(text).not.toContain('Compare');
    expect(text).not.toContain('Analogy');
    expect(text).not.toContain('Types');
  });
});

describe('screens', () => {
  it('notes home lists only domains with notes, with weight and read count', () => {
    mount(<NotesHome />);
    const text = allText();
    expect(text).toContain('Information System Auditing Process');
    expect(text).toContain('IS Operations & Business Resilience');
    expect(text).toContain('26% of the exam · 0 of 1 read');
    expect(text).not.toContain('Governance and Management of IT');
    press('Information System Auditing Process. 18 percent of the exam. 0 of 1 read.');
    expect(mockPush).toHaveBeenCalledWith('/notes/1');
  });

  it('notes home search finds a note and opens it', () => {
    mount(<NotesHome />);
    const input = root().findAll((n) => n.props.accessibilityLabel === 'Search the study notes' && n.props.onChangeText)[0];
    act(() => {
      input.props.onChangeText('payroll');
    });
    expect(allText()).toContain('Results');
    expect(allText()).toContain('ITAF: Standards, Guidelines, and Tools and Techniques');
    const hit = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('ITAF') && n.props.onPress)[0];
    act(() => {
      hit.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith('/notes/subtopic/1A1.1');
    act(() => {
      input.props.onChangeText('zzzz nothing');
    });
    expect(allText()).toContain('No matches');
  });

  it('domain screen: hero, parts, topic overview, can-do list, subtopic rows', () => {
    mockParams = { domain: '4' };
    mount(<NotesDomain />);
    const text = allText();
    expect(text).toContain('Domain 4 · 26% of the exam');
    expect(text).toContain(getNotes('cisa')!.domains.find((d) => d.id === '4')!.analogy);
    expect(text).toContain('Part B · Business Resilience');
    expect(text).not.toContain('Part A'); // Part A has no topics in the fixture
    expect(text).toContain('You should be able to');
    expect(text).toContain('Tell RPO from RTO in a scenario');
    press('Recovery Objectives: RPO, RTO, MTD and MBCO, not read yet');
    expect(mockPush).toHaveBeenCalledWith('/notes/subtopic/4B1.2');
    // The domain glossary folds open.
    expect(allText()).not.toContain('The longest outage the business can bear.');
    press('Domain key terms, 2 terms');
    expect(allText()).toContain('The longest outage the business can bear.');
  });

  it('subtopic screen: Mark as read saves and toggles; Practice starts a session', () => {
    mockParams = { id: '4B1.2' };
    mount(<NoteSubtopicScreen />);
    expect(allText()).toContain('Recovery Objectives: RPO, RTO, MTD and MBCO');
    press('Mark as read');
    expect(selectCert(useProgress.getState(), 'cisa').notesRead).toEqual(['4B1.2']);
    expect(pressable('Marked as read').props.accessibilityState).toMatchObject({ selected: true });
    press('Marked as read');
    expect(selectCert(useProgress.getState(), 'cisa').notesRead).toEqual([]);

    press('Practice this domain');
    const s = useSession.getState().active!;
    expect(s.title).toBe('IS Operations practice');
    expect(s.questionIds.every((q) => q.startsWith('d4_'))).toBe(true);
    expect(mockPush).toHaveBeenCalledWith('/session');
  });

  it('subtopic screen: an unknown id shows a friendly empty state', () => {
    mockParams = { id: '9Z9.9' };
    mount(<NoteSubtopicScreen />);
    expect(allText()).toContain('Note not found');
  });
});

describe('Learn: the Study notes entry', () => {
  it('shows with notes and opens the notes', () => {
    mount(<Learn />);
    expect(allText()).toContain('Study notes');
    press('Study notes, Every exam topic in plain English');
    expect(mockPush).toHaveBeenCalledWith('/notes');
  });

  it('hides itself while the notes pack is empty (v1 source)', () => {
    mockNotesOn = false;
    clearNotesCache();
    mount(<Learn />);
    expect(allText()).not.toContain('Study notes');
    expect(allText()).toContain('By domain'); // the lessons are still there
  });
});
