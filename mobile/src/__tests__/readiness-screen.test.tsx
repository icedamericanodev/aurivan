/**
 * Mobile 1.16 (PHASE5.md §3.1, §3.3, §3.4): the readiness report on screen.
 * - Every section in the empty, one-mock and full states; the framing is
 *   always on screen ("A study estimate, not a prediction.").
 * - A copy scan of everything shown or spoken: no pass, fail, guarantee,
 *   "predict your score", "will pass" or "forecast"; never the bank size.
 * - Spoken labels for the trend and each domain; a cert with 4 domains.
 * - `?mock=<id>` opens that mock's domains; a tap toggles a mock.
 * - The actions start the right sessions.
 * - Today: the readiness words open the report (the plant still opens Your
 *   plant); You: "See your readiness report", "See report" and each mock row.
 * - Native: the charts' paths, dashes and bar widths parse (no NaN, arrays of
 *   numbers, whole-percent widths), at every size the report draws.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import ReadinessReport from '../app/readiness';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { CHART, chartPoints, DomainReportRow, FRAMING_LINE, lowMarks, ScoreChart, TrendLegend, trendMarks } from '../components/readinessReport';
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import { addDays } from '../engine/examDay';
import { shiftDay } from '../engine/examReady';
import { computeReadiness, type AnswerRecord } from '../engine/readiness';
import { domainBreakdown, mockTrend } from '../engine/readinessReport';
import { dayKey } from '../engine/streak';
import { useProgress, type MockResult } from '../store/progress';
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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const cisa = getCertification('cisa')!;
const DAY = 86_400_000;

function seedAnswers(perDomain: number, accuracy: number): Record<string, AnswerRecord> {
  const out: Record<string, AnswerRecord> = {};
  for (const d of cisa.domains) {
    getAllQuestions('cisa')
      .filter((q) => q.domainId === d.id)
      .slice(0, perDomain)
      .forEach((q, i) => {
        const right = i < Math.round(perDomain * accuracy);
        out[q.id] = { attempts: 1, correctCount: right ? 1 : 0, lastCorrect: right, lastAt: Date.now() - DAY };
      });
  }
  return out;
}
const mock = (i: number, daysAgo: number, total: number, pct: number, extra: Partial<MockResult> = {}): MockResult => ({
  id: `m${i}`,
  finishedAt: Date.now() - daysAgo * DAY,
  total,
  correct: Math.round((pct / 100) * total),
  minutesUsed: total === 150 ? 226 : 74,
  byDomain: { '1': { total: 9, correct: 7 }, '4': { total: 13, correct: Math.round((pct / 100) * 13) } },
  timing: 'standard',
  medianSec: 88,
  unanswered: 0,
  ...extra,
});
/** Eight mocks, newest first (as the store keeps them), rising. */
const EIGHT = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => mock(i, 40 - i * 5, i % 3 === 2 ? 150 : 50, 56 + i * 3, i === 1 ? { timing: 'untimed', medianSec: undefined } : {})).reverse();
const LOG = Array.from({ length: 12 }, (_, k) => ({ day: shiftDay(dayKey(Date.now()), 11 - k), min: 58 + Math.floor(k / 2), last: 58 + Math.floor(k / 2) }));

const setCert = (cp: Record<string, unknown>) =>
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, ...cp } } }));
  });

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
/** Everything a learner can read or hear on screen. */
const allWords = () => [allText(), ...root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string), ...root().findAll((n) => typeof n.props.accessibilityHint === 'string').map((n) => n.props.accessibilityHint as string)].join(' ');
const labelled = (re: RegExp) => root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && re.test(n.props.accessibilityLabel) && typeof n.type === 'string');
const press = (label: RegExp) => {
  const n = root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel))[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => {
    n.props.onPress();
  });
};
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');

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
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', fitPrompt: 'answered', dailyMinutes: 20, examDates: { cisa: addDays(dayKey(Date.now()), 40) } });
  jest.mocked(router.push).mockClear();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.restoreAllMocks();
});

