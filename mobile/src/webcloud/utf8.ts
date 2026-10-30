/**
 * Strict UTF-8 → text (accounts beta §1.1). The snapshot reader refuses a
 * snapshot whose bytes aren't valid UTF-8, like the server's reader
 * (`TextDecoder` with `fatal: true` in supabase/functions/_shared/gz.ts).
 * Written by hand so the website bundle and Jest need nothing extra.
 *
 * Pure TypeScript: no React, no storage, no network.
 */

/** The text, or null for any invalid sequence (overlong, surrogate, past U+10FFFF, cut short). */
export function decodeUtf8(bytes: Uint8Array): string | null {
  const parts: string[] = [];
  let chunk: number[] = [];
  const flush = () => {
    parts.push(String.fromCharCode(...chunk));
    chunk = [];
  };
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let cp: number;
    let need: number;
    let min: number;
    if (b < 0x80) {
      cp = b;
      need = 0;
      min = 0;
    } else if (b >= 0xc2 && b <= 0xdf) {
      cp = b & 0x1f;
      need = 1;
      min = 0x80;
    } else if (b >= 0xe0 && b <= 0xef) {
      cp = b & 0x0f;
      need = 2;
      min = 0x800;
    } else if (b >= 0xf0 && b <= 0xf4) {
      cp = b & 0x07;
      need = 3;
      min = 0x10000;
    } else return null;
    // A sequence cut short reads `undefined` past the end: refused below.
    for (let k = 1; k <= need; k++) {
      const c = bytes[i + k];
      if (c === undefined || (c & 0xc0) !== 0x80) return null;
      cp = (cp << 6) | (c & 0x3f);
    }
    if (cp < min || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return null;
    if (cp >= 0x10000) {
      const v = cp - 0x10000;
      chunk.push(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
    } else chunk.push(cp);
    if (chunk.length >= 8192) flush();
    i += need + 1;
  }
  flush();
  return parts.join('');
}
