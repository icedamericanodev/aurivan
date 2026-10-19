/**
 * principles-pack.cjs — turns ../data/mindset/principles.json (the exam
 * mindset principles, schema v2) into the mobile app's "principles pack".
 *
 * WHY A SEPARATE .cjs FILE (plain English):
 *   build-content.mjs is an ES module, and Jest cannot load ES modules
 *   without extra setup. Keeping the pure "reshape the principles" logic in
 *   this CommonJS file lets BOTH the build script and the Jest tests use it
 *   (the same trick as notes-pack.cjs). No packages, no file access.
 *
 * WHAT IT DOES:
 *   1. Only accepts `schema_version: 2` (docs/content/PRINCIPLES_SCHEMA.md).
 *      A missing file or another version gives an EMPTY pack, so the app keeps
 *      working and the Learn → Principles row simply hides itself.
 *   2. Renames fields to the app's camelCase shape
 *      (src/content/principles/types.ts) and sorts families and principles
 *      into reading order once, here, so the app never has to.
 *   3. Drops what the app never shows: the file's title, description and
 *      update date. Keeps `legacyIds` and `aliases` (small) so an old stored
 *      principle id still opens the right page.
 *   4. Checks the facts the app relies on. Each one is a PROBLEM (the build
 *      fails), because a wrong link would mislead a learner:
 *        - ids are unique and every principle names a real family;
 *        - every `practice_ids` entry is a real question of a listed domain
 *          (when the build passes the questions it just wrote), so "Practice
 *          this principle" never opens the wrong questions;
 *        - every `slip_map` value is null or a real principle id;
 *        - no learner-facing text says "stem" (the app says "question"
 *          everywhere; ids such as `answer-from-the-stem` are not shown).
 *      The deeper writing rules (word limits, spelling, one question per
 *      principle) stay with ../scripts/lint_principles.py.
 */

/** Empty pack: the app treats it as "no principles for this cert". */
function emptyPack(certId) {
  return { certId, families: [], principles: [], slipMap: {} };
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** "stem" in anything a learner reads: the app says "question" (copy-consistency.test.ts). */
const STEM = /\bstem\b/i;
function checkWords(where, fields, problems) {
  for (const [field, value] of fields) {
    const values = Array.isArray(value) ? value : [value];
    if (values.some((v) => typeof v === 'string' && STEM.test(v))) {
      problems.push(`${where} says "stem" in ${field}: learners read "question"`);
    }
  }
}
const strList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : []);

/**
 * Build the pack. `opts.questions` (optional): the cert's questions as
 * [{ id, domainId }], to check each practice id. Returns
 * { pack, problems, warnings, skipped } (`skipped` says why the pack is empty).
 */
