#!/usr/bin/env python3
"""Draw (or check) KaiSip's two held-out CSOE mock forms.

The real CSOE exam is 35 questions in 90 minutes, pass mark 70%, one pass
forward with no going back (docs/content/CSOE_BLUEPRINT.md). KaiSip keeps two
fixed 35-item forms out of practice so a learner can rehearse on questions
they have not seen (docs/content/CSOE_BANK_PLAN.md section 4).

Rules the draw follows (all checked again by --check):
- Per form: D1 5, D2 6, D3 6, D4 9, D5 9 items (the blueprint weights
  14/16/16/27/27 applied to 35).
- No two items of a linked pair (docs/content/CSOE_LINKED_PAIRS.md) anywhere
  in the held-out set, so neither form, nor one form after the other, gives
  away a key.
- Never draw a hub named in that file, or an item a principle card links to
  (data/csoe/mindset/principles.json practice_ids): those stay in practice.
- Each form within 2 items of the 30/55/15 difficulty mix per level, key
  letters within 3 of each other, and no outline code used twice in a form
  where the domain allows it.
- Items are stored in a fixed interleaved order, so no domain runs as a block.

Not checked by the tool (do it by review, see docs/content/CSOE_BANK_PLAN.md):
a practice item whose explanation states a held-out key. Record every such
leak as a linked pair, and a held-out item may not be linked to a hub.

The draw is seeded and repeatable. Re-drawing changes which questions are
held out, so draw once and keep the file; run --check after every batch.

Usage:
  python3 data/csoe/tools/draw_mock_forms.py --check     # check the saved forms
  python3 data/csoe/tools/draw_mock_forms.py --draw      # draw and write data/csoe/exam/mock_forms.json
"""
import json
import random
import re
import sys
from collections import Counter
from pathlib import Path

CSOE = Path(__file__).resolve().parent.parent
REPO = CSOE.parent.parent
OUT = CSOE / "exam" / "mock_forms.json"
PAIRS = REPO / "docs" / "content" / "CSOE_LINKED_PAIRS.md"
PRINCIPLES = CSOE / "mindset" / "principles.json"
PER_FORM = {1: 5, 2: 6, 3: 6, 4: 9, 5: 9}
MIX = {"foundational": 10, "application": 19, "analysis": 6}  # target per 35
SEED = 20261031


def load_items():
    items = {}
    for d in PER_FORM:
        for q in json.loads((CSOE / "originals" / f"d{d}.json").read_text(encoding="utf-8"))["questions"]:
            items[q["id"]] = q
    return items


def load_links():
    text = PAIRS.read_text(encoding="utf-8")
    pairs = re.findall(r"^\| (csoe_d\d_\d{3}) \| (csoe_d\d_\d{3}) \|", text, re.M)
    hubs_line = re.search(r"Keep the hubs (.+?) in practice", text)
    hubs = set(re.findall(r"csoe_d\d_\d{3}", hubs_line.group(1))) if hubs_line else set()
    links = {}
    for a, b in pairs:
        links.setdefault(a, set()).add(b)
        links.setdefault(b, set()).add(a)
    return links, hubs


def principle_ids():
    if not PRINCIPLES.exists():
        return set()
    return set(re.findall(r"csoe_d\d_\d{3}", PRINCIPLES.read_text(encoding="utf-8")))


def code(q):
    return q["subtopic"][:3]


def score(forms, items):
    """Lower is better: distance from the mix, key skew and repeated codes."""
    s = 0
    for f in forms:
        diff = Counter(items[i]["difficulty"] for i in f)
        s += sum(abs(diff.get(k, 0) - v) for k, v in MIX.items()) * 3
        keys = Counter(items[i]["correct"] for i in f)
        s += (max(keys.values()) - min(keys.get(k, 0) for k in "ABCD")) * 3
        codes = Counter(code(items[i]) for i in f)
        s += sum(n - 1 for n in codes.values() if n > 1) * 2
    return s


