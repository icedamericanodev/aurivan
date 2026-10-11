/**
 * The bundled Help content follows the What's New style (CLAUDE.md):
 * the benefit in plain words, never a question code, a domain number, a
 * count of items or an internal label. What's next has no dates and no
 * promises. The FAQ is 6–10 entries, including "Is Aurivan affiliated with
 * ISACA? No." The fixes list passes its own checker.
 */
import appJson from '../../app.json';
import { CERTIFICATIONS } from '../content/certifications';
import { FAQ, FIXES, shortVersion, WHATS_NEW, WHATS_NEXT } from '../content/support';
import { fixesProblems, SUPPORT_TOPICS } from '../engine/support';

const lines = WHATS_NEW.flatMap((e) => [...(e.new ?? []), ...(e.improved ?? []), ...(e.fixed ?? [])]);

describe('What’s new', () => {
  it('the newest entry is this app version, and versions are newest first', () => {
    expect(WHATS_NEW[0].version).toBe(appJson.expo.version);
    const parts = (v: string) => v.split('.').map(Number);
    for (let i = 1; i < WHATS_NEW.length; i++) {
      const [a, b] = [parts(WHATS_NEW[i - 1].version), parts(WHATS_NEW[i].version)];
      expect(a[0] * 1e6 + a[1] * 1e3 + a[2]).toBeGreaterThan(b[0] * 1e6 + b[1] * 1e3 + b[2]);
      expect(WHATS_NEW[i - 1].date >= WHATS_NEW[i].date).toBe(true);
    }
  });

  it('every entry has something to say and a real date', () => {
    for (const e of WHATS_NEW) {
      expect((e.new?.length ?? 0) + (e.improved?.length ?? 0) + (e.fixed?.length ?? 0)).toBeGreaterThan(0);
      expect(e.date).toMatch(/^2026-\d{2}-\d{2}$/);
    }
  });

  it.each(lines.map((l) => [l]))('reads like What’s New: %s', (line) => {
    expect(line).toMatch(/^[A-Z“]/);
    expect(line).toMatch(/[.!]$/);
    expect(line.length).toBeLessThanOrEqual(200);
    expect(line).not.toMatch(/\b[dD]\d_\d{2,}\b/); // question codes
    expect(line).not.toMatch(/\b(domain|D)\s?\d\b/i); // domain numbers
    expect(line).not.toMatch(/\b\d+\s+(questions?|items?|notes?|lessons?|subtopics?)\b/i); // counts
    expect(line).not.toMatch(/\b(subtopic|refactor|rebuilt|schema|store|component|backfill|back-fill)\b/i);
  });

  it('shows short versions', () => {
    expect(shortVersion('1.7.0')).toBe('1.7');
    expect(shortVersion('1.6.1')).toBe('1.6.1');
  });
});

describe('What’s next', () => {
  it('has each list, at most 8 items each, no dates and no promises', () => {
    for (const status of ['progress', 'planned', 'shipped'] as const) {
      const n = WHATS_NEXT.filter((i) => i.status === status).length;
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(8);
    }
    for (const i of WHATS_NEXT) {
      const text = `${i.title} ${i.body}`;
      expect(text).not.toMatch(/\b(20\d\d|Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December|soon|next month|next week)\b/);
      expect(text).not.toMatch(/\b(will|guarantee|promise)\b/i);
    }
  });

  it('a shipped item names a version that What’s new lists', () => {
    const versions = new Set(WHATS_NEW.map((e) => e.version));
    for (const i of WHATS_NEXT.filter((x) => x.status === 'shipped')) expect(versions.has(i.shippedIn!)).toBe(true);
  });
});

describe('Common questions', () => {
  it('has 6 to 10 entries with unique ids and a support topic each', () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(6);
    expect(FAQ.length).toBeLessThanOrEqual(10);
    expect(new Set(FAQ.map((f) => f.id)).size).toBe(FAQ.length);
    const topics = new Set(SUPPORT_TOPICS.map((t) => t.code));
    for (const f of FAQ) {
      expect(topics.has(f.topic)).toBe(true);
      expect(f.question.endsWith('?')).toBe(true);
      expect(f.answer.length).toBeGreaterThan(0);
    }
  });

  it('covers the questions the product plan asks for', () => {
    const qs = FAQ.map((f) => f.question).join('\n');
    for (const want of [/readiness a range/, /new phone/, /affiliated with ISACA/, /review count/, /report a problem/i, /data does the app keep/]) {
      expect(qs).toMatch(want);
    }
    const isaca = FAQ.find((f) => /affiliated with ISACA/.test(f.question))!;
    expect(isaca.answer[0].startsWith('No.')).toBe(true);
  });

  it('never invites real exam content, and says why when asked', () => {
    const all = FAQ.flatMap((f) => [f.question, ...f.answer]).join('\n');
    expect(all).not.toMatch(/was this on your exam|send us (the )?questions you saw/i);
    expect(all).toMatch(/can’t accept or use questions from the real exam/);
  });
});

describe('Fixes after learner reports', () => {
  it('the bundled list passes its checker', () => {
    expect(fixesProblems(FIXES, CERTIFICATIONS.map((c) => c.id))).toEqual([]);
  });
});
