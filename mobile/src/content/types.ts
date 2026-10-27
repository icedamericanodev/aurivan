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
  /**
   * The one exam-mindset principle this question MOST tests: a principle `id`
   * from the cert's principles pack (docs/content/PRINCIPLE_TAGGING.md).
   * Absent when no principle decides it. Mobile 1.31: the answer screen links to it, and the principle page counts and practises it (lib/principleQuestions.ts).
   */
  principleId?: string;
  /**
   * Content packs: a retired question stays in the pack so old progress still
   * makes sense. It is never dealt again (practice, mock, Smart, games, the bank
   * list: content/loader.ts pools) but still opens from a review, the mistake
   * journal or a bookmark (findQuestion). Absent = live. Its id is never reused.
   */
  retired?: boolean;
}

/** One exam domain inside a certification. */
export interface DomainInfo {
  id: string; // "1".."n"
  name: string;
  short: string;
  /**
   * An even shorter name for a narrow place (the rings' legend below 380 dp: "IS Ops"). Optional:
   * a domain without one shows `short`. The full name is still what a screen reader says.
   */
  tile?: string;
  /**
   * % of the real exam. The domains sum to about 100: an issuer may publish
   * rounded shares (17.3, 21.3) that sum to 99.9, which is fine, because every
   * mix (engine allocate) works from the shares, not from exactly 100.
   */
  weight: number;
  /** Colour tone 0–4 (see domainColor in certifications.ts). Never a hex value. */
  tone: DomainTone;
  /**
   * Firm Footing's emblem for this domain (mobile 1.11): the medallion art
   * (scripts/badge-art/emblems.mjs, "domain-<id>"). None: the tree-ring slice.
   */
  emblem?: DomainEmblem;
}

/** The five domain emblems the badge art has (an exam picks the apt one per domain). */
export type DomainEmblem = 'domain-audit' | 'domain-governance' | 'domain-build' | 'domain-operations' | 'domain-protection';

/** Index into the 5 domain tones: Lake, Moss, Ochre, Heather, Slate. */
export type DomainTone = 0 | 1 | 2 | 3 | 4;

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

/**
 * Who awards the certification (content packs: a downloaded pack carries the
 * same shape in its manifest, so a new issuer needs no app change).
 * `id` is a stable lower-case key ("isaca", "isc2"); `name` is how the
 * issuer writes itself, without ® ("ISACA", "ISC2").
 */
export interface CertIssuer {
  id: string;
  name: string;
}

/** Everything the app needs to know about one certification. */
export interface Certification {
  id: string;
  name: string; // "CISA"
  fullName: string; // "Certified Information Systems Auditor"
  issuer: CertIssuer;
  /** The "how the examiner thinks" lens, e.g. ISACA vs ISC2 manager mindset. */
  mindset: string;
  trademarkNotice: string;
  /** False when we can't confirm the mark is registered (plain "trademark", no ®). Defaults to true. */
  trademarkRegistered?: boolean;
  status: CertStatus;
  exam: ExamFormat;
  domains: DomainInfo[];
}
