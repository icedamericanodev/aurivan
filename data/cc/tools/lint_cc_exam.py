#!/usr/bin/env python3
"""Lint the CC exam guide and final review week (data/cc/exam/) against
docs/content/EXAM_GUIDE_SCHEMA.md, with the ISC2 differences.

The shared linter (scripts/lint_exam_guide.py) is written for ISACA courses:
ISACA disclaimer, isaca.org and PSI sources, note codes like 1B3, integer
weights, and weights read from the app's certification list. CC is not in the
apps yet, and its 2026 outline uses weights with one decimal (17.3%). So this
wrapper loads the shared linter's code unchanged and swaps only those parts:

  - issuer: ISC2 in the disclaimer, isc2.org in "check before booking"
  - sources: isc2.org and pearsonvue.com (ISC2's test delivery partner)
  - note codes: CC notes ids such as 1.2.5 (and topic ids such as 1.2)
  - weights: numbers that may have one decimal, summing to 100 within 0.15
    (ISC2 rounds each weight, so the 2026 set adds to 99.9), checked
    against WEIGHTS below (docs/content/CC_BLUEPRINT.md) instead of the apps
  - exam length: 100 to 125 questions (ISC2's CC adaptive exam)

Usage:
  python3 data/cc/tools/lint_cc_exam.py           # both files in data/cc/exam/
  python3 data/cc/tools/lint_cc_exam.py FILE ...  # draft copies
When CC gets a block in mobile/src/content/certifications.ts and the shared
linter learns issuers, switch to: python3 scripts/lint_exam_guide.py --cert cc
"""
import re
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SHARED = ROOT / "scripts" / "lint_exam_guide.py"
WEIGHTS = {"1": 24, "2": 17.3, "3": 20, "4": 21.3, "5": 17.3}  # CC outline, effective 2026

src = SHARED.read_text()
swaps = [
    ('SOURCE_HOSTS = ("isaca.org", "psiexams.com", "psionline.com")',
     'SOURCE_HOSTS = ("isc2.org", "pearsonvue.com")'),
    ('"ISACA" in disc', '"ISC2" in disc'),
    ("not affiliated with ISACA", "not affiliated with ISC2"),
    ('"isaca.org" in cbb', '"isc2.org" in cbb'),
    ("check isaca.org before", "check isc2.org before"),
    ("re-check them on isaca.org", "re-check them on isc2.org"),
    ("EXAM_QUESTION_COUNTS = {150}", "EXAM_QUESTION_COUNTS = {100, 125}"),
    ('isinstance(d.get("weight"), int)', 'isinstance(d.get("weight"), (int, float))'),
    ("weight must be an integer percent", "weight must be a percent"),
    ("if weights and sum(weights.values()) != 100:", "if weights and abs(sum(weights.values()) - 100) > 0.15:"),
]
for old, new in swaps:
    if src.count(old) != 1:
        sys.exit(f"lint_cc_exam: the shared linter changed; cannot find {old!r}")
    src = src.replace(old, new)
src = src.replace('if __name__ == "__main__":', 'if False:')

leg = types.ModuleType("lint_exam_guide_cc")
leg.__file__ = str(SHARED)
sys.path.insert(0, str(ROOT / "scripts"))
exec(compile(src, str(SHARED), "exec"), leg.__dict__)


def configure(cert):
    leg.CERT = "cc"
    base = ROOT / "data" / "cc"
    leg.GUIDE = base / "exam" / "cc_exam_guide.json"
    leg.WEEK = base / "exam" / "final_review_week.json"
    leg.PRINCIPLES = base / "mindset" / "principles.json"
    leg.NOTES = base / "notes"
    leg.NOTE_CODE = re.compile(r"^([1-5])\.\d+(\.\d+)?$")
    leg.DOMAIN_IDS = list(WEIGHTS)
    leg.SHEET_REFS = set(leg.DOMAIN_IDS) | leg.DYNAMIC_DOMAINS | {"principles", "priority_words", "routine", "pace"}


def load_codes():
    import json
    codes = set()
    for f in sorted((ROOT / "data" / "cc" / "notes").glob("d*.json")):
        for t in json.loads(f.read_text())["topics"]:
            codes.add(t.get("topic_id") or t.get("id"))
            codes.update(s["id"] for s in t["subtopics"])
    codes.discard(None)
    return codes


leg.configure = configure
leg.load_di_weights = lambda: None
leg.load_mobile_weights = lambda: dict(WEIGHTS)
leg.load_note_codes = load_codes

if __name__ == "__main__":
    argv = [a for a in sys.argv if a not in ("--cert", "cc")]
    sys.exit(leg.main([argv[0], "--cert", "cc", *argv[1:]]))
