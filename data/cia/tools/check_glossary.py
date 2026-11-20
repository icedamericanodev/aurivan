#!/usr/bin/env python3
"""Glossary gate for the one shared CIA glossary (data/cia/shared/glossary.json).

The four packs' glossaries are built from this file (build_packs.py), so a
fault here reaches every pack. Each problem line names the term:
"ERROR id 5 (Advisory services): ...". In one place the gate checks:

  shape     the file is a list of objects; every entry has id, term, acronym,
            def, scopeNotes, category and packs (a missing field is a named
            line here and in build_packs.py, never a KeyError); no field the
            builder does not know (a misspelt `formerly` would otherwise be
            dropped unseen)
  entry     id is a whole number above 0, used once; term is not empty and is
            used once in any letter case; def and category are not empty;
            acronym and scopeNotes are strings
  packs     at least one pack; every key is one of cia1, cia2, cia3, ciac; the
            number is a section of that pack in shared/outline.json (1 to the
            number of its sections). 0 means "a term of the whole exam" and is
            allowed in ciac ONLY: a Part pack's term always sits in a section,
            the one whose notes teach it
  notes     (optional) a list of notes sub-topic codes such as "1A7.2"; each
            is a sub-topic of a notes file of one of the term's own Part packs
  related   (optional) a list of glossary ids; each exists and is not the
            term's own
  formerly  (optional) a list of older names, each a non-empty string and not
            the term's own name. It is the one optional field built into the
            packs. check_stale_terms.py skips the key in every file (an older
            name is an old term by design); an old term in `def` or
            `scopeNotes` is still caught there, in shared/ and in the built files
  one meaning
            a term the notes also define must not be defined two ways. The
            notes define a term in two places: a section file's
            `key_terminologies` map (what the phone Glossary shows) and a
            sub-topic's `key_terms` list. Where the glossary term is one of
            those (same name in any letter case, in any Part pack's
            notes/d*.json), its `def` must equal one of the notes' definitions
            of it once runs of whitespace are made one space. A definition that
            differs on purpose carries `"def_differs_from_notes": "<the
            reason>"`, a field only this gate reads. The gate fails on a
            difference without that field, and on the field where the texts
            are equal, where the notes do not define the term at all, or where
            the reason is empty: the mark can never outlive its reason

Whether a definition is in KaiSip's own words is check_originality.py's;
old-syllabus wording is check_stale_terms.py's; the built pack files are
build_packs.py --check's.

Usage:
  python3 data/cia/tools/check_glossary.py            # data/cia
  python3 data/cia/tools/check_glossary.py --root DIR # another tree (the harness fixture)
Exit 1 on any ERROR. No shared glossary yet is not an error.
"""
import re
import sys

import cia_common as c

MARK = "def_differs_from_notes"
KNOWN = c.GLOSSARY_KEYS + c.GLOSSARY_CARRIED + c.GLOSSARY_SOURCE_ONLY
WHOLE_EXAM = 0                 # a `packs` number allowed in the Challenge pack only


def flat(s):
    """A text with every run of whitespace made one space: how two definitions are compared."""
    return re.sub(r"\s+", " ", s).strip()


def name_key(term):
    """A term's name for matching: whitespace flattened, any letter case."""
    return flat(term).casefold()


def whole(v):
    """True for a whole number (JSON true and false are not numbers here)."""
    return isinstance(v, int) and not isinstance(v, bool)


def notes_index(root):
    """({Part pack: its notes sub-topic ids}, {term name: [(where, definition)]}) from every
    Part pack's section notes (notes/d<N>.json). A term is defined by a file's
    `key_terminologies` map and by a sub-topic's `key_terms` list."""
    ids, defs = {}, {}
    for pack in c.PARTS:
        ids[pack] = set()
        for p in sorted((root / pack / "notes").glob("d*.json")):
            if not re.fullmatch(r"d\d+\.json", p.name):
                continue
            data = c.read_json(p)
            rel = p.relative_to(root).as_posix()
            for term, text in (data.get("key_terminologies") or {}).items():
                if isinstance(text, str):
                    defs.setdefault(name_key(term), []).append((f"{rel} key_terminologies", text))
            for t in data.get("topics", []):
                for s in t.get("subtopics", []):
                    ids[pack].add(s.get("id"))
                    for kt in s.get("key_terms", []):
                        if isinstance(kt.get("term"), str) and isinstance(kt.get("definition"), str):
                            defs.setdefault(name_key(kt["term"]), []).append((f"notes {s.get('id')} key_terms", kt["definition"]))
    return ids, defs


