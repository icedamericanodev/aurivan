/**
 * The phone Glossary's list (Grove Phase 4, PHASE4.md 7.3 phone; Sky's O2 answer, 5 Nov 2026).
 *
 * Plain English: the terms pack keeps each domain's terms in its own list. The Glossary screen shows
 * them as one A to Z list, narrowed by a search (the term, its short form or its meaning) and by an
 * area chip, then grouped by first letter ("A", "B" ...; a term that starts with a digit or a sign
 * goes under "#", first).
 *
 * Pure TypeScript: no React, no storage, no network. Not compiled into the website bundles.
 */

/** One term as the pack holds it (content/terms.ts KeyTerm). */
export interface GlossaryTerm {
  id: string;
  term: string;
  short?: string;
  meaning: string;
  note: string;
}

/** A term with the domain it came from. */
export type ListedTerm = GlossaryTerm & { domainId: string };

/** One letter's card. */
export interface GlossaryGroup {
  letter: string;
  terms: ListedTerm[];
}

/** A search shorter than this is ignored (one letter would match nearly everything). */
export const GLOSSARY_MIN_QUERY = 1;

/** Lower case, accents dropped, for a forgiving match ("Rto" finds "RTO"). */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Every term (or one area's, when `area` is set) whose name, short form or meaning holds the search,
 * A to Z by name. An empty search keeps every term. A missing pack gives [].
 */
export function matchTerms(pack: { domains: Readonly<Record<string, readonly GlossaryTerm[]>> } | null | undefined, query: string, area?: string): ListedTerm[] {
  if (!pack) return [];
  const q = fold(query.trim());
  const out: ListedTerm[] = [];
  for (const [domainId, terms] of Object.entries(pack.domains)) {
    if (area !== undefined && domainId !== area) continue;
    for (const t of terms) {
      if (q.length >= GLOSSARY_MIN_QUERY && !fold(`${t.term} ${t.short ?? ''} ${t.meaning}`).includes(q)) continue;
      out.push({ ...t, domainId });
    }
  }
  return out.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
}

/** The first-letter card a term goes in: "A" to "Z", or "#" for a digit or a sign. */
export function letterOf(term: string): string {
  const first = fold(term.trim()).charAt(0).toUpperCase();
  return first >= 'A' && first <= 'Z' ? first : '#';
}

/** Terms (already A to Z) grouped by first letter, in order; "#" comes first. Empty letters are left out. */
export function glossaryGroups(terms: readonly ListedTerm[]): GlossaryGroup[] {
  const map = new Map<string, ListedTerm[]>();
  for (const t of terms) {
    const l = letterOf(t.term);
    const list = map.get(l);
    if (list) list.push(t);
    else map.set(l, [t]);
  }
  return [...map.entries()].sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b))).map(([letter, list]) => ({ letter, terms: list }));
}
