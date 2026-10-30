/**
 * Base64 without atob/btoa (accounts beta §1.1). Standard base64 (with
 * padding) carries a synced snapshot's gzip; base64url (no padding) carries
 * the PKCE values and a token's middle part. Strict: a reader refuses
 * anything outside the alphabet or not in whole groups.
 *
 * Pure TypeScript: no React, no storage, no network.
 */
const STD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function encodeWith(bytes: Uint8Array, alphabet: string, pad: boolean): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += alphabet[n >> 18] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + alphabet[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += alphabet[n >> 18] + alphabet[(n >> 12) & 63] + (pad ? '==' : '');
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += alphabet[n >> 18] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + (pad ? '=' : '');
  }
  return out;
}

/** Bytes → standard base64 with padding. */
export function toBase64(bytes: Uint8Array): string {
  return encodeWith(bytes, STD, true);
}

/** Bytes → base64url without padding (RFC 4648 §5). */
export function toBase64Url(bytes: Uint8Array): string {
  return encodeWith(bytes, URL_SAFE, false);
}

/** Standard base64 with padding → bytes, or null when it isn't exactly that. */
export function fromBase64(text: string): Uint8Array | null {
  if (text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return null;
  return decodeWith(text.replace(/=+$/, ''), STD);
}

/** base64url (padding optional) → bytes, or null. */
export function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(text)) return null;
  const body = text.replace(/=+$/, '');
  if (body.length % 4 === 1) return null;
  return decodeWith(body, URL_SAFE);
}

function decodeWith(body: string, alphabet: string): Uint8Array | null {
  const out = new Uint8Array(Math.floor((body.length * 3) / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < body.length; i++) {
    const v = alphabet.indexOf(body[i]);
    if (v < 0) return null;
    acc = ((acc << 6) | v) & 0x3fff; // at most 13 live bits: never overflows
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out.slice(0, o);
}
