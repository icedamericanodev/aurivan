/**
 * Field Guide (mobile 1.51, DESIGN_SYSTEM.md §21): the words and facts its
 * plates draw. Pure TypeScript: no React, no storage.
 *
 * - `areaStems`: You's five stems (one scale), from the same rules as the
 *   area words (engine/domainBand.ts areaFigure): a number only from 30
 *   answers, "too few yet" below that, the line said in words.
 * - `areaSnapshot` / `setStems`: Results' growth plate. A session keeps where
 *   each area stood when it started (`snapshot`); Results compares it with
 *   now. Growth is shown only where BOTH ends have a number (30+ answers), so
 *   a thin area never shows a change it hasn't earned.
 * - `lastPressed`: the herbarium's newest specimens (You's entry row), from
 *   the saved earned keys alone (no catalogue walk on every render).
 * - `todayTitle`: Today's countdown title, "Maya, 38 days to go".
 */
import { badgeDef, markBadge } from './milestones';
import { caseKey, tierOf } from './badgeCatalog';
import { areaFigure, STEADY_FROM } from './domainBand';
import { cleanDisplayName, greetingWithName } from './displayName';

/** One stem on a Field Guide chart (components/fieldguide/StemChart.tsx draws it). */
export interface Stem {
  key: string;
  /** The area's short name ("IS Audit"). */
  name: string;
  /** The number to show (from 30 answers); null: too few yet, or not started. */
  pct: number | null;
  answered: number;
  /** "Strong", "Steady", "Building", "Not started". */
  word: string;
  /** Below the area line (only shown for a measured stem). */
  below: boolean;
  /** 1 to 29 answers: drawn as a seed and an outline, "too few yet". */
  thin: boolean;
  /** Points grown, drawn as the stem's top and "↑3". */
  up?: number;
  /** One more line under the words ("3 of 4 this set"). */
  note?: string;
  /** The column's whole spoken label. */
  spoken: string;
}

export interface AreaInfo {
  id: string;
  short: string;
}
export interface AreaMastery {
  domainId: string;
  answered: number;
  /** 0..1, as readiness reports it. */
  mastery: number;
}

const pctOf = (m: AreaMastery | undefined) => Math.round((m?.mastery ?? 0) * 100);

/**
 * You's stems, blueprint order. `ups`: points up since the learner last
 * looked (only areas that show a number; a word never gets a "+12").
 */
export function areaStems(domains: readonly AreaInfo[], mastery: readonly AreaMastery[], ups?: readonly number[]): Stem[] {
  return domains.map((d, i) => {
    const m = mastery.find((x) => x.domainId === d.id);
    const answered = m?.answered ?? 0;
    const f = areaFigure(answered, pctOf(m));
    const up = f.pct !== null && ups && (ups[i] ?? 0) > 0 ? Math.round(ups[i]) : undefined;
    return {
      key: d.id,
      name: d.short,
      pct: f.pct,
      answered,
      word: f.word,
      below: f.below,
      thin: f.thin,
      ...(up ? { up } : {}),
      spoken: `${d.short}: ${stemSpoken(f, answered)}${up ? `. Up ${up} since you last looked` : ''}`,
    };
  });
}

/**
 * What a stem says: the same words it shows. A measured area keeps the
 * band word, its percent and the line ("Building, 61 percent on latest
 * tries, below the 70 line"); under 30 answers it is "too few yet, from 18
 * answers" (no band word: the plate shows none, and 18 answers can't carry one).
 */
function stemSpoken(f: ReturnType<typeof areaFigure>, answered: number): string {
  if (f.thin) return `too few yet, from ${answered} ${answered === 1 ? 'answer' : 'answers'}`;
  return f.spoken;
}

/** Where each area stood when a session started: [answers, whole percent]. */
export type AreaSnapshot = Record<string, readonly [number, number]>;

export function areaSnapshot(mastery: readonly AreaMastery[]): AreaSnapshot {
  const out: Record<string, [number, number]> = {};
  for (const m of mastery) out[m.domainId] = [m.answered, pctOf(m)];
  return out;
}

/**
 * Results' growth plate: the areas this set asked about, now, with the
 * growth since the set began where both ends show a number. `counts`: this
 * set's right / asked per area ("3 of 4 this set").
 */
