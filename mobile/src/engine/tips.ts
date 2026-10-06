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
