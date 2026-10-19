/**
 * "Your note" data flow (security review): a learner's note must never leave
 * the phone by any path except their own backup file. A sentinel note is
 * written on the question, shown on the answer screen, and then:
 *  - the real "Report a problem" flow is run from that screen: the mailto link
 *    (subject and body) never contains it;
 *  - the feedback and support email builders, fed from the app's own state,
 *    never contain it;
 *  - the share card's options and text, built from the progress store, never
 *    contain it.
 */
import { Linking } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { getAllQuestions } from '../content/loader';
import { getCertification } from '../content/certifications';
import { readinessFor } from '../engine/readiness';
import { readinessRange } from '../engine/readinessRange';
import { shareMessage, shareOptions } from '../engine/shareCard';
import { dayKey } from '../engine/streak';
import { buildFeedbackEmail, buildReportEmail, buildSupportEmail } from '../engine/support';
import { appInfo, emailAsText, questionTarget, sessionWhere } from '../lib/support';
import { startFromIds } from '../lib/sessions';
import { selectCert, useProgress } from '../store/progress';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import SessionScreen from '../app/session';

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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, canDismiss: () => false, dismissTo: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.7.0' } } }));

const SENTINEL = 'SENTINEL-NOTE-7Q4Z';
const NOW = new Date(2026, 9, 11, 9, 0, 0).getTime();
const bank = getAllQuestions('cisa');
const q = bank[300];

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const allText = () => {
  const out: string[] = [];
  const walk = (n: ReactTestInstance | string) => (typeof n === 'string' ? out.push(n) : n.children.forEach(walk));
  walk(root());
  return out.join(' ');
};
const pressables = (label: string) =>
  root().findAll((n) => typeof n.props.onPress === 'function' && typeof n.type !== 'string' && (n.props.accessibilityLabel === label || n.props.label === label));
const press = (label: string) =>
  act(() => {
    pressables(label)[0].props.onPress();
  });
const openUrl = Linking.openURL as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  openUrl.mockReset();
  openUrl.mockResolvedValue(true);
  useSettings.setState({ ...useSettings.getInitialState(), onboarded: true, activeCertId: 'cisa', shuffleOptions: true });
  useProgress.setState({ ...useProgress.getInitialState(), reports: undefined });
  useSession.getState().clear();
  // The sentinel on this question and on a few others, so any path that reads "all notes" would show it.
  act(() => {
    for (const x of [q, ...bank.slice(0, 5)]) useProgress.getState().setQuestionNote('cisa', x.id, `${SENTINEL} on ${x.id}`);
  });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  jest.useRealTimers();
});

it('the report email from the answer screen (with the note on screen) never carries the note', async () => {
  startFromIds('cisa', [q.id, bank[301].id], 'Quick 10');
  act(() => {
    r = create(<SessionScreen />);
  });
  const option = root().findAll((n) => n.props.letter === 'A' && n.props.state !== undefined && typeof n.props.onPress === 'function')[0];
  act(() => option.props.onPress());
  press('Check answer');
  expect(allText()).toContain(SENTINEL); // the learner sees their note here
  press(`Report a problem with question ${q.id}`);
  press('Typo or grammar');
  await act(async () => {
    await pressables('Write the email')[0].props.onPress();
  });
  expect(openUrl).toHaveBeenCalledTimes(1);
  const url = String(openUrl.mock.calls[0][0]);
  expect(decodeURIComponent(url)).not.toContain(SENTINEL);
  expect(JSON.stringify(useProgress.getState().reports)).not.toContain(SENTINEL);
});

it('the report, feedback and support email builders, fed from app state, never carry a note', () => {
  const target = questionTarget('cisa', q, sessionWhere('Practice', 'Quick 10'), { perm: ['A', 'B', 'C', 'D'], pickedDisplay: 'B' });
  const emails = [
    buildReportEmail({ target, reason: 'typo', certName: 'CISA', app: appInfo(), ref: 'R-7K2Q' }),
    buildFeedbackEmail({ kind: 'idea', message: 'More games', certName: 'CISA', app: appInfo(), from: 'Help' }),
    buildSupportEmail({ topic: 'backup', certName: 'CISA', app: appInfo(), from: 'Common questions: Backups' }),
  ];
  for (const e of emails) {
    expect(JSON.stringify(e)).not.toContain(SENTINEL);
    expect(emailAsText(e)).not.toContain(SENTINEL);
  }
  expect(JSON.stringify(target)).not.toContain(SENTINEL);
});

it('the share card, built from the progress store, never carries a note', () => {
  const cert = getCertification('cisa')!;
  const st = useProgress.getState();
  const cp = selectCert(st, 'cisa');
  const input = {
    certName: cert.name,
    issuer: 'ISACA',
    streak: st.streak.current,
    recentDays: st.streak.recentDays ?? [],
    today: dayKey(NOW),
    answered: Object.keys(cp.answers).length,
    range: readinessRange(cert, readinessFor(cert, cp.answers)),
  };
  const options = shareOptions(input);
  expect(JSON.stringify(options)).not.toContain(SENTINEL);
  for (const o of options) expect(shareMessage(o, 'Not affiliated with ISACA.')).not.toContain(SENTINEL);
});
