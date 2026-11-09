/**
 * Grove Phase 4, phone review round 3 (Sky's answers of 5 Nov 2026, design-notes/grove/phase4b/
 * p4-owner-answers.md):
 *  - O2: the read-only Glossary screen and its Learn tile;
 *  - O7: the Mindset strip on Practice, with the website's tips;
 *  - O8: the Weak spots drill row, the website's rule;
 *  - Review and saved: the missed and saved lines follow the learner's counts, as on the website.
 */
import { Dimensions } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import Learn from '../app/(tabs)/learn';
import Practice, { MindsetStrip, reviewLines } from '../app/(tabs)/practice';
import Glossary from '../app/glossary';
import { getAllQuestions } from '../content/loader';
import { mindsetTipsFor } from '../content/mindset';
import { getTerms } from '../content/terms';
import { glossaryGroups, letterOf, matchTerms } from '../engine/glossary';
import { createRng } from '../engine/random';
import { WEAK_DRILL, weakDrillLine, weakDrillPool, weakDrillRanked } from '../engine/weakSpots';
import { startWeakSpotsDrill, WEAK_DRILL_TITLE } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
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
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
const byTestId = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const labelled = (label: string) => root().findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
/** The window's width at normal text size (the test window starts at text scale 2). */
const setWidth = (width: number, fontScale = 1) => {
  const w = Dimensions.get('window');
  act(() => Dimensions.set({ window: { ...w, width, fontScale }, screen: { ...w, width, fontScale } }));
};

beforeEach(() => {
  mockParams = {};
  jest.mocked(router.push).mockClear();
  setWidth(393);
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true } });
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, practiceTimer: false });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

// ── O2: the Glossary ──────────────────────────────────────────────────
describe('the glossary list (engine/glossary.ts)', () => {
  const pack = {
    domains: {
      '1': [
        { id: 't1_1', term: 'Recovery time objective', short: 'RTO', meaning: 'How fast a service must be back.', note: '4B1.2' },
        { id: 't1_2', term: 'audit charter', meaning: 'The document that sets up internal audit.', note: '1' },
      ],
      '2': [{ id: 't2_1', term: '3-2-1 backup', meaning: 'Three copies, two media, one offsite.', note: '2' }],
    },
  };

  it('A to Z across every area, a forgiving search on the name, short form and meaning, and an area filter', () => {
    expect(matchTerms(pack, '', undefined).map((t) => t.id)).toEqual(['t2_1', 't1_2', 't1_1']);
    expect(matchTerms(pack, 'rto', undefined).map((t) => t.id)).toEqual(['t1_1']);
    expect(matchTerms(pack, 'offsite', undefined).map((t) => t.id)).toEqual(['t2_1']);
    expect(matchTerms(pack, '', '1').map((t) => t.domainId)).toEqual(['1', '1']);
    expect(matchTerms(pack, 'zzz', undefined)).toEqual([]);
    expect(matchTerms(null, '', undefined)).toEqual([]);
  });

  it('groups by first letter, "#" first for a digit, in order', () => {
    expect(letterOf('audit charter')).toBe('A');
    expect(letterOf('3-2-1 backup')).toBe('#');
    expect(glossaryGroups(matchTerms(pack, '', undefined)).map((g) => [g.letter, g.terms.length])).toEqual([
      ['#', 1],
      ['A', 1],
      ['R', 1],
    ]);
  });
});

