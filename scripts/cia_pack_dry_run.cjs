#!/usr/bin/env node
/**
 * cia_pack_dry_run.cjs — proves the four CIA packs (cia1, cia2, cia3 and the
 * generated Challenge pack ciac) will load in the phone app, without wiring
 * them in. Copied from crisc_pack_dry_run.cjs; what differs is marked "CIA:".
 *
 * It runs the app's own pack builders (mobile/scripts/notes-pack.cjs,
 * principles-pack.cjs, exam-guide-pack.cjs, terms-pack.cjs) on each pack's
 * files, converts the questions exactly as mobile/scripts/build-content.mjs
 * does (its own toPackQuestion, validate and checkPrincipleIds, read from that
 * file so the field mapping can never drift), and writes the results ONLY to a
 * temp folder (os.tmpdir()/cia-pack-dry-run/<pack>, or CIA_PACK_OUT). It never
 * writes into the repository.
 *
 * CIA: the exam facts (length, minutes, sections, weights) come from
 * <root>/shared/outline.json, not from certifications.ts: the CIA exams are
 * deliberately not in the app yet. The IIA says "Section A", so the lines here
 * say section, and a section's number (A is 1) is the app's domain id.
 *
 * CIA: a pack is checked as far as it is written. A pack with no files prints
 * "<pack>: no content yet"; a file that is not written yet is reported, never
 * failed. That is what lets this run on every session from day one.
 *
 * Checks per pack (one line each; exit 1 on any problem):
 *   questions     every question converts and passes the app's validate();
 *                 no id twice in the pack
 *   extra fields  CIA items carry `challenge_ref` and `testable_from`, which no
 *                 other course has: says whether the app's converter takes them.
 *                 The converter carries `testable_from` as the pack question's
 *                 `testableFrom` (and its validate() rejects a malformed date);
 *                 the line checks that every dated item kept its date
 *   notes         the notes builder reports 0 problems
 *   key terms     the terms builder (the phone Glossary and Key term widget)
 *   principles    the principles builder reports 0 problems
 *   tags          every principle_id on a question is a principle in THAT pack
 *   glossary      <pack>/glossary.json has the shape the other courses use
 *                 (the phone app has no builder for this file: shape only)
 *   exam          the exam-guide builder on <pack>/exam/<pack>_exam_guide.json
 *                 and final_review_week.json, with the outline's weights
 *   siblings      shared/siblings.json (sibling groups: questions that teach the
 *                 same lesson in nearly the same way), read by the app's own
 *                 mobile/scripts/siblings-pack.cjs: each question with a sibling
 *                 in THIS pack gets `siblingGroup` (groups sharing a question
 *                 are joined). A malformed file fails; an id no pack has, or a
 *                 retired id, is listed as a warning. No file yet: a note,
 *                 never a failure
 *   held-back     <pack>/exam/held_back.json (the held-back full form: one full
 *   form          exam, frozen, kept out of practice until the learner takes
 *                 it), read by the app's own mobile/scripts/heldback-pack.cjs
 *                 exactly as build-content.mjs applyHeldBack does: each listed
 *                 question gets `heldBack` (the form's frozen date), and the
 *                 line says how many were tagged, by section. It FAILS, as the
 *                 real build would stop, on a malformed file, another pack's
 *                 file, an id written twice, an id the pack does not have, a
 *                 retired id, or an item dated after the form was frozen.
 *                 No file = no form: a line that says so, never a failure
 *                 (a pack without one is built with no `heldBack` field)
 *   mock pool     retired items (`"retired": true`: kept for their id, never
 *                 dealt again) and items whose `testableFrom` (read from the
 *                 pack question, as the app's mockPool does) is after today
 *                 are left out
 *   full mock     the real length (125, 100, 100, 150) split by section weight
 *   short mock    the app's mini mock (a third: 42, 33, 33, 50) likewise.
 *                 Both draws keep one question per sibling group, as the app's
 *                 engine/siblings.ts oneOfEachGroup does, and fail if a draw
 *                 holds two siblings. In the FULL mock a group whose questions
 *                 sit in more than one section gives its question to the section
 *                 that would otherwise be short of its share, as the app does
 *                 (the rule is mobile/scripts/mock-siblings.cjs, the same steps
 *                 as the app's groupsForShortDomains; a Jest test holds the two
 *                 together). The short mock is drawn by the app's buildShortMock,
 *                 which does not use that rule, so here it keeps each group's
 *                 first question, as before.
 *                 A pool too small for a mock is NOT a failure while a pack is
 *                 being written: the line says how many mocks the pool supports
 *                 and which section is short, and the draw is still checked on
 *                 the largest mock that fits and keeps the weights.
 *                 --require-full turns "cannot draw" into a failure (releases).
 *   full mock /   only for a pack with a held-back form. The two lines above draw
 *   short mock    from the WHOLE pool, which a learner has only after taking the
 *   before the    form; until then the app keeps the form's questions out of every
 *   form          mock (mobile/src/content/loader.ts leftOut, engine/heldBack.ts
 *                 isHeldBackHidden). These two lines draw the same mocks from the
 *                 pool WITHOUT the form's questions and say, section by section,
 *                 what that pool holds against the quota. In the full mock a group
 *                 that spans two sections counts for the section that needs it;
 *                 one that no section needs (and, in the short mock, every such
 *                 group) is kept at random by the app, so it makes a range
 *                 ("B 53 to 56 of 25"). A mock that cannot be
 *                 filled at the exam's weights is a named WARNING line ("!"),
 *                 not a failure: it says what the app then does (buildMockExam in
 *                 engine/blueprint.ts: every question of the short section, then
 *                 a top-up from the other sections; a shorter mock when the whole
 *                 pool is too small). --require-full makes it a failure.
 * Checks across packs (they run on every call, whichever packs are named):
 *   ciac          data/cia/tools/build_challenge.py --check passes, and
 *                 ciac/id_map.json has no Challenge id twice, no active source twice.
 *                 Printed before the ciac pack's own lines; when ciac is not
 *                 one of the named packs, printed with the other checks
 *                 across packs, because a Part item feeds the Challenge pack
 *   question ids  no id appears in two packs
 * (Whether an id or an id-map row has changed since main is a git question:
 * data/cia/tools/check_ids.py.)
 *
 * Usage (plain node, no npm install):
 *   node scripts/cia_pack_dry_run.cjs                      # data/cia, today's date
 *   node scripts/cia_pack_dry_run.cjs --root DIR --today 2026-11-19
 *   node scripts/cia_pack_dry_run.cjs cia1 --require-full  # release check of one pack
 * Naming packs limits the per-pack lines to them; the checks across packs always run.
 * A clean made-up course to try it on: python3 data/cia/tools/prove_harness.py --keep DIR
 */
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const MOBILE_SCRIPTS = path.join(ROOT, 'mobile', 'scripts');
const TOOLS = path.join(ROOT, 'data', 'cia', 'tools');
const PACKS = ['cia1', 'cia2', 'cia3', 'ciac'];
const CHALLENGE = 'ciac';
/** CIA: the two item fields only this course has (docs/content/CIA_BANK_PLAN.md). */
const EXTRA_FIELDS = ['challenge_ref', 'testable_from'];
const GLOSSARY_KEYS = ['id', 'term', 'acronym', 'def', 'scopeNotes', 'domain', 'category'];
// The mock's sibling rule (one question per group; a group that spans sections gives its
// question to the section that would otherwise be short): the same steps as the app's
// mobile/src/engine/siblings.ts, kept in step with it by a Jest test (see that file's header).
const { firstOfEachGroup } = require(path.join(MOBILE_SCRIPTS, 'mock-siblings.cjs'));

