/**
 * Mobile 1.18: the "Graduate" badge is now "Flown the Nest", and it can be
 * shared. Plain English for the founder: the badge's saved id (`graduate`),
 * its counter (`graduated`) and the planter rules are NOT renamed, so a
 * phone that already earned it on 1.17 opens 1.18 and simply sees the new
 * name, still earned, now with a Share button. These tests load a save
 * shaped exactly like 1.17 writes it, through the real store (AsyncStorage
 * → migrate → rehydrate), then open the badge case.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Badges from '../app/milestones';
import { BadgeShareCard } from '../components/shareCard';
import { resetCelebrationsForTest } from '../components/motion';
import { getCertification } from '../content/certifications';
import { PLANTER_NEEDS } from '../engine/milestones';
import { lookItem } from '../engine/plantLooks';
import { badgeCardText, badgeShareable, isHonestShareText } from '../engine/shareCard';
import { badgeCase } from '../lib/milestones';
import { selectCert, useProgress } from '../store/progress';
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
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => '/tmp/card.png'), releaseCapture: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false },
  useFocusEffect: (cb: () => void | (() => void)) => jest.requireActual('react').useEffect(cb, [cb]),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('../lib/haptics', () => ({ haptic: { success: () => {}, selection: () => {}, error: () => {}, light: () => {} } }));

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const textOf = (n: ReactTestInstance) => {
  const out: string[] = [];
  const walk = (x: ReactTestInstance | string) => (typeof x === 'string' ? out.push(x) : x.children.forEach(walk));
  walk(n);
  return out.join(' ');
};
const buttons = (label: RegExp) => root().findAll((x) => typeof x.props.onPress === 'function' && typeof x.props.accessibilityLabel === 'string' && label.test(x.props.accessibilityLabel));
const press = (label: RegExp) => {
  const n = buttons(label)[0];
  if (!n) throw new Error(`no button ${label}`);
  act(() => n.props.onPress());
};
const T0 = new Date(2026, 9, 12, 10, 0, 0).getTime();
const DAY = 86_400_000;
const EARNED = new Date(2026, 8, 20, 9).getTime();

/** A progress save exactly as mobile 1.17 writes it (persist key, version 2, the old id and counter). */
function save117() {
  return {
    state: {
      byCert: {
        cisa: {
          answers: {},
          review: {},
          mistakes: {},
          mocks: [],
          milestones: {
            earned: { 'long-memory': EARNED - 10 * DAY, graduate: EARNED },
            counts: { longRecall: 25, graduated: 50 },
            backfill: { at: T0 - 90 * DAY, count: 0, seen: true },
            catalog: 2,
          },
        },
      },
      streak: { current: 0, best: 3, lastDay: null },
      today: { day: '', answered: 0 },
      days: {},
    },
    version: 2,
  };
}

beforeEach(async () => {
  jest.useFakeTimers({ now: T0 });
  setMockReducedMotion(true);
  resetCelebrationsForTest();
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: {}, badgesHidden: false });
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, badgeSort: undefined });
  useProgress.setState(useProgress.getInitialState(), true);
  await AsyncStorage.clear();
  await AsyncStorage.setItem('aurivan.progress.v1', JSON.stringify(save117()));
  await useProgress.persist.rehydrate();
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

describe('a 1.17 save with Graduate earned, opened on 1.18', () => {
  it('keeps the saved id, counter and date untouched', () => {
    const m = selectCert(useProgress.getState(), 'cisa').milestones!;
    expect(m.earned.graduate).toBe(EARNED);
    expect(m.counts?.graduated).toBe(50);
    // The Evergreen planter still needs the same ids (saved planters stay valid).
    expect(PLANTER_NEEDS.evergreen).toContain('graduate');
  });

  it('shows "Flown the Nest" earned, with a Share that builds an honest card', () => {
    const mark = badgeCase('cisa', selectCert(useProgress.getState(), 'cisa')).marks.find((x) => x.key === 'graduate')!;
    expect(mark.name).toBe('Flown the Nest');
    expect(mark.status).toBe('earned');
    expect(mark.earnedAt).toBe(EARNED);
    expect(badgeShareable({ ...mark, badge: 'graduate' })).toBe(true);
    const card = badgeCardText({ badge: 'graduate', name: mark.name, skill: mark.skill, set: mark.set, status: mark.status, earnedOn: '20 Sept 2026' }, getCertification('cisa')!);
    expect([card.name, card.skill, card.caption, card.headline].every(isHonestShareText)).toBe(true);
    expect(card.notice).toBe('Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA.');

    act(() => {
      r = create(<Badges />);
    });
    press(/^Flown the Nest\. Earned/);
    const sheet = () => root().findByType(Modal);
    expect(textOf(sheet())).toContain('Answer 50 questions right from the last review box, so they leave review.');
    press(/^Share Flown the Nest$/);
    const shown = textOf(root().findByType(BadgeShareCard));
    expect(shown).toContain('Flown the Nest');
    expect(shown).toContain('Recalled 50 answers weeks apart');
    expect(shown).toContain('Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA.');
    expect(textOf(sheet())).not.toMatch(/graduat/i);
  });

  it('an unearned Flown the Nest keeps its "n of 50" progress visible', () => {
    act(() => {
      useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...m!, earned: { 'long-memory': EARNED - 10 * DAY }, counts: { longRecall: 25, graduated: 12 } } }));
    });
    const mark = badgeCase('cisa', selectCert(useProgress.getState(), 'cisa')).marks.find((x) => x.key === 'graduate')!;
    expect(mark.status).not.toBe('earned');
    expect(mark.detail).toBe('12 of 50 left review');
  });

  it('the Empty nest keepsake says how to earn it in plain words', () => {
    expect(lookItem('empty-nest')!.how).toBe('Clear questions out of review');
  });
});
