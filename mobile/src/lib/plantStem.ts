/**
 * Grove Phase 4b: "How it has grown", the stem on Your plant (design-notes/grove/phase4b/PHASE4B.md
 * section 4.1 item 6). Pure: no React, no storage, so the tests read it directly.
 *
 * Plain English for the founder:
 * - The stem is one row per growth, Seed at the top and Elder at the bottom. A growth the plant has
 *   passed is "reached", the growth it is at is "now", the ones still to come are "later".
 * - Each reached row shows the date it was reached (only a SAVED date, never a guess, never a
 *   duration), the form it grew into (when forms are on), and the fact that earned it, word for
 *   word: the engine's FORM_FACTS for the rows where a form starts (Shoot, Bough, Elder), the
 *   website's Sprout and Crown lines for those two (lib/plantCopy.ts). Seed has no fact.
 * - Keepsakes the learner shows sit between the growths, by the date their badge was earned.
 * - With more than 8 leaves, the leaves older than the current form fold under "Earlier growth".
 * Nothing is saved here, and nothing changes the growth rules.
 */
import { FORM_FACTS, GROWTH_IDS, GROWTH_NAMES, MAX_GROWTH, type CertPlant, type GrowthLevel } from '../engine/plant';
import { FORM_START, formName, formOf, RECALL_FORM_III, RECALL_FORM_IV } from '../engine/plantForms';
import { GREW_FACTS } from './plantCopy';
import { shortDate, spokenShortDate } from './format';

export type StemState = 'reached' | 'now' | 'later';

export interface StemGrowthRow {
  kind: 'growth';
  key: string;
  growth: GrowthLevel;
  name: string;
  state: StemState;
  /** The saved time it was reached (Seed: none shown; the head says when it was planted). */
  at?: number;
  /** The form this growth starts (forms on, and a form starts here): its name ("Whip Oak"). */
  form?: string;
  /** What earned it, past tense, word for word. Only on reached and now rows. */
  fact?: string;
  /** The row's one meta line ("reached 28 Oct · grew into the Whip Oak"). */
  meta: string;
  /** What a screen reader says for the row (one stop). */
  spoken: string;
}

export interface StemKeepsakeRow {
  kind: 'keepsake';
  key: string;
  id: string;
  name: string;
  /** "Pressed 4 Nov · Long Memory". */
  meta: string;
  /** The keepsake's skill line, word for word ("You recall answers a week later."). */
  line: string;
  at: number;
  spoken: string;
}

export type StemRow = StemGrowthRow | StemKeepsakeRow;

/** A keepsake on show, with its badge's name and the time that badge was earned. */
export interface StemKeepsake {
  id: string;
  name: string;
  badgeName: string;
  line: string;
  at: number;
}

export interface StemInput {
  plant: Pick<CertPlant, 'species' | 'growth' | 'reached' | 'plantedAt'>;
  /** The plant is drawn in its forms (the botanical style). */
  forms: boolean;
  /** The Form IV final drawn at Elder. */
  final?: unknown;
  keepsakes?: readonly StemKeepsake[];
  /**
   * Questions right a week or more after last seen (plantForms.ts delayedRecalls of milestones.longIds).
   * Bough and Elder state a recall count as a fact; a plant that grew before 1.50 (no recall gate then),
   * or restored without it, may not have it. Left out: counted as 0, so no recall claim is made.
   */
  recalled?: number;
}

/** More leaves than this and the older ones fold under "Earlier growth" (PHASE4B 4.1 item 6). */
export const STEM_FOLD_AFTER = 8;

/** When growth g was reached, from saved fields only (Seed: the planting). */
export function reachedAt(plant: StemInput['plant'], g: GrowthLevel): number | undefined {
  if (g === 1) return plant.plantedAt;
  const at = plant.reached?.[GROWTH_IDS[g - 1]];
  return typeof at === 'number' && Number.isFinite(at) ? at : undefined;
}

/** True where a form starts (Seed, Shoot, Bough, Elder). */
const startsForm = (g: GrowthLevel) => FORM_START[formOf(g)] === g;

