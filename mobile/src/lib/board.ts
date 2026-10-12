/**
 * The feedback board: the phone-side glue (Uplift Phase 8, built OFF; spec
 * §4.6 with the 12 Oct addendum). Screens call these; these call the cloud
 * backend's BoardPort. Every call returns a plain result with a CloudError
 * code (never a raw message), and nothing here logs.
 *
 * - Who can read is the server's one setting (`readScope`); the screens only
 *   pick their words from it.
 * - Other learners' posts are kept IN MEMORY for this session only (never
 *   saved on the phone), so a removed post doesn't linger.
 * - Report and block take effect on this phone at once (the item or the
 *   learner disappears), then go to the server through the outbox, which
 *   also carries votes and follows made offline. Posts and comments are
 *   never queued: offline, the composer keeps one draft
 *   (`aurivan.boardDraft.v1`).
 * - Board actions never touch study progress, the plant, badges or streaks
 *   (compliance 2.4: no reward for posting, voting or reporting).
 *
 * With the flag off none of this runs: `boardReady()` is false, the entry
 * points are hidden, the (cloud) screens redirect to Today, and neither
 * storage key is ever read or written.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { getBackend } from '../cloud/backend';
import { enqueue, flush } from '../cloud/outbox';
import {
  CloudError,
  errorCode,
  type BoardTab,
  type Comment,
  type Draft,
  type Member,
  type Notice,
  type PostCard,
  type PostDetail,
  type PostKind,
  type PostStatus,
  type ReadScope,
  type ReportReason,
  type StaffAction,
  type StaffQueue,
  type StaffTab,
  type Visibility,
} from '../cloud/types';
import { copy, type AccountCopyKey } from '../content/cloud/copy';
import { freshPseudonym } from '../engine/boardNames';
import { leakMatch, RECALL_HOLD, recallScore } from '../engine/leakGuard';
import { moderateText } from '../engine/moderation';
import { createRng } from '../engine/random';
import { sha256Hex } from '../engine/sha256';
import { cloudReady, type Result } from './account';
import { config } from './config';
import { shortDate } from './format';
import { bankFingerprint, bankQuestionAt } from './leakIndex';

export const DRAFT_KEY = 'aurivan.boardDraft.v1';

/** True when this build has the board (never with the flag off). */
export function boardReady(): boolean {
  return cloudReady();
}

const board = () => {
  const b = getBackend();
  if (!b) throw new CloudError('server');
  return b.board;
};

function failed(e: unknown): Result<never> {
  if (e instanceof CloudError) return { ok: false, code: e.code, detail: e.detail, retryAfterSec: e.retryAfterSec };
  return { ok: false, code: errorCode(e) };
}

async function run<T extends object>(work: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await work()) };
  } catch (e) {
    return failed(e);
  }
}

// ── The board's session state (memory only) ─────────────────────────
export interface BoardSettings {
  postingOpen: boolean;
  guidelinesVersion: string;
  readScope: ReadScope;
}
interface BoardSession {
  settings: BoardSettings | null;
  /** undefined = not asked yet; null = not joined. */
  me: Member | null | undefined;
  staff: boolean;
  /** Posts, comments and learners hidden on this phone at once (reported or blocked). */
  hiddenPosts: string[];
  hiddenComments: string[];
  blockedIds: string[];
  /** Unread notices (the dot on Your activity). */
  unread: number;
}
const EMPTY: BoardSession = { settings: null, me: undefined, staff: false, hiddenPosts: [], hiddenComments: [], blockedIds: [], unread: 0 };
export const useBoard = create<BoardSession>(() => ({ ...EMPTY }));

/** Feed pages seen this session, by query (memory only). */
const pages = new Map<string, PostCard[]>();

/** Tests and sign-out: forget the session (nothing of it is saved anyway). */
export function resetBoardSession() {
  pages.clear();
  useBoard.setState({ ...EMPTY });
}

/** Whose outbox (a hash of the account id: never the id itself). null when signed out. */
async function owner(): Promise<string | null> {
  const b = getBackend();
  const a = b ? await b.auth.current().catch(() => null) : null;
  return a ? sha256Hex(a.userId) : null;
}

/** Sends what waited offline (on board open, and after each queued act). Never throws. */
export async function flushOutbox(): Promise<void> {
  if (!boardReady()) return;
  const o = await owner();
  if (o) await flush(board(), o).catch(() => {});
}

