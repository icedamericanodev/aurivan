/**
 * Mobile 1.43, the study note page (board 4, quick wins only; no sticky tracker):
 *  - the kicker names the domain and topic in words, no code (the code stays in the source row);
 *  - "The letters in the title" plate, from the note's own text, each pair one stop;
 *  - "In one line" comes before the lesson row, and "On this page" still names the parts.
 */
import { Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';
import { AcronymPlate } from '../components/notes';
import { useProgress } from '../store/progress';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const allText = () => textOf(root());
const open = (id: string) => {
  mockParams = { id };
  act(() => {
    r = create(<NoteSubtopicScreen />);
  });
};

beforeEach(() => useProgress.getState().resetCert('cisa'));
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('the note page top', () => {
  it('words, not codes, in the kicker; the code stays in the source row', () => {
    open('4B1.2');
    const t = allText();
    expect(t).toContain('IS Operations · Business Impact Analysis');
    expect(t).not.toMatch(/IS Operations · 4B1/);
    expect(t).toContain('Code 4B1.2');
  });

  it('the plate spells out the title’s letters, each pair one stop, before "In one line", then the lesson, then the parts', () => {
    open('4B1.2');
    expect(root().findAllByType(AcronymPlate)).toHaveLength(1);
    const pairs = root().findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && /^(RPO|RTO|MTD|MBCO), /.test(n.props.accessibilityLabel));
    expect(pairs.map((n) => n.props.accessibilityLabel)).toEqual([
      'RPO, Recovery point objective',
      'RTO, Recovery time objective',
      'MTD, Maximum tolerable downtime',
      'MBCO, Minimum business continuity objective',
    ]);
    const t = allText();
    const at = (s: string) => t.indexOf(s);
    expect(at('The letters in the title')).toBeLessThan(at('In one line'));
    expect(at('In one line')).toBeLessThan(at('Lesson · '));
    expect(at('Lesson · ')).toBeLessThan(at('Think like the IS auditor'));
  });

  it('a title with no acronyms has no plate', () => {
    open('1A1.3');
    expect(root().findAllByType(AcronymPlate)).toHaveLength(0);
  });

  it('at ×1.3 text each acronym sits over its meaning', () => {
    const w = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...w, fontScale: 1.3 }, screen: { ...w, fontScale: 1.3 } }));
    try {
      act(() => {
        r = create(<AcronymPlate items={[{ term: 'RPO', expansion: 'Recovery point objective' }]} />);
      });
      const pair = root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'RPO, Recovery point objective')[0];
      expect(StyleSheet.flatten(pair.props.style).flexDirection).toBe('column');
    } finally {
      act(() => Dimensions.set({ window: { ...w, fontScale: w.fontScale }, screen: { ...w, fontScale: w.fontScale } }));
    }
  });
});
