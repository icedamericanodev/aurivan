/**
 * SHA-1 in plain TypeScript (FIPS 180-4), for one job only: the
 * leaked-password range check, whose lookup service is keyed by SHA-1
 * (only the first 5 hex characters are sent; webcloud/breach.ts).
 *
 * Why a copy in code: the browser's crypto.subtle is missing on Hermes (the
 * phone's JavaScript engine) and on pages that are not served over https,
 * and without a fingerprint the check could only say "couldn't check". SHA-1
 * is weak for signatures, but here it is only the lookup key the service
 * uses, never a way to store or protect anything.
 *
 * Pure (no React, no storage, no network) and synchronous. Tested against
 * known answers in __tests__/password-rules.test.ts.
 */
import { toHex, utf8 } from './sha256';

const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));

/** SHA-1 of some bytes (20 bytes). */
export function sha1(bytes: Uint8Array): Uint8Array {
  // Padding: a 1 bit, zeros, then the length in bits as a 64-bit big-endian number.
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 2 ** 32));
  view.setUint32(padded.length - 4, bitLen >>> 0);

  const h = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  const w = new Uint32Array(80);
  for (let block = 0; block < padded.length; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let [a, b, c, d, e] = h;
    for (let i = 0; i < 80; i++) {
      const [f, k] = i < 20 ? [(b & c) | (~b & d), 0x5a827999] : i < 40 ? [b ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const t = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30) >>> 0;
      b = a;
      a = t;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  h.forEach((v, i) => outView.setUint32(i * 4, v));
  return out;
}

/** SHA-1 of a string's UTF-8 bytes, as 40 lower-case hex characters. */
export function sha1Hex(text: string): string {
  return toHex(sha1(utf8(text)));
}
