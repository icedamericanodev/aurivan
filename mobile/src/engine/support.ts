/**
 * Support by email: "Report a problem", "Send feedback" and "Contact
 * support" (mobile 1.7, Uplift Phase 1 "Ask and fix").
 *
 * Plain English:
 * - Aurivan never sends anything itself. These functions only WRITE an
 *   email (subject + body); lib/support.ts hands it to the learner's own
 *   email app through a mailto: link, and the learner reads, edits and
 *   sends it there.
 * - Every email carries only what we need to find and fix the item: its
 *   code, the reason, the app version and the phone's OS version. Never a
 *   name, exam date, score, progress, streak, device id or locale
 *   (docs: scratchpad support.md §6, security.md §7). No question text
 *   either: the code is enough, and it keeps content out of forwarded mail.
 * - Letters: the learner may see shuffled options. A report always names
 *   the ORIGINAL letter (the one in the question bank) and adds the letter
 *   that was on screen in brackets: "Your pick: A (shown as C)". The same
 *   rule as grading (CLAUDE.md hard rule 4, engine/shuffle.ts).
 * - "Your reports": a small log kept on the phone (and in the learner's own
 *   backup file), so the app can say "Reported 11 Oct" and, once a fix
 *   ships in a later update, "Updated after your report". Nothing is sent.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
import type { Letter } from '../content/types';
import { displayToOriginal, type Permutation } from './shuffle';
import { dayKey } from './streak';

// ── Limits ───────────────────────────────────────────────────────────────
/** The longest note a learner can add (characters). */
export const MAX_NOTE = 1000;
/**
 * The longest mailto: link we hand to the phone. Typical reports are about
 * 1,000 characters; a full 1,000-character note fits too. Mail apps on iOS
 * and Android accept much longer links, but a cap keeps us well clear of any
 * limit. A note that still doesn't fit (lots of emoji or non-Latin text,
 * which take up to 9 characters each once encoded) is shortened with "…".
 */
export const MAX_MAILTO = 4000;
/** How many reports the phone remembers (newest first). */
export const MAX_REPORTS = 200;

/** The line every email ends with (store compliance: exam content stays confidential). */
export const EXAM_CONTENT_LINE =
  'Please don’t include questions from the real exam. Candidates agree to keep exam content confidential, and we can’t use them.';

// ── What can be reported ─────────────────────────────────────────────────
export type ReportKind = 'question' | 'note' | 'lesson' | 'card' | 'app';

/** One choice in a list: a short code (for the subject and Gmail filters) and the words a learner reads. */
export interface Choice {
  code: string;
  label: string;
}

/**
 * The thing being reported, as the screen saw it.
 * - question: id "d4_217", name = its domain ("IS Operations");
 * - note: id "4A2.3", name = the note's title;
 * - lesson: id "cisa-l-d1-charter", name = the lesson title, step / steps (1-based);
 * - card: a game card id ("rumor:4B1.2:k1x9"), name = the game's name;
 * - app: a screen ("settings", "session-results"), name = how a learner calls it.
 */
export interface ReportTarget {
  kind: ReportKind;
  id: string;
  name?: string;
  step?: number;
  steps?: number;
  /** Where the learner was: "Practice review", "Mock review", "Study note"… */
  where: string;
  /** The option order on screen: perm[i] = the ORIGINAL letter in display slot i. Only when letters were shown. */
  perm?: Permutation;
  /** The learner's pick, as the DISPLAY letter they saw (needs perm). */
  pickedDisplay?: Letter;
  /** The learner's pick as an ORIGINAL letter, where no letters were on screen (the mistake journal). */
  pickedOriginal?: Letter;
  /** A part to preselect ("explanation" when opened from the explanation). */
  part?: string;
  /**
   * The options as shown (display letter + text), so "Which answer do you
   * think is best?" can list them. Shown in the sheet only: the email
   * carries letters, never option text.
   */
  options?: { display: Letter; text: string }[];
}

