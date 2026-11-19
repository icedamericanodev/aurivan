#!/usr/bin/env python3
"""Answer-free copy of CIA items for the blind tester (qa-question-tester).

Writes only id, outline code, stem and options: no key, no explanations, no
tips, no citations. The blind tester must never see a key.

Usage:
  python3 data/cia/tools/blind_copy.py cia1 1 --out /path/blind.json           # a whole section file
  python3 data/cia/tools/blind_copy.py cia1 1 --ids 21-45 --out /path/blind.json
"""
import sys
from pathlib import Path

import cia_common as c


def main(argv):
    root, _today, args = c.setup(argv)
    out = c.pop_opt(args, "--out")
    ids = c.pop_opt(args, "--ids")
    if len(args) < 2 or not out:
        print(__doc__)
        return 2
    pack, d = args[0], int(args[1])
    qs = c.read_json(root / pack / "originals" / f"d{d}.json")["questions"]
    if ids:
        lo, hi = (int(x) for x in ids.split("-"))
        qs = [q for q in qs if lo <= int(q["id"][-3:]) <= hi]
    blind = [{"id": q["id"], "code": q["subtopic"].split(" ")[0], "question": q["question"], "options": q["options"]}
             for q in qs]
    Path(out).write_text(c.dump_json(blind), encoding="utf-8")
    print(f"{len(blind)} answer-free item(s) written to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
