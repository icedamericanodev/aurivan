#!/usr/bin/env node
/**
 * build-content.mjs — turns the web app's question bank into the mobile
 * app's "content pack".
 *
 * WHAT IT DOES (plain English):
 *   1. Reads ../data/domain{1..5}.json (the same files the web app uses).
 *   2. Renames fields into the mobile app's cleaner, cert-neutral shape
 *      (an explicit list: a new source field is dropped until added here,
 *      e.g. principle_id → principleId).
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
 *   7. Builds the exam-mindset principles pack (<cert>/principles.json) from
 *      ../data/mindset/principles.json via principles-pack.cjs (schema:
 *      docs/content/PRINCIPLES_SCHEMA.md). Its practice ids are checked the
 *      same way. A missing file gives an empty pack (Learn hides the row).
 *      Each question's optional principleId must name a principle in this
 *      pack, or the build fails.
 *   8. Builds the exam pack (<cert>/exam.json) from ../data/exam/
 *      cisa_exam_guide.json and final_review_week.json via exam-guide-pack.cjs
 *      (schema: docs/content/EXAM_GUIDE_SCHEMA.md). Every note code and
 *      principle id they link is checked against the packs built in steps 6
 *      and 7. A missing file gives a null half (its rows hide).
 *   9. Builds the lessons pack (<cert>/lessons.json) from ../data/lessons/
 *      <cert>.json via lessons-pack.cjs (schema: docs/content/LESSONS_SCHEMA.md).
 *      Author notes (`_comment`) are dropped; every `prepares` id and `notes`
 *      id is checked against the packs built above.
 *  10. Copies the reviewed game decks (src/content/games/<cert>/*.json) into
 *      <cert>/, byte for byte, so one folder holds the whole pack.
 *  11. Writes <cert>/pack.json: the pack's `rev` and `schemaVersion`. The
 *      rev is the build commit's time in seconds (always increasing), so a
 *      downloaded pack (content packs, Phase C) replaces the bundled one only
 *      when its rev is newer: the bundle is the floor.
 *
 * WHEN IT RUNS: automatically after `npm install` (postinstall), and any
 * time you run `npm run content`. The output folder is gitignored because
 * it is generated — the source of truth stays in ../data/.
 *
 * No third-party packages: only Node's built-in fs/path modules.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The notes reshaping lives in a CommonJS file so Jest can test it too.
const require = createRequire(import.meta.url);
const { buildNotesPack } = require('./notes-pack.cjs');
const { buildPrinciplesPack } = require('./principles-pack.cjs');
const { buildExamPack } = require('./exam-guide-pack.cjs');
const { buildLessonsPack } = require('./lessons-pack.cjs');

/**
 * The pack format's version (docs/mobile/ARCHITECTURE.md "Content packs").
 * Bump it only when a pack file changes shape in a way an older app can't
 * read; the app ignores a pack with a newer schemaVersion than it knows.
 */
const PACK_SCHEMA_VERSION = 1;

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
    // Exam-mindset principles (schema v2; docs/content/PRINCIPLES_SCHEMA.md).
    // Another cert adds its own file here. PRINCIPLES_SRC previews a draft locally.
    principles: process.env.PRINCIPLES_SRC || path.join(REPO_ROOT, 'data', 'mindset', 'principles.json'),
    // "About the exam" and "Final review week" (docs/content/EXAM_GUIDE_SCHEMA.md).
    // Another cert adds its own two files here; a missing file hides its rows.
    // EXAM_GUIDE_SRC / FINAL_WEEK_SRC preview drafts locally (never in CI).
    examGuide: process.env.EXAM_GUIDE_SRC || path.join(REPO_ROOT, 'data', 'exam', 'cisa_exam_guide.json'),
    finalWeek: process.env.FINAL_WEEK_SRC || path.join(REPO_ROOT, 'data', 'exam', 'final_review_week.json'),
    // Motion lessons (docs/content/LESSONS_SCHEMA.md). LESSONS_SRC previews a draft locally.
    lessons: process.env.LESSONS_SRC || path.join(REPO_ROOT, 'data', 'lessons', 'cisa.json'),
    // The reviewed game decks, copied byte for byte (src/content/games/index.ts explains each).
    games: path.join(MOBILE_ROOT, 'src', 'content', 'games', 'cisa'),
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
      // "A SOC 2 report", "A KPI should" → article before a capitalised word.
      // (Real references before capitals were already caught above.)
      if (nextWord && /^[A-Z]/.test(nextWord)) return false;
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
    // Optional link to one principle (docs/content/PRINCIPLE_TAGGING.md);
    // checked against the principles pack in main(). Omitted when untagged.
    principleId: q.principle_id || undefined,
    // Content packs: a retired question stays in the pack (old progress still
    // resolves) but is never dealt again. Omitted when live (today: every one).
    retired: q.retired === true ? true : undefined,
  };
}