/** The reasons a learner can pick, per kind. Short, plain and kind (support.md §4.3). */
export const REASONS: Record<ReportKind, Choice[]> = {
  question: [
    { code: 'key', label: 'The marked answer looks wrong' },
    { code: 'two-right', label: 'Another option is also right' },
    { code: 'unclear', label: 'The wording is unclear' },
    { code: 'explanation', label: 'The explanation doesn’t match the answer' },
    { code: 'tip-letter', label: 'A tip names the wrong option' },
    { code: 'typo', label: 'Typo or grammar' },
    { code: 'outdated', label: 'Outdated standard or reference' },
    { code: 'other', label: 'Something else' },
  ],
  note: [
    { code: 'incorrect', label: 'Something here is incorrect' },
    { code: 'unclear', label: 'Hard to follow' },
    { code: 'diagram', label: 'A diagram is wrong or hard to read' },
    { code: 'missing', label: 'Something important is missing' },
    { code: 'typo', label: 'Typo or grammar' },
    { code: 'outdated', label: 'Outdated standard or reference' },
    { code: 'other', label: 'Something else' },
  ],
  lesson: [
    { code: 'incorrect', label: 'Something here is incorrect' },
    { code: 'key', label: 'The check question’s answer looks wrong' },
    { code: 'order', label: 'The steps are in the wrong order' },
    { code: 'unclear', label: 'Hard to follow' },
    { code: 'typo', label: 'Typo or grammar' },
    { code: 'other', label: 'Something else' },
  ],
  card: [
    { code: 'incorrect', label: 'Something on this card is wrong' },
    { code: 'key', label: 'The game marked me wrong, but I was right' },
    { code: 'unclear', label: 'Hard to follow' },
    { code: 'typo', label: 'Typo or grammar' },
    { code: 'other', label: 'Something else' },
  ],
  app: [
    { code: 'freeze', label: 'Something didn’t load or froze' },
    { code: 'display', label: 'Text is cut off or hard to read' },
    { code: 'score', label: 'A score or result looks wrong' },
    { code: 'timer', label: 'The timer or pacing looks wrong' },
    { code: 'reminder', label: 'A reminder didn’t arrive' },
    { code: 'other', label: 'Something else' },
  ],
};

/** "Which part?" choices, per kind (optional, more than one allowed). The app has none. */
export const PARTS: Record<ReportKind, Choice[]> = {
  question: [
    { code: 'question', label: 'Question' },
    { code: 'key', label: 'Answer key' },
    { code: 'explanation', label: 'Explanation' },
    { code: 'tips', label: 'Tips' },
  ],
  note: [
    { code: 'text', label: 'Text' },
    { code: 'diagram', label: 'Diagram' },
    { code: 'example', label: 'Example' },
    { code: 'other', label: 'Something else' },
  ],
  lesson: [
    { code: 'explanation', label: 'Explanation' },
    { code: 'check', label: 'Check question' },
    { code: 'order', label: 'Step order' },
    { code: 'diagram', label: 'Diagram' },
    { code: 'other', label: 'Something else' },
  ],
  card: [
    { code: 'statement', label: 'Statement' },
    { code: 'answer', label: 'Answer' },
    { code: 'other', label: 'Something else' },
  ],
  app: [],
};

/** The reasons that ask "Which answer do you think is best?" (only where letters were on screen). */
export const ASKS_FOR_ANSWER = new Set(['key', 'two-right']);

/** The words for a reason or part code ("key" → "The marked answer looks wrong"). */
export function labelOf(choices: readonly Choice[], code: string): string {
  return choices.find((c) => c.code === code)?.label ?? code;
}

// ── Item references ──────────────────────────────────────────────────────
/**
 * A stable reference for the reported item, used in "Your reports" and to
 * match fixes: "q:d4_217", "note:4A2.3", "lesson:cisa-l-d1-charter#3",
 * "card:rumor:4B1.2:k1x9", "app:settings".
 */
export function itemRef(t: Pick<ReportTarget, 'kind' | 'id' | 'step'>): string {
  switch (t.kind) {
    case 'question':
      return `q:${t.id}`;
    case 'note':
      return `note:${t.id}`;
    case 'lesson':
      return t.step ? `lesson:${t.id}#${t.step}` : `lesson:${t.id}`;
    case 'card':
      return `card:${t.id}`;
    case 'app':
      return `app:${t.id}`;
  }
}

