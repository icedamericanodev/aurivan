/**
 * Help and feedback content (mobile 1.7): fixes shipped after learner
 * reports, the What's New list, the read-only "What's next" list and the
 * common questions. All bundled with the app: no network, so "no data
 * collected" stays true. Changes ship in a reviewed store build (never over
 * the air: compliance O1, Apple 2.5.2).
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
    version: '1.15.0',
    date: '2026-10-12',
    new: [
      'Tell Aurivan where you’re starting from and how long you have most days, and Today’s plan fits your time.',
      'New to audit? Your first days start with a short lesson before any questions.',
      'Experienced? An exam-focused plan leads with mocks and your weak spots.',
    ],
    improved: [
      'Times, paces and names now match across Today, Practice and You.',
      'Plainer words for readiness, hints and mistake tags, with an example for each tag.',
    ],
    fixed: ['Fixed a crash that could happen when planting or showing your plant on a phone.'],
  },
  {
    version: '1.14.0',
    date: '2026-10-12',
    new: [
      'Give your plant a look of its own: colours, a planter, a ground and a visitor that stops by on days you clear your plan.',
      'The badges you earn become keepsakes beside your plant, each one naming the skill behind it.',
      'Your plant comes alive: it breathes when you visit, smiles back on good days, and grows with a short moment of its own.',
    ],
    improved: [
      'Planting your first plant now ends with a small planting moment.',
      'Small plant pictures are easier to tell apart.',
      'With Reduce Motion on, your plant stays still and simply shows its new look.',
    ],
  },
  {
    version: '1.13.0',
    date: '2026-10-11',
    new: [
      'Grow your own plant. Pick a tree or a flower, give it a name, and watch it grow as your real progress across the exam outline grows. It never wilts and asks for nothing.',
      'Your plant shows what grows it next, and how each domain is coming along.',
    ],
    improved: [
      'Today shows your plant beside your readiness, and You has it at the top. The rings are still on You and your results.',
      'Your plant is optional: hide it, or give it a quieter look without a face, in Settings.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-10-11',
    new: [
      'Lessons open on a cover that shows what’s in them, and their diagrams now build step by step: steps along a path, layers on a stack, and stages along a timeline.',
      'Finishing a lesson adds a leaf to your branch, then offers practice on what you just learned or the next lesson.',
      'Each game has its own drawing and its own header, so a game never looks like a practice question.',
    ],
    improved: [
      'Learn shows at a glance which lessons are done, which is up next and why, and each topic’s lessons read as a trail.',
      'Sure Footing is now called Forecast, so it’s no longer confused with the Firm Footing badge. Your best scores and level are kept.',
      'Forecast explains its scoring before your first round instead of on top of the first question.',
      'A game’s round summary now shows your recent scores as a small trend line, and moving up a level has its own quiet moment.',
      'Lesson checks now give the same answer feedback as practice.',
      'Opening a section, marking a note as read and matching in games now move gently to show what changed. With Reduce Motion on, they simply fade.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-10-11',
    new: [
      'Badges now have higher tiers to grow into, and a new badge, Took Root, for making a whole topic stick.',
      'You can share a badge you’ve earned as a picture card, only when you choose to.',
    ],
    improved: [
      'Each domain’s badge now has its own emblem.',
      'Extra tiers that go beyond what the exam needs are clearly marked as Stretch.',
      'Results, You and Today’s numbers now read in plain words, such as “Correct 14 of 20” and “Under 1 min”, and a time shows the same way wherever you see it.',
    ],
    fixed: [
      'A very short session no longer shows “1 minute”, and a session left open overnight no longer counts the hours it sat idle.',
      'Domain scores on Results and the pace line no longer get cut off on smaller phones.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-10-11',
    new: [
      'Your badges are now a collection: each one is a medallion you can open to see its rule, how close you are and how to earn it.',
      'Next for your exam points you to the badge that helps your exam most right now, with a Study for this button.',
    ],
    improved: [
      'Badges sit on small shelves, each with its own count, and a new one gets a short, calm moment after your review.',
      'A small dot on You tells you when a new badge is waiting to be seen.',
      'Settings has a Show badges switch. Turn it off and you still earn them, quietly.',
    ],
    fixed: ['Restoring a backup can no longer bring back badges that the backed-up study doesn’t support.'],
  },
  {
    version: '1.9.0',
    date: '2026-10-11',
    new: [
      'Your progress now shows itself: when your readiness, your answers or a milestone moves up, the numbers roll up and the rings grow from where you last saw them, with a small note of what changed.',
      'Finishing the day’s plan, and reaching a milestone, now have their own short, quiet moment. Tap to skip it, and it shortens once you’ve seen it a few times.',
    ],
    improved: [
      'Dark mode has more depth: the main panel is gently lit, the paper texture is softer, and sheets stand apart from the screen behind them.',
      'Switching between light and dark now fades smoothly instead of flashing.',
      'Empty screens each have their own drawing, and All caught up tells you when your next review is due.',
      'The question bank only groups questions under a topic heading when there are several; a single question names its topic itself.',
      'With Reduce Motion on, you see the same numbers and words, without the movement.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-10-11',
    new: [
      'The app now moves with you, gently: buttons and answers respond to your touch, the next question turns in like a page, and your progress bar fills as you answer.',
      'Settings has a Motion choice: match your phone, or reduce movement to short fades in this app only.',
    ],
    improved: [
      'Coach me now gently highlights the word that decides the question.',
      'Results after a one-domain session show just that domain, clearly.',
      'Your review count reads the same on Today, Practice and You.',
      'You can start a mini mock straight from You.',
      'Mock exams stay calm and exam-like: each question appears with a short fade, nothing slides.',
    ],
    fixed: [
      'Today no longer shows the readiness rings twice when your readiness is holding.',
      'A lesson’s first step no longer shows a Back button you can’t use.',
      'Turning on Reduce Motion on your phone now applies straight away, without restarting the app.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-11',
    new: [
      'Report a problem from any answered question, study note or lesson step, and from a game’s round recap. Your email app opens with the details filled in, and you can read everything before you send it.',
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
    title: 'Lessons and games that come alive',
    body: 'Lesson steps that build up one at a time, and games with a look of their own. Short fades instead of movement when Reduce Motion is on.',
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
    shippedIn: '1.15.0',
    title: 'A plan that fits your time',
    body: 'Say where you’re starting from and how long you have most days, and Today’s plan fits.',
  },
  {
    status: 'shipped',
    shippedIn: '1.14.0',
    title: 'A plant that grows with you',
    body: 'Pick a tree or a flower, watch it grow as you master your exam, and dress it with keepsakes from your badges.',
  },
  {
    status: 'shipped',
    shippedIn: '1.11.0',
    title: 'Badge tiers and sharing',
    body: 'Higher tiers to grow into, a badge for making a whole topic stick, and a card you can share when you choose to.',
  },
  {
    status: 'shipped',
    shippedIn: '1.10.0',
    title: 'Badges you can collect',
    body: 'Medallions on small shelves, each with its rule and how close you are, and a pointer to the badge that helps your exam most.',
  },
  {
    status: 'shipped',
    shippedIn: '1.9.0',
    title: 'Progress you can see',
    body: 'Numbers and rings that grow as you make progress, and quiet moments when you finish the day’s plan or reach a milestone.',
  },
  {
    status: 'shipped',
    shippedIn: '1.8.0',
    title: 'Gentle motion',
    body: 'Taps, answers and the next question respond with calm motion, and Settings lets you reduce it.',
  },
  {
    status: 'shipped',
    shippedIn: '1.7.0',
    title: 'Report a problem and Help',
    body: 'Report any answered question, note or lesson step from where you see it, and game cards from a round’s recap.',
  },
  {
    status: 'shipped',
    shippedIn: '1.6.0',
    title: 'Milestones and game levels',
    body: 'Quiet markers of what you’ve mastered, and levels that grow as you play.',
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
      'After you check an answer, tap Report a problem under the explanation. Study notes, lesson steps and a game’s round recap have the same link. Pick what looks wrong and add a note if you like.',
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
