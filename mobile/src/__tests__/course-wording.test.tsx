/**
 * CIA_BANK_PLAN.md section 11 (26 Nov 2026): the places that printed CISA- or
 * ISACA-only wording now follow the open course, with a fallback.
 *
 * Plain English for the founder:
 * - Each new course field is optional. When a course leaves it out (every
 *   course live today does), the app prints exactly what it printed before.
 *   Each block below checks both sides: the fallback (CISA unchanged) and a
 *   course that brings its own words (what The IIA's CIA packs will do).
 * - No CIA course is switched on here; the tests use made-up course objects.
 */
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { COACH_HEADING, coachHeading, lastPart, SceneView, sceneKicker } from '../components/lesson';
import { WELCOME_HEADLINE, welcomeHeadline } from '../content/brand';
import { CERTIFICATIONS, getCertification } from '../content/certifications';
import { CISA_LESSONS } from '../content/lessons/cisa';
import type { Lesson, Scene } from '../content/lessons/types';
import { scaledScoreNote } from '../content/scoreNote';
import { domainOf } from '../engine/readiness';
import { bookingLine, DEFAULT_ISSUER_SITE, ISACA_LINE, readySigns, type ReadySignsInput } from '../engine/readySigns';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../components/icons', () => {
  const Icon = () => null;
  return new Proxy({ __esModule: true, ICON_STROKE: 2 } as Record<string, unknown>, {
    get: (t, k: string) => (k in t ? t[k] : Icon),
  });
});

const cisa = getCertification('cisa')!;

// ── 1. The lessons' coach heading ─────────────────────────────────────────
describe('the lesson coach heading follows the course role', () => {
  it('CISA (and a course with no role) keeps "The IS auditor’s lens"', () => {
    expect(COACH_HEADING).toBe('The IS auditor’s lens');
    expect(coachHeading()).toBe('The IS auditor’s lens');
    expect(coachHeading('  ')).toBe('The IS auditor’s lens');
    expect(coachHeading(cisa.notesRole)).toBe('The IS auditor’s lens');
  });

  it('a course with a role gets its own lens, the same words as its notes', () => {
    expect(coachHeading('internal auditor')).toBe('The internal auditor’s lens');
    expect(coachHeading(getCertification('crisc')!.notesRole)).toBe('The risk practitioner’s lens');
  });

  it('the kicker and the part count read the course’s lens, not always CISA’s', () => {
    const cia: Scene = { type: 'idea', heading: 'The internal auditor’s lens', body: 'One. Two. Three.' };
    expect(sceneKicker(cia, 'internal auditor')).toBe('The internal auditor’s lens');
    // Without the role, a CIA lens is just an idea (CISA unchanged).
    expect(sceneKicker(cia)).toBe('The idea');
    // CISA's lens under another course's role is an ordinary idea.
    expect(sceneKicker({ type: 'idea', heading: COACH_HEADING, body: 'x' }, 'internal auditor')).toBe('The idea');
    const listed: Scene = { type: 'idea', heading: 'The internal auditor’s lens', body: 'Lead.', list: { lead: 'Lead.', items: ['a', 'b', 'c'] } };
    expect(lastPart(listed)).toBe(4); // a plain listed idea: lead + 3 items
    expect(lastPart(listed, 'internal auditor')).toBe(1); // the coach scene: one quote
  });

  describe('SceneView shows the open lesson’s course lens', () => {
    let r: ReactTestRenderer | undefined;
    afterEach(() => {
      act(() => r?.unmount());
      r = undefined;
    });
    const texts = () =>
      r!.root.findAll((n: ReactTestInstance) => typeof n.props.v === 'string' && typeof n.props.children === 'string').map((n) => n.props.children as string);
    const base = CISA_LESSONS[0];

    it('a CISA lesson: the coach scene is captioned "The IS auditor’s lens"', () => {
      const scene: Scene = { type: 'idea', heading: COACH_HEADING, body: 'Assess and report.' };
      act(() => {
        r = create(<SceneView scene={scene} lesson={base} />);
      });
      expect(texts()).toContain('The IS auditor’s lens');
      expect(texts()).not.toContain('The idea');
    });

    it('another course’s lesson: its own lens is the coach scene, CISA’s is a plain idea', () => {
      // CRISC is in the registry (coming soon) with the role "risk practitioner".
      const crisc: Lesson = { ...base, certId: 'crisc' };
      const own: Scene = { type: 'idea', heading: 'The risk practitioner’s lens', body: 'Owners own risk.' };
      act(() => {
        r = create(<SceneView scene={own} lesson={crisc} />);
      });
      expect(texts()).toContain('The risk practitioner’s lens');
      expect(texts()).not.toContain('The idea');
      act(() => r!.update(<SceneView scene={{ type: 'idea', heading: COACH_HEADING, body: 'x' }} lesson={crisc} />));
      expect(texts()).toContain('The idea');
    });
  });
});

