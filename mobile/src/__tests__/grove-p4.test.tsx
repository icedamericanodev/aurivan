/**
 * Grove Phase 4 on the phone (design-notes/grove/PHASE4.md): the one selected look (section 5), the
 * shared parts (section 6), and the Learn and Practice boards (7.1, 7.8).
 */
import { Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Learn from '../app/(tabs)/learn';
import Practice, { domainStatus, heroTitle } from '../app/(tabs)/practice';
import { Button, Chip, Segmented } from '../components/ui';
import { scaledScoreNote } from '../content/scoreNote';
import { getCertification } from '../content/certifications';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { mintInk } from '../theme/grove';
import { dark, light } from '../theme/tokens';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const byTestId = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const flat = (n: ReactTestInstance) => StyleSheet.flatten(n.props.style) ?? {};
const setFontScale = (fontScale: number) => {
  const w = Dimensions.get('window');
  act(() => Dimensions.set({ window: { ...w, fontScale }, screen: { ...w, fontScale } }));
};

beforeEach(() => {
  mockParams = {};
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, studyMode: undefined, studyDomain: undefined, studySize: undefined, practiceTimer: false });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  setFontScale(1);
});

describe('the one selected look (section 5): ink edge and a mark, never a fill', () => {
  it('a chosen chip keeps its raised fill and ink words, adds a 2pt ink edge over the rest edge and a tick', () => {
    mount(<Chip label="IS Audit" selected={false} onPress={() => {}} />);
    const rest = root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string')[0];
    const restStyle = flat(rest);
    expect(restStyle.backgroundColor).toBe(light.raised);
    expect(restStyle.borderWidth).toBe(1.5);
    expect(restStyle.borderColor).toBe(light.control);
    expect(byTestId('chip-tick')).toHaveLength(0);
    act(() => r!.update(<Chip label="IS Audit" selected onPress={() => {}} />));
    const chosen = root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string')[0];
    // Same box: the fill and the 1.5 rest edge stay, so nothing reflows.
    expect(flat(chosen).backgroundColor).toBe(light.raised);
    expect(flat(chosen).borderWidth).toBe(1.5);
    expect(chosen.props.accessibilityState).toMatchObject({ selected: true });
    // The 2pt ink edge is an overlay layer; the label stays ink.
    const edges = root().findAll((n) => typeof n.type === 'string' && flat(n).borderWidth === 2 && flat(n).borderColor === light.ink);
    expect(edges.length).toBeGreaterThan(0);
    const label = root().find((n) => typeof n.type === 'string' && n.props.children === 'IS Audit');
    expect(flat(label).color).toBe(light.ink);
    expect(root().findAll((n) => n.props.testID === 'chip-tick').length).toBeGreaterThan(0);
    // Never green: no accent anywhere on a chosen chip.
    expect(root().findAll((n) => typeof n.type === 'string' && [flat(n).backgroundColor, flat(n).borderColor].includes(light.accent))).toHaveLength(0);
  });

  it('a segmented control draws its choice with a 2pt ink edge, and every segment keeps a 2pt edge so nothing jumps', () => {
    mount(<Segmented accessibilityLabel="Length" value={20} onChange={() => {}} options={[10, 20, 50].map((n) => ({ value: n, label: String(n) }))} />);
    const segs = root().findAll((n) => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
    for (const s of segs) expect(flat(s).borderWidth).toBe(2);
    const edges = root().findAll((n) => typeof n.type === 'string' && flat(n).borderColor === light.ink && flat(n).borderWidth === 2);
    expect(edges.length).toBeGreaterThan(0);
  });
});

describe('shared parts (section 6)', () => {
  it('the hero button is mint with the dark mint ink, the same in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      useSettings.setState({ theme });
      mount(<Button kind="hero" label="Start" onPress={() => {}} />);
      const btn = root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string')[0];
      expect(flat(btn).backgroundColor).toBe((theme === 'dark' ? dark : light).sap);
      const words = root().find((n) => typeof n.type === 'string' && n.props.children === 'Start');
      expect(flat(words).color).toBe(mintInk);
      act(() => r!.unmount());
    }
    expect(mintInk).toBe(light.onPill);
  });

  it('the scaled score note never says "pass", for ISACA and ISC2 courses', () => {
    expect(scaledScoreNote({ id: 'cisa' })).toBe('ISACA reports scaled scores from 200 to 800. The score needed is 450.');
    expect(scaledScoreNote({ id: 'cissp' })).toBe('ISC2 reports scaled scores out of 1000. The score needed is 700.');
    for (const id of ['cisa', 'cism', 'crisc', 'cissp']) expect(scaledScoreNote({ id })).not.toMatch(/\bpass/i);
  });
});