// ── Command line ─────────────────────────────────────────────────────────
function usage(message) {
  console.error(`✗ ${message}\n  usage: node scripts/cia_pack_dry_run.cjs [${PACKS.join('|')} ...] [--root DIR] [--today YYYY-MM-DD] [--require-full]`);
  process.exit(2);
}
function parseArgs(argv) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const args = {
    root: path.join(ROOT, 'data', 'cia'),
    // The local date, as the Python gates' datetime.date.today().
    today: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    requireFull: false,
    packs: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--require-full') args.requireFull = true;
    else if (a === '--root' || a === '--today') {
      if (argv[i + 1] === undefined) usage(`${a} needs a value`);
      args[a.slice(2)] = argv[++i];
    } else if (PACKS.includes(a)) args.packs.push(a);
    else usage(`unknown argument "${a}"`);
  }
  if (!isDate(args.today)) usage(`--today "${args.today}" is not a date (YYYY-MM-DD)`);
  args.root = path.resolve(args.root);
  if (!args.packs.length) args.packs = PACKS;
  return args;
}
/** A real calendar date written YYYY-MM-DD. Such strings sort in date order, so `>` compares them. */
function isDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const ARGS = parseArgs(process.argv.slice(2));
const CIA = ARGS.root;
const OUT = path.resolve(process.env.CIA_PACK_OUT || path.join(os.tmpdir(), 'cia-pack-dry-run'));

/** Paths in messages: relative to the course folder (works for data/cia and for a fixture). */
const rel = (p) => path.relative(CIA, p) || p;
let failed = false;
const lines = [];
function report(ok, name, detail, problems = []) {
  if (!ok) failed = true;
  lines.push(`  ${ok ? '✓' : '✗'} ${name}: ${detail}`);
  for (const p of problems.slice(0, 25)) lines.push(`      ✗ ${p}`);
  if (problems.length > 25) lines.push(`      … and ${problems.length - 25} more`);
}
/** A line that is neither a pass nor a failure: something not written yet, or a fact to know. */
function note(name, detail) {
  lines.push(`  • ${name}: ${detail}`);
}
/** A warning: printed with "!", never a failure. Something true that the owner should know. */
function warn(name, detail) {
  lines.push(`  ! ${name}: ${detail}`);
}
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

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

/**
 * CIA: the exam facts from shared/outline.json (this replaces the CRISC
 * script's read of certifications.ts). Section ids are strings, as the app's
 * domain ids are ("1" for Section A).
 */
