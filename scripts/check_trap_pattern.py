#!/usr/bin/env python3
"""
Trap-letter pattern enforcer for CISA practice questions.

Catches the recurring pedagogy-reviewer finding: when multiple
distractors are equally seductive, tip 1 names only one trap-letter.
This script counts the seductiveness signals in each wrong_explanation
and recommends single-trap / two-trap / three-trap framing.

Built in response to the D3-1 through D3-6 trajectory where the
pedagogy reviewer consistently flagged 3-5 questions per batch where
two-trap (or three-trap) would have been better than single-trap.

Usage:
    python3 scripts/check_trap_pattern.py [--batch dN_NNN..dN_NNN] [--strict]
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
ORIGINALS = ROOT / "data" / "originals"

# ---- Seductiveness signals ------------------------------------------------
#
# Words/phrases in wrong_explanations that indicate the author considered
# the option seductive. If a wrong_explanation contains ANY of these,
# count the distractor as seductive.

SEDUCTIVENESS_SIGNALS = [
    r"\bseductive\b",
    r"\bcommon (?:misconception|pattern|shortcut|response|trap)\b",
    r"\bdefault (?:assumption|view|response|preference)\b",
    r"\bintuitive\b",
    r"\bfeels\s+(?:rigorous|efficient|safe|defensible|measured|principled|pragmatic|disciplined|collaborative)\b",
    r"\bsounds (?:plausible|reasonable|appropriate|defensible|principled|rigorous|comprehensive)\b",
    r"\bmatches (?:the )?common\b",
    r"\bmatches (?:the )?early\b",
    r"\bmatches (?:the )?CIO\b",
    r"\bmatches (?:the )?CFO\b",
    r"\bmatches (?:the )?CTO\b",
    r"\b(?:pro-|opposing |opposite |reverse )?bias\b",
    r"\bpattern[- ]matches\b",
    r"\btextbook (?:bad|anti)[- ]?pattern\b",
    r"\b(?:reflexive|kneejerk|knee-jerk) (?:answer|response|reaction)\b",
    r"\bcandidates? (?:often|may|might|frequently) (?:pick|choose|select|conflate)\b",
]
SEDUCTIVE_RE = re.compile("|".join(SEDUCTIVENESS_SIGNALS), re.IGNORECASE)

# ---- Tip 1 pattern parsing ------------------------------------------------

TRAP_PATTERNS = [
    (r"^Trap is ([ABCD]) (?:or|,) ([ABCD])(?:[,\s]+(?:or\s+)?([ABCD]))?\b", "multi"),
    (r"^Trap is ([ABCD])(?:\s+(?:primarily|alone|specifically))?[:.]?\s+\"", "single"),
    (r"^Trap is ([ABCD])\s*[—-]", "single"),
    (r"^Trap is ([ABCD])\s+\(", "single"),
]


def parse_trap_in_tip1(tip1):
    """Return ('single', [letter]) or ('multi', [letters]) or ('none', [])."""
    if not tip1:
        return "none", []
    # Try multi-trap first
    m = re.match(r"^Trap is ([ABCD])(?:[\s,]+or\s+([ABCD]))?(?:[\s,]+(?:or\s+)?([ABCD]))?\b", tip1)
    if m:
        letters = [g for g in m.groups() if g]
        if len(letters) > 1:
            return "multi", letters
        return "single", letters
    return "none", []


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
    """Return list of pattern-mismatch findings."""
    issues = []
    qid = q.get("id", "<no-id>")
    correct = q.get("correct", "")
    wrong = q.get("wrong_explanations", {})
    tips = q.get("tips", [])

    if not tips:
        return issues
    tip1 = tips[0]

    # Count seductive distractors
    seductive_letters = []
    for letter, exp in wrong.items():
        if SEDUCTIVE_RE.search(exp):
            seductive_letters.append(letter)

    # Parse what tip 1 says
    pattern_type, named_letters = parse_trap_in_tip1(tip1)

    seductive_count = len(seductive_letters)
    named_count = len(named_letters)

    # Recommendation rules:
    # - 1 seductive → single-trap (1 named) OK
    # - 2 seductive → two-trap (2 named) recommended; single-trap WARNING
    # - 3 seductive → three-trap (3 named) recommended; fewer → WARNING

    if seductive_count >= 2 and named_count < seductive_count:
        issues.append({
            "id": qid,
            "severity": "warning",
            "seductive_count": seductive_count,
            "seductive_letters": seductive_letters,
            "named_count": named_count,
            "named_letters": named_letters,
            "pattern_type": pattern_type,
            "tip1": tip1[:150],
            "recommendation": f"Tip 1 names {named_count} trap-letter(s) but {seductive_count} distractors are seductive ({', '.join(seductive_letters)}). Recommend {'three-trap' if seductive_count >= 3 else 'two-trap'} pattern.",
        })

    return issues


# ---- Main -----------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", help="Range like d3_001..d3_020 (optional)")
    ap.add_argument("--strict", action="store_true", help="Exit 2 on warnings")
    args = ap.parse_args()

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
        print(f"=== Trap-Pattern Check ===")
        print(f"\nPATTERN-MISMATCH WARNINGS ({len(all_issues)}):")
        for i in all_issues:
            print(f"  ⚠ {i['id']}: {i['seductive_count']} seductive ({','.join(i['seductive_letters'])}) "
                  f"vs {i['named_count']} named ({','.join(i['named_letters'])})")
            print(f"     {i['recommendation']}")
            print(f"     tip1: {i['tip1']}")
            print()
    print(f"Total pattern-mismatch warnings: {len(all_issues)}")

    if all_issues and args.strict:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
