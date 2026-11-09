#!/usr/bin/env python3
"""Fill each CSOE notes sub-topic's `practice_ids` from the question bank.

`practice_ids` drives the "Practice this concept" button
(docs/content/NOTES_SCHEMA_V2.md). Every CSOE question names the notes
sub-topic it was authored from in `_provenance` ("notes 3A2.1 ..."); the
first one named is its home, so each question sits under exactly one
sub-topic, in the same domain. Sub-topics with no question get no field.

Questions held out for the mock forms (data/csoe/exam/mock_forms.json,
`held_out`) are never linked: practice must not serve them.

Idempotent: run it after any batch or notes change.

Usage:
  python3 data/csoe/tools/sync_practice_ids.py          # write every domain present
  python3 data/csoe/tools/sync_practice_ids.py --check  # report drift, write nothing (exit 1 on drift)
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

CSOE = Path(__file__).resolve().parent.parent


def indent_of(raw):
    lines = raw.split("\n")
    if len(lines) < 2:  # single-line JSON: write it back with the house indent
        return 2
    return len(lines[1]) - len(lines[1].lstrip())


def main(argv):
    check = "--check" in argv
    drift = 0
    forms = CSOE / "exam" / "mock_forms.json"
    held = set(json.loads(forms.read_text(encoding="utf-8")).get("held_out", [])) if forms.exists() else set()
    doms = sorted(int(p.stem[1:]) for p in (CSOE / "originals").glob("d*.json") if p.stem[1:].isdigit())
    for d in doms:
        if not (CSOE / "notes" / f"d{d}.json").exists():
            print(f"D{d}: no notes file yet, skipped")
            continue
        qs = json.loads((CSOE / "originals" / f"d{d}.json").read_text(encoding="utf-8"))["questions"]
        home = defaultdict(list)
        for q in qs:
            if q["id"] in held:
                continue
            m = re.search(r"\bnotes (\d[A-G]\d\.\d+)", q["_provenance"])
            if m:
                home[m.group(1)].append(q["id"])
        path = CSOE / "notes" / f"d{d}.json"
        raw = path.read_text(encoding="utf-8")
        notes = json.loads(raw)
        changed = 0
        for topic in notes["topics"]:
            for i, sub in enumerate(topic["subtopics"]):
                want = home.get(sub["id"], [])
                if sub.get("practice_ids", []) == want:
                    continue
                changed += 1
                if want:
                    # Keep the schema's field order: practice_ids sits right after legacy_ids.
                    items = [(k, v) for k, v in sub.items() if k != "practice_ids"]
                    at = [k for k, _ in items].index("legacy_ids") + 1 if "legacy_ids" in sub else len(items)
                    items.insert(at, ("practice_ids", want))
                    topic["subtopics"][i] = dict(items)
                else:
                    sub.pop("practice_ids", None)
        print(f"D{d}: {changed} sub-topic(s) {'differ' if check else 'updated'}, "
              f"{sum(len(v) for v in home.values())} questions linked")
        drift += changed
        if changed and not check:
            text = json.dumps(notes, indent=indent_of(raw), ensure_ascii=False)
            path.write_text(text + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
    sys.exit(1 if check and drift else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
