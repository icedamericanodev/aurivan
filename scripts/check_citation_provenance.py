#!/usr/bin/env python3
"""
Citation provenance checker for CISA practice questions.

Catches fabricated "ISACA <Topic> guidance" citations — those that pattern-
match a real ISACA publication but don't correspond to any actual ISACA
document. Real ISACA publications follow specific naming conventions
(ITAF sections, IT Audit and Assurance Programs, COBIT 2019 objectives,
CISA Review Manual chapters, Journal articles). Generic "ISACA <Topic>
guidance" is almost always invented.

Built in response to the recurring exam-reviewer finding across D3-1
through D4-5 batches: "framework_ref cites 'ISACA <Topic> guidance' which
is not a recognized publication." 206+ such citations accumulated before
this checker was built.

Conservative strategy: flag the SUSPECT pattern + provide the recommended
real-publication mapping. Author decides whether to replace.

Usage:
    python3 scripts/check_citation_provenance.py
        [--batch dN_NNN..dN_NNN]
        [--strict]
        [--summary]
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).parent.parent
ORIGINALS = ROOT / "data" / "originals"

# Pattern: "ISACA <Title-Case Phrase> <generic-suffix>"
# Generic suffixes that signal fabrication
SUSPECT_RE = re.compile(
    r"^ISACA\s+[A-Z][\w\s&/'-]+?\s+(guidance|practice|framework|practices|guide)$"
)

# Real ISACA publication families. Citations matching one of these are recognized.
# These are intentionally permissive — author can cite a specific section or
# subprogram name from any of these families and it counts as real.
REAL_FAMILIES = [
    re.compile(r"^ISACA\s+ITAF\b", re.IGNORECASE),
    re.compile(r"^ISACA\s+COBIT\s*(?:5|2019)?", re.IGNORECASE),
    re.compile(r"^ISACA\s+CISA\s+Review\s+Manual", re.IGNORECASE),
    re.compile(r"^ISACA\s+CISM\s+Review\s+Manual", re.IGNORECASE),
    re.compile(r"^ISACA\s+CRISC\s+Review\s+Manual", re.IGNORECASE),
    re.compile(r"^ISACA\s+Risk\s*IT\b", re.IGNORECASE),
    re.compile(r"^ISACA\s+Val\s*IT\b", re.IGNORECASE),
    re.compile(r"^ISACA\s+Journal\b", re.IGNORECASE),
    # IT Audit and Assurance Program family — must include "Audit/Assurance Program"
    re.compile(
        r"^ISACA\s+.*\bAudit/?Assurance\s+Program\b", re.IGNORECASE
    ),
    re.compile(r"^ISACA\s+.*\bAudit\s+Program\b", re.IGNORECASE),
    # White papers / research reports
    re.compile(r"^ISACA\s+.*\b(White\s+Paper|Research\s+Report)\b", re.IGNORECASE),
]

# Recommended mappings: suspect citation -> real publication
# Maintainer-curated. Add as needed.
RECOMMENDED_MAPPINGS = {
    "ISACA Software Audit guidance": "ISACA Software Project Management Audit/Assurance Program",
    "ISACA Application Controls guidance": "ISACA IT Application Controls Audit/Assurance Program",
    "ISACA IT Vendor Management guidance": "ISACA Vendor Management Audit/Assurance Program",
    "ISACA Project Management guidance": "ISACA Project Management Audit/Assurance Program",
    "ISACA Database Audit guidance": "ISACA Database Management Audit/Assurance Program",
    "ISACA Information Security Governance guidance": "ISACA Information Security Management Audit/Assurance Program",
    "ISACA Data Governance guidance": "COBIT 2019 APO14 Managed Data",
    "ISACA Vendor Management guidance": "ISACA Vendor Management Audit/Assurance Program",
    "ISACA Network Management guidance": "ISACA Network Perimeter Security Audit/Assurance Program",
    "ISACA BIA guidance": "ISACA Business Continuity Management Audit/Assurance Program",
    "ISACA Cloud Governance guidance": "ISACA Cloud Computing Management Audit/Assurance Program",
    "ISACA IT Service Management guidance": "COBIT 2019 BAI04 Managed Availability and Capacity",
    "ISACA Incident Response guidance": "ISACA Incident Management and Response Audit/Assurance Program",
    "ISACA Outsourcing Governance guidance": "ISACA Outsourced IT Environments Audit/Assurance Program",
}


def load_questions(domain_path: Path):
    if not domain_path.exists():
        return []
    try:
        data = json.loads(domain_path.read_text())
        return data.get("questions", [])
    except json.JSONDecodeError:
        return []


def is_real(citation: str) -> bool:
    return any(p.match(citation) for p in REAL_FAMILIES)


def is_suspect(citation: str) -> bool:
    return bool(SUSPECT_RE.match(citation))


def parse_batch(spec: str):
    """Parse 'dN_NNN..dN_NNN' into (domain, start, end)."""
    m = re.match(r"d(\d+)_(\d+)\.\.d(\d+)_(\d+)", spec)
    if not m:
        return None
    d1, s, d2, e = m.groups()
    if d1 != d2:
        return None
    return int(d1), int(s), int(e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", help="dN_NNN..dN_NNN range")
    ap.add_argument("--strict", action="store_true", help="exit non-zero on findings")
    ap.add_argument(
        "--summary",
        action="store_true",
        help="print top suspect citations across the bank",
    )
    args = ap.parse_args()

    batch = parse_batch(args.batch) if args.batch else None

    findings = []
    bank_suspects = Counter()

    for d in range(1, 6):
        questions = load_questions(ORIGINALS / f"d{d}.json")
        for q in questions:
            qid = q.get("id", "")
            # ID filter
            if batch:
                bd, bs, be = batch
                if d != bd:
                    continue
                num = int(qid.split("_")[1]) if "_" in qid else -1
                if not (bs <= num <= be):
                    continue
            fr = q.get("framework_ref", "")
            for c in fr.split(";"):
                c = c.strip()
                if not c:
                    continue
                if c.startswith("ISACA") and is_suspect(c) and not is_real(c):
                    findings.append((qid, c))
                    bank_suspects[c] += 1

    if args.summary:
        # Bank-wide summary mode (ignore batch filter for the print, but still
        # show batch findings if --batch was passed).
        print(f"\n=== Bank-wide suspect ISACA-generic citations ===")
        global_count = Counter()
        for d in range(1, 6):
            for q in load_questions(ORIGINALS / f"d{d}.json"):
                fr = q.get("framework_ref", "")
                for c in fr.split(";"):
                    c = c.strip()
                    if c.startswith("ISACA") and is_suspect(c) and not is_real(c):
                        global_count[c] += 1
        print(f"Total suspect citation occurrences: {sum(global_count.values())}")
        print(f"Unique suspect citations: {len(global_count)}")
        print()
        print("Top 30 by frequency:")
        for c, n in global_count.most_common(30):
            recommended = RECOMMENDED_MAPPINGS.get(c, "(no mapping; suggest real ITAF/Audit Program/COBIT objective)")
            print(f"  {n:>3}x  {c}")
            print(f"        → {recommended}")
        print()

    if findings:
        print(f"\n=== Citation provenance findings ({len(findings)}) ===")
        # Group by qid
        by_qid = {}
        for qid, c in findings:
            by_qid.setdefault(qid, []).append(c)
        for qid in sorted(by_qid):
            for c in by_qid[qid]:
                rec = RECOMMENDED_MAPPINGS.get(c, "")
                rec_str = f" → recommend: {rec}" if rec else ""
                print(f"  ⚠ {qid}: suspect '{c}'{rec_str}")
        print()
        print(f"Total findings: {len(findings)}")
        if args.strict:
            sys.exit(1)
    else:
        scope = "in batch" if batch else "in bank"
        print(f"Citation provenance: clean ({scope})")


if __name__ == "__main__":
    main()
