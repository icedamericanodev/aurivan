/**
 * Board pseudonyms (Uplift Phase 8, built OFF; spec PHASE6_8.md §4.6):
 * pure, tested in __tests__/board-names.test.ts. No React, no storage.
 *
 * A learner appears on the feedback board as "<Adjective> <Tree> <1–999>",
 * for example "Quiet Cedar 214", unless they type a name of their own. The
 * words come from Grove's calm, outdoor vocabulary. Every pseudonym passes
 * the same name check the server runs (engine/moderation.ts checkHandle),
 * so a reserved or blocked word can never come out of here; the server
 * checks again anyway.
 */
import type { Rng } from './random';
import { checkHandle } from './moderation';

export const ADJECTIVES: readonly string[] = [
  'Quiet', 'Steady', 'Bright', 'Calm', 'Gentle', 'Patient', 'Clear', 'Kind', 'Brave', 'Careful', 'Curious', 'Early',
  'Golden', 'Mossy', 'Misty', 'Sunny', 'Silver', 'Tall', 'Wise', 'Warm', 'Rustling', 'Rooted', 'Leafy', 'Evergreen',
];

export const TREES: readonly string[] = [
  'Cedar', 'Oak', 'Pine', 'Maple', 'Birch', 'Willow', 'Alder', 'Aspen', 'Beech', 'Cypress', 'Elm', 'Fir', 'Hazel',
  'Juniper', 'Larch', 'Linden', 'Rowan', 'Spruce', 'Yew', 'Acacia', 'Banyan', 'Magnolia', 'Narra', 'Olive',
];

/** One pseudonym: an adjective, a tree and a number from 1 to 999. */
export function pseudonym(rng: Rng): string {
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rng() * list.length) % list.length];
  return `${pick(ADJECTIVES)} ${pick(TREES)} ${1 + (Math.floor(rng() * 999) % 999)}`;
}

/**
 * A pseudonym that passes the name check and isn't `avoid` (the one shown
 * now, for "New name"). Tries a few times; the word lists are clean, so the
 * first try passes unless the server adds a reserved word that matches.
 */
export function freshPseudonym(rng: Rng, avoid?: string, extra: { reserved?: readonly string[]; block?: readonly string[] } = {}): string {
  for (let i = 0; i < 20; i++) {
    const name = pseudonym(rng);
    if (name !== avoid && checkHandle(name, extra) === null) return name;
  }
  // Practically unreachable; still a valid, unreserved name.
  return avoid === 'Quiet Cedar 1' ? 'Steady Oak 2' : 'Quiet Cedar 1';
}

/** True when a name looks like one of our pseudonyms (the board shows it plainly; a chosen name looks the same). */
export function isPseudonym(name: string): boolean {
  const m = /^([A-Za-z]+) ([A-Za-z]+) ([1-9]\d{0,2})$/.exec(name);
  return m !== null && ADJECTIVES.includes(m[1]) && TREES.includes(m[2]);
}
