/**
 * One word for the review queue ("due") and one line for the 20-per-session
 * cap, wherever the count shows; and US "Practice" in every visible string.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { getAllQuestions } from '../content/loader';
import { todaysPlan } from '../engine/planner';
import { DAY_MS, REVIEW_CAP_LINE, REVIEW_SESSION_CAP, REVIEW_UNIT, type ReviewEntry } from '../engine/srs';
import { reviewSubtitle, startReview } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('review queue wording', () => {
  it('uses one word and explains the cap in one line', () => {
    expect(REVIEW_UNIT).toBe('due');
    expect(REVIEW_SESSION_CAP).toBe(20);
    expect(REVIEW_CAP_LINE).toBe('Reviews come 20 at a time');
    expect(reviewSubtitle(55)).toBe('Reviews come 20 at a time, most overdue first');
    expect(reviewSubtitle(12)).toBe('Missed questions, due now');
    expect(reviewSubtitle(0)).toBe('All caught up');
  });

  it("Today's review item and the review session share the same cap", () => {
    const plan = todaysPlan({ stage: 'practice', dueReviews: 55, dailyGoal: 20, daysLeft: 40, examQuestions: 150 });
    expect(plan[0]).toEqual({ kind: 'review', count: REVIEW_SESSION_CAP });
    // Seed 55 due reviews: one session asks 20 of them (it used to ask 30).
    const review: Record<string, ReviewEntry> = {};
    const ids = getAllQuestions('cisa').slice(0, 55).map((q) => q.id);
    for (const id of ids) review[id] = { box: 1, dueAt: Date.now() - DAY_MS, lastSeen: 0, reps: 1 };
    useProgress.setState((s) => ({ byCert: { ...s.byCert, cisa: { ...s.byCert.cisa, answers: {}, review, bookmarks: [], mocks: [], lessonsDone: [], mistakes: {}, gameBest: {}, gameRecent: {}, notesRead: [] } } }));
    const session = startReview('cisa');
    expect(session!.questionIds).toHaveLength(REVIEW_SESSION_CAP);
    useSession.getState().clear();
  });
});

describe('US spelling in visible copy', () => {
  it('no string literal in screens, components or lib says "Practise"', () => {
    const roots = ['app', 'components', 'lib'].map((d) => join(__dirname, '..', d));
    const files: string[] = [];
    const walk = (p: string) => (statSync(p).isDirectory() ? readdirSync(p).forEach((f) => walk(join(p, f))) : /\.tsx?$/.test(p) && files.push(p));
    roots.forEach(walk);
    const offenders: string[] = [];
    for (const f of files) {
      // Drop comments, then look inside quotes, template literals and JSX text.
      const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      for (const m of code.matchAll(/(['"`])([^'"`\n]*?)\1|>([^<{}\n]+)</g)) {
        const text = m[2] ?? m[3] ?? '';
        if (/\bpractis/i.test(text)) offenders.push(`${f}: ${text.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
