#!/usr/bin/env python3
"""Answer-free copy of CIA items for the blind tester (qa-question-tester).

Writes only id, outline code, stem and options: no key, no explanations, no
tips, no citations. The blind tester must never see a key. Retired items are
left out: nobody answers them again.

Usage:
  python3 data/cia/tools/blind_copy.py cia1 1 --out /path/blind.json           # a whole section file
  python3 data/cia/tools/blind_copy.py cia1 1 --ids 21-45 --out /path/blind.json
  python3 data/cia/tools/blind_copy.py cia1 1 --options-only --out /path/options.json
      # the cue test: only id and options, no stem. Score both kinds with score_blind.py.
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
    qs = [q for q in c.read_json(root / pack / "originals" / f"d{d}.json")["questions"] if not c.is_retired(q)]
    if ids:
        lo, hi = (int(x) for x in ids.split("-"))
        qs = [q for q in qs if lo <= int(q["id"][-3:]) <= hi]
    if "--options-only" in args:
        # The cue test: no stem and no outline code, only the four options. A tester who can still
        # pick the key well above chance is being told the answer by the options themselves.
        blind = [{"id": q["id"], "options": q["options"]} for q in qs]
    else:
        blind = [{"id": q["id"], "code": q["subtopic"].split(" ")[0], "question": q["question"],
                  "options": q["options"]} for q in qs]
    Path(out).write_text(c.dump_json(blind), encoding="utf-8")
    print(f"{len(blind)} answer-free item(s) written to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
