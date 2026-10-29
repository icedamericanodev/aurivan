/**
 * The website cloud client's ports (accounts beta §1.1): everything the
 * outside world gives it, passed in, so the code stays pure TypeScript and
 * Jest can run it against a fake server, a fake clock and fake storage.
 *
 * On the website (assets/kaisip-cloud.js), index.html passes the browser's
 * own: `fetch`, `localStorage` / `sessionStorage`, `crypto.getRandomValues`,
 * `navigator.locks` and `Date.now` (webcloud/browser.ts has the adapters).
 */
import type { RandomPort } from '../cloud/types';

export type { RandomPort };

/** The part of a fetch Response the client reads. */
export interface HttpResponse {
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

/** A network call. Throws (any error) when the network fails: read as 'offline'. */
export type FetchPort = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; keepalive?: boolean },
) => Promise<HttpResponse>;

/** Web Storage (localStorage / sessionStorage). setItem may throw when the browser's storage is full. */
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * One holder at a time for a name, across this browser's tabs
 * (navigator.locks.request(name, fn)). The callback's promise is awaited
 * before the next holder runs.
 */
export interface LockPort {
  request<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

/** The time now (epoch ms). */
export interface ClockPort {
  now(): number;
}

/** The two storages the website has. `session` dies with the tab. */
export interface BrowserStores {
  local: StoragePort;
  session: StoragePort;
}
