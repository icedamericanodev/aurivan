#!/usr/bin/env python3
"""Originality gate: KaiSip's CIA wording must not track The IIA's text.

The CIA packs are sold, so every definition, title and explanation must carry
The IIA's MEANING in KaiSip's own words. This gate compares our text with the
official text and fails on close wording:

  definitions  our glossary definitions and notes key terms against the Global
               Internal Audit Standards glossary entry for the same term: a run
               of 6 or more words in the same order, 30% or more shared 3-word
               phrases, or a word-sequence similarity of 0.6 or more
               (the CRISC thresholds, data/crisc/tools/check_originality.py);
  titles       outline titles, notes topic and sub-topic names and "can do"
               lines against every syllabus line: a run of 6 or more words;
  everything   every other learner-readable string (questions, options,
               explanations, tips, notes, principles, exam guides) against the
               whole reference text: a run of 8 or more words. A definition
               that passes the glossary comparison is read this way too.

A few fixed terms of art ("governance, risk management, and control
processes") count as one word, so naming the thing is not copying. Because a
sentence made mostly of such terms would then hide a long copied run, every run
is ALSO counted in plain words (a "raw run"): 11 or more for definitions and
prose, 8 or more for titles.

THE IIA'S TEXT IS NEVER STORED IN THE REPOSITORY. The gate reads it from a
folder outside the repo, in this order: --ref DIR, $CIA_REF_DIR, then
~/.cache/kaisip/cia_ref. A reference folder inside the repository is refused.
Fill the folder with --fetch: it downloads the Standards and the four syllabus
files that shared/outline.json names (`syllabus_url`) from theiia.org, converts
them with pdftotext, and downloads again any text that is missing, empty, more
than 30 days old or from another address than the outline names now.
--fetch-plan prints what --fetch would download and changes nothing.

When no reference text is present the gate says so and exits 0, unless
--require is given (the authoring pipeline and the release gate always pass
--require). With --require the reference must also be COMPLETE: all five source
texts present and not empty, and at least 56 glossary entries parsed from the
Standards (the number counted in the opened file on 19 Nov 2026). A partial
reference checks little and proves nothing. --fixture-ref turns the
completeness rule off; only prove_harness.py uses it, for its made-up reference.

Usage:
  python3 data/cia/tools/check_originality.py --fetch --require
  python3 data/cia/tools/check_originality.py --ref /path/to/texts [--root DIR] [--json out.json]
Exit 1 if anything is flagged.
"""
import datetime
import os
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import cia_common as c

RUN_DEF, GRAM_SHARE, SIM, RUN_TITLE, RUN_ANY = 6, 0.30, 0.60, 6, 8
RAW_TITLE, RAW_ANY = 8, 11          # the same runs in plain words, terms of art not collapsed
MAX_AGE_DAYS = 30                   # --fetch downloads an older text again
MIN_GLOSSARY = 56                   # entries in the 2024 Standards glossary, counted in the opened file (19 Nov 2026)
CACHE = Path.home() / ".cache" / "kaisip" / "cia_ref"
HOST = "https://www.theiia.org/"
STANDARDS = "standards_2024"
STANDARDS_URL = HOST + "globalassets/site/standards/globalinternalauditstandards_2024january9.pdf"
SYLLABUS_FILES = {"cia1": "p1_syllabus", "cia2": "p2_syllabus", "cia3": "p3_syllabus", "ciac": "challenge_syllabus"}
REQUIRED = [STANDARDS, *SYLLABUS_FILES.values()]    # a complete reference has all five
# Fixed terms of art: each counts as one word on both sides.
TERMS_OF_ART = [
    "governance risk management and control processes", "governance risk management and control",
    "quality assurance and improvement program", "global internal audit standards",
    "chief audit executive", "internal audit function", "senior management and the board",
    "the board and senior management", "purpose of internal auditing", "three lines model",
    "topical requirements", "internal audit charter", "internal audit mandate", "activity under review",
]
SKIP = {"_provenance", "_meta", "legacy_ids", "practice_ids", "url", "id", "framework_ref", "source",
        "principle_id", "challenge_ref", "testable_from", "difficulty", "bloom_level", "correct", "topic_id",
        "retired"}


def raw_words(text):
    """Plain lower-case words."""
    return re.findall(r"[a-z0-9]+", text.lower().replace("’", "").replace("'", ""))


