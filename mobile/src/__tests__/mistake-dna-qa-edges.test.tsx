/** QA (PR #288): Mistake journal "Your mistake patterns" edge cases the smoke run did not cover. */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Dimensions, StyleSheet } from 'react-native';
import { DAY_MS } from '../engine/srs';
import { mistakeDNA } from '../engine/mistakeDNA';
import { runnerUp } from '../engine/tips';
import Mistakes from '../app/mistakes';
import { MistakeDNASummary } from '../components/mistakeDNA';
import { getAllQuestions } from '../content/loader';
import { BundledSource } from '../content/packs/bundled';
import { clearContentCaches, registerPackSource, type PackSource } from '../content/packs';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { dark, light } from '../theme/tokens';
import type { ThinkingSlip } from '../engine/slipCoach';

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
  useSettings.setState({ theme: 'light' });
});

type M = { picked?: string; at: number; slip?: ThinkingSlip; resolved?: boolean };
/** A wrong pick that is NOT the authored runner-up, so only the tag classifies the miss. */
const plainWrong = (q: { correct: string; tips: string[] }) => ['A', 'B', 'C', 'D'].find((l) => l !== q.correct && l !== runnerUp(q.tips, q.correct))!;
function rows(start: number, n: number, slip: ThinkingSlip | undefined, daysAgo = 1, extra: Partial<M> = {}, cert = 'cisa'): Record<string, M> {
  return Object.fromEntries(getAllQuestions(cert).slice(start, start + n).map((q) => [q.id, { picked: plainWrong(q), at: Date.now() - daysAgo * DAY_MS, slip, resolved: false, ...extra }]));
}
const cp = (mistakes: Record<string, M>) => ({ answers: {}, review: {}, bookmarks: [], mocks: [], lessonsDone: [], mistakes, gameBest: {}, gameRecent: {}, notesRead: [] });
function mount(mistakes: Record<string, M>, opts: { theme?: 'light' | 'dark'; cert?: string; others?: Record<string, Record<string, M>> } = {}) {
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: opts.cert ?? 'cisa', theme: opts.theme ?? 'light' });
  const byCert: Record<string, unknown> = { cisa: cp(mistakes) };
  for (const [k, v] of Object.entries(opts.others ?? {})) byCert[k] = cp(v);
  useProgress.setState({ byCert } as never);
  act(() => { r = create(<Mistakes />); });
}
const text = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(r!.root);
  return out.join(' | ');
};
const labels = () => r!.root.findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string').map((x) => x.props.accessibilityLabel as string);
const press = (label: string) => {
  const b = r!.root.findAll((x) => typeof x.props.onPress === 'function' && x.props.accessibilityLabel === label)[0];
  expect(b).toBeDefined();
  act(() => b.props.onPress());
};
const cardCount = () => r!.root.findAll((x) => x.props.accessibilityLabel === 'Tag why you slipped' || (typeof x.props.children === 'string' && /^(Fixed · )?\d/.test(x.props.children) && x.props.num)).length;
const stemsShown = () => getAllQuestions('cisa').filter((q) => text().includes(q.stem)).length;

describe('(a) dark theme', () => {
  it('summary, evidence and help draw with dark tokens only (no light-only colour leaks)', () => {
    const w = Dimensions.get('window');
    Dimensions.set({ window: { ...w, width: 320, fontScale: 2 }, screen: { ...w, width: 320, fontScale: 2 } });
    mount(rows(100, 6, 'role'), { theme: 'dark' });
    press('Show details');
    press('How mistake patterns work');
    const lightOnly = new Set(Object.values(light).filter((v) => !Object.values(dark).includes(v)).map((v) => String(v).toLowerCase()));
    const leaks: string[] = [];
    for (const n of r!.root.findAll((x) => !!x.props.style)) {
      const s = StyleSheet.flatten(n.props.style) as Record<string, unknown>;
      for (const k of ['color', 'backgroundColor', 'borderLeftColor', 'borderBottomColor', 'borderColor']) if (typeof s?.[k] === 'string' && lightOnly.has((s[k] as string).toLowerCase())) leaks.push(`${k}=${s[k]}`);
    }
    expect(leaks).toEqual([]);
  });
});

