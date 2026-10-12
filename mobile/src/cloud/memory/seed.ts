/**
 * Demo data for the memory backend in the screenshot build (SHOTS=cloud,
 * spec §1.7) and dev builds: one demo learner, maya@example.com, and a
 * second device's synced snapshot (for PR 7's screens).
 *
 * The screenshot script picks the starting state per page load through
 * localStorage key `aurivan.shots.cloud` (web only), JSON:
 *   { "signedIn": true, "authAgeMin": 30, "offline": false, "providers": ["email"], "remote": "progress", "syncFails": "server" }
 * Missing or unreadable = signed out. `authAgeMin` = how long ago Maya last
 * signed in (over 10 minutes, deleting her account asks her to confirm it's
 * her first). `providers` = her sign-in methods (default email and Google;
 * email only shows the delete screen's email code step). `remote` = what
 * Maya's account already holds from her other phone (Phase 7 sync shots):
 * "progress" (answers, a streak and an exam date), "newer" (written by a
 * newer app: sync pauses), "unreadable" (a copy the checker refuses: sync
 * pauses), or nothing extra (only her settings). `syncFails` = every sync
 * call fails with that code (a server problem: "We'll try again soon").
 *
 * The feedback board (PR 8, `boardSeed`): 12 posts in every status (votes,
 * comments, a team reply, a status history, a spoiler), one of Maya's posts
 * waiting for review, another member's post held for "exam recall",
 * reports (three on one comment, one "real exam content"), an appeal, a
 * staff member (Calm Birch 1), and Maya's notices. More shots-state keys:
 *   "boardJoined": false   Maya hasn't agreed to the guidelines yet (the gate)
 *   "boardStaff": true     Maya is staff (the moderation queue)
 *   "readScope": "everyone" | "author_staff"   (default "signed_in")
 *   "postingOpen": false   staff paused posting
 *   "boardBlocked": true   Maya has blocked one learner
 */
import Constants from 'expo-constants';
import { getAllQuestions } from '../../content/loader';
import { ALL_PROVIDERS, TERMS_VERSION, type Provider } from '../../engine/account';
import { dayKey } from '../../engine/streak';
import type { ReadScope } from '../types';
import type { MemoryOptions } from './backend';
import type { BoardSeed } from './board';

export const DEMO_USER_ID = 'mem-user-maya';
export const DEMO_EMAIL = 'maya@example.com';
/** Every code the demo sends (so a screenshot can type it). */
export const DEMO_CODE = '246810';

interface ShotsState {
  signedIn?: boolean;
  authAgeMin?: number;
  offline?: boolean;
  providers?: Provider[];
  remote?: 'progress' | 'newer' | 'unreadable';
  syncFails?: 'server';
  boardJoined?: boolean;
  boardStaff?: boolean;
  readScope?: ReadScope;
  postingOpen?: boolean;
  boardBlocked?: boolean;
}

/** The board's other people (none of them can sign in: they only wrote the seed). */
export const BOARD_STAFF_ID = 'mem-staff-birch';
const M = { cedar: 'mem-m-cedar', oak: 'mem-m-oak', willow: 'mem-m-willow', rowan: 'mem-m-rowan', fir: 'mem-m-fir', elm: 'mem-m-elm' };
export const BOARD_POST = {
  bcp: 'post-bcp-tests',
  timer: 'post-timer-lock',
  dark: 'post-dark-results',
  weekly: 'post-weekly-summary',
  audio: 'post-notes-audio',
  mocks: 'post-mock-lower',
  tablet: 'post-tablet',
  weights: 'post-domain-weights',
  change: 'post-change-mgmt',
  acronyms: 'post-acronym-search',
  hint: 'post-matching-hint',
  weekend: 'post-weekend-reminder',
  mayaHeld: 'post-maya-subtopic',
  recall: 'post-held-recall',
} as const;

/**
 * The feedback board's demo rows. Statuses: open (2), under review (2),
 * planned (2), in progress, shipped (2), answered, not planned, duplicate.
 */
