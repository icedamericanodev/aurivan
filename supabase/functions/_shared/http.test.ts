import { strict as assert } from 'node:assert';
import { HttpError, readCapped, readJsonObject } from './http.ts';

const streamOf = (chunks: number, size: number) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < chunks; i++) c.enqueue(new Uint8Array(size).fill(0x61));
      c.close();
    },
  });

const req = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request('http://localhost/', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  });

Deno.test('readCapped: a body at the cap is read whole', async () => {
  assert.equal((await readCapped(req(streamOf(4, 256)), 1024)).length, 1024);
  assert.equal(await readCapped(req(null), 10), '');
});

Deno.test('readCapped: one byte over the cap is 413, with or without a content-length', async () => {
  const tooBig = (e: unknown) => e instanceof HttpError && e.status === 413 && e.code === 'too_big';
  await assert.rejects(() => readCapped(req(streamOf(1, 1025)), 1024), tooBig);
  await assert.rejects(() => readCapped(req('x'.repeat(1025)), 1024), tooBig);
  // A declared size over the cap is refused without reading.
  await assert.rejects(() => readCapped(req('{}', { 'content-length': '5000' }), 1024), tooBig);
});

Deno.test('readJsonObject: a multi-byte body is counted in bytes, not characters', async () => {
  const body = JSON.stringify({ a: 'é'.repeat(400) }); // 800+ bytes, ~410 characters
  await assert.rejects(
    () => readJsonObject(req(body), { maxBytes: 500 }),
    (e: unknown) => e instanceof HttpError && e.status === 413,
  );
  assert.deepEqual(await readJsonObject(req('{"a":1}'), { maxBytes: 500 }), { a: 1 });
});
