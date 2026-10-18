/**
 * useNoteDwell — how long a study note has been open on screen (mobile 1.25).
 *
 * Plain English: the clock runs only while the note's screen is the one in
 * view (`focused`) AND the app is in front. Locking the phone, switching
 * apps or opening another screen on top pauses it; coming back carries on.
 *
 * Started: once the note's time reaches 10 seconds IN TOTAL (engine/
 * noteReadState.ts STARTED_AFTER_MS), it calls `onStarted` once, so the note
 * shows as started. The total adds up across visits in the same app session
 * (6 s now and 4 s later is started): each visit's time is kept in memory
 * when the screen closes, never saved. A new app launch starts from 0.
 *
 * The returned function reads THIS visit's time so far (the 20-second
 * auto-read minimum uses it, per visit, as before).
 *
 * It reuses the answer clock (lib/useAnswerClock.ts), which already pauses
 * in the background; `held` pauses it while the screen is out of view.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { STARTED_AFTER_MS } from '../engine/noteReadState';
import { useAnswerClock } from './useAnswerClock';

/** Time each note was open in EARLIER visits this session, in ms (in memory only). */
const earlier = new Map<string, number>();

/** Tests: forget the session's earlier visits (as a new app launch would). */
export function resetNoteDwellForTest(): void {
  earlier.clear();
}

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

  // When this visit ends (the screen closes, or "Next note" swaps the id), keep its time.
  useEffect(
    () => () => {
      earlier.set(noteId, (earlier.get(noteId) ?? 0) + elapsed());
    },
    [noteId, elapsed],
  );

  useEffect(() => {
    if (!focused || !inFront || reported.current === noteId) return;
    // Only the time still missing: 7 s so far (this visit and earlier ones) needs 3 s more.
    const left = Math.max(0, STARTED_AFTER_MS - (earlier.get(noteId) ?? 0) - elapsed());
    const timer = setTimeout(() => {
      reported.current = noteId;
      started.current();
    }, left);
    return () => clearTimeout(timer);
  }, [noteId, focused, inFront, elapsed]);

  return elapsed;
}