function examFacts() {
  const file = path.join(CIA, 'shared', 'outline.json');
  if (!fs.existsSync(file)) throw new Error(`${file} is missing: the exam lengths and section weights come from it`);
  const outline = JSON.parse(fs.readFileSync(file, 'utf8'));
  const facts = {};
  for (const pack of PACKS) {
    const e = (outline.exams || []).find((x) => x.id === pack);
    if (!e) throw new Error(`${rel(file)} has no exam "${pack}"`);
    const sections = (e.sections || []).map((s) => ({ id: String(s.domain), letter: s.letter, name: s.name, weight: Number(s.weight) }));
    const sum = sections.reduce((n, s) => n + s.weight, 0);
    if (!sections.length || sum !== 100) throw new Error(`${rel(file)}: the ${pack} section weights add up to ${sum}, not 100`);
    if (!Number.isInteger(e.questions) || e.questions <= 0) throw new Error(`${rel(file)}: ${pack} has no exam length`);
    facts[pack] = { id: pack, name: e.name, questions: e.questions, minutes: e.minutes, sections };
  }
  return facts;
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
    if (!m) throw new Error(`function ${name} not found in ${path.relative(ROOT, file)}`);
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

/**
 * The pool a mock with these section targets draws from: one question per
 * sibling group, as the app keeps them. Returns { pool, given }.
 *
 * `byRule` true (a FULL mock, and the smaller mocks tried when a full one does
 * not fit): engine/blueprint.ts buildMockExam, so engine/siblings.ts
 * oneOfEachGroup with the section targets. A group whose questions sit in more
 * than one section gives its question to the section that would otherwise be
 * short of its target (`given`: group → that section's id); every other group
 * gives its first question here, where the app keeps a random one.
 *
 * `byRule` false (a SHORT mock): this course's short mock is drawn by
 * engine/shortMock.ts buildShortMock, which keeps a random question of each
 * group the learner has not seen and does not look at the section targets. So
 * no group is given to a section (`given` is empty) and each gives its first.
 */
function mockPoolFor(questions, exam, targets, byRule) {
  return firstOfEachGroup(questions, new Map(byRule ? exam.sections.map((s, i) => [s.id, targets[i]]) : []));
}

/**
 * Draw `total` questions split by section weight from `questions` (live and
 * testable today, siblings still in), and report whether it works without
 * repeats. Each mock size is drawn from its own pool (mockPoolFor): for a
 * full mock, which sibling a group gives depends on the section targets, as
 * in the app. `byRule` is false for the short mock (see mockPoolFor).
 *
 * CIA: a pool too small for the mock is expected while a pack is being
 * written, so that is a note, not a failure (unless --require-full). The line
 * says how many whole mocks the pool supports and which sections are short;
 * the draw is then checked on the largest mock that still fits AND keeps the
 * exam's weights, so the logic is proven on whatever the pack has today.
 */
function drawMock(name, total, exam, questions, byRule, after = '') {
  const weights = exam.sections.map((s) => s.weight);
  /** Each section's distinct ids in the pool a mock with targets `t` draws from. */
  const liveFor = (t) => {
    const { pool } = mockPoolFor(questions, exam, t, byRule);
    return { pool, live: exam.sections.map((s) => [...new Set(pool.filter((q) => q.domainId === s.id).map((q) => q.id))]) };
  };
  const split = (t) => exam.sections.map((s, i) => `${s.letter} ${t[i]}`).join(' / ');
  /** Take the first `t[i]` ids of each section and check the draw: the full size, no repeats, only pool items. */
  const draw = (t, { pool, live }) => {
    const poolIds = new Set(pool.map((q) => q.id));
    // A seeded shuffle is not needed: any draw of `target` distinct ids proves it.
    const picked = live.flatMap((ids, i) => ids.slice(0, t[i]));
    const want = t.reduce((n, x) => n + x, 0);
    const problems = [];
    if (new Set(picked).size !== want) problems.push(`drew ${new Set(picked).size} distinct of ${want}`);
    if (picked.some((id) => !poolIds.has(id))) problems.push('drew an item from outside the mock pool');
    // A mock never holds two questions of one sibling group.
    const groups = picked.map((id) => pool.find((q) => q.id === id)).map((q) => q && q.siblingGroup).filter((g) => g !== undefined);
    if (new Set(groups).size !== groups.length) problems.push('drew two questions of one sibling group');
    return problems;
  };

  const targets = allocate(total, weights);
  const whole = liveFor(targets);
  const { live } = whole;
  // How many whole mocks with no item used twice: the tightest section decides.
  const forms = Math.min(...targets.map((t, i) => (t > 0 ? Math.floor(live[i].length / t) : Infinity)));
  if (forms >= 1) {
    const problems = draw(targets, whole);
    report(!problems.length, name, `${total} items (${split(targets)}) ${problems.length ? 'cannot be drawn' : 'drawn without repeats'}; the pool supports ${plural(forms, name)} with no item used twice${after}`, problems);
    return;
  }
  const short = exam.sections
    .map((s, i) => (live[i].length < targets[i] ? `section ${s.letter} has ${live[i].length} of ${targets[i]} needed` : null))
    .filter(Boolean);
  // The largest smaller mock whose weight-true split fits the pool.
  let fit = 0;
  let fitTargets = weights.map(() => 0);
  let fitPool = null;
  for (let t = total - 1; t >= 1; t--) {
    const a = allocate(t, weights);
    const smaller = liveFor(a); // a smaller mock has smaller targets, so its own pool
    if (a.every((n, i) => n <= smaller.live[i].length)) {
      fit = t;
      fitTargets = a;
      fitPool = smaller;
      break;
    }
  }
  const problems = fit ? draw(fitTargets, fitPool) : [];
  const checked = fit
    ? `Draw logic checked on the largest weight-true mock that fits today: ${plural(fit, 'item')} (${split(fitTargets)}) ${problems.length ? 'could not be drawn' : 'drawn without repeats'}`
    : 'No weight-true mock of any size fits yet, so nothing was drawn';
  const detail = `0 ${name}s yet (${total} items, ${split(targets)}): ${short.join(', ')}. ${checked}${after}`;
  if (problems.length || ARGS.requireFull) report(false, name, detail + (ARGS.requireFull && !problems.length ? ' (--require-full)' : ''), problems);
  else note(name, detail);
}

/**
 * CIA: the same mock, drawn from the pool a learner has BEFORE taking the
 * held-back form (`before`: live, testable today, not in the form; siblings
 * still in). Only called for a pack that has a form.
 *
 * Plain English: the app hides the form's questions from every mock until the
 * form is taken, so a new learner's mocks come from this smaller pool. The line
 * says what each section holds against its quota. When a section is short, the
 * mock cannot keep the exam's weights: that is a WARNING, not a failure (the
 * plan records that the pools are small), and the line says what the app does
 * then, read from the code:
 *   - lib/sessions.ts startMock → engine/blueprint.ts buildMockExam: each
 *     section gives its share or, if it has fewer, everything it has; then
 *     "Top up from any domain if the whole thing is still short" fills the
 *     mock from the other sections, so it is full length but off the weights;
 *   - when the whole pool is smaller than the mock, every question is dealt
 *     and the mock is simply shorter (the time allowed follows its length);
 *   - a short mock goes through engine/shortMock.ts buildShortMock first (a
 *     short section also takes the questions the learner has seen), then the
 *     same buildMockExam.
 * The draw made here is that same shape (share or all, then a top-up), checked
 * for repeats and for two siblings.
 */
function drawBeforeForm(kind, total, exam, before) {
  const name = `${kind} before the form`;
  const targets = allocate(total, exam.sections.map((s) => s.weight));
  const split = (t) => exam.sections.map((s, i) => `${s.letter} ${t[i]}`).join(' / ');
  // One question per sibling group, as the app keeps them (mockPoolFor). For a full mock a group
  // that spans sections gives its question to the section that would otherwise be short of its
  // target (`given`); every other group gives its first question here (the app keeps a random one).
  // For a short mock no group is given (`given` is empty): see mockPoolFor.
  const full = total === exam.questions;
  const { pool, given } = mockPoolFor(before, exam, targets, full);
  // What each section holds, whichever sibling the app keeps. A group inside one section counts 1
  // for it. A group that spans sections counts for the section it was given to, and only for that
  // one. A group that spans sections and was not given is free: the app keeps a random question
  // of it, so it counts for any of its sections (the least and the most differ).
  const groupSections = new Map();
  for (const q of before) {
    if (q.siblingGroup === undefined) continue;
    if (!groupSections.has(q.siblingGroup)) groupSections.set(q.siblingGroup, new Set());
    groupSections.get(q.siblingGroup).add(q.domainId);
  }
  const range = exam.sections.map((s) => {
    const alone = before.filter((q) => q.domainId === s.id && q.siblingGroup === undefined).length;
    let least = alone;
    let most = alone;
    for (const [group, sections] of groupSections) {
      if (!sections.has(s.id)) continue;
      const givenTo = given.get(group);
      if (sections.size === 1 || givenTo === s.id) {
        least += 1;
        most += 1;
      } else if (givenTo === undefined) most += 1;
    }
    return { least, most };
  });
  const count = (r) => (r.least === r.most ? `${r.least}` : `${r.least} to ${r.most}`);
  const holds = exam.sections.map((s, i) => `${s.letter} ${count(range[i])} of ${targets[i]}`).join(' / ');
  const poolLine = `Before the form a mock draws from ${plural(pool.length, 'question')}; by section against the quota: ${holds}`;

  // The draw, in the app's shape: each section's share (or all it has), then a top-up from the rest.
  const bySection = exam.sections.map((s) => pool.filter((q) => q.domainId === s.id));
  const picked = bySection.flatMap((qs, i) => qs.slice(0, targets[i]));
  const fromSection = picked.length;
  const taken = new Set(picked.map((q) => q.id));
  for (const q of pool) {
    if (picked.length >= total) break;
    if (!taken.has(q.id)) { picked.push(q); taken.add(q.id); }
  }
  const want = Math.min(total, pool.length);
  const problems = [];
  if (taken.size !== want || picked.length !== want) problems.push(`drew ${taken.size} distinct of ${want}`);
  const groups = picked.map((q) => q.siblingGroup).filter((g) => g !== undefined);
  if (new Set(groups).size !== groups.length) problems.push('drew two questions of one sibling group');
  if (picked.some((q) => q.heldBack !== undefined)) problems.push('drew a question of the held-back form');

  // Sure to fit only when every section holds its share whichever sibling the app keeps. In a full
  // mock a section still short here is short in the app too: every group that could have helped
  // it was given, to it or to a section that needed it more.
  const shortSections = exam.sections
    .map((s, i) => (range[i].least < targets[i] ? `section ${s.letter} holds ${count(range[i])} of the ${targets[i]} needed` : null))
    .filter(Boolean);
  if (!shortSections.length) {
    report(!problems.length, name, `${total} items (${split(targets)}) ${problems.length ? 'cannot be drawn' : 'drawn without repeats'} with the held-back form's questions left out. ${poolLine}`, problems);
    return;
  }
  const title = full ? 'Full mock exam' : 'Mini mock';
  const engine = full ? 'engine/blueprint.ts buildMockExam' : 'engine/shortMock.ts buildShortMock, then buildMockExam';
  const gets = exam.sections
    .map((s, i) => (range[i].least < targets[i] ? `section ${s.letter} ${count({ least: range[i].least, most: Math.min(range[i].most, targets[i]) })}, not ${targets[i]}` : null))
    .filter(Boolean)
    .join('; ');
  const app = pool.length >= total
    ? `the learner still gets a "${title}" of ${total} questions: every question a short section has, topped up at random from the other sections, so it is full length but off the exam's weights (${gets}), and the start sheet does not say so`
    : `the learner gets a "${title}" of only ${pool.length} questions, every one the pool holds (the time allowed is for ${pool.length} questions)`;
  const checked = problems.length
    ? 'That draw could not be made here'
    : `That draw was made here: ${plural(picked.length, 'item')} (${fromSection} by section share, ${picked.length - fromSection} topped up) without repeats`;
  const detail = `WARNING: until the learner takes the held-back form, a ${kind} of ${total} (${split(targets)}) cannot be filled at the exam's weights: ${shortSections.join(', ')}. `
    + `${poolLine}. In the app (${engine}) ${app}. ${checked}`;
  if (problems.length || ARGS.requireFull) report(false, name, detail + (ARGS.requireFull && !problems.length ? ' (--require-full)' : ''), problems);
  else warn(name, `${detail}. Not a failure of this gate`);
}

/** Every .json file under a pack's folder (to tell "no content yet" from a started pack). */
function jsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? jsonFiles(p) : e.name.endsWith('.json') ? [p] : [];
  });
}

