#!/usr/bin/env python3
"""Flag CRISC definitions whose wording tracks the ISACA Glossary too closely.

CRISC is a paid course, so every glossary definition and notes key term must
match the ISACA Glossary's MEANING in KaiSip's own words. This script compares
our text with ISACA's text for the same term and flags close wording:
  - a run of 6 or more words in the same order, or
  - 30% or more of our word 3-grams appearing in ISACA's definition, or
  - a word-sequence similarity of 0.6 or more.

ISACA's text is NOT stored in the repo. Pass a local reference file you fetched
from https://www.isaca.org/resources/glossary: a JSON object {term: definition}.

Usage:
  python3 data/crisc/tools/check_originality.py --ref /path/to/isaca.json
  python3 data/crisc/tools/check_originality.py --ref ... --json out.json
Exit 1 if anything is flagged.
"""
import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

CRISC = Path(__file__).resolve().parent.parent
RUN, GRAM_SHARE, SIM = 6, 0.30, 0.60


def words(text):
    return re.findall(r"[a-z0-9]+", text.lower())


def key(term):
    """Normalize a term: drop a trailing '(ACRONYM)' and punctuation."""
    term = re.sub(r"\s*\([^)]*\)\s*$", "", term)
    return " ".join(words(term))


def longest_run(a, b):
    m = SequenceMatcher(None, a, b, autojunk=False).find_longest_match(0, len(a), 0, len(b))
    return m.size


def gram_share(a, b, n=3):
    ga = {tuple(a[i:i + n]) for i in range(len(a) - n + 1)}
    gb = {tuple(b[i:i + n]) for i in range(len(b) - n + 1)}
    return len(ga & gb) / len(ga) if ga else 0.0


def ours():
    """Yield (where, term, text) for the glossary and every notes key term."""
    for e in json.loads((CRISC / "glossary.json").read_text()):
        yield f"glossary #{e['id']}", e["term"], e["def"]
    for n in range(1, 5):
        d = json.loads((CRISC / "notes" / f"d{n}.json").read_text())
        for term, text in (d.get("key_terminologies") or {}).items():
            yield f"notes d{n} key_terminologies", term, text
        for t in d["topics"]:
            for s in t["subtopics"]:
                for kt in s.get("key_terms", []):
                    yield f"notes d{n} {s['id']} key_terms", kt["term"], kt["definition"]


def main(argv):
    if "--ref" not in argv:
        print(__doc__)
        return 2
    ref = json.loads(Path(argv[argv.index("--ref") + 1]).read_text())
    isaca = {key(t): d for t, d in ref.items()}
    flagged = []
    checked = 0
    for where, term, text in ours():
        their = isaca.get(key(term))
        if not their:
            continue
        checked += 1
        a, b = words(text), words(their)
        run, share = longest_run(a, b), gram_share(a, b)
        sim = SequenceMatcher(None, a, b, autojunk=False).ratio()
        if run >= RUN or share >= GRAM_SHARE or sim >= SIM:
            flagged.append({"where": where, "term": term, "run": run, "gram_share": round(share, 2),
                            "similarity": round(sim, 2), "ours": text})
    for f in flagged:
        print(f"✗ {f['where']} · {f['term']}: run {f['run']}, 3-gram share {f['gram_share']}, similarity {f['similarity']}")
    print(f"{checked} definitions matched an ISACA term · {len(flagged)} too close")
    if "--json" in argv:
        Path(argv[argv.index("--json") + 1]).write_text(json.dumps(flagged, indent=1, ensure_ascii=False))
    return 1 if flagged else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
