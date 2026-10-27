import { strict as assert } from 'node:assert';
import { decodeSnapshot, gunzipCapped, GzError, type GzErrorCode, MAX_GZ_CHARS, MAX_RAW_BYTES } from './gz.ts';

/** gzip (CompressionStream) → standard base64, like the clients' codec. */
async function gzBase64(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const out = new Uint8Array(
    await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer(),
  );
  let bin = '';
  for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function encode(value: unknown): Promise<{ stateGz: string; rawBytes: number }> {
  const raw = new TextEncoder().encode(JSON.stringify(value));
  return { stateGz: await gzBase64(raw), rawBytes: raw.byteLength };
}

const fails = (code: GzErrorCode) => (e: unknown) => e instanceof GzError && e.code === code;

Deno.test('round trip: what a client writes is read back exactly', async () => {
  const value = { byCert: { cisa: { answers: [{ id: 'd1_001', ok: true }] } }, note: 'é ✓' };
  const { stateGz, rawBytes } = await encode(value);
  assert.ok(stateGz.startsWith('H4sI'));
  assert.deepEqual(await decodeSnapshot('gzip+base64', stateGz, rawBytes), value);
});

Deno.test('reads the fixtures in supabase/tests/20_sync.sql (gzip with mtime 0, from another encoder)', async () => {
  assert.deepEqual(await decodeSnapshot('gzip+base64', 'H4sIAAAAAAACA6uuBQBDv6ajAgAAAA==', 2), {});
  assert.deepEqual(await decodeSnapshot('gzip+base64', 'H4sIAAAAAAACA6tWSqp0Ti0qUbKqrq0FAIu34fgNAAAA', 13), {
    byCert: {},
  });
});

Deno.test('a gzip bomb (10 MB of text in a few KB) stops at the cap, never unzipped in full', async () => {
  const bomb = new TextEncoder().encode(`{"x":"${'a'.repeat(10_000_000)}"}`);
  const stateGz = await gzBase64(bomb);
  assert.ok(stateGz.length < 30_000, `the bomb is small: ${stateGz.length}`);
  // Claiming its true size: over the 2,000,000-byte cap before anything is unzipped.
  await assert.rejects(() => decodeSnapshot('gzip+base64', stateGz, bomb.byteLength), fails('too_big'));
  // Claiming a small size: unzipping stops one byte past the claim.
  await assert.rejects(() => decodeSnapshot('gzip+base64', stateGz, 13), fails('too_big'));
  // The raw inflater on its own stops at its cap too.
  const bytes = Uint8Array.from(atob(stateGz), (c) => c.charCodeAt(0));
  await assert.rejects(() => gunzipCapped(bytes, MAX_RAW_BYTES), fails('too_big'));
});

Deno.test('a size that does not match raw_bytes is refused, both ways', async () => {
  const { stateGz, rawBytes } = await encode({ a: 1 });
  await assert.rejects(() => decodeSnapshot('gzip+base64', stateGz, rawBytes + 5), fails('size_mismatch'));
  // One byte short is a mismatch; more than that, and unzipping stops early.
  await assert.rejects(() => decodeSnapshot('gzip+base64', stateGz, rawBytes - 1), fails('size_mismatch'));
  await assert.rejects(() => decodeSnapshot('gzip+base64', stateGz, 2), fails('too_big'));
  for (const bad of [null, '7', 1.5, 1, -3]) {
    await assert.rejects(() => decodeSnapshot('gzip+base64', stateGz, bad), fails('size_mismatch'));
  }
});

Deno.test('only gzip+base64 is read', async () => {
  const { stateGz, rawBytes } = await encode({ a: 1 });
  for (const enc of ['zstd', 'gzip', '', null, undefined]) {
    await assert.rejects(() => decodeSnapshot(enc, stateGz, rawBytes), fails('unknown_encoding'));
  }
});

Deno.test('a bad prefix, alphabet or padding is refused before decoding', async () => {
  for (const text of ['eyJ4IjoxfQ==', 'H4sI!AAA', 'H4sIAAAAAAA', 'H4sI AAA', '', 'H4sIAA==AA==', 42]) {
    await assert.rejects(() => decodeSnapshot('gzip+base64', text, 2), fails('bad_base64'));
  }
});

Deno.test('over-cap input is refused before it is decoded', async () => {
  const huge = 'H4sI' + 'A'.repeat(MAX_GZ_CHARS);
  await assert.rejects(() => decodeSnapshot('gzip+base64', huge, 2), fails('too_big'));
  await assert.rejects(() => decodeSnapshot('gzip+base64', 'H4sIAAAA', MAX_RAW_BYTES + 1), fails('too_big'));
});

Deno.test('damaged gzip, a header without a body, bad UTF-8 and non-objects are refused', async () => {
  const { stateGz, rawBytes } = await encode({ a: 'x'.repeat(200) });
  const bytes = Uint8Array.from(atob(stateGz), (c) => c.charCodeAt(0));
  // The stream cut short (its checksum and size trailer gone): btoa pads it to whole groups.
  const cut = btoa(String.fromCharCode(...bytes.subarray(0, bytes.length - 12)));
  await assert.rejects(() => decodeSnapshot('gzip+base64', cut, rawBytes), fails('bad_gzip'));
  await assert.rejects(() => decodeSnapshot('gzip+base64', 'H4sIAAAA', 2), fails('not_gzip'));
  const latin1 = await gzBase64(new Uint8Array([0x7b, 0x22, 0xff, 0x22, 0x7d]));
  await assert.rejects(() => decodeSnapshot('gzip+base64', latin1, 5), fails('bad_json'));
  for (const v of [[1, 2], 'text', 70, null, true]) {
    const e = await encode(v);
    await assert.rejects(() => decodeSnapshot('gzip+base64', e.stateGz, e.rawBytes), fails('bad_json'));
  }
  const notJson = await gzBase64(new TextEncoder().encode('{not json}'));
  await assert.rejects(() => decodeSnapshot('gzip+base64', notJson, 10), fails('bad_json'));
});

Deno.test('errors carry a code only, never content from the row', async () => {
  const secret = { email: 'a@test.invalid' };
  const { stateGz } = await encode(secret);
  try {
    await decodeSnapshot('gzip+base64', stateGz, 999);
    assert.fail('should throw');
  } catch (e) {
    assert.ok(e instanceof GzError);
    assert.equal(e.message.includes('a@test.invalid'), false);
  }
});