/**
 * Every question's principleId must name a principle in this cert's pack
 * (its own id, not a legacy id or alias). Returns problem strings.
 * With an empty pack (no principles file) the tags cannot be checked: warn.
 */
function checkPrincipleIds(certId, questions, principlesPack) {
  const tagged = questions.filter((q) => q.principleId);
  if (!tagged.length) return [];
  const ids = new Set((principlesPack.principles || []).map((p) => p.id));
  if (!ids.size) {
    console.warn(`! ${certId}: ${tagged.length} question(s) carry principleId but the principles pack is empty`);
    return [];
  }
  return tagged
    .filter((q) => !ids.has(q.principleId))
    .map((q) => `${q.id}: principleId "${q.principleId}" is not a principle in the ${certId} pack`);
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
 * Returns the index.ts line for this cert's notes loader, and the pack.
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
  return { line: `  ${pack.certId}: () => require('./${pack.certId}/notes.json') as NotesPack,`, pack: notes };
}

/**
 * Write <cert>/principles.json. A missing file or another schema version
 * gives an EMPTY pack (the Learn → Principles row hides), never a failed
 * build; a practice id that is not in this cert's bank DOES fail it.
 * Returns the index.ts line for this cert's principles loader, and the pack.
 */
function buildPrinciples(pack, certDir, questions) {
  let raw = null;
  if (pack.principles && fs.existsSync(pack.principles)) {
    try {
      raw = JSON.parse(fs.readFileSync(pack.principles, 'utf8'));
    } catch (e) {
      console.error(`✗ ${pack.principles} is not valid JSON: ${e.message}`);
      process.exitCode = 1;
    }
  }
  const { pack: out, problems, warnings, skipped } = buildPrinciplesPack(raw, pack.certId, { questions });
  for (const w of warnings) console.warn(`! principles ${w}`);
  for (const p of problems) console.error(`✗ principles ${p}`);
  if (problems.length) process.exitCode = 1;
  fs.writeFileSync(path.join(certDir, 'principles.json'), JSON.stringify(out));
  console.log(skipped
    ? `• ${pack.certId} principles: ${skipped} source, wrote an empty principles pack (the Learn row stays hidden)`
    : `✓ ${pack.certId} principles: ${out.principles.length} principles in ${out.families.length} families → principles.json`);
  return { line: `  ${pack.certId}: () => require('./${pack.certId}/principles.json') as PrinciplesPack,`, pack: out };
}

/** Read one optional JSON source: null when there is none (a broken file fails the build). */
function readOptional(file) {
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`✗ ${file} is not valid JSON: ${e.message}`);
    process.exitCode = 1;
    return null;
  }
}

/**
 * Write <cert>/exam.json: the exam guide and the final review week. A
 * missing file gives a null half (its Learn, Help and Today rows hide),
 * never a failed build; a link to a note or principle that doesn't exist,
 * an unknown action kind or "stem" in learner text DOES fail it.
 * Returns the index.ts line for this cert's exam loader.
 */
function buildExam(pack, certDir, notes, principles) {
  const { pack: out, problems, warnings, skipped } = buildExamPack(readOptional(pack.examGuide), readOptional(pack.finalWeek), pack.certId, {
    notes,
    principles,
    // Domain ids only: the weights live in src/content/certifications.ts alone (checked by Jest).
    domains: pack.domains.map((id) => ({ id })),
  });
  for (const w of warnings) console.warn(`! exam ${w}`);
  for (const p of problems) console.error(`✗ exam ${p}`);
  if (problems.length) process.exitCode = 1;
  fs.writeFileSync(path.join(certDir, 'exam.json'), JSON.stringify(out));
  console.log(skipped
    ? `• ${pack.certId} exam: no source, wrote an empty exam pack (the guide and final week rows stay hidden)`
    : `✓ ${pack.certId} exam: guide ${out.guide ? `${out.guide.sections.length} sections` : 'none'}, final week ${out.week ? `${out.week.days.length} days` : 'none'} → exam.json`);
  return `  ${pack.certId}: () => require('./${pack.certId}/exam.json') as ExamPack,`;
}

/**
 * Write <cert>/lessons.json. A missing file gives an EMPTY pack (no lessons),
 * never a failed build; a broken lesson, or a link to a question or note that
 * doesn't exist, DOES fail it. Returns the index.ts line for this cert.
 */
function buildLessons(pack, certDir, questions, notes) {
  const noteIds = new Set(notes.domains.flatMap((d) => d.topics.flatMap((t) => t.subtopics.map((s) => s.id))));
  const { pack: out, problems, warnings, skipped } = buildLessonsPack(readOptional(pack.lessons), pack.certId, {
    domains: pack.domains,
    questions,
    noteIds,
  });
  for (const w of warnings) console.warn(`! lessons ${w}`);
  for (const p of problems) console.error(`✗ lessons ${p}`);
  if (problems.length) process.exitCode = 1;
  fs.writeFileSync(path.join(certDir, 'lessons.json'), JSON.stringify(out));
  console.log(skipped
    ? `• ${pack.certId} lessons: ${skipped} source, wrote an empty lessons pack`
    : `✓ ${pack.certId} lessons: ${out.length} lessons → lessons.json`);
  return `  ${pack.certId}: () => require('./${pack.certId}/lessons.json') as Lesson[],`;
}

