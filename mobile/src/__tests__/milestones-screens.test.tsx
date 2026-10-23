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
import { useSeen } from '../store/seen';
import { useSettings } from '../store/settings';
import Results from '../app/results';
import Milestones from '../app/milestones';
import FieldNotes from '../app/field-notes';
import You from '../app/(tabs)/you';
import Play from '../app/(tabs)/play';

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
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  // The case counts as seen while focused: a mounted screen is focused here.
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(cb, [cb]),
  useLocalSearchParams: () => mockParams,
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
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: {}, practiceTimer: false, badgesHidden: false });
  // Mobile 1.10: the 3-badge-moments-a-week cap starts empty in each test.
  useSeen.setState({ badgeMoments: [], caseSeen: {} });
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
    expect(text).toContain('A new badge · Groundwork');
    expect(text).toContain('First Foothold');
    // What the learner can now do, not the rule again.
    expect(text).toContain('You’ve mapped where you stand. Your plan now starts from it.');
    // The second badge met in this session waits for a later one (only the "Next:" line names a badge to come).
    expect(text.match(/A new badge/g)).toHaveLength(1);
    expect(text).not.toContain('Firm Footing · IS Operations');
    expect(text).toContain('Next: Firm Footing · Info Protection');
    // Its one success tap comes with its motion: once the rings have grown and it is on screen.
    expect(mockSuccess).not.toHaveBeenCalled();
    act(() => {
      for (const n of r!.root.findAll((x) => typeof x.type === 'string' && typeof x.props.onLayout === 'function')) {
        n.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 2000 } } });
      }
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    act(() => r!.update(<Results />));
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(labels().some((l) => l.startsWith('A new badge, Groundwork: First Foothold.'))).toBe(true);
  });

  it('a session with nothing new shows no moment and no haptic', () => {
    startFromIds('cisa', [d4[0]], 'One');
    answer(d4[0]);
    finishSession();
    mount(<Results />);
    expect(allText()).not.toContain('A new badge');
    expect(mockSuccess).not.toHaveBeenCalled();
  });
});

describe('Badges screen', () => {
  it('shelves with their own counts, every badge with its rule a tap away, no grand total', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    mount(<Milestones />);
    const text = allText();
    for (const shelf of ['Groundwork', 'The Five Domains', 'Evergreen', 'Sound Judgement', 'Exam Day', 'Rooted', 'Field notes']) expect(text).toContain(shelf);
    // Moments appears only once something on it happened (a Fresh Start is never a goal).
    expect(text).not.toContain('Moments');
    // Per-set counts only ("1 of 3"), and no "n of 22"-style total.
    expect(labels()).toContain('Groundwork, 1 of 3');
    expect(labels()).toContain('The Five Domains, 1 of 6');
    expect(labels()).not.toContain('Moments');
    expect(text).not.toMatch(/\bof (15|20|22|23|30)\b(?! (study days|answered|questions|“sure”))/);
    // Every badge is one button whose label holds its exact rule: no mystery badges.
    const buttons = labels();
    for (const b of [...MILESTONES, ...SKILL_BADGES].filter((x) => x.id !== 'fresh-start')) expect(buttons.some((l) => l.includes(b.rule.replace(/\.$/, '')))).toBe(true);
    expect(buttons.some((l) => l.startsWith('Firm Footing · IS Operations, Clay. Earned'))).toBe(true);
    // No bank size anywhere (the only 3-digit target is Long Memory's own top tier, 150 recalls).
    expect(text.replace(/of 150 remembered/g, '')).not.toMatch(/of \d{3,}/);
  });

  it('shows the back-fill summary once, then never again', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    expect(cp().milestones!.backfill!.count).toBe(2);
    mount(<Milestones />);
    expect(allText()).toContain('You’d already earned 2 badges.');
    expect(cp().milestones!.backfill!.seen).toBe(true);
    act(() => r!.unmount());
    mount(<Milestones />);
    expect(allText()).not.toContain('You’d already earned');
  });
});

