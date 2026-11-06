/**
 * Release bug hunt round 3: a drill answer and a lesson's Finish saved the whole progress file
 * several times in one tap (2 on every drill miss, 6 or 7 on a round's last answer, 2 or 3 on Finish).
 * On a large save each write is about 370 KB of JSON on the JS thread. Now each tap saves once
 * (store/storage.ts batchSaves), and that one save holds the final state: the answer, the mistake
 * with the ORIGINAL letter, the round's best score and the lesson done.
 *
 * Counts saves, never milliseconds. Never `act(() => store.action())`: use braces.
 */
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ScrollView } from 'react-native';
import Signpost from '../app/game/priority';
import LessonPlayer from '../app/lesson/[id]';
import { OptionCard, StickyFooter } from '../components/quiz';
import { getAllQuestions } from '../content/loader';
import { CISA_LESSONS } from '../content/lessons/cisa';
import type { Letter, PackQuestion } from '../content/types';
import { useProgress } from '../store/progress';
import { useSettings } from '../store/settings';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  const { Pinwheel, Rings, Sprig, Sprout } = jest.requireActual('../components/glyphs');
  return new Proxy({ __esModule: true, ICON_STROKE: 2, Pinwheel, Rings, Sprig, Sprout } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
  useIsFocused: () => true,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

const KEY = 'aurivan.progress.v1';
let calls: { key: string; value: string }[] = [];
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@react-native-async-storage/async-storage');
  const AS = mod.default ?? mod;
  const real = AS.setItem;
  AS.setItem = (k: string, v: string) => {
    calls.push({ key: k, value: v });
    return real(k, v);
  };
});
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
const progressWrites = () => calls.filter((c) => c.key === KEY);
const savedCisa = () => JSON.parse(progressWrites()[progressWrites().length - 1].value).state.byCert.cisa;

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => JSON.stringify(r!.toJSON());
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
});
beforeEach(() => {
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', theme: 'light', shuffleOptions: false });
  useProgress.getState().resetCert('cisa');
});

/** The question on screen: the bank question whose stem and option texts are the ones shown. */
const current = (): PackQuestion => {
  const shown = new Set(root().findAllByType(OptionCard).map((o) => o.props.text as string));
  const text = allText();
  return getAllQuestions('cisa').find((q) => text.includes(JSON.stringify(q.stem).slice(1, 40)) && Object.values(q.options).every((t) => shown.has(t!)))!;
};

it('Signpost: a wrong answer saves progress once, and the last wrong answer of the round saves once too', async () => {
  act(() => {
    r = create(<Signpost />);
  });
  let rounds = 0;
  for (;;) {
    // Step 1: any meaning.
    const meaning = root().findAll((n) => n.props.kind === 'secondary' && typeof n.props.label === 'string' && typeof n.props.onPress === 'function')[0];
    if (!meaning) break;
    act(() => {
      meaning.props.onPress();
    });
    const q = current();
    expect(q).toBeDefined();
    // Step 2: a wrong option (shuffle is off, so display letter = original letter).
    const wrong = root().findAllByType(OptionCard).find((o) => o.props.letter !== q.correct)!;
    const letter = wrong.props.letter as Letter;
    await flush();
    calls = [];
    act(() => {
      wrong.props.onPress();
    });
    await flush();
    expect(progressWrites()).toHaveLength(1);
    const saved = savedCisa();
    expect(saved.answers[q.id]).toBeDefined();
    expect(saved.mistakes[q.id].picked).toBe(letter);
    rounds++;
    const next = root().findAll((n) => (n.props.label === 'Next question' || n.props.label === 'See results') && typeof n.props.onPress === 'function')[0];
    const last = next.props.label === 'See results';
    if (last) {
      // The last answer also finished the round: its best score is in the same single save.
      expect(saved.gameBest.priority).toBeDefined();
    }
    act(() => {
      next.props.onPress();
    });
    if (last) break;
  }
  expect(rounds).toBeGreaterThan(1);
});

it('a lesson Finish saves progress once, with the lesson done', async () => {
  jest.useFakeTimers();
  try {
    const lesson = CISA_LESSONS.find((l) => l.certId === 'cisa' && l.scenes[l.scenes.length - 1].type !== 'check') ?? CISA_LESSONS[0];
    mockParams = { id: lesson.id };
    act(() => {
      r = create(<LessonPlayer />);
    });
    act(() => {
      root().findByType(ScrollView).props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 393, height: 700 } } });
      root().findByType(StickyFooter).props.onHeight(100);
    });
    const press = (label: string) =>
      act(() => {
        root().findAll((n) => n.props.label === label && typeof n.props.onPress === 'function')[0].props.onPress();
      });
    for (let k = 0; k < lesson.scenes.length - 1; k++) {
      press('Next');
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
    const lastScene = lesson.scenes[lesson.scenes.length - 1];
    if (lastScene.type === 'check') {
      const opt = root().findAll((n) => typeof n.props.accessibilityLabel === 'string' && /^Option A:/.test(n.props.accessibilityLabel) && typeof n.props.onPress === 'function')[0];
      act(() => {
        opt.props.onPress();
      });
    }
    await act(async () => {
      await flush();
    });
    calls = [];
    press('Finish lesson');
    await act(async () => {
      await flush();
    });
    expect(progressWrites()).toHaveLength(1);
    expect(savedCisa().lessonsDone).toContain(lesson.id);
  } finally {
    jest.useRealTimers();
  }
});
