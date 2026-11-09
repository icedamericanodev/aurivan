/** Private support transport. Loaded only after the learner chooses Send in KaiSip.
 * No auth token, background retry, public board, or client-side mail secret. */
export interface SupportSubmission {
  requestId: string;
  category: 'bug' | 'enhancement' | 'feature' | 'data' | 'other';
  message: string;
  context: {
    item: string; where: string; certification: string; appVersion: string; os: string; ref: string;
    display?: { theme: 'light' | 'dark'; textScale: number; reduceMotion: boolean };
  };
  replyTo?: string;
}
export type SupportSubmitResult =
  | { status: 'accepted' | 'pending'; receiptId: string }
  | { status: 'offline' | 'invalid' | 'rate_limited' | 'unavailable' | 'failed' | 'conflict' };

/** A build opt-in, separate from account/cloud features. Never enables accounts. */
export const DIRECT_SUPPORT_ENABLED = process.env.EXPO_PUBLIC_SUPPORT_DIRECT === '1';
const ENDPOINT = DIRECT_SUPPORT_ENABLED ? process.env.EXPO_PUBLIC_SUPPORT_SUBMIT_URL ?? '' : '';
export const directSupportAvailable = DIRECT_SUPPORT_ENABLED && /^https:\/\/[^\s?#]+\/support-submit$/.test(ENDPOINT);

/** IDs identify a single reviewed payload, not an installation or a person. */
export function newSupportRequestId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}

export async function submitSupport(payload: SupportSubmission): Promise<SupportSubmitResult> {
  if (!directSupportAvailable) return { status: 'unavailable' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal,
      credentials: 'omit', redirect: 'error',
    });
    const body: unknown = await response.json().catch(() => null);
    if (response.ok && body && typeof body === 'object' && 'status' in body && 'receiptId' in body &&
        (body.status === 'accepted' || body.status === 'pending') && typeof body.receiptId === 'string' &&
        /^[A-Za-z0-9_-]{1,128}$/.test(body.receiptId)) {
      return { status: body.status, receiptId: body.receiptId };
    }
    if (response.status === 429) return { status: 'rate_limited' };
    if (response.status === 409) return { status: 'conflict' };
    if (response.status === 400 || response.status === 413) return { status: 'invalid' };
    if (response.status === 503) return { status: 'unavailable' };
    return { status: 'failed' };
  } catch {
    // The server may have accepted a request before the connection broke.
    // Keep the SAME requestId for a manual retry; never claim it was not sent.
    return { status: 'offline' };
  } finally {
    clearTimeout(timeout);
  }
}
