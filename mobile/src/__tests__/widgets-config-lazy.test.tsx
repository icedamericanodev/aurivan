/**
 * Mobile 1.47.1, home-screen widgets: the "choose" screen loads only when it opens.
 *
 * index.ts loads components/widgetConfig.android.tsx at every start, and that
 * includes each background widget run (a Today's rule tap, a resize, the
 * 3-hourly update). Those runs only need the snapshot, so the real screen
 * (the stores, saved data, the UI kit) must load only when Android opens the
 * screen. Checked here with the real registration, and in widgets-guard.test.ts
 * for index.ts's whole import graph.
 */
import type { JSX } from 'react';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { registerWidgetConfigurationScreen, type WidgetConfigurationScreenProps } from 'react-native-android-widget';

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, SafeAreaProvider: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('expo', () => ({ ...jest.requireActual('expo'), isRunningInExpoGo: () => false }));
jest.mock('../lib/widgets', () => ({ widgetsSupported: true, refreshWidgets: async () => {} }));
/** Counts how often the real screen's file is loaded. */
let mockScreenLoads = 0;
jest.mock('../components/widgetConfigScreen.android', () => {
  mockScreenLoads += 1;
  return jest.requireActual('../components/widgetConfigScreen.android');
});

const info = { widgetId: 7, widgetName: 'Readiness', width: 182, height: 184, screenInfo: { fontScale: 1, density: 2, densityDpi: 320, screenHeightDp: 800, screenWidthDp: 412 } };
const byLabel = (root: ReactTestInstance, label: string) => root.find((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');

it('registers a thin screen at start; the real one loads when Android opens it, and still saves the choice', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../components/widgetConfig.android');
  // Registered at start, without loading the real screen (what every background widget run pays).
  expect(registerWidgetConfigurationScreen).toHaveBeenCalledTimes(1);
  expect(mockScreenLoads).toBe(0);

  const Screen = (registerWidgetConfigurationScreen as jest.Mock).mock.calls[0][0] as (p: WidgetConfigurationScreenProps) => JSX.Element;
  const setResult = jest.fn();
  const renderWidget = jest.fn();
  let r!: ReturnType<typeof create>;
  await act(async () => {
    r = create(<Screen widgetInfo={info} setResult={setResult} renderWidget={renderWidget} />);
  });
  expect(mockScreenLoads).toBe(1);
  await act(async () => byLabel(r.root, 'Rings only (recommended)').props.onPress());
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useWidgetStore } = require('../store/widgets') as typeof import('../store/widgets');
  expect(useWidgetStore.getState().prefs.readiness).toBe('private');
  expect(renderWidget).toHaveBeenCalled();
  expect(setResult).toHaveBeenCalledWith('ok');
});
