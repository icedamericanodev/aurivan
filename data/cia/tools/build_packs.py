#!/usr/bin/env python3
"""Build each CIA pack's glossary and principles from the one shared source.

The four CIA exams share one vocabulary and one way of thinking, so the
glossary and the "How the CIA exam thinks" principles are written once, in
data/cia/shared/, and built into each pack:

  shared/glossary.json    a list of {id, term, acronym, def, scopeNotes, category,
                          packs: {"cia1": 1, "ciac": 1}} where the number is the
                          section (domain) the term belongs to in that pack
      ->  <pack>/glossary.json   the CRISC shape {id, term, acronym, def, scopeNotes, domain, category}

  shared/principles.json  the principles schema (docs/content/PRINCIPLES_SCHEMA.md),
                          except that each principle has `packs` (the packs it
                          serves) and its `domains`, `subtopics` and
                          `practice_ids` are objects keyed by pack
      ->  <pack>/mindset/principles.json   the plain schema for that pack

NEVER EDIT the built files by hand. Edit shared/ and run this script.

A built file that no shared source produces any more (the shared file was
removed, or a pack was dropped from every term or principle) is an orphan: it
would stay in the pack, out of date, and pass unseen. --check fails on it and a
normal build removes it. Only <pack>/glossary.json and
<pack>/mindset/principles.json in the four packs are ever removed.

Usage:
  python3 data/cia/tools/build_packs.py          # rebuild
  python3 data/cia/tools/build_packs.py --check  # fail if a built file differs from a rebuild
"""
import sys

import cia_common as c

NAMES = {"cia1": "CIA Part 1", "cia2": "CIA Part 2", "cia3": "CIA Part 3", "ciac": "CIA Challenge Exam"}
BUILT = ("glossary.json", "mindset/principles.json")   # the only files this script writes or removes, per pack


def orphans(root, targets):
    """Built files on disk that this build does not produce."""
    return [root / pack / name for pack in c.PACKS for name in BUILT
            if (root / pack / name).is_file() and root / pack / name not in targets]


def build(root):
    targets, problems = {}, []
    gpath, ppath = root / "shared" / "glossary.json", root / "shared" / "principles.json"
    if gpath.exists():
        src = c.read_json(gpath)
        ids = [e.get("id") for e in src]
        if len(set(ids)) != len(ids):
            problems.append("shared/glossary.json: duplicate id")
        for pack in c.PACKS:
            rows = [{"id": e["id"], "term": e["term"], "acronym": e.get("acronym", ""), "def": e["def"],
                     "scopeNotes": e.get("scopeNotes", ""), "domain": e["packs"][pack], "category": e["category"]}
                    for e in src if pack in e.get("packs", {})]
            if rows:
                targets[root / pack / "glossary.json"] = c.dump_json(rows)
    if ppath.exists():
        src = c.read_json(ppath)
        for pack in c.PACKS:
            rows = []
            for p in src["principles"]:
                if pack not in p.get("packs", []):
                    continue
                q = {k: v for k, v in p.items() if k != "packs"}
                for k in ("domains", "subtopics", "practice_ids"):
                    q[k] = (p.get(k) or {}).get(pack, [])
                rows.append(q)
            if not rows:
                continue
            have = {p["id"] for p in rows}
            for slip, pid in (src.get("slip_map") or {}).items():
                if pid is not None and pid not in have:
                    problems.append(f"shared/principles.json: slip_map '{slip}' points at '{pid}', which does not serve {pack}")
            out = {k: v for k, v in src.items() if k != "principles"}
            out["title"] = f"KaiSip {NAMES[pack]} exam mindset principles"
            out["principles"] = rows
            targets[root / pack / "mindset" / "principles.json"] = c.dump_json(out)
    return targets, problems


def main(argv):
    root, _today, args = c.setup(argv)
    targets, problems = build(root)
    for p in problems:
        print(f"ERROR {p}")
    if "--check" in args:
        stale = [p for p, text in targets.items() if (p.read_text(encoding="utf-8") if p.exists() else None) != text]
        for p in stale:
            print(f"ERROR {p.relative_to(root)} is out of date or hand-edited: run python3 data/cia/tools/build_packs.py")
        left = orphans(root, targets)
        for p in left:
            print(f"ERROR {p.relative_to(root)} is an orphan: no shared source produces it any more "
                  "(run python3 data/cia/tools/build_packs.py to remove it)")
        print(f"build_packs --check: {len(targets)} built file(s), {len(stale)} out of date, {len(left)} orphan(s), "
              f"{len(problems)} problem(s)")
        return 1 if stale or left or problems else 0
    if problems:
        return 1
    for p, text in targets.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, encoding="utf-8")
    left = orphans(root, targets)
    for p in left:
        p.unlink()
        print(f"build_packs: removed {p.relative_to(root)} (no shared source produces it any more)")
    print(f"build_packs: {len(targets)} file(s) built" if targets or left else "build_packs: no shared glossary or principles yet")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
