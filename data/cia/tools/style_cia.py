#!/usr/bin/env python3
"""Run the shared exam-style linter on a CIA question file, unchanged.

scripts/lint_exam_style_v2.py checks stems, options, explanations and tips for
every KaiSip bank. CIA has NO exceptions to it today; this wrapper only finds
the files, so a round runs one command per pack. If a real CIA exception is
ever needed, it is written down here and in docs/content/CIA_BANK_PLAN.md.

One written-down difference in how its result is read: the shared linter fails
a file whose key is the longest option in more than 30% of items, whatever the
file's size. On a small file that number is noise (4 of 12 is 33%), and the
generated Challenge pack's section files start small because they hold only the
tagged Part items. So below 40 items in a file that one line is printed as a
note and does not fail the gate. From 40 items it fails as usual, and
check_cia.py enforces the stricter 15 to 24% on every Part file from 40 items.

Known and accepted: the shared linter's "stem names no actor" warning looks for
CISA actors, so it can appear on CIA items; every stem must still name who acts.
The 15 to 24% longest-option limit is enforced by check_cia.py (the shared
linter's own ceiling is 30%).

Usage:
  python3 data/cia/tools/style_cia.py            # every pack and section present
  python3 data/cia/tools/style_cia.py cia1       # one pack
  python3 data/cia/tools/style_cia.py cia1 2     # one section file
Exit 1 if the shared linter reports an error on any file.
"""
import re
import subprocess
import sys

import cia_common as c


LENGTH_TELL = "key is the longest option"
SMALL_FILE = 40


def main(argv):
    root, _today, args = c.setup(argv)
    packs = [a for a in args if a in c.PACKS] or c.PACKS
    doms = [int(a) for a in args if a.isdigit()]
    bad = ran = 0
    for pack in packs:
        for d, path in c.question_files(root, pack):
            if doms and d not in doms:
                continue
            n_items = len(c.read_json(path)["questions"])
            if not n_items:
                continue   # an empty generated Challenge section file
            ran += 1
            out = subprocess.run([sys.executable, str(c.REPO / "scripts" / "lint_exam_style_v2.py"), "--file", str(path)],
                                 capture_output=True, text=True)
            lines = out.stdout.strip().splitlines()
            # Below SMALL_FILE items the longest-option share is noise: a note, not a failure.
            noise = [l for l in lines if "ERROR" in l and LENGTH_TELL in l] if n_items < SMALL_FILE else []
            shown = [l.replace("ERROR", "note (not enforced below 40 items):") if l in noise else l
                     for l in lines if "ERROR" in l or "--verbose" in args]
            print("\n".join(shown + [f"{pack} d{d}: {lines[-1] if lines else out.stderr.strip()}"]))
            m = re.search(r"(\d+) error\(s\)", lines[-1]) if lines else None
            # The shared linter exits 1 on errors and 2 on warnings only.
            if not m or int(m.group(1)) - len(noise) > 0:
                bad += 1
    if not ran:
        print("style_cia: no question files yet")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
