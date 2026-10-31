#!/usr/bin/env node
/**
 * aaia_pack_dry_run.cjs — proves the AAIA course will load in the phone app,
 * without wiring it in.
 *
 * It runs the app's own pack builders (mobile/scripts/notes-pack.cjs,
 * principles-pack.cjs, exam-guide-pack.cjs) on the AAIA files, converts the
 * AAIA questions exactly as mobile/scripts/build-content.mjs does (its own
 * toPackQuestion, validate and checkPrincipleIds, read from that file so the
 * field mapping can never drift), and writes the results ONLY to a temp
 * folder (os.tmpdir()/aaia-pack-dry-run, or AAIA_PACK_OUT). It never writes
 * into mobile/src/content/generated/.
 *
 * Checks (one summary line each; exit 1 on any problem):
 *   questions   every AAIA question converts and passes the app's validate()
 *   notes       the notes builder reports 0 problems
 *   principles  the principles builder reports 0 problems (skipped until
 *               data/aaia/principles.json is written)
 *   tags        every principle_id on an AAIA question is a principle in that pack
 *   exam        the exam-guide builder reports 0 problems on the exam guide and
 *               the final review week (each skipped until written), with the
 *               AAIA domain ids and weights from certifications.ts
 *   full mock   the real exam length (90) split by weight (30/41/19) can be
 *               drawn from live questions without repeats
 *   short mock  the app's mini mock (a third: 30, split 10/14/6) likewise
 *
 * Usage (plain node, no npm install):  node scripts/aaia_pack_dry_run.cjs
 * Preview drafts (like build-content.mjs's *_SRC): AAIA_PRINCIPLES_SRC,
 * AAIA_EXAM_GUIDE_SRC, AAIA_FINAL_WEEK_SRC point at a draft file instead.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const MOBILE_SCRIPTS = path.join(ROOT, 'mobile', 'scripts');
const AAIA = path.join(ROOT, 'data', 'aaia');
const CERTS_TS = path.join(ROOT, 'mobile', 'src', 'content', 'certifications.ts');
const GENERATED = path.join(ROOT, 'mobile', 'src', 'content', 'generated');
const CERT_ID = 'aaia';

const OUT = path.resolve(process.env.AAIA_PACK_OUT || path.join(os.tmpdir(), 'aaia-pack-dry-run'));

const rel = (p) => path.relative(ROOT, p) || p;
let failed = false;
const lines = [];
function report(ok, name, detail, problems = []) {
  if (!ok) failed = true;
  lines.push(`  ${ok ? '✓' : '✗'} ${name}: ${detail}`);
  for (const p of problems.slice(0, 25)) lines.push(`      ✗ ${p}`);
  if (problems.length > 25) lines.push(`      … and ${problems.length - 25} more`);
}
function skip(name, detail) {
  lines.push(`  • ${name}: skipped: ${detail}`);
}

/** Read a JSON file, or null when it does not exist. A broken file is a problem. */
function readJson(file, name) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    report(false, name, `${rel(file)} is not valid JSON (${e.message})`);
    return undefined;
  }
}

/** The AAIA block of certifications.ts: domain ids and weights, exam length. */
function aaiaFacts() {
  const src = fs.readFileSync(CERTS_TS, 'utf8');
  const m = src.match(/id:\s*'aaia'([\s\S]*?)(?=\n\s*\{\s*\n\s*id:\s*'|$)/);
  if (!m) throw new Error(`no AAIA block in ${rel(CERTS_TS)}`);
  const domains = [...m[1].matchAll(/\{\s*id:\s*'(\d)'[^}]*?\bweight:\s*(\d+)/g)].map((d) => ({ id: d[1], weight: Number(d[2]) }));
  const q = m[1].match(/\bquestions:\s*(\d+)/);
  if (!domains.length || !q) throw new Error(`AAIA domains or exam length not found in ${rel(CERTS_TS)}`);
  return { domains, examQuestions: Number(q[1]) };
}

/**
 * build-content.mjs's own functions. toPackQuestion, validate and
 * checkPrincipleIds are not exported, so their source is read from the file
 * and evaluated with the exported tokenizeLetters in scope: the mapping is
 * the app's, byte for byte.
 */
async function appFunctions() {
  const file = path.join(MOBILE_SCRIPTS, 'build-content.mjs');
  const mod = await import(pathToFileURL(file).href);
  const src = fs.readFileSync(file, 'utf8');
  const grab = (name) => {
    const m = src.match(new RegExp(`\\nfunction ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}\\n`));
    if (!m) throw new Error(`function ${name} not found in ${rel(file)}`);
    return m[0];
  };
  const body = [grab('toPackQuestion'), grab('validate'), grab('checkPrincipleIds')].join('\n');
  // eslint-disable-next-line no-new-func
  return new Function('tokenizeLetters', `${body}\nreturn { toPackQuestion, validate, checkPrincipleIds };`)(mod.tokenizeLetters);
}

/** Largest-remainder split, as mobile/src/engine/blueprint.ts allocate(). */
function allocate(total, weights) {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / sum) * total);
  const floors = exact.map(Math.floor);
  let remaining = total - floors.reduce((s, n) => s + n, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] += 1;
    remaining -= 1;
  }
  return floors;
}

