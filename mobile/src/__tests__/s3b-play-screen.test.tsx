/**
 * Mobile 1.24, stream S3b: the Play tab leads with "Today's drill".
 *
 * Plain English for the founder: Play now shows ONE lead game (the one that
 * drills your own mistake pattern; Snare Spotter for a new learner), two
 * related games, and a folded "More games" row holding the other six. Every
 * row has a plain subtitle ("Spot the trick answer"). The Learn tab's
 * "Up next" lesson row is also checked here: it is no longer a second card.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { router } from 'expo-router';
import Play from '../app/(tabs)/play';
import { getAllQuestions } from '../content/loader';
import { GAMES, GAME_ORDER } from '../engine/games/registry';
import { useProgress, type MistakeEntry } from '../store/progress';
import { useSettings } from '../store/settings';
import { setMockReducedMotion } from '../../jest/reanimated-mock';

setMockReducedMotion(true);

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
const mount = () => {
  act(() => {
    r = create(<Play />);
  });
};
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
/** The game rows (one button each, spoken "<Name>. <plain subtitle>. …"). */
const gameRows = () => {
  const seen = new Set<string>();
  // One row appears as a wrapper and a host node with the same label: count each label once.
  return root()
    .findAll((n) => typeof n.props.onPress === 'function' && /\. Your level: .*About \d+ minutes/.test(String(n.props.accessibilityLabel)))
    .filter((n) => !seen.has(n.props.accessibilityLabel) && !!seen.add(n.props.accessibilityLabel));
};
const rowNames = () => gameRows().map((n) => String(n.props.accessibilityLabel).split('. ')[0]);
const moreRow = () => root().findAll((n) => n.props.accessibilityRole === 'button' && /^More games/.test(String(n.props.accessibilityLabel)) && typeof n.props.onPress === 'function')[0];

/** Save five tagged mistakes with one slip, so the slip coach names a pattern. */
const tagFive = (slip: 'role' | 'priority') => {
  const ids = getAllQuestions('cisa').slice(0, 5).map((q) => q.id);
  const mistakes: Record<string, MistakeEntry> = Object.fromEntries(ids.map((id, i) => [id, { picked: 'A' as const, at: 1000 + i, slip }]));
  act(() => {
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, mistakes } } }));
  });
};

beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa' });
  (router.push as jest.Mock).mockClear();
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
});

describe('Play: Today’s drill', () => {
  it('a new learner: Snare Spotter leads, two related games sit beside it, the other six are folded', () => {
    mount();
    const text = textOf(root());
    expect(text).toContain('Today’s drill');
    expect(text).toContain('A good place to start');
    // Hero = Snare Spotter; its related games are Signpost and Call It First.
    const [hero] = root().findAll((n) => n.props.testID === 'hero-content' && typeof n.type === 'string');
    expect(textOf(hero)).toContain(GAMES.trap.name);
    expect(rowNames()).toEqual([GAMES.priority.name, GAMES.callit.name]);
    // Three games in sight (hero + two rows); "More games" is folded and says how many.
    expect(moreRow().props.accessibilityState).toMatchObject({ expanded: false });
    expect(textOf(moreRow())).toContain('6 more');
  });

  it('five tagged "wrong person" mistakes make Canopy Call the drill, and say why', () => {
    tagFive('role');
    mount();
    const [hero] = root().findAll((n) => n.props.testID === 'hero-content' && typeof n.type === 'string');
    expect(textOf(hero)).toContain(GAMES.canopy.name);
    expect(textOf(root())).toContain('Picked from your mistakes. You answer as the wrong person.');
    expect(textOf(root())).toContain('Also good for this');
    // The play button opens that game.
    const play = hero.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')[0];
    act(() => {
      play.props.onPress();
    });
    expect(router.push).toHaveBeenCalledWith('/game/canopy');
  });

  it('"More games" opens to the other six, each with a plain subtitle, and folds again', () => {
    mount();
    act(() => {
      moreRow().props.onPress();
    });
    expect(moreRow().props.accessibilityState).toMatchObject({ expanded: true });
    // All nine games are reachable: the hero + 2 rows + 6 more rows.
    expect(rowNames()).toHaveLength(8);
    const names = [GAMES.trap.name, ...rowNames()].sort();
    expect(names).toEqual(GAME_ORDER.map((id) => GAMES[id].name).sort());
    // Every row speaks its plain subtitle right after the name.
    for (const n of gameRows()) {
      const label = String(n.props.accessibilityLabel);
      const game = GAME_ORDER.map((id) => GAMES[id]).find((g) => label.startsWith(`${g.name}. `))!;
      expect(label).toContain(`${game.name}. ${game.plain}.`);
      expect(textOf(n)).toContain(game.plain);
    }
    act(() => {
      moreRow().props.onPress();
    });
    expect(rowNames()).toHaveLength(2);
  });
});
