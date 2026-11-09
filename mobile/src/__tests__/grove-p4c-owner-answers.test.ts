/**
 * Grove Phase 4, Sky's owner answers (5 Nov 2026, design-notes/grove/phase4b/p4-owner-answers.md),
 * the phone's last round:
 *  - O7: the Mindset tips come from the website's own list. The content build reads the MINDSET list
 *    in ../index.html (scripts/mindset-pack.cjs) and writes it into the phone's content pack, so the
 *    two apps can never drift and nobody copies the list by hand.
 *  - The short-text rule ("dont make it too wordy consider users attention span"): interface lines are
 *    short (sublines about 6 words, notes about 12), nothing is said twice on one screen, and the
 *    honesty lines stay.
 *
 * Plain English for the founder: these tests read the real website file, so if someone renames or
 * breaks the website's tip list, the phone's build and these tests fail instead of the strip going
 * quietly empty.
 */
import fs from 'node:fs';
import path from 'node:path';
import { lookUpItems, upNextMeta } from '../app/(tabs)/learn';
import { SETTINGS_ROW_NOTE } from '../components/youTop';
import { shelfLine } from '../components/herbarium';
import { lowEndLine } from '../components/youReadiness';
import { EXAM_FOCUSED_SUBTITLE } from '../components/fit';
import { getCertification } from '../content/certifications';
import { mindsetTipsFor } from '../content/mindset';
import { clearContentCaches, registerPackSource, BundledSource } from '../content/packs';
import type { PackSource } from '../content/packs';
import { KEEP_DOT, youSummary } from '../engine/groveYou';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: () => true },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { extractMindset, buildMindsetPack } = require('../../scripts/mindset-pack.cjs') as {
  extractMindset: (html: string) => { tips: string[]; problems: string[] };
  buildMindsetPack: (html: string, certId: string) => { pack: { certId: string; tips: string[] }; problems: string[] };
};

const WEBSITE = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'index.html'), 'utf8');
const words = (s: string) => s.trim().split(/\s+/).length;

