# The "coming from CISA" bridge: outline

The plan for the one hand-written study piece of the CIA Challenge Exam pack:
the bridge notes (later `data/cia/ciac/notes/bridge.json`) and the bridge
section of the Challenge exam guide (`data/cia/ciac/exam/ciac_exam_guide.json`,
with `iia-mindset-coach`). Written 20 Nov 2026 by `cia-challenge-bridge-expert`
as step 4 of Session G (`docs/content/CIA_BANK_PLAN.md`). Re-read on 25 Nov 2026
against the Part 2 and Part 3 notes, the cross-part review and the lessons in
plan section 7; the changes are listed in section 0b. The bridge notes are now
written from it: `data/cia/ciac/notes/bridge.json` (29 sub-topics; section 4
always listed 29, its "28" was a miscount).

KaiSip is independent and is not affiliated with, or endorsed by, The IIA or
ISACA. CISA® is a registered trademark of ISACA. No prep provider's question
bank was opened. Everything below is in KaiSip's own words.

## 0. How to read this outline

- **The exam.** One Challenge Exam for every pathway, five sections: A 20%,
  B 15%, C 20%, D 25%, E 20% (`currency.json`: `ciac.weights`,
  `ciac.same_content_all_pathways`). Any other exam fact a bridge note or the
  guide states comes from `data/cia/shared/currency.json`, by fact id.
- **Codes.** Challenge topics are written `4A1` to `4E8` (section D runs to
  `4D10`), as in the generated pack; `data/cia/shared/outline.json` lists the
  same 40 topics as `CA1` to `CE8`. **KaiSip's CISA notes also use codes such
  as `4A1`** (CISA domain 4), so this outline, and every bridge note, writes
  "CISA notes 1B3.1" for the CISA side and never a bare code.
- **The CISA side** comes only from KaiSip's own CISA material: sub-topics of
  `data/cisa_notes.json` (by id and name) and subtopic labels in
  `data/originals/_bank_index.md`. No ISACA page was opened (see section 6).
- **The IIA's side** comes from `docs/content/CIA_LENS.md`, re-read against the
  opened Standards text on 20 Nov 2026. Strength marks, as in the lens:
  **(R)** Requirements, a must. **(CI)** Considerations for Implementation, a
  should or a may. **(EC)** an essential condition for the board or senior
  management. **(S)** a Challenge syllabus line with no Standards text behind it.
- **Key column.** "Key": an item may be keyed on the rule at the strength
  shown. **TNK**, "teach, never key": the point is on the plan's "do not key
  on" list (section 8b), on the lens's list of ambiguous or silent points, or
  rests on a source that was not opened.
- **Citations.** "Std 9.4" stands for the Verified library bullet "Global
  Internal Audit Standards (2024), Standard 9.4 Internal Audit Plan". Every
  source named below sits under a Verified heading of
  `data/cia/shared/_framework_library.md`: the Standards (Glossary, About the
  International Professional Practices Framework, the Domain III and Domain V
  introductions and the numbered standards cited), the Cybersecurity Topical
  Requirement, the Topical Requirements Application Guidance, the Three Lines
  Model Statement of Position, and the Challenge syllabus (V2.10.2025 FINAL).

## 0b. What changed on 25 Nov 2026, and why

| Where | Change | Why |
|---|---|---|
| Section 0, C6 | The Topical Requirements Application Guidance no longer appears under "Rests on". It is Background: never a key, never a first citation, cited only as guidance | `cia-currency-checker`'s ruling (plan section 7, Part 2 round 1): the exam reference list names each requirement and its user guide, not the Application Guidance |
| A3, C5 | Two routes, kept apart: a scope limitation inside an assurance engagement (discuss with management; if unresolved the CAE takes it to the board, Std 13.3), and management cutting approved scope or budget (the CAE promptly tells the board and senior management, Std 10.1, 9.4, 8.1) | Part 1 note 1A7.4 and Part 2 notes 2A1.3 and 2A7.3 were corrected to these two routes |
| B1 | The four matters of Std 9.4 go to the board and senior management together, with no order among them | The Part 3 notes audit found an invented order (HARD); Part 1 note 1A4.4 was corrected from "board first" |
| B3 | Mission statement labeled "Common usage"; the Standards require a vision only | Part 3 note 3A3.2 |
| A10 | Plan completion counts toward efficiency and effectiveness (Std 12.1, 8.3), not "productivity"; measuring auditors by findings counts is warned against in Std 2.2's considerations (a should) | Part 3 notes audit (HARD) and note 3C3.2 |
| C4, D5 | One wording for every approval: "the CAE, or a supervisor the CAE delegates to" | The shared fix brief for the Part 2 notes (plan section 7, round 15) |
| D7 | No contrast left: the Part notes define a walk-through as following one transaction from start to finish, the same meaning as CISA notes 1A3.4. The Standards do not define it; teach the common meaning, never key a finer one | Part notes 1C8.1, 1D2.2 and 2A6.1 |
| D8 | The way up follows Part 2 note 2C2.3: a scope limitation to management, then the CAE; resource gaps and impairments to the CAE; violations to those with authority to act; reaching the board is the CAE's step | The one escalation route set in the Part 2 fix pass |
| E4 | Std 14.4: discussing recommendations with the management of the activity under review is a must; discussing the feasibility of action plans is a should | Re-read of Std 14.4 on 25 Nov 2026 |
| E8 | Unchanged in substance; the Part notes now teach the first step (responsible management) as a should everywhere | Part 2 note 2C2.3 was corrected in the Part 3 notes audit |
| E9 | "Test significant findings' actions; inquiry backed by evidence may do for minor ones" and the signs that a delay is accepted risk are KaiSip's reading (Part 3 notes 3D7.2, 3D8.3): teach, never key | Part 3 notes labels |
| Section 4 | 4X3.2 now holds the strategy, the required reports and private sessions; themes and wider conclusions moved whole to 4X6.3, so no rule is taught twice | Found while writing |
| Section 4 | Format decisions, taken to write the file (section 7, questions 1 and 2, stay open for the app): see "As written" under section 4 | |

## 1. Section by section