describe('(b) every mistake fixed', () => {
  it('summary + empty state + cleared list agree', () => {
    mount(rows(100, 6, 'role', 1, { resolved: true }));
    const t = text();
    expect(t).toContain('Your mistake patterns');
    expect(t).toContain('Role confusion');
    expect(t).toContain('Nothing open right now');
    expect(t).toContain('6 mistakes cleared so far');
    expect(t).not.toMatch(/Show \d+ fixed/);
    expect(t).not.toMatch(/\b0 open\b/);
    expect(labels()).not.toContain('Review these mistakes');
    expect(labels().some((l) => /^Practice (all|this|20)/.test(l))).toBe(false);
    press('See cleared mistakes');
    expect(text()).toContain('All mistakes');
    expect(text()).toContain('Hide fixed');
    expect(text()).not.toContain('Nothing open right now');
    expect(stemsShown()).toBe(6);
    // Learner then taps the chip: back to the empty state, never "0 open".
    const chip = r!.root.findAll((x) => x.props.label === 'Hide fixed' && typeof x.props.onPress === 'function')[0];
    act(() => chip.props.onPress());
    expect(text()).toContain('Nothing open right now');
    expect(text()).not.toMatch(/\b0 open\b/);
  });
});

describe('(c) threshold and ties', () => {
  it('4 classified: no lead; 5 classified: lead', () => {
    mount(rows(100, 4, 'role'));
    expect(text()).toContain('Not enough evidence yet');
    act(() => r!.unmount());
    mount(rows(100, 5, 'role'));
    expect(text()).toContain('A pattern worth reviewing');
    expect(text()).toContain('Role confusion');
  });
  it('4 classified + untagged/unclassified misses never reach the threshold', () => {
    mount({ ...rows(100, 4, 'role'), ...rows(110, 6, undefined) });
    expect(text()).toContain('Not enough evidence yet');
    press('Show details');
    expect(text()).toContain('4 with a pattern · 6 without one');
  });
  it('5 classified but no pattern with 3: no lead', () => {
    mount({ ...rows(100, 2, 'role'), ...rows(110, 2, 'symptom'), ...rows(120, 1, 'knowledge') });
    expect(text()).toContain('Not enough evidence yet');
  });
  it('a 3-3 tie says "One of your most common patterns" and lists both', () => {
    mount({ ...rows(100, 3, 'symptom'), ...rows(110, 3, 'role') });
    expect(text()).toContain('One of your most common patterns');
    expect(text()).toContain('Role confusion'); // PATTERN_ORDER: role before symptom
    expect(r!.root.findAll((x) => x.props.accessibilityLabel === 'One of your most common patterns: Role confusion').length).toBeGreaterThan(0);
    press('Show details');
    expect(text()).toContain('Symptom or root cause');
    expect((text().match(/3 of 6 · From your tags/g) ?? []).length).toBe(2);
  });
});

describe('(d) mistakes older than 28 days only', () => {
  it('shows no lead, and the cue does not ask to tag already-tagged mistakes', () => {
    mount(rows(100, 6, 'role', 29));
    expect(text()).toContain('Not enough evidence yet');
    expect(text()).toContain('6 open');
    press('Show details');
    expect(text()).toContain('0 with a pattern · 0 without one');
    // All 6 are tagged: telling the learner to "Tag a few mistakes" contradicts the list below.
    expect(text()).not.toContain('Tag a few mistakes to help reveal a pattern.');
  });
  it('exactly 28 days is still inside the window', () => {
    jest.useFakeTimers({ now: new Date('2026-11-19T09:00:00Z') });
    try {
      mount(rows(100, 6, 'role', 28));
      expect(text()).toContain('Role confusion');
    } finally { jest.useRealTimers(); }
  });
});

describe('(e) a mistake whose question left the pack', () => {
  it('section count and footer match the cards actually shown', () => {
    mount({ ...rows(100, 5, 'role'), d9_999: { picked: 'A', at: Date.now(), resolved: false } });
    expect(stemsShown()).toBe(5);
    expect(text()).toContain('Role confusion');
    expect(text()).toContain('5 open');
  });
  it('a journal holding only an unknown id: no dead "Practice this one"', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mount({ d9_999: { picked: 'A', at: Date.now(), resolved: false } });
    const t = text();
    const pressed = labels().includes('Practice your 1 open mistake');
    if (pressed) press('Practice your 1 open mistake');
    alert.mockRestore();
    expect({ section1open: /\b1 open\b/.test(t), stems: stemsShown(), footer: pressed, alert: alert.mock.calls.length }).toEqual({ section1open: false, stems: 0, footer: false, alert: 0 });
  });
});

