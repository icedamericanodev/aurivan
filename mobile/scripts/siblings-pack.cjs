/**
 * siblings-pack.cjs — reads a course's sibling-groups file and tags each pack
 * question that has a sibling in the same pack (docs/content/CIA_BANK_PLAN.md
 * section 11, item 5).
 *
 * WHAT A SIBLING GROUP IS (plain English): a few questions that teach the same
 * lesson in nearly the same way. The app keeps them apart: a mock takes at
 * most one of a group, and other sets keep them apart when they can
 * (src/engine/siblings.ts).
 *
 * THE FILE (one per course, optional; today only the CIA course has one):
 *   { "_meta": { ... },
 *     "groups": [ { "ids": ["cia2_d1_017", "cia1_d1_116"], "lesson": "..." } ] }
 * A group may name questions of several packs. Each pack uses only its own
 * ids: a question gets `siblingGroup` only when at least one OTHER question
 * of the same pack is in its group. One question may sit in two groups (a
 * lesson can neighbour two others); a question has ONE `siblingGroup`, so
 * inside a pack, groups that share a question are joined into one (the
 * cautious reading: a mock then holds at most one of all of them). The group
 * id is the joined group's first id in sorted order (short, and the same in
 * every build while the file is unchanged).
 *
 * A pack built from other packs' questions under new ids passes `aliases`
 * (source id → its own id), so a group written with the source ids reaches it.
 *
 * WHAT FAILS (a malformed file): not an object, no `groups` list, a group
 * that is not an object, an `ids` that is not a list of 2 or more non-empty
 * strings, or a `lesson` that is not text.
 * WHAT IS ONLY REPORTED (a warning, the build goes on): an id that no pack of
 * the course has (`knownIds`), a retired id (never dealt, so not grouped),
 * and an id written twice in one group.
 *
 * No file (null) = no groups, no problem: every pack stays byte-identical.
 * CommonJS so Jest and the pack dry runs (scripts/cia_pack_dry_run.cjs) can
 * use it, like notes-pack.cjs.
 */
'use strict';

/**
 * Check the raw file. Returns { groups, problems, warnings }: `groups` is a
 * list of { ids } (ids deduplicated, file order).
 * `knownIds` (optional Set): every question id of every pack of the course,
 * to report an id no pack has.
 */
function readSiblingGroups(raw, { knownIds } = {}) {
  const problems = [];
  const warnings = [];
  const groups = [];
  if (raw == null) return { groups, problems, warnings };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { groups, problems: ['the siblings file must be an object with a "groups" list'], warnings };
  }
  if (!Array.isArray(raw.groups)) {
    return { groups, problems: ['the siblings file has no "groups" list'], warnings };
  }
  raw.groups.forEach((g, n) => {
    const where = `group ${n + 1}`;
    if (!g || typeof g !== 'object' || Array.isArray(g)) {
      problems.push(`${where} is not an object`);
      return;
    }
    if (!Array.isArray(g.ids) || g.ids.some((id) => typeof id !== 'string' || !id.trim())) {
      problems.push(`${where}: "ids" must be a list of question ids`);
      return;
    }
    if (g.lesson !== undefined && typeof g.lesson !== 'string') problems.push(`${where}: "lesson" must be text`);
    const ids = [];
    for (const id of g.ids) {
      if (ids.includes(id)) {
        warnings.push(`${where}: ${id} is written twice`);
        continue;
      }
      ids.push(id);
    }
    if (ids.length < 2) {
      problems.push(`${where}: a group needs 2 or more different ids`);
      return;
    }
    for (const id of ids) {
      if (knownIds && !knownIds.has(id)) warnings.push(`${where}: ${id} is not a question of this course`);
    }
    groups.push({ ids });
  });
  return { groups, problems, warnings };
}

/**
 * Tag one pack's questions (mutates them: adds `siblingGroup`). Each group is
 * cut down to this pack's live questions; groups that still hold 2 or more
 * and share a question are joined; every question of a joined group gets its
 * sorted first id. A retired question is never tagged (it is never dealt) and
 * is reported. Returns { tagged, groups, joined, warnings }: how many
 * questions and (joined) groups were tagged, and how many file groups were
 * joined into another one.
 * `aliases` (optional Map, file id → this pack's id): for a pack built from
 * other packs' questions under new ids (an id map's active rows, source →
 * id), so the file's source ids reach the copies.
 */
function tagPack(groups, questions, { aliases } = {}) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const warnings = [];
  // This pack's part of each group (2 or more live questions, or nothing).
  const parts = [];
  for (const g of groups) {
    const mine = [];
    for (const fileId of g.ids) {
      const id = byId.has(fileId) ? fileId : aliases && aliases.get(fileId);
      const q = id && byId.get(id);
      if (!q) continue; // another pack's question (or unknown: readSiblingGroups said so)
      if (q.retired) {
        warnings.push(`${id} is retired: left out of its sibling group`);
        continue;
      }
      if (!mine.includes(id)) mine.push(id);
    }
    if (mine.length >= 2) parts.push(mine);
  }
  // Join parts that share a question (union-find on the part numbers).
  const parent = parts.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const partOf = new Map();
  parts.forEach((ids, i) => {
    for (const id of ids) {
      if (partOf.has(id)) parent[find(i)] = find(partOf.get(id));
      else partOf.set(id, i);
    }
  });
  const joined = new Map(); // root part → every id in it
  parts.forEach((ids, i) => {
    const r = find(i);
    const set = joined.get(r) || new Set();
    for (const id of ids) set.add(id);
    joined.set(r, set);
  });
  let tagged = 0;
  for (const set of joined.values()) {
    const id = [...set].sort()[0];
    for (const qid of set) byId.get(qid).siblingGroup = id;
    tagged += set.size;
  }
  return { tagged, groups: joined.size, joined: parts.length - joined.size, warnings };
}

module.exports = { readSiblingGroups, tagPack };