export function boardSeed(now: number, state: ShotsState = {}): BoardSeed {
  const day = 86_400_000;
  const h = 3_600_000;
  const voters = (n: number) => Array.from({ length: n }, (_, i) => `mem-voter-${i + 1}`);
  const votes = (postId: string, n: number, withMaya = false) => [...voters(n).map((userId) => ({ postId, userId })), ...(withMaya ? [{ postId, userId: DEMO_USER_ID }] : [])];
  const P = BOARD_POST;
  return {
    readScope: state.readScope ?? 'signed_in',
    postingOpen: state.postingOpen ?? true,
    staff: [BOARD_STAFF_ID, ...(state.boardStaff ? [DEMO_USER_ID] : [])],
    members: [
      ...(state.boardJoined === false ? [] : [{ userId: DEMO_USER_ID, handle: 'Misty Rowan 77', approvedPosts: 1 }]),
      { userId: BOARD_STAFF_ID, handle: 'Calm Birch 1' },
      { userId: M.cedar, handle: 'Quiet Cedar 214' },
      { userId: M.oak, handle: 'Steady Oak 9' },
      { userId: M.willow, handle: 'Kind Willow 31' },
      { userId: M.rowan, handle: 'Bright Rowan 58' },
      { userId: M.fir, handle: 'Quiet Oak 9', approvedPosts: 0 },
      { userId: M.elm, handle: 'Golden Elm 402' },
    ],
    posts: [
      {
        id: P.bcp, authorId: M.cedar, kind: 'idea', title: 'More practice on BCP test types', status: 'planned', createdAt: now - 20 * day,
        body: 'I keep mixing up a tabletop walkthrough with a parallel test. More questions that compare them would help.',
        history: [{ status: 'under_review', at: now - 18 * day }, { status: 'planned', at: now - 9 * day, note: 'Coming in a content update.' }],
      },
      {
        id: P.timer, authorId: M.oak, kind: 'app', title: 'Timer keeps running when I lock my phone', status: 'in_progress', createdAt: now - 6 * day,
        body: 'During a timed mock, locking the phone for a minute still counts that minute.',
        history: [{ status: 'under_review', at: now - 5 * day }, { status: 'in_progress', at: now - 2 * day }],
      },
      {
        id: P.dark, authorId: M.willow, kind: 'app', title: 'Small grey text on the results screen at night', status: 'shipped', shippedIn: '1.18', createdAt: now - 40 * day,
        history: [{ status: 'planned', at: now - 30 * day }, { status: 'shipped', at: now - 3 * day }],
      },
      { id: P.weekly, authorId: M.rowan, kind: 'idea', title: 'A weekly summary of the domain I improved most', status: 'under_review', createdAt: now - 4 * day, history: [{ status: 'under_review', at: now - 3 * day }] },
      { id: P.audio, authorId: M.elm, kind: 'idea', title: 'Audio for the study notes on my commute', status: 'open', createdAt: now - 2 * day },
      {
        id: P.mocks, authorId: DEMO_USER_ID, kind: 'question', title: 'Is it normal to score lower on mocks than in practice?', status: 'answered', createdAt: now - 12 * day,
        body: 'Mine is about ten points lower. Should I worry?', history: [{ status: 'answered', at: now - 11 * day }],
      },
      {
        id: P.tablet, authorId: M.oak, kind: 'idea', title: 'A layout for tablets and wide screens', status: 'not_planned', createdAt: now - 50 * day,
        statusNote: 'Not for now: phones come first. We’ll look again later.', history: [{ status: 'not_planned', at: now - 45 * day, note: 'Not for now: phones come first. We’ll look again later.' }],
      },
      { id: P.weights, authorId: M.rowan, kind: 'idea', title: 'Show each domain’s weight on the Learn tab', status: 'duplicate', createdAt: now - 15 * day, history: [{ status: 'duplicate', at: now - 14 * day }] },
      {
        id: P.change, authorId: M.cedar, kind: 'content', title: 'A change management explanation could say more', status: 'under_review', createdAt: now - 1 * day,
        discussesAnswer: true, itemRef: 'q:d3_041', body: 'The explanation for the emergency change question says the answer but not why the other option is weaker.',
        history: [{ status: 'under_review', at: now - 20 * h }],
      },
      {
        id: P.acronyms, authorId: M.elm, kind: 'idea', title: 'Search notes by acronym, like RPO and RTO', status: 'shipped', shippedIn: '1.17', createdAt: now - 60 * day,
        history: [{ status: 'planned', at: now - 50 * day }, { status: 'shipped', at: now - 20 * day }],
      },
      { id: P.hint, authorId: M.willow, kind: 'idea', title: 'A hint button in the matching game', status: 'planned', createdAt: now - 8 * day, history: [{ status: 'planned', at: now - 6 * day }] },
      { id: P.weekend, authorId: DEMO_USER_ID, kind: 'idea', title: 'Reminders at a different time on weekends', status: 'open', createdAt: now - 1 * day },
      // Maya's post that waits for review, and another member's held for "exam recall" (staff only).
      { id: P.mayaHeld, authorId: DEMO_USER_ID, kind: 'idea', title: 'Practice by subtopic, not only by domain', status: 'open', visibility: 'pending', holdReason: 'recall', createdAt: now - 3 * h },
      {
        id: P.recall, authorId: M.fir, kind: 'question', title: 'Question about the audit charter', status: 'open', visibility: 'pending', holdReason: 'recall', createdAt: now - 2 * h,
        body: 'On my exam I got one about who approves the audit charter. Was it the board?',
      },
    ],
    comments: [
      { id: 'c-bcp-1', postId: P.bcp, authorId: M.oak, body: 'Same here. A side-by-side table would help too.', createdAt: now - 19 * day },
      { id: 'c-bcp-2', postId: P.bcp, authorId: M.willow, body: 'The notes page on test types helped me a lot.', createdAt: now - 17 * day },
      { id: 'c-bcp-3', postId: P.bcp, authorId: M.cedar, parentId: 'c-bcp-2', body: 'Thanks, I’ll read it again.', createdAt: now - 16 * day },
      { id: 'c-timer-team', postId: P.timer, authorId: BOARD_STAFF_ID, isOfficial: true, body: 'Thanks for telling us. We found the cause and a fix is on its way in the next update.', createdAt: now - 2 * day },
      { id: 'c-timer-1', postId: P.timer, authorId: M.rowan, body: 'It happens to me on Android too.', createdAt: now - 4 * day },
      { id: 'c-mocks-team', postId: P.mocks, authorId: BOARD_STAFF_ID, isOfficial: true, body: 'Yes, that’s common: mocks mix every domain under time. Keep an eye on the trend, not one score.', createdAt: now - 11 * day },
      { id: 'c-audio-rude', postId: P.audio, authorId: M.elm, body: 'Nobody asked for your opinion on this.', createdAt: now - 1 * day },
      { id: 'c-maya-removed', postId: P.weekly, authorId: DEMO_USER_ID, body: 'Here is the full question I saw, with the options.', visibility: 'removed', modReason: 'exam_content', createdAt: now - 2 * day },
    ],
    votes: [...votes(P.bcp, 41, true), ...votes(P.timer, 17), ...votes(P.dark, 26), ...votes(P.weekly, 9), ...votes(P.audio, 5), ...votes(P.mocks, 3), ...votes(P.tablet, 12), ...votes(P.weights, 2), ...votes(P.change, 4), ...votes(P.acronyms, 30), ...votes(P.hint, 11, true), ...votes(P.weekend, 1)],
    reports: [
      { reporterId: M.oak, kind: 'comment', targetId: 'c-audio-rude', reason: 'abuse', at: now - 40 * 60_000 },
      { reporterId: M.willow, kind: 'comment', targetId: 'c-audio-rude', reason: 'abuse', at: now - 35 * 60_000 },
      { reporterId: M.rowan, kind: 'comment', targetId: 'c-audio-rude', reason: 'abuse', at: now - 30 * 60_000 },
      { reporterId: M.elm, kind: 'post', targetId: P.change, reason: 'exam_content', at: now - 5 * h },
    ],
    blocks: state.boardBlocked ? [{ blockerId: DEMO_USER_ID, blockedId: M.elm }] : [],
    appeals: [{ userId: M.fir, kind: 'standing', targetId: M.fir, note: 'I didn’t know links weren’t allowed yet.', at: now - 6 * h }],
    notices: [
      { userId: DEMO_USER_ID, kind: 'removed', postId: P.weekly, commentId: 'c-maya-removed', reason: 'exam_content', byPerson: true, at: now - 1 * day },
      { userId: DEMO_USER_ID, kind: 'status', postId: P.bcp, status: 'planned', at: now - 9 * day, read: true },
      { userId: DEMO_USER_ID, kind: 'official', postId: P.mocks, commentId: 'c-mocks-team', at: now - 11 * day, read: true },
      { userId: DEMO_USER_ID, kind: 'reply', postId: P.weekend, at: now - 5 * h },
    ],
  };
}

