/**
 * The dated-item tag (docs/content/CIA_BANK_PLAN.md section 11, item 6).
 *
 * Plain English: a practice or review question whose `testableFrom` date is
 * still ahead (by the phone's own calendar) shows the neutral tag "On the exam
 * from 1 March 2027", seen and spoken the same, on the question screen and in
 * the review list. On that date it is gone. A question without the field
 * (every live course) never shows it.
 *
 * Fixture: CISA questions with a made-up date (put back after the tests).
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { examDateLabel } from '../components/examDateTag';
import { getAllQuestions } from '../content/loader';
import { waitingUntil } from '../engine/blueprint';
import { isoFullDate, onExamFromLabel } from '../lib/format';
import { finishSession } from '../lib/finishSession';
import { startFromIds } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import SessionScreen from '../app/session';
import Results from '../app/results';

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

const TAG = 'On the exam from 1 March 2027';
/** Local noon on a calendar day (the phone's own date, whatever its time zone). */
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

describe('the rule and the words', () => {
  const q = (testableFrom?: string) => ({ testableFrom });

  it('a date still ahead gives the date; on the day and after, nothing', () => {
    expect(waitingUntil(q('2027-03-01'), '2026-11-27')).toBe('2027-03-01');
    expect(waitingUntil(q('2027-03-01'), '2027-02-28')).toBe('2027-03-01');
    expect(waitingUntil(q('2027-03-01'), '2027-03-01')).toBeNull();
    expect(waitingUntil(q('2027-03-01'), '2027-09-01')).toBeNull();
  });

  it('no date (every live course) or a broken one: never a tag', () => {
    expect(waitingUntil(q(), '2026-11-27')).toBeNull();
    expect(waitingUntil(q('2027-3-1'), '2026-11-27')).toBeNull();
    expect(examDateLabel(q(), at(2026, 11, 27))).toBeNull();
  });

  it('day, full month and year', () => {
    expect(isoFullDate('2027-03-01')).toBe('1 March 2027');
    expect(isoFullDate('2027-12-31')).toBe('31 December 2027');
    expect(isoFullDate('soon')).toBe('soon');
    expect(onExamFromLabel('2027-03-01')).toBe(TAG);
  });

  it('by the phone’s local date: shown the day before, gone on the day', () => {
    expect(examDateLabel(q('2027-03-01'), at(2027, 2, 28))).toBe(TAG);
    expect(new Date(at(2027, 3, 1)).getDate()).toBe(1);
    expect(examDateLabel(q('2027-03-01'), at(2027, 3, 1))).toBeNull();
    // Just after local midnight on the day: already gone.
    expect(examDateLabel(q('2027-03-01'), new Date(2027, 2, 1, 0, 1).getTime())).toBeNull();
  });
});

describe('on screen', () => {
  const bank = getAllQuestions('cisa');
  const dated = bank[30];
  const plain = bank[31];
  let r: ReactTestRenderer | undefined;
  const mount = (el: React.ReactElement) => {
    act(() => {
      r = create(el);
    });
  };
  const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(' '));
  /** Host views whose spoken label is exactly the tag. */
  const spokenTags = () => r!.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === TAG);

  beforeAll(() => {
    dated.testableFrom = '2027-03-01';
  });
  afterAll(() => {
    delete dated.testableFrom;
  });
  beforeEach(() => {
    useProgress.getState().resetCert('cisa');
    useSession.getState().clear();
    useSettings.setState({ onboarded: true, activeCertId: 'cisa' });
  });
  afterEach(() => {
    act(() => r?.unmount());
    r = undefined;
    jest.useRealTimers();
  });

  /** A practice of the dated question then a plain one, on this day. */
  function practiceOn(y: number, m: number, d: number) {
    jest.useFakeTimers({ now: new Date(y, m - 1, d, 10, 0, 0) });
    act(() => {
      startFromIds('cisa', [dated.id, plain.id], 'Practice');
    });
  }

  it('the question screen shows the tag, seen and spoken the same, before the date', () => {
    practiceOn(2027, 2, 28);
    mount(<SessionScreen />);
    expect(textOf(r!.root)).toContain(TAG);
    expect(spokenTags()).toHaveLength(1);
  });

  it('the question screen shows no tag on the date', () => {
    practiceOn(2027, 3, 1);
    mount(<SessionScreen />);
    expect(textOf(r!.root)).not.toContain('On the exam from');
  });

  it('a question with no date shows no tag', () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 27, 10, 0, 0) });
    act(() => {
      startFromIds('cisa', [plain.id], 'Practice');
    });
    mount(<SessionScreen />);
    expect(textOf(r!.root)).not.toContain('On the exam from');
  });

  /** Finish the practice (both answered) and open Results. */
  function finishAndShowResults() {
    act(() => {
      for (const id of [dated.id, plain.id]) useSession.getState().answer(id, { display: 'A', correct: true, ms: 20_000 });
    });
    act(() => {
      finishSession();
    });
    mount(<Results />);
  }

  it('the review list says it on the dated row only (in its spoken label too), before the date', () => {
    practiceOn(2026, 11, 27);
    finishAndShowResults();
    expect(textOf(r!.root)).toContain(TAG);
    const rows = r!.root.findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string' && /^Question \d, /.test(n.props.accessibilityLabel));
    const labels = [...new Set(rows.map((n) => n.props.accessibilityLabel as string))];
    expect(labels).toEqual([`Question 1, Correct. ${TAG}.`, 'Question 2, Correct.']);
  });

  it('the review list has no tag on the date', () => {
    practiceOn(2027, 3, 1);
    finishAndShowResults();
    expect(textOf(r!.root)).not.toContain('On the exam from');
  });
});
