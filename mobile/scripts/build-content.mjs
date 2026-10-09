#!/usr/bin/env node
/**
 * build-content.mjs — turns the web app's question bank into the mobile
 * app's "content pack".
 *
 * WHAT IT DOES (plain English):
 *   1. Reads ../data/domain{1..5}.json (the same files the web app uses).
 *   2. Renames fields into the mobile app's cleaner, cert-neutral shape.
 *   3. Drops author-only fields the learner never sees (e.g. _provenance),
 *      which keeps the app download smaller.
 *   4. Marks REAL option-letter references in tips/explanations with a
 *      token like {{B}} so the app can swap them to the shuffled letter —
 *      without breaking ordinary words like "A high-risk system".
 *   5. Writes src/content/generated/<cert>/d<N>.json plus an index.ts.
 *   6. Builds the study-notes pack (<cert>/notes.json) from
 *      ../data/cisa_notes.json via notes-pack.cjs. Only schema v2 is used;
 *      a v1 file gives an empty pack, so Study notes stays hidden.
 *      Each subtopic's `practice_ids` is checked against the questions
 *      written in step 5: an unknown or other-domain id fails the build.
 *
 * WHEN IT RUNS: automatically after `npm install` (postinstall), and any
 * time you run `npm run content`. The output folder is gitignored because
 * it is generated — the source of truth stays in ../data/.
 *
 * No third-party packages: only Node's built-in fs/path modules.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The notes reshaping lives in a CommonJS file so Jest can test it too.
const require = createRequire(import.meta.url);
const { buildNotesPack } = require('./notes-pack.cjs');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE_ROOT = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(MOBILE_ROOT, '..');
const OUT_ROOT = path.join(MOBILE_ROOT, 'src', 'content', 'generated');

// One entry per certification that has content today. Adding CISM later =
// add a line here pointing at its data files (and a descriptor in
// src/content/certifications.ts).
const PACKS = [
  {
    certId: 'cisa',
    domains: ['1', '2', '3', '4', '5'],
    source: (d) => path.join(REPO_ROOT, 'data', `domain${d}.json`),
    // Topic study notes (schema v2 only; see docs/content/NOTES_SCHEMA_V2.md).
    // NOTES_SRC=/path/to/draft.json previews draft notes locally (never in CI).
    notes: process.env.NOTES_SRC || path.join(REPO_ROOT, 'data', 'cisa_notes.json'),
  },
];

// ── Option-letter tokenizer ────────────────────────────────────────────
// Words that LABEL something rather than point at an answer option:
// "Annex A", "Architecture B", "Plan B". A letter after these stays as-is.
const LABEL_WORDS = new Set([
  'annex', 'appendix', 'architecture', 'approach', 'state', 'class', 'series',
  'plan', 'type', 'tier', 'schedule', 'phase', 'exhibit', 'category', 'level',
  'part', 'section', 'grade', 'vitamin', 'site', 'building', 'zone', 'team',
  'version', 'model', 'form', 'regulated', 'privacy', 'scenario', 'vendor',
  'system', 'company', 'region', 'unit', 'group', 'division', 'step',
]);

// Words that, right before a letter, mean "an answer option".
const CHOICE_WORDS = new Set([
  'to', 'pick', 'picks', 'picked', 'choose', 'chooses', 'chose', 'than',
  'over', 'vs', 'versus', 'unlike', 'option', 'options', 'answer', 'beats', 'beat',
]);

// When "A" is followed by one of these words it is an option reference
// ("A is tempting", "A confuses..."), not the English article ("A sample").
const VERBISH_AFTER_A = new Set([
  'is', 'was', 'would', 'could', 'might', 'may', 'can', 'will', 'does', 'did',
  'only', 'also', 'still', 'correctly', 'incorrectly', 'sounds', 'looks',
  'seems', 'confuses', 'describes', 'reflects', 'relies', 'uses', 'treats',
  'applies', 'reduces', 'limits', 'endorses', 'waits', 'stacks', 'addresses',
  'assumes', 'fails', 'misses', 'jumps', 'focuses', 'skips', 'ignores',
  'conflates', 'mistakes', 'offers', 'proposes', 'suggests', 'tests',
  'answers', 'targets', 'substitutes', 'delegates', 'accepts', 'rejects',
  'recommends', 'requires', 'moves', 'puts', 'places', 'gives', 'takes',
  'makes', 'has', 'and', 'or', 'are', 'were', 'invites', 'tempts', 'never',
]);

/**
 * Replace option-letter references (A–D) with {{X}} tokens.
 * `selfLetter` (optional): the option a wrong-answer explanation belongs to.
 * Exported for tests (see src/__tests__/tokenize.test.ts).
 */
