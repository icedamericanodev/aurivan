/**
 * Smart mode — the adaptive mix (behavioural review §3, the authoritative rules).
 *
 * Plain English for the founder. A Smart session of N questions is filled
 * from four "buckets":
 *   - Due (30%): spaced reviews that are due, most overdue first. If the
 *     review backlog (due reviews in the session's scope) is more than twice
 *     the daily goal, this rises to 50%.
 *   - Weak spot (40%): subtopics are drawn at random, but a subtopic is more
 *     likely to be drawn the more the exam weighs it and the less the
 *     learner has shown they know it:
 *         weight = blueprintWeight × (1 − mastery) + exploreBonus
 *     mastery = credit / max(answered, 5) (a Coach-me answer is half credit),
 *     where answers older than 30 days count half; exploreBonus = 0.15 while
 *     a subtopic has fewer than 3 answers. A question drawn from a subtopic
 *     the learner has never answered is tagged "New", not "Weak spot", and a
 *     question that is due is left to the Due bucket (always tagged "Due").
 *   - New (20%): unseen questions from the domain that is most
 *     under-sampled compared with the blueprint.
 *   - Refresher (10%): questions answered right at least 14 days ago that
 *     are not in the review queue (catches quiet forgetting).
 * When a bucket comes up short, the next bucket fills the gap.
 *
 * Order: never two questions from the same subtopic in a row, at most 3
 * weak spots in a row, and the session opens with a likely success.
 *
 * Difficulty: aim for 70–85% success. Over the last 10 answers, above 85%
 * prefers analysis questions; below 55% prefers foundational ones, and the
 * session offers the subtopic's note ("support").
 *
 * Every question carries its reason, shown as a small tag.
 * Pure TypeScript: no React, no storage, no clock (the caller passes `now`).
 */
import type { Difficulty, PackQuestion } from '../content/types';
import { shuffled, type Rng } from './random';
import { answerCredit, type AnswerRecord } from './readiness';
import { DAY_MS, dueIds, type ReviewEntry } from './srs';
import type { PathItem, PathReason } from './studyModes';

export type SmartBucket = Exclude<PathReason, 'mixed'>;
export const BUCKETS: SmartBucket[] = ['due', 'weak', 'new', 'refresher'];

/** Shares of a session. Due rises to BACKLOG_DUE_SHARE when the backlog is large. */
export const SLOT_SHARE: Record<SmartBucket, number> = { due: 0.3, weak: 0.4, new: 0.2, refresher: 0.1 };
export const BACKLOG_DUE_SHARE = 0.5;
/** "Large backlog" = more than this many times the daily goal. */
export const BACKLOG_FACTOR = 2;

export const EXPLORE_BONUS = 0.15;
/** A subtopic with fewer answers than this gets the explore bonus. */
export const EXPLORE_UNDER = 3;
/** Mastery divides by at least this many answers (a sample-size floor). */
export const MASTERY_FLOOR = 5;
/** Answers older than this count as half evidence. */
export const STALE_DAYS = 30;
/** A refresher was answered right at least this long ago. */
export const REFRESH_DAYS = 14;
/** "Likely success" opener: a subtopic at or above this mastery. */
export const LIKELY_MASTERY = 0.7;
/** At most this many weak spots in a row. */
export const MAX_WEAK_RUN = 3;

/** Difficulty targeting over the last ROLLING answers. */
export const ROLLING = 10;
export const STRETCH_ABOVE = 0.85;
export const SUPPORT_BELOW = 0.55;

/**
 * How many questions each bucket asks for. Due takes its share first; the
 * rest is split 4 : 2 : 1 between weak, new and refresher (the 40/20/10
 * shares), so a large backlog shrinks the others in proportion.
 */
export function slotCounts(count: number, backlog: number, dailyGoal: number): Record<SmartBucket, number> {
  const dueShare = backlog > BACKLOG_FACTOR * dailyGoal ? BACKLOG_DUE_SHARE : SLOT_SHARE.due;
  const due = Math.round(count * dueShare);
  const rest = count - due;
  const other = SLOT_SHARE.weak + SLOT_SHARE.new + SLOT_SHARE.refresher;
  const weak = Math.round((rest * SLOT_SHARE.weak) / other);
  const fresh = Math.round((rest * SLOT_SHARE.new) / other);
  return { due, weak, new: fresh, refresher: Math.max(0, rest - weak - fresh) };
}

