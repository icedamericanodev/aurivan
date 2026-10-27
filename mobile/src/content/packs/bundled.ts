/**
 * BundledSource: the packs built into the app (offline from first launch).
 *
 * It reads the generated module (../generated, written by
 * scripts/build-content.mjs). Each file there is a lazy require(), so a
 * domain, the notes or the lessons are only parsed the first time a screen
 * asks for them; this source adds no parsing of its own.
 *
 * The generated module is also the TEST SEAM: a test can jest.mock
 * '../content/generated' to stand in its own packs. Such a mock may leave
 * exports out (an older test has only questions and notes), so every read
 * here uses `?.` and treats a missing export as "nothing of that kind".
 */
import * as generated from '../generated';
import type { ExamPack } from '../exam/types';
import type { Lesson } from '../lessons/types';
import type { NotesPack } from '../notes/types';
import type { PrinciplesPack } from '../principles/types';
import type { PackQuestion } from '../types';
import type { GameDeckKind, PackInfo, PackSource } from './types';

// The generated exports, typed loosely: a test's mock may leave any of them out.
type Gen = {
  generatedPacks?: Record<string, Record<string, () => PackQuestion[]>>;
  generatedNotes?: Record<string, () => NotesPack>;
  generatedPrinciples?: Record<string, () => PrinciplesPack>;
  generatedExam?: Record<string, () => ExamPack>;
  generatedLessons?: Record<string, () => Lesson[]>;
  generatedGames?: Record<string, Partial<Record<string, () => unknown>>>;
  generatedInfo?: Record<string, PackInfo>;
};
// Read through a function, never copied at import: jest.mock swaps the module's exports.
const gen = (): Gen => generated as unknown as Gen;

export const BundledSource: PackSource = {
  name: 'bundled',
  certIds: () => Object.keys(gen().generatedPacks ?? {}),
  info(certId) {
    const g = gen();
    // A cert "has a pack" when it has questions (the same rule hasContent always used).
    if (!g.generatedPacks?.[certId]) return null;
    // A test's stand-in module may have no info: rev 0 is the lowest, so any other source wins.
    return g.generatedInfo?.[certId] ?? { certId, rev: 0, schemaVersion: 1 };
  },
  domainIds: (certId) => Object.keys(gen().generatedPacks?.[certId] ?? {}),
  questions: (certId, domainId) => gen().generatedPacks?.[certId]?.[domainId]?.() ?? null,
  notes: (certId) => gen().generatedNotes?.[certId]?.() ?? null,
  principles: (certId) => gen().generatedPrinciples?.[certId]?.() ?? null,
  exam: (certId) => gen().generatedExam?.[certId]?.() ?? null,
  lessons: (certId) => gen().generatedLessons?.[certId]?.() ?? null,
  gameDeck: (certId, kind: GameDeckKind) => gen().generatedGames?.[certId]?.[kind]?.() ?? null,
};
