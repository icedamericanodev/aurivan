/**
 * Saved progress for questions rewritten in place (release bug hunt round 4).
 *
 * Plain English for the founder: three CISA questions kept their ids but
 * became new questions in mobile 1.43. A save from 1.40 to 1.42 still held the
 * learner's pick, slip tag and right/wrong result for the OLD question under
 * that id, so the Mistake journal showed a pick they never made. This drops
 * those old records, and keeps the learner's own note and bookmark:
 * - answers[id] and review[id] last written before the rewrite: dropped, so
 *   the old result stops counting toward readiness and review;
 * - mistakes[id] logged before the rewrite: dropped (its pick and slip tag
 *   were about options the learner never saw on the new question);
 * - first-try courses only: a `shown` time and an answer's `first` try from
 *   before the rewrite are dropped too (they were about the old question);
 * - the learner's note and bookmarks: kept. A note written before the rewrite is
 *   shown with a short line saying the question was updated (noteBeforeRewrite).
 *
 * No marker is saved: the rule reads each record's own time, so it is safe to
 * run on every load and every restore (a later answer to the new question is
 * newer than the rewrite and is never touched). Pure: no React, no storage.
 */

/** certId → question id → the moment the new wording reached the app (epoch ms). */
export type Rewrites = Readonly<Record<string, Readonly<Record<string, number>>>>;

type Rec = Record<string, unknown>;
const isObj = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const timeOf = (v: unknown, key: string): number | null => (isObj(v) && typeof v[key] === 'number' ? (v[key] as number) : null);

/** A copy of `map` without the ids whose record (read by `key`) is older than the rewrite. Same object when nothing goes. */
function dropOld(map: unknown, ids: Readonly<Record<string, number>>, key: string): unknown {
  if (!isObj(map)) return map;
  let out: Rec | null = null;
  for (const [id, at] of Object.entries(ids)) {
    if (!Object.prototype.hasOwnProperty.call(map, id)) continue;
    const t = timeOf(map[id], key);
    // A record with no readable time can't be shown to be newer: it goes too.
    if (t !== null && t >= at) continue;
    out ??= { ...map };
    delete out[id];
  }
  return out ?? map;
}

/**
 * First-try courses (engine/firstTry.ts): a copy of `shown` (id → time) without the ids shown
 * before the rewrite (they saw the OLD wording). Same object when nothing goes; nothing to do
 * when there is no `shown` (every CISA save).
 */
function dropOldShown(shown: unknown, ids: Readonly<Record<string, number>>): unknown {
  if (!isObj(shown)) return shown;
  let out: Rec | null = null;
  for (const [id, at] of Object.entries(ids)) {
    if (!Object.prototype.hasOwnProperty.call(shown, id)) continue;
    const t = shown[id];
    if (typeof t === 'number' && t >= at) continue;
    out ??= { ...shown };
    delete out[id];
  }
  return out ?? shown;
}

/**
 * First-try courses: an answer record KEPT (answered again after the rewrite) whose `first` try was
 * at the OLD wording loses that `first`, so it never counts toward first-try readiness. Same object
 * when nothing changes; a record with no `first` (every CISA record) is never touched.
 */
function dropOldFirst(answers: unknown, ids: Readonly<Record<string, number>>): unknown {
  if (!isObj(answers)) return answers;
  let out: Rec | null = null;
  for (const [id, at] of Object.entries(ids)) {
    const r = answers[id];
    if (!isObj(r) || !('first' in r)) continue;
    const t = timeOf(r.first, 'at');
    if (t !== null && t >= at) continue;
    const rest: Rec = { ...r };
    delete rest.first;
    out ??= { ...answers };
    out[id] = rest;
  }
  return out ?? answers;
}

/**
 * The progress state (the store's or a backup's) without records saved for
 * the old wording of a rewritten question. Returns the same object when
 * nothing changes, so it costs nothing on every load.
 */
export function dropRewritten<T>(progress: T, rewrites: Rewrites): T {
  if (!isObj(progress) || !isObj(progress.byCert)) return progress;
  const byCert = progress.byCert as Rec;
  let nextByCert: Rec | null = null;
  for (const [certId, ids] of Object.entries(rewrites)) {
    const cp = byCert[certId];
    if (!isObj(cp)) continue;
    // A dropped answer record takes its `first` with it; a kept one loses a `first` from before the rewrite.
    const answers = dropOldFirst(dropOld(cp.answers, ids, 'lastAt'), ids);
    const review = dropOld(cp.review, ids, 'lastSeen');
    const mistakes = dropOld(cp.mistakes, ids, 'at');
    const shown = dropOldShown(cp.shown, ids);
    if (answers === cp.answers && review === cp.review && mistakes === cp.mistakes && shown === cp.shown) continue;
    nextByCert ??= { ...byCert };
    // `shown` is written only when it changed, so a save without one never gains the key.
    nextByCert[certId] = { ...cp, answers, review, mistakes, ...(shown === cp.shown ? {} : { shown }) };
  }
  return nextByCert ? ({ ...progress, byCert: nextByCert } as T) : progress;
}

/** True when this note was written before its question was rewritten (show "This question was updated…"). */
export function noteBeforeRewrite(rewrites: Rewrites, certId: string, questionId: string, noteTs: number | undefined): boolean {
  const at = rewrites[certId]?.[questionId];
  return typeof at === 'number' && typeof noteTs === 'number' && noteTs < at;
}
