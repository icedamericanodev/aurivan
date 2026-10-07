/**
 * Small display formatters shared by screens.
 * Dates are written as "6 Oct" (DESIGN_SYSTEM.md, Voice): short, and the
 * same on every phone regardless of its locale settings.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A timestamp (ms) as "6 Oct", in the phone's local time zone. */
export function shortDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * A subtopic shortened for the question meta line (≤ 3 words, sentence case):
 * "Year-End Close. Job Scheduling Control Bypass" → "Year-end close".
 * Keeps acronyms (BCM, IS) and drops a dangling "and"/"of"/"the".
 */
const DANGLING = /^(and|or|of|the|a|an|for|to|in|on|at|by|with|from|into|during|after|before|under|over|within|via|&|vs\.?)$/i;

export function shortSubtopic(subtopic: string): string {
  const first = subtopic.split(/\.\s+/)[0] ?? '';
  const words = first.split(/\s+/).filter(Boolean).slice(0, 3);
  // Never end on a joining word ("Brand crisis during" → "Brand crisis").
  while (words.length > 1 && DANGLING.test(words[words.length - 1])) words.pop();
  const isAcronym = (w: string) => /^[A-Z0-9]{2,}/.test(w);
  return words
    .map((w, i) => {
      if (isAcronym(w)) return w;
      const lower = w.toLowerCase();
      return i === 0 ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
    })
    .join(' ');
}

/**
 * The first citation of a question's reference, without its long name,
 * for the one-line source row: "COBIT 2019 DSS01 (Managed Operations); ITIL 4 …"
 * → "COBIT 2019 DSS01".
 */
export function shortReference(reference: string): string {
  const first = reference.split(';')[0] ?? '';
  return first.replace(/\s*\([^)]*\)/g, '').trim();
}
