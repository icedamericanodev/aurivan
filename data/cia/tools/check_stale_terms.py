#!/usr/bin/env python3
"""Stale-syllabus gate: no 2019-era or ISACA wording where a CIA learner can read it.

Most older CIA material, and most of what a language model remembers, is the
2019 exam and the 2017 Standards. This gate scans every learner-readable string
in data/cia/ (questions, notes, glossaries, principles, exam guides, final
review weeks, in all four packs and in shared/) for the terms listed in
shared/stale_terms.json. Each term there carries the evidence that it is not
the 2024 vocabulary; a term without evidence stops the gate.

What is read: every string VALUE and every dict KEY (a notes `key_terminologies`
map shows its keys to the learner as terms). Before matching, each string is
normalized (cia_common.norm_text): runs of whitespace, non-breaking spaces
included, become one space, and a hyphen between two words becomes a space, so
"internal audit  activity" and "Three-Lines-of-Defense" are caught. A term
matches in any letter case unless it says `"case_sensitive": true` (for words
that are ordinary English in lower case, such as "is auditor independence").

A place that teaches "old term, new term" on purpose is allowed in three ways,
all visible in a pull request:
  - a JSON key named in "skip_keys" (for example a glossary entry's `formerly`);
  - a glossary entry whose category is "Older term" (the entry IS the old term);
  - an "allow" entry in stale_terms.json: a file (and optionally an id) and the
    classes it may use. The CISA bridge is allowed the "isaca" class this way.

Usage:
  python3 data/cia/tools/check_stale_terms.py            # everything
  python3 data/cia/tools/check_stale_terms.py --root DIR # another tree (the harness fixture)
Exit 1 on any hit.
"""
import re
import sys

import cia_common as c


def load_terms(root):
    cfg = c.read_json(root / "shared" / "stale_terms.json")
    terms = []
    for t in cfg["terms"]:
        if not t.get("evidence") or t.get("class") not in cfg["classes"] or not t.get("say"):
            raise SystemExit(f"ERROR stale_terms.json: term '{t.get('pattern')}' needs a class, a replacement and evidence")
        if not isinstance(t.get("case_sensitive", False), bool):
            raise SystemExit(f"ERROR stale_terms.json: term '{t.get('pattern')}': case_sensitive must be true or false")
        flags = 0 if t.get("case_sensitive") else re.I
        terms.append((t["class"], re.compile(r"(?<![A-Za-z])(?:" + t["pattern"] + ")", flags), t["say"]))
    return cfg, terms


def walk(obj, skip, where="", path=""):
    """Yield (where, path, string) for every value and every dict key; `where` is the
    nearest id, topic_id or term. A key's path ends " (key)"."""
    if isinstance(obj, str):
        yield where, path, obj
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, skip, where, f"{path}[{i}]")
    elif isinstance(obj, dict):
        if obj.get("category") == "Older term":
            return
        here = obj.get("id") or obj.get("topic_id") or obj.get("term") or where
        for k, v in obj.items():
            if k not in skip:
                yield str(here), f"{path} (key)" if path else "(key)", k
                yield from walk(v, skip, str(here), f"{path}.{k}" if path else k)


def main(argv):
    root, _today, _args = c.setup(argv)
    cfg, terms = load_terms(root)
    skip = set(cfg["skip_keys"])
    files = sorted(p for p in root.rglob("*.json")
                   if "tools" not in p.relative_to(root).parts
                   and p.name not in ("stale_terms.json", "currency.json", "outline.json", "id_map.json"))
    hits = scanned = 0
    for p in files:
        rel = p.relative_to(root).as_posix()
        allowed = [(a.get("id"), set(a["classes"])) for a in cfg["allow"] if a["file"] == rel]
        for where, path, s in walk(c.read_json(p), skip):
            scanned += 1
            s = c.norm_text(s)
            for cls, rx, say in terms:
                m = rx.search(s)
                if not m:
                    continue
                if any(cls in classes and (aid is None or aid == where) for aid, classes in allowed):
                    continue
                print(f"ERROR {rel} {where} {path}: '{m.group(0)}' is {cls} wording; say: {say}")
                hits += 1
    print(f"check_stale_terms: {len(files)} file(s), {scanned} string(s), {len(terms)} term(s) · {hits} hit(s)")
    return 1 if hits else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