describe('the Glossary screen (PHASE4.md 7.3 phone, O2)', () => {
  const total = Object.values(getTerms('cisa')!.domains).flat().length;
  const terms = () => byTestId('glossary-term');

  it('a display title, every term with its meaning in A to Z cards, and the area chips', () => {
    mount(<Glossary />);
    const t = textOf(root());
    expect(byTestId('page-title')[0].props.accessibilityLabel).toBe('Glossary');
    expect(terms()).toHaveLength(total);
    expect(byTestId('glossary-letter-A').length).toBe(1);
    expect(t).toContain('All');
    expect(t).toContain('IS Audit');
    // Never a count of the question bank; no learned mark this round.
    expect(t).not.toMatch(/Mastered|\d+ learned/);
  });

  it('search narrows the list and says how many match; Clear filters brings every term back', () => {
    mockParams = { q: 'RTO' };
    mount(<Glossary />);
    expect(terms().length).toBeGreaterThan(0);
    expect(terms().length).toBeLessThan(total);
    expect(textOf(root())).toMatch(/\d+ terms? match/);
    act(() => labelled('Clear filters')[0].props.onPress());
    expect(terms()).toHaveLength(total);
  });

  it('an area chip shows only that area’s terms', () => {
    mount(<Glossary />);
    const chip = root().findAll((n) => n.props.accessibilityLabel === 'IS Audit' && typeof n.props.onPress === 'function')[0];
    act(() => chip.props.onPress());
    expect(terms()).toHaveLength(getTerms('cisa')!.domains['1'].length);
  });

  it('"Read the note" opens the study note that teaches the term', () => {
    mount(<Glossary />);
    const read = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Read the note: ') && typeof n.props.onPress === 'function')[0];
    act(() => read.props.onPress());
    expect(router.push).toHaveBeenCalled();
    const arg = jest.mocked(router.push).mock.calls[0][0] as { pathname?: string } | string;
    const path = typeof arg === 'string' ? arg : arg.pathname;
    expect(['/notes/subtopic/[id]', '/notes/[domain]', '/notes']).toContain(path);
  });

  it('the plant figure: the quiet oak, hidden from screen readers; never with Show my plant off or on a narrow phone', () => {
    mount(<Glossary />);
    const fig = byTestId('glossary-plant');
    expect(fig).toHaveLength(1);
    expect(fig[0].props.importantForAccessibility).toBe('no-hide-descendants');
    act(() => r!.unmount());
    act(() => {
      useProgress.setState({ plantSettings: { promptHidden: true, showPlant: false } });
    });
    mount(<Glossary />);
    expect(byTestId('glossary-plant')).toHaveLength(0);
    act(() => r!.unmount());
    act(() => {
      useProgress.setState({ plantSettings: { promptHidden: true } });
    });
    setWidth(340);
    mount(<Glossary />);
    expect(byTestId('glossary-plant')).toHaveLength(0);
    // From text scale 1.3 it is not drawn either: decoration never pushes text.
    act(() => r!.unmount());
    setWidth(393, 1.3);
    mount(<Glossary />);
    expect(byTestId('glossary-plant')).toHaveLength(0);
  });

  it('Learn shows the Glossary tile after Study notes, and it opens the Glossary', () => {
    mount(<Learn />);
    const tiles = root()
      .findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('learn-tile-') && typeof n.type !== 'string')
      .map((n) => n.props.testID as string)
      .filter((id, i, all) => all.indexOf(id) === i);
    expect(tiles.slice(0, 3)).toEqual(['learn-tile-notes', 'learn-tile-glossary', 'learn-tile-principles']);
    const tile = root().findAll((n) => n.props.testID === 'learn-tile-glossary' && typeof n.props.onPress === 'function')[0];
    act(() => tile.props.onPress());
    expect(router.push).toHaveBeenCalledWith('/glossary');
  });
});

// ── O7: the Mindset strip ─────────────────────────────────────────────
describe('the Mindset strip (O7)', () => {
  it('CISA has the website’s tips, with no spaced hyphen and no em or en dash; another course has none', () => {
    const tips = mindsetTipsFor('cisa');
    expect(tips.length).toBeGreaterThan(0);
    expect(tips).toContain('When you see FIRST, eliminate any option that implements a solution.');
    for (const tip of tips) expect(tip).not.toMatch(/ - |—|–/);
    expect(mindsetTipsFor('no-such-course')).toEqual([]);
  });

  it('shows on Practice for CISA, one tip after "Mindset."', () => {
    mount(<Practice />);
    const strip = byTestId('mindset-strip');
    expect(strip).toHaveLength(1);
    expect(textOf(strip[0])).toContain('Mindset.');
  });

  it('round 4: a ">" in a tip is spoken as ", then" (never "greater than"); the visible tip is unchanged', () => {
    mount(<MindsetStrip tips={['A > B > C.']} />);
    const strip = byTestId('mindset-strip')[0];
    const labelled = strip.findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Mindset.'));
    expect(labelled[0].props.accessibilityLabel).toBe('Mindset. A, then B, then C.');
    expect(textOf(strip)).toContain('A > B > C.');
  });

  it('stays hidden when the course has no tips (never an empty card)', () => {
    mount(<MindsetStrip tips={[]} />);
    expect(byTestId('mindset-strip')).toHaveLength(0);
  });
});