The new learning sits mostly in sections A, B and E (running the function, the
board, quality, results). Sections C and D reuse the most CISA knowledge, so
the bridge uses them mainly for wording and for "who approves".

### Section A (20%; 4A1 to 4A8): Internal Audit Professionalism and Quality

**Transfers.** CISA notes 1A1.3 The Audit Charter; 1A1.4 The IS Audit Function
and the Audit Committee; 1A1.5 Independence and Objectivity (it already
separates the function from the person); 1A1.2 ISACA Code of Professional
Ethics; 2A2.3 The Three Lines Model and Audit's Place; 1B6.1 to 1B6.4 (1B6.3
already cites Std 8.4). Bank labels: Audit Charter & Authority; Audit
Independence. Reporting Line; Personal Independence (Self-Review);
Independence. Prior Consulting Work; Three Lines Model. Roles and Boundaries;
Audit Quality Assurance Program; External Quality Assessments. Validated
Self-Assessment.

| # | Topic | The ISACA habit (KaiSip CISA source) | The IIA's rule, with its strength | Rests on | Key? |
|---|---|---|---|---|---|
| A1 | 4A1 | The charter is the source of authority, approved by the board or audit committee, or by the highest level of management where there is no committee (CISA notes 1A1.3). | Authority is the internal audit mandate (authority, role, responsibilities). It can come from the board, from law, or both. The chief audit executive must supply the information needed to set it and must record it in the internal audit charter (R). The board approves the charter (stated in 6.1 R; listed as EC in 6.1, 6.2 and 6.3). Senior management gives input and is never the approver. | Std 6.1, 6.2, 6.3; Glossary | Key |
| A2 | 4A1 | Board duties read as rules the board must obey. | They are essential conditions. The chief audit executive's must is to discuss them, show what their absence does, and document an agreed alternative or the disagreement. | Domain III (introduction) | Key as "essential condition", never "the board must" |
| A3 | 4A2 | Independence is settled once the function reports to the audit committee (1A1.3, 1A1.4). | The chief audit executive must confirm independence to the board at least once a year and report incidents and the safeguards used (R). Reporting administratively to the chief executive officer is leading practice (CI). Budget cuts, limits on scope and blocked access are named as situations that may impair independence (CI; also syllabus bullets). | Std 7.1 | Key the R lines; CI lines only as "should" or "may" |
| A4 | 4A2, 4A4 | One route for every threat: disclose to audit management, which reassigns for a serious one (1A1.5). | Function or person decides the route. A person's impairment is disclosed to a designated supervisor or to the chief audit executive (R). If it affects the work, the chief audit executive discusses it with one or more of three parties and decides the action (R). The chief audit executive's own impairment goes to the board (R). The remedies (reassign, reschedule, adjust the scope, outsource) are CI, with no ranking. | Std 2.3, 7.1 | Key the route. TNK: which remedy is "best" (8b, 1B3) |
| A5 | 4A4 | A "cooling-off period" and case-by-case severity (1A1.5). | Never assess an activity one used to be responsible for (R, no time limit). For assurance work, objectivity is presumed impaired when that responsibility ended in the previous 12 months (R). Assurance after advisory work needs the chief audit executive's confirmation and careful staffing (R). Advisory work on a former responsibility is allowed after disclosure to the requester, before accepting (R). | Std 2.2 | Key. TNK: a responsibility that ended more than 12 months ago (8b, 1B2) |
| A6 | 4A3 | Audit never runs risk management, even for a while (CISA notes 2A2.3, a listed trap). | Allowed, with safeguards. An ongoing role is written into the charter and assurance over that area comes another way (R). A temporary role needs independent third-party assurance during it and for 12 months after, plus a plan to hand it back to management (R). Assurance over a function the chief audit executive runs is overseen by an independent party outside internal audit (R). The model itself comes from The IIA's 2026 Statement of Position, not from the Standards. | Std 7.1, 2.2; Statement of Position | Key the R lines. TNK: wording of the superseded 2020 paper (8b, 1A8) |
| A7 | 4A5 | Confidentiality as one of the seven principles of ISACA's code (1A1.2). | Same duty, new authority: follow policy and law when using information, no personal gain, protect it, disclose only under a legal or professional duty (R). The chief audit executive must see that people who assist the function follow the same rules (R). | Std 5.1, 5.2 | Key |
| A8 | 4A6 | Quality is supervision, periodic internal reviews and an outside review every five years, reported to the audit committee (1B6.1 to 1B6.3). | Transfers, with four additions. Internal results go to the board and senior management at least yearly (R). The chief audit executive must discuss the external assessment plan with the board (R); the board approves it and receives the full results straight from the assessor (EC). One assessor at least holds an active Certified Internal Auditor designation (R). Who does not count as independent is CI. | Std 8.3, 8.4, 12.1 | Key each line at its strength. TNK: whether the validator of a self-assessment must be that person (lens) |
| A9 | 4A7 | Standards are a floor that no documented reason sets aside (1A1.1, a listed trap). | Nonconformance is a disclosed state, not an impossible one. Four things are documented and communicated by the chief audit executive: the circumstance, the alternative actions, their impact and the reason (R). Function-wide nonconformance goes to the board and senior management (R); an engagement's goes in its final communication (R). If a law blocks one part, the rest still applies and that is disclosed (R). | Std 4.1, 12.1, 15.1 | Key |
| A10 | 4A8 | Quality metrics as inputs to improvement (1B6.4). | The chief audit executive must set performance objectives with input from the board and senior management, measure progress, ask for feedback and plan actions (R). The board approves the objectives at least yearly (EC). Measuring auditors by findings counts is warned against (CI, Std 2.2); plan completion counts toward efficiency and effectiveness. | Std 12.2, 8.3, 2.2 | Key. TNK: any named scorecard model (S only) |

### Section B (15%; 4B1 to 4B7): Internal Audit Operations and Audit Plan

