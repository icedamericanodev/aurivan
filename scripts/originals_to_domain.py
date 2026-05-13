#!/usr/bin/env python3
"""Convert data/originals/d{N}.json → data/domain{N}.json (archive-app-compatible).

The originals bank is the source of truth (1004 hand-authored CISA-style questions).
The archive app expects `data/domain{N}.json` with these top-level keys:
    domain, title, weight, count, questions

This converter:
  1. Reads each `data/originals/d{N}.json`
  2. Strips top-level keys the archive app doesn't use (`_meta`, `domain_name`)
  3. Adds `title` and `count` per the archive app's expected schema
  4. Passes each question through verbatim (the archive app silently ignores
     extra fields: `_provenance`, `key_concept`, `pre_read`, `related_concepts`,
     `scenario_context` — see render-path patches that explicitly handle the
     last one)
  5. Writes `data/domain{N}.json` ready to be served

Idempotent — safe to re-run after originals updates.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DOMAIN_TITLES = {
    1: "Information Systems Auditing Process",
    2: "Governance and Management of IT",
    3: "Information Systems Acquisition, Development and Implementation",
    4: "Information Systems Operations and Business Resilience",
    5: "Protection of Information Assets",
}

DOMAIN_WEIGHTS = {1: "18%", 2: "18%", 3: "12%", 4: "26%", 5: "26%"}


def convert_domain(domain_num: int) -> dict:
    src = ROOT / "data" / "originals" / f"d{domain_num}.json"
    data = json.loads(src.read_text())
    questions = data["questions"]
    return {
        "domain": domain_num,
        "title": DOMAIN_TITLES[domain_num],
        "weight": DOMAIN_WEIGHTS[domain_num],
        "count": len(questions),
        "questions": questions,
    }


def main(argv):
    only = set()
    if len(argv) > 1:
        for a in argv[1:]:
            try:
                only.add(int(a))
            except ValueError:
                print(f"Skipping non-numeric arg: {a}", file=sys.stderr)
    targets = sorted(only) if only else list(range(1, 6))

    results = []
    for d in targets:
        out = convert_domain(d)
        dst = ROOT / "data" / f"domain{d}.json"
        dst.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
        with_scenario = sum(1 for q in out["questions"] if q.get("scenario_context"))
        with_tips = sum(1 for q in out["questions"] if q.get("tips") and len(q["tips"]) >= 3)
        results.append((d, len(out["questions"]), with_tips, with_scenario, dst.stat().st_size // 1024))

    print(f"{'Domain':<8}{'Qs':>6}{'Tips':>8}{'Scenario':>10}{'Size (KB)':>12}")
    for d, q, t, s, kb in results:
        print(f"D{d:<7}{q:>6}{t:>8}{s:>10}{kb:>12}")
    print(f"\nTotal: {sum(r[1] for r in results)} questions across {len(results)} domain(s)")


if __name__ == "__main__":
    main(sys.argv)