def words(text):
    """Words with each fixed term of art collapsed to one."""
    text = " ".join(raw_words(text))
    for i, t in enumerate(TERMS_OF_ART):
        text = text.replace(t, f"termofart{i}")
    return text.split()


def key(term):
    term = re.sub(r"\s*\([^)]*\)\s*$", "", term)
    return " ".join(re.findall(r"[a-z0-9]+", term.lower()))


def longest_run(a, b):
    return SequenceMatcher(None, a, b, autojunk=False).find_longest_match(0, len(a), 0, len(b)).size


def gram_share(a, b, n=3):
    ga = {tuple(a[i:i + n]) for i in range(len(a) - n + 1)}
    gb = {tuple(b[i:i + n]) for i in range(len(b) - n + 1)}
    return len(ga & gb) / len(ga) if ga else 0.0


def grams(ws, n):
    return {tuple(ws[i:i + n]) for i in range(len(ws) - n + 1)}


def first_shared(ws, n, pool):
    """The first run of n words of ours that is also in the pool of their runs, or None."""
    return next((g for g in (tuple(ws[i:i + n]) for i in range(len(ws) - n + 1)) if g in pool), None)


def sources(root):
    """{file name: address}: the Standards, and each exam's syllabus at the address
    shared/outline.json names, so the gate reads the file the outline was written from
    (the Challenge syllabus was once fetched from an older address than the outline's)."""
    out = {STANDARDS: STANDARDS_URL}
    for e in c.load_outline(root)["exams"]:
        if e["id"] in SYLLABUS_FILES:
            out[SYLLABUS_FILES[e["id"]]] = e.get("syllabus_url") or ""
    return out


def fetch_plan(dest, srcs, today):
    """[(name, address, why)] for each source text --fetch must download: missing, empty,
    older than MAX_AGE_DAYS, or fetched from another address than the outline names now."""
    plan = []
    for name, url in srcs.items():
        txt, came_from = dest / f"{name}.txt", dest / f"{name}.url"
        if not txt.exists():
            plan.append((name, url, "missing"))
            continue
        age = (today - datetime.date.fromtimestamp(txt.stat().st_mtime)).days
        if not txt.read_text(encoding="utf-8", errors="replace").strip():
            plan.append((name, url, "empty"))
        elif came_from.exists() and came_from.read_text(encoding="utf-8").strip() != url:
            plan.append((name, url, "the outline names another address now"))
        elif age > MAX_AGE_DAYS:
            plan.append((name, url, f"{age} days old (limit {MAX_AGE_DAYS})"))
    return plan


def fetch(dest, plan):
    """Download and convert what the plan lists. Returns the problems; a text that cannot be
    downloaded again is left as it was."""
    dest.mkdir(parents=True, exist_ok=True)
    ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    problems = []
    for name, url, why in plan:
        if not url.startswith(HOST):
            problems.append(f"{name}: '{url}' is not an address on {HOST}; not fetched")
            continue
        pdf, txt = dest / f"{name}.pdf", dest / f"{name}.txt"
        new_pdf, new_txt = dest / f"{name}.pdf.part", dest / f"{name}.txt.part"
        try:
            subprocess.run(["curl", "-sS", "-f", "-L", "--max-time", "120", "-A", ua, "-o", str(new_pdf), url], check=True)
            subprocess.run(["pdftotext", "-layout", str(new_pdf), str(new_txt)], check=True)
            if not new_txt.read_text(encoding="utf-8", errors="replace").strip():
                raise OSError("the downloaded file has no text")
        except (subprocess.CalledProcessError, OSError) as e:
            problems.append(f"{name} ({why}): could not fetch {url} ({e})"
                            + ("; the older text is kept" if txt.exists() else ""))
            for part in (new_pdf, new_txt):
                part.unlink(missing_ok=True)
            continue
        os.replace(new_pdf, pdf)
        os.replace(new_txt, txt)
        (dest / f"{name}.url").write_text(url + "\n", encoding="utf-8")
    return problems


def clean_pages(text):
    """A pdftotext file without its page furniture. Each form feed starts a page; a page's
    running footer (from the copyright line in its last lines to the page end) is dropped and
    the page break becomes a blank line. So an entry or sentence that starts a page is read
    like any other: before 19 Nov 2026 the first glossary entry of every page was lost."""
    pages = []
    for page in text.split("\f"):
        lines = page.splitlines()
        body = [i for i, l in enumerate(lines) if l.strip()]
        for i in body[-4:]:
            if "©" in lines[i]:
                lines = lines[:i]
                break
        pages.append("\n".join(lines))
    return "\n\n".join(pages)


