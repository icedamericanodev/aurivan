/**
 * Study streak — consecutive days with at least one answered question.
 * Uses the device's LOCAL calendar day, so midnight means midnight for
 * the learner, wherever they are.
 */
export interface Streak {
  current: number;
  best: number;
  lastDay: string | null; // "YYYY-MM-DD"
}

export function dayKey(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function bumpStreak(s: Streak, now: number): Streak {
  const today = dayKey(now);
  if (s.lastDay === today) return s;
  const yesterday = dayKey(now - 86_400_000);
  const current = s.lastDay === yesterday ? s.current + 1 : 1;
  return { current, best: Math.max(s.best, current), lastDay: today };
}

/** Streak to SHOW: if you missed yesterday entirely, it is broken (0). */
export function visibleStreak(s: Streak, now: number): number {
  if (!s.lastDay) return 0;
  const ok = s.lastDay === dayKey(now) || s.lastDay === dayKey(now - 86_400_000);
  return ok ? s.current : 0;
}