/** The board's settings, the learner's own member facts and staff status (on open). */
export async function openBoard(signedIn: boolean): Promise<Result<{ settings: BoardSettings }>> {
  const r = await run(async () => ({ settings: await board().settings() }));
  if (!r.ok) return r;
  useBoard.setState({ settings: r.settings });
  if (signedIn) {
    const [me, staff] = await Promise.all([board().me().catch(() => undefined), board().isStaff().catch(() => false)]);
    useBoard.setState({ me, staff });
    void flushOutbox();
    void refreshUnread();
  } else {
    useBoard.setState({ me: undefined, staff: false });
  }
  return r;
}

/** Before the first post, comment or vote, and again when the guidelines change. */
export function needsGate(me: Member | null | undefined, settings: BoardSettings | null): boolean {
  if (!settings) return true;
  return !me || me.guidelinesVersion !== settings.guidelinesVersion;
}

/** A fresh pseudonym for the gate (never the one shown now). */
export function suggestPseudonym(avoid?: string, seed = Date.now()): string {
  return freshPseudonym(createRng(seed), avoid);
}

/** The guidelines gate's "I agree, continue": joins (or accepts the new version). */
export async function joinBoard(handle: string, handleKind: 'pseudonym' | 'chosen'): Promise<Result<{ me: Member }>> {
  const settings = useBoard.getState().settings;
  if (!settings) return { ok: false, code: 'server' };
  const r = await run(async () => ({ me: await board().join({ handle, handleKind, guidelinesVersion: settings.guidelinesVersion }) }));
  if (r.ok) useBoard.setState({ me: r.me });
  return r;
}

/** The words for a name the server (or the phone) refused. */
export function handleProblem(code: string, detail?: string): string {
  if (code === 'rate_limited') return copy('board.handle.rate');
  if (detail === 'handle_reserved') return copy('board.handle.reserved');
  if (detail === 'handle_words') return copy('board.handle.words');
  if (detail === 'handle_taken') return copy('board.handle.taken');
  if (detail === 'handle_shape') return copy('board.handle.shape');
  if (code === 'offline') return copy('err.offline');
  return copy('err.server');
}

// ── Reading ──────────────────────────────────────────────────────────
/** Hidden on this phone at once: reported posts, and everything by a blocked learner. */
export function visibleCards(cards: readonly PostCard[], s: Pick<BoardSession, 'hiddenPosts' | 'blockedIds'> = useBoard.getState()): PostCard[] {
  return cards.filter((c) => !s.hiddenPosts.includes(c.id) && !s.blockedIds.includes(c.authorId));
}
export function visibleComments(list: readonly Comment[], s: Pick<BoardSession, 'hiddenComments' | 'blockedIds'> = useBoard.getState()): Comment[] {
  return list.filter((c) => !s.hiddenComments.includes(c.id) && !s.blockedIds.includes(c.authorId));
}

export interface FeedQuery {
  cert: string;
  tab: BoardTab;
  kind?: PostKind;
  search?: string;
}

/**
 * One page of the board. Offline, the pages already seen this session come
 * back with `offline: true` ("Showing what was last loaded").
 */
export async function loadFeed(q: FeedQuery, more = false): Promise<Result<{ items: PostCard[]; more: boolean; offline: boolean }>> {
  const key = JSON.stringify(q);
  const seen = pages.get(key) ?? [];
  try {
    const page = await board().feed({ ...q, search: q.search?.trim() || undefined, after: more ? String(seen.length) : undefined });
    const items = more ? [...seen, ...page.items.filter((p) => !seen.some((s) => s.id === p.id))] : page.items;
    pages.set(key, items);
    return { ok: true, items, more: page.next !== null, offline: false };
  } catch (e) {
    if (e instanceof CloudError && e.code === 'offline' && pages.has(key)) return { ok: true, items: seen, more: false, offline: true };
    return failed(e);
  }
}

/** The learner's own posts in every state (Your activity). */
export function loadMyPosts(): Promise<Result<{ items: PostCard[] }>> {
  return run(async () => ({ items: await board().myPosts() }));
}

export function loadPost(id: string): Promise<Result<{ post: PostDetail }>> {
  return run(async () => ({ post: await board().post(id) }));
}

// ── Votes and follows (queued when offline) ──────────────────────────
async function queue(act: Parameters<typeof enqueue>[1]): Promise<Result> {
  const o = await owner();
  if (!o) return { ok: false, code: 'unauthorized' };
  await enqueue(o, act);
  await flushOutbox();
  return { ok: true };
}

