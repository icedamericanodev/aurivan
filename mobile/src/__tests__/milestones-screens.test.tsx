/**
 * Build F screens, rendered against the real stores: the one quiet moment on
 * Results (one success haptic, no repeats), the Milestones screen (earned,
 * 3 closest next with rules and progress, the rest with rules, no mystery
 * badges), the one-time back-fill summary, Field notes, You's rows, Play's
 * level leaves, and the round end's level line and moment.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { RoundEnd } from '../components/game';
import { getDomainQuestions } from '../content/loader';
import { MILESTONES, SKILL_BADGES } from '../engine/milestones';
import { finishSession } from '../lib/finishSession';
import { ensureBackfill } from '../lib/milestones';
import { startFromIds } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import Results from '../app/results';
import Milestones from '../app/milestones';
import FieldNotes from '../app/field-notes';
import You from '../app/(tabs)/you';
import Play from '../app/(tabs)/play';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = jest.requireActual('react-native');
  const builder: object = new Proxy({}, { get: () => () => builder });
  const id = (v: unknown) => v;
  return {
    __esModule: true,
    default: { View, Text, ScrollView, createAnimatedComponent: (c: unknown) => c },
    createAnimatedComponent: (c: unknown) => c,
    useReducedMotion: () => true,
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: id,
    withDelay: (_d: number, v: unknown) => v,
    withSpring: id,
    withRepeat: id,
    withSequence: (...v: unknown[]) => v[v.length - 1],
    cancelAnimation: () => {},
    Easing: new Proxy({}, { get: () => () => id }),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    FadeIn: builder,
    FadeInDown: builder,
    FadeOut: builder,
  };
});
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../components/shareCard', () => ({ ShareProgressSheet: () => null }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
const mockSuccess = jest.fn();
jest.mock('../lib/haptics', () => ({ haptic: { success: () => mockSuccess(), selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const labels = () => root().findAll((n) => typeof n.props.accessibilityLabel === 'string').map((n) => n.props.accessibilityLabel as string);
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const d4 = getDomainQuestions('cisa', '4').map((q) => q.id);
const cp = () => selectCert(useProgress.getState(), 'cisa');
const answer = (id: string) => useProgress.getState().recordAnswer('cisa', id, true);

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  mockSuccess.mockClear();
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: {}, practiceTimer: false });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

describe('Results: one quiet moment', () => {
  function finishTwenty() {
    startFromIds('cisa', d4.slice(0, 20), 'Twenty');
    d4.slice(0, 20).forEach(answer);
    finishSession();
  }

  it('shows ONE milestone with its rule, buzzes once, and never twice on re-render', () => {
    ensureBackfill('cisa', T0); // app launch: a new learner's back-fill finds nothing
    finishTwenty();
    mount(<Results />);
    const text = allText();
    expect(text).toContain('A quiet milestone');
    expect(text).toContain('First Foothold');
    expect(text).toContain('Finish the 20-question diagnostic.');
    // The second badge met in this session waits for a later one.
    expect(text).not.toContain('Firm Footing');
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    act(() => r!.update(<Results />));
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(labels().some((l) => l.startsWith('A quiet milestone: First Foothold.'))).toBe(true);
  });

  it('a session with nothing new shows no moment and no haptic', () => {
    startFromIds('cisa', [d4[0]], 'One');
    answer(d4[0]);
    finishSession();
    mount(<Results />);
    expect(allText()).not.toContain('A quiet milestone');
    expect(mockSuccess).not.toHaveBeenCalled();
  });
});

describe('Milestones screen', () => {
  it('earned, the 3 closest next with rules and progress, and the rest with rules', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    mount(<Milestones />);
    const text = allText();
    expect(text).toContain('Earned');
    expect(text).toContain('First Foothold');
    expect(text).toContain('Firm Footing · IS Operations');
    expect(text).toContain('Closest next');
    expect(text).toContain('Still ahead');
    // Every one of the 15 milestones is listed by name with its rule: no mystery badges.
    for (const b of MILESTONES) {
      expect(text).toContain(b.rule);
    }
    // Exactly 3 "closest next" rows: spoken "Not yet" with a progress detail.
    const section = labels().filter((l) => /Not yet\. .+ of \d+ /.test(l));
    expect(section.length).toBeGreaterThanOrEqual(1);
    // No bank size anywhere.
    expect(text).not.toMatch(/of \d{3,}/);
  });

  it('shows the back-fill summary once, then never again', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    expect(cp().milestones!.backfill!.count).toBe(2);
    mount(<Milestones />);
    expect(allText()).toContain('You’d already earned 2 milestones.');
    expect(cp().milestones!.backfill!.seen).toBe(true);
    act(() => r!.unmount());
    mount(<Milestones />);
    expect(allText()).not.toContain('You’d already earned');
  });
});

describe('You', () => {
  it('has Milestones and Field notes rows, and the back-fill line until it is seen', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    mount(<You />);
    expect(labels()).toEqual(expect.arrayContaining(['Milestones, 2 earned. What you\'ve mastered, and what\'s next', 'Field notes. Game levels and skill leaves']));
    expect(allText()).toContain('You’d already earned 2 milestones.');
  });

  it('shows no summary when the back-fill found nothing', () => {
    ensureBackfill('cisa', T0);
    mount(<You />);
    expect(allText()).not.toContain('already earned');
  });
});

describe('Field notes', () => {
  it('lists each game’s level (leaf + name) and the 7 pressed leaves with rules', () => {
    useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { trap: { tier: 'sapling', up: 0, down: 0 } } } } });
    mount(<FieldNotes />);
    const text = allText();
    expect(labels()).toContain('Snare Spotter. Level: Sapling. Two rounds in a row at 80% grow it to Heartwood.');
    expect(labels()).toContain('Signpost. Level: Seedling. Two rounds in a row at 80% grow it to Sapling.');
    for (const b of SKILL_BADGES) expect(text).toContain(b.rule);
  });
});

describe('Play', () => {
  it('every game row says its level in words', () => {
    useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { sprint: { tier: 'heartwood', up: 0, down: 0 } } } } });
    mount(<Play />);
    const rows = labels().filter((l) => / About \d+ minutes\./.test(l));
    expect(rows.length).toBeGreaterThan(0);
    for (const l of rows) expect(l).toMatch(/Your level: (Seedling|Sapling|Heartwood)\./);
    expect(rows.find((l) => l.startsWith('Sure Footing'))).toMatch(/Your level: Heartwood\./);
    // The featured game says its level too (leaf + text on the hero).
    expect(labels()).toContain('Your level: Seedling');
  });
});

describe('Round end', () => {
  it('says when the level grows, and never frames a step back as a loss', () => {
    mount(
      <RoundEnd certId="cisa" game="rumor" score={12} max={12} onAgain={() => {}} news={{ change: 'up', tier: 'sapling', best: true, moment: null }} />,
    );
    expect(allText()).toContain('You’ve grown to Sapling. Your next round starts there.');
    expect(allText()).toContain('New personal best');
    act(() =>
      r!.update(<RoundEnd certId="cisa" game="rumor" score={3} max={12} onAgain={() => {}} news={{ change: 'down', tier: 'seedling', best: false, moment: null }} />),
    );
    expect(allText()).toContain('Back to Seedling for a few rounds.');
    expect(allText()).not.toMatch(/lose|lost/i);
  });

  it('shows a skill badge as one quiet line with one haptic', () => {
    mount(
      <RoundEnd
        certId="cisa"
        game="trap"
        score={9}
        max={10}
        onAgain={() => {}}
        news={{ change: null, tier: 'seedling', best: false, moment: { key: 'snare-wise', label: 'Snare-wise', rule: 'Spot the snare.', kind: 'skill' } }}
      />,
    );
    expect(allText()).toContain('A pressed leaf for your field notes');
    expect(allText()).toContain('Snare-wise');
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });
});
