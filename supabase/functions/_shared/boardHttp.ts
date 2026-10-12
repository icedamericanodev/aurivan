// A board database refusal as the app's HTTP answer (Uplift Phase 8), shared
// by board-submit and staff-action. Never the database's own message.
import { BoardDbError } from './board.ts';
import { HttpError } from './http.ts';

const DAY_SEC = 24 * 60 * 60;

export function fromBoardDb(e: unknown): never {
  if (!(e instanceof BoardDbError)) throw e;
  switch (e.code) {
    case 'forbidden':
      throw new HttpError(403, 'forbidden');
    case 'rate_limited':
      throw new HttpError(429, 'rate_limited', undefined, DAY_SEC);
    case 'posting_paused':
      throw new HttpError(409, 'posting_paused');
    case 'banned':
      throw new HttpError(403, 'banned');
    case 'guidelines':
      throw new HttpError(409, 'invalid', 'guidelines');
    case 'handle_reserved':
      throw new HttpError(400, 'invalid', 'handle_reserved');
    case 'handle_taken':
      throw new HttpError(409, 'invalid', 'handle_taken');
    case 'not_found':
      throw new HttpError(404, 'not_found');
    case 'invalid':
      throw new HttpError(400, 'invalid');
    default:
      throw new HttpError(500, 'server');
  }
}
