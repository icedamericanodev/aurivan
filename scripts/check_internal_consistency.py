#!/usr/bin/env python3
"""
Internal consistency checker for CISA practice questions.

Stage 2.5 check (between linter and human-style reviewers). Catches
internal contradictions that the linter doesn't (the linter is mechanical
on parity / position / citation library; this checker is mechanical on
internal logical consistency).

Checks (all are mechanical, conservative — flag for human review):

  C1. Conditional option text: options containing "(if exists)", "(if X)",
      "if X exists", etc., where the scenario may not establish X. Flags
      ALL such options for manual verification (don't try to NLP-verify
      scenario coverage).

  C2. correct_explanation self-contradiction: sentences that concede a
      wrong-letter option might actually be right (e.g., "in the moment,
      C is correct" when correct field is B). Pattern-search.

  C3. framework_ref vs correct_explanation citation alignment: citations
      named in correct_explanation should appear in framework_ref (the
      d3_120 / d3_097 patterns the exam-reviewer flagged).

  C4. Cross-reference leakage: "(covered in d{1-5}_NNN)" patterns in
      learner-facing fields (question, scenario_context, options,
      correct_explanation, wrong_explanations, tips, key_concept, pre_read).

  C5. Option-letter telegraphing in correct_explanation: lines like "Only
      option B is correct" or "Option B is the only viable choice" before
      the explanation walks through each option.

Usage:
    python3 scripts/check_internal_consistency.py [--batch dN_NNN..dN_NNN]
                                                  [--strict]

Exit code: 0 clean, 1 errors, 2 warnings (strict only).
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
ORIGINALS = ROOT / "data" / "originals"

# ---- Patterns -------------------------------------------------------------

# C1: conditional hedges in option text
COND_PATTERNS = [
    r"\(if exists\)",
    r"\(if available\)",
    r"\(if applicable\)",
    r"\(if any\)",
    r"\(where applicable\)",
    r"\bif (?:it )?exists\b",
    r"\bif present\b",
    r"\bif feasible\b",
    r"\bassuming a (?:documented|tested|valid)\b",
]
COND_RE = re.compile("|".join(COND_PATTERNS), re.IGNORECASE)

# C2: correct_explanation self-contradiction signals
# Looks for phrases that concede an alternative option (A/B/C/D) is right.
CONTRADICTION_PATTERNS = [
    r"(?:in the moment|in practice|actually|in fact),?\s+(?:option\s+)?[ABCD]\s+(?:is|would be|might be|may be)\s+(?:the\s+)?(?:right|correct|in-the-moment|appropriate|best)",
    r"(?:option\s+)?[ABCD]\s+(?:is|might be|may be)\s+(?:actually|in fact|technically|defensibly)\s+(?:the\s+)?(?:right|correct|best|appropriate)",
    r"the (?:right|correct|in-the-moment) (?:answer|action|choice) is (?:option\s+)?[ABCD]\b",
    r"(?:option\s+)?[ABCD] is also (?:correct|defensible|right)",
]
CONTRADICTION_RE = re.compile("|".join(CONTRADICTION_PATTERNS), re.IGNORECASE)

# C4: cross-reference leakage in learner-facing fields
XREF_RE = re.compile(r"\(covered in (?:d[1-5]_\d{3}[\s,]*)+", re.IGNORECASE)

# C5: option-letter telegraphing
TELEGRAPH_PATTERNS = [
    r"\bonly option [ABCD] is (?:correct|right|the answer)",
    r"\boption [ABCD] is the only (?:correct|viable|right|defensible)",
]
TELEGRAPH_RE = re.compile("|".join(TELEGRAPH_PATTERNS), re.IGNORECASE)

# Citation splitter for C3
CITATION_SPLIT_RE = re.compile(r"[;,]\s*(?=[A-Z])")


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


def normalize_citation(s):
    """Normalize a citation string for comparison (case-insensitive, strip parens)."""
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    return s.lower()


def extract_named_citations(text):
    """Pull out frameworks/standards/guidance named in a text body.

    Conservative: looks for patterns commonly used in correct_explanation
    fields, not every possible citation. Matches things like:
      - "ISO/IEC NNNNN (...)" or "ISO/IEC NNNNN" or "ISO/IEC NNNNN-N"
      - "NIST SP 800-NNN"
      - "COBIT 2019 (any objective code)"
      - "ITAF Standard NNNN"
      - "GDPR Article NN"
      - "OWASP <something>"
      - "ISACA <Something> guidance"
      - "PMBOK Guide 7th Edition"
      - Named acronym frameworks (SLSA, SAFe, etc.)
    """
    found = set()
    # Conservative patterns: only match specific, numbered/named identifiers
    # plus the most common "ISACA <Foo> guidance" form (limited word count).
    patterns = [
        r"ISO/IEC \d{3,6}(?:-\d)?(?::\d{4})?",
        r"\bISO \d{3,6}(?::\d{4})?",
        r"NIST SP 800-\d+(?:[A-Za-z]+)?",
        r"NIST AI RMF \d+\.\d+",
        r"NIST CSF(?: v\d+\.\d+)?",
        r"COBIT 2019 (?:EDM|APO|BAI|DSS|MEA)\d{2}",
        r"ITAF Standard \d{4}",
        r"GDPR Article \d+(?:\(\d+\))?",
        r"GDPR Articles? \d+-\d+",
        r"PMBOK Guide \d+(?:st|nd|rd|th) Edition",
        r"FFIEC IT Examination Handbook",
        r"FFIEC Architecture Principles",
        r"FFIEC Cloud Computing Examination Procedures",
        r"FIPS \d+-\d+",
        r"OCC Bulletin \d+-\d+",
        r"AICPA SSAE 18 AT-C \d+",
        r"AICPA SOC \d(?: Type II)?",
        r"PCI DSS v\d+(?:\.\d+)?",
        r"OWASP SAMM",
        r"OWASP DSOMM",
        r"OWASP ASVS",
        r"OWASP Top 10",
        r"OWASP API Security Top 10",
        # ISACA topical guidance — capture up to 5 words then "guidance"
        r"ISACA(?:\s+[A-Z][A-Za-z/&\-]+){1,5}\s+guidance",
        r"ITIL 4(?:\s+\w+){0,3}",
        r"Val IT Framework",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text):
            found.add(normalize_citation(m.group(0)))
    return found


def check_question(q):
    """Run all consistency checks against one question. Returns list of dicts."""
    issues = []
    qid = q.get("id", "<no-id>")

    # C1: conditional option text
    for letter, opt in q.get("options", {}).items():
        if COND_RE.search(opt):
            issues.append({
                "id": qid,
                "check": "C1",
                "severity": "warning",
                "field": f"options.{letter}",
                "message": f"option {letter} contains conditional hedge — verify scenario establishes the condition: {opt[:90]}...",
            })

    # C2: correct_explanation self-contradiction
    ce = q.get("correct_explanation", "")
    correct_letter = q.get("correct", "")
    for m in CONTRADICTION_RE.finditer(ce):
        match_text = m.group(0)
        # Extract the letter being conceded
        letter_m = re.search(r"\b([ABCD])\b", match_text)
        conceded = letter_m.group(1) if letter_m else "?"
        if conceded != correct_letter:
            issues.append({
                "id": qid,
                "check": "C2",
                "severity": "error",
                "field": "correct_explanation",
                "message": f"correct_explanation concedes option {conceded} might be right (correct is {correct_letter}): \"{match_text}\"",
            })

    # C3: framework_ref vs correct_explanation alignment
    framework_ref = q.get("framework_ref", "")
    ref_citations = set()
    for part in CITATION_SPLIT_RE.split(framework_ref):
        ref_citations.add(normalize_citation(part))
    explanation_citations = extract_named_citations(ce)
    # Only flag citations in explanation but NOT in framework_ref
    for cit in explanation_citations:
        # Allow if any framework_ref citation contains this citation
        # (handles "COBIT 2019 BAI06" being subset of "COBIT 2019 BAI06 (Managed IT Changes)")
        matched = any(cit in ref or ref in cit for ref in ref_citations)
        if not matched:
            issues.append({
                "id": qid,
                "check": "C3",
                "severity": "warning",
                "field": "correct_explanation",
                "message": f"citation appears in correct_explanation but not in framework_ref: \"{cit}\"",
            })

    # C4: cross-reference leakage in learner-facing fields
    learner_fields = [
        ("question", q.get("question", "")),
        ("scenario_context", q.get("scenario_context", "")),
        ("correct_explanation", ce),
        ("key_concept", q.get("key_concept", "")),
        ("pre_read", q.get("pre_read", "")),
    ]
    for opt_letter, opt_text in q.get("options", {}).items():
        learner_fields.append((f"options.{opt_letter}", opt_text))
    for tip_idx, tip in enumerate(q.get("tips", [])):
        learner_fields.append((f"tips[{tip_idx}]", tip))
    for letter, exp in q.get("wrong_explanations", {}).items():
        learner_fields.append((f"wrong_explanations.{letter}", exp))

    for field_name, field_text in learner_fields:
        if XREF_RE.search(field_text):
            issues.append({
                "id": qid,
                "check": "C4",
                "severity": "warning",
                "field": field_name,
                "message": f"cross-reference marker \"(covered in d_XXX)\" leaks internal item-bank structure to learner",
            })

    # C5: option-letter telegraphing in correct_explanation
    if TELEGRAPH_RE.search(ce):
        issues.append({
            "id": qid,
            "check": "C5",
            "severity": "warning",
            "field": "correct_explanation",
            "message": "correct_explanation telegraphs the answer letter prematurely",
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

    errors = [i for i in all_issues if i["severity"] == "error"]
    warnings = [i for i in all_issues if i["severity"] == "warning"]

    if all_issues:
        print(f"=== Internal Consistency Check ===")
        if errors:
            print(f"\nERRORS ({len(errors)}):")
            for i in errors:
                print(f"  ✗ {i['id']} [{i['check']}] {i['field']}: {i['message']}")
        if warnings:
            print(f"\nWARNINGS ({len(warnings)}):")
            for i in warnings:
                print(f"  ⚠ {i['id']} [{i['check']}] {i['field']}: {i['message']}")
        print()
    print(f"Total errors: {len(errors)}")
    print(f"Total warnings: {len(warnings)}")

    if errors:
        return 1
    if warnings and args.strict:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
