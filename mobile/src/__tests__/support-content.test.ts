/**
 * The bundled Help content follows the What's New style (CLAUDE.md):
 * the benefit in plain words, never a question code, a domain number, a
 * count of items, a version number or an internal label. There is no
 * "What's next" list (removed in 1.17.1), and no copy points to one.
 * The FAQ is 6–10 entries, including "Is Aurivan affiliated with
 * ISACA? No." The fixes list passes its own checker.
 */
import appJson from '../../app.json';
import { CERTIFICATIONS } from '../content/certifications';
import * as support from '../content/support';
import { FAQ, FIXES, shortVersion, WHATS_NEW, WHATS_NEW_FOOTER } from '../content/support';
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
    // The version is the section heading; never repeat it inside a line (1.17.1).
    expect(line).not.toMatch(/\bversion\s+\d|\b\d+\.\d+(\.\d+)?\b/i);
  });

  it('shows short versions', () => {
    expect(shortVersion('1.7.0')).toBe('1.7');
    expect(shortVersion('1.6.1')).toBe('1.6.1');
  });
});

// What's next was removed in 1.17.1 (owner decision): the plan stays
// internal (kept outside this repo), so nothing bundled may list or point to it.
describe('No What’s next', () => {
  it('the app bundles no roadmap list', () => {
    expect('WHATS_NEXT' in support).toBe(false);
  });

  it('no learner copy points to What’s next or to planned work', () => {
    const copy = [...lines, WHATS_NEW_FOOTER, ...FAQ.flatMap((f) => [f.question, ...f.answer])].join(' ');
    expect(copy).not.toMatch(/What[’']s next/i);
    expect(copy).not.toMatch(/\b(roadmap|coming soon|in progress|planned)\b/i);
  });

  it('What’s new ends with one fixed line about feedback, with no plans or dates', () => {
    expect(WHATS_NEW_FOOTER).toBe('We improve the app regularly based on learner feedback. Have an idea? Send it from Help.');
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
