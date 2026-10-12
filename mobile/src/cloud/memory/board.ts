/**
 * The in-memory feedback board (Uplift Phase 8, built OFF): the memory
 * backend's BoardPort. It plays the server's rules
 * (20261014000000_feedback_board.sql and the board-submit / staff-action
 * Edge Functions), so the screens meet the answers they will meet for real:
 * - who reads what: the read scope (signed in by default; 'author_staff';
 *   'everyone'), authors read their own, staff read everything;
 * - posting: an account with the Terms, the guidelines accepted (joined),
 *   good standing, posting open; the same text rules as board-submit
 *   (engine/moderation.ts, then the leak guard on the bundled bank, then the
 *   recall score); a new member's posts wait for review; 3 posts an hour and
 *   5 a day (1 a day for an account under a day old);
 * - votes and follows (own rows only; 100 vote changes a day, a take-back
 *   counts too), reports (hidden for the reporter at once; exam content
 *   hides for everyone; 3 reporters with accounts 7+ days old hide), blocks
 *   (never staff; the blocked learner can't comment on the blocker's posts),
 *   appeals (own removal, 14 days, once), notices, and staff actions;
 * - everything it returns crosses a JSON "wire", so the app never shares an
 *   object with the "server".
 * Fix round P8 (the SQL's changes, played the same way): members are named
 * by a PUBLIC id, never the account id (SEC S4); only trusted reporters
 * hide with one report, and not after staff reviewed it (S1); a blocked
 * learner can't reply to or notify the blocker (S2); reports keep the
 * reported words (S3); write attempts count before the filters (S6); the
 * same draft twice is one post (QA BUG-1); a post about a practice
 * question's answer is folded (N12); own withdrawn or removed comments
 * don't come back (N2); dismiss takes the queue's target (N4); a deleted
 * account closes the reports about its posts (N5); staff can rename.
 * Re-review RR_P8: the Reported queue shows the live words with the first
 * and last reported ones, and Dismiss is refused once the words changed
 * since staff read them (R1); joining counts a write attempt (R3).
 * Never in a store build (see backend.ts).
 */
import { checkHandle, moderateText, normalizeText } from '../../engine/moderation';
import { leakMatch, RECALL_HOLD, recallScore, talksAboutAnswer, type Fingerprint } from '../../engine/leakGuard';
import {
  CloudError,
  type BoardPort,
  type BoardTab,
  type Comment,
  type HoldReason,
  type Member,
  type ModReason,
  type Notice,
  type PostCard,
  type PostDetail,
  type PostKind,
  type PostStatus,
  type QueueItem,
  type ReadScope,
  type ReportReason,
  type Standing,
  type StaffQueue,
  type StaffTab,
  type Visibility,
} from '../types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const wire = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export interface SeedMember {
  userId: string;
  handle: string;
  handleKind?: 'pseudonym' | 'chosen';
  standing?: Standing;
  standingUntil?: number | null;
  approvedPosts?: number;
  joinedAt?: number;
}
export interface SeedPost {
  id: string;
  authorId: string;
  kind: PostKind;
  title: string;
  body?: string;
  itemRef?: string | null;
  discussesAnswer?: boolean;
  status?: PostStatus;
  statusNote?: string | null;
  shippedIn?: string | null;
  visibility?: Visibility;
  holdReason?: HoldReason | null;
  modReason?: ModReason | null;
  moderatedAt?: number | null;
  locked?: boolean;
  createdAt: number;
  history?: { status: PostStatus; at: number; note?: string | null }[];
  cert?: string;
}
export interface SeedComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
  isOfficial?: boolean;
  visibility?: Visibility;
  holdReason?: HoldReason | null;
  modReason?: ModReason | null;
  /** When it was removed (an appeal is possible for 14 days). Default for a removed one: a day ago. */
  moderatedAt?: number | null;
  createdAt: number;
}
export interface SeedNotice {
  userId: string;
  kind: Notice['kind'];
  postId?: string | null;
  commentId?: string | null;
  reason?: ModReason | null;
  byPerson?: boolean | null;
  outcome?: 'upheld' | 'restored' | null;
  status?: PostStatus | null;
  untilAt?: number | null;
  at: number;
  read?: boolean;
}
export interface BoardSeed {
  readScope?: ReadScope;
  postingOpen?: boolean;
  guidelinesVersion?: string;
  members?: SeedMember[];
  staff?: string[];
  posts?: SeedPost[];
  comments?: SeedComment[];
  votes?: { postId: string; userId: string }[];
  follows?: { postId: string; userId: string }[];
  reports?: { reporterId: string; kind: 'post' | 'comment' | 'member'; targetId: string; reason: ReportReason; at: number }[];
  blocks?: { blockerId: string; blockedId: string }[];
  notices?: SeedNotice[];
  appeals?: { userId: string; kind: 'post' | 'comment' | 'standing'; targetId: string; note?: string; at: number }[];
}

/** What the board needs from the rest of the memory backend. */
export interface BoardCtx {
  now: () => number;
  /** A port call: logged, then offline and forced failures, like a round trip. */
  enter: (method: string) => Promise<void>;
  /** After the work: the reply may be "lost". */
  leave: (method: string) => void;
  /** The signed-in learner's id, or null (signed out). A deleted account is 'gone'. */
  viewer: () => Promise<string | null>;
  /** The signed-in learner, or CloudError('unauthorized' / 'gone'). */
  needUser: () => Promise<{ userId: string; termsVersion: string | null; createdAt: number }>;
  /** When an account was made (reporters' and posters' account age). */
  accountCreatedAt: (userId: string) => number | null;
  /** The bank's fingerprint for the leak guard (built on first use). */
  leak: (cert: string) => Fingerprint;
}

interface MPost extends Required<Omit<SeedPost, 'history' | 'itemRef' | 'statusNote' | 'shippedIn' | 'holdReason' | 'modReason' | 'moderatedAt'>> {
  itemRef: string | null;
  statusNote: string | null;
  shippedIn: string | null;
  holdReason: HoldReason | null;
  modReason: ModReason | null;
  moderatedAt: number | null;
  officialCommentId: string | null;
  duplicateOf: string | null;
  statusChangedAt: number | null;
  editedAt: number | null;
  reportCount: number;
  history: { status: PostStatus; at: number; note: string | null }[];
  /** When a person last kept or put it back (one report no longer hides it: SEC S1). */
  reviewedAt: number | null;
  /** The app's id for the draft it came from (QA BUG-1). */
  clientId: string | null;
}
interface MComment {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  isOfficial: boolean;
  visibility: Visibility;
  holdReason: HoldReason | null;
  modReason: ModReason | null;
  moderatedAt: number | null;
  createdAt: number;
  editedAt: number | null;
  reportCount: number;
  reviewedAt: number | null;
}
interface MMember {
  userId: string;
  /** The PUBLIC member id: what other learners get, never the account id (SEC S4). */
  publicId: string;
  handle: string;
  handleKind: 'pseudonym' | 'chosen';
  guidelinesVersion: string;
  standing: Standing;
  standingUntil: number | null;
  standingChangedAt: number | null;
  approvedPosts: number;
  handleChangedAt: number | null;
  joinedAt: number;
}
interface MNotice {
  id: number;
  userId: string;
  kind: Notice['kind'];
  postId: string | null;
  commentId: string | null;
  reason: ModReason | null;
  byPerson: boolean | null;
  outcome: 'upheld' | 'restored' | null;
  status: PostStatus | null;
  untilAt: number | null;
  at: number;
  read: boolean;
}

