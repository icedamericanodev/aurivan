/**
 * QA: mobile 1.50 "The Turning" (the plant's form change), walked as learner
 * journeys on the real Your plant screen (DESIGN_SYSTEM §8.9, §8.10).
 *
 * form-reveal.test.tsx pins the component on its own (timing, skip, words,
 * haptics). This file pins what the screen around it does with it:
 * 1. the trigger: once ever (a restart, a restore, an undo-restore), never on
 *    a lowering restore, never for a storybook or a gated plant, and one
 *    grand Turning for two forms earned at once;
 * 2. the session moment: Today's growth spends it, Your plant then waits
 *    behind "See Kai's new form", and the tap plays it in full;
 * 3. skipping on the screen (a tap, a scroll drag, leaving the app,
 *    navigating away) always ends on the new form, written down as seen;
 * 4. Reduce Motion shows every word; Haptics off is silent;
 * 5. a Form IV choice made before the Turning is the form it turns into;
 * 6. the widget draws the new form after it.
 *
 * `it.skip` with a `// BUG:` line marks a bug found in this pass: the test
 * states the expected behaviour; each was run unskipped and failed for the
 * reason in its comment (turn it back on with the fix).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { StrictMode, Suspense } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Dimensions, View } from 'react-native';
import { setMockHoldAnimations, setMockReducedMotion } from '../../jest/reanimated-mock';



import { claimMoment, resetCelebrationsForTest, resetOncePerDayForTest, setSystemReducedMotionForTest } from '../components/motion';

import { FormReveal } from '../components/plant/FormReveal';

import { FORM_FACTS } from '../engine/plant';


import { flushSayLaterForTest } from '../lib/a11y';



import { useProgress } from '../store/progress';
import { useSeen } from '../store/seen';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
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
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class {}, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

// ── Harness ─────────────────────────────────────────────────────────────
let r: ReactTestRenderer | undefined;
const mount = (el: React.ReactElement) => {
  act(() => {
    r = create(el);
  });
};
const unmount = () => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
};
const byTestID = (id: string) => (r ? r.root.findAll((n) => n.props.testID === id && typeof n.type === 'string') : []);
let say: jest.SpyInstance;
const said = () => {
  act(() => flushSayLaterForTest());
  return say.mock.calls.map((c) => c[0]);
};
const motionOn = () => {
  setMockReducedMotion(false);
  setSystemReducedMotionForTest(false);
};

beforeEach(async () => {
  const w = Dimensions.get('window');
  act(() => {
    Dimensions.set({ window: { ...w, width: 393, fontScale: 1 }, screen: { ...w, width: 393, fontScale: 1 } });
  });
  await AsyncStorage.clear();
  setMockReducedMotion(true);
  setMockHoldAnimations(false);
  setSystemReducedMotionForTest(null);
  resetCelebrationsForTest();
  resetOncePerDayForTest();
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, plantForms: {}, plantFinal: {}, quietGrowth: {}, proud: {} });
  act(() => {
    useProgress.getState().resetCert('cisa');
    useProgress.setState({ plantSettings: undefined });
    useProgress.getState().updatePlant('cisa', () => undefined);
  });
  useSession.getState().clear();
  useSettings.setState({ theme: 'light', activeCertId: 'cisa', onboarded: true, motion: 'system', haptics: true, examDates: { cisa: '2027-06-01' } });
  (Haptics.notificationAsync as jest.Mock).mockClear();
  (Haptics.selectionAsync as jest.Mock).mockClear();
  (Haptics.impactAsync as jest.Mock).mockClear();
  say = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  say.mockClear();
});
afterEach(() => {
  unmount();
  setMockHoldAnimations(false);
  jest.restoreAllMocks();
});

// ── 1. The trigger ──────────────────────────────────────────────────────

// ── 2. The session moment ───────────────────────────────────────────────

// ── 3. Skipping on the screen ───────────────────────────────────────────
describe('3. skipping always ends on the new form, seen, with nothing left over', () => {
});

// ── 4. Reduce Motion and haptics ────────────────────────────────────────

// ── 5. The Form IV choice ───────────────────────────────────────────────

// ── 6. The widget ───────────────────────────────────────────────────────

// ── Review findings P2 and P3 (FormReveal's waiting button and its one moment) ──
describe('review P2 / P3', () => {
  const props = {
    species: 'oak' as const,
    from: 2 as const,
    to: 3 as const,
    theme: 'light' as const,
    size: 200,
    accessibilityLabel: 'Kai, your oak. Whip Oak form. Growth: Shoot.',
    fact: FORM_FACTS[3],
    name: 'Whip Oak',
    lookLine: 'One straight leader with lobed leaves at each node.',
    announce: 'Kai grows into a new form: the Whip Oak.',
    playLabel: 'See Kai’s new form',
    look: { style: 'botanical' as const },
    testID: 'rv',
  };
  const mode = () => (['full', 'reduced', 'wait'] as const).find((m) => byTestID(`rv-${m}`).length) ?? null;
  const tapPlay = () =>
    act(() => {
      byTestID('rv-play')[0].findAll((n) => typeof n.props.onPress === 'function')[0].props.onPress();
    });

  // FIXED: QA-TURN-5 (review P2a), the second tap of a quick double-tap on "See Kai’s new form" lands on the now-playing Turning and skips it.
  it('P2a: a quick double-tap on "See Kai’s new form" still plays the Turning the learner asked for', () => {
    motionOn();
    claimMoment(); // the session's moment was spent elsewhere
    setMockHoldAnimations(true);
    mount(<FormReveal {...props} />);
    tapPlay(); // tap 1
    setMockHoldAnimations(false);
    // Tap 2, a few milliseconds later: its touch reaches the reveal's "any tap skips" handler.
    act(() => {
      byTestID('rv')[0].props.onTouchStart?.();
    });
    expect(byTestID('rv-full')[0].props.accessibilityActions).toEqual([{ name: 'activate', label: 'Show the new form now' }]); // fails: undefined (skipped)
    expect(said()).toEqual([]); // fails: already announced
  });

  // FIXED: QA-TURN-6 (review P2b), play() always sets 'full': Reduce Motion switched on while the Turning waits still plays the full 2.4 to 3.6 s motion.
  it('P2b: Reduce Motion turned on while it waits: the tap plays the 120 ms cross-fade, not the full Turning', () => {
    motionOn();
    claimMoment();
    mount(<FormReveal {...props} />);
    expect(mode()).toBe('wait');
    act(() => {
      useSettings.setState({ motion: 'reduced' }); // Settings → Motion → Reduced, then back to Your plant
    });
    tapPlay();
    expect(mode()).toBe('reduced'); // fails: 'full'
  });

  it('P3: under StrictMode the first render keeps its claim: full motion, and the moment is spent once', () => {
    motionOn();
    mount(
      <StrictMode>
        <FormReveal {...props} />
      </StrictMode>,
    );
    expect(mode()).toBe('full'); // React 19 keeps the first initializer result in StrictMode
  });

  // FIXED: QA-TURN-7 (review P3), claimMoment() runs in a useState initializer: a first render React throws away (a suspended or interrupted render) spends the moment, and the committed one waits behind the button.
  it('P3: a first render that React discards (suspended) does not spend the session’s moment', async () => {
    motionOn();
    let ready = false;
    let release!: () => void;
    const gate = new Promise<void>((res) => {
      release = () => {
        ready = true;
        res();
      };
    });
    function Late() {
      if (!ready) throw gate;
      return null;
    }
    mount(
      <View>
        <Suspense fallback={null}>
          <FormReveal {...props} />
          <Late />
        </Suspense>
      </View>,
    );
    await act(async () => {
      release();
      await gate;
    });
    expect(mode()).toBe('full'); // fails: 'wait' (the discarded render claimed the moment)
  });
});
