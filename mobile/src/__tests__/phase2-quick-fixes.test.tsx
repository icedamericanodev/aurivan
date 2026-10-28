/**
 * Mobile 1.8 quick fixes from the UI review (ui.md §1, PR 1 row):
 * T3 one set of rings on Today with the Exam-ready panel · T4 "Also today"
 * says the time, not a count · Y1 the theme switch stays on You · Y3 one phrasing
 * for the review queue · Y4 a way to start a mini mock from You · G2 the
 * Seedling tag said once on Play · R1/R2 Results for a one-domain session
 * (one ring, plain copy) · Q1 the "Assisted" line lines up with the coach
 * line · LP5 no disabled Back on a lesson's first scene (session-screen
 * regression test).
 *
 * Gotcha: never `act(() => store.action())` — use braces.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Today from '../app/(tabs)/home';
import You from '../app/(tabs)/you';
import Play from '../app/(tabs)/play';
import Results from '../app/results';
import SessionScreen from '../app/session';
import { OptionCard } from '../components/quiz';
import { GrowthRings } from '../components/glyphs';
import { getAllQuestions } from '../content/loader';
import { todaysPlan } from '../engine/planner';
import { finishSession } from '../lib/finishSession';
import { reviewSubtitle, startFromIds } from '../lib/sessions';
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
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));
// T3: put Today in its Exam-ready state (the real rule needs a week of logged readiness).
let mockReady = false;
jest.mock('../lib/moments', () => ({
  ...jest.requireActual('../lib/moments'),
  useTodayMoments: () => ({ ready: mockReady, dismissReady: () => {}, moment: null, reminders: null, pace: '' }),
}));

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const allText = () => textOf(root());
const buttons = (label: string | RegExp) =>
  root().findAll(
    (n) => typeof n.props.onPress === 'function' && n.props.accessibilityRole === 'button' && (typeof label === 'string' ? n.props.accessibilityLabel === label : label.test(n.props.accessibilityLabel ?? '')),
  );

beforeEach(() => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, fontScale: 1 }, screen: { ...w, fontScale: 1 } });
  });
  mockReady = false;
  useProgress.getState().resetCert('cisa');
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system' });
  (router.push as jest.Mock).mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

/** 45 answered questions: enough for a range, so Today's readiness row is there (Day 0 shows none). */
const answeredEnough = () =>
  act(() => {
    const answers: Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }> = {};
    getAllQuestions('cisa').slice(0, 45).forEach((q) => (answers[q.id] = { attempts: 1, correctCount: 1, lastCorrect: true, lastAt: Date.now() - 86_400_000 }));
    useProgress.setState((st) => ({ byCert: { ...st.byCert, cisa: { ...st.byCert.cisa!, answers } } }));
  });

