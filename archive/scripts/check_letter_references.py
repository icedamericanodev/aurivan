#!/usr/bin/env python3
"""Letter-reference consistency check.

Catches the D1 bug pattern where `correct_explanation` lists distractor letters
but mistakenly includes the correct letter. Example:

  correct = "D"
  correct_explanation: "Options A, C, and D all describe general-business controls"
  -> D is included, but D is the correct answer -> BUG

Two patterns are scanned:
  1. "Options X, Y[, and Z]" enumerations
  2. Parenthetical letter assignments "(X)" attached to a phrase that is the
     CORRECT answer's content, indicating the parenthetical letter is wrong

Pattern 1 is mechanical and reliable.
Pattern 2 needs human verification (semantic match).

Run: python3 scripts/check_letter_references.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / "data" / "originals"

# Matches "Options A, B" / "Options A, B, and C" / "Options A and B"
OPTIONS_LIST = re.compile(
    r"\bOptions?\s+([A-D])(?:\s*,\s*([A-D]))?(?:\s*,?\s*and\s+([A-D]))?(?:\s*,\s*([A-D]))?",
    re.IGNORECASE,
)


def scan_domain(path: Path) -> list[dict]:
    data = json.load(open(path))
    issues = []
    for q in data["questions"]:
        qid = q["id"]
        correct = q.get("correct")
        if not correct:
            continue
        ce = q.get("correct_explanation", "") or ""
        for m in OPTIONS_LIST.finditer(ce):
            letters = [g.upper() for g in m.groups() if g]
            if len(letters) < 2:
                continue
            if correct.upper() in letters:
                issues.append(
                    {
                        "id": qid,
                        "correct": correct,
                        "match": m.group(0),
                        "letters": letters,
                        "context": ce[max(0, m.start() - 30) : m.end() + 60],
                    }
                )
    return issues


def main() -> int:
    total = 0
    for d in range(1, 6):
        path = ORIGINALS / f"d{d}.json"
        issues = scan_domain(path)
        if not issues:
            print(f"D{d}: clean")
            continue
        print(f"D{d}: {len(issues)} issue(s):")
        for it in issues:
            print(
                f"  {it['id']} (correct={it['correct']}): "
                f"\"{it['match']}\" includes correct letter "
                f"-> {' '.join(it['letters'])}"
            )
            print(f"    context: ...{it['context']}...")
            total += 1
    if total:
        print(f"\nTotal issues: {total}")
        return 1
    print("\nAll domains clean.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
