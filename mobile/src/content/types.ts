/**
 * Content types — the "shape" of every piece of study content.
 *
 * These are deliberately certification-neutral: a CISM, CRISC or CISSP
 * question uses exactly the same shape as a CISA question. That is what
 * lets one app serve many certifications.
 */

/** Option letters. Most ISACA / ISC2 items have 4 options (A–D). */
export type Letter = 'A' | 'B' | 'C' | 'D';
export const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

/** How hard a question is. Mirrors the mock-exam difficulty mix. */
export type Difficulty = 'foundational' | 'application' | 'analysis';

/** One practice question, as stored in a content pack. */
export interface PackQuestion {
  id: string; // e.g. "d1_001" — stable forever, progress is keyed on it
  certId: string; // e.g. "cisa"
  domainId: string; // e.g. "1"
  subtopic: string;
  difficulty: Difficulty;
  stem: string; // the question text
  scenario?: string; // optional longer case study shown above the stem
  options: Partial<Record<Letter, string>>;
  correct: Letter;
  keyConcept?: string;
  preRead?: string;
  /** Text may contain {{A}}-style tokens; see engine/shuffle.ts. */
  explanation: string;
  wrongExplanations: Partial<Record<Letter, string>>;
  tips: string[]; // Trap → Mindset → Exam-day shortcut (→ optional 4th)
  reference?: string; // framework citation, e.g. "ISACA IT Audit Standard 1001"
  related: string[];
}

/** One exam domain inside a certification. */
export interface DomainInfo {
  id: string; // "1".."n"
  name: string;
  short: string;
  weight: number; // % of the real exam (all domains sum to 100)
  color: string;
}

/** Facts about the real exam — used by mock exams and the readiness score. */
export interface ExamFormat {
  questions: number;
  minutes: number;
  /** Share of each difficulty in a mock exam (sums to 1). */
  difficultyMix: Record<Difficulty, number>;
  /** Shown to learners as guidance, never as a promise of the real cut-off. */
  passingNote: string;
}

export type CertStatus = 'available' | 'coming_soon';

/** Everything the app needs to know about one certification. */
export interface Certification {
  id: string;
  name: string; // "CISA"
  fullName: string; // "Certified Information Systems Auditor"
  issuer: 'ISACA' | 'ISC2';
  /** The "how the examiner thinks" lens, e.g. ISACA vs ISC2 manager mindset. */
  mindset: string;
  trademarkNotice: string;
  status: CertStatus;
  exam: ExamFormat;
  domains: DomainInfo[];
}