describe('You', () => {
  it('has ONE Badges and field notes row (mobile 1.24), and the back-fill line until it is seen', () => {
    d4.slice(0, 20).forEach(answer);
    ensureBackfill('cisa', T0);
    mount(<You />);
    expect(labels()).toContain("Badges and field notes, 2 earned. What you've mastered, and your level in each game");
    expect(labels().some((l) => l.startsWith('Field notes'))).toBe(false); // merged into the row above
    expect(allText()).toContain('You’d already earned 2 badges.');
    // Shown once: You marks it seen, and the line stays for this visit.
    expect(cp().milestones!.backfill!.seen).toBe(true);
    expect(allText()).toContain('You’d already earned 2 badges.');
    // Only the text is grouped for screen readers; the button stays reachable on its own (UX review H1).
    const group = r!.root.findAll((n) => n.props.accessible === true && typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes('already earned'));
    expect(group.length).toBeGreaterThan(0);
    for (const g of group) expect(g.findAll((n) => n.props.label === 'See your badges')).toHaveLength(0);
    expect(r!.root.findAll((n) => n.props.label === 'See your badges').length).toBeGreaterThan(0);
  });

  it('shows no summary when the back-fill found nothing, and says "none yet"', () => {
    ensureBackfill('cisa', T0);
    mount(<You />);
    expect(allText()).not.toContain('already earned');
    expect(labels()).toContain("Badges and field notes, none yet. What you've mastered, and your level in each game");
  });
});

describe('Field notes', () => {
  it('lists each game’s level (leaf + name) and links to the skill badges in the case', () => {
    useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { trap: { tier: 'sapling', up: 0, down: 0 } } } } });
    mount(<FieldNotes />);
    expect(labels()).toContain('Snare Spotter. Level: Sapling. Two rounds in a row at 80% or more, at your level, grow it to Heartwood.');
    expect(labels()).toContain('Signpost. Level: Seedling. Two rounds in a row at 80% or more, at your level, grow it to Sapling.');
    expect(labels()).toContain('Your skill badges. None yet. Opens your badges.');
  });

  it('with badges hidden, shows game levels only', () => {
    useSettings.setState({ badgesHidden: true });
    mount(<FieldNotes />);
    expect(labels().some((l) => l.startsWith('Your skill badges'))).toBe(false);
  });
});

describe('Play', () => {
  it('every game row says its level in words', () => {
    useProgress.setState({ byCert: { cisa: { ...cp(), gameGrowth: { sprint: { tier: 'heartwood', up: 0, down: 0 } } } } });
    mount(<Play />);
    // Mobile 1.24: three games are in sight; the rest are folded under "More games". Open it.
    const more = root().findAll((n) => typeof n.props.onPress === 'function' && /^More games/.test(String(n.props.accessibilityLabel)))[0];
    act(() => {
      more.props.onPress();
    });
    const rows = labels().filter((l) => / About \d+ minutes\./.test(l));
    expect(rows.length).toBeGreaterThan(0);
    for (const l of rows) expect(l).toMatch(/Your level: (Seedling|Sapling|Heartwood)\./);
    expect(rows.find((l) => l.startsWith('Forecast'))).toMatch(/Your level: Heartwood\./);
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
    expect(allText()).toContain('Back to Seedling. Two strong rounds grow it again.');
    expect(allText()).not.toMatch(/lose|lost/i);
  });

  // Mobile 1.40: an InviteRow (an award on the paper), never a ruled quote; the whole row opens it in Badges.
  it('shows a skill badge as one quiet InviteRow with one haptic', () => {
    mount(
      <RoundEnd
        certId="cisa"
        game="trap"
        score={9}
        max={10}
        onAgain={() => {}}
        news={{ change: null, tier: 'seedling', best: false, moment: { key: 'snare-wise', label: 'Snare-wise', rule: 'Spot the snare.', kind: 'skill', set: 'fieldNotes', setName: 'Field notes', unlock: 'You spot the snare 8 times in 10.' } }}
      />,
    );
    expect(allText()).toContain('A new badge: Snare-wise');
    expect(allText()).toContain('You spot the snare 8 times in 10.');
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    const row = r!.root.findAll((n) => n.props.testID === 'recap-badge' && n.props.accessibilityRole === 'button')[0];
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe('A new badge: Snare-wise. You spot the snare 8 times in 10.');
    // No coach rule: nothing on the recap draws the 3pt accent left rule.
    expect(r!.root.findAll((n) => typeof n.type === 'string' && JSON.stringify(n.props.style ?? {}).includes('"borderLeftWidth":3'))).toHaveLength(0);
  });
});
