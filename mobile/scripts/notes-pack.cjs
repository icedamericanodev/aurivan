/**
 * notes-pack.cjs — turns ../data/cisa_notes.json (topic notes, schema v2)
 * into the mobile app's "notes pack".
 *
 * WHY A SEPARATE .cjs FILE (plain English):
 *   build-content.mjs is an ES module, and Jest cannot load ES modules
 *   without extra setup. Keeping the pure "reshape the notes" logic in this
 *   CommonJS file lets BOTH the build script and the Jest tests use it.
 *   No third-party packages, no file access: data in, data out.
 *
 * WHAT IT DOES:
 *   1. Only accepts `schema_version: 2`. Anything else (today's v1 file)
 *      gives an EMPTY pack, so the app keeps working and the Study notes
 *      entry hides itself until the writers finish v2.
 *   2. Renames fields to the app's camelCase shape (src/content/notes/types.ts).
 *   3. Drops what the app never shows: exam_weight (the weights live only in
 *      src/content/certifications.ts), legacy_ids (web-only tick carry-over).
 *   4. Checks every illustration. An SVG that is not simple, well-formed
 *      and safe is DROPPED with a warning (the screen just skips it).
 *   5. Carries `practice_ids` (the bank questions that test a subtopic) as
 *      `practiceIds`. When the build passes the question ids it just wrote,
 *      every practice id must exist and belong to the subtopic's domain;
 *      a bad id is a PROBLEM (the build fails), because a "Practice this
 *      concept" button that opens the wrong questions would mislead.
 */

// Elements our diagrams may use. Anything else (script, image, foreignObject,
// use, filter…) means the SVG is dropped: react-native-svg can't draw some of
// them, and an <image href> could make the app fetch from the network.
const ALLOWED_TAGS = new Set([
  'svg', 'g', 'line', 'path', 'rect', 'circle', 'ellipse', 'polyline', 'polygon',
  'text', 'tspan', 'defs', 'marker', 'title', 'desc',
]);

/**
 * Validate one v1/v2 illustration ({ svg, caption }) and prepare it for the app.
 * Returns { ok: true, value } or { ok: false, reason }.
 */
