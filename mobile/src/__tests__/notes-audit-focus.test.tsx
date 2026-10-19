/**
 * "Auditing it" on the note page (mobile 1.29, source field `audit_focus`).
 *
 * Rendered against the REAL generated notes pack (built from
 * ../data/cisa_notes.json), so this also proves the pipeline carries the
 * field all the way to the screen:
 * - a pilot note (4B1.1) shows the section after the Example and right
 *   before "The IS auditor’s lens", with its three labelled parts, each one
 *   screen-reader stop, and a screen-reader heading;
 * - "Who decides" shows only when the note has it;
 * - a note without the field (4B1.2) shows nothing of it;
 * - at 200% text nothing is clipped (no line limits, text may grow to ×2).
 *
 * Gotcha (see session-screen.regression.test.tsx): never write
 * `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, Text } from 'react-native';
import { AuditFocus, NoteBody } from '../components/notes';
import { clearNotesCache, findNote } from '../content/notes';
import type { NoteSubtopic } from '../content/notes/types';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import NoteSubtopicScreen from '../app/notes/subtopic/[id]';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, dismissAll: jest.fn(), setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
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
/** The host views a screen reader stops on, by their spoken label. */
const stop = (label: string) => root().findAll((n) => typeof n.type === 'string' && n.props.accessible && n.props.accessibilityLabel === label);
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 390, fontScale }, screen: { ...w, width: 390, fontScale } });
  });
};
const note = (id: string) => findNote('cisa', id)!;

beforeEach(() => {
  clearNotesCache();
  mockParams = {};
  setFontScale(1);
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light' });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('"Auditing it" on a pilot note (4B1.1)', () => {
  it.each(['light', 'dark'] as const)('renders after the example and right before the lens, in %s', (theme) => {
    useSettings.setState({ theme });
    const n = note('4B1.1');
    const focus = n.auditFocus!;
    expect(focus).toBeDefined();
    mockParams = { id: '4B1.1' };
    mount(<NoteSubtopicScreen />);
    const text = allText();
    // Order: Example → Think like the IS auditor → Auditing it → the lens.
    const order = ['Example', n.example, 'Think like the IS auditor', 'Auditing it', 'What to review', 'Evidence to ask for', 'Typical recommendation', 'The IS auditor’s lens'];
    // Each one is searched for after the one before it ("On this page" names the movement earlier too).
    let from = 0;
    for (const s of order) {
      const i = text.indexOf(s, from);
      expect([s, i >= 0]).toEqual([s, true]);
      from = i + s.length;
    }
    for (const s of [...focus.review, ...focus.evidence, focus.recommend]) expect(text).toContain(s);
  });

  it('is a screen-reader heading, and each part is one stop that says its label first', () => {
    const focus = note('4B1.1').auditFocus!;
    mount(<NoteBody note={note('4B1.1')} />);
    const heading = root().findAll((n) => n.props.accessibilityRole === 'header' && n.props.children === 'Auditing it');
    expect(heading.length).toBeGreaterThan(0);
    expect(stop(`What to review: ${focus.review.join('. ')}.`)).toHaveLength(1);
    expect(stop(`Evidence to ask for: ${focus.evidence.join('. ')}.`)).toHaveLength(1);
    expect(stop(`Typical recommendation: ${focus.recommend}`)).toHaveLength(1);
    // Each part is also a header, so the VoiceOver rotor can jump between parts.
    for (const label of [`What to review: ${focus.review.join('. ')}.`, `Evidence to ask for: ${focus.evidence.join('. ')}.`, `Typical recommendation: ${focus.recommend}`]) {
      expect(stop(label)[0].props.accessibilityRole).toBe('header');
    }
  });

  it('survives 200% text: no line limits, and every line may grow to ×2', () => {
    setFontScale(2);
    mount(<AuditFocus focus={note('4B1.1').auditFocus!} />);
    const texts = root().findAllByType(Text);
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t.props.numberOfLines).toBeUndefined();
      expect(t.props.maxFontSizeMultiplier ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('bullet dots follow the text size (centred on the first line)', () => {
  const dotTops = () =>
    root()
      .findAll((n) => typeof n.type === 'string' && n.props.importantForAccessibility === 'no' && n.props.style?.width === 6)
      .map((n) => n.props.style.marginTop);
  it.each([
    [1, 9],
    [2, 21],
    [3, 21], // capped at body's ×2
  ])('at ×%s text the dot sits %spt down', (scale, top) => {
    setFontScale(scale);
    mount(<AuditFocus focus={note('4B1.1').auditFocus!} />);
    const tops = dotTops();
    expect(tops.length).toBeGreaterThan(0);
    for (const t of tops) expect(t).toBe(top);
  });
});

describe('"Who decides" (optional)', () => {
  const base = note('4B1.1').auditFocus!;
  it('shows its own labelled line after the recommendation when present', () => {
    const decides = 'Management accepts the residual risk or funds the fix';
    mount(<AuditFocus focus={{ ...base, decides }} />);
    const text = allText();
    expect(text.indexOf('Who decides')).toBeGreaterThan(text.indexOf('Typical recommendation'));
    expect(text).toContain(decides);
    expect(stop(`Who decides: ${decides}`)).toHaveLength(1);
    expect(stop(`Who decides: ${decides}`)[0].props.accessibilityRole).toBe('header');
  });
  it('is left out when absent', () => {
    const { decides: _absent, ...withoutDecides } = base;
    mount(<AuditFocus focus={withoutDecides} />);
    expect(allText()).not.toContain('Who decides');
  });
});

describe('a note without audit_focus (4B1.2)', () => {
  it('renders no "Auditing it" section at all, and the lens still opens its movement', () => {
    const n: NoteSubtopic = note('4B1.2');
    expect(n.auditFocus).toBeUndefined();
    mockParams = { id: '4B1.2' };
    mount(<NoteSubtopicScreen />);
    const text = allText();
    for (const s of ['Auditing it', 'What to review', 'Evidence to ask for', 'Typical recommendation', 'Who decides']) {
      expect(text).not.toContain(s);
    }
    expect(text).toContain('The IS auditor’s lens');
  });
});
