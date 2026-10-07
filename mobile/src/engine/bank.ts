/**
 * Question bank — the logic behind the "Question bank" browse screens.
 *
 * Pure TypeScript: it takes questions plus the learner's own answers and
 * bookmarks, and returns statuses, filtered lists and summary text. No
 * React, no storage, so it is easy to test.
 *
 * PRODUCT RULE (owner, 2026-10): never tell the learner how big the bank,
 * a domain or a topic is. Every count this file turns into text is the
 * learner's OWN progress (answered / missed / saved). That is why the
 * summary helpers take a `LearnerCounts` and nothing else: they cannot
 * print a total because they are never given one.
 */
import type { Difficulty, PackQuestion } from '../content/types';
import { shuffled, type Rng } from './random';
import type { AnswerRecord } from './readiness';

/** Where the learner stands on one question. */
export type QuestionStatus = 'new' | 'correct' | 'missed';

/** The filter chips on a domain screen. */
export type BankFilter = 'all' | 'new' | 'missed' | 'saved';

/** The most questions "Practise these" puts in one session. */
export const PRACTISE_CAP = 20;

/** Never answered → new; otherwise the LAST answer decides correct / missed. */
export function questionStatus(id: string, answers: Record<string, AnswerRecord>): QuestionStatus {
  const rec = answers[id];
  if (!rec) return 'new';
  return rec.lastCorrect ? 'correct' : 'missed';
}

/** Does this question pass the chosen filter chip? */
export function matchesFilter(status: QuestionStatus, saved: boolean, filter: BankFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'new':
      return status === 'new';
    case 'missed':
      return status === 'missed';
    case 'saved':
      return saved;
  }
}

/** The learner's own counts. Deliberately has no "total" field. */
export interface LearnerCounts {
  answered: number;
  missed: number;
  saved: number;
}

/** Count what the learner has done across some questions (a domain, a topic). */
export function learnerCounts(
  questions: readonly PackQuestion[],
  answers: Record<string, AnswerRecord>,
  bookmarks: readonly string[],
): LearnerCounts {
  const savedSet = new Set(bookmarks);
  let answered = 0;
  let missed = 0;
  let saved = 0;
  for (const q of questions) {
    const s = questionStatus(q.id, answers);
    if (s !== 'new') answered++;
    if (s === 'missed') missed++;
    if (savedSet.has(q.id)) saved++;
  }
  return { answered, missed, saved };
}

/**
 * One meta line for a domain row: "42 answered · 7 missed · 3 saved".
 * Zero parts are left out; nothing done yet reads "Not started yet".
 */
export function progressSummary(n: LearnerCounts): string {
  const parts: string[] = [];
  if (n.answered > 0) parts.push(`${n.answered} answered`);
  if (n.missed > 0) parts.push(`${n.missed} missed`);
  if (n.saved > 0) parts.push(`${n.saved} saved`);
  return parts.length ? parts.join(' · ') : 'Not started yet';
}

/** The friendly line at the top of a screen: "You've answered 42 · 7 missed · 3 saved". */
export function youveSummary(n: LearnerCounts): string {
  if (n.answered === 0 && n.saved === 0) return 'You haven’t answered any here yet.';
  // Saved but nothing answered: "You’ve saved 3".
  if (n.answered === 0) return `You’ve saved ${n.saved}`;
  const parts = [`You’ve answered ${n.answered}`];
  if (n.missed > 0) parts.push(`${n.missed} missed`);
  if (n.saved > 0) parts.push(`${n.saved} saved`);
  return parts.join(' · ');
}

/**
 * The learner's counts beside a topic header, or '' when there is nothing
 * to say (an untouched topic shows just its name, never its size).
 */
export function topicSummary(n: LearnerCounts): string {
  return n.answered > 0 || n.saved > 0 ? progressSummary(n) : '';
}

