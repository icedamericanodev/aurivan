/**
 * Motion lessons — short animated explainers built from DATA, not video.
 *
 * A lesson is 6–10 scenes. Each scene type has a reusable animated
 * template in src/components/lesson.tsx, so authors (people or agents)
 * write JSON-like data and the app animates it. Fixing an outdated fact
 * is a one-line edit, shipped without re-rendering any video.
 */
export type Scene =
  | { type: 'title'; kicker: string; title: string; subtitle: string }
  | {
      type: 'idea';
      heading: string;
      body: string;
      /**
       * Mobile 1.43 (opt-in, only for a body that really lists a few PARALLEL items): the same words,
       * split so the items can be drawn as a small numbered figure. `ideaListText(list)`
       * (content/lessons/ideaList.ts) must give back `body` exactly (a content test checks it).
       * Each item may mark where its label ends with "|": "authority| to access people and records".
       */
      list?: IdeaList;
    }
  | { type: 'analogy'; heading: string; body: string }
  | {
      type: 'stack';
      heading: string;
      layers: { label: string; note: string }[];
      caption?: string;
      /**
       * Opt-in: the items are parallel, not a ranking or a sequence (such as four conditions that must all hold).
       * Drawn with plain markers instead of 1, 2, 3… and kicked as "The parts", not "The layers", so the
       * order never reads as importance. Leave it off for stacks that really are ordered.
       */
      unordered?: boolean;
    }
  | {
      type: 'flow';
      heading: string;
      steps: { label: string; note: string }[];
      caption?: string;
      /**
       * How the sequence is drawn (mobile 1.12): 'steps' (default) = numbered
       * stops on a path, a procedure you carry out; 'timeline' = phases on a
       * time rail, something that unfolds over time (a life cycle, a cutover).
       */
      layout?: 'steps' | 'timeline';
    }
  | {
      type: 'compare';
      heading: string;
      left: { title: string; points: string[] };
      right: { title: string; points: string[] };
      caption?: string;
    }
  | { type: 'trap'; heading: string; trap: string; why: string }
  | { type: 'tip'; body: string }
  | { type: 'check'; question: string; options: string[]; correctIndex: number; explanation: string };

/**
 * A list inside an idea scene's body (mobile 1.43): `lead` (the words before the list), the items in
 * order, how the last one joins ("and" after a comma by default, the Oxford comma; `plainAnd` for
 * "a, b and c"), and an optional `close` sentence after it. Nothing is rewritten: joined, they ARE the body.
 */
export interface IdeaList {
  lead: string;
  items: string[];
  plainAnd?: boolean;
  close?: string;
}

export interface Lesson {
  id: string; // stable forever, progress is keyed on it
  certId: string;
  domainId: string;
  order: number; // position within the domain
  title: string;
  minutes: number;
  /** Trust: where this came from and when an expert last checked it. */
  provenance: string;
  references: string[];
  outlineVersion: string; // exam outline the lesson was checked against
  lastReviewed: string; // YYYY-MM-DD
  /**
   * Official exam outline codes this lesson teaches, e.g. ['4B1'].
   * Optional. For CISA, every code must appear in docs/content/CISA_ECO.md
   * (lessons.test.ts checks this).
   */
  topics?: string[];
  /**
   * Question-bank ids this lesson prepares a learner for, e.g. ['d4_082'].
   * Optional. Lesson checks must be PARALLEL to these items, never copies.
   * Used to offer "Review the lesson" when one of them is missed.
   */
  prepares?: string[];
  /**
   * Study-note subtopic ids this lesson introduces, e.g. ['4B1.2', '4B5.1'].
   * 1–4 ids, the primary note first. Each must exist in the notes pack and
   * belong to one of the lesson's `topics` (lessons.test.ts checks both).
   * Links a lesson to the reference page that goes deeper.
   */
  notes?: string[];
  scenes: Scene[];
}