/** Voting needs the gate first (the screen opens it); then it's queued and sent. */
export function setVote(postId: string, on: boolean): Promise<Result> {
  for (const [k, list] of pages) pages.set(k, list.map((c) => (c.id === postId ? { ...c, voted: on, voteCount: Math.max(0, c.voteCount + (on ? 1 : -1)) } : c)));
  return queue({ op: 'vote', target: postId, on });
}

export function setFollow(postId: string, on: boolean): Promise<Result> {
  return queue({ op: 'follow', target: postId, on });
}

// ── Report, block (immediate on this phone) ──────────────────────────
export async function report(kind: 'post' | 'comment' | 'member', id: string, reason: ReportReason, note?: string): Promise<Result> {
  const s = useBoard.getState();
  if (kind === 'post') useBoard.setState({ hiddenPosts: [...new Set([...s.hiddenPosts, id])] });
  if (kind === 'comment') useBoard.setState({ hiddenComments: [...new Set([...s.hiddenComments, id])] });
  const trimmed = note?.trim();
  return queue({ op: 'report', target: id, kind, reason, ...(trimmed ? { note: trimmed.slice(0, 500) } : {}) });
}

export async function block(userId: string): Promise<Result> {
  useBoard.setState({ blockedIds: [...new Set([...useBoard.getState().blockedIds, userId])] });
  return queue({ op: 'block', target: userId, on: true });
}

export async function unblock(userId: string): Promise<Result> {
  useBoard.setState({ blockedIds: useBoard.getState().blockedIds.filter((b) => b !== userId) });
  return queue({ op: 'block', target: userId, on: false });
}

export async function loadBlocked(): Promise<Result<{ members: Member[] }>> {
  const r = await run(async () => ({ members: await board().blocked() }));
  if (r.ok) useBoard.setState({ blockedIds: [...new Set([...useBoard.getState().blockedIds, ...r.members.map((m) => m.userId)])] });
  return r;
}

// ── Posting ──────────────────────────────────────────────────────────
export interface DraftCheck {
  /** Near-verbatim text from a practice question: Post is disabled. */
  bank: boolean;
  /** The question it matched (for "Report it privately"); never shown as text. */
  questionId: string | null;
  /** Looks like a recalled real-exam question: a warning (the server holds it). */
  recall: boolean;
  /** Words or links the server will refuse. */
  reject: 'words' | 'links' | null;
}

/**
 * The composer's live check (debounced by the screen): the same rules as
 * board-submit, on the phone, so the learner knows before tapping Post.
 * The server decides anyway.
 */
export function checkDraft(cert: string, text: string, itemRef: string | null, newMember: boolean): DraftCheck {
  const verdict = moderateText(text, { newMember });
  const leak = text.trim() ? leakMatch(bankFingerprint(cert), text) : { verdict: 'ok' as const, itemIndex: undefined };
  return {
    bank: leak.verdict === 'block',
    questionId: leak.verdict === 'block' ? (bankQuestionAt(cert, leak.itemIndex)?.id ?? null) : null,
    recall: recallScore(text, itemRef !== null) >= RECALL_HOLD,
    reject: verdict.verdict === 'reject' ? verdict.reason : null,
  };
}

export type PostOutcome = Result<{ id: string; visibility: Visibility; holdReason?: string }>;

/** Post (or save an edit). Offline: the draft is kept here and the screen says so. */
export async function submitPost(d: Draft, editId?: string): Promise<PostOutcome> {
  try {
    if (editId) {
      const r = await board().editPost(editId, d);
      pages.clear();
      return { ok: true, id: editId, ...r };
    }
    const r = await board().submitPost(d);
    pages.clear();
    await clearDraft();
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof CloudError && e.code === 'offline' && !editId) await saveDraft(d);
    return failed(e);
  }
}

/** The words for a refused post or comment. */
export function postProblem(code: string, detail?: string): string {
  const key: AccountCopyKey =
    code === 'rejected_words'
      ? detail === 'links'
        ? 'board.reject.links'
        : 'board.reject.words'
      : code === 'rate_limited'
        ? 'board.reject.rate'
        : code === 'posting_paused'
          ? 'board.reject.paused'
          : code === 'banned'
            ? 'board.reject.banned'
            : code === 'bank_text'
              ? 'board.leak.title'
              : code === 'offline'
                ? 'board.compose.draft'
                : 'board.reject.server';
  return copy(key, { supportEmail: config.feedbackEmail });
}

export async function withdrawPost(id: string): Promise<Result> {
  const r = await run(async () => (await board().withdrawPost(id), {}));
  if (r.ok) pages.clear();
  return r;
}

