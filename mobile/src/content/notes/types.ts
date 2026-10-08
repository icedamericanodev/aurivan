/**
 * Study notes: the app's shape for topic notes (schema v2).
 *
 * Source: ../data/cisa_notes.json, rules in docs/content/NOTES_SCHEMA_V2.md.
 * scripts/notes-pack.cjs renames the snake_case fields to these and drops
 * what the app never shows (exam weights, legacy ids). Domain names and
 * weights are NOT here on purpose: they come from content/certifications.ts,
 * the single source of exam facts.
 */

/** A word and its one-line meaning (subtopic key terms, domain glossary). */
export interface NoteTerm {
  term: string;
  definition: string;
}

/** "Compare" table: 2–4 similar ideas side by side. Each row has one cell per column. */
export interface NoteCompare {
  columns: string[];
  rows: { label: string; cells: string[] }[];
}

/**
 * A diagram. `svg` still holds CSS colour variables like var(--text);
 * engine/notesSvg.ts swaps them for the theme's colours when drawn.
 * width/height are the viewBox size, used to keep the proportions.
 */
export interface NoteIllustration {
  svg: string;
  /** What a screen reader says (the SVG's aria-label, or the caption). */
  label: string;
  caption?: string;
  width: number;
  height: number;
}

/** One subtopic: the page a learner reads. Fields are in render order. */
export interface NoteSubtopic {
  id: string; // e.g. "4B1.2": also the key for the learner's "read" tick
  domainId: string; // "4"
  topicId: string; // "4B1"
  name: string;
  /** "In one line". */
  definition: string;
  whyItMatters: string;
  howItWorks: string[];
  compare?: NoteCompare;
  types?: { term: string; meaning: string }[];
  /** One or more diagrams (the source allows a single one or a list). */
  illustrations?: NoteIllustration[];
  example: string;
  /** "How ISACA thinks". */
  isacaRule: string;
  examTraps: { trap: string; why: string }[];
  keyTerms: NoteTerm[];
  analogy?: string;
  memoryAid?: string;
}

/** One outline topic (e.g. 4B1) and its subtopics, foundation first. */
export interface NoteTopic {
  id: string;
  name: string;
  overview: string;
  /** "You should be able to…" statements. */
  canDo: string[];
  subtopics: NoteSubtopic[];
}

/** Part A / Part B of a domain, listing its topic ids. */
export interface NotePart {
  part: string;
  name: string;
  topicIds: string[];
}

export interface NoteDomain {
  id: string; // "1".."5", matches DomainInfo.id
  overview: string;
  analogy: string;
  parts: NotePart[];
  topics: NoteTopic[];
  keyTerms: NoteTerm[];
}

/** Everything for one certification. `domains` is empty until v2 notes land. */
export interface NotesPack {
  certId: string;
  schemaVersion: 2;
  domains: NoteDomain[];
  strategyTips: string[];
  connections: { connection: string; note: string }[];
}
