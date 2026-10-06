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
  | { type: 'flow'; heading: string; steps: { label: string; note: string }[]; caption?: string }
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
  scenes: Scene[];
}
