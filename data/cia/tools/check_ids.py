#!/usr/bin/env python3
"""Id gate: a question id, once on main, means the same question for good.

A learner's saved progress (answers, picks, slip tags, notes) is keyed by
question id. So an id that has shipped may never be deleted, renumbered or
given to another question. An item that is replaced stays in its file under its
id and number, marked `"retired": true` as its last field
(docs/content/QUESTION_SCHEMA.md, "Rewriting a question"), and the new wording
gets a new id.

No other CIA gate can see a broken id, because each one reads only the files on
disk: after "delete question 1 and renumber the rest" the bank is still well
formed, and build_challenge.py rebuilds from the id map it finds. This gate
compares the working tree with a git base (the files as they are on main):

  Part items  every question id in the base's cia{1,2,3}/originals/d{N}.json is
              still in the working tree, and its stem is still recognizably the
              same question (word-sequence similarity of the two stems at least
              0.5; a light wording fix passes, another question does not)
  id map      ciac/id_map.json is append-only against the base: no row removed,
              no row's source or Challenge id changed, and a status only ever
              goes from active to retired

An id that is not in the base yet (written on this branch) may still change.

Usage:
  python3 data/cia/tools/check_ids.py              # against origin/main, else main
  python3 data/cia/tools/check_ids.py --base REF   # against another commit, branch or tag
  python3 data/cia/tools/check_ids.py --root DIR   # another tree (the harness fixture, its own git repository)
Prints "skipped: no git base" and exits 0 when there is no git, no repository,
neither origin/main nor main, or no CIA question file or id map in the base yet.
Exit 1 on any ERROR, and when --base names something git does not know.
"""
import json
import re
import shutil
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import cia_common as c

MIN_SAME = 0.5
ADVICE = "mark the old item retired instead of deleting or renumbering"


def git(repo, *args):
    p = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    return p.returncode, p.stdout


def stem_words(q):
    return re.findall(r"[a-z0-9]+", str(q.get("question") or "").lower())


def same_question(a, b):
    """Word-sequence similarity of two stems, 0 to 1."""
    return SequenceMatcher(None, stem_words(a), stem_words(b), autojunk=False).ratio()


def skipped(why):
    print(f"check_ids: skipped: no git base ({why})")
    return 0


def check_items(base_items, tree_items, base):
    errs = []
    for qid, old in sorted(base_items.items()):
        new = tree_items.get(qid)
        if new is None:
            errs.append(f"{qid}: was in {base} and is gone: {ADVICE} (saved progress is keyed by id)")
            continue
        sim = same_question(old, new)
        if sim < MIN_SAME:
            errs.append(f"{qid}: id reused for a different question: {ADVICE} "
                        f"(stem similarity to {base} is {sim:.2f}, minimum {MIN_SAME})")
    return errs


def check_map(base_rows, tree_rows, base):
    errs = []
    where = f"{c.CHALLENGE}/id_map.json"
    now = {}
    for e in tree_rows:
        now.setdefault(e.get("id"), e)
    old_ids = {e.get("id") for e in base_rows}
    for old in base_rows:
        cid, src = old.get("id"), old.get("source")
        new = now.get(cid)
        if new is None:
            moved = [e.get("id") for e in tree_rows if e.get("source") == src and e.get("id") not in old_ids]
            if moved:
                errs.append(f"{where}: the row for source {src} changed its id from {cid} to {moved[0]}: "
                            "a Challenge id never moves")
            else:
                errs.append(f"{where}: the row for {cid} (source {src}) was removed: the id map is append-only, "
                            "and a removed number would be given to another question")
            continue
        if new.get("source") != src:
            errs.append(f"{where}: the row for {cid} changed its source from {src} to {new.get('source')}: "
                        "a Challenge id never moves to another question")
        if new.get("status") not in ("active", "retired"):
            errs.append(f"{where}: the row for {cid} has status '{new.get('status')}' (active or retired)")
        elif old.get("status") == "retired" and new.get("status") != "retired":
            errs.append(f"{where}: the row for {cid} went from retired back to {new.get('status')}: "
                        "a retired Challenge id is never used again")
    return errs


def main(argv):
    root, _today, args = c.setup(argv)
    asked = c.pop_opt(args, "--base")
    if not shutil.which("git"):
        return skipped("git is not installed")
    rc, top = git(root, "rev-parse", "--show-toplevel")
    if rc != 0:
        return skipped(f"{root} is not in a git repository")
    top = Path(top.strip()).resolve()
    prefix = root.relative_to(top).as_posix()
    prefix = "" if prefix == "." else prefix + "/"
    base = None
    for ref in ([asked] if asked else ["origin/main", "main"]):
        if git(top, "rev-parse", "--verify", "--quiet", ref + "^{commit}")[0] == 0:
            base = ref
            break
    if base is None:
        if asked:
            print(f"ERROR check_ids: --base {asked} is not a commit git knows")
            return 1
        return skipped("neither origin/main nor main exists here")
    _rc, listing = git(top, "ls-tree", "-r", "--name-only", base, "--", prefix or ".")
    files = listing.splitlines()
    part_files = [f for f in files if re.fullmatch(re.escape(prefix) + r"cia[123]/originals/d\d+\.json", f)]
    map_file = prefix + f"{c.CHALLENGE}/id_map.json"
    if not part_files and map_file not in files:
        return skipped(f"no CIA question file or id map in {base} yet")

    def from_base(path):
        rc, text = git(top, "show", f"{base}:{path}")
        try:
            return json.loads(text) if rc == 0 else None
        except ValueError:
            return None

    errs, base_items = [], {}
    for f in part_files:
        data = from_base(f)
        if not isinstance(data, dict):
            errs.append(f"{f}: cannot be read from {base}, so its ids cannot be checked")
            continue
        for q in data.get("questions", []):
            base_items[q.get("id")] = q
    tree_items = {q.get("id"): q for _pack, _d, q in c.all_items(root)}
    errs += check_items(base_items, tree_items, base)
    base_rows = []
    if map_file in files:
        data = from_base(map_file)
        if not isinstance(data, dict):
            errs.append(f"{map_file}: cannot be read from {base}, so the id map cannot be checked")
        else:
            base_rows = data.get("map", [])
            now_path = root / c.CHALLENGE / "id_map.json"
            errs += check_map(base_rows, c.read_json(now_path).get("map", []) if now_path.exists() else [], base)
    for e in errs:
        print(f"ERROR {e}")
    print(f"check_ids: {len(base_items)} question id(s) and {len(base_rows)} id-map row(s) of {base} checked "
          f"· {len(errs)} error(s)")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
