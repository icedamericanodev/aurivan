/**
 * terms-pack.cjs: the small key-terms pack for the Key term home-screen
 * widget (mobile 1.48), built from the study-notes pack.
 *
 * Plain English: each domain of the notes has a short glossary
 * (`key_terminologies` in ../data/cisa_notes.json, `keyTerms` in the built
 * notes pack). The widget shows one of those terms a day and reveals its
 * meaning. The app could read them from notes.json, but that file is over a
 * megabyte, and the widget data is written after every session: a separate
 * file of a few kilobytes keeps that write light.
 *
 * Each term keeps:
 *   - `id`: "t<domain>_<n>", its place in the domain's glossary;
 *   - `term`: the words to show ("Recovery point objective");
 *   - `short`: its abbreviation, when the glossary gives one ("RPO");
 *   - `meaning`: the glossary's one-line meaning, as written (a term whose
 *     meaning is longer than MEANING_MAX is left out: it would not fit a widget);
 *   - `note`: the study note that teaches it (a subtopic id such as "4B1.2"),
 *     or the domain id when no single note does (the tap then opens the domain).
 *
 * CommonJS so Jest can test it (src/__tests__/terms-pack.test.ts).
 */

/** A meaning longer than this doesn't fit a 2×2 widget at normal text, so the term stays out. */
const MEANING_MAX = 160;

/** "Recovery point objective (RPO)" → name + short; "ITAF (IT Audit Framework)" → short + name. */
function splitTerm(raw) {
  const t = String(raw || '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return { term: t, short: '' };
  const [, before, inside] = m;
  const isAbbrev = (s) => /^[A-Z0-9][A-Za-z0-9&/-]{1,9}$/.test(s) && /[A-Z].*[A-Z]|[A-Z]{2}/.test(s);
  if (isAbbrev(inside) && !isAbbrev(before)) return { term: before, short: inside };
  if (isAbbrev(before) && !isAbbrev(inside)) return { term: inside, short: before };
  return { term: t, short: '' };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The subtopic that teaches a term: one that lists it, one named for it (or for its abbreviation), or one that defines it. */
function noteFor(domain, term, short) {
  const subs = domain.topics.flatMap((t) => t.subtopics);
  const name = term.toLowerCase();
  const ab = short.toLowerCase();
  const listed = subs.find((s) =>
    (s.keyTerms || []).some((k) => {
      const kk = String(k.term || '').toLowerCase();
      return kk === name || kk.startsWith(name) || (ab && (kk === ab || kk.includes(`(${ab})`)));
    }),
  );
  if (listed) return listed.id;
  const named = subs.find((s) => {
    const n = String(s.name || '').toLowerCase();
    return n && (n.includes(name) || name.includes(n));
  });
  if (named) return named.id;
  // A note named for the abbreviation, as a whole word ("Recovery Objectives: RPO, RTO, MTD and MBCO" for RPO).
  if (short) {
    const abWord = new RegExp(`\\b${escapeRe(short)}\\b`);
    const byShort = subs.find((s) => abWord.test(String(s.name || '')));
    if (byShort) return byShort.id;
  }
  const word = new RegExp(`\\b${escapeRe(name)}\\b`, 'i');
  const defined = subs.find((s) => word.test(String(s.definition || '')));
  return defined ? defined.id : domain.id;
}

/** The terms pack for one certification, from its built notes pack. Never throws. */
function buildTermsPack(notes, certId) {
  const domains = {};
  for (const d of (notes && notes.domains) || []) {
    const list = [];
    (d.keyTerms || []).forEach((k, i) => {
      const { term, short } = splitTerm(k.term);
      const meaning = String(k.definition || '').replace(/\s+/g, ' ').trim();
      if (!term || !meaning || meaning.length > MEANING_MAX) return;
      list.push({ id: `t${d.id}_${i + 1}`, term, ...(short ? { short } : {}), meaning, note: noteFor(d, term, short) });
    });
    if (list.length) domains[d.id] = list;
  }
  return { certId, domains };
}

module.exports = { buildTermsPack, splitTerm, MEANING_MAX };
