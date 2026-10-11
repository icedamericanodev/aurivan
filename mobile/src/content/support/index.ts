/**
 * Help and feedback content (mobile 1.7): fixes shipped after learner
 * reports, the What's New list, the read-only "What's next" list and the
 * common questions. All bundled with the app: no network, so "no data
 * collected" stays true, and updates ship with the app or an over-the-air
 * update.
 *
 * Writing rules (CLAUDE.md "What's New style"): describe the benefit, not
 * the work. No question codes, no domain numbers, no counts of items, no
 * internal labels. src/__tests__/support-content.test.ts checks them.
 *
 * Content only: no React, no storage.
 */
import type { Fix, SupportTopic } from '../../engine/support';

// ── Fixes after learner reports ──────────────────────────────────────────
/**
 * The team adds one entry here in the SAME change that fixes a reported
 * item (docs/support/PLAYBOOK.md). Empty until the first fix ships.
 * The phone matches these against its own "Your reports" list; nothing is
 * uploaded or downloaded.
 */
export const FIXES: readonly Fix[] = require('./fixes.json') as Fix[];

// ── What's New ───────────────────────────────────────────────────────────
export interface WhatsNewEntry {
  /** Matches app.json expo.version ("1.7.0"); shown without a trailing ".0". */
  version: string;
  /** The day it shipped, YYYY-MM-DD. */
  date: string;
  new?: string[];
  improved?: string[];
  fixed?: string[];
}