/** Evidence weight of one answer: half once it is more than 30 days old. */
export function evidenceWeight(lastAt: number, now: number): number {
  return now - lastAt > STALE_DAYS * DAY_MS ? 0.5 : 1;
}

/** Mastery of a group of answers: credit / max(answered, 5), old answers counting half. */
export function groupMastery(records: AnswerRecord[], now: number): number {
  let credit = 0;
  let answered = 0;
  for (const r of records) {
    const w = evidenceWeight(r.lastAt, now);
    credit += w * answerCredit(r);
    answered += w;
  }
  return credit / Math.max(answered, MASTERY_FLOOR);
}

/** The weak-spot sampling weight for one subtopic. */
export function weakWeight(blueprintWeight: number, mastery: number, answered: number): number {
  return blueprintWeight * (1 - mastery) + (answered < EXPLORE_UNDER ? EXPLORE_BONUS : 0);
}

/** Accuracy over the most recent answers (any question), or null with fewer than `n`. */
export function rollingAccuracy(answers: Record<string, AnswerRecord>, n = ROLLING): number | null {
  const recent = Object.values(answers)
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, n);
  if (recent.length < n) return null;
  return recent.filter((r) => r.lastCorrect).length / recent.length;
}

/** Which difficulty to prefer for a rolling accuracy (null = no preference). */
export function difficultyTarget(accuracy: number | null): Difficulty | null {
  if (accuracy === null) return null;
  if (accuracy > STRETCH_ABOVE) return 'analysis';
  if (accuracy < SUPPORT_BELOW) return 'foundational';
  return null;
}

export interface SmartInput {
  /** The questions in scope (already filtered to the chosen domain, if any). */
  pool: PackQuestion[];
  answers: Record<string, AnswerRecord>;
  review: Record<string, ReviewEntry>;
  /** Blueprint weight per domain id (any scale; CISA uses percentages). */
  domainWeights: Record<string, number>;
  /** Study-notes subtopic of a question (engine/outline.ts); undefined if no note lists it. */
  subtopicOf: (questionId: string) => string | undefined;
  count: number;
  dailyGoal: number;
  now: number;
  rng: Rng;
}

export interface SmartPlan {
  items: PathItem[];
  /** Rolling accuracy over the last 10 answers (null with fewer). */
  accuracy: number | null;
  /** Below 55%: foundational first, and the session offers the subtopic's note. */
  support: boolean;
  /** Above 85%: analysis questions first. */
  stretch: boolean;
}

/** The subtopic used for grouping: the note's id, else the question's own label. */
function groupOf(q: PackQuestion, subtopicOf: SmartInput['subtopicOf']): string {
  return subtopicOf(q.id) ?? `~${q.domainId}:${q.subtopic}`;
}