def glossary_entries(std):
    """{term key: definition} from the Standards text: each "term – definition" paragraph."""
    out = {}
    for para in re.split(r"\n\s*\n", clean_pages(std)):
        flat = re.sub(r"\s+", " ", para).strip()
        flat = re.sub(r"^Glossary ", "", flat)          # the heading sits on the first entry's page
        m = re.match(r"^([a-z][a-z ,/’'()-]{1,60}?) – (.+)$", flat)
        if m:
            out[key(m.group(1))] = m.group(2)
    return out


def reference(ref):
    """Return a dict: glossary {term key: definition}, the syllabus lines and the whole text
    as collapsed and as raw word lists, and the names of the texts read."""
    texts = {p.stem: clean_pages(p.read_text(encoding="utf-8", errors="replace")) for p in sorted(ref.glob("*.txt"))}
    std = texts.get(STANDARDS) or next((t for name, t in texts.items() if "standards" in name), "")
    lines = [l for name, t in texts.items() if "syllabus" in name for l in re.split(r"\n\s*(?=[a-h1-9]\d?\. )", t)]
    whole = " ".join(texts.values())
    return {"glossary": glossary_entries(std), "names": {n for n, t in texts.items() if t.strip()},
            "titles": set().union(*(grams(words(l), RUN_TITLE) for l in lines)) if lines else set(),
            "raw_titles": set().union(*(grams(raw_words(l), RAW_TITLE) for l in lines)) if lines else set(),
            "lines": [words(l) for l in lines], "raw_lines": [raw_words(l) for l in lines],
            "runs": grams(words(whole), RUN_ANY), "raw_runs": grams(raw_words(whole), RAW_ANY)}


def incomplete(ref_data):
    """What a complete reference lacks. A folder with one syllabus, an empty Standards file or
    a glossary that parses short passed --require before; each checks little and proves nothing."""
    lacks = [f"{name}.txt is missing or empty" for name in REQUIRED if name not in ref_data["names"]]
    n = len(ref_data["glossary"])
    if n < MIN_GLOSSARY:
        lacks.append(f"only {n} of the {MIN_GLOSSARY} Standards glossary entries parsed")
    return lacks


def ours(root):
    """Yield (kind, where, term, text). kind: definition, title or prose."""
    seen_files = []
    gl = root / "shared" / "glossary.json"
    if gl.exists():
        for e in c.read_json(gl):
            yield "definition", f"shared/glossary {e.get('term')}", e.get("term", ""), e.get("def", "")
            if e.get("scopeNotes"):
                yield "prose", f"shared/glossary {e.get('term')} scopeNotes", "", e["scopeNotes"]
    out = root / "shared" / "outline.json"
    if out.exists():
        for code, t in c.part_topics(c.read_json(out)).items():
            yield "title", f"outline {code}", "", t.get("title", "")
    for pack in c.PARTS:
        for p in sorted((root / pack / "notes").glob("d*.json")):
            d = c.read_json(p)
            rel = p.relative_to(root).as_posix()
            for term, text in (d.get("key_terminologies") or {}).items():
                yield "definition", f"{rel} key_terminologies {term}", term, text
            for t in d.get("topics", []):
                yield "title", f"{rel} {t.get('topic_id')} topic_name", "", t.get("topic_name", "")
                for line in t.get("can_do", []):
                    yield "title", f"{rel} {t.get('topic_id')} can_do", "", line
                for s in t.get("subtopics", []):
                    yield "title", f"{rel} {s.get('id')} name", "", s.get("name", "")
                    for kt in s.get("key_terms", []):
                        yield "definition", f"{rel} {s.get('id')} key_terms {kt.get('term')}", kt.get("term", ""), kt.get("definition", "")
            for path, s in c.strings(d, SKIP):
                yield "prose", f"{rel} {path}", "", s
            seen_files.append(p)
    extra = [root / "shared" / "principles.json", root / "ciac" / "notes" / "bridge.json"]
    for pack in c.PACKS:
        extra += sorted((root / pack / "exam").glob("*.json"))
    for pack in c.PARTS:
        extra += [p for _d, p in c.question_files(root, pack)]
    for p in extra:
        if p.exists():
            rel = p.relative_to(root).as_posix()
            data = c.read_json(p)
            rows = data["questions"] if isinstance(data, dict) and "questions" in data else [data]
            for row in rows:
                where = f"{rel} {row.get('id', '')}".strip() if isinstance(row, dict) else rel
                for path, s in c.strings(row, SKIP):
                    yield "prose", f"{where} {path}", "", s


