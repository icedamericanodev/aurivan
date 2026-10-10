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
 */
import { getCertification } from '../content/certifications';
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
import { playableGames } from './games';
import { certOutline, guidedStatus } from './outline';

/** True when an answer can count toward milestones: no Coach me hint, not given in a game. */
export function isCleanAnswer(a: AnswerRecord): boolean {
  return !a.lastAssisted && !a.lastGame;
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

/**
 * After a session or a game round: save every badge now earned and queue it
 * for its quiet moment. Returns the newly earned marks.
 */
export function checkMilestones(certId: string, opts: { finished?: boolean; now?: number } = {}): string[] {
  const now = opts.now ?? Date.now();
  // The launch back-fill must come first (app/_layout.tsx runs it at launch;
  // this is a guard). Otherwise a session finished before it would queue a
  // whole older history as moments, instead of one quiet summary line.
  ensureBackfill(certId, now);
  let fresh: string[] = [];
  useProgress.getState().updateMilestones(certId, (m, cp) => {
    const facts = milestoneFacts(certId, cp, { now, finished: opts.finished });
    if (!facts) return null;
    fresh = newlyMet(allMarks(facts), m?.earned);
    return fresh.length ? { milestones: earn(m, fresh, now, true) } : null;
  });
  return fresh;
}

/** One badge's moment: what it is called and its rule. */
export interface MilestoneMoment {
  key: string;
  label: string;
  rule: string;
  kind: 'milestone' | 'skill';
}

/** The moment for a saved mark key (Results reads it back from the session). */
export function momentFor(certId: string, key: string): MilestoneMoment | null {
  const def = badgeDef(markBadge(key));
  if (!def) return null;
  const cp = selectCert(useProgress.getState(), certId);
  return { key, label: markLabel(key, marksFor(certId, cp)), rule: def.rule, kind: def.kind };
}

/** Take ONE queued badge for the screen that just ended (the rest wait). */
export function celebrateNext(certId: string): MilestoneMoment | null {
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
    const milestones = { ...earn(merged, keys, now, false), backfill: { at: now, count: found } };
    return { milestones, fixedLater: inferred.loopFixed };
  });
  return found;
}

/** The learner has seen the back-fill summary (it shows once). */
export function seeBackfill(certId: string) {
  useProgress.getState().updateMilestones(certId, (m) =>
    m?.backfill && !m.backfill.seen ? { milestones: { ...m, backfill: { ...m.backfill, seen: true } } } : null,
  );
}

/** "You'd already earned 4 milestones." (null when there is nothing to say). */
export function backfillLine(count: number): string | null {
  if (count <= 0) return null;
  return count === 1 ? 'You’d already earned 1 milestone.' : `You’d already earned ${count} milestones.`;
}