const BANNED = /\bpass\b|\bpasses\b|\bfail|guarantee|predict your score|will pass|forecast|ready to pass/i;

describe('the readiness report: every section, every state', () => {
  it('full (8 mocks): the range, the framing, actions, the low end, the trend, domains, pacing, the path, the mocks', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT, moments: { readiness: LOG } });
    mount(<ReadinessReport />);
    const t = allText();
    expect(t).toMatch(/\d+–\d+/);
    expect(t).toContain('estimated readiness');
    expect(t).toContain('A study estimate, not a prediction.');
    expect(t).toContain(FRAMING_LINE);
    // One name for the number: "low end" (UX review P2).
    for (const h of ['What would raise your low end', 'Your low end over time', 'The cautious end of your range, last 30 days', 'Mock trend', 'Domain by domain', 'Pacing', 'Your path', 'Your mocks'])
      expect(t).toContain(h);
    expect(byTestID('trend-chart')).toHaveLength(1);
    expect(byTestID('low-chart')).toHaveLength(1);
    expect(t).toContain('From 58% to 63% over 12 days.');
    expect(t).toMatch(/Up \d+ points over your last 3 mocks\./);
    expect(t).toContain('Practice scores are not scaled exam scores.');
    expect(t).toContain(cisa.exam.passingNote);
    // Domains 1 → 5, with the C9 list label.
    expect(cisa.domains.map((d) => t.indexOf(`Domain ${d.id} · ${d.short}`))).toEqual([...cisa.domains.map((d) => t.indexOf(`Domain ${d.id} · ${d.short}`))].sort((a, b) => a - b));
    expect(t).toContain('Last mock 10 of 13 (77%)');
    // The six steps, the current one marked, with why; no "Step N of 6" (UX review P1, O8).
    expect(t).toContain('Now: Make it stick');
    expect(t).not.toMatch(/Step \d of 6/);
    expect(labelled(/^3\. Make it stick\. Practice and spaced review\. You are here\. Until every domain is steady, practice leads\.$/)).toHaveLength(1);
    expect(labelled(/You are here\./)).toHaveLength(1);
    expect(t).toContain('The plan moves between these as you go.');
    // The newest 5 mocks, folded, then "Show all 8 mocks" (UX review P8).
    const folded = () => root().findAll((n) => n.props.accessibilityState?.expanded === false && /questions, score/.test(n.props.accessibilityLabel ?? '') && typeof n.props.onPress === 'function');
    expect(folded()).toHaveLength(5);
    press(/^Show all 8 mocks$/);
    expect(folded()).toHaveLength(8);
    expect(t).toContain(cisa.trademarkNotice);
  });

  it('not enough data yet: the framing still shows, and only the "answer more" row', () => {
    setCert({ answers: seedAnswers(5, 0.6) });
    mount(<ReadinessReport />);
    const t = allText();
    expect(t).toContain('Not enough data yet');
    expect(t).toContain('15 more answers until your readiness range');
    expect(t).toContain('A study estimate, not a prediction.');
    expect(byTestID('raise-unlock')).toHaveLength(1);
    expect(byTestID('raise-answer')).toHaveLength(0);
    expect(t).toContain('This fills in as you study on more days.');
    expect(t).toContain('No mocks yet');
    expect(t).toContain('Domain by domain');
    expect(t).toContain('Your path');
    expect(t).not.toContain('Your mocks');
    expect(t).not.toContain('Pacing');
  });

  it('one mock: its score, and no trend words', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: [mock(1, 2, 50, 76)] });
    mount(<ReadinessReport />);
    const t = allText();
    expect(t).toContain('Mini mock · ');
    expect(t).not.toMatch(/Up \d+ points|About level|Down \d+ points/);
    expect(byTestID('trend-chart')).toHaveLength(0);
    expect(labelled(/^Your mock: 76 percent, a mini mock/)).toHaveLength(1);
  });

  it('a fall is said plainly, in words (never colour alone)', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: [mock(2, 1, 50, 62), mock(1, 6, 50, 70)] });
    mount(<ReadinessReport />);
    expect(allText()).toContain('Down 8 points since your last mock. One mock can swing; look at the domains below.');
  });

  it('a certification with 4 domains: four rows, each one stop', () => {
    useSettings.setState({ activeCertId: 'cism', examDates: {} });
    mount(<ReadinessReport />);
    const cism = getCertification('cism')!;
    expect(cism.domains).toHaveLength(4);
    for (const d of cism.domains) expect(byTestID(`domain-row-${d.id}`)).toHaveLength(1);
    expect(byTestID('domain-row-5')).toHaveLength(0);
  });
});

