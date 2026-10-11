/**
 * Milestones glue — between the saved progress and the pure badge rules in
 * engine/milestones.ts.
 *
 * Plain English for the founder:
 * - `milestoneFacts` turns a learner's progress into the numbers the rules
 *   read (answers without a hint, topics clear, domain mastery, mocks…).
 * - `checkMilestones` runs after every finished session and game round: any
 *   badge now earned is saved (never removed) and QUEUED.
 * - `celebrateNext` takes ONE badge from the queue for the screen that just
 *   ended (Results, or a game's round end). The rest wait for later
 *   sessions, so there is never a burst.
 * - `ensureBackfill` runs once per certification at launch (and after a
 *   restore from an older backup): it works out what older saves can still
 *   show, saves those badges quietly and keeps ONE summary line ("You'd
 *   already earned 4") instead of a burst of celebrations.
 * - Mobile 1.10 (the badge collection): a moment knows its set and its
 *   unlock line ("what you can now do"), and whether it completed its set;
 *   a completed set's planter is saved (the plant shows it in Phase 4);
 *   with Settings → Show badges off, no moment is taken from the queue.
 * - Mobile 1.11 (tiers and Took Root): `ensureCatalog` runs once per cert
 *   after the back-fill. Whatever the saved study already earns under the
 *   newer catalogue (a higher tier, Took Root) is saved QUIETLY, with one
 *   summary line on the case, never a burst of moments.
 */
