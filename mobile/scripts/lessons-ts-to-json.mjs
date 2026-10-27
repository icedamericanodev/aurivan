#!/usr/bin/env node
/**
 * lessons-ts-to-json.mjs — ONE-OFF converter (content packs, Phase A).
 *
 * Turns src/content/lessons/cisa.ts (lessons written as TypeScript) into
 * ../data/lessons/cisa.json (lessons as data), so a lesson can later ship in
 * a downloadable content pack like questions and notes do.
 *
 * Plain English:
 *   1. Node 22 can import a .ts file directly (it strips the types), so the
 *      lesson VALUES come straight from the real export: nothing is re-typed.
 *   2. The review comments in cisa.ts ("Review fix: …", "UPGRADE: keeps its
 *      original id …") are author history. JSON has no comments, so each one
 *      becomes an author-only `_comment` on the lesson or scene it sits in.
 *      The build (scripts/lessons-pack.cjs) drops every `_` field, so the app
 *      gets exactly the old export (src/__tests__/lessons-json.test.ts checked
 *      this once, before the TypeScript data was deleted).
 *   3. The file header's house rules moved to docs/content/LESSONS_SCHEMA.md.
 *
 * Run once from mobile/: node scripts/lessons-ts-to-json.mjs
 * Uses only Node built-ins and the TypeScript parser already in devDependencies.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const MOBILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(MOBILE, 'src', 'content', 'lessons', 'cisa.ts');
const OUT = path.join(MOBILE, '..', 'data', 'lessons', 'cisa.json');

const { CISA_LESSONS } = await import(pathToFileURL(SRC).href);
const text = fs.readFileSync(SRC, 'utf8');
const sf = ts.createSourceFile(SRC, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

// ── Find the CISA_LESSONS array literal ─────────────────────────────────
let lessonsArray;
sf.forEachChild(function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText() === 'CISA_LESSONS' && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
    lessonsArray = node.initializer;
  }
  node.forEachChild(visit);
});
if (!lessonsArray) throw new Error('CISA_LESSONS array not found');
if (lessonsArray.elements.length !== CISA_LESSONS.length) throw new Error('AST and export disagree on the lesson count');

// ── Every comment in the file, with its position (the scanner skips strings) ──
const comments = [];
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text);
for (let tok = scanner.scan(); tok !== ts.SyntaxKind.EndOfFileToken; tok = scanner.scan()) {
  if (tok === ts.SyntaxKind.SingleLineCommentTrivia) {
    comments.push({ pos: scanner.getTokenStart(), text: scanner.getTokenText().replace(/^\/\/\s?/, '').trim() });
  } else if (tok === ts.SyntaxKind.MultiLineCommentTrivia) {
    const body = scanner.getTokenText().replace(/^\/\*+|\*+\/$/g, '').split('\n').map((l) => l.replace(/^\s*\*\s?/, '').trim()).filter(Boolean).join(' ');
    comments.push({ pos: scanner.getTokenStart(), text: body });
  }
}

/** Index of the element whose "extended" range (from the previous element's end) holds `pos`. */
function owner(elements, startPos, pos) {
  let prevEnd = startPos;
  for (let i = 0; i < elements.length; i++) {
    if (pos >= prevEnd && pos < elements[i].getEnd()) return i;
    prevEnd = elements[i].getEnd();
  }
  return -1;
}
const scenesArrayOf = (lessonNode) => {
  const prop = lessonNode.properties.find((p) => p.name?.getText() === 'scenes');
  return prop && ts.isArrayLiteralExpression(prop.initializer) ? prop.initializer : null;
};

const lessonNotes = CISA_LESSONS.map(() => []);
const sceneNotes = CISA_LESSONS.map((l) => l.scenes.map(() => []));
let dropped = 0;
for (const c of comments) {
  // Domain dividers ("── Domain 1 ──") add nothing: lessons carry their domainId.
  if (/─{3,}/.test(c.text) || !c.text) continue;
  const li = owner(lessonsArray.elements, lessonsArray.getStart(), c.pos);
  if (li < 0) {
    dropped += 1; // the file header and the review-date constants (moved to the schema doc)
    continue;
  }
  const scenes = scenesArrayOf(lessonsArray.elements[li]);
  const si = scenes && c.pos > scenes.getStart() && c.pos < scenes.getEnd() ? owner(scenes.elements, scenes.getStart(), c.pos) : -1;
  if (si >= 0) sceneNotes[li][si].push(c.text);
  else lessonNotes[li].push(c.text);
}

// `_comment` first, so an author sees the history before the fields it explains.
const withComment = (obj, notes) => (notes.length ? { _comment: notes.join(' '), ...obj } : obj);
const lessons = CISA_LESSONS.map((l, i) => withComment({ ...l, scenes: l.scenes.map((s, j) => withComment(s, sceneNotes[i][j])) }, lessonNotes[i]));

const out = {
  schema_version: 1,
  certification: 'cisa',
  description:
    'CISA motion lessons: original KaiSip writing. Schema and house rules: docs/content/LESSONS_SCHEMA.md. ' +
    'Fields starting with "_" are author notes; the app never sees them.',
  lessons,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
const kept = lessonNotes.flat().length + sceneNotes.flat(2).length;
console.log(`✓ ${lessons.length} lessons → ${path.relative(process.cwd(), OUT)} (${kept} review comments kept as _comment, ${dropped} header comments moved to the schema doc)`);
