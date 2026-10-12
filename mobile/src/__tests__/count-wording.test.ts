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
    expect(REVIEW_CAP_LINE).toBe('20 at a time, most overdue first');
    expect(reviewSubtitle(55)).toBe('20 at a time, most overdue first');
    expect(reviewSubtitle(12)).toBe('Questions to revisit');
    expect(reviewSubtitle(20)).toBe('Questions to revisit'); // exactly 20 fits one session
    expect(reviewSubtitle(0)).toBe('All caught up');
  });

  it("Today's review item and the review session share the same cap", () => {
    const plan = todaysPlan({ stage: 'practice', dueReviews: 55, dailyMinutes: 20, daysLeft: 40, examQuestions: 150 });
    // The item keeps the whole queue, so Today says "Review 55 due" like You and Practice;
    // mobile 1.15: a 20-minute day takes 8 of them (about half the day).
    expect(plan[0]).toEqual({ kind: 'review', count: 8, capped: true, due: 55 });
    // Never more than one session's cap, whatever the day.
    for (const dailyMinutes of [10, 20, 30, 45]) {
      const day = todaysPlan({ stage: 'ready', dueReviews: 200, dailyMinutes, daysLeft: 40, examQuestions: 150, playable: () => false });
      expect(day[0].kind === 'review' && day[0].count).toBeLessThanOrEqual(REVIEW_SESSION_CAP);
    }
    // All the due ones fit today: no "of N" on the item.
    const few = todaysPlan({ stage: 'practice', dueReviews: 6, dailyMinutes: 20, daysLeft: 40, examQuestions: 150 });
    expect(few[0]).toEqual({ kind: 'review', count: 6 });
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