**Transfers.** CISA notes 1A3.1 The Audit Universe and the Annual Plan; 1A3.2
Risk Assessment Methods; 1B1.4 Audit Resources, Skills and Budgets; 1A1.4;
1A1.7 Using the Work of Other Experts and Auditors. Bank labels: Management of
the IS Audit Function; IS Audit Resource Management; Audit Universe. Definition
and Maintenance; Risk-Based Audit Planning; Audit Plan Adjustment. Resource
Constraint Mid-Year; Using the Work of Other Experts. Almost all of section B
is the chief audit executive's seat, which CISA study touches only lightly.

| # | Topic | The ISACA habit (KaiSip CISA source) | The IIA's rule, with its strength | Rests on | Key? |
|---|---|---|---|---|---|
| B1 | 4B6, 4B4 | The audit committee approves the plan; when resources drop, re-rank and inform it (1A3.1, 1B1.4). | A close match, stated exactly: a documented risk assessment at least yearly, with input from the board and senior management (R); a plan that stays dynamic (R); discussion with both, approval of the plan and of each significant change by the board alone (R); four matters reported in time to both together, in no order: resource limits, a high-risk area with no assurance engagement, conflicting demands, limits on scope or access (R). An urgent change is told to the board at once and approved formally soon after (CI). | Std 9.4 | Key. Never an order among the four matters |
| B2 | 4B5 | "A complete universe comes first" (1A3.1). | An audit universe is one approach, named in the considerations (CI). The must is the documented assessment and a plan that considers IT governance, fraud risk and the compliance and ethics programs (R). The syllabus still asks the candidate to describe the universe. | Std 9.4; S 4B5 | Key the R lines; the universe only as "may" or "one approach" |
| B3 | 4B3 | No counterpart: the strategy in CISA notes 2A2.4 is the organization's IT strategy. | The chief audit executive must build and carry out a strategy for the function, with a vision, strategic objectives and supporting initiatives, and must review it with the board and senior management from time to time (R). Review, not approval. | Std 9.2 | Key. TNK: mission statements (S only; "Common usage" in Part 3 note 3A3.2) |
| B4 | 4B2 | Close a skills gap with training, an expert or co-sourcing; brief the committee (1B1.4). | The chief audit executive builds the budget and must seek the board's approval (R); the board approves budget and resource plan (EC). The effect of too little money, people or technology goes to the board and senior management (R). New technology means training and working with the IT and information security functions (R). | Std 10.1, 10.2, 10.3, 8.2, 6.3 | Key. TNK: job design, reward and coaching techniques by name (S only) |
| B5 | 4B1 | ISACA's framework and its published programs supply the method; the team tailors them (1A1.1, 1B1.2). | The chief audit executive must set the function's own methodologies, test whether they work, update them and train auditors on them (R). Supervision can be delegated; responsibility stays, also for work outside providers do (R). | Std 9.3, 12.3 | Key |
| B6 | 4B7 | "Delegate the work, not the responsibility"; check competence and objectivity first (1A1.7). | Transfers. Added: coordinating with other assurance providers and considering reliance is a must for the chief audit executive (R); the basis for reliance is documented and the conclusions stay internal audit's (R); coordination concerns go to senior management and, if necessary, the board (R). The provider checklist and the assurance map are CI. | Std 9.5 | Key the R lines. TNK: what triggers the step to the board (lens) |
| B7 | 4B4 | One audience: "report to the audit committee" (1A1.4, 1B5.5). | Two audiences with different jobs. Required reports go from the chief audit executive to both: the plan and budget, changes to mandate or charter, possible impairments, results, and the quality program (R). Themes across engagements must be reported in time (R). The board sets what is escalated to it and how (EC). | Std 8.1, 11.1, 11.3 | Key |

### Section C (20%; 4C1 to 4C7): Engagement Planning

**Transfers.** CISA notes 1A3.4 Planning an Individual Engagement; 1A4.1 to
1A4.8 (control concepts); 1B1.2 Audit Programs; 1B1.5 Agile Auditing; 1A2.4
Integrated Audits; 1A2.2 Assurance, Advisory, and Agreed-Upon Procedures;
1B3.5 Handling Suspected Fraud; and, for the recognize-level IT bullets of
4C3, CISA domains 4 and 5. Bank labels: Individual Audit Assignment Scoping;
Audit Objectives; Audit Phases. Planning Depth; Integrated Audit Scope
Decision; Fraud Triangle. Indicator Identification; Engagement Types. Advisory
vs Assurance.

