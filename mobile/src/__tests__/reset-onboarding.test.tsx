import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Settings from '../app/settings';
import { moveFocus } from '../lib/a11y';
import { useBackup } from '../store/backup';
import { useSettings } from '../store/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProgress } from '../store/progress';
import { useSession, type ActiveSession } from '../store/session';
import { useAccount } from '../store/account';
import { useSeen } from '../store/seen';
import { flushPendingSaves } from '../store/storage';
import { resetStudyProgress } from '../lib/backup';
import Index from '../app/index';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('../lib/a11y', () => ({ ...jest.requireActual('../lib/a11y'), moveFocus: jest.fn() }));
const mockParams: { current: Record<string, string> } = { current: {} };
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDismiss = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: (...a: unknown[]) => mockReplace(...a), back: jest.fn(), canGoBack: () => true, canDismiss: () => true, dismissAll: () => mockDismiss() },
  useLocalSearchParams: () => mockParams.current,
  Redirect: (props: object) => jest.requireActual('react').createElement('Redirect', props),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

let r: ReactTestRenderer | undefined;
const root = () => r!.root;
const render = () =>
  act(() => {
    r = create(<Settings />);
  });

beforeEach(async () => {
  await Promise.all([useSettings, useProgress, useSession, useBackup].map((store) => store.persist.rehydrate()));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockReplace.mockClear();
  mockDismiss.mockClear();
  (Alert.alert as jest.Mock).mockClear();
  await AsyncStorage.setItem('test.account.sentinel', 'account preserved');
  useProgress.setState({ ...useProgress.getInitialState(), byCert: {}, days: {} });
  useProgress.getState().recordAnswer('cisa', 'd1_002', false);
  useProgress.getState().recordAnswer('cism', 'cism-test', true);
  useProgress.getState().toggleBookmark('cisa', 'd1_002');
  useProgress.getState().logReport({ ref: 'R-TEST', item: 'app:settings', reason: 'other', cert: 'cisa', version: '2.0.0' });
  const day = { day: '2026-11-09', budget: 20 as const, items: [], done: [], start: { score: 0, domains: {} }, answered: 1, correct: 0, minutes: 1 };
  useProgress.setState({ days: { cisa: { ...day, certId: 'cisa' }, cism: { ...day, certId: 'cism' } } });
  useSession.setState({ active: session('cisa') });
  await flushPendingSaves();
  useSettings.setState({ displayName: 'Test nickname', theme: 'light', activeCertId: 'cisa', onboarded: true, examDates: { cisa: '2099-01-08', cism: '2099-06-09' } });
});
afterEach(() => {
  act(() => {
    r?.unmount();
  });
  r = undefined;
  mockParams.current = {};
  mockPush.mockReset();
  jest.mocked(moveFocus).mockClear();
  useBackup.setState({ lastBackupAt: null, undo: null });
});

it('confirmed CISA reset durably returns to onboarding', async () => {
  mockParams.current = { category: 'data' };
  render();
  const reset = root().findAll((n) => n.props.label === 'Reset CISA progress' && typeof n.props.onPress === 'function')[0];
  act(() => reset.props.onPress());
  const call = (Alert.alert as jest.Mock).mock.calls.find((c) => c[0] === 'Reset CISA progress?')!;
  await act(async () => { await call[2].find((b: { text: string }) => b.text === 'Reset').onPress(); });
  expect(useSettings.getState().onboarded).toBe(false);
  expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  expect(mockDismiss).toHaveBeenCalledTimes(1);
  expect(mockDismiss.mock.invocationCallOrder[0]).toBeLessThan(mockReplace.mock.invocationCallOrder[0]);
});

