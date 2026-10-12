// staff-digest: POST (pg_cron, never the app)  (Uplift Phase 8, built OFF; spec §4.5)
// The moderator's reminder: how many held, reported and appealed items have
// waited more than 12 hours, and a link to the staff queue. Counts only: no
// learner text and no handles ever go into the email.
//
// - Called by pg_cron (daily at 08:45, and every 6 hours while anything
//   waits; scheduled at Phase 9), with `Authorization: Bearer
//   <STAFF_DIGEST_SECRET>` (a Function secret). Nothing else can call it:
//   a learner's token is not the secret (401).
// - Until the email provider is chosen (Phase 9, owner decision) there is no
//   mailer: it logs the counts and sends nothing. The staff queue shows the
//   same waiting count as a badge meanwhile.
// - Nothing waiting more than 12 hours: no email.

import type { BoardDbPort, DigestCounts } from '../_shared/board.ts';
import { HttpError, json, type Logger, requirePost, serveSafely } from '../_shared/http.ts';

export interface Mailer {
  send(m: { to: string; subject: string; text: string }): Promise<void>;
}

export interface StaffDigestDeps {
  board: BoardDbPort;
  /** null until the email provider is set (Phase 9). */
  mailer: Mailer | null;
  /** STAFF_DIGEST_SECRET; null = not configured, and every call is refused. */
  secret: string | null;
  /** The support inbox. */
  to: string;
  /** Where the staff queue opens (the app's moderation screen link). */
  queueUrl: string;
  log: Logger;
}

/** Same length and same bytes, compared without stopping early. */
function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** The email: numbers and a link only. */
export function digestEmail(c: DigestCounts, queueUrl: string): { subject: string; text: string } {
  const total = c.held + c.reported + c.appeals;
  return {
    subject: `Aurivan moderation: ${total} waiting over 12 hours`,
    text: [
      'Waiting more than 12 hours on the feedback board:',
      `Held: ${c.held}`,
      `Reported: ${c.reported}`,
      `Appeals: ${c.appeals}`,
      '',
      `Open the staff queue: ${queueUrl}`,
      'If you can’t cover the next 24 hours, pause posting from the queue first.',
    ].join('\n'),
  };
}

export function handleStaffDigest(req: Request, deps: StaffDigestDeps): Promise<Response> {
  return serveSafely(deps.log, async () => {
    requirePost(req);
    if (!deps.secret) {
      deps.log('not_configured', {});
      throw new HttpError(500, 'server');
    }
    const header = req.headers.get('authorization') ?? '';
    const token = /^Bearer (.+)$/.exec(header.trim())?.[1] ?? '';
    if (!sameSecret(token, deps.secret)) throw new HttpError(401, 'unauthorized');

    const counts = await deps.board.digest();
    const total = counts.held + counts.reported + counts.appeals;
    if (total === 0) {
      deps.log('digest_nothing_waiting', {});
      return json(200, { sent: false, ...counts });
    }
    if (!deps.mailer) {
      deps.log('digest_no_email_provider', { ...counts });
      return json(200, { sent: false, ...counts });
    }
    const mail = digestEmail(counts, deps.queueUrl);
    await deps.mailer.send({ to: deps.to, ...mail });
    deps.log('digest_sent', { ...counts });
    return json(200, { sent: true, ...counts });
  });
}