| # | Topic | The ISACA habit (KaiSip CISA source) | The IIA's rule, with its strength | Rests on | Key? |
|---|---|---|---|---|---|
| C1 | 4C5, 4C6 | Audit risk is inherent times control times detection risk; set detection risk, then mix compliance and substantive tests (1A3.5, 1B2.1). | No audit risk model. The engagement risk assessment: understand the activity, find the significant risks to its objectives, consider fraud, judge significance, prioritize (R). The glossary defines inherent and residual risk only. Procedures look at control design, effectiveness and efficiency (S). | Std 13.2; Glossary; S 4C6 | Key the 13.2 steps. The model's words appear only as wrong options |
| C2 | 4C5 | Materiality as a planning threshold (1A3.6). | Significance, judged by likelihood and impact, is the defined term. "Materiality" appears beside it a few times, never as a threshold model. | Glossary; Std 14.3, 4.2 | Key likelihood and impact. TNK: the word difference |
| C3 | 4C2 | Criteria come from policy, standard, regulation or contract; where policy is silent, a recognized framework supplies them (1B5.1; bank label Writing Findings and Recommendations. No Internal Policy Applies). | First judge whether the board and senior management have set adequate criteria. If so, those must be used. If not, find suitable ones by talking with the board, senior management or both (R). Advisory work may not need criteria (R). | Std 13.4 | Key |
| C4 | 4C1, 4C6 | The manager updates the audit program "with approval"; the approver is not named (1B1.2). | Approval of objectives and scope, and of later changes, belongs to the chief audit executive, who also reviews and approves the work program before use and promptly after a change (R). An engagement supervisor may hold these duties by delegation. | Std 13.3, 13.6; Glossary | Key only when the stem names who holds the delegated role (lens) |
| C5 | 4C1 | A scope limit is dealt with at reporting, through the opinion (1B5.4). | Discuss it with management when found and try to resolve it; if that fails, the chief audit executive must take it to the board (R). It is also explained in the final communication (R). Kept apart from management cutting approved scope or budget, which the CAE promptly reports to the board and senior management (R, Std 10.1, 9.4). | Std 13.3, 15.1 | Key |
| C6 | 4C1, 4C3, 4C5 (also 4A6, 4B5) | No counterpart. The risk is reading the Cybersecurity requirement as a technical checklist. | When the scope includes the topic, assurance work must conform and for advisory work conformance is recommended; applicability is assessed and each exclusion is documented with its reason. | About the IPPF; Cybersecurity Topical Requirement (the Application Guidance is Background, cited only as guidance) | Key for Cybersecurity. The other three: teach with their dates from `currency.json`; no item before `testable_from` |
| C7 | 4C3 g, 4C5 | Fraud is handled when red flags appear: document and escalate (1B3.5). | Fraud risk is considered in every engagement risk assessment, at planning (R; advisory work may not need a formal one). The three conditions of the fraud triangle come from the syllabus line. | Std 13.2; S 4C3 g | Key 13.2 and the three conditions by name. TNK: named schemes; whether all three must be present (8b, 1D1) |
| C8 | 4C3 b to f | Deep IT knowledge is the answer (CISA domains 4 and 5). | These bullets ask for recognition, and the question is what the fact means for planning. Finance, accounting and business processes are new ground for most CISA holders. | S 4C3 | TNK beyond what the syllabus line names (no opened IIA source; the GTAG is not opened) |
| C9 | 4C1 | Advisory work is allowed with agreed terms and safeguards (1A2.2); the habit to watch is running it like an assurance engagement. | The engagement type must be considered because the requirements differ (R). For advisory work a formal risk assessment, criteria and evidence-based findings can be left out when the agreement with stakeholders allows it (R, "may"). Objectives and scope are typically set with management (CI). | Std 13.2, 13.3, 13.4, 14.2 | Key. TNK: "limited" against "reasonable" assurance (8b, 1A4) |
| C10 | 4C4, 4C7 | Agile and integrated audits transfer (1B1.5, 1A2.4). | The approaches are syllabus names; the Standards rank none. If resources fall short, internal auditors must raise it with the chief audit executive (R). | S 4C4; Std 13.5 | Key 13.5. TNK: which approach is "best" unless the stem settles it |

### Section D (25%; 4D1 to 4D10): Engagement Performance

**Transfers (the most of any section).** CISA notes 1B3.1 to 1B3.4 (evidence
and techniques); 1B2.1 to 1B2.6 (testing and sampling); 1B4.1 to 1B4.5
(analytics, continuous auditing); 1A2.5 Control Self-Assessment; 1B1.3 Work
Papers and Documentation; 1B5.1 Writing Findings and Recommendations; 1B6.1
Supervision and Ongoing Monitoring. Bank labels: Audit Evidence Reliability;
Audit Evidence. Sufficiency vs Appropriateness; Interviewing Personnel;
Continuous Auditing vs Continuous Monitoring; Audit Work Papers; Audit
Documentation Lifecycle (Retention & Access); Audit Phase. Fieldwork Discipline.

| # | Topic | The ISACA habit (KaiSip CISA source) | The IIA's rule, with its strength | Rests on | Key? |
|---|---|---|---|---|---|
| D1 | 4D2 | "Sufficient and appropriate": two tests, where appropriate means relevant and reliable (1B3.1). | Three named qualities: relevant, reliable, sufficient (R). "Appropriate" is not one. Reliability grows when the auditor gets the information first-hand or from an independent source, when it is corroborated, and when the system behind it is well governed and controlled (R). Sufficient means a prudent, informed, competent person could redo the work and agree (R). | Std 14.1 | Key. TNK: the order of the three words (Std 13.2, Std 9.5 and the syllabus each list them differently) |
| D2 | 4D2 | A long reliability ranking, such as originals over copies (1B3.2). | Only the three strengtheners above are in the Requirements. When relevant evidence cannot be had, decide whether that is itself a finding (R). | Std 14.1 | Key these two. TNK: finer rankings |
| D3 | 4D6 | Criteria, condition, cause, effect, recommendation (1B5.1). | Transfers. Exact form: a finding is the gap between criteria and condition (R); root cause with management when possible (R); significance from likelihood and impact (R); a significant risk must be recorded and reported as a finding (R); findings are ranked by significance using the chief audit executive's method (R). A finding template is CI. | Std 14.2, 14.3 | Key |
| D4 | 4D8 | Opinion types: unmodified, qualified, adverse, disclaimer (1B5.4). | An engagement conclusion: a judgment on the overall significance of the findings taken together. For assurance work it must speak to how effective governance, risk management and control are, and say so when they are effective (R). A rating scale is optional (CI). | Std 14.5, 14.2 | Key. Opinion types appear only as wrong options |
| D5 | 4D7, 4D9 | Supervisors review work papers; an experienced auditor could follow the trail (1B1.3, 1B6.1). | Transfers. Added: engagement documentation needs the chief audit executive's review and approval (R; may be delegated). Supervision is the chief audit executive's responsibility whoever does the work, and evidence of it is kept (R). Retention follows law and policy (R). | Std 14.6, 12.3 | Key with the delegate named. TNK: clearing or keeping review notes (both allowed, CI) |
| D6 | 4D3, 4D4, 4D5 | Named online audit techniques, sampling plans and confidence levels (1B2, 1B4). | Less depth, other labels: technology options, the steps of a data analytics process, kinds of analysis, process maps, ratios and trends (S). In the Standards sampling appears only in considerations (a representative sample, or the whole population with software). | S 4D3 to 4D5; Std 14.1, 13.6 | Key only what a syllabus line names. TNK: fine definitions (the data analytics guides are not opened) |
| D7 | 4D1 | A walk-through traces one transaction end to end (1A3.4). | The same common meaning in the Part notes (1C8.1, 2A6.1); the Standards do not define it. Control self-assessment knowledge carries over to the questionnaires and surveys the syllabus names. | S 4D1 | TNK: any finer definition of a walk-through |
| D8 | 4D10, 4D9 | Pressure or deadlock goes to the audit committee (1A1.4, 1B5.5). | Internal auditors must tell management the objectives, scope and timing, and any change in time (R). On disagreement they discuss, seek a shared understanding, and change nothing without a valid reason (R). The way up (Part 2 note 2C2.3): a scope limitation to management, then the CAE; resource gaps and impairments to the CAE; violations to those with authority to act; reaching the board is the CAE's step. | Std 13.1, 13.3, 2.3, 1.3, 8.1 | Key |

