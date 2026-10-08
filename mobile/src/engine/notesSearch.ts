/**
 * Search across the study notes. Pure TypeScript (tested in notes.test.ts).
 *
 * How it ranks (plain English): every word the learner typed must START a
 * word somewhere in the subtopic ("hot" finds "hot site" and "hotfix", but
 * "site" never matches inside "website"). Then it asks where ALL the words
 * sit together: the title beats a key term, which beats the "In one line"
 * definition, which beats the rest of the text. Inside each of those, the
 * exact phrase ("hot site") beats scattered words. Ties keep reading order.
 */
import type { NoteSubtopic, NotesPack } from '../content/notes/types';

export interface NoteHit {
  subtopic: NoteSubtopic;
  /** Where the best match was, for the result's subtitle. */
  field: 'name' | 'term' | 'definition' | 'body';
  /** A short piece of text around the match. */
  snippet: string;
}

/** Lower-case, accents and punctuation removed, so "RTO's" finds "rto". */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function bodyText(s: NoteSubtopic): string {
  return [
    s.whyItMatters,
    ...s.howItWorks,
    // Table cells joined with " · " so a snippet never runs them together.
    ...(s.compare ? [s.compare.columns.join(' · '), ...s.compare.rows.map((r) => [r.label, ...r.cells].join(' · '))] : []),
    ...(s.types ?? []).flatMap((t) => [t.term, t.meaning]),
    ...(s.illustrations ?? []).map((i) => i.caption ?? ''),
    s.example,
    s.isacaRule,
    ...s.examTraps.flatMap((t) => [t.trap, t.why]),
    ...s.keyTerms.map((t) => t.definition),
    s.analogy ?? '',
    s.memoryAid ?? '',
  ].join(' \n ');
}

/**
 * ~90 characters around the match, cut at whole words, with "…" where cut.
 * `word` is matched case-blind at the start of a word.
 */
export function snippetAround(text: string, word: string, size = 90): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= size) return flat;
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const at = Math.max(0, flat.search(new RegExp(`(^|[^a-z0-9])${esc}`, 'i')));
  let start = Math.max(0, at - Math.floor(size / 3));
  let end = Math.min(flat.length, start + size);
  // Move the cuts back to the nearest space, so no word is cut in half.
  if (start > 0) start = flat.indexOf(' ', start) + 1 || start;
  if (end < flat.length) end = flat.lastIndexOf(' ', end) > start ? flat.lastIndexOf(' ', end) : end;
  return `${start > 0 ? '…' : ''}${flat.slice(start, end).trim()}${end < flat.length ? '…' : ''}`;
}

/** True when `word` starts a word of the (normalized) text. */
const startsWord = (text: string, word: string) => ` ${text}`.includes(` ${word}`);

/** Search every subtopic of the pack. Queries under 2 characters return nothing. */
export function searchNotes(pack: NotesPack | null, query: string, limit = 30): NoteHit[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (!pack || words.join('').length < 2) return [];
  const hits: { hit: NoteHit; rank: number; order: number }[] = [];
  let order = 0;
  for (const d of pack.domains) {
    for (const t of d.topics) {
      for (const s of t.subtopics) {
        order += 1;
        const name = normalize(s.name);
        const terms = normalize(s.keyTerms.map((k) => k.term).join(' '));
        const def = normalize(s.definition);
        const body = normalize(bodyText(s));
        const all = `${name} ${terms} ${def} ${body}`;
        if (!words.every((w) => startsWord(all, w))) continue;
        // Rank by the best single place that holds EVERY query word, so one
        // common word ("audit") in a title never outranks a full match below.
        const first = words[0];
        const phrase = words.join(' ');
        const holdsAll = (text: string) => words.every((w) => startsWord(text, w));
        const term = s.keyTerms.find((k) => holdsAll(normalize(k.term)));
        const field: NoteHit['field'] = holdsAll(name) ? 'name' : term ? 'term' : holdsAll(def) ? 'definition' : 'body';
        const fieldText = { name, term: term ? normalize(term.term) : '', definition: def, body }[field];
        // The exact phrase in that place ranks above the words scattered.
        const rank = { name: 0, term: 2, definition: 4, body: 6 }[field] + (startsWord(fieldText, phrase) ? 0 : 1);
        const source =
          field === 'term' && term
            ? `${term.term}: ${term.definition}`
            : field === 'body'
              ? bodyText(s)
              : s.definition;
        // Centre the snippet on the phrase if it is there, else on a query word.
        const plain = source.replace(/\s+/g, ' ');
        const lower = plain.toLowerCase();
        const word = lower.includes(phrase) ? phrase : (words.find((w) => lower.includes(w)) ?? first);
        hits.push({ hit: { subtopic: s, field, snippet: snippetAround(plain, word) }, rank, order });
      }
    }
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, limit)
    .map((h) => h.hit);
}

/** How many of these subtopics the learner has marked read. */
export function readCount(subtopicIds: string[], read: string[]): number {
  const set = new Set(read);
  return subtopicIds.filter((id) => set.has(id)).length;
}
