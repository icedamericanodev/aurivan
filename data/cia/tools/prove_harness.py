#!/usr/bin/env python3
"""Prove the CIA harness: plant one fault per rule and fail if any gets through.

A gate that has never been seen to fail is not a gate. This test builds a small
CLEAN fixture course in a temp folder (made-up content, a made-up citation
library and a made-up "official" reference text, so nothing of The IIA's is
stored here), checks that every gate passes on it, then, one fault at a time,
breaks a fresh copy and checks that the right gate stops it with the right
message. It runs in scripts/verify_repo.sh on every session start.

The fixture uses the real shared/outline.json and shared/stale_terms.json, so
the test also notices when those files stop making sense.

The app pack dry run (scripts/cia_pack_dry_run.cjs, a node script) is proved
here too: the clean fixture must pass it, so the fixture's notes and principle
carry every field the phone app's builders ask for. Without `node` those checks
are skipped with a printed note and left out of the counts.

Usage:
  python3 data/cia/tools/prove_harness.py        # one line per planted fault
  python3 data/cia/tools/prove_harness.py -q     # only the summary line (and any failure)
  python3 data/cia/tools/prove_harness.py --keep DIR   # also leave the clean fixture in DIR (and DIR-ref)
Exit 1 if a planted fault gets through, or if the clean fixture does not pass.
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import cia_common as c

TOOLS = Path(__file__).resolve().parent
DRY = "cia_pack_dry_run.cjs"      # the app pack dry run: a node script in scripts/, not a tool in this folder
NODE = shutil.which("node")
TODAY = "2026-11-19"
STD = "Fixture Standards (2024), Standard 1.1 First Fixture Standard"
TOPICAL = "Third-Party Topical Requirement"
REF_DEF = "An entirely invented phrase that the harness plants so that copied wording can be caught reliably."
REF_LINE = "Describe the invented purpose of planted widget auditing for harness tests"
AREAS = ["purchasing", "payroll", "inventory counts", "travel expenses", "vendor setup", "cash handling",
         "contract renewals", "asset disposals"]
ORGS = ["a regional hospital", "a food distributor", "a city transit agency", "a software firm", "a furniture maker"]
KEY_TEXT = {"long": "Discuss the finding with the manager of the area under review",
            "mid": "Discuss the finding with the manager of the area",
            "short": "Discuss it with the area manager"}
RUNNER = "Report the finding directly to the audit committee chair"
ELIM = ["Rewrite the procedure so the gap is closed", "Wait for the next annual plan to cover it"]


def item(pack, d, n, code, title, i, key="balanced", lengths="balanced", depth="fit", ref=None):
    k = "A" if key == "allA" else "ABCD"[i % 4]
    others = [x for x in "ABCD" if x != k]
    r, e1, e2 = others
    size = {"balanced": ["long", "short", "mid", "mid", "mid"][i % 5],
            "long": "long" if i % 5 < 3 else "mid", "short": "short" if i % 5 < 3 else "mid"}[lengths]
    level = "analysis" if depth == "allAnalysis" else ["foundational", "application", "application", "foundational",
                                                       "application", "analysis", "application", "application"][i % 8]
    return {
        "id": f"{pack}_d{d}_{n:03d}", "domain": d, "subtopic": f"{code} {title}. Fixture case {n}",
        "principle_id": "fixture-principle", "challenge_ref": ref, "testable_from": None,
        "difficulty": level, "bloom_level": level.capitalize(),
        "question": f"During a review of {AREAS[i % 8]} at {ORGS[i % 5]}, an internal auditor finds that a required "
                    "approval step is often skipped. What should the internal auditor do FIRST?",
        "options": {k: KEY_TEXT[size], r: RUNNER, e1: ELIM[0], e2: ELIM[1]},
        "correct": k,
        "key_concept": "A finding goes first to the people who run the area, so facts are confirmed before it moves up.",
        "pre_read": "Think about who needs to hear a finding first, and who owns the fix.",
        "correct_explanation": "The auditor first confirms the facts with the manager who runs the area. That manager "
                               "can explain the cause, correct a misunderstanding and start an action plan. Going "
                               "higher before that talk risks reporting something wrong, and changing the procedure "
                               "would make the auditor do the work of the people being audited.",
        "wrong_explanations": {
            r: "Closest choice: the audit committee does hear about important findings, but only after the facts "
               "are confirmed with the area's manager.",
            e1: "Changing a procedure is the job of the people who run the area, so the auditor would lose "
                "objectivity by doing it.",
            e2: "Putting it off leaves a known gap open and tells nobody who could act on it."},
        "tips": [f"Eliminate: {e1}, because changing a procedure is the area's own job, and {e2}, because waiting "
                 "leaves a known gap open.",
                 f"Final two: {k} beats {r} because the area's manager confirms the facts before a finding goes higher.",
                 "Exam cue: when a stem asks what comes first after a finding, look for the talk with the people "
                 "who run the area."],
        "framework_ref": STD, "related_concepts": ["Findings", "Communication"],
        "_provenance": f"Authored from concept: notes {code}.1, harness fixture. Made-up content.",
        "style_version": 2}


def notes(d, name, codes, topics):
    """One section's notes: what the Python gates read, plus every field the phone app's notes builder
    requires of a sub-topic (why_it_matters, how_it_works, example, isaca_rule) and a section word list
    (key_terminologies, which the app's Glossary is built from), so the pack dry run passes on the fixture."""
    return {"domain_number": d, "domain_name": name, "overview": "Fixture section.",
            "key_terminologies": {"widget audit": "A made-up review used only by the harness fixture."},
            "topics": [
        {"topic_id": code, "topic_name": topics[code]["title"], "overview": "Fixture topic.",
         "can_do": ["Say who hears a finding first", "Tell a finding from a fix"],
         "subtopics": [{"id": f"{code}.1", "name": "Who Hears a Finding First", "legacy_ids": [],
                        "definition": "A finding is first confirmed with the people who run the area.",
                        "why_it_matters": "A finding the area has confirmed is hard to dispute later, so the "
                                          "report can be trusted.",
                        "how_it_works": ["Share the finding with the manager who runs the area.",
                                         "Listen to their side and correct anything that is wrong.",
                                         "Take the confirmed finding higher when it is important."],
                        "example": "An auditor sees purchase orders with no signature and asks the purchasing "
                                   "manager about them before writing the finding.",
                        "isaca_rule": "Confirm the facts with the area first, then report.",
                        "key_terms": [{"term": "widget audit",
                                       "definition": "A made-up review used only by the harness fixture."}]}]}
        for code in codes]}


def write_bank(root, outline, **kw):
    topics = c.part_topics(outline)
    plan = [("cia1", [("1A1", None), ("1A2", "A1"), ("1A3", None), ("1A4", None), ("1A5", None)], 8),
            ("cia2", [("2A1", "C1")], 4)]
    for pack, codes, per in plan:
        sec = c.exam(outline, pack)["sections"][0]
        qs = [item(pack, 1, t * per + j + 1, code, topics[code]["title"], t * per + j, ref=ref, **kw)
              for t, (code, ref) in enumerate(codes) for j in range(per)]
        c.write_json(root / pack / "originals" / "d1.json", {
            "_meta": {"comment": "Harness fixture. Made-up content.", "schema_version": 1},
            "domain": 1, "domain_name": sec["name"], "weight": f"{sec['weight']}%", "questions": qs})
        npath = root / pack / "notes" / "d1.json"
        if not npath.exists():
            c.write_json(npath, notes(1, sec["name"], [code for code, _ in codes], topics))


def make_fixture(root, ref):
    outline = c.load_outline(c.CIA)
    shutil.copytree(c.CIA / "shared", root / "shared", ignore=shutil.ignore_patterns("glossary.json", "principles.json",
                    "currency.json", "_framework_library.md"))
    (root / "shared" / "_framework_library.md").write_text(
        f"# Fixture library\n\n## Verified: opened {TODAY} Fixture Standards (https://example.org/standards)\n"
        f"- {STD}\n- {TOPICAL}\n\n## Likely: not opened (fixture)\n- Fixture Textbook, 1st edition\n", encoding="utf-8")
    fact = {"source": "https://example.org/exam", "last_checked": TODAY, "status": "opened", "version_label": None}
    facts = []
    for e in outline["exams"]:
        facts += [dict(fact, id=f"{e['id']}.questions", exam=e["id"], fact="questions", value=e["questions"]),
                  dict(fact, id=f"{e['id']}.minutes", exam=e["id"], fact="minutes", value=e["minutes"]),
                  dict(fact, id=f"{e['id']}.weights", exam=e["id"], fact="weights",
                       value={s["letter"]: s["weight"] for s in e["sections"]})]
    c.write_json(root / "shared" / "currency.json", {
        "schema_version": 1, "warn_after_days": 60, "fail_after_days": 120, "facts": facts,
        "topical_requirements": [{"id": "third-party", "name": TOPICAL, "library_prefix": TOPICAL,
                                  "testable_from": "2027-03-01", "source": "https://example.org/topical",
                                  "last_checked": TODAY, "status": "opened"}]})
    c.write_json(root / "shared" / "glossary.json", [
        {"id": 1, "term": "widget audit", "acronym": "", "def": "A made-up review used only by the harness fixture.",
         "scopeNotes": "", "category": "Fixture", "packs": {"cia1": 1, "ciac": 1}}])
    c.write_json(root / "shared" / "principles.json", {
        "schema_version": 2, "title": "Fixture principles", "updated": TODAY, "description": "Fixture.",
        "families": [{"id": "role", "order": 1, "title": "Your role", "question": "Who am I here?"}],
        "principles": [{"id": "fixture-principle", "family": "role", "order": 1, "title": "Confirm, then report",
                        "rule": "Confirm the facts with the area before a finding goes higher.",
                        # why, trap and example: the phone app's principles builder requires them.
                        "why": "A finding the area has confirmed is hard to dispute later.",
                        "triggers": ["FIRST", "after a finding"],
                        "trap": {"move": "Taking an unconfirmed finding straight to the top.",
                                 "why_wrong": "The facts may be wrong, and the people who can fix it have not heard."},
                        "example": {"scenario": "An auditor finds purchase orders with no signature.",
                                    "answer": "Ask the purchasing manager about them before reporting higher."},
                        "packs": list(c.PACKS), "domains": {"cia1": [1], "cia2": [1], "ciac": [1, 3]},
                        "subtopics": {}, "practice_ids": {}}],
        "slip_map": {"role": "fixture-principle"}})
    write_bank(root, outline)
    ref.mkdir()
    (ref / "standards_fixture.txt").write_text(f"Fixture glossary\n\n     widget audit – {REF_DEF}\n\n", encoding="utf-8")
    (ref / "fixture_syllabus.txt").write_text(f" 1. {REF_LINE}\n a. Explain the fixture\n", encoding="utf-8")
    for tool in ("build_packs.py", "build_challenge.py", "sync_practice_ids.py"):
        run(root, ref, [tool])


def run(root, ref, cmd):
    if cmd[0].endswith(".cjs"):   # the pack dry run: node, scripts/, the same --root and --today
        env = dict(os.environ, CIA_PACK_OUT=str(Path(root).parent / "pack-dry-run-out"))   # inside the temp folder
        p = subprocess.run([NODE, str(c.REPO / "scripts" / cmd[0]), *cmd[1:], "--root", str(root), "--today", TODAY],
                           capture_output=True, text=True, env=env)
        return p.returncode, p.stdout + p.stderr
    extra = ["--ref", str(ref), "--require"] if cmd[0] == "check_originality.py" else []
    p = subprocess.run([sys.executable, str(TOOLS / cmd[0]), *cmd[1:], *extra, "--root", str(root), "--today", TODAY],
                       capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def edit(root, rel, fn):
    data = c.read_json(root / rel)
    fn(data)
    c.write_json(root / rel, data)


def q0(fn, rel="cia1/originals/d1.json", n=0):
    """A fault in one question of a file."""
    return lambda root: edit(root, rel, lambda d: fn(d["questions"][n]))


def regen(**kw):
    return lambda root: write_bank(root, c.load_outline(root), **kw)


def lens_fault(q):
    q["options"][q["correct"]] = "Implement the missing approval step in the system"


def wrong_key(q):
    q["correct"] = next(k for k in "ABCD" if k != q["correct"])


def retag(root):
    """Drop a Challenge tag, rebuild, restore it, rebuild: the old id must stay retired, not be reused."""
    rel = "cia2/originals/d1.json"
    edit(root, rel, lambda d: d["questions"][0].__setitem__("challenge_ref", None))
    run(root, None, ["build_challenge.py"])
    edit(root, rel, lambda d: d["questions"][0].__setitem__("challenge_ref", "C1"))
    run(root, None, ["build_challenge.py"])
    entries = [e for e in c.read_json(root / "ciac" / "id_map.json")["map"] if e["source"] == "cia2_d1_001"]
    ids = [e["id"] for e in entries]
    ok = len(entries) == 2 and entries[0]["status"] == "retired" and entries[1]["status"] == "active" and len(set(ids)) == 2
    print("ID-MAP " + ("retired id not reused" if ok else f"WRONG: {entries}"))


# (what is planted, the gate that must stop it, the fault, text the gate must print)
CASES = [
    ("a 2019 term in a question option", ["check_stale_terms.py"],
     q0(lambda q: q["options"].__setitem__("A", "Ask the internal audit activity to decide")), "is 2019 wording"),
    ("a 2017 Standard number in a note", ["check_stale_terms.py"],
     lambda r: edit(r, "cia1/notes/d1.json", lambda d: d["topics"][0]["subtopics"][0].__setitem__(
         "definition", "Standard 1100 requires independence.")), "is 2019 wording"),
    ("an ISACA role name in an explanation", ["check_stale_terms.py"],
     q0(lambda q: q.__setitem__("correct_explanation", q["correct_explanation"] + " The IS auditor reports it.")),
     "is isaca wording"),
    ("'consulting services' instead of the house term", ["check_stale_terms.py"],
     q0(lambda q: q.__setitem__("pre_read", "Think about consulting services.")), "is house wording"),
    ("a banned term with no evidence in the term list", ["check_stale_terms.py"],
     lambda r: edit(r, "shared/stale_terms.json", lambda d: d["terms"][0].__setitem__("evidence", "")), "needs a class"),
    ("a wrong key letter", ["check_cia.py"], q0(wrong_key), "Final two tip should start"),
    ("a missing explanation for one wrong option", ["check_cia.py"],
     q0(lambda q: q["wrong_explanations"].__setitem__(sorted(q["wrong_explanations"])[0], "")), "has no real explanation"),
    ("an explanation written for the key instead of a distractor", ["check_cia.py"],
     q0(lambda q: q["wrong_explanations"].__setitem__(q["correct"], "This one is actually right, so it needs no text.")),
     "must cover exactly the three distractors"),
    ("a missing explanation for the key", ["check_cia.py"], q0(lambda q: q.__setitem__("correct_explanation", "")),
     "correct_explanation is missing"),
    ("a citation that is not in the library", ["check_cia.py"],
     q0(lambda q: q.__setitem__("framework_ref", "Some Guide Nobody Opened, chapter 4")), "not in the library"),
    ("a key that rests on an unopened (Likely) source", ["check_cia.py"],
     q0(lambda q: q.__setitem__("framework_ref", "Fixture Textbook, 1st edition; " + STD)), "must be a Verified"),
    ("an ISACA-lens answer: the auditor implements the fix", ["check_cia.py"], q0(lens_fault), "lens:"),
    ("a question that cites a note that does not exist", ["check_cia.py"],
     q0(lambda q: q.__setitem__("_provenance", "Authored from concept: notes 1A1.9, fixture.")), "which does not exist"),
    ("a question filed under another topic's note", ["check_cia.py"],
     q0(lambda q: q.__setitem__("_provenance", "Authored from concept: notes 1A2.1, fixture.")), "but the item is on topic"),
    ("a Challenge tag on a topic the Challenge Exam does not have", ["check_cia.py"],
     q0(lambda q: q.__setitem__("challenge_ref", "B2")), "is not valid for topic"),
    ("a wrong id", ["check_cia.py"], q0(lambda q: q.__setitem__("id", "cia1_d1_099")), "id should be"),
    ("a topic label that is not the outline title", ["check_cia.py"],
     q0(lambda q: q.__setitem__("subtopic", "1A1 Definition of auditing. Case")), "should be the outline title"),
    ("a gendered pronoun", ["check_cia.py"],
     q0(lambda q: q.__setitem__("pre_read", "Think about who he must tell first.")), "gendered pronoun"),
    ("every key on the same letter", ["check_cia.py"], regen(key="allA"), "key letters unbalanced"),
    ("the key is usually the longest option", ["check_cia.py"], regen(lengths="long"), "pick-longest outside"),
    ("the key is usually the shortest option", ["check_cia.py"], regen(lengths="short"), "pick-shortest above"),
    ("a difficulty mix that ignores the syllabus verb", ["check_cia.py"], regen(depth="allAnalysis"), "does not fit its verb"),
    ("an outline with a topic missing", ["check_cia.py"],
     lambda r: edit(r, "shared/outline.json", lambda d: d["exams"][1]["sections"][2]["topics"].pop()), "the syllabus has"),
    ("a Verified library section with no opened date", ["check_cia.py"],
     lambda r: (r / "shared" / "_framework_library.md").write_text(
         f"## Verified: Fixture Standards\n- {STD}\n- {TOPICAL}\n## Likely: x\n- Fixture Textbook, 1st edition\n"),
     "needs 'opened YYYY-MM-DD'"),
    ("a question on a Topical Requirement that is not testable yet", ["check_currency.py"],
     q0(lambda q: q.__setitem__("framework_ref", STD + "; " + TOPICAL)), "testable_from is None, should be 2027-03-01"),
    ("a dated fact nobody has re-checked for 200 days", ["check_currency.py", "--today", "2027-06-07"], lambda r: None,
     "re-open the source"),
    ("an exam length that disagrees with the outline", ["check_currency.py"],
     lambda r: edit(r, "shared/currency.json", lambda d: d["facts"][0].__setitem__("value", 999)), "outline.json says"),
    ("a fact with no source", ["check_currency.py"],
     lambda r: edit(r, "shared/currency.json", lambda d: d["facts"][0].__setitem__("source", "")), "no https source"),
    ("a glossary definition copied from the official text", ["check_originality.py"],
     lambda r: edit(r, "shared/glossary.json", lambda d: d[0].__setitem__("def", REF_DEF)), "tracks the Standards glossary"),
    ("a notes key term copied from the official text", ["check_originality.py"],
     lambda r: edit(r, "cia1/notes/d1.json", lambda d: d["topics"][0]["subtopics"][0]["key_terms"][0].__setitem__(
         "definition", REF_DEF)), "tracks the Standards glossary"),
    ("a notes title that follows a syllabus line", ["check_originality.py"],
     lambda r: edit(r, "cia1/notes/d1.json", lambda d: d["topics"][0].__setitem__(
         "topic_name", "The invented purpose of planted widget auditing")), "word run with a syllabus line"),
    ("an explanation that lifts a sentence from the official text", ["check_originality.py"],
     q0(lambda q: q.__setitem__("correct_explanation", "In short: " + REF_DEF)), "or more words with The IIA's text"),
    ("no reference text when the gate is required", ["check_originality.py", "--ref", "/nonexistent-cia-ref"],
     lambda r: None, "--require was given"),
    ("an option far too long for the house style", ["style_cia.py"],
     q0(lambda q: q["options"].__setitem__(q["correct"], " ".join(["Discuss the finding with the manager"] * 5))), "ERROR"),
    ("a hand-edited Challenge pack file", ["build_challenge.py", "--check"],
     lambda r: edit(r, "ciac/originals/d1.json", lambda d: d["questions"][0].__setitem__("correct", "A" if d["questions"][0]["correct"] != "A" else "B")),
     "is not what build_challenge.py produces"),
    ("a source question changed without rebuilding the Challenge pack", ["build_challenge.py", "--check"],
     q0(lambda q: q.__setitem__("pre_read", "A changed line."), n=8), "is not what build_challenge.py produces"),
    ("a hand-edited Challenge id map", ["build_challenge.py", "--check"],
     lambda r: edit(r, "ciac/id_map.json", lambda d: d["map"][0].__setitem__("id", "ciac_d1_777")),
     "is not what build_challenge.py produces"),
    ("a hand-edited built glossary", ["build_packs.py", "--check"],
     lambda r: edit(r, "cia1/glossary.json", lambda d: d[0].__setitem__("def", "Edited by hand.")), "out of date or hand-edited"),
    ("practice links that no longer match the questions", ["sync_practice_ids.py", "--check"],
     lambda r: edit(r, "cia1/notes/d1.json", lambda d: d["topics"][0]["subtopics"][0].__setitem__("practice_ids", ["cia1_d1_040"])),
     "practice links are out of date"),
    # cia1 question 1 is not Challenge-tagged, so these two leave the Challenge pack as built.
    ("a question id that another pack already uses", [DRY],
     q0(lambda q: q.__setitem__("id", "cia2_d1_001")), "id appears in 2 packs (cia1, cia2)"),
    ("a principle tag that is not one of the pack's principles", [DRY],
     q0(lambda q: q.__setitem__("principle_id", "no-such-principle")), "is not a principle in the cia1 pack"),
]
# Same shape, but the gate must PASS and print the text: the fault is handled, not refused.
KEPT_OUT = [
    ("a question that is not testable until 2027 (left out of the mock pool: 39 of 40)", [DRY],
     q0(lambda q: q.update(framework_ref=STD + "; " + TOPICAL, testable_from="2027-03-01")), "mock pool: 39 of 40 live items"),
]
CLEAN = [["check_cia.py"], ["check_stale_terms.py"], ["check_currency.py"], ["check_originality.py"], ["style_cia.py"],
         ["build_challenge.py", "--check"], ["build_packs.py", "--check"], ["sync_practice_ids.py", "--check"], [DRY]]


def runnable(rows):
    """Leave out the checks that need node when it is not installed (rows: commands, or case tuples)."""
    return [r for r in rows if NODE or not (r[1] if isinstance(r, tuple) else r)[0].endswith(".cjs")]


def main(argv):
    quiet = "-q" in argv
    failures = []
    clean, cases, kept_out = runnable(CLEAN), runnable(CASES), runnable(KEPT_OUT)
    skipped = len(CLEAN) + len(CASES) + len(KEPT_OUT) - len(clean) - len(cases) - len(kept_out)
    if "--keep" in argv:   # write the clean fixture where another tool (the pack dry run) can read it
        keep = Path(argv[argv.index("--keep") + 1]).resolve()
        for p in (keep, Path(str(keep) + "-ref")):
            if p.exists():
                shutil.rmtree(p)
        keep.mkdir(parents=True)
        make_fixture(keep, Path(str(keep) + "-ref"))
        print(f"clean fixture written to {keep}")
        return 0
    with tempfile.TemporaryDirectory(prefix="cia-harness-") as tmp:
        tmp = Path(tmp)
        good, ref = tmp / "good", tmp / "ref"
        good.mkdir()
        make_fixture(good, ref)
        if skipped:   # said even with -q: the summary below counts fewer checks than usual
            print(f"  • node is not installed: {skipped} app pack dry-run check(s) skipped ({DRY})")
        for cmd in clean:
            rc, out = run(good, ref, cmd)
            ok = rc == 0
            if not ok:
                failures.append(f"the clean fixture fails {' '.join(cmd)}:\n{out.strip()[-1500:]}")
            if not quiet:
                print(f"  {'✓' if ok else '✗'} clean fixture passes {' '.join(cmd)}")
        # Builders must leave out an item that is not testable yet.
        rc, out = run(good, ref, ["build_challenge.py", "--check"])
        before = out.split("testable today ")[1].split(" ")[0] if "testable today " in out else "?"
        case = tmp / "case"
        shutil.copytree(good, case)
        edit(case, "cia2/originals/d1.json", lambda d: d["questions"][0].update(
            framework_ref=STD + "; " + TOPICAL, testable_from="2027-03-01"))
        run(case, ref, ["build_challenge.py"])
        rc, out = run(case, ref, ["build_challenge.py", "--check"])
        after = out.split("testable today ")[1].split(" ")[0] if "testable today " in out else "?"
        ok = before.isdigit() and after.isdigit() and int(after) == int(before) - 1
        if not ok:
            failures.append(f"a not-yet-testable item was not left out of the testable count ({before} -> {after})")
        if not quiet:
            print(f"  {'✓' if ok else '✗'} a not-yet-testable question is left out of the Challenge mock pool")
        shutil.rmtree(case)
        shutil.copytree(good, case)
        import contextlib, io
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            retag(case)
        ok = "retired id not reused" in buf.getvalue()
        if not ok:
            failures.append("Challenge ids: " + buf.getvalue().strip())
        if not quiet:
            print(f"  {'✓' if ok else '✗'} a retired Challenge id is never given to another question")
        for name, cmd, fault, expect in cases:
            shutil.rmtree(case)
            shutil.copytree(good, case)
            fault(case)
            rc, out = run(case, ref, cmd)
            ok = rc != 0 and expect in out
            if not ok:
                failures.append(f"PLANTED FAULT GOT THROUGH: {name} ({' '.join(cmd)} exit {rc}, wanted '{expect}')\n"
                                f"{out.strip()[-600:]}")
            if not quiet:
                print(f"  {'✓' if ok else '✗'} {Path(cmd[0]).stem} stops: {name}")
        for name, cmd, fault, expect in kept_out:
            shutil.rmtree(case)
            shutil.copytree(good, case)
            fault(case)
            rc, out = run(case, ref, cmd)
            ok = rc == 0 and expect in out
            if not ok:
                failures.append(f"PLANTED FAULT NOT HANDLED: {name} ({' '.join(cmd)} exit {rc}, wanted exit 0 and "
                                f"'{expect}')\n{out.strip()[-600:]}")
            if not quiet:
                print(f"  {'✓' if ok else '✗'} {Path(cmd[0]).stem} handles: {name}")
    for f in failures:
        print(f"ERROR {f}")
    total = len(cases) + len(kept_out) + 2
    dirty = sum(1 for f in failures if f.startswith("the clean"))
    print(f"prove_harness: {total - (len(failures) - dirty)} of {total} planted faults stopped · "
          f"clean fixture passes {len(clean) - dirty} of {len(clean)} gates")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