describe('honest words, everywhere on the report', () => {
  it.each([
    ['empty', {}],
    ['thin', { answers: seedAnswers(5, 0.6) }],
    ['full', { answers: seedAnswers(30, 0.7), mocks: EIGHT, moments: { readiness: LOG } }],
    ['falling', { answers: seedAnswers(30, 0.5), mocks: [mock(2, 1, 150, 50), mock(1, 6, 150, 70)] }],
  ])('%s: no pass, fail, guarantee or forecast words; never the bank size', (_, cp) => {
    setCert(cp);
    mount(<ReadinessReport />);
    // The passing note is the exam's own fact, said once; nothing else may speak of passing.
    const words = allWords().split(cisa.exam.passingNote).join(' ');
    expect(words).not.toMatch(BANNED);
    expect(words).not.toMatch(/questions in this domain|of \d{3,} questions|\d{3,} questions in/i);
  });

  it('spoken: the trend is one sentence, each domain one stop with its weight, readiness and evidence', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT });
    mount(<ReadinessReport />);
    // Each score with its kind (code review M3c), then the trend in words.
    expect(labelled(/^Your last 8 mocks, oldest first, in percent: (\d+ (mini|full)( untimed)?(, |\.))+ Up \d+ points over your last 3 mocks\. Mini and full mocks are mixed here; a mini mock swings more\.$/)).toHaveLength(1);
    expect(labelled(/: 56 mini, 60 mini untimed, 62 full, /)).toHaveLength(1);
    expect(labelled(/^Domain 4, IS Operations, 26 percent of the exam\. Domain readiness \d+ percent, based on 30 answers\. Last mock \d+ of 13, \d+ percent\./)).toHaveLength(1);
    expect(labelled(/^Estimated readiness between \d+ and \d+ percent\.$/)).toHaveLength(1);
  });
});

describe('mocks: tap to see each domain; ?mock= opens one', () => {
  it('a tap opens and closes a mock’s domains ("–" for a domain it has no entry for)', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT });
    mount(<ReadinessReport />);
    expect(byTestID('mock-domains-m7')).toHaveLength(0);
    const m7 = new RegExp(`^50 questions, score ${Math.round((EIGHT[0].correct / 50) * 100)} percent`);
    press(m7);
    expect(byTestID('mock-domains-m7')).toHaveLength(1);
    expect(labelled(/^IS Audit, 7 of 9, 78 percent$/).length).toBeGreaterThan(0);
    expect(allText()).toContain('7 of 9 (78%)');
    expect(labelled(/^IT Governance, not recorded$/).length).toBeGreaterThan(0);
    press(m7);
    expect(byTestID('mock-domains-m7')).toHaveLength(0);
  });

  it('?mock=<id> opens that mock (and only it)', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT });
    jest.mocked(useLocalSearchParams).mockReturnValue({ mock: 'm3' });
    mount(<ReadinessReport />);
    expect(byTestID('mock-domains-m3')).toHaveLength(1);
    expect(root().findAll((n) => n.props.testID?.startsWith?.('mock-domains-') && typeof n.type === 'string')).toHaveLength(1);
  });
});

