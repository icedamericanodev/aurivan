/**
 * The exam pack: "About the exam" (the guide) and "Final review week"
 * (seven day cards, two checklists and a cheat sheet), the app's shape.
 *
 * Source: ../data/exam/cisa_exam_guide.json and final_review_week.json,
 * rules in docs/content/EXAM_GUIDE_SCHEMA.md (shared with the web).
 * scripts/exam-guide-pack.cjs renames the snake_case fields to these and
 * checks every link. Each certification has its own pack; either half is
 * null when that cert has no file yet, and its rows hide.
 */

/** One link under a guide section. Always https; it opens in the browser. */
export interface GuideSource {
  label: string;
  url: string;
}

export interface GuideSection {
  /** Stable: the app deep-links to it (/exam-guide?section=exam-day). */
  id: string;
  title: string;
  summary: string;
  items: string[];
  /** Ordered steps (registering, applying). */
  steps?: string[];
  /** Only in the `domains` section: the outline names and weights. */
  domains?: { id: string; name: string; weight: number }[];
  sources: GuideSource[];
  /** YYYY-MM-DD this section's facts were checked. */
  asOf?: string;
}

export interface ExamGuide {
  title: string;
  description: string;
  /** YYYY-MM-DD the facts were last checked at the source. */
  lastChecked: string;
  disclaimer: string;
  /** The ONE "check isaca.org before you book" line. */
  checkBeforeBooking: string;
  sections: GuideSection[];
}

/** What a task opens (schema "Action kinds"). */
export type TaskActionKind = 'note' | 'principles' | 'practice_domain' | 'mock_mini' | 'mock_full' | 'mistakes' | 'glossary';
export interface TaskAction {
  kind: TaskActionKind;
  /** note: a topic or subtopic code; principles: a principle id, a family id or "top_slip";
   *  practice_domain: "1".."5", "focus" or "next_focus"; glossary: a term. */
  target?: string;
}

export interface WeekTask {
  text: string;
  action?: TaskAction;
  /** Cheat-sheet parts to open: "1".."5", "focus", "next_focus", "principles", "priority_words", "routine", "pace". */
  sheet?: string[];
}

export interface WeekDay {
  id: string; // "day-7"
  /** 7..1: the day this card is for, counted back from the exam. */
  daysBefore: number;
  title: string;
  goal: string;
  tasks: WeekTask[];
  remember: string;
}

export interface CheatSheet {
  domains: { id: string; name: string; points: { text: string; note?: string }[] }[];
  /** Every principle id once; the app shows each principle's own title and rule. */
  principles: { intro: string; ids: string[] };
  priorityWords: { word: string; meaning: string; cue: string }[];
  routine: { title: string; text: string }[];
  pace: string[];
}

export interface FinalWeek {
  title: string;
  updated: string;
  intro: string;
  howItWorks: string[];
  /** Counting down: daysBefore 7, 6, … 1. */
  days: WeekDay[];
  checklists: { eve: string[]; morning: string[] };
  cheatSheet: CheatSheet;
}

export interface ExamPack {
  certId: string;
  guide: ExamGuide | null;
  week: FinalWeek | null;
}
