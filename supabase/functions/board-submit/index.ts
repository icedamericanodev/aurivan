// Wiring only; the logic and its tests are in handler.ts.
// leakprint.json is written at deploy time by scripts/build-leakprint.mjs
// (gitignored) and shipped as a static file (supabase/config.toml). Without
// it, or with a malformed one, every post is refused (500), never let through.
import { boardFromEnv } from '../_shared/serviceClient.ts';
import { errorResponse, HttpError, makeLogger } from '../_shared/http.ts';
import { decodeLeakprint } from '../_shared/leakprint.ts';
import type { Fingerprint } from '../_shared/leakGuard.ts';
import { handleBoardSubmit } from './handler.ts';

const log = makeLogger('board-submit');
const wired = boardFromEnv();

async function loadLeakprint(): Promise<Fingerprint | null> {
  try {
    return decodeLeakprint(JSON.parse(await Deno.readTextFile(new URL('./leakprint.json', import.meta.url))));
  } catch {
    log('leakprint_unreadable', {});
    return null;
  }
}
const leak = await loadLeakprint();

Deno.serve((req) => {
  if (!wired) {
    log('not_configured', {});
    return errorResponse(new HttpError(500, 'server'));
  }
  return handleBoardSubmit(req, { admin: wired.admin, board: wired.board, leak, log });
});