// ── O8: the Weak spots drill ──────────────────────────────────────────
describe('the Weak spots drill (O8, the website rule)', () => {
  const dom = (domainId: string, answered: number, mastery: number) => ({ domainId, answered, mastery });

  it('ranks measured areas below Strong first (lowest first), then too few (least practised first), Strong last', () => {
    const ranked = weakDrillRanked([dom('1', 40, 0.85), dom('2', 10, 0.5), dom('3', 40, 0.6), dom('4', 2, 1), dom('5', 50, 0.72)]);
    expect(ranked.map((x) => x.domainId)).toEqual(['3', '5', '4', '2', '1']);
    expect(ranked.map((x) => x.tier)).toEqual([0, 0, 1, 1, 2]);
  });

  it('draws up to 7 from each of the top three areas, adds up to 5 open misses, never twice, at most 20', () => {
    const ranked = weakDrillRanked([dom('1', 0, 0), dom('2', 0, 0), dom('3', 0, 0), dom('4', 0, 0)]);
    const ids = (d: string) => Array.from({ length: 12 }, (_, i) => `d${d}_${i}`);
    const byDomain = { '1': ids('1'), '2': ids('2'), '3': ids('3'), '4': ids('4') };
    const pool = weakDrillPool(ranked, byDomain, ['d4_1', 'd4_2', 'd1_0'], createRng(7));
    expect(pool.length).toBeLessThanOrEqual(WEAK_DRILL.cap);
    expect(new Set(pool).size).toBe(pool.length);
    // Only areas 1 to 3, plus the misses from area 4.
    expect(pool.filter((id) => id.startsWith('d4_')).sort()).toEqual(['d4_1', 'd4_2']);
  });

  it('the row line names the areas (once anything is answered), else the general line', () => {
    const short = (id: string) => ({ '1': 'IS Audit', '3': 'IS Acquisition', '5': 'Info Protection' })[id] ?? id;
    const ranked = weakDrillRanked([dom('1', 40, 0.6), dom('3', 40, 0.5), dom('5', 40, 0.65)]);
    expect(weakDrillLine(ranked, short, true)).toBe('From IS Acquisition, IS Audit and Info Protection');
    expect(weakDrillLine(ranked, short, false)).toBe('From the domains you miss most');
  });

  it('starts a set called "Weak spots drill" from the bank', () => {
    const s = startWeakSpotsDrill('cisa');
    expect(s?.title).toBe(WEAK_DRILL_TITLE);
    expect(s!.questionIds.length).toBeGreaterThan(0);
    expect(s!.questionIds.length).toBeLessThanOrEqual(WEAK_DRILL.cap);
    const bank = new Set(getAllQuestions('cisa').map((q) => q.id));
    for (const id of s!.questionIds) expect(bank.has(id)).toBe(true);
  });

  it('Review and saved has the kit’s five rows, Weak spots drill second', () => {
    mount(<Practice />);
    const card = byTestId('practice-more')[0];
    const t = textOf(card);
    const order = ['All missed questions', 'Weak spots drill', 'All saved questions', 'Question bank', 'Build a set'].map((s) => t.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

// ── Review and saved: the learner's own counts ─────────────────────────
describe('Review and saved lines (the website rule)', () => {
  it('reviewLines: none and some', () => {
    expect(reviewLines(0, 0)).toEqual({ missed: 'None yet', saved: 'Save a question to find it here' });
    expect(reviewLines(3, 2)).toEqual({ missed: 'Each one you missed, to try again', saved: '2 saved' });
  });

  it('with 0 saved, then with 2 saved: the line and the spoken label follow the count', () => {
    mount(<Practice />);
    expect(labelled('All saved questions, Save a question to find it here')).not.toHaveLength(0);
    expect(labelled('All missed questions, None yet')).not.toHaveLength(0);
    act(() => r!.unmount());
    const [a, b] = getAllQuestions('cisa');
    act(() => {
      useProgress.getState().toggleBookmark('cisa', a.id);
      useProgress.getState().toggleBookmark('cisa', b.id);
    });
    mount(<Practice />);
    expect(textOf(byTestId('practice-more')[0])).toContain('2 saved');
    expect(labelled('All saved questions, 2 saved')).not.toHaveLength(0);
  });
});
