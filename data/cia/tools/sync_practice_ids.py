#!/usr/bin/env python3
"""Fill each notes sub-topic's `practice_ids` from the questions' `_provenance`.

The "Practice this concept" links under a note are generated: a question names
the notes sub-topic it was written from ("notes 1A1.2"), and this script lists
it under that sub-topic. Never edit practice_ids by hand. A sub-topic with no
question has no practice_ids field.

Usage:
  python3 data/cia/tools/sync_practice_ids.py          # rewrite the notes files
  python3 data/cia/tools/sync_practice_ids.py --check  # report drift, change nothing (exit 1 on drift)
"""
import re
import sys

import cia_common as c


def main(argv):
    root, _today, args = c.setup(argv)
    drift = 0
    for pack in c.PARTS:
        for d, qpath in c.question_files(root, pack):
            npath = root / pack / "notes" / f"d{d}.json"
            if not npath.exists():
                continue
            by_note = {}
            for q in c.read_json(qpath)["questions"]:
                m = re.search(r"\bnotes (\d[A-G]\d+\.\d+)", q.get("_provenance") or "")
                if m:
                    by_note.setdefault(m.group(1), []).append(q["id"])
            notes = c.read_json(npath)
            before = c.dump_json(notes)
            for t in notes["topics"]:
                for i, s in enumerate(t["subtopics"]):
                    ids = by_note.get(s["id"])
                    s.pop("practice_ids", None)
                    if ids:   # keep the house order: practice_ids right after legacy_ids, else after name
                        new = {}
                        for k, v in s.items():
                            new[k] = v
                            if k == ("legacy_ids" if "legacy_ids" in s else "name"):
                                new["practice_ids"] = ids
                        t["subtopics"][i] = new
            if c.dump_json(notes) != before:
                drift += 1
                if "--check" in args:
                    print(f"ERROR {pack}/notes/d{d}.json: practice links are out of date")
                else:
                    c.write_json(npath, notes)
                    print(f"{pack}/notes/d{d}.json: practice links updated")
    print(f"sync_practice_ids: {drift} file(s) " + ("out of date" if "--check" in args else "updated"))
    return 1 if drift and "--check" in args else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
