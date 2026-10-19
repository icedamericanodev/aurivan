/**
 * exam-guide-pack.cjs — turns the two shared exam files into the mobile
 * app's "exam pack" for one certification:
 *   ../data/exam/cisa_exam_guide.json    → "About the CISA exam"
 *   ../data/exam/final_review_week.json  → "Final review week" (+ cheat sheet)
 * Schema and writing rules: docs/content/EXAM_GUIDE_SCHEMA.md.
 *
 * WHY A SEPARATE .cjs FILE (plain English):
 *   build-content.mjs is an ES module, and Jest cannot load ES modules
 *   without extra setup. Keeping the pure "reshape and check" logic in this
 *   CommonJS file lets BOTH the build and the Jest tests use it (the same
 *   trick as notes-pack.cjs and principles-pack.cjs). No packages, no files.
 *
 * WHAT IT DOES:
 *   1. Each file is optional. A missing file (or another schema version)
 *      gives `null` for that half, and the app hides the rows that lead to
 *      it. Both missing: an empty pack, never a failed build.
 *   2. Renames fields to the app's camelCase shape (src/content/exam/types.ts)
 *      and drops what the app never shows.
 *   3. Checks the facts the app relies on. Each one is a PROBLEM (the build
 *      fails), because a broken link would strand a learner:
 *        - every note code (task targets and cheat-sheet points) is a real
 *          topic or subtopic in this cert's notes;
 *        - every principle id (task targets and the cheat sheet's list) is a
 *          real principle or family; `top_slip` is the only other target;
 *        - every action kind is one the app knows how to open, and a
 *          practice action names a real domain, `focus` or `next_focus`;
 *        - every cheat-sheet part a task asks for exists;
 *        - source links are https (they open in the browser);
 *        - the guide's domain weights match the app's (certifications.ts);
 *        - no learner-facing text says "stem" (the app says "question").
 *      The deeper writing rules (word limits, spelling, official hosts,
 *      dates) stay with ../scripts/lint_exam_guide.py.
 */

/** The action kinds the app can open (src/content/exam/types.ts TaskAction). */
const ACTION_KINDS = ['note', 'principles', 'practice_domain', 'mock_mini', 'mock_full', 'mistakes', 'glossary'];
/** Cheat-sheet parts besides the domain ids. */
const SHEET_PARTS = ['focus', 'next_focus', 'principles', 'priority_words', 'routine', 'pace'];

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strList = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : []);
const isObj = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Empty pack: the app treats each null half as "not for this cert". */
function emptyPack(certId) {
  return { certId, guide: null, week: null };
}

/**
 * "stem" in anything a learner reads: the app says "question". Walks every
 * string except the fields that are codes, links or dates, never shown as words.
 */
const STEM = /\bstem\b/i;
const NOT_WORDS = new Set(['id', 'url', 'target', 'note', 'ids', 'kind', 'sheet', 'certification', 'as_of', 'last_checked', 'updated', 'schema_version']);
function checkWords(where, value, problems, key = '') {
  if (NOT_WORDS.has(key)) return;
  if (typeof value === 'string') {
    if (STEM.test(value)) problems.push(`${where} says "stem"${key ? ` in ${key}` : ''}: learners read "question"`);
  } else if (Array.isArray(value)) {
    value.forEach((v) => checkWords(where, v, problems, key));
  } else if (isObj(value)) {
    for (const [k, v] of Object.entries(value)) checkWords(where, v, problems, k);
  }
}

