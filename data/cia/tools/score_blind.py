#!/usr/bin/env python3
"""Score a blind tester's answers against the keys (the tester never runs this).

Two kinds of blind file, both made by blind_copy.py and answered by
qa-question-tester in fresh context:

  the blind test   id, outline code, stem and options. The tester answers as a
                   prepared candidate. Agreement with the key below 90% means
                   the round does not merge until the disputed items are fixed
                   or cut (docs/content/CIA_BANK_PLAN.md, section 7).
  the cue test     only id and options, no stem (blind_copy.py --options-only).
                   The tester guesses the key from the options alone. Chance is
                   25%. The share guessed right measures how much the options
                   themselves give the answer away; it is reported in every
                   round's scorecard beside the baselines measured on
                   19 Nov 2026 (plan section 6b).

The answers file is {"answers": [{"id", "answer", ...}]} or
{"guesses": [{"id", "guess", ...}]}.

Usage:
  python3 data/cia/tools/score_blind.py ANSWERS.json [ANSWERS2.json ...] [--root DIR]
Prints agreement per file, the ids that disagree, and any flags the tester raised.
Exit 0 always: this measures, the scorecard decides.
"""
import sys
from collections import Counter

import cia_common as c


def main(argv):
    root, _today, args = c.setup(argv)
    keys = {q["id"]: q for pack in c.PACKS for _d, path in c.question_files(root, pack)
            for q in c.read_json(path)["questions"]}
    for path in args:
        data = c.read_json(path)
        rows = data.get("answers") or data.get("guesses") or []
        kind = "cue test (options only)" if "guesses" in data else "blind test"
        got = [(r["id"], r.get("answer") or r.get("guess"), r) for r in rows if r.get("id") in keys]
        hits = [i for i, a, _r in got if a == keys[i]["correct"]]
        miss = [f"{i[-6:]} said {a}, key {keys[i]['correct']}" for i, a, _r in got if a != keys[i]["correct"]]
        n = len(got)
        print(f"{path}: {kind}: {len(hits)} of {n} = {len(hits) / max(n, 1):.0%}"
              + (" (chance 25%)" if "guesses" in data else " (bar 90%)"))
        if miss:
            print("  differ: " + "; ".join(miss))
        classes = Counter(r.get("class") for _i, _a, r in got if r.get("class"))
        if classes:
            print("  tester's classes: " + ", ".join(f"{k} {v}" for k, v in classes.most_common()))
        flagged = [f"{i[-6:]} {'/'.join(r['flags'])}" for i, _a, r in got if r.get("flags")]
        if flagged:
            print("  flags: " + "; ".join(flagged))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
