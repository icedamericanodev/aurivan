/**
 * "Your reports" for screens: the phone's list, how many were updated after
 * the learner reported them, and which still owe a quiet "Updated after
 * your report" (engine/support.ts creditDue). `dueItems` counts the
 * different THINGS those are about (two reports about one question = 1),
 * so the copy picks "Something" or "Things" correctly (QA).
 * Matching happens on the phone against the bundled fixes list; nothing is
 * sent or fetched.
 */
import { useMemo } from 'react';
import { FIXES } from '../content/support';
import { creditDue, distinctItems, reportCounts, type ReportEntry } from '../engine/support';
import { useProgress } from '../store/progress';

// Stable empty list: a new [] each render would re-render forever.
const NONE: ReportEntry[] = [];

export function useReports() {
  const reports = useProgress((s) => s.reports ?? NONE);
  const due = useMemo(() => creditDue(reports, FIXES), [reports]);
  const counts = useMemo(() => reportCounts(reports, FIXES), [reports]);
  return { reports, due, dueItems: distinctItems(due), counts };
}

/** The Help row's subtitle for Your reports: "3 started on this phone · 1 updated". */
export function reportsSubtitle(counts: { started: number; updated: number }): string {
  if (counts.started === 0) return 'None yet. They’re listed here once you report one.';
  return `${counts.started} started on this phone${counts.updated ? ` · ${counts.updated} updated` : ''}`;
}