/** The guide half ("About the exam"), or null. */
function buildGuide(raw, certId, opts, problems, warnings) {
  if (!isObj(raw)) return null;
  if (raw.schema_version !== 1) {
    warnings.push(`exam guide has schema_version ${raw.schema_version} (needs 1): left out`);
    return null;
  }
  if (raw.certification && raw.certification !== certId) problems.push(`exam guide is for "${raw.certification}", not "${certId}"`);
  checkWords('exam guide', raw, problems);
  const sections = [];
  const seen = new Set();
  for (const s of Array.isArray(raw.sections) ? raw.sections : []) {
    const id = str(s && s.id);
    const where = `guide section "${id || '?'}"`;
    if (!id) {
      problems.push('a guide section has no id');
      continue;
    }
    if (seen.has(id)) problems.push(`${where} appears twice`);
    seen.add(id);
    if (!str(s.title)) problems.push(`${where} has no title`);
    const items = strList(s.items);
    if (items.length === 0) problems.push(`${where} has no items`);
    const sources = [];
    for (const src of Array.isArray(s.sources) ? s.sources : []) {
      const label = str(src && src.label);
      const url = str(src && src.url);
      // Links open in the learner's browser: https only, never another scheme.
      if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(url)) {
        problems.push(`${where} has a source that is not an https link: "${url}"`);
        continue;
      }
      sources.push({ label: label || url, url });
    }
    const out = { id, title: str(s.title), summary: str(s.summary), items };
    const steps = strList(s.steps);
    if (steps.length) out.steps = steps;
    if (Array.isArray(s.domains)) {
      out.domains = s.domains.map((d) => ({ id: str(d && String(d.id)), name: str(d && d.name), weight: Number(d && d.weight) || 0 }));
      // The ids must be this exam's; the weights, when the caller passes them, must
      // match the app's own (certifications.ts mirrors DI in index.html). The build
      // passes ids only (weights live in certifications.ts alone); the Jest pack
      // test passes the weights too.
      if (Array.isArray(opts.domains)) {
        const app = new Map(opts.domains.map((d) => [String(d.id), d.weight === undefined ? undefined : Number(d.weight)]));
        for (const d of out.domains) {
          if (!app.has(d.id)) problems.push(`${where} lists Domain ${d.id}, which this exam does not have`);
          else if (app.get(d.id) !== undefined && app.get(d.id) !== d.weight) problems.push(`${where} gives Domain ${d.id} ${d.weight}%, the app says ${app.get(d.id)}%`);
        }
      }
    }
    out.sources = sources;
    const asOf = str(s.as_of);
    if (asOf) out.asOf = asOf;
    sections.push(out);
  }
  if (sections.length === 0) problems.push('the exam guide has no sections');
  return {
    title: str(raw.title),
    description: str(raw.description),
    lastChecked: str(raw.last_checked),
    disclaimer: str(raw.disclaimer),
    checkBeforeBooking: str(raw.check_before_booking),
    sections,
  };
}

/**
 * The final-week half, or null. `ctx` knows this cert's note codes,
 * principle and family ids, and domain ids, to check every link.
 */
