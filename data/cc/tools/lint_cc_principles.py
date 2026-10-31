#!/usr/bin/env python3
"""Lint the CC mindset principles (data/cc/mindset/principles.json) with the
shared linter (scripts/lint_principles.py), against the CC notes and bank.

The shared linter accepts ISACA-style note codes (3C3.2). CC notes use ids such
as 1.2.5, so this wrapper changes only that pattern and runs it unchanged
otherwise.

It adds one CC check on triggers (shown in the app as "Spot it in the
question"): each trigger must read as a clue on its own, not a scrap of one
practice question. The check can only catch the mechanical signs: a number
(such as "30-person") or a lone word that is not an ALL-CAPS priority word
(such as "already"). A person still reads every trigger before release.

Usage:
  python3 data/cc/tools/lint_cc_principles.py          # the CC file
  python3 data/cc/tools/lint_cc_principles.py FILE     # a draft copy
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts"))
import lint_principles as lp  # noqa: E402

_configure = lp.configure


def configure(notes=None, bank=None):
    _configure(notes, bank)
    lp.SUBTOPIC = re.compile(r"^([1-5])\.\d+\.\d+$")


lp.configure = configure

PRIORITY_WORDS = {"FIRST", "BEST", "MOST", "PRIMARY", "GREATEST", "MOST LIKELY", "LEAST"}


def check_triggers(path):
    """Return trigger problems: numbers, or lone words that are not priority words."""
    import json
    problems = []
    for p in json.loads(Path(path).read_text()).get("principles", []):
        for t in p.get("triggers") or []:
            where = f"principle '{p.get('id')}': trigger '{t}'"
            if re.search(r"\d", t):
                problems.append(f"{where} has a number; use a clue that fits new questions")
            elif len(t.split()) < 2 and t not in PRIORITY_WORDS:
                problems.append(f"{where} is a lone word; give a phrase that reads as a clue on its own")
    return problems


if __name__ == "__main__":
    files = [a for a in sys.argv[1:] if not a.startswith("--")] or ["data/cc/mindset/principles.json"]
    code = lp.main([sys.argv[0], *files, "--notes", str(ROOT / "data/cc/notes"),
                    "--bank", str(ROOT / "data/cc/originals")])
    trig = [m for f in files for m in check_triggers(f if Path(f).is_absolute() else ROOT / f)]
    for m in trig:
        print(f"  \u2717 {m}")
    print(f"  CC trigger check: {'clean' if not trig else str(len(trig)) + ' problem(s)'}")
    sys.exit(code or (1 if trig else 0))
