/** Offline, descriptive evidence, never a diagnosis or a mastery score.
 * One saved latest miss per question. A correct later answer does not erase
 * that observation. Repeated misses replace it; there is no attempt history.
 */
import { PATTERN_ORDER, SLIP_COACH_MIN, isThinkingSlip, patternsOf, type SlipInput, type SlipPattern } from './slipCoach';
import { DAY_MS } from './srs';

export const DNA_DAYS = 28;
export const DNA_MIN_PATTERN = 3;
export interface DNAInput extends SlipInput { id: string; certId: string; at: number }
export interface DNAPattern {
  pattern: SlipPattern;
  count: number;
  selfReported: number;
  observed: number;
  /** Share of classified distinct mistakes, NOT share of all answers. Overlaps do not sum to 100. */
  percent: number;
}
export interface DNAWindow { total: number; classified: number; unclassified: number; tagged: number; patterns: DNAPattern[] }
export interface MistakeDNA extends DNAWindow {
  from: number;
  to: number;
  top: DNAPattern | null;
  tied: boolean;
  recent: DNAWindow;
  previous: DNAWindow;
  trend: 'less' | 'more' | 'similar' | 'insufficient';
}

export const DNA_COPY: Record<SlipPattern, { label: string; explanation: string }> = {
  'runner-up': { label: 'Final-two confusion', explanation: 'Your pick matched the alternative named in the authored Final two tip. Compare why the best answer fits this scenario better; this does not tell us which options you considered.' },
  priority: { label: 'Priority words', explanation: 'Your tags suggest that the priority in the question may need another look. Identify FIRST, BEST or MOST, then compare the options against that request.' },
  overconfident: { label: 'Sure, but incorrect', explanation: 'These incorrect answers were marked Sure. Before submitting, explain what evidence would rule out your choice.' },
  role: { label: 'Role confusion', explanation: 'Your tags suggest that the role may need another look. Ask who has authority to decide, and what the person in the question is responsible for.' },
  'tech-first': { label: 'Technology before process', explanation: 'Your tags suggest reviewing whether ownership, approval or a management process is needed before a technical solution.' },
  symptom: { label: 'Symptom or root cause', explanation: 'Your tags suggest comparing an immediate fix with an action that addresses why the issue happened. Follow what the question asks.' },
  misread: { label: 'Question interpretation', explanation: 'Your tags suggest revisiting the scenario’s last sentence. Restate what it asks before comparing the options.' },
  knowledge: { label: 'Concept needs review', explanation: 'You tagged a concept gap. Read the related study note in the mistake history, then explain the idea in your own words before fresh practice.' },
};

function summarize(rows: DNAInput[]): DNAWindow {
  const classified = rows.map((m) => ({ m, patterns: m.picked === m.correct ? [] : patternsOf(m) }));
  const denominator = classified.filter((x) => x.patterns.length > 0).length;
  const patterns = PATTERN_ORDER.map((pattern): DNAPattern => {
    const matches = classified.filter((x) => x.patterns.includes(pattern));
    const observed = pattern === 'runner-up' || pattern === 'overconfident';
    return { pattern, count: matches.length, selfReported: observed ? 0 : matches.length, observed: observed ? matches.length : 0, percent: denominator ? Math.round(100 * matches.length / denominator) : 0 };
  }).filter((x) => x.count > 0).sort((a, b) => b.count - a.count || PATTERN_ORDER.indexOf(a.pattern) - PATTERN_ORDER.indexOf(b.pattern));
  return { total: rows.length, classified: denominator, unclassified: rows.length - denominator, tagged: rows.filter((m) => isThinkingSlip(m.slip)).length, patterns };
}

/** `now` is explicit for reproducibility; cert filter is applied before deduplication. */
export function mistakeDNA(inputs: readonly DNAInput[], certId: string, now: number): MistakeDNA {
  const from = now - DNA_DAYS * DAY_MS;
  const midpoint = now - DNA_DAYS / 2 * DAY_MS;
  const unique = new Map<string, DNAInput>();
  for (const m of inputs) {
    if (m.certId !== certId || !m.id || !Number.isFinite(m.at) || m.at < from || m.at > now) continue;
    const prev = unique.get(m.id);
    // Equal timestamps keep the first observation; the saved journal already has unique keys.
    if (!prev || m.at > prev.at) unique.set(m.id, m);
  }
  const rows = [...unique.values()];
  const all = summarize(rows);
  const top = all.classified >= SLIP_COACH_MIN && (all.patterns[0]?.count ?? 0) >= DNA_MIN_PATTERN ? all.patterns[0] : null;
  const recent = summarize(rows.filter((m) => m.at >= midpoint));
  const previous = summarize(rows.filter((m) => m.at < midpoint));
  let trend: MistakeDNA['trend'] = 'insufficient';
  if (top && recent.classified >= SLIP_COACH_MIN && previous.classified >= SLIP_COACH_MIN) {
    const count = (w: DNAWindow) => w.patterns.find((p) => p.pattern === top.pattern)?.count ?? 0;
    // Integer cross-products keep exactly ten percentage points consistently similar.
    const change = 10 * (count(recent) * previous.classified - count(previous) * recent.classified);
    const threshold = recent.classified * previous.classified;
    trend = change < -threshold ? 'less' : change > threshold ? 'more' : 'similar';
  }
  return { ...all, from, to: now, top, tied: !!top && all.patterns[1]?.count === top.count, recent, previous, trend };
}
