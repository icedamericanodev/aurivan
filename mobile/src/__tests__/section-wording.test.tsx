/**
 * The last "Domain" wording (docs/content/CIA_BANK_PLAN.md section 11, "Still Domain for every
 * course after batch 1"): a course whose `domainStyle` is { noun: 'Section', numbering: 'letter' }
 * must read "Section A", "All sections", "this section" everywhere a learner looks or listens.
 *
 * The hard rule: CISA (and every course without a `domainStyle`) reads word for word as before.
 * So each test here says the CISA string first, exactly, and then the sectioned one.
 *
 * Two kinds of test:
 *   1. The pure helpers and the functions that build a line (no screen needed).
 *   2. Whole screens, drawn twice: as CISA, then as the same course with sections switched on.
 *      Every string the app itself writes that says "domain" for CISA is listed word for word,
 *      and with sections on, none of them is left.
 *
 * The fake course is made up ("QAZ"); no real course is added to the app.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Learn, { lookUpItems } from '../app/(tabs)/learn';
import Practice from '../app/(tabs)/practice';
import You from '../app/(tabs)/you';
import BankHome from '../app/bank/index';
import BankDomain from '../app/bank/[domain]';
import Faq from '../app/faq';
import RootOrRumor from '../app/game/rumor';
import NotesDomain from '../app/notes/[domain]';
import NotesHome from '../app/notes/index';
import ReadinessReport from '../app/readiness';
import { resultsKey, resultsKeySpoken, resultsPlateTitle } from '../app/results';
import { planHero, planText, ringsNote } from '../components/journey';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { PacingPanel } from '../components/pace';
import { PathChooser, pathSummary } from '../components/pathChooser';
import { HOW_LINE } from '../components/readinessReport';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { FAQ } from '../content/support';
import type { Certification } from '../content/types';
import { emptyCopy } from '../engine/bank';
import { YARDSTICK_LINE } from '../engine/domainBand';
import { domainCopy } from '../engine/domainNaming';
import { addDays } from '../engine/examDay';
import { RUMOR_TIER_LINE, rumorTierLines } from '../engine/games/rootOrRumor';
import { allMarks, type MilestoneFacts } from '../engine/milestones';
import type { MockPacing } from '../engine/pace';
import type { PlanItem } from '../engine/planner';
import type { AnswerRecord, Readiness } from '../engine/readiness';
import type { ReadinessRange } from '../engine/readinessRange';
import { PATH_NOTE, PATH_REASON, PATH_STEPS, raiseLowerBound, readinessLine, trendWords, type DomainRow, type TrendPoint } from '../engine/readinessReport';
import { dayKey } from '../engine/streak';
import { weakDrillLine } from '../engine/weakSpots';
import { startStudy } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
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
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
  initNotifications: () => {},
}));

const cisa = getCertification('cisa')! as Certification;
const SECTIONS = { noun: 'Section', numbering: 'letter' } as const;
/** A made-up course with lettered sections (four of them, so "Section A" to "Section D"). */
const qaz: Certification = {
  ...cisa,
  id: 'qaz1',
  name: 'QAZ Part 1',
  status: 'coming_soon',
  domainStyle: SECTIONS,
  domains: [
    { id: '1', name: 'Foundations of the Craft', short: 'Foundations', weight: 35, tone: 0 },
    { id: '2', name: 'Ethics and Conduct', short: 'Ethics', weight: 20, tone: 1 },
    { id: '3', name: 'Oversight', short: 'Oversight', weight: 30, tone: 2 },
    { id: '4', name: 'Misconduct Risks', short: 'Misconduct', weight: 15, tone: 3 },
  ],
};

// ── 1. The helpers and the lines they build ──────────────────────────────