export function tokenizeLetters(text, selfLetter) {
  if (!text) return text;
  // The regex skips "C-level", "A.8.12", "C&A", and quoted 'A' but allows "B's".
  const LETTER_RE = /\b([A-D])\b(?![-&.]\w|['’](?!s\b))/g;

  // Decide whether the letter at `offset` is an option reference.
  function isOptionRef(letter, offset) {
    const before = text.slice(0, offset);
    const after = text.slice(offset + 1);

    // Second half of an abbreviation: "C&A", "M&A", "D&O".
    if (/&$/.test(before)) return false;
    // Lists like "Class A/B/C": follow whatever the letter before the slash was.
    const slash = before.match(/\b([A-D])\/$/);
    if (slash) return isOptionRef(slash[1], offset - 2);

    // The word right before the letter, separated by whitespace only
    // ("Annex A" yes; "plan; C" no — the semicolon breaks the link).
    const prevWordMatch = before.match(/([A-Za-z]+)\s+$/);
    const prevWord = prevWordMatch ? prevWordMatch[1] : '';
    const spaced = prevWord !== '';

    // "pick A", "than A", "option A" → always an option reference.
    if (prevWord && CHOICE_WORDS.has(prevWord.toLowerCase())) return true;
    // Exam-style v2 tips open "Eliminate: A …" — that A is always an option.
    if (/^Eliminate:\s*$/.test(before)) return true;
    // "Annex A", "Architecture B" → a label, not an option.
    if (prevWord && spaced && LABEL_WORDS.has(prevWord.toLowerCase())) return false;
    // ALL-CAPS emphasis like "IS A", "THAN A" → English. ("B, C, OR D" is a list.)
    if (prevWord.length > 1 && spaced && prevWord === prevWord.toUpperCase()
        && prevWord !== 'OR' && prevWord !== 'AND') {
      return false;
    }
    if (letter === 'A') {
      let nextWord = (after.match(/^\s+([A-Za-z]+)/) || [])[1];
      // "A quietly suppresses…" in its own explanation: look past one -ly adverb.
      if (offset === 0 && selfLetter === 'A' && nextWord && /ly$/.test(nextWord)) {
        nextWord = (after.match(/^\s+[A-Za-z]+\s+([A-Za-z]+)/) || [])[1] ?? nextWord;
      }
      // "A" followed by a lowercase word: article unless that word is verb-ish.
      if (nextWord && /^[a-z]/.test(nextWord) && !VERBISH_AFTER_A.has(nextWord)) {
        // "A buys speed; B builds..." — when the text also names other
        // options, a third-person verb ("buys", not "process") marks a reference.
        const namesOtherOptions = /\b[B-D]\b/.test(text);
        const thirdPersonVerb = /[^su]s$/.test(nextWord) && !/(ss|us|is|ics)$/.test(nextWord);
        // An option's own explanation opening "A overstates…" names itself.
        const opensOwnExplanation = offset === 0 && selfLetter === 'A';
        if (!((namesOtherOptions || opensOwnExplanation) && thirdPersonVerb)) return false;
      }
      // "A 15-minute RPO" → article.
      if (/^\s+\d/.test(after)) return false;
    }
    return true;
  }

  return text.replace(LETTER_RE, (match, letter, offset) =>
    isOptionRef(letter, offset) ? `{{${letter}}}` : match);
}

function toPackQuestion(q, certId) {
  const tok = tokenizeLetters;
  const wrong = {};
  for (const [letter, text] of Object.entries(q.wrong_explanations || {})) {
    wrong[letter] = tok(text, letter); // `letter`: this explanation's own option
  }
  return {
    id: q.id,
    certId,
    domainId: String(q.domain),
    subtopic: q.subtopic || 'General',
    difficulty: q.difficulty || 'application',
    stem: q.question,
    scenario: q.scenario_context || undefined,
    options: q.options,
    correct: q.correct,
    keyConcept: q.key_concept || undefined,
    preRead: q.pre_read || undefined,
    explanation: tok(q.correct_explanation || ''),
    wrongExplanations: wrong,
    tips: (q.tips || []).map(tok),
    reference: q.framework_ref || undefined,
    related: q.related_concepts || [],
  };
}

function validate(q) {
  const problems = [];
  const letters = Object.keys(q.options || {});
  if (letters.length < 2) problems.push('fewer than 2 options');
  if (!letters.includes(q.correct)) problems.push(`correct "${q.correct}" not in options`);
  if (!q.stem) problems.push('empty stem');
  if (!q.tips || q.tips.length < 3) problems.push('fewer than 3 tips');
  return problems;
}

/**
 * Write <cert>/notes.json. A missing or v1 notes file gives an EMPTY pack
 * (the Study notes entry hides itself), never a failed build.
 * `questions` = this cert's questions (to check the "Practice this concept" ids).
 * Returns the index.ts line for this cert's notes loader.
 */
function buildNotes(pack, certDir, questions) {
  let raw = null;
  if (pack.notes && fs.existsSync(pack.notes)) {
    try {
      raw = JSON.parse(fs.readFileSync(pack.notes, 'utf8'));
    } catch (e) {
      console.error(`✗ ${pack.notes} is not valid JSON: ${e.message}`);
      process.exitCode = 1;
    }
  }
  const { pack: notes, problems, warnings, skipped } = buildNotesPack(raw, pack.certId, { questions });
  for (const w of warnings) console.warn(`! notes ${w}`);
  for (const p of problems) console.error(`✗ notes ${p}`);
  if (problems.length) process.exitCode = 1;
  fs.writeFileSync(path.join(certDir, 'notes.json'), JSON.stringify(notes));
  const subs = notes.domains.reduce((n, d) => n + d.topics.reduce((m, t) => m + t.subtopics.length, 0), 0);
  console.log(skipped
    ? `• ${pack.certId} notes: ${skipped} source, wrote an empty notes pack (Study notes stays hidden)`
    : `✓ ${pack.certId} notes: ${subs} subtopics → notes.json`);
  return `  ${pack.certId}: () => require('./${pack.certId}/notes.json') as NotesPack,`;
}

function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const notesLines = [];
  const indexLines = [
    '// AUTO-GENERATED by scripts/build-content.mjs — do not edit by hand.',
    "import type { NotesPack } from '../notes/types';",
    "import type { PackQuestion } from '../types';",
    '',
    'type Loader = () => PackQuestion[];',
    '',
    '// Each require() is lazy: a domain is only parsed the first time it is used.',
    'export const generatedPacks: Record<string, Record<string, Loader>> = {',
  ];
  let total = 0;
  let errors = 0;

  for (const pack of PACKS) {
    const certDir = path.join(OUT_ROOT, pack.certId);
    fs.mkdirSync(certDir, { recursive: true });
    indexLines.push(`  ${pack.certId}: {`);
    const certQuestions = []; // every question written, for the notes' practice ids
    for (const d of pack.domains) {
      const src = pack.source(d);
      if (!fs.existsSync(src)) {
        console.error(`✗ missing source file: ${src}`);
        process.exitCode = 1;
        continue;
      }
      const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
      const questions = raw.questions.map((q) => toPackQuestion(q, pack.certId));
      for (const q of questions) {
        const problems = validate(q);
        if (problems.length) {
          errors += 1;
          console.error(`✗ ${q.id}: ${problems.join('; ')}`);
        }
      }
      fs.writeFileSync(path.join(certDir, `d${d}.json`), JSON.stringify(questions));
      certQuestions.push(...questions);
      indexLines.push(`    '${d}': () => require('./${pack.certId}/d${d}.json') as PackQuestion[],`);
      total += questions.length;
    }
    indexLines.push('  },');
    notesLines.push(buildNotes(pack, certDir, certQuestions));
  }
  indexLines.push('};', '');
  // Study notes: one lazily parsed pack per certification.
  indexLines.push('export const generatedNotes: Record<string, () => NotesPack> = {', ...notesLines, '};', '');
  fs.writeFileSync(path.join(OUT_ROOT, 'index.ts'), indexLines.join('\n'));

  if (errors) {
    console.error(`✗ content pack built with ${errors} invalid question(s)`);
    process.exitCode = 1;
  } else {
    console.log(`✓ content pack built: ${total} questions → src/content/generated/`);
  }
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
