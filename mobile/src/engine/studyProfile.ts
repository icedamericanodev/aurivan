/**
 * "Your study profile" (mobile 1.44, the owner's "Version 3"): the block at
 * the top of You, built ONLY from what the learner already chose and did.
 *
 * Plain English for the founder:
 * - It asks for nothing. It shows the learner's own name (or "Your study
 *   profile" without one), when they started, their exam date and daily
 *   time, and the starting point they picked.
 * - No completeness meter, no "%", no "2 things missing", and never "you
 *   planned 20 min but did 8" (behavior.md §7.3). A choice they have not made
 *   simply does not show.
 * - The name is cleaned again here (engine/displayName.ts), so a bad saved
 *   value can never reach the screen. It is only ever used on this phone.
 *
 * Pure TypeScript: no React, no storage.
 */
import { cleanDisplayName } from './displayName';
import { MONTH_NAMES } from './calendar';
import { dayKey, daysBetween } from './streak';

/** The saved study of one exam that can say when it began (all optional: older saves lack some). */
export interface FirstDayInput {
  answers?: Record<string, { lastAt: number }>;
  mistakes?: Record<string, { at: number }>;
  mocks?: readonly { finishedAt: number }[];
  mastery?: Record<string, { firstDay: string; firstAt?: number }>;
  /** Badges earned → when (epoch ms). Never removed, so the first one is a steady anchor. */
  earned?: Record<string, number>;
  /** The readiness log's days ("YYYY-MM-DD"). */
  readinessDays?: readonly string[];
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The first study day we can still see for this exam ("YYYY-MM-DD"), or
 * undefined before any study. It is the EARLIEST day among the exam's own
 * records (answers, mistakes, mocks, subtopic first days, badges, the
 * readiness log). The streak is left out on purpose: it is shared by every
 * exam and survives a Reset. Website progress added to the phone counts, so
 * "since" then starts on the website's first day, which is true.
 */
export function firstStudyDay(i: FirstDayInput): string | undefined {
  // The smallest timestamp first (cheap: numbers), then one day key.
  let min = Infinity;
  const take = (t: unknown) => {
    if (typeof t === 'number' && Number.isFinite(t) && t > 0 && t < min) min = t;
  };
  for (const a of Object.values(i.answers ?? {})) take(a?.lastAt);
  for (const m of Object.values(i.mistakes ?? {})) take(m?.at);
  for (const m of i.mocks ?? []) take(m?.finishedAt);
  for (const t of Object.values(i.earned ?? {})) take(t);
  let day = min === Infinity ? undefined : dayKey(min);
  const earlier = (d: unknown) => {
    if (typeof d === 'string' && DAY_RE.test(d) && (!day || d < day)) day = d;
  };
  for (const m of Object.values(i.mastery ?? {})) earlier(m?.firstDay);
  for (const d of i.readinessDays ?? []) earlier(d);
  return day;
}

/** Within this many days of today, a date leaves its year out ("26 Oct"); further off it keeps it ("26 Oct 2025"). */
export const SHORT_DATE_DAYS = 300;

/** "26 Oct" near today, "26 Oct 2025" further away. Spoken: "26 October" / "26 October 2025". */
export function profileDate(date: string, today: string): { shown: string; spoken: string } {
  const [y, m, d] = date.split('-').map(Number);
  const month = MONTH_NAMES[m - 1];
  const near = Math.abs(daysBetween(today, date)) < SHORT_DATE_DAYS;
  return near ? { shown: `${d} ${month.slice(0, 3)}`, spoken: `${d} ${month}` } : { shown: `${d} ${month.slice(0, 3)} ${y}`, spoken: `${d} ${month} ${y}` };
}

/**
 * The letter set in the leaf mark: the name's first character (with any
 * accents joined to it), in capitals. Empty when the name does not start with
 * a letter or a digit (an emoji, a symbol): the leaf then shows the plain
 * person glyph instead.
 */
export function nameInitial(name: string | null | undefined): string {
  const clean = cleanDisplayName(name);
  const m = /^[\p{L}\p{N}]\p{M}*/u.exec(clean);
  return m ? m[0].toLocaleUpperCase() : '';
}

export interface ProfileInput {
  /** The learner's name, as saved (cleaned again here). */
  name?: string | null;
  /** The exam's short name ("CISA"). */
  certName: string;
  /** firstStudyDay, when there has been any study. */
  since?: string;
  /** The exam date ("YYYY-MM-DD"), when set. */
  examDate?: string;
  /** Minutes most days (Settings → Daily time). */
  minutes?: number;
  /** The starting point's own words ("Some IT audit experience"), when the learner chose one. */
  startedWith?: string;
  /** Today's local day ("YYYY-MM-DD"). */
  today: string;
}

export interface ProfileLines {
  /** The cleaned name, or '' (the title is then "Your study profile" and the row offers "Add your name"). */
  name: string;
  /** The `headline` title: the name, or "Your study profile". */
  title: string;
  /** "Studying for CISA since 26 Oct" ("Studying for CISA" before any study). */
  since: string;
  /** "Exam 14 Feb · about 20 min most days"; null when there is neither. */
  plan: string | null;
  /** "Started with: Some IT audit experience"; null when no starting point was chosen. */
  started: string | null;
  /** The whole block as ONE spoken sentence. */
  spoken: string;
}

/** The title without a name. */
export const PROFILE_TITLE = 'Your study profile';
/** The row's action without a name (it opens Settings → Your name). */
export const PROFILE_ADD_NAME = 'Add your name';

/** "Some IT audit experience" → "some IT audit experience" (an acronym or a capital-only word keeps its capitals). */
function lowerFirst(s: string): string {
  return /^\p{Lu}\p{Lu}/u.test(s) ? s : s.charAt(0).toLocaleLowerCase() + s.slice(1);
}

/** The profile block's words, shown and spoken. */
export function profileLines(i: ProfileInput): ProfileLines {
  const name = cleanDisplayName(i.name);
  const since = i.since && DAY_RE.test(i.since) ? profileDate(i.since, i.today) : null;
  // The exam date shows while it is still ahead (or today); a date that has passed is left out.
  const exam = i.examDate && DAY_RE.test(i.examDate) && daysBetween(i.today, i.examDate) >= 0 ? profileDate(i.examDate, i.today) : null;
  const minutes = typeof i.minutes === 'number' && i.minutes > 0 ? Math.round(i.minutes) : null;

  const sinceLine = since ? `Studying for ${i.certName} since ${since.shown}` : `Studying for ${i.certName}`;
  const planParts = [exam ? `Exam ${exam.shown}` : null, minutes ? `about ${minutes} min most days` : null].filter(Boolean) as string[];
  const plan = planParts.length ? planParts.join(' · ') : null;
  const started = i.startedWith ? `Started with: ${i.startedWith}` : null;

  return {
    name,
    title: name || PROFILE_TITLE,
    since: sinceLine,
    // "about 20 min most days" alone starts the line, so it starts with a capital.
    plan: plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : null,
    started,
    // One sentence, commas between the parts (a screen reader pauses at each). It starts with the
    // visible title (WCAG 2.5.3, UX review P3): "Maya, your study profile, …" or "Your study profile, …",
    // and without a name it ends with the row's visible action, "add your name".
    spoken: `${[
      name ? `${name}, your study profile` : PROFILE_TITLE,
      since ? `studying for ${i.certName} since ${since.spoken}` : `studying for ${i.certName}`,
      exam ? `exam on ${exam.spoken}` : null,
      minutes ? `about ${minutes} minutes most days` : null,
      i.startedWith ? `started with ${lowerFirst(i.startedWith)}` : null,
      name ? null : PROFILE_ADD_NAME.toLowerCase(),
    ]
      .filter(Boolean)
      .join(', ')}.`,
  };
}