function buildPrinciplesPack(raw, certId = 'cisa', opts = {}) {
  const problems = [];
  const warnings = [];
  if (!raw || typeof raw !== 'object') return { pack: emptyPack(certId), problems, warnings, skipped: 'no' };
  if (raw.schema_version !== 2) {
    return { pack: emptyPack(certId), problems, warnings, skipped: `a schema_version ${raw.schema_version} (needs 2)` };
  }
  const questionDomains = Array.isArray(opts.questions)
    ? new Map(opts.questions.map((q) => [String(q.id), String(q.domainId)]))
    : null;

  // ── Families, in their own order ────────────────────────────────────
  const families = [];
  const familyIds = new Set();
  for (const f of Array.isArray(raw.families) ? raw.families : []) {
    const id = str(f && f.id);
    if (!id) {
      problems.push('a family has no id');
      continue;
    }
    if (familyIds.has(id)) problems.push(`family "${id}" appears twice`);
    familyIds.add(id);
    checkWords(`family "${id}"`, [['title', f.title], ['question', f.question]], problems);
    families.push({ id, order: Number(f.order) || 0, title: str(f.title), question: str(f.question) });
  }
  families.sort((a, b) => a.order - b.order);

  // ── Principles ──────────────────────────────────────────────────────
  const principles = [];
  const ids = new Set();
  for (const p of Array.isArray(raw.principles) ? raw.principles : []) {
    const id = str(p && p.id);
    const where = `principle "${id || '?'}"`;
    if (!id) {
      problems.push('a principle has no id');
      continue;
    }
    if (ids.has(id)) problems.push(`${where} appears twice`);
    ids.add(id);
    const family = str(p.family);
    if (!familyIds.has(family)) problems.push(`${where} names an unknown family "${family}"`);
    // Every field the detail page shows must be there.
    for (const [field, value] of [
      ['title', p.title],
      ['rule', p.rule],
      ['why', p.why],
      ['trap.move', p.trap && p.trap.move],
      ['trap.why_wrong', p.trap && p.trap.why_wrong],
      ['example.scenario', p.example && p.example.scenario],
      ['example.answer', p.example && p.example.answer],
    ]) {
      if (!str(value)) problems.push(`${where} has no ${field}`);
    }
    checkWords(where, [
      ['title', p.title],
      ['rule', p.rule],
      ['why', p.why],
      ['triggers', p.triggers],
      ['trap.move', p.trap && p.trap.move],
      ['trap.why_wrong', p.trap && p.trap.why_wrong],
      ['example.scenario', p.example && p.example.scenario],
      ['example.answer', p.example && p.example.answer],
      ['nuance', p.nuance],
    ], problems);
    const domains = (Array.isArray(p.domains) ? p.domains : []).map(String);
    // Practice ids: real questions, in one of the principle's domains.
    const practiceIds = [];
    for (const q of strList(p.practice_ids)) {
      if (questionDomains) {
        const d = questionDomains.get(q);
        if (!d) {
          problems.push(`${where} lists practice id ${q}, which is not in the question bank`);
          continue;
        }
        if (domains.length && !domains.includes(d)) {
          problems.push(`${where} lists ${q} (Domain ${d}), outside its domains ${domains.join(', ')}`);
          continue;
        }
      }
      if (!practiceIds.includes(q)) practiceIds.push(q);
    }
    if (practiceIds.length === 0) warnings.push(`${where} has no practice questions (no "Practice this" button)`);
    const nuance = str(p.nuance);
    principles.push({
      id,
      family,
      order: Number(p.order) || 0,
      title: str(p.title),
      rule: str(p.rule),
      why: str(p.why),
      triggers: strList(p.triggers),
      trap: { move: str(p.trap && p.trap.move), whyWrong: str(p.trap && p.trap.why_wrong) },
      example: { scenario: str(p.example && p.example.scenario), answer: str(p.example && p.example.answer) },
      ...(nuance ? { nuance } : {}),
      domains,
      subtopics: strList(p.subtopics),
      practiceIds,
      slipPattern: str(p.slip_pattern) || null,
      legacyIds: strList(p.legacy_ids),
      aliases: strList(p.aliases),
    });
  }
  // Reading order: family order, then the principle's order inside it.
  const familyRank = new Map(families.map((f, i) => [f.id, i]));
  principles.sort((a, b) => (familyRank.get(a.family) ?? 99) - (familyRank.get(b.family) ?? 99) || a.order - b.order);

  // ── Slip map: mistake pattern → principle (or null) ─────────────────
  const slipMap = {};
  const rawMap = raw.slip_map && typeof raw.slip_map === 'object' ? raw.slip_map : {};
  for (const [pattern, target] of Object.entries(rawMap)) {
    if (target === null) {
      slipMap[pattern] = null;
    } else if (typeof target === 'string' && ids.has(target)) {
      slipMap[pattern] = target;
    } else {
      problems.push(`slip_map "${pattern}" points at an unknown principle "${target}"`);
    }
  }

  return { pack: { certId, families, principles, slipMap }, problems, warnings, skipped: null };
}

module.exports = { buildPrinciplesPack, emptyPack };
