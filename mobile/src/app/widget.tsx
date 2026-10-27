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
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { parseWidgetTap } from '../engine/widgets';
import { openFromWidget } from '../lib/widgetOpen';
import { useTheme } from '../theme/useTheme';

export default function WidgetOpen() {
  const { c } = useTheme();
  const params = useLocalSearchParams();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    openFromWidget(parseWidgetTap(params));
    // Read once, when the link arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <View accessible={false} style={{ flex: 1, backgroundColor: c.bg }} />;
}