/** The ids of every question file of a pack, straight from the files (for the across-packs check). */
function rawQuestionIds(pack) {
  const dir = path.join(CIA, pack, 'originals');
  if (!fs.existsSync(dir)) return [];
  const ids = [];
  for (const f of fs.readdirSync(dir).filter((n) => /^d\d+\.json$/.test(n)).sort()) {
    try {
      for (const q of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).questions || []) ids.push(String(q.id));
    } catch (e) { /* a broken file is reported by the pack's own "questions" line */ }
  }
  return ids;
}

/**
 * CIA: the course's one sibling-groups file (shared/siblings.json), read once
 * for every pack with the app's own reader. Returns { groups } for tagging,
 * or null when there is no file yet or it is malformed (reported once here).
 */
function readSiblings(builders) {
  const file = path.join(CIA, 'shared', 'siblings.json');
  lines.push('Sibling groups:');
  const raw = readJson(file, 'siblings');
  if (raw === null) {
    note('siblings', `${rel(file)} not written yet (no groups: every set and mock is drawn as if none)`);
    return null;
  }
  if (raw === undefined) return null; // not valid JSON: readJson reported it
  const knownIds = new Set(PACKS.flatMap((p) => rawQuestionIds(p)));
  const r = builders.readSiblingGroups(raw, { knownIds });
  report(!r.problems.length, 'siblings file', `${plural(r.groups.length, 'group')} in ${rel(file)}, ${r.problems.length} problem(s), ${r.warnings.length} warning(s)`, r.problems);
  // Warnings (an id no pack has, an id written twice) are listed, ten at most.
  for (const w of r.warnings.slice(0, 10)) lines.push(`      ! ${w}`);
  if (r.warnings.length > 10) lines.push(`      ! … and ${r.warnings.length - 10} more`);
  return r.problems.length ? null : r;
}

