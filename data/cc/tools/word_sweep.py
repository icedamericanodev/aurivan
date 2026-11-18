#!/usr/bin/env python3
"""Worklist for evening out word tells in the CC bank.

check_cc.py flags whole words (anywhere in an option) whose options win far
more or less often than chance across the bank: a test-wise learner could
learn "pick the option with 'and'" or "never pick the one with 'since'".
This tool helps fix them, one domain at a time.

How a word is measured (same as check_cc.py): in each item where the word is
on 1-3 options, its "chance" is the share of options that carry it, and it
"wins" if the key carries it. Excess = wins - chance, summed over items.
A word that wins too often has a positive excess; one that loses too often,
a negative one. Each fix moves the excess toward zero:
  - word wins too often:  take it off the key (reword), or add it to one or
    more distractors (each extra option adds 0.25 to chance)
  - word loses too often: put it on the key, or take it off the distractors

Usage:
  python3 data/cc/tools/word_sweep.py                  # bank table: p-value, excess per domain
  python3 data/cc/tools/word_sweep.py --plan PLAN.json # write per-domain targets (run once, before edits)
  python3 data/cc/tools/word_sweep.py 3 --plan PLAN.json   # domain 3: progress against its targets + candidate items
Words are those under P_TARGET bank-wide when the plan is made; punctuation shapes
(shown as [,+ing] for ", logging it", [;], [:], [,], [dash]) are planned the same way
against P_TARGET_SHAPE, because swapping "and" for a comma-ing tail or a semicolon on
keys only moves the tell.
"""
import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_cc import _tail, PATTERNS  # noqa: E402

CC = Path(__file__).resolve().parent.parent
P_TARGET = 1e-3   # aim every word at or above this (the gate fails under 1e-4)
P_TARGET_SHAPE = 1e-2  # punctuation shapes, shown as [;] etc. (the gate fails under 1e-3)
SHAPES = {"[,+ing]": PATTERNS["a comma then an -ing word (', logging it')"], "[;]": PATTERNS["a semicolon"],
          "[:]": PATTERNS["a colon"], "[,]": PATTERNS["a comma"], "[dash]": PATTERNS["a dash"]}


def goal_for(w):
    return P_TARGET_SHAPE if w.startswith("[") else P_TARGET
MIN_ITEMS = 10
MARGIN = 1.2      # plan 20% more movement than the bare minimum


def load():
    qs = []
    for d in range(1, 6):
        qs += json.load(open(CC / "originals" / f"d{d}.json"))["questions"]
    return qs


def option_words(q):
    """Words in each option, plus shape tokens such as [;] for punctuation patterns."""
    out = {}
    for k, v in q["options"].items():
        s = {w.lower() for w in re.findall(r"[A-Za-z']+", v)}
        s |= {name for name, rx in SHAPES.items() if re.search(rx, v)}
        out[k] = s
    return out


def stats(qs):
    """Per word: n, wins, chance (bank), and per-domain excess; per item: the words it carries."""
    n, won, chance = Counter(), Counter(), Counter()
    dex = defaultdict(Counter)
    items = defaultdict(list)
    for q in qs:
        d = int(q["id"][4])
        sets = option_words(q)
        for w in set().union(*sets.values()):
            c = sum(w in s for s in sets.values())
            if c == 4:
                continue
            on_key = w in sets[q["correct"]]
            n[w] += 1
            chance[w] += c / 4
            won[w] += on_key
            dex[w][d] += on_key - c / 4
            items[w].append((q["id"], c, on_key))
    return n, won, chance, dex, items


def p_value(n, k, p):
    return _tail(n, k, p, upper=k > n * p)


def shift_needed(n, k, p, goal=P_TARGET):
    """How far the win count must move (chance fixed) to reach the goal p-value."""
    up = k > n * p
    kk = k
    while p_value(n, kk, p) < goal and 0 <= kk <= n:
        kk += -1 if up else 1
    return abs(k - kk)


def make_plan(path):
    qs = load()
    n, won, chance, dex, items = stats(qs)
    plan = {}
    for w in n:
        if n[w] < MIN_ITEMS:
            continue
        p = chance[w] / n[w]
        if p_value(n[w], won[w], p) >= goal_for(w):
            continue
        up = won[w] > n[w] * p
        need = math.ceil(shift_needed(n[w], won[w], p, goal_for(w)) * MARGIN)
        contrib = Counter(int(i[4]) for i, c, k in items[w] if k == up)
        total = sum(contrib.values()) or 1
        plan[w] = {"direction": "wins too often" if up else "loses too often",
                   "start_excess": {str(d): round(dex[w][d], 2) for d in range(1, 6)},
                   "move": {str(d): math.ceil(need * contrib[d] / total) for d in range(1, 6)}}
    json.dump(plan, open(path, "w"), indent=1)
    print(f"plan for {len(plan)} word(s) written to {path}")


def show(domain, plan_path):
    qs = load()
    n, won, chance, dex, items = stats(qs)
    plan = json.load(open(plan_path)) if plan_path else {}
    words = sorted(plan) if plan else sorted(w for w in n if n[w] >= MIN_ITEMS
                                              and p_value(n[w], won[w], chance[w] / n[w]) < goal_for(w))
    print(f"{'word':10} {'bank p':>8}  {'n':>4} {'wins':>5} {'chance':>7}   per-domain excess (wins - chance)")
    for w in words:
        p = chance[w] / n[w] if n[w] else 0
        pv = p_value(n[w], won[w], p) if n[w] else 1
        ok = "ok " if pv >= goal_for(w) else "   "
        per = "  ".join(f"D{d} {dex[w][d]:+6.1f}" for d in range(1, 6))
        print(f"{ok}{w:7} {pv:8.1e}  {n[w]:4} {won[w]:5} {chance[w]:7.1f}   {per}")
    if not domain:
        return
    print(f"\nDomain {domain} targets (move the excess by at least this much; a fix may help several words):")
    for w in words:
        if w not in plan:
            continue
        start = plan[w]["start_excess"][str(domain)]
        mv = plan[w]["move"][str(domain)]
        up = plan[w]["direction"] == "wins too often"
        target = start - mv if up else start + mv
        now = dex[w][domain]
        done = (now <= target) if up else (now >= target)
        print(f"  {'DONE' if done else 'todo'} {w:9} {plan[w]['direction']:15} start {start:+6.1f}  target {target:+6.1f}  now {now:+6.1f}")
    print(f"\nDomain {domain} candidate items (word on the key only = wins; on distractors only = loses):")
    by_item = defaultdict(list)
    for w in words:
        if w not in plan:
            continue
        up = plan[w]["direction"] == "wins too often"
        for i, c, k in items[w]:
            if int(i[4]) == domain and k == up:
                by_item[i].append(f"{w}({'key' if k else 'distractors'},{c}/4)")
    for i in sorted(by_item, key=lambda x: (-len(by_item[x]), x)):
        print(f"  {i}: {', '.join(by_item[i])}")


def main(argv):
    plan = None
    if "--plan" in argv:
        plan = argv[argv.index("--plan") + 1]
        argv = [a for a in argv if a not in ("--plan", plan)]
    dom = int(argv[0]) if argv else None
    if plan and not Path(plan).exists():
        make_plan(plan)
    show(dom, plan)


if __name__ == "__main__":
    main(sys.argv[1:])
