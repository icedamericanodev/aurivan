#!/usr/bin/env python3
"""Make the key letters for a new CC batch, so authors never rotate them by hand.

Hand rotation (A, C, B, D, A, C, ...) leaves a pattern a learner can exploit
when options are not shuffled. This draws a random sequence that keeps each
domain balanced and keeps the stored key order looking random once the new
items are appended: check_cc.py's key-order gate (repeat rate at lags 1-4
within 15-35%, no run longer than 3).

Usage:
  python3 data/cc/tools/key_sequence.py DOMAIN COUNT [--seed N]
Prints one letter per new item, in id order, e.g. "cc_d4_071 C".
"""
import json
import random
import sys
from pathlib import Path

CC = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_cc import LAG_MAX, LAG_MIN, MAX_RUN, key_order  # noqa: E402


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    d, count = int(argv[0]), int(argv[1])
    seed = int(argv[argv.index("--seed") + 1]) if "--seed" in argv else None
    rnd = random.Random(seed)
    qs = json.loads((CC / "originals" / f"d{d}.json").read_text(encoding="utf-8"))["questions"]
    have = [q["correct"] for q in qs]
    total = len(have) + count
    for _ in range(20000):
        # Fill each letter up to an even share of the final total, then shuffle.
        need = {L: max(0, round(total / 4) - have.count(L)) for L in "ABCD"}
        pool = [L for L, n in need.items() for _ in range(n)]
        while len(pool) < count:
            pool.append(rnd.choice("ABCD"))
        pool = pool[:count]
        rnd.shuffle(pool)
        lags, run = key_order(have + pool)
        if all(LAG_MIN <= r <= LAG_MAX for r in lags) and run <= MAX_RUN:
            for i, L in enumerate(pool, len(have) + 1):
                print(f"cc_d{d}_{i:03d} {L}")
            return 0
    print("no sequence found; try another --seed")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
