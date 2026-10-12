// HTTP helpers shared by Aurivan's Edge Functions (pure: no Deno or network APIs).
//
// The functions serve the native app only, so there are NO CORS headers: a
// browser page on another origin cannot read any response. Error bodies carry
// a short code that the app maps to its CloudErrorCode; never a database
// message, a token, an email or a user id.

export type ErrorCode =
  | 'unauthorized'
  | 'reauth_required'
  | 'rate_limited'
  | 'invalid'
  | 'too_big'
  | 'method_not_allowed'
  | 'server';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    public detail?: string,
    public retryAfterSec?: number,
  ) {
    super(code);
  }
}

const BASE_HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...extra } });
}

export function errorResponse(e: HttpError): Response {
  const body: Record<string, string> = { error: e.code };
  if (e.detail) body.detail = e.detail;
  const extra: Record<string, string> = {};
  if (e.retryAfterSec !== undefined) extra['retry-after'] = String(Math.max(0, Math.ceil(e.retryAfterSec)));
  return json(e.status, body, extra);
}

/** Only POST is served. Anything else (including a CORS preflight) is 405. */
export function requirePost(req: Request): void {
  if (req.method !== 'POST') throw new HttpError(405, 'method_not_allowed');
}

/**
 * Reads a small JSON object body. Rejects anything that isn't a plain object,
 * and anything over `maxBytes` before parsing it. An empty body reads as {}
 * when `optional` is set.
 */
export async function readJsonObject(
  req: Request,
  opts: { maxBytes: number; optional?: boolean },
): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > opts.maxBytes) throw new HttpError(413, 'too_big');
  const text = await req.text();
  if (new TextEncoder().encode(text).length > opts.maxBytes) throw new HttpError(413, 'too_big');
  if (text.trim() === '') {
    if (opts.optional) return {};
    throw new HttpError(400, 'invalid', 'body_required');
  }
  const type = (req.headers.get('content-type') ?? '').toLowerCase();
  if (!type.startsWith('application/json')) throw new HttpError(400, 'invalid', 'json_required');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid', 'bad_json');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'invalid', 'object_required');
  }
  return parsed as Record<string, unknown>;
}

/** One log line per event: a function name, an event name and counts only. */
export type Logger = (event: string, counts?: Record<string, number>) => void;

export function makeLogger(fn: string): Logger {
  return (event, counts) => console.log(JSON.stringify({ fn, event, ...(counts ?? {}) }));
}

/**
 * Runs a handler and turns any thrown HttpError into its response. Anything
 * else is a 500 `server`, logged as a bare event with no message, so a raw
 * database message or a token can never reach the log or the app.
 */
export async function serveSafely(log: Logger, run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof HttpError) return errorResponse(e);
    log('unhandled_error', {});
    return errorResponse(new HttpError(500, 'server'));
  }
}
