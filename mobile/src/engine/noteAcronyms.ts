/**
 * "The letters in the title" (mobile 1.43, board 4): the acronyms in a study
 * note's title, spelled out right under it, so a first-time reader is not met
 * by a wall of letters ("Recovery Objectives: RPO, RTO, MTD and MBCO").
 *
 * No hand-kept list: the expansions come from the note's OWN text, where the
 * author already wrote them out the usual way, "recovery point objective
 * (RPO)" or "TOGAF (The Open Group Architecture Framework)". The key terms are
 * read first, then the rest of the note. An expansion is accepted only when
 * its words' first letters spell the acronym (small joining words like "and"
 * or "of" may be skipped), so a wrong pairing never shows. The plate shows
 * only when EVERY acronym in the title is found; otherwise nothing.
 *
 * Pure TypeScript: no React, no storage.
 */
import type { NoteSubtopic } from '../content/notes/types';

export interface TitleAcronym {
  /** As the title has it: "RPO"; a plural ("CAATs") only when its expansion is plural too, else "SLA". */
  term: string;
  /** Sentence case unless the note only ever writes it as a name: "Recovery point objective". */
  expansion: string;
}

/** Words that may sit inside an expansion without a letter of their own. */
const SKIPPABLE = new Set(['and', 'of', 'the', 'for', 'a', 'an', 'to', 'in', 'on', 'or']);
/** Exam domain words, never spelled out. */
const NOT_ACRONYMS = new Set(['IS', 'IT']);

/** The acronyms in a title, in order, each once: "RPO", "RTO", "MTD", "MBCO"; plural "s" dropped. */
export function titleAcronymTerms(title: string): string[] {
  const out: string[] = [];
  for (const m of title.matchAll(/\b([A-Z][A-Z0-9]{1,})s?\b/g)) {
    const t = m[1];
    if (NOT_ACRONYMS.has(t) || out.includes(t)) continue;
    out.push(t);
  }
  return out;
}

/**
 * A word's letters for matching: hyphenated parts each give a letter ("Computer-Assisted" → "ca"),
 * and a word in capitals gives all of its letters ("IT Audit Framework" → "itaf").
 */
function wordLetters(w: string): string[] {
  return w
    .split('-')
    .map((p) => p.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
    .flatMap((p) => (/^[A-Z]{2,}$/.test(p) ? p.toLowerCase().split('') : [p[0].toLowerCase()]));
}
const bare = (w: string) => w.replace(/[^A-Za-z]/g, '').toLowerCase();

/** Do these words spell `acr` by their first letters (skippable words may give no letter, never the first)? */
export function spells(words: readonly string[], acr: string): boolean {
  const target = acr.toLowerCase();
  // Every way through the words: each word gives its letters, or (a joining word, not the first) none.
  const go = (i: number, at: number): boolean => {
    if (i === words.length) return at === target.length;
    const ls = wordLetters(words[i]);
    if (ls.length && target.startsWith(ls.join(''), at) && go(i + 1, at + ls.length)) return true;
    return i > 0 && i < words.length - 1 && SKIPPABLE.has(bare(words[i])) && go(i + 1, at);
  };
  return words.length > 0 && go(0, 0);
}

/** "recovery point objective (RPO)": the fewest words before the brackets that spell it. */
function before(text: string, acr: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`([^()]{2,140}?)\\s*\\(\\s*${acr}s?\\s*\\)`, 'g');
  for (const m of text.matchAll(re)) {
    const words = m[1].trim().split(/\s+/);
    for (let k = 1; k <= Math.min(words.length, acr.length + 4); k++) {
      const pick = words.slice(words.length - k);
      if (spells(pick, acr)) {
        out.push(pick.join(' ').replace(/[,;:.]+$/, ''));
        break;
      }
    }
  }
  return out;
}

/** "TOGAF (The Open Group Architecture Framework)": the bracket's words spell it. */
function after(text: string, acr: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`\\b${acr}s?\\s*\\(([^()]{3,120})\\)`, 'g');
  for (const m of text.matchAll(re)) {
    const words = m[1].trim().split(/\s+/);
    if (spells(words, acr)) out.push(words.join(' '));
  }
  return out;
}

/** Every piece of text in the note, key terms first. */
function noteTexts(note: NoteSubtopic): string[] {
  const all: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') all.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(note.keyTerms);
  const { keyTerms: _k, illustrations: _i, practiceIds: _p, ...rest } = note;
  walk(rest);
  return all;
}

/** Title Case through and through ("System and Organization Controls"), as a name is written. */
const titleCased = (s: string) => s.split(/\s+/).every((w) => SKIPPABLE.has(w.toLowerCase()) || /^[A-Z0-9]/.test(w));

/**
 * The title's acronyms spelled out from the note's own text, or null when any
 * of them is not spelled out anywhere in it (then the page shows no plate).
 */
export function titleAcronyms(note: NoteSubtopic): TitleAcronym[] | null {
  const terms = titleAcronymTerms(note.name);
  if (terms.length === 0) return null;
  const texts = noteTexts(note);
  const out: TitleAcronym[] = [];
  for (const term of terms) {
    const found = texts.flatMap((t) => [...before(t, term), ...after(t, term)]);
    if (found.length === 0) return null;
    // Prose writes a common noun in lower case; a name is Title Case wherever it appears.
    const plain = found.find((x) => !titleCased(x));
    const pick = plain ?? found[0];
    // "CAATs" beside "Computer-assisted audit techniques"; "SLA" beside "Service level agreement".
    const plural = new RegExp(`\\b${term}s\\b`).test(note.name) && /s$/i.test(pick);
    out.push({ term: plural ? `${term}s` : term, expansion: pick.charAt(0).toUpperCase() + pick.slice(1) });
  }
  return out;
}
