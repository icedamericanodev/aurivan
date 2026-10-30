#!/usr/bin/env python3
"""
Longest-option tell check for the CISA question bank (one line per domain).

Test-wise candidates pick the longest answer when unsure. This measures how
often that guess would win, per domain, so the habit earns nothing here:

  pick-longest win rate = share of questions a guesser gets right by always
  choosing the longest option (by characters, as the eye sees it), breaking
  ties at random (a 2-way tie that includes the key counts as half).

Chance is 25%. The target is about 20%: a little below chance, so "pick the
longest" does not pay, but not so low that "never pick the longest" pays
instead (a reverse tell).

  ERROR  above 24% (drifting toward or past chance) or below 15% (reverse tell)
  warn   by words, the same guess wins under 10% of the time (reverse tell)

Fix a high rate by trimming filler from keys or adding a precise word to a
distractor, without changing meaning; re-run the blind tester on every
changed item. Per-question limits (the key at most 8 characters longer than
the longest distractor) stay in scripts/lint_exam_style_v2.py.

Usage:
  python3 scripts/check_longest_option.py          # all five domains
  python3 scripts/check_longest_option.py 3 5      # some domains
  python3 scripts/check_longest_option.py --list 5 # also list items where the key is longest
Exit 1 on any ERROR.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_RATE = 0.24
MIN_RATE = 0.15
MIN_WORD_RATE = 0.10


def pick_longest_rate(questions, length):
    """Expected share a guesser wins by always picking the longest option."""
    wins = 0.0
    scored = 0
    longest_keys = []
    for q in questions:
        opts, key = q.get("options") or {}, q.get("correct")
        if key not in opts:
            continue
        scored += 1
        lens = {k: length(v) for k, v in opts.items()}
        top = max(lens.values())
        tied = [k for k, n in lens.items() if n == top]
        if key in tied:
            wins += 1 / len(tied)
            if len(tied) == 1:
                longest_keys.append(q["id"])
    return wins / max(scored, 1), longest_keys


def main(argv):
    show = "--list" in argv
    doms = [int(a) for a in argv if a.isdigit()] or [1, 2, 3, 4, 5]
    errors = 0
    print("Longest-option tell (chance 25%, target about 20%):")
    for d in doms:
        qs = json.loads((ROOT / f"data/originals/d{d}.json").read_text(encoding="utf-8"))["questions"]
        rate, keys = pick_longest_rate(qs, len)
        wrate, _ = pick_longest_rate(qs, lambda s: len(s.split()))
        status = "✓"
        if rate > MAX_RATE:
            status = f"ERROR above {MAX_RATE:.0%}: trim keys or lengthen distractors"
            errors += 1
        elif rate < MIN_RATE:
            status = f"ERROR below {MIN_RATE:.0%}: 'never pick the longest' would pay; let some keys be longest"
            errors += 1
        print(f"  D{d}: pick-longest wins {rate:.1%} (key alone longest in {len(keys)} of {len(qs)}) · "
              f"by words {wrate:.1%}  {status}")
        if wrate < MIN_WORD_RATE:
            print(f"  warn D{d}: by words the longest guess wins only {wrate:.1%}; 'avoid the wordiest' would pay")
        if show:
            print("    " + " ".join(keys))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