def main(argv):
    root, today, args = c.setup(argv)
    ref = Path(c.pop_opt(args, "--ref") or os.environ.get("CIA_REF_DIR") or CACHE).expanduser().resolve()
    json_out = c.pop_opt(args, "--json")
    require = "--require" in args
    if ref == c.REPO or c.REPO in ref.parents:
        print(f"ERROR check_originality: the reference folder {ref} is inside the repository; "
              "The IIA's text is never stored there. Use a folder outside it (the default is ~/.cache/kaisip/cia_ref)")
        return 1
    if "--fetch-plan" in args or "--fetch" in args:
        plan = fetch_plan(ref, sources(root), today)
        for name, url, why in plan:
            print(f"fetch: {name}: {why}: {url}")
        if "--fetch-plan" in args:
            print(f"check_originality --fetch-plan: {len(plan)} text(s) to download into {ref}")
            return 0
        for problem in fetch(ref, plan):
            print(f"warn  {problem}")
    if not list(ref.glob("*.txt")):
        print(f"check_originality: no reference text in {ref} (run with --fetch); "
              + ("ERROR, --require was given" if require else "skipped"))
        return 1 if require else 0
    their = reference(ref)
    lacks = [] if "--fixture-ref" in args else incomplete(their)
    for l in lacks:
        print(f"{'ERROR' if require else 'warn '} reference: {l}")
    if lacks and require:
        print(f"check_originality: the reference text in {ref} is incomplete (run with --fetch); ERROR, --require was given")
        return 1
    glossary = their["glossary"]
    flagged, counts = [], {"definition": 0, "title": 0, "prose": 0}
    for kind, where, term, text in ours(root):
        a, raw = words(text), raw_words(text)
        if kind == "definition":
            entry = glossary.get(key(term))
            if entry:
                counts[kind] += 1
                b = words(entry)
                run, share = longest_run(a, b), gram_share(a, b)
                sim = SequenceMatcher(None, a, b, autojunk=False).ratio()
                raw_run = longest_run(raw, raw_words(entry))
                why = [name for name, hit in (("run", run >= RUN_DEF), ("3-gram share", share >= GRAM_SHARE),
                                              ("similarity", sim >= SIM), ("raw run", raw_run >= RAW_ANY)) if hit]
                if why:
                    flagged.append({"where": where, "why": f"tracks the Standards glossary ({', '.join(why)}): run {run}, "
                                    f"3-gram share {share:.2f}, similarity {sim:.2f}, raw run {raw_run}", "ours": text})
                    continue
            kind = "prose"   # also read against the whole text: a definition may lift another sentence
        if kind == "title":
            counts[kind] += 1
            if first_shared(a, RUN_TITLE, their["titles"]):
                run = max(longest_run(a, line) for line in their["lines"])
                flagged.append({"where": where, "why": f"shares a {run}-word run with a syllabus line", "ours": text})
            elif first_shared(raw, RAW_TITLE, their["raw_titles"]):
                run = max(longest_run(raw, line) for line in their["raw_lines"])
                flagged.append({"where": where, "why": f"shares a raw run of {run} words with a syllabus line "
                                "(terms of art counted word by word)", "ours": text})
            continue
        counts["prose"] += 1
        hit = first_shared(a, RUN_ANY, their["runs"])
        raw_hit = None if hit else first_shared(raw, RAW_ANY, their["raw_runs"])
        if hit:
            flagged.append({"where": where, "why": f"shares a run of {RUN_ANY} or more words with The IIA's text: "
                            f"'{' '.join(hit)}'", "ours": text})
        elif raw_hit:
            flagged.append({"where": where, "why": f"shares a raw run of {RAW_ANY} or more words with The IIA's text "
                            f"(terms of art counted word by word): '{' '.join(raw_hit)}'", "ours": text})
    for f in flagged:
        print(f"ERROR {f['where']}: {f['why']}")
    print(f"check_originality: {counts['definition']} definition(s) matched a Standards glossary term "
          f"({len(glossary)} parsed), {counts['title']} title(s), {counts['prose']} other string(s) · {len(flagged)} too close"
          + (" · reference incomplete, so this run proves little (run with --fetch)" if lacks else ""))
    if json_out:
        Path(json_out).write_text(c.dump_json(flagged), encoding="utf-8")
    return 1 if flagged else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
