// The feedback board's server-side port (Uplift Phase 8, built OFF). The
// board-submit, staff-action and staff-digest handlers talk to this, never
// to Supabase directly: index.ts wires the real adapter (supabaseBoard.ts),
// and the deno tests inject FakeBoardDb (boardTesting.ts). Every method acts
// for ONE user id that a handler got from a verified JWT; nothing here takes
// a user id from a request body.

export type PostKind = 'content' | 'idea' | 'app' | 'question';
export type HoldReason = 'recall' | 'hold_words' | 'links';
export type WriteOp = 'post' | 'edit_post' | 'comment' | 'edit_comment';

/** The learner's OWN member facts (public.svc_board_member). Never another member's. */
export interface MemberFacts {
  userId: string;
  handle: string;
  handleKind: 'pseudonym' | 'chosen';
  guidelinesVersion: string;
  standing: 'active' | 'limited' | 'suspended' | 'banned';
  standingUntil: string | null;
  approvedPosts: number;
  isTeam: boolean;
  newAccount: boolean;
  postingOpen: boolean;
  currentGuidelines: string;
}

/** Staff-maintained filter words (private.moderation_terms), plain words only. */
export interface BoardTerms {
  block: string[];
  hold: string[];
  reserved: string[];
  linkDomains: string[];
}

export interface WriteInput {
  userId: string;
  op: WriteOp;
  /** edit_post / edit_comment: the item; comment: the post. */
  target: string | null;
  kind: PostKind | null;
  title: string | null;
  body: string;
  itemRef: string | null;
  parentId: string | null;
  hold: HoldReason | null;
  cert: string;
}

export interface WriteResult {
  id: string;
  visibility: 'pending' | 'visible';
  holdReason: string | null;
}

export interface StaffActInput {
  actor: string;
  action: string;
  targetKind: 'post' | 'comment' | 'member' | 'board' | 'appeal' | 'report';
  targetId: string | null;
  reason: string | null;
  extra: Record<string, unknown>;
}

export interface DigestCounts {
  held: number;
  reported: number;
  appeals: number;
}

/**
 * The words the SQL raises, as codes. A raw database message never leaves
 * the adapter: anything else is 'server'.
 */
export type BoardDbCode =
  | 'forbidden'
  | 'rate_limited'
  | 'posting_paused'
  | 'banned'
  | 'guidelines'
  | 'handle_reserved'
  | 'handle_taken'
  | 'not_found'
  | 'invalid'
  | 'server';

export class BoardDbError extends Error {
  constructor(public code: BoardDbCode) {
    super(code);
  }
}

export interface BoardDbPort {
  /** The learner's own member facts, or null before they join. */
  member(userId: string): Promise<MemberFacts | null>;
  terms(): Promise<BoardTerms>;
  join(userId: string, handle: string, kind: 'pseudonym' | 'chosen', version: string): Promise<MemberFacts>;
  write(i: WriteInput): Promise<WriteResult>;
  isStaff(userId: string): Promise<boolean>;
  staffAct(i: StaffActInput): Promise<unknown>;
  staffQueue(actor: string, tab: 'held' | 'reported' | 'appeals' | 'members' | 'log'): Promise<unknown>;
  digest(): Promise<DigestCounts>;
}
