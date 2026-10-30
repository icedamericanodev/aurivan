/**
 * Test helpers for the website side of sync (src/webcloud): the bank as the
 * website would load it, a fake index.html host, and the website's own way
 * of recording an answer (index.html recordAnswerParity, in short).
 *
 * Not a test file (no .test suffix, outside __tests__).
 */
import { getCertification } from '../src/content/certifications';
import { getAllQuestions } from '../src/content/loader';
import { noteSubtopics } from '../src/content/notes';
import { dayKey } from '../src/engine/streak';
import type { WebHost } from '../src/webcloud/device';
import type { WebBank, WebState } from '../src/webcloud/toWeb';

const questions = getAllQuestions('cisa');
const byId = new Map(questions.map((q) => [q.id, q]));
const notes = new Set(noteSubtopics('cisa').map((n) => n.id));
const domains = (getCertification('cisa')?.domains ?? []).map((d) => d.id);

export const QUESTION_IDS = questions.map((q) => q.id);
export const NOTE_IDS = [...notes];
export const DOMAINS = domains;

/** The website's bank: a question copy is what index.html keeps for saved and missed questions. */
export const BANK: WebBank = {
  question: (id) => byId.has(id),
  note: (id) => notes.has(id),
  domain: (id) => domains.includes(id),
  copy: (id) => {
    const q = byId.get(id);
    return q ? (JSON.parse(JSON.stringify({ id: q.id, domain: Number(/^d(\d+)_/.exec(q.id)?.[1] ?? 0), question: (q as { stem?: string }).stem ?? '' })) as Record<string, unknown>) : null;
  },
  domainOf: (id) => /^d(\d+)_/.exec(id)?.[1] ?? null,
  domains,
};

export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

export interface FakeWeb {
  state: WebState;
  exam: string | null;
  busy: boolean;
  writes: number;
  /** An older page whose loader drops the mocks' `origin` marker. */
  stripOrigin: boolean;
  host: WebHost;
}

export function fakeWeb(state: WebState = {}): FakeWeb {
  const w: FakeWeb = {
    state: clone(state),
    exam: null,
    busy: false,
    writes: 0,
    stripOrigin: false,
    host: {
      readWeb: () => clone(w.state),
      writeWeb: (next) => {
        w.writes++;
        const s = clone(next);
        if (w.stripOrigin && Array.isArray(s.mockHistory)) for (const m of s.mockHistory as Record<string, unknown>[]) delete m.origin;
        w.state = s;
      },
      examDate: () => w.exam,
      setExamDate: (d) => {
        w.exam = d;
      },
      busy: () => w.busy,
    },
  };
  return w;
}

/** The website answers a question (index.html recordAnswerParity, the parts sync carries). */
export function webAnswer(w: FakeWeb, id: string, ok: boolean, at: number) {
  const s = w.state;
  const log = (s.answerLog ??= {}) as Record<string, { attempts: number; correctCount: number; lastCorrect: boolean; lastAt: number }>;
  const prev = log[id];
  log[id] = { attempts: (prev?.attempts ?? 0) + 1, correctCount: (prev?.correctCount ?? 0) + (ok ? 1 : 0), lastCorrect: ok, lastAt: at };
  const ml = (s.mistakeLog ??= {}) as Record<string, { at: number; resolved: boolean }>;
  if (!ok) ml[id] = { at, resolved: false };
  else if (ml[id] && !ml[id].resolved) ml[id].resolved = true;
  const days = (s.studyDays ??= []) as string[];
  const d = dayKey(at);
  if (!days.includes(d)) days.push(d);
  days.sort();
}
