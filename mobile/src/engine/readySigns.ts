/**
 * "Ready to book?" signs (web v12.41, the Progress page; panel-pm.md, owner
 * decision 2026-10-26: "the 3 simple signs"). A checklist of evidence, never
 * a verdict: each sign is in place or not yet, and when every sign is in
 * place the copy says it is this app's own study bar, not a prediction.
 *
 *   1. low      Your low end has stayed at READY_LOW (80%) or more for a week
 *               (examReady.readyHoldDays ≥ READY_DAYS). No day counter is
 *               shown for it: a count that resets reads like a streak.
 *   2. domains  Every domain at STEADY_FROM (70%) or more, from
 *               BAND_MIN_ANSWERS (30) answers each (domainBand).
 *   3. mocks    MOCKS_NEEDED (2) mocks, at least one a full-length timed mock.
 *               The only new rule: switchable off (`mockSign: false`) until
 *               the owner confirms it; then only signs 1 and 2 count.
 *
 * Pure TypeScript: no React, no storage. The website reads it from its
 * bundle (assets/kaisip-plant.js, KaiSipPlant.readySigns), so the web and the
 * app can never disagree about a sign.
 */
import { BAND_MIN_ANSWERS, STEADY_FROM } from './domainBand';
import { READY_DAYS, READY_LOW, readyHoldDays, type ReadinessDay } from './examReady';
import { timingOf, type MockTiming } from './pace';

/** Sign 3 needs this many mocks (any length)… */
export const MOCKS_NEEDED = 2;

export type SignId = 'low' | 'domains' | 'mocks';

export interface ReadySign {
  id: SignId;
  /** The sign, said the same way met or not. */
  title: string;
  met: boolean;
}

/** One domain's evidence: answers (unique questions) and its whole percent on latest tries. */
export interface SignDomain {
  id: string;
  answered: number;
  pct: number;
}

/** What sign 3 reads from a saved mock. */
export interface SignMock {
  total: number;
  timing?: MockTiming;
}

export interface ReadySignsInput {
  readinessLog: readonly ReadinessDay[] | undefined;
  /** "YYYY-MM-DD", the learner's local day. */
  today: string;
  domains: readonly SignDomain[];
  mocks: readonly SignMock[];
  /** The exam's length (a full mock has this many questions). */
  examQuestions: number;
  /** Sign 3 on (default) or off. */
  mockSign?: boolean;
}

export interface ReadySigns {
  signs: ReadySign[];
  allMet: boolean;
  /** Under the list: the all-met line, or the plain study-bar line. */
  line: string;
  /** Only when every sign is in place: where to check the booking rules. */
  isacaLine: string | null;
}

export const SIGN_TITLE: Record<SignId, string> = {
  low: `Your low end has stayed at ${READY_LOW}% or more for a week`,
  domains: `Every domain at ${STEADY_FROM}% or more, from ${BAND_MIN_ANSWERS}+ answers each`,
  mocks: `${MOCKS_NEEDED} mocks, one a full timed mock`,
};
export const SIGN_MET = 'In place';
export const SIGN_NOT_YET = 'Not yet';
/** The heading: no exam date set, or a date set. */
export const SIGNS_HEADING = 'Ready to book?';
export const SIGNS_HEADING_DATED = 'Signs for your exam date';
export const STUDY_BAR_NOTE = 'This app’s own study bar, not a prediction of your result.';
export const ISACA_LINE = 'Check isaca.org before you book.';

const COUNT_WORD: Record<number, string> = { 2: 'Both signs are', 3: 'All three signs are' };

/** "All three signs are in place. This is this app's own study bar, not a prediction of your result." */
export function allMetLine(n: number): string {
  return `${COUNT_WORD[n] ?? `All ${n} signs are`} in place. This is this app’s own study bar, not a prediction of your result.`;
}

/** Sign 2: every domain has the answers AND the percent (a domain under 30 answers is never "in place"). */
export function domainsMet(domains: readonly SignDomain[]): boolean {
  return domains.length > 0 && domains.every((d) => d.answered >= BAND_MIN_ANSWERS && d.pct >= STEADY_FROM);
}

/** Sign 3: at least MOCKS_NEEDED mocks, one of them the exam's full length and timed. */
export function mocksMet(mocks: readonly SignMock[], examQuestions: number): boolean {
  return mocks.length >= MOCKS_NEEDED && mocks.some((m) => m.total === examQuestions && timingOf(m.timing) !== 'untimed');
}

export function readySigns(input: ReadySignsInput): ReadySigns {
  const signs: ReadySign[] = [
    { id: 'low', title: SIGN_TITLE.low, met: readyHoldDays([...(input.readinessLog ?? [])], input.today) >= READY_DAYS },
    { id: 'domains', title: SIGN_TITLE.domains, met: domainsMet(input.domains) },
  ];
  if (input.mockSign !== false) signs.push({ id: 'mocks', title: SIGN_TITLE.mocks, met: mocksMet(input.mocks, input.examQuestions) });
  const allMet = signs.every((s) => s.met);
  return { signs, allMet, line: allMet ? allMetLine(signs.length) : STUDY_BAR_NOTE, isacaLine: allMet ? ISACA_LINE : null };
}
