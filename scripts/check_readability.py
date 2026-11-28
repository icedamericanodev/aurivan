#!/usr/bin/env python3
"""Readability ratchet for question stems (FB-013, "jumbled words").

A beta tester said some questions read like jumbled words. The cause is
packed stems: facts glued with semicolons and two possessives in one noun
phrase ("a Slovak charity's vendor's model"). These two are what this
check counts; other habits (dropped small words, unclear "it") need the
reviewer agent, not a pattern. The
rewrite is gradual, so this check does not fail on what is already there.
It counts the packed stems in each bank and fails only if a count goes UP
compared with scripts/readability_baseline.json. After a rewrite lowers a
count, run with --update to lock the new, lower number in.

Usage:
    python3 scripts/check_readability.py            # check every bank
    python3 scripts/check_readability.py --update   # lower the baseline to today's counts
    python3 scripts/check_readability.py --list data/aaia/originals/d3.json   # show the packed stems

The rules for writing plain stems are in docs/content/EXAM_STYLE_V2.md; the
reviewer that rewrites them is .claude/agents/question-readability-reviewer.md.

The CIA Part files (data/cia/cia{1,2,3}/originals/d*.json) are counted too,
each with its own baseline line: CIA took the plain-stem rule on 28 Nov 2026
(data/cia/tools/style_cia.py; the stage 3 pass in docs/content/CIA_BANK_PLAN.md,
section 6d, rewrites its packed stems). A retired question is left out of the
count: it stays in its file for its id, but no learner sees it. The generated
Challenge pack (data/cia/ciac) is not counted, because its stems are the Part
files' stems.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lint_exam_style_v2 as lint  # noqa: E402  (the same sentence splitter and possessive pattern)

ROOT = Path(__file__).resolve().parent.parent
BASELINE = ROOT / "scripts" / "readability_baseline.json"
BANKS = ([f"data/originals/d{n}.json" for n in range(1, 6)]
         + [f"data/aaia/originals/d{n}.json" for n in range(1, 4)]
         + [f"data/crisc/originals/d{n}.json" for n in range(1, 5)]
         + sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob("data/cia/cia[123]/originals/d*.json")))


def problems(stem):
    """The reasons a stem counts as packed (empty list if it reads plainly)."""
    found = []
    if ";" in stem:
        found.append("semicolon")
    if lint.STACKED_POSSESSIVE.search(stem):
        found.append("stacked possessive")
    return found


def count(path):
    qs = json.loads((ROOT / path).read_text())
    qs = qs["questions"] if isinstance(qs, dict) else qs
    qs = [q for q in qs if not q.get("retired")]   # only CIA retires in place; no learner sees a retired stem
    packed = [(q["id"], problems(q.get("question", ""))) for q in qs if q.get("style_version") == 2]
    packed = [(i, p) for i, p in packed if p]
    return len(qs), packed


def main(args):
    if "--list" in args:
        for i, p in count(args[args.index("--list") + 1])[1]:
            print(f"{i}: {', '.join(p)}")
        return 0
    base = json.loads(BASELINE.read_text()) if BASELINE.exists() else {}
    failed, new = False, {}
    for path in BANKS:
        if not (ROOT / path).exists():
            continue
        total, packed = count(path)
        n = len(packed)
        new[path] = n
        was = base.get(path)
        if was is not None and n > was:
            failed = True
            print(f"  ✗ {path}: {n} packed stems, up from {was}. Rewrite the new ones plainly "
                  f"(see --list and docs/content/EXAM_STYLE_V2.md)")
        else:
            note = f" (was {was})" if was is not None and n < was else ""
            print(f"  ✓ {path}: {n} of {total} stems packed{note}")
    if "--update" in args:
        # Only ever lower a bank's number: the ratchet never loosens.
        merged = {p: min(n, base.get(p, n)) for p, n in new.items()}
        BASELINE.write_text(json.dumps(merged, indent=1) + "\n")
        print(f"baseline written: {BASELINE.relative_to(ROOT)}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
