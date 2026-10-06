#!/usr/bin/env python3
"""Exam-style v2 harness — mechanical gate for short, ISACA-style questions.

Every question marked `"style_version": 2` in data/originals/d{N}.json (or in
a batch file passed with --file) must pass these checks before it goes to the
reviewer agents. The rules come from docs/content/EXAM_STYLE_V2.md.

Usage:
    python3 scripts/lint_exam_style_v2.py 1            # check domain 1
    python3 scripts/lint_exam_style_v2.py --file x.json  # check a batch file
    python3 scripts/lint_exam_style_v2.py 1 --progress   # also count v1 items left

A batch file may be a list of questions, a list of {"after": question}
pairs, or a full originals file ({"questions": [...]}).

Exit codes: 0 = clean, 1 = errors (must fix), 2 = warnings only.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PRIORITY_WORDS = ["BEST", "FIRST", "MOST", "PRIMARY", "GREATEST", "LEAST", "MAIN", "STRONGEST"]
ACTOR_WORDS = ["auditor", "audit", "management", "board", "organization", "committee", "firm", "owner", "officer", "manager"]
LONE_ABSOLUTES = ["always", "never", "all", "in full", "inherently", "per se", "only", "guarantees?"]
STOP = set("the a an of to and or for in on by with is are be that this which what who its it as at from not".split())

MAX_STEM = 35
MAX_OPTION = 12
CE_MIN, CE_MAX = 40, 75
MAX_WRONG = 30
MAX_TIP = 35
MAX_SHORT = 25  # key_concept, pre_read


def words(s):
    return len((s or "").split())


def content_words(s):
    return {w for w in re.findall(r"[a-z]+", (s or "").lower()) if w not in STOP and len(w) > 3}


def load(args):
    if "--file" in args:
        data = json.loads(Path(args[args.index("--file") + 1]).read_text())
    else:
        n = int(next(a for a in args if a.isdigit()))
        data = json.loads((ROOT / "data" / "originals" / f"d{n}.json").read_text())
    if isinstance(data, dict):
        data = data["questions"]
    return [q["after"] if "after" in q else q for q in data]


def check(q):
    errs, warns = [], []
    stem = q.get("question", "")
    opts = q.get("options", {})
    c = q.get("correct")

    # 1. Short stem with a capitalised priority word, ending in a question mark
    if q.get("scenario_context"):
        errs.append("scenario_context must be removed (fold the one fact that matters into the stem)")
    if words(stem) > MAX_STEM:
        errs.append(f"stem {words(stem)}w > {MAX_STEM}")
    if not any(re.search(rf"\b{p}\b", stem) for p in PRIORITY_WORDS):
        errs.append("stem has no capitalised priority word (BEST/MOST/FIRST/…)")
    if not stem.rstrip().endswith("?"):
        errs.append("stem must end with '?'")
    # Real items are one or two sentences. Ignore dots inside numbers and abbreviations.
    sentences = re.findall(r"[^.?!]+(?:[.?!](?=\s|$))", re.sub(r"(\d)\.(\d)|\b(e\.g|i\.e|vs|Inc|U\.S)\.", r"\1\2", stem))
    if len(sentences) > 2:
        errs.append(f"stem has {len(sentences)} sentences (max 2)")
    # 2. Named actor (rule: the stem says who acts)
    if not any(a in stem.lower() for a in ACTOR_WORDS):
        warns.append("stem names no actor (IS auditor, audit firm, management…)")

    # 3. Four short options; key never uniquely the longest
    if sorted(opts) != list("ABCD"):
        errs.append("options must be exactly A–D")
        return errs, warns
    ol = {k: words(v) for k, v in opts.items()}
    if max(ol.values()) > MAX_OPTION:
        errs.append(f"option over {MAX_OPTION}w: {ol}")
    if c not in opts:
        errs.append("correct letter missing")
        return errs, warns
    others = [v for k, v in ol.items() if k != c]
    if ol[c] > max(others):
        errs.append(f"key is the longest option {ol}")
    chars = {k: len(v) for k, v in opts.items()}
    longest_other = max(v for k, v in chars.items() if k != c)
    if chars[c] > longest_other + 8:
        errs.append(f"key is the longest option by {chars[c] - longest_other} characters (max 8): lengthen a distractor or trim the key")
    ratio = ol[c] / (sum(others) / 3)
    if not 0.67 <= ratio <= 1.5:
        errs.append(f"key/distractor length ratio {ratio:.2f} (want 0.67–1.50) {ol}")
    # 4. No subset: key must not contain a distractor's idea
    kc = content_words(opts[c])
    for k, v in opts.items():
        cw = content_words(v)
        if k != c and len(cw) >= 2 and cw < kc:
            warns.append(f"key may contain option {k}'s idea (subset giveaway)")
    # 5. No echo: key should not be the ONLY option repeating a stem word
    sw = content_words(stem)
    echo = {k: bool(content_words(v) & sw) for k, v in opts.items()}
    if echo[c] and not any(echo[k] for k in opts if k != c):
        warns.append(f"only the key echoes the stem: {sorted(content_words(opts[c]) & sw)}")
    # 6. Lone absolutes in distractors
    for k, v in opts.items():
        hits = [a for a in LONE_ABSOLUTES if k != c and re.search(rf"\b{a}\b", v.lower())]
        if hits:
            warns.append(f"option {k} uses '{hits[0]}' — check topic knowledge, not that word, eliminates it")

    # 7. Explanations
    ce = q.get("correct_explanation", "")
    if not CE_MIN <= words(ce) <= CE_MAX:
        errs.append(f"correct_explanation {words(ce)}w (want {CE_MIN}–{CE_MAX})")
    we = q.get("wrong_explanations", {})
    if sorted(we) != sorted(set("ABCD") - {c}):
        errs.append("wrong_explanations must cover exactly the three distractors")
    for k, v in we.items():
        if words(v) > MAX_WRONG:
            errs.append(f"wrong_explanation {k} {words(v)}w > {MAX_WRONG}")
        if re.search(r"\b(is|are) true\b", v):
            warns.append(f"wrong_explanation {k} concedes the distractor is 'true'")

    # 8. Tips: Eliminate / Final two / Exam cue, letters consistent with key
    t = q.get("tips", [])
    if len(t) != 3 or not (t[0].startswith("Eliminate:") and t[1].startswith("Final two:") and t[2].startswith("Exam cue:")):
        errs.append("tips must be exactly [Eliminate:…, Final two:…, Exam cue:…]")
    else:
        for i, tip in enumerate(t):
            if words(tip) > MAX_TIP:
                errs.append(f"tip {i + 1} {words(tip)}w > {MAX_TIP}")
        elim = set(re.findall(r"\b([A-D])\b", t[0].split(":", 1)[1]))
        m = re.search(r"Final two: ([A-D]) beats ([A-D])", t[1])
        if not m or m.group(1) != c:
            errs.append("tip 2 must start 'Final two: <key> beats <runner-up>'")
        elif len(elim) != 2 or elim | {m.group(2)} != set("ABCD") - {c}:
            errs.append(f"tip letters don't partition the distractors: eliminate {sorted(elim)}, runner-up {m.group(2)}")

    # 9. Short coaching fields, metadata
    for f in ("key_concept", "pre_read"):
        if not q.get(f):
            errs.append(f"{f} missing")
        elif words(q[f]) > MAX_SHORT:
            errs.append(f"{f} {words(q[f])}w > {MAX_SHORT}")
    if not str(q.get("_provenance", "")).startswith("Authored from concept:"):
        errs.append("_provenance must keep the original 'Authored from concept:' text (append the v2 note)")
    return errs, warns


def main(args):
    qs = load(args)
    v2 = [q for q in qs if q.get("style_version") == 2]
    n_err = n_warn = 0
    keys = Counter()
    for q in v2:
        errs, warns = check(q)
        keys[q.get("correct")] += 1
        for e in errs:
            print(f"ERROR {q.get('id')}: {e}")
        for w in warns:
            print(f"warn  {q.get('id')}: {w}")
        n_err += len(errs)
        n_warn += len(warns)
    if v2:
        # Test-wise candidates pick the longest option; keep that tell near chance (25%).
        longest = [q for q in v2 if q.get("options") and q.get("correct") in q["options"]
                   and len(q["options"][q["correct"]]) > max(len(v) for k, v in q["options"].items() if k != q["correct"])]
        share = len(longest) / len(v2)
        if len(v2) >= 40 and share < 0.15:
            print(f"ERROR key is the longest option (by characters) in only {share:.0%} of items (min 15%): "
                  "'never pick the longest' would become a reverse tell; let some keys be naturally longest")
            n_err += 1
        if len(v2) >= 12 and share > 0.30:
            print(f"ERROR key is the longest option (by characters) in {share:.0%} of items (max 30%): "
                  + ", ".join(q["id"] for q in longest[:12]) + ("…" if len(longest) > 12 else ""))
            n_err += 1
        spread = ", ".join(f"{k}{keys[k]}" for k in "ABCD")
        top = max(keys.values()) / len(v2)
        if len(v2) >= 12 and top > 0.35:
            print(f"warn  key spread is uneven ({spread})")
            n_warn += 1
        print(f"\n{len(v2)} v2 question(s) checked · key spread {spread} · {n_err} error(s) · {n_warn} warning(s)")
    if "--progress" in args:
        print(f"Progress: {len(v2)}/{len(qs)} rewritten to v2 ({len(qs) - len(v2)} left)")
    sys.exit(1 if n_err else 2 if n_warn else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
