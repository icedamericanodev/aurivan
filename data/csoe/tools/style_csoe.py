#!/usr/bin/env python3
"""Run the shared exam-style linter on a CSOE batch, with two CSOE exceptions.

scripts/lint_exam_style_v2.py requires a capitalised priority word (BEST,
MOST, FIRST …) in every stem. CSOE items often ask a direct rule question
("Under Section 403, by when must the director report?"), and the CSOE
standard says to ask those directly (csoe-standards-auditor.md, rule 4):
forcing "MOST" into them makes the rule sound like a matter of degree. Both
standards audits of the pilot (31 Oct 2026) flagged it.

So a stem may skip the priority word only when it names the specific rule
it asks about: Section, Rule, Item, Release or Regulation followed by its
number or letter ("Section 403", "Rule 12b-2", "Item 308", "Release No.
33-8810", "Regulation S-K"). A form name or "the Exchange Act" alone does not
count (tightened after the D2/D5 audit, 31 Oct 2026).

Second, SOXCPA's exam steps PDF says each stem is "a question asked, or an
incomplete statement to be completed", so a CSOE stem may end with a colon
or an ellipsis instead of a question mark (an incomplete statement, for
example "Under Section 404(b), the registered public accounting firm
must:"). The priority-word rule above still applies to it.

Every other check of the shared linter applies unchanged, and the shared
script is not edited.

Usage: python3 data/csoe/tools/style_csoe.py N    (checks data/csoe/originals/dN.json)
Exit 0 = clean, 1 = errors, 2 = warnings only (same as the shared linter).
"""
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("lint", ROOT / "scripts" / "lint_exam_style_v2.py")
lint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lint)

PRIORITY_ERROR = "stem has no capitalised priority word"
QUESTION_MARK_ERROR = "stem must end with '?'"
INCOMPLETE_STATEMENT = re.compile(r"(:|…|\.\.\.)\s*$")
NAMED_RULE = re.compile(r"\b(?:Sections?|Rules?|Item|Release(?: No\.)?|Regulation) (?:\d|[A-Z]-?[A-Z0-9])")


def main(argv):
    d = int(argv[0])
    qs = json.loads((ROOT / "data" / "csoe" / "originals" / f"d{d}.json").read_text(encoding="utf-8"))["questions"]
    n_err = n_warn = 0
    for q in qs:
        errs, warns = lint.check(q)
        stem = q.get("question", "")
        if NAMED_RULE.search(stem):
            errs = [e for e in errs if not e.startswith(PRIORITY_ERROR)]
        if INCOMPLETE_STATEMENT.search(stem):
            errs = [e for e in errs if e != QUESTION_MARK_ERROR]
        for e in errs:
            print(f"ERROR {q['id']}: {e}")
        for w in warns:
            print(f"warn  {q['id']}: {w}")
        n_err += len(errs)
        n_warn += len(warns)
    print(f"D{d}: {len(qs)} items · {n_err} error(s) · {n_warn} warning(s)")
    sys.exit(1 if n_err else 2 if n_warn else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