/** The three game decks each cert may have (src/content/games/index.ts). */
const GAME_DECKS = ['roles', 'sequences', 'flows'];

/**
 * Copy the reviewed game decks into <cert>/, byte for byte (two experts
 * reviewed each file, so it is never reshaped here). A cert without decks
 * gets no line, and its games simply don't offer those rounds.
 * Returns the index.ts line for this cert, or null.
 */
function copyGames(pack, certDir) {
  const decks = GAME_DECKS.filter((d) => pack.games && fs.existsSync(path.join(pack.games, `${d}.json`)));
  for (const d of decks) {
    const src = path.join(pack.games, `${d}.json`);
    try {
      JSON.parse(fs.readFileSync(src, 'utf8'));
    } catch (e) {
      console.error(`✗ ${src} is not valid JSON: ${e.message}`);
      process.exitCode = 1;
    }
    fs.copyFileSync(src, path.join(certDir, `${d}.json`));
  }
  if (!decks.length) return null;
  console.log(`✓ ${pack.certId} games: ${decks.join(', ')} → copied`);
  const loaders = decks.map((d) => `${d}: () => require('./${pack.certId}/${d}.json') as unknown`).join(', ');
  return `  ${pack.certId}: { ${loaders} },`;
}

/**
 * The pack's rev: the build commit's time in seconds (always increasing, so
 * a rollback is a revert commit with a newer rev). CONTENT_REV overrides it;
 * with no git (a source archive) it is 0, so any downloaded pack is newer.
 */
function packRev() {
  if (process.env.CONTENT_REV && /^\d+$/.test(process.env.CONTENT_REV)) return Number(process.env.CONTENT_REV);
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%ct', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (/^\d+$/.test(out)) return Number(out);
  } catch {
    // No git here: fall through.
  }
  console.warn('! no git commit time for the pack rev: using 0 (set CONTENT_REV to choose one)');
  return 0;
}

function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const notesLines = [];
  const principlesLines = [];
  const examLines = [];
  const lessonsLines = [];
  const gamesLines = [];
  const infoLines = [];
  const rev = packRev();
  const indexLines = [
    '// AUTO-GENERATED by scripts/build-content.mjs — do not edit by hand.',
    "import type { ExamPack } from '../exam/types';",
    "import type { Lesson } from '../lessons/types';",
    "import type { NotesPack } from '../notes/types';",
    "import type { PrinciplesPack } from '../principles/types';",
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
    const notes = buildNotes(pack, certDir, certQuestions);
    const principles = buildPrinciples(pack, certDir, certQuestions);
    for (const p of checkPrincipleIds(pack.certId, certQuestions, principles.pack)) {
      errors += 1;
      console.error(`✗ ${p}`);
    }
    notesLines.push(notes.line);
    principlesLines.push(principles.line);
    examLines.push(buildExam(pack, certDir, notes.pack, principles.pack));
    lessonsLines.push(buildLessons(pack, certDir, certQuestions, notes.pack));
    const games = copyGames(pack, certDir);
    if (games) gamesLines.push(games);
    // The bundled pack's version: a downloaded pack replaces it only with a newer rev.
    const info = { certId: pack.certId, rev, schemaVersion: PACK_SCHEMA_VERSION };
    fs.writeFileSync(path.join(certDir, 'pack.json'), JSON.stringify(info));
    infoLines.push(`  ${pack.certId}: ${JSON.stringify(info)},`);
  }
  indexLines.push('};', '');
  // Study notes: one lazily parsed pack per certification.
  indexLines.push('export const generatedNotes: Record<string, () => NotesPack> = {', ...notesLines, '};', '');
  // Exam-mindset principles: one lazily parsed pack per certification.
  indexLines.push('export const generatedPrinciples: Record<string, () => PrinciplesPack> = {', ...principlesLines, '};', '');
  // The exam guide and final review week: one lazily parsed pack per certification.
  indexLines.push('export const generatedExam: Record<string, () => ExamPack> = {', ...examLines, '};', '');
  // Motion lessons: one lazily parsed pack per certification.
  indexLines.push('export const generatedLessons: Record<string, () => Lesson[]> = {', ...lessonsLines, '};', '');
  // The reviewed game decks, as copied (content/games/index.ts reshapes them).
  indexLines.push('export const generatedGames: Record<string, Partial<Record<string, () => unknown>>> = {', ...gamesLines, '};', '');
  // Each bundled pack's rev and schemaVersion (small, so not lazy).
  indexLines.push('export const generatedInfo: Record<string, { certId: string; rev: number; schemaVersion: number }> = {', ...infoLines, '};', '');
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