describe('(f) switching certification and back', () => {
  it('each exam shows only its own mistakes; no state leaks', () => {
    // A second exam with content (CRISC descriptor, CISA questions renamed) via the pack registry.
    const src = getAllQuestions('cisa').slice(0, 300).map((q) => ({ ...q, id: `x${q.id}`, certId: 'crisc', domainId: String(Math.min(4, Number(q.domainId))) }));
    const fake: PackSource = {
      name: 'qa', certIds: () => ['crisc'], info: (id) => (id === 'crisc' ? { certId: 'crisc', rev: 9e9, schemaVersion: 1 } : null),
      domainIds: (id) => (id === 'crisc' ? ['1', '2', '3', '4'] : []), questions: (id, d) => (id === 'crisc' ? src.filter((q) => q.domainId === d) : null),
      notes: () => null, principles: () => null, exam: () => null, lessons: () => null, gameDeck: () => null,
    };
    void BundledSource;
    const undo = registerPackSource(fake);
    try {
      const crisc = Object.fromEntries(src.slice(0, 3).map((q) => [q.id, { picked: plainWrong(q), at: Date.now(), slip: 'symptom' as const, resolved: true }]));
      mount({ ...rows(100, 6, 'role'), ...rows(110, 2, 'role', 1, { resolved: true }) }, { others: { crisc } });
      expect(text()).toContain('Role confusion');
      act(() => r!.root.findAll((x) => x.props.label === 'Show 2 fixed' && typeof x.props.onPress === 'function')[0].props.onPress());
      act(() => { useSettings.setState({ activeCertId: 'crisc' }); });
      const t = text();
      expect(t).not.toContain('Role confusion');
      expect(t).toContain('Not enough evidence yet');
      // showFixed survived the switch? Then CRISC shows its 3 fixed as "All mistakes" instead of the empty state.
      const crisisState = { allMistakes: t.includes('All mistakes'), empty: t.includes('Nothing open right now') };
      act(() => { useSettings.setState({ activeCertId: 'cisa' }); });
      expect(text()).toContain('Role confusion');
      expect(crisisState).toEqual({ allMistakes: false, empty: true });
    } finally {
      undo();
      clearContentCaches();
    }
  });
});

describe('(g) 200% text at 320pt', () => {
  it('summary text is never truncated or capped below 1.5x', () => {
    const w = Dimensions.get('window');
    Dimensions.set({ window: { ...w, width: 320, fontScale: 2 }, screen: { ...w, width: 320, fontScale: 2 } });
    mount(rows(100, 6, 'role'));
    press('Show details');
    const summary = r!.root.findByType(MistakeDNASummary);
    const texts = summary.findAll((x) => (x.type as unknown) === 'Text');
    expect(texts.filter((x) => x.props.numberOfLines).map((x) => x.props.children)).toEqual([]);
    const capped = texts.filter((x) => typeof x.props.maxFontSizeMultiplier === 'number' && x.props.maxFontSizeMultiplier < 1.5).map((x) => [x.props.children, x.props.maxFontSizeMultiplier]);
    expect(capped).toEqual([]);
  });
});
void cardCount;

// Second qualifier review (28 Nov 2026): the help sheet quotes a lowercase course's words, so
// "a word like first or best" never reads as an order. CISA (capitals) keeps its copy.
describe('(z) the help sheet names the qualifier in the course style', () => {
  const helpText = (qualifierCase?: 'lowercase') => {
    useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, theme: 'light' });
    act(() => { r = create(<MistakeDNASummary dna={mistakeDNA([], 'cisa', Date.now())} qualifierCase={qualifierCase} />); });
    press('How mistake patterns work');
    return text();
  };
  it('capitals: "a word like FIRST or BEST"', () => {
    expect(helpText()).toContain('the question had a word like FIRST or BEST.');
  });
  it('lowercase: "a word like “first” or “best”"', () => {
    const t = helpText('lowercase');
    expect(t).toContain('the question had a word like “first” or “best”.');
    expect(t).toContain('Identify “first”, “best” or “most”');
  });
});
