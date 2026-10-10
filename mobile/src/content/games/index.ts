/**
 * Game content — the reviewed decks the Build F games play.
 *
 * Plain English for the founder:
 * - `cisa/roles.json` is the Canopy Call deck: one-line decisions and who
 *   has the authority to make each one. Two ISACA experts reviewed it.
 *   It is copied here byte for byte, so the reviewed file and the app agree;
 *   this loader renames its snake_case fields (`exclude_chips`,
 *   `auditor_move`) to the app's camelCase.
 * - `cisa/sequences.json` is the Stepping Stones deck: short processes whose
 *   steps have a strict order (also two-expert reviewed).
 * - `cisa/flows.json` lists the lesson "flow" scenes the reviewers checked.
 *   Flows whose order was strict as shipped (`orderedAsShipped`) join
 *   Stepping Stones, and so do the ones whose lesson has since been
 *   corrected to the reviewed order (`orderedNow`, with a `note` on what
 *   changed). Their steps are read from the lesson itself, so a lesson fix
 *   shows up in the game too. Joiner / mover / leaver stays a list.
 * - Each step list gets a tier from its length (4 steps Seedling, 5 Sapling,
 *   6 Heartwood) unless the deck gives one.
 *
 * Content only: no React, no storage. Like the question loader, the JSON is
 * bundled (offline) and parsed the first time a screen asks for it.
 */
import { lessonsFor } from '../lessons';

export type GameTier = 'seedling' | 'sapling' | 'heartwood';

export interface RoleDef {
  id: string;
  /** The full label from the deck ("Custodian (IT, data custodian or system administrator)"). */
  label: string;
  /** The label before any bracket ("Custodian"), for chips and confusion pairs. */
  short: string;
}

export interface RoleCard {
  id: string;
  decision: string;
  /** The role id that holds the authority. */
  role: string;
  why: string;
  /** "The auditor's move", where the deck has one. */
  auditorMove?: string;
  /** The study-notes subtopic that teaches it ("1A1.3"). */
  subtopicId: string;
  tier: GameTier;
  /** Roles never offered as chips on this card (the notes make them partly defensible). */
  excludeChips: string[];
}

export interface RoleDeck {
  roles: RoleDef[];
  cards: RoleCard[];
}

export interface StepItem {
  label: string;
  note: string;
}

export interface StepSequence {
  /** "s001" for an authored sequence, the lesson id for a lesson flow. */
  id: string;
  title: string;
  steps: StepItem[];
  caption: string;
  tier: GameTier;
  /** The exam domain ("1".."5"), for interleaving rounds. */
  domainId: string;
  /** The study note it comes from (authored sequences). */
  subtopicId?: string;
  /** The lesson it comes from (lesson flows). */
  lessonId?: string;
}

// ── Raw shapes, as the reviewed files have them ─────────────────────────
interface RawRoles {
  version: number;
  roles: { id: string; label: string }[];
  cards: {
    id: string;
    decision: string;
    role: string;
    why: string;
    auditor_move?: string;
    subtopicId: string;
    tier: GameTier;
    exclude_chips?: string[];
  }[];
}
interface RawSequences {
  version: number;
  sequences: { id: string; title: string; steps: StepItem[]; caption: string; subtopicId: string; tier: GameTier }[];
}
export interface FlowAudit {
  lessonId: string;
  /** The title the reviewers audited. */
  flowTitle: string;
  /** The flow scene's heading in the lesson today (the reviewed final block). */
  heading: string;
  ordered: boolean;
  orderedAsShipped: boolean;
  /** The lesson was later corrected to the reviewed strict order (the six flows fixed in Build F). */
  orderedNow?: boolean;
  /** What was corrected, for the next reviewer. */
  note?: string;
}

/** A flow plays in Stepping Stones when its order is strict, as shipped or as corrected since. */
export function flowPlays(f: FlowAudit): boolean {
  return f.ordered && (f.orderedAsShipped || f.orderedNow === true);
}
interface RawFlows {
  version: number;
  flows: FlowAudit[];
}

// Lazy, like the question packs: parsed only when a game first asks.
const RAW: Record<string, { roles: () => RawRoles; sequences: () => RawSequences; flows: () => RawFlows }> = {
  cisa: {
    roles: () => require('./cisa/roles.json') as RawRoles,
    sequences: () => require('./cisa/sequences.json') as RawSequences,
    flows: () => require('./cisa/flows.json') as RawFlows,
  },
};

/** "Custodian (IT, …)" → "Custodian". */
export function shortRole(label: string): string {
  const i = label.indexOf(' (');
  return (i > 0 ? label.slice(0, i) : label).trim();
}

/** The tier a step list plays at from its length: 4 Seedling, 5 Sapling, 6+ Heartwood. */
export function tierForSteps(n: number): GameTier {
  return n <= 4 ? 'seedling' : n === 5 ? 'sapling' : 'heartwood';
}

const roleCache = new Map<string, RoleDeck | null>();
/** The cert's Canopy Call deck, or null when it has none. */
export function getRoleDeck(certId: string): RoleDeck | null {
  if (roleCache.has(certId)) return roleCache.get(certId) ?? null;
  const raw = RAW[certId]?.roles();
  const deck: RoleDeck | null = raw
    ? {
        roles: raw.roles.map((r) => ({ id: r.id, label: r.label, short: shortRole(r.label) })),
        cards: raw.cards.map((c) => ({
          id: c.id,
          decision: c.decision,
          role: c.role,
          why: c.why,
          ...(c.auditor_move ? { auditorMove: c.auditor_move } : {}),
          subtopicId: c.subtopicId,
          tier: c.tier,
          excludeChips: c.exclude_chips ?? [],
        })),
      }
    : null;
  roleCache.set(certId, deck);
  return deck;
}

/** The audited flow list (all of them, for tests and docs). */
export function flowAudit(certId: string): FlowAudit[] {
  return RAW[certId]?.flows().flows ?? [];
}

const seqCache = new Map<string, StepSequence[]>();
/**
 * Every Stepping Stones process for a cert: the authored sequences, then the
 * lesson flows whose order is strict (flowPlays). A flow whose lesson or
 * heading can no longer be found is skipped (never a broken round).
 */
export function getStepSequences(certId: string): StepSequence[] {
  const hit = seqCache.get(certId);
  if (hit) return hit;
  const raw = RAW[certId];
  const out: StepSequence[] = [];
  if (raw) {
    for (const s of raw.sequences().sequences) {
      out.push({ id: s.id, title: s.title, steps: s.steps, caption: s.caption, tier: s.tier, domainId: s.subtopicId.charAt(0), subtopicId: s.subtopicId });
    }
    const lessons = lessonsFor(certId);
    for (const f of raw.flows().flows) {
      if (!flowPlays(f)) continue;
      const lesson = lessons.find((l) => l.id === f.lessonId);
      const scene = lesson?.scenes.find((sc) => sc.type === 'flow' && sc.heading === f.heading);
      if (!lesson || !scene || scene.type !== 'flow') continue;
      out.push({
        id: lesson.id,
        title: scene.heading,
        steps: scene.steps,
        caption: scene.caption ?? '',
        tier: tierForSteps(scene.steps.length),
        domainId: lesson.domainId,
        lessonId: lesson.id,
      });
    }
  }
  seqCache.set(certId, out);
  return out;
}