/** An item reference read back: "lesson:cisa-l-d1-charter#3" → { kind: 'lesson', id, step: 3 }. Null if it isn't one. */
export function parseItemRef(item: string): { kind: ReportKind; id: string; step?: number } | null {
  const at = item.indexOf(':');
  if (at < 1) return null;
  const head = item.slice(0, at);
  const rest = item.slice(at + 1);
  if (!rest) return null;
  const KINDS: Record<string, ReportKind> = { q: 'question', note: 'note', lesson: 'lesson', card: 'card', app: 'app' };
  const kind: ReportKind | undefined = Object.prototype.hasOwnProperty.call(KINDS, head) ? KINDS[head] : undefined;
  if (!kind) return null;
  if (kind === 'lesson') {
    const [id, step] = rest.split('#');
    const n = Number(step);
    return step !== undefined && Number.isInteger(n) && n > 0 ? { kind, id, step: n } : { kind, id };
  }
  return { kind, id: rest };
}

/** The item as a reader names it in the email ("Question d4_217 (IS Operations)"). */
export function itemLine(t: ReportTarget): string {
  const named = (s: string) => (t.name ? `${s} (${t.name})` : s);
  switch (t.kind) {
    case 'question':
      return named(`Question ${t.id}`);
    case 'note':
      return named(`Note ${t.id}`);
    case 'lesson':
      return `Lesson ${t.id}${t.step ? `, step ${t.step}${t.steps ? ` of ${t.steps}` : ''}` : ''}${t.name ? ` (${t.name})` : ''}`;
    case 'card':
      return named(`Game card ${t.id}`);
    case 'app':
      return `The app (${t.name ?? t.id})`;
  }
}

/** What the subject names: the question code as learners see it ("d4_217"), otherwise the reference. */
function subjectItem(t: ReportTarget): string {
  return t.kind === 'question' ? t.id : itemRef(t);
}

// ── A report's reference code ────────────────────────────────────────────
// No 0/O, 1/I/L: easy to read aloud and to type back in a reply.
const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
/** "R-7K2Q": made on the phone, linked to nothing, so a learner and the team can talk about one report. */
export function newRef(rand: () => number): string {
  let out = '';
  for (let i = 0; i < 4; i++) out += REF_ALPHABET[Math.floor(rand() * REF_ALPHABET.length) % REF_ALPHABET.length];
  return `R-${out}`;
}
export const REF_RE = /^R-[2-9A-HJKMNP-Z]{4}$/;

// ── Small text helpers ───────────────────────────────────────────────────
/**
 * A learner's note, made safe to put in an email: Windows line ends become
 * \n, invisible control characters are dropped (tabs and new lines stay),
 * surrounding blank space is trimmed and it is cut to MAX_NOTE characters.
 * (encodeURIComponent then encodes everything, so a note can never add a
 * header to the email.)
 */
export function cleanNote(note: string, max = MAX_NOTE): string {
  const text = note
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  return Array.from(text).slice(0, max).join('').trimEnd();
}

/** "A (shown as C)": the ORIGINAL letter, then the letter that was on screen. */
export function letterWithShown(display: Letter, perm: Permutation): string {
  return `${displayToOriginal(display, perm)} (shown as ${display})`;
}

/** True when the shuffle changed the order (perm is not A, B, C, D). */
export function isShuffled(perm: Permutation): boolean {
  return perm.some((l, i) => l !== 'ABCD'[i]);
}

/** "A=C, B=A, C=D, D=B": each letter on screen = the bank's letter. */
export function shownOrder(perm: Permutation): string {
  return perm.map((orig, i) => `${'ABCD'[i]}=${orig}`).join(', ');
}

/** Display details a learner can choose to add (never personal): theme, text size, Reduce Motion. */
export interface DisplayDetails {
  theme: 'light' | 'dark';
  /** The phone's text-size multiplier (1 = 100%). */
  textScale: number;
  reduceMotion: boolean;
}
export function displayLine(d: DisplayDetails): string {
  return `Display: Theme ${d.theme} · Text size ${Math.round(d.textScale * 100)}% · Reduce Motion ${d.reduceMotion ? 'on' : 'off'}`;
}

