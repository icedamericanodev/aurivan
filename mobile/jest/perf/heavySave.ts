/**
 * Perf harness: a realistic HEAVY save, built through the real store
 * actions, so every derived field (milestones, mastery, the readiness log,
 * the streak) is what months of real study would leave behind:
 * - ~5 months of study, 40 answers on most days, across all 5 domains
 *   (every question answered, most several times, accuracy rising);
 * - logged mistakes, some tagged; the review queue; many mastered subtopics;
 * - 12 mocks (mini and full), most lessons, many notes read, game scores;
 * - EVERY badge the case shows, earned (and the planters that come with them);
 * - a planted plant with a chosen look (mobile 1.13+ only).
 *
 * Written to run unchanged on older releases (1.11 → 1.15), so the same
 * save can be measured on each: anything a release doesn't have is skipped.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { getAllQuestions } from '../../src/content/loader';
import { getCertification } from '../../src/content/certifications';
import { useProgress } from '../../src/store/progress';
import { useSettings } from '../../src/store/settings';
import { persistStorage } from '../../src/store/storage';

const DAY = 86_400_000;
const CERT = 'cisa';

/** Small seeded random numbers, so every run (and every release) builds the same save. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function optional<T>(load: () => T): T | undefined {
  try {
    return load();
  } catch {
    return undefined;
  }
}

export interface HeavySaveInfo {
  answers: number;
  questions: number;
  mocks: number;
  badges: number;
  plant: boolean;
}

/** Builds the save into the live stores (call inside act()). `now` = the day the learner opens the app. */
export function buildHeavySave(now = Date.now(), days = 150): HeavySaveInfo {
  const cert = getCertification(CERT)!;
  const rand = rng(42);
  const qs = getAllQuestions(CERT);
  // Building months of study through the real actions would save the whole
  // store after every answer (minutes of test time): no saving while building.
  // The real storage is put back at the end, so what is measured afterwards saves as the app does.
  const noSave = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const stores = [useProgress, useSettings] as unknown as { persist?: { setOptions: (o: unknown) => void } }[];
  stores.forEach((st) => st.persist?.setOptions({ storage: noSave }));
  try {
    return build(now, days, cert, rand, qs);
  } finally {
    stores.forEach((st) => st.persist?.setOptions({ storage: persistStorage }));
  }
}

