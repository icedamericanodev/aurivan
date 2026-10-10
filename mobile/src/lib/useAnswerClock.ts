/**
 * useAnswerClock — times one question on screen (engine/answerClock.ts).
 *
 * Give it a key that changes with each new question (the question id, plus
 * the round index in games). It restarts the clock when the key changes and
 * pauses it while the app is in the background. `held` pauses it too, for
 * time on screen that isn't answering (Sure Footing's rules panel). Call the
 * returned function at the moment the answer is committed to read the time.
 *
 * The clock lives in a ref, so ticking it never re-renders the screen.
 */
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { elapsedMs, pauseClock, resumeClock, startClock, type AnswerClock } from '../engine/answerClock';

export function useAnswerClock(key: string | undefined, held = false): () => number {
  const clock = useRef<AnswerClock | null>(null);
  // The two reasons to pause: the app is not in front, or the screen holds the clock.
  const inFront = useRef(AppState.currentState === 'active');
  const holding = useRef(held);

  const apply = () => {
    if (!clock.current) return;
    const now = Date.now();
    clock.current = inFront.current && !holding.current ? resumeClock(clock.current, now) : pauseClock(clock.current, now);
  };

  // A new question: start a fresh clock (paused if the app is not in front or held).
  useEffect(() => {
    clock.current = startClock(Date.now());
    apply();
    // `apply` only reads refs; it never needs to re-run this effect.
  }, [key]);

  // Held / released by the screen.
  useEffect(() => {
    holding.current = held;
    apply();
  }, [held]);

  // Background = paused; back in front = running again. "inactive" (iOS
  // control centre, an incoming call screen) counts as background too.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      inFront.current = state === 'active';
      apply();
    });
    return () => sub.remove();
  }, []);

  return useCallback(() => (clock.current ? elapsedMs(clock.current, Date.now()) : 0), []);
}
