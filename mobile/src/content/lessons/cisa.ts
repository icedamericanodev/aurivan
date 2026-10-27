/**
 * CISA motion lessons — ORIGINAL KaiSip writing.
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

const PROVENANCE = 'Original KaiSip content. Not affiliated with or endorsed by ISACA.';
const OUTLINE = 'CISA job practice 2024';
const REVIEWED = '2026-10-07';
const PHASE2_REVIEWED = '2026-10-08'; // Phase 2 lessons, after concept, teaching and novice reviews
const D1_GAPS_REVIEWED = '2026-10-20'; // Domain 1 gap lessons (plan items L1 + L2), appended as orders 8–13
const L3_L5_REVIEWED = '2026-10-21'; // Plan items L3–L5: Domain 5, Domain 4, and Domains 2–3 lessons, appended after each domain’s last lesson
const FIXES_145_REVIEWED = '2026-10-26'; // Mobile 1.45 B0: concept-expert and curriculum fixes to existing lessons
const DECISION_LESSONS_REVIEWED = '2026-10-27'; // Mobile 1.45: decision lessons 1–5 (curriculum §4), appended after each domain’s last lesson
const DECISION_LESSONS_2_REVIEWED = '2026-10-27'; // Decision lessons 6–10 (curriculum §4), appended after each domain’s last lesson

export const CISA_LESSONS: Lesson[] = [
  // ───────────────────────────── Domain 1 ─────────────────────────────
  {
    id: 'cisa-l-d1-charter',
    certId: 'cisa',
    domainId: '1',
    order: 1,
    title: 'The audit charter: who the IS auditor answers to',
    minutes: 3,
    provenance: PROVENANCE,
    references: ['ITAF Standard 1001 — Audit Charter', 'ITAF Standard 1002 — Organizational Independence'],
    outlineVersion: OUTLINE,
    lastReviewed: '2026-10-06',
    topics: ['1A1'],
    prepares: ['d1_001'],
    notes: ['1A1.3', '1A1.4'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit process',
        title: 'The audit charter',
        subtitle: 'Why who approves the audit charter matters more than who drafts it.',
      },
      {
        type: 'idea',
        heading: 'What a charter does',
        body: 'An audit charter is the founding document of the audit function. It sets out the function’s purpose, responsibility, authority to access people and records, and accountability, including where it reports. Without it, an auditor is a guest who can be shown the door.',
        // Mobile 1.43: the four things a charter sets out, drawn as a small figure (same words, only split).
        list: {
          lead: 'An audit charter is the founding document of the audit function. It sets out the function’s',
          items: ['purpose', 'responsibility', 'authority| to access people and records', 'accountability|, including where it reports'],
          close: 'Without it, an auditor is a guest who can be shown the door.',
        },
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
          { label: 'Chief audit executive', note: 'The head of the audit function; reports functionally to the audit committee' },
          { label: 'Senior management', note: 'Handles administrative matters only (payroll, expenses, office space); the audit committee oversees the plan and budget' },
          { label: 'IT and the business', note: 'The areas being audited — never the approver' },
        ],
        caption: 'Independence flows from the top layer down, not from the area being audited.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Have the CIO review the charter so IT agrees with it.”',
        why: 'It sounds collaborative, but letting the audited area shape the IS auditor’s authority undermines independence. Management can comment; the audit committee approves.',
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
      'ITAF Standard 1201 (Risk Assessment in Planning)',
      'ITAF Standard 1202 (Audit Scheduling)',
      'ISO 31000:2018 (Risk management — Guidelines)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['1A3', '1A2'],
    prepares: ['d1_003', 'd1_062', 'd1_111'],
    notes: ['1A3.1', '1A3.5', '1A2.4'],
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
        heading: 'Audit risk: the three parts',
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
          'Audit risk is the risk that the IS auditor reaches the wrong conclusion. When inherent and control risk are high, you lower detection risk by testing results more directly (substantive testing). In an integrated audit (IT controls and financial figures tested together), weak IT controls mean more substantive testing of the figures.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
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
          'Midway through an audit, an IS auditor finds that change controls over a billing system failed for most of the year. How should the IS auditor BEST adjust the remaining fieldwork?',
        options: [
          'Stop testing and report all billing figures as unreliable',
          'Ask management to fix the controls, then retest them',
          'Rely on the billing system’s automated totals as planned',
          'Test more billing transactions directly to offset weak controls',
        ],
        correctIndex: 3,
        explanation:
          'Failed controls raise control risk, so the IS auditor lowers detection risk by testing the results directly. Stopping and calling the figures unreliable is tempting, but it is a conclusion without the evidence to support it.',
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
    references: ['ITAF Standard 1205 (Evidence)', 'ITAF Standard 1206 (Using the Work of Other Experts)'],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['1B3', '1B4'],
    prepares: ['d1_004', 'd1_032', 'd1_013'],
    notes: ['1B3.2', '1B3.1', '1B4.2'],
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
            'Obtained directly by the IS auditor',
            'Documented or system-generated',
            'Redone by the IS auditor (reperformed) or watched happening',
          ],
        },
        right: {
          title: 'Weaker',
          points: ['From the area being audited', 'Passed on by someone else', 'Verbal', 'Learned by asking (inquiry)'],
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
        heading: 'The IS auditor’s lens',
        body: 'As the IS auditor, you base conclusions on evidence you could defend to an outsider. Independent beats internal, direct beats indirect, documented beats verbal. When the only support is what management told you, you have a lead, not a conclusion.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“We collected hundreds of screenshots, so the evidence is sufficient.”',
        why: 'Volume is not sufficiency. If the items do not address the control objective, or all come from one source the auditee (the area being audited) controls, more of them adds nothing. Check relevance and reliability before quantity.',
      },
      {
        // Review fix (MAJOR): a confirmation sent straight to the IS auditor by a
        // third party is STRONG evidence, so "confirmed" is not a weak cue.
        type: 'tip',
        body: 'For the most reliable evidence, pick the option where the IS auditor obtains it directly, from the system or an independent party. A confirmation a third party sends straight to the IS auditor is strong. Words like “told”, “stated” or “assured” usually signal inquiry, the weakest kind.',
      },
      {
        type: 'check',
        question: 'An IS auditor must confirm that departing employees lose system access on their last day. Which evidence is MOST reliable?',
        options: [
          'The HR director’s written assurance that the process works',
          'A comparison of HR termination dates with account disable dates',
          'The documented offboarding procedure approved last year',
          'Interviews with three managers whose staff recently left',
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
          'Using an expert does not hand over responsibility: the IS auditor must be satisfied the work supports the finding. Referring management to the specialist is tempting, but the conclusion belongs to the IS auditor.',
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
    references: ['AICPA AU-C 530 (Audit Sampling) (analogous guidance)', 'ITAF Standard 1205 (Evidence)'],
    outlineVersion: OUTLINE,
    lastReviewed: REVIEWED,
    topics: ['1B2'],
    prepares: ['d1_009', 'd1_019', 'd1_049'],
    notes: ['1B2.2', '1B2.4', '1B2.6'],
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
        heading: 'The IS auditor’s lens',
        body: 'As the IS auditor, you set the confidence level and tolerable error before testing, based on risk. If the sample shows more deviations than you can tolerate, you conclude the control is not effective and report it. You do not move the threshold to fit the result.',
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
          'Attribute sampling of the requests the IS auditor judges riskiest',
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
          'A sample’s deviation rate exceeds the tolerable rate set at planning. The process owner asks the IS auditor to raise the tolerable rate. What is the IS auditor’s BEST response?',
        options: [
          'Agree, provided the process owner documents the reason',
          'Remove the failed items as one-off exceptions',
          'Keep the planned rate and report the control as ineffective',
          'Retest the same items after the owner explains them',
        ],
        correctIndex: 2,
        explanation:
          'Thresholds are set before testing so results cannot be argued into a pass. Agreeing with documentation is tempting because it looks controlled, but changing the threshold after seeing the result destroys the test’s objectivity.',
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
    notes: ['1A4.3', '1A4.6', '1A4.1'],
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
        heading: 'The IS auditor’s lens',
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
          'Each morning, a bank’s system compares the cash its automated teller machines (ATMs) dispensed the day before with its accounting records, and flags any mismatch to the branch. How is this control BEST classified?',
        options: [
          'Preventive, because it protects the bank’s cash',
          'Corrective, because the branch fixes each mismatch',
          'Compensating, because it covers weak security at the ATMs',
          'Detective, because it finds differences after they occur',
        ],
        correctIndex: 3,
        explanation:
          'The check runs after the cash has gone out and reports what it finds, so it is detective. Corrective is tempting because someone later fixes the mismatch, but that fix is a separate step; this control only finds the problem.',
      },
      {
        type: 'check',
        question:
          'At a small branch, one clerk both enters and approves customer refunds, and duties cannot be split. Which compensating control is BEST for the IS auditor to recommend?',
        options: [
          'The IT security team reapproves the clerk’s refund access quarterly',
          'A regional manager checks each week’s refunds against receipts',
          'The clerk signs a daily log of the refunds issued that day',
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
          'Controls give reasonable, not absolute, assurance: people can collude, err or override them. The IS auditor should still check whether something was missed, but fraud alone does not prove failure. Blaming the testing is tempting because the controls passed, yet testing shows controls work as designed, not that collusion is impossible. Preventing and detecting employee fraud is a control matter.',
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
      'ITAF Standard 1203 (Engagement Planning)',
      'ITAF Standard 1204 (Performance and Supervision)',
      'ITAF Standard 1207 (Irregularities and Illegal Acts)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['1B1', '1A3'],
    prepares: ['d1_024', 'd1_011', 'd1_010'],
    notes: ['1B1.2', '1A3.4'],
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
        body: 'Sometimes fieldwork reveals signs of possible fraud, such as one person creating and approving large payments. The IS auditor records the facts and raises them within audit, following the organization’s agreed fraud procedure. Investigating is for people with the authority and skills to do it.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
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
        body: 'For planning order, ask what each step depends on; work built on nothing is the trap. For consistency between auditors, look for whatever tells each of them what to do before testing starts. When a red flag appears, your role shifts from testing to escalating: keep the evidence safe and the news away from anyone involved.',
      },
      {
        type: 'check',
        question:
          'An IS auditor is assigned a new audit of a hospital’s patient-records system. A colleague offers last year’s test steps so fieldwork can start tomorrow. What should the IS auditor do FIRST?',
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
          'The audit manager signs off on both sets of work papers afterward',
          'A common audit program listing the planned test procedures',
        ],
        correctIndex: 3,
        explanation:
          'The audit program sets out the planned procedures, so both auditors run the same tests and a reviewer can compare each against the plan. The shared folder is tempting because each could see the other’s work, but seeing it afterward is not agreeing in advance on what to test. A manager’s sign-off after fieldwork comes too late to make the tests match.',
      },
      {
        type: 'check',
        question:
          'While testing purchasing, an IS auditor sees that a buyer approved large orders to a supplier the buyer had set up. The buyer’s manager is a close friend of the buyer. To whom should the IS auditor FIRST report?',
        options: [
          'The chief audit executive, who heads the audit function',
          'The buyer’s manager, who has line authority over the buyer',
          'The HR director, who handles staff misconduct cases',
          'The police, since the payments may well amount to a crime',
        ],
        correctIndex: 0,
        explanation:
          'Possible fraud goes up the audit line under the agreed procedure, so people with authority decide how to investigate and evidence is protected. The buyer’s manager is tempting because they manage the buyer, but they are close to the buyer and could tip the buyer off. Going to HR or the police is not the IS auditor’s call; those steps are decided after escalation.',
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
    references: ['ITAF Standard 1401 (Reporting)', 'ITAF Standard 1402 (Follow-up Activities)'],
    outlineVersion: OUTLINE,
    lastReviewed: PHASE2_REVIEWED,
    topics: ['1B5'],
    prepares: ['d1_006', 'd1_015', 'd1_036'],
    notes: ['1B5.3', '1B5.4', '1B5.5'],
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
        layout: 'timeline',
        heading: 'From exit meeting to closure',
        steps: [
          { label: 'Exit meeting', note: 'At the end of testing, management checks the facts and proposes actions' },
          { label: 'Report', note: 'Findings rated by the IS auditor, with management’s responses and action dates' },
          { label: 'Distribution', note: 'The audit committee receives it; executives who must act also get it' },
          { label: 'Follow-up', note: 'The IS auditor checks evidence that each agreed action was carried out' },
          { label: 'Escalation', note: 'Serious risks left open or overdue go back to the audit committee' },
        ],
        caption: 'If management disagrees with a finding, the report shows both views. The rating stays the IS auditor’s call.',
      },
      {
        type: 'idea',
        heading: 'Overall opinions, in brief',
        body: 'Some reports give an overall opinion. Unmodified (also called unqualified): controls are effective. Qualified: effective except for specific, contained problems. Adverse: problems are so widespread that controls are ineffective overall. Disclaimer: the IS auditor could not obtain enough evidence to form a view.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Report to the right level of authority. As the IS (information systems) auditor, you report to the body that owns the decision and you keep your ratings independent. Management owns the fix. The more severe the finding, the higher and faster it travels. In follow-up you want proof that the fix happened, not a promise that it did.',
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
          'An IS auditor rates a backup failure as high risk. The IT director asks for the final report to go only to the director. What is the IS auditor’s MOST appropriate response?',
        options: [
          'Agree, since the IT director owns the backup process and its fix',
          'Send it to the director now and to the committee later',
          'Issue it through the normal route to the audit committee',
          'Send it to the CIO, who oversees the IT director, instead',
        ],
        correctIndex: 2,
        explanation:
          'The report goes to the body that oversees audit, whatever the audited area prefers, because severe findings must reach those who hold management to account. Sending it to the director first is tempting because the director will lead the fix, but it lets the audited area control what the committee sees. The CIO is senior, yet still management, so the committee would not see the finding.',
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
          'Follow-up verifies the action actually happened, so the IS auditor wants records of reviews done, traced to access really removed. The approved procedure is tempting because it is formal, but it shows the review was designed, not that it ran. An email is a claim, not proof.',
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
  // Domain 1 gap lessons (plan items L1 + L2). Appended as orders 8–13 so the
  // seven earlier lessons keep their numbers; within the block they follow the
  // outline (1A1, 1B1, 1B3, 1B4, 1B5, 1B6).
  {
    id: 'cisa-l-d1-independence',
    certId: 'cisa',
    domainId: '1',
    order: 8,
    title: 'Independence, and relying on others',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ITAF Standard 1003 (Auditor Objectivity)',
      'ITAF Standard 1206 (Using the Work of Other Experts)',
      'IIA Global Internal Audit Standards (2024), Standard 2.2 (Safeguarding Objectivity)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: FIXES_145_REVIEWED,
    topics: ['1A1'],
    prepares: ['d1_002', 'd1_087', 'd1_090'],
    notes: ['1A1.5', '1A1.7'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Professional standards',
        title: 'Independence, and relying on others',
        subtitle: 'When your own ties put a fair audit at risk, and when someone else’s work is safe to use.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Independence means the audit function is free from control by the people it audits. Objectivity is each auditor’s own unbiased state of mind. Both must hold in fact and in appearance: auditing a sibling’s team fails the appearance test, even if you would be fair.',
      },
      {
        type: 'stack',
        heading: 'Four common threats to objectivity',
        layers: [
          { label: 'Self-review', note: 'Auditing work you designed, built or ran, such as a system you helped set up' },
          { label: 'Self-interest', note: 'A personal stake in the result, such as a job offer from the area being audited (the auditee)' },
          { label: 'Familiarity', note: 'Closeness from long tenure or personal ties that dulls skepticism; rotation is the usual safeguard' },
          { label: 'Intimidation', note: 'Pressure to narrow the scope or soften the findings' },
        ],
        caption:
          'Tell audit management about any tie before work starts. They judge how serious it is: a serious threat means another auditor does the work; a minor one is managed with safeguards, such as extra review.',
      },
      {
        type: 'flow',
        heading: 'Before you rely on someone else’s work',
        steps: [
          { label: 'Assess the provider', note: 'Check competence, qualifications and objectivity, including any ties to the auditee' },
          { label: 'Agree the terms', note: 'Scope, objectives and access set down in writing, so the work answers the audit’s question' },
          { label: 'Evaluate the work', note: 'Check the methods, the evidence, and whether the conclusions follow from them' },
          { label: 'Rely, or do not', note: 'Use what holds up; for gaps, ask for correction or add your own procedures' },
        ],
        caption: 'Record how the work was used and why it was judged reliable. You can hand over the work, but never the responsibility for the conclusion.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'As the IS (information systems) auditor, you disclose rather than decide alone. Tell audit management about any tie before testing starts, and let them weigh it. With an expert’s work, credentials open the door but prove nothing about the result: judge the delivered work, because the conclusion stays yours.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“A senior colleague will review my conclusions, so I can still audit the system I built.”',
        why: 'Review reduces a self-review threat but does not remove it: the sampling, testing and judgments still come from the conflicted auditor. When the tie is serious, the fix is a different auditor.',
      },
      {
        type: 'tip',
        body: 'When a stem mentions a past role, a relative or a job offer, ask: how close and how recent is the tie, and was it disclosed? Recently built or ran the system, or accepted a job with the auditee: reassign. A distant or old tie: disclose it and add safeguards. For an expert’s report, pick the option that evaluates the work first.',
      },
      {
        type: 'check',
        question:
          'An IS auditor spent two years configuring a hospital’s patient-billing system, then joined internal audit last quarter. That system is now due for audit. What should the IS audit manager do?',
        options: [
          'Assign the auditor, with a senior reviewer checking the conclusions',
          'Assign the auditor, since configuring differs from designing',
          'Ask the billing team to confirm the auditor’s findings are fair',
          'Assign an auditor who had no part in the billing system',
        ],
        correctIndex: 3,
        explanation:
          'Configuring the system the auditor would now test is a serious self-review threat, so the work goes to someone with no involvement. A senior reviewer is tempting because it adds oversight, but the fieldwork and judgments would still come from the conflicted auditor.',
      },
      {
        type: 'check',
        question:
          'An IS auditor on a payroll audit has a sibling who works in the marketing department, which has no role in payroll. What should the IS auditor do?',
        options: [
          'Say nothing, since marketing plays no part in payroll',
          'Disclose the tie to audit management before work starts',
          'Decline the assignment without giving a reason',
          'Ask the payroll manager whether the tie is a concern',
        ],
        correctIndex: 1,
        explanation:
          'Even a distant tie is disclosed before work starts; audit management then weighs it, and here safeguards are likely enough. Declining quietly is tempting because it avoids any doubt, but it leaves the threat unassessed and unrecorded, and the decision is audit management’s, not the IS auditor’s alone.',
      },
      {
        type: 'check',
        question:
          'A specialist firm hired to assess a payment system’s encryption delivers a two-page report rating it “strong”, with no tests or settings listed. What should the IS auditor do?',
        options: [
          'Ask for the tests and evidence before relying on the report',
          'Rely on it, since the firm’s credentials were checked beforehand',
          'Have the audit team repeat the firm’s encryption tests',
          'Report the encryption as strong, naming the firm as the source',
        ],
        correctIndex: 0,
        explanation:
          'Credentials show the firm could do the work, not that this report is sound. The IS auditor evaluates the delivered work and holds back reliance until the evidence is there. Repeating the tests is tempting, but it duplicates work the expert was engaged to do; the first step is to obtain and evaluate the expert’s evidence, and the IS auditor adds further procedures only if gaps remain.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-audit-project',
    certId: 'cisa',
    domainId: '1',
    order: 9,
    title: 'Keeping an audit on track',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ITAF Standard 1203 (Engagement Planning)',
      'ITAF Standard 1204 (Performance and Supervision)',
      'ITAF Standard 1006 (Proficiency)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: D1_GAPS_REVIEWED,
    topics: ['1B1', '1B2'],
    prepares: ['d1_165', 'd1_166', 'd1_061'],
    notes: ['1B1.1', '1B1.4', '1B2.1'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit project management',
        title: 'Keeping an audit on track',
        subtitle: 'How an engagement runs from kickoff to follow-up, and what to do when time, money or facts change.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Every audit is a small project, with a deadline, a budget and a team. Managing it well means protecting the conclusions when time, money or facts change. Who’s who: an audit manager runs each audit; the chief audit executive heads the whole audit function; the audit committee, a group of board members, oversees audit and its yearly plan.',
      },
      {
        type: 'analogy',
        heading: 'Think of a builder',
        body: 'A builder who finds rotten beams halfway through a renovation does not keep painting over them, and does not knock down a wall unasked. The builder stops, shows the owner the problem and the options, and lets the owner decide. If the budget shrinks, the roof comes before the trim, and the owner is told what was left out.',
      },
      {
        type: 'flow',
        layout: 'timeline',
        heading: 'An engagement, start to finish',
        steps: [
          { label: 'Planning', note: 'Objectives, scope and criteria, from a risk assessment' },
          { label: 'Engagement letter or notice', note: 'Confirms scope, timing, access and who gets the report' },
          { label: 'Opening meeting', note: 'The plan is walked through with the auditee' },
          { label: 'Fieldwork', note: 'First test the controls (compliance tests); the weaker they are, the more you check the data itself (substantive tests)' },
          { label: 'Reporting', note: 'Facts confirmed with management; conclusions finalized' },
          { label: 'Follow-up', note: 'Evidence that the agreed actions were carried out' },
        ],
        caption:
          'Each phase rests on the one before it: thin planning shows up later as rework in fieldwork.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'As the IS (information systems) auditor, protect the conclusion, not the schedule. Missing a skill? Get it before fieldwork: training, an expert, or a specialist firm beside the team (co-sourcing). Budget cut? Keep the high-risk work and say what you dropped. Facts changed? Pause and brief the audit committee on the options.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The control passed when we tested it in July, so we can rely on it for the whole year.”',
        why: 'A test part-way through the year (an interim test) shows the control worked up to July. Before relying on it for the whole year, get evidence that it kept working from August to December. That top-up is called a roll-forward.',
      },
      {
        type: 'tip',
        body: 'When the ground shifts mid-audit, pick the option that keeps quality and is open about it. A cut budget, a missing skill or facts that undermine the plan call for the same moves: reprioritize by risk, bring in the skill, or pause and brief whoever approved the audit. Options that quietly carry on, or act alone without telling anyone, are the traps.',
      },
      {
        type: 'check',
        question:
          'Three weeks into a payroll audit, the IS auditor learns that payroll moved to an outsourced provider two months ago, which the plan never covered. What should the chief audit executive do FIRST?',
        options: [
          'Finish the planned work and mention the move in the report',
          'Add the provider to the scope and start testing it today',
          'Pause and present rescoping options to the audit committee',
          'Ask the payroll manager which areas still need testing',
        ],
        correctIndex: 2,
        explanation:
          'New facts have undermined the basis of the approved plan, so the scope decision goes to the audit committee, which oversees audit coverage, with the options laid out. Adding the provider at once is tempting because it looks thorough, but it changes the engagement without approval and may stretch the team past its budget and skills.',
      },
      {
        type: 'check',
        question:
          'Before substantive testing begins on a loan system audit, the audit budget is cut by a fifth. What is the audit manager’s BEST response?',
        options: [
          'Drop the lowest-risk procedures and disclose the narrower scope',
          'Cut each remaining sample by a fifth to share the impact',
          'Accept management’s written assurances in place of data tests',
          'Stop fieldwork and report on the work done so far',
        ],
        correctIndex: 0,
        explanation:
          'Effort goes where risk is highest, and readers are told what was not covered. Cutting each sample evenly is tempting because it feels fair, but it weakens the high-risk tests as much as the low-risk ones. Written assurances are management’s own word: weak evidence that cannot stand in for testing the data.',
      },
      {
        type: 'check',
        question:
          'In month seven, an IS auditor tests a password-reset control and finds it effective. The audit covers the full year. What should the IS auditor do before relying on the control for the year?',
        options: [
          'Rely on it, since password controls rarely change',
          'Obtain management’s written statement that nothing changed',
          'Retest the control from January with a fresh sample',
          'Test that the control kept operating in the later months',
        ],
        correctIndex: 3,
        explanation:
          'An interim test covers only the months tested, so the IS auditor extends it with evidence for the rest of the year (a roll-forward). Retesting from January is tempting because it feels complete, but the early months are already covered; the gap is the later ones.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-fraud',
    certId: 'cisa',
    domainId: '1',
    order: 10,
    title: 'When the evidence points to fraud',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ITAF Standard 1207 (Irregularities and Illegal Acts)',
      'ITAF Standard 1205 (Evidence)',
      'ISA 240 (Revised) (The Auditor’s Responsibilities Relating to Fraud in an Audit of Financial Statements) (analogous guidance)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: D1_GAPS_REVIEWED,
    topics: ['1B3'],
    prepares: ['d1_069', 'd1_084', 'd1_141'],
    notes: ['1B3.5'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit evidence',
        title: 'When the evidence points to fraud',
        subtitle: 'What the IS auditor owes the organization when warning signs appear, and where that duty stops.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Fraud is deliberate deception for gain, such as fake suppliers or altered records. Management owns preventing and detecting it, through controls. The IS (information systems) auditor is not a fraud investigator, but must stay alert to warning signs (red flags) and handle them so the evidence survives and the right people decide what happens next.',
      },
      {
        type: 'stack',
        heading: 'The fraud triangle',
        layers: [
          { label: 'Pressure', note: 'A need that pushes someone toward fraud, such as debt or impossible targets' },
          { label: 'Opportunity', note: 'A weakness that lets fraud happen and stay hidden, such as one person running a whole process' },
          { label: 'Rationalization', note: 'The story that excuses it: “I am underpaid”, “I will pay it back”' },
        ],
        caption:
          'Fraud usually needs all three. Opportunity is the part the IS auditor can see and test, so in an audit it is usually the strongest red flag: sole control of a process, nobody reviewing it, and a person who never takes leave.',
      },
      {
        type: 'flow',
        heading: 'From red flag to hand-off',
        steps: [
          { label: 'Record the facts', note: 'What was seen, where and when, without accusing anyone' },
          { label: 'Preserve the evidence', note: 'Secure originals and record who held each item, and when (chain of custody)' },
          { label: 'Escalate', note: 'Tell the head of audit (chief audit executive), following the fraud procedure' },
          {
            label: 'Go higher if needed',
            note: 'If management may be involved or a regulator must be told, tell the audit committee (board members overseeing audit) and the lawyers (legal counsel) promptly',
          },
          { label: 'Support the investigators', note: 'Help the forensic specialists (trained fraud investigators); run no inquiry of your own' },
        ],
        caption: 'Keep it confidential: questioning people or widening your testing first can alert a suspect or spoil evidence.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Stay in your role: as the IS auditor, you document, preserve and escalate; trained investigators and lawyers investigate. If you are asked to sit in on an interview, bring a second person and take notes as it happens. A whistleblower’s tip about an area already in scope gets targeted, confidential testing within that scope.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“File the evidence in the audit archive with the other work papers.”',
        why: 'A routine archive does not record who handled each item and when. Evidence that may reach a court or a regulator needs a documented chain of custody, or it may be unusable.',
      },
      {
        type: 'tip',
        body: 'In fraud stems, sort the options by role. Confronting the suspect, investigating alone, going straight to the police, or handing the matter to the suspect’s own manager are the traps. The best answer usually protects the evidence and moves the matter up the agreed channel, above anyone who may be involved.',
      },
      {
        type: 'check',
        question:
          'An IS auditor is reviewing a warehouse inventory system. Which observation is the MOST significant fraud red flag to follow up?',
        options: [
          'A clerk who suggested several fixes to the inventory system',
          'A supervisor who adjusts stock counts alone and never takes leave',
          'A clerk who often complains openly that the warehouse pays poorly',
          'A supervisor with fifteen years in the same warehouse role',
        ],
        correctIndex: 1,
        explanation:
          'Sole, unreviewed control is opportunity, the part of the fraud triangle an IS auditor can observe and test, and skipping leave keeps anyone else from seeing the work. The pay complaints are tempting because they hint at pressure, but on their own they are common and show no way to commit or hide fraud. Long tenure alone is not a red flag either.',
      },
      {
        type: 'check',
        question:
          'An IS auditor has secured system logs that suggest a manager altered suppliers’ bids for a contract, and the matter may go to court. What is MOST important in handling the logs?',
        options: [
          'Store them in the audit team’s secure shared folder',
          'Send copies to the manager’s director for an explanation',
          'Record who has held each item, from collection onward',
          'Print them so the content cannot be changed later',
        ],
        correctIndex: 2,
        explanation:
          'Evidence that may reach court must show an unbroken record of who held it and when, a chain of custody. The secure folder is tempting because it is protected, but it does not record each hand-off, so the evidence could be challenged.',
      },
      {
        type: 'check',
        question:
          'A forensic firm brought in by the audit committee to investigate a kickback scheme asks the IS auditor for the system logs the IS auditor secured. What should the IS auditor do?',
        options: [
          'Analyze the logs first to confirm they really show fraud',
          'Refuse, since the firm sits outside the audit function’s reporting line',
          'Ask the suspect’s manager to approve releasing the logs',
          'Release the logs with a custody record; tell the head of audit',
        ],
        correctIndex: 3,
        explanation:
          'Once authorized specialists lead the investigation, the IS auditor supports them, keeps the chain of custody unbroken and keeps the head of audit informed. Analyzing the logs first is tempting because it seems diligent, but it is the parallel investigation that can disturb evidence and blur who owns the conclusions.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-online-audit',
    certId: 'cisa',
    domainId: '1',
    order: 11,
    title: 'Auditing transactions as they happen',
    minutes: 5,
    provenance: PROVENANCE,
    references: ['ITAF Standard 1205 (Evidence)', 'IIA GTAG: Continuous Auditing and Monitoring, 3rd Edition (2025)'],
    outlineVersion: OUTLINE,
    lastReviewed: D1_GAPS_REVIEWED,
    topics: ['1B4'],
    prepares: ['d1_046', 'd1_208', 'd1_209'],
    notes: ['1B4.3'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit data analytics',
        title: 'Auditing transactions as they happen',
        subtitle: 'Four audit tools that work inside live systems, and how to pick the one a question is asking for.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Some systems process so much, so fast, or leave so little trail that a review months later comes too late. Online audit techniques are audit tools built into or running beside a live application, so the IS (information systems) auditor sees transactions as they are processed. Each one trades coverage against cost and load on the live (production) system.',
      },
      {
        type: 'stack',
        heading: 'Four online techniques',
        layers: [
          {
            label: 'Embedded audit module (EAM)',
            note: 'Audit code in the application checks every transaction against audit’s rules, logging exceptions to an audit file',
          },
          { label: 'Snapshots', note: 'Record chosen transactions at set points, building a step-by-step trail; blind between those points' },
          { label: 'Audit hooks', note: 'Small triggers that flag a few chosen risky transactions at once' },
          {
            label: 'Continuous and intermittent simulation (CIS)',
            note: 'Reruns only transactions meeting set criteria through audit’s copy of the logic; logs any difference',
          },
        ],
        caption:
          'That audit file is often called SCARF (systems control audit review file). EAM sees the most but is the hardest to build and adds load; hooks are the simplest.',
      },
      {
        type: 'analogy',
        heading: 'Think of a factory inspector',
        body: 'An inspector can check every product as it leaves the line, photograph chosen items at each station to see how they were assembled, or fit a sensor that buzzes only when a part is the wrong size. Each costs a different amount and misses different things. The right choice depends on what the inspector needs to know.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Whichever tool fits, it must stay audit’s own. As the IS auditor, keep the rules and the audit file under audit’s control, test them before relying on them, and make sure the tool does not slow the live system unacceptably. If people outside audit could change the rules, the results stop being independent evidence.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The embedded module should block suspicious transactions, not just flag them.”',
        why: 'Blocking is an operational control that management owns, and holding transactions in line can slow critical systems. Audit modules flag and report; management decides what to stop.',
      },
      {
        type: 'tip',
        body: 'Read the stem for cue words. “Every transaction” or “no gaps”: embedded audit modules. “Trace” or “each step of processing”: snapshots. An alert on a few specific events, or a small team and budget: audit hooks. “Only transactions that meet set criteria”, rechecked against audit’s own logic: continuous and intermittent simulation.',
      },
      {
        type: 'check',
        question:
          'At a card issuer, the IS auditor must screen every purchase against audit rules as it is processed, with none skipped. Which technique BEST fits?',
        options: [
          'Snapshots of purchases at chosen processing steps',
          'Audit hooks on purchases above a set amount',
          'An embedded audit module inside the card system',
          'Weekly analytics over an extract of purchases',
        ],
        correctIndex: 2,
        explanation:
          'Only an embedded audit module checks each transaction as it is processed, so none slips past. Audit hooks are tempting because they react at once, but they watch only the purchases that trip a trigger, such as large amounts.',
      },
      {
        type: 'check',
        question:
          'A hospital’s small audit staff, with little funding, must know at once whenever administrator rights are granted outside working hours. Which technique is BEST?',
        options: [
          'Audit hooks that flag after-hours grants of those rights',
          'Embedded modules screening every change to user access',
          'Snapshots of access changes at each processing step',
          'Simulation that reruns selected access changes',
        ],
        correctIndex: 0,
        explanation:
          'Audit hooks watch for a few specific risky events and are the simplest to build, which suits a small team and budget. Embedded modules are tempting because they screen everything, but they cost far more than this narrow need justifies.',
      },
      {
        type: 'check',
        question:
          'To free up audit time, the IT operations team offers to take over the rules and exception file of audit’s embedded module. What is the IS auditor’s BEST response?',
        options: [
          'Agree, if operations sends audit a monthly change report',
          'Agree, and have the module stop flagged items for review',
          'Switch off the module and sample transactions once a year',
          'Keep the rules and the exception file under audit’s control',
        ],
        correctIndex: 3,
        explanation:
          'If people outside audit can change the rules or the file, the module stops being independent evidence. A monthly change report is tempting because it adds visibility, but it tells audit about changes after the fact; it does not prevent them.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-findings',
    certId: 'cisa',
    domainId: '1',
    order: 12,
    title: 'Writing a finding that gets fixed',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ITAF Standard 1401 (Reporting)',
      'ITAF Standard 1008 (Criteria)',
      'IIA Global Internal Audit Standards (2024), Standard 15.1 (Final Engagement Communication)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: D1_GAPS_REVIEWED,
    topics: ['1B5'],
    prepares: ['d1_195', 'd1_196', 'd1_197'],
    notes: ['1B5.1'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit reporting',
        title: 'Writing a finding that gets fixed',
        subtitle: 'The five parts of a sound finding, and why the recommendation must aim at the cause.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'An audit finding is a documented gap between what should happen and what does happen. A finding that is vague, overstated or missing its cause gets disputed, or gets a surface fix while the real problem stays. A well-built finding gives management what it needs to act.',
      },
      {
        type: 'flow',
        heading: 'The parts of a finding',
        steps: [
          { label: 'Criteria', note: 'What should happen, from a policy, standard, law, contract or agreed framework' },
          { label: 'Condition', note: 'What the IS (information systems) auditor actually found, backed by evidence' },
          { label: 'Cause', note: 'Why the gap exists: the root cause, not the symptom' },
          { label: 'Effect', note: 'The risk or harm if nothing changes, in business terms' },
          { label: 'Recommendation', note: 'A fix aimed at the root cause; management decides how to carry it out' },
        ],
        caption:
          'What should be, what is, why, so what, then the fix. A missing part shows: without criteria the finding reads as opinion; without the effect the rating looks arbitrary.',
      },
      {
        type: 'analogy',
        heading: 'Think of a doctor',
        body: 'A good doctor’s note says what healthy looks like, what the tests showed, what is causing it and what happens if it is left alone, then treats the cause. Painkillers for a broken bone would quiet the complaint and leave the break. A recommendation that only cleans up the exceptions found is the painkiller.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'As the IS auditor, you recommend; management decides and implements. So every finding must stand on objective ground: evidence for the condition, and criteria from policy or, when no policy applies, a recognized standard agreed for the engagement. Never personal preference, and never softer wording for senior people.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Recommend correcting the twelve exceptions in the sample.”',
        why: 'Cleaning up the exceptions treats the symptom. Unless the process that let them through changes, the same gap reappears next quarter. Deal with live exposures, but aim the recommendation at the root cause.',
      },
      {
        type: 'tip',
        body: 'For the best recommendation, find the cause in the stem (often a system setting or a missing step) and pick the option that changes it. Reminders, retraining and one-off cleanups are usually the runners-up. If management disputes a rating but not the facts, ask which part of the finding is weak; often it is the effect.',
      },
      {
        type: 'check',
        question:
          'An IS auditor finds that 15 of 60 sampled supplier-record changes were never approved, because the system applies a change before the approval step runs. Which recommendation is BEST?',
        options: [
          'Have the 15 changes approved after the fact',
          'Make the system hold changes until approval is recorded',
          'Remind staff of the supplier-change approval policy',
          'Add a monthly report of unapproved changes for the manager',
        ],
        correctIndex: 1,
        explanation:
          'The cause is the system applying changes before approval, so the fix makes approval a required step. Approving the 15 after the fact is tempting and may be needed for the live exposure, but it leaves the gap open for the next change.',
      },
      {
        type: 'check',
        question:
          'Management accepts the facts in a draft finding on shared administrator accounts, but asks why it is rated high. Which part of the finding is MOST likely weak?',
        options: [
          'The standard the shared accounts fail to meet',
          'The list of shared accounts and who uses them',
          'The reason the accounts were never split up',
          'The business harm if the accounts are misused',
        ],
        correctIndex: 3,
        explanation:
          'A rating rests on the effect: what could go wrong for the business. Management already accepts the facts, so the condition is not in dispute. The cause is tempting, but it explains why the gap exists, not how serious it is.',
      },
      {
        type: 'check',
        question:
          'At a startup, an IS auditor finds that backups have never been test-restored, but no internal policy requires testing. What is the BEST basis for reporting it?',
        options: [
          'A recognized standard agreed as criteria for the audit',
          'The IS auditor’s own experience of sound practice',
          'The IT manager’s view of acceptable backup practice',
          'Practices the audit team saw at similar startups',
        ],
        correctIndex: 0,
        explanation:
          'Criteria must be objective and widely recognized, ideally agreed at planning, so a recognized standard gives the finding a defensible basis. The IS auditor’s own experience is tempting because it is expert, but it is personal judgment that management can dismiss as opinion.',
      },
    ],
  },
  {
    id: 'cisa-l-d1-quality',
    certId: 'cisa',
    domainId: '1',
    order: 13,
    title: 'Who audits the auditors?',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'IIA Global Internal Audit Standards (2024), Standard 8.3 (Quality)',
      'IIA Global Internal Audit Standards (2024), Standard 8.4 (External Quality Assessment)',
      'IIA Global Internal Audit Standards (2024), Standard 12.1 (Internal Quality Assessment)',
      'ITAF Standard 1204 (Performance and Supervision)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: D1_GAPS_REVIEWED,
    topics: ['1B6'],
    prepares: ['d1_065', 'd1_076', 'd1_217'],
    notes: ['1B6.3', '1B6.2', '1B6.1', '1B6.4'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 1 · Audit quality',
        title: 'Who audits the auditors?',
        subtitle: 'The layers of quality checking that make an audit function’s own work trustworthy.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'An audit function asks others to prove their controls work, so it must be able to prove its own work is sound. Its quality assurance and improvement program is that proof: checks built into every engagement, periodic reviews inside the function, an independent outside review, and action on what they find.',
        list: {
          lead: 'An audit function asks others to prove their controls work, so it must be able to prove its own work is sound. Its quality assurance and improvement program is that proof:',
          items: ['checks| built into every engagement', 'periodic reviews| inside the function', 'an independent outside review', 'action| on what they find'],
        },
      },
      {
        type: 'stack',
        heading: 'Three layers of quality checking',
        layers: [
          {
            label: 'Ongoing monitoring',
            note: 'Supervisors review work papers on every engagement as evidence arrives; the one layer that stops a flaw before a report goes out',
          },
          {
            label: 'Periodic internal assessment',
            note: 'Auditors who did not do the work review completed engagements and the method, for example once a year',
          },
          {
            label: 'External quality assessment',
            note: 'A qualified assessor independent of the whole organization reviews the function at least once every five years',
          },
        ],
        caption:
          'Each layer adds to the ones before it; none replaces another. The outside review can be a full external assessment, or a self-assessment checked and confirmed by a qualified outside assessor.',
      },
      {
        type: 'analogy',
        heading: 'Think of a restaurant kitchen',
        body: 'The head chef tastes every plate before it leaves the kitchen. Now and then, a chef from another branch inspects how the kitchen runs. Every few years, an outside inspector visits. Only the head chef stops a bad plate reaching a diner, but only the outsider can say the whole kitchen meets the standard.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Judge each layer by who does the checking. A team reviewing its own files is not independent enough for a periodic review, and another department of the same company is not independent enough for the external one. A missing or overdue external assessment is a significant weakness to report to the audit committee.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Our new tool checks each work paper for sign-offs and attachments, so supervisors can stop reviewing them.”',
        why: 'Tools check form, not substance. Only a reviewer can judge whether the evidence is enough and the conclusion follows from it. An unsupported conclusion is the most serious quality defect, and a checklist cannot spot one.',
      },
      {
        type: 'tip',
        body: 'Ask two questions of any quality option: who does the checking, and are they independent enough for this layer? “External” means outside the organization, not just outside audit. Only supervision stops a flaw before the report. For improvement, the best measure is whether the problem stops coming back, not how many people were trained.',
      },
      {
        type: 'check',
        question:
          'To save money, the board suggests that the company’s risk management team perform the audit function’s external quality assessment. What should the chief audit executive (the head of audit) recommend?',
        options: [
          'Accept, since the risk team is outside the audit function',
          'Use a qualified assessor who is independent of the company',
          'Replace the external review with a deeper self-assessment',
          'Accept, provided the risk team follows a recognized checklist',
        ],
        correctIndex: 1,
        explanation:
          'External means independent of the whole organization, and the assessor must be qualified. The risk team is tempting because it sits outside audit, but it works for the same company, so its view is not independent. A self-assessment counts only when a qualified outsider validates it.',
      },
      {
        type: 'check',
        question: 'An audit director is setting up periodic internal reviews of completed engagements. Who should perform them?',
        options: [
          'The team that ran each engagement, since it knows the files',
          'The external auditor, as part of its yearly financial audit',
          'Auditors from other teams who had no part in the work',
          'The auditees, through a survey sent after each audit',
        ],
        correctIndex: 2,
        explanation:
          'Periodic internal reviews need people who did not do the work, so they can judge it impartially. The original team is tempting because it knows the files best, but knowledge is not objectivity: people rarely spot the gaps in their own work.',
      },
      {
        type: 'check',
        question:
          'Reviews found, three years running, that conclusions in work papers were not linked to their evidence. The function changed its review checklist. What BEST shows the change worked?',
        options: [
          'Fewer files with the gap in the next review cycles',
          'The number of managers trained on the new checklist',
          'The share of files reviewed using the new checklist',
          'Better scores from auditees in the yearly survey',
        ],
        correctIndex: 0,
        explanation:
          'The aim was to stop the defect, so the best evidence is that later reviews find it less often. Counting files reviewed with the new checklist is tempting because it shows the change was adopted, but using a checklist does not prove conclusions are now linked to evidence.',
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
    notes: ['2A2.1', '2A2.3', '2A2.4'],
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
        body: 'Governance decides what the organization needs from IT and how much risk it will take (its risk appetite), then checks that it got it. Management decides how to deliver. A well-aligned IT strategy traces every major investment back to a business goal. Chargeback, billing each business unit for the IT it uses, makes the cost of demand visible to the people who create it.',
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
          'COBIT 2019 (ISACA’s framework for governing and managing enterprise IT): governance is evaluate, direct, monitor; management is plan, build, run, monitor.',
      },
      {
        // Review fix: replaces a five-layer stack. Introduces the three lines in
        // plain words, and places the steering committee at management level.
        type: 'idea',
        heading: 'Who does what',
        body: 'Many organizations use the Three Lines Model from the Institute of Internal Auditors. The first line runs a process and owns its risk. The second line (risk and compliance) advises and challenges them. Internal audit, the third line, gives independent assurance to the board. An IT steering committee is a management group of business and IT leaders that ranks IT investments against strategy.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Governance comes before technology. As the IS (information systems) auditor, you check for clear direction, ownership and approval at the right level, and whether IT strategy traces to business goals. You test whether the board gets the information it needs to monitor. You recommend; the board and management decide.',
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
    notes: ['2A5.2', '2A5.1'],
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
          { label: 'Mitigate', note: 'Also called reduce: add controls to cut likelihood or impact' },
          { label: 'Transfer', note: 'Also called share: shift part of the financial impact, for example through insurance' },
          { label: 'Accept', note: 'Live with it, formally and within risk appetite' },
          { label: 'Avoid', note: 'Stop the activity that creates the risk' },
        ],
        caption: 'What is left after a response is residual risk. Transfer moves some of the cost, never the accountability.',
      },
      {
        // Review fix: was a second structure scene; now one plain idea with an example.
        type: 'idea',
        heading: 'Appetite vs tolerance',
        body: 'Risk appetite is how much risk the board will take to pursue its goals, stated broadly: “a low risk appetite for outages”. Risk tolerance turns it into a measurable limit: “the payments system may be down no more than two hours a month”. A breach of tolerance triggers escalation. A key risk indicator (KRI) asks whether exposure is rising; a key control indicator (KCI) asks whether a control is working. A risk register records each risk, its owner and the agreed response.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'The business owns risk. As the IS (information systems) auditor, you never accept a risk on management’s behalf, and neither does IT. You check that each risk has an owner at the right level, that acceptance is formal and within risk appetite, and that responses are tracked. Then you report the gaps.',
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
          'The business owner of the sales process',
          'The project manager who raised the risk',
          'The database administrator who maintains the system',
        ],
        correctIndex: 1,
        explanation:
          'The business owner who relies on the system owns its risk and may accept it within the risk appetite and their authority. The security manager is tempting because they understand the risk best, but advising is not owning.',
      },
      {
        type: 'check',
        question:
          'A company buys breach insurance and then cancels its planned data encryption project. What should concern the IS auditor MOST?',
        options: [
          'The insurance premium may rise next year',
          'The insurer may take several weeks to pay a claim',
          'Insurance cannot transfer accountability for the breach',
          'The insurer may ask to review the company’s controls',
        ],
        correctIndex: 2,
        explanation:
          'Transfer moves part of the financial impact; the company still owns the breach, its regulatory duties and its customers’ trust. A slow payout is tempting because it hurts cash flow, but even a full, prompt payout would leave that harm in place.',
      },
      {
        type: 'check',
        question:
          'A board states a low risk appetite for service outages. The IT team then sets its own outage limits for each system. What should the IS auditor recommend as BEST?',
        options: [
          'Have business owners propose tolerances within risk appetite',
          'Keep the IT limits, since IT understands the systems best',
          'Replace all limits with one company-wide outage target',
          'Suspend the limits until the board can review them',
        ],
        correctIndex: 0,
        explanation:
          'Tolerances turn the board’s risk appetite into measurable limits; the owners who bear the impact propose them and senior management approves them. Keeping IT’s limits is tempting because IT knows the systems, but IT does not own the business impact.',
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
    notes: ['2A3.1', '2A1.3', '2A4.3'],
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
        body: 'Management maps each legal duty to the controls that meet it and gives each control a named owner. One control often serves several laws, so it is tested once. Enterprise architecture records today’s state first, then the target the business needs. The gap between them becomes the roadmap.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
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
          'What a document requires decides its type, not its label. A specific, mandatory rule is a standard, so the IS auditor tests against it, reports the gaps and may suggest renaming it. Accepting the teams’ view is tempting because the title supports them, but it lets a real requirement be treated as optional. Rewriting documents is management’s job.',
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
    notes: ['2A7.1', '2A6.1', '2A7.3'],
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
        caption: 'Data minimization, collecting and keeping only what you need, applies at every step.',
      },
      {
        type: 'idea',
        heading: 'Owner vs custodian',
        body: 'The data owner is a business leader accountable for a data set. They set its classification and approve who gets access. The custodian, often IT or a cloud provider, stores and protects the data under the owner’s rules. Running a system does not make IT the owner, and moving data to a vendor moves custody, never ownership.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Know what you hold before you protect it, and make accountability explicit. As the IS (information systems) auditor, you check that someone senior is accountable for privacy, that the organization knows what personal data it keeps and why, and that business leaders, not IT, decide how their data is classified and shared. You report the gaps; the owners fix them.',
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
          'A customer asks a retailer for a copy of all data it holds about them. Staff search five systems and cannot be sure they found everything. What root cause should the IS auditor report?',
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
          'The chief information security officer, who sets access policy',
        ],
        correctIndex: 2,
        explanation:
          'The business leader accountable for salary data approves access to it. The administrator is the custodian who applies that decision; setting access up is not the same as deciding who should have it. The line manager is tempting because they know why access is wanted, but they can confirm the need, not grant access to data they do not own. The chief information security officer sets the rules for access, not who may see salary data.',
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
    notes: ['2B2.2', '2B2.3'],
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
        layout: 'timeline',
        heading: 'The vendor life cycle',
        steps: [
          { label: 'Decide to source', note: 'Weigh risk, knowledge loss and flexibility, not price alone' },
          { label: 'Due diligence', note: 'Depth set by how critical the supplier is: financial health, security, recovery, legal' },
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
        body: 'For a critical vendor, ask for independent evidence, such as a System and Organization Controls (SOC) 2 Type 2 report: an independent auditor’s test of the vendor’s controls over a period, not one day. Read it. Check that the scope covers your service and note exceptions. It also lists controls you must run yourself, called complementary user entity controls, such as removing departing employees’ access.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
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
        body: 'Effort follows risk: the more the business leans on a supplier, the closer the look. A single report, certificate or promise is never the whole picture, and a contract nobody watches protects no one. Plan the way out on the day you sign; once the contract is live, most of your leverage is gone.',
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
          'A named bank manager reviews reports and acts on missed targets',
          'The vendor committee approves a revised SLA with tighter targets',
          'Move the data center to a provider with a better record',
        ],
        correctIndex: 1,
        explanation:
          'The warning signs were in the reports; nobody at the bank owned reading them and acting. Outsourcing moved the work, not the accountability. Stricter penalties or tighter approved targets are tempting, but neither works if no one notices the missed targets. A new provider would face the same blind spot.',
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
    notes: ['2B1.1', '2B3.1', '2B4.1'],
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
        body: 'The head chef makes every cook take vacation and swap stations, so nobody’s station goes unseen for long. Plates served shows how busy the kitchen is; diners coming back shows whether it is good. Tasting every plate catches bad ones, but only better recipes and training stop them being made.',
      },
      {
        type: 'stack',
        heading: 'Three signs IT is well run',
        layers: [
          {
            label: 'Nobody hides their work',
            note: 'Job rotation and mandatory vacation mean someone else regularly does, and sees, each critical job',
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
        heading: 'The IS auditor’s lens',
        body: 'Busy is not the same as well run. As the IS (information systems) auditor, you look past effort to evidence: someone else sees privileged work, measures track the business outcome, and defects are prevented by a better process, not only caught at the end. You recommend; management acts.',
      },
      {
        type: 'trap',
        heading: 'The hero trap',
        trap: '“Our database administrator never takes vacation and knows everything, so they are our most reliable person.”',
        why: 'When someone with powerful access never steps away, no one else ever sees their work, so errors or fraud can stay hidden. Mandatory vacation and job rotation exist to expose that. The trap praises the very pattern these controls watch for.',
      },
      {
        type: 'tip',
        body: 'When a question praises effort, such as long hours, courses completed or extra testing, ask what would prove the goal is met. For a measure, ask whether the number could improve while the goal gets worse. The “best” answer usually brings in an independent reviewer or fixes how work is done, not more of the same activity.',
      },
      {
        type: 'check',
        question:
          'An IS auditor recommends job rotation for a payments team. The manager objects that the staff are experts and rotation would slow the work. Which reply BEST explains the control’s value?',
        options: [
          'A newcomer in each role may uncover problems left hidden',
          'Rotation builds broader skills, which lifts staff morale over time',
          'Audit standards require rotation for payments staff',
          'The HR policy the board approved already calls for rotation',
        ],
        correctIndex: 0,
        explanation:
          'Rotation is a fraud and error control: a fresh person doing the job sees what the last one may have hidden. Broader skills are tempting because they are a real benefit, but they are a side effect, not why IS auditors recommend it. Pointing to a policy says who requires rotation, not why it works. The manager still decides; the IS auditor explains the risk.',
      },
      {
        type: 'check',
        question:
          'Course completions at a firm rose from 60 to 98 percent this year. Failures on simulated phishing tests (fake scam emails sent to test staff) did not change. What should the IS auditor conclude is MOST likely?',
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

  // Plan item L5 (2026-10-21): segregation of duties in IT, and choosing a risk response.
  {
    id: 'cisa-l-d2-sod',
    certId: 'cisa',
    domainId: '2',
    order: 7,
    title: 'Splitting duties in IT',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 27002:2022 Control 5.3 (Segregation of Duties)',
      'NIST SP 800-53 Rev 5 AC-5 (Separation of Duties)',
      'COBIT 2019 DSS06.03 (Manage roles, responsibilities, access privileges and levels of authority)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: L3_L5_REVIEWED,
    topics: ['2A2'],
    prepares: ['d2_008', 'd2_037', 'd2_206'],
    notes: ['2A2.6'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · IT governance',
        title: 'Splitting duties in IT',
        subtitle: 'Why nobody should be able to make a change and hide it, and what to do when a team is too small to split the work.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Segregation of duties (SoD) splits a sensitive task so no single person can start, approve, carry out and hide it. Wrongdoing then needs a partner (collusion), which is harder to arrange and easier to catch. Business process owners decide which duties conflict; IT builds the roles that enforce the split.',
      },
      {
        type: 'stack',
        heading: 'Four IT jobs to keep apart',
        layers: [
          { label: 'Development', note: 'Writes and changes code; does not move it into the live (production) systems' },
          { label: 'Operations', note: 'Runs production and moves approved changes into it' },
          { label: 'Database administration', note: 'Looks after the databases; does not grant user access' },
          { label: 'Security administration', note: 'Grants access and guards the logs; does not change code or data' },
        ],
        caption:
          'The most dangerous mix, a toxic combination, is the power to change code or data and also alter the logs that would reveal it. Access builds up as people change jobs, so roles are reviewed regularly.',
      },
      {
        type: 'analogy',
        heading: 'Think of a shop till',
        body: 'In a shop, the cashier takes the money, a supervisor approves refunds, and someone else counts the till at closing. If one person did all three, a fake refund could cover cash taken from the till, and the count would still balance. Splitting the jobs means a theft needs two people to agree.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'A small team has the same risk; it needs a different control. As the IS (information systems) auditor, you look first for anyone who can change code or data and also hide it. Where duties cannot be split, look for a compensating control: another check on the same risk, such as an independent review of change logs.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The biggest segregation of duties worry is a user who can read many systems.”',
        why: 'Broad read access is a confidentiality issue. The bigger segregation concern is the power to change data or code and also conceal it, for example by editing the logs.',
      },
      {
        type: 'tip',
        body: 'Hunt for the person who can both do and hide. In a small team, choose the independent after-the-fact review over self-reporting, signed pledges or a note in the risk register. When asked who defines conflicting duties, look for the business process owners, not IT security alone. You recommend; management decides.',
      },
      {
        type: 'check',
        question:
          'Which access held by one IT employee should worry the IS auditor MOST from a segregation of duties view?',
        options: [
          'A tester who can view, but not change, live data',
          'A developer who can change payment code and clear its logs',
          'An analyst who reads logs but cannot edit them',
          'A help desk agent who resets passwords after identity checks',
        ],
        correctIndex: 1,
        explanation:
          'Changing payment code and clearing the logs lets one person commit an error or fraud and erase the trail. Read-only access to live data is tempting to flag, but it raises confidentiality questions, not the ability to change something and conceal it.',
      },
      {
        type: 'check',
        question:
          'At an eight-person software firm, one administrator can both release code to production and edit the customer database. Hiring is not an option. Which compensating control is BEST?',
        options: [
          'The administrator signs a yearly conduct pledge',
          'Management records the conflict in the risk register',
          'The owner repeats each database update to confirm it',
          'A second person checks change logs against tickets',
        ],
        correctIndex: 3,
        explanation:
          'An independent person checking the logs of production and database changes against approved tickets detects anything done outside the process; it rests on logs because the administrator can change data directly. Recording the conflict in the register is tempting because it looks formal, but it documents the risk without detecting a single wrong change. Repeating every update is impractical.',
      },
      {
        type: 'check',
        question:
          'Security staff alone wrote the rules that flag clashing roles in a new purchasing system; purchasing managers were never consulted. What should concern the IS auditor MOST?',
        options: [
          'Risky pairs of purchasing tasks may go undetected',
          'Staff may be blocked from tasks their jobs need',
          'Security staff may give themselves purchasing roles',
          'The rules may delay the system’s launch',
        ],
        correctIndex: 0,
        explanation:
          'Only the people who run purchasing know which task pairs let someone order, receive and pay for goods alone, so rules written without them can miss the dangerous ones. Blocked tasks are tempting because users would complain loudly, but that is a nuisance that gets noticed and fixed; a missed fraud path stays silent.',
      },
    ],
  },
  {
    id: 'cisa-l-d2-risk-response',
    certId: 'cisa',
    domainId: '2',
    order: 8,
    title: 'Choosing a risk response',
    minutes: 5,
    provenance: PROVENANCE,
    references: ['ISO 31000:2018 (Risk Management)', 'COBIT 2019 APO12 (Managed Risk)', 'COSO ERM (2017)'],
    outlineVersion: OUTLINE,
    lastReviewed: FIXES_145_REVIEWED,
    topics: ['2A5'],
    prepares: ['d2_022', 'd2_089', 'd2_133'],
    notes: ['2A5.4'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · Risk management',
        title: 'Choosing a risk response',
        subtitle: 'Accept, reduce, share or avoid: how to pick the response that really brings a risk within limits.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A risk response, or risk treatment, is management’s choice of what to do about a risk: accept it, mitigate (reduce) it, transfer (share) part of it, or avoid it. The aim is that the residual risk, what remains afterward, fits within the risk appetite: the amount of risk the board is willing to live with. The risk owner chooses; the IS (information systems) auditor checks that the choice holds up.',
      },
      {
        type: 'flow',
        heading: 'Picking a response',
        steps: [
          { label: 'Within appetite?', note: 'Yes: accept it, with the owner’s decision recorded' },
          { label: 'Can a control bring it within appetite?', note: 'Yes: mitigate, if the loss it prevents justifies its cost' },
          {
            label: 'Can sharing the cost bring it within appetite?',
            note: 'Yes: transfer it through insurance or a contract. Only the bill is shared; the organization still answers for the risk',
          },
          { label: 'Nothing brings it within?', note: 'Then avoid: stop or redesign the activity' },
        ],
        caption:
          'Use the order as a guide, not a rule: management weighs the cost and benefit of each option and often combines them, such as mitigating a risk and transferring part of it through insurance. A short budget does not change the logic: fund legal and regulatory duties first, then the fixes that cut the most loss per dollar, and escalate any residual risk still above risk appetite to senior management for a documented decision.',
      },
      {
        type: 'analogy',
        heading: 'Think of a mountain road',
        body: 'A family plans a drive on a road with rockfalls. If the risk is small, they go. If better tires make it safe enough, they buy them. Travel insurance pays the bills but does not stop a rock. If nothing makes the trip safe enough, they take another road or stay home.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'A response must change the exposure, not just the paperwork. As the IS auditor, you check that each significant risk has an owned response that brings the residual risk within appetite, and that risks still above appetite, with no money to fix them, reach senior management for a documented decision. You recommend; management chooses.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The fix is expensive, so accept the risk.”',
        why: 'Acceptance suits risks within appetite. A severe risk with a workable fix is mitigated. If no control or transfer brings it within the appetite the board set, the activity is stopped or redesigned.',
      },
      {
        type: 'tip',
        body: 'First ask: is the risk inside appetite? Inside: accept and record it. Outside: mitigate if a control works, transfer the money side, avoid if nothing works. Insurance sized to the measured exposure beats the biggest or cheapest policy. Short budget: legal duties first, then loss reduced per dollar.',
      },
      {
        type: 'check',
        question:
          'A hospital wants to share patient records with a marketing partner. The privacy risk is far above appetite, and no control or contract brings it down enough. What should the IS auditor recommend?',
        options: [
          'Proceed once the chief executive signs a risk acceptance',
          'Add monitoring of how the partner uses the records',
          'Rely on the partner’s contract to carry the risk',
          'Drop or redesign the data-sharing plan',
        ],
        correctIndex: 3,
        explanation:
          'When no control or transfer brings a risk within appetite, stop or redesign the activity. A chief executive’s signature is tempting because it looks like authority, but risk outside appetite is never fixed by one executive signing an acceptance: the board set that appetite, and the exposure stays exactly as large.',
      },
      {
        type: 'check',
        question:
          'This year’s budget funds fixes for 6 of the 10 high-priority IT risks, and 3 of the 10 face legal deadlines. How should the IS auditor recommend ranking them?',
        options: [
          'Start with the 3 legal deadlines, then the best-value fixes',
          'The 6 with the highest impact, whatever the deadlines',
          'Wait for next year’s larger budget before acting',
          'Buy cyber insurance in place of the fixes',
        ],
        correctIndex: 0,
        explanation:
          'Mandatory obligations come first, then the fixes that cut the most expected loss for the money; risks left unfunded above appetite go to senior management. Ranking by impact alone is tempting because it sounds risk-based, but it can leave a legal deadline missed, adding penalties to the risk.',
      },
      {
        type: 'check',
        question: 'A logistics firm is buying cyber insurance. Which choice would make the policy BEST at transferring the firm’s risk?',
        options: [
          'The lowest premium offered for the broadest coverage',
          'The highest limit any insurer will offer',
          'Limits set from the firm’s measured loss exposure',
          'Automatic yearly renewal on unchanged terms',
        ],
        correctIndex: 2,
        explanation:
          'A policy transfers risk well when its limits, and the share the firm pays itself, match what an incident could actually cost. The highest limit is tempting because it feels safest, but premiums for cover beyond the real exposure buy little. The lowest premium may leave the real exposure uncovered.',
      },
    ],
  },

  // Mobile 1.45 decision lesson 5 (curriculum §4): outline topic 2A2, notes 2A2.2 and 2A2.5.
  {
    id: 'cisa-l-d2-who-decides',
    certId: 'cisa',
    domainId: '2',
    order: 9,
    title: 'Who decides: the board, IT committees and the CISO',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 EDM01 (Ensured Governance Framework Setting and Maintenance)',
      'ISO/IEC 38500:2024 (Governance of IT for the organization)',
      'ISO/IEC 27014:2020 (Governance of information security)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_REVIEWED,
    topics: ['2A2'],
    prepares: ['d2_187', 'd2_006', 'd2_042', 'd2_114', 'd2_130'],
    notes: ['2A2.2', '2A2.5'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · IT governance',
        title: 'Who decides',
        subtitle: 'Each IT decision belongs to one body with the authority to make it. Telling the bodies apart is a classic exam distinction.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Governance works only when each decision has one home: a body with a written charter (the document saying what the body may decide), real decision rights and a path to escalate what it cannot settle. The board sets direction and stays accountable. Committees advise or decide within their charter, and managers run the work. A committee that reviews but cannot act is governance in form only.',
      },
      {
        type: 'analogy',
        heading: 'A city and its roads',
        body: 'A city council decides what kind of city it wants and answers to the voters. An expert panel (the IT strategy committee) advises the council on where transport is heading, but does not pick which road is paved first; the works committee (the IT steering committee) does that, balancing budgets and crews. The council can hire a chief engineer (the CISO) to run road safety, yet if a bridge fails, the council still answers for it.',
      },
      {
        type: 'stack',
        heading: 'Who does what',
        layers: [
          {
            label: 'Board',
            note: 'Sets direction and risk appetite (how much risk it is willing to accept), approves the security strategy and top-level policy, and stays accountable',
          },
          {
            label: 'IT strategy committee',
            note: 'Board level: advises the board on IT direction, emerging technology and strategic risk. It does not rank projects',
          },
          {
            label: 'IT steering committee',
            note: 'Management level: senior business and IT leaders, such as the chief information officer (CIO), rank projects, allocate resources and track delivery',
          },
          {
            label: 'Chief information security officer (CISO)',
            note: 'Designs and runs the security program and reports to senior management, ideally outside IT operations',
          },
        ],
        caption:
          'The audit committee also sits at board level. It oversees internal and external audit and approves the audit charter; it oversees risk and control but does not own them.',
      },
      {
        type: 'compare',
        heading: 'Delegated, or still owned',
        left: {
          title: 'Can be delegated',
          points: ['Running the security program day to day', 'Ranking projects within an approved budget', 'Drafting policies for approval'],
        },
        right: {
          title: 'Stays with the board and senior management',
          points: ['Accountability for information security', 'Approving the security strategy and policy', 'Setting how much risk is acceptable'],
        },
        caption:
          'Senior management commitment is the strongest single success factor for security governance. Without it, even a capable CISO ends up working apart from the business, buying tools that may not match its risks.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Decisions belong at the right level, with evidence that they were made there. As the IS (information systems) auditor, you read each charter for decision rights and an escalation path, then test the minutes: did the body that owns a decision actually take it, and was it acted on? You also check that the security strategy maps to business goals. You recommend; the board or senior management approves changes to the charters.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The IT strategy committee should rank this year’s projects, since it knows the strategy best.”',
        why: 'Ranking projects and allocating resources is the IT steering committee’s job, at management level. The strategy committee advises the board on long-term direction. This is the principle “Escalate to whoever owns the decision”: each decision goes to the body whose charter gives it that right.',
      },
      {
        type: 'tip',
        body: 'Read the verb in the stem. Advise on direction: the IT strategy committee. Rank projects or settle resource conflicts: the IT steering committee (strategy is the map, steering is the wheel). Run the program: the CISO; answer for it: the board.',
      },
      {
        type: 'check',
        question:
          'A board member proposes that the IT strategy committee take over ranking next year’s IT projects, because its members know the strategy best. What should the IS auditor recommend?',
        options: [
          'Agree, since strategy knowledge will improve the ranking',
          'Keep ranking with the IT steering committee',
          'Let the CIO rank the projects alone, to save time',
          'Give the ranking to the audit committee for independence',
        ],
        correctIndex: 1,
        explanation:
          'Ranking projects is a management decision, so it stays with the steering committee of senior business and IT leaders; the strategy committee advises the board on direction. Agreeing is tempting because the reason sounds sensible, but it pulls a board-level body into management work and blurs who answers for delivery. The CIO ranking alone would leave out the business’s voice, and the audit committee would lose its independence if it ranked the projects it oversees.',
      },
      {
        type: 'check',
        question:
          'A manufacturer’s board hires an experienced CISO and records in its minutes that information security is now “entirely the CISO’s responsibility”. What should the IS auditor report to the board?',
        options: [
          'Accountability stays with the board; the CISO runs the program',
          'The CISO now carries the accountability, with the authority',
          'The CISO should report to the head of IT operations',
          'Have the CISO report security metrics to the board each quarter',
        ],
        correctIndex: 0,
        explanation:
          'The board can delegate running security, but not its accountability for it, so the CISO cannot take that on. Quarterly reporting to the board is tempting because it is good practice, but it leaves the minutes saying the board has handed over an accountability it cannot hand over. Reporting into IT operations would let the people who run IT filter security concerns.',
      },
      {
        type: 'check',
        question:
          'A bank’s security risk committee hears the same reports of unpatched servers every month, but its charter lets it only note them, not set deadlines or escalate. Which recommendation is BEST?',
        options: [
          'Meet weekly so the reports are seen sooner',
          'Replace the committee with an automated patching tool',
          'Add more senior managers to the committee',
          'Let it set deadlines and refer overdue fixes upward',
        ],
        correctIndex: 3,
        explanation:
          'The problem recurs because nobody in the room can act on it; the power to set deadlines and escalate turns review into governance. Adding more senior managers is tempting because seniority sounds like authority, but without a charter that lets the committee decide or escalate, they can still only note the reports. Meeting weekly only notes them more often, and a tool may help patching, but it does not fix who decides.',
      },
    ],
  },

  // Mobile decision lesson 9 (curriculum §4): outline topic 2B1, note 2B1.3. One decision: IT money follows risk and value,
  // and value is counted in business results. Capacity planning (2B1.4) stays in its note.
  {
    id: 'cisa-l-d2-it-investment',
    certId: 'cisa',
    domainId: '2',
    order: 10,
    title: 'Paying for IT: investment, value and who owns the cost',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 EDM02 (Ensured Benefits Delivery)',
      'COBIT 2019 APO05 (Managed Portfolio) and APO06 (Managed Budget and Costs)',
      'ISACA Val IT concepts (value governance, portfolio management and investment management)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_2_REVIEWED,
    topics: ['2B1'],
    prepares: ['d2_068', 'd2_167', 'd2_147', 'd2_075', 'd2_100'],
    notes: ['2B1.3'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 2 · IT resource management',
        title: 'Paying for IT',
        subtitle: 'IT money should follow risk and value, and value is counted in business results, not in money spent.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'IT spending competes for a limited budget, so it is managed as a portfolio (all IT investments ranked as one set), not project by project. Each investment has a business case: the costs, benefits, risks and measures that justify it. Spending is ranked by risk and value, with legal and regulatory duties funded first. Value is the business benefit actually delivered, such as faster claims or fewer losses, not the money spent or the projects finished.',
      },
      {
        type: 'analogy',
        heading: 'A household budget',
        body: 'When income drops, a sensible household does not cut rent, food and a leaking roof by the same amount as holidays. It pays what it must first, then what protects it, then what is nice to have. And it judges a new kitchen by whether cooking got easier, not by what the builders were paid.',
      },
      {
        type: 'stack',
        heading: 'Where IT money goes first',
        layers: [
          { label: 'Mandatory', note: 'Legal, regulatory and contract duties, such as a new card-security deadline' },
          {
            label: 'Risk beyond appetite',
            note: 'Fixes for risks above what senior management is willing to accept (its risk appetite), including threats to customer-critical services',
          },
          { label: 'Growth and change', note: 'New capabilities, ranked by the value they are expected to deliver, tested under more than one scenario' },
        ],
        caption:
          'When the budget changes during the year, the whole portfolio is ranked again this way, and the result goes back to the body that approved it, such as the board.',
      },
      {
        type: 'compare',
        heading: 'What shows IT’s value',
        left: {
          title: 'Activity',
          points: ['Money spent, compared with similar firms', 'Projects finished on time and on budget', 'Help-desk tickets closed within target'],
        },
        right: {
          title: 'Value',
          points: ['Benefits the business case promised, measured after go-live', 'Business results, such as faster claims or fewer losses', 'Compared with the targets set when funding was approved'],
        },
        caption: 'Cost needs an owner too: each team should see what the services it uses cost, and answer for its share.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Spending is a governance decision. As the IS (information systems) auditor, you check that business cases state measurable benefits, that benefits are tracked after delivery, that large changes went back to the body that approved the portfolio, and that each cost has an accountable owner. You test decision rights and evidence, not the arithmetic. You recommend; the board or senior management decides the funding.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Cut every IT budget by the same share, so the pain is fair.”',
        why: 'An equal cut starves legal duties and critical services while sparing low-value work. This is the principle “Risk decides where effort goes”: rank spending by risk and value, protect what is mandatory and critical, and record the risks the cut leaves.',
      },
      {
        type: 'tip',
        body: 'Mandatory first, then risk beyond appetite, then growth. Value means benefits realized, not money spent or projects delivered. A big change to an approved portfolio goes back to whoever approved it.',
      },
      {
        type: 'check',
        question:
          'Mid-year, a hospital group’s board orders a 10% cut in IT spending. A new patient-privacy law also requires system changes by spring. What should the IS auditor recommend?',
        options: [
          'Cut each IT project by 10% so every area shares the cut',
          'Rank IT work afresh, protecting legal duties, for board approval',
          'Let the IT director move money between projects without the board',
          'Delay the privacy changes until next year’s budget',
        ],
        correctIndex: 1,
        explanation:
          'The legal deadline is funded first and the rest is ranked by risk and value; the board approved the original plan, so it approves the changed one. Letting the IT director move the money is tempting because it is quick and the director knows the projects, but a large change to an approved portfolio belongs to the body that approved it. An equal cut starves the legal work, and delaying it would miss the legal deadline.',
      },
      {
        type: 'check',
        question:
          'A logistics company’s chief information officer (CIO) reports to the board each quarter on what IT delivers. Which measure would BEST show the value of IT?',
        options: [
          'IT spending per employee compared with similar firms',
          'The share of projects finished on time and on budget',
          'Service desk tickets resolved within the agreed time',
          'Faster deliveries from the new route-planning system',
        ],
        correctIndex: 3,
        explanation:
          'Value is a business result traced to an IT investment, such as faster deliveries from the new system. On-time, on-budget projects are tempting because they show IT is well run, but a project can finish on time and still deliver no benefit. Spending comparisons and ticket counts measure cost and activity, not what the business gained.',
      },
      {
        type: 'check',
        question:
          'A media company’s cloud bill rose by half in a year, and nobody can say which teams use which resources. Which practice would BEST support lasting cost control?',
        options: [
          'Tag each resource to a team accountable for its cost',
          'Send the finance director a monthly total of the bill',
          'Negotiate a larger volume discount with the provider',
          'Make IT approve every new cloud resource centrally',
        ],
        correctIndex: 0,
        explanation:
          'When each resource is labeled with the team that uses it, every team sees its own spending and answers for it, so waste gets cut where it starts. Central approval by IT is tempting because it looks like firm control, but it slows every team down and still leaves nobody owning the bill. A monthly total shows the problem without assigning it, and a discount lowers the price without changing the habits.',
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
    topics: ['3B4'],
    prepares: ['d3_066', 'd3_092', 'd3_088'],
    notes: ['3B4.1', '3B4.2', '3B4.3'],
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
        body: 'Go-live is the day a new system starts running the real business. A post-implementation review, usually held months later, asks three things. Did the benefits promised in the business case (the approved reason for the spend) arrive? Do the controls (the safeguards built into the system) work as designed? What lessons should future projects use? The exam treats the first question as the review’s primary purpose.',
      },
      {
        type: 'analogy',
        heading: 'A new heat pump and its promised savings',
        body: 'You buy a heat pump because the installer promised lower energy bills. Before you switch it on, an inspector confirms it is safe to run. You judge the savings after a full season of bills, not after one night. And you do not ask the installer to grade their own work.',
      },
      {
        type: 'flow',
        layout: 'timeline',
        heading: 'From go-live readiness to lessons learned',
        steps: [
          { label: 'Readiness check', note: 'Before go-live, accountable owners sign off on agreed criteria, with open issues listed' },
          { label: 'Go live', note: 'The system starts running real business' },
          { label: 'Stabilize', note: 'Early fixes settle and normal operation builds up real data, often over months' },
          {
            label: 'Independent review',
            note: 'Controls, benefits against the business case, and lessons',
          },
          { label: 'Act and follow up', note: 'Management fixes what was found; the IS auditor follows up to confirm closure' },
        ],
        caption: 'Lessons feed back into how future projects are planned and approved.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
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
        why: 'A vendor’s word is not evidence, and the vendor does not own the risk. Go-live rests on agreed readiness criteria signed off by the accountable business and IT owners, with open issues visible and any residual risk (what remains after fixes) formally accepted by management.',
      },
      {
        type: 'tip',
        body: 'Exam questions open with a short scenario, called the stem. If the stem asks when to review, look for stable operation first. If it asks who should review, pick someone who did not build it. If it asks who fixes a benefit shortfall, pick the business owner, not the IS auditor or IT.',
      },
      {
        type: 'check',
        question:
          'A retailer’s new inventory system went live two weeks ago, and daily fixes are still going in. The sponsor asks the IS auditor to start the post-implementation review now. What is the BEST response?',
        options: [
          'Agree on a later date, once fixes slow and results are measurable',
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
          'A new claims system is live and stable. Management must choose who leads its post-implementation review. Which choice should the IS auditor recommend as BEST?',
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
          'The sponsor owns a fix plan, and the IS auditor follows up',
          'IT adds features until the promised target is met',
          'Report the shortfall to senior management and close the review',
        ],
        correctIndex: 1,
        explanation:
          'The sponsor promised the benefit, so the sponsor owns the plan to close the gap, and the IS auditor later follows up to confirm it worked. Reporting and closing is tempting, but a finding with no owner rarely gets fixed. Redesigning the portal would impair the IS auditor’s independence, and adding features assumes the cause is technical.',
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
    notes: ['3A1.2', '3A2.1', '3A2.2'],
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
        body: 'A business case is the written argument for spending: costs, benefits, risks and options. A feasibility study checks the idea can work technically, economically, legally, operationally and on schedule. The project charter then formally starts the project and gives the project manager authority.',
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
        heading: 'The IS auditor’s lens',
        body: 'Right level of authority: each decision belongs to whoever owns its money and risk. Delivery roles run the work; governance roles fund it and choose at each gate. As the IS (information systems) auditor, you check the business case is complete and current, and you recommend. You never approve the spend yourself.',
      },
      {
        type: 'trap',
        heading: 'The sunk-cost trap',
        trap: '“We have already spent most of the budget, so we must finish.”',
        why: 'Money already spent cannot come back, so it should not drive the decision. When costs or benefits change materially (enough to alter the decision), the case is refreshed and the people who own the money choose again: continue, change course or stop. Revisit it at every gate, not just at the start.',
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
          'A resource conflict across a program is a governance decision, so it goes to the body that can commit resources: the steering committee. The project management office is tempting because it sees every project, but it sets standards and supports delivery; it does not decide priorities. The IS auditor advises and never decides.',
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
          'Feasibility has several sides, and two are untested here: legal and operational. An app that breaks privacy law or cannot be supported fails whatever its returns. Lower returns are tempting because forecasts often miss, but the study did examine returns. The IS auditor would recommend completing the study before the go decision.',
      },
      {
        type: 'check',
        question:
          'Halfway through a warehouse automation project, the company sells two of its three warehouses. The project manager reports it is on time and on budget. What should concern the IS auditor MOST?',
        options: [
          'Status reports omit earned value, the value of work done',
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
    notes: ['3A3.1', '3A3.2', '3A3.3'],
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
        body: 'Every development method covers the same work: agree on requirements (what the business needs the system to do), design, build, test and release. Waterfall does each step once, in order, with sign-off between them. Agile repeats short cycles called sprints. DevOps joins the builders (development) with the people who run live systems (operations), and automates testing and release, so changes ship often.',
      },
      {
        type: 'analogy',
        heading: 'A wedding caterer and a café',
        body: 'A wedding caterer agrees on the full menu in writing before buying any food. A café changes its menu each week based on what sold. Both still follow the same food safety rules; the café checks them more often, in smaller batches.',
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
          'Same control goals either way: approved requirements, tested code and an authorized release. Building before the requirements are approved risks working software that solves the wrong problem.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Controls designed early are cheapest, and the method does not change the control goals. As the IS auditor, you do not choose waterfall or agile. You check that whichever method is used still leaves evidence an outsider can follow, from each approved requirement to the test that proved it. That unbroken line is called traceability. You recommend fixes for gaps; management closes them.',
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
          'Have business owners agree on and approve the loan requirements',
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
          'Code shows what was built, not why. Without recorded reasons, a later change can quietly remove a control nobody knew was deliberate, and the IS auditor cannot judge the design. Server overload is tempting because daily releases feel risky, but frequency is DevOps working as intended; the gap is the missing record of decisions.',
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
    notes: ['3A4.2', '3A4.1', '3A4.3'],
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
        heading: 'The IS auditor’s lens',
        body: 'Prevent at the source. A control at entry stops bad data before it spreads; a report found later only shows that it spread. As the IS auditor, you advise early, while the design is still cheap to change. Management designs, builds and owns the controls. If you designed them yourself, you could not later audit them objectively.',
      },
      {
        type: 'trap',
        heading: 'The detect-it-later trap',
        trap: '“Invalid records are reaching processing, so add a daily exception report.”',
        why: 'A report is a detective control: it finds bad records after they are already in the system. The root cause is a missing input control. An edit check at entry is a preventive control: it stops the error where it starts, which is cheaper and more reliable.',
      },
      {
        type: 'trap',
        heading: 'The helpful-auditor trap',
        trap: '“The IS auditor knows controls best, so the IS auditor should design them.”',
        why: 'Designing the controls makes them the IS auditor’s own work, and no one can objectively audit their own work; this is a self-review threat to objectivity. Early advice is welcome; authorship is not. Management stays the owner of every control it builds.',
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
          'Pay stubs delivered only to the employees named on them',
        ],
        correctIndex: 1,
        explanation:
          'Losing records between steps is a processing risk, so counts and totals compared at each hand-off show whether anything went missing. Input field checks are tempting because they are preventive, but they act at entry; they cannot see a record dropped later in the run.',
      },
      {
        type: 'check',
        question:
          'A payroll clerk’s role in a new system lets the clerk add employees and also release each month’s salary payments. What is the GREATEST risk?',
        options: [
          'Errors in new employee records may go unnoticed until payday',
          'The clerk may need extra training to handle the combined role',
          'The clerk could add a fake employee and pay them unnoticed',
          'HR and payroll may dispute which team owns the combined role',
        ],
        correctIndex: 2,
        explanation:
          'Letting one person both create a payee and release money to it is the classic setup for fraud: a fake employee, paid with nobody else involved. Unnoticed entry errors are tempting because they are a real risk, but a second person in the process would catch those too; the bigger harm is deliberate theft. The fix is segregation of duties enforced by the system’s roles.',
      },
      {
        type: 'check',
        question:
          'A manager denies approving a large trade. The log shows the manager’s user ID, but administrators can edit that log. What is the GREATEST weakness for the IS auditor to report?',
        options: [
          'The log can be altered, so it cannot prove who approved',
          'The log was not encrypted while stored on the server',
          'The approval screen did not ask managers to confirm each trade',
          'The trade limit for managers was set higher than policy allows',
        ],
        correctIndex: 0,
        explanation:
          'To stop someone denying an action (non-repudiation), you need a record nobody can quietly change, tied to a verified identity. Here anyone with admin rights could have edited the entry, so it proves nothing. Encryption is tempting because it protects records, but it keeps them secret, not unchangeable.',
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
    topics: ['3B1', '3A3'],
    prepares: ['d3_003', 'd3_007', 'd3_010'],
    notes: ['3B1.1', '3B1.4', '3A3.5'],
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
        heading: 'The IS auditor’s lens',
        body: 'Two rules: the evidence must be sound, and the business decides readiness. As the IS auditor, you check that results exist at each level, trace back to approved requirements and meet the exit criteria (pass marks agreed before testing). You do not run the tests or accept the system. Business owners accept it; your job is to say whether the evidence supports their decision.',
      },
      {
        type: 'trap',
        heading: 'The wrong-level trap',
        trap: '“The business signed off on acceptance testing, so every interface must work.”',
        why: 'Each level has its own scope. Acceptance shows users are satisfied with what they tried; it does not prove data passes correctly between systems. For interfaces, look for integration test results that trace records across each link.',
      },
      {
        type: 'tip',
        body: 'Match the question to the test level whose scope covers it: pieces, links, the whole, or business fit. When something is missing, the IS auditor’s job is to make it visible, not to supply it. For test data, judge the result, not the intention: what could a tester still see?',
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
          'The matrix has done its job: it exposed requirements with no evidence. The IS auditor makes that gap known to the people deciding on go-live, and the business decides whether to delay or accept the risk. Writing the tests yourself is tempting because it closes the gap fast, but it is management’s work and would impair your objectivity.',
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
    topics: ['3B2', '3A3'],
    prepares: ['d3_009', 'd3_004', 'd3_013'],
    notes: ['3B2.1', '3B2.2', '3A3.3'],
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
          { label: 'Log the change request', note: 'Linked to its requirement, with purpose, impact and a rollback plan (tested steps back to the last working version)' },
          { label: 'Peer review, build once', note: 'An independent reviewer checks the code; the pipeline (the automated build-and-release chain) builds it once' },
          { label: 'Pass automated gates', note: 'Automated tests and security scans (automatic checks for known weaknesses) block any failing build' },
          { label: 'Approve on attached evidence', note: 'The change advisory board (CAB) advises on significant changes; the change authority, the role empowered to approve, decides' },
          { label: 'Deploy, never by the author', note: 'Through the pipeline or by operations staff, never by the person who wrote the code' },
        ],
        caption: 'Configuration items, everything the release needs (code, designs, settings, scripts), sit in an approved, frozen baseline. Any item left out can change after testing, without approval.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Preventive controls, which stop a bad release, beat detective controls, which find it afterward. A gate that blocks a failed build is stronger than a review that finds the damage later. As the IS auditor, you check that controls act before release, not after, and that nobody can get around them alone. You recommend; the change owner runs the process.',
      },
      {
        type: 'trap',
        heading: 'The monthly-meeting trap',
        trap: '“Every change is reviewed at the monthly change advisory board meeting, so our releases are controlled.”',
        why: 'With releases several times a week, a monthly review finds problems after customers meet them. Routine releases need automated checks that stop them before go-live. The CAB advises on significant changes before they are approved, not after they have shipped.',
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
          'The CAB approved the release without a rollback plan',
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
    notes: ['3B3.1', '3B3.2'],
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
        layout: 'timeline',
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
            note: 'Owners decide against criteria agreed in advance. A fallback plan gives tested, time-bound steps to restore the old system’s code, data and settings',
          },
          { label: 'Retire the old system', note: 'Only after final sign-off and with its records archived' },
        ],
        caption: 'Big-bang (also called direct cutover) switches everyone at once. Pilot lets one site or group go first. Phased moves one group at a time. Parallel runs old and new side by side and compares results.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Verify outcomes. Data that looks right on a few screens is not proof. As the IS auditor, you check that the data owner approved the conversion rules and results, and that the hard calls for cutover night were agreed in advance by the people who own the risk. You advise; management decides.',
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
        why: 'Big-bang avoids building temporary interfaces (connections that let old and new systems share data during the move), but a failure hits every user at once. When groups differ a lot or the stakes are high, a phased cutover limits the damage and lets the team correct course between waves.',
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
          'An IS auditor reviews a payroll team’s draft go or no-go criteria for an overnight cutover. Which criterion is MOST important to include?',
        options: [
          'Go live once ninety percent of the planned test cases have passed',
          'Let the vendor decide on the night whether go-live should proceed',
          'Revert if a significant gap is still unexplained by a set hour',
          'Go live once the full project team is on site for support',
        ],
        correctIndex: 2,
        explanation:
          'Criteria agreed in advance stop a tired team talking itself into going live on suspect data, and a clear trigger to return to the old system protects payroll. “Significant” (the exam’s word is “material”) keeps the trigger tied to business impact, not every penny. Letting the vendor decide is tempting because it knows the system, but the business owns the decision and the risk.',
      },
      {
        type: 'check',
        question:
          'A retailer plans a big-bang cutover of all its stores to a new checkout system. Which condition would MOST support that choice?',
        options: [
          'Every store runs the same simple process, with a tested fallback',
          'Stores differ widely, but the vendor promises a smooth switch',
          'The cutover falls on the busiest holiday sales weekend of the year',
          'The steering committee has signed off on the cutover date',
        ],
        correctIndex: 0,
        explanation:
          'Big-bang suits uniform, simple operations where a failure can be reversed quickly, because it avoids temporary links between old and new. The vendor’s promise is tempting, but when stores differ widely, one failure hits many different processes at once; a phased cutover limits that damage. Committee sign-off settles the date, not whether one cutover suits the stores.',
      },
    ],
  },

  // Plan item L5 (2026-10-21): test techniques, and testing under a fixed deadline.
  {
    id: 'cisa-l-d3-test-techniques',
    certId: 'cisa',
    domainId: '3',
    order: 8,
    title: 'Test techniques that find real defects',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO/IEC 29119 (Software Testing)',
      'COBIT 2019 BAI03.08 (Execute solution testing)',
      'COBIT 2019 BAI07 (Managed IT Change Acceptance and Transitioning)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: FIXES_145_REVIEWED,
    topics: ['3B1'],
    prepares: ['d3_082', 'd3_030', 'd3_020'],
    notes: ['3B1.2', '3B1.5'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 3 · Testing',
        title: 'Test techniques that find real defects',
        subtitle: 'Which technique fits which risk, what coverage really proves, and what to cut when the deadline will not move.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Test time is always limited, so the technique matters as much as the effort. Good testing puts effort where failure would hurt most (risk-based testing) and proves its tests would actually catch a mistake. Under a fixed date, cutting testing a little everywhere hides risk everywhere: ship a smaller, fully tested release, and defer the rest with the business owner formally accepting the risk. That works only when the deferred features are optional and everything that ships has met its acceptance criteria. When acceptance testing fails widely, go-live waits.',
      },
      {
        type: 'stack',
        heading: 'Techniques and what each proves',
        layers: [
          { label: 'Regression testing', note: 'Rerun existing tests after any change, to confirm what was not changed still works' },
          {
            label: 'Boundary values',
            note: 'Test on and either side of each limit, where off-by-one errors (one too many or too few) cluster',
          },
          { label: 'Code coverage', note: 'Shows which lines of code ran during testing, not whether the results were checked' },
          { label: 'Mutation testing', note: 'Plants small deliberate faults to see whether the tests notice them' },
        ],
        caption: 'If coverage is high but most planted faults go unnoticed, the tests run the code without really checking the answers.',
      },
      {
        type: 'analogy',
        heading: 'Think of a month-end reviewer',
        body: 'To learn whether a month-end reviewer really reads the reconciliations, slip in one wrong figure on purpose. If the pack comes back signed off, the review only looked busy. That is mutation testing. A reviewer who turned every page (coverage) proves nothing if the planted error got through.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Test effort follows risk, and evidence must prove what it claims. As the IS (information systems) auditor, you check that every change got regression testing, that effort went where failure hurts most, and that a coverage figure is backed by proof that the tests catch faults. You report the gaps; the owner decides what ships.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Only one line changed, so the release can skip regression testing.”',
        why: 'Small changes often break things elsewhere, especially functions that depend on the changed code. Regression testing is how the team confirms everything else still works.',
      },
      {
        type: 'tip',
        body: 'Match the cue to the technique. A range such as 18 to 65: boundary values. Asked whether tests catch faults: mutation testing. Any change: regression. Little time: risk-based testing. Under a fixed deadline, cut optional scope, not testing; if acceptance testing fails widely, go-live waits.',
      },
      {
        type: 'check',
        question:
          'A loan screen accepts amounts from 1,000 to 50,000. With only a few test cases allowed, which set BEST catches off-by-one errors?',
        options: [
          '999, 1,000, 1,001, 49,999, 50,000 and 50,001',
          'One typical value from each group of inputs',
          'Random amounts spread across the whole range',
          '25,000, the middle of the allowed range',
        ],
        correctIndex: 0,
        explanation:
          'Off-by-one errors sit at the edges, so testing on and just either side of each limit catches them with few cases. One value per input group is tempting because it is also efficient, but a typical value from the middle of a group never touches the edge where these errors hide.',
      },
      {
        type: 'check',
        question:
          'Tests run 92% of a claims module’s code, yet errors keep reaching users. Which step BEST shows whether the tests would notice a wrong result?',
        options: [
          'Raise the coverage goal to cover the remaining lines',
          'Plant small faults and see whether the tests fail',
          'Scan the source code each time it is saved',
          'Load-test the module at peak claim volumes',
        ],
        correctIndex: 1,
        explanation:
          'Mutation testing plants faults on purpose; tests that still pass are not checking the results. Raising coverage is tempting because 92% leaves a gap, but more coverage still shows only which code ran, not whether a wrong answer would be caught.',
      },
      {
        type: 'check',
        question:
          'A tax-filing feature that has met its acceptance criteria must ship on a fixed legal date in four weeks. Two optional dashboards in the same release are still failing acceptance tests, the business users’ sign-off checks. What should the IS auditor recommend?',
        options: [
          'Ship everything and fix the dashboards in production',
          'Delay the whole release until the dashboards pass',
          'Shorten testing across the release to fit the date',
          'Ship the rest; defer the dashboards with risk accepted',
        ],
        correctIndex: 3,
        explanation:
          'Releasing the fully tested, required part meets the legal date, and deferring the optional dashboards with the business owner’s formal risk acceptance keeps the risk visible. Delaying everything is tempting because it avoids shipping any defect, but it misses a legal date for features the law does not need. This works only because the dashboards are optional and the rest has met its criteria; if acceptance tests were failing widely, go-live would wait.',
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
    notes: ['4B1.1', '4B1.3'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Business impact analysis',
        title: 'Business impact analysis comes first',
        subtitle: 'Before anyone can plan a recovery, the business must know what hurts most, and how fast.',
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
          { label: 'Rank and set targets', note: 'Enterprise-wide criteria rank processes into tiers. Each tier gets a maximum tolerable downtime (MTD), the longest outage it can survive; a recovery time objective (RTO) inside it; and a recovery point objective (RPO), the data it can afford to lose. RTO and RPO are covered in the next lesson' },
          { label: 'Senior management approves', note: 'Approved results become the agreed basis for recovery priorities and spending' },
          { label: 'Feed the strategy', note: 'Recovery options are chosen only after this' },
        ],
        caption: 'The BIA comes before any recovery strategy or plan.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'The business owns the risk, so the business sets the targets. As the IS auditor, you check that process owners rated the impacts, senior management approved the targets, and each target is backed by impact and cost. A target without that analysis is a wish, not a requirement.',
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
          'A new chief information officer (CIO) wants to contract a hot site (a ready-to-use backup data center) right after recent outages. No BIA exists. What should the IS auditor recommend FIRST?',
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
          'During a BIA, the owner of the month-end close process says it can tolerate five days of outage. IT thinks one day is the limit. Whose view should BEST determine the target?',
        options: [
          'The stricter of the two views, to be safe',
          'The process owner’s view, backed by impact analysis',
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
    lastReviewed: FIXES_145_REVIEWED,
    topics: ['4B1', '4B5', '4B2'],
    prepares: ['d4_074', 'd4_082', 'd4_068'],
    notes: ['4B1.2', '4B5.1', '4B2.2'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Disaster recovery',
        title: 'RPO and RTO',
        subtitle: 'Two numbers decide how a business recovers from disaster. Mixing them up is a common exam error.',
      },
      {
        // Review fix (MAJOR): a plain core idea replaces the off-topic single-points-of-failure scene.
        type: 'idea',
        heading: 'The core idea',
        body: 'Recovery runs on two clocks. One looks back: how much recent data the business can afford to lose. The other looks forward: how long the service can be down. Business owners set both, based on the business impact analysis (BIA), and each is met with different tools.',
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
        heading: 'The IS auditor’s lens',
        body: 'The business sets the targets; IT proposes designs to meet them. As the IS auditor, you check that the targets came from an approved BIA and that the strategy meets them at a cost the impact justifies. Paying for a mirrored site for a system that can wait days is a finding too. Only a test proves recovery works.',
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
    notes: ['4A8.1', '4A8.3', '4A8.2'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · IT operations',
        title: 'Change, configuration and patching',
        subtitle: 'Many outages, and some frauds, begin with an unreviewed change. Here is the path a safe change takes.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Production means the live systems staff and customers use. Change management makes sure every production change is requested, approved, tested and released by someone other than its builder. A patch is a software fix from the vendor, often for a security flaw. Patching is change management under time pressure: the riskier the flaw, the faster the path, but there is always a path.',
      },
      {
        type: 'analogy',
        heading: 'A landlord fixing locks',
        body: 'A landlord hears of break-ins on the street and replaces a broken front-door lock today. A sticky cupboard latch waits for the next scheduled visit. Even the same-day job goes in the maintenance log and gets checked afterward. Urgency follows risk, and every change is recorded.',
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
        heading: 'The IS auditor’s lens',
        body: 'Preventive controls (which stop a problem) beat detective ones (which spot it afterward), and priority follows risk. As the IS auditor, you expect every change, even an emergency fix, to be authorized, tested in proportion to its risk, recorded and independently reviewed. You recommend the control; management puts it in place.',
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
          'Separating build from release stops unauthorized or untested code before it goes live. Logging is tempting because it is easy, but it only shows the damage afterward. Peer review helps quality, but developers can still release on their own.',
      },
      {
        type: 'check',
        question:
          'An IS auditor compares production server settings with the approved configuration baseline and finds several unexplained differences. What should the IS auditor recommend FIRST?',
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
          'An IS auditor finds that emergency changes make up 40% of all changes, and most come from one development team. What should concern the IS auditor MOST?',
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
    notes: ['4A2.1', '4A1.5', '4A2.2'],
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
        layout: 'timeline',
        heading: 'The asset life cycle',
        steps: [
          { label: 'Acquire', note: 'Approved and recorded with a named owner' },
          { label: 'Deploy', note: 'Assigned and set up to an approved configuration' },
          { label: 'Maintain and reconcile', note: 'Support, patches and licenses tracked; discovery scans compared with the register, and gaps followed up' },
          { label: 'Retire', note: 'Data securely wiped, record closed' },
        ],
        caption: 'Discovery keeps the register honest: comparing scan results with the register turns a scan into a control.',
      },
      {
        type: 'idea',
        heading: 'When support ends',
        body: 'When a vendor ends support, security fixes stop. Management then replaces the item, buys extended support, or adds compensating controls (other controls covering the same risk) and formally accepts the risk that remains (the residual risk). Running it as is, with no decision recorded, is the finding.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Risk-based thinking starts with a complete inventory. As the IS auditor, you test whether the register matches reality, not just whether one exists. When a component cannot be replaced in time, you recommend compensating controls and a decision recorded by someone with authority over the risk. Management decides; you report what remains.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“We have purchase records for every license, so we are compliant.”',
        why: 'Purchases show what you may use, not what is installed. Compliance needs both sides compared. The same logic applies to the asset register: a record of buying is not proof of what runs today.',
      },
      {
        type: 'tip',
        body: 'An inventory is only as good as its last check against reality. A purchase shows what you may run, not what you run, so settle facts before spending. When a fix cannot come in time, reduce the exposure now and have an accountable owner formally accept the residual risk.',
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
          'The information security manager, who will monitor the isolated terminals',
          'The IS auditor, who first reported the end-of-support gap',
          'The CIO, who approved the nine-month replacement plan',
        ],
        correctIndex: 0,
        explanation:
          'Risk is accepted by the business owner who bears the impact, at a level with authority over it, and here that is the owner of the checkout process. The information security manager is tempting because they run the compensating controls, but running a control is not owning the risk. The CIO approved the fix, not the business risk while it waits. The IS auditor reports the gap and never accepts it.',
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
    notes: ['4A3.1', '4A4.2', '4A5.1'],
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
            note: 'Each job serves an approved business need, and a dependent job starts only after the record counts from the job before it reconcile',
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
        heading: 'The IS auditor’s lens',
        body: 'Governance before technology. As the IS auditor, you first ask whether each job, interface and user-built tool is known, owned and approved. Then you ask whether a control proves it worked. A “job succeeded” message is not evidence of complete, accurate data. You recommend; the business owner decides the fix.',
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
        question: 'An IS auditor reviews the batch scheduler for a billing system. Which finding should concern the IS auditor MOST?',
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
    lastReviewed: FIXES_145_REVIEWED,
    topics: ['4A6', '4A10'],
    prepares: ['d4_014', 'd4_003', 'd4_019'],
    notes: ['4A6.2', '4A10.1'],
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
        heading: 'A movie theater on opening night',
        body: 'A movie theater adds showings and staff for opening night, not for an average Tuesday. It also promises the film starts at 7:30. Planning for the rush is capacity management. The promised start time, measured and reported, is the service level.',
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
        heading: 'The IS auditor’s lens',
        body: 'Business alignment: the business need sets the target, and the design follows. As the IS auditor, you check that targets are measurable, tied to business impact and reported end to end. A near-perfect target for an expense-claims tool is a finding, because it costs more than the need justifies; so is a missing target for payroll. You recommend; service owners decide.',
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
        trap: '“Response times are slow, so buy more servers.”',
        why: 'More hardware helps only if capacity is the real limit. Analyze the workload first to find the bottleneck, such as one slow query, a locked table or a report run at peak, then tune or reschedule that work before buying more.',
      },
      {
        type: 'tip',
        body: 'When a stem offers an average, ask what the average hides: plan for peaks, such as month-end. An SLA is only as strong as the weakest agreement standing behind it. When every part passes but the whole fails, judge the service the way users meet it, and get facts before choosing a fix.',
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
          'An SLA is only as strong as the agreements behind it. If parts can take 24 hours, a hardware failure can break the four-hour promise however hard IT works. Questioning whether four hours is needed is tempting, but the business set that target; the gap is in the supplier terms that should support it. Penalties do not close it either: they pay out after the promise is broken, but the parts still take 24 hours.',
      },
      {
        type: 'check',
        question:
          'A cloud provider, the network team and the application team each met their own targets, yet the customer-facing SLA was breached twice this month. What should the IS auditor recommend FIRST?',
        options: [
          'Ask each team to certify that its part met its target',
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
    notes: ['4A7.1', '4A7.3', '4A7.2'],
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
            'Workarounds are acceptable',
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
        heading: 'The IS auditor’s lens',
        body: 'Root cause beats symptom. As the IS auditor, you look for repeat incidents closed one by one with quick fixes, and for root cause reviews that stop at “operator error”. Ask why the process allowed it. You also test the metrics, because fast closure can hide poor fixes. You recommend; the process owner fixes.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Find the root cause before restoring service.”',
        why: 'During an outage the business needs service back. Apply a safe workaround first; the search for why it failed continues afterward. Waiting for the root cause makes the harm last longer.',
      },
      {
        type: 'trap',
        heading: 'The second trap',
        trap: '“Tickets close faster, so the service desk is improving.”',
        why: 'Speed alone is easy to inflate by closing tickets early. Judge a desk by whether its fixes hold, not by how fast tickets disappear.',
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
          'The change advisory board did not approve the workaround beforehand',
          'No problem record was opened to find and remove the cause',
        ],
        correctIndex: 3,
        explanation:
          'Restoring service was right; stopping there was not. A problem record keeps the cause on someone’s list after the incident closes. Blaming the early restore is tempting, but restoring service first is correct incident practice; the gap is the missing follow-through. Change advisory board approval of the workaround would not have found the cause either.',
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
    lastReviewed: FIXES_145_REVIEWED,
    topics: ['4A9', '4A11'],
    prepares: ['d4_035', 'd4_106', 'd4_048'],
    notes: ['4A9.1', '4A9.2', '4A11.5'],
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
        body: 'Database administrators often need broad rights to do their work. When management accepts that, apply a compensating control: log their activity where they cannot alter it, and have someone independent review it. Changes to the data dictionary (the definitions of every table and field) go through change control, because one bad change can corrupt data everywhere.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Evidence quality and compensating controls. As the IS auditor, you ask whether the logs would stand up as evidence: complete, kept long enough and untouched. When a powerful role cannot be restricted, look for a control that watches it independently. You recommend the control; management owns the decision to grant the rights.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Keep every log forever, just to be safe.”',
        why: 'Unlimited retention raises cost and privacy risk, and makes review harder. Retention is set for each log type from legal, regulatory and business needs. One period for everything, long or short, is the warning sign.',
      },
      {
        type: 'tip',
        body: 'Judge a log the way a court would: is it complete, kept long enough, untouched and actually examined? Retention is decided by the data owner, who answers for the data, never by whoever pays for the storage. Powerful roles that cannot be restricted are watched from outside their reach.',
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
          'The data owner for patient records, with legal and compliance input',
          'The chief information security officer (CISO), who runs logging and monitoring',
        ],
        correctIndex: 2,
        explanation:
          'Retention is a business and legal decision: the data owner, advised by legal and compliance, sets it for each log type. The compliance officer is tempting because the regulator sets a floor, but a minimum is one input, and the owner may need the logs for longer. The CISO runs the logging, not the records. The IS auditor checks the decision and does not make it.',
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
    lastReviewed: FIXES_145_REVIEWED,
    topics: ['4B3'],
    prepares: ['d4_061', 'd4_063', 'd4_065'],
    notes: ['4B3.1', '4B3.3', '4B3.4'],
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
        body: 'The 3-2-1 rule: three copies of the data, on two different kinds of storage (such as disk and tape), with one copy offsite, far enough away that one fire or flood cannot reach both. Against ransomware, keep at least one copy offline or immutable, so it cannot be changed or deleted, even by an administrator, until its retention period ends. Copies kept nearby give fast restores. A catalog records every copy and where it is.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Evidence quality: test, do not assume. As the IS auditor, you know a backup job that reports success proves a copy was written, not that it can be read back. You look for proof that copies work when needed, and that the offsite stock matches the records. You recommend; operations owns the fix.',
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
          'A count showing the cataloged tapes are present in the vault',
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
    notes: ['4B4.1', '4B4.2'],
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
        layout: 'timeline',
        heading: 'The continuity life cycle',
        steps: [
          { label: 'Policy', note: 'Management’s mandate: scope, objectives and who is accountable' },
          { label: 'Business impact analysis', note: 'Which processes matter most, and how fast they must return' },
          { label: 'Strategy', note: 'Recovery options chosen to meet those targets at a cost the impact justifies' },
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
        heading: 'The IS auditor’s lens',
        body: 'Right level of authority. Continuity is a business duty, so its mandate comes from the top, not from IT, and the plan assigns crisis decisions in advance so nobody waits for permission. As the IS auditor, you check that the steps ran in order, authority is clear, and each test changes the plan where it should. You recommend; management decides.',
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
          'Senior management did not sign off on the first exercise report',
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
          'A continuity policy is a governance document, so senior management, which answers for the whole company, approves it. The recovery manager is tempting because they know the detail, but procedures sit below the policy; the mandate must come from the top. Department heads own their processes, not the company-wide mandate. The IS auditor reviews the policy and does not approve it.',
      },
      {
        type: 'check',
        question:
          'A continuity plan names five alternates who may declare a disaster, but sets no criteria for declaring one. What is the GREATEST risk?',
        options: [
          'Too many people will need yearly training on the plan',
          'Alternates may declare too late, too early or inconsistently',
          'The lead executive may feel their own authority has been reduced',
          'The plan may need rewriting whenever an alternate leaves',
        ],
        correctIndex: 1,
        explanation:
          'Named alternates remove the single point of failure, but without criteria each may judge differently, so a disaster is declared late, needlessly or inconsistently. Training load is tempting as a concern, but it is a cost of having alternates, not a gap in how decisions are made.',
      },
    ],
  },

  // Plan item L4 (2026-10-21): recovery plan testing, media sanitization, database recovery.
  {
    id: 'cisa-l-d4-dr-testing',
    certId: 'cisa',
    domainId: '4',
    order: 11,
    title: 'Testing the recovery plan',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO 22301 Clause 8.5 (Exercise Programme)',
      'NIST SP 800-84 (Guide to Test, Training, and Exercise Programs for IT Plans and Capabilities)',
      'NIST SP 800-34 Rev 1 (Contingency Planning Guide for Federal Information Systems)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: L3_L5_REVIEWED,
    topics: ['4B5'],
    prepares: ['d4_190', 'd4_114', 'd4_116'],
    notes: ['4B5.4'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Disaster recovery',
        title: 'Testing the recovery plan',
        subtitle: 'From talking it through to switching over for real: how tests build honest evidence that recovery works.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'An untested recovery plan is a guess. Plan testing exercises the continuity plan (keeping the business going) and the disaster recovery plan (bringing IT back) to find gaps safely. Before any test, define its scope, its objectives, measurable pass or fail criteria, and stop conditions: events, such as a threat to the live (production) systems, that end the test at once.',
      },
      {
        type: 'flow',
        heading: 'From talking to doing',
        steps: [
          { label: 'Checklist review', note: 'Teams check the plan’s contents and contacts against reality' },
          { label: 'Walkthrough (tabletop)', note: 'The team talks through a scenario, testing roles and decisions' },
          { label: 'Simulation', note: 'Like a walkthrough, but timed, with people carrying out the steps; live systems stay untouched' },
          { label: 'Parallel test', note: 'Recovery systems process real data while production keeps running' },
          { label: 'Full interruption', note: 'Production is shut down and work fails over (switches) to the recovery site' },
        ],
        caption:
          'Each step adds realism and risk. Move to the next step only when the one before it works; the most critical systems need periodic parallel or full tests.',
      },
      {
        type: 'analogy',
        heading: 'Think of a fire drill',
        body: 'A school talks through its fire plan in a staff meeting before the first drill, then runs a drill with warning, and only later an unannounced one. Nobody starts by pulling the alarm during exams. If a stairwell door turns out to be locked, the drill carries on by another route, someone writes it down, and the door gets fixed.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'A test earns its value from honest evidence, not a clean pass. As the IS (information systems) auditor, you check that success was defined in advance, that failures and workarounds were recorded, that results rest on system records, and that each gap has an owner, a due date and a retest.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The test is going badly, so stop it and rerun it next month for a clean result.”',
        why: 'Failures are what the test exists to find. Carry on where it is safe, record each workaround, and report every gap with an owner and a date. Replacing a poor result with a rerun misleads management and regulators.',
      },
      {
        type: 'tip',
        body: 'A new team or plan starts with a discussion-based test, such as a walkthrough. Proving real volumes without touching production calls for a parallel test; full interruption comes last. For results, trust timestamped system records over memories or signed summaries, and look for each gap’s owner and retest.',
      },
      {
        type: 'check',
        question:
          'A company has finished its first disaster recovery plan, and nobody on the recovery team has used it yet. Which test should the IS auditor recommend FIRST?',
        options: [
          'A walkthrough where the team talks through a scenario',
          'A parallel test running live data at the recovery site',
          'A full shutdown of production, moved to the recovery site',
          'A vendor demonstration that the team watches',
        ],
        correctIndex: 0,
        explanation:
          'A walkthrough tests roles and decisions safely, so gaps surface before any system is touched. A parallel test is tempting because it is more realistic, but with an untried team and plan it risks confusion around live data; it belongs later in the progression.',
      },
      {
        type: 'check',
        question:
          'Midway through a recovery test, engineers add a step missing from the written procedure, with no risk to production. What should the IS auditor recommend?',
        options: [
          'Stop the test until the procedure is rewritten',
          'Let the step go ahead and have an observer record it',
          'Leave the extra step out of the test report',
          'Make the engineers follow the written steps exactly',
        ],
        correctIndex: 1,
        explanation:
          'Continuing safely keeps the rest of the evidence, and recording the deviation lets the procedure be corrected afterward. Stopping is tempting because the written steps were wrong, but it throws away what the rest of the test would show. Leaving the step out of the report hides the gap.',
      },
      {
        type: 'check',
        question:
          'A recovery team says its failover test met the four-hour recovery time objective, the longest outage the business accepts. Which evidence should the IS auditor rely on MOST?',
        options: [
          'The team lead’s signed summary of the results',
          'The test plan’s target time for each system',
          'Interviews with the engineers who ran the failover',
          'Timestamped system records from the failover',
        ],
        correctIndex: 3,
        explanation:
          'Records produced by the systems themselves show when each step really finished. A signed summary is tempting because it is formal, but it is the team’s own account, not independent evidence. Target times show the plan, not the result.',
      },
    ],
  },

  {
    id: 'cisa-l-d4-disposal',
    certId: 'cisa',
    domainId: '4',
    order: 12,
    title: 'Wiping media before it leaves',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-88 Rev 2 (Guidelines for Media Sanitization)',
      'ISO/IEC 27002:2022 Control 7.14 (Secure Disposal or Re-Use of Equipment)',
      'COBIT 2019 BAI09 (Managed Assets)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: L3_L5_REVIEWED,
    topics: ['4A2'],
    prepares: ['d4_121', 'd4_251', 'd4_281'],
    notes: ['4A2.3'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · IT asset management',
        title: 'Wiping media before it leaves',
        subtitle: 'Deleting a file is not erasing it. How to make retired storage unreadable, and prove it.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Deleting files or formatting a drive removes only the pointers to the data; the content can be recovered with ordinary tools. Media sanitization makes data on retired or reused storage unrecoverable: laptops, disks, tapes, phones and leased equipment. The method depends on two facts: how sensitive the data is, and whether the media will leave the organization’s control.',
      },
      {
        type: 'stack',
        heading: 'Three levels of sanitization',
        layers: [
          {
            label: 'Clear',
            note: 'Overwrite so ordinary tools cannot recover the data; one verified pass is enough on modern drives. Fits reuse in-house',
          },
          { label: 'Purge', note: 'Defeat even laboratory recovery, such as with a drive’s built-in secure-erase feature. Fits media leaving your control' },
          { label: 'Destroy', note: 'Shred, disintegrate or burn. Fits the most sensitive data, and media no purge works on, such as damaged drives' },
        ],
        caption:
          'Degaussing (a strong magnet) purges magnetic disks and tapes, not solid-state drives. In the cloud, where you cannot touch the disks, destroying the encryption keys purges the data: cryptographic erase.',
      },
      {
        type: 'analogy',
        heading: 'Think of a written page',
        body: 'Tearing out a book’s index leaves every page readable: that is deleting. Painting over the text stops any casual reader: clear, fine for your own office. Bleaching it so even a lab finds nothing: purge, fine to hand to strangers. Shredding and burning it: destroy, for the most secret pages.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Proof matters as much as the wipe. As the IS (information systems) auditor, you check that the method fits the data and the destination, that someone verified it worked, and that a certificate of sanitization (item, method, date, person) matches each serial number in the asset register.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Ask the cloud provider to shred the disks that held our data.”',
        why: 'Cloud storage is shared and spread across many disks, so one customer cannot have them destroyed. Cryptographic erase, destroying the customer’s own keys, makes the data unreadable, and the key-destruction log is the proof.',
      },
      {
        type: 'tip',
        body: 'Two questions pick the method: how sensitive is the data, and is the media leaving your control? Staying in-house: clear. Leaving: purge. Most sensitive, or cannot be purged: destroy. Then ask for proof: verification and certificates matched to serial numbers, not someone’s word.',
      },
      {
        type: 'check',
        question:
          'A school district must return leased laptops whose disks held student records. What should the IS auditor recommend before they go back?',
        options: [
          'Delete the student files and empty the trash folder',
          'Purge the disks with a verified, suitable method',
          'Reinstall the operating system over the old one',
          'Keep the disks and pay the lessor to replace them',
        ],
        correctIndex: 1,
        explanation:
          'The laptops leave the district’s control, so the rule is purge, and a verified purge defeats even laboratory recovery. Keeping the disks is tempting because nothing leaves, but destroying is for the most sensitive data or media that cannot be purged; for student records, a verified purge is enough and costs less. Deleting files or reinstalling leaves data recoverable.',
      },
      {
        type: 'check',
        question:
          'A university is giving retired lab computers to a charity. What proof would BEST satisfy the IS auditor that research data on their drives is gone?',
        options: [
          'Sanitization certificates matched to serial numbers',
          'The lab manager’s note that the drives were erased',
          'The charity’s written promise to erase the drives',
          'Photos of the computers boxed before pickup',
        ],
        correctIndex: 0,
        explanation:
          'A certificate tied to each serial number shows every drive was sanitized, by which method, and that none was missed. The charity’s promise is tempting because it is in writing, but the erasing would happen after the data has already left the university. The manager’s note is an assertion, not proof.',
      },
      {
        type: 'check',
        question:
          'An IT team overwrites the hard disk drives of returned sales laptops with an approved tool, logs each serial number, date and method, and reissues them the same day. What should concern the IS auditor MOST?',
        options: [
          'The log does not name who ran each wipe',
          'Overwriting is used rather than shredding',
          'One overwrite pass may not be enough for these drives',
          'No one confirms that each wipe actually worked',
        ],
        correctIndex: 3,
        explanation:
          'Nothing confirms the wipes worked, so a failed wipe looks the same in the log as one that succeeded, and the next user could read the old files. A missing technician name is tempting as an accountability gap, but it puts no data at risk. One overwrite pass is accepted for clearing modern drives, and laptops staying in-house need clearing, not shredding.',
      },
    ],
  },

  {
    id: 'cisa-l-d4-db-recovery',
    certId: 'cisa',
    domainId: '4',
    order: 13,
    title: 'Bringing a database back',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'COBIT 2019 APO14.10 (Manage data backup and restore arrangements)',
      'ISO/IEC 27002:2022 Control 8.13 (Information Backup)',
      'COBIT 2019 DSS04 (Managed Continuity)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: L3_L5_REVIEWED,
    topics: ['4A11'],
    prepares: ['d4_277', 'd4_278', 'd4_117'],
    notes: ['4A11.4'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Database management',
        title: 'Bringing a database back',
        subtitle: 'How backups and the transaction log rebuild a database, and who chooses when speed and data loss pull apart.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A database writes every change to its transaction log (or journal) first. A change is committed once its whole transaction finishes; half-done work is uncommitted. The log keeps each record as it was (the before-image) and as it became (the after-image). With the log and backups, recovery reaches a consistent state, where every transaction is either fully in or fully out.',
      },
      {
        type: 'stack',
        heading: 'Three ways back',
        layers: [
          { label: 'Rollback', note: 'Undo unfinished work using before-images, after a failed transaction or a crash mid-update' },
          { label: 'Roll-forward', note: 'Reapply committed work using after-images, up to the latest moment or a chosen one' },
          { label: 'Restore from backup', note: 'Replace lost or damaged files with a saved copy, then roll the log forward' },
        ],
        caption:
          'After a crash with files intact, the database undoes unfinished work and redoes committed work on its own. Restoring to a chosen moment, such as just before a bad update, is point-in-time recovery.',
      },
      {
        type: 'analogy',
        heading: 'Think of a bookkeeper’s diary',
        body: 'A bookkeeper notes every ledger entry in a diary, with the line before and after the change. If the lights go out mid-entry, the half-written line is rubbed out and the finished ones are kept. If the ledger is ruined, last month’s copy plus the diary rebuilds it, as long as the diary was not kept in the same drawer.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Recovery must fit the loss the business accepts. As the IS (information systems) auditor, you check log copies against the recovery point objective (RPO), that accepted loss. When one path is complete and in time, you recommend it; when paths trade loss against time, you set out each one’s impact and the business owner chooses.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Nightly full backups protect a database whose RPO is fifteen minutes.”',
        why: 'A failure just before the next backup loses almost a day of work. Only log copies made at least as often as the RPO allows, kept on separate storage, or replication (a live copy on another server) keep the loss within minutes.',
      },
      {
        type: 'tip',
        body: 'Crash with files intact: undo the unfinished, redo the committed, automatically. Files lost or corrupted: restore the backup, then roll the log forward. For log copies, ask how often (inside the RPO) and where (away from the database). When paths trade loss for speed, the business owner decides.',
      },
      {
        type: 'check',
        question:
          'An inventory system’s server reboots unexpectedly in the middle of a busy shift. Nothing on its disks is damaged. How should the database get back to a consistent state?',
        options: [
          'Load the most recent backup and replay the journal',
          'Roll back half-done work; redo the completed work',
          'Keep every transaction, finished or not',
          'Ask warehouse staff to recount the stock',
        ],
        correctIndex: 1,
        explanation:
          'With the disks undamaged, the database uses its log to roll back half-finished work and redo committed work, on its own. Loading a backup is tempting because it sounds thorough, but it is needed only when files are lost, and it takes far longer. Keeping half-done transactions would leave the data inconsistent.',
      },
      {
        type: 'check',
        question:
          'An order database has a 30-minute RPO. Its transaction log is copied every 15 minutes to a folder on the database’s own server. Which risk is GREATEST?',
        options: [
          'A server failure destroys the database and its log copies',
          'Log copying slows down order processing',
          'Fifteen-minute copies are more often than the RPO needs',
          'Replaying the logs may take longer than planned',
        ],
        correctIndex: 0,
        explanation:
          'Copies on the same server share its fate: one failure takes the database and every copy, so far more than 30 minutes of orders is lost. Copies more frequent than needed are tempting to flag as waste, but they are what keeps loss inside the RPO; the problem is where they sit.',
      },
      {
        type: 'check',
        question:
          'A claims database is corrupted two days before a regulatory filing. Restoring an older backup is fast but loses a day of claims; replaying the log loses nothing but finishes after the filing is due. What should the IS auditor recommend?',
        options: [
          'Restore the older backup, since the deadline comes first',
          'Replay the log, since no data may ever be lost',
          'Have the business owner weigh each path and choose',
          'Let the database administrator pick the faster path',
        ],
        correctIndex: 2,
        explanation:
          'Each path trades data loss against time, and that is a business decision: the owner weighs the lost claims against the filing deadline. Restoring fast is tempting because the deadline is real, but choosing for the business would put IT, or the IS auditor, in management’s seat.',
      },
    ],
  },

  // Mobile 1.45 decision lesson 2 (curriculum §4): outline topics 4B2 and 4A10, notes 4B2.3, 4B2.1 and 4A10.2.
  {
    id: 'cisa-l-d4-resilience',
    certId: 'cisa',
    domainId: '4',
    order: 14,
    title: 'Resilience is more than a second data center',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO 22301:2019 (Business continuity management systems — Requirements)',
      'NIST SP 800-82 Rev. 3 (Guide to Operational Technology (OT) Security)',
      'COBIT 2019 DSS04 (Managed Continuity)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_REVIEWED,
    topics: ['4B2', '4A10'],
    prepares: ['d4_184', 'd4_203', 'd4_136', 'd4_218', 'd4_199'],
    notes: ['4B2.3', '4B2.1', '4A10.2'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Operational resilience',
        title: 'Resilience is more than a second data center',
        subtitle: 'People, suppliers and hidden shared links can stop a critical service as surely as a failed server.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Operational resilience means a critical service keeps running, perhaps at reduced capacity, when anything it relies on fails: a server, a site, a key person, a supplier or a plant control system. Each of those resources needs a fallback that has been tested. A document, a contract or a diagram is not a fallback; trained people and proven arrangements are.',
      },
      {
        type: 'analogy',
        heading: 'A restaurant with two kitchens',
        body: 'A restaurant opens a second kitchen across the street, but both run on the same gas line, and only one chef knows the signature dish. One broken pipe, or one sick chef, and both kitchens go quiet. Resilience is a second gas supply and a second cook who has already made the dish, not just a second room.',
      },
      {
        type: 'stack',
        heading: 'Every resource needs a tested fallback',
        layers: [
          {
            label: 'Technology',
            note: 'Redundant parts that share nothing, such as power, cable routes or a provider, proven by deliberately failing one',
          },
          {
            label: 'People',
            note: 'A second person cross-trained and rehearsed on each critical task, so no task rests on one key person; a runbook (written step-by-step instructions) alone is not capability',
          },
          { label: 'Suppliers', note: 'Tested recovery evidence from each critical supplier, or a qualified alternate arranged in advance' },
          {
            label: 'Plant control systems',
            note: 'Operational technology (OT), such as production-line controls, inside the enterprise plan with its own safety steps: in an incident, make people and plant safe before anything else',
          },
        ],
        caption:
          'Plan for the impact, not the cause: losing a site, staff, technology or a supplier is handled the same way, whatever triggered it. The plan is cross-functional and owned by the business, not an IT document.',
      },
      {
        type: 'compare',
        heading: 'What a supplier contract does, and does not, do',
        left: {
          title: 'Service credits',
          points: ['A refund after the supplier misses its target', 'Usually far smaller than the real business loss', 'Do nothing to bring the service back'],
        },
        right: {
          title: 'Resilience and an exit route',
          points: ['Proof the supplier can recover, or a second source', 'A planned, tested way to leave a failing supplier', 'Keep the service running for customers'],
        },
        caption: 'Outsourcing hands over the work, not the accountability: the organization still answers for the service end to end.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Every resource needs a fallback that has been shown to work. As the IS (information systems) auditor, you trace each critical service end to end, through people, suppliers and shared infrastructure, and ask for evidence that each fallback works: a rehearsal, a supplier’s test report, a failover test (switching to the backup on purpose to prove it works). You quantify the gap, such as a day’s lost revenue against the largest service credit the contract allows, and report it. Management decides the investment.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The restore steps are in a detailed runbook, so relying on one engineer is no longer a risk.”',
        why: 'A runbook helps, but capability is proven only when a second trained person has done the restore in a rehearsal. This is the principle “Operating, not just configured”: a fallback counts when evidence shows it worked, not when it is written down.',
      },
      {
        type: 'tip',
        body: 'Count the shared links: two sites on one cable route, one power room or one provider can fail as one. Service credits compensate; they never restore. In a plant control incident, the safety of people and plant comes first.',
      },
      {
        type: 'check',
        question:
          'A bank’s two data centers sit in different towns, but the IS auditor finds both reach the network through one carrier’s single local exchange (the telecom company’s switching hub). Management says the design has no single point of failure. What is the IS auditor’s GREATEST concern?',
        options: [
          'Data copied between the towns may arrive with a delay',
          'Switching between the centers may take longer than planned',
          'One carrier or exchange outage could cut off both centers',
          'The second center may cost more than the risk it removes',
        ],
        correctIndex: 2,
        explanation:
          'Redundancy counts only when the parts are independent; a shared carrier and exchange let one event stop both sites. A slow switchover is tempting because it is a real recovery risk, but it assumes one site is still reachable, and here neither may be. Copy delays and cost are design trade-offs, not a hidden single point of failure.',
      },
      {
        type: 'check',
        question:
          'A shipping firm’s tracking service runs on one cloud provider, which has missed its availability target all quarter despite an agreed improvement plan. A day’s outage would cost far more than the largest service credit the contract allows. What should the IS auditor recommend to management?',
        options: [
          'Claim every service credit the contract allows',
          'Build a backup route for tracking and a plan to switch providers',
          'Track the provider against its improvement plan for another quarter',
          'Move the service to the cheapest other provider at once',
        ],
        correctIndex: 1,
        explanation:
          'Service credits compensate but do not keep parcels moving, and the firm stays accountable for its service, so it needs resilience and a way out. Tracking the improvement plan for another quarter is tempting because it is a normal contract step, but the plan has already failed and the firm would still depend on one supplier that keeps failing. Claiming credits recovers a little money, and a rushed move to the cheapest provider swaps one untested dependency for another.',
      },
      {
        type: 'check',
        question:
          'Malware has stopped the control system at a water treatment plant. Operators run the pumps by hand, and a chemical dosing tank is close to overflowing. Which action should the IS auditor expect management to take FIRST?',
        options: [
          'Restore the control system from last night’s backup',
          'Wait for the insurer’s response team before acting',
          'Isolate the plant network to preserve the evidence',
          'Bring the tank to a safe level, shutting down if needed',
        ],
        correctIndex: 3,
        explanation:
          'In an operational technology incident, the safety of people and plant comes first, even at the cost of output. Isolating the network is tempting because containment and evidence matter in any incident, but they come after the tank is safe. Restoring now could bring back infected software, and waiting for the insurer leaves the danger growing.',
      },
    ],
  },

  // Mobile 1.45 decision lesson 4 (curriculum §4): outline topic 4B5, note 4B5.3. Kept to one decision after the
  // learner read: invoke on the trigger, then recover by business priority (recovery-site deals stay in note 4B5.2).
  {
    id: 'cisa-l-d4-invocation',
    certId: 'cisa',
    domainId: '4',
    order: 15,
    title: 'Declaring a disaster and recovering in the right order',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'ISO 22301:2019 (Business continuity management systems — Requirements)',
      'NIST SP 800-34 Rev. 1 (Contingency Planning Guide for Federal Information Systems)',
      'COBIT 2019 DSS04 (Managed Continuity)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_REVIEWED,
    topics: ['4B5'],
    prepares: ['d4_200', 'd4_188', 'd4_096', 'd4_077', 'd4_241'],
    notes: ['4B5.3'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · Disaster recovery',
        title: 'Declaring a disaster and recovering in order',
        subtitle: 'Every minute spent debating comes out of the recovery time. After that, the business’s priorities set the order of the restore.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Invoking the disaster recovery plan (DRP) is the formal decision to switch to recovery. It should be fast and clear: measurable triggers, such as an outage forecast to run past the recovery time objective (RTO, how long the service may be down), and one named person, with a named alternate, who decides. Then systems come back in the order the business needs them, adjusted for what they depend on.',
      },
      {
        type: 'analogy',
        heading: 'A fire alarm',
        body: 'Nobody holds a meeting before sounding a fire alarm. The rule is written in advance, smoke above a set level, and the warden on duty acts on it. If the warden is away, the deputy acts, and nobody argues afterward about whether the deputy was allowed to.',
      },
      {
        type: 'flow',
        heading: 'From trigger to running again',
        steps: [
          { label: 'Trigger met', note: 'A measurable threshold, such as an outage forecast to exceed the RTO' },
          { label: 'Invoke', note: 'The named authority, or the delegated alternate, declares at once; anyone else escalates to them' },
          {
            label: 'Restore shared services',
            note: 'Identity and directory services (the systems that check who you are at sign-in) and the network first, because the applications need them',
          },
          { label: 'Restore by business priority', note: 'Then applications, in the order the business impact analysis (BIA) ranks them' },
        ],
        caption: 'Recovery tests time the whole sequence, not each system alone.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'A fast, clear decision to invoke is a control, and it can be tested. As the IS (information systems) auditor, you test whether two people reading a trigger would reach the same decision, confirm the named authority and alternate can invoke without a group vote, and check that recovery tests time the whole sequence against the RTO. You recommend; the executive the plan names, or the named alternate, declares the disaster.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Restore the most important business application first.”',
        why: 'It cannot run until the identity, directory and network services under it are back. This is the principle “Recover by business priority, and prove it by testing”: the BIA sets the order, and dependencies come first.',
      },
      {
        type: 'tip',
        body: 'Read the cue. A vague trigger such as “significant impact” calls for measurable thresholds. A committee that must agree risks delay past the RTO. When the trigger is met, anyone who is not the named authority escalates to that person at once.',
      },
      {
        type: 'check',
        question:
          'A university’s recovery plan is invoked when an outage causes “major disruption”, as agreed by the full leadership team. In a test, the team took an hour to agree. What should the IS auditor recommend?',
        options: [
          'Rehearse invocation until the team reaches agreement faster',
          'Set a clear outage threshold and give one executive the call',
          'Add more leaders to the team so views are balanced',
          'Accept the hour as normal judgment under pressure',
        ],
        correctIndex: 1,
        explanation:
          'The delay comes from a vague trigger and a group decision, so the fix is a measurable threshold and one named authority with an alternate. More rehearsal is tempting because practice usually helps, but the team would still be debating vague words by committee. More leaders mean a longer debate, not a faster one, and an hour is not normal when every minute counts against the RTO.',
      },
      {
        type: 'check',
        question:
          'After a ransomware attack, a hospital’s IT team plans to restore the patient-records application first, because the business impact analysis ranks it highest. The directory service that handles sign-ins is also down. What should the IS auditor recommend?',
        options: [
          'Restore patient records first, as the ranking says',
          'Restore whichever system is quickest to bring back',
          'Restore the directory service, then patient records',
          'Wait until every system can be restored together',
        ],
        correctIndex: 2,
        explanation:
          'Patient records cannot be used until staff can sign in, so the shared service comes first and the business ranking applies after it. Following the ranking alone is tempting because the BIA is the right guide, but it ranks business services, not the technical services they depend on. Quickest-first ignores what the business needs, and waiting for every system delays the most critical service.',
      },
      {
        type: 'check',
        question:
          'A payment firm’s main data center loses cooling, and the outage is forecast to run well past the RTO, which meets the plan’s trigger. The plan names the chief information officer (CIO), who cannot be reached, and a delegated alternate who is on site. What should the IS auditor expect to happen FIRST?',
        options: [
          'The alternate invokes the plan now, as delegated',
          'Staff keep calling the CIO until someone gets through',
          'The full executive team meets to agree on invoking',
          'Staff wait to see whether the cooling comes back soon',
        ],
        correctIndex: 0,
        explanation:
          'The trigger is met and the alternate holds delegated authority, so invoking now is valid; the CIO is briefed afterward. Waiting for the CIO is tempting because the plan names them first, but the delegation exists for exactly this, and every minute comes out of the RTO. A full-team meeting is the delay the plan was written to avoid, and waiting for the cooling ignores a trigger that is already met.',
      },
    ],
  },

  // Mobile decision lesson 7 (curriculum §4): outline topic 4A1, notes 4A1.1 and 4A1.4. One decision: which part of the
  // infrastructure can actually stop a risk, and does it stop it before the harm or only record it afterward. The
  // reference models (4A1.2) stay in their note.
  {
    id: 'cisa-l-d4-infrastructure',
    certId: 'cisa',
    domainId: '4',
    order: 16,
    title: 'The infrastructure an IS auditor must be able to read',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-41 Rev. 1 (Guidelines on Firewalls and Firewall Policy)',
      'NIST SP 800-53 Rev. 5, CM-2, CM-3 and CM-7 (Baseline Configuration; Configuration Change Control; Least Functionality)',
      'CIS Benchmarks (Center for Internet Security consensus hardening guides)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_2_REVIEWED,
    topics: ['4A1'],
    prepares: ['d4_141', 'd4_167', 'd4_057', 'd4_030', 'd4_102'],
    notes: ['4A1.1', '4A1.4'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · IT components',
        title: 'Reading the infrastructure',
        subtitle: 'For each device and setting, ask one thing: can it stop the risk before the harm, or only record it afterward?',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Network devices and operating systems are production systems, just like the applications that run on them. Not every device controls traffic. A switch connects devices inside one part of the network, a router forwards traffic between networks, and a firewall allows or refuses each connection against a rule set (the written list of what may go through). So for any piece of infrastructure, ask whether it can stop the risk at all, and whether it stops it before harm or only records it.',
      },
      {
        type: 'analogy',
        heading: 'Roads and a border checkpoint',
        body: 'Roads and junctions carry cars wherever drivers steer them; only a checkpoint with a list decides who may cross the border. A camera at a junction records who drove past, but it stops nobody. And a quiet side road that skips the checkpoint is still a way across.',
      },
      {
        type: 'stack',
        heading: 'What each part can and cannot do',
        layers: [
          { label: 'Switch', note: 'Connects devices inside one network segment (one part of the network); it moves traffic and does not judge it' },
          { label: 'Router', note: 'Forwards traffic between networks; simple filter lists help, but it is not built to enforce a security policy' },
          {
            label: 'Firewall',
            note: 'Allows or refuses each connection by rule between zones of different trust, such as office desks and payment systems; every path needs rules, including IPv6, the newer address format many servers switch on by default',
          },
          {
            label: 'Operating system and utilities',
            note: 'The base software every application runs on, plus utilities (powerful admin tools) that can change data directly, skipping the application’s own checks',
          },
        ],
        caption: 'All four are production: one wrong change to a firewall rule or a server setting can stop every application that depends on it.',
      },
      {
        type: 'compare',
        heading: 'Before the harm, or after it?',
        left: {
          title: 'Stops it first',
          points: ['Firewall rule changes approved and tested before they go live', 'Utilities kept to named administrators, used through approved requests', 'Servers built from hardened settings (an approved secure setup)'],
        },
        right: {
          title: 'Records it afterward',
          points: ['Changes made live, then written up later', 'Every utility session logged for a monthly review', 'Vendor default settings left on, with alerts on misuse'],
        },
        caption: 'Logs and reviews still matter as a backstop. They show a bad change or a misused tool after the data has already changed.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Read each control for what it can stop. As the IS (information systems) auditor, you test that a firewall filters every path between zones of different trust, IPv6 included, that device changes are approved before they go live, and that utilities are kept to named administrators. When strict settings break one type of server, you look for settings tailored to that type, with owned, time-limited gaps, not a return to factory defaults. You recommend; IT management decides the design and owns the fix.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Developers need the disk-editing utility on production servers, so logging every session is control enough.”',
        why: 'A log shows misuse after the data has changed, and the utility skips the application’s own checks. This is the principle “Prevent first, and build it in early”: keep the utility to named administrators working through approved requests, and keep the log as the backstop.',
      },
      {
        type: 'tip',
        body: 'Ask what each device can enforce: moving traffic is not filtering it, and a side path such as IPv6 needs rules too. A change made live and written up later is a control gap, however good the write-up.',
      },
      {
        type: 'check',
        question:
          'A hospital’s patient-records network and its guest Wi-Fi meet at a router that lets all traffic through between them. Which change would BEST enforce a security policy between the two networks?',
        options: [
          'Replace the router with a faster model that has more ports',
          'Place a firewall with a rule set between the two networks',
          'Log every connection through the router, for weekly review',
          'Connect each network to its own separate switch',
        ],
        correctIndex: 1,
        explanation:
          'Only a rule-based filter decides which connections may cross, so a firewall is what enforces the policy. Logging is tempting because it adds oversight, but it records guests reaching patient records after it has happened and stops none of it. A faster router still lets everything through, and separate switches still meet at the same router.',
      },
      {
        type: 'check',
        question:
          'At a logistics firm, network engineers change firewall rules directly on the live firewall during busy periods and file the paperwork the next day. Which control should the IS auditor recommend as MOST important?',
        options: [
          'Have a second engineer review the change log each week',
          'Keep a nightly backup copy of the firewall’s settings',
          'Require each rule to be approved and tested beforehand',
          'Update the network diagram after each rule change',
        ],
        correctIndex: 2,
        explanation:
          'A rule that has not been approved and tested can open a path or cut a service the moment it goes live, so the control belongs before the change. A weekly log review is tempting because it adds a second pair of eyes, but it finds a bad rule days after it took effect. A backup helps recovery, and an up-to-date diagram documents the change without controlling it.',
      },
      {
        type: 'check',
        question:
          'After strict hardened settings caused outages on some servers, a bank’s operations team wants to return every server to the vendor’s factory settings. What should the IS auditor recommend?',
        options: [
          'Fit the hardened settings to each server type, with exceptions',
          'Keep the strict settings everywhere and fix outages as they occur',
          'Return only the servers that had outages to factory settings',
          'Return to factory settings and add antivirus to each server',
        ],
        correctIndex: 0,
        explanation:
          'Settings tailored to each type of server keep most protection in place, and the few gaps are owned and time-limited. Keeping the strict settings everywhere is tempting because it sounds like the most secure choice, but repeated outages are a business risk too and will build pressure to drop hardening altogether. Factory settings, on some servers or all, swap a manageable problem for a larger one, and antivirus does not replace secure settings.',
      },
    ],
  },

  // Mobile decision lesson 10 (curriculum §4): outline topics 4A5 and 4A3, notes 4A5.2 and 4A3.2. One decision: user-built
  // tools and scheduled jobs that feed key figures get control in proportion to their risk, and proof that the output is right.
  {
    id: 'cisa-l-d4-euc-batch',
    certId: 'cisa',
    domainId: '4',
    order: 17,
    title: 'When users and schedulers run production: EUC and batch reruns',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'Sarbanes-Oxley Act of 2002, Section 404 (internal control over financial reporting, including IT general controls)',
      'COBIT 2019 DSS01 (Managed Operations)',
      'COBIT 2019 DSS06 (Managed Business Process Controls)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_2_REVIEWED,
    topics: ['4A5', '4A3'],
    prepares: ['d4_150', 'd4_109', 'd4_107', 'd4_011', 'd4_289', 'd4_290'],
    notes: ['4A5.2', '4A3.2'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 4 · User-built tools and batch jobs',
        title: 'When users and schedulers run production',
        subtitle: 'A spreadsheet or a nightly job can feed the financial statements. Its control should match what it can get wrong.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'End-user computing (EUC) means tools that business staff build and run themselves, such as spreadsheets, desktop databases and macros (small programs inside a spreadsheet). Batch jobs are programs a scheduler runs unattended, often overnight, to process many transactions at once. Both can produce key figures without going through IT’s usual development controls. So control follows risk: find them, rank them by what they feed, control the critical ones hardest, and prove their output is complete and accurate.',
      },
      {
        type: 'analogy',
        heading: 'A family recipe',
        body: 'A family recipe is fine for a dinner at home. Once it feeds two hundred paying guests a night, it needs a written method, a second cook who can make it and someone who tastes each batch before it goes out. The recipe has not changed; what depends on it has.',
      },
      {
        type: 'stack',
        heading: 'Control follows the rating',
        layers: [
          { label: 'Find', note: 'An inventory (a register) of user-built tools, each with a named owner' },
          {
            label: 'Rate',
            note: 'Each tool rated against set criteria, such as financial or regulatory impact, with the ratings checked by someone other than the owner',
          },
          {
            label: 'Control',
            note: 'Light controls for low-risk tools; for critical ones, version control (each saved version kept), limited editing and an independent review of every logic change, including logic an AI (artificial intelligence) assistant wrote',
          },
          { label: 'Move', note: 'A tool that becomes the official record, or outgrows its controls, moves to an IT-managed system' },
        ],
        caption:
          'In US public companies, a spreadsheet that feeds the financial statements can fall within the scope of Sarbanes-Oxley (SOX) testing of internal control over financial reporting.',
      },
      {
        type: 'compare',
        heading: 'A failed batch: restart or rerun?',
        left: {
          title: 'Restart',
          points: ['Resumes from the last checkpoint (a saved marker of the last record processed)', 'First confirm the checkpoint is valid', 'Suits long jobs with reliable checkpoints'],
        },
        right: {
          title: 'Rerun',
          points: ['Starts the whole job again from the beginning', 'First back out the partial updates', 'Needed when the checkpoint cannot be trusted'],
        },
        caption:
          'Either way, compare control totals (record counts and amounts) before and after, so nothing is missed or processed twice. A deadline alert, not a customer complaint, should be the first sign that a batch is running late.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Control follows risk, and output needs proof. As the IS (information systems) auditor, you test that the inventory is complete and the ratings were checked independently, that critical tools have the controls their rating requires, and that each batch recovery is logged and shown correct by reconciled control totals, not by a “completed” message from the scheduler. You recommend; each tool’s business owner and operations management decide the fixes.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Each owner rated their own spreadsheets, all came out low risk, so light controls are enough.”',
        why: 'Owners tend to rate their own tools low, even ones that feed the financial statements. This is the principle “Risk decides where effort goes”: effort follows the real risk, so tools are rated against set criteria, and someone other than the owner checks the ratings.',
      },
      {
        type: 'tip',
        body: 'Ask what the tool or job feeds: that sets how much control it needs. Before running a job again from the start, back out its partial updates. A success message is not proof; reconciled totals are.',
      },
      {
        type: 'check',
        question:
          'A finance director asks how changes to the department’s 300 spreadsheets and macros should be controlled. Most are personal working files; a few feed the quarterly report. What should the IS auditor recommend?',
        options: [
          'Match the change controls to what each file feeds',
          'Put every file through IT’s full development process',
          'Let a teammate glance over changes informally',
          'Ban macros in the finance department',
        ],
        correctIndex: 0,
        explanation:
          'A few files feed the quarterly report and need strong change control; personal working files need little. Full IT development for every file is tempting because it sounds thorough, but it spends the same effort on low-risk files, and rules that heavy push staff to work around them. An informal glance is not a control, and a ban stops useful work without fixing the critical files.',
      },
      {
        type: 'check',
        question:
          'A payroll batch failed halfway through, after paying part of the run. Its checkpoint file is damaged, so operators plan to run the whole job again from the start. What should the IS auditor confirm FIRST?',
        options: [
          'The payroll manager has approved the rerun in writing',
          'The rerun will take place during staffed office hours',
          'The job’s log will be kept for the next audit',
          'The payments the failed run made have been reversed',
        ],
        correctIndex: 3,
        explanation:
          'Without reversing what the failed run already paid, a full rerun pays those people twice. Written approval is tempting because a rerun should be authorized, but approval does not stop the double payments. Office hours and keeping the log help with oversight, not with getting the run right.',
      },
      {
        type: 'check',
        question:
          'Actuaries at an insurer use an AI assistant to write macros in the spreadsheet that calculates claims reserves for the financial statements. Which control should the IS auditor recommend as MOST important?',
        options: [
          'Limit the AI assistant to staff with advanced training',
          'Keep a record of the prompts each actuary used',
          'Have a reviewer outside the team test each macro before use',
          'Block AI assistants on the finance team’s computers',
        ],
        correctIndex: 2,
        explanation:
          'A macro that feeds the financial statements needs an independent check before it is used, whoever or whatever wrote it. Limiting the assistant to trained staff is tempting because skill reduces mistakes, but skilled people still make them, and nobody would check the result. A prompt record does not show the logic is right, and a block stops useful work without fixing the review gap.',
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
    notes: ['5A3.3', '5A3.4', '5A3.5'],
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
        body: 'Least privilege means each person gets only the access their current role needs, for only as long as they need it. Many access failures are not one bad account but a broken process for joiners, movers and leavers.',
      },
      {
        type: 'analogy',
        heading: 'Hotel key cards',
        body: 'A hotel key card opens your room for your stay. Change rooms and the desk recodes it, so the old room no longer opens. At checkout it stops working. A card that still opened every room you ever stayed in would be a security failure, even if you never misused it.',
      },
      {
        type: 'flow',
        layout: 'timeline',
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
        heading: 'Segregation and privilege',
        body: 'Segregation of duties splits a task so one person cannot both commit and conceal an error or fraud, such as creating a supplier and paying it. When duties cannot be split, a compensating control, such as an independent review, covers the gap. Powerful administrator rights are safest when granted for a task, approved, and set to expire.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Root cause beats symptom. To the IS (information systems) auditor, one leftover account is a symptom; a mover process that never removes access is the finding. Data owners, not IT, decide who may see their data. You recommend the fix; management makes it.',
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
          'An IS auditor finds 12 active accounts for contractors whose contracts ended months ago. What should the IS auditor recommend as BEST?',
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
    lastReviewed: FIXES_145_REVIEWED,
    topics: ['5A3'],
    prepares: ['d5_024', 'd5_036', 'd5_282'],
    notes: ['5A3.1'],
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
        body: 'Phishing-resistant methods, such as a hardware security key (a small device you plug in or tap) or a passkey (a sign-in key stored on your phone or computer), are tied to the genuine site’s address, so a fake page gets nothing it can reuse. A smart-card certificate login resists phishing in a similar way, because it is bound to the genuine connection. Text or app codes can be typed into a fake page and passed on to the real site. A tricked user can also tap “approve” on a phone pop-up.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
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
          'Warehouse staff sign in to a payroll portal from shared kiosks. Which sign-in design should the IS auditor consider genuinely multi-factor?',
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
    notes: ['5B5.1', '5B5.2'],
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
        body: 'Incident response is a planned, practiced way to handle security incidents: events that harm, or threaten, the confidentiality, integrity or availability of information. Order matters: limit the damage first, then remove the cause, restore service, and finally learn so it does not happen again.',
      },
      {
        type: 'analogy',
        heading: 'A burst pipe',
        body: 'When a pipe bursts, you shut the water valve first. Then you fix the pipe, dry the floor, and finally ask why it burst. Mopping while the water still flows wastes effort, and skipping the last step means it bursts again.',
      },
      {
        type: 'flow',
        heading: 'The incident life cycle',
        steps: [
          { label: 'Prepare', note: 'Plan, roles, tools and practice before anything happens' },
          { label: 'Detect and analyze', note: 'Confirm it is real; judge scope and severity' },
          { label: 'Contain', note: 'Isolate systems or disable accounts to stop the spread' },
          { label: 'Eradicate and recover', note: 'Remove the cause (eradicate), restore from clean sources, watch closely' },
          { label: 'Learn', note: 'Feed what happened back into controls and the plan' },
        ],
        caption:
          'Based on the classic NIST SP 800-61 Rev. 2 life cycle, which Rev. 3 now maps to the CSF 2.0 functions. Evidence is preserved throughout, not only at the end.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'During a live incident, “first” means containment, unless people’s safety is at risk, which always comes first. As the IS (information systems) auditor, you check that the plan names who declares, who escalates and who speaks for the organization, and that lessons learned actually change controls.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Find out who did it before touching anything.”',
        why: 'Working out who did it (attribution) can wait; the damage cannot. Preserve evidence while you contain, but do not let the investigation run while the attack keeps spreading.',
      },
      {
        type: 'tip',
        body: 'For “first” during a live attack, pick the action that stops the spread. Isolating an affected computer (host) or disabling a compromised account are typical examples. Restoring, notifying and investigating come next. For plan reviews, look for missing authority or missing lessons learned.',
      },
      {
        type: 'check',
        question:
          'Monitoring shows a sales manager’s account downloading the customer database from an unusual country at 3 a.m. What should the IS auditor recommend the incident responder do FIRST?',
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
          'Ransomware (malware that locks files until a ransom is paid) has been contained on three servers. The team wants to restore them at once from last night’s backups. What should the IS auditor recommend management ensure FIRST?',
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
    notes: ['5A1.1', '5A2.1', '5B1.2'],
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
          'Management reviews the policy on a cycle and whenever a law, threat or business change affects it, and selects a published framework (a ready-made set of controls), such as ISO/IEC 27001 or the NIST Cybersecurity Framework (CSF) 2.0, based on legal, contractual and business requirements.',
      },
      {
        type: 'idea',
        heading: 'People and premises',
        body: 'Awareness works when behavior changes: staff flag odd messages quickly and without fear. Physical controls limit who can enter and record it, such as personal badges or a two-door entry that admits one person at a time (a mantrap). Environmental controls watch heat, humidity, water, fire and power, and must alert someone who can act.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
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
          'It was not approved by senior management or the board',
          'Its firewall settings will date quickly and need frequent edits',
          'The IS audit team did not review it before it was issued',
          'It has not yet been communicated to staff',
        ],
        correctIndex: 0,
        explanation:
          'Without senior management or board approval, business units can treat the policy as IT’s opinion. The dated firewall settings are tempting because they are a real flaw, but settings belong in a standard and are easy to move. IS auditors assess a policy; they do not clear it before issue. Telling staff comes later: sharing an unauthorized policy only spreads IT’s opinion further.',
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
    notes: ['5A4.1', '5A4.2', '5A9.2'],
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
        body: 'Anyone can walk into the public hall, but reaching the planes means passing a security check. Staff doors open only with a personal badge, so a lost badge is canceled on its own. Nobody gives every worker the same master key and hopes it stays secret.',
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
        heading: 'The IS auditor’s lens',
        body: 'Fix the cause, and cover the risk until the fix lands. As the IS (information systems) auditor, when a flaw takes weeks to fix, you expect a compensating control (one that covers the same risk another way) in the meantime. Contain devices that cannot be hardened, and tie access to individuals. You recommend; management decides.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Hide the wireless network name and allow only listed device addresses.”',
        why: 'Both are easy to get around: anyone nearby can still see a hidden name, and each device’s built-in network ID can be copied. Neither identifies a person. Individual logins let you remove one departing user without changing a password everyone knows.',
      },
      {
        type: 'tip',
        body: 'If a question says a fix will take weeks, look for a compensating control at the same layer as the flaw. If personal phones hold company data, look for a control that protects company data without touching anything personal.',
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
          'A file server’s sharing service has a critical flaw. The vendor patch is six weeks away, and only finance laptops use the share. What should the IS auditor recommend as the BEST compensating control?',
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
    notes: ['5A5.1', '5A6.2', '5A6.3'],
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
          'Real systems use both encryption types: public keys safely deliver or agree on a one-time shared key (a session key), and that fast key encrypts the bulk data.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
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
          'A costly, salted hash makes each guess expensive for an attacker, while one sign-in barely notices. Account lockout is tempting, but it only stops guessing on the live sign-in page. Attackers who steal the password file guess offline, where no lockout applies. Management may accept risk, but risk acceptance suits risk that cannot be reduced at reasonable cost; here the fix is cheap, so accepting the risk is not the best approach.',
      },
      {
        type: 'check',
        question:
          'A firm encrypts its large nightly backups directly with public-key encryption, and the jobs now overrun their time slot. What should the IS auditor recommend as BEST?',
        options: [
          'Use a longer public key so the backups stay even safer',
          'Use a symmetric key for the data, guarded by the public key',
          'Hash the backups instead, since hashing runs much faster',
          'Ask the change advisory board to approve a longer nightly backup window',
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
    lastReviewed: FIXES_145_REVIEWED,
    topics: ['5A7', '5A6'],
    prepares: ['d5_064', 'd5_067', 'd5_070'],
    notes: ['5A7.1', '5A7.2', '5A6.4'],
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
        body: 'The passport office checks who you are before issuing one, and border staff trust it because they trust the office. If it is stolen, you report it and it goes on a canceled list. That only helps if border staff check the list, and if you renew before it expires.',
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
          { label: 'Renew', note: 'Before expiry, ideally automatically, because public certificate lifetimes keep getting shorter; you can only renew certificates you know about' },
        ],
        caption: 'Revocation withdraws trust early, at any point, if the key is lost or stolen or the holder leaves. It is published in a certificate revocation list (CRL) or by an online status service (OCSP, Online Certificate Status Protocol), and relying systems must check it. The root CA is the top authority every certificate traces back to. It is usually kept offline, with its key in a hardware security module, a tamper-resistant device for keys.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Preventive beats detective. As the IS (information systems) auditor, you look for controls that stop a failure before it happens: identity checks before issuing, revocation checks on every use, warnings well before expiry, and tight control of who can use a private key. Finding out after an outage, or after malware ships under the organization’s name, is too late.',
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
        body: 'For certificate questions, follow the trust. Who checked the identity, who holds the private key, and what happens on the day a certificate stops being valid? An answer that waits for an outage or someone else’s reminder is detective at best.',
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
    notes: ['5A8.2', '5A8.3', '5A8.4'],
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
        heading: 'The IS auditor’s lens',
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
          'The infrastructure manager signs off on each monthly self-review',
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
    title: 'How attackers work, and how to test for it',
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
    notes: ['5B2.2', '5B3.2', '5B3.4'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Attacks and security testing',
        title: 'How attackers work, and how to test for it',
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
        heading: 'The IS auditor’s lens',
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
          'An attacker takes over a real supplier’s mailbox and emails an organization’s accounts payable team new bank details. Which control BEST prevents the payment going astray?',
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
          'A company’s annual penetration test covers only its internet-facing systems. Last year’s ransomware spread through the internal network. Which of the following should be of GREATEST concern to the IS auditor?',
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
    notes: ['5B4.2', '5B4.1'],
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
        heading: 'The IS auditor’s lens',
        body: 'Prove it works, and govern it first. As the IS (information systems) auditor, you want evidence that detection works today, not proof that a tool is configured. Watching employees needs a lawful, written basis before anyone switches a tool on. If an outside security firm watches alerts, the organization still owns the risk and must oversee the provider.',
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
          'A lawful policy covers monitoring of staff email. Management now wants to scan staff chat too, using the same tool. What should the IS auditor advise must happen FIRST?',
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
    notes: ['5B6.1', '5B6.2'],
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
        list: {
          lead: 'Digital forensics is collecting and analyzing digital evidence so it can be trusted, including in court. The rules:',
          items: ['preserve before you analyze', 'never change the original', 'record everyone who handles it| from the moment it is collected', 'prove the copy matches the original'],
        },
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
        heading: 'The IS auditor’s lens',
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
          'A laptop under investigation is still switched on and unlocked, and its disk is fully encrypted. What should the IS auditor recommend the examiner do FIRST?',
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
          'Logs show a payroll file was exported at night under a finance manager’s account. The IS auditor’s draft report says the manager stole the data. Which revision is BEST?',
        options: [
          'Name the manager and recommend disciplinary action',
          'Remove the finding until the manager admits it',
          'Say the account ran the export, then corroborate',
          'Have the audit committee approve the wording before issue',
        ],
        correctIndex: 2,
        explanation:
          'The logs prove which account was used, not who was at the keyboard; a stolen or shared password fits the same facts. Naming the manager is tempting because the logs look clear, but it goes beyond the evidence and would not survive a challenge. Committee approval would not fix a claim the evidence cannot support.',
      },
    ],
  },

  // Plan item L3 (2026-10-21): encryption keys, penetration test types, intrusion detection and prevention.
  {
    id: 'cisa-l-d5-keys',
    certId: 'cisa',
    domainId: '5',
    order: 12,
    title: 'Guarding the encryption keys',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-57 Part 1 Rev 5 (Recommendation for Key Management)',
      'NIST SP 800-175B Rev 1 (Guideline for Using Cryptographic Standards in the Federal Government: Cryptographic Mechanisms)',
      'ISO/IEC 27002:2022 Control 8.24 (Use of Cryptography)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: L3_L5_REVIEWED,
    topics: ['5A6'],
    prepares: ['d5_313', 'd5_069', 'd5_238'],
    notes: ['5A6.5', '5A6.1'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Key management',
        title: 'Guarding the encryption keys',
        subtitle: 'Strong encryption fails when its key is shared too widely, kept beside the data or destroyed too soon.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Symmetric encryption uses one shared secret key both to lock and to unlock data. The Advanced Encryption Standard (AES) is the usual choice, fast enough for whole databases. Asymmetric encryption uses a pair of keys, one public and one private; it is slower, so it is mostly used to send the shared key safely. Either way, whoever holds the key can read the data, and whoever loses it loses the data.',
      },
      {
        type: 'flow',
        layout: 'timeline',
        heading: 'A key’s life',
        steps: [
          { label: 'Generate', note: 'In a hardware security module (a tamper-resistant key device) or key service, never in program code' },
          { label: 'Deliver', note: 'By a separate route, never with the data it unlocks' },
          { label: 'Back up', note: 'An encrypted copy kept elsewhere, so one failure cannot lock data away' },
          { label: 'Store and use', note: 'Apart from the data, out of reach of the people who run its systems' },
          { label: 'Rotate', note: 'Replaced when its cryptoperiod, its approved lifetime, ends' },
          { label: 'Destroy', note: 'Only after the data it protects is past its retention period' },
        ],
        caption:
          'One key per device or partner limits a stolen key’s damage. Copying a key out of its secure device needs dual control: two people acting together.',
      },
      {
        type: 'analogy',
        heading: 'Think of a bank’s vault keys',
        body: 'A vault is only as safe as its keys. One key cut for every branch opens every branch once it is copied. A key taped to the vault door protects nothing. And melting the only key while deeds are still inside locks them away for good. The lock’s design matters far less than how the keys are handled.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Follow the key, not the algorithm. As the IS (information systems) auditor, you check who can use each key, where it is kept, how old it is and what happens at the end of its life. You assess and recommend; the data owner, who answers for the data, decides on any risk left over.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“We use AES with 256-bit keys, so the data is safe whatever else we do.”',
        why: 'The algorithm is rarely the weak point. A strong algorithm protects little if the key sits beside the data, travels in the same email, or is shared by every device. Attackers go after the key, not the math.',
      },
      {
        type: 'tip',
        body: 'For key questions, ask: who can use the key, does it live apart from the data, and what happens if it is lost? One key shared by many devices, a key sent with the data, and a key destroyed while its data must still be kept are classic findings. If too many people can use a key, remove their permission; a new key would work for them too.',
      },
      {
        type: 'check',
        question:
          'A courier firm loads the same symmetric key onto 800 handheld scanners to protect delivery records. Which risk should the IS auditor consider GREATEST?',
        options: [
          'Scanners may slow down while encrypting each record',
          'Changing the key later means updating each scanner',
          'One scanner’s extracted key exposes them all',
          'Delivery records may arrive late on busy networks',
        ],
        correctIndex: 2,
        explanation:
          'With one shared key, a single stolen scanner unlocks the records of all 800; one key per device would limit the damage to one. The effort of changing the key everywhere is tempting because it is a real cost, but it is an inconvenience, while the shared key is an exposure.',
      },
      {
        type: 'check',
        question:
          'A new rule says encryption keys are destroyed after three years. Some of those keys protect backups that the law requires keeping for seven years. What should concern the IS auditor MOST?',
        options: [
          'The backups could never be decrypted again',
          'Two people may not witness each key destruction',
          'Attackers could recover keys after destruction',
          'Three years may be too long a key lifetime',
        ],
        correctIndex: 0,
        explanation:
          'A key destroyed before its data’s retention period ends leaves the backups unreadable when the law or the business needs them. Witnessing is tempting because dual control is good practice, but a well-witnessed destruction still loses the data. Key destruction must follow data retention.',
      },
      {
        type: 'check',
        question:
          'A review finds that 60 support staff can decrypt the payroll database through the key service, but only 3 need to. What should the IS auditor recommend FIRST?',
        options: [
          'Rotate the payroll key to a new version today',
          'Encrypt the database again with a second key',
          'Have the payroll owner accept the access as low risk',
          'Revoke decrypt rights the 57 extra staff hold',
        ],
        correctIndex: 3,
        explanation:
          'The exposure is the permission, so removing it is the fix; the logs can then be checked for misuse. Rotating the key is tempting because it sounds decisive, but the same 60 staff could decrypt with the new key. A second layer of encryption leaves the same people with the same access.',
      },
    ],
  },

  {
    id: 'cisa-l-d5-pentest',
    certId: 'cisa',
    domainId: '5',
    order: 13,
    title: 'Choosing the right penetration test',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-115 (Technical Guide to Information Security Testing and Assessment)',
      'PCI DSS v4.0.1 Requirement 11.4 (Penetration Testing)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: L3_L5_REVIEWED,
    topics: ['5B3'],
    prepares: ['d5_296', 'd5_294', 'd5_297'],
    notes: ['5B3.3'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Security testing',
        title: 'Choosing the right penetration test',
        subtitle: 'What testers know, where they start and who is warned decide what a test can prove.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A penetration test is an authorized, simulated attack that tries to exploit weaknesses the way a real attacker would. Before any testing, senior management signs a written authorization and agrees on the rules of engagement: targets, timing, allowed techniques, contacts and when testers must stop. Without that, the test cannot be told apart from a real attack.',
      },
      {
        type: 'stack',
        heading: 'Three choices that shape a test',
        layers: [
          {
            label: 'Where testers start',
            note: 'External: from the internet. Internal: inside the network, like an insider or an attacker who already got in',
          },
          { label: 'What testers know', note: 'Black box: little but a name. Gray box: some details, such as an account. White box: designs, code and accounts' },
          {
            label: 'Who is warned',
            note: 'Blind: testers know little; the security team is told. Double-blind: testers know little and the security team is not told either. Targeted: both sides work together',
          },
        ],
        caption:
          'Telling testers more finds more flaws in the days you pay for; warning defenders less shows whether they notice.',
      },
      {
        type: 'analogy',
        heading: 'Think of hiring a burglar',
        body: 'A homeowner hires a professional to test the locks. Handing over the floor plan finds more weak spots in a day. Saying nothing shows what a stranger could do. Warning the night guard first proves nothing about whether the guard would notice. And the homeowner’s signed letter is what makes it a test, not a break-in.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Match the test to the question. As the IS (information systems) auditor, you first ask what management needs to know: how deep the flaws go, whether defenders notice, or what an insider could reach. Then you check that the test type answers that question, and that signed authorization and rules of engagement came first.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Black-box testing is always best, because it is the most realistic.”',
        why: 'Testers have days; real attackers have months. A black-box team spends its budget rediscovering what it could simply have been told, so gray- or white-box tests usually find more weaknesses for the same cost.',
      },
      {
        type: 'tip',
        body: 'Read the stem for the goal. “Would anyone notice?” points to double-blind; even then, senior management and a named contact know. “Deepest coverage in limited time” points to white box. “Insiders” points to an internal test that starts with an account. No signed approval and agreed rules yet? Fix that first.',
      },
      {
        type: 'check',
        question:
          'A testing firm will attack a hospital’s internal network on Monday. The only go-ahead is a chat message from the network lead. What should the IS auditor recommend FIRST?',
        options: [
          'Signed senior management approval and agreed test rules',
          'A check of the testers’ professional certifications',
          'Full backups of the systems the test will touch',
          'A notice to staff so test traffic is not reported',
        ],
        correctIndex: 0,
        explanation:
          'Signed approval from someone with authority, plus agreed rules, is what makes the test lawful and sets its limits. Checking certifications is tempting because skill matters, but skilled testers acting without authority are still attacking the hospital. Backups are prudent, yet they do not settle what may be tested.',
      },
      {
        type: 'check',
        question:
          'An airline’s board wants to know whether its own security analysts would notice an intruder and raise the alarm unaided. Which test BEST shows this?',
        options: [
          'A white-box test of the booking system',
          'A double-blind test the analysts are not told about',
          'A blind test the analysts are told about in advance',
          'A targeted test run together with the analysts',
        ],
        correctIndex: 1,
        explanation:
          'Only analysts who do not know a test is running show their real reaction, so a double-blind test answers the question; senior management still authorizes it. A blind test is tempting because the testers start with little knowledge, but warned analysts are watching for it, so their response proves little.',
      },
      {
        type: 'check',
        question:
          'A retailer offers an external black-box test that found nothing as proof that staff with network accounts cannot reach card data. What is the IS auditor’s GREATEST concern?',
        options: [
          'The testers’ tools may not be the newest available',
          'The results describe a single point in time',
          'The report went to IT, not to the audit committee',
          'The test never started inside with an account',
        ],
        correctIndex: 3,
        explanation:
          'The claim is about insiders, but the test started outside with no account, so it never tried their path. The point-in-time limit is tempting because it is true, but it applies to every test; even a current result would not cover insiders.',
      },
    ],
  },

  {
    id: 'cisa-l-d5-ids',
    certId: 'cisa',
    domainId: '5',
    order: 14,
    title: 'Intrusion detection and prevention',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-94 (Guide to Intrusion Detection and Prevention Systems)',
      'NIST SP 800-53 Rev 5 SI-4 (System Monitoring)',
      'ISO/IEC 27002:2022 Control 8.16 (Monitoring Activities)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: L3_L5_REVIEWED,
    topics: ['5A4'],
    prepares: ['d5_047', 'd5_298', 'd5_299'],
    notes: ['5A4.5', '5A4.4'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Network security',
        title: 'Intrusion detection and prevention',
        subtitle: 'Where a sensor sits decides what it can do, and how it detects decides what it can miss.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'An intrusion detection system (IDS) watches network traffic, or activity on one server, for signs of attack and raises an alert. An intrusion prevention system (IPS) can also block attacks, but only when it sits inline, in the path the traffic takes. An IPS that gets only a copy of the traffic, from a mirrored port on a network switch, can only alert.',
      },
      {
        type: 'stack',
        heading: 'Three ways to recognize an attack',
        layers: [
          { label: 'Signature', note: 'Matches patterns of known attacks. Precise, but blind to brand-new (zero-day) attacks until updated' },
          { label: 'Anomaly', note: 'Learns what is normal for this network, a baseline, and flags departures. Catches new attacks; more false alarms' },
          {
            label: 'Heuristic',
            note: 'Fixed rules for behavior suspicious anywhere, such as one computer trying hundreds of ports (service entry points)',
          },
        ],
        caption:
          'A missed attack (false negative) is worse than a false alarm (false positive). Tune noisy rules rather than switching them off, and let a baseline learn only when nothing bad is going on, or it learns the attack as normal.',
      },
      {
        type: 'analogy',
        heading: 'Think of two door guards',
        body: 'One guard carries photos of known thieves and stops anyone who matches: reliable, but a new face walks straight in. Another knows the regulars and notices anyone acting oddly: catches newcomers, but also stops a regular in a new coat. A guard watching a camera feed can raise the alarm but cannot close the door.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Judge a control against its purpose. As the IS (information systems) auditor, you check where each device sits, which detection methods are on, which rules were switched off and why, and whether simulated attacks raise alerts. A screen with no alerts proves nothing on its own.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“No critical alerts all quarter, so the network is safe.”',
        why: 'Stale signatures, switched-off rules, a badly placed sensor or a baseline that learned an attack as normal all stay quiet too. Test detection with simulated attacks instead of trusting silence.',
      },
      {
        type: 'tip',
        body: 'Check placement first: on a mirrored port, a device can only alert. For attacks nobody has seen, look for anomaly detection; for noise, tune rather than switch off. If an inline device fails, fail open keeps traffic flowing unchecked (favoring availability); fail closed stops it (favoring security). The business owner chooses.',
      },
      {
        type: 'check',
        question:
          'A bank bought an intrusion prevention system to stop attacks on its payment servers, but it receives only a copy of the traffic from a switch. What should concern the IS auditor MOST?',
        options: [
          'It can raise alerts but cannot stop an attack',
          'Analysts may struggle with the number of alerts',
          'It may slow payments while it inspects traffic',
          'Its attack patterns may be updated too slowly',
        ],
        correctIndex: 0,
        explanation:
          'Working from a copy, the device sees attacks but sits outside their path, so it cannot block them, and the reason for buying it is not met. Alert volume is tempting because it is a daily pain, but that is an operating issue; the design flaw comes first. It cannot slow payments either, since it is not in their path.',
      },
      {
        type: 'check',
        question:
          'A water utility’s detection system matches traffic against known attack patterns only. Management fears attacks no vendor has seen yet. Which addition BEST addresses this?',
        options: [
          'More frequent downloads of pattern updates',
          'Alerts on departures from normal traffic patterns',
          'Switching the sensor to block known patterns',
          'A full record of traffic kept for later review',
        ],
        correctIndex: 1,
        explanation:
          'Anomaly detection learns what normal looks like and flags departures, so it can catch an attack nobody has a pattern for. Faster updates are tempting, but they still add patterns only for attacks already known. Blocking known patterns has the same blind spot.',
      },
      {
        type: 'check',
        question:
          'Twenty-five detection rules fire every night on normal backup traffic, and the security team proposes switching them off. What should the IS auditor recommend?',
        options: [
          'Switch them off, since analyst time is limited',
          'Keep them, but send their alerts to a separate queue',
          'Replace them with the vendor’s default rule set',
          'Tune the rules to exclude the scheduled jobs',
        ],
        correctIndex: 3,
        explanation:
          'Tuning removes the false alarms while the rules keep watching for real attacks. Switching them off is tempting because it ends the noise at once, but it also ends detection of whatever those rules were written to catch. A separate queue keeps the noise and moves it where nobody looks.',
      },
    ],
  },

  // Mobile 1.45 decision lesson 1 (curriculum §4): outline topic 5B2, notes 5B2.6 and 5B2.5.
  {
    id: 'cisa-l-d5-no-patch',
    certId: 'cisa',
    domainId: '5',
    order: 15,
    title: 'Attacks with no patch: APTs, zero-days and stolen credentials',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'MITRE ATT&CK (public knowledge base of adversary tactics and techniques)',
      'NIST SP 800-40 Rev. 4 (Guide to Enterprise Patch Management Planning)',
      'NIST SP 800-61 Rev. 3 (Incident Response Recommendations and Considerations for Cybersecurity Risk Management)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_REVIEWED,
    topics: ['5B2'],
    prepares: ['d5_137', 'd5_195', 'd5_118', 'd5_242', 'd5_344'],
    notes: ['5B2.6', '5B2.5'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Attack methods',
        title: 'Attacks with no patch',
        subtitle: 'When there is no fix to install, the control has to match how the attack works.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Some attacks get past routine defenses. A zero-day exploit attacks a flaw the vendor has not fixed yet, so there is no patch to install. An advanced persistent threat (APT) is a skilled, well-funded attacker who hides in a network for months. Stolen credentials let an attacker sign in as a real user. In each case, pick the control that breaks how the attack works, not the one that is easiest to buy.',
      },
      {
        type: 'analogy',
        heading: 'A broken lock',
        body: 'The lock maker says a new lock is weeks away. You do not leave the door open and watch the camera; you bolt it from inside or close that entrance today. And if a burglar may already be inside, you search every room quietly before changing the locks, or they simply move to a room you missed.',
      },
      {
        type: 'stack',
        heading: 'Three attacks, three matching controls',
        layers: [
          {
            label: 'Zero-day',
            note: 'No patch or signature yet: cut exposure now with a compensating control (a stand-in safeguard until the real fix exists), such as a blocking rule, isolation or allowlisting (only approved programs run)',
          },
          {
            label: 'Advanced persistent threat',
            note: 'Hidden and patient: scope the intrusion first (find how far it has spread), then remove every foothold (each way back in the attacker has set up) at once, unless data is leaving now',
          },
          {
            label: 'Stolen credentials',
            note: 'The password is already correct: require multi-factor authentication (MFA), limit where privileged (high-power) accounts can sign in, and end live sessions',
          },
        ],
        caption:
          'Antivirus signatures (patterns of known malicious code) recognize only code someone has seen before, so updating them solves none of the three.',
      },
      {
        type: 'compare',
        heading: 'A hidden intruder: act now, or scope first?',
        left: {
          title: 'Act at once',
          points: ['Sensitive data is leaving right now', 'Block the outbound channel; keep scoping alongside', 'Stopping the loss outweighs alerting the attacker'],
        },
        right: {
          title: 'Scope first',
          points: ['No data is leaving yet', 'Map every foothold quietly, then evict them together', 'A visible move early lets the attacker shift elsewhere'],
        },
        caption:
          'Keep central logs long enough to cover how long such attackers stay hidden, often many months, or the investigation cannot find where they came in.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Fit the control to the threat. As the IS (information systems) auditor, you check that a zero-day procedure cuts exposure within hours, that detection rules map to real attacker techniques, and that logs are kept long enough to cover an intruder’s stay. You recommend; management decides when to act against a hidden intruder and accepts the residual risk, the risk that remains.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“There is no patch yet, so watch the system closely until the vendor ships one.”',
        why: 'Monitoring shows the break-in after the data is gone. This is the principle “Compensating controls are a fallback, and must be proven”: the primary fix does not exist yet, so block or isolate now, and confirm the block really stops the exploit.',
      },
      {
        type: 'tip',
        body: 'Ask how the attack works, then pick what breaks it. No patch: cut exposure now, do not just watch. Hidden intruder: scope first, unless data is leaving now. A correct password in the wrong hands: add a second factor.',
      },
      {
        type: 'check',
        question:
          'A flaw in a hospital’s remote-access gateway is being exploited worldwide. The vendor’s fix is a week away, but it has published a rule that blocks the exploit. The gateway is reachable from the internet. What should the IS auditor recommend FIRST?',
        options: [
          'Monitor gateway logs closely until the vendor’s fix arrives',
          'Update antivirus signatures on the hospital’s computers',
          'Schedule the vendor fix for the next maintenance window',
          'Limit who can reach the gateway and block the exploit',
        ],
        correctIndex: 3,
        explanation:
          'With no patch, exposure has to be cut another way, and now: restricting access and applying the blocking rule close the path. Closer monitoring is tempting because it feels active, but it only shows the break-in after it happens. Signatures and the maintenance window both wait for a fix or knowledge that does not exist yet.',
      },
      {
        type: 'check',
        question:
          'Analysts find a skilled intruder who has been inside an engineering network for months, but no data is leaving right now. The network team wants to block the server the intruder uses to send commands, today. What should the IS auditor recommend?',
        options: [
          'Map the footholds quietly, then remove them together',
          'Block the command server today, as the team proposes',
          'Reinstall antivirus on the servers the intruder used',
          'Warn all staff about the intrusion so they stay alert',
        ],
        correctIndex: 0,
        explanation:
          'With no data leaving, there is time to scope: a visible block warns the intruder, who moves to footholds nobody has found. Blocking at once is tempting because it looks decisive, and it would be right if data were leaving now. Antivirus misses custom tools, and an all-staff warning can tip the intruder off.',
      },
      {
        type: 'check',
        question:
          'Customer accounts at an online store are being taken over with correct passwords leaked from other websites. Management proposes stricter password complexity rules. What should the IS auditor recommend instead?',
        options: [
          'Lower the lockout limit from five tries to three',
          'Reset the passwords of accounts with odd sign-ins',
          'Ask for a one-time code from the customer’s phone',
          'Add a security question to the sign-in page',
        ],
        correctIndex: 2,
        explanation:
          'The stolen passwords are already correct, so complexity rules and lockout limits do not stop them, and a security question is one more secret that can be guessed or stolen. A second factor, such as a code from the customer’s phone, does stop them. Resetting the odd-looking accounts is tempting because it helps the victims now, but it treats the accounts already hit, not the way in.',
      },
    ],
  },

  // Mobile 1.45 decision lesson 3 (curriculum §4): outline topic 5B5, notes 5B5.3 and 5B5.2.
  {
    id: 'cisa-l-d5-breach-notification',
    certId: 'cisa',
    domainId: '5',
    order: 16,
    title: 'Breach notification: the clock, the law and the third party',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'GDPR (Regulation (EU) 2016/679), Articles 33 and 34 (notifying the supervisory authority and the people affected)',
      'US SEC Form 8-K, Item 1.05 (Material Cybersecurity Incidents)',
      'NIST SP 800-61 Rev. 3 (Incident Response Recommendations and Considerations for Cybersecurity Risk Management)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_REVIEWED,
    topics: ['5B5'],
    prepares: ['d5_179', 'd5_191', 'd5_215', 'd5_174', 'd5_173'],
    notes: ['5B5.3', '5B5.2'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Incident response',
        title: 'Breach notification',
        subtitle: 'Most deadlines run from discovery, and handing data to a vendor never hands over the duty to tell people.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A data breach can trigger legal and contractual duties to tell regulators, customers or the people affected, each with its own deadline. Most clocks start when the organization becomes aware of the breach, not when the investigation ends. So notices go out on confirmed facts and are updated as more is learned.',
      },
      {
        type: 'analogy',
        heading: 'A product recall',
        body: 'A carmaker that learns a part is faulty tells owners and regulators what it knows now, and sends updates as testing goes on. Waiting months for the full engineering report would leave drivers at risk. And the duty does not move to the supplier just because the supplier made the part.',
      },
      {
        type: 'stack',
        heading: 'Clocks you may meet',
        layers: [
          {
            label: 'EU General Data Protection Regulation (GDPR)',
            note: 'The data controller, the organization in charge of the data, tells the regulator (the supervisory authority) without undue delay, within 72 hours where feasible, unless the breach is unlikely to put anyone at risk; it tells the people affected when their risk is high',
          },
          {
            label: 'US public companies',
            note: 'A cybersecurity incident judged material (important enough to matter to investors) is disclosed in a public filing with the Securities and Exchange Commission (SEC) within four business days of that judgment, which must itself be made without unreasonable delay',
          },
          { label: 'Contracts and other laws', note: 'Customer contracts, sector rules and other countries set their own clocks; legal counsel maps each one' },
        ],
        caption:
          'Each regulator gets its own notice, sent in parallel, not one after another. Strong encryption whose key was not exposed may remove the duty to tell people, but only after a documented assessment.',
      },
      {
        type: 'compare',
        heading: 'Controller and processor',
        left: {
          title: 'Data controller',
          points: ['Decides why and how personal data is used', 'Notifies the regulator, and the people affected when risk is high', 'Keeps the accountability when a vendor holds the data'],
        },
        right: {
          title: 'Data processor',
          points: ['Handles the data for the controller, such as a payroll vendor', 'Tells the controller without undue delay', 'Is the controller for data it uses for itself, such as its own payroll'],
        },
        caption:
          'Outsourcing the processing does not outsource accountability. After a vendor breach, the controller works out its exposure from its own logs and the vendor’s cooperation, without waiting for the vendor’s final word.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Accountability stays with the organization. As the IS (information systems) auditor, you check that the plan names who decides on each notice, normally senior management advised by legal counsel, that a notification register lists every deadline, and that processor contracts require prompt breach reports and cooperation. You do not notify regulators yourself; you test whether the process would meet its clocks.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“Wait for the full forensic report, so the notice is complete.”',
        why: 'Deadlines usually run from awareness, and forensics can take weeks. Notify on confirmed facts and update later. This is the principle “Management owns the risk”: the organization keeps its own duty to notify on time, and waiting for a fuller report or for a vendor does not stop that clock.',
      },
      {
        type: 'tip',
        body: 'Find the controller first: it notifies, even when a vendor held the data. With several regulators, map each deadline and notify in parallel. Encrypted, with the key kept safe: assess and document whether notice is needed.',
      },
      {
        type: 'check',
        question:
          'A cloud HR provider tells a manufacturer that its staff records may have been exposed and promises a full report in two weeks. What should the IS auditor recommend the manufacturer do FIRST?',
        options: [
          'Wait for the provider’s report, since the breach was theirs',
          'Tell all staff today that their records were stolen',
          'Work with the provider now to confirm what was exposed',
          'Move the staff records to a new provider this week',
        ],
        correctIndex: 2,
        explanation:
          'The manufacturer is the controller, so its own clock is running: it confirms its exposure now, with the provider’s help. Telling staff today is tempting because it is fast and open, but it announces a theft nobody has confirmed. Waiting gives away a duty that cannot be handed over, and moving providers mid-incident fixes nothing.',
      },
      {
        type: 'check',
        question:
          'A bank confirms that attackers copied customer account data while its security team is still working out how. Who should the IS auditor expect to decide when regulators are told?',
        options: [
          'Senior management, advised by legal counsel',
          'The chief information security officer (CISO), who leads the response',
          'The IS auditor, as the most independent party',
          'The external auditor, who reviews the bank’s disclosures',
        ],
        correctIndex: 0,
        explanation:
          'Notifying regulators is a legal and business decision, so it sits with senior management on counsel’s advice. The CISO is tempting because they know the facts best, and they feed the decision, but leading the response does not make it their call. The IS auditor and the external auditor must stay independent of the decision.',
      },
      {
        type: 'check',
        question:
          'A delivery firm’s tablet holding customer addresses was stolen. It was fully encrypted, and the key was not stored on it. What should the IS auditor recommend FIRST?',
        options: [
          'Notify the customers whose addresses were on the tablet',
          'Close the case, since encryption removes any duty',
          'Ask the firm’s insurer how it should respond',
          'Document an assessment of whether notice is needed',
        ],
        correctIndex: 3,
        explanation:
          'Encryption, with the key kept safe, may remove the duty to notify, but that conclusion has to be assessed and recorded. Notifying everyone is tempting because it feels cautious, but it can alarm people with no real risk and skips the judgment the law expects. Closing the case assumes the answer, and the insurer does not own the decision.',
      },
    ],
  },

  // Mobile decision lesson 6 (curriculum §4): outline topics 5A1 and 5A5, notes 5A1.3 and 5A5.2. One decision: a gap
  // from a baseline or policy is a time-limited risk decision by its owner. Framework choice (5A1.2) stays in the note.
  {
    id: 'cisa-l-d5-exceptions',
    certId: 'cisa',
    domainId: '5',
    order: 17,
    title: 'Exceptions that expire: baselines, waivers and risk acceptance',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-53 Rev. 5, CM-2 and CM-6 (Baseline Configuration; Configuration Settings)',
      'ISO/IEC 27001:2022 (Information security management systems — Requirements)',
      'PCI DSS v4.0.1, Appendix B (Compensating Controls)',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_2_REVIEWED,
    topics: ['5A1', '5A5'],
    prepares: ['d5_007', 'd5_219', 'd5_260', 'd5_237'],
    notes: ['5A1.3', '5A5.2'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Security baselines',
        title: 'Exceptions that expire',
        subtitle: 'A baseline is the floor. Going below it takes an owner, an end date and a safeguard that really works.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'A security baseline is the minimum setup every system of one type must meet, such as patches applied, unused services off and logging on. When a system cannot meet it, the gap needs a formal exception: written down, accepted by the risk owner, given an end date and backed by a compensating control (a stand-in safeguard that reduces the same risk). An exception is a temporary risk decision, not a permanent permission.',
      },
      {
        type: 'analogy',
        heading: 'A visitor badge',
        body: 'A visitor badge lets someone in without a staff card, but it carries a name, a host who answers for the visitor and an end date. A badge that never expires, or one visitors print for themselves, lets anyone in. It is a hole in the door.',
      },
      {
        type: 'stack',
        heading: 'What makes an exception valid',
        layers: [
          {
            label: 'Written down',
            note: 'The system, the gap, the reason and the residual risk (the risk left after controls) are recorded',
          },
          {
            label: 'Owned',
            note: 'Accepted by the risk owner at the level the risk policy names, not by IT alone or by the person asking',
          },
          { label: 'Time-limited', note: 'An end date and a review, because threats, data and systems change' },
          {
            label: 'Compensated',
            note: 'A compensating control, such as moving the system onto its own restricted network segment, that someone has checked is working',
          },
        ],
        caption: 'Seniority does not create an exception. Neither does asking after a control has already stopped you.',
      },
      {
        type: 'compare',
        heading: 'Exception, or policy breach?',
        left: {
          title: 'A valid exception',
          points: ['A business need that no approved route can meet', 'Requested and accepted before the gap opens', 'Ends on a set date unless reassessed'],
        },
        right: {
          title: 'A policy breach',
          points: ['An approved route existed but was skipped', 'Asked for once a control has blocked it', 'Granted because of who is asking'],
        },
        caption:
          'A data loss prevention (DLP) tool watches for sensitive data leaving the organization. When it stops a senior manager sending files to a personal account, and an approved route existed, the tool has worked: the block stays, and the breach is reported.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'An exception is only as safe as its compensating control. As the IS (information systems) auditor, you check that each exception has an owner at the right level, an end date and a review, and you test that the compensating control actually operates, rather than accepting that it is listed on the form. You recommend; senior management or the business owner the risk policy names accepts the residual risk or orders the fix.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The exception was approved three years ago, so the server can stay unpatched until it is retired.”',
        why: 'The risk was accepted for the threats, data and systems of that time, and all of them change. This is the principle “Management owns the risk”: the accountable owner accepts a known residual risk for a set period, then decides again on current facts when it ends.',
      },
      {
        type: 'tip',
        body: 'Look for four things: an owner at the right level, an end date, a safeguard someone has tested, and a review. Whichever is missing is the finding. If an approved route was available, the block stays.',
      },
      {
        type: 'check',
        question:
          'A laboratory analyzer runs an old operating system that, its vendor says, cannot take the patches the baseline requires. The laboratory director owns the analyzer. What should the IS auditor recommend?',
        options: [
          'Remove the patch requirement from the baseline for all systems',
          'Leave the analyzer unpatched until the vendor supports it',
          'Have the director sign a dated exception with safeguards',
          'Move the analyzer onto its own isolated network segment',
        ],
        correctIndex: 2,
        explanation:
          'A gap from the baseline needs a business decision with limits: the director, who owns the analyzer’s risk, accepts it for a set period, backed by safeguards. Isolating the analyzer is tempting because it is the right kind of safeguard, but on its own nobody has accepted the risk that remains or set a date to look again. Removing the requirement weakens every other system, and waiting leaves an open gap that nobody owns.',
      },
      {
        type: 'check',
        question:
          'A data loss prevention (DLP) tool held a finance director’s email sending the draft budget to a personal account. The company’s secure file-sharing service was available to the director. The director asks for the email to be released. What should the IS auditor recommend?',
        options: [
          'Keep the email held and raise it as a policy violation',
          'Release it and record it as an approved policy exception',
          'Release it once the director promises to delete the copy',
          'Set the rule to alert without blocking for senior staff',
        ],
        correctIndex: 0,
        explanation:
          'The approved service was available, so this is a breach of policy, not a business need the rules failed to meet. Recording an exception is tempting because exceptions are a normal process, but an exception is agreed in advance for a need no approved route can meet, not granted after a control has stopped someone. A promise to delete cannot be checked, and alert-only rules for senior staff switch protection off for the people who hold the most sensitive data.',
      },
      {
        type: 'check',
        question:
          'A payments firm has 30 approved security exceptions. Each names a compensating control and an end date, but nobody has checked whether those controls are running. What is the IS auditor’s GREATEST concern?',
        options: [
          'The register is kept in a spreadsheet rather than a tool',
          'The exceptions have not been reported to the board this year',
          'So many exceptions suggest the baseline itself is too strict',
          'The real residual risk may be higher than the owners accepted',
        ],
        correctIndex: 3,
        explanation:
          'The owners accepted the risk on the belief that the compensating controls work; if they do not, the risk left over is larger than anyone agreed to. Blaming a too-strict baseline is tempting because many exceptions can be a warning sign, but the fact in the question is untested controls, not too many rules. Reporting to the board and the register’s format matter less than whether the safeguards exist.',
      },
    ],
  },

  // Mobile decision lesson 8 (curriculum §4): outline topic 5A9, notes 5A9.1, 5A9.4 and 5A9.3. One decision: when a device
  // cannot be managed or patched, control what it can reach, and count a control only when it acts.
  {
    id: 'cisa-l-d5-unmanaged-devices',
    certId: 'cisa',
    domainId: '5',
    order: 18,
    title: 'Devices you do not own or cannot patch: BYOD, wireless and IoT',
    minutes: 5,
    provenance: PROVENANCE,
    references: [
      'NIST SP 800-124 Rev. 2 (Guidelines for Managing the Security of Mobile Devices in the Enterprise)',
      'NIST IR 8259A (IoT Device Cybersecurity Capability Core Baseline)',
      'NIST SP 800-153 (Guidelines for Securing Wireless Local Area Networks (WLANs))',
    ],
    outlineVersion: OUTLINE,
    lastReviewed: DECISION_LESSONS_2_REVIEWED,
    topics: ['5A9'],
    prepares: ['d5_092', 'd5_093', 'd5_027', 'd5_094', 'd5_095', 'd5_332'],
    notes: ['5A9.1', '5A9.4', '5A9.3'],
    scenes: [
      {
        type: 'title',
        kicker: 'Domain 5 · Mobile, wireless and IoT',
        title: 'Devices you cannot fully control',
        subtitle: 'When a device is not yours to manage, control what it can reach, and count a control only when it acts.',
      },
      {
        type: 'idea',
        heading: 'The core idea',
        body: 'Some devices sit outside the usual controls: staff phones under bring your own device (BYOD), wireless access points someone plugs in without permission, and Internet of Things (IoT) devices, such as cameras and sensors, that cannot run security software or be patched easily. You cannot fully secure a device you do not own or cannot change. So the control moves to the edge: decide what each device may reach, block or isolate it when it falls short, and keep proof that the control acted.',
      },
      {
        type: 'analogy',
        heading: 'A hotel key card',
        body: 'A hotel cannot check what guests carry in their suitcases, so it controls the doors: a key card opens only the guest’s own floor, and the desk confirms the card stopped working at checkout. A list of guests who broke the rules, with their cards still working, protects nobody.',
      },
      {
        type: 'stack',
        heading: 'Three kinds of device, one approach',
        layers: [
          {
            label: 'Personal phones',
            note: 'Mobile device management (MDM) software enforces the rules and blocks phones that fail them; company data sits in a separate work area that can be wiped on its own, leaving personal photos alone',
          },
          {
            label: 'Rogue access points',
            note: 'Unapproved wireless devices plugged into an office network port; stop them at the port by making every device prove its identity, and find the rest with wireless monitoring that someone reviews',
          },
          {
            label: 'IoT devices',
            note: 'Listed with an owner, bought only if they meet security requirements such as unique passwords and updates, and kept on their own restricted part of the network',
          },
        ],
        caption: 'For phones, loss and theft are the most likely threats, so encryption, a screen lock and remote wipe are the starting point.',
      },
      {
        type: 'compare',
        heading: 'A control that acts, or one that only reports',
        left: {
          title: 'Acts',
          points: ['Phones that fail the rules lose access to company email', 'The device confirms the wipe has finished', 'Wireless alerts go to a named owner who acts'],
        },
        right: {
          title: 'Only reports',
          points: ['A weekly list of phones that fail the rules', 'The console shows the wipe command was sent', 'Alerts are logged, but nobody reviews them'],
        },
        caption: 'Until a wipe is confirmed, treat the data as exposed: end the device’s sessions centrally and revoke its access.',
      },
      {
        type: 'idea',
        heading: 'The IS auditor’s lens',
        body: 'Control what the device can reach, and keep the proof. As the IS (information systems) auditor, you test that phones failing the rules are really blocked, that lost-device cases close on confirmed wipes, that IoT devices are listed, owned and kept on a restricted network segment, and that wireless alerts are reviewed and acted on. You recommend; management decides what personal devices may reach and owns the device policy.',
      },
      {
        type: 'trap',
        heading: 'The exam trap',
        trap: '“The console shows the remote wipe was sent, so the lost tablet’s data is gone.”',
        why: 'A wipe runs only when the device receives it, and a lost device may never connect again. This is the principle “Operating, not just configured”: the case closes on proof that the wipe finished; until then, revoke the device’s access and treat the data as exposed.',
      },
      {
        type: 'tip',
        body: 'Ask whether the control acts or only reports: a list of failing devices is not a block. On a personal phone, wipe the work area, not the whole phone. For IoT, you cannot protect what you have not found.',
      },
      {
        type: 'check',
        question:
          'A firm’s mobile device management (MDM) tool reports each week that about 200 staff phones fail the security rules, such as having no screen lock. Those phones still sync company email. What is the IS auditor’s GREATEST concern?',
        options: [
          'The weekly report goes to IT rather than to security',
          'Phones that break the rules keep reaching company data',
          'Staff have not been told why their phones fail',
          'The tool may not be covering company tablets too',
        ],
        correctIndex: 1,
        explanation:
          'The tool sees the problem but does not act on it, so company data keeps reaching phones that fail the rules. Telling staff is tempting because users can fix their own phones, but it still leaves those phones connected until each person acts. Who receives the report matters less, and the question gives no reason to doubt the tool’s coverage.',
      },
      {
        type: 'check',
        question:
          'A clinic will let nurses read patient messages on their own phones. Several nurses refuse, worried that a lost phone would mean losing their family photos. Which approach should the IS auditor recommend?',
        options: [
          'Ask nurses to sign an agreement to protect the messages',
          'Rely on each phone’s own passcode and encryption',
          'Require full management, with the right to wipe the phone',
          'Keep clinic data in a managed section that can be erased alone',
        ],
        correctIndex: 3,
        explanation:
          'A separate managed work area protects the clinic’s data and can be wiped without touching personal content, so nurses can take part. Full management is tempting because it gives the clinic the most control, but wiping a personal phone is out of proportion and drives staff away from the safe option. A signed agreement is not a control, and a passcode alone gives no way to remove the data from a lost phone.',
      },
      {
        type: 'check',
        question:
          'A hotel chain’s door locks, thermostats and cameras cannot run security software, and they share one network with the front-desk computers. Which recommendation should the IS auditor consider BEST?',
        options: [
          'Separate the devices from staff systems, allowing only needed traffic',
          'Change each device’s factory password and keep the network as is',
          'Install security software on the devices that can take it',
          'Replace the devices with newer models over three years',
        ],
        correctIndex: 0,
        explanation:
          'Devices that cannot protect themselves are kept apart and allowed only the traffic they need, so one hijacked camera cannot reach the front desk. Changing the factory passwords is tempting because default passwords are a real weakness, but the devices would still sit beside staff systems with nothing between them. Most of these devices cannot run security software, and a three-year replacement plan leaves the risk open now.',
      },
    ],
  },
];