function buildWeek(raw, certId, ctx, problems, warnings) {
  if (!isObj(raw)) return null;
  if (raw.schema_version !== 1) {
    warnings.push(`final review week has schema_version ${raw.schema_version} (needs 1): left out`);
    return null;
  }
  if (raw.certification && raw.certification !== certId) problems.push(`final review week is for "${raw.certification}", not "${certId}"`);
  checkWords('final review week', raw, problems);

  const noteOk = (code) => !ctx.noteDomains || ctx.noteDomains.has(code);
  const principleOk = (id) => !ctx.principleIds || ctx.principleIds.has(id) || ctx.familyIds.has(id);
  const domainOk = (id) => !ctx.domainIds || ctx.domainIds.includes(id);
  const sheetParts = new Set([...(ctx.domainIds || ['1', '2', '3', '4', '5']), ...SHEET_PARTS]);

  // ── Days ────────────────────────────────────────────────────────────
  const days = [];
  for (const d of Array.isArray(raw.days) ? raw.days : []) {
    const id = str(d && d.id);
    const where = `day "${id || '?'}"`;
    const daysBefore = Number(d && d.days_before);
    if (!id || !Number.isInteger(daysBefore)) {
      problems.push(`${where} has no id or days_before`);
      continue;
    }
    if (id !== `day-${daysBefore}`) problems.push(`${where} should be "day-${daysBefore}"`);
    const tasks = [];
    for (const t of Array.isArray(d.tasks) ? d.tasks : []) {
      const text = str(t && t.text);
      if (!text) {
        problems.push(`${where} has a task with no text`);
        continue;
      }
      const task = { text };
      if (t.action !== undefined) {
        const kind = str(t.action && t.action.kind);
        const target = t.action && t.action.target !== undefined ? str(String(t.action.target)) : '';
        if (!ACTION_KINDS.includes(kind)) {
          problems.push(`${where} has an unknown action kind "${kind}"`);
        } else {
          if (kind === 'note' && target && !noteOk(target)) problems.push(`${where} links note "${target}", which is not in the notes`);
          if (kind === 'principles' && target && target !== 'top_slip' && !principleOk(target)) {
            problems.push(`${where} links principle "${target}", which is not a principle or family`);
          }
          if (kind === 'practice_domain' && !(target === 'focus' || target === 'next_focus' || (target && domainOk(target)))) {
            problems.push(`${where} practices "${target}": needs a domain id, "focus" or "next_focus"`);
          }
          if (['mock_mini', 'mock_full', 'mistakes'].includes(kind) && target) {
            warnings.push(`${where}: a ${kind} action takes no target ("${target}" ignored)`);
          }
          task.action = target && !['mock_mini', 'mock_full', 'mistakes'].includes(kind) ? { kind, target } : { kind };
        }
      }
      const sheet = strList(t.sheet);
      for (const part of sheet) if (!sheetParts.has(part)) problems.push(`${where} asks for an unknown cheat-sheet part "${part}"`);
      if (sheet.length) task.sheet = sheet;
      tasks.push(task);
    }
    if (tasks.length === 0) problems.push(`${where} has no tasks`);
    days.push({ id, daysBefore, title: str(d.title), goal: str(d.goal), tasks, remember: str(d.remember) });
  }
  // Counting down: 7, 6, … 1 (the screens and Today rely on it).
  days.sort((a, b) => b.daysBefore - a.daysBefore);
  if (days.length === 0) problems.push('the final review week has no days');

  // ── Cheat sheet ─────────────────────────────────────────────────────
  const cs = isObj(raw.cheat_sheet) ? raw.cheat_sheet : {};
  const sheetDomains = [];
  for (const sd of Array.isArray(cs.domains) ? cs.domains : []) {
    const id = str(sd && String(sd.id));
    if (!domainOk(id)) problems.push(`cheat sheet lists Domain "${id}", which this exam does not have`);
    const points = [];
    for (const p of Array.isArray(sd.points) ? sd.points : []) {
      const text = str(p && p.text);
      if (!text) continue;
      const note = str(p.note);
      if (note && !noteOk(note)) problems.push(`cheat sheet Domain ${id} links note "${note}", which is not in the notes`);
      else if (note && ctx.noteDomains && ctx.noteDomains.get(note) !== id) problems.push(`cheat sheet Domain ${id} links note "${note}" from another domain`);
      points.push(note ? { text, note } : { text });
    }
    sheetDomains.push({ id, name: str(sd.name), points });
  }
  const principleList = isObj(cs.principles) ? cs.principles : {};
  const ids = strList(principleList.ids);
  for (const pid of ids) {
    if (ctx.principleIds && !ctx.principleIds.has(pid)) problems.push(`cheat sheet lists principle "${pid}", which is not in the principles`);
  }
  const cheatSheet = {
    domains: sheetDomains,
    principles: { intro: str(principleList.intro), ids },
    priorityWords: (Array.isArray(cs.priority_words) ? cs.priority_words : [])
      .map((w) => ({ word: str(w && w.word), meaning: str(w && w.meaning), cue: str(w && w.cue) }))
      .filter((w) => w.word),
    routine: (Array.isArray(cs.answering_routine) ? cs.answering_routine : [])
      .map((s) => ({ title: str(s && s.title), text: str(s && s.text) }))
      .filter((s) => s.title),
    pace: strList(cs.pace),
  };

  const lists = isObj(raw.checklists) ? raw.checklists : {};
  return {
    title: str(raw.title),
    updated: str(raw.updated),
    intro: str(raw.intro),
    howItWorks: strList(raw.how_it_works),
    days,
    checklists: { eve: strList(lists.eve), morning: strList(lists.morning) },
    cheatSheet,
  };
}

/**
 * Build the pack. Either raw file may be null (missing).
 * `opts` (all optional, for checking links):
 *   notes:      the cert's notes pack (built just before), for note codes;
 *   principles: the cert's principles pack, for principle and family ids;
 *   domains:    [{ id, weight }] from the cert, for domain ids and weights.
 * Returns { pack, problems, warnings, skipped } (`skipped` says why it is empty).
 */
function buildExamPack(rawGuide, rawWeek, certId = 'cisa', opts = {}) {
  const problems = [];
  const warnings = [];
  // Every topic and subtopic code → its domain ("1B3" and "1B3.2" → "1").
  let noteDomains = null;
  if (opts.notes && Array.isArray(opts.notes.domains)) {
    noteDomains = new Map();
    for (const d of opts.notes.domains) {
      for (const t of d.topics || []) {
        noteDomains.set(t.id, String(d.id));
        for (const s of t.subtopics || []) noteDomains.set(s.id, String(s.domainId || d.id));
      }
    }
  }
  const ctx = {
    noteDomains,
    principleIds: opts.principles ? new Set((opts.principles.principles || []).map((p) => p.id)) : null,
    familyIds: opts.principles ? new Set((opts.principles.families || []).map((f) => f.id)) : new Set(),
    domainIds: Array.isArray(opts.domains) ? opts.domains.map((d) => String(d.id)) : null,
  };
  const guide = buildGuide(rawGuide, certId, opts, problems, warnings);
  const week = buildWeek(rawWeek, certId, ctx, problems, warnings);
  const skipped = !guide && !week ? 'no' : null;
  return { pack: { certId, guide, week }, problems, warnings, skipped };
}

module.exports = { buildExamPack, emptyPack, ACTION_KINDS, SHEET_PARTS };
