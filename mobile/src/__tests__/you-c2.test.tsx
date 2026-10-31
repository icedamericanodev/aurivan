/**
 * Grove You C2 on the phone (owner: "C with the improvements", 31 Oct 2026).
 *
 * Plain English for the founder: these tests open the You screen and check what a learner sees
 * and hears at the top: the date head, one summary sentence (built by the website's rules), a
 * "Practice {area}" button that starts the same set as Practice's Weak spots row, the plant chip
 * (it opens Your plant, or the picker with no plant), the stats words that follow Today, "Badges"
 * (never "Herbarium") and a Settings row near the end that opens the same Settings screen.
 */
import { Dimensions } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import { getAllQuestions } from '../content/loader';
import { getCertification } from '../content/certifications';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { plantNew } from '../engine/plant';
import { headDate } from '../components/fieldguide';
import { FOCUS_SET_SIZE } from '../lib/sessions';
import { readinessFor } from '../engine/readiness';
import You from '../app/(tabs)/you';

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
  router: { replace: jest.fn(), back: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(() => cb(), [cb]),
  useLocalSearchParams: () => ({}),
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance | string): string => (typeof n === 'string' ? n : n.children.map(textOf).join(''));
const allText = () => textOf(root());
const labels = () =>
  root()
    .findAll((n) => typeof n.type === 'string' && typeof n.props.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel as string);
const pressable = (label: RegExp) => root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && label.test(n.props.accessibilityLabel) && typeof n.props.onPress === 'function');
const press = (label: RegExp) => {
  const hit = pressable(label);
  if (!hit.length) throw new Error(`nothing to press for ${label}`);
  act(() => {
    hit[0].props.onPress();
  });
};
const mount = () =>
  act(() => {
    r = create(<You />);
  });
const cisa = getCertification('cisa')!;
const DASHES = /[\u2013\u2014]/;

/** `n` answers spread over the five domains, the first `right` of them right, today. */
const answer = (n: number, right = n) =>
  act(() => {
    getAllQuestions('cisa')
      .slice(0, n)
      .forEach((q, i) => useProgress.getState().recordAnswer('cisa', q.id, i < right));
  });

beforeEach(() => {
  (router.push as jest.Mock).mockClear();
  useProgress.getState().resetCert('cisa');
  // A reset keeps the plant on purpose (engine/plant.ts): take it away so each test starts with none.
  useProgress.getState().updatePlant('cisa', () => undefined);
  useProgress.setState({ streak: { current: 0, best: 0, lastDay: null, recentDays: [] } });
  useSession.getState().clear();
  useSettings.setState({ displayName: '', examDates: {} });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('the head and the summary sentence', () => {
  it('the date is the running head, said in full', () => {
    mount();
    const day = headDate(Date.now());
    expect(labels()).toContain(day.spoken);
    expect(allText().startsWith(day.shown)).toBe(true);
  });

  it('a new learner: no days, answer 40, Focus next: the first area, and "Practice {area}"', () => {
    mount();
    const first = cisa.domains[0].short;
    expect(allText()).toContain(`No study days yet this week. Answer 40 questions to see your first readiness range. Focus next: ${first}.`);
    expect(allText()).not.toContain('gain most');
    expect(pressable(new RegExp(`^Practice ${first}$`))).toHaveLength(1);
  });

  it('before 40 answers: the answers toward the first range, the focus with its reason, and the countdown', () => {
    const exam = new Date(Date.now() + 42 * 86_400_000);
    const key = `${exam.getFullYear()}-${String(exam.getMonth() + 1).padStart(2, '0')}-${String(exam.getDate()).padStart(2, '0')}`;
    useSettings.setState({ examDates: { cisa: key } });
    answer(34, 20);
    mount();
    const focus = cisa.domains.find((d) => d.id === readinessFor(cisa, selectCert(useProgress.getState(), 'cisa').answers).focusDomainId)!;
    const t = allText();
    expect(t).toContain('1 study day this week. 34 of 40 answers toward your first readiness range.');
    expect(t).toContain(`Focus next: ${focus.short}, where you’ll gain most · 42 days to go.`);
    // Said once, with a comma where the dot is.
    expect(labels().some((l) => l.endsWith(`Focus next: ${focus.short}, where you’ll gain most, 42 days to go.`))).toBe(true);
    // The sentence itself has no en or em dash (the chart's own placeholders are older, Phase 1).
    expect(labels().find((l) => l.startsWith('1 study day this week'))).not.toMatch(DASHES);
  });

  it('"Practice {area}" starts the focus area set (the same as Practice\'s Weak spots row) and opens it', () => {
    answer(12, 6);
    mount();
    const focusId = readinessFor(cisa, selectCert(useProgress.getState(), 'cisa').answers).focusDomainId!;
    const focus = cisa.domains.find((d) => d.id === focusId)!;
    press(new RegExp(`^Practice ${focus.short}$`));
    const s = useSession.getState().active!;
    expect(s.mode).toBe('practice');
    expect(s.title).toBe(focus.short);
    expect(s.questionIds.length).toBeLessThanOrEqual(FOCUS_SET_SIZE);
    const qs = new Map(getAllQuestions('cisa').map((q) => [q.id, q]));
    expect(s.questionIds.every((id) => qs.get(id)!.domainId === focusId)).toBe(true);
    expect(router.push).toHaveBeenCalledWith('/session');
  });
});

describe('the plant chip', () => {
  it('with a plant: "Your plant" over its name and growth; it opens Your plant', () => {
    act(() => {
      useProgress.getState().updatePlant('cisa', () => plantNew('oak', 'Bayani', Date.now()));
    });
    mount();
    const chip = root().findAll((n) => n.props.testID === 'you-plant-chip' && typeof n.type === 'string');
    expect(chip).toHaveLength(1);
    expect(textOf(chip[0])).toContain('Your plant');
    expect(textOf(chip[0])).toContain('Bayani · Seed · growth 1 of 6');
    expect(chip[0].props.accessibilityLabel).toMatch(/^Your plant: /);
    press(/^Your plant: /);
    expect(router.push).toHaveBeenCalledWith('/plant');
  });

  it('no plant: "Pick your plant" opens the picker; Show my plant off: no chip', () => {
    mount();
    expect(allText()).toContain('Pick your plant');
    press(/^Your plant: pick your plant/);
    expect(router.push).toHaveBeenCalledWith('/plant-pick');
    act(() => {
      r!.unmount();
    });
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: false });
    });
    mount();
    expect(root().findAll((n) => n.props.testID === 'you-plant-chip')).toHaveLength(0);
    act(() => {
      useProgress.getState().setPlantSettings({ showPlant: true });
    });
  });

  it('the chip is at least 48pt to the finger', () => {
    mount();
    const chip = root().findAll((n) => n.props.testID === 'you-plant-chip' && typeof n.type === 'string')[0];
    const flat = [chip.props.style].flat(Infinity).reduce((a: Record<string, unknown>, s) => ({ ...a, ...(s ?? {}) }), {});
    expect(flat.minHeight).toBeGreaterThanOrEqual(48);
  });
});

