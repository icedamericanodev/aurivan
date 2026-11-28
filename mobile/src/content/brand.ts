/**
 * The KaiSip brand promise ("Set A: Rings", chosen by the owner 2026-10-07).
 *
 * One place for the tagline, the line under it and the four pillars, so the
 * welcome screen and Settings → About always say the same thing.
 * Source of truth: docs/mobile/DESIGN_SYSTEM.md, "Brand".
 */

/** Which drawing (components/brand.tsx `PillarGlyph`) goes with a pillar. */
export type PillarGlyphKind = 'path' | 'roots' | 'seasons' | 'tall';

export interface Pillar {
  glyph: PillarGlyphKind;
  title: string;
  body: string;
}

/*
 * Mobile 1.39 (owner decision, 22 Oct 2026): the "Master Modern Risk." tagline and its
 * vision line are gone. Settings → About now leads with the same words as the welcome
 * (WELCOME_HEADLINE + WELCOME_LINE below), so the app tells one CISA story.
 */

/** Said instead of any list of "coming soon" certifications (About, the Certification picker). */
export const CERT_SCOPE_LINE = 'Starting with CISA. More certifications later.';

/**
 * How the content is made, in the SAME words wherever the app says it (About, the
 * "Is KaiSip affiliated with ISACA?" answer). Never "authored from primary sources"
 * and never a bare "AI-assisted".
 */
export const PROVENANCE_LINE =
  'Original questions and notes, written with AI assistance and checked against ISACA’s published exam outline and standards.';

/*
 * Transparency (owner request, 5 Nov 2026; spec: design-notes/grove/TRANSPARENCY.md).
 * Word for word from the spec. Keep every claim true: written WITH AI help (the app
 * generates nothing at runtime), checked by automated checks, AI review checks and the
 * founder, and NO outside panel of human reviewers. Never "experts", "verified" or
 * "accurate", never the question count, never an AI vendor's name.
 */

/** The short disclaimer: Settings → About and the welcome screen, the same words everywhere. */
export const AI_DISCLAIMER_LINE =
  'KaiSip’s questions and notes are written with AI help and can contain mistakes. Check anything important against ISACA’s own materials and your own judgment.';

/** Under the Report a problem sheet's title (content reports only, not app bugs). */
export const REPORT_AI_LINE = 'Written with AI help, so mistakes can slip through. Thanks for telling us.';

/**
 * The long disclaimer, split into short paragraphs for a phone screen. Joined with a
 * space it is the spec's text word for word (AI_LONG_DISCLAIMER). Help → Common
 * questions answers "How are the questions made and checked?" with it.
 */
export const AI_LONG_DISCLAIMER_PARAGRAPHS: readonly string[] = [
  'KaiSip’s questions, explanations and study notes are original. They are drafted with AI tools, directed by a CISA-certified founder, and each question is mapped to ISACA’s current CISA exam content outline.',
  'Before a question is added, it goes through automated checks and AI review checks (exam question style, technical accuracy, a blind answer test, sources and how current they are, consistency across domains, grammar, and whether the longest option gives the answer away). Then the founder reads the review reports and decides what to fix; not every question has been checked by hand yet. There is no outside panel of human reviewers yet.',
  'AI tools make mistakes, and so do people, so check anything important against ISACA’s own materials and your own judgment. If something looks wrong, use Report a problem; fixes ship in app updates.',
  'A readiness range is a study estimate, not a prediction of your exam result. KaiSip is not affiliated with or endorsed by ISACA.',
];
export const AI_LONG_DISCLAIMER = AI_LONG_DISCLAIMER_PARAGRAPHS.join(' ');

/** The link text for the page that explains it all (web and phone say the same). */
export const HOW_MADE_TITLE = 'How questions are made';

/**
 * The welcome screen (mobile 1.24): literal, not poetic. It names the exam and
 * the benefit, then says in four plain lines what a learner will actually do
 * and what the app does with their data. (The four brand pillars below still
 * live in Settings → About.)
 */
export const WELCOME_HEADLINE = 'Think like an IS auditor.';

/**
 * The welcome headline for a course (CIA_BANK_PLAN.md section 11): the course's own
 * `welcomeHeadline` when it has one, otherwise WELCOME_HEADLINE above. No course sets
 * one today, so every screen still reads "Think like an IS auditor.". A missing course
 * or a blank line also falls back, so the welcome is never empty.
 */
