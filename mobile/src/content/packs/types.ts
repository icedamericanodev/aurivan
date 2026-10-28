/**
 * Content packs: the shapes a SOURCE of study content must have.
 *
 * Plain English for the founder:
 * - A "pack" is one certification's study content: its questions (one file
 *   per domain), notes, principles, exam guide, lessons and game decks.
 * - A "source" is somewhere packs come from. Today there is one: the packs
 *   bundled inside the app (BundledSource, built by scripts/build-content.mjs).
 *   Later (Phase C) a second source holds packs the learner downloaded.
 * - Every loader (content/loader.ts, notes/, principles/, exam/, lessons/,
 *   games/) asks the registry (./registry.ts) which source to read, so screens
 *   never know or care where content came from.
 *
 * Everything here is SYNCHRONOUS on purpose: the 50-odd screens and helpers
 * that read content call plain functions, never await. A downloaded pack is
 * read from the phone's disk synchronously too (Phase C).
 */
import type { ExamPack } from '../exam/types';
import type { Lesson } from '../lessons/types';
import type { NotesPack } from '../notes/types';
import type { PrinciplesPack } from '../principles/types';
import type { TermsPack } from '../terms';
import type { PackQuestion } from '../types';

/** A pack's version facts (generated/<cert>/pack.json for the bundled one). */
export interface PackInfo {
  certId: string;
  /**
   * The build commit's time in seconds: always increasing. A source with a
   * NEWER rev wins, so the bundled pack is the floor (a downloaded pack only
   * replaces it when it is newer). 0 = unknown (a build with no git).
   */
  rev: number;
  /** The pack format's version. A pack newer than PACK_SCHEMA_VERSION is ignored. */
  schemaVersion: number;
}

/** The game decks a pack may carry (content/games/index.ts reshapes them). */
export type GameDeckKind = 'roles' | 'sequences' | 'flows';

/**
 * One place packs come from. Each method returns null (or []) when this
 * source has nothing of that kind for the cert: the loaders then show
 * nothing, exactly as a cert with no notes does today.
 */
export interface PackSource {
  /** For logs and tests: "bundled", "installed". */
  readonly name: string;
  /** The certifications this source has a pack for. */
  certIds(): string[];
  /** The pack's version facts, or null when this source has no pack for the cert. */
  info(certId: string): PackInfo | null;
  /** The domain ids that have a question file, in pack order. */
  domainIds(certId: string): string[];
  questions(certId: string, domainId: string): PackQuestion[] | null;
  notes(certId: string): NotesPack | null;
  principles(certId: string): PrinciplesPack | null;
  exam(certId: string): ExamPack | null;
  lessons(certId: string): Lesson[] | null;
  /** A game deck exactly as the reviewed file has it (games/index.ts reshapes it). */
  gameDeck(certId: string, kind: GameDeckKind): unknown;
  /**
   * Mobile 1.48: the small key-terms file for the Key term widget (content/terms.ts).
   * Optional: a source without it (an older downloaded pack) gives the widget no terms.
   */
  terms?(certId: string): TermsPack | null;
}
