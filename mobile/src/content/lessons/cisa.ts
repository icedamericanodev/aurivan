/**
 * CISA motion lessons — ORIGINAL Aurivan writing.
 *
 * Not copied or paraphrased from any review manual, QAE or study guide;
 * topics follow the public CISA job practice areas, and facts are anchored
 * to the public frameworks listed in each lesson's `references`. Before
 * adding a lesson, run it past `isaca-concept-reviewer` and `cisa-citation-*`.
 *
 * House rules for authors (checked by src/__tests__/lessons.test.ts where possible):
 * - `id` is stable forever: learner progress is keyed on it. That is why the
 *   change lesson keeps `cisa-l-d3-change` even though it now sits in domain 4.
 * - `order` is the position inside the domain: 1, 2, 3… with no gaps.
 * - Define any jargon the first time a lesson uses it (a learner may open
 *   lessons in any order), and keep copy in sentence case.
 * - Checks are parallel to the `prepares` bank items, never copies. Vary the
 *   answer positions: no two lessons share the same `correctIndex` sequence.
 */
import type { Lesson } from './types';

const PROVENANCE = 'Original Aurivan content. Not affiliated with or endorsed by ISACA.';
const OUTLINE = 'CISA job practice 2024';
const REVIEWED = '2026-10-07';