const OTHER_PHONE = '6f1c2b9e-4d3a-4c1b-9a7e-2f5d8c0b1a3e';

/** Maya's other phone's progress: answers on a run of questions, a short streak, a few days ago. */
function otherPhoneProgress(now: number, count = 140) {
  const day = 86_400_000;
  const ids = getAllQuestions('cisa').map((q) => q.id).slice(40, 40 + count);
  const answers = Object.fromEntries(ids.map((id, i) => [id, { attempts: 1 + (i % 3), correctCount: Math.min(1 + (i % 3), 1 + (i % 2)), lastCorrect: i % 4 !== 0, lastAt: now - (3 + (i % 9)) * day }]));
  return {
    byCert: { cisa: { answers, lessonsDone: [], notesRead: [] } },
    streak: { current: 5, best: 5, lastDay: dayKey(now - 3 * day), recentDays: [7, 6, 5, 4, 3].map((k) => dayKey(now - k * day)) },
    changedAt: {},
  };
}

function readShotsState(): ShotsState {
  try {
    const raw = (globalThis as { localStorage?: { getItem(k: string): string | null } }).localStorage?.getItem('aurivan.shots.cloud');
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === 'object' ? (v as ShotsState) : {};
  } catch {
    return {};
  }
}

/** Maya's sign-in methods: the known ones from the state, or email and Google. */
function demoProviders(raw: unknown): Provider[] {
  const list = Array.isArray(raw) ? ALL_PROVIDERS.filter((p) => raw.includes(p)) : [];
  return list.length ? list : ['email', 'google'];
}

