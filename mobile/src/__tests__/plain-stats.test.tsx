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
import { aboutSeconds, timeStat } from '../engine/pace';
import { finishSession } from '../lib/finishSession';
import { startFromIds } from '../lib/sessions';
import { useSession } from '../store/session';

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
    expect(timeStat(5_000)).toEqual({ word: 'Under a minute', spoken: 'under a minute' });
    expect(timeStat(59_999).word).toBe('Under a minute');
    expect(timeStat(60_000)).toEqual({ value: '1', unit: 'min', spoken: '1 minute' });
    expect(timeStat(23 * 60_000)).toEqual({ value: '23', unit: 'min', spoken: '23 minutes' });
    expect(timeStat(65 * 60_000)).toEqual({ value: '1', unit: 'h 5 min', spoken: '1 hour 5 minutes' });
    expect(timeStat(240 * 60_000)).toEqual({ value: '4', unit: 'h', spoken: '4 hours' });
  });

  it('a time per question is "about N seconds", or minutes past two', () => {
    expect(aboutSeconds(1)).toBe('about 1 second');
    expect(aboutSeconds(74.4)).toBe('about 74 seconds');
    expect(aboutSeconds(150)).toBe('about 2.5 minutes');
  });
});

describe('Results', () => {
  it('a 1-question, 5-second practice: "Correct 1 of 1", "Missed None", "Time Under a minute", and no pace line', () => {
    practice(1, 1, 5_000, 5_000);
    expect(statLabels()).toEqual(['Correct: 1 of 1', 'Missed: none', 'Time: under a minute']);
    const text = textOf(r!.root);
    expect(text).toContain('Correct 1 of 1 Missed None Time Under a minute');
    // One answer says nothing useful about pace.
    expect(text).not.toMatch(/per question/);
    expect(text).not.toMatch(/Median|exam pace|to review/);
  });

  it('a 20-question practice: the counts, the time, and one plain pace sentence', () => {
    practice(20, 14, 70_000, 23 * 60_000);
    expect(statLabels()).toEqual(['Correct: 14 of 20', 'Missed: 6', 'Time: 23 minutes']);
    expect(textOf(r!.root)).toContain('About 70 seconds per question. The exam gives you about 96.');
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
