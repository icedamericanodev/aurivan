/**
 * Build E game screens, rendered against the real stores.
 * Root or Rumor: pick a level, tap through a round, cards are recorded (not
 * answers), the recap uses the statement line. Call It First: principle
 * cards first with the options hidden, then the options; the hint makes the
 * answer assisted; answers never set a mastery date; Heartwood hides the
 * options for 10 seconds.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { OptionCard } from '../components/quiz';
import { findQuestion } from '../content/loader';
import { getNotes } from '../content/notes';
import { buildRumorRound, rumorStatements, type StatementKind } from '../engine/games/rootOrRumor';
import { createRng } from '../engine/random';
import { selectCert, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import RootOrRumor from '../app/game/rumor';
import CallItFirst from '../app/game/callit';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
const pressable = (label: string) => root().findAll((n) => (n.props.accessibilityLabel === label || n.props.label === label) && typeof n.props.onPress === 'function');
const press = (label: string) =>
  act(() => {
    pressable(label)[0].props.onPress();
  });
const options = () => root().findAllByType(OptionCard);
const cp = () => selectCert(useProgress.getState(), 'cisa');

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

describe('Root or Rumor screen', () => {
  // The screen seeds each round with Date.now() (and Heartwood's "Why?"
  // choices too), so without this every run plays different statements.
  // Pinning the clock makes each test play the same round every run, so a
  // failure always reproduces. Only here: Call It First's 10-second countdown
  // needs a moving clock.
  const ROUND_SEED = Date.UTC(2026, 9, 31, 9, 0);
  let clock: jest.SpyInstance<number, []> | undefined;
  beforeEach(() => {
    clock = jest.spyOn(Date, 'now').mockReturnValue(ROUND_SEED);
  });
  afterEach(() => {
    clock?.mockRestore();
    clock = undefined;
  });

  it('plays a round: 12 statements, Root / Rumor buttons, cards recorded, never answers', () => {
    // Taps alternate Root, Rumor, Root... without reading the statement.
    const tapFor = (k: number): StatementKind => (k % 2 ? 'rumor' : 'root');
    // Guard for the "cards recorded" check below. A right tap on a brand-new
    // card stores nothing (engine/srs.ts); only a miss stores a card. About 1
    // round in 1,000 these taps are all right, which made this test fail at
    // random. Rebuild the pinned round the way the screen does (Seedling is
    // a new learner's level) and check the taps miss at least once.
    const round = buildRumorRound(rumorStatements(getNotes('cisa')), undefined, 'seedling', createRng(ROUND_SEED), ROUND_SEED);
    expect(round.filter((s, k) => s.kind !== tapFor(k)).length).toBeGreaterThan(0);

    mount(<RootOrRumor />);
    expect(allText()).toContain('Tell a sound principle from an exam myth.');
    expect(allText()).toContain('Pick your level');
    press('Start');
    expect(allText()).toContain('1 of 12');
    expect(pressable('Root, a sound principle').length).toBeGreaterThan(0);
    expect(pressable('Rumor, an exam myth').length).toBeGreaterThan(0);
    for (let k = 0; k < 12; k++) {
      // The screen plays the round the guard checked. If it stops seeding
      // from the clock, this fails instead of the test going flaky again.
      expect(allText()).toContain(round[k].text);
      press(tapFor(k) === 'rumor' ? 'Rumor, an exam myth' : 'Root, a sound principle');
      expect(allText()).toMatch(/Root: a sound principle|This one is a Root|Rumor: myth spotted|This one is a Rumor: a myth the exam counts on/);
      press(k === 11 ? 'See results' : 'Next statement');
    }
    expect(allText()).toContain('Round complete');
    expect(allText()).toContain('Longest run of right calls');
    expect(cp().gameBest.rumor).toBeGreaterThanOrEqual(0);
    // Statements are cards, not questions: no answers, no readiness.
    expect(Object.keys(cp().answers)).toHaveLength(0);
    expect(Object.keys(cp().cards ?? {}).length).toBeGreaterThan(0);
    if (cp().gameBest.rumor! < 12) expect(allText()).toContain('Missed statements come back in a later round.');
  });

  it('Heartwood asks "Why?" after a Rumor tap', () => {
    mount(<RootOrRumor />);
    press('Heartwood. All domains, plus “Why?” on each myth.');
    press('Start');
    // Tap Rumor until a statement really is a rumor (half of them are). The
    // pinned clock fixes the round; every Heartwood round has a myth with a
    // "Why?" (checked over 20,000 seeds), so any seed would pass.
    for (let k = 0; k < 12; k++) {
      press('Rumor, an exam myth');
      if (allText().includes('Why is it a myth?')) break;
      press('Next statement');
    }
    expect(allText()).toContain('Why is it a myth?');
    expect(options()).toHaveLength(3);
    act(() => {
      options()[0].props.onPress();
    });
    expect(allText()).toContain('Rumor: myth spotted');
  });
});

describe('Call It First screen', () => {
  it('step 1 hides the options; picking a principle shows them; the answer is recorded without mastery', () => {
    mount(<CallItFirst />);
    expect(allText()).toContain('Name the principle before you see the options.');
    press('Start');
    expect(allText()).toContain('Step 1: which principle does it test?');
    // Only the 3 principle cards: the 4 answer options are hidden.
    expect(options()).toHaveLength(3);
    act(() => {
      options()[0].props.onPress();
    });
    expect(allText()).toContain('Step 2: pick the BEST answer');
    const answerRows = options().filter((o) => typeof o.props.onPress === 'function');
    expect(answerRows).toHaveLength(4);
    act(() => {
      answerRows[0].props.onPress();
    });
    const [id, rec] = Object.entries(cp().answers)[0];
    expect(findQuestion('cisa', id)).toBeDefined();
    expect(rec.lastAssisted).toBeUndefined();
    expect(cp().mastery ?? {}).toEqual({});
  });

  it('the hint (pre-read) makes the answer assisted', () => {
    mount(<CallItFirst />);
    press('Start');
    press('Show a hint');
    expect(allText()).toContain('You used a hint, so a right answer counts as half.');
    act(() => {
      options()[0].props.onPress();
    });
    act(() => {
      options().filter((o) => typeof o.props.onPress === 'function')[0].props.onPress();
    });
    expect(Object.values(cp().answers)[0].lastAssisted).toBe(true);
  });

  it('Heartwood: no cards, options hidden for 10 seconds', () => {
    jest.useFakeTimers();
    mount(<CallItFirst />);
    press('Heartwood. No cards: think for 10 seconds, then answer.');
    press('Start');
    expect(allText()).toContain('Options hidden');
    expect(options()).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(10_500);
    });
    expect(options()).toHaveLength(4);
  });
});