function session(certId: string): ActiveSession {
  return { id: 'paused', certId, mode: 'practice', title: 'Practice', questionIds: ['d1_002'], perms: { d1_002: ['A','B','C','D'] }, index: 0, responses: {}, flagged: [], startedAt: 1 };
}
function confirm() {
  mockParams.current = { category: 'data' }; render();
  act(() => root().findAll((n) => n.props.label === 'Reset CISA progress' && typeof n.props.onPress === 'function')[0].props.onPress());
  return (Alert.alert as jest.Mock).mock.calls.find((c) => c[0] === 'Reset CISA progress?')![2] as {text: string; onPress?: () => Promise<void>}[];
}
it('cancellation preserves progress and onboarding, and never navigates', async () => {
  const before = useProgress.getState();
  const buttons = confirm();
  await buttons.find(b => b.text === 'Cancel')!.onPress?.();
  expect(useProgress.getState()).toBe(before);
  expect(useSettings.getState().onboarded).toBe(true);
  expect(mockReplace).not.toHaveBeenCalled();
});
it('clears only CISA study and its paused session, keeping account, global history, preferences, reports and other exams', async () => {
  const old = useProgress.getState(); const account = useAccount.getState(); const seen = useSeen.getState();
  const other = old.byCert.cism;
  await resetStudyProgress('cisa');
  const next = useProgress.getState();
  expect(next.byCert.cisa.answers).toEqual({});
  expect(next.byCert.cisa.review).toEqual({});
  expect(next.byCert.cisa.bookmarks).toEqual([]);
  expect(next.byCert.cism).toEqual(other);
  expect(next.days.cisa).toBeUndefined();
  expect(next.days.cism).toEqual(old.days.cism);
  expect(next.today).toEqual(old.today);
  expect(next.streak).toEqual(old.streak);
  expect(next.reports).toEqual(old.reports);
  expect(useSession.getState().active).toBeNull();
  expect(useSettings.getState()).toMatchObject({ theme: 'light', displayName: 'Test nickname', examDates: { cisa: '2099-01-08', cism: '2099-06-09' } });
  expect(useAccount.getState()).toBe(account); expect(useSeen.getState()).toBe(seen);
  expect(await AsyncStorage.getItem('test.account.sentinel')).toBe('account preserved');
});
it('preserves a paused session belonging to another certification', async () => {
  useSession.setState({ active: session('cism') });
  await resetStudyProgress('cisa');
  expect(useSession.getState().active).toEqual(session('cism'));
});
it('does not send an unrelated certification reset into CISA onboarding', async () => {
  await resetStudyProgress('cism');
  expect(useSettings.getState().onboarded).toBe(true);
  expect(useProgress.getState().byCert.cisa.answers.d1_002).toBeDefined();
  expect(useSession.getState().active).toEqual(session('cisa'));
});
it('persists the reset and restart entry routes into onboarding after rehydration', async () => {
  await resetStudyProgress('cisa');
  const savedSettings = JSON.parse((await AsyncStorage.getItem('aurivan.settings.v1'))!);
  const savedProgress = JSON.parse((await AsyncStorage.getItem('aurivan.progress.v1'))!);
  expect(savedSettings.state.onboarded).toBe(false);
  expect(savedProgress.state.byCert.cisa.answers).toEqual({});
  await useSettings.persist.rehydrate(); await useProgress.persist.rehydrate(); await useSession.persist.rehydrate();
  act(() => { r = create(<Index />); });
  expect(root().findByType('Redirect' as never).props.href).toBe('/onboarding');
  expect(useSession.getState().active).toBeNull();
});
it('failed persistence leaves live data intact, reports the failure and never navigates', async () => {
  const buttons = confirm(); await flushPendingSaves();
  const before = useProgress.getState();
  jest.spyOn(AsyncStorage, 'multiSet').mockRejectedValueOnce(new Error('disk full'));
  await act(async () => { await buttons.find(b => b.text === 'Reset')!.onPress!(); });
  expect(useProgress.getState()).toBe(before);
  expect(useSettings.getState().onboarded).toBe(true);
  expect(mockReplace).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalledWith('Reset could not be saved', expect.any(String));
});

it('does not depend on storage re-reading after the durable write', async () => {
  await flushPendingSaves();
  const reads = AsyncStorage.getItem as jest.Mock;
  const originalRead = reads.getMockImplementation()!;
  reads.mockClear().mockRejectedValue(new Error('read failed'));
  try {
    await resetStudyProgress('cisa');
    expect(useSettings.getState().onboarded).toBe(false);
    expect(useProgress.getState().byCert.cisa.answers).toEqual({});
    expect(useSession.getState().active).toBeNull();
    expect(reads).not.toHaveBeenCalled();
  } finally { reads.mockImplementation(originalRead); }
});
it('preserves edits made while the reset write is pending and asks for a retry', async () => {
  await flushPendingSaves();
  const real = AsyncStorage.multiSet.bind(AsyncStorage);
  jest.spyOn(AsyncStorage, 'multiSet').mockImplementationOnce(async (rows) => {
    useSettings.setState({ theme: 'dark' });
    useProgress.getState().recordAnswer('cism', 'new-other-answer', true);
    await flushPendingSaves();
    return real(rows);
  });
  await expect(resetStudyProgress('cisa')).rejects.toThrow('Study data changed');
  expect(useSettings.getState().theme).toBe('dark');
  expect(useSettings.getState().onboarded).toBe(true);
  expect(useProgress.getState().byCert.cism.answers['new-other-answer']).toBeDefined();
  expect(useProgress.getState().byCert.cisa.answers.d1_002).toBeDefined();
  const disk = JSON.parse((await AsyncStorage.getItem('aurivan.progress.v1'))!);
  expect(disk.state.byCert.cism.answers['new-other-answer']).toBeDefined();
});

it('double confirmation runs one reset and one navigation', async () => {
  const buttons = confirm(); await flushPendingSaves();
  (AsyncStorage.multiSet as jest.Mock).mockClear();
  const reset = buttons.find(b => b.text === 'Reset')!.onPress!;
  await act(async () => { await Promise.all([reset(), reset()]); });
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect((AsyncStorage.multiSet as jest.Mock).mock.calls.filter(([rows]) => rows.length === 4)).toHaveLength(1);
});
it('a redundant persist failure cannot report failure after the reset committed', async () => {
  const buttons = confirm(); await flushPendingSaves();
  const write = AsyncStorage.setItem as jest.Mock;
  const originalWrite = write.getMockImplementation()!;
  write.mockRejectedValue(new Error('redundant write failed'));
  try {
    await act(async () => { await buttons.find(b => b.text === 'Reset')!.onPress!(); });
    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
    expect(useSettings.getState().onboarded).toBe(false);
    expect(JSON.parse((await AsyncStorage.getItem('aurivan.progress.v1'))!).state.byCert.cisa.answers).toEqual({});
    expect(Alert.alert).not.toHaveBeenCalledWith('Reset could not be saved', expect.anything());
  } finally { write.mockImplementation(originalWrite); }
});