/** One row in the domain screen's list: a topic header or a question. */
export type BankItem =
  | { kind: 'topic'; key: string; title: string; summary: string }
  | {
      kind: 'question';
      key: string;
      id: string;
      /** The stem's first paragraph (the row clamps it to two lines). */
      firstLine: string;
      status: QuestionStatus;
      saved: boolean;
      difficulty: Difficulty;
      topic: string;
    };

/** The first paragraph of a stem, trimmed (stems can contain line breaks). */
export function firstLine(stem: string): string {
  return (stem.split(/\r?\n/).find((l) => l.trim()) ?? '').trim();
}

/**
 * Build the domain screen's list: questions that pass the filter, grouped
 * under topic headers (A→Z by the short topic name), bank order inside a
 * topic. `topicOf` turns a raw subtopic into its short display form; it is
 * passed in so this file stays free of UI helpers.
 */
export function buildBankList(
  questions: readonly PackQuestion[],
  answers: Record<string, AnswerRecord>,
  bookmarks: readonly string[],
  filter: BankFilter,
  topicOf: (subtopic: string) => string,
): BankItem[] {
  const savedSet = new Set(bookmarks);
  // Group the WHOLE domain first, so a topic's counts describe the topic,
  // not just the rows that survived the filter.
  const groups = new Map<string, PackQuestion[]>();
  for (const q of questions) {
    const topic = topicOf(q.subtopic) || 'Other';
    const list = groups.get(topic);
    if (list) list.push(q);
    else groups.set(topic, [q]);
  }
  const topics = [...groups.keys()].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  const items: BankItem[] = [];
  for (const topic of topics) {
    const all = groups.get(topic)!;
    const shown = all.filter((q) => matchesFilter(questionStatus(q.id, answers), savedSet.has(q.id), filter));
    if (shown.length === 0) continue; // a topic with nothing left after filtering disappears
    items.push({
      kind: 'topic',
      key: `topic:${topic}`,
      title: topic,
      // A one-question topic's row already shows its status, so the header
      // stays quiet. Otherwise: the learner's own counts across the topic.
      summary: all.length > 1 ? topicSummary(learnerCounts(all, answers, bookmarks)) : '',
    });
    for (const q of shown) {
      items.push({
        kind: 'question',
        key: q.id,
        id: q.id,
        firstLine: firstLine(q.stem),
        status: questionStatus(q.id, answers),
        saved: savedSet.has(q.id),
        difficulty: q.difficulty,
        topic,
      });
    }
  }
  return items;
}

/** The question ids in a built list, in list order. */
export function listedIds(items: readonly BankItem[]): string[] {
  return items.flatMap((it) => (it.kind === 'question' ? [it.id] : []));
}

/** "Practise these": up to PRACTISE_CAP of the listed ids, in a random order. */
export function practiseSet(ids: readonly string[], rng: Rng, cap = PRACTISE_CAP): string[] {
  return shuffled(ids, rng).slice(0, cap);
}

/** Words for each status, used in the row's meta line and its spoken label. */
export const STATUS_LABEL: Record<QuestionStatus, string> = {
  new: 'Not yet answered',
  correct: 'Correct',
  missed: 'Missed',
};

/** Difficulty in sentence case ("Analysis"). */
export function difficultyLabel(d: Difficulty): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

/** The empty-state copy for a filter that matched nothing. */
export function emptyCopy(filter: BankFilter): { title: string; body: string } {
  switch (filter) {
    case 'missed':
      return { title: 'No missed questions here yet', body: 'Any question you get wrong in this domain will show up here.' };
    case 'saved':
      return { title: 'Nothing saved here yet', body: 'Tap the bookmark on any question to add it to your revision set.' };
    case 'new':
      return { title: 'You’ve answered them all', body: 'Try Missed to revisit the ones that caught you.' };
    case 'all':
      return { title: 'No questions here yet', body: 'New questions for this domain are on the way.' };
  }
}
