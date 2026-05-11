#!/usr/bin/env python3
"""
Citation-realism checker for CISA practice questions.

Catches the recurring class of reviewer findings where citations are REAL
publications but MIS-ATTRIBUTED, MIS-APPLIED, or factually-stale. Built in
response to the D4-7..D4-12 reviewer-finding pattern where the same trap
attributions surfaced across multiple batches:

  • NIST SP 800-53 SI-7 cited for access-management or boundary-protection
    (the correct controls are AC-* or SC-7)
  • FINRA Rule 4570 cited as books-and-records (it's actually cessation-of-
    business custodian; Rule 4511 is books-and-records)
  • SR 11-14 attributed to OCC (it's Federal Reserve Board)
  • FFIEC guidance cited in non-financial-institution scenarios
  • SOX §906 tiering conflated (knowing vs willful)
  • SEC Reg FD applied to private companies
  • SEC Rule 17a-4 retention as "7 years" (it's 3-6 years; SOX is 7)
  • OCC Bulletin 2013-29 without noting 2023 Interagency supersession
  • Joint Commission Sentinel Event policy applied without actual harm

This is a Stage-2.5 mechanical check distinct from check_citation_provenance
(which catches FABRICATED citations) and check_framework_currency (which
catches OUTDATED references). Realism = real publication, correctly used.

Usage:
    python3 scripts/check_citation_realism.py --batch dN_NNN..dN_NNN
    python3 scripts/check_citation_realism.py --draft /path/to/script.py
    python3 scripts/check_citation_realism.py --strict   # exit 1 on findings
"""
import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
ORIGINALS = ROOT / "data" / "originals"


