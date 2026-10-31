#!/usr/bin/env python3
"""Structural checks for the ISC2 CC question bank (data/cc/originals/d{1..5}.json).

Runs the gates every CC batch must pass before review, in one place:
  - item shape: field set and order, ID sequence, difficulty/bloom pairing,
    subtopic format "N.x Section. Label" with one section label per code
  - links: every `_provenance` names a notes sub-topic that exists, and every
    `framework_ref` part matches a bullet in _framework_library.md
  - teaching parts: 3 tips (Eliminate / Final two / Exam cue), Eliminate names
    two wrong letters, Final two names the key and the runner-up, and the
    runner-up's wrong explanation starts "Closest choice:"
  - length tells: key spread, "pick the longest" win rate (ties shared,
    target 15-24%, as scripts/check_longest_option.py does for CISA), and the
    key at most 8 characters longer than the longest distractor
  - coverage: notes sub-topics with no question
  - lens: CC notes' rule and "In practice" fields never speak as an auditor
    or credit ISACA (the CC lens is the practitioner's)
  - --similarity: lists item / notes-example pairs that share many words, so
    an author can check no question retells a worked example (plan rule 8)

Usage:
  python3 data/cc/tools/check_cc.py            # all five domains
  python3 data/cc/tools/check_cc.py 2 5        # some domains
  python3 data/cc/tools/check_cc.py --coverage # also list uncovered sub-topics
  python3 data/cc/tools/check_cc.py --list 3   # also list items where the key is longest or tied
  python3 data/cc/tools/check_cc.py 4 --lib staged.md  # accept staged, not yet merged citations
  python3 data/cc/tools/check_cc.py --similarity       # also list item / notes-example overlaps
Exit 1 on any ERROR. Style rules (stem and option length, echoes, absolutes)
stay in scripts/lint_exam_style_v2.py --file data/cc/originals/dN.json.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

CC = Path(__file__).resolve().parent.parent
FIELDS = ["id", "domain", "subtopic", "difficulty", "bloom_level", "question", "options", "correct",
          "key_concept", "pre_read", "correct_explanation", "wrong_explanations", "tips",
          "framework_ref", "related_concepts", "_provenance", "style_version"]
BLOOM = {"foundational": "Foundational", "application": "Application", "analysis": "Analysis"}
MIN_RATE, MAX_RATE = 0.15, 0.24
LENS = re.compile(r"\b(ISACA|IS auditors?|the auditor|auditors? (?:recommend|assess|report))", re.I)
STOP = set("the a an and or of to in on for with by is are was be it its this that as at from their they them what which who when should most best first".split())


def library_bullets(extra=()):
    """Library bullets, plus any staged citation files (--lib FILE) not yet merged."""
    text = (CC / "originals" / "_framework_library.md").read_text(encoding="utf-8")
    for path in extra:
        text += "\n" + Path(path).read_text(encoding="utf-8")
    return {line[2:].strip() for line in text.splitlines() if line.startswith("- ")}


def notes_ids(d):
    notes = json.loads((CC / "notes" / f"d{d}.json").read_text(encoding="utf-8"))
    return [s["id"] for t in notes["topics"] for s in t["subtopics"]]


def words(text):
    return {w for w in re.findall(r"[a-z]+", text.lower()) if len(w) > 2 and w not in STOP}


def similarity(threshold=0.18):
    """Item (stem and options) against every notes worked example, all domains."""
    examples = []
    for d in range(1, 6):
        notes = json.loads((CC / "notes" / f"d{d}.json").read_text(encoding="utf-8"))
        examples += [(s["id"], words(s.get("example", ""))) for t in notes["topics"] for s in t["subtopics"]]
    pairs = []
    for d in range(1, 6):
        for q in json.loads((CC / "originals" / f"d{d}.json").read_text(encoding="utf-8"))["questions"]:
            qw = words(q["question"] + " " + " ".join(q["options"].values()))
            for sid, ew in examples:
                score = len(qw & ew) / max(len(qw | ew), 1)
                if score >= threshold:
                    pairs.append((score, q["id"], sid))
    for score, qid, sid in sorted(pairs, reverse=True):
        print(f"   similar {score:.2f}: {qid} vs notes {sid} example")
    print(f"similarity: {len(pairs)} pair(s) at or above {threshold}; read each and re-angle any retold scenario")


def lens_errors(d):
    """CC notes must not speak as an auditor in their rule and In practice fields."""
    notes = json.loads((CC / "notes" / f"d{d}.json").read_text(encoding="utf-8"))
    out = []
    for t in notes["topics"]:
        for s in t["subtopics"]:
            text = s.get("isaca_rule", "") + " " + json.dumps(s.get("audit_focus", {}), ensure_ascii=False)
            m = LENS.search(text)
            if m:
                out.append(f"notes {s['id']}: auditor wording '{m.group(0)}' in the rule or In practice fields")
    return out


def pick_longest_rate(qs, length):
    """Expected share a guesser wins by always picking the longest option."""
    wins = 0.0
    for q in qs:
        lens = {k: length(v) for k, v in q["options"].items()}
        tied = [k for k, n in lens.items() if n == max(lens.values())]
        if q["correct"] in tied:
            wins += 1 / len(tied)
    return wins / max(len(qs), 1)


def check_item(q, d, n, ids, bullets):
    errs = []
    key = q.get("correct")
    if list(q.keys()) != FIELDS:
        missing = [f for f in FIELDS if f not in q]
        extra = [f for f in q if f not in FIELDS]
        errs.append(f"fields differ from the house order (missing {missing}, extra {extra})"
                    if missing or extra else "fields are out of the house order")
    if q.get("id") != f"cc_d{d}_{n:03d}":
        errs.append(f"id should be cc_d{d}_{n:03d}")
    if q.get("domain") != d:
        errs.append("domain number is wrong")
    if BLOOM.get(q.get("difficulty")) != q.get("bloom_level"):
        errs.append("difficulty and bloom_level do not match")
    m = re.match(rf"^{d}\.\d ([^.]+)\. \S", q.get("subtopic", ""))
    if not m:
        errs.append(f"subtopic '{q.get('subtopic')}' is not 'N.x Section. Label'")
    if sorted(q.get("options", {})) != ["A", "B", "C", "D"] or key not in "ABCD":
        errs.append("options must be A-D with a key among them")
        return errs, None
    wrong = sorted(k for k in "ABCD" if k != key)
    if sorted(q.get("wrong_explanations", {})) != wrong:
        errs.append("wrong_explanations must cover exactly the three distractors")
    tips = q.get("tips", [])
    prefixes = ["Eliminate:", "Final two:", "Exam cue:"]
    if len(tips) != 3 or any(not t.startswith(p) for t, p in zip(tips, prefixes)):
        errs.append("tips must be Eliminate / Final two / Exam cue")
    else:
        elim = set(re.findall(r"\b([A-D])\b", tips[0].split(";")[0]))
        if len(elim) != 2 or key in elim:
            errs.append(f"Eliminate tip should name two wrong letters, names {sorted(elim)}")
        fm = re.match(r"Final two: ([A-D]) beats ([A-D])\b", tips[1])
        if not fm or fm.group(1) != key:
            errs.append("Final two tip should start 'Final two: <key> beats <runner-up>'")
        else:
            runner = fm.group(2)
            closest = [k for k, v in q["wrong_explanations"].items() if v.startswith("Closest choice")]
            if closest != [runner]:
                errs.append(f"'Closest choice:' should open only the runner-up {runner}'s explanation, found {closest}")
            if runner in elim:
                errs.append("the runner-up is also named in the Eliminate tip")
    for part in [p.strip() for p in q.get("framework_ref", "").split(";") if p.strip()]:
        if part not in bullets:
            errs.append(f"framework_ref part not in the library: {part}")
    pm = re.search(r"\bnotes (\d+\.\d+\.\d+)", q.get("_provenance", ""))
    if not pm:
        errs.append("_provenance does not name a notes sub-topic ('notes N.x.y')")
    elif pm.group(1) not in ids:
        errs.append(f"_provenance cites notes {pm.group(1)}, which does not exist")
    lens = {k: len(v) for k, v in q["options"].items()}
    over = lens[key] - max(v for k, v in lens.items() if k != key)
    if over > 8:
        errs.append(f"key is {over} characters longer than the longest distractor (max 8)")
    return errs, (pm.group(1) if pm else None)


def main(argv):
    libs = [argv[i + 1] for i, a in enumerate(argv) if a == "--lib"]
    doms = [int(a) for a in argv if a.isdigit()] or [1, 2, 3, 4, 5]
    show_cov = "--coverage" in argv
    show_list = "--list" in argv
    bullets = library_bullets(libs)
    errors = 0
    for d in doms:
        path = CC / "originals" / f"d{d}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        qs = data["questions"]
        ids = notes_ids(d)
        cited = Counter()
        labels = {}
        for n, q in enumerate(qs, 1):
            errs, nid = check_item(q, d, n, ids, bullets)
            if nid:
                cited[nid] += 1
            m = re.match(r"^(\d\.\d) ([^.]+)\.", q.get("subtopic", ""))
            if m:
                labels.setdefault(m.group(1), Counter())[m.group(2)] += 1
            for e in errs:
                print(f"ERROR {q.get('id')}: {e}")
            errors += len(errs)
        for e in lens_errors(d):
            print(f"ERROR D{d} {e}")
            errors += 1
        for code, c in sorted(labels.items()):
            if len(c) > 1:
                print(f"ERROR D{d}: section {code} uses more than one label: {dict(c)}")
                errors += 1
        spread = Counter(q["correct"] for q in qs)
        rate = pick_longest_rate(qs, len)
        wrate = pick_longest_rate(qs, lambda s: len(s.split()))
        status = "✓"
        if not MIN_RATE <= rate <= MAX_RATE:
            status = f"ERROR pick-longest outside {MIN_RATE:.0%}-{MAX_RATE:.0%}"
            errors += 1
        mix = Counter(q["difficulty"] for q in qs)
        uncovered = [i for i in ids if i not in cited]
        print(f"D{d}: {len(qs)} items · keys " + " ".join(f"{k}{spread[k]}" for k in "ABCD")
              + f" · pick-longest {rate:.1%} (words {wrate:.1%}) {status}"
              + f" · {mix['foundational']}/{mix['application']}/{mix['analysis']} F/Ap/An"
              + f" · notes covered {len(ids) - len(uncovered)}/{len(ids)}")
        if show_list:
            tops = []
            for q in qs:
                lens = {k: len(v) for k, v in q["options"].items()}
                tied = [k for k, v in lens.items() if v == max(lens.values())]
                if q["correct"] in tied:
                    tops.append(q["id"][-3:] + ("" if len(tied) == 1 else "(tie)"))
            print(f"   key longest: {', '.join(tops)}")
        if show_cov and uncovered:
            print(f"   uncovered: {', '.join(uncovered)}")
    if "--similarity" in argv:
        similarity()
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main(sys.argv[1:])