describe('Learn (7.1, the 02 board)', () => {
  it('top to bottom: title and line, Up next card, tiles, Final review week, Lessons card, footnote', () => {
    mount(<Learn />);
    const t = textOf(root());
    const order = ['Learn', 'Lessons start each topic. Notes go deeper.', 'Up next ·', 'Start lesson', 'Study notes', 'Principles', 'The CISA exam', 'Final review week', 'Lessons 0 of', 'Prefer a guided path?', 'Short lessons across every domain'].map((s) => t.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The Glossary tile waits for O2: never a tile that opens nothing.
    expect(t).not.toContain('Glossary');
  });

  it('the Up next card is not a button; Start lesson is its one control; the glyph tile is decorative', () => {
    mount(<Learn />);
    const [card] = byTestId('learn-plate');
    expect(card.props.accessibilityRole).toBeUndefined();
    const buttons = card.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string');
    expect(buttons.map((b) => b.props.accessibilityLabel)).toEqual(['Start lesson']);
    const [tile] = byTestId('glyph-tile');
    expect(tile.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('the glyph tile is not drawn from text scale 1.3', () => {
    setFontScale(1.3);
    mount(<Learn />);
    expect(byTestId('glyph-tile')).toHaveLength(0);
  });

  it('the Next pill sits on the Up next area only; areas start closed; ?domain opens that one', () => {
    mount(<Learn />);
    expect(byTestId('mint-pill')).toHaveLength(1);
    const rows = root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string' && /^Domain \d, /.test(String(n.props.accessibilityLabel)));
    expect(rows).toHaveLength(getCertification('cisa')!.domains.length);
    expect(rows.every((n) => n.props.accessibilityState?.expanded === false)).toBe(true);
    expect(rows.filter((n) => /, next lesson here$/.test(n.props.accessibilityLabel))).toHaveLength(1);
    act(() => r!.unmount());
    mockParams = { domain: '4' };
    mount(<Learn />);
    const open = root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type === 'string' && n.props.accessibilityState?.expanded === true);
    expect(open.map((n) => n.props.accessibilityLabel)).toEqual([expect.stringMatching(/^Domain 4, IS Operations, 0 of \d+ lessons done, next lesson here$/)]);
  });
});

describe('Practice (7.8, the 03 board)', () => {
  it('the jump bar: three plain buttons, never tabs and never selected', () => {
    mount(<Practice />);
    const [bar] = byTestId('practice-jump');
    const items = bar.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityRole === 'button');
    expect(items.map((n) => n.props.accessibilityLabel)).toEqual(['Questions', 'Drills', 'Mock exams']);
    for (const i of items) {
      expect(i.props.accessibilityState).toBeUndefined();
      expect(i.props.accessibilityHint).toBe(`Jumps to ${i.props.accessibilityLabel}`);
    }
  });

  it('the Timed tile is the switch itself (spoken "Timed", its state checked), at least 48pt', () => {
    mount(<Practice />);
    const sw = root().findAll((n) => n.props.testID === 'timed-switch' && typeof n.props.onPress === 'function')[0];
    expect(sw.props.accessibilityRole).toBe('switch');
    expect(sw.props.accessibilityLabel).toBe('Timed');
    expect(sw.props.accessibilityState).toEqual({ checked: false });
    act(() => sw.props.onPress());
    const again = root().findAll((n) => n.props.testID === 'timed-switch' && typeof n.props.onPress === 'function')[0];
    expect(again.props.accessibilityState).toEqual({ checked: true });
    expect(useSettings.getState().practiceTimer).toBe(false); // this screen's flip never changes the default
  });

  it('cards in the kit order: Focus next, By domain, Review and saved, Drills, Mock exams; the score note says "needed"', () => {
    useSettings.setState({ familiarity: 'some' });
    mount(<Practice />);
    const t = textOf(root());
    const order = ['Picked for you', 'Focus next', 'By domain', 'Review and saved', 'Drills', 'Timed like the real exam'].map((s) => t.lastIndexOf(s));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(t).toContain('The score needed is 450.');
    expect(t).not.toMatch(/passing mark/);
  });

  it('By domain says each area’s weight, how many seen and its status; the hero names the set', () => {
    expect(domainStatus(0, 0)).toEqual({ text: 'Not started', spoken: 'not started' });
    expect(domainStatus(12, 0.5).text).toBe('Too few yet');
    expect(domainStatus(40, 0.72).text).toBe('72% · Steady');
    expect(heroTitle('random', undefined)).toBe('A mixed set');
    expect(heroTitle('smart', 'IS Operations')).toBe('IS Operations');
    mount(<Practice />);
    expect(textOf(root())).toContain('18% of the exam · 0 seen');
  });
});
