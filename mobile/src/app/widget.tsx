/**
 * Where every home-screen widget tap lands (mobile 1.47):
 * `kaisip://widget?kind=plan&go=start&from=widget`.
 *
 * It shows nothing of its own (just the paper colour for a frame): it reads
 * the link once, safely (engine/widgets.ts parseWidgetTap: any app can send a
 * kaisip:// link, so nothing in it is trusted), then opens the place the
 * widget named (lib/widgetOpen.ts).
 */
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { parseWidgetTap } from '../engine/widgets';
import { openFromWidget } from '../lib/widgetOpen';
import { useOnceOnFocus } from '../lib/useOnceOnFocus';
import { useTheme } from '../theme/useTheme';

export default function WidgetOpen() {
  const { c } = useTheme();
  const params = useLocalSearchParams();
  // Read once, when the link arrives. Expo SDK 58: on first focus, not on mount, so a tap
  // with the app closed doesn't call the router before it is ready (lib/useOnceOnFocus.ts).
  useOnceOnFocus(() => openFromWidget(parseWidgetTap(params)));
  return <View accessible={false} style={{ flex: 1, backgroundColor: c.bg }} />;
}
