// Generates the paper-grain tiles for Grove v2 (docs/mobile/DESIGN_SYSTEM.md §10.5).
//
//   node scripts/make-grain.mjs
//
// Writes assets/grain-light.png (warm-black specks) and assets/grain-dark.png
// (white specks): 256×256, tileable (each pixel is independent noise, so the
// edges match by construction). The app draws them over the whole screen at
// a low opacity (grainOp in theme/tokens.ts).
//
// To keep each file small (< 30 KB) the image is a 2-bit palette PNG: four
// shades of ONE colour that differ only in transparency. A fixed seed means
// re-running the script produces byte-identical files.
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SIZE = 256;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Small seeded random number generator (mulberry32).
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// CRC32 for PNG chunks.
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function grainPng([r, g, b], seed) {
  const rand = rng(seed);
  // About half the pixels are clear; the rest are faint, medium or full specks
  // (roughly the mockup's fractal-noise threshold).
  const level = () => {
    const x = rand();
    return x < 0.5 ? 0 : x < 0.75 ? 1 : x < 0.92 ? 2 : 3;
  };
  const rowBytes = SIZE / 4; // 2 bits per pixel
  const raw = Buffer.alloc((rowBytes + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) {
    raw[y * (rowBytes + 1)] = 0; // filter: none
    for (let x = 0; x < SIZE; x += 4) {
      const byte = (level() << 6) | (level() << 4) | (level() << 2) | level();
      raw[y * (rowBytes + 1) + 1 + x / 4] = byte;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 2; // bit depth
  ihdr[9] = 3; // colour type: palette
  const plte = Buffer.from([r, g, b, r, g, b, r, g, b, r, g, b]);
  const trns = Buffer.from([0, 90, 170, 255]); // alpha per palette entry
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('tRNS', trns),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [name, rgb, seed] of [
  ['grain-light.png', [0x3a, 0x2f, 0x1c], 7], // warm-black noise on paper
  ['grain-dark.png', [0xff, 0xff, 0xff], 11], // white noise on forest night
]) {
  const file = path.join(ROOT, 'assets', name);
  const png = grainPng(rgb, seed);
  fs.writeFileSync(file, png);
  console.log(`${name}: ${png.length} bytes`);
}