describe('the stats follow Today (DECISIONS 1 and 3)', () => {
  const stats = () => labels().filter((l) => /^(Answered|Accuracy|Streak|This week): /.test(l));

  it('from study day 14 the streak steps aside for this week\'s study days', () => {
    answer(40, 30);
    act(() => {
      const p = selectCert(useProgress.getState(), 'cisa');
      useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...p, milestones: { ...(p.milestones ?? { earned: {} }), days: 20 } as never } } }));
    });
    mount();
    const st = stats();
    expect(st.some((l) => l.startsWith('Streak:'))).toBe(false);
    expect(st).toContain('This week: 1 study day');
    expect(st).toContain('Accuracy: 75 percent');
  });
});

describe('Badges, never "Herbarium", and the Settings row', () => {
  it('the badges row says and shows "Badges"', () => {
    mount();
    expect(labels().some((l) => l.startsWith('Badges: your badges and field notes'))).toBe(true);
    expect(allText()).not.toMatch(/Herbarium|Field guide|Field record|Plate|Fig\./);
    expect(labels().join(' ')).not.toMatch(/Herbarium|Field guide|Field record|Fig\./);
  });

  it('a Settings row near the end, with the owner\'s line, opens the same Settings screen as the cog', () => {
    mount();
    const t = allText();
    expect(t).toContain('Name, exam date, dark mode, your data, help and about');
    // Near the end: after Help and feedback, before the trademark line.
    expect(t.indexOf('Get help or send feedback')).toBeLessThan(t.indexOf('Name, exam date, dark mode'));
    expect(t.indexOf('Name, exam date, dark mode')).toBeLessThan(t.indexOf('Not affiliated'));
    press(/^Settings, Name, exam date/);
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('at 200% text nothing is cut: the summary, the chip and the Settings row keep every word', () => {
    const w = Dimensions.get('window');
    act(() => Dimensions.set({ window: { ...w, fontScale: 2 }, screen: { ...w, fontScale: 2 } }));
    try {
      mount();
      const cut = root().findAll((n) => typeof n.type === 'string' && typeof n.props.numberOfLines === 'number' && /study days|Pick your plant|Name, exam date/.test(textOf(n)));
      expect(cut).toHaveLength(0);
      const chip = root().findAll((n) => n.props.testID === 'you-plant-chip' && typeof n.type === 'string')[0];
      const flat = [chip.props.style].flat(Infinity).reduce((a: Record<string, unknown>, s) => ({ ...a, ...(s ?? {}) }), {});
      expect(flat.alignSelf).toBe('stretch');
    } finally {
      act(() => Dimensions.set({ window: { ...w, fontScale: w.fontScale }, screen: { ...w, fontScale: w.fontScale } }));
    }
  });
});
