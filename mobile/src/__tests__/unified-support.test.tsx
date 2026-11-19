import { KeyboardAvoidingView, Linking } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { UnifiedSupportSheet } from '../components/support';
import { ContentColumn } from '../components/layout';
import { CLOUD } from '../cloud/flag';
import { SIGNED_OUT, useAccount } from '../store/account';
import { Button, Chip, NoteField, ToggleRow, T } from '../components/ui';
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
const mockPush = jest.fn();
const mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: () => true, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.7.0' } } }));
jest.mock('../lib/reminders', () => ({
  remindersSupported: true,
  ensurePermission: async () => true,
  scheduleReminders: async () => {},
  cancelReminders: async () => {},
}));
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class { list() { return []; } }, Paths: { cache: { uri: 'file:///cache' } } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => true, shareAsync: async () => {} }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true, assets: null }) }));

let r: ReactTestRenderer;
const opened = jest.fn();
const button = (label: string) => r.root.findAllByType(Button).find(n => n.props.label === label)!;
const choose = (label: string) => act(() => r.root.findAllByType(Chip).find(n => n.props.label === label)!.props.onPress());
const write = (text: string) => act(() => r.root.findByType(NoteField).props.onChangeText(text));
const press = async (label: string) => { await act(async () => { await button(label).props.onPress(); }); };
beforeEach(() => { jest.useFakeTimers(); (Linking.openURL as jest.Mock).mockReset().mockResolvedValue(true); opened.mockClear(); act(() => { r = create(<UnifiedSupportSheet visible certId="cisa" onClose={jest.fn()} onOpened={opened} />); }); });
afterEach(() => { act(() => r.unmount()); jest.clearAllTimers(); jest.useRealTimers(); });
it('requires category and message and does not send on review', async () => {
  expect(button('Review message').props.disabled).toBe(true);
  choose('New feature'); write('   '); expect(button('Review message').props.disabled).toBe(true);
  write('Please add a feature.'); expect(button('Review message').props.disabled).toBe(false);
  await press('Review message'); expect(Linking.openURL).not.toHaveBeenCalled();
});
it('includes display details only by opt-in and removes them for private data requests', async () => {
  choose('Bug or error'); write('Text is cut off.');
  expect(r.root.findByType(ToggleRow).props.value).toBe(false);
  act(() => r.root.findByType(ToggleRow).props.onValueChange(true));
  await press('Review message'); await press('Email support');
  expect(decodeURIComponent((Linking.openURL as jest.Mock).mock.calls[0][0])).toContain('Display:');
  await press('Back to edit'); choose('Data or privacy'); await press('Review message'); await press('Email support');
  expect(decodeURIComponent((Linking.openURL as jest.Mock).mock.calls[1][0])).not.toContain('Display:');
});
it('keeps the message when returning to edit', async () => {
  choose('Something else'); write('I need help.'); await press('Review message'); await press('Back to edit');
  expect(r.root.findByType(NoteField).props.value).toBe('I need help.');
});
it('offers copy/share after email failure without claiming delivery', async () => {
  (Linking.openURL as jest.Mock).mockRejectedValue(new Error('No email app'));
  choose('Bug or error'); write('The screen froze.'); await press('Review message'); await press('Email support');
  expect(button('Share details')).toBeDefined(); expect(opened).not.toHaveBeenCalled();
  await press('Try again'); await press('Back to edit'); expect(r.root.findByType(NoteField).props.value).toBe('The screen froze.');
});
it('guards duplicate email activation', async () => {
  choose('Improve something'); write('Make this easier to find.'); await press('Review message');
  const send = button('Email support').props.onPress;
  await act(async () => { await Promise.all([send(), send()]); }); expect(Linking.openURL).toHaveBeenCalledTimes(1);
});


it('keeps public idea posting optional and gated by the cloud flag and sign-in', async () => {
  await act(async () => { useAccount.getState().setFacts(SIGNED_OUT); });
  choose('New feature'); write('A quieter practice timer.');
  expect(button('Post publicly instead ›')).toBeUndefined();
  await act(async () => { useAccount.getState().setFacts({ signedIn: true }); });
  if (CLOUD) {
    mockPush.mockClear();
    await press('Post publicly instead ›');
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/board/new', params: { kind: 'idea', body: 'A quieter practice timer.' } });
    expect(Linking.openURL).not.toHaveBeenCalled();
  } else expect(button('Post publicly instead ›')).toBeUndefined();
  choose('Data or privacy');
  expect(button('Post publicly instead ›')).toBeUndefined();
  await act(async () => { useAccount.getState().setFacts(SIGNED_OUT); });
});

it.each([
  ['long', 'Long support message. '.repeat(45)],
  ['Unicode', '  日本語🌿 café\r\n'.repeat(45) + ' final detail  '],
])('previews the exact %s direct message independently of the fitted email', async (_name, message) => {
  const submitDirect = jest.fn().mockResolvedValue({ status: 'accepted', receiptId: 'receipt-test' });
  await act(async () => { r.update(<UnifiedSupportSheet visible certId="cisa" onClose={jest.fn()} onOpened={opened} submitDirect={submitDirect} />); });
  choose('Bug or error'); write(message); await press('Review message');
  const preview = r.root.findAllByType(T).find(n => n.props.accessibilityLabel === 'Full in-app support message')!;
  expect(preview.props.selectable).toBe(true);
  const reviewedMessage = preview.props.children;
  expect(reviewedMessage).toBe(message.trim());
  expect(submitDirect).not.toHaveBeenCalled();
  await press('Send in KaiSip');
  expect(submitDirect).toHaveBeenCalledWith(expect.objectContaining({ message: reviewedMessage }));
  expect(Linking.openURL).not.toHaveBeenCalled();
});
// Mobile 2.2 review: on Android the keyboard view works out the keyboard overlap from its own
// position in its PARENT, so it must stay the sheet's SafeAreaView's direct child. The large-screen
// column goes inside it; a column around it would hide the field near the bottom behind the keyboard.
it('keeps the keyboard view outside the large-screen column, with the column inside it', () => {
  const kav = r.root.findByType(KeyboardAvoidingView);
  for (let n = kav.parent; n; n = n.parent) expect(n.type).not.toBe(ContentColumn);
  expect(kav.findAllByType(ContentColumn)).toHaveLength(1);
});
