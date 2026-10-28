'use no memo';
/**
 * Registers the short "choose" screen Android opens when the learner adds the
 * Readiness or Exam countdown widget (mobile 1.47). The screen itself is
 * widgetConfigScreen.android.tsx.
 *
 * Why a thin file (1.47.1): index.ts loads this at every start, and that
 * includes each background widget run (a tap on Today's rule, a resize, the
 * 3-hourly update). The real screen loads the stores, saved data and the UI
 * kit, which those runs never need. So it is required only here, inside the
 * component, the first time Android opens the screen.
 *
 * Android only, never in Expo Go (it can't hold the widget's native part).
 */
import { isRunningInExpoGo } from 'expo';
import { registerWidgetConfigurationScreen, type WidgetConfigurationScreenProps } from 'react-native-android-widget';

/** The registered component: loads the real screen when it first draws. */
export function LazyWidgetConfigScreen(props: WidgetConfigurationScreenProps) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WidgetConfigScreen } = require('./widgetConfigScreen.android') as typeof import('./widgetConfigScreen.android');
  return <WidgetConfigScreen {...props} />;
}

if (!isRunningInExpoGo()) registerWidgetConfigurationScreen(LazyWidgetConfigScreen);
