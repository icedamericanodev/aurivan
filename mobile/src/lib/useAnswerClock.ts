/**
 * useAnswerClock — times one question on screen (engine/answerClock.ts).
 *
 * Give it a key that changes with each new question (the question id, plus
 * the round index in games). It restarts the clock when the key changes and
 * pauses it while the app is in the background. Call the returned function
 * at the moment the answer is committed to read the time in ms.
 *
 * The clock lives in a ref, so ticking it never re-renders the screen.
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { elapsedMs, pauseClock, resumeClock, startClock, type AnswerClock } from '../engine/answerClock';

export function useAnswerClock(key: string | undefined): () => number {
  const clock = useRef<AnswerClock | null>(null);

  // A new question: start a fresh clock (paused if the app is not in front).
  useEffect(() => {
    const now = Date.now();
    const fresh = startClock(now);
    clock.current = AppState.currentState === 'active' ? fresh : pauseClock(fresh, now);
  }, [key]);

  // Background = paused; back in front = running again. "inactive" (iOS
  // control centre, an incoming call screen) counts as background too.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!clock.current) return;
      const now = Date.now();
      clock.current = state === 'active' ? resumeClock(clock.current, now) : pauseClock(clock.current, now);
    });
    return () => sub.remove();
  }, []);

  return useCallback(() => (clock.current ? elapsedMs(clock.current, Date.now()) : 0), []);
}