# Trap patterns. Each entry:
#   "name": short identifier
#   "pattern": regex that matches the suspect citation/text
#   "fields": which question fields to check (framework_ref, correct_explanation, etc.)
#   "context_negate": optional regex — if present in question text, suppresses the trap
#     (e.g., financial-institution scenarios DO allow FFIEC; only flag non-FI)
#   "context_require": optional regex — only flag if this is present
#     (e.g., only flag JC Sentinel Event if no harm is mentioned)
#   "explanation": why this is wrong
#   "recommendation": correct citation or framing
TRAPS = [
    {
        "name": "NIST SP 800-53 SI-7 for access management",
        "pattern": re.compile(
            r"NIST SP 800-53(?:\s+Rev\s*5)?\s+SI-7"
            r"[\s\S]{0,300}"
            r"(?:account\s+management|least\s+privilege|access\s+control|"
            r"privileged\s+access|authentication|remote\s+access|"
            r"identity[\s-]*and[\s-]*access)",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation"],
        "explanation": (
            "NIST SP 800-53 SI-7 is 'Software, Firmware, and Information Integrity' "
            "— not access management. For access controls, the right citations are "
            "AC-2 (Account Management), AC-5 (Separation of Duties), AC-6 (Least "
            "Privilege), AC-17 (Remote Access), IA-5 (Authenticator Management)."
        ),
        "recommendation": (
            "Replace SI-7 with the appropriate AC-* control family for the "
            "specific access-management aspect being discussed."
        ),
    },
    {
        "name": "NIST SP 800-53 SI-7 for boundary protection",
        "pattern": re.compile(
            r"NIST SP 800-53(?:\s+Rev\s*5)?\s+SI-7"
            r"[\s\S]{0,300}"
            r"(?:boundary\s+protection|network\s+segmentation|firewall|"
            r"perimeter|micro[\s-]*segmentation|zero[\s-]*trust)",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation"],
        "explanation": (
            "NIST SP 800-53 SI-7 is software/firmware/information integrity — "
            "not boundary protection. The correct control is SC-7 (Boundary "
            "Protection)."
        ),
        "recommendation": "Replace SI-7 with SC-7 (Boundary Protection).",
    },
    {
        "name": "NIST SP 800-53 SI-7 for separation of duties",
        "pattern": re.compile(
            r"NIST SP 800-53(?:\s+Rev\s*5)?\s+SI-7"
            r"[\s\S]{0,300}"
            r"(?:separation\s+of\s+duties|SoD\b|segregation\s+of\s+duties)",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation"],
        "explanation": (
            "NIST SP 800-53 SI-7 is software/firmware/information integrity. "
            "For separation of duties, the correct control is AC-5 "
            "(Separation of Duties)."
        ),
        "recommendation": "Replace SI-7 with AC-5 (Separation of Duties).",
    },
    {
        "name": "FINRA Rule 4570 cited as books-and-records",
        "pattern": re.compile(
            r"FINRA\s+Rule\s+4570[\s\S]{0,200}"
            r"(?:books\s+and\s+records|records\s+preservation|"
            r"records\s+retention|recordkeeping)",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation"],
        "explanation": (
            "FINRA Rule 4570 is 'Custodian of Books and Records' — it applies "
            "when a member firm CEASES TO DO BUSINESS (appointment of a custodian "
            "for the wound-down firm's records). The general books-and-records "
            "rule for FINRA members is Rule 4511. SEC books-and-records is "
            "Rule 17a-4."
        ),
        "recommendation": (
            "For books-and-records governance, use FINRA Rule 4511 (General "
            "Requirements) and SEC Rule 17a-4 (Books and Records Preservation). "
            "Reserve FINRA Rule 4570 for cessation-of-business scenarios."
        ),
    },
    {
        "name": "SR 11-14 attributed to OCC (it's Federal Reserve Board)",
        "pattern": re.compile(
            r"OCC\s+SR\s*11[\s-]*14",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation"],
        "explanation": (
            "SR 11-14 is a Federal Reserve Board (FRB) Supervision and "
            "Regulation Letter, not an OCC publication. The OCC's parallel "
            "third-party-risk guidance was OCC Bulletin 2013-29, now superseded "
            "by the 2023 Interagency Guidance on Third-Party Relationships."
        ),
        "recommendation": (
            "Replace 'OCC SR 11-14' with 'FRB SR 11-14' or substitute the OCC "
            "equivalent (Interagency Guidance on Third-Party Relationships: "
            "Risk Management, OCC/FRB/FDIC, 2023)."
        ),
    },
    {
        "name": "FFIEC guidance for non-financial-institution scenario",
        "pattern": re.compile(
            r"FFIEC\s+(?:Business\s+Continuity|Vendor\s+Management|"
            r"Cybersecurity\s+(?:Examination|Assessment)|Outsourcing)",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref"],
        "context_negate": re.compile(
            r"(?:bank|federally[\s-]*chartered|broker[\s-]*dealer|"
            r"credit\s+union|savings\s+association|FDIC|FINRA|"
            r"financial\s+institution|insurance\s+(?:company|firm|provider)|"
            r"FFIEC[\s-]*regulated|holding\s+company|"
            r"in\s+assets|community\s+bank|\bcall\s+report\b|"
            r"SOX|10[\s-]?K|10[\s-]?Q|SEC\s+(?:Rule|Form)|"
            r"financial\s+services|public(?:ly)?[\s-]*traded)",
            re.IGNORECASE,
        ),
        "explanation": (
            "FFIEC Business Continuity / Vendor Management / Cybersecurity / "
            "Outsourcing booklets apply to FINANCIAL INSTITUTIONS managing "
            "their own programs. They do not apply to SaaS providers, "
            "retailers, manufacturers, or other non-FI scenarios — even "
            "when those firms are subject to other regulatory oversight. "
            "(Note: FFIEC IT Examination Handbook component sections like "
            "EUC have broader cross-sector applicability.)"
        ),
        "recommendation": (
            "For non-FI scenarios, prefer ISACA, ITIL 4, COBIT 2019, ISO/IEC "
            "20000-1, or NIST citations. Use FFIEC sector-specific booklets "
            "only when the firm IS a financial institution."
        ),
    },
    {
        "name": "SOX §906 tiering conflated (knowing vs willful)",
        "pattern": re.compile(
            r"SOX[\s\S]{0,100}§?\s*906[\s\S]{0,200}"
            r"(?:up\s+to\s+20\s+years|\$5M|\$1M[\s\S]{0,80}10\s+years|"
            r"criminal\s+(?:penalt|certification))",
            re.IGNORECASE,
        ),
        "fields": ["correct_explanation"],
        "context_negate": re.compile(
            r"knowing[\s\S]{0,100}willful|willful[\s\S]{0,100}knowing|"
            r"(?:knowing|knowingly)[\s\S]{0,200}(?:up\s+to\s+\$1M|10\s+years)"
            r"[\s\S]{0,200}(?:willful|willfully)[\s\S]{0,200}"
            r"(?:up\s+to\s+\$5M|20\s+years)",
            re.IGNORECASE,
        ),
        "explanation": (
            "SOX §906 has TWO TIERS separated by mens rea: KNOWING false "
            "certification carries up to $1M and 10 years; WILLFUL false "
            "certification carries up to $5M and 20 years. Conflating them "
            "loses the distinction important to candidates."
        ),
        "recommendation": (
            "Distinguish: 'knowing false certification under SOX §906 carries "
            "fines up to $1M and 10 years; willful violations carry up to "
            "$5M and 20 years.'"
        ),
    },
    {
        "name": "SEC Rule 17a-4 retention as 7 years",
        "pattern": re.compile(
            r"SEC\s+(?:Rule\s+)?17a-4[\s\S]{0,200}"
            r"7\s+(?:years?|yrs?|y\b)",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation", "options"],
        "explanation": (
            "SEC Rule 17a-4 retention durations are 3 years (most "
            "communications, 17a-4(b)) or 6 years (blotters/ledgers, "
            "17a-4(a)). The 7-year framing usually refers to SOX, not "
            "Rule 17a-4."
        ),
        "recommendation": (
            "Use 'SEC Rule 17a-4 3-6 years (with 6-year subsets)' or cite "
            "SOX separately for 7-year retention requirements."
        ),
    },
    {
        "name": "OCC Bulletin 2013-29 without 2023 supersession note",
        "pattern": re.compile(
            r"OCC\s+Bulletin\s+2013-29",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation"],
        "context_include_framework_ref": True,
        "context_negate": re.compile(
            r"supersed(?:ed|ing)|Interagency\s+Guidance|2023",
            re.IGNORECASE,
        ),
        "explanation": (
            "OCC Bulletin 2013-29 was superseded by the 2023 Interagency "
            "Guidance on Third-Party Relationships: Risk Management "
            "(OCC/FRB/FDIC). For post-2023 content, the Interagency Guidance "
            "is the current authority."
        ),
        "recommendation": (
            "Cite 'Interagency Guidance on Third-Party Relationships: Risk "
            "Management (OCC/FRB/FDIC, 2023, superseding OCC Bulletin "
            "2013-29)' for currency."
        ),
    },
    {
        "name": "Joint Commission Sentinel Event without harm",
        "pattern": re.compile(
            r"Joint\s+Commission\s+Sentinel\s+Event\s+Policy(?!\s+principles)",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation"],
        "context_require": re.compile(
            r"outage|disruption|incident|interruption|downtime",
            re.IGNORECASE,
        ),
        "context_negate": re.compile(
            r"(?:patient\s+harm|sentinel\s+event\s+occurred|death|"
            r"serious\s+(?:injury|harm))",
            re.IGNORECASE,
        ),
        "explanation": (
            "Joint Commission's Sentinel Event Policy applies to events that "
            "RESULTED IN actual patient harm/death (or carry significant risk "
            "thereof). IT outages without documented harm don't formally "
            "meet the sentinel-event threshold."
        ),
        "recommendation": (
            "Use 'Joint Commission Sentinel Event Policy PRINCIPLES (where IT "
            "outages create potential for patient-care impairment)' to invoke "
            "the framework without overcommitting to formal classification."
        ),
    },
    {
        "name": "SEC Regulation FD for private company",
        "pattern": re.compile(
            r"SEC\s+(?:Regulation|Reg\.?)\s+FD",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation"],
        "context_require": re.compile(
            r"private\s+company|startup|series-[A-D]|pre-IPO",
            re.IGNORECASE,
        ),
        "explanation": (
            "SEC Regulation FD applies only to issuers with PUBLICLY "
            "REGISTERED securities under the Exchange Act. Private "
            "companies are outside its scope."
        ),
        "recommendation": (
            "For private companies, drop Reg FD reference or qualify "
            "explicitly: 'Reg FD applies for publicly-reporting issuers; "
            "this firm is private.'"
        ),
    },
    {
        "name": "GDPR adequacy without EU-US Data Privacy Framework (2023)",
        "pattern": re.compile(
            r"(?:Schrems[\s-]*II[\s\S]{0,80}adequacy|"
            r"adequacy\s+(?:gap|uncertainty|concerns?))",
            re.IGNORECASE,
        ),
        "fields": ["framework_ref", "correct_explanation", "scenario_context"],
        "context_negate": re.compile(
            r"EU[\s-]*US\s+(?:Data\s+Privacy\s+Framework|DPF)|"
            r"Data\s+Privacy\s+Framework[\s\S]{0,80}(?:2023|adequacy)|"
            r"TIA\b|Transfer\s+Impact\s+Assessment|"
            r"\bSCCs?\b|Standard\s+Contractual\s+Clauses|"
            r"EDPB\s+Recommendations",
            re.IGNORECASE,
        ),
        "explanation": (
            "The EU-US Data Privacy Framework (July 2023) restored adequacy "
            "for participating US importers. Citing 'post-Schrems II adequacy "
            "uncertainty' without acknowledging the DPF is factually stale."
        ),
        "recommendation": (
            "Reference the EU-US Data Privacy Framework (2023) for current "
            "adequacy posture for participating US importers."
        ),
    },
]


def load_questions_from_json(domain_path: Path) -> list:
    if not domain_path.exists():
        return []
    try:
        return json.loads(domain_path.read_text()).get("questions", [])
    except json.JSONDecodeError:
        return []


def load_questions_from_draft(script_path: Path) -> list:
    spec = importlib.util.spec_from_file_location("draft", script_path)
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
    except Exception as e:
        print(f"ERROR: failed to import draft script: {e}", file=sys.stderr)
        sys.exit(2)
    if not hasattr(module, "new_questions"):
        print("ERROR: draft script does not define 'new_questions'", file=sys.stderr)
        sys.exit(2)
    return module.new_questions


def parse_batch(spec: str):
    m = re.match(r"d(\d+)_(\d+)\.\.d(\d+)_(\d+)", spec)
    if not m:
        return None
    d1, s, d2, e = m.groups()
    if d1 != d2:
        return None
    return int(d1), int(s), int(e)


def get_text(q: dict, field: str) -> str:
    """Get searchable text from a question field (options is a dict — join)."""
    val = q.get(field, "")
    if isinstance(val, dict):
        return " ".join(str(v) for v in val.values())
    return str(val)


def get_question_full_text(q: dict, include_framework_ref: bool = False) -> str:
    """All text we may want to use for context detection."""
    parts = []
    fields = ["scenario_context", "question", "correct_explanation"]
    if include_framework_ref:
        fields.append("framework_ref")
    for k in fields:
        v = q.get(k, "")
        if isinstance(v, str):
            parts.append(v)
    return " ".join(parts)


def check_trap(q: dict, trap: dict) -> list:
    """Return list of (field, matched_text) for trap matches in this question."""
    findings = []
    # Per-trap option: include framework_ref in context-detection (default off)
    include_fr = trap.get("context_include_framework_ref", False)
    full_text = get_question_full_text(q, include_framework_ref=include_fr)
    for field in trap["fields"]:
        text = get_text(q, field)
        if not text:
            continue
        m = trap["pattern"].search(text)
        if not m:
            continue
        # context_negate: if present in question, suppress the finding
        if "context_negate" in trap and trap["context_negate"].search(full_text):
            continue
        # context_require: only flag if also present in question
        if "context_require" in trap and not trap["context_require"].search(full_text):
            continue
        findings.append((field, m.group(0)[:80]))
    return findings


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--batch", help="dN_NNN..dN_NNN range")
    g.add_argument("--draft", help="Path to a draft Python script")
    ap.add_argument("--strict", action="store_true", help="Exit 1 on findings")
    args = ap.parse_args()

    if args.draft:
        questions = load_questions_from_draft(Path(args.draft))
        scope_label = args.draft
    else:
        batch = parse_batch(args.batch)
        if not batch:
            print(f"ERROR: invalid --batch: {args.batch}", file=sys.stderr)
            sys.exit(2)
        d, s, e = batch
        all_q = load_questions_from_json(ORIGINALS / f"d{d}.json")
        questions = []
        for q in all_q:
            qid = q.get("id", "")
            if "_" not in qid:
                continue
            num = int(qid.split("_")[1])
            if s <= num <= e:
                questions.append(q)
        scope_label = args.batch

    print(f"Citation realism check: {len(questions)} questions ({scope_label})")
    print(f"Trap patterns loaded: {len(TRAPS)}")
    print()

    findings = []
    for q in questions:
        qid = q.get("id", "?")
        for trap in TRAPS:
            matches = check_trap(q, trap)
            for field, snippet in matches:
                findings.append({
                    "qid": qid,
                    "trap": trap["name"],
                    "field": field,
                    "snippet": snippet,
                    "explanation": trap["explanation"],
                    "recommendation": trap["recommendation"],
                })

    if not findings:
        print("✓ No citation-realism issues detected.")
        return

    print(f"=== {len(findings)} citation-realism finding(s) ===\n")
    by_qid = {}
    for f in findings:
        by_qid.setdefault(f["qid"], []).append(f)
    for qid in sorted(by_qid):
        print(f"⚠ {qid}:")
        for f in by_qid[qid]:
            print(f"  TRAP: {f['trap']}")
            print(f"  FIELD: {f['field']}")
            print(f"  SNIPPET: {f['snippet']}...")
            print(f"  ISSUE: {f['explanation']}")
            print(f"  FIX: {f['recommendation']}")
            print()

    if args.strict:
        sys.exit(1)


if __name__ == "__main__":
    main()
