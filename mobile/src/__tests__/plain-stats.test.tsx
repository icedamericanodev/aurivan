/**
 * Mobile 1.11 "plain stats" (owner request): every stat row reads at a
 * glance. A short label first ("Correct", "Missed", "Time"), then a value
 * that means something alone ("1 of 1", "None", "Under a minute", "24 min",
 * "5 days"). The pace line is one plain sentence, shown only when it helps.
 *
 * Gotcha: never `act(() => store.action())` — use braces.
 */
import { Dimensions, StyleSheet } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import Results from '../app/results';
import { Stat, StatRow } from '../components/ui';
import { getAllQuestions } from '../content/loader';
import { DomainRings, clearingLine } from '../components/journey';
import { PacingPanel } from '../components/pace';
import { getCertification } from '../content/certifications';
import { logActivity, newDayPlan } from '../engine/dayPlan';
import { computeReadiness } from '../engine/readiness';
import { aboutSeconds, durationWords, mockPacing, practicePaceLine, timeStat } from '../engine/pace';
import { ANSWER_TIME_CAP_MS, finishSession, msUsed } from '../lib/finishSession';
import { startFromIds, startMock } from '../lib/sessions';
import { useSession, type ActiveSession } from '../store/session';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
/** The spoken labels of the stat cells (host views only, once each). */
const statLabels = () =>
  r!.root
    .findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && /^(Correct|Missed|Time): /.test(n.props.accessibilityLabel))
    .map((n) => n.props.accessibilityLabel as string);
const IDS = getAllQuestions('cisa').slice(20, 40).map((q) => q.id);

afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

/** A finished practice of `n` questions, `right` of them right, each answered in `ms`, over `wallMs`. */
function practice(n: number, right: number, ms: number, wallMs: number) {
  jest.useFakeTimers({ now: new Date(2026, 9, 12, 10, 0, 0) });
  act(() => {
    startFromIds('cisa', IDS.slice(0, n), 'Practice');
  });
  act(() => {
    IDS.slice(0, n).forEach((id, i) => useSession.getState().answer(id, { display: 'A', correct: i < right, ms }));
  });
  jest.setSystemTime(Date.now() + wallMs);
  act(() => {
    finishSession();
  });
  mount(<Results />);
}

describe('time as a stat', () => {
  it('never says "1 minute" for seconds; minutes and hours read plainly', () => {
    // Mobile 1.21: "<1" "min", the numeral form, so a 3-up stat row keeps one
    // baseline ("Under 1 min" wrapped at 360 dp); spoken in full.
    expect(timeStat(5_000)).toEqual({ value: '<1', unit: 'min', spoken: 'under a minute' });
    expect(timeStat(59_999).value).toBe('<1');
    expect(timeStat(60_000)).toEqual({ value: '1', unit: 'min', spoken: '1 minute' });
    expect(timeStat(23 * 60_000)).toEqual({ value: '23', unit: 'min', spoken: '23 minutes' });
    // An hour or more: one phrase in one size, so "3 h 35 min" never reads as a big "3".
    expect(timeStat(65 * 60_000)).toEqual({ word: '1\u00a0h 5\u00a0min', spoken: '1 hour 5 minutes' });
    expect(timeStat(215 * 60_000)).toEqual({ word: '3\u00a0h 35\u00a0min', spoken: '3 hours 35 minutes' });
    expect(timeStat(240 * 60_000)).toEqual({ word: '4\u00a0h', spoken: '4 hours' });
    // The same words wherever a time used is shown.
    expect(durationWords(30_000)).toEqual({ text: 'Under 1 min', spoken: 'under a minute' });
    expect(durationWords(211 * 60_000)).toEqual({ text: '3 h 31 min', spoken: '3 hours 31 minutes' });
  });

  it('a time per question is "about N seconds", or minutes past two; rounded before the unit is chosen', () => {
    expect(aboutSeconds(1)).toBe('about 1 second');
    expect(aboutSeconds(74.4)).toBe('about 74 seconds');
    expect(aboutSeconds(119.4)).toBe('about 119 seconds');
    expect(aboutSeconds(119.6)).toBe('about 2 min');
    expect(aboutSeconds(150)).toBe('about 2.5 min');
  });

  it('the pace sentence gives both figures their unit, the same unit (seconds, always: mobile 1.15 C2)', () => {
    const exam = getCertification('cisa')!.exam;
    expect(practicePaceLine([74_000, 74_000, 74_000], exam)).toBe('About 74 seconds per question. The exam allows about 96 seconds.');
    expect(practicePaceLine([119_600, 119_600, 119_600], exam)).toBe('About 120 seconds per question. The exam allows about 96 seconds.');
  });
});