export function setStems(
  domains: readonly AreaInfo[],
  mastery: readonly AreaMastery[],
  counts: Record<string, { correct: number; total: number }>,
  before?: AreaSnapshot,
): Stem[] {
  return domains
    .filter((d) => counts[d.id])
    .map((d) => {
      const m = mastery.find((x) => x.domainId === d.id);
      const answered = m?.answered ?? 0;
      const f = areaFigure(answered, pctOf(m));
      const was = before?.[d.id];
      const wasFigure = was ? areaFigure(was[0], was[1]) : undefined;
      const delta = f.pct !== null && wasFigure?.pct != null ? f.pct - wasFigure.pct : 0;
      const up = delta > 0 ? delta : undefined;
      const k = counts[d.id];
      const note = `${k.correct} of ${k.total} this set`;
      return {
        key: d.id,
        name: d.short,
        pct: f.pct,
        answered,
        word: f.word,
        below: f.below,
        thin: f.thin,
        ...(up ? { up } : {}),
        note,
        spoken: `${d.short}: ${stemSpoken(f, answered)}${up ? `, up ${up} points in this set` : ''}. ${note}`,
      };
    });
}

/**
 * The growth plate's one-area figure: "58 → 61%" and "IS Operations grew 3
 * points", only when that area has a number at both ends and it moved up.
 */
export function growthFigure(stem: Stem | undefined): { shown: string; line: string; spoken: string } | null {
  if (!stem || stem.pct === null || !stem.up) return null;
  const from = stem.pct - stem.up;
  return {
    shown: `${from} → ${stem.pct}%`,
    line: `${stem.name} grew ${stem.up} ${stem.up === 1 ? 'point' : 'points'} in this set`,
    spoken: `${stem.name}, from ${from} to ${stem.pct} percent on latest tries`,
  };
}

/** Which of these areas still need answers before their stems are measured (Results' empty plate). */
export function emptyPlateLine(stems: readonly Stem[]): string | null {
  if (stems.length === 0 || stems.some((s) => s.pct !== null)) return null;
  const names = stems.map((s) => s.name);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${list} ${names.length === 1 ? 'needs' : 'need'} a few more answers before ${names.length === 1 ? 'it is' : 'they are'} measured.`;
}

export interface LastPressed {
  key: string;
  badge: string;
  /** "Know What You Know", "Firm Footing · IS Operations", "Rooted · 30 days". */
  name: string;
  tier?: number;
  /** Firm Footing's domain emblem. */
  emblem?: string;
  at: number;
}

/** The newest specimens, newest first (keys the case doesn't show are left out, as its count does). */
export function lastPressed(earned: Record<string, number> | undefined, domains: readonly (AreaInfo & { emblem?: string })[], n = 3): LastPressed[] {
  return Object.entries(earned ?? {})
    .filter(([key]) => caseKey(key))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([key, at]) => {
      const badge = markBadge(key);
      const def = badgeDef(badge);
      const tier = tierOf(key);
      const domain = badge === 'firm-footing' ? domains.find((d) => d.id === key.split(':')[1]) : undefined;
      const base = def?.name ?? badge;
      const name = domain ? `${base} · ${domain.short}` : badge === 'rooted' && tier ? `${base} · ${tier.tierLabel}` : base;
      return { key, badge, name, at, ...(tier ? { tier: tier.tier } : {}), ...(domain?.emblem ? { emblem: domain.emblem } : {}) };
    });
}

/**
 * Today's title (the owner's pick, option A): the countdown is the news.
 * "Maya, 38 days to go" / "38 days to go"; exam day and after say so; with
 * no exam date it is the greeting by the hour ("Good morning, Maya").
 */
export function todayTitle(daysLeft: number | null, name: string | null | undefined, hour: number): string {
  const who = cleanDisplayName(name);
  if (daysLeft === null) return greetingWithName(hour, name);
  if (daysLeft < 0) return who ? `${who}, your exam is done` : 'Exam done';
  if (daysLeft === 0) return who ? `${who}, it’s exam day` : 'Exam day';
  const left = `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} to go`;
  return who ? `${who}, ${left}` : left[0].toUpperCase() + left.slice(1);
}

/** The area line the stems are drawn against (the app's 70). */
export const STEM_LINE = STEADY_FROM;