export function shotsSeed(now = Date.now()): MemoryOptions {
  const state = readShotsState();
  const day = 86_400_000;
  return {
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
    fixedCode: DEMO_CODE,
    offline: state.offline === true,
    ...(state.syncFails === 'server' ? { failSync: 'server' as const } : {}),
    users: [{ userId: DEMO_USER_ID, email: DEMO_EMAIL, providers: demoProviders(state.providers), termsVersion: TERMS_VERSION, createdAt: now - 30 * day }],
    board: boardSeed(now, state),
    signedIn: state.signedIn ? { userId: DEMO_USER_ID, authAt: now - (state.authAgeMin ?? 1) * 60_000 } : null,
    snapshots: {
      [DEMO_USER_ID]: {
        settings: {
          store: 'settings',
          rev: 3,
          appVersion: '1.17.0',
          storeVersion: 1,
          updatedAt: now - 2 * day,
          deviceId: OTHER_PHONE,
          state: { activeCertId: 'cisa' },
        },
        ...(state.remote
          ? {
              progress: {
                store: 'progress' as const,
                rev: 7,
                appVersion: state.remote === 'newer' ? '9.0.0' : '1.17.0',
                storeVersion: 1,
                updatedAt: now - 3 * day,
                deviceId: OTHER_PHONE,
                // "unreadable": an exam this app doesn't know, which the checker refuses.
                state: state.remote === 'unreadable' ? { byCert: { zz9: {} }, streak: { current: 0, best: 0, lastDay: null } } : otherPhoneProgress(now),
              },
            }
          : {}),
      },
    },
  };
}