describe('domainCopy: a fixed sentence in the course’s words', () => {
  const lines = [ringsNote(), HOW_LINE, YARDSTICK_LINE, PATH_NOTE, ...PATH_STEPS.map((s) => s.line), ...Object.values(PATH_REASON), ...FAQ.flatMap((f) => f.answer)];

  it('no course, CISA, and every course today: the very same text', () => {
    expect(CERTIFICATIONS.every((c) => c.domainStyle === undefined)).toBe(true);
    for (const line of lines) {
      expect(domainCopy(line)).toBe(line);
      expect(domainCopy(line, cisa)).toBe(line);
      expect(domainCopy(line, null)).toBe(line);
      for (const c of CERTIFICATIONS) expect(domainCopy(line, c)).toBe(line);
    }
  });

  it('a course with sections: "Domain 1" is "Section A", and the word keeps its capital and its plural', () => {
    expect(domainCopy('Domain 1 is the inner ring.', qaz)).toBe('Section A is the inner ring.');
    expect(domainCopy('Domain 4, then Domain 2.', qaz)).toBe('Section D, then Section B.');
    expect(domainCopy('Every domain is steady. Domains count by weight; all domains do.', qaz)).toBe('Every section is steady. Sections count by weight; all sections do.');
    expect(domainCopy('Each domain’s number', qaz)).toBe('Each section’s number');
    // Only the whole word: an id-like word is left alone.
    expect(domainCopy('subdomain domainId', qaz)).toBe('subdomain domainId');
    for (const line of lines) expect(domainCopy(line, qaz)).not.toMatch(/domain/i);
  });

  it('the readiness report’s fixed lines', () => {
    expect(domainCopy(YARDSTICK_LINE, qaz)).toBe(YARDSTICK_LINE.replace('every domain', 'every section'));
    expect(domainCopy(HOW_LINE, qaz)).toBe(
      'Each section’s number is how much of it you’ve got right on your latest tries, with a hint counting half. Sections count by their weight on the exam. The low end is the cautious end: we’re fairly sure you’re at or above it.',
    );
    expect(domainCopy(PATH_REASON.practice, qaz)).toBe('Until every section is steady, practice leads.');
    expect(domainCopy(PATH_STEPS[1].line, qaz)).toBe('Lessons for the sections you need.');
    expect(domainCopy(PATH_NOTE, qaz)).toContain('If a section slips, practice leads again');
  });
});

describe('the path chooser’s words (pathChooser.tsx)', () => {
  it('pathSummary: "All domains" as before, "All sections" for a course with sections', () => {
    expect(pathSummary('smart', undefined, 20)).toBe('Smart · All domains · 20 questions');
    expect(pathSummary('smart', undefined, 20, cisa)).toBe('Smart · All domains · 20 questions');
    expect(pathSummary('guided', undefined, 20, cisa)).toBe('Guided · All domains');
    expect(pathSummary('smart', undefined, 20, qaz)).toBe('Smart · All sections · 20 questions');
    expect(pathSummary('guided', undefined, 20, qaz)).toBe('Guided · All sections');
    // One area picked: its own name, the same for both.
    expect(pathSummary('inOrder', qaz.domains[1], 10, qaz)).toBe('In order · Ethics · 10 questions');
  });
});

describe('the rings note (journey.tsx)', () => {
  it('CISA: "Domain 1 is the inner ring", word for word', () => {
    // No course and CISA give the same sentence (the old RINGS_NOTE constant, word for word).
    expect(ringsNote()).toBe('Domain 1 is the inner ring. Thicker rings weigh more on the exam.');
    expect(ringsNote(cisa)).toBe(ringsNote());
  });

  it('a course with sections: "Section A is the inner ring"', () => {
    expect(ringsNote(qaz)).toBe('Section A is the inner ring. Thicker rings weigh more on the exam.');
  });
});

describe('Today’s plan words (journey.tsx)', () => {
  const check = { kind: 'practice', why: 'check', count: 15, label: 'Mixed practice' } as unknown as PlanItem;

  it('CISA: "mixed across the domains"', () => {
    expect(planText(check).meta).toMatch(/ · mixed across the domains$/);
    expect(planText(check, undefined, 'today', cisa)).toEqual(planText(check));
    expect(planHero(check, undefined, { minutesSaid: true }).meta).toBe('15 questions, mixed across the domains');
    expect(planHero(check, undefined, { minutesSaid: true, course: cisa })).toEqual(planHero(check, undefined, { minutesSaid: true }));
  });

  it('a course with sections: "mixed across the sections"', () => {
    expect(planText(check, undefined, 'today', qaz).meta).toMatch(/ · mixed across the sections$/);
    expect(planHero(check, undefined, { minutesSaid: true, course: qaz }).meta).toBe('15 questions, mixed across the sections');
  });
});

