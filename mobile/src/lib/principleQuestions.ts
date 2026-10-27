/**
 * A principle's questions, for the screens (mobile 1.31).
 *
 * Plain English: the bank is scanned ONCE per certification to file every
 * tagged question under its principle (engine/principleQuestions.ts
 * indexByPrinciple). After that, a principle page only looks its own list
 * up, so opening or re-rendering it never walks all ~1,250 questions again.
 */
import { findQuestion, getAllQuestions } from '../content/loader';
import { onClearContentCaches } from '../content/packs';
import type { Principle } from '../content/principles/types';
import {
  indexByPrinciple,
  principlePracticeSet,
  principleQuestionIds,
  principleSetSize,
  type PrincipleIndex,
} from '../engine/principleQuestions';
import { createRng } from '../engine/random';
import { selectCert, useProgress } from '../store/progress';
import { startFromIds } from './sessions';

/** certId → its principle index, built on first use. */
const indexes = new Map<string, PrincipleIndex>();
/** "certId:principleId" → that principle's question ids (the union). */
const unions = new Map<string, string[]>();

/** The cert's principle → tagged question ids index, built once. */
export function principleIndex(certId: string): PrincipleIndex {
  let index = indexes.get(certId);
  if (!index) {
    index = indexByPrinciple(getAllQuestions(certId));
    indexes.set(certId, index);
  }
  return index;
}

/** Every question that tests this principle: tagged with it, or hand-picked and untagged. */
export function questionsForPrinciple(certId: string, principle: Principle): string[] {
  const key = `${certId}:${principle.id}`;
  let ids = unions.get(key);
  if (!ids) {
    ids = principleQuestionIds(principle.id, principle.practiceIds, principleIndex(certId), (id) => findQuestion(certId, id));
    unions.set(key, ids);
  }
  return ids;
}

/**
 * Start "Practice this principle": a set of up to PRINCIPLE_SET_SIZE, drawn
 * from all of the principle's questions, unseen and missed first. Null when
 * there is nothing to ask (the button is hidden then anyway).
 */
export function startPrinciplePractice(certId: string, principle: Principle) {
  const ids = questionsForPrinciple(certId, principle);
  const count = principleSetSize(ids.length);
  const answers = selectCert(useProgress.getState(), certId).answers;
  const pick = principlePracticeSet(ids, (id) => findQuestion(certId, id), answers, count, createRng(Date.now()));
  return startFromIds(certId, pick, principle.title);
}

/** Test helper: forget the memo (tests swap content in and out). */
export function clearPrincipleQuestionsCache(): void {
  indexes.clear();
  unions.clear();
}

// clearContentCaches() (content/packs) empties these too.
onClearContentCaches(clearPrincipleQuestionsCache);