/** Newest first. The first entry must match app.json (a test checks it). */
export const WHATS_NEW: readonly WhatsNewEntry[] = [
  {
    version: '1.7.0',
    date: '2026-10-11',
    new: [
      'Report a problem from any question, study note, lesson or game card. Your email app opens with the details filled in, and you can read everything before you send it.',
      'Help and feedback, in Settings and on You: quick answers to common questions, a way to suggest ideas, and an easy way to reach us.',
      'What’s new and What’s next, so you can see what changed and what we’re working on.',
    ],
    improved: [
      'The app remembers what you reported, so you don’t report the same thing twice, and tells you once it has been updated.',
    ],
  },
  {
    version: '1.6.1',
    date: '2026-10-11',
    improved: [
      'A round of a card game now counts as a study day for your streak.',
      'When a game level steps back, the message now says how to grow it again.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-10-10',
    new: [
      'Milestones: quiet markers of what you’ve mastered, each with a rule you can read before you earn it.',
      'Every game now has three levels, Seedling, Sapling and Heartwood, that grow as you play well.',
      'Three new games: Field Guide for key terms, Canopy Call for who decides, and Stepping Stones for steps in order.',
    ],
    fixed: ['Game answers no longer count toward milestones, and Play again starts on your new level.'],
  },
  {
    version: '1.5.0',
    date: '2026-10-10',
    new: [
      'Choose your path: Smart, Guided, In order or Random practice, for any domain.',
      'Practice a topic straight from the study notes.',
      'Two new games: Root or Rumor and Call It First.',
    ],
    improved: ['The Practice tab is simpler: one button starts your next set.'],
  },
  {
    version: '1.4.0',
    date: '2026-10-10',
    new: [
      'Mock exams can give you extra time or no clock at all, and you can hide the clock.',
      'Calm pace checks during a mock, and a pacing summary afterwards.',
      'An optional practice timer that counts up, never down.',
      'Daylight, a game for answering at exam pace.',
    ],
    fixed: ['A mock whose time ran out is now saved instead of lost.'],
  },
  {
    version: '1.3.0',
    date: '2026-10-10',
    new: ['Save a backup file of your progress and restore it on a new phone, with an undo if you change your mind.'],
  },
  {
    version: '1.2.0',
    date: '2026-10-10',
    new: ['Choose the time and the days for your study reminder.'],
    improved: [
      'Each game ends with a recap of what caught you.',
      'Questions you got right by guessing come back for review, so a lucky guess doesn’t count as learned.',
    ],
    fixed: ['Several lesson steps now appear in the right order.'],
  },
  {
    version: '1.1.0',
    date: '2026-10-09',
    new: [
      'The first Aurivan: a daily plan, practice and mock exams, spaced review and a mistake journal.',
      'Short lessons for every exam topic, study notes and brain games.',
      'Share your progress as a card.',
    ],
  },
];

/** "1.7.0" → "1.7"; "1.6.1" stays. */
export function shortVersion(v: string): string {
  return v.replace(/\.0$/, '');
}

// ── What's next (read-only; product W1) ──────────────────────────────────
export type NextStatus = 'progress' | 'planned' | 'shipped';
export interface NextItem {
  title: string;
  body: string;
  status: NextStatus;
  /** Shipped items: the version, so the row can open What's new. */
  shippedIn?: string;
}

/**
 * Honest and dateless: plans can change, so nothing here is a promise.
 * Up to 8 items per list (product W1).
 */
export const WHATS_NEXT: readonly NextItem[] = [
  {
    status: 'progress',
    title: 'A livelier, calm feel',
    body: 'Gentle motion that shows your progress as it happens. It stays still when Reduce Motion is on.',
  },
  {
    status: 'planned',
    title: 'A plant that grows with you',
    body: 'Pick a tree or a flower and watch it grow as you master your exam.',
  },
  {
    status: 'planned',
    title: 'An optional account',
    body: 'Sign in only if you want to, and keep your progress on more than one device. Everything keeps working without one.',
  },
  {
    status: 'planned',
    title: 'A feedback board',
    body: 'Suggest ideas, see what other learners asked for, and read what we decide and why.',
  },
  {
    status: 'shipped',
    shippedIn: '1.7.0',
    title: 'Report a problem and Help',
    body: 'Report any question, note, lesson or game card from where you see it.',
  },
  {
    status: 'shipped',
    shippedIn: '1.6.0',
    title: 'Milestones and game levels',
    body: 'Quiet markers of what you’ve mastered, and levels that grow as you play.',
  },
  {
    status: 'shipped',
    shippedIn: '1.5.0',
    title: 'Choose your path',
    body: 'Smart, Guided, In order or Random practice, for any domain.',
  },
];

// ── Common questions (product R5) ────────────────────────────────────────
export interface FaqEntry {
  id: string;
  question: string;
  /** Short paragraphs. */
  answer: string[];
  /** What "Still stuck? Email us" preselects in Contact support. */
  topic: SupportTopic;
}

export const FAQ: readonly FaqEntry[] = [
  {
    id: 'report',
    question: 'How do I report a problem in a question?',
    answer: [
      'After you check an answer, tap Report a problem under the explanation. Study notes, lesson steps and game cards have the same link. Pick what looks wrong and add a note if you like.',
      'Your email app opens with the question’s code filled in, so we know exactly which one. You can read and change everything before you send it.',
    ],
    topic: 'study',
  },
  {
    id: 'readiness',
    question: 'Why is my readiness a range?',
    answer: [
      'Readiness is an estimate from your answers, weighted by how much each domain counts on the exam. With fewer answers it is less certain, so it shows as a range that narrows as you answer more.',
      'It is a study estimate, not a prediction of your exam result.',
    ],
    topic: 'study',
  },
  {
    id: 'new-phone',
    question: 'How do I move my progress to a new phone?',
    answer: [
      'In Settings, under Your data, tap Save a backup and keep the file somewhere the new phone can reach, such as Files, Google Drive or your email.',
      'On the new phone, choose Restore from a backup on the welcome screen, or later in Settings. Aurivan never uploads your progress.',
    ],
    topic: 'backup',
  },
  {
    id: 'review',
    question: 'Why did my review count change?',
    answer: [
      'Questions come back for review on a schedule. Answer one right and it comes back later; miss it and it comes back sooner. So the number due goes up and down from day to day.',
      'Lucky guesses come back too, so a guess never counts as learned.',
    ],
    topic: 'study',
  },
  {
    id: 'reminders',
    question: 'Why don’t I get study reminders?',
    answer: [
      'Reminders stay off until you turn them on in Settings, under Study. Your phone must also allow notifications for Aurivan.',
      'You get at most one reminder a day, on the days you choose.',
    ],
    topic: 'reminders',
  },
  {
    id: 'data',
    question: 'What data does the app keep?',
    answer: [
      'Your progress, settings and the list of problems you reported stay on this phone. There is no account, no analytics and no tracking.',
      'If you email us, we see your email address and what you write. We use them only to reply and to fix the problem.',
    ],
    topic: 'privacy',
  },
  {
    id: 'exam-questions',
    question: 'Can I send you a question from my exam?',
    answer: [
      'Please don’t. Candidates agree to keep exam content confidential, so we can’t accept or use questions from the real exam. Every Aurivan question is written from scratch.',
      'Tell us the topic you’d like more practice on instead.',
    ],
    topic: 'study',
  },
  {
    id: 'isaca',
    question: 'Is Aurivan affiliated with ISACA?',
    answer: [
      'No. Aurivan is independent and is not affiliated with, endorsed by or sponsored by ISACA. CISA® is a registered trademark of ISACA.',
    ],
    topic: 'other',
  },
];
