/**
 * Run `run` ONCE, the first time this screen is in front (focused).
 *
 * For screens that show nothing and only send the learner somewhere else
 * (app/play.tsx, app/widget.tsx). Expo SDK 58 (expo-router 58) runs
 * navigation after the screen has drawn ("deferred dispatch"), so in a plain
 * mount effect:
 * - on a cold start (a widget tap with the app closed) the router is not
 *   ready yet, and calling it throws ("The imperative router is unavailable
 *   before the first render has finished");
 * - on a screen just pushed, `router.canDismiss()` still answers false (the
 *   push hasn't landed), so "back to the tabs" turned into a second tab
 *   navigator on top.
 * Focus comes after the router has placed the screen, so both are right by then.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

export function useOnceOnFocus(run: () => void): void {
  const ran = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (ran.current) return;
      ran.current = true;
      run();
      // Once only: the `run` from the first draw is the one that counts.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
}
