#!/usr/bin/env python3
"""Lint the CSOE exam guide and final review week with the shared linter.

scripts/lint_exam_guide.py checks a course's "About the exam" guide and its
final review week against docs/content/EXAM_GUIDE_SCHEMA.md. Its --cert mode
reads the course's domains and weights from mobile/src/content/certifications.ts
and accepts only ISACA's and PSI's pages as sources. CSOE is not in the mobile
app yet, and its issuer is SOXCPA, so this wrapper runs the same checks with
CSOE's settings and changes only what is ISACA-specific:

- domains and weights come from docs/content/CSOE_BLUEPRINT.md ("Domains and
  weights"), the CSOE source of truth until CSOE is wired into the apps;
- sources may be SOXCPA's site or the primary-law and framework hosts the
  CSOE notes cite (sec.gov, govinfo.gov, law.cornell.edu, coso.org,
  aicpa-cima.com);
- the real exam has 35 questions, so 35 is the allowed exam question count;
- the disclaimer must name SOXCPA (not ISACA) and say KaiSip is not
  affiliated, and check_before_booking must point to SOXCPA's site.

Every other rule of the shared linter applies unchanged; the shared script is
not edited.

Usage:
    python3 data/csoe/tools/lint_exam_guide_csoe.py                 # both CSOE files
    python3 data/csoe/tools/lint_exam_guide_csoe.py draft.json ...  # draft copies
"""
import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("lint_exam_guide", ROOT / "scripts" / "lint_exam_guide.py")
lg = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lg)

BLUEPRINT = ROOT / "docs" / "content" / "CSOE_BLUEPRINT.md"
SOXCPA = "sarbanes-oxley-association.com"


def blueprint_weights():
    """{domain id: weight} from the blueprint's 'Domains and weights' table."""
    weights = {}
    for line in BLUEPRINT.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\| D([1-9]) [^|]+\|[^|]+\|[^|]+\| (\d+)% \|$", line)
        if m:
            weights[m.group(1)] = int(m.group(2))
    return weights


def configure():
    lg.CERT = "csoe"
    base = ROOT / "data" / "csoe"
    lg.GUIDE = base / "exam" / "csoe_exam_guide.json"
    lg.WEEK = base / "exam" / "final_review_week.json"
    lg.PRINCIPLES = base / "mindset" / "principles.json"
    lg.NOTES = base / "notes"
    lg.NOTE_CODE = re.compile(r"^([1-9])[A-Z]\d+(\.\d+)?$")
    weights = blueprint_weights()
    lg.DOMAIN_IDS = sorted(weights)
    lg.SHEET_REFS = set(lg.DOMAIN_IDS) | lg.DYNAMIC_DOMAINS | {"principles", "priority_words", "routine", "pace"}
    lg.SOURCE_HOSTS = (SOXCPA, "sec.gov", "govinfo.gov", "law.cornell.edu", "coso.org", "aicpa-cima.com")
    lg.EXAM_QUESTION_COUNTS = {35}
    lg.load_mobile_weights = lambda: weights
    lg.load_di_weights = lambda: None
    return weights


# The two ISACA-specific guide checks, replaced by their SOXCPA equivalents.
ISACA_ONLY = ("disclaimer must say KaiSip is independent and not affiliated with ISACA",
              "check_before_booking must tell learners to check isaca.org")
_err = lg.err


def err(where, msg):
    if not any(msg.startswith(s) for s in ISACA_ONLY):
        _err(where, msg)


def check_soxcpa_lines(doc):
    label = "csoe_exam_guide.json"
    disc = doc.get("disclaimer", "")
    if not (isinstance(disc, str) and "SOXCPA" in disc and re.search(r"not affiliated", disc, re.I)):
        _err(label, "disclaimer must say KaiSip is independent and not affiliated with SOXCPA")
    cbb = doc.get("check_before_booking", "")
    if not (isinstance(cbb, str) and SOXCPA in cbb and "before you book" in cbb and "change" in cbb):
        _err(label, f"check_before_booking must tell learners to check {SOXCPA} before they book because these change")


def main():
    weights = configure()
    lg.err = err
    _lint_guide = lg.lint_guide

    def lint_guide(doc, ctx):
        _lint_guide(doc, ctx)
        check_soxcpa_lines(doc)
    lg.lint_guide = lint_guide
    print(f"CSOE domains and weights from the blueprint: {weights} (sum {sum(weights.values())})")
    # lg.main parses --cert; give it none so our configuration stays in force.
    lg.configure = lambda cert: None
    args = [a for a in sys.argv[1:]]
    if not args:
        args = [str(p) for p in (lg.GUIDE, lg.WEEK) if p.exists()]
        if not args:
            print("No CSOE exam guide or final review week yet in data/csoe/exam/ (nothing to check).")
            return 0
    return lg.main(["lint_exam_guide_csoe.py"] + args)


if __name__ == "__main__":
    sys.exit(main())
