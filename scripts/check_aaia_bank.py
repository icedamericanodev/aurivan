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

Glossary (data/aaia/glossary.json, checked only once it exists): a JSON list of
{id, term, acronym, def, scopeNotes, domain, category} entries, the same shape as
the glossData entries in index.html.
  ERROR  a missing or extra field, or a field of the wrong type (id int, term str,
         acronym str or null, def str, scopeNotes str, domain int, category str)
  ERROR  a repeated id or term, a domain outside 0-3 (0 = cross-domain), a category
         not in the web glossary's set, a def outside 12-60 words, a bank size, "AAIA®"
  warn   a term also defined in the AAIA notes (key_terminologies or key_terms)
         whose two definitions share few words: read the pair and align them

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
GLOSSARY = AAIA / "glossary.json"
GLOSS_FIELDS = ["id", "term", "acronym", "def", "scopeNotes", "domain", "category"]
GLOSS_CATEGORIES = {"Concept", "Control", "Process", "Technology"}  # the web glossData set
DEF_MIN, DEF_MAX = 12, 60
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


# ---- Glossary ---------------------------------------------------------------
STOP = set("""a an the and or of to in on for by with from as at is are be been being it its this that
these those which who whom what when where how than then so such any each every other into onto about
over under not no can may might must should would will shall do does did has have had their them they
one two also more most less least only own same very just used uses using use often usually""".split())


def norm_term(term):
    """'Machine learning (ML)' -> 'machine learning'."""
    return re.sub(r"\s+", " ", re.sub(r"\([^)]*\)", "", str(term))).strip().lower()


def content_words(text):
    out = set()
    for w in re.findall(r"[a-z][a-z-]+", str(text).lower()):
        if w in STOP or len(w) < 4:
            continue
        for suf in ("ing", "ed", "es", "s"):
            if w.endswith(suf) and len(w) - len(suf) >= 4:
                w = w[: -len(suf)]
                break
        out.add(w)
    return out


def notes_terms():
    """{normalized term: [(where, term, definition)]} from the AAIA notes."""
    found = {}
    for n in (1, 2, 3):
        path = AAIA / "notes" / f"d{n}.json"
        if not path.exists():
            continue
        doc = json.loads(path.read_text(encoding="utf-8"))
        kt = doc.get("key_terminologies") or {}
        for term, definition in kt.items() if isinstance(kt, dict) else []:
            if not term.startswith("_") and isinstance(definition, str):
                found.setdefault(norm_term(term), []).append((f"notes d{n}", term, definition))
        for topic in doc.get("topics", []):
            for sub in topic.get("subtopics", []):
                for kt in sub.get("key_terms", []) or []:
                    if isinstance(kt, dict) and kt.get("term") and isinstance(kt.get("definition"), str):
                        found.setdefault(norm_term(kt["term"]), []).append(
                            (f"notes {sub.get('id')}", kt["term"], kt["definition"]))
    return found


def check_glossary():
    """Returns (summary, errors, warns), or None when the glossary is not written yet."""
    if not GLOSSARY.exists():
        return None
    errors, warns = [], []
    raw = GLOSSARY.read_text(encoding="utf-8")
    try:
        entries = json.loads(raw)
    except ValueError as e:
        return "glossary: not valid JSON", [f"{e}"], []
    if not isinstance(entries, list) or not entries:
        return "glossary: empty", ["must be a non-empty JSON list of entries"], []
    if "AAIA®" in raw or "AAIA®" in json.dumps(entries, ensure_ascii=False):
        errors.append("contains 'AAIA®' (AAIA is an unregistered ISACA trademark)")
    sys.path.insert(0, str(ROOT / "scripts"))
    from lint_principles import BANK_SIZE  # noqa: E402  (the shared bank-size patterns)
    ids, terms = Counter(), Counter()
    per_domain = Counter()
    for i, e in enumerate(entries):
        if not isinstance(e, dict):
            errors.append(f"entry {i}: must be an object")
            continue
        where = f"glossary id {e.get('id', '?')} ({e.get('term', '?')})"
        keys = list(e.keys())
        missing = [k for k in GLOSS_FIELDS if k not in e]
        extra = [k for k in keys if k not in GLOSS_FIELDS]
        if missing:
            errors.append(f"{where}: missing {missing}")
        if extra:
            errors.append(f"{where}: unknown fields {extra}")
        if not (isinstance(e.get("id"), int) and not isinstance(e.get("id"), bool) and e["id"] > 0):
            errors.append(f"{where}: id must be a positive integer")
        else:
            ids[e["id"]] += 1
        term = e.get("term")
        if not (isinstance(term, str) and term.strip()):
            errors.append(f"{where}: term must be a non-empty string")
        else:
            terms[term.strip().lower()] += 1
        ac = e.get("acronym")
        if not (ac is None or (isinstance(ac, str) and ac.strip())):
            errors.append(f"{where}: acronym must be a non-empty string or null")
        d = e.get("def")
        if not (isinstance(d, str) and d.strip()):
            errors.append(f"{where}: def must be a non-empty string")
        elif not DEF_MIN <= len(d.split()) <= DEF_MAX:
            errors.append(f"{where}: def is {len(d.split())} words ({DEF_MIN}-{DEF_MAX})")
        if not isinstance(e.get("scopeNotes"), str):
            errors.append(f"{where}: scopeNotes must be a string (empty when there is none)")
        dom = e.get("domain")
        if not (isinstance(dom, int) and not isinstance(dom, bool) and 0 <= dom <= 3):
            errors.append(f"{where}: domain must be an integer 0-3 (0 = cross-domain), got {dom!r}")
        else:
            per_domain[dom] += 1
        if e.get("category") not in GLOSS_CATEGORIES:
            errors.append(f"{where}: category {e.get('category')!r} is not one of {sorted(GLOSS_CATEGORIES)}")
        for field in ("term", "def", "scopeNotes"):
            text = e.get(field)
            for rx in BANK_SIZE:
                if isinstance(text, str) and rx.search(text):
                    errors.append(f"{where}: {field} states a bank size or question count: '{rx.search(text).group(0)}'")
    for k, c in ids.items():
        if c > 1:
            errors.append(f"glossary id {k} used {c} times")
    for k, c in terms.items():
        if c > 1:
            errors.append(f"glossary term '{k}' used {c} times")

    # Same term in the notes with a clearly different meaning: a human reads the pair.
    nt = notes_terms()
    shared = 0
    for e in entries:
        if not isinstance(e, dict) or not isinstance(e.get("term"), str):
            continue
        for where, nterm, ndef in nt.get(norm_term(e["term"]), []):
            shared += 1
            a, b = content_words(e.get("def", "")), content_words(ndef)
            overlap = len(a & b) / max(1, min(len(a), len(b)))
            if overlap < 0.2:
                warns.append(f"'{e['term']}' may mean something different in {where}: "
                             f"glossary \"{e.get('def')}\" | notes \"{ndef}\" (read the pair)")
    split = " ".join(f"D{d} {per_domain[d]}" for d in range(4))
    summary = f"glossary: {len(entries)} terms ({split}) · {shared} notes definition(s) of the same terms compared"
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
    gl = check_glossary()
    if gl is None:
        print(f"  glossary: skipped: {GLOSSARY.relative_to(ROOT)} not written yet")
    else:
        summary, errors, warns = gl
        print(f"  {summary}  {'✓' if not errors else '✗'}")
        for e in errors:
            print(f"  ERROR glossary: {e}")
        for w in warns:
            print(f"  warn  glossary: {w}")
        n_err += len(errors)
    return 1 if n_err else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
