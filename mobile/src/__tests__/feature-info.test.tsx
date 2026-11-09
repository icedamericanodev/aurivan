import { Modal, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FeatureInfo } from '../components/featureInfo';
import { IconButton, T } from '../components/ui';
import { Sheet } from '../components/settings';
import * as a11y from '../lib/a11y';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (target, key: string) => key in target ? target[key] : Icon,
  });
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../lib/haptics', () => ({ haptic: { selection: jest.fn(), light: jest.fn() } }));

let rendered: ReactTestRenderer;
let focus: jest.SpyInstance;
const cancel = jest.fn();
beforeEach(() => {
  cancel.mockClear();
  focus = jest.spyOn(a11y, 'moveFocus').mockReturnValue(cancel);
  act(() => { rendered = create(<FeatureInfo title="Study modes"><T v="body">Guided pairs a lesson with practice.</T></FeatureInfo>); });
});
afterEach(() => {
  act(() => rendered.unmount());
  focus.mockRestore();
});
const open = () => act(() => rendered.root.findByType(IconButton).props.onPress());

test('information starts collapsed with a descriptive, 48-point trigger and opens a titled sheet', () => {
  const trigger = rendered.root.findByType(IconButton);
  expect(trigger.props.label).toBe('About Study modes');
  expect(trigger.props.expanded).toBe(false);
  const button = trigger.findAll((node) => node.props.accessibilityRole === 'button' && node.props.style)[0];
  const style = StyleSheet.flatten(button.props.style);
  expect(style.width).toBeGreaterThanOrEqual(48);
  expect(style.height).toBeGreaterThanOrEqual(48);
  expect(rendered.root.findAllByType(Sheet)).toHaveLength(0);
  open();
  expect(rendered.root.findByType(Sheet).props.visible).toBe(true);
  expect(rendered.root.findByType(Sheet).props.title).toBe('Study modes');
  expect(rendered.root.findByType(IconButton).props.expanded).toBe(true);
  expect(focus).toHaveBeenCalledWith(expect.any(Object), 350);
});

test.each(['button', 'androidBack', 'escape'] as const)('%s closes guidance and returns focus to its trigger', (method) => {
  open();
  focus.mockClear();
  act(() => {
    if (method === 'androidBack') rendered.root.findByType(Modal).props.onRequestClose();
    else if (method === 'escape') rendered.root.findAll((node) => typeof node.props.onAccessibilityEscape === 'function')[0].props.onAccessibilityEscape();
    else rendered.root.findAll((node) => node.props.accessibilityLabel === 'Close, Study modes' && typeof node.props.onPress === 'function')[0].props.onPress();
  });
  expect(rendered.root.findAllByType(Sheet)).toHaveLength(0);
  expect(rendered.root.findByType(IconButton).props.expanded).toBe(false);
  expect(focus).toHaveBeenCalledWith(expect.any(Object), 400);
  open();
  expect(cancel).toHaveBeenCalled();
});


test('inline guidance inside a modal expands without adding another native modal', () => {
  act(() => rendered.update(<FeatureInfo inline title="Badge rules"><T v="body">Earned badges stay in your collection.</T></FeatureInfo>));
  expect(rendered.root.findAllByType(Sheet)).toHaveLength(0);
  expect(rendered.root.findAllByType(Modal)).toHaveLength(0);
  open();
  expect(rendered.root.findAll((node) => node.props.accessibilityRole === 'header' && node.props.accessibilityLabel === 'Badge rules').length).toBeGreaterThan(0);
  expect(focus).toHaveBeenCalledWith(expect.any(Object), 100);
  open();
  expect(rendered.root.findByType(IconButton).props.expanded).toBe(false);
  expect(focus).toHaveBeenCalledWith(expect.any(Object), 400);
});