/** One pack, as far as it is written. */
function dryRunPack(pack, exam, app, builders, siblings) {
  const dir = path.join(CIA, pack);
  lines.push(`${pack}: ${exam.name} (${exam.questions} questions, ${exam.minutes} minutes)`);
  const out = path.join(OUT, pack);
  fs.mkdirSync(out, { recursive: true });
  const sectionIds = exam.sections.map((s) => s.id);

  // ── Questions (build-content.mjs main(): convert, validate, write d<N>.json) ──
  const questions = [];
  const qProblems = [];
  const perSection = [];
  let datedSource = 0; // items whose source file gives a testable_from date
  let filesRead = 0;
  let withRef = 0;
  let rejected = null; // the converter's own message, if it threw on the extra fields
  let carried = false; // true if the converter starts passing the extra fields through
  for (const s of exam.sections) {
    const file = path.join(dir, 'originals', `d${s.id}.json`);
    const raw = readJson(file, 'questions');
    if (raw == null) {
      // CIA: a section not written yet is not a problem (the mock lines say what is short).
      perSection.push(`${s.letter} ${raw === null ? 'not written yet' : 'unreadable'}`);
      continue;
    }
    filesRead += 1;
    const converted = [];
    for (const q of raw.questions || []) {
      // CIA: the two extra fields. toPackQuestion copies an explicit list of
      // fields: it carries testable_from as `testableFrom` (validate() checks
      // the date) and leaves challenge_ref out. Checked on every item rather
      // than assumed: the same item is converted without them, and any
      // difference means the converter carries a field. If a later converter
      // rejects them (throws), they are stripped here and the "extra fields"
      // line says the app must accept them.
      const bare = Object.fromEntries(Object.entries(q).filter(([k]) => !EXTRA_FIELDS.includes(k)));
      let pq;
      try {
        pq = app.toPackQuestion(q, pack);
        if (JSON.stringify(pq) !== JSON.stringify(app.toPackQuestion(bare, pack))) carried = true;
      } catch (e) {
        // Blame the extra fields only if the item converts once they are gone.
        try {
          pq = app.toPackQuestion(bare, pack);
          rejected = rejected || e.message;
        } catch (e2) {
          qProblems.push(`${q && q.id}: the app's converter failed on this item (${e2.message})`);
          continue;
        }
      }
      const p = app.validate(pq);
      if (p.length) qProblems.push(`${pq.id}: ${p.join('; ')}`);
      if (pq.domainId !== s.id) qProblems.push(`${pq.id}: domain ${pq.domainId}, file is d${s.id} (section ${s.letter})`);
      if (q.challenge_ref) withRef += 1;
      // A malformed date is the app's validate() problem above; here only count.
      if (q.testable_from != null) datedSource += 1;
      converted.push(pq);
    }
    questions.push(...converted);
    perSection.push(`${s.letter} ${converted.length}`);
  }
  // A question file for a section this exam does not have would never be loaded.
  const origDir = path.join(dir, 'originals');
  for (const f of fs.existsSync(origDir) ? fs.readdirSync(origDir).sort() : []) {
    const m = /^d(\d+)\.json$/.exec(f);
    if (m && !sectionIds.includes(m[1])) qProblems.push(`originals/${f}: this exam has no section ${m[1]} (it has ${sectionIds.join(', ')})`);
  }
  // Sibling groups go on across the pack's sections, so the files are written after them.
  let siblingLine = null;
  if (siblings && questions.length) {
    // CIA: the Challenge pack's items are Part items under new ids: the id map leads the file's
    // Part ids to them (active rows only), as the app builder's `siblingIdMap` does.
    let aliases;
    if (pack === CHALLENGE) {
      const map = readJson(path.join(dir, 'id_map.json'), 'id map');
      if (map && Array.isArray(map.map)) aliases = new Map(map.map.filter((e) => e && e.status === 'active').map((e) => [String(e.source), String(e.id)]));
    }
    const t = builders.tagPack(siblings.groups, questions, { aliases });
    siblingLine = `${plural(t.tagged, 'question')} in ${plural(t.groups, 'group')} with a sibling in ${pack}`
      + (t.joined ? ` (${plural(t.joined, 'group')} sharing a question with another joined to it: one per mock for all of them)` : '');
    for (const w of t.warnings) siblingLine += `; ${w}`;
  }
  // ── The held-back full form (optional): the app's own reader and tagger ──
  // Same steps as build-content.mjs applyHeldBack: no file = no form (nothing is tagged); a file
  // with a problem tags nothing and fails, because the real build would stop there. It runs here,
  // before the section files are written, so the dry-run pack carries `heldBack` as the app's would.
  const heldFile = path.join(dir, 'exam', 'held_back.json');
  let heldForm = null; // { key, ids } once the file is read and sound
  let heldLine = () => {}; // prints the form's line later, under the siblings line
  // No file: the same "none" line whether or not the pack has questions yet.
  const noForm = () => note('held-back form', `none (${rel(heldFile)} is not written): no question is tagged, so ${pack} has no full exam form`);
  if (!questions.length) {
    heldLine = fs.existsSync(heldFile)
      ? () => report(false, 'held-back form', `${rel(heldFile)} is written, but ${pack} has no questions for it to tag`)
      : noForm;
  } else {
    const raw = readJson(heldFile, 'held-back form'); // a file that is not valid JSON is reported (and fails) here
    if (raw === null) {
      heldLine = noForm;
    } else if (raw !== undefined) {
      const read = builders.readHeldBack(raw, { certId: pack, questions });
      if (read.problems.length) {
        heldLine = () => report(false, 'held-back form', `${rel(heldFile)} has ${read.problems.length} problem(s); no question is tagged (the app's build would stop here)`, read.problems);
      } else {
        heldForm = read.form;
        const tagged = builders.tagHeldBack(read.form, questions);
        const bySection = exam.sections.map((s) => `${s.letter} ${questions.filter((q) => q.domainId === s.id && q.heldBack === read.form.key).length}`).join(' / ');
        // Every listed id is a question of the pack (checked by the reader), so the two counts can only differ on a bug.
        heldLine = () => report(tagged === read.form.ids.length, 'held-back form',
          `${plural(tagged, 'question')} tagged heldBack "${read.form.key}" (${bySection}) from ${rel(heldFile)}, frozen ${read.form.key}; `
          + `the exam is ${exam.questions} questions` + (tagged === read.form.ids.length ? '' : `, but the file lists ${read.form.ids.length}`));
      }
    }
  }

  for (const s of exam.sections) {
    const inSection = questions.filter((q) => q.domainId === s.id);
    if (inSection.length) fs.writeFileSync(path.join(out, `d${s.id}.json`), JSON.stringify(inSection));
  }
  const ids = questions.map((q) => q.id);
  const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  for (const id of dupes) qProblems.push(`${id}: id appears more than once in ${pack}`);
  if (!filesRead && !qProblems.length) {
    note('questions', `not written yet (${pack}/originals/d${sectionIds[0]}.json to d${sectionIds[sectionIds.length - 1]}.json)`);
  } else {
    report(qProblems.length === 0, 'questions', `${questions.length} converted (${perSection.join(', ')}), ${qProblems.length} problem(s)`, qProblems);
  }
  // The dates the app will see: read from the pack question, never from the source.
  const datedPack = questions.filter((q) => q.testableFrom !== undefined).length;
  if (questions.length) {
    const counts = `challenge_ref on ${withRef}, testable_from on ${datedSource} of ${questions.length}`;
    if (rejected) {
      // Not a failure of the content: a to-do for the app before the pack is wired in.
      lines.push(`  ! extra fields: ${counts}. The app's converter REJECTS them (${rejected}); stripped for this dry run. The app builder must accept them before the pack is wired in`);
    } else if (datedPack !== datedSource) {
      // Every dated source item must reach the app with its date, or a mock could deal it early.
      report(false, 'extra fields', `${counts}, but ${datedPack} pack question(s) carry testableFrom: the app's converter must carry every date`);
    } else {
      note('extra fields', `${counts}. The app's converter accepts them and carries testable_from into the pack question as testableFrom (${datedPack} of ${datedSource} dates)`
        + (carried || !datedSource ? '' : ' (but no difference was seen: check toPackQuestion)'));
    }
  }

  if (siblingLine) note('siblings', siblingLine);
  heldLine();

  // ── Notes: one file per section, as one schema v2 notes file ──
  const notesDir = path.join(dir, 'notes');
  const notesDocs = [];
  const notesFor = [];
  for (const s of exam.sections) {
    const doc = readJson(path.join(notesDir, `d${s.id}.json`), 'notes');
    if (doc) {
      notesDocs.push(doc);
      notesFor.push(s);
    }
  }
  let notes = null;
  if (!notesDocs.length) {
    note('notes', `not written yet (${pack}/notes/d${sectionIds[0]}.json to d${sectionIds[sectionIds.length - 1]}.json)`);
  } else {
    const r = builders.buildNotesPack({ schema_version: 2, domains: notesDocs }, pack, { questions });
    notes = r.pack;
    fs.writeFileSync(path.join(out, 'notes.json'), JSON.stringify(notes));
    const subs = notes.domains.reduce((n, d) => n + d.topics.reduce((m, t) => m + t.subtopics.length, 0), 0);
    // The builder drops a section with no usable topic without a word: say so.
    const built = new Set(notes.domains.map((d) => d.id));
    const lost = notesFor.filter((s) => !built.has(s.id)).map((s) => `notes/d${s.id}.json gave no section ${s.id} in the pack (domain_number, or no complete topic)`);
    const not = exam.sections.filter((s) => !notesFor.includes(s)).map((s) => s.letter);
    const nProblems = [...r.problems, ...lost, ...(r.skipped ? [`builder skipped the file (${r.skipped})`] : [])];
    report(!nProblems.length, 'notes',
      `${plural(notes.domains.length, 'section')}, ${plural(subs, 'subtopic')}, ${nProblems.length} problem(s), ${r.warnings.length} warning(s)`
      + (not.length ? `; not written yet: ${not.join(', ')}` : ''),
      nProblems);
    for (const w of r.warnings) lines.push(`      ! ${w}`);
    // The phone Glossary and the Key term widget read this pack, not <pack>/glossary.json.
    const terms = builders.buildTermsPack(notes, pack);
    fs.writeFileSync(path.join(out, 'terms.json'), JSON.stringify(terms));
    const n = Object.values(terms.domains).reduce((sum, list) => sum + list.length, 0);
    note('key terms', `${plural(n, 'term')} from the notes' key_terminologies (what the phone Glossary and the Key term widget show)`);
  }
  // Any other notes file (for example the Challenge pack's hand-written bridge.json) is not read here.
  for (const f of fs.existsSync(notesDir) ? fs.readdirSync(notesDir).sort() : []) {
    const m = /^d(\d+)\.json$/.exec(f);
    if (f.endsWith('.json') && !(m && sectionIds.includes(m[1]))) note('notes', `${pack}/notes/${f} is not a section file: not fed to the notes builder`);
  }

  // ── Principles (built into the pack from shared/principles.json by build_packs.py) ──
  const principlesFile = path.join(dir, 'mindset', 'principles.json');
  const rawPrinciples = readJson(principlesFile, 'principles');
  let principles = null;
  if (rawPrinciples === null) {
    note('principles', `${rel(principlesFile)} not written yet`);
  } else if (rawPrinciples !== undefined) {
    const r = builders.buildPrinciplesPack(rawPrinciples, pack, { questions });
    principles = r.pack;
    fs.writeFileSync(path.join(out, 'principles.json'), JSON.stringify(principles));
    report(!r.problems.length && !r.skipped, 'principles',
      `${plural(principles.principles.length, 'principle')} in ${principles.families.length} ${principles.families.length === 1 ? 'family' : 'families'}, ${r.problems.length} problem(s), ${r.warnings.length} warning(s)`,
      [...r.problems, ...(r.skipped ? [`builder skipped the file (${r.skipped})`] : [])]);
    for (const w of r.warnings) lines.push(`      ! ${w}`);
  }

  // ── principle_id tags against THIS pack's principles ──
  const tagged = questions.filter((q) => q.principleId);
  if (!questions.length) {
    // Nothing to check: no line.
  } else if (!tagged.length) {
    note('principle tags', `no ${pack} question carries a principle_id yet`);
  } else if (!principles || !principles.principles.length) {
    report(false, 'principle tags', `${tagged.length} question(s) carry principle_id but ${pack} has no principles pack`);
  } else {
    const p = app.checkPrincipleIds(pack, questions, principles);
    report(!p.length, 'principle tags', `${tagged.length} of ${questions.length} tagged, ${p.length} unknown principle id(s)`, p);
  }

  // ── Glossary (built into the pack from shared/glossary.json by build_packs.py) ──
  // The phone app has no builder for this file (its Glossary reads the key
  // terms pack above), so this is the shape check verify_repo.sh runs on the
  // CRISC glossary: the keys, a section of this exam (0: the whole exam), a
  // definition, and no id or term twice.
  const glossaryFile = path.join(dir, 'glossary.json');
  const glossary = readJson(glossaryFile, 'glossary');
  if (glossary === null) {
    note('glossary', `${rel(glossaryFile)} not written yet`);
  } else if (glossary !== undefined) {
    const gProblems = [];
    const list = Array.isArray(glossary) ? glossary : [];
    if (!list.length) gProblems.push('must be a list with at least one term');
    const seenId = new Set();
    const seenTerm = new Set();
    for (const e of list) {
      const where = `id ${e && e.id} (${e && e.term})`;
      const missing = GLOSSARY_KEYS.filter((k) => !e || e[k] === undefined);
      if (missing.length) {
        gProblems.push(`${where}: missing ${missing.join(', ')}`);
        continue;
      }
      if (!['0', ...sectionIds].includes(String(e.domain))) gProblems.push(`${where}: domain ${e.domain} is not a section of this exam`);
      if (typeof e.def !== 'string' || !e.def.trim()) gProblems.push(`${where}: no definition`);
      const term = String(e.term).trim().toLowerCase();
      if (seenId.has(e.id)) gProblems.push(`${where}: id used twice`);
      if (seenTerm.has(term)) gProblems.push(`${where}: term used twice`);
      seenId.add(e.id);
      seenTerm.add(term);
    }
    report(!gProblems.length, 'glossary', `${plural(list.length, 'term')}, ${gProblems.length} problem(s) (shape only: the phone app has no builder for this file yet)`, gProblems);
  }

  // ── Exam guide and final review week ──
  const guideFile = path.join(dir, 'exam', `${pack}_exam_guide.json`);
  const weekFile = path.join(dir, 'exam', 'final_review_week.json');
  const guide = readJson(guideFile, 'exam');
  const week = readJson(weekFile, 'exam');
  if (guide === null) note('exam guide', `${rel(guideFile)} not written yet`);
  if (week === null) note('final review week', `${rel(weekFile)} not written yet`);
  if (guide || week) {
    const r = builders.buildExamPack(guide || null, week || null, pack, {
      notes: notes || undefined,
      principles: principles || undefined,
      // Ids and weights: the weights check the guide against the outline (CIA: not certifications.ts).
      domains: exam.sections.map((s) => ({ id: s.id, weight: s.weight })),
    });
    fs.writeFileSync(path.join(out, 'exam.json'), JSON.stringify(r.pack));
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
  if (!questions.length) {
    if (ARGS.requireFull) report(false, 'full mock', 'no questions, so no full mock can be drawn (--require-full)');
    return;
  }
  // CIA: an item that rests on a Topical Requirement that is not testable yet
  // carries its date on the pack question (`testableFrom`); it stays in the
  // bank but is left out of every mock until that date, as the app's
  // engine/blueprint.ts mockPool does. A retired item (`"retired": true`)
  // keeps its id in the pack so old progress still resolves, and is never dealt again.
  const live = questions.filter((q) => !q.retired);
  const retiredCount = questions.length - live.length;
  const waiting = live.filter((q) => q.testableFrom !== undefined && !(isDate(q.testableFrom) && q.testableFrom <= ARGS.today));
  const testable = live.filter((q) => !waiting.includes(q));
  // One question per sibling group, as the app's oneOfEachGroup: counted here (how many a mock
  // draws from is the same whichever sibling is kept). Which sibling each draw keeps is decided
  // in drawMock and drawBeforeForm, by the app's rule (mockPoolFor).
  const seenGroup = new Set();
  const pool = testable.filter((q) => {
    if (q.siblingGroup === undefined) return true;
    if (seenGroup.has(q.siblingGroup)) return false;
    seenGroup.add(q.siblingGroup);
    return true;
  });
  const setAside = testable.length - pool.length;
  // CIA: the app keeps the held-back form's questions out of practice and every mock until the
  // learner has taken it (engine/heldBack.ts). The first two draws below are on the whole pool
  // (what a learner has afterwards); this clause says how much smaller it is before that, and the
  // two "before the form" draws are made on that smaller pool.
  let heldOut = '';
  const before = testable.filter((q) => q.heldBack === undefined);
  if (heldForm) {
    const groupsBefore = new Set();
    const poolBefore = before.filter((q) => q.siblingGroup === undefined || (!groupsBefore.has(q.siblingGroup) && groupsBefore.add(q.siblingGroup)));
    heldOut = `; the held-back form keeps ${testable.length - before.length} of the testable items out of practice and mocks until the learner takes it, so before that a mock draws from ${poolBefore.length}`;
  }
  note('mock pool', `${testable.length} of ${live.length} live items testable on ${ARGS.today}`
    + (retiredCount ? ` (${plural(retiredCount, 'retired item')} kept for the id, never dealt)` : '')
    + (waiting.length
      ? ` (${waiting.length} left out until testable_from: ${waiting.slice(0, 5).map((q) => `${q.id} ${q.testableFrom}`).join(', ')}${waiting.length > 5 ? ', …' : ''})`
      : '')
    + (setAside ? `; one per sibling group, so a mock draws from ${pool.length} (${setAside} are a second or later sibling)` : '')
    + heldOut);
  // With a form, say which pool the two usual lines are: the whole one, as after the form.
  const after = heldForm ? ' (the whole pool: what a learner has after taking the held-back form)' : '';
  const shortSize = Math.round(exam.questions / 3); // engine/finalWeek.ts miniMockSize
  drawMock('full mock', exam.questions, exam, testable, true, after);
  drawMock('short mock', shortSize, exam, testable, false, after);
  if (heldForm) {
    drawBeforeForm('full mock', exam.questions, exam, before);
    drawBeforeForm('short mock', shortSize, exam, before);
  }
}

/**
 * CIA: the Challenge pack is generated, never written by hand. Its own gate
 * must pass before anything is read from it, and its id map (append-only,
 * because a learner's saved progress is keyed by question id) must never give
 * one Challenge id to two items or keep two active copies of one source item.
 */
function checkChallenge() {
  lines.push('ciac gate (the Challenge pack is generated from the tagged Part items):');
  const tool = path.join(TOOLS, 'build_challenge.py');
  const r = spawnSync('python3', [tool, '--check', '--root', CIA, '--today', ARGS.today], { encoding: 'utf8' });
  const outText = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').filter(Boolean);
  if (r.error) {
    report(false, 'build_challenge.py --check', `could not run python3 (${r.error.message})`);
  } else {
    const last = outText[outText.length - 1] || `exit ${r.status}`;
    // On a failure show the gate's own ERROR lines (or everything it said, if it died another way).
    const errors = outText.filter((l) => l.startsWith('ERROR ')).map((l) => l.slice(6));
    report(r.status === 0, 'build_challenge.py --check', last.replace(/^build_challenge --check:\s*/, ''),
      r.status === 0 ? [] : errors.length ? errors : outText.slice(0, -1));
  }
  const mapFile = path.join(CIA, CHALLENGE, 'id_map.json');
  const map = readJson(mapFile, 'id map');
  if (map === null) {
    note('id map', `${rel(mapFile)} not written yet`);
  } else if (map !== undefined) {
    const entries = Array.isArray(map.map) ? map.map : [];
    const problems = [];
    const count = (list) => list.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map());
    for (const [id, n] of count(entries.map((e) => e.id))) if (n > 1) problems.push(`Challenge id ${id} is given ${n} times (an id is never reused)`);
    const active = entries.filter((e) => e.status === 'active');
    for (const [src, n] of count(active.map((e) => e.source))) if (n > 1) problems.push(`source ${src} is active ${n} times`);
    report(!problems.length, 'id map', `${plural(entries.length, 'Challenge id')} (${active.length} active, ${entries.length - active.length} retired), ${problems.length} problem(s)`, problems);
  }
}

