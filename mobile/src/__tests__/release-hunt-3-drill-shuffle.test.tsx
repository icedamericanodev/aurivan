/**
 * Release bug hunt round 3: Practice → Drills shuffled the answer options even with
 * Settings → Shuffle answer options turned off. Now the drills' shared round builder (useRound:
 * Snare Spotter, Signpost, Forecast, Daylight) and Call It First keep the bank's order when it is off.
 * Grading still runs on the ORIGINAL letters either way.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useEffect } from 'react';
import CallItFirst from '../app/game/callit';
import { useRound } from '../components/game';
import { OptionCard } from '../components/quiz';
import { findQuestion, getAllQuestions } from '../content/loader';
import { identityPermutation, type Permutation } from '../engine/shuffle';
import type { PackQuestion } from '../content/types';
import { selectCert, useProgress } from '../store/progress';
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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) =>
  act(() => {
    r = create(el);
  });
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});
beforeEach(() => {
  useProgress.getState().resetCert('cisa');
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', shuffleOptions: true });
});

const IDS = getAllQuestions('cisa').slice(0, 20).map((q) => q.id);
type Round = { q: PackQuestion; perm: Permutation }[];
let got: Round = [];
const build = () => IDS;
const keep = (x: Round) => {
  got = x;
};
function Probe() {
  const { round } = useRound('cisa', build);
  useEffect(() => keep(round), [round]);
  return null;
}
const shuffledCount = () => got.filter(({ q, perm }) => perm.join('') !== identityPermutation(q).join('')).length;

describe('drill rounds follow Settings → Shuffle answer options', () => {
  it('off: every drill item keeps the bank order', () => {
    useSettings.setState({ shuffleOptions: false });
    mount(<Probe />);
    expect(got).toHaveLength(20);
    expect(shuffledCount()).toBe(0);
  });

  it('on: the options are shuffled as before', () => {
    mount(<Probe />);
    expect(shuffledCount()).toBeGreaterThan(0);
  });

  it('Call It First with the switch off shows A to D as written', () => {
    useSettings.setState({ shuffleOptions: false });
    mount(<CallItFirst />);
    const press = (label: string) =>
      act(() => {
        r!.root.findAll((n) => (n.props.accessibilityLabel === label || n.props.label === label) && typeof n.props.onPress === 'function')[0].props.onPress();
      });
    press('Start');
    act(() => {
      r!.root.findAllByType(OptionCard)[0].props.onPress();
    });
    const rows = r!.root.findAllByType(OptionCard).filter((o) => typeof o.props.onPress === 'function');
    expect(rows).toHaveLength(4);
    const shown = rows.map((o) => o.props.text as string);
    act(() => {
      rows[0].props.onPress();
    });
    const id = Object.keys(selectCert(useProgress.getState(), 'cisa').answers)[0];
    const q = findQuestion('cisa', id)!;
    expect(shown).toEqual([q.options.A, q.options.B, q.options.C, q.options.D]);
  });
});
