/**
 * Mobile 1.11, slice D: sharing a badge. Only an earned, shareable badge's
 * sheet offers Share; it opens the card INSIDE the same sheet (never a sheet
 * over a sheet, never on its own); the card carries "Studying for the CISA®
 * exam", the full trademark notice and "KaiSip study badge · Earned …";
 * "Share image" captures the card and hands it to the system sheet. Fresh
 * Start is never shareable, and sharing earns nothing.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { Modal } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { setMockReducedMotion } from '../../jest/reanimated-mock';
import Badges from '../app/milestones';
import { BadgeShareCard } from '../components/shareCard';
import { cardText } from '../components/badges';
import { getCertification } from '../content/certifications';
import { badgeCase } from '../lib/milestones';
import { resetCelebrationsForTest } from '../components/motion';
import { getDomainQuestions } from '../content/loader';
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
const earn = (key: string, at: number) =>
  act(() => {
    useProgress.getState().updateMilestones('cisa', (m) => ({ milestones: { ...(m ?? { earned: {} }), earned: { ...(m?.earned ?? {}), [key]: at } } }));
  });

beforeEach(() => {
  jest.useFakeTimers({ now: T0 });
  setMockReducedMotion(true);
  resetCelebrationsForTest();
  useProgress.setState({ byCert: {}, streak: { current: 0, best: 0, lastDay: null }, today: { day: '', answered: 0 }, days: {} });
  useSession.getState().clear();
  useSettings.setState({ onboarded: true, activeCertId: 'cisa', examDates: {}, badgesHidden: false });
  useSeen.setState({ values: {}, moments: {}, badgeMoments: [], caseSeen: {}, badgeSort: undefined });
  // A back-fill already ran (nothing found), so nothing reads "By …".
  act(() => {
    useProgress.getState().updateMilestones('cisa', () => ({ milestones: { earned: {}, backfill: { at: T0 - 90 * DAY, count: 0, seen: true }, catalog: 2 } }));
  });
  getDomainQuestions('cisa', '4')
    .slice(0, 30)
    .forEach((q) => useProgress.getState().recordAnswer('cisa', q.id, true));
});
afterEach(() => {
  act(() => r?.unmount());
  r = undefined;
  jest.useRealTimers();
});

describe('sharing a badge', () => {
  it('an earned badge’s sheet offers Share; it shows the card in the same sheet, with every required word', async () => {
    earn('long-memory', new Date(2026, 10, 3, 9).getTime());
    act(() => {
      r = create(<Badges />);
    });
    press(/^Long Memory · 25 recalls, Clay\. Earned/);
    const sheet = () => root().findByType(Modal);
    // Nothing opened on its own: the details first.
    expect(textOf(sheet())).not.toContain('Share this badge');
    press(/^Share Long Memory · 25 recalls$/);
    expect(root().findAllByType(Modal)).toHaveLength(1); // never a sheet over a sheet
    const t = textOf(sheet());
    expect(t).toContain('Share this badge');
    expect(t).toContain('Only what is on the card is shared.');
    expect(t).toContain('KaiSip study badge · Earned 3 Nov 2026');
    // The card's title is the plain badge name; the tier line and skill line carry the numbers.
    const cardText = textOf(root().findByType(BadgeShareCard));
    expect(cardText).toContain('Long Memory');
    expect(cardText).not.toContain('Long Memory · 25 recalls');
    expect(t).toContain('Clay · tier 1 of 3');
    expect(t).toContain('Recalled 25 answers a week or more later');
    expect(t).toContain('Studying for the CISA® exam');
    expect(t).toContain('Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA.');
    // No profile, credential or reward wording anywhere in the sheet.
    expect(t).not.toMatch(/LinkedIn|Licenses|add to profile|certificat|credential|verif|earn a|unlock/i);
    // The card is one image to a screen reader, spoken in full.
    const card = root().findByType(BadgeShareCard).parent!;
    expect(card.props.accessibilityRole).toBe('image');
    expect(card.props.accessibilityLabel).toContain('Studying for the CISA® exam');
    expect(card.props.accessibilityLabel).toContain('Not affiliated with or endorsed by ISACA®');
    // Share image: capture at 1080 × 1350, then the system sheet. Nothing is earned for it.
    const before = JSON.stringify(selectCert(useProgress.getState(), 'cisa').milestones);
    await act(async () => {
      buttons(/^Share image$|^Share$/).find((b) => b.props.accessibilityHint?.includes('share sheet'))!.props.onPress();
    });
    expect(captureRef).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ width: 1080, height: 1350, format: 'png' }));
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/card.png', expect.objectContaining({ mimeType: 'image/png', dialogTitle: 'Share badge' }));
    expect(JSON.stringify(selectCert(useProgress.getState(), 'cisa').milestones)).toBe(before);
    // Back returns to the badge's details.
    press(/^Back to the badge$/);
    expect(textOf(sheet())).toContain('The rule');
  });

  it('Android back on the card returns to the badge, never closes the sheet', () => {
    earn('long-memory', T0 - DAY);
    act(() => {
      r = create(<Badges />);
    });
    press(/^Long Memory · 25 recalls, Clay\. Earned/);
    press(/^Share Long Memory · 25 recalls$/);
    const modal = () => root().findByType(Modal);
    expect(textOf(modal())).toContain('Share this badge');
    act(() => modal().props.onRequestClose());
    expect(root().findAllByType(Modal)).toHaveLength(1);
    expect(textOf(modal())).toContain('The rule');
    expect(textOf(modal())).not.toContain('Share this badge');
    // From the details, back closes the sheet as before.
    act(() => modal().props.onRequestClose());
    expect(root().findAllByType(Modal).every((m) => m.props.visible === false)).toBe(true);
  });

  it('a Firm Footing card: "Firm Footing", its tier, then the domain and the number in the skill line', () => {
    earn('firm-footing:4', T0 - DAY);
    act(() => {
      r = create(<Badges />);
    });
    press(/^Firm Footing · IS Operations, Clay\. Earned/);
    press(/^Share Firm Footing · IS Operations$/);
    const card = textOf(root().findByType(BadgeShareCard));
    expect(card).toContain('Firm Footing Clay · tier 1 of 2 Reached 70% in IS Operations in practice');
    expect(card).not.toContain('Firm Footing · IS Operations');
  });

  it('card words that fail the honesty check hide Share (built in a try), never crash the sheet', () => {
    earn('long-memory', T0 - DAY);
    const cisa = getCertification('cisa')!;
    const mark = badgeCase('cisa', selectCert(useProgress.getState(), 'cisa')).marks.find((m) => m.key === 'long-memory')!;
    expect(cardText(mark, cisa)?.name).toBe('Long Memory');
    expect(cardText(mark, { ...cisa, name: 'Official' })).toBeNull();
    expect(cardText({ ...mark, status: 'started' }, cisa)).toBeNull();
  });

  it('Flown the Nest (renamed from Graduate in 1.18) is shareable: its sheet offers Share and the card passes every check', () => {
    earn('graduate', new Date(2026, 10, 3, 9).getTime());
    act(() => {
      r = create(<Badges />);
    });
    press(/^Flown the Nest\. Earned/);
    const sheet = () => root().findByType(Modal);
    expect(textOf(sheet())).toContain('Flown the Nest');
    expect(textOf(sheet())).not.toMatch(/graduat/i);
    press(/^Share Flown the Nest$/);
    const t = textOf(sheet());
    expect(t).toContain('Moved 50 questions out of spaced review');
    expect(t).toContain('KaiSip study badge · Earned 3 Nov 2026');
    expect(t).toContain('Studying for the CISA® exam');
    expect(t).toContain('Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA.');
    expect(t).not.toMatch(/graduat|certificat|credential|official/i);
  });

  it('no Share on a badge not yet earned, nor on Fresh Start (a moment, never shared)', () => {
    earn('fresh-start', T0 - DAY);
    act(() => {
      r = create(<Badges />);
    });
    press(/^Fresh Start\. Earned/);
    expect(buttons(/^Share /)).toHaveLength(0);
    press(/^Close Fresh Start$/);
    act(() => jest.advanceTimersByTime(700));
    press(/^Flown the Nest\. Not yet/);
    expect(buttons(/^Share /)).toHaveLength(0);
  });
});
