/**
 * Exam-mindset principles: the app's shape for them (schema v2).
 *
 * Source: ../data/mindset/principles.json, rules in
 * docs/content/PRINCIPLES_SCHEMA.md (one shared file for web and mobile).
 * scripts/principles-pack.cjs renames the snake_case fields to these and
 * sorts everything into reading order. Each certification has its own pack
 * (today only CISA has one), so another exam can add its own principles
 * later without touching this shape.
 */

/** A group of principles that answers one question a candidate asks under pressure. */
export interface PrincipleFamily {
  id: string; // "role", stable forever
  order: number; // 1..n, display order
  title: string; // "Your role"
  question: string; // "Who am I in this question, and who owns the decision?"
}

/** One principle: everything its detail page shows, in render order. */
export interface Principle {
  /** Stable forever: links, saved data and questions may carry it. */
  id: string;
  family: string; // a PrincipleFamily id
  order: number; // order inside its family
  title: string;
  rule: string; // one line
  why: string; // 2–3 sentences
  triggers: string[]; // stem words that signal it ("Spot it in the stem")
  trap: { move: string; whyWrong: string };
  example: { scenario: string; answer: string };
  nuance?: string; // when the rule bends
  domains: string[]; // "1".."5"
  subtopics: string[]; // study-note codes where it is taught
  /** Bank question ids that exercise it ("Practice this principle"). */
  practiceIds: string[];
  /** The slip coach pattern this principle is the main remedy for, if any. */
  slipPattern: string | null;
  /** Old ids it replaces (the web's first principle library). */
  legacyIds: string[];
  /** Other labels in question data that should resolve to it. */
  aliases: string[];
}

export interface PrinciplesPack {
  certId: string;
  families: PrincipleFamily[]; // sorted by order
  principles: Principle[]; // sorted: family order, then order
  /** Slip coach pattern id → the principle that coaches it (null: none fits). */
  slipMap: Record<string, string | null>;
}