async function main() {
  // Under the repository nothing is ever written: a temp folder only.
  if (OUT === ROOT || OUT.startsWith(ROOT + path.sep)) {
    console.error(`✗ refusing to write inside the repository (${OUT}); choose a CIA_PACK_OUT under ${os.tmpdir()}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const builders = {
    ...require(path.join(MOBILE_SCRIPTS, 'notes-pack.cjs')),
    buildPrinciplesPack: require(path.join(MOBILE_SCRIPTS, 'principles-pack.cjs')).buildPrinciplesPack,
    buildExamPack: require(path.join(MOBILE_SCRIPTS, 'exam-guide-pack.cjs')).buildExamPack,
    buildTermsPack: require(path.join(MOBILE_SCRIPTS, 'terms-pack.cjs')).buildTermsPack,
    ...require(path.join(MOBILE_SCRIPTS, 'siblings-pack.cjs')),
    // The held-back form's reader and tagger (readHeldBack, tagHeldBack): the app builder's own.
    ...require(path.join(MOBILE_SCRIPTS, 'heldback-pack.cjs')),
  };
  const app = await appFunctions();
  const facts = examFacts();
  const started = (pack) => jsonFiles(path.join(CIA, pack)).length > 0;
  const siblings = readSiblings(builders);

  for (const pack of ARGS.packs) {
    // The Challenge gate first: its files are only worth reading when they are what the builder produces.
    if (pack === CHALLENGE) checkChallenge();
    if (!started(pack)) {
      // At a release an empty pack is a failure; while the course is being written it is just a fact.
      lines.push(`${pack}: no content yet`);
      if (ARGS.requireFull) report(false, 'full mock', 'no questions, so no full mock can be drawn (--require-full)');
      continue;
    }
    dryRunPack(pack, facts[pack], app, builders, siblings);
  }

  // The Challenge gate is a check across packs: it runs even when ciac was not named.
  if (!ARGS.packs.includes(CHALLENGE)) checkChallenge();

  // ── Across packs: a question id belongs to one pack only (progress is keyed by id) ──
  const where = new Map();
  for (const pack of PACKS) for (const id of new Set(rawQuestionIds(pack))) where.set(id, [...(where.get(id) || []), pack]);
  const shared = [...where].filter(([, packs]) => packs.length > 1).map(([id, packs]) => `${id}: id appears in ${packs.length} packs (${packs.join(', ')})`);
  if (where.size) {
    lines.push('All packs:');
    report(!shared.length, 'question ids', `${where.size} ids across the packs, ${shared.length} in more than one pack`, shared);
  }

  const course = CIA.startsWith(ROOT + path.sep) ? path.relative(ROOT, CIA) : CIA;
  console.log(`CIA pack dry run (app builders on ${course}, today ${ARGS.today}, output in ${OUT}):`);
  for (const l of lines) console.log(`  ${l}`);
  console.log(failed ? '  ✗ problems found' : '  ✓ every builder reports 0 problems');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(`✗ CIA pack dry run failed: ${e && e.stack ? e.stack : e}`);
  process.exit(1);
});
