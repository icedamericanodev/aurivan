/**
 * useNoteDwell — how long a study note has been open on screen (mobile 1.25).
 *
 * Plain English: the clock runs only while the note's screen is the one in
 * view (`focused`) AND the app is in front. Locking the phone, switching
 * apps or opening another screen on top pauses it; coming back carries on.
 * Once it reaches 10 seconds (engine/noteReadState.ts STARTED_AFTER_MS) it
 * calls `onStarted` once, so the note shows as started. The returned
 * function reads the time so far (the 20-second auto-read minimum uses it).
 *
 * It reuses the answer clock (lib/useAnswerClock.ts), which already pauses
 * in the background; `held` pauses it while the screen is out of view.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { STARTED_AFTER_MS } from '../engine/noteReadState';
import { useAnswerClock } from './useAnswerClock';

export function useNoteDwell(noteId: string, focused: boolean, onStarted: () => void): () => number {
  // The clock restarts for a new note id and is held while the screen is not in view.
  const elapsed = useAnswerClock(noteId, !focused);
  // In front or not, as state, so the timer below re-arms when it changes.
  const [inFront, setInFront] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setInFront(state === 'active'));
    return () => sub.remove();
  }, []);
  // The latest callback, so a re-render never restarts the timer.
  const started = useRef(onStarted);
  useEffect(() => {
    started.current = onStarted;
  });
  // The note this screen has already reported as started (once per note).
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (!focused || !inFront || reported.current === noteId) return;
    // Only the time still missing: a note left at 7 s and reopened needs 3 s more.
    const left = Math.max(0, STARTED_AFTER_MS - elapsed());
    const timer = setTimeout(() => {
      reported.current = noteId;
      started.current();
    }, left);
    return () => clearTimeout(timer);
  }, [noteId, focused, inFront, elapsed]);

  return elapsed;
}
