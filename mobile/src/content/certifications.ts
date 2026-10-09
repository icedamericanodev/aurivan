/**
 * Certification registry — the ONE place that lists every certification
 * the app knows about.
 *
 * To launch a new certification:
 *   1. Author its questions (same JSON shape as CISA) under ../data/<cert>/.
 *   2. Add it to PACKS in scripts/build-content.mjs.
 *   3. Flip its `status` below from 'coming_soon' to 'available'.
 *
 * ⚠️  Exam facts (domain weights, question counts, durations) change when
 * the issuer publishes a new exam outline. Re-check each entry against the
 * official outline before launch — the `cert-blueprint-researcher` agent
 * does this for you. CISA weights mirror the web app's DI registry, which
 * is the canonical source (see CLAUDE.md hard rule 2).
 */
import { domainPalette } from '../theme/tokens';
import type { Certification, DomainTone } from './types';

// Use registered: false for marks we can't confirm are registered yet (plain "trademark", no ®).
const ISACA_TM = (name: string, registered = true) =>
  registered
    ? `Not affiliated with or endorsed by ISACA®. ${name}® is a registered trademark of ISACA.`
    : `Not affiliated with or endorsed by ISACA®. ${name} is a trademark of ISACA.`;

const ISACA_MINDSET =
  'Think like a risk-focused advisor: protect the business, follow governance, ' +
  'and prefer the answer that addresses root cause at the right level of authority.';

const ISACA_MIX = { analysis: 0.3, application: 0.55, foundational: 0.15 };

export const CERTIFICATIONS: Certification[] = [
  {
    id: 'cisa',
    name: 'CISA',
    fullName: 'Certified Information Systems Auditor',
    issuer: 'ISACA',
    mindset:
      'The auditor assesses, recommends, and reports — never fixes. ' + ISACA_MINDSET,
    trademarkNotice: ISACA_TM('CISA'),
    status: 'available',
    exam: {
      questions: 150,
      minutes: 240,
      difficultyMix: ISACA_MIX,
      passingNote: 'ISACA reports scaled scores from 200–800; 450 is the passing mark.',
    },
    domains: [
      { id: '1', name: 'Information System Auditing Process', short: 'IS Audit', weight: 18, tone: 0 },
      { id: '2', name: 'Governance and Management of IT', short: 'IT Governance', weight: 18, tone: 1 },
      { id: '3', name: 'IS Acquisition, Development & Implementation', short: 'IS Acquisition', weight: 12, tone: 2 },
      { id: '4', name: 'IS Operations & Business Resilience', short: 'IS Operations', weight: 26, tone: 3 },
      { id: '5', name: 'Protection of Information Assets', short: 'Info Protection', weight: 26, tone: 4 },
    ],
  },
  {
    id: 'cism',
    name: 'CISM',
    fullName: 'Certified Information Security Manager',
    issuer: 'ISACA',
    mindset:
      'Think like a security manager who serves the business: governance and ' +
      'business alignment come before technical fixes. ' + ISACA_MINDSET,
    trademarkNotice: ISACA_TM('CISM'),
    status: 'coming_soon',
    exam: {
      questions: 150,
      minutes: 240,
      difficultyMix: ISACA_MIX,
      passingNote: 'ISACA reports scaled scores from 200–800; 450 is the passing mark.',
    },
    domains: [
      { id: '1', name: 'Information Security Governance', short: 'Governance', weight: 17, tone: 0 },
      { id: '2', name: 'Information Security Risk Management', short: 'Risk Mgmt', weight: 20, tone: 1 },
      { id: '3', name: 'Information Security Program', short: 'Program', weight: 33, tone: 2 },
      { id: '4', name: 'Incident Management', short: 'Incidents', weight: 30, tone: 3 },
    ],
  },
  {
    id: 'crisc',
    name: 'CRISC',
    fullName: 'Certified in Risk and Information Systems Control',
    issuer: 'ISACA',
    mindset:
      'Think like a risk practitioner: identify, assess, respond, and monitor — ' +
      'risk ownership sits with the business. ' + ISACA_MINDSET,
    trademarkNotice: ISACA_TM('CRISC'),
    status: 'coming_soon',
    exam: {
      questions: 150,
      minutes: 240,
      difficultyMix: ISACA_MIX,
      passingNote: 'ISACA reports scaled scores from 200–800; 450 is the passing mark.',
    },
    domains: [
      { id: '1', name: 'Governance', short: 'Governance', weight: 26, tone: 0 },
      { id: '2', name: 'IT Risk Assessment', short: 'Assessment', weight: 20, tone: 1 },
      { id: '3', name: 'Risk Response and Reporting', short: 'Response', weight: 32, tone: 2 },
      { id: '4', name: 'Information Technology and Security', short: 'IT & Security', weight: 22, tone: 3 },
    ],
  },
  {
    id: 'aaia',
    name: 'AAIA',
    fullName: 'Advanced in AI Audit',
    issuer: 'ISACA',
    mindset:
      'Think like a senior auditor applied to AI: governance, accountability, ' +
      'and evidence over hype. ' + ISACA_MINDSET,
    trademarkNotice: ISACA_TM('AAIA', false),
    trademarkRegistered: false,
    status: 'coming_soon',
    exam: {
      questions: 90,
      minutes: 150,
      difficultyMix: ISACA_MIX,
      passingNote: 'Check ISACA’s current candidate guide for scoring details.',
    },
    domains: [
      { id: '1', name: 'AI Governance and Risk', short: 'Governance', weight: 33, tone: 0 },
      { id: '2', name: 'AI Operations', short: 'Operations', weight: 46, tone: 1 },
      { id: '3', name: 'AI Auditing Tools and Techniques', short: 'Tools', weight: 21, tone: 2 },
    ],
  },
  {
    id: 'cissp',
    name: 'CISSP',
    fullName: 'Certified Information Systems Security Professional',
    issuer: 'ISC2',
    mindset:
      'Think like a manager and advisor, not a technician: protect people first, ' +
      'then align security with business goals and due care.',
    trademarkNotice:
      'Not affiliated with or endorsed by ISC2. CISSP® is a registered trademark of ISC2, Inc.',
    status: 'coming_soon',
    exam: {
      questions: 125, // CAT exam: 100–150 items; mock uses the midpoint
      minutes: 180,
      difficultyMix: { analysis: 0.35, application: 0.5, foundational: 0.15 },
      passingNote: 'ISC2 reports scaled scores out of 1000; 700 is the passing mark.',
    },
    domains: [
      { id: '1', name: 'Security and Risk Management', short: 'Risk Mgmt', weight: 16, tone: 0 },
      { id: '2', name: 'Asset Security', short: 'Assets', weight: 10, tone: 1 },
      { id: '3', name: 'Security Architecture and Engineering', short: 'Architecture', weight: 13, tone: 2 },
      { id: '4', name: 'Communication and Network Security', short: 'Network', weight: 13, tone: 3 },
      { id: '5', name: 'Identity and Access Management', short: 'IAM', weight: 13, tone: 4 },
      { id: '6', name: 'Security Assessment and Testing', short: 'Testing', weight: 12, tone: 0 },
      { id: '7', name: 'Security Operations', short: 'Operations', weight: 13, tone: 1 },
      { id: '8', name: 'Software Development Security', short: 'AppSec', weight: 10, tone: 2 },
    ],
  },
];

