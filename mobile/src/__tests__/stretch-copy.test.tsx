/**
 * PR #41 UX review: Stretch tiers (beyond what the exam needs) never read as
 * the next thing to do.
 * - H2: when only Stretch tiers are left, the panel says "If you want to go
 *   further" and "Entirely optional", and each row's button "Go further ›".
 * - P1: a tier ladder's "Next" is never a Stretch tier.
 * - P2: in the flat sorts (no Stretch shelf header) a Stretch cell says
 *   "<set> · Stretch" in words.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import { BadgeCell, BadgeSheet, NextPanel } from '../components/badges';
import { getCertification } from '../content/certifications';
import { caseMarks, caseSets, nextForExam, type CaseMark } from '../engine/badgeCatalog';
import { allMarks, type MilestoneFacts } from '../engine/milestones';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const cisa = getCertification('cisa')!;
const DOMAINS = cisa.domains.map((d) => ({ id: d.id, short: d.short, weight: d.weight, tone: d.tone, ...(d.emblem ? { emblem: d.emblem } : {}) }));
const EXAM = { questions: cisa.exam.questions, minutes: cisa.exam.minutes };

function facts(over: Partial<MilestoneFacts> = {}): MilestoneFacts {
  return {
    cleanAnswered: 400,
    topicsClear: 0,
    domains: cisa.domains.map((d) => ({ id: d.id, short: d.short, answered: 45, mastery: 0.78 })),
    loopFixed: 0,
    slipsTagged: 0,
    longRecall: 120,
    graduated: 0,
    sure: [],
    mocks: [],
    fullMockSize: 150,
    mindsetShift: false,
    mindsetData: true,
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
    wholeMapAt: T0,
    ...over,
  };
}

let r: ReactTestRenderer | undefined;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
beforeEach(() => setMockReducedMotion(true));
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});

/** Every core badge earned: only Stretch tiers are left. */
function onlyStretchLeft(): CaseMark[] {
  const marks0 = allMarks(facts());
  const core = caseMarks({ marks: marks0, earned: {}, domains: DOMAINS, exam: EXAM, mindsetData: true }).filter((m) => !m.stretch && m.set !== 'moments' && m.set !== 'fieldNotes');
  const earned = Object.fromEntries(core.map((m) => [m.key, T0]));
  return caseMarks({ marks: marks0, earned, domains: DOMAINS, exam: EXAM, mindsetData: true });
}

describe('only Stretch tiers left (UX H2)', () => {
  it('the panel says "If you want to go further", never "for your exam"; each row offers "Go further ›"', () => {
    const marks = onlyStretchLeft();
    const n = nextForExam({ marks, stage: 'practice', daysLeft: null, mastery: Object.fromEntries(cisa.domains.map((d) => [d.id, 0.78])) });
    expect(n.best).toBeUndefined();
    expect(n.nearest.length).toBeGreaterThan(0);
    expect(n.nearest.every((m) => m.stretch)).toBe(true);
    mount(<NextPanel nearest={n.nearest} setName={() => 'Set'} domains={cisa.domains} dueCount={0} onOpen={() => {}} onStudy={() => {}} />);
    const t = textOf(r!.root);
    expect(t).toContain('If you want to go further');
    expect(t).toContain('These go beyond what the exam needs. Entirely optional.');
    expect(t).not.toContain('for your exam');
    expect(t).not.toContain('Study for this');
    expect(t.match(/Go further ›/g)).toHaveLength(n.nearest.length);
  });

  it('with a core badge still open the heading stays "Still to collect · for your exam" (mobile 1.51)', () => {
    const marks = caseMarks({ marks: allMarks(facts()), earned: { 'whole-map': T0 }, domains: DOMAINS, exam: EXAM, mindsetData: true });
    const core = marks.filter((m) => !m.stretch && m.status !== 'earned' && m.set === 'evergreen').slice(0, 1);
    mount(<NextPanel nearest={core} setName={() => 'Evergreen'} domains={cisa.domains} dueCount={0} onOpen={() => {}} onStudy={() => {}} />);
    expect(textOf(r!.root)).toContain('Still to collect · for your exam');
    expect(textOf(r!.root)).toContain('Study for this ›');
  });
});

describe('the tier ladder (UX P1)', () => {
  it('"Next" is the next core tier; a Stretch tier is never "Next", even when it is the only one left', () => {
    const marks = caseMarks({ marks: allMarks(facts({ longRecall: 90 })), earned: { 'long-memory': T0, 'long-memory:75': T0 }, domains: DOMAINS, exam: EXAM, mindsetData: true });
    const ladder = marks.filter((m) => m.ladder === 'long-memory');
    const set = caseSets(marks, EXAM, DOMAINS.length).find((s) => s.info.id === 'evergreen')!;
    mount(
      <BadgeSheet
        mark={ladder[2]}
        set={set}
        ladder={ladder}
        domains={cisa.domains}
        stage="practice"
        daysLeft={null}
        dueCount={0}
        showProgress
        onClose={() => {}}
        onStudy={() => {}}
      />,
    );
    const ladderView = r!.root.findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('25 recalls'))[0];
    expect(ladderView.props.accessibilityLabel).not.toMatch(/, next/);
    expect(textOf(ladderView)).not.toMatch(/\bNext\b/);
    expect(textOf(ladderView)).toContain('Stretch');
  });
});

describe('flat sorts (UX P2)', () => {
  it('a Stretch cell says "<set> · Stretch" under it; a core cell just its set', () => {
    const marks = caseMarks({ marks: allMarks(facts()), earned: { 'whole-map': T0 }, domains: DOMAINS, exam: EXAM, mindsetData: true });
    const stretch = marks.find((m) => m.key === 'long-memory:150')!;
    const core = marks.find((m) => m.key === 'long-memory:75')!;
    mount(<BadgeCell mark={stretch} setName="Evergreen" width={110} size={88} domains={cisa.domains} onOpen={() => {}} showSet />);
    expect(textOf(r!.root)).toContain('Evergreen · Stretch');
    act(() => r!.unmount());
    mount(<BadgeCell mark={core} setName="Evergreen" width={110} size={88} domains={cisa.domains} onOpen={() => {}} showSet />);
    expect(textOf(r!.root)).toContain('Evergreen');
    expect(textOf(r!.root)).not.toContain('Stretch');
  });
});