export function comment(postId: string, body: string, parentId?: string): Promise<Result<{ id: string; visibility: Visibility }>> {
  return run(() => board().comment(postId, body, parentId));
}

export function withdrawComment(id: string): Promise<Result> {
  return run(async () => (await board().withdrawComment(id), {}));
}

// ── The offline draft (one, this account's composer) ─────────────────
export async function saveDraft(d: Draft): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 1, draft: d }));
  } catch {
    // Not saved: the composer still shows what was typed.
  }
}

export async function loadDraft(): Promise<Draft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    const v = raw ? (JSON.parse(raw) as { v?: number; draft?: Draft }) : null;
    const d = v?.v === 1 ? v.draft : null;
    return d && typeof d.title === 'string' && typeof d.body === 'string' && typeof d.kind === 'string' ? d : null;
  } catch {
    return null;
  }
}

export async function clearDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do.
  }
}

// ── Your activity ────────────────────────────────────────────────────
export async function loadInbox(): Promise<Result<{ notices: Notice[] }>> {
  const r = await run(async () => ({ notices: await board().inbox() }));
  if (r.ok) useBoard.setState({ unread: r.notices.filter((n) => !n.read).length });
  return r;
}

async function refreshUnread() {
  await loadInbox().catch(() => {});
}

export async function markRead(ids: number[]): Promise<void> {
  if (!ids.length) return;
  useBoard.setState({ unread: Math.max(0, useBoard.getState().unread - ids.length) });
  await queue({ op: 'read', target: 'read', ids });
}

export function appeal(kind: 'post' | 'comment' | 'standing', id: string, note?: string): Promise<Result> {
  return run(async () => (await board().appeal({ kind, id, note: note?.trim() || undefined }), {}));
}

/** The first words of a post or comment, for a notice ("your post “Timer keeps…”"). */
export function firstWords(text: string | null, max = 6): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  return words.slice(0, max).join(' ');
}

export function statusLabel(status: PostStatus, shippedIn: string | null): string {
  if (status === 'shipped') return shippedIn ? copy('board.status.shipped', { v: shippedIn }) : copy('board.status.shipped.plain');
  return copy(`board.status.${status}` as AccountCopyKey);
}

/** A notice's words, built on the phone from its facts (no learner text travels in a notice). */
export function noticeText(n: Notice): string {
  const words = firstWords(n.subject);
  const item = copy(n.targetKind === 'comment' ? 'board.item.comment' : 'board.item.post');
  switch (n.kind) {
    case 'status':
      return copy('board.notice.status', { words, status: n.status ? statusLabel(n.status, null) : '' });
    case 'official':
      return copy('board.notice.official', { words });
    case 'reply':
      return copy('board.notice.reply', { words });
    case 'removed':
      return copy('board.notice.removed', {
        item,
        words,
        reason: copy(`board.notice.reason.${n.reason ?? 'off_topic'}` as AccountCopyKey),
        who: copy(n.byPerson === false ? 'board.notice.filter' : 'board.notice.person'),
      });
    case 'warned':
      return copy('board.notice.warned');
    case 'suspended':
      return copy('board.notice.suspended', { 'd MMM': n.untilAt ? shortDate(n.untilAt) : '' });
    case 'appeal':
      return n.outcome === 'restored' ? copy('board.appeal.restored', { item }) : copy('board.appeal.upheld');
  }
}

/** "2 h ago" (the staff queue). */
export function timeAgo(at: number, now = Date.now()): string {
  const min = Math.floor((now - at) / 60_000);
  if (min < 1) return copy('board.ago.now');
  if (min < 60) return copy('board.ago.min', { n: String(min) });
  const h = Math.floor(min / 60);
  return h < 48 ? copy('board.ago.h', { n: String(h) }) : copy('board.ago.d', { n: String(Math.floor(h / 24)) });
}

// ── Staff (the server checks every call; the screen's gate is cosmetic) ──
export function loadStaffQueue(tab: StaffTab): Promise<Result<{ queue: StaffQueue }>> {
  return run(async () => ({ queue: await board().staffQueue(tab) }));
}

/** Is this learner staff? Asked of the server every time the queue opens. */
export function checkStaff(): Promise<Result<{ staff: boolean }>> {
  return run(async () => {
    const staff = await board().isStaff();
    useBoard.setState({ staff });
    return { staff };
  });
}

export function staffAct(a: StaffAction): Promise<Result> {
  return run(async () => (await board().staff(a), {}));
}