export function getCertification(id: string): Certification | undefined {
  return CERTIFICATIONS.find((c) => c.id === id);
}

export function getDomain(cert: Certification, domainId: string) {
  return cert.domains.find((d) => d.id === domainId);
}

export const DEFAULT_CERT_ID = 'cisa';

/**
 * The colour for a domain tone (0 Lake, 1 Moss, 2 Ochre, 3 Heather, 4 Slate)
 * in light or dark mode. Use it for dots, bars and ring segments only,
 * never for text (tones are not tuned for text contrast).
 */
export function domainColor(tone: DomainTone, isDark: boolean): string {
  return (isDark ? domainPalette.dark : domainPalette.light)[tone];
}

const ISSUER_MARK: Record<Certification['issuer'], string> = { ISACA: 'ISACA®', ISC2: 'ISC2' };
const ISSUER_OWNER: Record<Certification['issuer'], string> = { ISACA: 'ISACA', ISC2: 'ISC2, Inc.' };

/** Ends a sentence without doubling a period ("ISC2, Inc." stays as is). */
const sentence = (s: string) => (s.endsWith('.') ? s : `${s}.`);

/** "A", "A and B", "A, B and C" (or "or"). */
function joinList(items: string[], word: 'and' | 'or' = 'and'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}

/**
 * One combined notice for every certification the app names, grouped by owner:
 * "Aurivan is not affiliated with or endorsed by ISACA® or ISC2. CISA®, CISM® and
 * CRISC® are registered trademarks of ISACA. AAIA is a trademark of ISACA. …"
 * Same legal content as each cert's own notice, without repeating it per cert.
 */
export function combinedTrademarkNotice(certs: Certification[] = CERTIFICATIONS): string {
  const issuers = [...new Set(certs.map((c) => c.issuer))];
  const parts = [`Aurivan is not affiliated with or endorsed by ${joinList(issuers.map((i) => ISSUER_MARK[i]), 'or')}.`];
  for (const issuer of issuers) {
    const own = certs.filter((c) => c.issuer === issuer);
    const registered = own.filter((c) => c.trademarkRegistered !== false).map((c) => `${c.name}®`);
    const plain = own.filter((c) => c.trademarkRegistered === false).map((c) => c.name);
    if (registered.length) {
      parts.push(sentence(`${joinList(registered)} ${registered.length > 1 ? 'are registered trademarks' : 'is a registered trademark'} of ${ISSUER_OWNER[issuer]}`));
    }
    if (plain.length) {
      parts.push(sentence(`${joinList(plain)} ${plain.length > 1 ? 'are trademarks' : 'is a trademark'} of ${ISSUER_OWNER[issuer]}`));
    }
  }
  return parts.join(' ');
}
