/**
 * Calibrated Sprint — "bet your confidence, not your luck."
 *
 * Each answer carries a stake of 1, 2 or 3 chips. Right answers win the
 * stake; wrong answers lose it. The end screen compares how sure the learner
 * felt with how often they were right. Over-confidence is a silent reason
 * people fail: they skip review on topics they only think they know.
 */
export type Stake = 1 | 2 | 3;

export interface SprintResult {
  questionId: string;
  stake: Stake;
  correct: boolean;
}

export function sprintScore(results: SprintResult[]): number {
  return results.reduce((s, r) => s + (r.correct ? r.stake : -r.stake), 0);
}

export interface CalibrationBand {
  stake: Stake;
  answered: number;
  accuracy: number | null; // 0..1
}

/** Accuracy per confidence level. Well calibrated: 3-chip bets are right most. */
export function calibration(results: SprintResult[]): CalibrationBand[] {
  return ([1, 2, 3] as Stake[]).map((stake) => {
    const at = results.filter((r) => r.stake === stake);
    return {
      stake,
      answered: at.length,
      accuracy: at.length ? at.filter((r) => r.correct).length / at.length : null,
    };
  });
}

export type CalibrationVerdict = 'overconfident' | 'underconfident' | 'calibrated' | 'not-enough-data';

/** Plain-language verdict for the end screen. */
export function calibrationVerdict(results: SprintResult[]): CalibrationVerdict {
  const high = results.filter((r) => r.stake === 3);
  const low = results.filter((r) => r.stake === 1);
  if (high.length + low.length < 3) return 'not-enough-data';
  const acc = (rs: SprintResult[]) => (rs.length ? rs.filter((r) => r.correct).length / rs.length : null);
  const hi = acc(high);
  const lo = acc(low);
  if (hi !== null && hi < 0.7) return 'overconfident';
  if (lo !== null && lo > 0.8) return 'underconfident';
  return 'calibrated';
}

export const VERDICT_COPY: Record<CalibrationVerdict, string> = {
  overconfident:
    'Your high-confidence bets missed more than they should. Slow down on answers that feel obvious — the exam is built around tempting options.',
  underconfident:
    'You were right more often than you believed. Trust your reasoning a little more; second-guessing costs time.',
  calibrated: 'Your confidence matches your accuracy. That is exactly how strong candidates manage exam time.',
  'not-enough-data': 'Play a few more rounds and mix your bets to see your calibration.',
};
