/**
 * CISA motion lessons — ORIGINAL Aurivan writing.
 *
 * Not copied or paraphrased from any review manual or study guide; topics
 * follow the public CISA job practice areas, and facts are anchored to the
 * public frameworks listed in each lesson's `references`. Before adding a
 * lesson, run it past `isaca-concept-reviewer` and `cisa-citation-*`.
 */
import type { Lesson } from './types';

const PROVENANCE = 'Original Aurivan content. Not affiliated with or endorsed by ISACA.';
const OUTLINE = 'CISA job practice 2024';

export const CISA_LESSONS: Lesson[] = [
  {
    id: 'cisa-l-d1-charter',
    certId: 'cisa',
    domainId: '1',
    order: 1,
    title: 'The audit charter: who the auditor answers to',
    minutes: 3,
    provenance: PROVENANCE,
    references: ['ITAF Standard 1001 — Audit Charter', 'ITAF Standard 1002 — Organisational Independence'],
    outlineVersion: OUTLINE,
    lastReviewed: '2026-10-06',
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit process',
        title: 'The audit charter',
        subtitle: 'Why the person who approves the audit function matters more than the person who writes its rules.',
      },
      {
        type: 'idea',
        heading: 'What a charter does',
        body: 'An audit charter is the founding document of the audit function. It sets out its purpose, its authority to access people and records, and its responsibilities. Without it, an auditor is a guest who can be shown the door.',
      },
      {
        type: 'analogy',
        heading: 'Think of a referee',
        body: 'A referee paid and appointed by one of the teams cannot be trusted, however fair they try to be. Auditors are the same: their independence comes from who appoints them and who they report to.',
      },
      {
        type: 'stack',
        heading: 'The reporting lines',
        layers: [
          { label: 'Board / audit committee', note: 'Approves the charter and receives audit results' },
          { label: 'Chief audit executive', note: 'Reports functionally to the audit committee' },
          { label: 'Senior management', note: 'Handles administrative matters only (budget, HR)' },
          { label: 'IT and the business', note: 'The areas being audited — never the approver' },
        ],
        caption: 'Independence flows from the top layer down, not from the area being audited.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Have the CIO review the charter so IT agrees with it.”',
        why: 'It sounds collaborative, but letting the audited area shape the auditor’s authority undermines independence. Management can comment; the audit committee approves.',
      },
      {
        type: 'tip',
        body: 'When a question asks who should approve the charter or where audit should report, look for the audit committee or board — never the function being audited.',
      },
      {
        type: 'check',
        question: 'Who should approve the IS audit charter?',
        options: ['The chief information officer', 'The audit committee', 'The external auditor', 'The head of IT security'],
        correctIndex: 1,
        explanation: 'The audit committee (or board) approves the charter. That keeps audit independent of the management it audits.',
      },
    ],
  },
  {
    id: 'cisa-l-d2-governance',
    certId: 'cisa',
    domainId: '2',
    order: 1,
    title: 'Governance vs management: directing vs doing',
    minutes: 3,
    provenance: PROVENANCE,
    references: ['COBIT 2019 Framework — governance (EDM) and management (APO, BAI, DSS, MEA) objectives'],
    outlineVersion: OUTLINE,
    lastReviewed: '2026-10-06',
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · Governance',
        title: 'Governance vs management',
        subtitle: 'One sets direction. The other makes it happen. The exam tests whether you can tell them apart.',
      },
      {
        type: 'compare',
        heading: 'Two different jobs',
        left: {
          title: 'Governance',
          points: ['Evaluates options', 'Directs priorities', 'Monitors performance', 'Board-level accountability'],
        },
        right: {
          title: 'Management',
          points: ['Plans and builds', 'Runs operations', 'Monitors delivery', 'Executive-level responsibility'],
        },
        caption: 'COBIT 2019: governance is Evaluate–Direct–Monitor; management is Plan–Build–Run–Monitor.',
      },
      {
        type: 'analogy',
        heading: 'A ship and its crew',
        body: 'The owners decide where the ship is going and how much risk they will accept. The captain and crew decide how to sail there. Owners who start steering, or crew who change the destination, both create problems.',
      },
      {
        type: 'flow',
        heading: 'How direction becomes action',
        steps: [
          { label: 'Board sets direction', note: 'Strategy, risk appetite, priorities' },
          { label: 'Management plans', note: 'Turns direction into programmes and budgets' },
          { label: 'Teams deliver', note: 'Build and run the services' },
          { label: 'Results reported up', note: 'Board monitors against what it directed' },
        ],
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: 'An answer where the board selects a specific technology or vendor.',
        why: 'That is a management decision. The board’s role is to set direction and risk appetite, then hold management accountable for the choice.',
      },
      {
        type: 'tip',
        body: 'Ask: is this deciding what and why (governance), or how (management)? Questions about risk appetite, strategic alignment and accountability point to governance.',
      },
      {
        type: 'check',
        question: 'Which of these is a governance responsibility?',
        options: [
          'Selecting the backup software',
          'Approving the organisation’s risk appetite',
          'Scheduling patch deployments',
          'Configuring firewall rules',
        ],
        correctIndex: 1,
        explanation: 'Setting risk appetite is direction-setting by the board. The other three are management and operations.',
      },
    ],
  },
  {
    id: 'cisa-l-d3-change',
    certId: 'cisa',
    domainId: '3',
    order: 1,
    title: 'Change control: why developers don’t ship to production',
    minutes: 3,
    provenance: PROVENANCE,
    references: ['ISO/IEC 27001:2022 Annex A 8.32 — Change management', 'ISO/IEC 27001:2022 Annex A 8.31 — Separation of environments'],
    outlineVersion: OUTLINE,
    lastReviewed: '2026-10-06',
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 3 · Acquisition and development',
        title: 'Change control',
        subtitle: 'Most outages and many frauds start with an unreviewed change. Here is the path a safe change takes.',
      },
      {
        type: 'flow',
        heading: 'The life of a change',
        steps: [
          { label: 'Request', note: 'Documented, with a business reason' },
          { label: 'Assess and approve', note: 'Impact and risk reviewed before work starts' },
          { label: 'Build and test', note: 'In development and test, never production' },
          { label: 'Migrate', note: 'Moved to production by someone other than the developer' },
          { label: 'Review', note: 'Confirm it did what was intended' },
        ],
      },
      {
        type: 'idea',
        heading: 'Why separation matters',
        body: 'If the person who writes code can also release it, nobody else ever sees it before customers do. A mistake — or a deliberate backdoor — reaches production unchecked. Separating these duties is a preventive control.',
      },
      {
        type: 'compare',
        heading: 'Normal vs emergency changes',
        left: { title: 'Normal change', points: ['Approved before implementation', 'Fully tested first', 'Scheduled release'] },
        right: {
          title: 'Emergency change',
          points: ['May be applied first to restore service', 'Still logged at the time', 'Formally reviewed and approved afterwards'],
        },
        caption: 'Emergencies bend the order, not the rules: every change is eventually documented and approved.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Developers have production access, but all their changes are logged.”',
        why: 'Logging is detective — it tells you after the damage. The stronger control is preventive: remove developer access to production and use a separate release role.',
      },
      {
        type: 'check',
        question: 'What is the GREATEST risk in this situation: developers can move their own code into production?',
        options: [
          'Changes may be released without documentation',
          'Unauthorised or untested code can reach production',
          'Release schedules may slip',
          'Developers may need more training',
        ],
        correctIndex: 1,
        explanation: 'Without separation, unauthorised or untested code can go live. Documentation gaps and delays are lesser consequences.',
      },
    ],
  },
  {
    id: 'cisa-l-d4-rpo-rto',
    certId: 'cisa',
    domainId: '4',
    order: 1,
    title: 'RPO and RTO: the two clocks of recovery',
    minutes: 4,
    provenance: PROVENANCE,
    references: ['NIST SP 800-34 Rev. 1 — Contingency Planning Guide', 'ISO 22301:2019 — Business continuity management'],
    outlineVersion: OUTLINE,
    lastReviewed: '2026-10-06',
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Operations and resilience',
        title: 'RPO and RTO',
        subtitle: 'Two numbers decide how a business recovers from disaster. Mixing them up is one of the most common exam errors.',
      },
      {
        type: 'compare',
        heading: 'Looking back vs looking forward',
        left: {
          title: 'RPO — Recovery Point Objective',
          points: ['How much data you can afford to lose', 'Measured back in time from the incident', 'Drives backup and replication frequency'],
        },
        right: {
          title: 'RTO — Recovery Time Objective',
          points: ['How long the service can be down', 'Measured forward from the incident', 'Drives recovery site and staffing choices'],
        },
      },
      {
        type: 'analogy',
        heading: 'Writing an essay',
        body: 'Your laptop crashes. RPO is how much of the essay you lose since your last save. RTO is how long until you are typing again on a working machine. Saving more often fixes the first; a spare laptop fixes the second.',
      },
      {
        type: 'stack',
        heading: 'Lower targets cost more',
        layers: [
          { label: 'RPO ≈ 0', note: 'Synchronous replication — no data loss, highest cost' },
          { label: 'RPO in minutes', note: 'Asynchronous replication or frequent log shipping' },
          { label: 'RPO in hours', note: 'Periodic backups' },
          { label: 'RPO in days', note: 'Daily or weekly backups — cheapest, most loss' },
        ],
        caption: 'The business sets the targets in the business impact analysis; IT designs to meet them.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“A hot site will reduce the RPO.”',
        why: 'A hot site shortens recovery time (RTO). How much data you lose depends on how recently it was copied — that is RPO, fixed by backup and replication frequency.',
      },
      {
        type: 'tip',
        body: 'Data loss → RPO → backups and replication. Downtime → RTO → recovery sites and procedures. Both targets come from the business impact analysis, not from IT.',
      },
      {
        type: 'check',
        question: 'A business requires an RPO of near zero. What is the BEST way to achieve it?',
        options: ['Nightly backups to tape', 'A hot recovery site', 'Synchronous data replication', 'A shorter RTO'],
        correctIndex: 2,
        explanation: 'Only synchronous replication keeps a second copy current at all times. A hot site improves recovery time, not data loss.',
      },
    ],
  },
  {
    id: 'cisa-l-d5-mfa',
    certId: 'cisa',
    domainId: '5',
    order: 1,
    title: 'Authentication factors: what makes MFA real',
    minutes: 3,
    provenance: PROVENANCE,
    references: ['NIST SP 800-63B — Digital Identity Guidelines: Authentication', 'NIST SP 800-53 Rev. 5 — IA-2 Identification and Authentication'],
    outlineVersion: OUTLINE,
    lastReviewed: '2026-10-06',
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Protection of assets',
        title: 'Authentication factors',
        subtitle: 'Two passwords are not two factors. Here is how to spot genuine multi-factor authentication.',
      },
      {
        type: 'stack',
        heading: 'The three factor types',
        layers: [
          { label: 'Something you know', note: 'Password, PIN, security answer' },
          { label: 'Something you have', note: 'Hardware token, phone authenticator, smart card' },
          { label: 'Something you are', note: 'Fingerprint, face, other biometrics' },
        ],
        caption: 'Multi-factor means at least two different types.',
      },
      {
        type: 'analogy',
        heading: 'A bank safe deposit box',
        body: 'You need your key (something you have) and the bank checks your ID (something you are, shown on the card). Two keys would only prove you carried two keys.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Users enter a password, then answer a security question.”',
        why: 'Both are things you know. That is two-step, single-factor authentication — an attacker who phishes one can usually phish the other.',
      },
      {
        type: 'idea',
        heading: 'Not all second factors are equal',
        body: 'Phishing-resistant factors such as hardware security keys bind the login to the real site. One-time codes sent by SMS still count as a second factor but can be intercepted or redirected.',
      },
      {
        type: 'check',
        question: 'Which combination is true multi-factor authentication?',
        options: ['Password and PIN', 'Password and hardware token', 'PIN and security question', 'Two different passwords'],
        correctIndex: 1,
        explanation: 'A password (know) plus a hardware token (have) combines two different factor types. The others use only knowledge factors.',
      },
    ],
  },
];
