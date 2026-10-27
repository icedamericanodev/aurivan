/**
 * lessons-pack.cjs — turns ../data/lessons/<cert>.json (the motion lessons,
 * schema: docs/content/LESSONS_SCHEMA.md) into the mobile app's "lessons pack"
 * (src/content/generated/<cert>/lessons.json).
 *
 * WHY A SEPARATE .cjs FILE (plain English):
 *   build-content.mjs is an ES module, and Jest cannot load ES modules
 *   without extra setup. Keeping the pure "check and tidy the lessons" logic
 *   in this CommonJS file lets BOTH the build script and the Jest tests use
 *   it (the same trick as notes-pack.cjs). No packages, no file access.
 *
 * WHAT IT DOES:
 *   1. Only accepts `schema_version: 1`. A missing file or another version
 *      gives an EMPTY pack (no lessons), so the app keeps working.
 *   2. Keeps every lesson exactly as written (same ids, same scene order,
 *      same field names as src/content/lessons/types.ts), except author
 *      notes: any field whose name starts with "_" (e.g. `_comment`) is
 *      dropped, at any depth, so the app never carries them.
 *   3. Checks what the app relies on. Each one is a PROBLEM (the build
 *      fails), because a broken lesson would mislead or strand a learner:
 *        - ids are unique, lower-case words and dashes, and name this cert;
 *        - each lesson has the basic fields (domain, order, title, minutes,
 *          provenance, references, outline version, review date);
 *        - `order` runs 1, 2, 3… inside each domain, with no gaps;
 *        - every scene is a known type with the fields its template draws,
 *          and every check's `correctIndex` points at a real option;
 *        - `prepares` names real questions and `notes` real study notes
 *          (when the build passes them in).
 *      The deeper house rules (sentence case, fair checks, outline codes)
 *      stay in src/__tests__/lessons.test.ts.
 */

/** Empty pack: the app treats it as "no lessons for this cert". */
function emptyPack() {
  return [];
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isStrList = (v) => Array.isArray(v) && v.every(isStr);
const isSteps = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => isObj(x) && isStr(x.label) && typeof x.note === 'string');

/** Lesson ids: stable forever (progress is keyed on them), so a tidy shape. */
const LESSON_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The fields each scene template needs (src/components/lesson.tsx). A scene
 * type not listed here is a PROBLEM at build time: the app has no template
 * to draw it (a new type needs an app release first).
 */
const SCENES = {
  title: (s) => isStr(s.kicker) && isStr(s.title) && typeof s.subtitle === 'string',
  idea: (s) => isStr(s.heading) && isStr(s.body),
  analogy: (s) => isStr(s.heading) && isStr(s.body),
  stack: (s) => isStr(s.heading) && isSteps(s.layers),
  flow: (s) => isStr(s.heading) && isSteps(s.steps),
  compare: (s) =>
    isStr(s.heading) && isObj(s.left) && isObj(s.right) && isStr(s.left.title) && isStr(s.right.title) && isStrList(s.left.points) && isStrList(s.right.points),
  trap: (s) => isStr(s.heading) && isStr(s.trap) && isStr(s.why),
  tip: (s) => isStr(s.body),
  check: (s) =>
    isStr(s.question) &&
    isStrList(s.options) &&
    s.options.length >= 2 &&
    Number.isInteger(s.correctIndex) &&
    s.correctIndex >= 0 &&
    s.correctIndex < s.options.length &&
    isStr(s.explanation),
};

/** A copy without author-only fields ("_comment"), at any depth. */
function stripAuthorFields(value) {
  if (Array.isArray(value)) return value.map(stripAuthorFields);
  if (!isObj(value)) return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) if (!k.startsWith('_')) out[k] = stripAuthorFields(v);
  return out;
}

/**
 * Build the pack. `opts` (all optional): `domains` (this cert's domain ids),
 * `questions` ([{ id }], to check `prepares`) and `noteIds` (a Set of study
 * note ids, to check `notes`). Returns { pack, problems, warnings, skipped }
 * (`skipped` says why the pack is empty).
 */
