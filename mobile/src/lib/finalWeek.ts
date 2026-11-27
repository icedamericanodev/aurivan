/**
 * Final review week glue: turns a task's action into a button and opens the
 * right screen. The rules are pure (engine/finalWeek.ts); this file reads
 * the content and the learner's mistakes, and calls the router.
 *
 * Plain English, what each task button opens:
 * - note → that study note (a topic code opens its domain's notes page);
 *   no target → Study notes.
 * - principles → that principle, or that family's principles; "top_slip" →
 *   the principle for the learner's recent mistake pattern (the Mistake
 *   journal's own leading pattern). When that is "Didn't know it", the note
 *   behind those mistakes instead; before there is a pattern, the library.
 * - practice_domain → a 10-question practice set in that domain ("focus" and
 *   "next_focus" from readiness, engine/finalWeek.ts weekFocus).
 * - mock_mini / mock_full → the mock start sheet (timing, hide the clock).
 * - mistakes → the Mistake journal. glossary → the Glossary with its search filled in (Grove
 *   Phase 4, O2), or Study notes and their search for a course with no key terms.
 */
import { router } from 'expo-router';
import type { TaskAction } from '../content/exam/types';
import { findNote, getNotes, subtopicOfQuestion } from '../content/notes';
import { findPrinciple, getPrinciples, principleForSlip } from '../content/principles';
import { hasTerms } from '../content/terms';
import type { Certification } from '../content/types';
import { domainTitle } from '../engine/domainNaming';
import { mostMissedSubtopic, resolveAction, weekFocus, type ActionContext, type Destination, type TopSlip } from '../engine/finalWeek';
import { readinessFor } from '../engine/readiness';
import type { CertProgress } from '../store/progress';
import { openSessionFromStack } from './actions';
import { mistakePatternsFor } from './slipPattern';
import { guardedStart, startPractice } from './sessions';

/** A focused practice set's size: "a short set". */
export const WEEK_PRACTICE_COUNT = 10;

/**
 * The learner's top slip: the Mistake journal's own leading pattern
 * (lib/slipPattern.ts: last 28 days, tags and answers, 5 mistakes with a
 * pattern and 3 sharing it), so the final week never points at a pattern the
 * journal doesn't show. A thinking slip → its principle; "Didn't know it" (no
 * principle in the slip map) → the note behind the most recent "Didn't know
 * it" mistakes (open ones first); no pattern yet → null (the principles library).
 */
export function topSlip(certId: string, mistakes: CertProgress['mistakes'], now: number = Date.now()): TopSlip {
  const dna = mistakePatternsFor(certId, mistakes, now);
  if (!dna.top) return null;
  const p = principleForSlip(certId, dna.top.pattern);
  if (p) return { principleId: p.id };
  // A content gap: the note for the topic missed most, from the same window's "Didn't know it" mistakes.
  const gaps = Object.entries(mistakes).filter(([, m]) => m.slip === 'knowledge' && m.at >= dna.from && m.at <= dna.to);
  const open = gaps.filter(([, m]) => !m.resolved).map(([id]) => id);
  const pick = (ids: string[]) => mostMissedSubtopic(ids, (q) => subtopicOfQuestion(certId, q));
  const noteId = pick(open) ?? pick(gaps.map(([id]) => id));
  return noteId ? { noteId } : null;
}

/** Everything resolveAction needs, read from the content and this learner's progress. */
export function actionContext(cert: Certification, progress: CertProgress): ActionContext {
  const notes = getNotes(cert.id);
  const principles = getPrinciples(cert.id);
  return {
    focus: weekFocus(cert.domains, readinessFor(cert, progress.answers)),
    topSlip: topSlip(cert.id, progress.mistakes),
    exam: { questions: cert.exam.questions },
    noteKind: (code) => {
      if (findNote(cert.id, code)) return { kind: 'subtopic' };
      const d = notes?.domains.find((x) => x.topics.some((t) => t.id === code));
      return d ? { kind: 'topic', domainId: d.id } : undefined;
    },
    principleKind: (id) => (findPrinciple(cert.id, id) ? 'principle' : principles?.families.some((f) => f.id === id) ? 'family' : undefined),
    hasGlossary: hasTerms(cert.id),
  };
}