describe('Results', () => {
  it('a 1-question, 5-second practice: "Correct 1 of 1", "Missed None", "Time <1 min", and no pace line', () => {
    practice(1, 1, 5_000, 5_000);
    expect(statLabels()).toEqual(['Correct: 1 of 1', 'Missed: none', 'Time: under a minute']);
    const text = textOf(r!.root);
    expect(text).toContain('Correct 1 of 1 Missed None Time <1 min');
    // One answer says nothing useful about pace.
    expect(text).not.toMatch(/per question/);
    expect(text).not.toMatch(/Median|exam pace|to review/);
  });

  it('a 20-question practice: the counts, the time, and one plain pace sentence', () => {
    practice(20, 14, 70_000, 23 * 60_000);
    expect(statLabels()).toEqual(['Correct: 14 of 20', 'Missed: 6', 'Time: 23 minutes']);
    expect(textOf(r!.root)).toContain('About 70 seconds per question. The exam allows about 96 seconds.');
  });
});

describe('Stat and StatRow', () => {
  it('the label comes first, then the value; spoken as one phrase', () => {
    mount(
      <StatRow>
        {[<Stat key="a" label="Streak" value="5" unit="days" />, <Stat key="b" label="Accuracy" value="72" pct />, <Stat key="c" label="Missed" word="None" />]}
      </StatRow>,
    );
    const cells = r!.root.findAll((n) => typeof n.type === 'string' && n.props.accessible === true).map((n) => n.props.accessibilityLabel);
    expect(cells).toEqual(['Streak: 5 days', 'Accuracy: 72 percent', 'Missed: none']);
    expect(textOf(r!.root)).toBe('Streak 5 days Accuracy 72 % Missed None');
  });

  it('at large text the row becomes a list: each stat a row, label left and value right, still spoken as one phrase', () => {
    const w = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...w, fontScale: 2 }, screen: { ...w, fontScale: 2 } }));
    try {
      mount(<StatRow>{[<Stat key="a" label="Answered" value="340" />, <Stat key="b" label="Streak" value="5" unit="days" />]}</StatRow>);
      const cells = r!.root.findAll((n) => typeof n.type === 'string' && n.props.accessible === true);
      expect(cells.map((n) => n.props.accessibilityLabel)).toEqual(['Answered: 340', 'Streak: 5 days']);
      for (const cell of cells) expect(StyleSheet.flatten(cell.props.style)).toMatchObject({ flexDirection: 'row', justifyContent: 'space-between' });
    } finally {
      act(() => Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } }));
    }
  });

  it('labels never truncate: no line limits anywhere in a stat', () => {
    mount(<Stat label="Questions" value="31" />);
    expect(r!.root.findAll((n) => n.props.numberOfLines !== undefined)).toHaveLength(0);
  });
});