describe('what would raise the low end: each button starts its session', () => {
  it('the thin domain, the weak spots and the review start real sessions', () => {
    const answers = seedAnswers(30, 0.7);
    // Domain 3 thin (4 answers), reviews due.
    for (const id of Object.keys(answers).filter((k) => k.startsWith('d3_')).slice(4)) delete answers[id];
    const review = Object.fromEntries(Object.keys(answers).slice(0, 6).map((id) => [id, { box: 1, dueAt: Date.now() - 3600_000, lastSeen: Date.now() - DAY, reps: 1 }]));
    setCert({ answers, review });
    mount(<ReadinessReport />);
    expect(allText()).toContain('Answer 6 more in IS Acquisition to firm up your range');
    press(/^Practice IS Acquisition$/);
    expect(useSession.getState().active).toMatchObject({ title: 'IS Acquisition', mode: 'practice' });
    expect(router.push).toHaveBeenCalledWith('/session');
    act(() => {
      useSession.getState().clear();
    });
    press(/^Start review$/);
    expect(useSession.getState().active).toMatchObject({ mode: 'review' });
  });
});

describe('the ways in', () => {
  it('Today: the readiness words are a button to the report, with a hint', () => {
    setCert({ answers: seedAnswers(30, 0.7) });
    mount(<Today />);
    const tap = root().findAll((n) => n.props.testID === 'readiness-tap' && typeof n.props.onPress === 'function' && n.props.accessibilityRole === 'button')[0];
    expect(tap.props.accessibilityRole).toBe('button');
    expect(tap.props.accessibilityHint).toBe('Opens your readiness report');
    expect(tap.props.accessibilityLabel).toMatch(/^Estimated readiness between \d+ and \d+ percent\./);
    act(() => {
      tap.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/readiness');
  });

  it('Today with a plant: the plant opens Your plant, the words open the report (two stops)', () => {
    setCert({ answers: seedAnswers(30, 0.7), plant: { species: 'oak', name: 'Kai', plantedAt: Date.now() - 3 * DAY, growth: 2 } });
    mount(<Today />);
    const tap = root().findAll((n) => n.props.testID === 'readiness-tap' && typeof n.props.onPress === 'function')[0];
    expect(tap).toBeDefined();
    act(() => {
      tap.props.onPress();
    });
    expect(router.push).toHaveBeenLastCalledWith('/readiness');
    expect(root().findAll((n) => n.props.testID === 'today-plant').length).toBeGreaterThan(0);
  });

  it('the tap target shows a ring while it has keyboard focus, and drops it on blur', () => {
    setCert({ answers: seedAnswers(30, 0.7) });
    mount(<Today />);
    const tap = () => root().findAll((n) => n.props.testID === 'readiness-tap' && typeof n.props.onFocus === 'function')[0];
    expect(byTestID('readiness-focus-ring')).toHaveLength(0);
    act(() => {
      tap().props.onFocus();
    });
    expect(byTestID('readiness-focus-ring')).toHaveLength(1);
    act(() => {
      tap().props.onBlur();
    });
    expect(byTestID('readiness-focus-ring')).toHaveLength(0);
  });

  it('You: "See your readiness report", "See report", and each mock row opens the report with that mock', () => {
    setCert({ answers: seedAnswers(30, 0.7), mocks: EIGHT });
    mount(<You />);
    press(/^See your readiness report$/);
    expect(router.push).toHaveBeenLastCalledWith('/readiness');
    // The ListRow elements themselves (each draws a pressable inside).
    const rows = root().findAll((n) => n.props.accessibilityHint === 'Opens your readiness report with this mock’s domains' && typeof n.props.onPress === 'function' && typeof n.props.title === 'string');
    expect(rows).toHaveLength(8);
    act(() => {
      rows[2].props.onPress();
    });
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/readiness', params: { mock: EIGHT[2].id } });
    // "See report" on the section is spoken in full.
    expect(root().findAll((n) => n.props.accessibilityLabel === 'See your readiness report' && typeof n.type === 'string')).toHaveLength(2);
  });

  it('You with no mocks: no "See report" on the section (the empty state offers a mini mock)', () => {
    mount(<You />);
    expect(allText()).not.toContain('See report');
    expect(allText()).toContain('See your readiness report');
  });
});

// ── Native parsing (web shots never show these) ───────────────────────
type Node = { props: Record<string, unknown>; type: unknown };
const flat = (style: unknown): Record<string, unknown> => (Array.isArray(style) ? Object.assign({}, ...style.map(flat)) : style && typeof style === 'object' ? (style as Record<string, unknown>) : {});

describe('native: the report’s drawings parse on a phone', () => {
  const NUMERIC = ['x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'width', 'height', 'strokeWidth', 'fillOpacity'];
  const check = (tree: ReactTestRenderer) => {
    const bad: string[] = [];
    for (const n of tree.root.findAll(() => true) as Node[]) {
      const p = n.props ?? {};
      if (typeof p.d === 'string' && (/NaN|Infinity|undefined/.test(p.d) || !/^M[\d.,\s\-LCZ]+$/.test(p.d))) bad.push(`d ${p.d}`);
      for (const k of NUMERIC) if (k in p && typeof p[k] === 'number' && !Number.isFinite(p[k] as number)) bad.push(`${k} ${p[k]}`);
      if (p.strokeDasharray !== undefined && !(Array.isArray(p.strokeDasharray) && (p.strokeDasharray as unknown[]).every((v) => typeof v === 'number' && Number.isFinite(v)))) bad.push(`dash ${String(p.strokeDasharray)}`);
      const w = flat(p.style).width;
      if (typeof w === 'string' && !/^\d+%$/.test(w)) bad.push(`width ${w}`);
    }
    return bad;
  };

  it.each([1, 2, 3, 10])('ScoreChart with %i marks of every kind, at 160–420 wide: finite numbers, dash arrays', (n) => {
    for (const width of [160, 320, 353, 420]) {
      const kinds = ['full', 'mini', 'other', 'leaf', 'none'] as const;
      const marks = Array.from({ length: n }, (_, i) => ({ pct: [0, 100, 50, 50, 73][i % 5], mark: kinds[i % 5], dashed: i % 2 === 0 }));
      let t!: ReactTestRenderer;
      act(() => {
        t = create(<ScoreChart marks={marks} width={width} />);
      });
      expect(check(t)).toEqual([]);
      // The check really saw the drawing: paths, and the untimed mark's dash array.
      expect(t.root.findAll((x) => typeof x.props?.d === 'string').length).toBeGreaterThan(0);
      expect(t.root.findAll((x) => Array.isArray(x.props?.strokeDasharray)).length).toBeGreaterThan(0);
      // Every point inside the box.
      for (const [x, y] of chartPoints(marks.map((m) => m.pct), width)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(CHART.height);
      }
      act(() => t.unmount());
    }
  });

  it('flat and extreme values (all equal, 0 and 100) and the legend', () => {
    for (const values of [[66, 66, 66], [0, 0], [100, 100, 100, 100], [0, 100]]) {
      let t!: ReactTestRenderer;
      act(() => {
        t = create(<ScoreChart marks={lowMarks(values)} width={320} />);
      });
      expect(check(t)).toEqual([]);
      act(() => t.unmount());
    }
    const pts = mockTrend(EIGHT, 150);
    let t!: ReactTestRenderer;
    act(() => {
      t = create(
        <>
          <ScoreChart marks={trendMarks(pts)} width={353} />
          <TrendLegend points={pts} />
        </>,
      );
    });
    expect(check(t)).toEqual([]);
    act(() => t.unmount());
  });

  it('domain bars use whole-percent widths (never "67.5%", never NaN%)', () => {
    const readiness = computeReadiness(cisa, seedAnswers(7, 0.43));
    for (const row of domainBreakdown(cisa, readiness, EIGHT)) {
      let t!: ReactTestRenderer;
      act(() => {
        t = create(<DomainReportRow row={row} />);
      });
      expect(check(t)).toEqual([]);
      act(() => t.unmount());
    }
  });
});