describe('lines built by the engines', () => {
  it('Weak spots drill, before anything is answered', () => {
    expect(weakDrillLine([], () => '', false)).toBe('From the domains you miss most');
    expect(weakDrillLine([], () => '', false, cisa)).toBe('From the domains you miss most');
    expect(weakDrillLine([], () => '', false, qaz)).toBe('From the sections you miss most');
  });

  it('the question bank’s empty lists', () => {
    expect(emptyCopy('missed').body).toBe('Any question you get wrong in this domain will show up here.');
    expect(emptyCopy('answered').body).toBe('Questions you answer in this domain show up here, so you can look back at them and their explanations.');
    expect(emptyCopy('all').body).toBe('New questions for this domain are on the way.');
    for (const f of ['missed', 'saved', 'new', 'answered', 'all'] as const) {
      expect(emptyCopy(f, cisa)).toEqual(emptyCopy(f));
      expect(emptyCopy(f, qaz).title).toBe(emptyCopy(f).title);
      expect(emptyCopy(f, qaz).body).toBe(emptyCopy(f).body.replace('this domain', 'this section'));
      expect(emptyCopy(f, qaz).body).not.toMatch(/domain/i);
    }
  });

  it('Root or Rumor’s level lines', () => {
    expect(RUMOR_TIER_LINE).toEqual({ seedling: 'One domain per round.', sapling: 'All domains, mixed.', heartwood: 'All domains, plus “Why?” on each myth.' });
    expect(rumorTierLines(cisa)).toEqual(RUMOR_TIER_LINE);
    expect(rumorTierLines(qaz)).toEqual({ seedling: 'One section per round.', sapling: 'All sections, mixed.', heartwood: 'All sections, plus “Why?” on each myth.' });
  });

  it('the mock trend after a fall', () => {
    const fall: TrendPoint[] = [
      { id: 'a', at: 1, pct: 70, kind: 'mini', timed: true },
      { id: 'b', at: 2, pct: 58, kind: 'mini', timed: true },
    ];
    expect(trendWords(fall)).toBe('Down 12 points since your last mock. One mock can swing; look at the domains below.');
    expect(trendWords(fall, cisa)).toBe(trendWords(fall));
    expect(trendWords(fall, qaz)).toBe('Down 12 points since your last mock. One mock can swing; look at the sections below.');
    const slide: TrendPoint[] = [{ id: 'z', at: 0, pct: 70, kind: 'mini', timed: true }, { id: 'y', at: 1, pct: 68, kind: 'mini', timed: true }, { id: 'x', at: 2, pct: 66, kind: 'mini', timed: true }];
    expect(trendWords(slide)).toBe('Down 4 points over your last 3 mocks. One mock can swing; look at the domains below.');
    expect(trendWords(slide, qaz)).toBe('Down 4 points over your last 3 mocks. One mock can swing; look at the sections below.');
  });

  it('a readiness row’s first line', () => {
    const row = { domain: qaz.domains[0], weightPct: 35, answered: 40, readinessPct: 68, firm: true } as unknown as DomainRow;
    expect(readinessLine(row)).toBe('35% of the exam · domain readiness 68%');
    expect(readinessLine(row, cisa)).toBe('35% of the exam · domain readiness 68%');
    expect(readinessLine(row, qaz)).toBe('35% of the exam · section readiness 68%');
  });

  it('"what would raise your low end" when nothing stands out', () => {
    const steady = (c: Certification): Readiness =>
      ({ score: 90, answered: 500, reliable: true, focusDomainId: undefined, domains: c.domains.map((d) => ({ domainId: d.id, answered: 100, mastery: 1, accuracy: 1 })) }) as unknown as Readiness;
    const range = { enough: true, low: 85, high: 92, needed: 0 } as unknown as ReadinessRange;
    expect(raiseLowerBound(cisa, steady(cisa), range, 0)).toEqual([{ kind: 'mix', text: 'Keep a steady mix: reviews first, then your weakest domain.' }]);
    expect(raiseLowerBound(qaz, steady(qaz), range, 0)).toEqual([{ kind: 'mix', text: 'Keep a steady mix: reviews first, then your weakest section.' }]);
  });

  it('the Results key under the chart', () => {
    expect(resultsKey(true)).toBe('Dashed line: 70, the target for each domain. ↑: improvement from this mock. Highlighted: below 70.');
    expect(resultsKey(false, cisa)).toBe('Dashed line: 70, the target for each domain. ↑: improvement from this set. Highlighted: below 70.');
    expect(resultsKey(true, qaz)).toBe('Dashed line: 70, the target for each section. ↑: improvement from this mock. Highlighted: below 70.');
    expect(resultsKeySpoken(true, qaz)).toBe('Dashed line: 70, the target for each section. Up arrow: improvement from this mock. Highlighted: below 70.');
    expect(resultsKeySpoken(true)).toBe(resultsKey(true).replace('↑:', 'Up arrow:'));
  });

  it('the Results plate’s title', () => {
    const five = cisa.domains.map((d) => d.short);
    const four = qaz.domains.map((d) => d.short);
    expect(resultsPlateTitle(true, five)).toBe('Your five domains after this mock');
    expect(resultsPlateTitle(true, five, cisa)).toBe('Your five domains after this mock');
    expect(resultsPlateTitle(true, ['IS Audit'], cisa)).toBe('Your one domain after this mock');
    expect(resultsPlateTitle(false, five, cisa)).toBe('Your domains after this set');
    expect(resultsPlateTitle(false, ['IS Audit'], cisa)).toBe('IS Audit, after this set');
    expect(resultsPlateTitle(true, four, qaz)).toBe('Your four sections after this mock');
    expect(resultsPlateTitle(true, ['Ethics'], qaz)).toBe('Your one section after this mock');
    expect(resultsPlateTitle(false, four, qaz)).toBe('Your sections after this set');
    expect(resultsPlateTitle(false, ['Ethics'], qaz)).toBe('Ethics, after this set');
  });

  it('the Mock Complete badge’s rule', () => {
    const facts = (c: Certification): MilestoneFacts => ({
      cleanAnswered: 0,
      topicsClear: 0,
      domains: c.domains.map((d) => ({ id: d.id, short: d.short, answered: 0, mastery: 0 })),
      loopFixed: 0,
      slipsTagged: 0,
      longRecall: 0,
      graduated: 0,
      sure: [],
      mocks: [],
      fullMockSize: 150,
      mindsetShift: false,
      studyDays: 0,
      freshStart: false,
      gamesPlayed: 0,
      gamesTotal: 9,
      snareHits: [],
      keelRun: 0,
      signposts: [],
      myths: [],
      paceRounds: 0,
      gameFixes: 0,
      ...(c.domainStyle ? { domainStyle: c.domainStyle } : {}),
    });
    const rule = (c: Certification) => allMarks(facts(c)).find((m) => m.key === 'dress-rehearsal:2')?.rule ?? '';
    expect(rule(cisa)).toMatch(/once every domain is at \d+%\.$/);
    expect(rule(qaz)).toBe(rule(cisa).replace('every domain', 'every section'));
  });

  it('Learn’s Study notes row: its spoken hint', () => {
    const hint = (c: Certification) => lookUpItems(c, 0, { showNotes: true, showPrinciples: false, showGuide: false, showWeek: false }).find((i) => i.key === 'notes')?.hint;
    expect(hint(cisa)).toBe('Opens the notes, by domain');
    expect(hint(qaz)).toBe('Opens the notes, by section');
  });
});

