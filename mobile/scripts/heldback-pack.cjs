/**
 * heldback-pack.cjs — reads a course's held-back form file and tags each of
 * its questions (docs/content/CIA_BANK_PLAN.md section 11, item 7).
 *
 * WHAT THE HELD-BACK FORM IS (plain English): one full exam, frozen and the
 * same for every learner, kept OUT of practice until the learner has taken
 * it, so that one try is a fair read. Afterwards its questions join practice
 * with their explanations (the app does that: content/loader.ts and
 * engine/heldBack.ts).
 *
 * THE FILE (one per pack, optional; written by the course's own tools):
 *   { "_meta": { "comment": "...", "frozen": "2026-11-27", "exam": "<pack id>" },
 *     "ids": ["q_d1_004", "q_d2_017", ...] }
 * Each listed question gets `heldBack: "<frozen date>"`. The frozen date is
 * the form's name: if a course ever freezes a new form, the new date makes
 * it a new form, and a learner who took the old one gets a fresh try at it.
 *
 * WHAT FAILS (a malformed file stops the build):
 *   - not an object, no `_meta` object, `_meta.frozen` not a real
 *     YYYY-MM-DD date, `_meta.exam` not text or not this pack's id;
 *   - `ids` not a list of 1 or more non-empty strings, or an id written twice;
 *   - an id this pack does not have, or a retired one (it is never dealt);
 *   - an id that is not on the exam yet at the frozen date (`testableFrom`
 *     after it): the form holds no dated questions.
 * `_meta.comment` is optional text.
 *
 * No file (null) = no held-back form: nothing is tagged, so every pack
 * without one stays byte-identical (CISA has none).
 *
 * CommonJS so Jest and the pack dry runs can use it, like siblings-pack.cjs.
 */
'use strict';

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written YYYY-MM-DD ("2026-02-30" is not one). */
function isDay(s) {
  const m = typeof s === 'string' ? DATE.exec(s) : null;
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/**
 * Check the raw file against this pack. Returns { form, problems }: `form` is
 * { key, ids } (key = the frozen date, ids in file order) when the file is
 * sound, else null. `questions`: the pack's questions (every domain).
 */
function readHeldBack(raw, { certId, questions }) {
  const problems = [];
  if (raw == null) return { form: null, problems };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { form: null, problems: ['the held-back file must be an object with "_meta" and "ids"'] };
  }
  const meta = raw._meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    problems.push('"_meta" must be an object');
  } else {
    if (!isDay(meta.frozen)) problems.push(`"_meta.frozen" must be a date (YYYY-MM-DD), got ${JSON.stringify(meta.frozen)}`);
    if (typeof meta.exam !== 'string') problems.push('"_meta.exam" must be text (the pack id)');
    else if (meta.exam !== certId) problems.push(`"_meta.exam" is "${meta.exam}", but this is the ${certId} pack`);
    if (meta.comment !== undefined && typeof meta.comment !== 'string') problems.push('"_meta.comment" must be text');
  }
  if (!Array.isArray(raw.ids) || raw.ids.length === 0 || raw.ids.some((id) => typeof id !== 'string' || !id.trim())) {
    problems.push('"ids" must be a list of one or more question ids');
    return { form: null, problems };
  }
  const byId = new Map(questions.map((q) => [q.id, q]));
  const frozen = meta && isDay(meta.frozen) ? meta.frozen : null;
  const seen = new Set();
  for (const id of raw.ids) {
    if (seen.has(id)) {
      problems.push(`${id} is written twice`);
      continue;
    }
    seen.add(id);
    const q = byId.get(id);
    if (!q) problems.push(`${id} is not a question of the ${certId} pack`);
    else if (q.retired) problems.push(`${id} is retired, so it can't be in the form`);
    else if (frozen && q.testableFrom && q.testableFrom > frozen) problems.push(`${id} is on the exam only from ${q.testableFrom}, after the form was frozen (${frozen})`);
  }
  if (problems.length) return { form: null, problems };
  return { form: { key: frozen, ids: [...raw.ids] }, problems };
}

/** Tag the form's questions (mutates them: adds `heldBack`). Returns how many were tagged. */
function tagHeldBack(form, questions) {
  if (!form) return 0;
  const want = new Set(form.ids);
  let tagged = 0;
  for (const q of questions) {
    if (!want.has(q.id)) continue;
    q.heldBack = form.key;
    tagged += 1;
  }
  return tagged;
}

module.exports = { readHeldBack, tagHeldBack, isDay };