def draw(items, links, banned, tries=30000):
    rng = random.Random(SEED)
    pool = {d: [i for i, q in items.items() if q["domain"] == d and i not in banned] for d in PER_FORM}
    best, best_s = None, None
    for _ in range(tries):
        taken, forms, ok = set(), [[], []], True
        for d in PER_FORM:
            cand = pool[d][:]
            rng.shuffle(cand)
            # prefer items with few links, so practice leaks stay rare (with jitter, so draws differ)
            jitter = {i: rng.random() * 3 for i in cand}
            cand.sort(key=lambda i: len(links.get(i, ())) + jitter[i])
            for f in forms:
                need = PER_FORM[d]
                # first pass takes one item per outline code; the second fills any gap
                for fresh_only in (True, False):
                    used = {code(items[i]) for i in f}
                    for i in cand:
                        if need == 0:
                            break
                        if i in taken or links.get(i, set()) & taken:
                            continue
                        if fresh_only and code(items[i]) in used:
                            continue
                        f.append(i)
                        taken.add(i)
                        used.add(code(items[i]))
                        need -= 1
                if need:
                    ok = False
                # light shuffle between forms so form 1 does not take every low-link item
                rng.shuffle(cand)
        if not ok:
            continue
        s = score(forms, items)
        if best_s is None or s < best_s:
            best, best_s = [sorted(f) for f in forms], s
    return best, best_s


def check(data, items, links, banned):
    errors = []
    held = [i for f in data["forms"] for i in f["items"]]
    if len(held) != len(set(held)):
        errors.append("an item appears twice in the held-out set")
    for i in held:
        if i not in items:
            errors.append(f"{i}: not in the bank")
        elif i in banned:
            errors.append(f"{i}: is a hub or a principle practice item; keep it in practice")
        for j in links.get(i, ()):
            if j in held and i < j:
                errors.append(f"{i} and {j} are a linked pair; both are held out")
    for f in data["forms"]:
        dom = Counter(items[i]["domain"] for i in f["items"] if i in items)
        if dict(dom) != PER_FORM:
            errors.append(f"{f['id']}: domain counts {dict(sorted(dom.items()))}, want {PER_FORM}")
        diff = Counter(items[i]["difficulty"] for i in f["items"] if i in items)
        off = {k: diff.get(k, 0) - v for k, v in MIX.items() if abs(diff.get(k, 0) - v) > 2}
        if off:
            errors.append(f"{f['id']}: difficulty mix more than 2 off the 30/55/15 target: {off}")
        keys = Counter(items[i]["correct"] for i in f["items"] if i in items)
        if max(keys.values()) - min(keys.get(k, 0) for k in "ABCD") > 3:
            errors.append(f"{f['id']}: key letters too uneven: {dict(sorted(keys.items()))}")
    if set(data.get("held_out", [])) != set(held):
        errors.append("held_out does not match the union of the forms")
    return errors


def report(data, items):
    for f in data["forms"]:
        diff = Counter(items[i]["difficulty"] for i in f["items"])
        keys = Counter(items[i]["correct"] for i in f["items"])
        codes = Counter(code(items[i]) for i in f["items"])
        inc = sum(1 for i in f["items"] if re.search(r"(:|…|\.\.\.)\s*$", items[i]["question"]))
        print(f"{f['id']}: {len(f['items'])} items · difficulty F{diff['foundational']}/Ap{diff['application']}/An{diff['analysis']}"
              f" · keys {''.join(f'{k}{keys[k]} ' for k in 'ABCD').strip()} · {len(codes)} outline codes"
              f" · {inc} incomplete statements")


def main(argv):
    items = load_items()
    links, hubs = load_links()
    banned = hubs | principle_ids()
    if "--draw" in argv:
        forms, s = draw(items, links, banned)
        if not forms:
            sys.exit("no draw met the rules; the bank is too small or too linked")
        data = {
            "_meta": {
                "comment": "Two fixed, held-out CSOE mock forms. Never serve these items in practice, notes or principle cards. Drawn by data/csoe/tools/draw_mock_forms.py; rules in its docstring and docs/content/CSOE_BANK_PLAN.md section 4.",
                "drawn": "2026-10-31",
                "seed": SEED,
                "bank_size_at_draw": len(items),
            },
            "forms": [
                {"id": f"csoe_mock_{n}", "title": f"CSOE mock exam {n}", "questions": 35, "minutes": 90,
                 "pass_percent": 70, "forward_only": True, "items": f}
                for n, f in enumerate(forms, 1)
            ],
            "held_out": sorted(i for f in forms for i in f),
        }
        OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {OUT.relative_to(REPO)} (score {s})")
    data = json.loads(OUT.read_text(encoding="utf-8"))
    report(data, items)
    errors = check(data, items, links, banned)
    for e in errors:
        print("ERROR", e)
    print(f"{len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
