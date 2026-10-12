// board-submit: POST { op, … }  (Uplift Phase 8, built OFF; spec §4.5)
// The ONLY way a post or comment reaches the board, so the filters and the
// leak guard can't be skipped through the REST API.
//
//   { op: 'me' }                                         → { member }  (own facts only; null before joining;
//                                                            its public memberId, never the account id)
//   { op: 'join', handle, handleKind, guidelinesVersion } → { member }
//      Counted as a write attempt before the name is checked (429
//      rate_limited past the limit): the private block list can't be
//      probed for free with names either (re-review RR_P8 R3).
//   { op: 'post', kind, title, body?, itemRef?, cert?, clientId? } → { id, visibility, holdReason }
//      clientId: the app's id for this draft (a uuid). Sending the same
//      draft again (its reply was lost) returns the FIRST post, unchanged:
//      never a second one (QA BUG-1).
//   { op: 'edit_post', id, kind, title, body?, itemRef? }
//   { op: 'comment', postId, body, parentId? }
//   { op: 'edit_comment', id, body }
//
// Steps for a post, a comment or an edit:
// 1. A verified user (401 / 410 otherwise) who has joined (403 forbidden
//    `not_member`), in good standing (403 banned), with the current
//    guidelines (409 invalid `guidelines`), while posting is open (409
//    posting_paused). The SQL checks all of these again.
//    Then the attempt is COUNTED (30 an hour, 200 a day; 429 rate_limited),
//    before any filter looks at the text: a refused text costs a try too,
//    so the private word lists can't be probed for free (SEC S6).
// 2. The text is normalised (NFKC, invisible characters gone, spacing).
// 3. moderateText: blocked words → 422 rejected_words `words`; a new
//    member's link, a shortener or a dump site → 422 rejected_words
//    `links`; threats, self-harm or contact details → held `hold_words`.
// 4. The leak guard: near-verbatim bank text → 422 bank_text, and NOTHING
//    is written. (Which question it matched is never said.)
// 5. The recall score of 3 or more → held `recall` (a linked practice
//    question lowers it only without a pasted option list).
//    A post that talks about a practice question's answer is folded for
//    readers ("Show it"; CR N12).
// 6. public.svc_board_write writes it with author = the verified user (a
//    user id in the body is ignored), holding a new member's posts, and
//    counting the rate limits (429 rate_limited).
// Rejected text is never stored or logged: the log has event names and
// counts only.

import type { AdminPort } from '../_shared/admin.ts';
import { requireUser } from '../_shared/auth.ts';
import type { BoardDbPort, HoldReason, MemberFacts, PostKind } from '../_shared/board.ts';
import { fromBoardDb as fromDb } from '../_shared/boardHttp.ts';
import { HttpError, json, type Logger, readJsonObject, requirePost, serveSafely } from '../_shared/http.ts';
import { type Fingerprint, leakMatch, RECALL_HOLD, recallScore, talksAboutAnswer } from '../_shared/leakGuard.ts';
import { checkHandle, moderateText, normalizeText } from '../_shared/moderation.ts';

export interface BoardSubmitDeps {
  admin: AdminPort;
  board: BoardDbPort;
  /** The bank's fingerprint (leakprint.json); null = not built, and nothing is accepted. */
  leak: Fingerprint | null;
  log: Logger;
}

