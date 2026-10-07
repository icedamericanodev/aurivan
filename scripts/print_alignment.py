#!/usr/bin/env python3
"""Print each exam-style v2 item's options beside its wrong explanations and tips.

Used for the alignment read in the v2 loop (docs/content/EXAM_STYLE_V2.md):
a reviewer checks that every "why-X-wrong" line and every tip letter
describes the option actually under that letter. Word-overlap checks
cannot catch option texts placed under the wrong letters (synonyms
defeat them), so this step is a read, not a lint.

Usage:
    python3 scripts/print_alignment.py 4 > /tmp/align_d4.txt
    python3 scripts/print_alignment.py --file batch.json
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load(args):
    if "--file" in args:
        data = json.loads(Path(args[args.index("--file") + 1]).read_text())
    else:
        n = int(next(a for a in args if a.isdigit()))
        data = json.loads((ROOT / "data" / "originals" / f"d{n}.json").read_text())
    if isinstance(data, dict):
        data = data["questions"]
    return [q["after"] if "after" in q else q for q in data]


for q in load(sys.argv[1:]):
    if q.get("style_version") != 2:
        continue
    print(f"== {q['id']} key={q['correct']}")
    for k in "ABCD":
        print(f"  {k}: {q['options'][k]}")
        if k in q["wrong_explanations"]:
            print(f"     why-{k}-wrong: {q['wrong_explanations'][k]}")
    for i, tip in enumerate(q["tips"][:2], 1):
        print(f"  tip{i}: {tip}")
