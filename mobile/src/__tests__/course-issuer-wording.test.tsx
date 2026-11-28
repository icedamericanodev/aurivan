/**
 * Course-issuer wording (product review, 28 Nov 2026): four places a learner of a course from
 * another issuer, or with "sections", would still read ISACA-shaped wording.
 *
 *   1. Help's footer names the active course's issuer (notAffiliatedLine).
 *   2. The exam guide's booking line: each guide's own line, else the course issuer's site.
 *   3. The welcome reads the chosen course (sub line, trademark line), and onboarding asks
 *      "Which exam?" only when two or more courses are on offer (tested in onboarding-course.test.tsx).
 *   4. The two domain badges read "Section Mastery" / "All Sections" for a course with sections.
 *
 * The hard rule: CISA (and every course without these fields) reads word for word as before.
 * The fake courses here are made up ("XYZ"); no real issuer is added to the app.
 */
import fs from 'node:fs';
import path from 'node:path';
import { heroKeyWidth, heroTilesFit } from '../app/(tabs)/practice';
import { NOT_AFFILIATED } from '../components/help';
import { EXAM_TRADEMARK_LINE, markedCourseName, WELCOME_LINE, welcomeLine, welcomeTrademarkLine } from '../content/brand';
import * as certifications from '../content/certifications';
import { CERTIFICATIONS, getCertification, IIA, ISACA, ISC2, notAffiliatedLine } from '../content/certifications';
import type { DomainStyle } from '../content/types';
import { caseMarks, caseSets, GATE_LINE, gateLine, MOCK_SUGGEST_LINE, mockSuggestLine, setInfo, suggestLine } from '../engine/badgeCatalog';
import { lastPressed } from '../engine/fieldGuide';
import { BADGES, badgeName, badgeRule, badgeViews, markLabel, type MarkState } from '../engine/milestones';
import { bookingLine, NO_SITE_BOOKING_LINE, readySigns } from '../engine/readySigns';
import { momentFor } from '../lib/milestones';