// ── 2. Whole screens, as CISA and with sections switched on ──────────────

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const root = () => r!.root;
const textIn = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const press = (label: string | RegExp) => {
  const is = (s: unknown) => typeof s === 'string' && (typeof label === 'string' ? s === label : label.test(s));
  const btn = root().findAll((n) => typeof n.props.onPress === 'function' && (is(n.props.accessibilityLabel) || is(textIn(n))))[0];
  act(() => btn.props.onPress());
};
/**
 * Everything on screen that matches `word`: each piece of text, and each spoken label and hint.
 * (Sorted and without repeats, so the lists below are easy to read.)
 */
function wordsOnScreen(word: RegExp): string[] {
  const out = new Set<string>();
  const keep = (s: unknown) => {
    if (typeof s === 'string' && word.test(s)) out.add(s);
  };
  for (const n of root().findAll(() => true)) {
    keep(n.props.accessibilityLabel);
    keep(n.props.accessibilityHint);
    for (const ch of n.children) keep(ch);
  }
  return [...out].sort();
}
/** Switch sections on for the open course (CISA's own descriptor, as held-back-screens.test.tsx does). */
const withSections = () => {
  cisa.domainStyle = { ...SECTIONS };
};

const NOW = Date.now();
/** A few answers in every area, so rows, rings and the report have something to show. */
function seedAnswers() {
  const answers: Record<string, AnswerRecord> = {};
  for (const d of cisa.domains) {
    getAllQuestions('cisa')
      .filter((q) => q.domainId === d.id)
      .slice(0, 12)
      .forEach((q, i) => {
        // Two in three right, an hour ago.
        const right = i % 3 !== 0;
        answers[q.id] = { attempts: 1, correctCount: right ? 1 : 0, lastCorrect: right, lastAt: NOW - 3_600_000 };
      });
  }
  const mock = (id: string, correct: number, at: number) => ({ id, certId: 'cisa', finishedAt: at, total: 50, correct, durationSec: 3000, byDomain: Object.fromEntries(cisa.domains.map((d) => [d.id, { correct: Math.round(correct / 5), total: 10 }])) });
  act(() => {
    useProgress.setState((s) => ({
      byCert: { ...s.byCert, cisa: { ...s.byCert.cisa!, answers, mocks: [mock('m1', 35, NOW - 9 * 86_400_000), mock('m2', 28, NOW - 86_400_000)] as never } },
    }));
  });
}

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  setMockReducedMotion(true);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: { promptHidden: true }, days: {} });
  });
  useSession.getState().clear();
  useSettings.setState(useSettings.getInitialState(), true);
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, examDates: { cisa: addDays(dayKey(NOW), 60) } });
  jest.mocked(router.push).mockClear();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});
