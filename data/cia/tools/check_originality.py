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
               whole reference text: a run of 8 or more words.

A few fixed terms of art ("governance, risk management, and control
processes") count as one word, so naming the thing is not copying.

THE IIA'S TEXT IS NEVER STORED IN THE REPOSITORY. The gate reads it from a
folder outside the repo, in this order: --ref DIR, $CIA_REF_DIR, then
~/.cache/kaisip/cia_ref. Fill that folder with --fetch (downloads the official
PDFs from theiia.org and converts them with pdftotext). When no reference text
is present the gate says so and exits 0, unless --require is given (the
authoring pipeline and the release gate always pass --require).

Usage:
  python3 data/cia/tools/check_originality.py --fetch --require
  python3 data/cia/tools/check_originality.py --ref /path/to/texts [--root DIR] [--json out.json]
Exit 1 if anything is flagged.
"""
import os
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import cia_common as c

RUN_DEF, GRAM_SHARE, SIM, RUN_TITLE, RUN_ANY = 6, 0.30, 0.60, 6, 8
CACHE = Path.home() / ".cache" / "kaisip" / "cia_ref"
BASE = "https://www.theiia.org/globalassets/site/"
SOURCES = {
    "standards_2024": BASE + "standards/globalinternalauditstandards_2024january9.pdf",
    "p1_syllabus": BASE + "certifications/internal-audit-practitioner/2025-cia-part-1--syllabus.pdf",
    "p2_syllabus": BASE + "certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-2-syllabus.pdf",
    "p3_syllabus": BASE + "certifications/certified-internal-auditor/cia-exam-why-how-and-what-is-changing/cia-part-3-syllabus.pdf",
    "challenge_syllabus": BASE + "certifications/challenge-exam/oct-2025-challenge-exam-syllabus.pdf",
}
# Fixed terms of art: each counts as one word on both sides.
TERMS_OF_ART = [
    "governance risk management and control processes", "governance risk management and control",
    "quality assurance and improvement program", "global internal audit standards",
    "chief audit executive", "internal audit function", "senior management and the board",
    "the board and senior management", "purpose of internal auditing", "three lines model",
    "topical requirements", "internal audit charter", "internal audit mandate", "activity under review",
]
SKIP = {"_provenance", "_meta", "legacy_ids", "practice_ids", "url", "id", "framework_ref", "source",
        "principle_id", "challenge_ref", "testable_from", "difficulty", "bloom_level", "correct", "topic_id"}


def words(text):
    text = " ".join(re.findall(r"[a-z0-9]+", text.lower().replace("’", "").replace("'", "")))
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


def fetch(dest):
    dest.mkdir(parents=True, exist_ok=True)
    ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    for name, url in SOURCES.items():
        pdf = dest / f"{name}.pdf"
        if not (dest / f"{name}.txt").exists():
            subprocess.run(["curl", "-sS", "-L", "--max-time", "120", "-A", ua, "-o", str(pdf), url], check=True)
            subprocess.run(["pdftotext", "-layout", str(pdf), str(dest / f"{name}.txt")], check=True)


def reference(ref):
    """Return (glossary {term key: definition}, syllabus lines, all reference words)."""
    texts = {p.stem: p.read_text(encoding="utf-8", errors="replace") for p in sorted(ref.glob("*.txt"))}
    glossary = {}
    std = next((t for name, t in texts.items() if "standards" in name), "")
    for para in re.split(r"\n\s*\n", std):
        flat = re.sub(r"\s+", " ", para).strip()
        m = re.match(r"^([a-z][a-z ,/’'()-]{1,60}?) – (.+)$", flat)
        if m:
            glossary[key(m.group(1))] = m.group(2)
    syllabus = []
    for name, t in texts.items():
        if "syllabus" in name:
            syllabus += [w for w in (words(l) for l in re.split(r"\n\s*(?=[a-h1-9]\d?\. )", t)) if len(w) >= RUN_TITLE]
    return glossary, syllabus, words(" ".join(texts.values()))


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
    root, _today, args = c.setup(argv)
    ref = Path(c.pop_opt(args, "--ref") or os.environ.get("CIA_REF_DIR") or CACHE)
    json_out = c.pop_opt(args, "--json")
    if "--fetch" in args:
        fetch(ref)
    if not list(ref.glob("*.txt")):
        print(f"check_originality: no reference text in {ref} (run with --fetch); "
              + ("ERROR, --require was given" if "--require" in args else "skipped"))
        return 1 if "--require" in args else 0
    glossary, syllabus, corpus = reference(ref)
    corpus_grams = grams(corpus, RUN_ANY)
    flagged, counts = [], {"definition": 0, "title": 0, "prose": 0}
    for kind, where, term, text in ours(root):
        a = words(text)
        if kind == "definition":
            their = glossary.get(key(term))
            if their:
                counts[kind] += 1
                b = words(their)
                run, share = longest_run(a, b), gram_share(a, b)
                sim = SequenceMatcher(None, a, b, autojunk=False).ratio()
                if run >= RUN_DEF or share >= GRAM_SHARE or sim >= SIM:
                    flagged.append({"where": where, "why": f"tracks the Standards glossary: run {run}, "
                                    f"3-gram share {share:.2f}, similarity {sim:.2f}", "ours": text})
                continue
            kind = "prose"   # no glossary entry for the term: fall through to the general check
        if kind == "title":
            counts[kind] += 1
            run = max((longest_run(a, line) for line in syllabus), default=0) if len(a) >= RUN_TITLE else 0
            if run >= RUN_TITLE:
                flagged.append({"where": where, "why": f"shares a {run}-word run with a syllabus line", "ours": text})
            continue
        counts["prose"] += 1
        hit = next((g for g in (tuple(a[i:i + RUN_ANY]) for i in range(len(a) - RUN_ANY + 1)) if g in corpus_grams), None)
        if hit:
            flagged.append({"where": where, "why": f"shares a run of {RUN_ANY} or more words with The IIA's text: "
                            f"'{' '.join(hit)}'", "ours": text})
    for f in flagged:
        print(f"ERROR {f['where']}: {f['why']}")
    print(f"check_originality: {counts['definition']} definition(s) matched a Standards glossary term "
          f"({len(glossary)} parsed), {counts['title']} title(s), {counts['prose']} other string(s) · {len(flagged)} too close")
    if json_out:
        Path(json_out).write_text(c.dump_json(flagged), encoding="utf-8")
    return 1 if flagged else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