// The Practice screen module (for its pure hero helpers) loads screens' imports: the usual stand-ins.
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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, canDismiss: () => false, setParams: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View: V } = jest.requireActual('react-native');
  return { SafeAreaView: V, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const cisa = getCertification('cisa')!;
const SECTIONS: DomainStyle = { noun: 'Section', numbering: 'letter' };
const sectioned = { domainStyle: SECTIONS };
/** Words the compliance list never allows in our own claims (a "not … endorsed by" notice is the allowed form). */
const BANNED = /\b(official|approved|partner|accredited|licensed by|aligned)\b/i;

describe('1. Help footer: the active course’s issuer', () => {
  it('CISA (ISACA) reads exactly as before', () => {
    expect(NOT_AFFILIATED).toBe('KaiSip is independent and not affiliated with or endorsed by ISACA.');
    expect(notAffiliatedLine()).toBe(NOT_AFFILIATED);
    expect(notAffiliatedLine(cisa.issuer)).toBe(NOT_AFFILIATED);
    expect(notAffiliatedLine(ISACA)).toBe(NOT_AFFILIATED);
    for (const c of CERTIFICATIONS.filter((x) => x.issuer.id === 'isaca')) expect(notAffiliatedLine(c.issuer)).toBe(NOT_AFFILIATED);
  });

  it('another issuer is named the way its trademark notice writes it, or by its plain name', () => {
    expect(notAffiliatedLine(ISC2)).toBe('KaiSip is independent and not affiliated with or endorsed by ISC2®.');
    const xyz = { id: 'xyz', name: 'The XYZ Board', site: 'xyz.example' };
    expect(notAffiliatedLine(xyz)).toBe('KaiSip is independent and not affiliated with or endorsed by The XYZ Board.');
    for (const line of [notAffiliatedLine(ISC2), notAffiliatedLine(xyz), NOT_AFFILIATED]) {
      expect(line).not.toMatch(BANNED);
      expect(line).not.toMatch(/ISACA/.test(line) ? /ISC2|XYZ/ : /ISACA/);
    }
  });
});

describe('2. The exam guide’s booking line', () => {
  it('a guide without its own line falls back to the course issuer’s site (CISA’s issuer: isaca.org)', () => {
    expect(bookingLine(cisa.issuer.site)).toBe('Check isaca.org before you book.');
    expect(bookingLine('xyz.example')).toBe('Check xyz.example before you book.');
  });

  it('isaca.org only for ISACA; each issuer its own site; an issuer with no site names none', () => {
    // CISA's issuer, with or without its site written down: word for word as before.
    expect(bookingLine(cisa.issuer)).toBe('Check isaca.org before you book.');
    expect(bookingLine({ id: 'isaca' })).toBe('Check isaca.org before you book.');
    expect(bookingLine()).toBe('Check isaca.org before you book.');
    // The other issuers the app names have their own sites.
    expect(bookingLine(ISC2)).toBe('Check isc2.org before you book.');
    expect(bookingLine(IIA)).toBe('Check theiia.org before you book.');
    expect(bookingLine({ id: 'xyz', site: 'xyz.example' })).toBe('Check xyz.example before you book.');
    // An issuer with no site (or a blank one): no site named, and never isaca.org.
    expect(NO_SITE_BOOKING_LINE).toBe('Check the exam body’s website before you book.');
    for (const none of [{ id: 'xyz' }, { id: 'xyz', site: '  ' }]) {
      expect(bookingLine(none)).toBe(NO_SITE_BOOKING_LINE);
      expect(bookingLine(none)).not.toMatch(/isaca/i);
    }
    // Every course in the app: its issuer has a site, and only ISACA's courses read isaca.org.
    for (const c of CERTIFICATIONS) {
      expect(c.issuer.site).toBeTruthy();
      expect(/isaca\.org/.test(bookingLine(c.issuer))).toBe(c.issuer.id === 'isaca');
    }
  });

  it('Ready to book? follows the issuer the same way (the issuer wins over a bare site)', () => {
    const met = {
      readinessLog: Array.from({ length: 7 }, (_, k) => ({ day: `2026-10-${String(21 + k).padStart(2, '0')}`, min: 82, last: 82 })),
      today: '2026-10-27',
      domains: ['1', '2', '3'].map((id) => ({ id, answered: 40, pct: 74 })),
      mocks: [{ total: 50 }, { total: 150, timing: 'standard' as const }],
      examQuestions: 150,
    };
    expect(readySigns({ ...met, issuer: cisa.issuer }).isacaLine).toBe('Check isaca.org before you book.');
    expect(readySigns({ ...met, issuer: { id: 'xyz' } }).isacaLine).toBe(NO_SITE_BOOKING_LINE);
    expect(readySigns({ ...met, issuer: IIA, issuerSite: 'isaca.org' }).isacaLine).toBe('Check theiia.org before you book.');
    expect(readySigns(met).isacaLine).toBe('Check isaca.org before you book.');
  });

  it('each guide’s own line names its issuer’s site (CISA isaca.org, the CIA packs theiia.org)', () => {
    const repo = path.join(__dirname, '..', '..', '..');
    const line = (file: string) => JSON.parse(fs.readFileSync(path.join(repo, file), 'utf8')).check_before_booking as string;
    expect(line('data/exam/cisa_exam_guide.json')).toMatch(/check isaca\.org before you book\.$/);
    for (const pack of ['cia1', 'cia2', 'cia3', 'ciac']) {
      const l = line(`data/cia/${pack}/exam/${pack}_exam_guide.json`);
      expect(l).toMatch(/theiia\.org before you book\.$/);
      expect(l).not.toMatch(/isaca/i);
    }
  });
});

describe('3. The welcome reads the chosen course', () => {
  it('CISA’s sub line and trademark line are word for word as before', () => {
    expect(welcomeLine(cisa)).toBe(WELCOME_LINE);
    expect(welcomeLine()).toBe(WELCOME_LINE);
    expect(WELCOME_LINE).toBe('Your CISA® exam study, one day at a time.');
    expect(welcomeTrademarkLine(cisa)).toBe(EXAM_TRADEMARK_LINE);
    expect(welcomeTrademarkLine()).toBe(EXAM_TRADEMARK_LINE);
    expect(welcomeTrademarkLine({ name: 'X', trademarkNotice: '  ' })).toBe(EXAM_TRADEMARK_LINE);
  });

  it('another course’s name carries ® on its mark (none when unconfirmed), and its own notice', () => {
    expect(markedCourseName({ name: 'XYZ Part 1', mark: 'XYZ' })).toBe('XYZ® Part 1');
    expect(welcomeLine({ name: 'XYZ Part 1', mark: 'XYZ' })).toBe('Your XYZ® Part 1 exam study, one day at a time.');
    expect(welcomeLine(getCertification('aaia'))).toBe('Your AAIA exam study, one day at a time.');
    expect(welcomeLine(getCertification('cissp'))).toBe('Your CISSP® exam study, one day at a time.');
    expect(markedCourseName({ name: 'Other name', mark: 'XYZ' })).toBe('Other name');
    const notice = 'Not affiliated with or endorsed by XYZ®. XYZ® is a registered trademark of XYZ, Inc.';
    expect(welcomeTrademarkLine({ name: 'XYZ', trademarkNotice: notice })).toBe(notice);
    expect(welcomeLine({ name: 'XYZ Part 1', mark: 'XYZ' })).not.toMatch(BANNED);
  });

  it('the ® goes on the mark only at a word break (the whole name, or a space or dash after it)', () => {
    expect(markedCourseName({ name: 'XYZ' })).toBe('XYZ®');
    expect(markedCourseName({ name: 'XYZ', mark: 'XYZ' })).toBe('XYZ®');
    expect(markedCourseName({ name: 'XYZ-2', mark: 'XYZ' })).toBe('XYZ®-2');
    expect(markedCourseName({ name: 'CISA' })).toBe('CISA®');
    // The mark is only the start of a longer word: no ® inside it.
    expect(markedCourseName({ name: 'XYZA Part 1', mark: 'XYZ' })).toBe('XYZA Part 1');
    expect(markedCourseName({ name: 'XYZ2', mark: 'XYZ' })).toBe('XYZ2');
    expect(markedCourseName({ name: 'XYZé', mark: 'XYZ' })).toBe('XYZé');
    expect(markedCourseName({ name: 'XYZ Part 1', mark: '' })).toBe('XYZ Part 1');
  });
});

describe('4. Domain words on the Practice hero and the domain badges', () => {
  it('the hero tile key: "Domains" keeps its measured 60pt; "Sections" needs a little more', () => {
    expect(heroKeyWidth('Domains')).toBe(60);
    expect(heroKeyWidth('Sections')).toBeGreaterThan(60);
    // CISA's rule is unchanged (the default key width is the measured 60pt).
    for (const w of [320, 360, 393, 430]) for (const s of [1, 1.15, 1.25]) expect(heroTilesFit(w, s)).toBe(heroTilesFit(w, s, 60));
  });

  it('every badge name and rule is BADGES’ own for a course without a style (CISA)', () => {
    for (const b of BADGES) {
      expect(badgeName(b.id)).toBe(b.name);
      expect(badgeName(b.id, cisa)).toBe(b.name);
      expect(badgeRule(b.id, cisa)).toBe(b.rule);
    }
    expect(badgeName('no-such-badge', sectioned)).toBe('no-such-badge');
  });

  it('a course with sections reads "Section Mastery" and "All Sections"; the ids stay', () => {
    expect(badgeName('firm-footing', sectioned)).toBe('Section Mastery');
    expect(badgeName('whole-map', sectioned)).toBe('All Sections');
    expect(badgeRule('firm-footing', sectioned)).toBe('Reach 70% mastery in a section, with 20 or more of its questions answered. One badge per section.');
    expect(badgeRule('whole-map', sectioned)).toMatch(/in every section\.$/);
    for (const b of BADGES.filter((x) => x.id !== 'firm-footing' && x.id !== 'whole-map')) expect(badgeName(b.id, sectioned)).toBe(b.name);
    // Saved keys are untouched: the names change, never the ids.
    expect(BADGES.find((b) => b.id === 'firm-footing')!.name).toBe('Domain Mastery');
    expect(BADGES.find((b) => b.id === 'whole-map')!.name).toBe('All Domains');
  });

  it('the badge case, its left-over marks, the shelf and the fallbacks follow the course', () => {
    const domains = [
      { id: '1', short: 'Foundations', weight: 60, tone: 0 as const },
      { id: '2', short: 'Ethics', weight: 40, tone: 1 as const },
    ];
    const exam = { questions: 125, minutes: 150 };
    // An earned leaf for a section the list no longer has ("firm-footing:3") shows by its badge name.
    const earned = { 'whole-map': 1_000, 'firm-footing:3': 2_000 };
    const plain = caseMarks({ marks: [], earned, domains, exam, mindsetData: false });
    const styled = caseMarks({ marks: [], earned, domains, exam, mindsetData: false, domainStyle: SECTIONS });
    expect(plain.find((m) => m.key === 'whole-map')!.caption).toBe('All Domains');
    expect(styled.find((m) => m.key === 'whole-map')!.caption).toBe('All Sections');
    expect(styled.find((m) => m.key === 'whole-map')!.name).toBe('All Sections');
    expect(styled.find((m) => m.key === 'whole-map')!.rule).toMatch(/every section/);
    expect(styled.map((m) => m.key).sort()).toEqual(plain.map((m) => m.key).sort());

    const shelf = [{ id: '1', short: 'Foundations' }];
    expect(lastPressed({ 'firm-footing:1': 5 }, shelf)[0].name).toBe('Domain Mastery · Foundations');
    expect(lastPressed({ 'firm-footing:1': 5 }, shelf, 3, sectioned)[0].name).toBe('Section Mastery · Foundations');

    expect(markLabel('whole-map', [])).toBe('All Domains');
    expect(markLabel('whole-map', [], sectioned)).toBe('All Sections');
    const views = badgeViews([], { 'whole-map': 1 }, 'milestone', sectioned);
    expect(views.find((v) => v.def.id === 'whole-map')!.earned[0].label).toBe('All Sections');
  });

  it('the set heading follows the course’s count and noun; CISA keeps "The Five Domains"', () => {
    const exam = { questions: 125, minutes: 150 };
    expect(setInfo('domains', cisa.exam, cisa.domains.length).name).toBe('The Five Domains');
    expect(setInfo('domains', cisa.exam, cisa.domains.length, cisa).name).toBe('The Five Domains');
    expect(setInfo('domains', exam, 3, sectioned).name).toBe('The Three Sections');
    expect(setInfo('domains', exam, 4, sectioned).name).toBe('The Four Sections');
    expect(setInfo('domains', exam, 3).name).toBe('The Three Domains');
    // Every other set's name never carries the noun.
    expect(setInfo('evergreen', exam, 3, sectioned).name).toBe(setInfo('evergreen', exam, 3).name);
    const sets = caseSets([], exam, 3, sectioned);
    expect(sets.find((x) => x.info.id === 'domains')!.info.name).toBe('The Three Sections');
    expect(caseSets([], cisa.exam, 5).find((x) => x.info.id === 'domains')!.info.name).toBe('The Five Domains');
  });

  it('the badge copy, the gate line and the mock suggestion say "section" for a course with sections', () => {
    // CISA (no style): word for word as before.
    expect(GATE_LINE.wholeMap).toBe('Opens when every domain reaches 65%.');
    expect(gateLine('wholeMap', cisa)).toBe(GATE_LINE.wholeMap);
    expect(gateLine('mindsetData', sectioned)).toBe(GATE_LINE.mindsetData);
    expect(MOCK_SUGGEST_LINE).toBe('Best once every domain reaches 65%.');
    expect(mockSuggestLine(cisa)).toBe(MOCK_SUGGEST_LINE);
    // Sections.
    expect(gateLine('wholeMap', sectioned)).toBe('Opens when every section reaches 65%.');
    expect(mockSuggestLine(sectioned)).toBe('Best once every section reaches 65%.');

    const domains = [
      { id: '1', short: 'Foundations', weight: 60, tone: 0 as const },
      { id: '2', short: 'Ethics', weight: 40, tone: 1 as const },
    ];
    const exam = { questions: 125, minutes: 150 };
    const marks = [
      { key: 'whole-map', badge: 'whole-map', label: 'All Sections', met: false, progress: 0.5, detail: '1 of 2 sections at 65%' },
      { key: 'firm-footing:2:80', badge: 'firm-footing', label: 'Section Mastery · Ethics · 80%', met: false, progress: 0, detail: '0% mastery · 0 of 40 answered' },
      { key: 'dress-rehearsal', badge: 'dress-rehearsal', label: 'Dress Rehearsal', met: false, progress: 0, detail: '' },
      { key: 'dress-rehearsal:2', badge: 'dress-rehearsal', label: 'Dress Rehearsal · 2', met: false, progress: 0, detail: '' },
    ] satisfies MarkState[];
    const words = (domainStyle?: DomainStyle) =>
      caseMarks({ marks, earned: {}, domains, exam, mindsetData: false, ...(domainStyle ? { domainStyle } : {}) })
        .map((m) => [m.howTo, m.unlock, m.effort, m.detail, m.gateLine ?? ''].join(' | '))
        .join('\n');
    const plainCopy = words();
    const sectionCopy = words(SECTIONS);
    expect(plainCopy).toMatch(/\bdomains?\b/);
    expect(sectionCopy).not.toMatch(/\bdomains?\b/i);
    expect(sectionCopy).toMatch(/weakest section/);
    expect(sectionCopy).toMatch(/Opens when every section reaches 65%\./);
    expect(sectionCopy).toMatch(/other sections moving too/);
    expect(sectionCopy).toMatch(/every section reached 65%/);
    // The same copy with the noun swapped back is CISA's, word for word (the fixture's own
    // label and detail say "section" on both sides, so both are swapped).
    const back = (t: string) => t.replace(/section/g, 'domain').replace(/Section/g, 'Domain');
    expect(back(sectionCopy)).toBe(back(plainCopy));

    const dr = caseMarks({ marks, earned: {}, domains, exam, mindsetData: false, domainStyle: SECTIONS }).find((m) => m.badge === 'dress-rehearsal')!;
    expect(suggestLine(dr, 'practice', null)).toBe(MOCK_SUGGEST_LINE);
    expect(suggestLine(dr, 'practice', null, false, sectioned)).toBe('Best once every section reaches 65%.');
  });
});

describe('5. A badge moment’s rule and unlock (Results)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('a Stretch tier shows its own 80% rule; other marks keep their badge’s rule', () => {
    const stretch = momentFor('cisa', 'firm-footing:4:80')!;
    expect(stretch.rule).toMatch(/^Reach 80% mastery in this domain/);
    expect(momentFor('cisa', 'firm-footing:4')!.rule).toBe(BADGES.find((b) => b.id === 'firm-footing')!.rule);
    expect(momentFor('cisa', 'first-foothold')!.rule).toBe(BADGES.find((b) => b.id === 'first-foothold')!.rule);
  });

  it('a course with sections: the rule, and the unlock of a mark the case no longer has, say "section"', () => {
    const real = certifications.getCertification;
    jest.spyOn(certifications, 'getCertification').mockImplementation((id: string) => {
      const c = real(id);
      return c && id === 'cisa' ? { ...c, domainStyle: SECTIONS } : c;
    });
    expect(momentFor('cisa', 'whole-map')!.rule).toBe(badgeRule('whole-map', sectioned));
    expect(momentFor('cisa', 'firm-footing:4')!.rule).toBe(badgeRule('firm-footing', sectioned));
    // A leaf for a section the course does not have: no mark on the case, so the unlock falls back to the rule.
    const gone = momentFor('cisa', 'firm-footing:9')!;
    expect(gone.unlock).toBe(badgeRule('firm-footing', sectioned));
    expect(gone.unlock).not.toMatch(/domain/);
    expect(gone.setName).toBe('The Five Sections');
  });
});
