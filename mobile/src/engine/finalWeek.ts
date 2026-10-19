/**
 * Final review week: the rules behind the day cards and their task buttons.
 * Content: data/exam/final_review_week.json (content/exam). Saved ticks:
 * engine/examWeek.ts (`days`, beside the checklist's `done`).
 *
 * Plain English:
 * - Which card is "today": the day whose `daysBefore` equals the days left.
 *   A missed day is simply skipped (the plan's own rule: never double up),
 *   so there is no "late" or "overdue" state anywhere.
 * - "Your focus domain" and "your second-weakest": the readiness focus (the
 *   largest weighted gap, engine/readiness.ts) and the next largest. With no
 *   answers yet, the heaviest-weighted domain practiced least (schema rule).
 * - What a task button opens: a pure "destination" the screen then routes
 *   (lib/finalWeek.ts), so every rule here is testable without React.
 *
 * Pure TypeScript: no React, no storage.
 */
import type { TaskAction, WeekDay } from '../content/exam/types';
import type { DomainInfo } from '../content/types';
import type { Readiness } from './readiness';

/** The day card for today, or undefined (more than 7 days out, exam day, or no date). */
export function dayForToday(days: readonly WeekDay[], daysLeft: number | null): WeekDay | undefined {
  if (daysLeft === null) return undefined;
  return days.find((d) => d.daysBefore === daysLeft);
}

/**
 * "Your focus domain" and the next one, by the weighted gap (1 − mastery) ×
 * weight. `focus` is the readiness's own focus once there are answers, so
 * every screen names the same domain. Ties: the domain practiced less, then
 * the heavier one, then exam order. With no answers every gap is the full
 * weight, so this picks the heaviest domains (CISA: 4, then 5).
 */
export function weekFocus(domains: readonly DomainInfo[], readiness: Readiness): { focus: string; next: string } {
  const byId = new Map(readiness.domains.map((d) => [d.domainId, d]));
  const ranked = domains
    .map((d, i) => {
      const m = byId.get(d.id);
      return { id: d.id, gap: (1 - (m?.mastery ?? 0)) * d.weight, answered: m?.answered ?? 0, weight: d.weight, i };
    })
    .sort((a, b) => b.gap - a.gap || a.answered - b.answered || b.weight - a.weight || a.i - b.i)
    .map((d) => d.id);
  const answered = readiness.domains.some((d) => d.answered > 0);
  const focus = answered && readiness.focusDomainId && ranked.includes(readiness.focusDomainId) ? readiness.focusDomainId : ranked[0];
  const next = ranked.find((id) => id !== focus) ?? focus;
  return { focus, next };
}

/** A sheet part or practice target as a domain id ("focus" → "4"); other parts pass through. */
export function resolvePart(part: string, f: { focus: string; next: string }): string {
  return part === 'focus' ? f.focus : part === 'next_focus' ? f.next : part;
}

/** The cheat-sheet parts a task asks for, with focus words resolved and each once, in order. */
export function sheetParts(parts: readonly string[], f: { focus: string; next: string }): string[] {
  const out: string[] = [];
  for (const p of parts) {
    const r = resolvePart(p, f);
    if (!out.includes(r)) out.push(r);
  }
  return out;
}

/**
 * The note for a "Didn't know it" top slip: the study-notes subtopic behind
 * the most open mistakes (ties: the one met first). Undefined when none of
 * them maps to a note.
 */
export function mostMissedSubtopic(questionIds: readonly string[], subtopicOf: (id: string) => string | undefined): string | undefined {
  const counts = new Map<string, number>();
  let best: string | undefined;
  for (const q of questionIds) {
    const s = subtopicOf(q);
    if (!s) continue;
    const n = (counts.get(s) ?? 0) + 1;
    counts.set(s, n);
    if (best === undefined || n > (counts.get(best) ?? 0)) best = s;
  }
  return best;
}

/** Where a task button goes. */
export type Destination =
  | { to: 'note'; id: string } // a subtopic page
  | { to: 'notesDomain'; domainId: string } // a topic code: its domain's notes page
  | { to: 'notes'; q?: string } // the notes (and their search)
  | { to: 'principle'; id: string }
  | { to: 'principles'; family?: string }
  | { to: 'practice'; domainId: string }
  | { to: 'mock'; questions: number; full: boolean }
  | { to: 'mistakes' };

/** What a top slip opens: a principle, else a note (a content gap), else the library. */
export type TopSlip = { principleId: string } | { noteId: string } | null;

export interface ActionContext {
  focus: { focus: string; next: string };
  /** The learner's top slip, already looked up (lib/finalWeek.ts topSlip). */
  topSlip: TopSlip;
  exam: { questions: number };
  /** A note code's kind in this cert's notes: a topic (with its domain) or a subtopic. */
  noteKind: (code: string) => { kind: 'topic'; domainId: string } | { kind: 'subtopic' } | undefined;
  /** A principles target's kind: one principle, or a family. */
  principleKind: (id: string) => 'principle' | 'family' | undefined;
}

/** The mini mock: a third of the real exam (the size Practice and You offer). */
export const miniMockSize = (examQuestions: number) => Math.round(examQuestions / 3);

/**
 * Where one task's action goes. Every target was checked by the content
 * build; anything a later update removed falls back to the list it lives in.
 */
export function resolveAction(action: TaskAction, ctx: ActionContext): Destination {
  const t = action.target;
  switch (action.kind) {
    case 'note': {
      const k = t ? ctx.noteKind(t) : undefined;
      if (!t || !k) return { to: 'notes' };
      return k.kind === 'subtopic' ? { to: 'note', id: t } : { to: 'notesDomain', domainId: k.domainId };
    }
    case 'principles': {
      if (t === 'top_slip') {
        const s = ctx.topSlip;
        if (s && 'principleId' in s) return { to: 'principle', id: s.principleId };
        // "Didn't know it" is a content gap, not a thinking slip: its note (schema "App hooks wanted").
        if (s && 'noteId' in s) return { to: 'note', id: s.noteId };
        return { to: 'principles' };
      }
      const k = t ? ctx.principleKind(t) : undefined;
      if (k === 'principle') return { to: 'principle', id: t! };
      if (k === 'family') return { to: 'principles', family: t };
      return { to: 'principles' };
    }
    case 'practice_domain':
      return { to: 'practice', domainId: resolvePart(t ?? 'focus', ctx.focus) };
    case 'mock_mini':
      return { to: 'mock', questions: miniMockSize(ctx.exam.questions), full: false };
    case 'mock_full':
      return { to: 'mock', questions: ctx.exam.questions, full: true };
    case 'mistakes':
      return { to: 'mistakes' };
    case 'glossary':
      return t ? { to: 'notes', q: t } : { to: 'notes' };
  }
}
