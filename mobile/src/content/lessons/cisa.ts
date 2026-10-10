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
 * - "Stem" (the question's opening scenario) is defined once per domain, in
 *   that domain's first lesson by `order`. Later lessons just use the word.
 * - Checks are parallel to the `prepares` bank items, never copies (the test
 *   measures word overlap). Inside a lesson, vary the answer positions, and
 *   never let the key be the one option that is clearly longest.
 */
import type { Lesson } from './types';

const PROVENANCE = 'Original Aurivan content. Not affiliated with or endorsed by ISACA.';
const OUTLINE = 'CISA job practice 2024';
const REVIEWED = '2026-10-07';
const PHASE2_REVIEWED = '2026-10-08'; // Phase 2 lessons, after concept, teaching and novice reviews

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
        body: 'Exam questions open with a short scenario, called the stem. When the stem asks who should approve the charter or where audit should report, look for the audit committee or board — never the function being audited.',
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
        body: 'Exam questions put words like “first” and “best” in capitals: several options may be reasonable, so pick the one that ranks highest. When the stem asks for the best basis for an audit plan, look for a current risk assessment tied to business objectives. Rotation, budget, requests and last year’s findings are inputs at most.',
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
          'Test more billing transactions directly to offset weak controls',
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
          'Keep the planned rate and report the control as ineffective',
          'Retest the same items after the owner explains them',
        ],
        correctIndex: 2,
        explanation:
          'Thresholds are set before testing so results cannot be argued into a pass. Agreeing with documentation is tempting because it looks controlled, but moving the goalposts after the result destroys the test’s objectivity.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-controls',
    certId: 'cisa',
    domainId: '1',
    order: 5,
    title: 'Prevent, detect, correct, compensate',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COSO Internal Control – Integrated Framework (2013)',
      'NIST SP 800-53 Rev. 5 (Security and Privacy Controls for Information Systems and Organizations)',
      'COBIT 2019 MEA02 (Managed System of Internal Control)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['1A4'],
    prepares: ['d1_012', 'd1_008', 'd1_023'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Internal controls',
        title: 'Prevent, detect, correct, compensate',
        subtitle: 'How to tell what a control does, and how much any control can promise.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A control is any safeguard that keeps a risk within acceptable limits. You classify it by when it acts: before a problem happens (preventive), by spotting it once it has happened (detective), or by repairing the damage afterward (corrective).',
      },
      {
        type: 'analogy',
        heading: 'Think of a kitchen',
        body: 'Keeping towels away from the stove prevents a fire. The smoke alarm detects one. The extinguisher corrects it. If the old stove has no automatic shut-off, a house rule that someone stays in the room while it is on covers the same risk another way. That is a compensating control.',
      },
      {
        type: 'stack',
        heading: 'Three timings, and a stand-in',
        layers: [
          { label: 'Preventive', note: 'Stops the problem before it happens, such as refusing a login without valid credentials' },
          { label: 'Detective', note: 'Finds the problem after it happens, such as a daily comparison of two records that should match' },
          { label: 'Corrective', note: 'Limits the damage and restores normal, such as restoring data from a backup' },
          {
            label: 'Compensating',
            note: 'A different control covering the same risk when the usual one is missing or weak',
          },
        ],
        caption:
          'The first three describe when a control acts. A compensating control stands in for a missing one and can itself be preventive or detective. If a control stops a problem before harm occurs, such as a door reader rejecting a stolen badge, call it preventive.',
      },
      {
        type: 'idea',
        heading: 'How much a control can promise',
        body: 'No control is perfect. People make mistakes, work together to cheat (collude) or override controls, and some controls would cost more than the risk they cover. So controls give reasonable assurance that risk stays within limits, never absolute assurance.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Start from the risk, not the tool. As the IS (information systems) auditor, you first name the risk a control must cover, then judge whether the control really covers it. A stand-in for a missing control counts only if it targets that same risk. You recommend; management chooses and runs the control.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“We cannot split these duties, but we run nightly backups, so the risk is covered.”',
        why: 'Backups protect against lost data. They do nothing about one person both doing and approving work, the risk that splitting duties (segregation of duties) exists to stop. A compensating control must target that same risk, or it covers nothing.',
      },
      {
        type: 'tip',
        body: 'To classify a control, picture the timeline: did it act before the harm, after it, or to repair it? For the “best” control, first name the risk the question states, then pick the option that addresses that risk. A strong control aimed at a different risk is still wrong. Words like “impossible” or “guarantee” are a warning sign.',
      },
      {
        type: 'check',
        question:
          'Each morning, a bank’s system compares the cash its cash machines paid out the day before with its accounting records, and flags any mismatch to the branch. How is this control BEST classified?',
        options: [
          'Preventive, because it protects the bank’s cash',
          'Corrective, because the branch fixes each mismatch',
          'Compensating, because it covers weak cash machine security',
          'Detective, because it finds differences after they occur',
        ],
        correctIndex: 3,
        explanation:
          'The check runs after the cash has gone out and reports what it finds, so it is detective. Corrective is tempting because someone later fixes the mismatch, but that fix is a separate step; this control only finds the problem.',
      },
      {
        type: 'check',
        question:
          'At a small branch, one clerk both enters and approves customer refunds, and duties cannot be split. Which compensating control should the IS auditor consider BEST?',
        options: [
          'The IT security team reapproves the clerk’s refund access quarterly',
          'A regional manager checks each week’s refunds against receipts',
          'The clerk signs a daily log of the refunds she issued',
          'Retrain the clerk yearly on refund policy and its limits',
        ],
        correctIndex: 1,
        explanation:
          'The risk is one person acting unchecked, and a reviewer outside the process addresses exactly that, even though the review is detective. Quarterly access reapproval is tempting because it looks like oversight, but it only confirms the clerk holds both duties; it never checks a refund. A log the clerk keeps is the clerk checking their own work.',
      },
      {
        type: 'check',
        question:
          'Two employees worked together to steal funds, despite payment controls that passed every test this year. The board asks the IS auditor whether the controls failed. What is the MOST appropriate response?',
        options: [
          'The controls failed, since they did not stop the theft',
          'Collusion can defeat sound controls, so failure is unproven',
          'The testing was flawed, since the controls let fraud through',
          'Fraud is a people issue, so controls are not relevant here',
        ],
        correctIndex: 1,
        explanation:
          'Controls give reasonable, not absolute, assurance: people can collude, err or override them. The auditor should still check whether something was missed, but fraud alone does not prove failure. Blaming the testing is tempting because the controls passed, yet testing shows controls work as designed, not that collusion is impossible. Stopping staff fraud is very much a control matter.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-engagement',
    certId: 'cisa',
    domainId: '1',
    order: 6,
    title: 'Running the engagement',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISACA IT Audit Standard 1203 (Engagement Planning)',
      'ISACA IT Audit Standard 1204 (Performance and Supervision)',
      'ISACA IT Audit Standard 1207 (Irregularities and Illegal Acts)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['1B1'],
    prepares: ['d1_024', 'd1_011', 'd1_010'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit engagement',
        title: 'Running the engagement',
        subtitle: 'What comes first in a single audit, and what to do when testing turns up something serious.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'An engagement is one audit, from planning to report. Objectives say what it must find out. Scope sets its boundaries. The audit program lists the steps that will test it. Fieldwork (the testing itself) follows the program, and a supervisor reviews the work before sign-off.',
      },
      {
        type: 'analogy',
        heading: 'Planning a road trip',
        body: 'You pick the destination before you decide which roads you will use and which you will avoid, and both come before the turn-by-turn directions. Directions written with no destination look busy but lead nowhere. In an audit, the destination is the objective, the roads are the scope, and the directions are the audit program.',
      },
      {
        // Expert review fix (2026-10): supervisors review work papers as evidence arrives, not only at the end.
        type: 'flow',
        heading: 'From objective to sign-off',
        steps: [
          { label: 'Objectives', note: 'What the audit must find out' },
          { label: 'Scope', note: 'The systems, time period and locations covered' },
          { label: 'Audit program', note: 'The planned procedures, step by step, written before testing starts' },
          { label: 'Fieldwork', note: 'Tests performed and recorded in work papers, the audit’s record of evidence' },
          { label: 'Supervisory review', note: 'A senior auditor reviews work papers as evidence arrives and confirms each conclusion is supported before reporting' },
        ],
        caption: 'Each step rests on the one before it. A program written before the objectives has nothing to anchor it.',
      },
      {
        type: 'idea',
        heading: 'When testing turns up a red flag',
        body: 'Sometimes fieldwork reveals signs of possible fraud, such as one person creating and approving large payments. The auditor records the facts and raises them within audit, following the organization’s agreed fraud procedure. Investigating is for people with the authority and skills to do it.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Read the role. As the IS (information systems) auditor, you assess, document, report and escalate; you do not fix problems or investigate alone. Questioning the people involved, blocking a system or widening your testing before you escalate can alert suspects, spoil evidence and step outside your authority.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“I will quietly look into it myself before I bother anyone.”',
        why: 'It feels responsible, but acting alone can tip people off and damage evidence. Those with authority decide how a possible fraud is investigated, so they need to hear about it before anyone acts.',
      },
      {
        type: 'tip',
        body: 'For planning order, ask what each step depends on; work built on nothing is the trap. For consistency between auditors, look for whatever tells each of them what to do before testing starts. When a red flag appears, your role shifts from tester to messenger: keep the evidence safe and the news away from anyone involved.',
      },
      {
        type: 'check',
        question:
          'An IS auditor is assigned a new audit of a hospital’s patient-records system. A colleague offers last year’s test steps so fieldwork can start tomorrow. What should the auditor do FIRST?',
        options: [
          'Agree what this audit should answer, then set its boundaries',
          'Have the audit manager approve reusing last year’s test steps',
          'Start testing access controls, usually the riskiest area',
          'Ask the system owner which areas need testing this year',
        ],
        correctIndex: 0,
        explanation:
          'Objectives come first: they say what this audit must answer, and the scope and steps follow from them. Reusing last year’s steps is tempting because it saves time, and a manager’s approval makes it look sound, but those steps answered last year’s objectives, which may no longer fit.',
      },
      {
        type: 'check',
        question:
          'Two IS auditors tested the same controls at different sites. Their work papers show different tests, and the reviewer cannot compare the results. What would BEST have prevented this?',
        options: [
          'A data analytics tool that both auditors were required to use',
          'A shared folder where each auditor could see the other’s work',
          'The audit manager signs off both sets of work papers afterward',
          'A common audit program listing the planned test procedures',
        ],
        correctIndex: 3,
        explanation:
          'The audit program sets out the planned procedures, so both auditors run the same tests and a reviewer can compare each against the plan. The shared folder is tempting because each could see the other’s work, but seeing it afterward is not agreeing in advance on what to test. A manager’s sign-off after fieldwork comes too late to make the tests match.',
      },
      {
        type: 'check',
        question:
          'While testing purchasing, an IS auditor sees that a buyer approved large orders to a supplier he set up himself. The buyer’s manager is his close friend. To whom should the auditor FIRST report?',
        options: [
          'The chief audit executive, who heads the audit function',
          'The buyer’s manager, who has line authority over the buyer',
          'The HR director, who handles staff misconduct cases',
          'The police, since the payments may well amount to a crime',
        ],
        correctIndex: 0,
        explanation:
          'Possible fraud goes up the audit line under the agreed procedure, so people with authority decide how to investigate and evidence is protected. The buyer’s manager is tempting because they manage the buyer, but they are close to him and could tip him off. Going to HR or the police is not the auditor’s call; those steps are decided after escalation.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-reporting',
    certId: 'cisa',
    domainId: '1',
    order: 7,
    title: 'Reporting and follow-up',
    minutes: 5,
    provenance: PROVENANCE,
    references: ['ISACA IT Audit Standard 1401 (Reporting)', 'ISACA IT Audit Standard 1402 (Follow-up Activities)'],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['1B5'],
    prepares: ['d1_006', 'd1_015', 'd1_036'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit reporting',
        title: 'Reporting and follow-up',
        subtitle: 'Who gets the report, who decides the rating, and how you know a fix really happened.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'The audit report turns findings into decisions. It goes to the body that oversees audit and holds management to account, usually the audit committee, and the executives who must act also receive it. Each finding says what is wrong, why it matters and how severe it is.',
      },
      {
        type: 'analogy',
        heading: 'A home inspection',
        body: 'The inspector reports to the buyer, who makes the decision, not to the seller whose house it is. The seller can correct a wrong fact, like the roof’s age, but cannot talk the inspector out of calling a cracked foundation serious. Later, the inspector returns to check the repair was done, not just promised.',
      },
      {
        type: 'flow',
        heading: 'From exit meeting to closure',
        steps: [
          { label: 'Exit meeting', note: 'At the end of testing, management checks the facts and proposes actions' },
          { label: 'Report', note: 'Findings rated by the auditor, with management’s responses and action dates' },
          { label: 'Distribution', note: 'The audit committee receives it; executives who must act also get it' },
          { label: 'Follow-up', note: 'The auditor checks evidence that each agreed action was carried out' },
          { label: 'Escalation', note: 'Serious risks left open or overdue go back to the audit committee' },
        ],
        caption: 'If management disagrees with a finding, the report shows both views. The rating stays the auditor’s call.',
      },
      {
        type: 'idea',
        heading: 'Overall opinions in one minute',
        body: 'Some reports give an overall opinion. Unmodified: controls are effective. Qualified: effective except for specific, contained problems. Adverse: problems are so widespread that controls are ineffective overall. Disclaimer: the auditor could not obtain enough evidence to form a view.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Right level of authority. As the IS (information systems) auditor, you report to the body that owns the decision and you keep your ratings independent. Management owns the fix. The more severe the finding, the higher and faster it travels. In follow-up you want proof that the fix happened, not a promise that it did.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Management disagrees, so let’s soften the rating to keep the peace.”',
        why: 'The rating reflects the evidence and your professional judgment. New facts can change it; pressure cannot. Record management’s response beside the finding and let the people who oversee audit see both views.',
      },
      {
        type: 'tip',
        body: 'Reports travel up to whoever can hold management to account, and the more serious the risk, the higher it goes. In follow-up, ask what would convince a skeptic that the fix happened. For an overall opinion, ask how far the problems spread and whether the evidence was enough. Management may correct facts, but the rating rests on the evidence.',
      },
      {
        type: 'check',
        question:
          'An IS auditor rates a backup failure as high risk. The IT director asks for the final report to go only to her. What is the auditor’s MOST appropriate response?',
        options: [
          'Agree, since the IT director owns the backup process and its fix',
          'Send it to the director now and to the committee later',
          'Issue it through the normal route to the audit committee',
          'Send it to the CIO, who oversees the IT director, instead',
        ],
        correctIndex: 2,
        explanation:
          'The report goes to the body that oversees audit, whatever the audited area prefers, because severe findings must reach those who hold management to account. Sending it to the director first is tempting because she will lead the fix, but it lets the audited area control what the committee sees. The CIO is senior, yet still management, so the committee would not see the finding.',
      },
      {
        type: 'check',
        question:
          'Management says quarterly access reviews now run, as agreed after last year’s audit. Which evidence BEST supports closing the finding?',
        options: [
          'An email from the IT manager confirming the reviews are done',
          'The new access review procedure, approved by the CIO',
          'Signed review records, with removals traced to the system',
          'A meeting where the team walks through how the reviews work',
        ],
        correctIndex: 2,
        explanation:
          'Follow-up verifies the action actually happened, so the auditor wants records of reviews done, traced to access really removed. The approved procedure is tempting because it is formal, but it shows the review was designed, not that it ran. An email is a claim, not proof.',
      },
      {
        type: 'check',
        question:
          'A draft report gives a qualified opinion, but the findings show weak controls in nearly every area reviewed, with full evidence. What should the reviewing audit manager conclude?',
        options: [
          'Qualified fits, because each finding is listed separately',
          'Adverse fits better, as problems reach nearly every area',
          'A disclaimer fits better, because the results are so poor',
          'Qualified fits, provided management accepts each finding',
        ],
        correctIndex: 1,
        explanation:
          'When weaknesses run through most of what was reviewed, controls are ineffective overall, so the opinion is adverse. Qualified is tempting because each finding is written up, but “except for” fits only contained problems. A disclaimer is for missing evidence, not bad results.',
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
        body: 'Governance decides what the organization needs from IT and how much risk it will take (its risk appetite), then checks that it got it. Management decides how to deliver. A well-aligned IT strategy traces every major investment back to a business goal. With chargeback, IT costs are charged to the business units that use them, which keeps demand visible.',
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
        body: 'Exam questions open with a short scenario, called the stem. Ask of the stem: is this deciding what and why (governance), or how (management)? Risk appetite, strategic alignment, oversight and accountability point to governance. Tools, schedules and configurations point to management.',
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
          'Each project’s value to agreed business objectives',
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
        body: 'Risk appetite is how much risk the board will take to pursue its goals, stated broadly: “a low appetite for outages”. Risk tolerance turns it into a measurable limit: “the payments system may be down no more than two hours a month”. A breach of tolerance triggers escalation. A key risk indicator (KRI) asks whether exposure is rising; a key control indicator (KCI) asks whether a control is working. A risk register records each risk, its owner and the agreed response.',
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
          'The insurer may take several weeks to pay a claim',
          'Insurance cannot transfer fines or lost customer trust',
          'The insurer may ask to review the company’s controls',
        ],
        correctIndex: 2,
        explanation:
          'Transfer moves part of the financial impact; the company still owns the breach, the fines and its customers’ trust. A slow payout is tempting because it hurts cash flow, but even a full, prompt payout would leave that harm in place.',
      },
      {
        type: 'check',
        question:
          'A board states a low appetite for service outages. The IT team then sets its own outage limits for each system. What should the IS auditor recommend as BEST?',
        options: [
          'Have business owners propose tolerances within appetite',
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
  {
    id: 'cisa-l-d2-policy-law-ea',
    certId: 'cisa',
    domainId: '2',
    order: 3,
    title: 'Policies, laws and the big picture',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 27001:2022 clause 5.2 and Annex A 5.1 (Policies for information security)',
      'COBIT 2019 APO01 (Managed I&T Management Framework) and MEA03 (Managed Compliance with External Requirements)',
      'COBIT 2019 APO03 (Managed Enterprise Architecture)',
      'The Open Group Architecture Framework (TOGAF) Standard',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['2A1', '2A3', '2A4'],
    prepares: ['d2_034', 'd2_050', 'd2_069'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · Policies, laws and architecture',
        title: 'Policies, laws and the big picture',
        subtitle: 'Who sets the rules, who makes them specific, and how does it all connect to the business?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A policy states management’s intent, approved at a senior level. Standards make it specific and mandatory, procedures give steps, and guidelines advise. Laws add outside duties these documents must meet. Enterprise architecture is the map linking business goals to processes, data and technology.',
      },
      {
        type: 'analogy',
        heading: 'A city’s road rules',
        body: 'The city council’s aim is “safe streets”: that is the policy. A 20 mph limit outside schools is a standard, specific and mandatory. The crossing guard’s routine is a procedure. “Leave extra space in the rain” is a guideline: good advice, not a rule. National traffic law sits above it all, and the city’s rules must meet it.',
      },
      {
        type: 'stack',
        heading: 'The document hierarchy',
        layers: [
          { label: 'Policy', note: 'Intent and direction, approved by senior management or the board' },
          { label: 'Standard', note: 'Mandatory, specific requirements, such as a minimum password length' },
          { label: 'Procedure', note: 'Step-by-step instructions for doing a task' },
          { label: 'Guideline', note: 'Recommended practice; advice, not a requirement' },
        ],
        caption:
          'Compliance is judged against the mandatory layers only; skipping advice is not a finding. A document’s content, not its title, decides its layer.',
      },
      {
        type: 'idea',
        heading: 'Laws and architecture',
        body: 'Map each legal duty to the controls that meet it, and give each control a named owner. One control often serves several laws, so it is tested once. Enterprise architecture records today’s state first, then the target the business needs. The gap between them becomes the roadmap.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Governance comes before technology. As the IS (information systems) auditor, you first check that a policy exists, that senior management approved it, and that it is reviewed on a schedule and after major change. You judge compliance against mandatory documents, not advice. You recommend; management writes and approves.',
      },
      {
        type: 'trap',
        heading: 'The calendar trap',
        trap: '“We review the security policy every January, so it is always current.”',
        why: 'A yearly review is good, but a new law, a serious breach or a merger can make the policy wrong in March. Reviews should also be triggered by significant change, with management approving the result.',
      },
      {
        type: 'tip',
        body: 'Classify a document by what it demands, never by its label. When several laws apply, prefer the answer that tests each control once yet still covers every obligation. For architecture, ask what you must know before you can plan any move. Policies need senior approval and a fresh review after major change.',
      },
      {
        type: 'check',
        question:
          'A document titled “backup guideline” says every server must be backed up nightly. Several teams skip it, saying guidelines are only advice. What should the IS auditor do?',
        options: [
          'Accept the teams’ view, since guidelines are optional advice',
          'Test against it as a standard and report the skipped backups',
          'Ask each team to write its own backup procedure first',
          'Rewrite the document as a formal policy, then test it',
        ],
        correctIndex: 1,
        explanation:
          'What a document requires decides its type, not its label. A specific, mandatory rule is a standard, so the auditor tests against it, reports the gaps and may suggest renaming it. Accepting the teams’ view is tempting because the title supports them, but it lets a real requirement be treated as optional. Rewriting documents is management’s job.',
      },
      {
        type: 'check',
        question:
          'A retailer has new duties under three privacy and consumer laws. Each compliance team is designing its own separate control tests. What should the IS auditor recommend as BEST?',
        options: [
          'Let each compliance team keep and run its own control tests',
          'Apply the strictest of the three laws across the business',
          'Ask outside lawyers to confirm compliance each year',
          'Link each duty to an owned control, shared where possible',
        ],
        correctIndex: 3,
        explanation:
          'One control often meets several laws. Linking each duty to an owned control, shared where possible, means each control is tested once and gaps stand out. The strictest-law option is tempting because it feels safe, but it adds cost where no law requires it and can still miss duties unique to one law.',
      },
      {
        type: 'check',
        question:
          'A firm bought a new billing platform to fit its target architecture. After go-live, three old systems still sent it data nobody knew about, and reports broke. What step was MOST likely skipped?',
        options: [
          'Mapping today’s systems and how data moves between them',
          'Choosing a platform that more of the firm’s peers already use',
          'Getting board approval for the target architecture design',
          'Testing the new billing platform under full production load',
        ],
        correctIndex: 0,
        explanation:
          'Without a picture of today, nobody knows what a new system must replace or connect to; the gap between current and target becomes the roadmap. Load testing is tempting because the failure showed up after go-live, but testing checks the new system works, and cannot find feeds that nobody knew existed.',
      },
    ],
  },
  {
    id: 'cisa-l-d2-privacy-data',
    certId: 'cisa',
    domainId: '2',
    order: 4,
    title: 'Privacy and data ownership',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 29100:2011 (Privacy framework)',
      'ISO/IEC 27701:2025 (Privacy information management systems — Requirements and guidance)',
      'EU General Data Protection Regulation 2016/679, Articles 5 and 30',
      'COBIT 2019 APO14 (Managed Data)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['2A6', '2A7'],
    prepares: ['d2_013', 'd2_049', 'd2_073'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · Privacy and data governance',
        title: 'Privacy and data ownership',
        subtitle: 'You cannot protect, or lawfully use, data you have not found and given an owner.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Privacy means using personal data fairly: for a stated purpose, with a lawful basis (a legal reason to use it), and no more than needed. Data governance makes this workable: each data set has a business owner, a classification level and matching handling rules.',
      },
      {
        type: 'analogy',
        heading: 'A museum and its collections',
        body: 'A museum first needs a catalog of what it holds. Each collection has a curator who decides who may handle it: rare manuscripts stay in the reading room, posters can go out on loan. The building staff look after the shelves and locks, but they follow the curator’s rules; they do not set them.',
      },
      {
        // Expert review fix (2026-10): the privacy lead owns the program; data-set owners are named in the inventory.
        type: 'flow',
        heading: 'Building a privacy program',
        steps: [
          { label: 'Assign accountability', note: 'A named privacy lead, with board support, owns the program' },
          { label: 'Inventory the data', note: 'What personal data you hold, why, where, who receives it, and each set’s business owner' },
          { label: 'Classify by impact', note: 'A few levels, set by the harm if the data leaks or is altered' },
          { label: 'Apply handling rules', note: 'Access, encryption, retention and disposal to match each level' },
          { label: 'Review and refresh', note: 'Update the inventory as systems and purposes change' },
        ],
        caption: 'Minimization, collecting and keeping only what you need, applies at every step.',
      },
      {
        type: 'idea',
        heading: 'Owner vs custodian',
        body: 'The data owner is a business leader accountable for a data set. They set its classification and approve who gets access. The custodian, often IT or a cloud provider, stores and protects the data under the owner’s rules. Running a system does not make IT the owner, and moving data to a vendor moves custody, never ownership.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Know what you hold before you protect it, and make accountability explicit. As the IS (information systems) auditor, you check that someone senior is accountable for privacy, that the organization knows what personal data it keeps and why, and that business leaders, not IT, decide how their data is graded and shared. You report the gaps; the owners fix them.',
      },
      {
        type: 'trap',
        heading: 'The encryption trap',
        trap: '“We encrypt everything, so our privacy program is in good shape.”',
        why: 'Encryption (scrambling data so only key holders can read it) is a security control. It does not show why data was collected, whether you may use it, or how long to keep it. Privacy starts with accountability and knowing your data; security then protects it.',
      },
      {
        type: 'tip',
        body: 'For where a privacy program starts, ask what every other control depends on knowing. For who decides about data, look to accountability, not technical skill or physical possession. For classification, ask what would happen to the business, or to people, if this data got out or was changed.',
      },
      {
        type: 'check',
        question:
          'A customer asks a retailer for a copy of all data it holds about her. Staff search five systems and cannot be sure they found everything. What root cause should the IS auditor report?',
        options: [
          'Nobody has listed what customer data is held, and where',
          'Staff were not properly trained to search the five systems',
          'The five systems use different search tools and file formats',
          'The privacy officer has not approved a request-handling procedure',
        ],
        correctIndex: 0,
        explanation:
          'If no one has listed what personal data is held and where, every request becomes a hunt, and nothing else in the program can be relied on. Training is tempting because staff struggled, but even skilled searchers cannot find data that no one has recorded. An approved procedure would say how to search, not where the data is.',
      },
      {
        type: 'check',
        question:
          'An HR system administrator gave a sales manager access to staff salary data after a phone request. Who is MOST appropriate to approve this kind of access?',
        options: [
          'The system administrator who looks after the HR system',
          'The sales manager’s own line manager, who knows the need',
          'The head of HR, who answers for how salary data is used',
          'The CISO, who sets the company’s access control policy',
        ],
        correctIndex: 2,
        explanation:
          'The business leader accountable for salary data approves access to it. The administrator is the custodian who applies that decision; setting access up is not the same as deciding who should have it. The line manager is tempting because they know why access is wanted, but they can confirm the need, not grant access to data they do not own. The CISO sets the rules for access, not who may see salary data.',
      },
      {
        type: 'check',
        question:
          'A company labels all cloud data “confidential” and all data on its own in-house servers “internal”. What is the GREATEST weakness the IS auditor should report?',
        options: [
          'Data owners last reviewed the labels three years ago',
          'The labels differ from those in a common industry scheme',
          'Levels follow where data is stored, not how sensitive it is',
          'Staff might not know which of their systems are cloud-based',
        ],
        correctIndex: 2,
        explanation:
          'Classification should grade data by the impact if it were disclosed or altered, so sensitive data is protected wherever it sits. Under this scheme, a customer file in-house would be only “internal”, while a public price list in the cloud would be “confidential”. Staff confusion is tempting because it is real, but fixing it would still leave the levels wrong. A fresh review by the owners would apply the same wrong rule.',
      },
    ],
  },
  {
    id: 'cisa-l-d2-vendors',
    certId: 'cisa',
    domainId: '2',
    order: 5,
    title: 'You can outsource work, not accountability',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 APO10 (Managed Vendors) and APO09 (Managed Service Agreements)',
      'NIST SP 800-161 Rev. 1 (Cybersecurity Supply Chain Risk Management Practices)',
      'ISO/IEC 27036 (Cybersecurity — Supplier relationships)',
      'AICPA SOC 2 Trust Services Criteria',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['2B2'],
    prepares: ['d2_099', 'd2_027', 'd2_115'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · Vendor management',
        title: 'You can outsource work, not accountability',
        subtitle: 'A supplier can run your service. When it fails, your customers and regulators still come to you.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Vendor management is how an organization chooses, contracts, oversees and leaves its suppliers. Effort scales with criticality: a supplier running core services gets deep checks and close monitoring; an office-supplies vendor does not. At every stage, the organization keeps accountability for the outcome.',
      },
      {
        type: 'analogy',
        heading: 'Renovating your kitchen',
        body: 'Before signing, you check the builder’s references and insurance. The contract defines “done”, sets dates and lets you inspect. You visit during the job, not just at the end, and agree up front how you would part ways. If the wiring turns out unsafe, it is still your house.',
      },
      {
        type: 'flow',
        heading: 'The vendor lifecycle',
        steps: [
          { label: 'Decide to source', note: 'Weigh risk, knowledge loss and flexibility, not price alone' },
          { label: 'Due diligence', note: 'Depth set by how critical the supplier is: money, security, recovery, legal' },
          {
            label: 'Contract',
            note: 'Measurable service level agreements (SLAs), a right to audit, breach notice and exit terms',
          },
          { label: 'Monitor', note: 'Track service levels, read assurance reports, reassess risk' },
          { label: 'Exit', note: 'Return or destroy data, transfer knowledge, hand over cleanly' },
        ],
        caption:
          'Exit terms are agreed at signing, when you have the most leverage. For critical custom software from a small vendor, add source code escrow: a neutral party holds the code and releases it to you if the vendor fails.',
      },
      {
        type: 'idea',
        heading: 'Assurance you can rely on',
        body: 'For a critical vendor, ask for independent evidence, such as a SOC 2 Type 2 report: an outside auditor’s test of the vendor’s controls over a period, not one day. Read it. Check the scope covers your service and note exceptions. It also lists controls you must run, such as removing leavers’ access.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Accountability stays with the organization. As the IS (information systems) auditor, you do not choose the vendor or write the contract. You check that management weighed the risks, sized its checks to the supplier’s importance, secured measurable terms and audit rights, keeps monitoring, and has an exit plan. Then you report the gaps.',
      },
      {
        type: 'trap',
        heading: 'The clean-report trap',
        trap: '“The vendor has a clean assurance report, so we don’t need to monitor them.”',
        why: 'A report covers a past period and a defined scope. It does not track this month’s service levels or a change in the vendor’s finances. Use it as one input, and keep monitoring service and risk yourself.',
      },
      {
        type: 'tip',
        body: 'Effort follows risk: the more the business leans on a supplier, the closer the look. A single report, certificate or promise is never the whole picture, and a contract nobody watches protects no one. Plan the way out on the day you sign; once the contract is live, your leverage is gone.',
      },
      {
        type: 'check',
        question:
          'Procurement uses one short checklist for every supplier, from the office coffee vendor to the core banking platform. What should the IS auditor recommend as BEST?',
        options: [
          'Lengthen the checklist so it covers more risk areas',
          'Go deeper on suppliers the business cannot run without',
          'Let each business unit choose its own supplier checks',
          'Have an outside firm run the current checklist instead',
        ],
        correctIndex: 1,
        explanation:
          'Effort should follow criticality: deep checks for core services, light ones for low-risk suppliers. A longer checklist is tempting because it feels thorough, but used for everyone it wastes effort on the coffee vendor and may still not go deep enough for the core platform. An outside firm running a shallow checklist is still shallow.',
      },
      {
        type: 'check',
        question:
          'A bank’s outsourced data center had a four-hour outage that surprised everyone. The provider’s monthly reports had shown missed targets for a year. What should the IS auditor recommend as BEST?',
        options: [
          'Add stricter outage penalties to the contract at renewal',
          'A named bank manager reviews each report and acts on misses',
          'The vendor committee approves a revised SLA with tighter targets',
          'Move the data center to a provider with a better record',
        ],
        correctIndex: 1,
        explanation:
          'The warning signs were in the reports; nobody at the bank owned reading them and acting. Outsourcing moved the work, not the accountability. Stricter penalties or tighter approved targets are tempting, but neither works if no one notices the misses. A new provider would face the same blind spot.',
      },
      {
        type: 'check',
        question:
          'A payroll provider is being bought by a rival. The company wants to leave, but its contract has no exit terms. What is the GREATEST risk?',
        options: [
          'The new owner may raise prices at the next renewal',
          'Service credits (fee refunds) may not cover missed payroll dates',
          'The provider’s best staff may leave after the takeover',
          'The company may not get its payroll data back intact',
        ],
        correctIndex: 3,
        explanation:
          'Without exit terms, the provider holds the payroll data and owes no help with a move, so leaving safely depends on its goodwill. Service credits are tempting because they look like protection, but they only refund fees for missed targets; they do not get your data back.',
      },
    ],
  },
  {
    id: 'cisa-l-d2-it-management',
    certId: 'cisa',
    domainId: '2',
    order: 6,
    title: 'Running IT like a business',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 APO07 (Managed Human Resources)',
      'COBIT 2019 MEA01 (Managed Performance and Conformance Monitoring)',
      'COBIT 2019 APO11 (Managed Quality)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['2B1', '2B3', '2B4'],
    prepares: ['d2_018', 'd2_031', 'd2_110'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · IT resources, performance and quality',
        title: 'Running IT like a business',
        subtitle: 'How do you know IT is well run, not just busy?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'IT management turns direction into results. Being busy is not the same as being well run. Three questions tell them apart: can one person hide their work, do the measures track the goal, and is quality built into the process?',
      },
      {
        type: 'analogy',
        heading: 'A restaurant kitchen',
        body: 'The head chef makes every cook take leave and swap stations, so nobody’s station goes unseen for long. Plates served shows how busy the kitchen is; diners coming back shows whether it is good. Tasting every plate catches bad ones, but only better recipes and training stop them being made.',
      },
      {
        type: 'stack',
        heading: 'Three signs IT is well run',
        layers: [
          {
            label: 'Nobody hides their work',
            note: 'Job rotation and mandatory leave mean someone else regularly does, and sees, each critical job',
          },
          {
            label: 'Measures track the goal',
            note: 'A key performance indicator (KPI) shows whether the goal is met, not how busy the team is',
          },
          {
            label: 'Quality is built in',
            note: 'Quality control inspects finished work; quality assurance improves the process so fewer defects are made',
          },
        ],
        caption: 'Each sign looks past effort to evidence.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Busy is not the same as well run. As the IS (information systems) auditor, you look past effort to evidence: someone else sees privileged work, measures track the business outcome, and defects are prevented by a better process, not only caught at the end. You recommend; management acts.',
      },
      {
        type: 'trap',
        heading: 'The hero trap',
        trap: '“Our database administrator never takes leave and knows everything, so they are our most reliable person.”',
        why: 'When someone with powerful access never steps away, no one else ever sees their work, so errors or fraud can stay hidden. Mandatory leave and job rotation exist to expose that. The trap praises the very pattern these controls watch for.',
      },
      {
        type: 'tip',
        body: 'When a question praises effort, such as long hours, courses completed or extra testing, ask what would prove the goal is met. For a measure, ask whether the number could improve while the goal gets worse. The “best” answer usually brings in a second pair of eyes or fixes how work is done, not more of the same activity.',
      },
      {
        type: 'check',
        question:
          'An IS auditor recommends job rotation for a payments team. The manager objects that her staff are experts and rotation would slow the work. Which reply BEST explains the control’s value?',
        options: [
          'A newcomer in each role may uncover problems left hidden',
          'Rotation builds broader skills, which lifts staff morale over time',
          'Audit standards require rotation for payments staff',
          'The HR policy the board approved already calls for rotation',
        ],
        correctIndex: 0,
        explanation:
          'Rotation is a fraud and error control: a fresh person doing the job sees what the last one may have hidden. Broader skills are tempting because they are a real benefit, but they are a side effect, not why auditors recommend it. Pointing to a policy says who requires rotation, not why it works. The manager still decides; the auditor explains the risk.',
      },
      {
        type: 'check',
        question:
          'Course completions at a firm rose from 60 to 98 percent this year. Failures on fake-scam (phishing) email tests did not change. What should the IS auditor conclude is MOST likely?',
        options: [
          'Staff need more courses before phishing results can improve',
          'The phishing tests are too hard to show real progress yet',
          'The measure counts training activity, not fewer mistakes',
          'Senior management has not yet approved the completion target',
        ],
        correctIndex: 2,
        explanation:
          'Completions measure effort. The goal is fewer mistakes, and that has not moved, so a useful KPI must track the outcome itself. More courses is tempting because training clearly matters, but it pushes harder on a measure that has already shown it does not track the goal. Approving the completion target would only endorse the wrong measure.',
      },
      {
        type: 'check',
        question:
          'Release defects keep rising. The IT director proposes doubling the testing done just before each go-live. Which concern should the IS auditor raise as MOST important?',
        options: [
          'More testing leaves the cause of the defects untouched',
          'Doubling the testing will delay each release by several weeks',
          'Testers may still miss defects that show only in production',
          'The IT steering committee has not yet approved the plan',
        ],
        correctIndex: 0,
        explanation:
          'Rising defects point to the process that makes them. Quality assurance fixes that process through standards, reviews and training; more end-of-cycle testing is quality control, which only catches defects after they are made. Delay is tempting because it is a real cost, but it is a side effect, not the reason the plan fails. Committee approval would not make the plan reach the cause.',
      },
    ],
  },

  // ───────────────────────────── Domain 3 ─────────────────────────────
  {
    id: 'cisa-l-d3-pir',
    certId: 'cisa',
    domainId: '3',
    order: 1,
    title: 'After go-live: the post-implementation review',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 BAI07 (Managed IT Change Acceptance and Transitioning)',
      'COBIT 2019 EDM02 (Ensured Benefits Delivery)',
      'COBIT 2019 MEA02 (Managed System of Internal Control)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['3B4', '3B1'],
    prepares: ['d3_066', 'd3_092', 'd3_088'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 3 · Post-implementation review',
        title: 'After go-live: the post-implementation review',
        subtitle: 'Go-live is not the finish line. How do you check that a new system did what it promised?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Go-live is the day a new system starts running the real business. A post-implementation review, usually held months later, asks three things. Do the controls (the safeguards built into the system) work as designed? Did the promised benefits arrive? What lessons should future projects use?',
      },
      {
        type: 'analogy',
        heading: 'A new heat pump and its promised savings',
        body: 'You buy a heat pump because the installer promised lower energy bills. Before you switch it on, an inspector confirms it is safe to run. You judge the savings after a full season of bills, not after one night. And you do not ask the installer to grade their own work.',
      },
      {
        type: 'flow',
        heading: 'From go-live readiness to lessons learned',
        steps: [
          { label: 'Readiness check', note: 'Before go-live, accountable owners sign off agreed criteria, with open issues listed' },
          { label: 'Go live', note: 'The system starts running real business' },
          { label: 'Stabilize', note: 'Early fixes settle and normal operation builds up real data, often over months' },
          {
            label: 'Independent review',
            note: 'Controls, benefits against the business case (the approved reason for the spend), and lessons',
          },
          { label: 'Act and follow up', note: 'Management fixes what was found; the auditor checks it closed' },
        ],
        caption: 'Lessons feed back into how future projects are planned and approved.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Two rules apply: the reviewer must be independent, and the business owns the results. As the IS (information systems) auditor, you check that the reviewer did not build or deliver the system. You report and recommend; management decides and acts. The sponsor (the leader who funded the project and promised its benefits) owns any shortfall. Then you follow up.',
      },
      {
        type: 'trap',
        heading: 'The timing trap',
        trap: '“Review it in week one, while the team still remembers everything.”',
        why: 'Week one shows start-up problems, not benefits. The review needs normal operation long enough to produce real results. Fresh memories still matter, so record the team’s lessons at project close, and hold the review once the data exists.',
      },
      {
        type: 'trap',
        heading: 'The readiness trap',
        trap: '“The vendor says the system is ready, so it can go live.”',
        why: 'A supplier’s word is not evidence, and the vendor does not own the risk. Go-live rests on agreed readiness criteria signed off by the accountable business and IT owners, with open issues visible and any remaining risk formally accepted.',
      },
      {
        type: 'tip',
        body: 'Exam questions open with a short scenario, called the stem. If the stem asks when to review, look for stable operation first. If it asks who should review, pick someone who did not build it. If it asks who fixes a benefit shortfall, pick the business owner, not the auditor or IT.',
      },
      {
        type: 'check',
        question:
          'A retailer’s new inventory system went live two weeks ago, and daily fixes are still going in. The sponsor asks the IS auditor to start the post-implementation review now. What is the BEST response?',
        options: [
          'Agree a later date, once fixes slow and results are measurable',
          'Start now, while the project team is still together',
          'Replace the review with more testing of the daily fixes',
          'Skip the review, because users signed acceptance before go-live',
        ],
        correctIndex: 0,
        explanation:
          'With fixes still landing, the data shows start-up noise, not benefits or settled controls. Starting now is tempting because the team is still together, but their lessons can be recorded at project close. More testing checks the fixes, not whether the system delivers value.',
      },
      {
        type: 'check',
        question:
          'A new claims system is live and stable. Management must choose who leads its post-implementation review. Which choice should the IS auditor consider BEST?',
        options: [
          'The project manager, who knows the delivery best',
          'The software vendor, who knows the product best',
          'The lead developer, now moved to the support team',
          'A reviewer who had no role in building or delivering it',
        ],
        correctIndex: 3,
        explanation:
          'The review judges whether the project succeeded, so the reviewer must not grade their own work. The project manager is tempting because they know the history, but they have a stake in a good verdict. The vendor and the developer share that stake.',
      },
      {
        type: 'check',
        question:
          'A post-implementation review finds a new self-service portal cut call volumes far less than its business case promised. What should the IS auditor recommend as BEST?',
        options: [
          'The IS auditor redesigns the portal to raise its use',
          'The sponsor owns a fix plan, and the auditor follows up',
          'IT adds features until the promised target is met',
          'Report the shortfall to senior management and close the review',
        ],
        correctIndex: 1,
        explanation:
          'The sponsor promised the benefit, so the sponsor owns the plan to close the gap, and the auditor later checks it worked. Reporting and closing is tempting, but a finding with no owner rarely gets fixed. Redesigning the portal would break the auditor’s independence, and adding features assumes the cause is technical.',
      },
    ],
  },
  // Outline topics: 3A1, 3A2
  {
    id: 'cisa-l-d3-project-case',
    certId: 'cisa',
    domainId: '3',
    order: 2,
    title: 'Projects and business cases: who decides',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 APO05 (Managed Portfolio)',
      'COBIT 2019 BAI01 (Managed Programs)',
      'COBIT 2019 BAI11 (Managed Projects)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['3A1', '3A2'],
    prepares: ['d3_001', 'd3_025', 'd3_046'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 3 · Projects and business cases',
        title: 'Projects and business cases: who decides',
        subtitle: 'Who approves a project, who runs it, and when should the case for it be checked again?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A business case is the written argument for spending: costs, benefits, risks and options. A feasibility study checks the idea can work technically, financially, operationally, legally and on time. The project charter then formally starts the project and gives the project manager authority.',
      },
      {
        type: 'analogy',
        heading: 'Adding a room to your house',
        body: 'Before building, you weigh the cost against the value, and check the building permits, your budget and whether it can finish before winter. Then you sign a contract that lets the builder order materials. If costs double halfway, you stop and decide again, rather than paying on because you started.',
      },
      {
        type: 'stack',
        heading: 'Who does what on a project',
        layers: [
          { label: 'Sponsor', note: 'Funds the project and owns the business case and its benefits' },
          { label: 'Steering committee', note: 'Senior leaders who can commit resources and decide go or stop at each gate' },
          { label: 'Project manager', note: 'Runs day-to-day delivery within the authority the charter grants' },
          { label: 'Project team', note: 'Builds and tests the work' },
          { label: 'IS auditor', note: 'Advises on risk and controls; does not manage or approve' },
        ],
        caption: 'A gate is a planned checkpoint where the project must earn approval to continue.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Right level of authority: each decision belongs to whoever owns its money and risk. Delivery roles run the work; governance roles fund it and choose at each gate. As the IS (information systems) auditor, you check the business case is complete and current, and you recommend. You never approve the spend yourself.',
      },
      {
        type: 'trap',
        heading: 'The sunk-cost trap',
        trap: '“We have already spent most of the budget, so we must finish.”',
        why: 'Money already spent cannot come back, so it should not drive the decision. When costs or benefits shift significantly, the case is refreshed and the people who own the money choose again: continue, change course or stop. Revisit it at every gate, not just at the start.',
      },
      {
        type: 'tip',
        body: 'For who decides, follow the money and the risk: delivery roles run the work; governance bodies allocate and choose. A go decision needs every side of feasibility, not just returns. When the facts behind an approval change, the old approval settles nothing, and sunk money is no reason to continue.',
      },
      {
        type: 'check',
        question:
          'Two project teams in one program (a group of related projects) both need the same scarce database specialist for three months. Neither will give way. Who is the MOST appropriate decision-maker?',
        options: [
          'The program steering committee, which can commit resources',
          'The project manager who asked for the specialist first',
          'The project management office, which sets delivery standards for all projects',
          'The IS auditor, as a party independent of both teams',
        ],
        correctIndex: 0,
        explanation:
          'A resource conflict across a program is a governance decision, so it goes to the body that can commit resources: the steering committee. The project management office is tempting because it sees every project, but it sets standards and supports delivery; it does not decide priorities. The auditor advises and never decides.',
      },
      {
        type: 'check',
        question:
          'A steering committee will approve a new customer app next week. Its feasibility study shows strong returns but skipped privacy law and whether support staff can run it. What is the GREATEST risk?',
        options: [
          'The projected returns may turn out lower than the study claims',
          'The project may need more developers than the plan allows',
          'The app may break privacy law or prove impossible to support',
          'The committee may be blamed publicly if the app later fails',
        ],
        correctIndex: 2,
        explanation:
          'Feasibility has several sides, and two are untested here: legal and operational. An app that breaks privacy law or cannot be supported fails whatever its returns. Lower returns are tempting because forecasts often miss, but the study did examine returns. The auditor would recommend completing the study before the go decision.',
      },
      {
        type: 'check',
        question:
          'Halfway through a warehouse automation project, the company sells two of its three warehouses. The project manager reports it is on time and on budget. What should concern the IS auditor MOST?',
        options: [
          'Status reports track cost and schedule but not earned value',
          'Its approval rests on savings the business will no longer get',
          'The delivery risk register has not been refreshed this quarter',
          'The steering committee meets too rarely to follow progress closely',
        ],
        correctIndex: 1,
        explanation:
          'The approval rested on savings that no longer exist, so the case must be updated and its owners must decide again: continue, change scope or stop. Rare committee meetings are tempting because oversight matters, but more meetings would still judge the project against outdated numbers. On time and on budget says nothing about value.',
      },
    ],
  },

  // Outline topics: 3A3
  {
    id: 'cisa-l-d3-sdlc',
    certId: 'cisa',
    domainId: '3',
    order: 3,
    title: 'Waterfall, agile and DevOps: same controls, different evidence',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC/IEEE 12207:2017 (Software life cycle processes)',
      'NIST SP 800-218 (Secure Software Development Framework)',
      'COBIT 2019 BAI03 (Managed Solutions Identification and Build)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['3A3'],
    prepares: ['d3_002', 'd3_017', 'd3_047'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 3 · Development methods',
        title: 'Waterfall, agile and DevOps: same controls, different evidence',
        subtitle: 'Teams build software in very different ways. What must stay the same whichever way they choose?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Every development method covers the same work: agree requirements, design, build, test and release. Waterfall does each step once, in order, with sign-off between them. Agile repeats short cycles called sprints. DevOps joins the builders (development) with the people who run live systems (operations), and automates testing and release, so changes ship often.',
      },
      {
        type: 'analogy',
        heading: 'A wedding caterer and a café',
        body: 'A wedding caterer agrees the full menu in writing before buying any food. A café changes its menu each week based on what sold. Both still follow the same food safety rules; the café simply checks them more often, in smaller batches.',
      },
      {
        type: 'compare',
        heading: 'Waterfall vs agile and DevOps',
        left: {
          title: 'Waterfall',
          points: [
            'Requirements signed off before design starts',
            'Evidence: phase sign-offs and documents',
            'Late change is costly',
            'Suits stable, well-understood needs',
          ],
        },
        right: {
          title: 'Agile and DevOps',
          points: [
            'Requirements refined with the business each sprint',
            'Evidence: the backlog (the team’s tracked list of work), reviews and automated test logs',
            'Change is expected',
            'Suits needs that will evolve',
          ],
        },
        caption:
          'Same control goals either way: approved requirements, tested code and an authorized release. Building before requirements (what the business needs the system to do) are approved risks working software that solves the wrong problem.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Controls designed early are cheapest, and the method does not change the control goals. As the auditor, you do not choose waterfall or agile. You check that whichever method is used still leaves evidence an outsider can follow, from what was asked for to what was proven. You recommend fixes for gaps; management closes them.',
      },
      {
        type: 'trap',
        heading: 'The no-documents trap',
        trap: '“The team is agile, so it does not need documentation.”',
        why: 'Agile prefers working software to heavy paperwork, not to all records. Key design and control decisions still need writing down, just enough for others to maintain and audit the system. In regulated settings, that record is how the organization proves its controls work.',
      },
      {
        type: 'trap',
        heading: 'The switch-methods trap',
        trap: '“Regulators need evidence, so move the project to waterfall.”',
        why: 'The method is a management choice. Agile can satisfy regulators when it builds proof as it goes, through planned approval points (gates) and a clear line from each need to the checks that prove it. Changing the whole method treats a symptom; adding the missing evidence fixes the cause.',
      },
      {
        type: 'tip',
        body: 'The method never changes the control goals, only the evidence that proves them. If nobody has settled what the system must do, building faster only builds the wrong thing sooner. Agile records can be light, but the reasons behind key decisions must outlast the people who made them.',
      },
      {
        type: 'check',
        question:
          'A team starts building a new loan application while business units still disagree on which loan types it must handle. What should the IS auditor recommend FIRST?',
        options: [
          'Add testers so defects from changing needs are caught early',
          'Let developers build the loan types they think are most common',
          'Have the IT director decide which loan types are in scope',
          'Have business owners agree and sign off the loan requirements',
        ],
        correctIndex: 3,
        explanation:
          'Building on unagreed requirements risks a system that misses business needs, so the business must settle and approve what it needs before more is built. Extra testers are tempting because they catch defects, but they would test against requirements nobody has agreed. The IT director can end the debate, but IT does not own the business need.',
      },
      {
        type: 'check',
        question:
          'A bank uses agile delivery for a payments system that external auditors review yearly. Which evidence BEST shows each requirement was approved and then tested?',
        options: [
          'Recordings of sprint demos showing finished features working for users',
          'Backlog items approved by the business and linked to passing tests',
          'One compliance sign-off obtained from the business just before launch',
          'Charts showing how much work each sprint completed',
        ],
        correctIndex: 1,
        explanation:
          'Approval and testing must be traceable item by item, so approved backlog items linked to passing tests build the evidence as the work happens. Demo recordings are tempting because they show working software, but they do not prove who approved the requirement or which tests it passed. A sign-off at the end comes too late to fix gaps.',
      },
      {
        type: 'check',
        question:
          'A DevOps team ships changes daily but records no reasons for its key design and security choices. What is the GREATEST risk for the IS auditor to report?',
        options: [
          'Later staff may undo security choices without knowing why',
          'Daily releases may overload the production servers at peak times',
          'The team may deliver fewer features in each release',
          'Automated tests may run more slowly as the code base grows',
        ],
        correctIndex: 0,
        explanation:
          'Code shows what was built, not why. Without recorded reasons, a later change can quietly remove a control nobody knew was deliberate, and auditors cannot judge the design. Server overload is tempting because daily releases feel risky, but frequency is DevOps working as intended; the gap is the missing record of decisions.',
      },
    ],
  },

  // Outline topics: 3A4
  {
    id: 'cisa-l-d3-app-controls',
    certId: 'cisa',
    domainId: '3',
    order: 4,
    title: 'Controls built into the system',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-53 Rev. 5 (SI-10 Information Input Validation; AU-10 Non-repudiation)',
      'NIST SP 800-218 (Secure Software Development Framework)',
      'COBIT 2019 BAI03 (Managed Solutions Identification and Build)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['3A4'],
    prepares: ['d3_022', 'd3_061', 'd3_024'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 3 · Control design',
        title: 'Controls built into the system',
        subtitle: 'Where should a new system stop bad data and misuse, and who decides how?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Application controls are safeguards built into a system to keep its data complete, accurate, valid and authorized. They are cheapest and strongest when designed in with the requirements, before any code exists, rather than added after the system goes live.',
      },
      {
        type: 'analogy',
        heading: 'A train ticket machine',
        body: 'The machine rejects a foreign coin at the slot. It checks that the money paid adds up to the fare before printing. It prints a ticket only for the journey you paid for. Each check sits where its error would first appear.',
      },
      {
        type: 'stack',
        heading: 'Five jobs application controls do',
        layers: [
          { label: 'Input', note: 'Edit checks (rules applied to each field at entry): valid codes, ranges, required fields' },
          { label: 'Processing', note: 'Control totals (counts or sums compared between steps) show nothing was lost or changed' },
          { label: 'Output', note: 'Results reconciled and delivered only to the right people' },
          { label: 'Access', note: 'Roles built so no one can both start and approve a sensitive action (segregation of duties)' },
          { label: 'Accountability', note: 'Tamper-evident logs (any edit shows) tied to each user, so no one can deny an action' },
        ],
        caption: 'Proving who did something, so they cannot deny it, is called non-repudiation.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Prevent at the source. A control at entry stops bad data before it spreads; a report found later only shows that it spread. As the auditor, you advise early, while the design is still cheap to change. Management designs, builds and owns the controls. If you designed them yourself, you could not later audit them objectively.',
      },
      {
        type: 'trap',
        heading: 'The detect-it-later trap',
        trap: '“Invalid records are reaching processing, so add a daily exception report.”',
        why: 'A report is detective: it finds bad records after they are already in the system. The root cause is a missing input control. An edit check at entry prevents the error where it starts, which is cheaper and more reliable.',
      },
      {
        type: 'trap',
        heading: 'The helpful-auditor trap',
        trap: '“The auditor knows controls best, so the auditor should design them.”',
        why: 'Designing the controls makes them the auditor’s own work, and no one can objectively audit their own work. Early advice is welcome; authorship is not. Management stays the owner of every control it builds.',
      },
      {
        type: 'tip',
        body: 'Place each control where its error first appears: at entry, during processing, at output, or in who may act. For accountability, ask whether anyone could quietly rewrite history. When two answers both work, prefer the one the system enforces over one that relies on people remembering.',
      },
      {
        type: 'check',
        question:
          'A nightly payroll run passes records from the calculation step to the payment step. Which control BEST shows that no records were lost between the steps?',
        options: [
          'Field checks that reject invalid hours when timesheets are entered',
          'Record counts and pay totals compared between the two steps',
          'Access rules limiting who can start the nightly payroll run',
          'Payslips delivered only to the employees named on them',
        ],
        correctIndex: 1,
        explanation:
          'Losing records between steps is a processing risk, so counts and totals compared at each hand-off show whether anything went missing. Input field checks are tempting because they are preventive, but they act at entry; they cannot see a record dropped later in the run.',
      },
      {
        type: 'check',
        question:
          'A payroll clerk’s role in a new system lets her add employees and also release each month’s salary payments. What is the GREATEST risk?',
        options: [
          'Errors in new employee records may go unnoticed until payday',
          'The clerk may need extra training to handle the combined role',
          'She could add a fake employee and then pay them unnoticed',
          'HR and payroll may dispute which team owns the combined role',
        ],
        correctIndex: 2,
        explanation:
          'Letting one person both create a payee and release money to it is the classic setup for fraud: a fake employee, paid with nobody else involved. Unnoticed entry errors are tempting because they are a real risk, but a second person in the process would catch those too; the bigger harm is deliberate theft. The fix is a role split the system enforces.',
      },
      {
        type: 'check',
        question:
          'A manager denies approving a large trade. The log shows her user ID, but administrators can edit that log. What is the GREATEST weakness for the IS auditor to report?',
        options: [
          'The log can be altered, so it cannot prove who approved',
          'The log was not encrypted while stored on the server',
          'The approval screen did not ask managers to confirm each trade',
          'The trade limit for managers was set higher than policy allows',
        ],
        correctIndex: 0,
        explanation:
          'To stop someone denying an action, you need a record nobody can quietly change, tied to a verified identity. Here anyone with admin rights could have edited the entry, so it proves nothing. Encryption is tempting because it protects records, but it keeps them secret, not unchangeable.',
      },
    ],
  },

  // Outline topics: 3B1
  {
    id: 'cisa-l-d3-testing',
    certId: 'cisa',
    domainId: '3',
    order: 5,
    title: 'Ready to go live? Testing that proves it',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC/IEEE 29119-2:2021 (Software testing: test processes)',
      'NIST SP 800-188 (De-Identifying Government Datasets)',
      'COBIT 2019 BAI07 (Managed IT Change Acceptance and Transitioning)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['3B1'],
    prepares: ['d3_003', 'd3_007', 'd3_010'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 3 · Testing',
        title: 'Ready to go live? Testing that proves it',
        subtitle: 'Which test proves what, and who gets to say a new system is ready for real users (go live)?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Testing builds evidence in layers. Each level answers a different question, from “does this piece work?” to “will the business accept it?”. The decision to go live rests on that evidence and on business users agreeing the system meets their needs.',
      },
      {
        type: 'analogy',
        heading: 'Building a car',
        body: 'Each part is checked on the bench. Then parts are checked fitted together, then the whole car on a test track. Finally the buyer test-drives it on their own roads and signs for it. A perfect bench test of the brakes says nothing about how they work with the wheels.',
      },
      {
        type: 'flow',
        heading: 'Four testing levels, in order',
        steps: [
          { label: 'Unit testing', note: 'Developers test each small piece of code on its own' },
          { label: 'Integration testing', note: 'Pieces and interfaces (links to other systems) pass data correctly' },
          { label: 'System testing', note: 'The whole system meets its functional, performance and security requirements' },
          { label: 'User acceptance testing', note: 'Business users confirm it meets their needs, against criteria agreed in advance' },
        ],
        caption: 'A traceability matrix links each approved requirement to its tests and results, so a requirement with no test shows up as a blank.',
      },
      {
        type: 'idea',
        heading: 'Test data',
        body: 'Test environments are usually less protected than production, the live systems. Copying real customer data into them spreads it to more people. Encrypting the copy does not help, because testers still read it. Mask it first: swap names, account numbers and other identifiers for realistic fake values before the data leaves production.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Evidence quality, and the business decides readiness. As the auditor, you check that results exist at each level, trace back to approved requirements and meet the exit criteria (pass marks agreed before testing). You do not run the tests or accept the system. Business owners accept it; your job is to say whether the evidence supports their decision.',
      },
      {
        type: 'trap',
        heading: 'The wrong-level trap',
        trap: '“The business signed off acceptance testing, so every interface must work.”',
        why: 'Each level has its own scope. Acceptance shows users are satisfied with what they tried; it does not prove data passes correctly between systems. For interfaces, look for integration test results that trace records across each link.',
      },
      {
        type: 'tip',
        body: 'Match the question to the test level whose scope covers it: pieces, links, the whole, or business fit. When something is missing, the auditor’s job is to make it visible, not to supply it. For test data, judge the result, not the intention: what could a tester still see?',
      },
      {
        type: 'check',
        question:
          'A new online store must handle peak holiday traffic and meet its security requirements as a whole. Which testing evidence is MOST relevant for the IS auditor?',
        options: [
          'Unit test results from each developer’s code modules',
          'User acceptance sign-off from the sales team after a full trial',
          'System test results for the complete, assembled application',
          'Code scan reports listing the flaws found in each module',
        ],
        correctIndex: 2,
        explanation:
          'Performance and security requirements belong to the system as a whole, so system testing is the level that proves them. Acceptance sign-off is tempting because it is the final approval, but users judge whether the store meets their needs, not whether it survives peak load. Unit results cover pieces, not the whole.',
      },
      {
        type: 'check',
        question:
          'A traceability matrix shows two regulatory requirements for a pension system with no linked test. Go-live is tomorrow. What should the IS auditor do FIRST?',
        options: [
          'Write and run tests for the two requirements tonight yourself',
          'Tell the go-live decision-makers that two requirements are untested',
          'Accept the gap, since acceptance testing passed for the system overall',
          'Remove the two requirements from the matrix to close the gap',
        ],
        correctIndex: 1,
        explanation:
          'The matrix has done its job: it exposed requirements with no evidence. The auditor makes that gap known to the people deciding on go-live, and the business decides whether to delay or accept the risk. Writing the tests yourself is tempting because it closes the gap fast, but it is management’s work and would impair your objectivity.',
      },
      {
        type: 'check',
        question:
          'Patient data was masked before a test copy was made for a new booking system. Which finding should concern the IS auditor MOST?',
        options: [
          'The masked names look realistic but are entirely invented',
          'The test copy is a month older than live production data',
          'Testers cannot see patients’ real home addresses or phone numbers',
          'Real patient numbers remain in a free-text notes field',
        ],
        correctIndex: 3,
        explanation:
          'Masking protects only the fields it reaches. Real identifiers left in a notes field mean the test environment still holds personal data. The month-old copy is tempting as a quality worry, but stale data affects test realism, not privacy. Invented names and hidden addresses are masking working as intended.',
      },
    ],
  },

  // Outline topics: 3B2
  {
    id: 'cisa-l-d3-release',
    certId: 'cisa',
    domainId: '3',
    order: 6,
    title: 'Release and configuration control',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 27001:2022 Annex A 8.9 (Configuration management)',
      'ISO/IEC 27001:2022 Annex A 8.32 (Change management)',
      'NIST SP 800-128 (Guide for Security-Focused Configuration Management of Information Systems)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['3B2'],
    prepares: ['d3_009', 'd3_004', 'd3_013'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 3 · Release management',
        title: 'Release and configuration control',
        subtitle: 'How do you know what is going live, and that only an approved, tested version gets there?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A release is a tested package of changes moved into production, the live systems people use. Configuration management records exactly what the release is made of, so that only the approved, tested version can go live.',
      },
      {
        type: 'analogy',
        heading: 'The recipe book in a busy kitchen',
        body: 'The approved recipe lists every ingredient, amount and oven setting. A cook cannot quietly change the salt: changes go to the head chef, are tasted, and the book is updated. A recipe that fixes the ingredients but not the oven setting can still produce a burnt dish.',
      },
      {
        // Expert review fix (2026-10): real release order. Automated gates run BEFORE the approval, which is given on the attached evidence.
        type: 'flow',
        heading: 'How a release reaches production',
        steps: [
          { label: 'Log the change request', note: 'Linked to its requirement, with purpose, impact and a rollback plan' },
          { label: 'Peer review, build once', note: 'An independent reviewer checks the code; the pipeline builds it once' },
          { label: 'Pass automated gates', note: 'Automated tests and security scans (automatic checks for known weaknesses) block any failing build' },
          { label: 'Approve on attached evidence', note: 'CAB advises on significant changes; the change authority decides' },
          { label: 'Deploy, never by the author', note: 'Through the pipeline or by operations staff, never by the person who wrote the code' },
        ],
        caption: 'Configuration items, everything the release needs (code, designs, settings, scripts), sit in an approved, frozen baseline. Any item left out can change after testing, without approval.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Preventive beats detective. A gate that blocks a failed build is stronger than a review that finds the damage later. As the auditor, you check that controls act before release, not after, and that nobody can get around them alone. You recommend; release owners run the process.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Every change is reviewed at the monthly board meeting, so our releases are controlled.”',
        why: 'With releases several times a week, a monthly review finds problems after customers meet them. Routine releases need automated checks that stop them before go-live. The board judges significant changes before approval, not after.',
      },
      {
        type: 'tip',
        body: 'For fast automated releases, ask which control acts on every release before customers see it. Ask what else, besides code, decides how software behaves in production. And watch for anyone who ends up judging what they built themselves.',
      },
      {
        type: 'check',
        question:
          'Pipeline gates block failed builds of a mobile banking app, but any developer can switch a gate off. What is the GREATEST risk?',
        options: [
          'A failing build could reach customers with no one checking it',
          'Builds may take longer while the gates run their full tests',
          'Developers may write fewer automated tests over time to save effort',
          'Gate settings may drift apart between the test and live pipelines',
        ],
        correctIndex: 0,
        explanation:
          'A gate that one person can switch off is no longer independent: the developer who wrote the code can also push it live unchecked. Slower builds are tempting as a concern because speed matters in DevOps, but that is a cost, not a control failure. Changes to gate settings should need separate approval.',
      },
      {
        type: 'check',
        question:
          'A release passed every test, then failed in production because an administrator had changed a server setting the day before. What does this MOST likely show the IS auditor?',
        options: [
          'The release’s code was not tested thoroughly enough before deployment',
          'Server logs were not reviewed often enough to spot the change',
          'The change board approved the release without a rollback plan',
          'Server settings were left out of the controlled baseline',
        ],
        correctIndex: 3,
        explanation:
          'A release is defined by everything it needs to run as approved, including settings. Settings outside the baseline can change without review, so tested code meets an untested environment. Blaming log review is tempting because it adds oversight, but reviews are detective: the bad setting ran before anyone looked. A rollback plan speeds recovery but does not stop the change.',
      },
      {
        type: 'check',
        question:
          'A change advisory board’s meetings run for hours because members rewrite each team’s deployment scripts. What should the IS auditor recommend as BEST?',
        options: [
          'Add senior developers to the board so scripts are rewritten faster',
          'Have the CIO chair the board to keep meetings on schedule',
          // Expert review fix (2026-10): the CAB advises; the change authority decides (matches the flow above).
          'Send script fixes back to the teams; the board advises on approval',
          'Let teams approve their own changes to save the board’s time',
        ],
        correctIndex: 2,
        explanation:
          'The board’s value is an independent view of risk and readiness before approval; rewriting scripts makes it part of the work it should judge. Adding developers is tempting because meetings would go faster, but it treats the symptom and deepens the conflict. A senior chair may shorten meetings, yet the board would still do the teams’ work. Self-approval removes the independent check entirely.',
      },
    ],
  },

  // Outline topics: 3B3
  {
    id: 'cisa-l-d3-migration',
    certId: 'cisa',
    domainId: '3',
    order: 7,
    title: 'Moving to the new system: conversion and cutover',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 BAI07.02 (Plan business process, system and data conversion)',
      'COBIT 2019 BAI07 (Managed IT Change Acceptance and Transitioning)',
      'NIST SP 800-53 Rev. 5 (CM-2 Baseline Configuration)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['3B3'],
    prepares: ['d3_012', 'd3_019', 'd3_036'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 3 · Migration and conversion',
        title: 'Moving to the new system: conversion and cutover',
        subtitle: 'How do you prove the data arrived intact, and when should you turn back?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Migration moves a business onto a new system. Data conversion copies old records and reshapes them for it. Cutover is the moment the business switches over. Mistakes hit customers at once, so each step needs proof it worked and a fallback: an agreed way back.',
      },
      {
        type: 'analogy',
        heading: 'Moving house',
        body: 'You count the boxes going onto the truck and coming off it, and check the valuables by name. You can move everything in one day or one room at a time. And until the new place has water and power, you keep the keys to the old one.',
      },
      {
        type: 'flow',
        heading: 'A controlled cutover',
        steps: [
          {
            label: 'Prepare',
            note: 'New servers set up to the approved secure settings; errors and duplicates in old data fixed, with the data owner’s approval',
          },
          { label: 'Rehearse', note: 'Practice runs, including business steps, with time left to fix problems' },
          { label: 'Convert and reconcile', note: 'Record counts and control totals (sums of key values) matched, old to new' },
          {
            label: 'Go, no-go or fall back',
            note: 'Owners decide against criteria agreed in advance. A rollback plan gives tested, time-bound steps to restore code, data and settings',
          },
          { label: 'Retire the old system', note: 'Only after final sign-off and with its records archived' },
        ],
        caption: 'Big-bang switches everyone at once. Phased moves one group at a time. Parallel runs old and new side by side and compares results.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Verify outcomes. Data that looks right on a few screens is not proof. As the auditor, you check that the data owner approved the conversion rules and results, and that the hard calls for cutover night were agreed in advance by the people who own the risk. You advise; management decides.',
      },
      {
        type: 'trap',
        heading: 'The fix-it-later trap',
        trap: '“The difference is small next to total balances, so go live and fix it later.”',
        why: 'An unexplained difference means you do not know what went wrong or how far it spreads. Going live on suspect data puts the error in front of customers and makes it harder to unwind. Small is not the same as understood.',
      },
      {
        type: 'trap',
        heading: 'The one-weekend trap',
        trap: '“Big-bang is simpler, so it is always the best cutover.”',
        why: 'Big-bang avoids building temporary connections that let old and new systems share data during the move, but a failure hits every user at once. When groups differ a lot or the stakes are high, a phased cutover limits the damage and lets the team correct course between waves.',
      },
      {
        type: 'tip',
        body: 'Counts prove that records arrived; sums prove the amounts in them are right. You need both. Cutover decisions are made in advance, when heads are clear, not at 3 a.m. Big-bang trades safety for speed, so ask what would make a single switch survivable.',
      },
      {
        type: 'check',
        question:
          'After converting billing accounts, record counts match between the old and new systems, but total balances differ by a small unexplained amount. What is the MOST appropriate conclusion?',
        options: [
          'The conversion succeeded, since the record counts match exactly',
          'The difference is too small to matter and can be written off',
          'The old system’s totals were probably wrong to begin with',
          'Values inside some records may be wrong; accuracy is unproven',
        ],
        correctIndex: 3,
        explanation:
          'Matching counts show completeness: every record arrived. Matching totals show accuracy, and here they do not match. Until the cause is found, nobody knows which accounts are wrong or by how much. Treating matching counts as success is tempting, but counts cannot see a wrong amount inside a record that did arrive.',
      },
      {
        type: 'check',
        question:
          'A payroll team is writing go or no-go criteria for an overnight cutover. Which criterion is MOST important to include?',
        options: [
          'Go live once ninety percent of the planned test cases have passed',
          'Let the vendor decide on the night whether go-live should proceed',
          'Revert if a significant gap is still unexplained by a set hour',
          'Go live once the full project team is on site for support',
        ],
        correctIndex: 2,
        explanation:
          'Criteria agreed in advance stop a tired team talking itself into going live on suspect data, and a clear trigger to return to the old system protects payroll. “Significant” keeps the trigger tied to business impact, not every penny. Letting the vendor decide is tempting because it knows the system, but the business owns the decision and the risk.',
      },
      {
        type: 'check',
        question:
          'A retailer plans a big-bang cutover of all its stores to a new checkout system. Which condition would MOST support that choice?',
        options: [
          'Every store runs the same simple process, with a tested fallback',
          'Stores differ widely, but the vendor promises a smooth switch',
          'The cutover falls on the busiest holiday sales weekend of the year',
          'The steering committee has signed off the cutover date',
        ],
        correctIndex: 0,
        explanation:
          'Big-bang suits uniform, simple operations where a failure can be reversed quickly, because it avoids temporary links between old and new. The vendor’s promise is tempting, but when stores differ widely, one failure hits many different processes at once; a phased cutover limits that damage. Committee sign-off settles the date, not whether one cutover suits the stores.',
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
        // Expert review fix (2026-10): ranking and targets merged; senior management approves the BIA results.
        type: 'flow',
        heading: 'What the BIA produces',
        steps: [
          { label: 'Identify processes', note: 'And the systems, people and suppliers they depend on' },
          { label: 'Assess impact over time', note: 'Financial, legal, customer and safety harm per hour or day' },
          { label: 'Rank and set targets', note: 'Enterprise-wide criteria rank processes into tiers, each with a longest survivable outage (maximum tolerable downtime), a recovery time (RTO) inside it, and how much data it can lose (RPO). More on both next lesson' },
          { label: 'Senior management approves', note: 'Approved results become the agreed basis for recovery priorities and spending' },
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
        body: 'Exam questions open with a short scenario, called the stem. If the stem asks what comes first in continuity planning, the BIA is usually the answer. Backups do not replace a BIA: they protect data but do not say what must come back first. If it asks who sets recovery targets, look for the process owner and senior management, not IT.',
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
          'Accept the loss, since recovery met the two-hour RTO',
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
        // Expert review fix (2026-10): two approval points: authorize the build, then approve the release on test evidence. The CAB advises; the change authority decides.
        type: 'flow',
        heading: 'The life of a change',
        steps: [
          { label: 'Request', note: 'Documented, with a business reason' },
          { label: 'Assess and authorize build', note: 'Risk and impact assessed; the change authority, advised by the change advisory board (CAB) on higher-risk changes, authorizes work to proceed' },
          { label: 'Build and test', note: 'Outside production, with code kept in version control (a tracked history of every edit)' },
          { label: 'Approve release on evidence', note: 'The change authority approves deployment on the attached test results, not the developer’s word' },
          { label: 'Released by non-developer', note: 'Moved to production by someone other than the developer' },
          { label: 'Review', note: 'Confirm it worked and matches the approved setup (the configuration baseline)' },
        ],
        caption: 'Emergencies bend the order, not the rules: an urgent fix may go in first, but it is logged at the time and independently reviewed and approved soon after.',
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
          'Log each developer change and have a manager review it monthly',
          'Remove developer production access; use a separate release role',
          'Have developers review each other’s code before release',
          'Restrict patches to scheduled maintenance windows',
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
          'Reset every server to the approved baseline immediately',
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
  // Outline topics: 4A1, 4A2 assets
  {
    id: 'cisa-l-d4-assets',
    certId: 'cisa',
    domainId: '4',
    order: 4,
    title: 'Know what you run',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 19770-1:2017 (IT asset management systems)',
      'NIST SP 1800-5 (IT Asset Management)',
      'NIST SP 800-53 Rev. 5, control CM-8 (System component inventory)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['4A1', '4A2'],
    prepares: ['d4_009', 'd4_029', 'd4_060'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · IT components and assets',
        title: 'Know what you run',
        subtitle: 'You cannot protect, patch or license what you do not know you have.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'IT components are the hardware, operating systems, network devices and utility programs (powerful tools that can change system settings or data directly) that services run on. IT asset management tracks each one from purchase to secure disposal: what it is, who owns it, where it runs and whether the vendor still supports it.',
      },
      {
        type: 'analogy',
        heading: 'A library catalog',
        body: 'Purchase receipts show which books the library bought, not which were lost, lent or donated. So staff walk the shelves and correct the catalog. An asset register built only from purchase orders is the pile of receipts. Discovery scans, tools that search the network for every connected device, are the shelf walk.',
      },
      {
        // Expert review fix (2026-10): discover and maintain merged into one ongoing step.
        type: 'flow',
        heading: 'The asset life cycle',
        steps: [
          { label: 'Acquire', note: 'Approved and recorded with a named owner' },
          { label: 'Deploy', note: 'Assigned and set up to an approved configuration' },
          { label: 'Maintain and reconcile', note: 'Support, patches and licenses tracked; discovery scans compared with the register, and gaps followed up' },
          { label: 'Retire', note: 'Data securely wiped, record closed' },
        ],
        caption: 'Discovery keeps the register honest. Comparing it with the register turns a scan into a control.',
      },
      {
        type: 'idea',
        heading: 'When support ends',
        body: 'When a vendor ends support, security fixes stop. Management then replaces the item, buys extended support, or adds compensating controls (other controls covering the same risk) and formally accepts the risk that remains. Running it as is, with no decision recorded, is the finding.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Risk-based thinking starts with a complete inventory. As the auditor, you test whether the register matches reality, not just whether one exists. When a component cannot be replaced in time, you recommend interim controls and a decision recorded by someone with authority over the risk. Management decides; you report what remains.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“We have purchase records for every license, so we are compliant.”',
        why: 'Purchases show what you may use, not what is installed. Compliance needs both sides compared. The same logic applies to the asset register: a record of buying is not proof of what runs today.',
      },
      {
        type: 'tip',
        body: 'An inventory is only as good as its last check against reality. A purchase shows what you may run, not what you run, so settle facts before spending. When a fix cannot come in time, shrink the exposure now and make someone own the rest.',
      },
      {
        type: 'check',
        question: 'An IS auditor must test whether a company’s server register is complete. Which approach is BEST?',
        options: [
          'Trace each register entry back to its approved purchase order',
          'Trace servers found on the network back to the register',
          'Ask the data center manager to sign that the register is complete',
          'Check that every entry in the register names an owner',
        ],
        correctIndex: 1,
        explanation:
          'Complete means nothing is missing, so start from what actually runs on the network and look for it in the register. Tracing entries to purchase orders is tempting because it uses hard evidence, but it only tests items already listed; a server nobody recorded can never appear that way.',
      },
      {
        type: 'check',
        question:
          'Checkout terminals lose vendor support next month, and replacements will take nine months. IT will isolate and monitor them meanwhile. Who should formally accept the remaining risk?',
        options: [
          'The head of retail operations, who owns the checkout process',
          'The IT security manager, who will monitor the isolated terminals',
          'The IS auditor, who first reported the end-of-support gap',
          'The CIO, who approved the nine-month replacement plan',
        ],
        correctIndex: 0,
        explanation:
          'Risk is accepted by the business owner who bears the impact, at a level with authority over it, and here that is whoever owns checkout. The security manager is tempting because they run the interim controls, but running a control is not owning the risk. The CIO approved the fix, not the business risk while it waits. The auditor reports the gap and never accepts it.',
      },
      {
        type: 'check',
        question:
          'A business unit owns 500 licenses for a design tool. Discovery finds it installed on 640 computers. What should the IS auditor recommend FIRST?',
        options: [
          'Uninstall the tool today from the computers over the limit',
          'Wait until the vendor raises the gap in a formal license audit',
          'Buy 140 more licenses today so the installs are covered',
          'Confirm the true gap against all entitlements and actual use',
        ],
        correctIndex: 3,
        explanation:
          'Some installs may be unused or covered by other entitlements, so establish the true gap first, then fix the approval process that let it grow. Buying 140 licenses is tempting because it ends the exposure at once, but it spends money before the facts are known and does nothing to stop a repeat.',
      },
    ],
  },
  // Outline topics: 4A3, 4A4, 4A5 batch, interfaces, EUC
  {
    id: 'cisa-l-d4-batch-interfaces-euc',
    certId: 'cisa',
    domainId: '4',
    order: 5,
    title: 'Batch jobs, interfaces and shadow IT',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 DSS01 (Managed operations)',
      'NIST SP 800-53 Rev. 5, controls CM-3 (Configuration change control) and SI-7 (Software, firmware and information integrity)',
      'NIST SP 800-53 Rev. 5, control CM-11 (User-installed software)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['4A3', '4A4', '4A5'],
    prepares: ['d4_026', 'd4_010', 'd4_018'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Operations behind the scenes',
        title: 'Batch jobs, interfaces and shadow IT',
        subtitle: 'Much of IT runs unseen. Each hidden part needs a control that proves it worked.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Batch jobs run on a schedule, often overnight. Interfaces pass data from one system to another. End-user computing means spreadsheets and tools that business staff build themselves. Shadow IT is technology used without IT’s approval. All four can fail silently.',
      },
      {
        type: 'analogy',
        heading: 'Counting the boxes',
        body: 'A courier delivers 40 boxes to a warehouse. The van’s tracker says “delivered”, but that only proves the van arrived. The warehouse counts the boxes against the shipping note and checks the seals. A job’s “success” message is the tracker. Counts and totals checked on arrival are the warehouse count.',
      },
      {
        type: 'stack',
        heading: 'One control question per area',
        layers: [
          {
            label: 'Job scheduling',
            note: 'Each job serves an approved business need, and a job starts only once the counts from the job before it check out',
          },
          {
            label: 'Interfaces',
            note: 'The receiver reconciles record counts and control totals (sums of a key field) with the sender',
          },
          { label: 'End-user computing', note: 'An inventory with named owners, risk ratings and reviewed changes' },
          { label: 'Shadow IT', note: 'Find it, rank it by risk, then approve, replace or retire each tool' },
        ],
        caption: 'Each layer answers the same question: how would we know if it went wrong?',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Governance before technology. As the auditor, you first ask whether each job, interface and user-built tool is known, owned and approved. Then you ask whether a control proves it worked. A “job succeeded” message is not evidence of complete, accurate data. You recommend; the business owner decides the fix.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The scheduler shows the job completed, so the data is complete.”',
        why: 'Completion status proves the job ran, not that it processed the right records. A job can “succeed” on an empty input file. Record counts and control totals, checked before the next job starts, prove completeness.',
      },
      {
        type: 'trap',
        heading: 'The second trap',
        trap: '“Block every unapproved app today.”',
        why: 'A blanket ban ignores why staff adopted the tools and can stop real work. Governance comes first: find the tools, rank them by the data they hold, then approve, replace or retire each one. Blocking may suit one high-risk tool, not every tool as a first step.',
      },
      {
        type: 'tip',
        body: 'A success message is the van’s tracker, not the warehouse count. Ask how anyone would find out if it went wrong. For tools staff build or adopt themselves, judge them first by what decisions they feed, then ask who approved them.',
      },
      {
        type: 'check',
        question: 'An IS auditor reviews the batch scheduler for a billing system. Which finding should concern the auditor MOST?',
        options: [
          'Several jobs failed last month and were rerun successfully',
          'The scheduler runs on hardware bought five years ago',
          'Ten scheduled jobs have no request or owner on record',
          'Rerun approvals come from the shift lead, not the job owner',
        ],
        correctIndex: 2,
        explanation:
          'Jobs nobody asked for or owns can move or change data without any business owner knowing. The rerun failures are tempting, but they were caught and fixed; an unapproved job may never appear in any failure log. Shift-lead approval of reruns is a minor gap, since those jobs are known and owned.',
      },
      {
        type: 'check',
        question:
          'The finance team stopped checking nightly interface totals from the warehouse system because the job always reports success. What is the GREATEST risk?',
        options: [
          'Dropped or duplicated stock records could go unnoticed',
          'The interface file could be read while crossing the network',
          'The nightly job could finish later than its scheduled time',
          'Warehouse staff could enter stock codes in the wrong format',
        ],
        correctIndex: 0,
        explanation:
          'A success message proves the job ran, not that every record arrived once with the right amount. Without the receiving-end check, dropped or duplicated records reach the ledger silently. Interception is tempting because it sounds serious, but it is a confidentiality risk that encryption addresses; it does not affect completeness.',
      },
      {
        type: 'check',
        question:
          'One analyst built a spreadsheet that calculates the sales commissions paid each month. Which finding should concern the IS auditor MOST?',
        options: [
          'It was built in an older version of the spreadsheet software',
          'It is stored on a shared drive with other finance files',
          'Nobody reviews or tests formula changes before it is used',
          'The analyst is the one person who knows how to run it',
        ],
        correctIndex: 2,
        explanation:
          'The spreadsheet decides real payments, so an unchecked formula error pays people wrongly every month. End-user computing needs an owner, a risk rating and reviewed changes. Relying on one analyst is tempting because it is a real key-person risk, but it delays a run rather than paying people wrongly; change review catches a broken formula.',
      },
    ],
  },
  // Outline topics: 4A6, 4A10 capacity and service levels
  {
    id: 'cisa-l-d4-capacity-sla',
    certId: 'cisa',
    domainId: '4',
    order: 6,
    title: 'Capacity and service levels',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 20000-1:2018 (Service management system requirements: service level, availability and capacity management)',
      'COBIT 2019 APO09 (Managed service agreements) and BAI04 (Managed availability and capacity)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['4A6', '4A10'],
    prepares: ['d4_014', 'd4_003', 'd4_019'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Capacity and service levels',
        title: 'Capacity and service levels',
        subtitle: 'Will the system keep up, and who agreed what “good enough” means?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Capacity management makes sure systems have enough processing, storage and network to meet demand, now and as it grows. A service level agreement (SLA) records measurable targets that the business and IT have agreed, such as availability during business hours.',
      },
      {
        type: 'analogy',
        heading: 'A cinema on opening night',
        body: 'A cinema adds screenings and staff for opening night, not for an average Tuesday. It also promises the film starts at 7:30. Planning for the rush is capacity management. The promised start time, measured and reported, is the service level.',
      },
      {
        // Expert review fix (2026-10): OLAs and contracts back the SLA; capacity planning runs alongside, so it moved to the caption.
        type: 'flow',
        heading: 'The service level cycle',
        steps: [
          { label: 'Agree targets', note: 'Business need sets the numbers, measured as users experience the service' },
          { label: 'Back them with OLAs and contracts', note: 'Internal operational level agreements (OLAs) and supplier contracts are set to support the SLA' },
          { label: 'Measure and report', note: 'End to end, over the hours the business needs the service' },
          { label: 'Review and improve', note: 'Breaches trigger root cause analysis, not blame' },
        ],
        caption: 'Capacity planning runs alongside: forecast peaks and growth, and act before limits are reached. A target nobody can measure is a hope, not a control.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Business alignment: the business need sets the target, and the design follows. As the auditor, you check that targets are measurable, tied to business impact and reported end to end. A near-perfect target for an expense-claims tool is a finding, because it costs more than the need justifies; so is a missing target for payroll. You recommend; service owners decide.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Every component dashboard is green, so we meet the SLA.”',
        why: 'Users experience the whole service, not single servers. Every part can meet its own target while the service as a whole fails. Measure availability the way the customer sees it.',
      },
      {
        type: 'trap',
        heading: 'The second trap',
        trap: '“Average use is 50 percent, so there is plenty of headroom.”',
        why: 'Averages hide the peaks. Month-end and seasonal spikes are when systems run out. Plan capacity for peak demand and its trend.',
      },
      {
        type: 'tip',
        body: 'When a stem offers an average, ask what the average hides. An SLA is only as strong as the weakest agreement standing behind it. When every part passes but the whole fails, judge the service the way users meet it, and get facts before choosing a fix.',
      },
      {
        type: 'check',
        question:
          'A storage team buys more disk space only after an outage caused by full disks, and this has happened three times this year. What is the MOST likely root cause?',
        options: [
          'No one forecasts demand, so each purchase follows a failure',
          'The storage budget is too small for the company’s growth',
          'The disk vendor takes too long to deliver new hardware',
          'Full-disk alerts reach the storage team too late to act',
        ],
        correctIndex: 0,
        explanation:
          'Three outages from the same cause point to a missing process: nobody looks at the growth trend and buys ahead of it. Late alerts are tempting because earlier warnings would help, but an alert still reacts to a limit that is already close; only forecasting leaves time to buy and install capacity.',
      },
      {
        type: 'check',
        question:
          'An SLA promises to restore the booking service within four hours, but the hardware supplier’s contract allows 24 hours to deliver parts. What is the GREATEST risk?',
        options: [
          'The supplier may charge more for faster delivery of parts',
          'IT may break the four-hour promise whenever hardware fails',
          'The business may not truly need a four-hour restore',
          'The supplier contract may lack penalties matching the four-hour promise',
        ],
        correctIndex: 1,
        explanation:
          'An SLA is only as strong as the agreements behind it. If parts can take 24 hours, a hardware failure can break the four-hour promise however hard IT works. Questioning whether four hours is needed is tempting, but the business set that target; the gap is in the supplier terms that should support it.',
      },
      {
        type: 'check',
        question:
          'A cloud provider, the network team and the application team each met their own targets, yet the customer-facing SLA was breached twice this month. What should the IS auditor recommend FIRST?',
        options: [
          'Ask each team to sign off that its part met its target',
          'Lower the SLA target to match what the teams deliver',
          'Trace real failed transactions across every layer of the service',
          'Replace the cloud provider with one promising higher availability targets',
        ],
        correctIndex: 2,
        explanation:
          'Facts come first: tracing real transactions shows where time or availability is lost between the parts. Changing provider is tempting, but it is a fix chosen before the cause is known, and the gap may sit between teams.',
      },
    ],
  },
  // Outline topics: 4A7 incident and problem
  {
    id: 'cisa-l-d4-incident-problem',
    certId: 'cisa',
    domainId: '4',
    order: 7,
    title: 'Incident or problem?',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 20000-1:2018 (Service management system requirements: incident and problem management)',
      'COBIT 2019 DSS02 (Managed service requests and incidents) and DSS03 (Managed problems)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['4A7'],
    prepares: ['d4_015', 'd4_031', 'd4_016'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Incident and problem management',
        title: 'Incident or problem?',
        subtitle: 'Getting users working again and stopping it from happening again are two different jobs.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'An incident is an unplanned interruption to a service; incident management restores service fast. A problem is the cause behind one or more incidents; problem management finds and removes it. A known error is a problem whose cause is known but not yet fixed for good. The service desk (the IT help desk) logs each user issue as a ticket.',
      },
      {
        type: 'analogy',
        heading: 'A leaking roof',
        body: 'Rain drips into your kitchen. A bucket under the drip keeps the floor dry tonight: that is incident management, using a workaround. Finding the cracked tile and replacing it is problem management. A note on the fridge saying where the bucket goes until the roofer comes is the known-error record.',
      },
      {
        type: 'compare',
        heading: 'Two jobs, run side by side',
        left: {
          title: 'Incident management',
          points: [
            'Goal: restore service quickly',
            'Workarounds are fine',
            'Priority set by business impact and urgency',
            'Judged by fixes that last, not just speed',
          ],
        },
        right: {
          title: 'Problem management',
          points: [
            'Goal: remove the cause',
            'Looks past “human error” to the process',
            'Triggered by repeats, trends or one major incident',
            'Shares known errors and workarounds with the service desk',
          ],
        },
        caption: 'Restoring service never cancels the search for the cause.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Root cause beats symptom. As the auditor, you look for repeat incidents closed one by one with quick fixes, and for root cause reviews that stop at “operator error”. Ask why the process allowed it. You also test the metrics, because fast closure can hide poor fixes. You recommend; the process owner fixes.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Find the root cause before restoring service.”',
        why: 'During an outage the business needs service back. Apply a safe workaround first; the search for why it failed continues afterwards. Waiting for the root cause makes the harm last longer.',
      },
      {
        type: 'trap',
        heading: 'The second trap',
        trap: '“Tickets close faster, so the service desk is improving.”',
        why: 'Speed alone is easy to game by closing tickets early. Judge a desk by whether its fixes hold, not by how fast tickets disappear.',
      },
      {
        type: 'tip',
        body: 'Getting users working and stopping a repeat are separate jobs, and the second must not quietly vanish once the first is done. Many identical tickets share one hidden origin. When a number is rewarded, look for the side effect it can hide.',
      },
      {
        type: 'check',
        question:
          'A workaround restored email after an outage, the incident was closed, and nobody investigated further. Two weeks later email fails the same way. What is the MOST likely gap?',
        options: [
          'Engineers restored service before diagnosing what had failed',
          'The service desk took too long to close the first incident',
          'The change board did not approve the workaround beforehand',
          'No problem record was opened to find and remove the cause',
        ],
        correctIndex: 3,
        explanation:
          'Restoring service was right; stopping there was not. A problem record keeps the cause on someone’s list after the incident closes. Blaming the early restore is tempting, but restoring service first is correct incident practice; the gap is the missing follow-through. Change board approval of the workaround would not have found the cause either.',
      },
      {
        type: 'check',
        question:
          'A printer fault keeps recurring. Its cause is known and its workaround is in the known-error record, so the problem record was closed. What should concern the IS auditor MOST?',
        options: [
          'Nobody now owns finding and applying a permanent fix',
          'Agents may apply the workaround without telling users first',
          'The known-error entry may be too technical for new agents',
          'The service desk manager did not approve the known-error entry',
        ],
        correctIndex: 0,
        explanation:
          'A known error is a problem whose cause is known but not yet permanently fixed, so the problem stays open until the fix is made or formally declined. Closing it at the workaround stage leaves the fault to recur indefinitely. Technical wording is tempting as a concern because agents must use the entry, but it is a usability issue, not a missing fix. Approving the entry makes the workaround official; it still fixes nothing.',
      },
      {
        type: 'check',
        question:
          'Average ticket closure time halved after service desk agents were given a speed bonus. Which evidence should the IS auditor check FIRST?',
        options: [
          'Whether agents worked overtime to close tickets faster',
          'Whether reopened tickets rose over the same period',
          'Whether call volumes changed over the same period',
          'Whether the bonus stayed within the service desk budget',
        ],
        correctIndex: 1,
        explanation:
          'A speed bonus rewards closing tickets, whether or not the issue is fixed, so a rise in reopened tickets is the first sign of early closure. Changing call volumes is tempting because fewer calls could also explain faster closure, but that describes demand, not whether fixes held.',
      },
    ],
  },
  // Outline topics: 4A9, 4A11 logs and databases
  {
    id: 'cisa-l-d4-logs-db',
    certId: 'cisa',
    domainId: '4',
    order: 8,
    title: 'Logs and databases',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-92 (Guide to Computer Security Log Management)',
      'NIST SP 800-53 Rev. 5, AU family (Audit and accountability)',
      'COBIT 2019 DSS05 (Managed security services) and DSS06 (Managed business process controls)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['4A9', '4A11'],
    prepares: ['d4_035', 'd4_106', 'd4_048'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Logs and databases',
        title: 'Logs and databases',
        subtitle: 'Logs record what happened, and databases hold what matters. Both need protecting from the people who run them.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Operational logs record events in applications, operating systems, databases and network devices. Useful logs cover every layer, are kept as long as law and risk require, are reviewed by a named owner, and are protected from change.',
      },
      {
        type: 'analogy',
        heading: 'An aircraft flight recorder',
        body: 'A flight recorder captures what happened, survives the crash, and cannot be edited by the crew. If the crew could switch it off or rewrite it, it would prove nothing. Logs of powerful administrators work the same way: their value depends on those administrators being unable to change them.',
      },
      {
        type: 'stack',
        heading: 'What good log management needs',
        layers: [
          {
            label: 'Coverage',
            note: 'Application, operating system, database and network logs, with clocks in sync so events line up across systems',
          },
          { label: 'Retention', note: 'Set for each log type from legal, regulatory and business needs' },
          {
            label: 'Integrity',
            note: 'Write-once storage (cannot be edited) or tamper-evident fingerprints (hashes), out of reach of the people being logged',
          },
          { label: 'Review', note: 'Named owners, frequency set by risk, alerts when a source goes quiet' },
        ],
        caption: 'Collecting logs detects nothing until someone reviews them.',
      },
      {
        type: 'idea',
        heading: 'Databases',
        body: 'Database administrators often need broad rights to do their work. When management accepts that, compensate: log their activity where they cannot alter it, and have someone independent review it. Changes to the data dictionary (the definitions of every table and field) go through change control, because one bad change can corrupt data everywhere.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Evidence quality and compensating controls. As the auditor, you ask whether the logs would stand up as evidence: complete, kept long enough and untouched. When a powerful role cannot be restricted, look for a control that watches it independently. You recommend the control; management owns the decision to grant the rights.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Keep every log forever, just to be safe.”',
        why: 'Unlimited retention raises cost and privacy risk, and makes review harder. Retention is set for each log type from legal, regulatory and business needs. One period for everything, long or short, is the warning sign.',
      },
      {
        type: 'tip',
        body: 'Judge a log the way a court would: is it complete, kept long enough, untouched and actually examined? How long to keep it is for whoever answers for the data, never whoever pays for the disk. Powerful roles that cannot be restricted are watched from outside their reach.',
      },
      {
        type: 'check',
        question:
          'Firewall logs (records from the network’s gatekeepers) for a payments platform are kept for a year in write-once storage. Which finding should concern the IS auditor MOST?',
        options: [
          'The logs take more storage than this year’s budget allowed',
          'No named person reviews the firewall logs or their alerts',
          'Log times are recorded in one time zone, not local time',
          'The IT manager, not the business, set the retention period',
        ],
        correctIndex: 1,
        explanation:
          'Collecting and protecting logs detects nothing until someone reviews them, so an unowned log is evidence nobody uses. The storage overrun is tempting because it is a real cost, but it does not let an attack go unseen. Who set the retention period matters, yet a year of protected logs still helps no one if nobody reads them. One shared time zone is good practice, not a weakness.',
      },
      {
        type: 'check',
        question:
          'Who is MOST appropriate to decide how long a hospital keeps the access logs for its patient-records system?',
        options: [
          'The compliance officer, applying the regulator’s minimum period',
          'The IS auditor, as an independent party with log expertise',
          'The records owner, with legal and compliance input',
          'The CISO, who runs the logging and monitoring program',
        ],
        correctIndex: 2,
        explanation:
          'Retention is a business and legal decision: the owner of the records, advised by legal and compliance, sets it for each log type. The compliance officer is tempting because the regulator sets a floor, but a minimum is one input, and the owner may need the logs for longer. The CISO runs the logging, not the records. The auditor checks the decision and does not make it.',
      },
      {
        type: 'check',
        question:
          'Database administrators’ activity is logged to a server they also run, and their manager reviews the logs monthly. What is the GREATEST weakness?',
        options: [
          'Monthly review may be too slow to catch mistakes before they spread',
          'The administrators could edit logs of their own actions',
          'The manager may not understand every database command logged',
          'Logging may slow the database down at busy times of day',
        ],
        correctIndex: 1,
        explanation:
          'Logs the administrators can change cannot prove what they did, so the compensating control fails at its root. Review frequency is tempting as the weakness, but reviewing faster does not help if the records may already be altered. Logs belong where the people being logged cannot reach.',
      },
    ],
  },
  // Outline topics: 4B3 backup
  {
    id: 'cisa-l-d4-backup',
    certId: 'cisa',
    domainId: '4',
    order: 9,
    title: 'Backups you can trust',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-34 Rev. 1 (Contingency Planning Guide for Federal Information Systems)',
      'NIST SP 800-53 Rev. 5, control CP-9 (System backup)',
      'ISO/IEC 27002:2022 control 8.13 (Information backup)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['4B3'],
    prepares: ['d4_061', 'd4_063', 'd4_065'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Backup and restoration',
        title: 'Backups you can trust',
        subtitle: 'A backup is only as good as the last time you restored from it.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A backup is a copy of data kept for restoring after loss, corruption or attack. Good backups run often enough to meet the RPO (the data loss the business accepts), sit away from the original, are tracked, and are proven by test restores.',
      },
      {
        type: 'analogy',
        heading: 'A spare house key',
        body: 'You keep a spare key in case you lose yours. If it hangs on a hook by the same front door, one fire takes both. If you have never tried it, it may not even fit the lock. A good spare is kept somewhere else, and you have tested it.',
      },
      {
        type: 'stack',
        heading: 'Three ways to back up',
        layers: [
          { label: 'Full', note: 'Copies everything. Slowest to make, simplest to restore' },
          {
            label: 'Incremental',
            note: 'Copies changes since the last backup of any kind. Fastest to make; a restore needs the full plus every incremental since',
          },
          {
            label: 'Differential',
            note: 'Copies all changes since the last full. Grows each day; a restore needs the full plus only the latest differential',
          },
        ],
        caption: 'Choose by how fast you must restore, not only by how fast you can back up.',
      },
      {
        type: 'idea',
        heading: 'Where the copies live',
        body: 'The 3-2-1 rule: three copies of the data, on two different kinds of storage (such as disk and tape), with one copy offsite, far enough away that one fire or flood cannot reach both. Copies kept nearby give fast restores. A catalog records every copy and where it is.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Evidence quality: test, don’t assume. As the auditor, you know a backup job that reports success proves a copy was written, not that it can be read back. You look for proof that copies work when needed, and that the offsite stock matches the records. You recommend; operations owns the fix.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Every backup job completed successfully, so recovery is assured.”',
        why: 'Completion shows data was written, not that it is readable, complete or recoverable in time. Corruption can sit unnoticed for weeks. Proof comes only from reading the data back and checking what you get.',
      },
      {
        type: 'tip',
        body: 'For restore questions, trace which changes each set holds and count back to the last full. Offsite means beyond the reach of the same disaster, not just another building. A copy proves nothing until it has been read back.',
      },
      {
        type: 'check',
        question:
          'A firm takes a full backup each Sunday night and an incremental backup on each other night. Its database fails on Thursday morning. Which sets give the MOST complete restore?',
        options: [
          'Sunday’s full backup, which holds the whole database',
          'The Monday, Tuesday and Wednesday incrementals, applied in order',
          'Sunday’s full plus the Monday, Tuesday and Wednesday incrementals',
          'Sunday’s full backup plus the latest incremental, from Wednesday night',
        ],
        correctIndex: 2,
        explanation:
          'Each incremental holds just the changes since the backup before it, so every one since Sunday is needed, in order, on top of the full backup. Using Wednesday’s alone is tempting, but that is how a differential works; here Monday’s and Tuesday’s changes would be lost.',
      },
      {
        type: 'check',
        question:
          'A firm keeps its only backups in a vault 250 miles away; recalling a tape takes a day. The order system must be restored within four hours. What should concern the IS auditor MOST?',
        options: [
          'No nearby copy exists to meet the four-hour restore target',
          'Tapes may be damaged on the long road trip to the vault',
          'The four-hour target was set without the vault provider’s sign-off',
          'A regional disaster could still reach a vault 250 miles away',
        ],
        correctIndex: 0,
        explanation:
          'Copies live in more than one place for a reason: the distant one survives a site disaster, and a nearby one meets fast restore targets. With a day to recall a tape, four hours is impossible. Damage in transit is tempting because it is a real risk, but handling controls address it; here the design itself breaks the target.',
      },
      {
        type: 'check',
        question:
          'Which evidence BEST shows that backup tapes held in the offsite vault could actually be used after a disaster?',
        options: [
          'A count showing the catalogued tapes are present in the vault',
          'Backup job logs showing the jobs completed successfully',
          'The vault provider’s physical security certificate, renewed this year',
          'A successful test restore from a tape recalled from the vault',
        ],
        correctIndex: 3,
        explanation:
          'Only a restore proves a tape is readable, complete and usable. Counting the tapes against the catalog is tempting, and it is a real control, but it proves the tapes are there, not that they work. Job logs show data was written, not that it can be read back.',
      },
    ],
  },
  // Outline topics: 4B4 business continuity plan
  {
    id: 'cisa-l-d4-bcp',
    certId: 'cisa',
    domainId: '4',
    order: 10,
    title: 'The continuity plan',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO 22301:2019 (Business continuity management systems)',
      'ISO 22313:2020 (Guidance on the use of ISO 22301)',
      'NIST SP 800-34 Rev. 1 (Contingency Planning Guide for Federal Information Systems)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['4B4'],
    prepares: ['d4_071', 'd4_072', 'd4_073'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Business continuity',
        title: 'The continuity plan',
        subtitle: 'How a business keeps working through a disruption, and who gets to say “this is a disaster”.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A business continuity plan explains how critical business processes keep running, or restart, during and after a disruption. It covers people, premises, suppliers and technology. Disaster recovery is the IT part: restoring the systems those processes need.',
      },
      {
        type: 'analogy',
        heading: 'A ship’s emergency plan',
        body: 'A ship has the captain’s rules for emergencies, a list of which compartments matter most, lifeboats sized for everyone aboard, and drills before trouble comes. Everyone knows who gives the order to abandon ship, and who gives it if the captain is hurt. People come first, then the cargo.',
      },
      {
        // Expert review fix (2026-10): training comes before testing.
        type: 'flow',
        heading: 'The continuity life cycle',
        steps: [
          { label: 'Policy', note: 'Management’s mandate: scope, objectives and who is accountable' },
          { label: 'Business impact analysis', note: 'Which processes matter most, and how fast they must return' },
          { label: 'Strategy', note: 'Recovery options chosen to meet those targets at sensible cost' },
          { label: 'Plan', note: 'Roles, decision authority, contacts and procedures' },
          { label: 'Train, test and maintain', note: 'Train people on their roles, then test, starting with simple checks; fix gaps and update after major changes' },
        ],
        caption: 'Each step feeds the next. Skipping ahead builds plans on guesses.',
      },
      {
        type: 'idea',
        heading: 'Who decides',
        body: 'A plan should name who can declare a disaster, the criteria for doing so, and named alternates if that person cannot be reached. Each decision role needs clear limits, not just a list of senior titles. The safety of people always comes before systems and data.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Right level of authority. Continuity is a business duty, so its mandate comes from the top, not from IT, and the plan assigns crisis decisions in advance so nobody waits for permission. As the auditor, you check that the steps ran in order, authority is clear, and each test changes the plan where it should. You recommend; management decides.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Put the detailed recovery steps in the policy, so everything is in one place.”',
        why: 'A policy is a governance document: it gives the mandate, scope and accountability. Procedures change often and belong in the plans beneath it. A policy full of technical steps but with no named accountability is the weaker document.',
      },
      {
        type: 'tip',
        body: 'Follow the life cycle: priorities before strategy, and lessons from each test fed back into the plan. Settle authority before the crisis, with rules for when to use it. A policy gives the mandate; the steps live in plans beneath it. People’s safety comes before systems.',
      },
      {
        type: 'check',
        question:
          'A continuity tabletop exercise found the emergency contact list out of date. A year later, the next exercise finds the same problem. What should concern the IS auditor MOST?',
        options: [
          'Exercise findings have no owner or deadline for fixing them',
          'The exercises are walkthroughs rather than full interruption tests',
          'Staff contact details change too often to keep the list current',
          'Senior management did not sign off the first exercise report',
        ],
        correctIndex: 0,
        explanation:
          'A test is only useful if what it finds gets fixed, so a repeat finding points to no owner and no follow-up. Moving to a full interruption test is tempting because it is more realistic, but a bigger test would find the same stale list. Signing off the report would accept the finding without assigning anyone to fix it. Frequent changes are the reason the list needs an owner, not an excuse.',
      },
      {
        type: 'check',
        question: 'Who is MOST appropriate to approve a company-wide business continuity policy?',
        options: [
          'The IT disaster recovery manager, who writes the recovery steps',
          'The IS auditor, who reviewed the policy for completeness',
          'The department heads, who own the critical processes',
          'Senior management, which sets direction for the company',
        ],
        correctIndex: 3,
        explanation:
          'A continuity policy is a governance document, so senior management, which answers for the whole company, approves it. The recovery manager is tempting because they know the detail, but procedures sit below the policy; the mandate must come from the top. Department heads own their processes, not the company-wide mandate. The auditor reviews the policy and does not approve it.',
      },
      {
        type: 'check',
        question:
          'A continuity plan names five alternates who may declare a disaster, but sets no criteria for declaring one. What is the GREATEST risk?',
        options: [
          'Too many people will need yearly training on the plan',
          'Alternates may declare too late, too early or inconsistently',
          'The lead executive may feel her own authority has been reduced',
          'The plan may need rewriting whenever an alternate leaves',
        ],
        correctIndex: 1,
        explanation:
          'Named alternates remove the single point of failure, but without criteria each may judge differently, so a disaster is declared late, needlessly or inconsistently. Training load is tempting as a concern, but it is a cost of having alternates, not a gap in how decisions are made.',
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
        body: 'Exam questions open with a short scenario, called the stem. If the stem shows one bad account, ask which process let it happen. If it asks who approves or reviews access, look for the data or business owner. For administrator rights, prefer time-limited over permanent.',
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
          'Log each access request in the service desk tool',
          'Train service desk staff on privacy regulations',
          'Require each manager’s request to be in writing',
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
          'Independent review of posted entries by a manager',
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
    // UPGRADE: keeps its original id and order (learner progress is keyed on it).
    id: 'cisa-l-d5-mfa',
    certId: 'cisa',
    domainId: '5',
    order: 2,
    title: 'Authentication that holds',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-63B-4 (Digital Identity Guidelines: Authentication and Authenticator Management)',
      'NIST SP 800-53 Rev. 5 IA-2 (Identification and Authentication, Organizational Users)',
      'NIST SP 800-53 Rev. 5 AC-2(9) (Restrictions on Use of Shared and Group Accounts)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['5A3'],
    prepares: ['d5_024', 'd5_036', 'd5_282'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Identity and access',
        title: 'Authentication that holds',
        subtitle: 'Two passwords are not two factors, and not every second factor stops a fake login page.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Authentication proves a user is who they claim to be. Multi-factor authentication (MFA) asks for proof of at least two different types, so stealing one proof is not enough. It only gives accountability when each person signs in with their own account.',
      },
      {
        type: 'stack',
        heading: 'The three factor types',
        layers: [
          { label: 'Something you know', note: 'Password, PIN, answer to a security question' },
          { label: 'Something you have', note: 'Hardware security key, smart card, registered phone' },
          { label: 'Something you are', note: 'Fingerprint, face or other biometric' },
        ],
        caption: 'Multi-factor means at least two different types. Two of the same type is still one factor.',
      },
      {
        type: 'analogy',
        heading: 'A cash machine',
        body: 'A cash machine asks for your bank card (something you have) and your PIN (something you know). A thief with only the card is stuck, and so is someone who only watched you type the PIN. Asking for two PINs would just test your memory twice.',
      },
      {
        type: 'idea',
        heading: 'Not all second factors are equal',
        body: 'A hardware security key (a small device you plug in or tap) is tied to the genuine site’s address, so a fake page gets nothing it can reuse. Text or app codes can be typed into a fake page and passed on to the real site. A tricked user can also tap “approve” on a phone pop-up.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Match strength to risk. As the IS (information systems) auditor, you expect the strongest factors where misuse would hurt most: administrators, remote access and payments. You also check accountability: on a shared account, even with MFA, nobody can say who acted. You recommend; management chooses the design.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Users enter a password, then answer a security question.”',
        why: 'Both are things you know, so this is two steps but only one factor. Anyone who tricks a user into revealing one can usually get the other the same way. Count factor types, not steps.',
      },
      {
        type: 'tip',
        body: 'If a question asks for true MFA, count factor types, not steps. If users are targets of fake login pages, ask which factor a fake page cannot reuse. If several people share one account, the concern is accountability, even with MFA switched on.',
      },
      {
        type: 'check',
        question:
          'Warehouse staff sign in to a payroll portal from shared kiosks. Which sign-in design should the IS auditor accept as genuinely multi-factor?',
        options: [
          'A password plus the employee’s date of birth',
          'A PIN plus a staff smart card in a card reader',
          'A fingerprint scan followed by a face scan',
          'A long, strong password sent over an encrypted link',
        ],
        correctIndex: 1,
        explanation:
          'A PIN (something you know) plus a smart card (something you have) are two different factor types. The date of birth is tempting because it feels personal, but it is just another fact someone could know or look up. A fingerprint then a face are two steps of one type.',
      },
      {
        type: 'check',
        question:
          'Attackers keep sending finance staff fake sign-in pages that pass typed codes to the real site within seconds. Which control BEST protects these staff?',
        options: [
          'Security keys that refuse to respond to look-alike sites',
          'Authenticator app codes that change every thirty seconds',
          'Blocking sign-ins from outside the home country',
          'Phishing awareness training, approved by the CISO, for finance staff',
        ],
        correctIndex: 0,
        explanation:
          'A security key will not answer a page at the wrong address, so a fake page gets nothing to relay. App codes are tempting because they change quickly, but a code typed into a fake page can still be passed on within seconds. Training helps, but convincing fake pages still fool trained staff.',
      },
      {
        type: 'check',
        question:
          'Three database administrators share one powerful account protected by MFA. A key table was deleted overnight. Which weakness should concern the IS auditor MOST?',
        options: [
          'One of them could lose the shared MFA token',
          'The data owner has not reapproved the account’s access this year',
          'The table may not have been backed up recently',
          'The deletion cannot be tied to a single person',
        ],
        correctIndex: 3,
        explanation:
          'Logs show the account, not the person, so nobody can be held to account for the deletion. A lost token is tempting because MFA is the visible control, but MFA proves a token holder signed in, not which of the three. A missed access review is a gap, but a reapproved shared account still names no one. A recent backup would restore the table but name no one either.',
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
          'Check last night’s backup jobs logged success before restoring',
        ],
        correctIndex: 0,
        explanation:
          'Restoring infected backups, or restoring while the way in is still open, brings the attack straight back. Restoring the most critical server first is right once it is safe, but speed does not make it safe, and a backup job that logged success can still hold infected files. Keep copies of the affected servers as evidence before rebuilding.',
      },
    ],
  },
  {
    id: 'cisa-l-d5-foundations',
    certId: 'cisa',
    domainId: '5',
    order: 4,
    title: 'Policy, people and premises',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 27001:2022 clause 5.2 (Policy)',
      'ISO/IEC 27002:2022 controls 5.1 (Policies for information security), 6.3 (Information security awareness, education and training) and 7.5 (Protecting against physical and environmental threats)',
      'NIST Cybersecurity Framework (CSF) 2.0, Govern function',
      'NIST SP 800-50 Rev. 1 (Building a Cybersecurity and Privacy Learning Program)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['5A1', '5B1', '5A2'],
    prepares: ['d5_001', 'd5_104', 'd5_003'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Security foundations',
        title: 'Policy, people and premises',
        subtitle: 'Before any firewall: rules that leaders back, people who speak up, and rooms that stay safe.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'An information security policy is management’s statement of what must be protected and who is responsible. Awareness training turns it into daily habits. Physical and environmental controls protect the rooms and equipment the data lives in.',
      },
      {
        type: 'analogy',
        heading: 'Fire safety in an office block',
        body: 'The fire rules are set by someone with authority and name who does what. Drills only work if people raise the alarm early without fear of blame. And a fire alarm that rings in an empty building at night protects nothing unless the signal reaches someone who can respond.',
      },
      {
        type: 'stack',
        heading: 'From intent to detail',
        layers: [
          { label: 'Policy', note: 'Why and who. Approved by senior management or the board; names no products' },
          { label: 'Standard', note: 'Mandatory rules, such as minimum password length' },
          { label: 'Procedure', note: 'Step-by-step instructions to meet the standard' },
          { label: 'Guideline', note: 'Helpful advice, not mandatory' },
        ],
        caption:
          'Review the policy on a cycle and whenever a law, threat or business change affects it. Pick a published framework (a ready-made set of controls), such as ISO/IEC 27001 or the NIST Cybersecurity Framework (CSF) 2.0, by legal, contract and business need.',
      },
      {
        type: 'idea',
        heading: 'People and premises',
        body: 'Awareness works when behavior changes: staff flag odd messages quickly and without fear. Physical controls limit who can enter and record it, such as personal badges or a two-door entry that admits one person at a time. Environmental controls watch heat, humidity, water, fire and power, and must alert someone who can act.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Governance first, and a control counts only if it works in practice. As the IS (information systems) auditor, you check who stands behind the policy and who owns each control, then look for proof it works: changed habits, not slogans; alarms that get answered. You report the gaps and recommend; management fixes them.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Discipline anyone who clicks a test phishing email, and clicks will fall.”',
        why: 'Clicks may fall, but fear also teaches people to hide mistakes, and quick warnings from staff are what catch real attacks. Awareness is judged by behavior, not by fear. A falling click rate on its own can hide a worse culture.',
      },
      {
        type: 'tip',
        body: 'If a question asks what concerns you most about a policy, ask who stands behind it and who must act on it before worrying about detail. For awareness, prefer measures of behavior. For alarms, ask who would hear one at 3 a.m.',
      },
      {
        type: 'check',
        question:
          'An IS auditor finds the information security policy was written and signed off by the IT security team alone. It lists detailed firewall settings. Which concern is MOST significant?',
        options: [
          'It lacks senior management approval, so it lacks authority',
          'Its firewall settings will date quickly and need frequent edits',
          'The IS audit team did not review it before it was issued',
          'It has not yet been communicated to staff',
        ],
        correctIndex: 0,
        explanation:
          'Without senior management or board approval, business units can treat the policy as IT’s opinion. The dated firewall settings are tempting because they are a real flaw, but settings belong in a standard and are easy to move. Auditors assess a policy; they do not clear it before issue. Telling staff comes later: sharing an unauthorized policy only spreads IT’s opinion further.',
      },
      {
        type: 'check',
        question:
          'Phishing test click rates halved after managers began naming repeat clickers at team meetings. Test difficulty did not change. What should the IS auditor examine FIRST?',
        options: [
          'Whether the named staff now click fewer test emails',
          'Whether staff now flag real phishing less often',
          'Whether every manager names clickers the same way',
          'Whether the test vendor counts clicks accurately',
        ],
        correctIndex: 1,
        explanation:
          'Public shaming can teach staff to hide mistakes, and fewer warnings mean real attacks are caught later. Checking the named staff is tempting because they were the target, but fewer clicks is exactly what shaming would produce; the open question is what it did to reporting.',
      },
      {
        type: 'check',
        question:
          'A branch server room’s high-temperature alarm sounds only inside the room, which is unstaffed at night and on weekends. What should the IS auditor recommend as BEST?',
        options: [
          'Install a second cooling unit for redundancy',
          'Lower the alarm threshold so it sounds earlier',
          'Have staff log the room temperature each morning',
          'Send the alarm to a desk staffed at all hours',
        ],
        correctIndex: 3,
        explanation:
          'An alarm only protects if someone who can act receives it. A second cooling unit is tempting and adds resilience, but if both fail at night, nobody knows until the hardware is damaged. A morning check finds the problem hours too late.',
      },
    ],
  },

  {
    id: 'cisa-l-d5-network-mobile',
    certId: 'cisa',
    domainId: '5',
    order: 5,
    title: 'Networks, endpoints and mobile devices',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-41 Rev. 1 (Guidelines on Firewalls and Firewall Policy)',
      'NIST SP 800-153 (Guidelines for Securing Wireless Local Area Networks)',
      'NIST SP 800-124 Rev. 2 (Guidelines for Managing the Security of Mobile Devices in the Enterprise)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['5A4', '5A9'],
    prepares: ['d5_041', 'd5_044', 'd5_084'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Network and device security',
        title: 'Networks, endpoints and mobile devices',
        subtitle: 'No single wall stops everything. How do zones, layers and device rules work together?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Network security splits systems into zones by how much they are trusted and filters traffic between them. Endpoint security watches each laptop and server. Phones travel, wireless signals reach past the walls, and Internet of Things (IoT) devices, such as cameras and sensors, often cannot run security software, so each needs its own rules.',
      },
      {
        type: 'analogy',
        heading: 'An airport',
        body: 'Anyone can walk into the public hall, but reaching the planes means passing a security check. Staff doors open only with a personal badge, so a lost badge is cancelled on its own. Nobody gives every worker the same master key and hopes it stays secret.',
      },
      {
        type: 'stack',
        heading: 'Layers of defense',
        layers: [
          {
            label: 'Zones',
            note: 'Internet-facing servers sit in a screened subnet (a DMZ, or buffer zone), with filtered paths inward',
          },
          {
            label: 'Web applications',
            note: 'A web application firewall (WAF) blocks attacks on web code, such as commands sneaked into input fields',
          },
          { label: 'Wireless', note: 'Enterprise mode, the business Wi-Fi setting: each person signs in with their own login' },
          {
            label: 'Mobile and IoT',
            note: 'Mobile device management (MDM) enforces phone settings; IoT devices are kept apart from other systems',
          },
        ],
        caption: 'Each layer covers gaps the others leave. This is called defense in depth.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Fix the cause, and cover the risk until the fix lands. As the IS (information systems) auditor, when a flaw takes weeks to fix, you expect a compensating control (one that covers the same risk another way) in the meantime. Contain devices that cannot be hardened, and tie access to individuals. You recommend; management decides.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Hide the wireless network name and allow only listed device addresses.”',
        why: 'Both are easy to get around: anyone nearby can still see a hidden name, and each device’s built-in network ID can be copied. Neither identifies a person. Individual logins let you remove one leaver without changing a password everyone knows.',
      },
      {
        type: 'tip',
        body: 'If a question says a fix will take weeks, look for an interim control at the same layer as the flaw. If personal phones hold company data, look for a control that protects company data without touching anything personal.',
      },
      {
        type: 'check',
        question:
          'Smart thermostats that cannot run security software share a network segment with finance laptops. Which recommendation BEST reduces the risk to finance systems?',
        options: [
          'Change the thermostats’ default administrator passwords',
          'Isolate the thermostats on their own filtered network',
          'Ask the vendor to add antivirus to the thermostats',
          'Scan the finance laptops for malware more often',
        ],
        correctIndex: 1,
        explanation:
          'A separate, filtered network stops a hijacked thermostat from reaching finance systems at all. Changing default passwords is tempting and should also happen, but the devices stay weak and exposed on the same network as sensitive data.',
      },
      {
        type: 'check',
        question:
          'A file server’s sharing service has a critical flaw. The vendor patch is six weeks away, and only finance laptops use the share. What should the IS auditor recommend as the BEST interim control?',
        options: [
          'A firewall rule letting only finance laptops reach the share',
          'A web application firewall placed in front of the file server',
          'An intrusion detection alert for any attempt on the flaw',
          'An alert whenever a non-finance laptop tries to reach the share',
        ],
        correctIndex: 0,
        explanation:
          'The flaw sits in the sharing service, so a rule that lets only finance laptops reach it shrinks the exposure until the patch lands. A web application firewall is tempting because it suits web flaws, but this is not web traffic. An alert only reports an attack after it runs.',
      },
      {
        type: 'check',
        question:
          'Staff want to read company email on their personal phones, which also hold their family photos. Which control BEST protects company data if a phone is lost?',
        options: [
          'A rule that staff set a six-digit phone passcode',
          'A signed staff agreement to protect company data on phones',
          'A separate, managed work area that IT can erase remotely',
          'A rule that staff report any lost phone within one hour',
        ],
        correctIndex: 2,
        explanation:
          'A managed work area keeps company data apart, so IT can erase it without touching personal photos. A passcode is tempting and worth having, but a short code can be guessed or watched, and it gives no way to remove the data. A signed agreement sets expectations but cannot remove data from a lost phone. Quick reporting helps only if there is something IT can then erase.',
      },
    ],
  },

  {
    id: 'cisa-l-d5-data-protection',
    certId: 'cisa',
    domainId: '5',
    order: 6,
    title: 'Find it, label it, protect it',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 27002:2022 controls 8.12 (Data leakage prevention) and 8.24 (Use of cryptography)',
      'NIST SP 800-57 Part 1 Rev. 5 (Recommendation for Key Management: Part 1 – General)',
      'NIST SP 800-63B-4 (Digital Identity Guidelines: Authentication and Authenticator Management)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['5A5', '5A6'],
    prepares: ['d5_052', 'd5_061', 'd5_062'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Data loss prevention and encryption',
        title: 'Find it, label it, protect it',
        subtitle: 'Leak-blocking tools and encryption only protect data you have found, labeled and keyed properly.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Data loss prevention (DLP) tools watch email, web uploads, removable drives and cloud shares for sensitive data leaving. They work reliably only on data that has been found and classified first. Encryption scrambles data so only key holders can read it, and its strength depends on how the keys are managed.',
      },
      {
        type: 'analogy',
        heading: 'A museum exit guard',
        body: 'A guard at the museum exit can only stop a valuable painting leaving if the catalog says which paintings are valuable. With no catalog, the guard either stops every visitor with a bag or waves everyone through. DLP without classification has the same choice.',
      },
      {
        type: 'flow',
        heading: 'Switching DLP on safely',
        steps: [
          { label: 'Discover', note: 'Find where sensitive data actually sits' },
          { label: 'Classify', note: 'Data owners label it by the harm a leak would cause' },
          { label: 'Monitor', note: 'Rules only watch for now; count how often they flag normal work' },
          { label: 'Tune', note: 'Adjust noisy rules and allow approved business flows' },
          { label: 'Block', note: 'Enforce once rules are accurate' },
        ],
      },
      {
        type: 'compare',
        heading: 'Encryption vs hashing',
        left: {
          title: 'Encryption',
          points: [
            'Two-way: the right key turns it back',
            'Symmetric (one shared key): fast, so it suits bulk data',
            'Asymmetric (a public and private key pair): lets strangers share keys safely, but its heavy math makes it slow',
          ],
        },
        right: {
          title: 'Hashing',
          points: [
            'One-way fingerprint: cannot be turned back, but shows if data changed',
            'For passwords, add a salt: random data unique to each password',
            'Then use a deliberately slow hash: one sign-in barely notices, but every guess by a thief holding the file costs time',
          ],
        },
        caption:
          'Real systems use both encryption types: public keys safely deliver or agree a one-time shared key (a session key), and that fast key encrypts the bulk data.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Know your data before you buy the tool. As the IS (information systems) auditor, you check that data owners, not IT, classified the data, that leak rules were proven accurate before enforcement, and that encryption keys are kept apart from the data and changed on a schedule. Strong encryption with the key stored beside the data protects very little.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“We encrypt stored passwords with a strong key, so they are as safe as hashing.”',
        why: 'Anything encrypted can be turned back by whoever gets the key, including an attacker. Passwords only ever need checking, never reading, so they belong in a one-way form. A user who forgets gets a reset, not a recovery.',
      },
      {
        type: 'tip',
        body: 'When a question says “first” before a tool goes live, look for the step that makes the tool accurate. For stored passwords, ask who could ever read them back, and what a stolen copy would cost to crack. For large data, ask which job each key type does well.',
      },
      {
        type: 'check',
        question:
          'Data owners have classified a retailer’s sensitive data. DLP rules are set to start blocking next week, but nobody has checked how often they flag normal work. What should happen FIRST?',
        options: [
          'Run the rules without blocking and correct the false alarms',
          'Train staff on the new rules before the blocking starts next week',
          'Start blocking on email now and other channels later',
          'Replace the rules with the vendor’s tested default set',
        ],
        correctIndex: 0,
        explanation:
          'Untuned rules can block legitimate work, and staff then look for ways around the tool. Training staff is tempting and useful, but it cannot fix rules that flag normal work. Starting with email only shrinks the disruption, because the rules are still untested. Vendor defaults are tested elsewhere, not on this retailer’s normal work.',
      },
      {
        type: 'check',
        question:
          'A developer wants to store user passwords with a very fast hash so sign-ins feel instant. Which approach should the IS auditor consider BEST?',
        options: [
          'Keep the fast hash but lock each account after five failures',
          'Keep the fast hash if the CISO signs a risk acceptance',
          'Salt each password and use a hash that is costly to compute',
          'Keep the fast hash and store it on an isolated server',
        ],
        correctIndex: 2,
        explanation:
          'A costly, salted hash makes each guess expensive for an attacker, while one sign-in barely notices. Account lockout is tempting, but it only stops guessing on the live sign-in page. Attackers who steal the password file guess offline, where no lockout applies. A signed risk acceptance does not make a weak design that is easy to fix any safer.',
      },
      {
        type: 'check',
        question:
          'A firm encrypts its large nightly backups directly with public-key encryption, and the jobs now overrun their time slot. What should the IS auditor recommend as BEST?',
        options: [
          'Use a longer public key so the backups stay even safer',
          'Use a symmetric key for the data, guarded by the public key',
          'Hash the backups instead, since hashing runs much faster',
          'Ask the change board to approve a longer nightly backup window',
        ],
        correctIndex: 1,
        explanation:
          'Symmetric encryption is built for bulk data, and the public key only needs to protect the small symmetric key. A longer public key is tempting because it sounds stronger, but it makes the slow step slower. Hashing is fast but one-way, so the backups could never be restored. An approved longer window treats the symptom and keeps the wrong design.',
      },
    ],
  },

  {
    id: 'cisa-l-d5-pki',
    certId: 'cisa',
    domainId: '5',
    order: 7,
    title: 'Certificates and trust',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'IETF RFC 5280 (Internet X.509 Public Key Infrastructure Certificate and CRL Profile)',
      'IETF RFC 6960 (Online Certificate Status Protocol)',
      'NIST SP 800-57 Part 1 Rev. 5 (Recommendation for Key Management: Part 1 – General)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['5A7'],
    prepares: ['d5_064', 'd5_067', 'd5_070'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Public key infrastructure',
        title: 'Certificates and trust',
        subtitle: 'A certificate is only as trustworthy as the checks behind it and the care taken with its private key.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Public key infrastructure (PKI) issues and manages digital certificates. A certificate binds a public key to a checked identity, signed by a certificate authority (CA). Anyone who trusts the CA can trust that link. The matching private key must stay secret, or anyone holding it can pose as the owner.',
      },
      {
        type: 'analogy',
        heading: 'A passport',
        body: 'The passport office checks who you are before issuing one, and border staff trust it because they trust the office. If it is stolen, you report it and it goes on a cancelled list. That only helps if border staff check the list, and if you renew before it expires.',
      },
      {
        // Expert review fix (2026-10): Request added first; revocation can happen at any point, so it moved to the caption.
        type: 'flow',
        heading: 'A certificate’s life',
        steps: [
          { label: 'Request', note: 'The holder generates a key pair and submits a certificate request' },
          { label: 'Verify', note: 'A registration authority checks the requester’s identity' },
          { label: 'Issue', note: 'The CA signs the certificate' },
          { label: 'Use', note: 'Systems check the signature, expiry date and revocation status every time' },
          { label: 'Renew', note: 'Before expiry; you can only renew certificates you know about' },
        ],
        caption: 'Revocation withdraws trust early, at any point, if the key is lost or stolen or the holder leaves. It is published in a certificate revocation list (CRL) or by an online status service (OCSP, Online Certificate Status Protocol), and relying systems must check it. The root CA is the top authority every certificate traces back to. It is usually kept offline, with its key in a hardware security module, a tamper-resistant device for keys.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Preventive beats detective. As the IS (information systems) auditor, you look for controls that stop a failure before it happens: identity checks before issuing, revocation checks on every use, warnings well before expiry, and tight control of who can use a private key. Finding out after an outage, or after malware ships under your company’s name, is too late.',
      },
      {
        type: 'trap',
        heading: 'The revocation trap',
        trap: '“The certificate was revoked the day the laptop was stolen, so the risk is closed.”',
        why: 'Revoking only publishes the news. If applications never ask whether a certificate was revoked, or wave it through whenever the list or status service is unreachable (called failing open), the stolen laptop still gets in. Publish, then check on every use.',
      },
      {
        type: 'trap',
        heading: 'The signing trap',
        trap: '“Our software is digitally signed, so customers can trust it.”',
        why: 'Software makers sign updates so customers know they are genuine. A signature proves only that someone holding the private key signed the file. If every developer can reach that key, anyone could sign malware. Custody of the private key is the control that matters.',
      },
      {
        type: 'tip',
        body: 'For certificate questions, follow the trust: who checked the identity, who holds the private key, and what happens on the day a certificate stops being valid? An answer that waits for an outage or someone else’s reminder is detective at best.',
      },
      {
        type: 'check',
        question:
          'Partner connections failed for a day when a certificate nobody knew about expired. Each team buys and tracks its own certificates. Which control would BEST prevent a repeat?',
        options: [
          'Monitoring partner connections for failed sign-ins',
          'A CISO-approved policy requiring teams to renew on time',
          'Moving the certificates to one public certificate authority',
          'One register of all certificates, owners and renewal dates',
        ],
        correctIndex: 3,
        explanation:
          'You cannot renew a certificate you do not know exists, so one register with owners and dates prevents the surprise. Monitoring connections is tempting, but it only tells you after partners are already cut off. A policy to renew on time fails for a certificate nobody knows about. A single provider still does not tell anyone what exists or when it expires.',
      },
      {
        type: 'check',
        question:
          'A contractor’s smart card certificate was revoked when the contract ended. Two weeks later, while the revocation status service was down, the card still opened the remote access gateway. What is the MOST likely cause?',
        options: [
          'The gateway lets cards in when status cannot be checked',
          'The certificate’s expiry date was set too far in the future',
          'The contractor copied the smart card before leaving',
          'The CA’s root signing key has been stolen by attackers',
        ],
        correctIndex: 0,
        explanation:
          'The certificate was revoked on time, so the gap is on the checking side: with the status service down, the gateway let the card through instead of refusing it. A distant expiry date is tempting, but a revoked certificate should be refused whatever its expiry. Even a copied card would carry the same revoked certificate.',
      },
      {
        type: 'check',
        question:
          'A developer who could copy the code-signing private key has left on bad terms. What should the IS auditor recommend as BEST to protect customers?',
        options: [
          'Change the build server’s administrator passwords today',
          'Revoke the certificate and sign with a new, guarded key',
          'Scan past releases for signs of hidden malware',
          'Publish each release’s hash value on the download page',
        ],
        correctIndex: 1,
        explanation:
          'A copied key can sign malware that customers will trust until the certificate is revoked; a new key in guarded hardware stops a repeat. Changing passwords is tempting, but the key has already left, and a copy works anywhere. Scanning past releases looks backward and misses what the key signs next.',
      },
    ],
  },

  {
    id: 'cisa-l-d5-cloud',
    certId: 'cisa',
    domainId: '5',
    order: 8,
    title: 'Shared responsibility in the cloud',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-145 (The NIST Definition of Cloud Computing)',
      'NIST SP 800-125A Rev. 1 (Security Recommendations for Server-based Hypervisor Platforms)',
      'NIST SP 800-190 (Application Container Security Guide)',
      'AICPA Trust Services Criteria (the criteria used in SOC 2 reports)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['5A8'],
    prepares: ['d5_073', 'd5_088', 'd5_089'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Cloud and virtualization',
        title: 'Shared responsibility in the cloud',
        subtitle: 'The provider runs the platform. You still own your data, your settings and the accountability.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'In the cloud, security duties are split between the provider and the customer. The split moves with the service: renting raw servers leaves you more to manage than renting finished software. But the customer always owns its data, who can reach it, and how its own settings are configured.',
      },
      {
        type: 'analogy',
        heading: 'A self-storage unit',
        body: 'The storage company runs the gate, the cameras and the building. You decide who gets a copy of your key and what goes inside. If you leave your unit unlocked, the company’s spotless camera records do not make your belongings safe.',
      },
      {
        type: 'stack',
        heading: 'Where the line usually falls',
        layers: [
          { label: 'Data, access and your settings', note: 'Always the customer' },
          { label: 'Applications', note: 'The customer, unless renting finished software (SaaS)' },
          { label: 'Operating systems', note: 'The customer when renting raw servers (IaaS); otherwise the provider' },
          { label: 'Virtualization and hardware', note: 'The provider' },
          { label: 'Buildings and power', note: 'The provider' },
        ],
        caption: 'The contract and the provider’s documentation set the exact line for each service.',
      },
      {
        type: 'idea',
        heading: 'Virtual machines and containers',
        body: 'A hypervisor is the software that runs many virtual machines on one server, so its administrators are very powerful; log their actions somewhere they cannot change. A container is a lightweight running copy of an app, started from a template called an image. Scan each image during the automated release steps (the pipeline) and block any that fail.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'You can outsource the work, not the accountability. As the IS (information systems) auditor, you may rely on the provider’s SOC 2 report, an independent auditor’s report on its controls, for what it covers; a Type 2 report tests them over a period. You still test the complementary user entity controls (CUECs): the checks the report assumes the customer runs.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The provider’s audit report is clean, so our cloud setup is covered.”',
        why: 'The report covers the provider’s side of the line. Who can open your files and how your storage is set up are yours, and many cloud breaches start there. Check the report’s scope, period and exceptions, then test what it leaves out instead of retesting what it covers.',
      },
      {
        type: 'tip',
        body: 'If a question asks where cloud testing should focus, find the customer’s side of the line. If a breach came from the customer’s own setting, the customer is accountable. For containers, prefer controls that stop a flaw before it runs over ones that find it later.',
      },
      {
        type: 'check',
        question:
          'A provider’s clean SOC 2 Type 2 report says customers must review their own user access each quarter. The firm never has. What should concern the IS auditor MOST?',
        options: [
          'Excess access to the firm’s data may go unnoticed',
          'The provider may fail its next SOC 2 audit',
          'The report covers too short a period to be relied on',
          'The firm’s data may be stored in another country',
        ],
        correctIndex: 0,
        explanation:
          'The report assumes customers do their part, a complementary user entity control, so skipping the reviews lets stale access build up unchecked. Data location is tempting because it sounds like the bigger cloud risk, but it is a contract question, and nothing in the stem points to it. The provider’s audit result does not depend on the firm.',
      },
      {
        type: 'check',
        question:
          'Hypervisor administrators’ actions are logged, but the same administrators review those logs monthly. What should the IS auditor recommend as BEST against hidden misuse?',
        options: [
          'The infrastructure manager signs off each monthly self-review',
          'Have the administrators review each other’s logs every month',
          'Add more detail to the hypervisor log entries',
          'Move log review to another team, using tamper-proof logs',
        ],
        correctIndex: 3,
        explanation:
          'Nobody should be the only check on their own work: another team, reading logs the administrators cannot alter, would see what they might hide. Peer review is tempting because it adds a second person, but peers share the same power and could cover for each other. A manager’s sign-off still rests on what the administrators chose to report. More detail helps only if someone independent reads it.',
      },
      {
        type: 'check',
        question:
          'A pipeline scan blocks flawed container images, but teams can also deploy images pulled straight from a public library. What should the IS auditor recommend as BEST?',
        options: [
          'Scan running containers daily to catch public images',
          'Ask teams to check public images before using them',
          'Let production run only images that passed the scan',
          'Move the applications back onto virtual machines',
        ],
        correctIndex: 2,
        explanation:
          'A gate only prevents what must pass through it, so production should refuse any image that skipped the scan. Daily scanning is tempting because it would spot the public images, but it is detective: a flawed image is already live when found. Asking teams to check relies on memory, not a control.',
      },
    ],
  },

  {
    id: 'cisa-l-d5-attacks-testing',
    certId: 'cisa',
    domainId: '5',
    order: 9,
    title: 'How attackers work, and how we test',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-115 (Technical Guide to Information Security Testing and Assessment)',
      'OWASP Web Security Testing Guide',
      'MITRE ATT&CK (public knowledge base of adversary tactics and techniques)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['5B2', '5B3'],
    prepares: ['d5_103', 'd5_125', 'd5_127'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Attacks and security testing',
        title: 'How attackers work, and how we test',
        subtitle: 'Know the common attacks, test where attackers would look, and make sure findings get fixed.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Many attacks target people, not code. Social engineering tricks someone into acting, such as a fake executive email asking for an urgent payment, known as business email compromise. Technical attacks exploit flaws, such as injection (sneaking commands into input fields), or reuse stolen passwords. Security testing finds these weaknesses before attackers do.',
      },
      {
        type: 'analogy',
        heading: 'A home inspector',
        body: 'An inspector who only walks around the outside can report a cracked wall, but not faulty wiring. A web scan that never signs in is the same: it misses the account pages where money moves. And a report listing the same crack every year has not made anyone safer.',
      },
      {
        type: 'compare',
        heading: 'Two kinds of automated testing',
        left: {
          title: 'Static testing (SAST)',
          points: [
            'Reads source code without running it',
            'Runs early, each time code is saved',
            'Can raise false alarms, so each dismissal needs a second look',
          ],
        },
        right: {
          title: 'Dynamic testing (DAST)',
          points: [
            'Attacks the running application',
            'Must sign in to reach account pages',
            'Finds problems that show only when the app runs',
          ],
        },
        caption:
          'A penetration test goes further: skilled testers chain weaknesses the way a real attacker would, within an agreed scope, often modeled on known attacker techniques.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Strong controls work even when people slip. As the IS (information systems) auditor, you favor a process check over hoping staff spot every fake, and you test where the value sits. When findings keep returning, the real finding is a broken loop: nobody is accountable and nothing proves the fixes work. You recommend; management does the fixing.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Train staff to spot fake sender addresses, and payment fraud stops.”',
        why: 'Training helps, but a convincing fake, or a real mailbox an attacker has taken over, gets past people. Payment changes need checking through a separate channel the attacker does not control. A process control stops the loss even when the email fools someone.',
      },
      {
        type: 'tip',
        body: 'For payment fraud, ask which check the attacker cannot control. For test scope, ask what the test could not see. For findings that keep coming back, ask why nobody fixed them before asking how to find them faster.',
      },
      {
        type: 'check',
        question:
          'An attacker takes over a real supplier’s mailbox and emails your payables team new bank details. Which control BEST prevents the payment going astray?',
        options: [
          'Check that the sender address matches the supplier’s domain',
          'Hold new bank details until a second clerk approves them',
          'Phone the supplier using details you held before the email',
          'Ask the sender to confirm the new details by return email',
        ],
        correctIndex: 2,
        explanation:
          'Contact details you held before the email reach the real supplier, whatever the email says. Checking the sender address is tempting, but the mailbox is genuine, so the check passes. A second clerk reads the same convincing email, and a reply goes straight to the attacker.',
      },
      {
        type: 'check',
        question:
          'A company’s annual penetration test covers only its internet-facing systems. Last year’s ransomware spread through the internal network. Which concern should the IS auditor rate GREATEST?',
        options: [
          'The testing firm was hired without a competitive bid',
          'Testers might cause outages on internet-facing systems',
          'The test is run once a year, not quarterly',
          'Attack paths inside the network get no testing at all',
        ],
        correctIndex: 3,
        explanation:
          'The scope leaves out where last year’s attack actually spread, so the riskiest paths get no assurance. Testing once a year is tempting because more often sounds safer, but a quarterly test with the same scope would miss the same network.',
      },
      {
        type: 'check',
        question:
          'Monthly vulnerability scans report the same 15 critical flaws, and each report is filed with the security team. What should the IS auditor recommend as BEST?',
        options: [
          'Assign each flaw to someone, with a due date and recheck',
          'Scan every week so the flaws are reported sooner',
          'Have the CISO approve each scan report before it is filed',
          'Send each monthly scan report to the board',
        ],
        correctIndex: 0,
        explanation:
          'The scans already find the flaws; nothing makes anyone fix them. Weekly scanning is tempting because it sounds more rigorous, but it only reports the same unfixed flaws more often. CISO approval or a copy to the board looks like oversight, yet approving a report fixes nothing.',
      },
    ],
  },

  {
    id: 'cisa-l-d5-monitoring',
    certId: 'cisa',
    domainId: '5',
    order: 10,
    title: 'Monitoring that actually detects',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-92 (Guide to Computer Security Log Management)',
      'NIST SP 800-137 (Information Security Continuous Monitoring for Federal Information Systems and Organizations)',
      'ISO/IEC 27002:2022 controls 8.15 (Logging) and 8.16 (Monitoring activities)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['5B4'],
    prepares: ['d5_122', 'd5_124', 'd5_111'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Security monitoring',
        title: 'Monitoring that actually detects',
        subtitle: 'Collecting logs is not the same as noticing an attack. What turns data into detection?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Security monitoring turns logs into alerts that someone acts on. A security information and event management (SIEM) system gathers logs from many systems and applies detection rules. Rules that link events across systems, called correlation, catch attacks that look harmless one log at a time.',
      },
      {
        type: 'analogy',
        heading: 'A smoke detector',
        body: 'A smoke detector that is never tested may have a flat battery, and you find out during the fire. Detection rules fail the same quiet way: systems change, rules stop matching, and nothing looks wrong. Pressing the test button (for rules, a simulated attack) is the real proof it still works.',
      },
      {
        // Expert review fix (2026-10): rule testing runs alongside the cycle, so it moved to the caption.
        type: 'flow',
        heading: 'From logs to action',
        steps: [
          { label: 'Collect', note: 'Logs from the systems that matter, with clocks kept in sync' },
          { label: 'Correlate', note: 'Detection rules link related events across sources' },
          { label: 'Triage', note: 'Analysts sort each alert by urgency; noisy rules get tuned' },
          { label: 'Respond', note: 'Confirmed attacks go to incident response' },
        ],
        caption: 'Simulated attacks regularly prove each rule still fires, and every rule has a named owner.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Prove it works, and govern it first. As the IS (information systems) auditor, you want evidence that detection works today, not proof that a tool is configured. Watching employees needs a lawful, written basis before anyone switches a tool on. If an outside security firm watches alerts, the company still owns the risk and must oversee the firm.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“We keep every log for a year, so monitoring is in place.”',
        why: 'Storing logs is not detecting attacks. Without correlation rules, owners and someone watching the alerts, logs only help after the damage is done. Ask what would raise an alarm today, and who would see it.',
      },
      {
        type: 'tip',
        body: 'For proof that detection works, ask which evidence shows the rule firing today, not what it was designed to do. Before any monitoring of staff, ask who agreed the rules, not which tool is ready. “All logs collected” does not prove detection.',
      },
      {
        type: 'check',
        question:
          'An outside security firm runs the company’s SIEM and reports every alert closed on time. Which evidence would BEST show the IS auditor that attacks are detected?',
        options: [
          'The firm’s monthly report of alerts closed on time',
          'The firm’s industry certification for its monitoring service',
          'A staged attack the firm caught and escalated',
          'A list of all detection rules the firm has enabled',
        ],
        correctIndex: 2,
        explanation:
          'A staged attack shows that a real attack today raises an alert and reaches someone who acts. Closed-on-time reports are tempting because they look like performance, but they only count alerts that fired; an attack that never triggers a rule never appears in them. A rule list shows intent, not results.',
      },
      {
        type: 'check',
        question:
          'A lawful policy covers monitoring of staff email. The security chief now wants to scan staff chat too, using the same tool. What should happen FIRST?',
        options: [
          'Extend monitoring to chat, since a policy already exists',
          'Turn on chat monitoring for privileged users first',
          'Have the CISO approve chat scanning under the email policy',
          'Have legal, HR and privacy approve an updated policy',
        ],
        correctIndex: 3,
        explanation:
          'Each new kind of monitoring needs its own lawful basis, so the policy must be updated and approved by legal, HR and privacy before the tool is switched on. Relying on the existing policy is tempting because monitoring is already approved, but it covers email, not chat. A CISO’s approval does not extend it. Starting with privileged users still monitors people without an agreed basis.',
      },
      {
        type: 'check',
        question:
          'A SIEM’s rules link firewall, server and remote-access events, but server clocks drift up to 20 minutes from the others. Which risk is GREATEST?',
        options: [
          'Linked events may be stored without the source device’s name',
          'Related events seem too far apart for rules to link',
          'Analysts receive far more alerts than they can handle',
          'Reports show managers the wrong times for some events',
        ],
        correctIndex: 1,
        explanation:
          'Correlation rules join events that happen close together, so a 20-minute drift can stop a sign-in and a server change from ever matching. Wrong times in reports are tempting because they are visible, but the deeper harm is silent: the attack is never linked, so no alert fires.',
      },
    ],
  },

  {
    id: 'cisa-l-d5-forensics',
    certId: 'cisa',
    domainId: '5',
    order: 11,
    title: 'Evidence that stands up',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-86 (Guide to Integrating Forensic Techniques into Incident Response)',
      'ISO/IEC 27037:2012 (Guidelines for identification, collection, acquisition and preservation of digital evidence)',
      'IETF RFC 3227 (Guidelines for Evidence Collection and Archiving)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['5B6'],
    prepares: ['d5_182', 'd5_184', 'd5_186'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Evidence and forensics',
        title: 'Evidence that stands up',
        subtitle: 'If a case might reach court, how you collect evidence matters as much as what you find.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Digital forensics is collecting and analyzing digital evidence so it can be trusted, including in court. The rules: preserve before you analyze, never change the original, record everyone who handles it from the moment it is collected, and prove the copy matches the original.',
      },
      {
        type: 'analogy',
        heading: 'A crime scene',
        body: 'Officers photograph and bag items before anyone moves them, and each bag is signed for whenever it changes hands. If someone tidies the room first, the evidence may still be true, but nobody can prove it was not changed.',
      },
      {
        // Expert review fix (2026-10): isolate but keep the device powered; capture memory before any shutdown.
        type: 'flow',
        heading: 'Collecting evidence in order',
        steps: [
          { label: 'Isolate, keep it powered', note: 'Cut the network but leave it running, if isolation is safe; note its connections; custody record starts now' },
          { label: 'Capture volatile data', note: 'Memory and running processes; a shutdown erases them' },
          { label: 'Copy the whole disk', note: 'An exact copy, called an image, made through a write-blocker, a device that stops any change to the original' },
          { label: 'Hash the image', note: 'A hash, a digital fingerprint, proves the copy matches the original' },
          { label: 'Analyze a copy', note: 'Work on copies of the image, never on the original' },
        ],
        caption: 'Collect what disappears fastest first: the order of volatility. Bring legal in early, alongside these steps, never as a reason to delay them.',
      },
      {
        type: 'idea',
        heading: 'How ISACA thinks',
        body: 'Evidence quality decides. As the IS (information systems) auditor, you check that the process keeps evidence complete, unaltered and traceable: trained staff for the first response, tested tools, and logs kept long enough to investigate. Conclusions must state only what the evidence shows, and no more.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Reboot the server to get the business running, then investigate.”',
        why: 'A reboot wipes memory, and some malware and attacker activity exist only there. Unless people’s safety is at risk, preserve the volatile data first; if the attack is still active, cut the network, not the power. Evidence lost in a reboot can never be recovered.',
      },
      {
        type: 'tip',
        body: 'If evidence may reach court, ask what each option would change or destroy, and pick the one that keeps the most intact. Options that analyze, clean or delete before anything is preserved are the trap.',
      },
      {
        type: 'check',
        question:
          'A laptop under investigation is still switched on and unlocked, and its disk is fully encrypted. What should the examiner do FIRST?',
        options: [
          'Ask the employee for the disk password at interview',
          'Copy the documents folder to a clean portable drive',
          'Shut it down cleanly, then make an exact copy of the disk',
          'Capture memory and unlocked files before powering off',
        ],
        correctIndex: 3,
        explanation:
          'While it is on and unlocked, memory and readable data are available; once off, the encrypted disk may be unreadable. A clean shutdown is tempting because it is the usual routine, but here it destroys the best evidence. Copying one folder misses memory and alters the scene.',
      },
      {
        type: 'check',
        question:
          'An IS auditor reviews a forensic team’s procedure for seized drives. Which practice would MOST weaken the evidence if challenged in court?',
        options: [
          'Seized drives are imaged with a hardware write-blocker attached',
          'Analysts open files straight from the seized drive',
          'Each handover is signed by both analysts involved',
          'Each image is hashed with a current, accepted algorithm',
        ],
        correctIndex: 1,
        explanation:
          'Working on the seized drive itself can change it, and that change cannot be undone or disproved. Signed handovers are tempting to question, but they are what a chain of custody needs, so they strengthen the evidence rather than weaken it. Nothing can repair an altered original.',
      },
      {
        type: 'check',
        question:
          'Logs show a payroll file was exported at night under a finance manager’s account. The IS auditor’s draft report says she stole the data. Which revision is BEST?',
        options: [
          'Name her in the report and recommend disciplinary action',
          'Remove the finding until she admits taking the data',
          'State that her account ran the export, then corroborate',
          'Have the audit committee approve the wording before issue',
        ],
        correctIndex: 2,
        explanation:
          'The logs prove which account was used, not who was at the keyboard; a stolen or shared password fits the same facts. Naming her is tempting because the logs look clear, but it goes beyond the evidence and would not survive a challenge. Committee approval would not fix a claim the evidence cannot support.',
      },
    ],
  },
];
