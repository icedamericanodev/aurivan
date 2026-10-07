/**
 * Tip labels. Exam-style v2 tips carry their own label as a prefix
 * ("Eliminate: …", "Final two: …", "Exam cue: …"); older tips follow the
 * trap → mindset → exam-day order and get a label by position.
 */
const LEGACY_LABELS = ['The trap', 'The mindset', 'Exam-day shortcut', 'One more thing'];
const V2_LABELS: Record<string, string> = {
  Eliminate: 'Eliminate two',
  'Final two': 'Final two',
  'Exam cue': 'Exam cue',
};

export function tipParts(tip: string, index: number): { label: string; body: string } {
  const m = tip.match(/^(Eliminate|Final two|Exam cue):\s*/);
  if (m) {
    const rest = tip.slice(m[0].length);
    // "Exam cue: suspected fraud…" reads as a sentence once the label moves out.
    return { label: V2_LABELS[m[1]], body: rest.charAt(0).toUpperCase() + rest.slice(1) };
  }
  return { label: LEGACY_LABELS[index] ?? 'Tip', body: tip };
}

/**
 * The "runner-up": the other option named in the "Final two:" tip
 * (e.g. "Final two: {{B}} beats {{C}} …" with key B → C). Letters are
 * ORIGINAL letters, read from the {{X}} tokens before any shuffling, so
 * compare them with the original letter the learner picked.
 * Returns undefined for older tips that have no "Final two:" line.
 */
export function runnerUp(tips: string[], correct: string): string | undefined {
  const finalTwo = tips.find((t) => /^Final two:/.test(t));
  if (!finalTwo) return undefined;
  const letters = [...finalTwo.matchAll(/\{\{([A-D])\}\}/g)].map((m) => m[1]);
  return letters.find((l) => l !== correct);
}