/** The button for a destination: its words, and what a screen reader adds. */
export function destinationButton(d: Destination, cert: Certification): { label: string; hint: string } {
  const domain = (id: string) => cert.domains.find((x) => x.id === id);
  switch (d.to) {
    case 'note': {
      const n = findNote(cert.id, d.id);
      return { label: 'Open the note', hint: n ? `Opens the study note: ${n.name}` : 'Opens the study note' };
    }
    case 'notesDomain':
      return { label: 'Open the notes', hint: `Opens the ${domain(d.domainId)?.short ?? ''} study notes`.replace('  ', ' ') };
    case 'notes':
      return d.q ? { label: `Look up ${d.q}`, hint: 'Searches the study notes' } : { label: 'Open the notes', hint: 'Opens the study notes and their search' };
    case 'glossary':
      return d.q ? { label: `Look up ${d.q}`, hint: 'Searches the glossary' } : { label: 'Open the glossary', hint: 'Opens the glossary and its search' };
    case 'principle': {
      const p = findPrinciple(cert.id, d.id);
      return { label: 'Read the principle', hint: p ? `Opens the principle: ${p.title}` : 'Opens the principle' };
    }
    case 'principles': {
      const f = d.family ? getPrinciples(cert.id)?.families.find((x) => x.id === d.family) : undefined;
      return f ? { label: 'Read the principles', hint: `Opens the principles: ${f.title}` } : { label: 'Open the principles', hint: 'Opens the exam-mindset principles' };
    }
    case 'practice': {
      const dm = domain(d.domainId);
      return { label: `Practice ${dm?.short ?? domainTitle(d.domainId, cert)}`, hint: `Starts ${WEEK_PRACTICE_COUNT} questions in ${domainTitle(d.domainId, cert)}` };
    }
    case 'mock':
      return d.full
        ? { label: 'Start a full mock', hint: `${d.questions} questions. Choose the timing first.` }
        : { label: 'Start a mini mock', hint: `${d.questions} questions. Choose the timing first.` };
    case 'mistakes':
      return { label: 'Open the mistake journal', hint: 'Your misses, and why you slipped' };
  }
}

/** Open a destination. Practice starts its set (the screen can sit above old Results: start clean). */
export function openDestination(d: Destination, cert: Certification): void {
  switch (d.to) {
    case 'note':
      return router.push({ pathname: '/notes/subtopic/[id]', params: { id: d.id } });
    case 'notesDomain':
      return router.push({ pathname: '/notes/[domain]', params: { domain: d.domainId } });
    case 'notes':
      return router.push(d.q ? { pathname: '/notes', params: { q: d.q } } : '/notes');
    case 'glossary':
      return router.push(d.q ? { pathname: '/glossary', params: { q: d.q } } : '/glossary');
    case 'principle':
      return router.push({ pathname: '/principles/[id]', params: { id: d.id } });
    case 'principles':
      return router.push(d.family ? { pathname: '/principles', params: { family: d.family } } : '/principles');
    case 'practice': {
      const short = cert.domains.find((x) => x.id === d.domainId)?.short ?? domainTitle(d.domainId, cert);
      return guardedStart(() => startPractice(cert.id, { count: WEEK_PRACTICE_COUNT, domainId: d.domainId, title: `Final week · ${short}` }), openSessionFromStack);
    }
    case 'mock':
      return router.push({ pathname: '/mock-start', params: { questions: String(d.questions) } });
    case 'mistakes':
      return router.push('/mistakes');
  }
}

/** One task's button, ready to draw: undefined when the task has no action. */
export function taskButton(action: TaskAction | undefined, cert: Certification, ctx: ActionContext) {
  if (!action) return undefined;
  const d = resolveAction(action, ctx);
  return { ...destinationButton(d, cert), destination: d, open: () => openDestination(d, cert) };
}
