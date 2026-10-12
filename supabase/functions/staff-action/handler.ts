// staff-action: POST { action, targetKind?, targetId?, reason?, extra? }
// (Uplift Phase 8, built OFF; spec §4.5 and B7)
//
//   { action: 'whoami' }        → { staff }  (anyone signed in: is THIS user staff?)
//   { action: 'queue', tab }    → the staff queue page (held, reported, appeals, members, log)
//   { action, targetKind, … }   → private.staff_act, which logs the actor and reason
//
// 1. A verified user (401 / 410 otherwise).
// 2. Staff status is read from private.staff with the service role, never
//    from the token's metadata. Anyone else gets 403 `forbidden` and learns
//    nothing (no queue, no counts). The app's staff screen is only cosmetic;
//    this is the gate, and private.staff_act checks the actor again.
// 3. Every action and its fields are checked against a fixed list before
//    the database sees them.

import type { AdminPort } from '../_shared/admin.ts';
import { requireUser } from '../_shared/auth.ts';
import type { BoardDbPort, StaffActInput } from '../_shared/board.ts';
import { fromBoardDb } from '../_shared/boardHttp.ts';
import { HttpError, json, type Logger, readJsonObject, requirePost, serveSafely } from '../_shared/http.ts';
import { normalizeText } from '../_shared/moderation.ts';

export interface StaffActionDeps {
  admin: AdminPort;
  board: BoardDbPort;
  log: Logger;
}

type Kind = StaffActInput['targetKind'];

/** Which actions each kind of target takes. */
export const ACTIONS: Record<Kind, readonly string[]> = {
  post: [
    'approve',
    'hide',
    'remove',
    'remove_warn',
    'delete_exam_content',
    'restore',
    'status',
    'official',
    'merge',
    'lock',
    'unlock',
    'spoiler',
  ],
  comment: ['approve', 'hide', 'remove', 'remove_warn', 'delete_exam_content', 'restore'],
  // A member is named by their public id (what the queue shows; SEC S4).
  // rename: an offensive or impersonating name becomes a neutral pseudonym (SEC B1).
  member: ['warn', 'limit', 'suspend', 'ban', 'unban', 'rename'],
  board: ['pause', 'reopen'],
  appeal: ['uphold', 'restore_appeal'],
  report: ['dismiss'],
};
const REASONS = ['exam_content', 'copyright', 'abuse', 'sexual_violent', 'spam', 'personal_info', 'off_topic'];
const STATUSES = ['open', 'under_review', 'planned', 'in_progress', 'shipped', 'answered', 'not_planned', 'duplicate'];
const TABS = ['held', 'reported', 'appeals', 'members', 'log'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION = /^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/;

/** The `extra` an action may carry, checked and rebuilt (nothing else passes through). */
function extraFor(action: string, raw: unknown): Record<string, unknown> {
  const x = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const note = typeof x.note === 'string' ? normalizeText(x.note) : '';
  if (note.length > 500) throw new HttpError(400, 'invalid', 'note');
  switch (action) {
    case 'status': {
      if (typeof x.status !== 'string' || !STATUSES.includes(x.status)) throw new HttpError(400, 'invalid', 'status');
      if (x.status === 'not_planned' && !note) throw new HttpError(400, 'invalid', 'note_required');
      const shippedIn = typeof x.shippedIn === 'string' ? x.shippedIn : '';
      if (shippedIn && !VERSION.test(shippedIn)) throw new HttpError(400, 'invalid', 'shipped_in');
      return { status: x.status, note, shippedIn };
    }
    case 'official': {
      const body = typeof x.body === 'string' ? normalizeText(x.body) : '';
      if (body.length < 1 || body.length > 1000) throw new HttpError(400, 'invalid', 'body');
      return { body };
    }
    case 'merge': {
      if (typeof x.into !== 'string' || !UUID.test(x.into)) throw new HttpError(400, 'invalid', 'into');
      return { into: x.into.toLowerCase(), note };
    }
    case 'spoiler': {
      // Fold (true) or unfold (false) a post about a practice question's answer (CR N12).
      if (typeof x.on !== 'boolean') throw new HttpError(400, 'invalid', 'on');
      return { on: x.on };
    }
    case 'dismiss': {
      // Every open report on one reported thing (the queue's row; CR N4).
      if (x.kind !== 'post' && x.kind !== 'comment' && x.kind !== 'member') throw new HttpError(400, 'invalid', 'kind');
      return { kind: x.kind };
    }
    case 'limit':
    case 'suspend': {
      const days = x.days === undefined ? undefined : Number(x.days);
      if (days !== undefined && !(Number.isInteger(days) && days >= 1 && days <= 365)) {
        throw new HttpError(400, 'invalid', 'days');
      }
      return days === undefined ? {} : { days };
    }
    default:
      return {};
  }
}

export function handleStaffAction(req: Request, deps: StaffActionDeps): Promise<Response> {
  return serveSafely(deps.log, async () => {
    requirePost(req);
    const { user } = await requireUser(req, deps.admin);
    const body = await readJsonObject(req, { maxBytes: 8 * 1024 });
    const staff = await deps.board.isStaff(user.id).catch(fromBoardDb);

    if (body.action === 'whoami') return json(200, { staff });
    if (!staff) {
      deps.log('not_staff', {});
      throw new HttpError(403, 'forbidden');
    }

    if (body.action === 'queue') {
      const tab = TABS.find((t) => t === body.tab);
      if (!tab) throw new HttpError(400, 'invalid', 'tab');
      return json(200, await deps.board.staffQueue(user.id, tab).catch(fromBoardDb));
    }

    const targetKind = (Object.keys(ACTIONS) as Kind[]).find((k) => k === body.targetKind);
    const action = typeof body.action === 'string' ? body.action : '';
    if (!targetKind || !ACTIONS[targetKind].includes(action)) throw new HttpError(400, 'invalid', 'action');
    const targetId = targetKind === 'board'
      ? null
      : typeof body.targetId === 'string' && UUID.test(body.targetId)
      ? body.targetId.toLowerCase()
      : '';
    if (targetId === '') throw new HttpError(400, 'invalid', 'target_id');
    const reason = body.reason === undefined || body.reason === null ? null : String(body.reason);
    if (reason !== null && !REASONS.includes(reason)) throw new HttpError(400, 'invalid', 'reason');
    if ((action === 'remove' || action === 'remove_warn') && !reason) {
      throw new HttpError(400, 'invalid', 'reason_required');
    }

    const out = await deps.board.staffAct({
      actor: user.id,
      action,
      targetKind,
      targetId,
      reason,
      extra: extraFor(action, body.extra),
    })
      .catch(fromBoardDb);
    deps.log('staff_action', { [action]: 1 });
    return json(200, out);
  });
}
