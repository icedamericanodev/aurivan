#!/usr/bin/env python3
"""
Framework currency checker for CISA practice questions.

Catches outdated regulatory / framework references that may have been
superseded by post-2023 developments. Built in response to the d3_114
finding where the question cited "post-Schrems II adequacy uncertainty"
when the EU-US Data Privacy Framework (July 2023) had already restored
adequacy for participating US importers.

Checks against a maintained "currency calendar" of known framework
updates. Conservative: flags KNOWN outdated patterns; does not attempt
to verify framework currency in general.

Usage:
    python3 scripts/check_framework_currency.py [--batch dN_NNN..dN_NNN]
                                                [--strict]
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
ORIGINALS = ROOT / "data" / "originals"

# ---- Currency calendar ----------------------------------------------------
#
# Each entry: a regex pattern + a recommended modern framing.
# Conservative — only entries the maintainer has explicitly verified.
# Add entries as new framework updates become relevant to the bank.

CURRENCY_RULES = [
    {
        "name": "Schrems II / EU-US data transfer",
        "outdated_pattern": re.compile(
            r"post[- ]Schrems[- ]?II\s+(?:adequacy\s+)?(?:uncertainty|concerns?|gap)",
            re.IGNORECASE,
        ),
        "issue": "Schrems II framing is outdated post-July 2023 EU-US Data Privacy Framework adequacy decision",
        "recommended": "Use 'EU-US Data Privacy Framework (EU-US DPF) adequacy decision' or 'Article 46 mechanisms (SCCs, BCRs, DPF)' as the current language",
    },
    {
        "name": "SOX Section 404 (used for records retention)",
        "outdated_pattern": re.compile(
            r"SOX (?:Section )?404[^.]*?retention", re.IGNORECASE
        ),
        "issue": "SOX Section 404 governs internal controls over financial reporting; Section 802 governs records retention",
        "recommended": "Use 'SOX Section 802 (Records Retention)' for retention; 'SOX Section 404' only for internal controls assessment",
    },
    {
        "name": "OCC Bulletin 2017-21 (mis-cited as M&A)",
        "outdated_pattern": re.compile(
            r"OCC Bulletin 2017-21\s*\(\s*M&A", re.IGNORECASE
        ),
        "issue": "OCC Bulletin 2017-21 covers Third-Party Relationships, not M&A specifically",
        "recommended": "Use 'OCC Bulletin 2013-29 (Third-Party Relationships)' or 'OCC Comptroller's Licensing Manual — Business Combinations' for M&A contexts",
    },
    {
        "name": "EU AI Act (2024)",
        "outdated_pattern": re.compile(
            r"(?:proposed|draft|forthcoming|emerging)\s+EU AI Act", re.IGNORECASE
        ),
        "issue": "EU AI Act entered into force August 2024; references to 'proposed' or 'draft' are outdated",
        "recommended": "Use 'EU AI Act (Regulation (EU) 2024/1689)' as the current language",
    },
    {
        "name": "NIST Cybersecurity Framework version",
        "outdated_pattern": re.compile(
            r"NIST CSF\s+(?:v?1\.[01]|version 1\.[01])", re.IGNORECASE
        ),
        "issue": "NIST CSF v2.0 published February 2024; v1.1 is superseded for new authoring",
        "recommended": "Use 'NIST CSF v2.0' unless the question specifically addresses pre-v2.0 history",
    },
    {
        "name": "NIST AI RMF version",
        "outdated_pattern": re.compile(
            r"NIST AI RMF\s+(?:draft|preliminary)", re.IGNORECASE
        ),
        "issue": "NIST AI RMF 1.0 was finalized January 2023; draft references are outdated",
        "recommended": "Use 'NIST AI RMF 1.0' as the current language",
    },
    {
        "name": "GDPR Article 17(3) retention exemption variant",
        "outdated_pattern": re.compile(
            r"Article 17\(3\)\(b\)\s+(?:non-EU|non-European|US)", re.IGNORECASE
        ),
        "issue": "Article 17(3)(b) covers compliance with EU law obligations; for non-EU contexts use Article 17(3)(e) (legal claims)",
        "recommended": "Use 'GDPR Article 17(3)(e)' for non-EU compliance retention obligations",
    },
    {
        "name": "OWASP Top 10 version",
        "outdated_pattern": re.compile(
            r"OWASP Top 10[\s—:-]+2017", re.IGNORECASE
        ),
        "issue": "OWASP Top 10 2021 is the current version; 2017 references are superseded",
        "recommended": "Use 'OWASP Top 10 (2021)' unless addressing pre-2021 history",
    },
    {
        "name": "PCI DSS version",
        "outdated_pattern": re.compile(
            r"PCI DSS\s+v?3(?:\.[12])?", re.IGNORECASE
        ),
        "issue": "PCI DSS v4.0 became effective April 2024 (mandatory March 2024); v3.x is superseded",
        "recommended": "Use 'PCI DSS v4.0' for current compliance contexts",
    },
    {
        "name": "ISO 27001 version",
        "outdated_pattern": re.compile(
            r"ISO/?IEC?\s*27001:?(?:2013)\b", re.IGNORECASE
        ),
        "issue": "ISO/IEC 27001:2022 is the current version; 2013 is superseded",
        "recommended": "Use 'ISO/IEC 27001:2022' for current ISMS contexts",
    },
    {
        "name": "FIPS 140 version",
        "outdated_pattern": re.compile(
            r"FIPS 140-2\b", re.IGNORECASE
        ),
        "issue": "FIPS 140-3 superseded FIPS 140-2 (transition complete September 2026); 140-2 references will be outdated by then",
        "recommended": "Use 'FIPS 140-3' for current cryptographic-module contexts; 140-2 acceptable when addressing legacy",
    },
]

# Fields to search per question
LEARNER_FIELDS = [
    "question",
    "scenario_context",
    "correct_explanation",
    "key_concept",
    "pre_read",
    "framework_ref",
]


# ---- Helpers --------------------------------------------------------------

def parse_id(qid):
    m = re.match(r"d(\d)_(\d{3})", qid)
    if not m:
        return None, None
    return int(m.group(1)), int(m.group(2))


def in_batch(qid, lo, hi):
    if lo is None:
        return True
    dom, num = parse_id(qid)
    lo_dom, lo_num = parse_id(lo)
    hi_dom, hi_num = parse_id(hi)
    if dom != lo_dom:
        return False
    return lo_num <= num <= hi_num


def check_question(q):
    issues = []
    qid = q.get("id", "<no-id>")

    # Collect all learner-facing text including options/wrong_explanations/tips
    text_blocks = []
    for f in LEARNER_FIELDS:
        text_blocks.append((f, q.get(f, "")))
    for letter, opt in q.get("options", {}).items():
        text_blocks.append((f"options.{letter}", opt))
    for letter, exp in q.get("wrong_explanations", {}).items():
        text_blocks.append((f"wrong_explanations.{letter}", exp))
    for idx, tip in enumerate(q.get("tips", [])):
        text_blocks.append((f"tips[{idx}]", tip))

    for field_name, text in text_blocks:
        if not text:
            continue
        for rule in CURRENCY_RULES:
            for m in rule["outdated_pattern"].finditer(text):
                issues.append({
                    "id": qid,
                    "rule": rule["name"],
                    "field": field_name,
                    "snippet": m.group(0),
                    "issue": rule["issue"],
                    "recommended": rule["recommended"],
                })
    return issues


# ---- Main -----------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", help="Range like d3_001..d3_020 (optional)")
    ap.add_argument("--strict", action="store_true", help="Exit 2 on warnings")
    ap.add_argument("--list-rules", action="store_true",
                    help="List the currency-rule names and exit")
    args = ap.parse_args()

    if args.list_rules:
        print("Currency rules:")
        for r in CURRENCY_RULES:
            print(f"  - {r['name']}")
        return 0

    lo, hi = None, None
    if args.batch:
        m = re.match(r"(d\d_\d{3})\.\.(d\d_\d{3})", args.batch)
        if not m:
            print(f"--batch must be like d3_001..d3_020 (got: {args.batch})", file=sys.stderr)
            return 1
        lo, hi = m.group(1), m.group(2)

    all_issues = []
    for dom in range(1, 6):
        path = ORIGINALS / f"d{dom}.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text())
        questions = data.get("questions", [])
        in_scope = [q for q in questions if in_batch(q.get("id", ""), lo, hi)] if lo else questions
        if not in_scope:
            continue
        for q in in_scope:
            all_issues.extend(check_question(q))

    if all_issues:
        print(f"=== Framework Currency Check ===")
        print(f"\nWARNINGS ({len(all_issues)}):")
        for i in all_issues:
            print(f"  ⚠ {i['id']} [{i['rule']}] {i['field']}")
            print(f"     snippet: \"{i['snippet']}\"")
            print(f"     issue:   {i['issue']}")
            print(f"     suggest: {i['recommended']}")
            print()
    print(f"Total currency warnings: {len(all_issues)}")
    print(f"({len(CURRENCY_RULES)} rules checked)")

    if all_issues and args.strict:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