export const CISA_LESSONS: Lesson[] = [
  // ───────────────────────────── Domain 1 ─────────────────────────────
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
    topics: ['1A1'],
    prepares: ['d1_001'],
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
    id: 'cisa-l-d1-risk-planning',
    certId: 'cisa',
    domainId: '1',
    order: 2,
    title: 'Plan by risk, not by rotation',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISACA IT Audit Standard 1201 (Risk Assessment in Planning)',
      'ISACA IT Audit Standard 1202 (Audit Scheduling)',
      'ISO 31000:2018 (Risk management — Guidelines)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['1A3', '1A2'],
    prepares: ['d1_003', 'd1_062', 'd1_111'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit planning',
        title: 'Plan by risk, not by rotation',
        subtitle: 'Why the audit plan starts from what could hurt the business most, not from whose turn it is.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Audit time is limited. A risk-based plan ranks areas by how likely a failure is and how much it would damage business objectives, then spends effort from the top down. The plan is refreshed whenever the business or its risks change.',
      },
      {
        type: 'analogy',
        heading: 'Think of a building inspector',
        body: 'An inspector with one week does not visit every building in alphabetical order. They start with the old buildings near the fault line that house schools, because that is where a failure would hurt most. Taking turns feels fair, but it leaves the riskiest buildings waiting.',
      },
      {
        type: 'stack',
        heading: 'The three parts of audit risk',
        layers: [
          { label: 'Inherent risk', note: 'How risky the area is before any controls' },
          { label: 'Control risk', note: 'The chance controls fail to prevent or catch a problem' },
          {
            label: 'Detection risk',
            note: 'The chance your own testing misses it. The only part you control, through how much and how directly you test',
          },
        ],
        // Folds in the integrated-audit idea (IT and financial testing together) that d1_111 needs.
        caption:
          'When inherent and control risk are high, you lower detection risk by testing results more directly. In an integrated audit (IT controls and financial figures tested together), weak IT controls mean more direct testing of the figures.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'As an IS (information systems) auditor, you put effort where impact times likelihood is highest. You plan from business objectives, keep the risk assessment current, and adjust testing to the risk you find. Weak controls never mean less work; they mean you test the results more.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The CIO asked us to audit the new staff website (intranet), so it goes first.”',
        why: 'A management request is an input to the plan, not the plan itself. If it ranks low on risk, note it and schedule it; the high-risk areas still come first. Risk-based thinking sets the order.',
      },
      {
        type: 'tip',
        body: 'Exam questions put words like “first” and “best” in capitals: several options may be reasonable, so pick the one that ranks highest. When the question’s opening sentence (the stem) asks for the best basis for an audit plan, look for a current risk assessment tied to business objectives. Rotation, budget, requests and last year’s findings are inputs at most.',
      },
      {
        type: 'check',
        question:
          'A bank will launch mobile payments next quarter. The approved annual audit plan does not cover it. What should the IS audit manager do FIRST?',
        options: [
          'Keep the approved plan and cover mobile payments next year',
          'Ask the payments team to self-assess their own controls',
          'Reassess risk and propose a plan change to the audit committee',
          'Start detailed testing of the mobile app straight away',
        ],
        correctIndex: 2,
        explanation:
          'A major new risk means the plan should be reassessed, and changes go to the body that approved it. Starting testing at once is tempting, but it skips the risk ranking and approval that keep the plan defensible.',
      },
      {
        // Review fix: replaces a term-matching check on audit types with a risk-ranking scenario.
        type: 'check',
        question:
          'One audit slot is left this year. The candidates are the payroll system that pays every employee, and a room-booking tool a senior executive asked to have reviewed. Which should the IS audit manager choose?',
        options: [
          'Payroll, because a failure there would do the most harm',
          'The booking tool, because a senior executive requested it',
          'Split the slot so both get a short review',
          'Whichever of the two was audited least recently',
        ],
        correctIndex: 0,
        explanation:
          'Risk sets the order: a payroll failure hits every employee and the business. Doing the executive’s request first is tempting, but a request is an input to the plan; note it and schedule it when its risk justifies it.',
      },
      {
        type: 'check',
        question:
          'Midway through an audit, an IS auditor finds that change controls over a billing system failed for most of the year. How should the auditor BEST adjust the remaining fieldwork?',
        options: [
          'Stop testing and report all billing figures as unreliable',
          'Ask management to fix the controls, then retest them',
          'Rely on the billing system’s automated totals as planned',
          'Test more billing transactions directly to offset the weak controls',
        ],
        correctIndex: 3,
        explanation:
          'Failed controls raise control risk, so the auditor lowers detection risk by testing the results directly. Stopping and calling the figures unreliable is tempting, but it is a conclusion without the evidence to support it.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-evidence',
    certId: 'cisa',
    domainId: '1',
    order: 3,
    title: 'Which evidence wins',
    minutes: 5,
    provenance: PROVENANCE,
    references: ['ISACA IT Audit Standard 1205 (Evidence)', 'ISACA IT Audit Standard 1206 (Using the Work of Other Experts)'],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['1B3', '1B4'],
    prepares: ['d1_004', 'd1_032', 'd1_013'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit evidence',
        title: 'Which evidence wins',
        subtitle: 'Not all proof is equal. Here is how to rank it when two sources point different ways.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Audit evidence must be sufficient (enough of it) and appropriate (relevant and reliable). Reliability rises when evidence comes from an independent source, is obtained by you directly, and is documented rather than spoken.',
      },
      {
        type: 'analogy',
        heading: 'Buying a used car',
        body: 'The seller says the brakes are fine. The service log shows new pads last month. Then you drive it and brake hard yourself. All three are evidence, but only the last one shows the brakes working today, seen by you.',
      },
      {
        type: 'compare',
        heading: 'Stronger vs weaker evidence',
        left: {
          title: 'Stronger',
          points: [
            'From an independent source',
            'Obtained directly by the auditor',
            'Documented or system-generated',
            'Redone by the auditor (reperformed) or watched happening',
          ],
        },
        right: {
          title: 'Weaker',
          points: ['From the area being audited', 'Passed on by someone else', 'Verbal', 'Asked about'],
        },
        caption: 'Relevance comes first: strong evidence about the wrong control proves nothing.',
      },
      {
        // Review fix: one idea per scene, so continuous auditing vs monitoring was cut.
        type: 'idea',
        heading: 'Experts and analytics',
        body: 'You may use an expert’s work, but first judge their competence and objectivity, and the conclusion stays yours. Data analytics can test every item in the full set (the population), not just a sample.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'As the auditor, you base conclusions on evidence you could defend to an outsider. Independent beats internal, direct beats indirect, documented beats verbal. When the only support is what management told you, you have a lead, not a conclusion.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“We collected hundreds of screenshots, so the evidence is sufficient.”',
        why: 'Volume is not sufficiency. If the items do not address the control objective, or all come from one source the auditee controls, more of them adds nothing. Check relevance and reliability before quantity.',
      },
      {
        // Review fix (MAJOR): a confirmation sent straight to the auditor by a
        // third party is STRONG evidence, so "confirmed" is not a weak cue.
        type: 'tip',
        body: 'When a question asks for the most reliable evidence, pick the option where the auditor obtains it directly, from the system or an independent party. A confirmation a third party sends straight to the auditor is strong. Words like “told”, “stated” or “assured” usually signal inquiry, the weakest kind.',
      },
      {
        type: 'check',
        question: 'An IS auditor must confirm that leavers lose system access on their last day. Which evidence is MOST reliable?',
        options: [
          'The HR director’s written assurance that the process works',
          'A comparison of HR leaver dates with account disable dates',
          'The documented offboarding procedure approved last year',
          'Interviews with three managers who recently had leavers',
        ],
        correctIndex: 1,
        explanation:
          'Matching an independent HR record against system dates is direct, documented evidence of what actually happened. The written assurance is tempting because it is signed, but it is still a statement, not proof the control operated.',
      },
      {
        type: 'check',
        question:
          'An IS auditor wants assurance that no duplicate supplier payments were made last year. Which approach provides the BEST evidence?',
        options: [
          'Sample 40 payments and check each one for a duplicate',
          'Ask accounts payable staff how they prevent duplicates',
          'Inspect the payment system’s duplicate-check configuration',
          'Run analytics over every payment to find duplicates',
        ],
        correctIndex: 3,
        explanation:
          'Analytics can test every payment, so a duplicate cannot hide outside the sample. Inspecting the configuration is tempting, but it shows how the control was designed, not that nothing got through all year.',
      },
      {
        type: 'check',
        question:
          'An outside cloud specialist’s report supports a key audit finding. Management challenges the finding. What is the IS auditor’s MOST appropriate response?',
        options: [
          'Review the specialist’s work and confirm it supports the finding',
          'Refer management to the specialist, who owns the finding',
          'Withdraw the finding to avoid a dispute with management',
          'Ask the audit committee to decide whether the finding stands',
        ],
        correctIndex: 0,
        explanation:
          'Using an expert does not hand over responsibility: the auditor must be satisfied the work supports the finding. Referring management to the specialist is tempting, but the conclusion belongs to the auditor.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-sampling',
    certId: 'cisa',
    domainId: '1',
    order: 4,
    title: 'Sampling without guesswork',
    minutes: 5,
    provenance: PROVENANCE,
    references: ['AICPA AU-C 530 (Audit Sampling) (analogous guidance)', 'ISACA IT Audit Standard 1205 (Evidence)'],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['1B2'],
    prepares: ['d1_009', 'd1_019', 'd1_049'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit testing',
        title: 'Sampling without guesswork',
        subtitle: 'How to test part of a population and still say something true about all of it.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'You rarely test every item, so you test a sample and draw a conclusion about the whole set (the population). Statistical sampling uses random selection and math to measure your confidence. Judgmental sampling relies on your choice, so its results cannot be applied to the whole population (projected) with measured confidence.',
      },
      {
        type: 'analogy',
        heading: 'Tasting the soup',
        body: 'A cook stirs the pot, then tastes one spoonful to judge it all. Skim only the top and you might miss the salt that sank. Random selection is the stirring: it gives every item a fair chance of landing in your spoon.',
      },
      {
        type: 'compare',
        heading: 'Two questions, two methods',
        left: {
          title: 'Attribute sampling',
          points: ['Asks: did the control happen, yes or no?', 'Gives a deviation rate', 'Compared with the tolerable deviation rate'],
        },
        right: {
          title: 'Variable sampling',
          points: ['Asks: how much, in dollars or units?', 'Gives an estimated amount', 'Compared with tolerable misstatement'],
        },
        caption:
          'Tolerable deviation rate: the highest share of control failures you can accept and still call the control effective, set before testing. Tolerable misstatement: the largest error in an amount you can accept. Testing a control points to attribute sampling; estimating a value points to variable sampling.',
      },
      {
        type: 'idea',
        heading: 'What drives sample size',
        body: 'The sample grows when you need more confidence, when the error you can tolerate is smaller, or when you expect more errors. Once a population is large, its size barely changes the sample: one spoonful tells you about a big pot as well as a small one, if it is well stirred.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'As the auditor, you set the confidence level and tolerable error before testing, based on risk. If the sample shows more deviations than you can tolerate, you conclude the control is not effective and report it. You do not move the threshold to fit the result.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“I picked the items that looked riskiest, so I can project the error rate.”',
        why: 'Judgmental selection is good at finding problems, but it is not random, so it cannot stand for the whole population. If you need a measured conclusion, you need statistical sampling.',
      },
      {
        type: 'tip',
        body: 'Read what the question wants to know. “Did the control operate” points to attribute sampling. “How much was misstated” points to variable sampling. “High confidence” points to statistical sampling.',
      },
      {
        // Review fix: a near-miss attribute option, so randomness (not the method name) decides.
        type: 'check',
        question:
          'An IS auditor will test whether user access requests over the past year had manager approval. Which sampling approach is MOST appropriate?',
        options: [
          'Attribute sampling of the requests the auditor judges riskiest',
          'Variable sampling of access requests across the year',
          'Testing every request raised in the last month',
          'Attribute sampling of randomly selected access requests',
        ],
        correctIndex: 3,
        explanation:
          'Approval is a yes-or-no attribute, and random selection lets the result stand for the whole year. Picking the riskiest requests is tempting and good at finding problems, but the result cannot be projected to all requests.',
      },
      {
        type: 'check',
        question:
          'The audit committee wants more assurance over a high-risk payment approval control. Which change to the attribute sampling plan BEST responds?',
        options: [
          'Raise the confidence level, accepting a larger sample',
          'Raise the tolerable deviation rate to keep the sample small',
          'Switch to judgmental selection of the largest payments',
          'Keep the plan and add a management representation letter',
        ],
        correctIndex: 0,
        explanation:
          'More assurance means a higher confidence level, which needs a bigger sample. Focusing on the largest payments is tempting, but judgmental selection lowers measurable confidence instead of raising it.',
      },
      {
        type: 'check',
        question:
          'A sample’s deviation rate exceeds the tolerable rate set at planning. The process owner asks the IS auditor to raise the tolerable rate. What is the auditor’s BEST response?',
        options: [
          'Agree, provided the process owner documents the reason',
          'Remove the failed items as one-off exceptions',
          'Conclude on the planned rate and report the control as ineffective',
          'Retest the same items after the owner explains them',
        ],
        correctIndex: 2,
        explanation:
          'Thresholds are set before testing so results cannot be argued into a pass. Agreeing with documentation is tempting because it looks controlled, but moving the goalposts after the result destroys the test’s objectivity.',
      },
    ],
  },

  // ───────────────────────────── Domain 2 ─────────────────────────────
  {
    // UPGRADE: keeps its original id (learner progress is keyed on it).
    id: 'cisa-l-d2-governance',
    certId: 'cisa',
    domainId: '2',
    order: 1,
    title: 'Governance vs management: directing vs doing',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 Framework — governance (EDM) and management (APO, BAI, DSS, MEA) objectives',
      'ISO/IEC 38500:2024 (Governance of IT for the organization)',
      'The IIA’s Three Lines Model (2020)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['2A2'],
    prepares: ['d2_001', 'd2_002', 'd2_004'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · Governance',
        title: 'Governance vs management',
        subtitle: 'One sets direction. The other makes it happen. The exam tests whether you can tell them apart.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Governance decides what the organization needs from IT and how much risk it will take (its risk appetite), then checks that it got it. Management decides how to deliver. A well-aligned IT strategy traces every major investment back to a business goal.',
      },
      {
        type: 'analogy',
        heading: 'A ship and its crew',
        body: 'The owners decide where the ship is going and how much risk they will accept. The captain and crew decide how to sail there. Owners who start steering, or crew who change the destination, both create problems.',
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
        caption:
          'COBIT 2019 (ISACA’s IT governance framework): governance is evaluate, direct, monitor; management is plan, build, run, monitor.',
      },
      {
        // Review fix: replaces a five-layer stack. Introduces the three lines in
        // plain words, and places the steering committee at management level.
        type: 'idea',
        heading: 'Who does what',
        body: 'Many organizations use a Three Lines model. The first line runs a process and owns its risk. The second line (risk and compliance) advises and challenges them. Internal audit, the third line, gives independent assurance to the board. An IT steering committee is a management group of business and IT leaders that ranks IT investments against strategy.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Governance comes before technology. As the auditor, you check for clear direction, ownership and approval at the right level, and whether IT strategy traces to business goals. You test whether the board gets the information it needs to monitor. You recommend; the board and management decide.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The board should choose the cloud vendor.”',
        why: 'That is a management decision. The board’s role is to set direction and risk appetite, then hold management accountable for the choice. Governance before technology.',
      },
      {
        type: 'tip',
        body: 'Ask: is this deciding what and why (governance), or how (management)? Risk appetite, strategic alignment, oversight and accountability point to governance. Tools, schedules and configurations point to management.',
      },
      {
        type: 'check',
        question:
          'A board approves the IT budget each year but never receives reports on whether projects delivered their expected benefits. What should the IS auditor recommend as BEST?',
        options: [
          'The board should require regular reports on benefits delivered',
          'The board should choose the project delivery tools itself',
          'Project managers should adopt a common delivery method',
          'The IT budget should include a detailed cost breakdown',
        ],
        correctIndex: 0,
        explanation:
          'Governance means evaluate, direct and monitor. Without benefit reporting, the board directs spending but never checks the outcome. Choosing the tools itself is tempting because it looks hands-on, but that is a management decision, not oversight.',
      },
      {
        type: 'check',
        question:
          'The security team designs the access control framework and also gives the audit committee assurance that it works. What should the IS auditor recommend as BEST?',
        options: [
          'Add a second security analyst to review the assurance work',
          'Let the audit committee keep relying on the team’s reports',
          'Have internal audit give independent assurance over the framework',
          'Move the security team’s reporting line to the CIO',
        ],
        correctIndex: 2,
        explanation:
          'Independent assurance is the third line’s job; a team cannot objectively assure its own design. A second analyst from the same team is tempting, but it adds review without adding independence.',
      },
      {
        type: 'check',
        question:
          'An IT steering committee must choose three of five proposed projects for next year. Which basis BEST shows the choice is aligned with the business?',
        options: [
          'The projects that use the newest technology',
          'The order in which the projects were submitted',
          'The projects each department head ranks highest',
          'Each project’s contribution to agreed business objectives',
        ],
        correctIndex: 3,
        explanation:
          'Ranking investments by what they do for agreed business objectives is what alignment means. Department heads’ rankings are tempting because they come from the business, but each head ranks for their own unit, not the enterprise.',
      },
    ],
  },
  {
    id: 'cisa-l-d2-erm',
    certId: 'cisa',
    domainId: '2',
    order: 2,
    title: 'Who owns a risk',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COSO Enterprise Risk Management — Integrating with Strategy and Performance (2017)',
      'ISO 31000:2018 (Risk management — Guidelines)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['2A5'],
    prepares: ['d2_011', 'd2_052', 'd2_021'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · Risk management',
        title: 'Who owns a risk',
        subtitle: 'IT can find a risk and fix a risk. Only the business can decide to live with one.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Enterprise risk management is how an organization finds, ranks and responds to risks in line with what it is willing to accept. Each risk needs a named owner with the authority and budget to act on it.',
      },
      {
        type: 'analogy',
        heading: 'A leaking roof',
        body: 'A home inspector spots a leaking roof and reports it. A roofer quotes for the repair. Only the homeowner decides whether to fix it, insure against the damage, live with it, or sell the house. The inspector and the roofer advise; the owner owns the risk.',
      },
      {
        type: 'stack',
        heading: 'Four ways to respond',
        layers: [
          { label: 'Mitigate', note: 'Add controls to cut likelihood or impact' },
          { label: 'Transfer', note: 'Share the financial impact, for example through insurance' },
          { label: 'Accept', note: 'Live with it, formally and within appetite' },
          { label: 'Avoid', note: 'Stop the activity that creates the risk' },
        ],
        caption: 'What is left after a response is residual risk. Transfer moves some of the cost, never the accountability.',
      },
      {
        // Review fix: was a second structure scene; now one plain idea with an example.
        type: 'idea',
        heading: 'Appetite vs tolerance',
        body: 'Risk appetite is how much risk the board will take to pursue its goals, stated broadly: “a low appetite for outages”. Risk tolerance turns it into a measurable limit: “the payments system may be down no more than two hours a month”. A breach of tolerance triggers escalation. A risk register records each risk, its owner and the agreed response.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'The business owns risk. As the auditor, you never accept a risk on management’s behalf, and neither does IT. You check that each risk has an owner at the right level, that acceptance is formal and within appetite, and that responses are tracked. Then you report the gaps.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The CISO (chief information security officer) has accepted the risk of the unpatched server.”',
        why: 'The CISO advises on security risk, but acceptance belongs to the business owner of the system, at a level with authority over the impact. Acceptance by the wrong person is not valid acceptance.',
      },
      {
        type: 'tip',
        body: 'If a question asks who should accept or own a risk, look for the business process or system owner at the right level. Answers that hand the decision to IT, security or audit are usually traps.',
      },
      {
        // Review fix: the stem no longer names the owner, so the learner must reason about ownership.
        type: 'check',
        question:
          'A project manager reports that a customer database used by the sales team can no longer get security fixes (patches). Replacing it would be costly. Who is MOST appropriate to formally accept the residual risk?',
        options: [
          'The IT security manager, who understands the risk best',
          'The business owner of the sales process, within appetite',
          'The project manager who raised the risk',
          'The database administrator who maintains the system',
        ],
        correctIndex: 1,
        explanation:
          'The business owner who relies on the system owns its risk and may accept it within appetite and their authority. The security manager is tempting because they understand the risk best, but advising is not owning.',
      },
      {
        type: 'check',
        question:
          'A company buys breach insurance and then cancels its planned data encryption project. What should concern the IS auditor MOST?',
        options: [
          'The insurance premium may rise next year',
          'The policy may exclude losses from unencrypted data',
          'Insurance cannot transfer fines or lost customer trust',
          'The insurer may ask to review the company’s controls',
        ],
        correctIndex: 2,
        explanation:
          'Transfer moves part of the financial impact; the company still owns the breach, the fines and its customers’ trust. A policy exclusion is a real concern worth checking, but even a full payout would leave that harm in place.',
      },
      {
        type: 'check',
        question:
          'A board states a low appetite for service outages. The IT team then sets its own outage limits for each system. What should the IS auditor recommend as BEST?',
        options: [
          'Have business owners propose outage tolerances within appetite, for approval',
          'Keep the IT limits, since IT understands the systems best',
          'Replace all limits with one company-wide outage target',
          'Suspend the limits until the board can review them',
        ],
        correctIndex: 0,
        explanation:
          'Tolerances turn the board’s appetite into measurable limits; the owners who bear the impact propose them and senior leaders approve them. Keeping IT’s limits is tempting because IT knows the systems, but IT does not own the business impact.',
      },
    ],
  },

  // ───────────────────────────── Domain 4 ─────────────────────────────
  {
    id: 'cisa-l-d4-bia',
    certId: 'cisa',
    domainId: '4',
    order: 1,
    title: 'Business impact analysis comes first',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO 22301:2019 clause 8.2.2 (Business impact analysis)',
      'ISO/TS 22317:2021 (Guidelines for business impact analysis)',
      'NIST SP 800-34 Rev. 1 (Contingency Planning Guide for Federal Information Systems)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['4B1'],
    prepares: ['d4_004', 'd4_020', 'd4_070'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Business impact analysis',
        title: 'Business impact analysis comes first',
        subtitle: 'Before you can plan a recovery, you have to know what hurts most, and how fast.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A business impact analysis (BIA) asks of each business process: if this stops, what is the damage, and how fast does it grow? The answers rank processes by criticality and set how quickly each must return and how much data it can lose.',
      },
      {
        type: 'analogy',
        heading: 'An emergency room triage nurse',
        body: 'A triage nurse does not treat patients in arrival order, or by whose case looks most interesting. They ask how quickly each condition gets worse and treat the fastest-worsening first. A BIA triages business processes the same way: by how fast the harm grows.',
      },
      {
        type: 'flow',
        heading: 'What the BIA produces',
        steps: [
          { label: 'Identify processes', note: 'And the systems, people and suppliers they depend on' },
          { label: 'Assess impact over time', note: 'Financial, legal, customer and safety harm per hour or day' },
          {
            // Review fix: the RTO fits inside the maximum downtime; the RPO is about data, not time down.
            label: 'Set recovery targets',
            note: 'The longest outage the business can survive (maximum tolerable downtime), a recovery time (RTO) inside it, and how much data it can lose (RPO). More on both next lesson',
          },
          { label: 'Rank criticality', note: 'Recovery tiers confirmed by each process owner' },
          { label: 'Feed the strategy', note: 'Recovery options are chosen only after this' },
        ],
        caption: 'The BIA comes before any recovery strategy or plan.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'The business owns the risk, so the business sets the targets. As the auditor, you check that process owners rated the impacts, senior management approved the targets, and each target is backed by impact and cost. A target without that analysis is a wish, not a requirement.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The most expensive system to replace is the most critical.”',
        why: 'Criticality is about the harm an outage causes, not the price of the asset. A cheap server that runs payroll the day before payday can matter far more than a costly analytics cluster.',
      },
      {
        // Review fix: the "we already have backups" trap is folded in here.
        type: 'tip',
        body: 'If a question asks what comes first in continuity planning, the BIA is usually the answer. Backups do not replace a BIA: they protect data but do not say what must come back first. If it asks who sets recovery targets, look for the process owner and senior management, not IT.',
      },
      {
        type: 'check',
        question:
          'A new CIO wants to contract a hot site (a ready-to-use backup data center) right after recent outages. No BIA exists. What should the IS auditor recommend FIRST?',
        options: [
          'Sign the hot site contract to cut downtime quickly',
          'Write a disaster recovery plan for the current systems',
          'Complete a BIA to set recovery priorities and targets',
          'Test whether existing backups can be restored',
        ],
        correctIndex: 2,
        explanation:
          'Without a BIA, nobody knows which systems need a hot site, so the spend may be wasted. Writing a recovery plan is tempting, but a plan needs targets, and the targets come from the BIA.',
      },
      {
        type: 'check',
        question:
          'During a BIA, the finance owner says month-end close can tolerate five days of outage. IT thinks one day is the limit. Which view should BEST set the target?',
        options: [
          'The stricter of the two views, to be safe',
          'The finance owner’s view, backed by impact analysis',
          'IT’s view, backed by its recovery experience',
          'The IS auditor’s view, after independent testing',
        ],
        correctIndex: 1,
        explanation:
          'The owner who bears the impact sets the target, supported by evidence of harm over time, and senior management approves it. Choosing the stricter view feels safe, but it raises cost without an impact case behind it.',
      },
      {
        type: 'check',
        question:
          'An IS auditor reviews a BIA completed three years ago. Since then the company has launched online sales. What is the GREATEST risk?',
        options: [
          'The BIA no longer matches the corporate document template',
          'Staff who joined since then have not read the BIA',
          'The BIA was never reviewed by the external auditor',
          'Recovery priorities may miss processes that now matter most',
        ],
        correctIndex: 3,
        explanation:
          'A BIA describes the business at one point in time. A new revenue channel changes what hurts most, so recovery may protect yesterday’s priorities. Staff awareness matters, but reading an outdated BIA still teaches the wrong priorities.',
      },
    ],
  },
  {
    // UPGRADE: keeps its original id (learner progress is keyed on it).
    id: 'cisa-l-d4-rpo-rto',
    certId: 'cisa',
    domainId: '4',
    order: 2,
    title: 'RPO and RTO: recovery clocks and recovery sites',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-34 Rev. 1 (Contingency Planning Guide for Federal Information Systems)',
      'ISO 22301:2019 (Business continuity management systems)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['4B5', '4B2'],
    prepares: ['d4_074', 'd4_082', 'd4_068'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Disaster recovery',
        title: 'RPO and RTO',
        subtitle: 'Two numbers decide how a business recovers from disaster. Mixing them up is one of the most common exam errors.',
      },
      {
        // Review fix (MAJOR): a plain core idea replaces the off-topic single-points-of-failure scene.
        type: 'idea',
        heading: 'The core idea',
        body: 'Recovery runs on two clocks. One looks back: how much recent data the business can afford to lose. The other looks forward: how long the service can be down. The business impact analysis (BIA) sets both, and each is met with different tools.',
      },
      {
        type: 'compare',
        heading: 'Looking back vs looking forward',
        left: {
          title: 'RPO, recovery point objective',
          points: [
            'How much data you can afford to lose',
            'Measured back in time from the incident',
            'Drives how often data is backed up or copied to a second site (replicated)',
          ],
        },
        right: {
          title: 'RTO, recovery time objective',
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
        heading: 'Match the site to the clock',
        layers: [
          { label: 'Mirrored site', note: 'A live copy updated with every change: near-zero RTO and RPO, highest cost' },
          { label: 'Hot site', note: 'Equipped and ready, typically hours; data only as fresh as the last copy' },
          { label: 'Warm site', note: 'Hardware in place, data restored on arrival, typically one to a few days' },
          { label: 'Cold site', note: 'Space and power only, weeks to equip, lowest cost' },
        ],
        caption: 'Shorter targets cost more. The BIA sets the target; management approves the least costly option that meets it.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'The business sets the targets; IT proposes designs to meet them. As the auditor, you check that the targets came from an approved BIA and that the strategy meets them at a sensible cost. Paying for a mirrored site for a system that can wait days is a finding too. Only a test proves recovery works.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“A hot site will reduce the RPO.”',
        why: 'A hot site shortens recovery time (RTO). How much data you lose depends on how recently it was copied, which is RPO, fixed by backup and replication frequency.',
      },
      {
        type: 'tip',
        body: 'Data loss points to RPO, so think backups and replication. Downtime points to RTO, so think recovery sites and procedures. Both targets come from the business impact analysis, not from IT.',
      },
      {
        type: 'check',
        question:
          'A payroll system’s BIA sets a 48-hour RTO and 24-hour RPO. IT proposes a mirrored site (a live copy updated with every change). What is the IS auditor’s MOST appropriate observation?',
        options: [
          'The design fits, since faster recovery is always better',
          'The RPO should be tightened to match the design',
          'The IT team should confirm the RTO it prefers',
          'The design likely exceeds the targets at unnecessary cost',
        ],
        correctIndex: 3,
        explanation:
          'Daily backups and a warm or hot site would likely meet these targets. A mirrored site over-delivers at high cost. Tightening the RPO to fit the design is tempting, but targets come from business impact, not from what IT wants to buy.',
      },
      {
        type: 'check',
        question:
          'An order system has a two-hour RTO and 15-minute RPO. After a failure, recovery took 90 minutes, but eight hours of orders were lost. What should the IS auditor recommend FIRST?',
        options: [
          'Move to a faster hot site provider',
          'Find why data copies missed the RPO and fix them',
          'Shorten the RTO to one hour',
          'Accept the loss, since the RTO was met',
        ],
        correctIndex: 1,
        explanation:
          'The RTO was met; the RPO was not. Data loss points to RPO controls: the copies were too infrequent or failed, so find out which and fix it. A faster hot site is tempting, but it only shortens downtime, which was already within target.',
      },
      {
        type: 'check',
        question:
          'A disaster recovery plan approved two years ago relies on a hot site that has never been tested. What is the GREATEST risk?',
        options: [
          'Recovery may fail or overrun the RTO in a real disaster',
          'The hot site contract may cost more than planned',
          'The plan may not follow the current document template',
          'Staff may not know where the plan is stored',
        ],
        correctIndex: 0,
        explanation:
          'An untested plan is an assumption: gaps in data, access or procedures usually appear only when you try. Staff not knowing where the plan is matters, but it is one of the problems a test would expose.',
      },
    ],
  },
  {
    // UPGRADE: keeps its original id (learner progress is keyed on it). It now
    // teaches 4A8 (change, configuration, patching), so it sits in domain 4.
    // A future 3B2 lesson for domain 3 needs a NEW id.
    id: 'cisa-l-d3-change',
    certId: 'cisa',
    domainId: '4',
    order: 3,
    title: 'Change, configuration and patching',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 27001:2022 Annex A 8.32 (Change management)',
      'ISO/IEC 27001:2022 Annex A 8.9 (Configuration management)',
      'NIST SP 800-40 Rev. 4 (Guide to Enterprise Patch Management Planning)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['4A8'],
    prepares: ['d4_033', 'd4_185', 'd4_028'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · IT operations',
        title: 'Change, configuration and patching',
        subtitle: 'Most outages and many frauds start with an unreviewed change. Here is the path a safe change takes.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Production means the live systems staff and customers use. Change management makes sure every production change is requested, approved, tested and released by someone other than its builder. A patch is a software fix from the vendor, often for a security flaw. Patching is change management under time pressure: the riskier the flaw, the faster the path, but never no path.',
      },
      {
        type: 'analogy',
        heading: 'A landlord fixing locks',
        body: 'A landlord hears of break-ins on the street and replaces a broken front-door lock today. A sticky cupboard latch waits for the next scheduled visit. Even the same-day job goes in the maintenance log and gets checked afterwards. Urgency follows risk, and every change is recorded.',
      },
      {
        // Review fix: normal vs emergency changes folded into the caption (one structure scene).
        type: 'flow',
        heading: 'The life of a change',
        steps: [
          { label: 'Request', note: 'Documented, with a business reason' },
          { label: 'Assess and approve', note: 'Impact and risk reviewed by the change advisory board (the group that approves changes)' },
          { label: 'Build and test', note: 'Outside production, with code kept in version control (a tracked history of every edit)' },
          { label: 'Release', note: 'Moved to production by someone other than the developer' },
          { label: 'Review', note: 'Confirm it worked and matches the approved setup (the configuration baseline)' },
        ],
        caption:
          'Emergencies bend the order, not the rules: an urgent fix may go in first, but it is logged at the time and independently reviewed and approved soon after.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Preventive controls (which stop a problem) beat detective ones (which spot it afterwards), and priority follows risk. As the auditor, you expect every change, even an emergency fix, to be authorized, tested in proportion to its risk, recorded and independently reviewed. You recommend the control; management puts it in place.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Developers have production access, but all their changes are logged.”',
        why: 'Logging is detective: it tells you after the damage. The stronger control is preventive: remove developer access to production and use a separate release role.',
      },
      {
        type: 'tip',
        body: 'When a question mentions an emergency change, look for independent review and approval soon after. When it mentions patches, look for risk-based priority plus testing. An answer that only says “logged” is detective.',
      },
      {
        // Review fix: a check that exercises the trap (preventive over detective).
        type: 'check',
        question:
          'Developers can release their own fixes, including urgent patches, straight to production. Management proposes logging every change they make. What should the IS auditor recommend as BEST?',
        options: [
          'Log every developer change and review the logs monthly',
          'Remove developer production access and use a separate release role',
          'Have developers review each other’s code before release',
          'Allow patches only during scheduled maintenance windows',
        ],
        correctIndex: 1,
        explanation:
          'Separating build from release stops unauthorized or untested code before it goes live. Logging is tempting because it is easy, but it only shows the damage afterwards. Peer review helps quality, but developers can still release on their own.',
      },
      {
        type: 'check',
        question:
          'An IS auditor compares production server settings with the approved configuration baseline and finds several unexplained differences. What should the auditor recommend FIRST?',
        options: [
          'Reset every server to the baseline immediately',
          'Update the baseline so it matches production',
          'Increase logging on the affected servers',
          'Have management trace each difference to an approved change',
        ],
        correctIndex: 3,
        explanation:
          'Each difference is either an approved change the baseline missed or an unauthorized one, and tracing shows which. Resetting at once is tempting, but it may undo legitimate fixes and erase the evidence of what happened.',
      },
      {
        type: 'check',
        question:
          'An IS auditor finds that emergency changes make up 40% of all changes, and most come from one development team. What should concern the auditor MOST?',
        options: [
          'The change advisory board may meet too rarely for the team’s needs',
          'The team may need more staff for on-call duties',
          'The emergency path may be used to bypass normal approval',
          'Some emergency change tickets lack timestamps',
        ],
        correctIndex: 2,
        explanation:
          'A high share of emergencies from one team suggests the fast lane is being used to skip scrutiny, which is a root-cause problem. A board that meets too rarely may explain some of it, but that does not make skipping approval acceptable.',
      },
    ],
  },

  // ───────────────────────────── Domain 5 ─────────────────────────────
  {
    id: 'cisa-l-d5-access',
    certId: 'cisa',
    domainId: '5',
    order: 1,
    title: 'Least privilege, start to finish',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-53 Rev 5 AC-2 (Account Management)',
      'NIST SP 800-53 Rev 5 AC-5 (Separation of Duties)',
      'NIST SP 800-53 Rev 5 AC-6 (Least Privilege)',
      'ISO/IEC 27001:2022 Annex A 5.18 (Access rights)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['5A3'],
    prepares: ['d5_008', 'd5_023', 'd5_030'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Identity and access',
        title: 'Least privilege, start to finish',
        subtitle: 'Access should match the job someone does today, not every job they have ever had.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Least privilege means each person gets only the access their current role needs, for only as long as they need it. Most access failures are not one bad account but a broken process for joiners, movers and leavers.',
      },
      {
        type: 'analogy',
        heading: 'Hotel key cards',
        body: 'A hotel key card opens your room for your stay. Change rooms and the desk recodes it, so the old room no longer opens. At checkout it stops working. A card that still opened every room you ever stayed in would be a security failure, even if you never misused it.',
      },
      {
        type: 'flow',
        heading: 'Joiner, mover, leaver',
        steps: [
          { label: 'Joiner', note: 'Access requested by the manager, approved by the data owner' },
          { label: 'Mover', note: 'New access granted and old access removed at the transfer' },
          { label: 'Leaver', note: 'All access disabled on the last day, triggered by HR' },
          { label: 'Periodic review', note: 'Data owners confirm each person still needs their access' },
        ],
        caption: 'Reviews catch what the process misses. They do not replace the process.',
      },
      {
        type: 'idea',
        heading: 'Separation and privilege',
        body: 'Segregation of duties splits a task so one person cannot both commit and hide a wrong, such as creating a supplier and paying it. When duties cannot be split, a compensating control, such as an independent review, covers the gap. Powerful administrator rights are safest when granted for a task, approved, and set to expire.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Root cause beats symptom. As the auditor, one leftover account is a symptom; a mover process that never removes access is the finding. Data owners, not IT, decide who may see their data. You recommend the fix; management makes it.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“IT reviews all user access every quarter.”',
        why: 'IT can run the review, but only the data owner knows whether a person should see the data. A review signed off by IT confirms accounts exist, not that they are appropriate. Ownership decides.',
      },
      {
        type: 'tip',
        body: 'If a question shows one bad account, ask which process let it happen. If it asks who approves or reviews access, look for the data or business owner. For administrator rights, prefer time-limited over permanent.',
      },
      {
        // Review fix: the stem no longer hands over the root cause.
        type: 'check',
        question:
          'An IS auditor finds 12 active accounts for contractors whose contracts ended months ago. What should the auditor recommend as BEST?',
        options: [
          'Disable the 12 accounts and close the finding',
          'Run the access review monthly instead of quarterly',
          'Bring contractors into a leaver process with set end dates',
          'Require multi-factor authentication for contractor logins',
        ],
        correctIndex: 2,
        explanation:
          'The root cause is that no process ends contractor access. Disabling the 12 accounts is tempting and should happen, but without a process the next batch of leftover accounts is already building.',
      },
      {
        type: 'check',
        question:
          'A hospital’s IT service desk approves any request for access to patient records, provided a manager asks. Which change BEST strengthens this control?',
        options: [
          'Have the owner of patient records approve each request',
          'Log every access request in the service desk tool',
          'Train service desk staff on privacy regulations',
          'Require every manager’s request to be in writing',
        ],
        correctIndex: 0,
        explanation:
          'The data owner knows who needs patient data and is accountable for it. Training the service desk is tempting, but approval still sits with people who do not own the data.',
      },
      {
        type: 'check',
        question:
          'In a two-person finance team, one person must both enter and post journal entries because nobody else can. Which control BEST compensates?',
        options: [
          'An annual ethics statement signed by that person',
          'Regular independent review of posted entries by a manager',
          'Read-only ledger access for that person',
          'Encryption of the ledger database at rest',
        ],
        correctIndex: 1,
        explanation:
          'When duties cannot be split, an independent review of the output is the usual compensating control. Read-only access is tempting because it is restrictive, but then the person could no longer do the job.',
      },
    ],
  },
  {
    id: 'cisa-l-d5-mfa',
    certId: 'cisa',
    domainId: '5',
    order: 2,
    title: 'Authentication factors: what makes MFA real',
    minutes: 3,
    provenance: PROVENANCE,
    references: ['NIST SP 800-63B — Digital Identity Guidelines: Authentication', 'NIST SP 800-53 Rev. 5 — IA-2 Identification and Authentication'],
    outlineVersion: OUTLINE,
    lastReviewed: '2026-10-06',
    topics: ['5A3'],
    prepares: ['d5_024'],
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
        // Option order changed so no two lessons share the same key position.
        options: ['Password and PIN', 'PIN and security question', 'Password and hardware token', 'Two different passwords'],
        correctIndex: 2,
        explanation: 'A password (know) plus a hardware token (have) combines two different factor types. The others use only knowledge factors.',
      },
    ],
  },
  {
    id: 'cisa-l-d5-incident-response',
    certId: 'cisa',
    domainId: '5',
    order: 3,
    title: 'Incident response: contain first',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-61 Rev 2 (Computer Security Incident Handling Guide), superseded by Rev 3 (2025)',
      'NIST SP 800-61 Rev 3 (Incident Response Recommendations and Considerations for Cybersecurity Risk Management)',
      'ISO/IEC 27035-1:2023 (Information security incident management — Principles and process)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['5B5'],
    prepares: ['d5_057', 'd5_039', 'd5_161'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Incident response',
        title: 'Incident response: contain first',
        subtitle: 'When an attack is live, the first job is to stop it spreading. Everything else comes after.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Incident response is a planned, practiced way to handle security events. Order matters: limit the damage first, then remove the cause, restore service, and finally learn so it does not happen again.',
      },
      {
        type: 'analogy',
        heading: 'A burst pipe',
        body: 'When a pipe bursts, you shut the water valve first. Then you fix the pipe, dry the floor, and finally ask why it burst. Mopping while the water still flows wastes effort, and skipping the last step means it bursts again.',
      },
      {
        type: 'flow',
        heading: 'The incident lifecycle',
        steps: [
          { label: 'Prepare', note: 'Plan, roles, tools and practice before anything happens' },
          { label: 'Detect and analyze', note: 'Confirm it is real; judge scope and severity' },
          { label: 'Contain', note: 'Isolate systems or disable accounts to stop the spread' },
          { label: 'Eradicate and recover', note: 'Remove the cause (eradicate), restore from clean sources, watch closely' },
          { label: 'Learn', note: 'Feed what happened back into controls and the plan' },
        ],
        caption:
          'Based on the classic NIST SP 800-61 Rev. 2 lifecycle, which Rev. 3 now maps to the CSF 2.0 functions. Evidence is preserved throughout, not only at the end.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'During a live incident, “first” means containment, unless people’s safety is at risk, which always comes first. As the auditor, you check that the plan names who declares, who escalates and who speaks for the company, and that lessons learned actually change controls.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Find out who did it before touching anything.”',
        why: 'Working out who did it (attribution) can wait; the damage cannot. Preserve evidence while you contain, but do not let the investigation run while the attack keeps spreading.',
      },
      {
        type: 'tip',
        body: 'For “first” during a live attack, pick the action that stops the spread, such as isolating an affected computer (host) or disabling a compromised account. Restoring, notifying and investigating come next. For plan reviews, look for missing authority or missing lessons learned.',
      },
      {
        type: 'check',
        question:
          'Monitoring shows a sales manager’s account downloading the customer database from an unusual country at 3 a.m. What should the incident responder do FIRST?',
        options: [
          'Call the sales manager to ask whether they are traveling',
          'Analyze the account’s download history for the past year',
          'Suspend the account’s sessions and block further downloads',
          'Notify customers that their data may be exposed',
        ],
        correctIndex: 2,
        explanation:
          'Data is leaving right now, so stopping it comes before confirming the story. Calling the manager is tempting and may follow quickly, but every minute spent waiting lets more data out.',
      },
      {
        type: 'check',
        question:
          'An incident response plan details technical steps but does not say who can declare a major incident or contact regulators. What is the GREATEST risk for the IS auditor to report?',
        options: [
          'Technical steps may be too detailed to follow',
          'Key decisions may stall or be made without authority',
          'The plan has not been tested in the past year',
          'Regulators may ask to see a copy of the plan',
        ],
        correctIndex: 1,
        explanation:
          'Without named decision rights, escalation and legal notices wait for someone to claim authority, often past deadlines. Testing matters, but a test would only expose this gap; the missing authority is what breaks the response.',
      },
      {
        // Review fix (MAJOR): plausible distractors, including a true-but-not-BEST option.
        type: 'check',
        question:
          'Ransomware (malware that locks files until a ransom is paid) has been contained on three servers. The team wants to restore them at once from last night’s backups. What should the incident manager ensure FIRST?',
        options: [
          'Confirm the backups are clean and the entry point is closed',
          'Restore the most critical server first to cut downtime',
          'Prepare a press statement before systems come back online',
          'Install new antivirus software, then restore',
        ],
        correctIndex: 0,
        explanation:
          'Restoring infected backups, or restoring while the way in is still open, brings the attack straight back. Restoring the most critical server first is right once it is safe, but speed does not make it safe, and new antivirus may not close the entry point. Keep copies of the affected servers as evidence before rebuilding.',
      },
    ],
  },
];