function prepareIllustration(ill) {
  if (!ill || typeof ill !== 'object' || typeof ill.svg !== 'string') {
    return { ok: false, reason: 'no svg string' };
  }
  let svg = ill.svg.trim();
  if (!/^<svg[\s>]/.test(svg) || !/<\/svg>$/.test(svg)) {
    return { ok: false, reason: 'does not start with <svg and end with </svg>' };
  }
  // Dangerous or network-reaching content: event handlers, scripts, links.
  if (/\son[a-z]+\s*=/i.test(svg) || /javascript:/i.test(svg) || /\b(?:xlink:)?href\s*=/i.test(svg)) {
    return { ok: false, reason: 'contains an event handler or link' };
  }

  // The viewBox gives the drawing's shape, so the app can scale it to the
  // screen width and keep the height in proportion.
  const rootTag = svg.slice(0, svg.indexOf('>') + 1);
  const vb = /viewBox\s*=\s*['"]([^'"]+)['"]/.exec(rootTag);
  const nums = vb ? vb[1].trim().split(/[\s,]+/).map(Number) : [];
  if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n)) || nums[2] <= 0 || nums[3] <= 0) {
    return { ok: false, reason: 'missing or invalid viewBox' };
  }

  // Walk every tag: only allowed elements, and every open tag is closed.
  const stack = [];
  const TAG_RE = /<(\/?)([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g;
  const withoutComments = svg.replace(/<!--[\s\S]*?-->/g, '');
  // Text outside tags must not contain a stray "<" (a broken tag).
  if (/<(?![a-zA-Z/])/.test(withoutComments)) return { ok: false, reason: 'stray "<"' };
  let m;
  while ((m = TAG_RE.exec(withoutComments))) {
    const [, closing, name, selfClosing] = m;
    const tag = name.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return { ok: false, reason: `unsupported element <${name}>` };
    if (closing) {
      if (stack.pop() !== tag) return { ok: false, reason: `mismatched </${name}>` };
    } else if (!selfClosing) {
      stack.push(tag);
    }
  }
  if (stack.length) return { ok: false, reason: `unclosed <${stack[stack.length - 1]}>` };

  // The spoken description comes from aria-label; the wrapper View speaks it,
  // so it is removed from the SVG itself (no double announcement).
  const label = (/aria-label\s*=\s*(['"])([\s\S]*?)\1/.exec(rootTag) || [])[2] || '';
  const cleanRoot = rootTag
    .replace(/\s+aria-label\s*=\s*(['"])[\s\S]*?\1/, '')
    .replace(/\s+role\s*=\s*(['"])[^'"]*\1/, '');
  svg = cleanRoot + svg.slice(rootTag.length);

  const caption = typeof ill.caption === 'string' && ill.caption.trim() ? ill.caption.trim() : undefined;
  return {
    ok: true,
    value: { svg, label: label || caption || 'Diagram', caption, width: nums[2], height: nums[3] },
  };
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strList = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

/**
 * Check a subtopic's `practice_ids` and return the clean list (may be empty).
 * `questionDomains` is a Map of question id → domain id ("d4_012" → "4"),
 * or null when the caller has no question list (then only the shape is checked).
 * Bad ids go to `problems`: the build fails rather than ship a broken link.
 */
function preparePracticeIds(raw, domainId, where, questionDomains, problems) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    problems.push(`${where}: practice_ids must be a list of question ids`);
    return [];
  }
  const out = [];
  for (const item of raw) {
    const id = str(item);
    if (!id) {
      problems.push(`${where}: practice_ids has an empty or non-text entry`);
      continue;
    }
    if (out.includes(id)) continue; // a repeat would ask the same question twice
    if (questionDomains) {
      const qDomain = questionDomains.get(id);
      if (qDomain === undefined) {
        problems.push(`${where}: practice id ${id} is not in the question bank`);
        continue;
      }
      if (qDomain !== domainId) {
        problems.push(`${where}: practice id ${id} is from domain ${qDomain}, not domain ${domainId}`);
        continue;
      }
    }
    out.push(id);
  }
  return out;
}

/** One subtopic → app shape. `problems` = fatal (subtopic skipped); `warnings` = a part dropped. */
function toSubtopic(s, domainId, topicId, problems, warnings, questionDomains) {
  const id = str(s && s.id);
  const where = id || `${topicId}.?`;
  const sub = {
    id,
    domainId,
    topicId,
    name: str(s.name),
    definition: str(s.definition),
    whyItMatters: str(s.why_it_matters),
    howItWorks: strList(s.how_it_works),
    example: str(s.example),
    isacaRule: str(s.isaca_rule),
    examTraps: (Array.isArray(s.exam_traps) ? s.exam_traps : [])
      .map((t) => ({ trap: str(t && t.trap), why: str(t && t.why) }))
      .filter((t) => t.trap && t.why),
    keyTerms: (Array.isArray(s.key_terms) ? s.key_terms : [])
      .map((t) => ({ term: str(t && t.term), definition: str(t && t.definition) }))
      .filter((t) => t.term && t.definition),
  };
  // Required fields: without these the subtopic would render half-empty.
  const missing = ['id', 'name', 'definition', 'whyItMatters', 'example', 'isacaRule'].filter((k) => !sub[k]);
  if (!sub.howItWorks.length) missing.push('howItWorks');
  if (missing.length) {
    problems.push(`${where}: missing ${missing.join(', ')}`);
    return null;
  }

  // Optional parts: a malformed one is dropped, the rest of the subtopic stays.
  if (s.compare) {
    const columns = strList(s.compare.columns);
    const rows = (Array.isArray(s.compare.rows) ? s.compare.rows : []).map((r) => ({
      label: str(r && r.label),
      cells: strList(r && r.cells),
    }));
    const ok = columns.length >= 2 && rows.length > 0 && rows.every((r) => r.label && r.cells.length === columns.length);
    if (ok) sub.compare = { columns, rows };
    else warnings.push(`${where}: compare table dropped (every row needs a label and one cell per column)`);
  }
  if (Array.isArray(s.types)) {
    const types = s.types
      .map((t) => ({ term: str(t && t.term), meaning: str(t && t.meaning) }))
      .filter((t) => t.term && t.meaning);
    if (types.length) sub.types = types;
  }
  // `illustration` is one { svg, caption } or a list of them (v1 allowed both).
  // The app always gets a list; each bad drawing is dropped on its own.
  if (s.illustration) {
    const list = Array.isArray(s.illustration) ? s.illustration : [s.illustration];
    const good = [];
    list.forEach((item, i) => {
      const ill = prepareIllustration(item);
      if (ill.ok) good.push(ill.value);
      else warnings.push(`${where}: illustration${list.length > 1 ? ` ${i + 1}` : ''} dropped (${ill.reason})`);
    });
    if (good.length) sub.illustrations = good;
  }
  if (str(s.analogy)) sub.analogy = str(s.analogy);
  if (str(s.memory_aid)) sub.memoryAid = str(s.memory_aid);
  // Optional: omitted when empty, so the screen simply hides the button.
  const practiceIds = preparePracticeIds(s.practice_ids, domainId, where, questionDomains, problems);
  if (practiceIds.length) sub.practiceIds = practiceIds;
  return sub;
}

/**
 * Writers may deliver a domain in two halves ({ domain_number: 4, partial: "A" }
 * and "B"). If both halves reach the file, merge them into one domain, so a
 * domain id is never listed twice: domain-level fields from whichever half
 * has them (Part A by convention), topics in Part order. Sorted by number.
 */
function mergeSplitDomains(list) {
  const byNumber = new Map();
  const halves = list
    .filter((d) => d && Number.isInteger(d.domain_number))
    .sort((a, b) => a.domain_number - b.domain_number || String(a.partial || '').localeCompare(String(b.partial || '')));
  for (const d of halves) {
    const cur = byNumber.get(d.domain_number);
    if (!cur) {
      byNumber.set(d.domain_number, { ...d, topics: [...(Array.isArray(d.topics) ? d.topics : [])] });
      continue;
    }
    for (const k of ['overview', 'analogy']) if (!str(cur[k]) && str(d[k])) cur[k] = d[k];
    if (!(Array.isArray(cur.parts) && cur.parts.length) && Array.isArray(d.parts)) cur.parts = d.parts;
    if (!cur.key_terminologies && d.key_terminologies) cur.key_terminologies = d.key_terminologies;
    cur.topics.push(...(Array.isArray(d.topics) ? d.topics : []));
  }
  return [...byNumber.values()];
}

/** An empty pack: the app treats it as "no study notes yet". */
function emptyPack(certId) {
  return { certId, schemaVersion: 2, domains: [], strategyTips: [], connections: [] };
}

/**
 * Build the notes pack from the raw notes file.
 * Returns { pack, problems, warnings, skipped } where `skipped` names why
 * the pack is empty (e.g. "schema v1"), or null.
 *
 * `opts.questions` (optional): the cert's questions as [{ id, domainId }]
 * (the content pack). When given, every `practice_ids` entry is checked
 * against it. build-content.mjs always passes it; tests may leave it out.
 */
function buildNotesPack(raw, certId = 'cisa', opts = {}) {
  const problems = [];
  const warnings = [];
  const questionDomains = Array.isArray(opts.questions)
    ? new Map(opts.questions.map((q) => [String(q.id), String(q.domainId)]))
    : null;
  if (!raw || typeof raw !== 'object' || raw.schema_version !== 2) {
    const v = raw && typeof raw === 'object' && raw.schema_version != null ? raw.schema_version : 1;
    return { pack: emptyPack(certId), problems, warnings, skipped: `schema v${v}` };
  }

  const domains = mergeSplitDomains(Array.isArray(raw.domains) ? raw.domains : [])
    .map((d) => {
      const domainId = String(d.domain_number);
      const topics = (Array.isArray(d.topics) ? d.topics : []).map((t) => {
        const topicId = str(t && t.topic_id);
        const subtopics = (Array.isArray(t.subtopics) ? t.subtopics : [])
          .map((s) => toSubtopic(s || {}, domainId, topicId, problems, warnings, questionDomains))
          .filter(Boolean);
        return {
          id: topicId,
          name: str(t.topic_name),
          overview: str(t.overview),
          canDo: strList(t.can_do),
          subtopics,
        };
      }).filter((t) => t.id && t.subtopics.length);
      const terms = d.key_terminologies && typeof d.key_terminologies === 'object' ? d.key_terminologies : {};
      return {
        id: domainId,
        overview: str(d.overview),
        analogy: str(d.analogy),
        parts: (Array.isArray(d.parts) ? d.parts : [])
          .map((p) => ({ part: str(p && p.part), name: str(p && p.name), topicIds: strList(p && p.topic_ids) }))
          .filter((p) => p.part),
        topics,
        keyTerms: Object.entries(terms)
          .filter(([k, v]) => !k.startsWith('_') && typeof v === 'string')
          .map(([term, definition]) => ({ term: term.trim(), definition: definition.trim() })),
      };
    })
    .filter((d) => d.topics.length);

  // Subtopic ids key the learner's "read" ticks, so they must be unique.
  const seen = new Set();
  for (const d of domains) {
    for (const t of d.topics) {
      for (const s of t.subtopics) {
        if (seen.has(s.id)) problems.push(`${s.id}: duplicate subtopic id`);
        seen.add(s.id);
      }
    }
  }

  return {
    pack: {
      certId,
      schemaVersion: 2,
      domains,
      strategyTips: strList(raw.exam_strategy_tips),
      connections: (Array.isArray(raw.cross_domain_connections) ? raw.cross_domain_connections : [])
        .map((c) => ({ connection: str(c && c.connection), note: str(c && c.note) }))
        .filter((c) => c.connection),
    },
    problems,
    warnings,
    skipped: null,
  };
}

module.exports = { buildNotesPack, prepareIllustration, emptyPack };