/** The app and OS, as the email shows them: "Aurivan 1.7.0 (iOS 26)". */
export interface AppInfo {
  version: string;
  os: string;
}
const appLine = (app: AppInfo) => `App: Aurivan ${app.version} (${app.os})`;

export interface Email {
  subject: string;
  body: string;
}

// ── Report a problem ─────────────────────────────────────────────────────
export interface ReportInput {
  target: ReportTarget;
  /** A reason code from REASONS[target.kind]. */
  reason: string;
  /** Part codes from PARTS[target.kind] (optional). */
  parts?: string[];
  /** The learner's note (optional). */
  note?: string;
  /** "Which answer do you think is best?", as the DISPLAY letter chosen (needs target.perm). */
  suggestedDisplay?: Letter;
  /** "CISA". */
  certName: string;
  app: AppInfo;
  /** Month the questions were last reviewed ("Oct 2026"); questions only. */
  contentReviewed?: string;
  ref: string;
  /** Only when the learner ticked "Include display details". */
  display?: DisplayDetails;
}

const REPORT_PROMPT = 'What looks wrong? Anything you add helps us fix it faster.';
const KEEP_LINE = '-- Please keep the lines below. They tell us exactly what you saw. --';

/**
 * The lines a report carries about the item (no greeting, no note). The
 * sheet's "What we'll send" shows exactly these, so the learner can check
 * that nothing about them is included.
 */
export function reportDetails(input: Omit<ReportInput, 'note'>): string[] {
  const { target: t } = input;
  const lines = [`Item: ${itemLine(t)}`];
  const parts = (input.parts ?? []).map((p) => labelOf(PARTS[t.kind], p));
  if (parts.length) lines.push(`Part: ${parts.join(', ')}`);
  lines.push(`Reason: ${labelOf(REASONS[t.kind], input.reason)}`);
  if (t.perm && t.pickedDisplay) lines.push(`Your pick: ${letterWithShown(t.pickedDisplay, t.perm)}`);
  else if (t.pickedOriginal) lines.push(`Your pick: ${t.pickedOriginal}`);
  if (t.perm && input.suggestedDisplay) lines.push(`Suggested answer: ${letterWithShown(input.suggestedDisplay, t.perm)}`);
  if (t.perm && isShuffled(t.perm)) lines.push(`Shown order (screen = bank): ${shownOrder(t.perm)}`);
  lines.push(`Where: ${t.where}`);
  lines.push(`Certification: ${input.certName}`);
  lines.push(appLine(input.app));
  if (input.display) lines.push(displayLine(input.display));
  if (t.kind === 'question' && input.contentReviewed) lines.push(`Content reviewed: ${input.contentReviewed}`);
  lines.push(`Ref: ${input.ref}`);
  return lines;
}

/** Subject: "Aurivan · Report · CISA · d4_217 · key" (parseable for Gmail filters). */
export function reportSubject(input: Pick<ReportInput, 'target' | 'reason' | 'certName'>): string {
  return `Aurivan · Report · ${input.certName} · ${subjectItem(input.target)} · ${input.reason}`;
}

function letter(opening: string, details: string[], keepLine: string): string {
  return ['Hi Aurivan team,', '', opening, '', '', '', keepLine, ...details, '', EXAM_CONTENT_LINE].join('\n');
}

export function buildReportEmail(input: ReportInput): Email {
  const note = cleanNote(input.note ?? '');
  return { subject: reportSubject(input), body: letter(note || REPORT_PROMPT, reportDetails(input), KEEP_LINE) };
}

// ── Send feedback ────────────────────────────────────────────────────────
export type FeedbackKind = 'idea' | 'like' | 'other';
export const FEEDBACK_KINDS: (Choice & { code: FeedbackKind; tag: string })[] = [
  { code: 'idea', label: 'An idea', tag: 'Idea' },
  { code: 'like', label: 'Something I like', tag: 'Like' },
  { code: 'other', label: 'Something else', tag: 'Other' },
];
const DETAILS_LINE = '-- Details (you can delete these) --';