/** Every row of the stem, in order (growths, with the keepsakes on show between them). */
export function stemRows(i: StemInput): StemRow[] {
  const { plant, forms } = i;
  const recalled = i.recalled ?? 0;
  const rows: StemRow[] = [];
  for (let n = 1; n <= MAX_GROWTH; n++) {
    const g = n as GrowthLevel;
    const state: StemState = g < plant.growth ? 'reached' : g === plant.growth ? 'now' : 'later';
    const name = GROWTH_NAMES[g];
    const form = forms && startsForm(g) ? formName(plant.species, g, g === 6 ? i.final : 'own') : undefined;
    if (state === 'later') {
      const meta = form ? `Grows into the ${form} at ${name}.` : '';
      rows.push({ kind: 'growth', key: `g${g}`, growth: g, name, state, form, meta, spoken: `${name}, still to grow.${meta ? ` ${meta}` : ''}` });
      continue;
    }
    // Seed: no date on the row (the head says "Planted"), no fact.
    const at = g === 1 ? undefined : reachedAt(plant, g);
    // Release bug hunt round 1: Bough's and Elder's facts name a recall count, so they show only when it is
    // true for this learner now (recalls only go up). Otherwise the row keeps its date and form, no fact.
    const recallTrue = g === 4 ? recalled >= RECALL_FORM_III : g === 6 ? recalled >= RECALL_FORM_IV : true;
    const fact = g === 1 ? undefined : g === 3 || g === 4 || g === 6 ? (forms && recallTrue ? FORM_FACTS[g] : undefined) : GREW_FACTS[g];
    const parts: string[] = [];
    const said: string[] = [];
    if (at !== undefined) {
      parts.push(`reached ${shortDate(at)}`);
      said.push(`reached ${spokenShortDate(at)}`);
    }
    if (form) {
      // Seed is where Form I starts: it is planted as that form, it doesn't grow into it.
      parts.push(g === 1 ? `the ${form}` : `grew into the ${form}`);
      said.push(g === 1 ? `the ${form}` : `grew into the ${form}`);
    }
    let meta = parts.join(' · ');
    if (state === 'now') meta = meta ? `Now · ${meta}` : 'Now';
    const spokenHead = [state === 'now' ? `Now, ${name}` : name, ...said].join(', ');
    rows.push({ kind: 'growth', key: `g${g}`, growth: g, name, state, at, form, fact, meta, spoken: `${spokenHead}.${fact ? ` ${fact}` : ''}` });
  }
  // Keepsakes: each after the last reached (or now) growth reached on or before its badge's date.
  const keeps = [...(i.keepsakes ?? [])].filter((k) => Number.isFinite(k.at)).sort((a, b) => a.at - b.at);
  for (const k of keeps) {
    let after = 0;
    rows.forEach((r, idx) => {
      if (r.kind === 'growth' && r.state !== 'later' && (reachedAt(plant, r.growth) ?? Infinity) <= k.at) after = idx;
      if (r.kind === 'keepsake' && r.at <= k.at) after = Math.max(after, idx);
    });
    const meta = `Pressed ${shortDate(k.at)} · ${k.badgeName}`;
    rows.splice(after + 1, 0, { kind: 'keepsake', key: `k-${k.id}`, id: k.id, name: k.name, meta, line: k.line, at: k.at, spoken: `${k.name}, a keepsake. Earned ${spokenShortDate(k.at)}, ${k.badgeName}. ${k.line}` });
  }
  return rows;
}

/**
 * The stem split for the screen: with more than 8 leaves, the leaves older than the current form
 * fold under "Earlier growth" (closed). Now and Next always stay open.
 */
export function foldStem(rows: readonly StemRow[], growth: GrowthLevel): { earlier: StemRow[]; open: StemRow[] } {
  if (rows.length <= STEM_FOLD_AFTER) return { earlier: [], open: [...rows] };
  const start = FORM_START[formOf(growth)];
  const at = rows.findIndex((r) => r.kind === 'growth' && r.growth === start);
  if (at <= 0) return { earlier: [], open: [...rows] };
  return { earlier: rows.slice(0, at), open: rows.slice(at) };
}