/** Draw `total` questions split by domain weight; report whether it works without repeats. */
function drawMock(name, total, facts, questions) {
  const targets = allocate(total, facts.domains.map((d) => d.weight));
  const problems = [];
  const picked = [];
  facts.domains.forEach((d, i) => {
    const live = [...new Set(questions.filter((q) => q.domainId === d.id && !q.retired).map((q) => q.id))];
    if (live.length < targets[i]) problems.push(`Domain ${d.id} needs ${targets[i]} questions, the bank has ${live.length} live`);
    // A seeded shuffle is not needed: any draw of `target` distinct ids proves it.
    picked.push(...live.slice(0, targets[i]));
  });
  const unique = new Set(picked).size;
  if (!problems.length && unique !== total) problems.push(`drew ${unique} distinct of ${total}`);
  const split = facts.domains.map((d, i) => `D${d.id} ${targets[i]}`).join(' / ');
  report(problems.length === 0, name, `${total} items (${split}) ${problems.length ? 'cannot be drawn' : 'drawn without repeats'}`, problems);
}

async function main() {
  if (OUT === GENERATED || OUT.startsWith(GENERATED + path.sep)) {
    console.error(`✗ refusing to write into ${rel(GENERATED)}; choose another AAIA_PACK_OUT`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const { buildNotesPack } = require(path.join(MOBILE_SCRIPTS, 'notes-pack.cjs'));
  const { buildPrinciplesPack } = require(path.join(MOBILE_SCRIPTS, 'principles-pack.cjs'));
  const { buildExamPack } = require(path.join(MOBILE_SCRIPTS, 'exam-guide-pack.cjs'));
  const app = await appFunctions();
  const facts = aaiaFacts();

  // ── Questions (build-content.mjs main(): convert, validate, write d<N>.json) ──
  const questions = [];
  const qProblems = [];
  const perDomain = [];
  for (const d of facts.domains) {
    const file = path.join(AAIA, 'originals', `d${d.id}.json`);
    const raw = readJson(file, 'questions');
    if (raw == null) {
      if (raw === null) qProblems.push(`missing ${rel(file)}`);
      continue;
    }
    const converted = (raw.questions || []).map((q) => app.toPackQuestion(q, CERT_ID));
    for (const q of converted) {
      const p = app.validate(q);
      if (p.length) qProblems.push(`${q.id}: ${p.join('; ')}`);
      if (q.domainId !== d.id) qProblems.push(`${q.id}: domain ${q.domainId}, file is d${d.id}`);
    }
    fs.writeFileSync(path.join(OUT, `d${d.id}.json`), JSON.stringify(converted));
    questions.push(...converted);
    perDomain.push(`D${d.id} ${converted.length}`);
  }
  const ids = questions.map((q) => q.id);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  for (const id of dupes) qProblems.push(`${id}: id appears more than once`);
  report(qProblems.length === 0, 'questions', `${questions.length} converted (${perDomain.join(', ')}), ${qProblems.length} problem(s)`, qProblems);

  // ── Notes: the three per-domain files as one schema v2 notes file ──
  const domainsRaw = [];
  for (const d of facts.domains) {
    const doc = readJson(path.join(AAIA, 'notes', `d${d.id}.json`), 'notes');
    if (doc) domainsRaw.push(doc);
  }
  let notes = null;
  if (!domainsRaw.length) {
    skip('notes', 'data/aaia/notes/d1-3.json not written yet');
  } else {
    const r = buildNotesPack({ schema_version: 2, domains: domainsRaw }, CERT_ID, { questions });
    notes = r.pack;
    fs.writeFileSync(path.join(OUT, 'notes.json'), JSON.stringify(notes));
    const subs = notes.domains.reduce((n, d) => n + d.topics.reduce((m, t) => m + t.subtopics.length, 0), 0);
    report(!r.problems.length && !r.skipped, 'notes',
      `${notes.domains.length} domains, ${subs} subtopics, ${r.problems.length} problem(s), ${r.warnings.length} warning(s)`,
      [...r.problems, ...(r.skipped ? [`builder skipped the file (${r.skipped})`] : [])]);
    for (const w of r.warnings) lines.push(`      ! ${w}`);
  }

  // ── Principles ──
  const principlesFile = path.resolve(process.env.AAIA_PRINCIPLES_SRC || path.join(AAIA, 'principles.json'));
  const rawPrinciples = readJson(principlesFile, 'principles');
  let principles = null;
  if (rawPrinciples === null) {
    skip('principles', `${rel(principlesFile)} not written yet`);
  } else if (rawPrinciples !== undefined) {
    const r = buildPrinciplesPack(rawPrinciples, CERT_ID, { questions });
    principles = r.pack;
    fs.writeFileSync(path.join(OUT, 'principles.json'), JSON.stringify(principles));
    report(!r.problems.length && !r.skipped, 'principles',
      `${principles.principles.length} principles in ${principles.families.length} families, ${r.problems.length} problem(s), ${r.warnings.length} warning(s)`,
      [...r.problems, ...(r.skipped ? [`builder skipped the file (${r.skipped})`] : [])]);
    for (const w of r.warnings) lines.push(`      ! ${w}`);
  }

  // ── principle_id tags against the principles pack ──
  const tagged = questions.filter((q) => q.principleId);
  if (!tagged.length) {
    skip('principle tags', 'no AAIA question carries a principle_id yet');
  } else if (!principles) {
    report(false, 'principle tags', `${tagged.length} question(s) carry principle_id but there is no principles pack`);
  } else {
    const p = app.checkPrincipleIds(CERT_ID, questions, principles);
    report(!p.length, 'principle tags', `${tagged.length} of ${questions.length} tagged, ${p.length} unknown principle id(s)`, p);
  }

  // ── Exam guide and final review week ──
  const guideFile = path.resolve(process.env.AAIA_EXAM_GUIDE_SRC || path.join(AAIA, 'exam_guide.json'));
  const weekFile = path.resolve(process.env.AAIA_FINAL_WEEK_SRC || path.join(AAIA, 'final_review_week.json'));
  const guide = readJson(guideFile, 'exam');
  const week = readJson(weekFile, 'exam');
  if (guide === null) skip('exam guide', `${rel(guideFile)} not written yet`);
  if (week === null) skip('final review week', `${rel(weekFile)} not written yet`);
  if (guide || week) {
    const r = buildExamPack(guide || null, week || null, CERT_ID, {
      notes: notes || undefined,
      principles: principles || undefined,
      // Ids and weights: the weights check the guide against certifications.ts (as the Jest pack test does).
      domains: facts.domains,
    });
    fs.writeFileSync(path.join(OUT, 'exam.json'), JSON.stringify(r.pack));
    const parts = [
      r.pack.guide ? `guide ${r.pack.guide.sections.length} sections` : 'guide none',
      r.pack.week ? `final week ${r.pack.week.days.length} days` : 'final week none',
    ];
    const lost = [];
    if (guide && !r.pack.guide) lost.push('the exam guide was left out (schema_version?)');
    if (week && !r.pack.week) lost.push('the final review week was left out (schema_version?)');
    report(!r.problems.length && !lost.length, 'exam', `${parts.join(', ')}, ${r.problems.length} problem(s), ${r.warnings.length} warning(s)`, [...r.problems, ...lost]);
    for (const w of r.warnings) lines.push(`      ! ${w}`);
  }

  // ── Mock exams ──
  drawMock('full mock', facts.examQuestions, facts, questions);
  drawMock('short mock', Math.round(facts.examQuestions / 3), facts, questions); // engine/finalWeek.ts miniMockSize

  console.log(`AAIA pack dry run (app builders, output in ${OUT}):`);
  for (const l of lines) console.log(l);
  console.log(failed ? '  ✗ problems found' : '  ✓ every builder reports 0 problems');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(`✗ AAIA pack dry run failed: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
});