export interface FeedbackInput {
  kind: FeedbackKind;
  message?: string;
  certName: string;
  app: AppInfo;
  /** Where it was opened from, when that helps ("What’s next"). */
  from?: string;
  display?: DisplayDetails;
}

export function buildFeedbackEmail(input: FeedbackInput): Email {
  const kind = FEEDBACK_KINDS.find((k) => k.code === input.kind) ?? FEEDBACK_KINDS[0];
  const details = [`Kind: ${kind.label}`, `Certification: ${input.certName}`, appLine(input.app)];
  if (input.from) details.push(`From: ${input.from}`);
  if (input.display) details.push(displayLine(input.display));
  const message = cleanNote(input.message ?? '');
  return {
    subject: `Aurivan · Feedback · ${kind.tag} · ${input.certName}`,
    body: letter(message || 'What would you like to tell us?', details, DETAILS_LINE),
  };
}

// ── Contact support ──────────────────────────────────────────────────────
export type SupportTopic = 'study' | 'backup' | 'reminders' | 'privacy' | 'other';
export const SUPPORT_TOPICS: (Choice & { code: SupportTopic; tag: string })[] = [
  { code: 'study', label: 'A study question or topic', tag: 'Study' },
  { code: 'backup', label: 'Backup, restore or a new phone', tag: 'Backup' },
  { code: 'reminders', label: 'Reminders', tag: 'Reminders' },
  { code: 'privacy', label: 'Your data and privacy', tag: 'Privacy' },
  { code: 'other', label: 'Something else', tag: 'Other' },
];

export interface SupportInput {
  topic: SupportTopic;
  certName: string;
  app: AppInfo;
  /** Where it was opened from ("Common questions: Backups"). */
  from?: string;
}

/**
 * Subject "Aurivan · Support · Backup · CISA". No message box in the app:
 * the learner writes in their email app. We never ask for a backup file;
 * if one is ever needed, the team asks in the reply.
 */
export function buildSupportEmail(input: SupportInput): Email {
  const topic = SUPPORT_TOPICS.find((t) => t.code === input.topic) ?? SUPPORT_TOPICS[SUPPORT_TOPICS.length - 1];
  const details = [`Topic: ${topic.label}`, `Certification: ${input.certName}`, appLine(input.app)];
  if (input.from) details.push(`From: ${input.from}`);
  return {
    subject: `Aurivan · Support · ${topic.tag} · ${input.certName}`,
    body: letter('What do you need help with?', details, DETAILS_LINE),
  };
}

