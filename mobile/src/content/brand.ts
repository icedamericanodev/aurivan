/**
 * The Aurivan brand promise ("Set A: Rings", chosen by the owner 2026-10-07).
 *
 * One place for the tagline, the line under it and the four pillars, so the
 * welcome screen and Settings → About always say the same thing.
 * Source of truth: docs/mobile/DESIGN_SYSTEM.md, "Brand".
 */

/** Which drawing (components/brand.tsx `PillarGlyph`) goes with a pillar. */
export type PillarGlyphKind = 'path' | 'roots' | 'seasons' | 'tall';

export interface Pillar {
  glyph: PillarGlyphKind;
  title: string;
  body: string;
}

export const TAGLINE = 'Master Modern Risk.';
export const VISION_LINE = 'Grow your judgement, one ring at a time.';

export const PILLARS: readonly Pillar[] = [
  { glyph: 'path', title: 'See the path', body: 'Know what to study next, and why it matters.' },
  { glyph: 'roots', title: 'Grow deep roots', body: 'Learn the principle behind every answer, not just the key.' },
  { glyph: 'seasons', title: 'Grow with the seasons', body: 'Your plan adjusts when your week or the frameworks change.' },
  { glyph: 'tall', title: 'Stand tall', body: 'Build the judgement your team and clients rely on.' },
];
