/**
 * Help and feedback content (mobile 1.7): fixes shipped after learner
 * reports, the What's New list and the common questions. All bundled with
 * the app: no network, so "no data collected" stays true. Changes ship in a
 * reviewed store build (never over the air: compliance O1, Apple 2.5.2).
 *
 * There is no "What's next" list any more (removed in mobile 1.17.1, owner
 * decision): the plan stays internal (outside this public repo), and learners see a
 * change once it ships, in What's new.
 *
 * Writing rules (CLAUDE.md "What's New style"): describe the benefit, not
 * the work. No question codes, no domain numbers, no counts of items, no
 * internal labels, and no design-spec detail (how a moment moves, how long
 * it lasts, what each part is called inside the app): one plain benefit
 * sentence is enough. src/__tests__/support-content.test.ts checks them.
 *
 * Content only: no React, no storage.
 */
import type { Fix, SupportTopic } from '../../engine/support';
import { PROVENANCE_LINE } from '../brand';

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
    version: '1.54.1',
    date: '2026-10-31',
    fixed: ['After you finish or end a set, Back from Today now leaves the app instead of stepping through old screens.'],
  },
  {
    version: '1.54.0',
    date: '2026-10-30',
    improved: ['The app now runs on a newer, more secure foundation, and home-screen widgets fit their space on your screen more exactly.'],
  },
  {
    version: '1.53.0',
    date: '2026-10-30',
    new: [
      'After each answer, one clear plate shows your pick beside the best answer, and the coach tells you when you picked a trap.',
    ],
    improved: [
      'Every tab now shares the field guide look: the same buttons, lists and plates from Today to Learn, Practice and You.',
      'A calmer welcome page, and a new You tab icon.',
    ],
  },
  {
    version: '1.52.0',
    date: '2026-10-30',
    improved: [
      'Your readiness and area charts now show what changed since you last looked, and an answer’s tips appear in reading order.',
      'Clearer explanations of why the tempting wrong answer is wrong, across every domain.',
    ],
  },
  {
    version: '1.51.1',
    date: '2026-10-30',
    fixed: ['Badge settings and plant looks now point to the Herbarium, where your badges live.'],
  },
  {
    version: '1.51.0',
    date: '2026-10-29',
    improved: [
      'Today, You, results and badges now read like a field guide to your own study: your areas side by side on one scale, readiness as a study estimate, and badges pressed into a herbarium.',
      'A simpler menu with four tabs: the brain games now live in Practice as Drills, with your scores and levels kept.',
    ],
  },
  {
    version: '1.50.0',
    date: '2026-10-29',
    new: ['Your plant now grows into new forms as your knowledge holds, each with its own name and a short moment to see it arrive, and at its last growth you choose its final form.'],
  },
  {
    version: '1.49.0',
    date: '2026-10-29',
    improved: ['Answers end sooner: one next step after a miss, the question kept at the top, and the rest a tap away under ⋯. Lesson quick checks now look like practice answers.'],
  },
  {
    version: '1.48.0',
    date: '2026-10-28',
    new: ['New look for your home-screen widgets, plus a recall card, a daily key term and your road to the exam.'],
  },
  {
    version: '1.47.1',
    date: '2026-10-28',
    fixed: ['Home-screen widgets now update right after you study, and taps open the right place.'],
  },
  {
    version: '1.47.0',
    date: '2026-10-27',
    new: ['Home-screen widgets on Android: today’s plan, your plant, a daily exam rule, your week, a quick question and more. They never show your name, and you choose how much they show.'],
  },
  {
    version: '1.46.0',
    date: '2026-10-27',
    new: ['Five more lessons on decisions the exam tests often: security exceptions, hardened servers and networks, personal and unmanaged devices, paying for IT, and user-built tools and batch reruns.'],
    improved: [
      'Settings is now one page with clear groups, so each setting is easy to find.',
      'Your data and Help and about open on their own pages, and Settings shows your last backup on the way in.',
    ],
  },
  {
    version: '1.45.0',
    date: '2026-10-27',
    new: ['Five new lessons on decisions the exam tests often: attacks with no patch, resilience, breach notification, declaring a disaster, and who decides in IT governance.'],
    improved: [
      'A few existing lessons are clearer and more current, including when part of a release can wait and which second factors resist phishing.',
      'After a miss, Take the lesson now appears only when a lesson teaches that question’s idea.',
      'Lesson quick checks keep the letters of your answer and the best answer on screen, and keep your pick in view.',
    ],
  },
  {
    version: '1.44.0',
    date: '2026-10-26',
    new: ['You now opens with your study profile, and Today can greet you by a name or nickname you choose. It stays on this phone, and can come from your website progress.'],
  },
  {
    version: '1.43.0',
    date: '2026-10-26',
    improved: [
      'After a miss, the answer screen shows your pick beside the best answer and the key idea first. Read more opens the full explanation and the Eliminate two and Final two tips.',
      'Results lead with how many you got right, show each question as a leaf, and link straight to the notes for what you missed.',
      'Questions you miss now come back the next day, as Results says they will.',
      'You shows one readiness ring and a plain line for each area, with what has gone up since you last looked.',
      'Study notes spell out the acronyms in their title and open with the idea in one line.',
      'Settings groups are easier to tell apart, and the light or dark theme is one tap near the top.',
      'Learn, Practice and Play each open with their own card, so Today’s plan stands out.',
    ],
    fixed: ['A Settings button could stay drawn on screen after opening Settings.'],
  },
  {
    version: '1.42.1',
    date: '2026-10-24',
    improved: [
      'Spaced review is now called Questions to revisit, the same name as on the KaiSip website, so it is easy to find on both.',
      'Your exam date now comes along when you add your website progress, if this phone doesn’t have one yet.',
    ],
  },
  {
    version: '1.42.0',
    date: '2026-10-24',
    new: ['Studied on the KaiSip website? Restore from a backup now adds that progress to this phone, and shows what it will add first.'],
  },
  {
    version: '1.41.0',
    date: '2026-10-24',
    new: [
      'Short on time? Today offers 5 quick questions before you start, and they count toward your plan.',
      'Beta testers can turn on a short question on some days in Help, answered by email only when you choose.',
    ],
    improved: [
      'Your first question comes sooner: setup is one screen shorter, and you can add your name later.',
      'A plant is now offered after your first questions instead of planted for you. Plants you have stay as they are.',
      'Reminders now say what is waiting for you, and the last one says when they pause.',
      'Send feedback can now say something confused you, and Report a problem can say you couldn’t find something.',
    ],
  },
  {
    version: '1.40.1',
    date: '2026-10-23',
    fixed: ['The Privacy policy and Terms links in Settings now always appear.'],
  },
  {
    version: '1.40.0',
    date: '2026-10-22',
    new: ['New plants now grow as a calm botanical drawing, like a page from a field guide.'],
    improved: [
      'A face is now optional: choose Botanical, Storybook, or Storybook with a face under Style in Change its look. Plants you already have keep their look.',
      'Play starts with three core games to keep things simple. More games open as you practise, and any game you have already played stays.',
      'A game recap now shows a new badge only when that round earned it, with one Report a problem link at the end.',
    ],
  },
  {
    version: '1.39.0',
    date: '2026-10-22',
    improved: [
      'Questions no longer name their topic before you answer, so practice and mock scores show what you really know.',
      'Setting a study reminder after your first questions is now one simple choice, with a time you can change.',
      'Lessons are easier to read: shorter italic quotes, and short pages sit in the middle of the screen.',
      'Today, You, Results and the readiness report are calmer, with less repeated text and the main facts first.',
      'About KaiSip now says plainly what the app is for and how its questions and notes are made.',
    ],
  },
  {
    version: '1.38.0',
    date: '2026-10-21',
    new: [
      'New lessons on encryption keys, penetration testing, intrusion detection and segregation of duties.',
      'New lessons on disaster recovery testing, safe device disposal, database recovery, choosing a risk response and system testing.',
    ],
  },
  {
    version: '1.37.0',
    date: '2026-10-21',
    improved: ['After you answer a lesson check, the screen now scrolls to the explanation so you see why.'],
  },
  {
    version: '1.36.0',
    date: '2026-10-21',
    new: [
      'Six new lessons on running an audit: independence, keeping an audit on track, fraud, auditing transactions as they happen, writing findings, and audit quality.',
    ],
    fixed: ['The audit standard on fraud and illegal acts now shows its current title in question references.'],
  },
  {
    version: '1.35.0',
    date: '2026-10-20',
    new: [
      'New practice questions on reading the exam: when the priority word changes the answer, how to decide between the final two options, and why the IS auditor recommends rather than builds controls.',
    ],
    improved: ['Practice sets for those three principles are now fuller, and a few study notes now say which risks happen most often.'],
  },
  {
    version: '1.34.0',
    date: '2026-10-20',
    new: [
      'New practice questions on how advanced persistent threats, zero-days, container and Kubernetes risks, hidden IoT devices, business email compromise and logic bombs actually work.',
    ],
    improved: ['Several incident questions now ask what the IS auditor concludes after the incident, the way the exam frames them.'],
  },
  {
    version: '1.33.0',
    date: '2026-10-20',
    new: [
      'New practice questions on database monitoring and encryption, resilience testing, zero trust access, post-quantum cryptography, serverless computing, and Bluetooth and NFC.',
    ],
  },
  {
    version: '1.32.0',
    date: '2026-10-20',
    new: [
      'New study notes on database monitoring and encryption, operational resilience testing, secure access service edge and zero trust access, serverless computing, and Bluetooth and NFC.',
    ],
    improved: ['Post-quantum cryptography now has its own study note, with what to migrate first and why.'],
  },
  {
    version: '1.31.0',
    date: '2026-10-20',
    new: [
      'A new principle, "Fit the method to the objective": pick the audit approach that answers the question being asked.',
      'Many answers now link to the principle they test.',
    ],
    improved: ['Practice each principle with the questions that turn on it, new and missed ones first.'],
  },
  {
    version: '1.30.0',
    date: '2026-10-19',
    improved: [
      'Practice exams now spread their questions across every topic in the exam outline, so each mock covers the whole exam the way the real one does.',
      'Topic names shown on a question no longer hint at the answer.',
    ],
  },
  {
    version: '1.29.0',
    date: '2026-10-19',
    new: [
      'Some study notes now show how an IS auditor would audit the topic: what to review, the evidence to ask for, the usual recommendation and who decides.',
    ],
  },
  {
    version: '1.28.0',
    date: '2026-10-19',
    new: [
      'About the CISA exam: registration and fees, test center or online, exam day, results and how to become certified, with links to the official sources.',
      'Final review week: a calm seven-day plan for your last week, with one-tap tasks, a must-remember sheet you can quiz yourself on, and an exam-day routine.',
    ],
    improved: ['Exam week now follows the seven-day plan, and keeps the checklist you already started.'],
  },
  {
    version: '1.27.0',
    date: '2026-10-19',
    new: [
      'Your note: after you check an answer, add a short note in your own words. It comes back each time you see that question.',
      'Saved now lists the questions you have a note on.',
    ],
    improved: ['Bottom sheets stay above the keyboard while you type.'],
  },
  {
    version: '1.26.0',
    date: '2026-10-19',
    new: [
      'Principles: 20 rules of the IS auditor’s mindset in Learn, each with the words that signal it, the trap to avoid, a worked example and a short practice set.',
      'Your Mistake journal now links your most common slip to the principle that fixes it.',
    ],
    improved: [
      'Clearer wording for a few practice questions that sat in the wrong topic, and more questions now link to their study note.',
    ],
    fixed: ['A broken link to a note or principle now shows a calm “not found” page instead of an error.'],
  },
  {
    version: '1.25.0',
    date: '2026-10-18',
    new: ['Study notes now show how far you got: a circle that fills halfway once you start a note and all the way when you finish it.'],
    improved: [
      'A quick scroll to the bottom of a note no longer marks it as read before you have had time to read it.',
      'Settings can reset your note reading on its own. Your answers and scores stay.',
    ],
  },
  {
    version: '1.24.2',
    date: '2026-10-18',
    improved: ['Every practice question was re-checked by independent reviewers: clearer wording, more realistic wrong answers and up-to-date references.'],
    fixed: ['Explanations no longer turn words like “A SOC 2 report” into an answer letter after the options are shuffled.'],
  },
  {
    version: '1.24.1',
    date: '2026-10-16',
    fixed: ['KaiSip no longer shows a blank white screen when its fonts are slow to load: it starts with your phone’s own font instead.'],
  },
  {
    version: '1.24.0',
    date: '2026-10-15',
    new: [
      'A quicker start: three short questions about you, then your first five practice questions straight away.',
      'Play now opens with a drill picked from your own mistakes, and every game says in plain words what it trains.',
    ],
    improved: [
      'Today is calmer, with one clear plan and a short note the first time your readiness range appears.',
      'After a wrong answer, the key idea and the exam cue come first, and the longer explanation opens when you want it.',
      'Your readiness is more honest: answering a question again a few minutes after missing it no longer counts as learning it.',
      'Lessons and notes now call their exam-thinking sections The IS auditor’s lens.',
      'Reminders take a break by themselves when you have been away for a week.',
    ],
    fixed: ['If saved progress ever fails to load, KaiSip now offers to try again instead of staying on the start screen.'],
  },
  {
    version: '1.23.0',
    date: '2026-10-15',
    new: [
      'KaiSip has a fresh look and a new logo.',
      'Tell KaiSip what to call you, and Today says hello by your first name. It is optional and stays on your phone.',
    ],
  },
  {
    version: '1.22.0',
    date: '2026-10-15',
    new: ['The recovery timeline and other key diagrams in the notes are now drawn for your phone, so every label is easy to read.'],
    improved: [
      'Lessons read like pages of a book, start in the same place on every step, and keep Report a problem one tap away.',
      'After a wrong answer, the note and the lesson say what they open, and the result stays at the top as you read on.',
      'Study notes end with one clear next step, and mark themselves as read when you reach the end.',
      'Results are tidier after a short practice, and the Play tab has its own icon.',
    ],
  },
  {
    version: '1.21.0',
    date: '2026-10-15',
    new: ['Search the study notes right from Learn, and jump between the parts of a note.'],
    improved: [
      'A calmer, cleaner look across the app, with one clear next step on each screen.',
      'Diagrams in the notes now fit your screen; tap one to see it larger.',
      'You now opens with your readiness.',
    ],
  },
  {
    version: '1.20.0',
    date: '2026-10-15',
    new: [
      'After a wrong answer, you can open the note for exactly that idea, and replay its lesson if you haven’t done it yet.',
      'Lessons and study notes now point to each other, and your results list the notes for what you missed.',
    ],
    improved: [
      'Lessons and notes now use the wording the exam uses, with terms explained the first time they appear.',
      'Each domain’s notes fold by topic, so you can see what you’ve read at a glance.',
    ],
  },
  {
    version: '1.19.0',
    date: '2026-10-13',
    new: ['Settings can now check for the latest update and restart to apply it, under Help and about.'],
    improved: ['Settings also shows which update your app is running, which helps if you contact support.'],
  },
  {
    version: '1.18.0',
    date: '2026-10-12',
    new: ['The badge for questions you know for good is now called Flown the Nest, and you can share it.'],
    improved: ['Your plant’s proud moments now come only when you’ve truly earned them, and never while you’re answering.'],
  },
  {
    version: '1.17.1',
    date: '2026-10-12',
    improved: ['Help is simpler, and What’s new shows each change once it’s in the app.'],
  },
  {
    version: '1.17.0',
    date: '2026-10-12',
    new: ['Pick your exact exam date on a calendar.'],
    improved: [
      'Settings is tidier and easier to find your way around.',
      'Appearance now lives in one place, in Settings.',
    ],
  },
  {
    version: '1.16.1',
    date: '2026-10-12',
    improved: ['Switching between tabs is much faster, and answering questions no longer slows the app down.'],
  },
  {
    version: '1.16.0',
    date: '2026-10-12',
    new: [
      'A readiness report that shows how you’re tracking and what would help most.',
      'A calm exam-week plan with a short checklist for the practical side.',
    ],
    improved: [
      'Tap a past mock to see how each domain went.',
      'Your path now shows its steps, so you can see where you are.',
      'Practice starts a session that fits your daily time when you haven’t picked a length.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-10-12',
    new: [
      'Tell KaiSip where you’re starting from and how long you have most days, and Today’s plan fits your time.',
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
      'Give your plant a look of its own.',
      'The badges you earn can sit beside your plant as keepsakes.',
      'Your plant feels more alive, and growing has a short moment of its own.',
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
      'Grow and name your own plant: it grows with your real progress, never wilts and asks for nothing.',
      'Your plant shows what grows it next, and how each domain is coming along.',
    ],
    improved: [
      'Your plant sits on Today and You, beside your readiness.',
      'Your plant is optional: hide it, or give it a quieter look without a face, in Settings.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-10-11',
    new: [
      'Lessons open with a clear overview, and their diagrams are easier to follow.',
      'Finishing a lesson offers practice on what you just learned, or the next lesson.',
      'Each game now has a look of its own, so it never feels like a practice question.',
    ],
    improved: [
      'Learn shows at a glance what’s done and what’s up next.',
      'Sure Footing is now called Forecast, and your best scores and level are kept.',
      'Forecast explains its scoring before your first round.',
      'A game’s round summary now shows how your recent scores are going.',
      'Lesson checks now give the same answer feedback as practice.',
      'Small touches of motion show what changed, or simple fades with Reduce Motion on.',
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
      'Scores and times now read in plain words, the same way wherever you see them.',
    ],
    fixed: [
      'Session times are now right, even for a very short session or one left open overnight.',
      'Domain scores on Results and the pace line no longer get cut off on smaller phones.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-10-11',
    new: [
      'Your badges are now a collection: open any one to see how close you are and how to earn it.',
      'Next for your exam points you to the badge that helps your exam most right now.',
    ],
    improved: [
      'Badges are easier to browse, and a new one gets a short, calm moment.',
      'A small dot on You tells you when a new badge is waiting to be seen.',
      'Settings has a Show badges switch. Turn it off and you still earn them, quietly.',
    ],
    fixed: ['Restoring a backup can no longer bring back badges that the backed-up study doesn’t support.'],
  },
  {
    version: '1.9.0',
    date: '2026-10-11',
    new: [
      'You now see your readiness and milestones move up as you make progress.',
      'Finishing the day’s plan and reaching a milestone now have their own short, quiet moment.',
    ],
    improved: [
      'Dark mode has more depth and is easier on the eyes.',
      'Switching between light and dark now fades smoothly instead of flashing.',
      'All caught up now tells you when your next review is due.',
      'The question bank is easier to scan.',
      'With Reduce Motion on, you see the same numbers and words, without the movement.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-10-11',
    new: [
      'The app now responds to your touch with calm, gentle motion.',
      'Settings has a Motion choice: match your phone, or reduce movement to short fades in this app only.',
    ],
    improved: [
      'Coach me now gently highlights the word that decides the question.',
      'Results after a one-domain session show just that domain, clearly.',
      'Your review count reads the same on Today, Practice and You.',
      'You can start a mini mock straight from You.',
      'Mock exams stay calm and exam-like, with no sliding.',
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
      'Report a problem right where you see it, and read everything before you send it.',
      'Help and feedback: quick answers to common questions, a way to suggest ideas, and an easy way to reach us.',
      'What’s new, so you can see what changed.',
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
      'The first KaiSip: a daily plan, practice and mock exams, spaced review and a mistake journal.',
      'Short lessons for every exam topic, study notes and brain games.',
      'Share your progress as a card.',
    ],
  },
];

/**
 * The last line of What's new (mobile 1.17.1), in place of the old "What's
 * next" list: no plans, just how changes come about and where ideas go.
 */
export const WHATS_NEW_FOOTER = 'We improve the app regularly based on learner feedback. Have an idea? Send it from Help.';

/** "1.7.0" → "1.7"; "1.6.1" stays. */
export function shortVersion(v: string): string {
  return v.replace(/\.0$/, '');
}

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
      'On the new phone, choose Restore from a backup on the welcome screen, or later in Settings. KaiSip never uploads your progress.',
    ],
    topic: 'backup',
  },
  {
    id: 'from-website',
    question: 'Can I bring my progress from the KaiSip website?',
    answer: [
      'Yes. On the website, open Your data and choose Export progress. Then in the app, choose Restore from a backup, on the welcome screen or in Settings under Your data, and pick that file.',
      'KaiSip shows what it will add first. Your answers, saved questions, notes and mock results are added to what is already on this phone; nothing here is replaced or deleted.',
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
      'Reminders stay off until you turn them on in Settings, under Reminders. Your phone must also allow notifications for KaiSip.',
      'You get at most one reminder a day, on the days you choose.',
    ],
    topic: 'reminders',
  },
  {
    id: 'data',
    question: 'What data does the app keep?',
    answer: [
      'Your progress, settings, the notes you write on questions, the name you ask us to call you (optional) and the list of problems you reported stay on this phone, and in backups you save. There is no account, no analytics and no tracking.',
      'If you email us, we see your email address and what you write. We use them only to reply and to fix the problem.',
    ],
    topic: 'privacy',
  },
  {
    id: 'exam-questions',
    question: 'Can I send you a question from my exam?',
    answer: [
      'Please don’t. Candidates agree to keep exam content confidential, so we can’t accept or use questions from the real exam. Every KaiSip question is written from scratch.',
      'Tell us the topic you’d like more practice on instead.',
    ],
    topic: 'study',
  },
  {
    id: 'isaca',
    question: 'Is KaiSip affiliated with ISACA?',
    answer: [
      'No. KaiSip is independent and is not affiliated with, endorsed by or sponsored by ISACA. CISA® is a registered trademark of ISACA.',
      // Mobile 1.39: the one provenance line, in the same words as Settings → About (content/brand.ts PROVENANCE_LINE).
      PROVENANCE_LINE,
    ],
    topic: 'other',
  },
];
