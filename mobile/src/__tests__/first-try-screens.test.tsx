/**
 * First-try courses on screen (docs/content/CIA_BANK_PLAN.md section 11, item 7, first half).
 *
 * - The readiness report: "First tries by section" shows only for a course
 *   with `readinessRule: 'firstTry'`, with the plan's exact lines; CISA's
 *   report has no such block.
 * - The mock start sheet: a short mock that must reuse seen questions says so
 *   BEFORE the start; CISA's mini mock sheet is unchanged.
 *
 * The fixture is neutral: CISA's own descriptor with the setting (and a
 * lettered section style) switched on for one test, then switched off.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import MockStart from '../app/mock-start';
import ReadinessReport from '../app/readiness';
import { resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';
import { getCertification } from '../content/certifications';
import { getAllQuestions } from '../content/loader';
import type { Certification } from '../content/types';
import { addDays } from '../engine/examDay';
import type { AnswerRecord } from '../engine/readiness';
import { dayKey } from '../engine/streak';
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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const cisa = getCertification('cisa')! as Certification;
const DAY = 86_400_000;

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
const byTestID = (id: string) => root().findAll((n) => n.props.testID === id && typeof n.type === 'string');
const optIn = () => {
  cisa.readinessRule = 'firstTry';
  cisa.domainStyle = { noun: 'Section', numbering: 'letter' };
};

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
  delete cisa.readinessRule;
  delete cisa.domainStyle;
  jest.restoreAllMocks();
});

/** First tries in each domain: `n[d]` tries, about 70% right, a minute apart. */
function seedFirstTries(n: Record<string, number>) {
  const answers: Record<string, AnswerRecord> = {};
  const now = Date.now() - DAY;
  for (const d of cisa.domains) {
    getAllQuestions('cisa')
      .filter((q) => q.domainId === d.id)
      .slice(0, n[d.id] ?? 0)
      .forEach((q, i) => {
        const right = i % 10 < 7;
        const at = now + i * 60_000;
        answers[q.id] = { attempts: 1, correctCount: right ? 1 : 0, lastCorrect: right, lastAt: at, first: { correct: right, assisted: false, at } };
      });
  }
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, answers } } }));
  });
}

describe('readiness report', () => {
  it('CISA: no first-try block at all (the screen is as before)', () => {
    seedFirstTries({ '1': 40 });
    mount(<ReadinessReport />);
    expect(byTestID('first-tries')).toHaveLength(0);
    expect(allText()).not.toMatch(/first tries/i);
  });

  it('an opted-in course: one row per section, with the plan’s lines; never a scaled score, a pass mark or "likely"', () => {
    optIn();
    seedFirstTries({ '1': 40, '2': 12, '3': 6 });
    mount(<ReadinessReport />);
    expect(byTestID('first-tries')).toHaveLength(1);
    const t = allText();
    expect(t).toContain('First tries by section');
    expect(t).toContain('28 of 40 first tries right (70%)');
    expect(t).toContain('9 of 12 first tries right (75%) · early read');
    expect(t).toContain('Too few to say yet (6 answered)');
    expect(t).toContain('Section A · ');
    // Everything the block shows or says: never a scaled score, 600, a pass mark or "likely".
    const block = byTestID('first-tries')[0];
    const shownText: string[] = [];
    const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? shownText.push(n) : n.children.forEach(walk));
    walk(block);
    const spoken = block.findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
    expect(spoken.join(' ')).toMatch(/Section A, .*28 of 40 first tries right \(70%\)/);
    expect([...shownText, ...spoken].join(' ')).not.toMatch(/scaled|\b600\b|\bpass|likely/i);
    for (const d of cisa.domains) expect(byTestID(`first-tries-${d.id}`)).toHaveLength(1);
  });
});

describe('mock start sheet', () => {
  const mini = () => String(Math.round(cisa.exam.questions / 3));

  it('CISA mini mock: unchanged, no reuse notice', () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ questions: mini() });
    mount(<MockStart />);
    expect(byTestID('mock-reuses-seen')).toHaveLength(0);
    expect(allText()).toContain(`${mini()} questions · `);
  });

  it('an opted-in course, all fresh: no notice', () => {
    optIn();
    jest.mocked(useLocalSearchParams).mockReturnValue({ questions: mini() });
    mount(<MockStart />);
    expect(byTestID('mock-reuses-seen')).toHaveLength(0);
  });

  it('an opted-in course that must reuse seen questions: said before the start', () => {
    optIn();
    const small = [...cisa.domains].sort((x, y) => x.weight - y.weight)[0];
    const ids = getAllQuestions('cisa').filter((q) => q.domainId === small.id).slice(2).map((q) => q.id);
    act(() => {
      useProgress.getState().noteShown('cisa', ids, Date.now() - DAY);
    });
    jest.mocked(useLocalSearchParams).mockReturnValue({ questions: mini() });
    mount(<MockStart />);
    const note = byTestID('mock-reuses-seen');
    expect(note).toHaveLength(1);
    expect(allText()).toMatch(/This mock reuses \d+ questions you have seen; those won’t count toward readiness\./);
  });
});