describe('Today', () => {
  it('T3: with the Exam-ready panel, the rings appear once (in the panel), never twice', () => {
    mockReady = true;
    answeredEnough();
    mount(<Today />);
    expect(root().findAllByType(GrowthRings)).toHaveLength(1);
    // The panel's own rings: sap on the forest track (mobile 1.9 grows them with the moment).
    expect(root().findAllByType(GrowthRings)[0].props.colors).toBe('#A9D9BA');
    // The readiness numbers are still there, and still spoken.
    expect(root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Estimated readiness'))).not.toHaveLength(0);
  });

  it('T3: without the panel, the readiness row keeps its rings', () => {
    answeredEnough();
    mount(<Today />);
    expect(root().findAllByType(GrowthRings)).toHaveLength(1);
    // Mobile 1.21: the condensed readiness row draws the small `row` rings.
    expect(root().findAllByType(GrowthRings)[0].props.preset).toBe('row');
  });

  it('T4: "Also today" says how long the rest takes, not a count of a list that shows every item', () => {
    // An unfinished 10-question session: Also today lists "Resume", about 12 min.
    const ids = getAllQuestions('cisa').slice(0, 10).map((q) => q.id);
    act(() => {
      startFromIds('cisa', ids, 'Practice · All domains');
    });
    mount(<Today />);
    const text = allText();
    expect(text).toMatch(/Also today/);
    expect(text).toMatch(/Also today About 12 min/);
    expect(text).not.toMatch(/Also today \d+ more/);
  });
});

describe('You', () => {
  it('Y1 (mobile 1.17): You has no Appearance switch; the theme lives only in Settings → Appearance', () => {
    // The owner found the copy on You redundant once Settings was tidy.
    mount(<You />);
    expect(root().findAll((n) => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'Appearance')).toHaveLength(0);
    expect(root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /appearance$/i.test(n.props.accessibilityLabel))).toHaveLength(0);
    // Settings stays one tap away: the gear beside the title.
    expect(root().findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Settings' && n.props.accessibilityRole === 'button')).toHaveLength(1);
  });

  it('Y4: with no mocks yet, "Start a mini mock" opens the start sheet with a third of the exam', () => {
    mount(<You />);
    const start = buttons('Start a mini mock');
    expect(start).toHaveLength(1);
    act(() => {
      start[0].props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith({ pathname: '/mock-start', params: { questions: '50' } });
  });
});

describe('Y3: one phrasing for the review queue', () => {
  it('Today’s capped item says the whole queue, like You and Practice; the cap line is the same everywhere', () => {
    const plan = todaysPlan({ stage: 'practice', dueReviews: 55, dailyMinutes: 20, daysLeft: 40, examQuestions: 150 });
    // Mobile 1.15: a 20-minute day takes 8 of the 55, and keeps the whole queue for its title.
    expect(plan[0]).toMatchObject({ kind: 'review', count: 8, due: 55 });
    expect(reviewSubtitle(55)).toBe('20 ready today · oldest first');
  });
});

describe('Play', () => {
  it('G2: every game at Seedling is said once, in the section line, not on each row; rows still speak it', () => {
    mount(<Play />);
    expect(allText()).toMatch(/All at Seedling/);
    const rows = root().findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && /Your level: Seedling/.test(n.props.accessibilityLabel ?? ''));
    expect(rows.length).toBeGreaterThan(1);
    // The rows show no visible "Seedling" tag (only the hero's caption and the section line say it).
    expect(allText().match(/Seedling/g)!.length).toBe(2);
  });
});

describe('Results for a one-domain session (R1, R2) and the assisted line (Q1)', () => {
  const d1 = getAllQuestions('cisa').filter((q) => q.domainId === '1').slice(0, 3);
  const finishOneDomain = (rightCount: number) => {
    act(() => {
      startFromIds('cisa', d1.map((q) => q.id), 'Practice · IS Audit');
    });
    const s = useSession.getState();
    d1.forEach((q, i) => {
      act(() => {
        s.answer(q.id, { display: 'A', correct: i < rightCount, ms: 30_000 });
      });
    });
    act(() => {
      finishSession();
    });
  };

  it('R1: no ring for one domain (mobile 1.39), and the count said once', () => {
    finishOneDomain(2);
    mount(<Results />);
    // Mobile 1.39: the domain rings only for a mixed-domain set or a mock.
    expect(root().findAllByType(GrowthRings)).toHaveLength(0);
    const text = allText();
    // Mobile 1.24 (UX review S7): three questions are a handful, so the count is said once, in the
    // headline (no "All IS Audit · 2 of 3").
    expect(text).toMatch(/2 of 3 right/);
    expect(text.match(/2 of 3/g)).toHaveLength(1);
    expect(text).not.toMatch(/2\/3/);
    expect(text).not.toMatch(/IT Governance/);
    expect(text).not.toMatch(/–/);
  });

  it('R2: "Practice the one you missed" / "Practice the 2 you missed", never first person', () => {
    finishOneDomain(2);
    mount(<Results />);
    expect(buttons('Practice the one you missed')).toHaveLength(1);
    act(() => {
      r!.unmount();
    });
    r = undefined;
    useSession.getState().clear();
    finishOneDomain(1);
    mount(<Results />);
    expect(buttons('Practice the 2 you missed')).toHaveLength(1);
    expect(allText()).not.toMatch(/I missed/);
  });
});

describe('Q1', () => {
  /** Coach me, then answer: the right option, or a wrong one. */
  const answerHinted = (right: boolean) => {
    const q = getAllQuestions('cisa').find((x) => x.domainId === '1')!;
    act(() => {
      startFromIds('cisa', [q.id], 'Practice · IS Audit');
    });
    act(() => {
      useSession.getState().markCoached(q.id);
    });
    mount(<SessionScreen />);
    act(() => {
      root()
        .findAllByType(OptionCard)
        .find((o) => (o.props.text === q.options[q.correct]) === right)!
        .props.onPress();
    });
    act(() => {
      buttons('Check answer')[0].props.onPress();
    });
  };
  const indentOf = (re: RegExp) => {
    const t = root().findAll((n) => typeof n.type === 'string' && re.test(textOf(n)) && n.children.every((c) => typeof c === 'string'))[0];
    return t ? StyleSheet.flatten(t.props.style).marginLeft : undefined;
  };
  it('the hint line under the verdict starts where the coach line does (left 50)', () => {
    answerHinted(true);
    expect(indentOf(/^You used a hint, so this counts as half a right answer\.$/)).toBe(50);
    expect(indentOf(/^(Clean read\.|You picked the runner-up\. That’s the trap\.|Check who you are in the question\.)$/)).toBe(50);
  });
  it('UX review H1: a WRONG hinted answer never says it "counts as half a right answer"', () => {
    answerHinted(false);
    expect(allText()).not.toContain('half a right answer');
    expect(allText()).not.toContain('You used a hint');
  });
});