import { getCertification } from '../content/certifications';
import type { Certification } from '../content/types';
import { BADGE_SET, CATALOG_VERSION, caseMarks, caseSets, completeSets, completingMark, setInfo, type CaseMark, type SetId, type SetView } from '../engine/badgeCatalog';
import { findQuestion } from '../content/loader';
import { firstTries, mindsetGrowth } from '../engine/mindsetGrowth';
import {
  allMarks,
  badgeCount,
  badgeDef,
  earn,
  inferFromSaves,
  markBadge,
  markLabel,
  newlyMet,
  takeNext,
  type CertMilestones,
  type MilestoneFacts,
} from '../engine/milestones';
import { domainMastery, type AnswerRecord } from '../engine/readiness';
import { CLEAR_RIGHT } from '../engine/studyPath';
import { dayKey } from '../engine/streak';
import { selectCert, useProgress, type CertProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { playableGames } from './games';
import { certOutline, guidedStatus, questionExists } from './outline';

/** True when an answer can count toward milestones: no Coach me hint, not given in a game. */
export function isCleanAnswer(a: AnswerRecord): boolean {
  return !a.lastAssisted && !a.lastGame;
}

/**
 * Took Root's progress: the topic closest to taking root, as the share of its
 * parts mastered (a subtopic with questions in the pack, answered right
 * without a hint on two different days: engine/mastery.ts masteredAt).
 * 1 = every part of some topic. Game answers and Coach me answers never set
 * a mastery date, so they never count here either.
 */
export function tookRootShare(certId: string, mastery: CertProgress['mastery']): number {
  const exists = questionExists(certId);
  let best = 0;
  for (const t of certOutline(certId).topics) {
    const parts = t.subtopics.filter((s) => s.questionIds.some(exists));
    if (!parts.length) continue;
    const done = parts.filter((s) => Boolean(mastery?.[s.id]?.masteredAt)).length;
    best = Math.max(best, done / parts.length);
    if (best >= 1) break;
  }
  return best;
}

/** The numbers the badge rules read, from one cert's saved progress. */
export function milestoneFacts(certId: string, cp: CertProgress, opts: { now: number; finished?: boolean }): MilestoneFacts | null {
  const cert = getCertification(certId);
  if (!cert) return null;
  // Coach me answers and game answers never count: only answers whose last
  // try had no hint and wasn't in a game. Every badge worked out from the
  // saved answers reads this `clean` set (or a copy of the progress with it).
  const clean: Record<string, AnswerRecord> = {};
  for (const [id, a] of Object.entries(cp.answers)) if (isCleanAnswer(a)) clean[id] = a;
  const cleanCp: CertProgress = { ...cp, answers: clean };
  const domains = domainMastery(cert, clean).map((d) => ({
    id: d.domainId,
    short: cert.domains.find((x) => x.id === d.domainId)?.short ?? d.domainId,
    answered: d.answered,
    mastery: d.mastery,
  }));
  // Topic Clear: each topic's status from clean answers, and the closest one for the progress line.
  const statuses = certOutline(certId).topics.map((t) => guidedStatus(certId, t, cleanCp));
  const topicsClear = statuses.filter((s) => s.clear).length;
  const score = (s: { right: number; studied: boolean }) => Math.min(s.right, CLEAR_RIGHT) + (s.studied ? 1 : 0);
  const best = statuses.reduce<(typeof statuses)[number] | undefined>((b, s) => (!b || score(s) > score(b) ? s : b), undefined);
  const m = cp.milestones;
  const counts = m?.counts ?? {};
  const games = playableGames(certId);
  const played = games.filter((id) => cp.gameBest[id] !== undefined || (cp.gameRecent[id]?.length ?? 0) > 0).length;
  const growth = mindsetGrowth(firstTries(clean, cp.mistakes, (id) => findQuestion(certId, id)), opts.now);
  return {
    cleanAnswered: Object.keys(clean).length,
    topicsClear,
    ...(best ? { topicBest: { right: best.right, studied: best.studied } } : {}),
    domains,
    loopFixed: counts.loopFixed ?? 0,
    slipsTagged: Object.values(cp.mistakes).filter((x) => x.slip).length,
    longRecall: counts.longRecall ?? 0,
    graduated: counts.graduated ?? 0,
    sure: m?.sure ?? [],
    mocks: cp.mocks,
    fullMockSize: cert.exam.questions,
    mindsetShift: growth.show,
    // Enough first tries, far enough apart, to be judged at all (the badge is gated until then).
    mindsetData: growth.show || growth.reason === 'no-improvement',
    ...(m?.earned['whole-map'] !== undefined ? { wholeMapAt: m.earned['whole-map'] } : {}),
    tookRoot: tookRootShare(certId, cp.mastery),
    studyDays: m?.days ?? 0,
    // Fresh Start: back after a week or more away, and a session just finished
    // today. Live only: the back-fill never awards it.
    freshStart: Boolean(opts.finished) && Boolean(m?.returnedOn) && m?.returnedOn === dayKey(opts.now),
    gamesPlayed: played,
    gamesTotal: games.length,
    snareHits: cp.gameGrowth?.trap?.hits ?? [],
    keelRun: cp.gameGrowth?.sprint?.run ?? 0,
    signposts: m?.signposts ?? [],
    myths: m?.myths ?? [],
    paceRounds: counts.paceRounds ?? 0,
    gameFixes: counts.gameFixes ?? 0,
  };
}

/** Marks for a cert's progress now (the Milestones and Field notes screens). */
export function marksFor(certId: string, cp: CertProgress, now = Date.now()) {
  const facts = milestoneFacts(certId, cp, { now });
  return facts ? allMarks(facts) : [];
}

/** A cert's domains and exam, as the badge case reads them. */
const caseContext = (cert: Certification) => ({
  domains: cert.domains.map((d) => ({ id: d.id, short: d.short, weight: d.weight, tone: d.tone, ...(d.emblem ? { emblem: d.emblem } : {}) })),
  exam: { questions: cert.exam.questions, minutes: cert.exam.minutes },
});

/** The badge case: every medallion, the shelves, and each domain's mastery as Firm Footing reads it (clean answers only). */
export interface BadgeCase {
  marks: CaseMark[];
  sets: SetView[];
  mastery: Record<string, number>;
}

/** The badge case for some facts and earned marks. */
export function caseFromFacts(cert: Certification, facts: MilestoneFacts, earned: Record<string, number> | undefined): BadgeCase {
  const ctx = caseContext(cert);
  const marks = caseMarks({ marks: allMarks(facts), earned, ...ctx, mindsetData: Boolean(facts.mindsetData) });
  return { marks, sets: caseSets(marks, ctx.exam, ctx.domains.length), mastery: Object.fromEntries(facts.domains.map((d) => [d.id, d.mastery])) };
}

/** The badge case for a cert's progress now (You → Badges). */
export function badgeCase(certId: string, cp: CertProgress, now = Date.now()): BadgeCase {
  const cert = getCertification(certId);
  const facts = milestoneFacts(certId, cp, { now });
  if (!cert || !facts) return { marks: [], sets: [], mastery: {} };
  return caseFromFacts(cert, facts, cp.milestones?.earned);
}

/**
 * Save the planter of every counted set now complete (dated when its last
 * badge was earned). Never removes one: a set that later gains a badge keeps
 * the planter it gave. Same object when nothing is new.
 */
export function withPlanters(m: CertMilestones, sets: readonly SetView[]): CertMilestones {
  const done = completeSets(sets).filter((id) => m.planters?.[id] === undefined);
  if (!done.length) return m;
  const planters = { ...m.planters };
  for (const id of done) planters[id] = sets.find((x) => x.info.id === id)!.completeAt!;
  return { ...m, planters };
}

/**
 * Save the planter of any counted set already complete that has none yet,
 * and nothing else. Idempotent: run at launch (after the back-fill) and after
 * a restore, so a set completed before planters existed (1.9 or earlier, or a
 * 1.9 backup) gets its planter without waiting for a new badge. Returns the
 * sets that just got one, or null when there was nothing to save.
 */
export function syncPlanters(certId: string, now = Date.now()): SetId[] | null {
  const cert = getCertification(certId);
  if (!cert) return null;
  let added: SetId[] | null = null;
  useProgress.getState().updateMilestones(certId, (m, cp) => {
    if (!m || Object.keys(m.earned).length === 0) return null;
    const facts = milestoneFacts(certId, cp, { now });
    if (!facts) return null;
    const next = withPlanters(m, caseFromFacts(cert, facts, m.earned).sets);
    if (next === m) return null;
    added = Object.keys(next.planters ?? {}).filter((id) => m.planters?.[id] === undefined) as SetId[];
    return { milestones: next };
  });
  return added;
}

/**
 * After a session or a game round: save every badge now earned and queue it
 * for its quiet moment. Returns the newly earned marks.
 */
export function checkMilestones(certId: string, opts: { finished?: boolean; now?: number } = {}): string[] {
  const now = opts.now ?? Date.now();
  // The launch back-fill and catalogue fill must come first (app/_layout.tsx
  // runs them at launch; this is a guard). Otherwise a session finished
  // before them would queue a whole older history as moments, instead of
  // one quiet summary line.
  ensureBackfill(certId, now);
  ensureCatalog(certId, now);
  let fresh: string[] = [];
  const cert = getCertification(certId);
  useProgress.getState().updateMilestones(certId, (m, cp) => {
    const facts = milestoneFacts(certId, cp, { now, finished: opts.finished });
    if (!facts || !cert) return null;
    fresh = newlyMet(allMarks(facts), m?.earned);
    if (!fresh.length) return null;
    const earned = earn(m, fresh, now, true);
    // A set completed by these badges saves its planter (Phase 4 shows it).
    return { milestones: withPlanters(earned, caseFromFacts(cert, facts, earned.earned).sets) };
  });
  return fresh;
}

/** One badge's moment: what it is called, its rule, its set and what it means. */
export interface MilestoneMoment {
  key: string;
  label: string;
  rule: string;
  kind: 'milestone' | 'skill';
  /** The set it sits in ("Evergreen", "Field notes"). */
  set: SetId;
  setName: string;
  /** What the learner can now do, and why it matters (shown in place of the rule). */
  unlock: string;
  /** It completed its set: "That completes Evergreen." */
  completes?: boolean;
  /** A higher tier of a badge already held (Rooted · 30 days): always the short form. */
  tierUp?: boolean;
  /** The one "Next:" line for Results (the best next badge for the exam), if any. */
  next?: string;
  /** For the medallion: a tiered badge's tier (1–3), Firm Footing's domain leaf and emblem. */
  tier?: number;
  domain?: { index: number; count: number };
  emblem?: string;
  /** A Stretch tier (beyond exam need): said with its name. */
  stretch?: boolean;
}

/** The moment for a saved mark key (Results reads it back from the session). */
export function momentFor(certId: string, key: string, next?: string): MilestoneMoment | null {
  const def = badgeDef(markBadge(key));
  const cert = getCertification(certId);
  if (!def || !cert) return null;
  const cp = selectCert(useProgress.getState(), certId);
  const { marks, sets } = badgeCase(certId, cp);
  const mark = marks.find((x) => x.key === key);
  const set = BADGE_SET[def.id];
  const view = sets.find((x) => x.info.id === set);
  // The badge that completed its set: the one earned last (two earned in the
  // same session share the moment, so the later in catalogue order takes it).
  const completes = Boolean(view && completingMark(view) === key);
  // A tier above the first, of a badge whose lower tier was earned earlier.
  const tierUp = (mark?.tier ?? 1) > 1;
  return {
    key,
    label: mark?.name ?? markLabel(key, marksFor(certId, cp)),
    rule: def.rule,
    kind: def.kind,
    set,
    setName: view?.info.name ?? setInfo(set, cert.exam, cert.domains.length).name,
    unlock: mark?.unlock ?? def.rule,
    ...(completes ? { completes } : {}),
    ...(tierUp ? { tierUp } : {}),
    ...(next ? { next } : {}),
    ...(mark?.tier ? { tier: mark.tier } : {}),
    ...(mark?.domain ? { domain: { index: cert.domains.findIndex((d) => d.id === mark.domain!.id), count: cert.domains.length } } : {}),
    ...(mark?.domain?.emblem ? { emblem: mark.domain.emblem } : {}),
    ...(mark?.stretch ? { stretch: true } : {}),
  };
}

/** Badges are hidden (Settings → Show badges off): no moments, nothing on You. */
export const badgesHidden = () => useSettings.getState().badgesHidden;

/**
 * Take ONE queued badge for the screen that just ended (the rest wait).
 * With badges hidden, nothing is taken: they are earned quietly, and the
 * queue says how many arrived when badges show again (showBadgesAgain).
 */
export function celebrateNext(certId: string): MilestoneMoment | null {
  if (badgesHidden()) return null;
  let key: string | undefined;
  useProgress.getState().updateMilestones(certId, (m) => {
    const r = takeNext(m);
    key = r.key;
    return r.key && r.milestones ? { milestones: r.milestones } : null;
  });
  return key ? momentFor(certId, key) : null;
}

/**
 * Once per cert (a save from before milestones, or a restore from an older
 * backup): work out what the saved data can still show, save those badges
 * QUIETLY (no queue, no moment) and keep the summary count. Returns how many
 * badges it found, or null when it had already run.
 */
export function ensureBackfill(certId: string, now = Date.now()): number | null {
  const state = useProgress.getState();
  if (selectCert(state, certId).milestones?.backfill) return null;
  let found: number | null = null;
  state.updateMilestones(certId, (m, cp) => {
    if (m?.backfill) return null;
    const inferred = inferFromSaves({
      answers: cp.answers,
      mistakes: cp.mistakes,
      mocks: cp.mocks,
      mastery: cp.mastery,
      // No streak.recentDays: they are shared by every exam and survive a
      // Reset, so they could hand back Rooted days the learner cleared.
    });
    const base: CertMilestones = m ?? { earned: {} };
    const lastSeen = inferred.days[inferred.days.length - 1];
    const merged: CertMilestones = {
      ...base,
      counts: { ...base.counts, loopFixed: (base.counts?.loopFixed ?? 0) + inferred.loopFixed.length },
      sure: [...inferred.sure, ...(base.sure ?? [])].slice(-50),
      // Days this version already counted are part of the inferred set (never counted twice).
      days: Math.max(base.days ?? 0, inferred.days.length),
      ...(lastSeen || base.lastDay ? { lastDay: [lastSeen, base.lastDay].filter(Boolean).sort().pop() } : {}),
    };
    const facts = milestoneFacts(certId, { ...cp, milestones: merged }, { now });
    const keys = facts ? newlyMet(allMarks(facts), merged.earned) : [];
    // The summary speaks of milestones (You → Milestones); skill leaves are saved quietly too.
    found = badgeCount(keys.filter((k) => badgeDef(markBadge(k))?.kind === 'milestone'));
    const earned = earn(merged, keys, now, false);
    const cert = getCertification(certId);
    const planted = facts && cert ? withPlanters(earned, caseFromFacts(cert, facts, earned.earned).sets) : earned;
    // The back-fill reads the current catalogue, so there is nothing for the catalogue fill to add.
    const milestones = { ...planted, backfill: { at: now, count: found }, catalog: CATALOG_VERSION };
    return { milestones, fixedLater: inferred.loopFixed };
  });
  return found;
}

/**
 * Once per cert, for a cert whose badges were filled in under an older
 * catalogue (mobile 1.10 or a 1.10 backup): earn what the saved study already
 * shows under this one (a higher tier, Took Root) QUIETLY, stamped with one
 * time (so each reads "By 11 Oct", never "new"), and keep ONE summary line.
 * Higher tiers start from honest data: Long Memory's count stopped at 25
 * before, so Long Memory · 75 is never earned here from older recalls.
 * Returns how many badges it found, or null when there was nothing to do.
 */
export function ensureCatalog(certId: string, now = Date.now()): number | null {
  const m0 = selectCert(useProgress.getState(), certId).milestones;
  // Nothing yet (the back-fill comes first), or already filled for this catalogue.
  if (!m0?.backfill || (m0.catalog ?? 0) >= CATALOG_VERSION) return null;
  const cert = getCertification(certId);
  let found: number | null = null;
  useProgress.getState().updateMilestones(certId, (m, cp) => {
    if (!m?.backfill || (m.catalog ?? 0) >= CATALOG_VERSION) return null;
    const facts = milestoneFacts(certId, cp, { now });
    if (!facts || !cert) return null;
    const keys = newlyMet(allMarks(facts), m.earned);
    found = keys.length;
    const earned = earn(m, keys, now, false);
    const planted = withPlanters(earned, caseFromFacts(cert, facts, earned.earned).sets);
    return { milestones: { ...planted, catalog: CATALOG_VERSION, ...(keys.length ? { catalogFill: { at: now, count: keys.length } } : {}) } };
  });
  return found;
}

/** The learner has seen the catalogue fill's line (it shows once). */
export function seeCatalogFill(certId: string) {
  useProgress.getState().updateMilestones(certId, (m) =>
    m?.catalogFill && !m.catalogFill.seen ? { milestones: { ...m, catalogFill: { ...m.catalogFill, seen: true } } } : null,
  );
}

/** "Badges now have higher tiers, plus a new one: Took Root. Your study so far already earned 2 more." (null: nothing to say). */
export function catalogFillLine(count: number): string | null {
  if (count <= 0) return null;
  return `Badges now have higher tiers, plus a new one: Took Root. Your study so far already earned ${count} more.`;
}

/** The learner has seen the back-fill summary (it shows once). */
export function seeBackfill(certId: string) {
  useProgress.getState().updateMilestones(certId, (m) =>
    m?.backfill && !m.backfill.seen ? { milestones: { ...m, backfill: { ...m.backfill, seen: true } } } : null,
  );
}

/** "You'd already earned 4 badges." (null when there is nothing to say). */
export function backfillLine(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? 'You’d already earned 1 badge.' : `You’d already earned ${count} badges.`;
}