afterEach(() => {
  unmount();
  delete cisa.domainStyle;
  useSession.getState().clear();
});

/**
 * Draw a screen as CISA and read every string that says "domain"; then draw it again with
 * sections on and read what still says "domain" (`left`) and what now says "section" (`sections`).
 * `after` runs on each drawing (to open a panel, for example).
 */
function bothWays(screen: () => React.ReactElement, after?: () => void): { asCisa: string[]; left: string[]; sections: string[] } {
  mount(screen());
  after?.();
  const asCisa = wordsOnScreen(/domain/i);
  unmount();
  withSections();
  mount(screen());
  after?.();
  return { asCisa, left: wordsOnScreen(/domain/i), sections: wordsOnScreen(/section/i) };
}
/** CISA's strings are all there, word for word; with sections on, each reads "section" and no "domain" is left. */
function expectReworded(got: { asCisa: string[]; left: string[]; sections: string[] }, cisaStrings: string[], sectionStrings: string[], contentLeft: RegExp[] = []) {
  expect(got.asCisa).toEqual(expect.arrayContaining(cisaStrings));
  expect(got.sections).toEqual(expect.arrayContaining(sectionStrings));
  // Only the course's own study content may still say "domain" (a note written for CISA says what it says).
  expect(got.left.filter((line) => !contentLeft.some((re) => re.test(line)))).toEqual([]);
}