describe('the same time everywhere (QA bugs 2, 3, 5, 7)', () => {
  const cisa = getCertification('cisa')!;
  const T = new Date(2026, 9, 12, 10, 0, 0).getTime();
  const session = (over: Partial<ActiveSession>): ActiveSession =>
    ({ id: 's', certId: 'cisa', mode: 'practice', title: 'Practice', questionIds: IDS.slice(0, 3), perms: {}, responses: {}, startedAt: T, ...over }) as ActiveSession;

  it('practice and review: the answer times added up, each at most 3 minutes, never the wall clock', () => {
    const responses = { [IDS[0]]: { display: 'A', correct: true, ms: 40_000 }, [IDS[1]]: { display: 'A', correct: true, ms: 9 * 3_600_000 } } as ActiveSession['responses'];
    // Left open overnight: 40 s + 3 min, not 10 hours.
    expect(msUsed(session({ responses, finishedAt: T + 10 * 3_600_000 }))).toBe(40_000 + ANSWER_TIME_CAP_MS);
    // A session saved before answers had times: wall time, at most 3 minutes a question.
    expect(msUsed(session({ responses: { [IDS[0]]: { display: 'A', correct: true } } as ActiveSession['responses'], finishedAt: T + 3_600_000 }))).toBe(3 * ANSWER_TIME_CAP_MS);
    // A timed mock keeps the exam clock.
    expect(msUsed(session({ mode: 'mock', deadline: T + 3_600_000, finishedAt: T + 2 * 3_600_000 }))).toBe(3_600_000);
  });

  it('today’s plan keeps seconds and rounds only for display: a 5-second session never reads "1 min"', () => {
    const readiness = computeReadiness(cisa, {});
    let plan = newDayPlan('2026-10-12', 'cisa', [{ kind: 'review', count: 5 }], readiness);
    plan = logActivity(plan, { kind: 'session', mode: 'review', answered: 1, total: 1, minutes: 5_000 / 60_000 }).plan;
    expect(timeStat(plan.minutes * 60_000).value).toBe('<1');
    // Short sessions add up.
    for (let i = 0; i < 11; i++) plan = logActivity(plan, { kind: 'session', mode: 'review', answered: 1, total: 1, minutes: 5_000 / 60_000 }).plan;
    expect(timeStat(plan.minutes * 60_000)).toMatchObject({ value: '1', unit: 'min' });
  });

  it('the pacing panel says "Under 1 min of …" like the Time stat, and the last-10% row reads plainly', () => {
    const pacing = mockPacing({
      startedAt: T,
      endedAt: T + 30_000,
      allowedMs: 80 * 60_000,
      total: 50,
      answers: [
        ...Array.from({ length: 9 }, (_, i) => ({ correct: i < 6, ms: 2_000, at: T + 1_000 + i, domainId: '1' })),
        { correct: true, ms: 2_000, at: T + 29_000, domainId: '1' },
      ],
    });
    mount(<PacingPanel pacing={pacing} cert={cisa} />);
    const t = textOf(r!.root);
    expect(t).toContain('Time used Under 1 min of 1 h 20 min');
    expect(t).toContain('Last 10% of the time 100% right (67% before that)');
    expect(t).not.toMatch(/the rest/);
  });

  it('a mock with blanks: Correct + Missed = total, and one line says the blanks count', () => {
    jest.useFakeTimers({ now: T });
    act(() => {
      startMock('cisa', 50);
    });
    const ids = useSession.getState().active!.questionIds;
    act(() => {
      ids.slice(0, 40).forEach((id, i) => useSession.getState().answer(id, { display: 'A', correct: i < 30, ms: 60_000, at: Date.now() }));
    });
    jest.setSystemTime(T + 50 * 60_000);
    act(() => {
      finishSession();
    });
    mount(<Results />);
    expect(statLabels()).toEqual(['Correct: 30 of 50', 'Missed: 20, 10 of them left blank', 'Time: 50 minutes']);
    expect(textOf(r!.root)).toContain('Missed includes 10 left blank: a blank counts as not correct.');
  });
});

describe('the Results ring legend at 360 dp (UX H1)', () => {
  it('sits under the rings on a narrow phone; the score never shrinks, the name may wrap', () => {
    const cisa = getCertification('cisa')!;
    const w = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...w, width: 360 }, screen: { ...w, width: 360 } }));
    try {
      mount(<DomainRings cert={cisa} values={[0.5, 0.6, 0.7, 0.8, 0.9]} legendValue={() => '26/38'} center={null} accessibilityLabel="Score" />);
      const outer = r!.root.findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.gap === 16)[0] ?? r!.root.findAll((n) => typeof n.type === 'string')[0];
      expect(StyleSheet.flatten(outer.props.style)).toMatchObject({ flexDirection: 'column' });
      // Mobile 1.24: below 380 wide the exam's short tile names are used ("Governance", never "Governan / ce"), on one line.
      const names = r!.root.findAll((n) => typeof n.type === 'string' && n.children.includes('Governance'));
      expect(StyleSheet.flatten(names[0].props.style)).toMatchObject({ flex: 1, flexShrink: 1, minWidth: 0 });
      expect(names[0].props.numberOfLines).toBe(1);
      const nums = r!.root.findAll((n) => typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.flexShrink === 0);
      expect(nums).toHaveLength(5);
    } finally {
      act(() => Dimensions.set({ window: { ...w, width: w.width }, screen: { ...w, width: w.width } }));
    }
  });

  it('the readiness range never breaks after its dash', () => {
    const cisa = getCertification('cisa')!;
    const readiness = { ...computeReadiness(cisa, {}), score: 0.7 };
    const plan = newDayPlan('2026-10-12', 'cisa', [{ kind: 'review', count: 1 }], computeReadiness(cisa, {}));
    expect(clearingLine(plan, readiness, { enough: true, low: 67, high: 77 } as never)).toBe('Readiness grew to 67–\u206077%');
  });
});
