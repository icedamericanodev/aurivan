/**
 * The old Play tab's route (removed in mobile 1.51, the owner's menu pick A:
 * four tabs, and the games are Drills, a section of Practice).
 *
 * It shows nothing of its own (the paper colour for a frame): it opens
 * Practice at Drills at once, so an old `router.push('/play')`, a web
 * `/play` URL or a `kaisip://play` link that reaches the router never lands
 * on Expo Router's blank "unmatched route" screen. System links are usually
 * rewritten before they get here (lib/legacyLinks.ts); this is the net.
 *
 * Through `openTab`: back to the tabs already at the bottom of the stack
 * (never a second tab navigator on top), or a replace when nothing is under
 * this screen (a cold link). Saved data is untouched: game scores, levels
 * and recent rounds were never keyed by the tab.
 */
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { DRILLS_HREF, openTab } from '../lib/actions';
import { useTheme } from '../theme/useTheme';

export default function PlayMoved() {
  const { c } = useTheme();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    openTab(DRILLS_HREF);
  }, []);
  return <View accessible={false} testID="play-moved" style={{ flex: 1, backgroundColor: c.bg }} />;
}