describe('screens: CISA word for word, and no "domain" left with sections on', () => {
  it('Practice, with the path chooser open', () => {
    seedAnswers();
    const got = bothWays(() => <Practice />, () => press(/^(Domains, all domains|Sections, all sections)$/));
    expectReworded(
      got,
      [
        // The path chooser (components/pathChooser.tsx).
        'Domain',
        'Domain for your path',
        'All domains',
        // The rows and their spoken hints.
        'Browse by domain and topic',
        'Question bank, Browse by domain and topic',
        '4 hours · weighted by domain',
        'Full mock, 150 questions, 4 hours, weighted by domain',
        'Opens Build a set with this domain chosen',
        'Starts a set from the domains you miss most',
        'Starts a set in this domain',
        // Fixed before this change; here so the whole screen is covered.
        'Domains',
        'Domains, all domains',
        'By domain',
        'Starts a set in that domain',
        'Domain 1, IS Audit, 18 percent of the exam, 12 seen, too few yet',
      ],
      [
        'Section',
        'Section for your path',
        'All sections',
        'Browse by section and topic',
        'Question bank, Browse by section and topic',
        '4 hours · weighted by section',
        'Full mock, 150 questions, 4 hours, weighted by section',
        'Opens Build a set with this section chosen',
        'Starts a set from the sections you miss most',
        'Starts a set in this section',
        'Sections',
        'Sections, all sections',
        'By section',
        'Section A, IS Audit, 18 percent of the exam, 12 seen, too few yet',
      ],
    );
  });

  it('Practice’s info sheet names "domain" in the course’s word', () => {
    // The sheet's body is drawn only when opened, so read the sentence from the screen's own tree.
    const body = () => root().findAll((n) => typeof n.props.children === 'string' && n.props.children.startsWith('Choose a study path')).map((n) => n.props.children as string);
    const find = () => {
      const info = root().findAll((n) => n.props.title === 'Practice' && n.props.children)[0];
      return info ? JSON.stringify(info.props.children.props.children) : body().join('');
    };
    mount(<Practice />);
    expect(find()).toContain('Choose a study path or build a one-off set by domain, topic and difficulty. Drills are short games that practice specific skills.');
    unmount();
    withSections();
    mount(<Practice />);
    expect(find()).toContain('Choose a study path or build a one-off set by section, topic and difficulty. Drills are short games that practice specific skills.');
  });

  it('the path chooser on its own: no course is CISA’s words', () => {
    const noop = () => {};
    const chooser = (course?: Certification) => <PathChooser mode="smart" suggested="smart" domains={qaz.domains} domainId={undefined} size={10} onMode={noop} onDomain={noop} onSize={noop} onDone={noop} course={course} />;
    mount(chooser());
    expect(wordsOnScreen(/domain/i)).toEqual(['All domains', 'Domain', 'Domain for your path']);
    unmount();
    mount(chooser(cisa));
    expect(wordsOnScreen(/domain/i)).toEqual(['All domains', 'Domain', 'Domain for your path']);
    unmount();
    mount(chooser(qaz));
    expect(wordsOnScreen(/domain/i)).toEqual([]);
    expect(wordsOnScreen(/section/i)).toEqual(['All sections', 'Section', 'Section for your path']);
  });

  it('You: the two spoken hints', () => {
    seedAnswers();
    expectReworded(
      bothWays(() => <You />),
      ['Opens your readiness report with this mock’s domains', 'Your mock trend, each domain side by side, and what would raise your low end'],
      ['Opens your readiness report with this mock’s sections', 'Your mock trend, each section side by side, and what would raise your low end'],
    );
  });

  it('the readiness report, with "How it’s worked out" open', () => {
    seedAnswers();
    const got = bothWays(() => <ReadinessReport />, () => press('How it’s worked out'));
    expectReworded(
      got,
      [
        YARDSTICK_LINE,
        HOW_LINE,
        PATH_NOTE,
        'Lessons for the domains you need.',
        'Until every domain is steady, practice leads.',
        '3. Make it stick. Practice, then revisit what you missed. You are here. Until every domain is steady, practice leads.',
        'Down 14 points since your last mock. One mock can swing; look at the domains below.',
        '18% of the exam · domain readiness 67%',
        'Opens Learn on this domain',
        'Shows how each domain went',
        // Fixed before this change.
        'Domain by domain',
        'Domain 1 · IS Audit',
      ],
      [
        domainCopy(YARDSTICK_LINE, qaz),
        domainCopy(HOW_LINE, qaz),
        domainCopy(PATH_NOTE, qaz),
        'Lessons for the sections you need.',
        'Until every section is steady, practice leads.',
        '3. Make it stick. Practice, then revisit what you missed. You are here. Until every section is steady, practice leads.',
        'Down 14 points since your last mock. One mock can swing; look at the sections below.',
        '18% of the exam · section readiness 67%',
        'Opens Learn on this section',
        'Shows how each section went',
        'Section by section',
        'Section A · IS Audit',
      ],
    );
  });

  it('the question bank’s home', () => {
    expectReworded(bothWays(() => <BankHome />), ['Domains', "Shows this domain's topics and questions", 'Domain 1 · IS Audit'], ['Sections', "Shows this section's topics and questions", 'Section A · IS Audit']);
  });

  it('the question bank and the notes, for an area the course does not have', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ domain: '9' });
    expectReworded(bothWays(() => <BankDomain />), ['Domain not found', 'Go back and pick a domain from the list.'], ['Section not found', 'Go back and pick a section from the list.']);
    unmount();
    delete cisa.domainStyle;
    expectReworded(bothWays(() => <NotesDomain />), ['This domain has no study notes yet.'], ['This section has no study notes yet.']);
  });

  it('the study notes’ home: the two headings (the notes’ own text is the course’s content)', () => {
    expectReworded(
      bothWays(() => <NotesHome />),
      ['By domain', 'Across the domains', 'Domain 1 · IS Audit'],
      ['By section', 'Across the sections', 'Section A · IS Audit'],
      // CISA's own cross-domain notes, written by hand for CISA: content, not app wording.
      [/Risk drives every domain/, /Whatever the domain, ask which/, /all five domains/],
    );
  });

  it('Learn: the Study notes row’s hint', () => {
    expectReworded(bothWays(() => <Learn />), ['Opens the notes, by domain'], ['Opens the notes, by section']);
  });

  it('Root or Rumor: the level lines', () => {
    expectReworded(
      bothWays(() => <RootOrRumor />),
      ['One domain per round.', 'Practised. All domains, mixed.', 'Skilled. All domains, plus “Why?” on each myth.'],
      ['One section per round.', 'Practised. All sections, mixed.', 'Skilled. All sections, plus “Why?” on each myth.'],
    );
  });

  it('Common questions: "Why is my readiness a range?"', () => {
    const q = FAQ.find((f) => f.id === 'readiness')!;
    expect(q.answer[0]).toContain('weighted by how much each domain counts on the exam');
    const got = bothWays(() => <Faq />, () => press(q.question));
    expectReworded(got, [q.answer[0]], [q.answer[0].replace('each domain', 'each section')]);
  });

  it('a mock’s pacing panel: "Slowest domain"', () => {
    const pacing: MockPacing = { usedMinutes: 60, usedMs: 3_600_000, allowedMinutes: 80, medianSec: 70, checkpoints: [], unanswered: 0, timedOut: false, lastTenth: null, rest: null, slowestDomain: { domainId: '2', medianSec: 95 } };
    mount(<PacingPanel pacing={pacing} cert={cisa} />);
    expect(wordsOnScreen(/domain/i).some((line) => line.startsWith('Slowest domain'))).toBe(true);
    unmount();
    mount(<PacingPanel pacing={pacing} cert={qaz} />);
    expect(wordsOnScreen(/domain/i)).toEqual([]);
    expect(wordsOnScreen(/section/i).some((line) => line.startsWith('Slowest section'))).toBe(true);
  });

  it('a study session’s title: "Random · All domains", or "All sections"', () => {
    act(() => {
      startStudy('cisa', { mode: 'random', count: 5 });
    });
    expect(useSession.getState().active?.title).toBe('Random · All domains');
    useSession.getState().clear();
    withSections();
    act(() => {
      startStudy('cisa', { mode: 'random', count: 5 });
    });
    expect(useSession.getState().active?.title).toBe('Random · All sections');
    useSession.getState().clear();
    // One area picked: its own name, the same either way.
    act(() => {
      startStudy('cisa', { mode: 'random', count: 5, domainId: '2' });
    });
    expect(useSession.getState().active?.title).toBe('Random · IT Governance');
  });
});
