#!/usr/bin/env python3
"""
Mechanical checks for the AAIA question bank (data/aaia/originals/d{1..3}.json).

The item-level writing rules (stem and option lengths, tips, explanations) are
checked by scripts/lint_exam_style_v2.py --file; the notes by
scripts/lint_notes.py --outline docs/content/AAIA_BLUEPRINT.md --bank data/aaia/originals.
This script checks what those two cannot see:

  ERROR  a framework_ref part that is not a bullet in data/aaia/originals/_framework_library.md
         (the "Context only" section never counts: ISO/IEC 42001, ISO/IEC 23894, the EU AI Act)
  ERROR  a bad or repeated id, a wrong domain, or a subtopic without an outline code (1A … 3E)
  ERROR  an outline area with no question, or "AAIA®" anywhere (AAIA is not a registered mark)
  ERROR  a domain of 40+ questions where "always pick the longest option" wins outside 15–24%
         (the same rule as scripts/check_longest_option.py for CISA)
  warn   a question that is in no notes subtopic's practice_ids, or in more than one
  warn   the difficulty mix far from about 25/50/25, or one key letter above 35%

Usage:
  python3 scripts/check_aaia_bank.py          # all three domains
  python3 scripts/check_aaia_bank.py 2        # one domain
Exit 1 on any ERROR.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_longest_option import MAX_RATE, MIN_RATE, pick_longest_rate  # noqa: E402

AAIA = ROOT / "data" / "aaia"
AREAS = {1: "ABCDE", 2: "ABCDEFG", 3: "ABCDE"}
CONTEXT_ONLY = re.compile(r"ISO/IEC 42001|ISO/IEC 23894|EU AI Act|2024/1689")


def library():
    text = (AAIA / "originals" / "_framework_library.md").read_text(encoding="utf-8")
    text = text.split("## Context only")[0]
    return {line[2:].strip() for line in text.splitlines() if line.startswith("- ")}


def practice_map(n):
    path = AAIA / "notes" / f"d{n}.json"
    if not path.exists():
        return {}
    seen = {}
    for topic in json.loads(path.read_text(encoding="utf-8")).get("topics", []):
        for sub in topic.get("subtopics", []):
            for qid in sub.get("practice_ids", []):
                seen.setdefault(qid, []).append(sub.get("id"))
    return seen


def check_domain(n, bullets):
    errors, warns = [], []
    path = AAIA / "originals" / f"d{n}.json"
    raw = path.read_text(encoding="utf-8")
    qs = json.loads(raw)["questions"]
    if "AAIA®" in raw:
        errors.append("contains 'AAIA®' (AAIA is an unregistered ISACA trademark)")
    ids, areas = Counter(), Counter()
    for q in qs:
        qid = q.get("id", "?")
        ids[qid] += 1
        if not re.fullmatch(rf"aaia_d{n}_\d{{3}}", qid):
            errors.append(f"{qid}: id must look like aaia_d{n}_NNN")
        if q.get("domain") != n:
            errors.append(f"{qid}: domain is {q.get('domain')}, not {n}")
        m = re.match(rf"{n}([A-G]) ", q.get("subtopic", ""))
        if not m or m.group(1) not in AREAS[n]:
            errors.append(f"{qid}: subtopic must start with an outline code ({n}A …): {q.get('subtopic')!r}")
        else:
            areas[m.group(1)] += 1
        ref = q.get("framework_ref", "")
        if CONTEXT_ONLY.search(ref):
            errors.append(f"{qid}: framework_ref keys a context-only source")
        for part in (p.strip() for p in ref.split(";")):
            if part and part not in bullets:
                errors.append(f"{qid}: framework_ref part not in the library: {part}")
    for qid, count in ids.items():
        if count > 1:
            errors.append(f"{qid}: id used {count} times")
    missing = [a for a in AREAS[n] if not areas[a]]
    if missing:
        errors.append(f"no question yet in area(s) {', '.join(f'{n}{a}' for a in missing)}")

    # Length tell (same rule as CISA once a domain is big enough to measure).
    rate, _ = pick_longest_rate(qs, len)
    if len(qs) >= 40 and not MIN_RATE <= rate <= MAX_RATE:
        errors.append(f"'always pick the longest option' wins {rate:.1%} (must be {MIN_RATE:.0%}–{MAX_RATE:.0%})")
    elif not MIN_RATE <= rate <= MAX_RATE:
        warns.append(f"'always pick the longest option' wins {rate:.1%} (target {MIN_RATE:.0%}–{MAX_RATE:.0%}; "
                     f"enforced from 40 questions)")

    # Notes links: each question under exactly one subtopic.
    pmap = practice_map(n)
    for q in qs:
        where = pmap.get(q["id"], [])
        if not where:
            warns.append(f"{q['id']}: in no notes subtopic's practice_ids")
        elif len(where) > 1:
            warns.append(f"{q['id']}: in several subtopics' practice_ids ({', '.join(where)})")

    mix = Counter(q.get("difficulty") for q in qs)
    total = max(len(qs), 1)
    for level, target in (("foundational", 0.25), ("application", 0.50), ("analysis", 0.25)):
        if abs(mix[level] / total - target) > 0.10:
            warns.append(f"difficulty mix {dict(mix)} is far from about 25/50/25")
            break
    keys = Counter(q.get("correct") for q in qs)
    if len(qs) >= 12 and max(keys.values()) / total > 0.35:
        warns.append(f"key spread is uneven ({dict(sorted(keys.items()))})")

    summary = (f"D{n}: {len(qs)} questions · areas {''.join(f'{a}{areas[a]} ' for a in AREAS[n]).strip()} · "
               f"pick-longest wins {rate:.1%} · keys {dict(sorted(keys.items()))}")
    return summary, errors, warns


def main(argv):
    domains = [int(a) for a in argv if a.isdigit()] or [1, 2, 3]
    bullets = library()
    n_err = 0
    print("AAIA bank (citations, coverage, length tell, notes links):")
    for n in domains:
        summary, errors, warns = check_domain(n, bullets)
        print(f"  {summary}  {'✓' if not errors else '✗'}")
        for e in errors:
            print(f"  ERROR D{n}: {e}")
        for w in warns:
            print(f"  warn  D{n}: {w}")
        n_err += len(errors)
    return 1 if n_err else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