function build(now: number, days: number, cert: NonNullable<ReturnType<typeof getCertification>>, rand: () => number, qs: ReturnType<typeof getAllQuestions>): HeavySaveInfo {
  const p = () => useProgress.getState();
  useSettings.setState({
    onboarded: true,
    activeCertId: CERT,
    examDates: { [CERT]: new Date(now + 40 * DAY).toISOString().slice(0, 10) },
  } as never);
  // Older releases have no dailyMinutes / familiarity: setting them is harmless there.
  useSettings.setState({ dailyMinutes: 30, familiarity: 'some', fitPrompt: 'answered' } as never);

  let answers = 0;
  // Fixed local hours, so every answer lands on the same calendar day whatever
  // time the suite runs: past days' study at about 4 am (noon minus 8 h, safe
  // across a daylight-saving shift), and today's answers never before midnight.
  const noon = new Date(now).setHours(12, 0, 0, 0);
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const slips = ['role', 'priority', 'tech-first', 'symptom', 'misread', 'knowledge'];
  const confs = ['sure', 'unsure', 'guessing'] as const;
  let cursor = 0;
  for (let d = days; d >= 0; d--) {
    // A study day most days (a few gaps), more on weekends.
    if (d > 0 && rand() < 0.12) continue;
    const dayStart = noon - d * DAY;
    const n = d === 0 ? 12 : 30 + Math.floor(rand() * 20);
    // Accuracy rises from ~55% to ~85% over the months.
    const pRight = 0.55 + 0.3 * (1 - d / days);
    for (let k = 0; k < n; k++) {
      // Walk the bank, then come back round (re-answers, like spaced review).
      const q = qs[cursor % qs.length];
      cursor += 1 + Math.floor(rand() * 3);
      const right = rand() < pRight;
      const conf = confs[Math.floor(rand() * 3)];
      const at = d === 0 ? Math.max(todayStart + k, now - (n - k) * 60_000) : dayStart - 8 * 3_600_000 + k * 60_000;
      p().recordAnswer(CERT, q.id, right, conf, { at, ms: 30_000 + Math.floor(rand() * 60_000) } as never);
      if (!right) {
        p().recordMistake(CERT, q.id, q.correct === 'A' ? 'B' : 'A', conf);
        if (rand() < 0.3) p().tagMistake(CERT, q.id, slips[Math.floor(rand() * slips.length)] as never);
      }
      answers++;
    }
  }

  // 12 mocks over the last two months: mini (50) and full (150).
  for (let m = 0; m < 12; m++) {
    const total = m % 3 === 0 ? cert.exam.questions : Math.round(cert.exam.questions / 3);
    const correct = Math.round(total * (0.62 + m * 0.015));
    const byDomain: Record<string, { total: number; correct: number }> = {};
    let left = total;
    let rightLeft = correct;
    cert.domains.forEach((dom, i) => {
      const t = i === cert.domains.length - 1 ? left : Math.round(total * dom.weight);
      const c = i === cert.domains.length - 1 ? rightLeft : Math.min(t, Math.round(t * (correct / total)));
      byDomain[dom.id] = { total: t, correct: c };
      left -= t;
      rightLeft -= c;
    });
    p().recordMock(CERT, {
      id: `mock-${m}`,
      finishedAt: now - (60 - m * 5) * DAY,
      total,
      correct,
      minutesUsed: Math.round((cert.exam.minutes / cert.exam.questions) * total * 0.9),
      byDomain,
      timing: 'standard',
      minutesAllowed: Math.round((cert.exam.minutes / cert.exam.questions) * total),
      medianSec: 70,
      unanswered: 0,
    } as never);
  }

  // Lessons (all but the last few), notes read, games played.
  const lessons = optional(() => require('../../src/content/lessons').lessonsFor(CERT) as { id: string }[]) ?? [];
  lessons.slice(0, Math.max(0, lessons.length - 4)).forEach((l) => p().completeLesson(CERT, l.id));
  const notes = optional(() => require('../../src/content/notes').noteSubtopics(CERT) as { id: string }[]) ?? [];
  notes.filter(() => rand() < 0.7).forEach((s) => p().setNoteRead(CERT, s.id, true));
  const games = optional(() => require('../../src/lib/games').playableGames(CERT) as string[]) ?? [];
  for (const g of games) for (let r = 0; r < 6; r++) p().recordGame(CERT, g as never, 5 + Math.floor(rand() * 10));

  // Badges: the launch back-fill and catalogue fill first (as the app does), then EVERY badge the case shows.
  const ms = optional(() => require('../../src/lib/milestones'));
  ms?.ensureBackfill?.(CERT, now);
  ms?.ensureCatalog?.(CERT, now);
  // An everyday visit, not the first launch after an update: the one-time summary lines were seen.
  ms?.seeBackfill?.(CERT);
  ms?.seeCatalogFill?.(CERT);
  let badges = 0;
  const cp = p().byCert[CERT]!;
  const marks: { key: string }[] = optional(() => ms.badgeCase(CERT, cp, now).marks) ?? [];
  if (marks.length) {
    p().updateMilestones(CERT, ((m: Record<string, unknown> | undefined) => {
      const earned: Record<string, number> = { ...((m?.earned as Record<string, number>) ?? {}) };
      marks.forEach((mk, i) => {
        if (earned[mk.key] === undefined) earned[mk.key] = now - (90 - (i % 80)) * DAY;
      });
      badges = Object.keys(earned).length;
      return { milestones: { ...(m ?? {}), earned } };
    }) as never);
  }
  ms?.syncPlanters?.(CERT, now);
  optional(() => require('../../src/lib/badges').initCaseSeen(CERT, now));

  // Mobile 1.13+: a planted plant, grown from this study, with a chosen look.
  const plantLib = optional(() => require('../../src/lib/plant'));
  let plant = false;
  if (plantLib?.plantFor) {
    plantLib.plantFor(CERT, 'oak', 'Kai', now - 100 * DAY);
    plantLib.checkPlant?.(CERT, now - DAY);
    // Seen yesterday: no grow-up pending today (a quiet, everyday visit).
    plantLib.seeGrowth?.(CERT);
    const looks = optional(() => require('../../src/engine/plantLooks'));
    const pl = p().byCert[CERT]?.plant;
    if (looks?.unlockedLooks && pl && p().setPlantLook) {
      const marksAll = Object.values(p().byCert).map((c) => ({ earned: c?.milestones?.earned, planters: c?.milestones?.planters }));
      const open = new Set<string>(looks.unlockedLooks(pl, marksAll));
      const pick = (slot: string) => (looks.LOOK_ITEMS as { id: string; slot: string; species?: string }[]).filter((x) => x.slot === slot && open.has(x.id) && (!x.species || x.species === 'oak')).pop()?.id;
      const keeps = (looks.LOOK_ITEMS as { id: string; slot: string }[]).filter((x) => x.slot === 'keepsake' && open.has(x.id)).map((x) => x.id).slice(-3);
      p().setPlantLook(CERT, { colourway: pick('colourway') ?? null, ground: pick('ground') ?? null, visitor: pick('visitor') ?? null, keepsakes: keeps });
    }
    plant = !!p().byCert[CERT]?.plant;
  }
  return { answers, questions: Object.keys(p().byCert[CERT]!.answers).length, mocks: p().byCert[CERT]!.mocks.length, badges, plant };
}