### Section E (20%; 4E1 to 4E8): Engagement Results and Monitoring

**Transfers.** CISA notes 1B5.1 Writing Findings and Recommendations; 1B5.2
The Exit Meeting and Management Responses; 1B5.3 Report Structure, Audience
and Distribution; 1B5.4 Audit Opinions; 1B5.5 Escalation and Follow-Up; CISA
notes 2A5.2 Risk Appetite, Tolerance and Ownership. Bank labels: Audit Report
Addressee; Audit Reporting. Report Distribution; Communicating Audit Results.
Exit Conference Purpose; Audit Reporting. Disagreement with Management
Position; Audit Follow-up Activities. The engagement steps transfer; who
approves, who sends and who escalates do not.

| # | Topic | The ISACA habit (KaiSip CISA source) | The IIA's rule, with its strength | Rests on | Key? |
|---|---|---|---|---|---|
| E1 | 4E2, 4E4 | The IS auditor issues the audit report, addressed to the audit committee (1B5.3). | Internal auditors draft the final engagement communication. Review and approval by the chief audit executive come before issue, and the same person decides who receives it and how (R; may be delegated, responsibility stays). Before release outside the organization: advice from legal counsel, senior management or both, as required (R). | Std 15.1, 11.3 | Key |
| E2 | 4E2, 4E4 | A weakness fixed during fieldwork is still reported (1B5.1, 1B5.2). | Same direction, exact form: actions management has started or finished must be acknowledged (R). Required content: objectives, scope, conclusions, recommendations or action plans; for assurance work the prioritized findings, any scope limitation and a conclusion on effectiveness; owners and dates (R). | Std 15.1 | Key |
| E3 | 4E2 | No counterpart. | A conformance statement should be included, and fits only when supervision and the quality program support it (CI). An engagement not done in conformance must name the standard, the reason and the impact (R). | Std 15.1 | Key the CI line as "should". TNK: "in accordance with" (syllabus) against "in conformance with" (Standard) |
| E4 | 4E3 | The IS auditor recommends; management decides and implements (1B5.1). | Three choices for each finding: write recommendations, ask management for action plans, or agree actions together (R). Each recommendation must be discussed with the people who manage the activity (R); discussing the feasibility of action plans, with cost against benefit, is a should (CI). A disagreement follows a set method that lets both sides state their positions (R). | Std 14.4, 13.1 | Key |
| E5 | 4E4 | The exit meeting is a fixed step that validates facts (1B5.2). | A closing communication (the Standards add the name "exit conference") may be held, depending on the engagement (CI). | Std 13.1; S 4E4 | Key only as "may"; its purpose from the syllabus line |
| E6 | 4E4 | Late documentation goes in a dated addendum (bank label Audit Work Papers). | A significant error or omission in a final communication: the chief audit executive must send the corrected information promptly to everyone who got the original. "Significant" follows criteria agreed with the board (R). | Std 11.4 | Key |
| E7 | 4E5 | A severity rating per finding and an overall opinion (1B5.1, 1B5.4). | Ranking findings by significance is a must (R). A rating scale and the residual-risk steps are CI. Themes across engagements must go to the board and senior management (R). A conclusion for a business unit or the whole organization, when one is given, has required parts (R). | Std 14.3, 14.5, 11.3 | Key each line at its strength |
| E8 | 4E6 | "The IS auditor never accepts risk": check the acceptance is within appetite and approved, then report it to the committee (1B5.5; CISA notes 2A5.2). | Trigger: the chief audit executive concludes that management accepted risk above the organization's risk appetite or risk tolerance (R). Next: discuss with senior management (R); if unresolved, escalate to the board (R). Resolving the risk is not the chief audit executive's job (R). Raising it first with the managers in charge is CI. | Std 11.5 | Key the R sequence. TNK: "responsible manager first" as a must; senior management against the responsible manager as the final two; appetite against tolerance; who sets risk tolerance (8b, 1C5; CISA notes 2A5.2 give ISACA's answer); the syllabus phrase "may be unacceptable" |
| E9 | 4E7, 4E8 | Follow-up independently verifies agreed actions, scaled to risk; repeat findings go to the audit committee (1B5.5). | The steps match. A set method has three parts: ask about progress, re-assess on a risk basis, keep a tracking record current; depth follows significance (R). When dates are missed: get and document management's explanation and take it to the chief audit executive, who determines whether the delay amounts to accepting risk beyond tolerance (R). The difference is who decides and who escalates: then E8's route. | Std 15.2, 11.5 | Key. TNK: which findings get testing rather than inquiry, and the signs that a delay is acceptance (KaiSip's reading, Part 3 notes 3D7.2 and 3D8.3) |
| E10 | 4E1 | No fixed list in the CISA notes. | Seven named qualities of a communication (the list is R; what each one means sits in CI). | Std 11.2, 15.1 | Key the list. TNK: borderline cases between two qualities |

## 2. Term table plan

Left: the term in KaiSip's CISA material. Right: The IIA's 2024 term, the only
one a CIA item may use. Evidence: counts in the opened texts (the 2024
Standards unless named), made 20 Nov 2026 with the gate's normalizing. Gate:
`data/cia/shared/stale_terms.json`.

| ISACA term (CISA material) | The IIA's term | Evidence that it is the 2024 term | Gate today |
|---|---|---|---|
| IS auditor | internal auditor | 0 against 581 in the Standards | Banned (isaca); allowed in the bridge and the guide |
| audit charter | internal audit charter, which holds the internal audit mandate | "internal audit charter" 48, "internal audit mandate" 44; Std 6.1, 6.2 | Not listed |
| audit committee | board | "board" 348; "audit committee" 3, twice as one kind of board (Glossary) | Not listed (and correct English) |
| auditee, auditee management | the management of the activity under review | "auditee" 0 everywhere; "activity under review" 93 | Not listed: proposed |
| engagement client (older IIA text) | the same | 7 in the two-way mapping as the 2017 term; 0 in the Standards | Not listed: proposed (2019) |
| audit program | engagement work program | 0; "work program" 49; Std 13.6 | Not listed: proposed |
| sufficient and appropriate evidence | relevant, reliable and sufficient information | 0; the 14.1 trio 7 times | Not listed: proposed |
| materiality | significance | "significance" 37 and a Glossary entry; "materiality" or "material" 10, so the word is not wrong, only not the defined term | Not a gate term; teach only |
| audit risk; control risk; detection risk | engagement risk assessment; inherent risk and residual risk | 0 for all three; "inherent risk" and "residual risk" are Glossary entries | Not listed: "audit risk" and "detection risk" proposed |
| audit opinion (and its four types) | engagement conclusion | "audit opinion" 0; "engagement conclusion" 20; the glossary comparison says the older "engagement opinion" gave way to it | Not listed: proposed |
| overall opinion (older IIA text) | results of internal audit services; a conclusion for a business unit or the organization | Glossary comparison; Std 11.3 | Not listed: proposed (2019) |
| audit report | final engagement communication | 26 against 0 in the Standards. The Challenge syllabus itself says "audit reports", so both are shown | Not listed (syllabus term) |
| exit meeting, closing conference | closing communication (exit conference) | Std 13.1 (CI) and syllabus 4E4 | Not listed |
| follow-up activities | confirming that recommendations or action plans were implemented | The wording of Std 15.2's title; "follow-up" stays in ordinary use (6 times) | Not listed |
| proficiency | competency | Principle 3; "competency" or "competencies" 72, "proficiency" once (Std 12.3) | Not listed |
| ISACA Code of Professional Ethics | Domain II, Ethics and Professionalism (Principles 1 to 5) | The Standards call the earlier code "former" | "IIA Code of Ethics" banned (2019) |
| ITAF standards, guidelines, tools and techniques | Global Internal Audit Standards (Requirements, Considerations for Implementation), Topical Requirements, Global Guidance | About the IPPF | "ITAF" banned (isaca). No ITAF number in the bridge (section 6) |
| quality assurance of the audit function; peer review | quality assurance and improvement program; external quality assessment | 19 for the program's name; "peer review" 0 | Not listed |
| audit manager, audit management | engagement supervisor; chief audit executive | "engagement supervisor" 21 and a Glossary entry; "audit manager" 0 | Not listed |
| chief audit executive (CAE) | chief audit executive | Same term. The Standards never abbreviate it (0) | Not listed |
| work papers | workpapers; engagement documentation | 59 and 9; Std 14.6 | Not listed |
| annual audit plan | internal audit plan | 62; the syllabus also says "risk-based audit plan" | Not listed |
| advisory (consulting) engagement | advisory services | The Glossary notes the older name | "consulting services" banned (house) |
| compliance and substantive testing | procedures on control design, effectiveness and efficiency | 0 for the ISACA pair; syllabus 4C6 | Not listed |
| threats (self-review threat) | impairments (self-review bias, familiarity bias) | "impairment" 62, "threat" 2; Std 2.2, 2.3; syllabus 4A4 | Not listed |
| management response | action plan | 71 against 1 | Not listed |
| CAATs | technology; data analysis software | 0; Std 10.3, 14.1 | Not listed |
| Three Lines Model | the same, never "of defense" | CISA notes 2A2.3 already use the current name | Old name banned (2019) |

Rules for using the table:

- The bridge file may show isaca, house and 2019 class terms, always beside
  The IIA's term. The exam guide is allowed the isaca class only: no
  "consulting services", no old model name, no four-digit number there.
- No ITAF standard number anywhere: written after the word "Standard", 1001,
  1002, 1201 and 1202 match the gate's pattern for 2017 IIA numbers.
- A `compare` holds five rows at most, so the table is split by theme across
  sub-topics; the full list sits in `key_terminologies` (30 entries at most).

## 3. Lens traps

Where a CISA-trained candidate picks the wrong option, each with the shared
principle (`data/cia/shared/principles.json`) that corrects it.

| # | The slip | What it looks like in the options | Principle id | Coached in |
|---|---|---|---|---|
| 1 | Answering as the IT specialist | The option with the best technical fix or the deepest control detail, when the question asks what the fact means for the engagement (C8) | `know-your-seat`; `management-owns-risk-and-action` | 4X1.2, 4X4.4 |
| 2 | One governance audience | "Senior management and the board approve", or the audit committee as the answer to everything (A1, B1, B7) | `board-approves-management-supports` | 4X1.4, 4X2.1, 4X3.3 |
| 3 | The engagement auditor does the chief audit executive's part | The auditor issues the report, approves a scope change, or goes to the board alone (C4, D8, E1, E9) | `know-your-seat`; `discuss-then-escalate` | 4X1.2, 4X6.1, 4X6.5 |
| 4 | "Report it to the audit committee" | Skipping senior management, or checking that the risk was "properly approved" and stopping there (E8) | `discuss-then-escalate` | 4X6.4 |
| 5 | A framework as the authority | Choosing an IT control framework or ISACA's framework as the criteria before asking what management has set (C3) | `plan-before-testing` (nearest; none fits exactly) | 4X4.2 |
| 6 | ISACA's evidence, risk and opinion words | "Sufficient and appropriate", detection risk, a qualified opinion: each marks an option written in the wrong lens (C1, D1, D4) | `relevant-reliable-sufficient` | 4X4.3, 4X5.1, 4X5.3 |
| 7 | "Never" where the Standards say "with safeguards", and "must" where they say "should" | Refusing any role beyond internal auditing; calling the audit universe, the exit conference or reporting to the chief executive officer mandatory (A3, A6, B2, E5) | `must-or-should`; `no-self-review` | 4X1.3, 4X2.4 |
| 8 | Assurance rules applied to advisory work | Insisting on formal criteria and evidence-based findings for advice, or relaxing objectivity because it is "only advice" (A5, C9) | `advise-never-decide` | 4X4.5 |

Also coached, with no row of its own: treating the Standards as a floor that
cannot be missed, where The IIA expects disclosure (A9, `tell-it-straight`).

## 4. Proposed structure of `bridge.json`

One domain object in notes schema v2, with the root keys of a Part notes file
(`domain_number`, `domain_name`, `exam_weight`, `source`, `overview`,
`analogy`, `parts`, `topics`, `key_terminologies`, `references`). Six topics,
29 sub-topics. Topic codes use the letter X (`4X1` to `4X6`), which no
syllabus section uses: a bridge code cannot be taken for a Challenge topic,
and the gates' pattern for `_provenance` (letters A to G) cannot match one.

| Id | Sub-topic (working name) | One-line purpose | Contrasts |
|---|---|---|---|
| 4X1.1 | What Transfers and What Is New | A map of the five sections and where a CISA holder should spend time | all |
| 4X1.2 | Three Seats, One Exam | Internal auditor, engagement supervisor, chief audit executive: who approves, sends and escalates | C4, E1 |
| 4X1.3 | Must, Should and Essential Conditions | How the Standards are built, and how to read strength in an option | A2 |
| 4X1.4 | The Board and Senior Management | Two audiences: one approves, one supports | A1, B7 |
| 4X1.5 | Words That Change | The core swaps for roles and documents | section 2 |
| 4X2.1 | Mandate and Charter | Where authority comes from and who approves the charter | A1, A2 |
| 4X2.2 | Independence of the Function | Yearly confirmation, impairments, the reporting lines | A3, A4 |
| 4X2.3 | The Person: Objectivity and Confidentiality | The 12-month presumption, disclosure, use of information | A4, A5, A7 |
| 4X2.4 | Roles Beyond Internal Auditing | The Three Lines Model and the safeguards for other roles | A6 |
| 4X2.5 | The Quality Program and Who May Assess | Internal and external assessments, the board's part, the assessor | A8 |
| 4X2.6 | Nonconformance and Performance Measures | Disclosing a gap; objectives the board approves | A9, A10 |
| 4X3.1 | Running the Function | Methodologies, budget, people and technology | B4, B5 |
| 4X3.2 | Strategy and Reporting to the Board | The strategy, the required reports, private sessions (themes moved to 4X6.3) | B3, B7 |
| 4X3.3 | The Plan: Board-Approved and Dynamic | Risk assessment, the universe as one approach, changes | B1, B2 |
| 4X3.4 | Coordination and Reliance | Other assurance providers and the basis for relying | B6 |
| 4X4.1 | Objectives, Scope and Who Approves | Approvals, scope limitations, changes | C4, C5 |
| 4X4.2 | Criteria: Management's First | Adequate criteria before any outside framework | C3 |
| 4X4.3 | Risk Assessment Without the Audit Risk Model | The 13.2 steps, significance, fraud at planning | C1, C2, C7 |
| 4X4.4 | A Scope Wider Than IT | Recognize-level IT, finance and business processes; approach and resources | C8, C10 |
| 4X4.5 | Topical Requirements and Advisory Work | When a requirement applies; where advisory rules differ | C6, C9 |
| 4X5.1 | Relevant, Reliable, Sufficient | The three qualities and what makes information reliable | D1, D2, D7 |
| 4X5.2 | Tools and Analytics at Syllabus Depth | What the syllabus names, and how much less it asks than CISA | D6 |
| 4X5.3 | From Finding to Engagement Conclusion | Gap, root cause, significance, conclusion in place of opinion | D3, D4 |
| 4X5.4 | Workpapers, Supervision and Speaking Up | Documentation test, review, the route upward | D5, D8 |
| 4X6.1 | The Final Engagement Communication | Content, approval, distribution, errors | E1, E2, E3, E6, E10 |
| 4X6.2 | Recommendations, Action Plans and Disagreement | The three choices; the closing communication | E4, E5 |
| 4X6.3 | Ratings, Themes and Wider Conclusions | Prioritizing, residual risk, themes and wider conclusions | E7, B7 |
| 4X6.4 | When Management Accepts Too Much Risk | The trigger and the sequence | E8 |
| 4X6.5 | Confirming Actions and Escalating | The three follow-up steps; delay as acceptance | E9 |

How each sub-topic is built:

- **The lesson stands without ISACA.** `definition`, `why_it_matters`,
  `how_it_works`, `example` and `isaca_rule` (the schema's name for the lens
  field, as in the Part notes) use The IIA's terms only, so an accountant can
  read them. Every rule line says must, should or may.
- **The CISA aside is labeled.** Proposed, with no schema change: a `compare`
  table with the columns "In your CISA study" and "On the CIA Challenge Exam",
  plus one `exam_traps` entry that names the CISA habit.
- **Links and dates.** Challenge topics are named in plain text ("Challenge
  4E6"). No `practice_ids` (the linter ties them to one section file) and no
  `audit_focus`. No dated fact except the section weights; Topical Requirement
  dates appear only in 4X4.5, copied from `currency.json`.
- **Size.** 29 sub-topics at the schema's 180 to 380 words: about 8,000 words,
  near 120 KB of JSON (the Part 1 notes run about 4.4 KB a sub-topic).
- **Order of writing.** Done on 25 Nov 2026, all six topics at once, after the
  Part 2 and Part 3 notes and the cross-part review, so the bridge and the
  notes it points to agree.

**As written (25 Nov 2026).** `domain_number` 0 (the glossary gate already uses
0 for "the whole Challenge exam"), `exam_weight` "All sections", one part `X`.
The CISA aside is a `compare` whose columns are "In CISA study: <subject>" and
"On the CIA exam: <subject>" (the subject keeps each column name unique, so the
linter's one-place-per-term rule holds) plus one `exam_traps` entry that opens
"As in CISA study" or names the habit. `definition`, `why_it_matters`,
`how_it_works`, `example` and `isaca_rule` use The IIA's terms only, except in
4X1.1 and 4X1.5, whose subject is the transfer itself. Every rule line opens
with Must, Should, May, Essential condition, Syllabus line, Common usage or
KaiSip's reading. Every key term reuses the wording of the shared glossary or
of the Part notes (checked by script; `check_glossary.py` does not read the
bridge). `key_terminologies` holds 24 CISA-side terms, each value opening "CIA
term:"; terms with the same name on both sides are left out so no term has two
definitions. Every CISA reference reads "CISA notes <id>", each code with its
own prefix. No `practice_ids`, no `audit_focus`, no Challenge or Part code.

**The exam guide's bridge section** (working id `coming-from-cisa`): who the
exam is for and the entry rules (fact ids `ciac.pathways`, `ciac.cisa_entry`,
`ciac.same_content_all_pathways`, `ciac.registration_days`, `ciac.extensions`,
`ciac.windows`, `ciac.attempt_limit`); what transfers and what is new, one line
per section; the eight traps in short form; a pointer to the bridge notes. No
"conversion", "shortcut" or partnership wording, no pass promise, no scaled
score for a KaiSip mock, and the ISACA trademark line from the blueprint.

## 5. Gates

| Gate | Today | What the bridge needs |
|---|---|---|
| `scripts/lint_notes.py` | With `--part 4` a file must be one syllabus section, so a bridge file fails ("the outline has no code for part 4"). Without `--part`, a domain object whose `domain_number` matches no outline code skips the topic check. 25 Nov 2026: `python3 scripts/lint_notes.py data/cia/ciac/notes/bridge.json --outline docs/content/CIA_BLUEPRINT.md --bank data/cia/ciac/originals` gives 0 errors and 1 warning (no `audit_focus`, by design). | Lint without `--part` (as now), or add a small bridge mode. |
| `data/cia/tools/run_gates.sh` | Lints `notes/d[0-9].json` for cia1 to cia3 only. `bridge.json` is never linted (still true on 25 Nov 2026); the stale-terms and originality gates do read it. | Add a line for `ciac/notes/bridge.json`, with a planted fault in `prove_harness.py`. |
| `check_glossary.py` | Reads the Part packs' notes only, so a bridge key term could drift from the shared glossary unseen. | Read `ciac/notes/bridge.json` too (a term the bridge defines must match the glossary or the Part notes). |
| `check_stale_terms.py` | The allow list already names `ciac/notes/bridge.json` (isaca, house, 2019) and the guide (isaca), matched by exact path. | No change to pass. Proposed new terms in section 2 would stop ISACA wording in the Part packs; each needs its evidence and a harness row, and a dry run on the Part 1 files first ("audit risk" could catch an innocent phrase). |
| `check_originality.py` | Already reads `ciac/notes/bridge.json`, as prose only (the 8-word run). Notes files also get the definition and title checks; the bridge does not. | Run with `--fetch --require`. Proposed: read the bridge as a notes file so its key terms get the definition check. |
| `scripts/cia_pack_dry_run.cjs` | Prints that `bridge.json` "is not a section file: not fed to the notes builder". | Needs the app decision in section 7, then a dry-run step that builds the bridge the way the app will. |
| `scripts/lint_exam_guide.py --cert ciac` | Sources must be on theiia.org or pearsonvue.com; note codes are read from `d*.json` only. | The guide's bridge section carries no isaca.org source link. Linking the guide or the final review week to a bridge id needs the loader to read `bridge.json` too. |
| `check_currency.py` | Checks questions, not notes. | The dates in 4X4.5 are a reviewer's check, not a gate. |
| Plan section 11 (app side) | The generated Challenge notes (Part notes re-coded `4A1` and so on) are built after Parts 2 and 3 have notes; no builder carries the bridge. | The bridge points to those notes by code, so it ships with or after them. The free-sample builder must include it (decision 5: the bridge notes are free). |

## 6. Not verified from an opened source

- **ISACA's own texts.** No ISACA page was opened. Every ISACA claim above is
  what KaiSip's CISA notes and bank index say. `docs/content/ITAF_4TH_EDITION.md`
  records that the repo's ITAF numbers came from search results, not the
  primary text, and that ISACA published a 5th edition in 2026. So the bridge
  names ITAF's three layers as the CISA notes do and cites no ITAF number.
- **Syllabus-only content.** The IT, finance and business-process bullets of
  4C3, the analytics terms of 4D3 to 4D5, the approaches of 4C4, the
  management techniques of 4B2 and mission statements in 4B3 rest on the
  syllabus line alone (the practice guides and GTAGs are "Likely"). Marked TNK.
- **Two rows of the starting table in the agent file need softening.**
  "Materiality" or "material" appears 10 times in the Standards, including the
  Requirements of Standards 1.1 and 4.2, so it is not a banned word. The three
  evidence qualities come in three different orders in the opened texts, so no
  item may turn on their order. A walk-through also means different things in
  the two bodies of material (D7).

## 7. Open questions, and who decides

1. **Where the CISA aside lives.** `compare` plus one `exam_traps` entry
   (proposed), or a new optional field, which needs a linter and renderer
   change. Decides: `cisa-notes-curator` and `mobile-app-engineer`.
2. **How the bridge sits in the pack and the app.** `domain_number` (0, shown
   first, or 6), what `exam_weight` holds for a file that is not an exam
   section, whether codes `4X1` to `4X6` are safe for app code that reads the
   section from a code's first characters, and how it reaches the phone.
   Decides: `mobile-app-engineer`, then the harness owner for section 5.
3. **New gate terms** (section 2: auditee, audit program, sufficient and
   appropriate, audit risk, detection risk, audit opinion; as 2019 terms
   engagement client, engagement opinion, overall opinion). Decides:
   `cia-standards-auditor` and `cia-currency-checker`.
4. **Free bridge notes count as published**, so they wait for the licence
   question in plan section 9. Decides: the owner.
5. **Section-level text for the generated Challenge notes** (plan section 11):
   who writes it and where it is stored, since the plan lists only three
   hand-written Challenge files. Decides: the coordinator.
6. **An aside for accountants.** The exam also serves accounting pathways, but
   KaiSip has no accounting material to check one against. Proposed: not now.
   Decides: `product-manager`.
7. **Correct the two agent-file rows named in section 6.** Decides: the
   coordinator.
