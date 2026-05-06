#!/usr/bin/env python3
"""
Convert data/cisa qa test bank.xlsm into enriched data/domain{1..5}.json files.

Mechanical pass:
  - Pull rows from each DOMAIN_n sheet
  - Map Option_<correct>_exp -> correct_explanation
  - Map other Option_X_exp -> wrong_explanations
  - Regex-extract framework_ref (ISACA / COBIT / NIST / ISO citations) from explanations
  - Heuristically classify difficulty / bloom_level from stem cues
  - Tag subtopic from a controlled vocabulary per domain
  - Author 3 tips per question from stem-pattern templates
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "cisa qa test bank.xlsm"

DOMAIN_TITLES = {
    1: "Information Systems Auditing Process",
    2: "Governance and Management of IT",
    3: "Information Systems Acquisition, Development and Implementation",
    4: "Information Systems Operations and Business Resilience",
    5: "Protection of Information Assets",
}
DOMAIN_WEIGHTS = {1: "18%", 2: "18%", 3: "12%", 4: "26%", 5: "26%"}

# ── KNOWN OCR TYPOS in the source spreadsheet ────────────────────────────────
# Applied at ingest time before any other processing. Order matters: keep more
# specific replacements before general ones.
KNOWN_TYPOS = [
    ("tenninate", "terminate"),
    ("Tenninate", "Terminate"),
    ("tennination", "termination"),
    ("oflnternal", "of Internal"),
    ("ofthe", "of the"),
    ("ISA CA", "ISACA"),
    ("Io ", "In "),
    ("io circumstances", "In circumstances"),
    ("perfo!1ned", "performed"),
    ("perfo!1lled", "performed"),
    ("no!1nally", "normally"),
    ("no!1llally", "normally"),
    ("rno!1lally", "normally"),
]


def fix_typos(text: str) -> str:
    if not text:
        return text
    for bad, good in KNOWN_TYPOS:
        text = text.replace(bad, good)
    return text

# ── FRAMEWORK / STANDARD CITATIONS ───────────────────────────────────────────
FRAMEWORK_PATTERNS = [
    # Catches "ISACA IS Audit Standard 1201", "ISA CA IS Audit and Assurance Standard 1201"
    # (the typo "ISA CA" appears in the source data) and "Standards 1202", etc.
    (re.compile(r"\bISA[\s ]?CA\s+IS\s+Audit\s+(?:and\s+Assurance\s+)?Standard[s]?\s+(\d{3,4}(?:\.\d+)?)", re.I),
     lambda m: f"ISACA IS Audit and Assurance Standard {m.group(1)}"),
    (re.compile(r"\bISACA\s+IS\s+Audit\s+(?:and\s+Assurance\s+)?Standard[s]?\s+(\d{3,4}(?:\.\d+)?)", re.I),
     lambda m: f"ISACA IS Audit and Assurance Standard {m.group(1)}"),
    (re.compile(r"\bISA[\s ]?CA\s+(?:Information\s+Systems\s+\(IS\)\s+)?(?:IS\s+)?Audit\s+(?:and\s+Assurance\s+)?(?:Performance\s+)?Guideline\s+(\d{3,4})", re.I),
     lambda m: f"ISACA IS Audit and Assurance Guideline {m.group(1)}"),
    (re.compile(r"\bISACA\s+(?:Information\s+Systems\s+\(IS\)\s+)?(?:IS\s+)?Audit\s+(?:and\s+Assurance\s+)?(?:Performance\s+)?Guideline\s+(\d{3,4})", re.I),
     lambda m: f"ISACA IS Audit and Assurance Guideline {m.group(1)}"),
    (re.compile(r"ISACA\s+(?:IS\s+Audit\s+and\s+Assurance\s+)?Reporting\s+Standard[s]?", re.I),
     lambda m: "ISACA IS Audit and Assurance Reporting Standards"),
    (re.compile(r"ISA[\s ]?CA\s+Code\s+of\s+(?:Professional\s+)?Ethics", re.I),
     lambda m: "ISACA Code of Professional Ethics"),
    # Generic mentions ("ISACA IS Audit and Assurance Standards require...") with no number
    (re.compile(r"\bISA[\s ]?CA\s+(?:Information\s+Systems\s+\(IS\)\s+)?(?:IS\s+)?Audit\s+(?:and\s+Assurance\s+)?Standards?\b", re.I),
     lambda m: "ISACA IS Audit and Assurance Standards"),
    (re.compile(r"\bIIA\b|Institute\s+of\s+Internal\s+Auditors", re.I),
     lambda m: "IIA Standards"),
    (re.compile(r"\bCOBIT(?:\s*\d+(?:\.\d+)?)?", re.I), lambda m: m.group(0)),
    (re.compile(r"\bNIST(?:\s+SP\s*\d+-\d+)?", re.I), lambda m: m.group(0)),
    (re.compile(r"\bISO(?:/IEC)?\s*\d{4,5}(?:[-:]\d+)?", re.I), lambda m: m.group(0)),
    (re.compile(r"\bPCI[\s-]?DSS", re.I), lambda m: "PCI DSS"),
    (re.compile(r"\bGDPR\b"), lambda m: "GDPR"),
    (re.compile(r"\bHIPAA\b"), lambda m: "HIPAA"),
    (re.compile(r"\bSOC\s*[12]\b", re.I), lambda m: m.group(0)),
    (re.compile(r"\bSSAE\s*\d+\b", re.I), lambda m: m.group(0)),
    (re.compile(r"\bIIA\s+(?:Standards|Standard\s+\d+)\b"), lambda m: m.group(0)),
]


def extract_framework_ref(*texts: str) -> str:
    """Return the first matching framework citation across the explanation texts, else ''."""
    for txt in texts:
        if not txt:
            continue
        for pat, render in FRAMEWORK_PATTERNS:
            m = pat.search(txt)
            if m:
                return render(m)
    return ""


# ── DIFFICULTY / BLOOM CLASSIFIER ────────────────────────────────────────────
ANALYSIS_CUES = re.compile(
    r"\b(GREATEST|MOST CRITICAL|MOST EFFECTIVE|MOST APPROPRIATE|MOST IMPORTANT|"
    r"MOST significant|MOST concern|MOST relevant|HIGHEST|LARGEST)\b"
)
APPLICATION_CUES = re.compile(r"\b(FIRST|NEXT|BEST|MOST|PRIMARY|PRIMARILY|MAIN)\b")
SCENARIO_CUES = re.compile(
    r"\b(an? (?:IS )?auditor|"
    r"during an? (?:audit|review|assessment|implementation|migration|test|investigation)|"
    r"while (?:reviewing|conducting|auditing|performing|planning|evaluating|investigating)|"
    r"after (?:reviewing|completing|conducting|finishing)|"
    r"the (?:enterprise|organization|company|client) (?:has|is|wants|plans|decided|implemented|recently)|"
    r"an? (?:enterprise|organization|company) (?:has|is|wants|plans|decided)|"
    r"in a(?:n)? (?:scenario|situation|environment|case))",
    re.I,
)


def classify_difficulty(question: str) -> tuple[str, str]:
    """Return (difficulty, bloom_level)."""
    q = question or ""
    has_scenario = bool(SCENARIO_CUES.search(q))
    has_analysis = bool(ANALYSIS_CUES.search(q))
    has_app = bool(APPLICATION_CUES.search(q))
    long_stem = len(q) > 220  # multi-clause scenarios tend to be analysis-level
    if has_analysis and (has_scenario or long_stem):
        return "analysis", "Analysis"
    if has_analysis:
        return "analysis", "Analysis"
    if has_app and has_scenario:
        return "application", "Application"
    if has_app:
        return "application", "Application"
    return "foundational", "Foundational"


# ── SUBTOPIC TAGGER (controlled vocabulary per domain) ───────────────────────
SUBTOPIC_VOCAB = {
    1: [
        ("Risk-Based Audit Planning", r"\b(risk[- ]based|risk assessment in planning|"
                                       r"audit plan(?:ning)?|audit universe|risk ranking|"
                                       r"plan(?:ning)? (?:phase|stage|process) of (?:an?|the) (?:IS )?audit|"
                                       r"scope and objectives of (?:an?|the) (?:IS )?audit)\b"),
        ("Audit Standards & Guidelines", r"\b(ISACA|ISA[\s ]?CA|audit standard|audit guideline|"
                                          r"professional standard|code of ethics|professional care|"
                                          r"due (?:professional )?care|professional judgment|professional competence)\b"),
        ("Audit Charter", r"\b(audit charter|charter)\b"),
        ("Audit Evidence", r"\b(evidence|work[- ]?paper|audit trail|chain of custody|"
                            r"corroborat|substantiate)\b"),
        ("Sampling Methods", r"\b(sampl(?:e|ing)|attribute sampling|variable sampling|stop[- ]or[- ]go|"
                              r"stratified|discovery sampling|judgment(?:al)? sampling|"
                              r"confidence (?:level|coefficient)|sample size|tolerable error)\b"),
        ("CAATs & Continuous Auditing", r"\b(CAAT|computer[- ]assisted|continuous audit(?:ing)?|"
                                         r"generalized audit software|GAS|integrated test facility|ITF|"
                                         r"embedded audit|test data|snapshot|data analytics|"
                                         r"data mining (?:and )?(?:auditing )?software)\b"),
        ("Compliance vs Substantive Testing", r"\b(compliance test|substantive test|reperformance|"
                                                 r"walk[- ]?through|tracing and tagging|recompute|"
                                                 r"recalculation|reconciliation procedures)\b"),
        ("Audit Reporting", r"\b(audit report|reporting|finding|exit (?:meeting|interview)|closing meeting|"
                             r"recommend|report findings|management response|sign[- ]?off)\b"),
        ("Auditor Independence & Objectivity", r"\b(independen(?:ce|t)|objectiv|conflict of interest|impartial|"
                                                 r"self[- ]?audit|self[- ]review|consulting role|"
                                                 r"recus|impair(?:ed|s|ment))\b"),
        ("Control Self-Assessment", r"\b(control self[- ]?assessment|CSA)\b"),
        ("Internal Controls", r"\b(internal control|preventive(?:,| control)|detective(?:,| control)|"
                                r"corrective(?:,| control)|compensating control|"
                                r"segregation|separation of duties|control objective|"
                                r"control design|control effectiveness|key control|overlapping control|"
                                r"directive control|deterrent control|lack of (?:adequate )?controls|"
                                r"reconciliation control|tax calculation|payroll (?:reconciliation|adjustment))\b"),
        ("Risk Concepts", r"\b(inherent risk|control risk|detection risk|residual risk|audit risk|business risk|"
                            r"risk appetite|risk tolerance|risk management (?:program|process|framework))\b"),
        ("Forensic Audit & Fraud", r"\b(forensic|fraud|irregularit|illegal)\b"),
        ("EDI & Application Controls", r"\b(electronic data interchange|EDI|hash total|check digit|"
                                         r"application control|input control|edit (?:check|control)|"
                                         r"reasonableness check|range check|validity check|duplicate check)\b"),
        ("Quality Assurance", r"\b(quality assurance|QA function|QA team|quality management)\b"),
        ("Data Ownership & Custodianship", r"\b(data owner|data custodian|data steward|access authorization)\b"),
        ("Audit Resource Management", r"\b(audit (?:staff|team|resources?|personnel|skills?|hours?|budget)|"
                                         r"audit (?:project|engagement) (?:management|planning)|"
                                         r"resource constraint|skill set|technical competen)\b"),
        ("Audit Process & Procedures", r"\b(audit (?:procedures?|process|methodology|technique)|"
                                          r"functional walk[- ]through|preliminary phase|initiation meeting|"
                                          r"closing meeting|fieldwork)\b"),
        ("Cybersecurity in Audit", r"\b(zero[- ]?day|cyber|vulnerability assessment|penetration test|"
                                      r"intrusion|security audit)\b"),
    ],
    2: [
        ("IT Governance & Strategy", r"\b(IT governance|enterprise governance|board of directors|steering committee|"
                                       r"strategic plan|strategic alignment|IT strategy|business strategy|"
                                       r"governance framework|IT plan|short[- ]?term planning|long[- ]?term planning|"
                                       r"tactical plan|investment portfolio|annual plan|"
                                       r"corporate governance|implementing.*governance|"
                                       r"IT[- ]related framework|IT framework)\b"),
        ("IT Risk Management", r"\b(risk management|risk assessment|risk register|risk appetite|risk tolerance|"
                                r"risk treatment|risk transfer|risk mitigation|risk avoidance|risk acceptance|"
                                r"risk profile|risk analysis|residual risk|"
                                r"security risk|measures of (?:security )?risk|"
                                r"types of risk|impact.*risk|examples? of (?:vulnerab|threat)|"
                                r"unencrypted data transmissions|poor choice of password|"
                                r"vulnerab|threat\b|errors in audit procedures|"
                                r"distributed control|SCADA)\b"),
        ("Policies, Standards & Procedures", r"\b(security polic|information security polic|policy framework|"
                                                r"standards? and procedures|operational polic|acceptable use|"
                                                r"organizational polic|email polic|firewall polic|"
                                                r"approval of (?:the )?polic|policy approval|"
                                                r"policy definition|access control polic|operational polic|"
                                                r"\bIT polic|organizational policies|"
                                                r"policy is\b|policies have not been|policy review|"
                                                r"policy ownership|frequency of policy|policy reviewed|"
                                                r"information security program|security program|"
                                                r"establishing.*security|"
                                                r"unique user accounts|password polic)\b"),
        ("Enterprise Architecture", r"\b(enterprise architecture|EA framework|technical architecture|"
                                       r"current state|future state|to-be|as-is|business process driven|"
                                       r"data warehouse|data integration|"
                                       r"merger.*organizations|legacy applications|"
                                       r"replaced by a new|application portfolio|"
                                       r"product profitability|standardiz(?:ed|ation)|"
                                       r"reports? on product|finance and marketing)\b"),
        ("Quality Management", r"\b(quality management|QMS|quality system|continuous improvement|"
                                  r"performance metric|balanced scorecard|BSC|key performance indicator|KPI)\b"),
        ("Outsourcing & Third-Party Management", r"\b(outsourc|service provider|third[- ]party|vendor|"
                                                    r"service level agreement|SLA|escrow|right[- ]to[- ]audit|"
                                                    r"reciprocal agreement|cloud (?:provider|service|computing)|"
                                                    r"software as a service|SaaS|offshore|"
                                                    r"external IT service|management of external|"
                                                    r"contract.*IT (?:facilities|services))\b"),
        ("HR & Personnel Policies", r"\b(mandatory vacation|background check|job description|"
                                       r"separation of duties|cross[- ]?train|succession plan|termination|exit interview|"
                                       r"non[- ]?disclosure|secondary employment|employee resign|integrity of new staff|"
                                       r"new staff|vacation polic|short[- ]?term employees|hiring|recruit|"
                                       r"required vacations?|job rotations?|"
                                       r"individuals perform more than one role|small IT department|"
                                       r"perform more than one role)\b"),
        ("Project Portfolio & Investment", r"\b(project portfolio|portfolio management|"
                                              r"return on investment|ROI|cost[- ]benefit|business case|"
                                              r"strategic IT initiative|IT investment)\b"),
        ("Roles & Responsibilities", r"\b(chief information officer|\bCIO\b|chief information security officer|CISO|"
                                        r"chief risk officer|chief executive officer|CEO|"
                                        r"\bdata owner|\bdata custodian|\bdata steward|process owner|RACI|"
                                        r"organizational chart|reporting structure|reporting line|"
                                        r"approval authority|approval responsibility|approving the policy|"
                                        r"approve.*polic|board responsibility|management responsibility|"
                                        r"establishing.*acceptable risk|acceptable risk level|"
                                        r"responsibility for|responsible for)\b"),
        ("Asset Management & Classification", r"\b(asset classification|information asset|data classification|"
                                                  r"data ownership|critical asset|sensitive (?:data|information)|"
                                                  r"classifying.*levels|level of protection)\b"),
        ("Insurance & Compliance", r"\b(insurance|fidelity|errors and omissions|business interruption|"
                                      r"regulatory|compliance requirement|legal requirement|statutory|"
                                      r"privacy law|data protection law|GDPR|cross[- ]border|"
                                      r"comply with privacy)\b"),
        ("Decision Support & Tools", r"\b(decision support|DSS|software escrow|enterprise resource planning|"
                                        r"ERP|expert system|knowledge base)\b"),
        ("Audit & Independence in Governance", r"\b(due professional care|professional care|professional ethics|"
                                                  r"information systems? \(IS\) auditor (?:should|is|finds|reviews|"
                                                  r"observes|discovers|notes)|"
                                                  r"control objectives are useful|FIRST reference when performing|"
                                                  r"data analytics|audit procedures)\b"),
        ("Performance Measurement", r"\b(performance measurement|\bKPI|metric|scorecard|maturity model|"
                                       r"capability maturity|performance metrics|"
                                       r"developing performance|effectiveness of (?:audit|the) process)\b"),
    ],
    3: [
        ("SDLC & Development Methodology", r"\b(system development life cycle|SDLC|waterfall|\bagile\b|"
                                              r"prototyping|rapid application development|RAD|"
                                              r"object[- ]?oriented|component[- ]based|"
                                              r"software development|development process|development life cycle|"
                                              r"development methodology|standardiz(?:ed|ing) infrastructure|"
                                              r"function (?:point|of an? IT) steering|service[- ]oriented architecture)\b"),
        ("Project Management", r"\b(project management|project manager|project plan|project sponsor|"
                                  r"project steering|gantt|PERT|critical path|earned value|"
                                  r"function point|baseline|scope creep|"
                                  r"project portfolio|project initiation|initiation meeting)\b"),
        ("Requirements & Feasibility", r"\b(requirements? definition|requirements? gathering|feasibility study|"
                                          r"business case|user requirements?|functional requirement|"
                                          r"requirements? phase|requirement.*specification)\b"),
        ("System Testing", r"\b(unit test|system test|integration test|regression test|"
                              r"sociability test|stress test|parallel test|pilot test|"
                              r"white box|black box|gray box|"
                              r"top[- ]down (?:approach|test)|bottom[- ]up (?:approach|test)|"
                              r"testing phase|test data|test deck|"
                              r"functional test|target environment|"
                              r"software inspection|test coverage|production data for.*test|"
                              r"intermittent (?:software )?error)\b"),
        ("User Acceptance Testing", r"\b(user acceptance test|\bUAT\b|acceptance test|alpha test|beta test)\b"),
        ("Quality Assurance in Development", r"\b(quality assurance|QA function|software quality|"
                                                r"code review|software metric|capability maturity model|CMM|"
                                                r"functionality.*evaluat|portability|reliability|efficien|"
                                                r"software products?)\b"),
        ("Application Controls", r"\b(input control|output control|processing control|edit check|"
                                    r"validation check|range check|reasonableness check|check digit|"
                                    r"hash total|control total|run[- ]to[- ]run|reconciliation|"
                                    r"input controls|output controls|"
                                    r"editing.*validation|input/output|input/output control|"
                                    r"data validation|data capture|"
                                    r"detect.*unauthorized input|controls in.*newly developed|"
                                    r"transaction (?:processing|audit trail)|cyclic redundancy|"
                                    r"validation of data|integrated test facility|"
                                    r"input.*data|fingerprint of data)\b"),
        ("System Conversion & Implementation", r"\b(direct cutover|parallel run|phased|pilot implementation|"
                                                  r"data conversion|data migration|implementation plan|"
                                                  r"new client[- ]?server|major application implementation|"
                                                  r"recently completed conversion|extended to other departments|"
                                                  r"go.?live|software package implementation)\b"),
        ("Postimplementation Review", r"\b(post[- ]?implementation|post[- ]?project|postproject|"
                                         r"two months after|after.*implementation)\b"),
        ("Software Acquisition & Vendor", r"\b(software acquisition|software vendor|software escrow|"
                                              r"acceptance test plan|request for proposal|RFP|"
                                              r"software as a service|SaaS|application software package|"
                                              r"software package|cloud-based application)\b"),
        ("Data Integrity in Applications", r"\b(referential integrity|atomicity|isolation|durability|consistency|"
                                              r"ACID|data integrity|"
                                              r"online transaction processing|integrity of (?:transactions|data)|"
                                              r"data warehouse|data accuracy)\b"),
        ("Business Process Reengineering", r"\b(business process reengineering|\bBPR\b|process flowchart|"
                                              r"reengineering)\b"),
        ("Change Management in Projects", r"\b(change request|change management|change control|"
                                              r"scope.*changed|change in scope|\bbaseline\b|baselining)\b"),
        ("Postimplementation Audit", r"\b(post[- ]?incident review|post.*deployment review|"
                                        r"audit trail|transaction audit trail)\b"),
        ("System Integration", r"\b(integrate|integrated|two or more systems|systems are integrated|"
                                  r"interface)\b"),
        ("Web & Online Application Development", r"\b(web[- ]?based|online (?:transaction|sales|stock|banking)|"
                                                    r"transmission control protocol|secure website|coding standards|"
                                                    r"web application)\b"),
    ],
    4: [
        ("Service Level Management", r"\b(service level agreement|\bSLA\b|service level management|\bSLM\b|"
                                        r"service delivery objective|\bSDO\b|service quality|"
                                        r"third[- ]party (?:application|service)|outsourcing contract)\b"),
        ("Capacity & Performance Monitoring", r"\b(capacity (?:management|planning)|performance monitor|"
                                                  r"system performance|response time|server utilization|"
                                                  r"network performance|bandwidth|"
                                                  r"server.*configured|baseline.*system|baseline and monitor)\b"),
        ("Database Management", r"\b(database administrator|\bDBA\b|database control|database log|database integrity|"
                                  r"referential integrity|denormali[sz]ation|database parameter|database backup|"
                                  r"out[- ]of[- ]range data|tables of (?:a |the )?database|"
                                  r"concurrency control|database environment|"
                                  r"data integrity controls|distributed accounting|database review)\b"),
        ("Backup & Recovery", r"\b(backup|restore|data backup|incremental backup|differential backup|"
                                r"full backup|archive|offsite storage|magnetic media|\btape\b|"
                                r"tape inventory|backup media|backup strategy|"
                                r"continuous data backup|disk[- ]based snapshots|virtual tape librar)\b"),
        ("Disaster Recovery Planning", r"\b(disaster recovery|\bDRP\b|hot site|warm site|cold site|reciprocal|"
                                          r"alternate site|mirror(?:ed)? site|recovery strategy|"
                                          r"recovery point objective|\bRPO\b|recovery time objective|\bRTO\b|"
                                          r"maximum tolerable|interruption window|"
                                          r"telecommunication(?:s)? (?:continuity|backup|recovery)|"
                                          r"information processing facility|\bIPF\b|alternative routing|"
                                          r"diverse routing|long[- ]haul network|\bdiversity\b)\b"),
        ("Business Continuity Planning", r"\b(business continuity|\bBCP\b|continuity plan|"
                                            r"business impact analysis|\bBIA\b|"
                                            r"crisis management|continuity strateg|continuity test|"
                                            r"BCP test|continuity (?:plan|process|test|requirements?)|"
                                            r"resumption of (?:critical )?business)\b"),
        ("Incident & Problem Management", r"\b(incident management|problem management|help desk|"
                                              r"incident response|exception report|escalation|"
                                              r"problem.*encountered|service disruption|incident.*severity|"
                                              r"audit.*activities of users)\b"),
        ("Change & Release Management", r"\b(change management|change control|emergency change|"
                                            r"release management|version control|configuration management|"
                                            r"patch management|software patch|"
                                            r"program change|production change|"
                                            r"software inspection|change request|"
                                            r"change to.*production|production source|"
                                            r"vendor[- ]?supplied software|patches? (?:fixing|are released))\b"),
        ("IT Operations & Job Scheduling", r"\b(job schedul|batch job|production schedule|operator log|"
                                              r"console log|operations support|production environment|"
                                              r"job run logs|computer job schedules|"
                                              r"compares? job run|operations team|operations staff|"
                                              r"unattended|production print)\b"),
        ("System Resilience & High Availability", r"\b(redundan(?:t|cy)|\bRAID\b|clustering|failover|"
                                                      r"high availability|fault tolerance|load balanc|"
                                                      r"diverse routing|alternate routing|"
                                                      r"24/?7|highly used.*application|disk mirror|"
                                                      r"resiliency|continuous availability)\b"),
        ("End-User Computing", r"\b(end[- ]?user computing|\bEUC\b|spreadsheet|user[- ]developed|"
                                  r"end users.*develop|distributed program)\b"),
        ("Cloud Operations", r"\b(cloud (?:service|provider|computing|hosting|infrastructure)|"
                                r"software as a service|\bSaaS\b|"
                                r"infrastructure as a service|\bIaaS\b|platform as a service|\bPaaS\b|"
                                r"cloud[- ]based)\b"),
        ("Data Quality & Warehousing", r"\b(data warehouse|data mart|metadata|data quality|"
                                          r"extract|transform|load|\bETL\b|data integrity)\b"),
        ("Data Migration & Integration", r"\b(data migration|data conversion|"
                                            r"system interface|data mapping|"
                                            r"interface(?:s)? between|data flow diagram)\b"),
        ("Auditing IT Operations", r"\b(post[- ]?implementation review|application maintenance|"
                                       r"control self[- ]?assessment|\bCSA\b|"
                                       r"system parameter|programmed control|"
                                       r"unauthorized|maliciously modified|application controls|"
                                       r"open[- ]source software|out of scope|software compliance|"
                                       r"audit.*software development|audit log|fraud detection)\b"),
        ("System Configuration & Hardening", r"\b(system configuration|database hardening|"
                                                 r"hardening|configuration changes|"
                                                 r"system parameters|out[- ]of[- ]band|"
                                                 r"factory default|default password|disable.*service)\b"),
    ],
    5: [
        ("Authentication & Access Control", r"\b(authentication|two[- ]?factor|multifactor|\bMFA\b|single sign[- ]?on|\bSSO\b|"
                                                r"password polic|access control|role[- ]based|\bRBAC\b|"
                                                r"discretionary access|mandatory access|privileged access|"
                                                r"shared (?:account|user)|"
                                                r"logical access|password (?:management|control|expiration|complexity)|"
                                                r"user authentication|user (?:profile|account|access)|"
                                                r"unique user accounts|account management|"
                                                r"account.*sniff|password sniff|inactivity|screen[- ]?saver|"
                                                r"audit trail.*reliab|compromised credential|reset.*access|"
                                                r"session (?:lockout|timeout)|access rights?)\b"),
        ("Encryption & Cryptography", r"\b(encrypt|decrypt|cryptograph|symmetric key|asymmetric key|"
                                          r"public key|private key|\bAES\b|\bDES\b|\bRSA\b|elliptic curve|hash function|"
                                          r"message digest|cipher|secret key|"
                                          r"hash sum|checksum|hash total computed|integrity of (?:transmitted|the message)|"
                                          r"mobile device.*encrypt|database password encryption|"
                                          r"confidentiality of transmitted|data has not been altered|"
                                          r"reliability of an application.*audit trail|"
                                          r"audit trails.*deletion)\b"),
        ("PKI & Digital Signatures", r"\b(public key infrastructure|PKI|certificate authority|certification authority|CA|"
                                         r"digital certificate|digital signature|certificate revocation|CRL|"
                                         r"registration authority)\b"),
        ("Network Security", r"\b(firewall|intrusion detection|\bIDS\b|intrusion prevention|\bIPS\b|"
                                r"demilitarized zone|\bDMZ\b|virtual private network|\bVPN\b|stateful inspection|"
                                r"packet filter|proxy server|application gateway|circuit gateway|"
                                r"router access|access control list|\bACL\b|"
                                r"local area network|LAN security|LAN administrator|LAN implementation|"
                                r"telecommunication.*network|telecommunication.*security|"
                                r"network.*setup|network architecture|network audit|"
                                r"open[- ]system architecture|interoperability|"
                                r"line media|coaxial|fiber|fibre|twisted pair|"
                                r"ports? (?:80|443|filter)|"
                                r"network performance monitor|network device|gateway|"
                                r"transmission medium|network port|broadcast|cyclic redundancy|"
                                r"network diagnostic|protocol analyz|antispam|spam filtering|"
                                r"\bWAN\b|wide area network|alternative routing|"
                                r"unauthorized traffic|external attack|hardening.*configuration)\b"),
        ("Wireless & VoIP Security", r"\b(wireless|WLAN|Wi[- ]?Fi|WEP|WPA|war driving|"
                                        r"voice over (?:internet protocol|IP)|VoIP)\b"),
        ("Malware & Endpoint Security", r"\b(malware|virus|antivirus|worm|trojan|ransomware|rootkit|"
                                            r"endpoint|host[- ]based)\b"),
        ("Cyberattacks & Threats", r"\b(denial[- ]of[- ]service|DoS|DDoS|phishing|pharming|spoof|"
                                       r"man[- ]in[- ]the[- ]middle|brute force|password sniff|"
                                       r"social engineering|piggyback|tailgat|shoulder surf|dumpster div|"
                                       r"buffer overflow|SQL injection|cross[- ]site scripting|XSS)\b"),
        ("Incident Response & Forensics", r"\b(incident response|computer security incident|CSIRT|"
                                              r"forensic|chain of custody|preserve evidence|cyber[- ]?attack|"
                                              r"data breach|breach notification)\b"),
        ("Physical & Environmental Security", r"\b(physical security|access card|badge|man[- ]?trap|"
                                                  r"data center|biometric|fire suppression|halon|"
                                                  r"carbon dioxide|uninterrupted power|\bUPS\b|raised floor|"
                                                  r"voltage regulator|environmental control|"
                                                  r"electromagnetic emission|terminal emission|"
                                                  r"power supply|power[- ]line conditioner|surge[- ]protect|"
                                                  r"alternative power|interruptible power|"
                                                  r"piggyback|tailgat|shoulder surf|dumpster div)\b"),
        ("Data Protection & Privacy", r"\b(data classification|data protection|data leak|DLP|"
                                          r"privacy|personally identifiable|PII|protected health information|PHI|"
                                          r"data retention|data disposal|sanitiz)\b"),
        ("Security Awareness & Training", r"\b(security awareness|awareness training|security training|"
                                              r"acceptable use|user education)\b"),
        ("Logging & Monitoring", r"\b(audit log|log management|log file|log monitoring|log integrity|"
                                    r"log retention|\bSIEM\b|security log|"
                                    r"audit trail|reliability of.*audit trail|preserve.*log|"
                                    r"transaction audit trail|review system log|database log)\b"),
        ("Penetration Testing & Vulnerability", r"\b(penetration test|pen[- ]?test|vulnerability (?:scan|assessment|test|management)|"
                                                    r"red team|blue team|black box|white box|gray box|"
                                                    r"war driving|incident handling.*response|"
                                                    r"types of penetration|simulates? a real attack|"
                                                    r"vulnerability assessment tool|war (?:dialing|driving))\b"),
        ("Mobile & Removable Media", r"\b(mobile device|laptop|smart phone|removable media|USB|portable storage|"
                                         r"hard disk|degauss)\b"),
        ("Web & Application Security", r"\b(web application|web server|secure socket|\bSSL\b|\bTLS\b|"
                                           r"hypertext transmission|HTTPS|cookie|session|"
                                           r"browser|application code|hardcoded credential|"
                                           r"\bDRM\b|digital rights|application security)\b"),
        ("Information Asset Management", r"\b(information asset owner|data classification|asset classification|"
                                            r"information classification|classify(?:ing)? information|"
                                            r"data sensitivity|asset.*owner|data owner)\b"),
        ("Security Governance", r"\b(security policy|security baseline|security governance|"
                                   r"information security policy|security framework|"
                                   r"defined security baseline|adherence to (?:security |the )?policy|"
                                   r"acceptable use polic|deviation from.*policy|exception.*policy|"
                                   r"chief information security officer|\bCISO\b|"
                                   r"security responsibility|security ownership|"
                                   r"financial application.*concern|"
                                   r"governance model.*security)\b"),
        ("Application & System Audit Concerns", r"\b(audit (?:of|the) financial application|"
                                                    r"audit.*ecommerce|audit.*application|"
                                                    r"developer.*production|application administrator|"
                                                    r"audit.*concerned.*group)\b"),
        ("Network Architecture Audit", r"\b(network setup|network implementation|"
                                          r"local area network.*review|setup.*network audit|"
                                          r"network audit|network configuration audit)\b"),
    ],
}


def tag_subtopic(domain: int, question: str, *explanations: str) -> str:
    """Pick the first matching subtopic from the controlled vocabulary."""
    haystack = " ".join(filter(None, [question] + list(explanations)))
    for label, pattern in SUBTOPIC_VOCAB[domain]:
        if re.search(pattern, haystack, re.I):
            return label
    return "General"


# ── TIPS GENERATOR ───────────────────────────────────────────────────────────
TIP_LIBRARY = {
    "FIRST": "When a question asks for the FIRST step, look for the foundational action that enables every later step (planning before execution, risk assessment before scope, identification before evaluation).",
    "BEST": "ISACA's BEST answer balances control effectiveness, risk reduction, and auditor independence — eliminate options that compromise any of these.",
    "MOST": "MOST/PRIMARY questions ask which option carries the largest impact or coverage — rule out partial or downstream choices.",
    "GREATEST_RISK": "GREATEST risk/concern questions reward the option with the broadest blast radius, irreversibility, or regulatory exposure.",
    "AUDITOR_INDEPENDENCE": "Independence: an auditor reports and recommends — never fixes, never approves operationally, and never audits work they themselves designed.",
    "RISK_BASED": "Risk-based audit planning always starts with risk assessment — operational considerations (resources, schedule, management preference) come after.",
    "EVIDENCE": "Evidence reliability ranks: auditor-generated > independent third-party > internal system-generated > management assertion. Pick the most objective source.",
    "SAMPLING": "Compliance testing → attribute sampling. Substantive testing → variable sampling. Fraud screening → discovery sampling.",
    "SOD": "Watch for separation-of-duties violations: the same actor authorizing AND executing, designing AND testing, or developing AND deploying.",
    "REPORT_FIRST": "When in doubt about findings, document and report to management first — never act unilaterally to fix, escalate to regulators, or notify the audit committee prematurely.",
    "GOVERNANCE": "Governance questions trace back to the board / audit committee for accountability and to senior management for execution — the IT steering committee operates inside that frame.",
    "BIA_FIRST": "Recovery decisions (RTO, RPO, hot vs warm site) flow from the business impact analysis — never pick a recovery strategy before the BIA is done.",
    "RTO_RPO": "RTO measures downtime tolerance; RPO measures data-loss tolerance. Lower numbers cost more — match them to business criticality, not gut feel.",
    "DEFENSE_DEPTH": "Security controls layer: prevent → detect → respond → recover. Don't pick a single control where the question implies multiple layers are needed.",
    "LEAST_PRIVILEGE": "Access decisions default to least privilege and need-to-know — the data owner authorizes; the custodian implements; the auditor verifies.",
    "LIFE_SAFETY": "In any physical/safety scenario, life safety is always the first priority — system, asset and data concerns come after.",
    "ROOT_CAUSE": "Treat symptoms only after you've identified the root cause — quick fixes without root-cause analysis tend to recur and mask deeper issues.",
    "POLICY_DRIVEN": "Controls flow from policy. Without an approved policy, even strong controls lack enforceability — review the policy first.",
    "ENCRYPT_REST_TRANSIT": "Confidentiality requires encryption at rest AND in transit — picking only one usually leaves an exploitable gap.",
    "PUBLIC_PRIVATE": "Asymmetric crypto: encrypt with the recipient's public key (confidentiality), sign with the sender's private key (authenticity + non-repudiation).",
    "CHANGE_CONTROL": "Production changes require: documented request → impact analysis → approval → tested change → back-out plan → post-change verification. Skipping any step is a finding.",
}


def build_tips(domain: int, subtopic: str, question: str, correct_exp: str) -> list[str]:
    """Pick 3 tips: one stem-pattern tip, one mindset tip, one subtopic-specific tip."""
    q_upper = (question or "").upper()
    tips = []

    # Stem-pattern tip (priority order)
    if re.search(r"\bGREATEST (?:risk|concern|threat)\b", question or "", re.I):
        tips.append(TIP_LIBRARY["GREATEST_RISK"])
    elif "FIRST" in q_upper:
        tips.append(TIP_LIBRARY["FIRST"])
    elif "BEST" in q_upper:
        tips.append(TIP_LIBRARY["BEST"])
    elif "MOST" in q_upper or "PRIMARY" in q_upper:
        tips.append(TIP_LIBRARY["MOST"])

    # Auditor-mindset / independence tip when relevant
    if re.search(r"\b(auditor|audit)\b", question or "", re.I) and \
       re.search(r"\b(fix|implement|approve|design|develop|recommend|consult)\b", question or "", re.I):
        tips.append(TIP_LIBRARY["AUDITOR_INDEPENDENCE"])

    # Subtopic-specific tip
    subtopic_tips = {
        "Risk-Based Audit Planning": TIP_LIBRARY["RISK_BASED"],
        "Audit Evidence": TIP_LIBRARY["EVIDENCE"],
        "Sampling Methods": TIP_LIBRARY["SAMPLING"],
        "Internal Controls": TIP_LIBRARY["SOD"],
        "Audit Reporting": TIP_LIBRARY["REPORT_FIRST"],
        "Auditor Independence & Objectivity": TIP_LIBRARY["AUDITOR_INDEPENDENCE"],
        "IT Governance & Strategy": TIP_LIBRARY["GOVERNANCE"],
        "Disaster Recovery Planning": TIP_LIBRARY["BIA_FIRST"],
        "Business Continuity Planning": TIP_LIBRARY["BIA_FIRST"],
        "Backup & Recovery": TIP_LIBRARY["RTO_RPO"],
        "Network Security": TIP_LIBRARY["DEFENSE_DEPTH"],
        "Authentication & Access Control": TIP_LIBRARY["LEAST_PRIVILEGE"],
        "Encryption & Cryptography": TIP_LIBRARY["ENCRYPT_REST_TRANSIT"],
        "PKI & Digital Signatures": TIP_LIBRARY["PUBLIC_PRIVATE"],
        "Physical & Environmental Security": TIP_LIBRARY["LIFE_SAFETY"],
        "Change & Release Management": TIP_LIBRARY["CHANGE_CONTROL"],
        "Policies, Standards & Procedures": TIP_LIBRARY["POLICY_DRIVEN"],
        "Incident & Problem Management": TIP_LIBRARY["ROOT_CAUSE"],
    }
    if subtopic in subtopic_tips and subtopic_tips[subtopic] not in tips:
        tips.append(subtopic_tips[subtopic])

    # Trim to 3 tips, deduped, preserving order
    seen, out = set(), []
    for t in tips:
        if t not in seen:
            out.append(t); seen.add(t)
        if len(out) == 3:
            break
    # Always emit at least one tip
    if not out:
        out = [TIP_LIBRARY["BEST"]]
    return out


# ── ROW → QUESTION OBJECT ────────────────────────────────────────────────────
def row_to_question(row: tuple, domain: int, idx: int) -> dict | None:
    """Convert a sheet row tuple into our question schema dict."""
    (id_, q, oa, ob, oc, od, correct, ea, eb, ec, ed, _dom) = row
    if not q or not correct:
        return None
    correct = str(correct).strip().upper()
    if correct not in ("A", "B", "C", "D"):
        return None
    options = {"A": fix_typos((oa or "").strip()), "B": fix_typos((ob or "").strip()),
               "C": fix_typos((oc or "").strip()), "D": fix_typos((od or "").strip())}
    exps = {"A": fix_typos((ea or "").strip()), "B": fix_typos((eb or "").strip()),
            "C": fix_typos((ec or "").strip()), "D": fix_typos((ed or "").strip())}
    correct_exp = exps[correct]
    wrong_exps = {k: v for k, v in exps.items() if k != correct and v}

    question_text = fix_typos((q or "").strip())
    difficulty, bloom = classify_difficulty(question_text)
    subtopic = tag_subtopic(domain, question_text, *exps.values())
    framework_ref = extract_framework_ref(*exps.values())
    tips = build_tips(domain, subtopic, question_text, correct_exp)

    return {
        "id": f"d{domain}_{idx:03d}",
        "domain": domain,
        "subtopic": subtopic,
        "difficulty": difficulty,
        "bloom_level": bloom,
        "question": question_text,
        "options": options,
        "correct": correct,
        "correct_explanation": correct_exp,
        "framework_ref": framework_ref,
        "wrong_explanations": wrong_exps,
        "tips": tips,
    }


# ── MAIN ─────────────────────────────────────────────────────────────────────
def convert_domain(wb, domain: int, write: bool = True) -> dict:
    sheet_name = f"DOMAIN_{domain}"
    ws = wb[sheet_name]
    # Load any hand-authored tips overrides for this domain
    override_path = ROOT / "data" / "tips_overrides" / f"d{domain}.json"
    overrides = {}
    if override_path.exists():
        try:
            overrides = json.loads(override_path.read_text())
        except json.JSONDecodeError as e:
            print(f"  WARN: ignoring malformed {override_path}: {e}")
    questions = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue  # header
        q = row_to_question(row, domain, len(questions) + 1)
        if q:
            # Apply manual override if present
            manual = overrides.get(q["id"])
            if manual and isinstance(manual, list) and all(isinstance(t, str) for t in manual):
                q["tips"] = manual
            questions.append(q)
    out = {
        "domain": domain,
        "title": DOMAIN_TITLES[domain],
        "weight": DOMAIN_WEIGHTS[domain],
        "count": len(questions),
        "questions": questions,
    }
    if write:
        out_path = ROOT / "data" / f"domain{domain}.json"
        out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2))
        n_overridden = sum(1 for q in questions if q["id"] in overrides)
        suffix = f"  ({n_overridden} hand-authored tips)" if n_overridden else ""
        print(f"  wrote {out_path}  ({len(questions)} questions){suffix}")
    return out


def main():
    if not SRC.exists():
        sys.exit(f"Source not found: {SRC}")
    wb = openpyxl.load_workbook(SRC, data_only=True, keep_vba=False)
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    domains = [int(target)] if target.isdigit() else [1, 2, 3, 4, 5]
    for d in domains:
        print(f"Domain {d}:")
        convert_domain(wb, d)


if __name__ == "__main__":
    main()
