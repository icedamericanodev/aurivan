// The real BoardDbPort, on the service-role supabase-js client (Uplift
// Phase 8). It only calls the public.svc_* functions of
// 20261014000000_feedback_board.sql (security invoker, service_role only),
// and maps every database error to a short code: a raw Postgres message
// never leaves this file (it could hold a learner's text or an id).

import {
  type BoardDbCode,
  BoardDbError,
  type BoardDbPort,
  type BoardTerms,
  type DigestCounts,
  type MemberFacts,
} from './board.ts';

export interface RpcLike {
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

/** The SQL's own words (raise exception '<word>'), by SQLSTATE. Anything else is 'server'. */
export function boardDbCode(error: unknown): BoardDbCode {
  const e = (error ?? {}) as { code?: unknown; message?: unknown };
  const word = typeof e.message === 'string' ? e.message.trim() : '';
  switch (e.code) {
    case '42501':
      return 'forbidden';
    case 'P0001':
      return word === 'rate_limited' || word === 'posting_paused' || word === 'banned' || word === 'guidelines'
        ? word
        : 'server';
    case '22023':
      return word === 'reserved_handle' ? 'handle_reserved' : 'invalid';
    case '23505':
      return 'handle_taken';
    case '23514':
    case '22P02':
      return 'invalid';
    case 'P0002':
      return 'not_found';
    default:
      return 'server';
  }
}

const words = (x: unknown): string[] => (Array.isArray(x) ? x.filter((w): w is string => typeof w === 'string') : []);

export function supabaseBoard(client: RpcLike): BoardDbPort {
  const call = async (fn: string, args: Record<string, unknown>): Promise<unknown> => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new BoardDbError(boardDbCode(error));
    return data;
  };
  return {
    async member(userId) {
      return (await call('svc_board_member', { p_user: userId })) as MemberFacts | null;
    },
    async terms(): Promise<BoardTerms> {
      const t = (await call('svc_moderation_terms', {})) as Record<string, unknown> | null;
      return {
        block: words(t?.block),
        hold: words(t?.hold),
        reserved: words(t?.reserved),
        linkDomains: words(t?.linkDomains),
      };
    },
    async attempt(userId) {
      await call('svc_board_attempt', { p_user: userId });
    },
    async join(userId, handle, kind, version) {
      return (await call('svc_board_join', {
        p_user: userId,
        p_handle: handle,
        p_kind: kind,
        p_version: version,
      })) as MemberFacts;
    },
    async write(i) {
      const r = (await call('svc_board_write', {
        p_user: i.userId,
        p_op: i.op,
        p_target: i.target,
        p_kind: i.kind,
        p_title: i.title,
        p_body: i.body,
        p_item_ref: i.itemRef,
        p_parent: i.parentId,
        p_hold: i.hold,
        p_cert: i.cert,
        p_client: i.clientId,
        p_spoiler: i.spoiler,
      })) as { id: string; visibility: 'pending' | 'visible'; holdReason: string | null };
      return { id: r.id, visibility: r.visibility, holdReason: r.holdReason ?? null };
    },
    async isStaff(userId) {
      return (await call('svc_is_staff', { p_user: userId })) === true;
    },
    staffAct(i) {
      return call('svc_staff_act', {
        p_actor: i.actor,
        p_action: i.action,
        p_kind: i.targetKind,
        p_target: i.targetId,
        p_reason: i.reason,
        p_extra: i.extra,
      });
    },
    staffQueue(actor, tab) {
      return call('svc_staff_queue', { p_actor: actor, p_tab: tab });
    },
    async digest(): Promise<DigestCounts> {
      const d = (await call('svc_staff_digest', {})) as Record<string, unknown> | null;
      const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
      return { held: n(d?.held), reported: n(d?.reported), appeals: n(d?.appeals) };
    },
  };
}
