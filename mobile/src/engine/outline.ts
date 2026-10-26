/**
 * The study outline — the CISA blueprint as the study notes lay it out:
 * domain → part → topic (e.g. "4B1") → subtopic (e.g. "4B1.2") → the bank
 * questions each subtopic lists in `practiceIds`.
 *
 * Plain English for the founder:
 * - Study modes need to know "which topic is this question about?" and
 *   "what comes after this topic?". The notes already answer both (Build C
 *   added `practiceIds`), so this file turns the notes into a simple,
 *   ordered list of topics, each with its subtopics and question ids.
 * - The order is the order a learner reads the notes in: domain 1 first,
 *   then each domain's Part A topics, then Part B (topics no Part lists come
 *   last, exactly like the Study notes screen).
 *
 * Pure TypeScript: no React, no storage. Screens pass the notes pack in.
 */
import type { NotesPack } from '../content/notes/types';

export interface OutlineSubtopic {
  id: string; // "4B1.2"
  name: string;
  /** Bank question ids for this subtopic, in the note's own order. */
  questionIds: string[];
}

export interface OutlineTopic {
  id: string; // "4B1"
  domainId: string; // "4"
  name: string;
  subtopics: OutlineSubtopic[];
}

/** Every topic, in reading order. A cert without notes gives []. */
export function outlineFromNotes(pack: NotesPack | null | undefined): OutlineTopic[] {
  const topics: OutlineTopic[] = [];
  // A question listed by two notes belongs to the first (same rule as the
  // notes' subtopicOfQuestion index), so no question is walked twice.
  const seen = new Set<string>();
  for (const d of pack?.domains ?? []) {
    const byId = new Map(d.topics.map((t) => [t.id, t]));
    const listed = d.parts.flatMap((p) => p.topicIds).filter((id) => byId.has(id));
    const order = [...new Set(listed), ...d.topics.map((t) => t.id).filter((id) => !listed.includes(id))];
    for (const tid of order) {
      const t = byId.get(tid)!;
      topics.push({
        id: t.id,
        domainId: d.id,
        name: t.name,
        subtopics: t.subtopics.map((s) => ({
          id: s.id,
          name: s.name,
          questionIds: (s.practiceIds ?? []).filter((q) => (seen.has(q) ? false : (seen.add(q), true))),
        })),
      });
    }
  }
  return topics;
}

/** A topic's question ids, subtopic by subtopic. */
export function topicQuestionIds(t: OutlineTopic): string[] {
  return t.subtopics.flatMap((s) => s.questionIds);
}

/** Lookups built once per outline: question → subtopic and topic. */
export interface OutlineIndex {
  topics: OutlineTopic[];
  subtopicOf: (questionId: string) => string | undefined;
  topicOf: (questionId: string) => string | undefined;
  topic: (topicId: string) => OutlineTopic | undefined;
  subtopicName: (subtopicId: string) => string | undefined;
}

export function indexOutline(topics: OutlineTopic[]): OutlineIndex {
  const sub = new Map<string, string>();
  const top = new Map<string, string>();
  const names = new Map<string, string>();
  for (const t of topics) {
    for (const s of t.subtopics) {
      names.set(s.id, s.name);
      for (const q of s.questionIds) {
        sub.set(q, s.id);
        top.set(q, t.id);
      }
    }
  }
  const byId = new Map(topics.map((t) => [t.id, t]));
  return {
    topics,
    subtopicOf: (q) => sub.get(q),
    topicOf: (q) => top.get(q),
    topic: (id) => byId.get(id),
    subtopicName: (id) => names.get(id),
  };
}

/** The topics of one domain (or all of them when `domainId` is undefined). */
export function topicsIn(topics: OutlineTopic[], domainId?: string): OutlineTopic[] {
  return domainId ? topics.filter((t) => t.domainId === domainId) : topics;
}

/**
 * Results → "What you missed" (mobile 1.43): the notes behind the misses, each
 * with the question NUMBERS it explains (1-based, in the order shown), most-missed
 * first (ties keep first-miss order), at most `limit`; `rest` = the misses no shown
 * row covers (in a note past the limit, or in none). Two misses on one idea are
 * one row ("questions 3 and 7"), never two.
 */
export function missedNoteGroups(
  order: readonly string[],
  isMissed: (questionId: string) => boolean,
  subtopicOf: (questionId: string) => string | undefined,
  limit = 3,
): { groups: { id: string; numbers: number[] }[]; rest: number } {
  const byNote = new Map<string, number[]>(); // a Map keeps first-miss order
  let missed = 0;
  order.forEach((q, i) => {
    if (!isMissed(q)) return;
    missed += 1;
    const s = subtopicOf(q);
    if (s) byNote.set(s, [...(byNote.get(s) ?? []), i + 1]);
  });
  const groups = [...byNote.entries()]
    .map(([id, numbers], k) => ({ id, numbers, k }))
    .sort((x, y) => y.numbers.length - x.numbers.length || x.k - y.k)
    .slice(0, limit)
    .map(({ id, numbers }) => ({ id, numbers }));
  return { groups, rest: missed - groups.reduce((n, g) => n + g.numbers.length, 0) };
}

/**
 * Results → "Read the notes for what you missed" (mobile 1.20): the note
 * subtopics behind a session's missed questions, most-missed first (ties keep
 * the order the misses came in), each once, at most `limit`, with how many of
 * the misses each explains. Questions no note lists are skipped. Works for
 * mocks too: it only needs the ids.
 */
export function missedSubtopics(
  missedIds: readonly string[],
  subtopicOf: (questionId: string) => string | undefined,
  limit = 3,
): { id: string; missed: number }[] {
  const count = new Map<string, number>(); // a Map keeps first-miss order
  for (const q of missedIds) {
    const s = subtopicOf(q);
    if (s) count.set(s, (count.get(s) ?? 0) + 1);
  }
  return [...count.entries()]
    .map(([id, missed], i) => ({ id, missed, i }))
    .sort((x, y) => y.missed - x.missed || x.i - y.i)
    .slice(0, limit)
    .map(({ id, missed }) => ({ id, missed }));
}