// ── O7: the website's list, read by the content build ─────────────────
describe('the Mindset pack (O7): read from the website, word for word', () => {
  it('finds the website’s MINDSET list and keeps every tip as written', () => {
    const { tips, problems } = extractMindset(WEBSITE);
    expect(problems).toEqual([]);
    expect(tips.length).toBeGreaterThan(0);
    // The website's first tip and its fixed "FIRST, eliminate" (no spaced hyphen), as written.
    expect(tips[0]).toBe('You are an auditor: you assess, recommend, and report. You do not fix.');
    expect(tips).toContain('When you see FIRST, eliminate any option that implements a solution.');
  });

  it('the phone shows exactly the website’s list, in its order (the built pack is the source)', () => {
    expect(mindsetTipsFor('cisa')).toEqual(extractMindset(WEBSITE).tips);
  });

  it('a renamed, empty or broken list is a build problem, never a quiet empty strip', () => {
    expect(extractMindset('<script>const TIPS = ["a"];</script>').problems[0]).toMatch(/no "const MINDSET/);
    expect(extractMindset('const MINDSET = [\n];').problems).toEqual(['the MINDSET list is empty']);
    expect(extractMindset("const MINDSET = [\n  'single quotes',\n];").problems[0]).toMatch(/not plain double-quoted strings/);
    expect(extractMindset('const MINDSET = [\n  "",\n  "ok",\n];')).toEqual({ tips: ['ok'], problems: ['MINDSET entry 1 is empty or not text'] });
    expect(extractMindset('')).toEqual({ tips: [], problems: [expect.stringMatching(/no "const MINDSET/)] });
  });

  it('keeps a trailing comma, curly quotes and symbols as the website has them', () => {
    const html = 'x\nconst MINDSET = [\n  "COBIT 2019 is ISACA’s framework.",\n  "Preventive > Detective.",\n];\nconst NEXT = 1;';
    expect(buildMindsetPack(html, 'cisa')).toEqual({ pack: { certId: 'cisa', tips: ['COBIT 2019 is ISACA’s framework.', 'Preventive > Detective.'] }, problems: [] });
  });

  it('a course with no tips, or a source without the mindset file, gives [] (the strip hides)', () => {
    expect(mindsetTipsFor('no-such-course')).toEqual([]);
    // A downloaded pack from before O7 has no mindset(): no tips, no crash. A damaged entry is dropped.
    const fake = (tips: unknown): PackSource => ({
      ...BundledSource,
      name: 'fake',
      certIds: () => ['zz'],
      info: (id) => (id === 'zz' ? { certId: 'zz', rev: 1, schemaVersion: 1 } : null),
      mindset: tips === undefined ? undefined : () => ({ certId: 'zz', tips: tips as string[] }),
    });
    const off = registerPackSource(fake(undefined));
    expect(mindsetTipsFor('zz')).toEqual([]);
    off();
    clearContentCaches();
    const off2 = registerPackSource(fake(['One.', '', 7, 'Two.']));
    expect(mindsetTipsFor('zz')).toEqual(['One.', 'Two.']);
    off2();
    clearContentCaches();
  });
});

// ── The short-text rule (interface text only) ────────────────────────
describe('short interface text (Sky, 5 Nov 2026)', () => {
  const cisa = getCertification('cisa')!;

  it('Learn: tile lines are about 6 words; the Up next reason uses Practice’s words', () => {
    const items = lookUpItems(cisa, 3, { showNotes: true, showGlossary: true, showPrinciples: true, showGuide: true, showWeek: true });
    for (const i of items) expect(words(i.line)).toBeLessThanOrEqual(6);
    expect(upNextMeta(5, 'focus', 'lesson 2 of 7').meta).toBe('5 min · where you’ll gain most');
  });

  it('You: the summary says only what nothing else on You says (focus and countdown)', () => {
    const s = youSummary({ studyDaysThisWeek: 3, range: { enough: true, answered: 120, low: 68, high: 78, centre: 73 }, focusShort: 'Info Protection', answered: 200, daysLeft: 38 });
    expect(s.shown).toBe(`Focus next: Info Protection, where you’ll gain most${KEEP_DOT}38 days to go.`);
  });

  it('You: the low end in three short sentences, the honesty words kept', () => {
    const line = lowEndLine(68);
    expect(line).toBe('Your low end, 68, is the cautious end. The study bar is 80, a goal, not an exam score. You’re 12 under it.');
    for (const sentence of line.split(/(?<=\.) /)) expect(words(sentence)).toBeLessThanOrEqual(12);
  });

  it('You: the badge shelf uses the kit’s line', () => {
    expect(shelfLine(9, { name: 'Domain Mastery', at: new Date(2026, 10, 5).getTime() } as Parameters<typeof shelfLine>[1])).toBe('9 earned · Domain Mastery');
    expect(shelfLine(0)).toBe('No badges yet');
    expect(words(SETTINGS_ROW_NOTE)).toBeLessThanOrEqual(6);
  });

  it('Settings: the exam-focused line keeps both ideas in two short sentences', () => {
    expect(EXAM_FOCUSED_SUBTITLE).toBe('Mocks and weak spots lead Today. Lessons stay in Learn.');
  });

  it('no em or en dashes and none of the banned words in the new lines', () => {
    const lines = [
      lowEndLine(68),
      lowEndLine(85),
      SETTINGS_ROW_NOTE,
      EXAM_FOCUSED_SUBTITLE,
      shelfLine(0),
      upNextMeta(5, 'focus', 'x').meta,
      ...lookUpItems(cisa, 0, { showNotes: true, showGlossary: true, showPrinciples: true, showGuide: true, showWeek: true }).map((i) => i.line),
    ];
    for (const l of lines) {
      expect(l).not.toMatch(/[\u2013\u2014]/);
      expect(l).not.toMatch(/\b(pass|passed|guarantee|official|evolve)\b|you['’]re ready|runner-up/i);
      expect(l).not.toMatch(/Fig\.|Plate|Field guide|Field record|Herbarium/);
    }
  });
});