// ── The mailto: link ─────────────────────────────────────────────────────
/** A plain email address check (the configured address must pass it). */
export const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** mailto:<to>?subject=…&body=… with every character of subject and body encoded. */
export function mailtoUrl(to: string, email: Email): string {
  return `mailto:${to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
}

/**
 * Build a report and its mailto: link, shortening the learner's note with
 * "…" only if the link would pass MAX_MAILTO (see the note there).
 */
export function fitReport(to: string, input: ReportInput, max = MAX_MAILTO): { email: Email; url: string; shortened: boolean } {
  let chars = Array.from(cleanNote(input.note ?? ''));
  let email = buildReportEmail({ ...input, note: chars.join('') });
  let url = mailtoUrl(to, email);
  let shortened = false;
  while (url.length > max && chars.length > 0) {
    // Drop a tenth of what's left each pass (at least one character).
    chars = chars.slice(0, Math.max(0, chars.length - Math.max(1, Math.ceil(chars.length / 10))));
    shortened = true;
    email = buildReportEmail({ ...input, note: chars.length ? `${chars.join('').trimEnd()}…` : '' });
    url = mailtoUrl(to, email);
  }
  return { email, url, shortened };
}

// ── Your reports (kept on the phone) ─────────────────────────────────────
export interface ReportEntry {
  /** "R-7K2Q". */
  ref: string;
  /** itemRef(): "q:d4_217". */
  item: string;
  /** Reason code ("key"). */
  reason: string;
  /** When the email app was opened (epoch ms). */
  at: number;
  /** Certification id ("cisa"). */
  cert: string;
  /** The "Your report helped" note for this report has been seen. */
  creditSeen?: boolean;
}

/** The log with a new report added, newest first, capped. */
export function addReport(list: readonly ReportEntry[] | undefined, entry: ReportEntry, cap = MAX_REPORTS): ReportEntry[] {
  return [entry, ...(list ?? [])].slice(0, cap);
}

/** The newest report about this item, if any ("Reported 11 Oct"). */
export function lastReportFor(list: readonly ReportEntry[] | undefined, cert: string, item: string): ReportEntry | undefined {
  return (list ?? []).find((r) => r.cert === cert && r.item === item);
}

// ── Fixes shipped after reports (bundled content/support/fixes.json) ─────
export type FixKind = 'corrected' | 'clarified' | 'removed';
export const FIX_KINDS: FixKind[] = ['corrected', 'clarified', 'removed'];

/**
 * One fix, as the team records it in content/support/fixes.json.
 * `ref` is an item reference (itemRef); a lesson ref without "#step"
 * covers every step. `date` is the day the fix shipped (YYYY-MM-DD).
 * `publicNote` is ONE general sentence, the What's New style: no question
 * text, no codes, no counts ("The answer key was corrected.").
 */
export interface Fix {
  ref: string;
  cert: string;
  date: string;
  kind: FixKind;
  publicNote: string;
}

/** True when a fix covers this report's item and shipped on a LATER day than the report. */
export function fixMatches(fix: Fix, report: ReportEntry): boolean {
  if (fix.cert !== report.cert) return false;
  const sameItem = fix.ref === report.item || (!fix.ref.includes('#') && report.item.startsWith(`${fix.ref}#`));
  return sameItem && fix.date > dayKey(report.at);
}

/** The newest fix for this report, if any. */
export function fixFor(report: ReportEntry, fixes: readonly Fix[]): Fix | undefined {
  return fixes.filter((f) => fixMatches(f, report)).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

/** Reports whose fix the learner hasn't been told about yet ("Your report helped", shown once). */
export function creditDue(reports: readonly ReportEntry[] | undefined, fixes: readonly Fix[]): ReportEntry[] {
  return (reports ?? []).filter((r) => !r.creditSeen && fixFor(r, fixes));
}

/** "3 started on this phone · 1 updated". */
export function reportCounts(reports: readonly ReportEntry[] | undefined, fixes: readonly Fix[]): { started: number; updated: number } {
  const list = reports ?? [];
  return { started: list.length, updated: list.filter((r) => fixFor(r, fixes)).length };
}

/**
 * Problems with a fixes list (the content test runs this on the bundled
 * file). Empty = fine. Keeps the public notes in the What's New style.
 */
export function fixesProblems(fixes: readonly Fix[], knownCerts: readonly string[]): string[] {
  const out: string[] = [];
  fixes.forEach((f, i) => {
    const at = `fixes[${i}]`;
    if (!/^(q|note|lesson|card|app):[A-Za-z0-9._:#-]{1,100}$/.test(f.ref)) out.push(`${at}.ref is not an item reference`);
    if (!knownCerts.includes(f.cert)) out.push(`${at}.cert is unknown`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) out.push(`${at}.date is not YYYY-MM-DD`);
    if (!FIX_KINDS.includes(f.kind)) out.push(`${at}.kind is not one of ${FIX_KINDS.join(', ')}`);
    if (typeof f.publicNote !== 'string' || f.publicNote.length < 10 || f.publicNote.length > 140) out.push(`${at}.publicNote must be 10–140 characters`);
    else {
      if (/\b[dD]\d_\d{2,}\b|\b\d[A-Z]\d(\.\d+)?\b/.test(f.publicNote)) out.push(`${at}.publicNote names a code`);
      if (/\b\d+\s+(questions?|items?|cards?|notes?)\b/i.test(f.publicNote)) out.push(`${at}.publicNote gives a count`);
      if (!/[.!]$/.test(f.publicNote)) out.push(`${at}.publicNote must be a sentence`);
    }
  });
  return out;
}
