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
  | { type: 'idea'; heading: string; body: string }
  | { type: 'analogy'; heading: string; body: string }
  | { type: 'stack'; heading: string; layers: { label: string; note: string }[]; caption?: string }
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
   * Study-note subtopic ids this lesson teaches, e.g. ['4B1.2', '4B5.1'].
   * 1–4 ids, the primary first (its isaca_rule is the lesson's principle).
   * Each id must exist in the notes pack and sit under a code in `topics`.
   */
  notes?: string[];
  scenes: Scene[];
}