function buildLessonsPack(raw, certId = 'cisa', opts = {}) {
  const problems = [];
  const warnings = [];
  if (raw === null || raw === undefined) return { pack: emptyPack(), problems, warnings, skipped: 'no' };
  if (!isObj(raw) || raw.schema_version !== 1) {
    return { pack: emptyPack(), problems, warnings, skipped: `a schema_version ${isObj(raw) ? raw.schema_version : '?'}` };
  }
  if (raw.certification && raw.certification !== certId) problems.push(`lessons file is for "${raw.certification}", not "${certId}"`);
  const lessons = Array.isArray(raw.lessons) ? raw.lessons : [];
  if (lessons.length === 0) problems.push('the lessons file has no lessons');

  const domains = Array.isArray(opts.domains) ? new Set(opts.domains.map(String)) : null;
  const questionIds = Array.isArray(opts.questions) ? new Set(opts.questions.map((q) => q.id)) : null;
  const noteIds = opts.noteIds instanceof Set && opts.noteIds.size > 0 ? opts.noteIds : null;
  const seen = new Set();
  const ordersByDomain = new Map();

  lessons.forEach((l, i) => {
    const id = isObj(l) && typeof l.id === 'string' ? l.id : '';
    const where = `lesson ${id || `#${i + 1}`}`;
    if (!isObj(l)) {
      problems.push(`${where} is not an object`);
      return;
    }
    if (!LESSON_ID.test(id)) problems.push(`${where} needs an id of lower-case words and dashes`);
    if (seen.has(id)) problems.push(`${where} appears twice (ids are stable forever: never reuse one)`);
    seen.add(id);
    if (l.certId !== certId) problems.push(`${where} has certId "${l.certId}", not "${certId}"`);
    if (!isStr(l.domainId) || (domains && !domains.has(l.domainId))) problems.push(`${where} has an unknown domainId "${l.domainId}"`);
    if (!Number.isInteger(l.order) || l.order < 1) problems.push(`${where} needs an order of 1 or more`);
    else ordersByDomain.set(l.domainId, [...(ordersByDomain.get(l.domainId) ?? []), l.order]);
    if (!isStr(l.title)) problems.push(`${where} has no title`);
    if (typeof l.minutes !== 'number' || !(l.minutes > 0)) problems.push(`${where} needs minutes above 0`);
    if (!isStr(l.provenance)) problems.push(`${where} has no provenance`);
    if (!isStrList(l.references) || l.references.length === 0) problems.push(`${where} needs at least one reference`);
    if (!isStr(l.outlineVersion)) problems.push(`${where} has no outlineVersion`);
    if (typeof l.lastReviewed !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(l.lastReviewed)) problems.push(`${where} needs lastReviewed as YYYY-MM-DD`);
    for (const key of ['topics', 'prepares', 'notes']) {
      if (l[key] !== undefined && !isStrList(l[key])) problems.push(`${where} has a ${key} that is not a list of ids`);
    }
    if (l.retired !== undefined && typeof l.retired !== 'boolean') problems.push(`${where} has a retired flag that is not true or false`);
    if (questionIds && isStrList(l.prepares)) {
      for (const q of l.prepares) if (!questionIds.has(q)) problems.push(`${where} prepares "${q}", which is not a question in the ${certId} bank`);
    }
    if (noteIds && isStrList(l.notes)) {
      for (const n of l.notes) if (!noteIds.has(n)) problems.push(`${where} links note "${n}", which is not in the ${certId} notes`);
    }
    if (!Array.isArray(l.scenes) || l.scenes.length === 0) {
      problems.push(`${where} has no scenes`);
      return;
    }
    l.scenes.forEach((s, j) => {
      const at = `${where} scene ${j + 1}`;
      const check = isObj(s) ? SCENES[s.type] : undefined;
      if (!check) problems.push(`${at} has an unknown type "${isObj(s) ? s.type : typeof s}"`);
      else if (!check(s)) problems.push(`${at} (${s.type}) is missing a field its template needs`);
    });
  });

  // `order` is the position inside the domain: 1, 2, 3… with no gaps.
  for (const [domainId, orders] of ordersByDomain) {
    const sorted = [...orders].sort((a, b) => a - b);
    if (sorted.some((o, k) => o !== k + 1)) problems.push(`Domain ${domainId} lesson orders are ${sorted.join(', ')}: they must run 1, 2, 3… with no gaps`);
  }

  return { pack: stripAuthorFields(lessons), problems, warnings, skipped: null };
}

module.exports = { buildLessonsPack, emptyPack, stripAuthorFields, SCENE_TYPES: Object.keys(SCENES) };
