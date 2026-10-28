/**
 * The review queue never shows its total (premium pass 1.4 / 4.6, mobile
 * 1.49): each surface names the set it starts, "16 ready today · oldest
 * first", at most one session's 20. And US "Practice" in every visible string.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { getAllQuestions } from '../content/loader';
import { todaysPlan } from '../engine/planner';
import { DAY_MS, readyLine, readyToday, REVIEW_ORDER, REVIEW_SESSION_CAP, type ReviewEntry } from '../engine/srs';
import { reviewSubtitle, startReview } from '../lib/sessions';
import { useProgress } from '../store/progress';
import { useSession } from '../store/session';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('review queue wording', () => {
  it('names the set a tap starts, never the queue total', () => {
    expect(REVIEW_SESSION_CAP).toBe(20);
    expect(REVIEW_ORDER).toBe('oldest first');
    // readyToday: the due ones, at most one session's worth, never below 0.
    expect(readyToday(55)).toBe(20);
    expect(readyToday(12)).toBe(12);
    expect(readyToday(0)).toBe(0);
    expect(readyToday(-3)).toBe(0);
    expect(readyLine(16)).toBe('16 ready to revisit · oldest first');
    expect(readyLine(16, 'today')).toBe('16 ready today · oldest first');
    expect(reviewSubtitle(55)).toBe('20 ready today · oldest first'); // not "55"
    expect(reviewSubtitle(12)).toBe('12 ready today · oldest first');
    expect(reviewSubtitle(0)).toBe('All caught up');
    expect(reviewSubtitle(300)).not.toMatch(/300/);
  });

  it("Today's review item and the review session share the same cap", () => {
    const plan = todaysPlan({ stage: 'practice', dueReviews: 55, dailyMinutes: 20, daysLeft: 40, examQuestions: 150 });
    // The item keeps the whole queue (so Today knows the set is part of it; it shows only the set);
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
