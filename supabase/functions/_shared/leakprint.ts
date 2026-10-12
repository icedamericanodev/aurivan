// The leak guard's fingerprint as a file (Uplift Phase 8): numbers only.
//
// scripts/build-leakprint.mjs writes board-submit/leakprint.json at
// DEPLOY time from the bundled question bank (it is gitignored: the bank's
// fingerprint never sits in the public repo). Each array of 32-bit numbers
// is stored as base64 of its little-endian bytes. Nothing in the file says
// how many questions there are, and no text can be read back from it.
// `squash` (fix round P8, SEC S5) is the server-only squashed-letters
// fingerprint; board-submit refuses to start without it.

import type { Fingerprint, Postings } from './leakGuard.ts';

export interface LeakprintFile {
  v: 1;
  full: { hashes: string; items: string; common: string };
  stem: { hashes: string; items: string; common: string };
  squash: { hashes: string; items: string; common: string };
}

function toBase64(a: Uint32Array): string {
  const bytes = new Uint8Array(a.length * 4);
  const view = new DataView(bytes.buffer);
  a.forEach((n, i) => view.setUint32(i * 4, n, true));
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string): Uint32Array {
  const bin = atob(b64);
  if (bin.length % 4 !== 0) throw new Error('leakprint: bad length');
  const view = new DataView(Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer);
  const out = new Uint32Array(bin.length / 4);
  for (let i = 0; i < out.length; i++) out[i] = view.getUint32(i * 4, true);
  return out;
}

const encodePostings = (p: Postings) => ({
  hashes: toBase64(p.hashes),
  items: toBase64(p.items),
  common: toBase64(p.common),
});

function decodePostings(raw: unknown): Postings {
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r.hashes !== 'string' || typeof r.items !== 'string' || typeof r.common !== 'string') {
    throw new Error('leakprint: bad shape');
  }
  const p = { hashes: fromBase64(r.hashes), items: fromBase64(r.items), common: fromBase64(r.common) };
  if (p.hashes.length !== p.items.length) throw new Error('leakprint: bad shape');
  for (let i = 1; i < p.hashes.length; i++) if (p.hashes[i - 1] > p.hashes[i]) throw new Error('leakprint: not sorted');
  return p;
}

/** The file for a SERVER fingerprint (built with `{ squash: true }`). */
export function encodeLeakprint(fp: Fingerprint): LeakprintFile {
  if (!fp.squash) throw new Error('leakprint: build it with { squash: true }');
  return { v: 1, full: encodePostings(fp.full), stem: encodePostings(fp.stem), squash: encodePostings(fp.squash) };
}

/**
 * The fingerprint from the file's JSON. Throws on anything malformed, or a
 * file without the squashed fingerprint (an old build): the function then
 * refuses every post rather than run with a weaker guard.
 */
export function decodeLeakprint(raw: unknown): Fingerprint {
  const r = raw as Partial<LeakprintFile> | null;
  if (!r || r.v !== 1) throw new Error('leakprint: unknown version');
  return { full: decodePostings(r.full), stem: decodePostings(r.stem), squash: decodePostings(r.squash) };
}
