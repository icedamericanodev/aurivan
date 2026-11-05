#!/usr/bin/env python3
"""Fill each CC notes sub-topic's `practice_ids` from the question bank.

`practice_ids` drives the "Practice this concept" button
(docs/content/NOTES_SCHEMA_V2.md). Every CC question names the notes
sub-topic it was authored from in `_provenance` ("notes 4.1.2 ..."); the
first one named is its home, so each question sits under exactly one
sub-topic, in the same domain. Sub-topics with no question get no field.

Idempotent: run it after any batch or notes change.

Usage:
  python3 data/cc/tools/sync_practice_ids.py          # write all five domains
  python3 data/cc/tools/sync_practice_ids.py --check  # report drift, write nothing (exit 1 on drift)
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

CC = Path(__file__).resolve().parent.parent


def indent_of(raw):
    second = raw.split("\n")[1]
    return len(second) - len(second.lstrip())


def main(argv):
    check = "--check" in argv
    drift = 0
    for d in range(1, 6):
        qs = json.loads((CC / "originals" / f"d{d}.json").read_text(encoding="utf-8"))["questions"]
        home = defaultdict(list)
        for q in qs:
            m = re.search(r"\bnotes (\d+\.\d+\.\d+)", q["_provenance"])
            if m:
                home[m.group(1)].append(q["id"])
        path = CC / "notes" / f"d{d}.json"
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