export function welcomeHeadline(cert?: { welcomeHeadline?: string }): string {
  return cert?.welcomeHeadline?.trim() || WELCOME_HEADLINE;
}
/*
 * Premium round 2 (expert ruling C, growth-marketer, 30 Oct 2026): the welcome is a title page, and
 * its sub is one plain line. One string, changed here (the one-story rule), so Settings → About says
 * the same; ® on its first prominent use. Store screenshot 1 is NOT changed (listing experiment B later).
 */
// Polish round 1 (DECISIONS 8, "No book labels on screen"): no "field guide" in what a learner reads.
export const WELCOME_LINE = 'Your CISA® exam study, one day at a time.';

/** What the welcome reads from a course: its name, its trademark and whether the mark is registered. */
export interface WelcomeCourse {
  name: string;
  /** The family mark when it is not the whole name ("CIA" for "CIA Part 1"). Missing → `name`. */
  mark?: string;
  /** false: an unconfirmed mark, written without ® ("AAIA"). */
  trademarkRegistered?: boolean;
  trademarkNotice?: string;
}

/**
 * A course's name with ® on its mark, for the welcome ("CISA®", "AAIA", and for a family mark
 * "CIA" on "CIA Part 1": "CIA® Part 1"). A name that does not start with its mark keeps no ®,
 * and neither does one where the mark is only the start of a longer word: the mark must be the
 * whole name or be followed by a word break (a space, a dash), never a letter or digit, so a
 * mark "CIA" never turns "CIAX" into "CIA®X".
 */
export function markedCourseName(cert: WelcomeCourse): string {
  if (cert.trademarkRegistered === false) return cert.name;
  const mark = cert.mark ?? cert.name;
  if (!mark || !cert.name.startsWith(mark)) return cert.name;
  const rest = cert.name.slice(mark.length);
  // A word break after the mark: the name ends there, or the next character is not a letter or digit
  // (a letter has an upper and a lower case; this also covers accented letters, with no regex flags).
  const next = rest.charAt(0);
  const wordBreak = rest === '' || !(/[0-9]/.test(next) || next.toLowerCase() !== next.toUpperCase());
  return wordBreak ? `${mark}®${rest}` : cert.name;
}

/**
 * The welcome's sub line for the chosen course (product review, 28 Nov 2026): "Your <course>
 * exam study, one day at a time." CISA reads WELCOME_LINE word for word ("Your CISA® exam
 * study…"); no course → WELCOME_LINE too, so the welcome is never empty.
 */
export function welcomeLine(cert?: WelcomeCourse): string {
  return cert ? `Your ${markedCourseName(cert)} exam study, one day at a time.` : WELCOME_LINE;
}
export const WELCOME_FACTS: readonly string[] = [
  // Mobile 1.41: the best feature first, in the web welcome's words (pre-beta review #10).
  'Questions that explain every option, the trap included.',
  'Your daily plan, built around your exam date.',
  'Progress shown as a range, never a promise.',
  'No account. Everything stays on your phone.',
];
/**
 * Said under the welcome facts (it used to sit on the exam step, which is gone).
 * Mobile 1.39: CISA only. The app teaches no ISC2 exam, so naming ISC2 here hinted
 * at a roadmap the welcome doesn't offer. Settings → About builds its notice from the
 * available certifications only (today CISA), so the two say the same thing.
 */
export const EXAM_TRADEMARK_LINE = 'Not affiliated with or endorsed by ISACA®. CISA® is a registered trademark of ISACA.';

/**
 * The welcome's trademark line for the chosen course: its own notice from certifications.ts
 * (CISA's is EXAM_TRADEMARK_LINE word for word), so a course from another issuer names that
 * issuer. A course with no notice → EXAM_TRADEMARK_LINE.
 */
export function welcomeTrademarkLine(cert?: WelcomeCourse): string {
  return cert?.trademarkNotice?.trim() || EXAM_TRADEMARK_LINE;
}

export const PILLARS: readonly Pillar[] = [
  { glyph: 'path', title: 'See the path', body: 'Know what to study next, and why it matters.' },
  { glyph: 'roots', title: 'Know why the best answer wins', body: 'Learn the principle behind every answer, not just the key.' },
  { glyph: 'seasons', title: 'Grow with the seasons', body: 'Your plan adjusts when your week or the frameworks change.' },
  { glyph: 'tall', title: 'Stand tall', body: 'Build the judgment your team and clients rely on.' },
];
