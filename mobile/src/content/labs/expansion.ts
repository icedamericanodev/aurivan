import type { RoleConfig, RiskConfig, AuthorityConfig, WorkflowConfig, DependencyConfig } from '../../engine/conceptLabExpansion';
interface LabContent {
  id: string; certId: string; domainId: string; title: string; objective: string; minutes: number;
  scenario: string; explore: readonly string[]; challenge: string; takeaway: string;
  lessonId: string; noteId: string; questionIds?: readonly string[]; principleIds?: readonly string[]; relatedLabIds?: readonly string[];
  references: readonly { title: string; url: string; section: string }[]; lastReviewed: string;
  apply: { scenario: string; correctIndex: number; options: readonly { text: string; feedback: string }[] };
}
export type ExpansionLab = LabContent & (
  | { interaction: 'role-permissions'; config: RoleConfig }
  | { interaction: 'risk-allocation'; config: RiskConfig }
  | { interaction: 'authority-mapping'; config: AuthorityConfig }
  | { interaction: 'control-workflow'; config: WorkflowConfig }
  | { interaction: 'dependency-simulation'; config: DependencyConfig }
);
const nistControls = { title: 'NIST SP 800-53 Rev. 5', url: 'https://doi.org/10.6028/NIST.SP.800-53r5' };
export const expansionLabs: readonly ExpansionLab[] = [
  {
    id: 'cisa-lab-segregation-duties', certId: 'cisa', domainId: '5', title: 'Separate sensitive duties', minutes: 8,
    objective: 'Allocate purchasing permissions and evaluate preventive and detective safeguards.',
    interaction: 'role-permissions',
    scenario: 'Harbor Supplies has three staff available for purchasing and payment oversight. Its policy separates vendor creation from approval and payment initiation from authorization. Review must be independent of the transactions reviewed.',
    explore: ['A permission conflict is a reason to investigate exposure, not proof of fraud. This exercise checks the stated purchasing rules, not every possible access conflict.', 'Separating approval can prevent unilateral action. A documented independent daily transaction review can detect exceptions, but may be too late to prevent loss. Collusion remains possible.'],
    challenge: 'With only three people, separate both approval pairs and reserve one person for independent review. Then compare leaving a conflict with adding daily review: which risk remains?',
    takeaway: 'Evaluate actual authority, transaction value, timing and evidence before concluding whether compensating controls are adequate.',
    principleIds: ['least-privilege-and-sod', 'compensating-controls-fallback'], lessonId: 'cisa-l-d2-sod', noteId: '2A2.6', questionIds: ['d2_008', 'd2_037'],
    references: [{ ...nistControls, section: 'AC-5 Separation of Duties; AC-6 Least Privilege' }], lastReviewed: '2026-11-09',
    config: {
      people: ['Maya · operations', 'Leo · finance', 'Nora · owner'],
      duties: ['Create a vendor', 'Approve a vendor', 'Initiate a payment', 'Authorize a payment', 'Review transaction activity'],
      initialAssignments: [0, 0, 1, 1, 2],
      conflicts: [
        { duties: [0, 1], reason: 'One person can create and approve a vendor, increasing the risk of a fictitious vendor being accepted.' },
        { duties: [2, 3], reason: 'One person can initiate and authorize a payment, allowing an improper payment without independent approval.' },
      ],
    },
    apply: { scenario: 'At a small charity, the bookkeeper can create and approve vendors. The director says she reviews payments monthly. What should the auditor do next?', correctIndex: 1, options: [
      { text: 'Conclude that the monthly review fully compensates for the conflict.', feedback: 'A claimed review is insufficient. Its independence, scope, timeliness and retained evidence must address the vendor and payment risks; a monthly review may detect loss too late.' },
      { text: 'Evaluate the conflict and test the director’s review against the specific risk.', feedback: 'Yes. Inspect actual permissions, transactions and review evidence. Assess whether independent review is timely and complete, consider preventive alternatives and report residual exposure for management action.' },
      { text: 'Require five employees because every duty must have a different person.', feedback: 'There is no universal five-person requirement. Evaluate incompatible authority and feasible controls in this organization; combining compatible responsibilities can be reasonable.' },
    ] },
  },
  {
    id: 'cisa-lab-risk-planning', certId: 'cisa', domainId: '1', title: 'Plan an audit by risk', minutes: 9,
    objective: 'Allocate scarce audit hours while explaining risk assumptions and mandatory coverage.', interaction: 'risk-allocation',
    scenario: 'Cedar Services has 80 audit hours. Payroll must be covered under its approved annual commitment. Online orders and the staff portal compete for remaining hours.',
    explore: ['Impact and likelihood describe exposure; tested controls and incident history inform the assessment. Change the assumptions and compare the resulting priorities.', 'This is an educational scoring model, not an official ISACA methodology. A number cannot capture every legal duty, uncertainty or emerging risk. Mandatory coverage and approval authority remain separate.'],
    challenge: 'Stay within 80 hours and retain mandatory coverage. Increase the online-order threat likelihood and weaken its controls: explain whether your proposed scope should change.',
    takeaway: 'Present assumptions, uncovered risks and resource trade-offs to the body authorized to approve the audit plan.',
    principleIds: ['risk-sets-priority', 'materiality-judgment'], lessonId: 'cisa-l-d1-risk-planning', noteId: '1A3.1', questionIds: ['d1_003'],
    references: [{ title: 'ISACA — IS Audit Basics: Risk-based Audit Planning for Beginners', url: 'https://www.isaca.org/resources/isaca-journal/issues/2017/volume-2/is-audit-basics-risk-based-audit-planning-for-beginners', section: 'Risk-based audit planning and audit universe; the numerical model here is original and educational' }], lastReviewed: '2026-11-09',
    config: { budget: 80, areas: [
      { name: 'Payroll', impact: 4, likelihood: 2, control: 3, incidents: 0, hours: 40, mandatory: true },
      { name: 'Online orders', impact: 5, likelihood: 3, control: 2, incidents: 1, hours: 40, mandatory: false },
      { name: 'Staff portal', impact: 2, likelihood: 2, control: 3, incidents: 0, hours: 20, mandatory: false },
    ] },
    apply: { scenario: 'A newly outsourced payment service scores highest, but including it makes the plan exceed available hours. A mandatory regulatory review also remains due. What is the best proposal?', correctIndex: 0, options: [
      { text: 'Retain mandatory coverage and escalate documented scope and resource options for approval.', feedback: 'Yes. Explain payment exposure, mandatory obligations and what would remain unaudited. Propose additional resources, revised timing or a justified scope change to the authorized approver.' },
      { text: 'Drop the mandatory review because the payment service has a higher score.', feedback: 'A simplified score cannot waive an obligation. Confirm the constraint and escalate the conflict; the audit team cannot silently remove required coverage.' },
      { text: 'Keep last year’s plan because its hours already fit.', feedback: 'An affordable plan can still omit material new risk. Reassess the audit universe and explain resource constraints instead of treating historical coverage as sufficient.' },
    ] },
  },
  {
    id: 'cisa-lab-risk-ownership', certId: 'cisa', domainId: '2', title: 'Map risk decision authority', minutes: 8,
    objective: 'Distinguish operational accountability, risk acceptance, board oversight and independent assurance.', interaction: 'authority-mapping',
    scenario: 'Juniper Logistics finds control deficiencies in its dispatch system. Its charter delegates risk acceptance within appetite to the business owner, remediation funding to the executive committee, implementation to IT and independent assurance to internal audit. The board oversees risk appetite and material exposure.',
    explore: ['Identification can involve many people. Here, IT reports the technical deficiency, the business owner leads impact assessment and accountable management decides the response.', 'The board provides oversight; it does not run each fix. Internal audit can advise and assess evidence without accepting management’s risk or implementing the control. These assignments follow this fictional charter, not a universal organization chart.'],
    challenge: 'Correct the flawed assignments. Keep the auditor independent and route acceptance and funding to the authority specified in the charter.',
    takeaway: 'Check the actual charter, delegated limits and escalation path before deciding who may accept a risk.',
    principleIds: ['management-owns-risk', 'independence-throughout'], lessonId: 'cisa-l-d2-governance', noteId: '2A2.1', questionIds: ['d2_001', 'd2_002'],
    references: [{ title: 'The IIA’s Three Lines Model', url: 'https://www.theiia.org/globalassets/documents/resources/the-iias-three-lines-model-an-update-of-the-three-lines-of-defense-july-2020/three-lines-model-updated-english.pdf', section: 'Governing body, management and internal audit roles; independence' }], lastReviewed: '2026-11-09',
    config: { roles: ['IT management', 'Business owner', 'Executive committee', 'Internal audit', 'Board'], initialAssignments: [0, 3, 3, 0, 3, 0, 1], decisions: [
      { label: 'Report the technical risk', expectedRole: 0, reason: 'IT identifies and reports this technical deficiency; others can also identify risks.' },
      { label: 'Lead business risk assessment', expectedRole: 1, reason: 'The business owner assesses business impact with IT and risk specialists.' },
      { label: 'Accept risk within delegated appetite', expectedRole: 1, reason: 'The charter delegates this management decision to the business owner, not audit.' },
      { label: 'Approve remediation funding', expectedRole: 2, reason: 'The executive committee holds this budget authority under the charter.' },
      { label: 'Implement the technical control', expectedRole: 0, reason: 'IT implements management’s approved response; audit must not implement what it assures.' },
      { label: 'Independently evaluate effectiveness', expectedRole: 3, reason: 'Internal audit provides independent assurance based on evidence.' },
      { label: 'Oversee material risk and appetite', expectedRole: 4, reason: 'The board directs and monitors risk oversight without operating the controls.' },
    ] },
    apply: { scenario: 'A dispatch-system exposure exceeds the business owner’s delegated acceptance limit. The audit team confirmed the weakness. Who should decide acceptance?', correctIndex: 2, options: [
      { text: 'The auditor, because the auditor confirmed the exposure.', feedback: 'Confirming a finding does not confer management authority. Audit evaluates and reports; accepting risk would compromise its independence.' },
      { text: 'The IT technician, because the weakness is technical.', feedback: 'Technical expertise informs assessment but does not confer business risk acceptance authority. Check delegated limits and escalate.' },
      { text: 'The higher management or governance authority designated by the charter.', feedback: 'Yes. Escalate beyond the business owner’s limit to the designated authority, with business impact and response options. The board’s involvement depends on the charter and materiality.' },
    ] },
  },
  {
    id: 'cisa-lab-change-controls', certId: 'cisa', domainId: '3', title: 'Build a controlled change', minutes: 8,
    objective: 'Arrange change controls and compare normal deployment with a documented emergency procedure.', interaction: 'control-workflow',
    scenario: 'Maple Transit must update its booking service. Normally it assesses, authorizes and tests before deployment approval. During an urgent incident its documented procedure permits constrained testing to finish after implementation, with emergency authorization, rollback arrangements and subsequent review.',
    explore: ['A ticket provides traceability; impact assessment, approval, testing and verification each meet a different control objective. Reordering or removing steps changes the exposure.', 'Emergency procedures can accelerate decisions and use delegated approvers. Urgency is not a blanket exemption from authorization, records or later review. Testing depth should reflect risk and the circumstances.'],
    challenge: 'Create a normal workflow without identified gaps. Then enable emergency mode and move testing after implementation but before review. Explain the evidence needed to justify that exception.',
    takeaway: 'Evaluate whether change evidence demonstrates appropriate authorization, proportionate testing and verified outcomes.',
    principleIds: ['prevent-before-detect', 'proven-not-configured'], lessonId: 'cisa-l-d3-change', noteId: '4A8.1', questionIds: ['d4_033', 'd4_185'],
    references: [{ ...nistControls, section: 'CM-3 Configuration Change Control and discussion of unscheduled changes; CM-4 Impact Analyses' }], lastReviewed: '2026-11-09',
    config: { steps: ['Change request', 'Risk and impact assessment', 'Appropriate authorization', 'Testing', 'Deployment approval', 'Implementation', 'Verification and subsequent review'], initialOrder: [0, 1, 2, 3, 4, 5, 6] },
    apply: { scenario: 'An urgent fix restored service. There is no record of who authorized it, and no subsequent review. Operations says emergency changes are exempt. What is the strongest audit response?', correctIndex: 1, options: [
      { text: 'Accept the change because service was restored.', feedback: 'A successful outcome does not establish authorization or control operation. Emergency changes still need an accountable procedure and evidence.' },
      { text: 'Examine the emergency procedure and approval, testing, rollback and review evidence.', feedback: 'Yes. Missing authorization and subsequent review are significant control concerns. Check the actual emergency rules and evidence, report deviations and recommend corrective action without assuming every normal step had to precede deployment.' },
      { text: 'Report any postdeployment testing as automatically prohibited.', feedback: 'A documented emergency procedure can permit justified deferred testing. Assess risk, approval, proportionate checks and prompt follow-up rather than imposing the normal sequence universally.' },
    ] },
  },
  {
    id: 'cisa-lab-business-impact', certId: 'cisa', domainId: '4', title: 'Recover business dependencies', minutes: 9,
    objective: 'Connect interruption impacts and shared system dependencies to recovery resource decisions.', interaction: 'dependency-simulation',
    scenario: 'Willow Distribution needs identity services, order processing and dispatch to resume deliveries. Its public information site has a separate dependency. Recovery teams have five resource units for the first wave.',
    explore: ['BIA starts with business processes, their interruption impacts and dependencies. A restored application may still be unusable when identity or another dependency is down.', 'Financial exposure here is hourly loss multiplied by interruption hours. Operational criticality also matters; money alone does not decide priority. Business requirements inform recovery objectives before technical strategies are chosen.'],
    challenge: 'Within five resource units, restore both order-taking and dispatch. Compare that choice with restoring the public site first, then change criticality and interruption duration to explain when priorities might differ.',
    takeaway: 'Trace recovery capability to documented business needs. BIA informs RTO and RPO; technical convenience does not set business tolerance.',
    principleIds: ['recover-by-business-priority'], lessonId: 'cisa-l-d4-bia', noteId: '4B1.1', questionIds: ['d4_004', 'd4_020'], relatedLabIds: ['cisa-lab-rto-rpo'],
    references: [{ title: 'NIST SP 800-34 Rev. 1 — Contingency Planning Guide', url: 'https://doi.org/10.6028/NIST.SP.800-34r1', section: '§3.2 Business Impact Analysis; §3.4 Contingency Strategies' }], lastReviewed: '2026-11-09',
    config: { budget: 5, duration: 4, systems: [{ name: 'Identity', cost: 1 }, { name: 'Orders', cost: 2 }, { name: 'Dispatch', cost: 2 }, { name: 'Public website', cost: 2 }], processes: [
      { name: 'Take orders', criticality: 4, hourlyLoss: 3000, dependencies: [0, 1] },
      { name: 'Dispatch deliveries', criticality: 5, hourlyLoss: 5000, dependencies: [0, 1, 2] },
      { name: 'Publish company information', criticality: 1, hourlyLoss: 200, dependencies: [3] },
    ] },
    apply: { scenario: 'A recovery plan restores the high-revenue ordering application first, but its required identity service is scheduled for the next day. The BIA requires orders within four hours. What is the best conclusion?', correctIndex: 0, options: [
      { text: 'The proposed sequence does not yet demonstrate the business requirement can be met.', feedback: 'Yes. End-to-end recovery includes identity and other dependencies. Verify the dependency map, restore and test the required service chain, and compare demonstrated capability with approved business objectives.' },
      { text: 'The plan is adequate because the highest-revenue application comes first.', feedback: 'Revenue ranking ignores the dependency that prevents orders from functioning. Business availability requires a usable service chain, not just a running application.' },
      { text: 'Change the BIA to match the technical team’s preferred sequence.', feedback: 'Technical constraints should be reported and addressed. Management evaluates gaps and options against business needs; changing requirements merely to match current capability conceals the problem.' },
    ] },
  },
];
