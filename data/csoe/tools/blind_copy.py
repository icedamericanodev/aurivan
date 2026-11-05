#!/usr/bin/env python3
"""Write an answer-free copy of CSOE questions for a blind test.

The copy keeps only id, outline code, stem and options, so the tester cannot
see the key, explanations or tips. Compare the tester's picks with the keys
afterwards.

Usage:
  python3 data/csoe/tools/blind_copy.py OUT.json csoe_d2_021 csoe_d2_030 ...   # chosen items
  python3 data/csoe/tools/blind_copy.py OUT.json --domain 4 --from 21       # a batch
"""
import json
import sys
from pathlib import Path

CSOE = Path(__file__).resolve().parent.parent


def main(argv):
    out, rest = argv[0], argv[1:]
    items = []
    if "--domain" in rest:
        d = int(rest[rest.index("--domain") + 1])
        start = int(rest[rest.index("--from") + 1]) if "--from" in rest else 1
        qs = json.loads((CSOE / "originals" / f"d{d}.json").read_text(encoding="utf-8"))["questions"]
        items = [q for q in qs if int(q["id"][-3:]) >= start]
    else:
        wanted = set(rest)
        for path in sorted((CSOE / "originals").glob("d*.json")):
            qs = json.loads(path.read_text(encoding="utf-8"))["questions"]
            items += [q for q in qs if q["id"] in wanted]
    blind = [{"id": q["id"], "subtopic_code": q["subtopic"].split()[0], "question": q["question"],
              "options": q["options"]} for q in items]
    Path(out).write_text(json.dumps(blind, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(blind)} blind item(s) -> {out}")


if __name__ == "__main__":
    main(sys.argv[1:])
