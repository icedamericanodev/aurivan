/**
 * mindset-pack.cjs: the Mindset tips for the phone's Practice strip
 * (Grove Phase 4, owner answer O7, 5 Nov 2026).
 *
 * Plain English: the website rotates short "Mindset." tips on its Practice
 * page. Their only copy is the `MINDSET` list inside ../index.html. Sky asked
 * for the phone to show the same tips, so the content build reads that list
 * straight from the website file and writes it into the phone's content pack
 * (generated/<cert>/mindset.json). One source, so the two apps can never say
 * different things, and nobody copies the list by hand.
 *
 * What it checks:
 *   - the `const MINDSET = [ ... ];` block is there (a renamed or moved list
 *     fails the build, so the strip never goes quietly empty);
 *   - every entry is a plain double-quoted string that is not empty.
 * The tips are kept word for word (course content is never rewritten here).
 *
 * CommonJS so Jest can test it (src/__tests__/mindset-pack.test.ts).
 */

/** The website's list: `const MINDSET = [` up to the first `];` after it. */
const BLOCK = /\bconst MINDSET\s*=\s*\[([\s\S]*?)\];/;

/**
 * Pull the tips out of the website's HTML. Returns `{ tips, problems }`:
 * `problems` is empty when the list was found and every entry is a string.
 */
function extractMindset(html) {
  const m = BLOCK.exec(String(html || ''));
  if (!m) return { tips: [], problems: ['no "const MINDSET = [ ... ];" list found in the website file'] };
  // The body is JavaScript string literals, one per line, with a trailing comma.
  // Drop that last comma and read it as JSON: only plain double-quoted strings pass.
  const body = m[1].trim().replace(/,\s*$/, '');
  let list;
  try {
    list = JSON.parse(`[${body}]`);
  } catch (e) {
    return { tips: [], problems: [`the MINDSET list is not plain double-quoted strings (${e.message})`] };
  }
  const problems = [];
  const tips = [];
  list.forEach((t, i) => {
    if (typeof t !== 'string' || !t.trim()) problems.push(`MINDSET entry ${i + 1} is empty or not text`);
    else tips.push(t);
  });
  if (!tips.length && !problems.length) problems.push('the MINDSET list is empty');
  return { tips, problems };
}

/** The pack file's shape: the course id and its tips in the website's order. */
function buildMindsetPack(html, certId) {
  const { tips, problems } = extractMindset(html);
  return { pack: { certId, tips }, problems };
}

module.exports = { buildMindsetPack, extractMindset };