def check_entry(e, sections, note_ids, note_defs, all_ids):
    """The problems of one entry that has every required field."""
    errs = []
    unknown = [k for k in e if k not in KNOWN]
    if unknown:
        errs.append(f"unknown field {', '.join(unknown)} (the fields are {', '.join(KNOWN)})")
    if not (whole(e["id"]) and e["id"] > 0):
        errs.append(f"id must be a whole number above 0, got {e['id']!r}")
    for f in ("term", "def", "category"):
        if not (isinstance(e[f], str) and e[f].strip()):
            errs.append(f"{f} is empty")
    for f in ("acronym", "scopeNotes"):
        if not isinstance(e[f], str):
            errs.append(f"{f} must be a string (empty when there is none)")
    # packs
    if not e["packs"]:
        errs.append("packs is empty: a term belongs to at least one pack")
    for pack, sec in e["packs"].items():
        if pack not in sections:
            errs.append(f"packs names '{pack}', which is not a pack ({', '.join(c.PACKS)})")
        elif not (whole(sec) and (1 <= sec <= sections[pack] or (sec == WHOLE_EXAM and pack == c.CHALLENGE))):
            errs.append(f"section {sec!r} is not a section of {pack} (1 to {sections[pack]}"
                        + (f", or {WHOLE_EXAM} for a term of the whole exam)" if pack == c.CHALLENGE
                           else f"; {WHOLE_EXAM}, the whole exam, is for {c.CHALLENGE} only)"))
    # notes
    parts = [p for p in c.PARTS if p in e["packs"]]
    codes = e.get("notes", [])
    if not (isinstance(codes, list) and all(isinstance(x, str) for x in codes)):
        errs.append("notes must be a list of notes sub-topic codes such as \"1A7.2\"")
    else:
        valid = set().union(*(note_ids[p] for p in parts)) if parts else set()
        for code in codes:
            if code not in valid:
                errs.append(f"notes code {code} is in no notes file of " + (" or ".join(parts) if parts else
                            "a Part pack (the term is in no Part pack)"))
    # related
    rel = e.get("related", [])
    if not (isinstance(rel, list) and all(whole(x) for x in rel)):
        errs.append("related must be a list of glossary ids")
    else:
        for r in rel:
            if r == e["id"]:
                errs.append("related names the term itself")
            elif r not in all_ids:
                errs.append(f"related {r} is not a glossary id")
    # formerly
    if "formerly" in e:
        old = e["formerly"]
        if not isinstance(old, list):
            errs.append("formerly must be a list of older names")
        else:
            for name in old:
                if not (isinstance(name, str) and name.strip()):
                    errs.append("formerly entry is empty: each older name is a non-empty string")
                elif isinstance(e["term"], str) and name_key(name) == name_key(e["term"]):
                    errs.append(f"formerly repeats the term's own name '{name}'")
    # one meaning
    theirs = note_defs.get(name_key(e["term"]), []) if isinstance(e["term"], str) else []
    same = isinstance(e["def"], str) and any(flat(text) == flat(e["def"]) for _w, text in theirs)
    marked = MARK in e
    if marked and not (isinstance(e[MARK], str) and e[MARK].strip()):
        errs.append(f"{MARK} must be the reason, as a non-empty string")
    if marked and not theirs:
        errs.append(f"{MARK} is set, but the notes do not define this term: remove the mark")
    elif marked and same:
        errs.append(f"{MARK} is set, but the def is the notes' wording ({theirs[0][0]}): remove the mark")
    elif theirs and not same and not marked:
        errs.append(f"def differs from the notes' definition of this term ({theirs[0][0]}"
                    + (f" and {len(theirs) - 1} more" if len(theirs) > 1 else "")
                    + f"): reuse the notes' wording, or add \"{MARK}\": \"<the reason>\"")
    state = "differs" if marked else "same" if same else None
    return errs, state


def main(argv):
    root, _today, _args = c.setup(argv)
    path = root / "shared" / "glossary.json"
    if not path.exists():
        print("check_glossary: no shared glossary yet")
        return 0
    src = c.read_json(path)
    errs = list(c.glossary_shape(src))
    entries = [(i, e) for i, e in enumerate(src if isinstance(src, list) else [])
               if isinstance(e, dict) and all(k in e for k in c.GLOSSARY_KEYS) and isinstance(e["packs"], dict)]
    sections = {e["id"]: len(e["sections"]) for e in c.load_outline(root)["exams"]}
    note_ids, note_defs = notes_index(root)
    all_ids = {e["id"] for _i, e in entries if whole(e["id"])}
    seen_id, seen_term, counts = {}, {}, {"same": 0, "differs": 0, "formerly": 0}
    for i, e in entries:
        name = c.glossary_name(e, i)
        problems, state = check_entry(e, sections, note_ids, note_defs, all_ids)
        if whole(e["id"]):
            if e["id"] in seen_id:
                problems.append(f"id used twice (also {seen_id[e['id']]})")
            seen_id.setdefault(e["id"], name)
        if isinstance(e["term"], str) and e["term"].strip():
            if name_key(e["term"]) in seen_term:
                problems.append(f"term used twice, in any letter case (also {seen_term[name_key(e['term'])]})")
            seen_term.setdefault(name_key(e["term"]), name)
        if state:
            counts[state] += 1
        counts["formerly"] += 1 if e.get("formerly") else 0
        errs += [f"{name}: {p}" for p in problems]
    for e in errs:
        print(f"ERROR {e}")
    total = len(src) if isinstance(src, list) else 0
    print(f"check_glossary: {total} term(s), {counts['same']} defined as in the notes, {counts['differs']} marked as "
          f"differing from them, {counts['formerly']} with older names · {len(errs)} error(s)")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