const KINDS: readonly PostKind[] = ['content', 'idea', 'app', 'question'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ITEM_REF = /^(q|note|lesson|card|app):[A-Za-z0-9_.:#-]{1,80}$/;
const CERT = /^[a-z0-9-]{2,20}$/;
const VERSION = /^\d{4}-\d{2}$/;
/** Plenty for a 2,000-character body in any script, plus the envelope. */
const MAX_BODY_BYTES = 16 * 1024;

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

function uuidOrThrow(v: unknown, field: string): string {
  if (typeof v !== 'string' || !UUID.test(v)) throw new HttpError(400, 'invalid', field);
  return v.toLowerCase();
}

/** Standing, consent and the pause, before any text is looked at (the SQL checks again). */
function mayWrite(m: MemberFacts | null, nowMs: number): MemberFacts {
  if (!m) throw new HttpError(403, 'forbidden', 'not_member');
  const until = m.standingUntil ? Date.parse(m.standingUntil) : NaN;
  if (m.standing === 'banned') throw new HttpError(403, 'banned');
  if ((m.standing === 'limited' || m.standing === 'suspended') && !(until < nowMs)) throw new HttpError(403, 'banned');
  if (m.guidelinesVersion !== m.currentGuidelines) throw new HttpError(409, 'invalid', 'guidelines');
  if (!m.postingOpen) throw new HttpError(409, 'posting_paused');
  return m;
}

export function handleBoardSubmit(req: Request, deps: BoardSubmitDeps, nowMs = Date.now()): Promise<Response> {
  return serveSafely(deps.log, async () => {
    requirePost(req);
    const { user } = await requireUser(req, deps.admin);
    const body = await readJsonObject(req, { maxBytes: MAX_BODY_BYTES });
    const op = str(body.op);

    if (op === 'me') {
      const member = await deps.board.member(user.id).catch(fromDb);
      return json(200, { member });
    }

    if (op === 'join') {
      const handle = normalizeText(str(body.handle) ?? '');
      const kind = body.handleKind === 'chosen' ? 'chosen' : body.handleKind === 'pseudonym' ? 'pseudonym' : null;
      const version = str(body.guidelinesVersion);
      if (!kind || !version || !VERSION.test(version)) throw new HttpError(400, 'invalid', 'join');
      // Counted BEFORE the private word lists are read, like a post (SEC S6): a refused
      // name costs a try too, so the block list can't be probed for free (re-review RR_P8 R3).
      await deps.board.attempt(user.id).catch(fromDb);
      const terms = await deps.board.terms().catch(fromDb);
      const problem = checkHandle(handle, { reserved: terms.reserved, block: terms.block });
      if (problem) throw new HttpError(400, 'invalid', `handle_${problem}`);
      const member = await deps.board.join(user.id, handle, kind, version).catch(fromDb);
      deps.log('joined', {});
      return json(200, { member });
    }

    if (op !== 'post' && op !== 'edit_post' && op !== 'comment' && op !== 'edit_comment') {
      throw new HttpError(400, 'invalid', 'op');
    }
    // Fields first (cheap), then who may write.
    const isPost = op === 'post' || op === 'edit_post';
    const text = normalizeText(str(body.body) ?? '');
    const title = isPost ? normalizeText(str(body.title) ?? '') : null;
    const kind = isPost ? KINDS.find((k) => k === body.kind) ?? null : null;
    const itemRef = isPost && body.itemRef !== undefined && body.itemRef !== null ? str(body.itemRef) : null;
    if (isPost) {
      if (!kind) throw new HttpError(400, 'invalid', 'kind');
      if (title === null || title.length < 8 || title.length > 100) throw new HttpError(400, 'invalid', 'title');
      if (text.length > 2000) throw new HttpError(400, 'invalid', 'body');
      if (body.itemRef !== undefined && body.itemRef !== null && (itemRef === null || !ITEM_REF.test(itemRef))) {
        throw new HttpError(400, 'invalid', 'item_ref');
      }
    } else if (text.length < 1 || text.length > 1000) {
      throw new HttpError(400, 'invalid', 'body');
    }
    const cert = op === 'post' && typeof body.cert === 'string' ? body.cert : 'cisa';
    if (!CERT.test(cert)) throw new HttpError(400, 'invalid', 'cert');
    const target = op === 'post'
      ? null
      : op === 'comment'
      ? uuidOrThrow(body.postId, 'post_id')
      : uuidOrThrow(body.id, 'id');
    const parentId = op === 'comment' && body.parentId !== undefined && body.parentId !== null
      ? uuidOrThrow(body.parentId, 'parent_id')
      : null;
    const clientId = op === 'post' && body.clientId !== undefined && body.clientId !== null
      ? uuidOrThrow(body.clientId, 'client_id')
      : null;

    if (!deps.leak) {
      deps.log('leakprint_missing', {});
      throw new HttpError(500, 'server');
    }
    const member = mayWrite(await deps.board.member(user.id).catch(fromDb), nowMs);
    await deps.board.attempt(user.id).catch(fromDb);
    const terms = await deps.board.terms().catch(fromDb);

    const checked = title ? `${title}\n${text}` : text;
    const verdict = moderateText(checked, {
      newMember: member.approvedPosts === 0,
      extra: { block: terms.block, hold: terms.hold, linkDomains: terms.linkDomains },
    });
    if (verdict.verdict === 'reject') {
      deps.log('rejected', { [verdict.reason]: 1 });
      throw new HttpError(422, 'rejected_words', verdict.reason);
    }
    if (leakMatch(deps.leak, checked).verdict === 'block') {
      deps.log('rejected', { bank_text: 1 });
      throw new HttpError(422, 'bank_text');
    }
    const hold: HoldReason | null = verdict.verdict === 'hold'
      ? 'hold_words'
      : recallScore(checked, itemRef) >= RECALL_HOLD
      ? 'recall'
      : null;

    const out = await deps.board.write({
      userId: user.id,
      op,
      target,
      kind,
      title,
      body: text,
      itemRef,
      parentId,
      hold,
      cert,
      clientId,
      spoiler: isPost && talksAboutAnswer(checked, itemRef),
    }).catch(fromDb);
    deps.log(out.visibility === 'pending' ? 'held' : 'published', { [op]: 1 });
    return json(200, { id: out.id, visibility: out.visibility, holdReason: out.holdReason ?? undefined });
  });
}