export interface MemoryBoardControl {
  setReadScope(s: ReadScope): void;
  setPostingOpen(on: boolean): void;
  addStaff(userId: string): void;
  /** Raw rows, for tests (copies). */
  posts(): MPost[];
  comments(): MComment[];
  members(): MMember[];
  votes(): { postId: string; userId: string }[];
  reports(): { reporterId: string | null; kind: string; targetId: string; reason: ReportReason; status: string; snapshot: string | null; note: string | null }[];
  blocks(): { blockerId: string; blockedId: string }[];
  notices(): MNotice[];
  log(): { actorId: string | null; action: string; targetKind: string | null; reason: string | null }[];
  /** Delete an account's board rows (the account deletion cascade). */
  removeUser(userId: string): void;
  /** export-my-data's `board` section for one learner. */
  exportFor(userId: string): Record<string, unknown>;
}

const MOD_REASONS: readonly ModReason[] = ['exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic'];

export function createMemoryBoard(ctx: BoardCtx, seed: BoardSeed = {}): { port: BoardPort; control: MemoryBoardControl } {
  const now = ctx.now;
  let readScope: ReadScope = seed.readScope ?? 'signed_in';
  let postingOpen = seed.postingOpen ?? true;
  const guidelinesVersion = seed.guidelinesVersion ?? '2026-11';
  const staff = new Set(seed.staff ?? []);
  const members = new Map<string, MMember>();
  let memberN = 0;
  /** A public member id: random-looking and unrelated to the account id. */
  const newPublicId = () => `member-${(++memberN * 7919 + 104729).toString(36)}`;
  for (const m of seed.members ?? []) {
    members.set(m.userId, {
      userId: m.userId,
      publicId: newPublicId(),
      handle: m.handle,
      handleKind: m.handleKind ?? 'pseudonym',
      guidelinesVersion,
      standing: m.standing ?? 'active',
      standingUntil: m.standingUntil ?? null,
      standingChangedAt: m.standing && m.standing !== 'active' ? now() - HOUR : null,
      approvedPosts: m.approvedPosts ?? 1,
      handleChangedAt: null,
      joinedAt: m.joinedAt ?? now() - 30 * DAY,
    });
  }
  const posts = new Map<string, MPost>();
  for (const p of seed.posts ?? []) {
    const status = p.status ?? 'open';
    posts.set(p.id, {
      id: p.id,
      authorId: p.authorId,
      cert: p.cert ?? 'cisa',
      kind: p.kind,
      title: p.title,
      body: p.body ?? '',
      itemRef: p.itemRef ?? null,
      discussesAnswer: p.discussesAnswer ?? false,
      status,
      statusNote: p.statusNote ?? null,
      shippedIn: p.shippedIn ?? null,
      visibility: p.visibility ?? 'visible',
      holdReason: p.holdReason ?? null,
      modReason: p.modReason ?? null,
      moderatedAt: p.moderatedAt ?? null,
      locked: p.locked ?? false,
      createdAt: p.createdAt,
      officialCommentId: null,
      duplicateOf: null,
      statusChangedAt: p.history?.length ? p.history[p.history.length - 1].at : null,
      editedAt: null,
      reportCount: 0,
      history: (p.history ?? []).map((h) => ({ status: h.status, at: h.at, note: h.note ?? null })),
      reviewedAt: null,
      clientId: null,
    });
  }
  const comments = new Map<string, MComment>();
  for (const c of seed.comments ?? []) {
    comments.set(c.id, {
      id: c.id,
      postId: c.postId,
      authorId: c.authorId,
      parentId: c.parentId ?? null,
      body: c.body,
      isOfficial: (c.isOfficial ?? false) && staff.has(c.authorId),
      visibility: c.visibility ?? 'visible',
      holdReason: c.holdReason ?? null,
      modReason: c.modReason ?? null,
      moderatedAt: c.moderatedAt ?? (c.visibility === 'removed' ? now() - DAY : null),
      createdAt: c.createdAt,
      editedAt: null,
      reportCount: 0,
      reviewedAt: null,
    });
    if (c.isOfficial && staff.has(c.authorId)) posts.get(c.postId)!.officialCommentId = c.id;
  }
  const key = (a: string, b: string) => `${a}|${b}`;
  const votes = new Map<string, number>((seed.votes ?? []).map((v) => [key(v.postId, v.userId), now() - DAY]));
  const follows = new Set<string>((seed.follows ?? []).map((f) => key(f.postId, f.userId)));
  for (const p of posts.values()) follows.add(key(p.id, p.authorId));
  for (const v of seed.votes ?? []) follows.add(key(v.postId, v.userId));
  /** The account id behind a public member id (or an account id given directly). */
  const memberByAnyId = (id: string) => members.get(id) ?? [...members.values()].find((m) => m.publicId === id);
  /** The public id of an account ('' for someone who never joined: the cascade took them). */
  const pubOf = (userId: string) => members.get(userId)?.publicId ?? '';
  const reports: {
    reporterId: string | null;
    kind: 'post' | 'comment' | 'member';
    /** A post's or comment's id, or a member's PUBLIC id. */
    targetId: string;
    reason: ReportReason;
    status: 'open' | 'actioned' | 'dismissed';
    at: number;
    /** Staff-only: the words as they were when reported (SEC S3). */
    snapshot: string | null;
    note: string | null;
  }[] = (seed.reports ?? []).map((r) => {
    const t = r.kind === 'post' ? posts.get(r.targetId) : r.kind === 'comment' ? comments.get(r.targetId) : undefined;
    const m = r.kind === 'member' ? members.get(r.targetId) : undefined;
    return {
      ...r,
      targetId: m ? m.publicId : r.targetId,
      status: 'open' as const,
      snapshot: t ? (r.kind === 'post' ? `${(t as MPost).title}\n${t.body}` : t.body) : (m?.handle ?? null),
      note: null,
    };
  });
  for (const r of reports) {
    const t = r.kind === 'post' ? posts.get(r.targetId) : r.kind === 'comment' ? comments.get(r.targetId) : undefined;
    if (t) t.reportCount += 1;
  }
  // Kept by ACCOUNT ids inside the "server"; the app names the blocked learner by their public id.
  const blocks = new Set<string>((seed.blocks ?? []).map((b) => key(b.blockerId, b.blockedId)));
  let noticeId = 0;
  const notices: MNotice[] = (seed.notices ?? []).map((n) => ({
    id: ++noticeId,
    userId: n.userId,
    kind: n.kind,
    postId: n.postId ?? null,
    commentId: n.commentId ?? null,
    reason: n.reason ?? null,
    byPerson: n.byPerson ?? null,
    outcome: n.outcome ?? null,
    status: n.status ?? null,
    untilAt: n.untilAt ?? null,
    at: n.at,
    read: n.read ?? false,
  }));
  const appeals: { id: string; userId: string; kind: 'post' | 'comment' | 'standing'; targetId: string; note: string | null; status: 'open' | 'upheld' | 'restored'; at: number }[] = (
    seed.appeals ?? []
  ).map((a, i) => ({ id: `appeal-${i + 1}`, userId: a.userId, kind: a.kind, targetId: a.targetId, note: a.note ?? null, status: 'open', at: a.at }));
  const events: { userId: string; kind: string; at: number }[] = [];
  const modLog: { actorId: string | null; action: string; targetKind: string | null; targetId: string | null; reason: string | null; at: number }[] = [];
  let idN = 0;
  const newId = (prefix: string) => `${prefix}-${(++idN).toString(36)}-${Math.floor(now()).toString(36)}`;

  // ── Rules ─────────────────────────────────────────────────────────
  const isStaffId = (id: string | null) => id !== null && staff.has(id);
  const canRead = (p: MPost, viewer: string | null) =>
    (p.visibility === 'visible' && (readScope === 'everyone' || (readScope === 'signed_in' && viewer !== null))) || (viewer !== null && p.authorId === viewer) || isStaffId(viewer);
  const blockedBy = (blocker: string | null, member: string) => blocker !== null && blocks.has(key(blocker, member));
  const reportedBy = (viewer: string | null, kind: string, id: string) => viewer !== null && reports.some((r) => r.reporterId === viewer && r.kind === kind && r.targetId === id);
  const handleOf = (id: string) => members.get(id)?.handle ?? 'Former member';
  const accountAge = (id: string) => now() - (ctx.accountCreatedAt(id) ?? now());
  /** The board's rate limit: refused over the limit (counted outside the rows, so a take-back counts too). */
  const take = (userId: string, kind: string, perHour: number | null, perDay: number | null, refuse = true) => {
    if (refuse) {
      const mine = events.filter((e) => e.userId === userId && e.kind === kind);
      const hour = mine.filter((e) => now() - e.at < HOUR).length;
      const day = mine.filter((e) => now() - e.at < DAY).length;
      if ((perHour !== null && hour >= perHour) || (perDay !== null && day >= perDay)) throw new CloudError('rate_limited', 24 * 3600);
    }
    events.push({ userId, kind, at: now() });
  };
  const notify = (n: Omit<MNotice, 'id' | 'at' | 'read'>) => notices.push({ ...n, id: ++noticeId, at: now(), read: false });
  /** Never to `except` (who caused it), and never to anyone who blocked them (SEC S2). */
  const notifyPost = (postId: string, kind: Notice['kind'], except: string | null, extra: Partial<MNotice> = {}) => {
    const p = posts.get(postId);
    if (!p) return;
    const who = new Set([p.authorId, ...[...follows].filter((f) => f.startsWith(`${postId}|`)).map((f) => f.split('|')[1])]);
    for (const u of who) {
      if (u === except || (except !== null && blocks.has(key(u, except)))) continue;
      notify({ userId: u, kind, postId, commentId: null, reason: null, byPerson: null, outcome: null, status: null, untilAt: null, ...extra });
    }
  };
  const setStatus = (p: MPost, status: PostStatus, note: string | null) => {
    if (p.status === status) return;
    p.status = status;
    p.statusNote = note;
    p.statusChangedAt = now();
    p.history.push({ status, at: now(), note });
    notifyPost(p.id, 'status', null, { status });
  };
  const activeMember = (m: MMember | undefined) => !!m && (m.standing === 'active' || ((m.standing === 'limited' || m.standing === 'suspended') && (m.standingUntil ?? Infinity) < now()));
  /** May this learner's report hide something on its own? Good standing, a day old, an approved post (SEC S1). */
  const trustedReporter = (userId: string | null) => {
    if (userId === null) return false;
    const m = members.get(userId);
    return activeMember(m) && (m?.approvedPosts ?? 0) > 0 && accountAge(userId) >= DAY;
  };

  // ── Shapes on the wire ────────────────────────────────────────────
  const card = (p: MPost, viewer: string | null, own = false): PostCard => ({
    id: p.id,
    kind: p.kind,
    title: p.title,
    status: p.status,
    shippedIn: p.shippedIn,
    authorId: pubOf(p.authorId),
    authorHandle: handleOf(p.authorId),
    isTeam: staff.has(p.authorId),
    voteCount: [...votes.keys()].filter((k) => k.startsWith(`${p.id}|`)).length,
    commentCount: [...comments.values()].filter((c) => c.postId === p.id && c.visibility === 'visible').length,
    voted: viewer !== null && votes.has(key(p.id, viewer)),
    teamReplied: p.officialCommentId !== null,
    createdAt: p.createdAt,
    visibility: p.visibility,
    ...(own ? { holdReason: p.holdReason } : {}),
  });
  const commentOut = (c: MComment): Comment => ({
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    authorHandle: handleOf(c.authorId),
    authorId: pubOf(c.authorId),
    isTeam: staff.has(c.authorId),
    body: c.body,
    isOfficial: c.isOfficial,
    createdAt: c.createdAt,
    editedAt: c.editedAt,
    visibility: c.visibility,
  });
  const memberOut = (m: MMember, own: boolean): Member =>
    own
      ? { memberId: m.publicId, handle: m.handle, handleKind: m.handleKind, standing: m.standing, standingUntil: m.standingUntil, guidelinesVersion: m.guidelinesVersion, approvedPosts: m.approvedPosts }
      : { memberId: m.publicId, handle: m.handle, handleKind: m.handleKind };

  // ── board-submit's checks (the same order and the same engine) ────
  const mayWrite = (userId: string) => {
    const m = members.get(userId);
    if (!m) throw new CloudError('forbidden', undefined, 'not_member');
    if (m.standing === 'banned' || ((m.standing === 'limited' || m.standing === 'suspended') && !((m.standingUntil ?? Infinity) < now()))) throw new CloudError('banned');
    if (m.guidelinesVersion !== guidelinesVersion) throw new CloudError('invalid', undefined, 'guidelines');
    if (!postingOpen) throw new CloudError('posting_paused');
    return m;
  };
  /** The filters, the leak guard and the recall score: a reject throws; a hold comes back. Counted first (SEC S6). */
  const checkText = (m: MMember, text: string, itemRef: string | null, cert: string): HoldReason | null => {
    take(m.userId, 'attempt', 30, 200);
    const verdict = moderateText(text, { newMember: m.approvedPosts === 0 });
    if (verdict.verdict === 'reject') throw new CloudError('rejected_words', undefined, verdict.reason);
    if (leakMatch(ctx.leak(cert), text).verdict === 'block') throw new CloudError('bank_text');
    if (verdict.verdict === 'hold') return 'hold_words';
    return recallScore(text, itemRef) >= RECALL_HOLD ? 'recall' : null;
  };
  const postFields = (d: { kind: PostKind; title: string; body: string; itemRef?: string }) => {
    const title = normalizeText(d.title);
    const body = normalizeText(d.body ?? '');
    if (!['content', 'idea', 'app', 'question'].includes(d.kind)) throw new CloudError('invalid', undefined, 'kind');
    if (title.length < 8 || title.length > 100) throw new CloudError('invalid', undefined, 'title');
    if (body.length > 2000) throw new CloudError('invalid', undefined, 'body');
    const itemRef = d.itemRef ? d.itemRef : null;
    if (itemRef !== null && !/^(q|note|lesson|card|app):[A-Za-z0-9_.:#-]{1,80}$/.test(itemRef)) throw new CloudError('invalid', undefined, 'item_ref');
    return { title, body, itemRef };
  };
  const commentBody = (b: string) => {
    const body = normalizeText(b);
    if (body.length < 1 || body.length > 1000) throw new CloudError('invalid', undefined, 'body');
    return body;
  };
  const hold = (kind: 'post' | 'comment', id: string, reason: HoldReason | null) => {
    if (reason) modLog.push({ actorId: null, action: 'hold', targetKind: kind, targetId: id, reason, at: now() });
  };
  const needStaff = async () => {
    const { userId } = await ctx.needUser();
    if (!staff.has(userId)) throw new CloudError('forbidden');
    return userId;
  };

  const port: BoardPort = {
    async settings() {
      await ctx.enter('board.settings');
      return { postingOpen, guidelinesVersion, readScope };
    },
    async feed(q) {
      await ctx.enter('board.feed');
      const viewer = await ctx.viewer();
      const tab: BoardTab = q.tab;
      const search = (q.search ?? '').trim().toLowerCase();
      let list = [...posts.values()].filter(
        (p) =>
          p.cert === q.cert &&
          p.visibility === 'visible' &&
          canRead(p, viewer) &&
          (tab !== 'shipped' || p.status === 'shipped') &&
          (!q.kind || p.kind === q.kind) &&
          (!search || `${p.title} ${p.body}`.toLowerCase().includes(search)) &&
          !blockedBy(viewer, p.authorId) &&
          !reportedBy(viewer, 'post', p.id),
      );
      const cards = list.map((p) => card(p, viewer));
      cards.sort((a, b) =>
        tab === 'top'
          ? b.voteCount - a.voteCount || b.createdAt - a.createdAt
          : tab === 'shipped'
            ? (posts.get(b.id)!.statusChangedAt ?? 0) - (posts.get(a.id)!.statusChangedAt ?? 0)
            : b.createdAt - a.createdAt,
      );
      const start = q.after ? Number(q.after) || 0 : 0;
      const page = cards.slice(start, start + 20);
      list = [];
      ctx.leave('board.feed');
      return wire({ items: page, next: start + 20 < cards.length ? String(start + 20) : null });
    },
    async post(id) {
      await ctx.enter('board.post');
      const viewer = await ctx.viewer();
      const p = posts.get(id);
      if (!p || !canRead(p, viewer) || (viewer !== p.authorId && p.visibility !== 'visible' && !isStaffId(viewer))) throw new CloudError('not_found');
      // Your own comment waiting for review shows (to you); withdrawn or removed ones don't (CR N2).
      const visibleComments = [...comments.values()]
        .filter((c) => c.postId === id && (c.visibility === 'visible' || (c.visibility === 'pending' && (c.authorId === viewer || isStaffId(viewer)))) && !blockedBy(viewer, c.authorId) && !reportedBy(viewer, 'comment', c.id))
        .sort((a, b) => a.createdAt - b.createdAt);
      const official = p.officialCommentId ? comments.get(p.officialCommentId) : undefined;
      const detail: PostDetail = {
        ...card(p, viewer, viewer === p.authorId),
        body: p.body,
        itemRef: p.itemRef,
        discussesAnswer: p.discussesAnswer,
        statusNote: p.statusNote,
        following: viewer !== null && follows.has(key(id, viewer)),
        locked: p.locked,
        official: official && official.visibility === 'visible' ? commentOut(official) : null,
        comments: visibleComments.filter((c) => c.id !== p.officialCommentId).map(commentOut),
        statusHistory: p.history.map((h) => ({ ...h })),
      };
      ctx.leave('board.post');
      return wire(detail);
    },
    async myPosts() {
      await ctx.enter('board.myPosts');
      const { userId } = await ctx.needUser();
      const mine = [...posts.values()].filter((p) => p.authorId === userId && p.visibility !== 'withdrawn').sort((a, b) => b.createdAt - a.createdAt);
      return wire(mine.map((p) => card(p, userId, true)));
    },
    async me() {
      await ctx.enter('board.me');
      const { userId } = await ctx.needUser();
      const m = members.get(userId);
      return m ? wire(memberOut(m, true)) : null;
    },
    async join(i) {
      await ctx.enter('board.join');
      const u = await ctx.needUser();
      if (!u.termsVersion) throw new CloudError('forbidden', undefined, 'terms');
      if (i.guidelinesVersion !== guidelinesVersion) throw new CloudError('invalid', undefined, 'guidelines');
      const handle = normalizeText(i.handle);
      // Counted before the name is checked, as board-submit does (re-review RR_P8 R3).
      take(u.userId, 'attempt', 30, 200);
      const problem = checkHandle(handle);
      if (problem) throw new CloudError('invalid', undefined, `handle_${problem}`);
      for (const m of members.values()) if (m.userId !== u.userId && m.handle.toLowerCase() === handle.toLowerCase()) throw new CloudError('invalid', undefined, 'handle_taken');
      const prev = members.get(u.userId);
      if (prev && prev.handle !== handle) {
        if (prev.handleChangedAt !== null && now() - prev.handleChangedAt < DAY) throw new CloudError('rate_limited', 24 * 3600);
        prev.handleChangedAt = now();
      }
      const m: MMember = prev
        ? { ...prev, handle, handleKind: i.handleKind, guidelinesVersion: i.guidelinesVersion }
        : { userId: u.userId, publicId: newPublicId(), handle, handleKind: i.handleKind, guidelinesVersion: i.guidelinesVersion, standing: 'active', standingUntil: null, standingChangedAt: null, approvedPosts: 0, handleChangedAt: null, joinedAt: now() };
      members.set(u.userId, m);
      ctx.leave('board.join');
      return wire(memberOut(m, true));
    },
    async submitPost(d) {
      await ctx.enter('board.submitPost');
      const u = await ctx.needUser();
      const f = postFields(d);
      const m = mayWrite(u.userId);
      // board-submit's order: the attempt and the filters, then the writer (which knows the draft).
      let reason = checkText(m, `${f.title}\n${f.body}`, f.itemRef, d.cert);
      const clientId = typeof d.clientId === 'string' && d.clientId ? d.clientId : null;
      // The same draft again (its reply was lost): the first post, unchanged and not counted as a post again.
      const same = clientId ? [...posts.values()].find((p) => p.authorId === u.userId && p.clientId === clientId) : undefined;
      if (same) {
        ctx.leave('board.submitPost');
        return same.holdReason ? { id: same.id, visibility: same.visibility, holdReason: same.holdReason } : { id: same.id, visibility: same.visibility };
      }
      const young = accountAge(u.userId) < DAY;
      take(u.userId, 'post', 3, young ? 1 : 5);
      if (!reason && m.approvedPosts === 0) reason = 'new_member';
      const id = newId('post');
      const spoiler = talksAboutAnswer(`${f.title}\n${f.body}`, f.itemRef) || (d.kind === 'content' && (f.itemRef ?? '').startsWith('q:'));
      posts.set(id, {
        id, authorId: u.userId, cert: d.cert, kind: d.kind, title: f.title, body: f.body, itemRef: f.itemRef, discussesAnswer: spoiler, status: 'open', statusNote: null,
        shippedIn: null, visibility: reason ? 'pending' : 'visible', holdReason: reason, modReason: null, moderatedAt: null, locked: false, createdAt: now(),
        officialCommentId: null, duplicateOf: null, statusChangedAt: null, editedAt: null, reportCount: 0, history: [], reviewedAt: null, clientId,
      });
      follows.add(key(id, u.userId));
      hold('post', id, reason);
      ctx.leave('board.submitPost');
      return reason ? { id, visibility: 'pending', holdReason: reason } : { id, visibility: 'visible' };
    },
    async editPost(id, d) {
      await ctx.enter('board.editPost');
      const u = await ctx.needUser();
      const f = postFields(d);
      const m = mayWrite(u.userId);
      let reason = checkText(m, `${f.title}\n${f.body}`, f.itemRef, d.cert);
      take(u.userId, 'edit', null, 30);
      const p = posts.get(id);
      if (!p || p.authorId !== u.userId || !['pending', 'visible'].includes(p.visibility) || p.locked) throw new CloudError('forbidden');
      if (!reason && p.visibility === 'pending') reason = p.holdReason ?? 'new_member';
      const spoiler = talksAboutAnswer(`${f.title}\n${f.body}`, f.itemRef) || (d.kind === 'content' && (f.itemRef ?? '').startsWith('q:'));
      // A changed text needs a fresh review before one report can't hide it.
      Object.assign(p, { kind: d.kind, title: f.title, body: f.body, itemRef: f.itemRef, discussesAnswer: spoiler, visibility: reason ? 'pending' : 'visible', holdReason: reason, editedAt: now(), reviewedAt: null });
      hold('post', id, reason);
      return reason ? { visibility: 'pending', holdReason: reason } : { visibility: 'visible' };
    },
    async withdrawPost(id) {
      await ctx.enter('board.withdrawPost');
      const { userId } = await ctx.needUser();
      const p = posts.get(id);
      if (!p || p.authorId !== userId || !['pending', 'visible'].includes(p.visibility)) throw new CloudError('forbidden');
      p.visibility = 'withdrawn';
      ctx.leave('board.withdrawPost');
    },
    async comment(postId, b, parentId) {
      await ctx.enter('board.comment');
      const u = await ctx.needUser();
      const body = commentBody(b);
      const m = mayWrite(u.userId);
      const reason = checkText(m, body, null, posts.get(postId)?.cert ?? 'cisa');
      const young = accountAge(u.userId) < DAY;
      take(u.userId, 'comment', 20, young ? 5 : 30);
      const p = posts.get(postId);
      if (!p || p.visibility !== 'visible' || !canRead(p, u.userId) || (p.locked && !staff.has(u.userId)) || blockedBy(p.authorId, u.userId)) throw new CloudError('forbidden');
      if (parentId) {
        const parent = comments.get(parentId);
        // Never a reply to someone who blocked the replier (SEC S2).
        if (!parent || parent.postId !== postId || parent.parentId !== null || blockedBy(parent.authorId, u.userId)) throw new CloudError('forbidden');
      }
      const id = newId('comment');
      comments.set(id, {
        id, postId, authorId: u.userId, parentId: parentId ?? null, body, isOfficial: false, visibility: reason ? 'pending' : 'visible', holdReason: reason,
        modReason: null, moderatedAt: null, createdAt: now(), editedAt: null, reportCount: 0, reviewedAt: null,
      });
      follows.add(key(postId, u.userId));
      if (!reason) notifyPost(postId, 'reply', u.userId, { commentId: id });
      hold('comment', id, reason);
      ctx.leave('board.comment');
      return { id, visibility: reason ? 'pending' : 'visible' };
    },
    async editComment(id, b) {
      await ctx.enter('board.editComment');
      const u = await ctx.needUser();
      const body = commentBody(b);
      const m = mayWrite(u.userId);
      const c = comments.get(id);
      const reason = checkText(m, body, null, (c && posts.get(c.postId)?.cert) ?? 'cisa');
      take(u.userId, 'edit', null, 30);
      if (!c || c.authorId !== u.userId || !['pending', 'visible'].includes(c.visibility) || c.isOfficial) throw new CloudError('forbidden');
      Object.assign(c, { body, visibility: reason ? 'pending' : 'visible', holdReason: reason, editedAt: now(), reviewedAt: null });
    },
    async withdrawComment(id) {
      await ctx.enter('board.withdrawComment');
      const { userId } = await ctx.needUser();
      const c = comments.get(id);
      if (!c || c.authorId !== userId || !['pending', 'visible'].includes(c.visibility)) throw new CloudError('forbidden');
      c.visibility = 'withdrawn';
    },
    async vote(postId, on) {
      await ctx.enter('board.vote');
      const { userId } = await ctx.needUser();
      const k = key(postId, userId);
      if (!on) {
        if (votes.delete(k)) take(userId, 'vote', null, null, false);
        ctx.leave('board.vote');
        return;
      }
      if (votes.has(k)) return; // the same vote twice is one vote (the outbox may resend it)
      const p = posts.get(postId);
      if (!activeMember(members.get(userId)) || !p || p.visibility !== 'visible' || p.locked || !canRead(p, userId)) throw new CloudError('forbidden');
      take(userId, 'vote', null, 100);
      votes.set(k, now());
      follows.add(k);
      ctx.leave('board.vote');
    },
    async follow(postId, on) {
      await ctx.enter('board.follow');
      const { userId } = await ctx.needUser();
      const k = key(postId, userId);
      if (!on) {
        if (follows.delete(k)) take(userId, 'follow', null, null, false);
        return;
      }
      if (follows.has(k)) return;
      if (!members.has(userId) || !posts.has(postId)) throw new CloudError('forbidden');
      take(userId, 'follow', null, 200);
      follows.add(k);
    },
    async report(t) {
      await ctx.enter('board.report');
      const u = await ctx.needUser();
      if (!u.termsVersion) throw new CloudError('forbidden');
      if (reports.some((r) => r.reporterId === u.userId && r.kind === t.kind && r.targetId === t.id)) return; // already reported: the same answer
      const target = t.kind === 'post' ? posts.get(t.id) : t.kind === 'comment' ? comments.get(t.id) : undefined;
      // A member is reported by their PUBLIC id.
      const member = t.kind === 'member' ? [...members.values()].find((m) => m.publicId === t.id) : undefined;
      if (t.kind === 'member' ? !member || member.userId === u.userId : !target || target.visibility !== 'visible' || target.authorId === u.userId) throw new CloudError('forbidden');
      if (t.note !== undefined && t.note.length > 500) throw new CloudError('invalid', undefined, 'note');
      take(u.userId, 'report', null, accountAge(u.userId) < DAY ? 3 : 10);
      const snapshot = member ? member.handle : t.kind === 'post' ? `${(target as MPost).title}\n${target!.body}` : target!.body;
      reports.push({ reporterId: u.userId, kind: t.kind, targetId: t.id, reason: t.reason, status: 'open', at: now(), snapshot, note: t.note ?? null });
      if (target) {
        target.reportCount += 1;
        // Only trusted reporters hide (SEC S1): one "real exam content" report before any review, or three with accounts 7+ days old.
        const verified = new Set(
          reports.filter((r) => r.kind === t.kind && r.targetId === t.id && r.status === 'open' && trustedReporter(r.reporterId) && accountAge(r.reporterId!) >= 7 * DAY).map((r) => r.reporterId),
        ).size;
        const why: HoldReason | null = t.reason === 'exam_content' && target.reviewedAt === null && trustedReporter(u.userId) ? 'exam_report' : verified >= 3 ? 'reports' : null;
        if (why && target.visibility === 'visible') {
          target.visibility = 'hidden';
          target.holdReason = why;
          modLog.push({ actorId: null, action: 'hide', targetKind: t.kind, targetId: t.id, reason: why, at: now() });
        }
      }
      ctx.leave('board.report');
    },
    async block(memberId) {
      await ctx.enter('board.block');
      const u = await ctx.needUser();
      // The app names the learner by their public id only.
      const m = [...members.values()].find((x) => x.publicId === memberId);
      if (m && blocks.has(key(u.userId, m.userId))) return;
      if (!m || m.userId === u.userId || staff.has(m.userId) || [...blocks].filter((b) => b.startsWith(`${u.userId}|`)).length >= 500) throw new CloudError('forbidden');
      take(u.userId, 'block', null, 100);
      blocks.add(key(u.userId, m.userId));
      ctx.leave('board.block');
    },
    async unblock(memberId) {
      await ctx.enter('board.unblock');
      const u = await ctx.needUser();
      const m = [...members.values()].find((x) => x.publicId === memberId);
      if (m && blocks.delete(key(u.userId, m.userId))) take(u.userId, 'block', null, null, false);
    },
    async blocked() {
      await ctx.enter('board.blocked');
      const u = await ctx.needUser();
      const list = [...blocks].filter((b) => b.startsWith(`${u.userId}|`)).map((b) => members.get(b.split('|')[1])).filter((m): m is MMember => !!m);
      return wire(list.map((m) => memberOut(m, false)));
    },
    async inbox() {
      await ctx.enter('board.inbox');
      const { userId } = await ctx.needUser();
      const mine = notices.filter((n) => n.userId === userId).sort((a, b) => b.at - a.at || b.id - a.id);
      const out: Notice[] = mine.map((n) => {
        const c = n.commentId ? comments.get(n.commentId) : undefined;
        const p = n.postId ? posts.get(n.postId) : undefined;
        const targetKind = n.kind === 'removed' || n.kind === 'warned' || n.kind === 'appeal' ? (n.commentId ? 'comment' : n.postId ? 'post' : null) : n.postId ? 'post' : null;
        // A subject only from text this learner may read: their own item, or a post they can see.
        const subject = targetKind === 'comment' && c && c.authorId === userId ? c.body : p && canRead(p, userId) ? p.title : null;
        const target = targetKind === 'comment' ? c : p;
        const canAppeal =
          n.kind === 'removed' && !!target && target.visibility === 'removed' && target.authorId === userId && (target.moderatedAt ?? 0) > now() - 14 * DAY && !appeals.some((a) => a.userId === userId && a.targetId === target.id);
        return { id: n.id, kind: n.kind, postId: n.postId, commentId: n.commentId, subject, targetKind, reason: n.reason, byPerson: n.byPerson, outcome: n.outcome, status: n.status, untilAt: n.untilAt, at: n.at, read: n.read, canAppeal };
      });
      return wire(out);
    },
    async markRead(ids) {
      await ctx.enter('board.markRead');
      const { userId } = await ctx.needUser();
      for (const n of notices) if (n.userId === userId && ids.includes(n.id)) n.read = true;
    },
    async appeal(t) {
      await ctx.enter('board.appeal');
      const { userId } = await ctx.needUser();
      if (appeals.some((a) => a.userId === userId && a.kind === t.kind && a.targetId === t.id)) throw new CloudError('conflict');
      const target = t.kind === 'post' ? posts.get(t.id) : t.kind === 'comment' ? comments.get(t.id) : undefined;
      const ok =
        t.kind === 'standing'
          ? t.id === userId && members.get(userId)?.standing !== 'active' && (members.get(userId)?.standingChangedAt ?? 0) > now() - 14 * DAY
          : !!target && target.authorId === userId && target.visibility === 'removed' && (target.moderatedAt ?? 0) > now() - 14 * DAY;
      if (!ok) throw new CloudError('forbidden');
      if (t.note !== undefined && t.note.length > 1000) throw new CloudError('invalid', undefined, 'note');
      appeals.push({ id: newId('appeal'), userId, kind: t.kind, targetId: t.id, note: t.note ?? null, status: 'open', at: now() });
      modLog.push({ actorId: null, action: 'appeal', targetKind: t.kind, targetId: t.id, reason: null, at: now() });
      ctx.leave('board.appeal');
    },
    async isStaff() {
      await ctx.enter('board.isStaff');
      const { userId } = await ctx.needUser();
      return staff.has(userId);
    },
    async staffQueue(tab: StaffTab): Promise<StaffQueue> {
      await ctx.enter('board.staffQueue');
      await needStaff();
      const prior = (id: string) => modLog.filter((l) => l.targetId === id && l.actorId !== null).length;
      const heldItems = (): QueueItem[] => [
        ...[...posts.values()].filter((p) => (p.visibility === 'pending' || p.visibility === 'hidden') && p.holdReason).map((p) => ({
          kind: 'post' as const, id: p.id, label: p.holdReason!, title: p.title, body: p.body.slice(0, 600), handle: handleOf(p.authorId),
          newMember: (members.get(p.authorId)?.approvedPosts ?? 0) === 0, priorActions: prior(p.authorId), count: 0, examContent: p.holdReason === 'exam_report', at: p.createdAt,
        })),
        ...[...comments.values()].filter((c) => (c.visibility === 'pending' || c.visibility === 'hidden') && c.holdReason).map((c) => ({
          kind: 'comment' as const, id: c.id, label: c.holdReason!, title: null, body: c.body.slice(0, 600), handle: handleOf(c.authorId),
          newMember: (members.get(c.authorId)?.approvedPosts ?? 0) === 0, priorActions: prior(c.authorId), count: 0, examContent: c.holdReason === 'exam_report', at: c.createdAt,
        })),
      ];
      const reported = (): QueueItem[] => {
        const groups = new Map<string, typeof reports>();
        for (const r of reports.filter((x) => x.status === 'open')) groups.set(`${r.kind}|${r.targetId}`, [...(groups.get(`${r.kind}|${r.targetId}`) ?? []), r]);
        return [...groups.values()].map((rs) => {
          const r = rs[0];
          const t = r.kind === 'post' ? posts.get(r.targetId) : r.kind === 'comment' ? comments.get(r.targetId) : undefined;
          const who = t ? members.get(t.authorId) : r.kind === 'member' ? [...members.values()].find((m) => m.publicId === r.targetId) : undefined;
          // As the SQL does (re-review RR_P8 R1): the words live NOW, so an edit after a harmless first
          // report can't hide an insult; and the words as first and as last reported (SEC S3).
          const byTime = [...rs].sort((a, b) => a.at - b.at);
          const firstAt = byTime[0].at;
          const editedAt = t?.editedAt ?? null;
          return {
            kind: r.kind, id: r.targetId, label: [...new Set(rs.map((x) => x.reason))].join(', '),
            title: r.kind === 'post' ? (t as MPost | undefined)?.title ?? null : null,
            body: t ? t.body.slice(0, 600) : null,
            handle: who?.handle ?? (t ? handleOf(t.authorId) : null), newMember: (who?.approvedPosts ?? 1) === 0, priorActions: who ? prior(who.userId) : 0,
            count: rs.length, examContent: rs.some((x) => x.reason === 'exam_content'), at: firstAt,
            reportedFirst: byTime[0].snapshot, reportedLast: byTime[byTime.length - 1].snapshot,
            editedAt, editedSinceReport: editedAt !== null && editedAt > firstAt,
          };
        });
      };
      const items: QueueItem[] =
        tab === 'held'
          ? heldItems()
          : tab === 'reported'
            ? reported()
            : tab === 'appeals'
              ? appeals.filter((a) => a.status === 'open').map((a) => ({ kind: 'appeal' as const, id: a.id, label: a.kind, title: a.kind === 'post' ? posts.get(a.targetId)?.title ?? null : null, body: a.note, handle: handleOf(a.userId), newMember: false, priorActions: prior(a.userId), count: 1, examContent: false, at: a.at }))
              : tab === 'members'
                ? [...members.values()].filter((m) => m.standing !== 'active' || prior(m.userId) > 0).map((m) => ({ kind: 'member' as const, id: m.publicId, label: m.standing, title: null, body: null, handle: m.handle, newMember: m.approvedPosts === 0, priorActions: prior(m.userId), count: 0, examContent: false, at: m.standingChangedAt ?? m.joinedAt }))
                : modLog.slice(-50).reverse().map((l, i) => ({ kind: 'log' as const, id: `log-${i}`, label: l.action, title: l.reason, body: null, handle: null, newMember: false, priorActions: 0, count: 0, examContent: false, at: l.at }));
      if (tab !== 'log') items.sort((a, b) => Number(b.examContent) - Number(a.examContent) || a.at - b.at);
      const waiting = heldItems().length + new Set(reports.filter((r) => r.status === 'open').map((r) => `${r.kind}|${r.targetId}`)).size;
      return wire({ tab, items, postingOpen, waiting });
    },
    async staff(a) {
      await ctx.enter('board.staff');
      const actor = await needStaff();
      const reason = a.reason ?? null;
      if (reason !== null && !MOD_REASONS.includes(reason)) throw new CloudError('invalid', undefined, 'reason');
      const log = (action: string, targetKind: string | null, targetId: string | null, why: string | null = reason) => modLog.push({ actorId: actor, action, targetKind, targetId, reason: why, at: now() });
      const id = a.targetId ?? '';
      if ((a.targetKind === 'post' || a.targetKind === 'comment') && ['approve', 'hide', 'remove', 'remove_warn', 'delete_exam_content', 'restore'].includes(a.action)) {
        const t = a.targetKind === 'post' ? posts.get(id) : comments.get(id);
        // Withdrawn by its author: staff can't publish it again or hide it (SEC N3).
        if (!t || (t.visibility === 'withdrawn' && ['approve', 'restore', 'hide'].includes(a.action))) throw new CloudError('not_found');
        const why = a.action === 'delete_exam_content' ? 'exam_content' : reason;
        if (['remove', 'remove_warn'].includes(a.action) && !why) throw new CloudError('invalid', undefined, 'reason_required');
        const wasPending = t.visibility === 'pending';
        t.visibility = a.action === 'approve' || a.action === 'restore' ? 'visible' : a.action === 'hide' ? 'hidden' : 'removed';
        if (a.action === 'approve' || a.action === 'restore') {
          t.holdReason = null;
          t.reviewedAt = now();
        }
        if (['remove', 'remove_warn', 'delete_exam_content'].includes(a.action)) {
          t.modReason = why as ModReason;
          t.moderatedAt = now();
          if (a.action === 'delete_exam_content') {
            t.body = a.targetKind === 'post' ? '' : '-';
            if (a.targetKind === 'post') (t as MPost).title = 'Removed post';
          }
          const ids = a.targetKind === 'post' ? { postId: id, commentId: null } : { postId: (t as MComment).postId, commentId: id };
          notify({ userId: t.authorId, kind: 'removed', ...ids, reason: why as ModReason, byPerson: true, outcome: null, status: null, untilAt: null });
          if (a.action !== 'remove') {
            notify({ userId: t.authorId, kind: 'warned', ...ids, reason: why as ModReason, byPerson: null, outcome: null, status: null, untilAt: null });
            log('warn', 'member', t.authorId, why);
          }
        }
        if (a.action === 'approve' && wasPending && a.targetKind === 'post') {
          const m = members.get(t.authorId);
          if (m) m.approvedPosts += 1;
        }
        for (const r of reports) if (r.kind === a.targetKind && r.targetId === id && r.status === 'open') r.status = a.action === 'approve' || a.action === 'restore' ? 'dismissed' : 'actioned';
        log(a.action === 'remove_warn' ? 'remove' : a.action, a.targetKind, id, why);
      } else if (a.targetKind === 'post' && a.action === 'spoiler') {
        const p = posts.get(id);
        if (!p) throw new CloudError('not_found');
        p.discussesAnswer = a.extra?.on !== false;
        log('spoiler', 'post', id, null);
      } else if (a.targetKind === 'member' && a.action === 'rename') {
        // An offensive or impersonating name becomes a plain neutral one (SEC B1). Logged.
        const m = memberByAnyId(id);
        if (!m) throw new CloudError('not_found');
        m.handle = `Learner ${newId('n').replace(/[^a-z0-9]/g, '').slice(-6)}`;
        m.handleKind = 'pseudonym';
        m.handleChangedAt = now();
        log('rename', 'member', m.userId, null);
      } else if (a.targetKind === 'post' && ['status', 'official', 'merge', 'lock', 'unlock'].includes(a.action)) {
        const p = posts.get(id);
        if (!p) throw new CloudError('not_found');
        const x = a.extra ?? {};
        if (a.action === 'status') {
          const status = x.status as PostStatus;
          const note = typeof x.note === 'string' && x.note ? x.note : null;
          if (status === 'not_planned' && !note) throw new CloudError('invalid', undefined, 'note_required');
          if (status === 'shipped' && typeof x.shippedIn === 'string') p.shippedIn = x.shippedIn;
          setStatus(p, status, note);
        } else if (a.action === 'official') {
          const body = normalizeText(String(x.body ?? ''));
          if (!body || body.length > 1000) throw new CloudError('invalid', undefined, 'body');
          const cid = newId('comment');
          for (const c of comments.values()) if (c.postId === id) c.isOfficial = false;
          comments.set(cid, { id: cid, postId: id, authorId: actor, parentId: null, body, isOfficial: true, visibility: 'visible', holdReason: null, modReason: null, moderatedAt: null, createdAt: now(), editedAt: null, reportCount: 0, reviewedAt: now() });
          p.officialCommentId = cid;
          notifyPost(id, 'official', null, { commentId: cid });
        } else if (a.action === 'merge') {
          const into = String(x.into ?? '');
          if (!posts.has(into) || into === id) throw new CloudError('invalid', undefined, 'into');
          for (const k of [...votes.keys()].filter((v) => v.startsWith(`${id}|`))) {
            votes.set(key(into, k.split('|')[1]), votes.get(k)!);
            votes.delete(k);
          }
          for (const f of [...follows].filter((v) => v.startsWith(`${id}|`))) {
            follows.add(key(into, f.split('|')[1]));
            follows.delete(f);
          }
          // The moved comments can't bring a second official response (CR nit 6).
          for (const c of comments.values()) {
            if (c.postId !== id) continue;
            c.postId = into;
            c.isOfficial = false;
          }
          p.duplicateOf = into;
          p.officialCommentId = null;
          setStatus(p, 'duplicate', typeof x.note === 'string' ? x.note : p.statusNote);
        } else {
          p.locked = a.action === 'lock';
        }
        log(a.action, 'post', id, null);
      } else if (a.targetKind === 'member' && ['warn', 'limit', 'suspend', 'ban', 'unban'].includes(a.action)) {
        // The queue names a member by their public id (an account id works too, as in the SQL).
        const m = memberByAnyId(id);
        if (!m) throw new CloudError('not_found');
        const days = Math.min(Math.max(Number(a.extra?.days ?? (a.action === 'limit' ? 3 : 7)) || 7, 1), 365);
        if (a.action === 'warn') notify({ userId: m.userId, kind: 'warned', postId: null, commentId: null, reason, byPerson: null, outcome: null, status: null, untilAt: null });
        else {
          m.standing = a.action === 'unban' ? 'active' : a.action === 'ban' ? 'banned' : a.action === 'limit' ? 'limited' : 'suspended';
          m.standingUntil = a.action === 'limit' || a.action === 'suspend' ? now() + days * DAY : null;
          m.standingChangedAt = now();
          if (a.action === 'limit' || a.action === 'suspend') notify({ userId: m.userId, kind: 'suspended', postId: null, commentId: null, reason, byPerson: null, outcome: null, status: null, untilAt: m.standingUntil });
        }
        log(a.action, 'member', m.userId);
      } else if (a.targetKind === 'board' && (a.action === 'pause' || a.action === 'reopen')) {
        postingOpen = a.action === 'reopen';
        log(a.action, 'board', null, null);
      } else if (a.targetKind === 'appeal' && (a.action === 'uphold' || a.action === 'restore_appeal')) {
        const ap = appeals.find((x) => x.id === id && x.status === 'open');
        if (!ap) throw new CloudError('not_found');
        ap.status = a.action === 'uphold' ? 'upheld' : 'restored';
        if (a.action === 'restore_appeal') {
          const t = ap.kind === 'post' ? posts.get(ap.targetId) : ap.kind === 'comment' ? comments.get(ap.targetId) : undefined;
          if (t) {
            t.visibility = 'visible';
            t.modReason = null;
            t.reviewedAt = now();
          } else if (ap.kind === 'standing') {
            const m = members.get(ap.userId);
            if (m) Object.assign(m, { standing: 'active', standingUntil: null, standingChangedAt: now() });
          }
        }
        notify({
          userId: ap.userId, kind: 'appeal', postId: ap.kind === 'post' ? ap.targetId : null, commentId: ap.kind === 'comment' ? ap.targetId : null, reason: null, byPerson: true,
          outcome: ap.status === 'upheld' ? 'upheld' : 'restored', status: null, untilAt: null,
        });
        log(a.action === 'uphold' ? 'uphold' : 'restore', 'appeal', id, null);
      } else if (a.targetKind === 'report' && a.action === 'dismiss') {
        // Every open report on one reported thing: the queue's row (CR N4), as the SQL does.
        const kind = a.extra?.kind;
        if (kind !== 'post' && kind !== 'comment' && kind !== 'member') throw new CloudError('invalid', undefined, 'kind');
        // Never blind (re-review RR_P8 R1): words edited after the queue row staff read are refused, nothing closed.
        const seen = a.extra?.editedAt ?? null;
        const edited = kind === 'post' ? posts.get(id)?.editedAt : kind === 'comment' ? comments.get(id)?.editedAt : null;
        if (edited != null && edited !== seen) throw new CloudError('conflict', undefined, 'changed');
        for (const r of reports) if (r.kind === kind && r.targetId === id && r.status === 'open') r.status = 'dismissed';
        log('dismiss', 'report', id, null);
      } else {
        throw new CloudError('invalid', undefined, 'action');
      }
      ctx.leave('board.staff');
      return { ok: true, action: a.action };
    },
  };

  const control: MemoryBoardControl = {
    setReadScope: (s) => {
      readScope = s;
    },
    setPostingOpen: (on) => {
      postingOpen = on;
    },
    addStaff: (id) => {
      staff.add(id);
    },
    posts: () => wire([...posts.values()]),
    comments: () => wire([...comments.values()]),
    members: () => wire([...members.values()]),
    votes: () => [...votes.keys()].map((k) => ({ postId: k.split('|')[0], userId: k.split('|')[1] })),
    reports: () => wire(reports.map(({ reporterId, kind, targetId, reason, status, snapshot, note }) => ({ reporterId, kind, targetId, reason, status, snapshot, note }))),
    blocks: () => [...blocks].map((b) => ({ blockerId: b.split('|')[0], blockedId: b.split('|')[1] })),
    notices: () => wire(notices),
    log: () => modLog.map(({ actorId, action, targetKind, reason }) => ({ actorId, action, targetKind, reason })),
    removeUser(userId) {
      // Reports about what goes are closed, and the reported words and notes go too (CR N5).
      const gone = new Set<string>([members.get(userId)?.publicId ?? '']);
      for (const [id, p] of posts) if (p.authorId === userId) {
        posts.delete(id);
        gone.add(id);
      }
      for (const [id, c] of comments) if (c.authorId === userId || !posts.has(c.postId)) {
        comments.delete(id);
        gone.add(id);
      }
      for (const r of reports) if (gone.has(r.targetId)) Object.assign(r, { status: r.status === 'open' ? 'actioned' : r.status, snapshot: null, note: null });
      for (const k of [...votes.keys()]) if (k.endsWith(`|${userId}`) || !posts.has(k.split('|')[0])) votes.delete(k);
      for (const k of [...follows]) if (k.endsWith(`|${userId}`) || !posts.has(k.split('|')[0])) follows.delete(k);
      for (const k of [...blocks]) if (k.startsWith(`${userId}|`) || k.endsWith(`|${userId}`)) blocks.delete(k);
      for (const r of reports) if (r.reporterId === userId) r.reporterId = null;
      for (let i = notices.length - 1; i >= 0; i--) if (notices[i].userId === userId) notices.splice(i, 1);
      for (let i = appeals.length - 1; i >= 0; i--) if (appeals[i].userId === userId) appeals.splice(i, 1);
      for (let i = events.length - 1; i >= 0; i--) if (events[i].userId === userId) events.splice(i, 1);
      members.delete(userId);
      staff.delete(userId);
    },
    exportFor(userId) {
      const m = members.get(userId);
      return wire({
        member: m ? { handle: m.handle, handleKind: m.handleKind, guidelinesVersion: m.guidelinesVersion, standing: m.standing, standingUntil: m.standingUntil, joinedAt: new Date(m.joinedAt).toISOString() } : null,
        posts: [...posts.values()].filter((p) => p.authorId === userId).map((p) => ({ id: p.id, kind: p.kind, title: p.title, body: p.body, itemRef: p.itemRef, status: p.status, visibility: p.visibility, createdAt: new Date(p.createdAt).toISOString() })),
        comments: [...comments.values()].filter((c) => c.authorId === userId).map((c) => ({ id: c.id, postId: c.postId, body: c.body, visibility: c.visibility, createdAt: new Date(c.createdAt).toISOString() })),
        votes: [...votes.keys()].filter((k) => k.endsWith(`|${userId}`)).map((k) => ({ postId: k.split('|')[0] })),
        follows: [...follows].filter((k) => k.endsWith(`|${userId}`)).map((k) => ({ postId: k.split('|')[0] })),
        reports: reports.filter((r) => r.reporterId === userId).map((r) => ({ kind: r.kind, targetId: r.targetId, reason: r.reason, status: r.status })),
        blocks: [...blocks].filter((b) => b.startsWith(`${userId}|`)).map((b) => ({ member: handleOf(b.split('|')[1]) })),
        appeals: appeals.filter((a) => a.userId === userId).map((a) => ({ kind: a.kind, targetId: a.targetId, note: a.note, status: a.status })),
        notices: notices.filter((n) => n.userId === userId).map((n) => ({ kind: n.kind, postId: n.postId, reason: n.reason, at: new Date(n.at).toISOString() })),
      });
    },
  };
  return { port, control };
}