// ── 2. The welcome headline ───────────────────────────────────────────────
describe('the welcome headline', () => {
  it('falls back to today’s line for CISA, every live course, no course, or a blank one', () => {
    expect(WELCOME_HEADLINE).toBe('Think like an IS auditor.');
    expect(welcomeHeadline()).toBe('Think like an IS auditor.');
    expect(welcomeHeadline(cisa)).toBe('Think like an IS auditor.');
    for (const c of CERTIFICATIONS) expect(welcomeHeadline(c)).toBe(WELCOME_HEADLINE);
    expect(welcomeHeadline({ welcomeHeadline: '   ' })).toBe(WELCOME_HEADLINE);
  });

  it('a course may bring its own', () => {
    expect(welcomeHeadline({ ...cisa, welcomeHeadline: 'Think like an internal auditor.' })).toBe('Think like an internal auditor.');
  });
});

// ── 3. Question ids with a course prefix ──────────────────────────────────
describe('domainOf reads CISA ids and course-prefixed ids', () => {
  it('CISA ids read as before', () => {
    expect(domainOf('d4_217')).toBe('4');
    expect(domainOf('d1_001')).toBe('1');
  });

  it('CIA, CRISC and AAIA ids give their domain, not "?"', () => {
    expect(domainOf('cia1_d1_001')).toBe('1');
    expect(domainOf('cia3_d4_120')).toBe('4');
    expect(domainOf('ciac_d5_001')).toBe('5');
    expect(domainOf('crisc_d2_010')).toBe('2');
    expect(domainOf('aaia_d3_001')).toBe('3');
  });

  it('anything else is still "?"', () => {
    for (const id of ['', 'x', 'd_1', 'dd4_1', '1cia_d1_001', 'CIA1_d1_001', 'cia1_d1', 'cia1__d1_001']) expect(domainOf(id)).toBe('?');
  });
});

// ── 4. The scaled-score note ──────────────────────────────────────────────
describe('the scaled-score note', () => {
  it('every live or listed course reads exactly as before', () => {
    expect(scaledScoreNote(cisa)).toBe('ISACA reports scaled scores from 200 to 800. The score needed is 450.');
    expect(scaledScoreNote(getCertification('cissp')!)).toBe('ISC2 reports scaled scores out of 1000. The score needed is 700.');
    for (const c of CERTIFICATIONS) expect(c.exam.scoreNote).toBeUndefined();
    // The id alone (older callers) still works.
    expect(scaledScoreNote({ id: 'cisa' })).toBe('ISACA reports scaled scores from 200 to 800. The score needed is 450.');
  });

  it('a course’s own line wins; a blank one falls back', () => {
    const iia = 'The IIA reports scaled scores from 250 to 750. The score needed is 600.';
    expect(scaledScoreNote({ id: 'cia1', exam: { scoreNote: iia } })).toBe(iia);
    expect(scaledScoreNote({ id: 'cia1', exam: { scoreNote: ' ' } })).toBe('ISACA reports scaled scores from 200 to 800. The score needed is 450.');
  });

  it('never says "pass" (the owner’s word rule)', () => {
    for (const c of CERTIFICATIONS) expect(scaledScoreNote(c)).not.toMatch(/pass/i);
  });
});

// ── 5. "Check isaca.org before you book." ─────────────────────────────────
describe('the booking line names the issuer’s site', () => {
  const allMet = (over: Partial<ReadySignsInput> = {}): ReadySignsInput => ({
    readinessLog: Array.from({ length: 7 }, (_, k) => ({ day: `2026-10-${String(21 + k).padStart(2, '0')}`, min: 82, last: 82 })),
    today: '2026-10-27',
    domains: ['1', '2', '3', '4', '5'].map((id) => ({ id, answered: 40, pct: 74 })),
    mocks: [{ total: 50 }, { total: 150, timing: 'standard' }],
    examQuestions: 150,
    ...over,
  });

  it('no site (every course today): isaca.org, as before', () => {
    expect(DEFAULT_ISSUER_SITE).toBe('isaca.org');
    expect(ISACA_LINE).toBe('Check isaca.org before you book.');
    expect(bookingLine()).toBe(ISACA_LINE);
    expect(bookingLine('  ')).toBe(ISACA_LINE);
    expect(readySigns(allMet()).isacaLine).toBe('Check isaca.org before you book.');
    expect(readySigns(allMet({ issuerSite: cisa.issuer.site })).isacaLine).toBe('Check isaca.org before you book.');
  });

  it('a course whose issuer has a site names it', () => {
    expect(readySigns(allMet({ issuerSite: 'theiia.org' })).isacaLine).toBe('Check theiia.org before you book.');
    // Still only when every sign is in place.
    expect(readySigns(allMet({ issuerSite: 'theiia.org', mocks: [] })).isacaLine).toBeNull();
  });
});