/** Weighted draw of one key (weights > 0). */
function draw<K>(entries: [K, number][], rng: Rng): K {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    if (r < w) return k;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

export function buildSmart(input: SmartInput): SmartPlan {
  const { pool, answers, review, now, rng, count } = input;
  const accuracy = rollingAccuracy(answers);
  const target = difficultyTarget(accuracy);
  const byId = new Map(pool.map((q) => [q.id, q]));
  const chosen = new Map<string, SmartBucket>();
  const take = (id: string, b: SmartBucket) => chosen.set(id, b);
  const free = (id: string) => !chosen.has(id);
  /** In the review queue but not due yet: leave it alone (spacing). */
  const waiting = (id: string) => Boolean(review[id]) && review[id].dueAt > now;

  // Groups (subtopics) with their answers, mastery and weights.
  const groups = new Map<string, PackQuestion[]>();
  for (const q of pool) {
    const g = groupOf(q, input.subtopicOf);
    const l = groups.get(g);
    if (l) l.push(q);
    else groups.set(g, [q]);
  }
  const totalWeight = Object.values(input.domainWeights).reduce((a, b) => a + b, 0) || 1;
  const mastery = new Map<string, number>();
  const answeredIn = new Map<string, number>();
  for (const [g, qs] of groups) {
    const recs = qs.map((q) => answers[q.id]).filter((r): r is AnswerRecord => Boolean(r));
    mastery.set(g, groupMastery(recs, now));
    answeredIn.set(g, recs.length);
  }
  /** Preferred difficulty first, keeping the incoming order otherwise. */
  const byTarget = (qs: PackQuestion[]) => (target ? [...qs.filter((q) => q.difficulty === target), ...qs.filter((q) => q.difficulty !== target)] : qs);

  // ── Each bucket's candidates, best first ──
  const dueList = dueIds(review, now).filter((id) => byId.has(id));
  const pickDue = (n: number) => {
    let got = 0;
    for (const id of dueList) {
      if (got >= n) break;
      if (free(id)) {
        take(id, 'due');
        got++;
      }
    }
    return got;
  };

  // Weak spot: draw a subtopic by weight, then its most useful question:
  // last answer wrong (not queued), then unseen, then the oldest right one.
  // A question that is DUE belongs to the Due bucket only, so its tag always
  // says "Due" (QA Build E): the Weak-spot bucket never takes one.
  const isDue = (id: string) => Boolean(review[id]) && review[id].dueAt <= now;
  const weakOk = (q: PackQuestion) => free(q.id) && !waiting(q.id) && !isDue(q.id);
  const statusRank = (q: PackQuestion) => {
    const r = answers[q.id];
    if (r && !r.lastCorrect) return 0;
    if (!r) return 1;
    return 2;
  };
  const pickWeak = (n: number) => {
    let got = 0;
    const used = new Set<string>();
    while (got < n) {
      const open: [string, number][] = [];
      for (const [g, qs] of groups) {
        if (used.has(g)) continue;
        if (!qs.some(weakOk)) continue;
        const bw = (input.domainWeights[qs[0].domainId] ?? 0) / totalWeight;
        const w = weakWeight(bw, mastery.get(g) ?? 0, answeredIn.get(g) ?? 0);
        if (w > 0) open.push([g, w]);
      }
      if (!open.length) {
        // Every subtopic used once: allow a second draw, unless none has anything left.
        if (used.size === 0) break;
        used.clear();
        continue;
      }
      const g = draw(open, rng);
      used.add(g);
      const cands = shuffled(groups.get(g)!.filter(weakOk), rng).sort(
        (a, b) => statusRank(a) - statusRank(b) || (answers[a.id]?.lastAt ?? 0) - (answers[b.id]?.lastAt ?? 0),
      );
      const q = byTarget(cands)[0];
      if (!q) continue;
      // A subtopic the learner has never answered isn't a weak spot yet: the
      // explore bonus still draws it, but the tag says "New" (QA Build E).
      take(q.id, answeredIn.get(g) ? 'weak' : 'new');
      got++;
    }
    return got;
  };

  // New: unseen questions from the most under-sampled domain first
  // (blueprint share minus the share of the learner's answers there).
  const pickNew = (n: number) => {
    const answeredBy = new Map<string, number>();
    let answeredAll = 0;
    for (const q of pool) {
      if (answers[q.id]) {
        answeredBy.set(q.domainId, (answeredBy.get(q.domainId) ?? 0) + 1);
        answeredAll++;
      }
    }
    const domains = [...new Set(pool.map((q) => q.domainId))];
    const inScope = domains.reduce((s, d) => s + (input.domainWeights[d] ?? 0), 0) || 1;
    const gap = (d: string) => (input.domainWeights[d] ?? 0) / inScope - (answeredAll ? (answeredBy.get(d) ?? 0) / answeredAll : 0);
    const order = shuffled(domains, rng).sort((a, b) => gap(b) - gap(a));
    let got = 0;
    for (const d of order) {
      // Spread across subtopics: one question per subtopic per pass.
      const unseen = byTarget(shuffled(pool.filter((q) => q.domainId === d && !answers[q.id] && free(q.id) && !waiting(q.id)), rng));
      const seenGroups = new Set<string>();
      const firstPass = unseen.filter((q) => {
        const g = groupOf(q, input.subtopicOf);
        if (seenGroups.has(g)) return false;
        seenGroups.add(g);
        return true;
      });
      for (const q of [...firstPass, ...unseen.filter((x) => !firstPass.includes(x))]) {
        if (got >= n) return got;
        if (!free(q.id)) continue;
        take(q.id, 'new');
        got++;
      }
    }
    return got;
  };

  // Refresher: right last time, at least 14 days ago, not in review. Oldest first.
  const pickRefresher = (n: number) => {
    const cands = byTarget(
      pool
        .filter((q) => {
          const r = answers[q.id];
          return r && r.lastCorrect && now - r.lastAt >= REFRESH_DAYS * DAY_MS && !review[q.id] && free(q.id);
        })
        .sort((a, b) => answers[a.id].lastAt - answers[b.id].lastAt),
    );
    let got = 0;
    for (const q of cands) {
      if (got >= n) break;
      take(q.id, 'refresher');
      got++;
    }
    return got;
  };

  const pickers: Record<SmartBucket, (n: number) => number> = { due: pickDue, weak: pickWeak, new: pickNew, refresher: pickRefresher };
  // The backlog is counted inside the session's scope only: reviews due in
  // another domain don't change a one-domain session (QA Build E).
  const want = slotCounts(count, dueList.length, input.dailyGoal);
  // Fill in order; a short bucket passes its gap to the next one. After the
  // refresher bucket, any gap goes round again (weak, then new).
  let carry = 0;
  for (const b of BUCKETS) {
    const n = want[b] + carry;
    carry = n - pickers[b](n);
  }
  for (const b of ['weak', 'new', 'refresher'] as SmartBucket[]) {
    if (carry <= 0) break;
    carry -= pickers[b](carry);
  }
  // Still short (a tiny pool): anything left, labelled by what it is.
  if (chosen.size < count) {
    for (const q of shuffled(pool, rng)) {
      if (chosen.size >= count) break;
      if (!free(q.id)) continue;
      const r = answers[q.id];
      take(q.id, review[q.id] && review[q.id].dueAt <= now ? 'due' : !r ? 'new' : r.lastCorrect ? 'refresher' : 'weak');
    }
  }

  const items = orderSmart(
    [...chosen].map(([id, reason]) => {
      const q = byId.get(id)!;
      const group = groupOf(q, input.subtopicOf);
      return { id, reason, group, likely: (mastery.get(group) ?? 0) >= LIKELY_MASTERY };
    }),
    rng,
  );
  return { items: items.map(({ id, reason }) => ({ id, reason })), accuracy, support: target === 'foundational', stretch: target === 'analysis' };
}

export interface OrderItem {
  id: string;
  reason: SmartBucket;
  group: string;
  /** From a subtopic the learner already does well in (mastery ≥ 0.7). */
  likely: boolean;
}

/**
 * Put the session in order:
 * 1. Open with a likely success: a refresher, else a question from a
 *    subtopic with mastery ≥ 0.7 (else whatever comes first).
 * 2. Then, step by step, take a question that is NOT from the same subtopic
 *    as the last one and does not make a 4th weak spot in a row. Among those,
 *    take one from the subtopic with the most questions still waiting (so
 *    the end of the session isn't left with one subtopic twice in a row).
 * The weak-run rule looks ahead: when the weak spots still waiting could no
 * longer be split into runs of 3 by the other questions left, a weak spot
 * goes next. If no question satisfies both rules (a tiny or one-subtopic
 * pool), the subtopic rule is kept first, then the weak-run rule, then anything.
 */
export function orderSmart(items: OrderItem[], rng: Rng): OrderItem[] {
  const rest = shuffled(items, rng);
  const out: OrderItem[] = [];
  const opener = rest.findIndex((x) => x.reason === 'refresher');
  const likely = opener >= 0 ? opener : rest.findIndex((x) => x.likely);
  if (likely >= 0) out.push(...rest.splice(likely, 1));
  while (rest.length) {
    const last = out[out.length - 1];
    let run = 0;
    for (let k = out.length - 1; k >= 0 && out[k].reason === 'weak'; k--) run++;
    const left = new Map<string, number>();
    for (const x of rest) left.set(x.group, (left.get(x.group) ?? 0) + 1);
    const okGroup = (x: OrderItem) => !last || x.group !== last.group;
    // Look ahead (code review): every non-weak question left can split the
    // weak spots into runs of at most 3. If spending a non-weak one now would
    // leave too few separators for the weak spots still waiting, a weak spot
    // must go here instead.
    const weakLeft = rest.filter((x) => x.reason === 'weak').length;
    const mustWeak = run < MAX_WEAK_RUN && weakLeft > MAX_WEAK_RUN * (rest.length - weakLeft);
    const okRun = (x: OrderItem) => (x.reason === 'weak' ? run < MAX_WEAK_RUN : !mustWeak);
    const pickFrom = (pred: (x: OrderItem) => boolean) => {
      let best = -1;
      for (let k = 0; k < rest.length; k++) {
        if (!pred(rest[k])) continue;
        if (best < 0 || left.get(rest[k].group)! > left.get(rest[best].group)!) best = k;
      }
      return best;
    };
    let k = pickFrom((x) => okGroup(x) && okRun(x));
    if (k < 0) k = pickFrom(okGroup);
    if (k < 0) k = pickFrom(okRun);
    if (k < 0) k = 0;
    out.push(...rest.splice(k, 1));
  }
  return out;
}
