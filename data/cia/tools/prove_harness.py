#!/usr/bin/env python3
"""Prove the CIA harness: plant one fault per rule and fail if any gets through.

A gate that has never been seen to fail is not a gate. This test builds a small
CLEAN fixture course in a temp folder (made-up content, a made-up citation
library and a made-up "official" reference text, so nothing of The IIA's is
stored here), checks that every gate passes on it, then, one fault at a time,
breaks a fresh copy and checks that the right gate stops it with the right
message. It runs in scripts/verify_repo.sh on every session start.

The fixture uses the real shared/outline.json and shared/stale_terms.json, so
the test also notices when those files stop making sense. It is its own
throwaway git repository with one commit on `main`, so check_ids.py (which
compares the working tree with main) can be proved on it.

Three tables, one row per check: what is planted, the gate, the fault, the text
the gate must print (and, where given, text it must NOT print):
  CASES   the gate must FAIL and print the text. The text is chosen so that the
          case cannot pass for another reason: it names the rule, and often the
          very words or id that were planted.
  PASSES  the gate must PASS and print the text: a control (wording that must
          not be flagged, a fault a builder handles by leaving the item out).
  SAYS    only the text is judged, not the exit code: for the shared linters
          and the gate runner, which the small fixture cannot pass as a whole.
A few checks need more than one command; they are the functions in SCRIPTED.

The app pack dry run (scripts/cia_pack_dry_run.cjs, a node script) is proved
here too: the clean fixture must pass it, so the fixture's notes and principle
carry every field the phone app's builders ask for. Without `node` (or `git`)
the checks that need it are skipped with a printed note and left out of the counts.

Usage:
  python3 data/cia/tools/prove_harness.py        # one line per planted fault
  python3 data/cia/tools/prove_harness.py -q     # only the summary line (and any failure)
  python3 data/cia/tools/prove_harness.py --keep DIR   # also leave the clean fixture in DIR (and DIR-ref)
--keep never deletes anything: DIR and DIR-ref must be missing or empty, and outside the repository.
Exit 1 if a planted fault gets through, or if the clean fixture does not pass.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cia_common as c

TOOLS = Path(__file__).resolve().parent
DRY = "cia_pack_dry_run.cjs"      # the app pack dry run: a node script in scripts/, not a tool in this folder
NODE = shutil.which("node")
GIT = shutil.which("git")
TODAY = "2026-11-19"
STD = "Fixture Standards (2024), Standard 1.1 First Fixture Standard"
LONG_TITLE = "Standard 1.2 Keeping the Planted Widget Register Ready for Harness Review"
STD2 = "Fixture Standards (2024), " + LONG_TITLE
TOPICAL = "Third-Party Topical Requirement"
REF_DEF = "An entirely invented phrase that the harness plants so that copied wording can be caught reliably."
REF_DEF2 = "A second made-up entry that only exists so the top of a page can be tested by the harness."
REF_LINE = "Describe the invented purpose of planted widget auditing for harness tests"
# A sentence and a syllabus line made mostly of terms of art: counted with those terms collapsed
# to one word each, a copy of them is a short run; counted in plain words it is a long one.
REF_ART = ("A widget inspector tells the chief audit executive that the internal audit function keeps its quality "
           "assurance and improvement program beside the internal audit charter.")
REF_LINE_ART = "Describe how the internal audit function supports the chief audit executive in planted widget tests"
# Prose that holds the words of LONG_TITLE without the number in front: copying, not citing.
REF_PROSE = "The inspector insists on keeping the planted widget register ready for harness review before each visit."
REF_STANDARDS = (f"Fixture glossary\n\n     widget audit – {REF_DEF}\n\n{REF_ART}\n\n{LONG_TITLE}\n\n{REF_PROSE}\n")
# Eight different findings, so that a renumbered item shows up as another question under the old id.
STEMS = [
    "During a review of purchasing at {org}, an internal auditor finds that a required approval step is often "
    "skipped. What should the internal auditor do FIRST?",
    "Overtime at {org} was paid for three months with no supervisor sign-off, the payroll records show. Which step "
    "should the internal auditor take FIRST?",
    "An internal auditor at {org} sees that inventory counts were changed after the count sheets were signed. What "
    "is the BEST first move for the internal auditor?",
    "Travel claims at {org} are being paid without receipts. Before anything else is written up, what should the "
    "internal auditor do FIRST?",
    "New vendors at {org} were set up by the same clerk who pays them, an internal auditor learns. What should the "
    "internal auditor do FIRST with this?",
    "Cash drawers at {org} are counted by the cashiers themselves at the end of each shift. Which action is the "
    "internal auditor's BEST first step?",
    "Several contracts at {org} renewed on their own with no one reviewing the terms. What does the internal "
    "auditor do FIRST on finding this?",
    "Old equipment at {org} was sold with no record of who approved the sale. What is the FIRST thing the internal "
    "auditor should do?"]
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
        "question": STEMS[i % 8].format(org=ORGS[i % 5]),
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
        c.write_json(root / pack / "originals" / "d1.json", section_file(pack, 1, sec, qs))
        npath = root / pack / "notes" / "d1.json"
        if not npath.exists():
            c.write_json(npath, notes(1, sec["name"], [code for code, _ in codes], topics))


def section_file(pack, d, sec, qs):
    return {"_meta": {"comment": "Harness fixture. Made-up content.", "schema_version": 1},
            "domain": d, "domain_name": sec["name"], "weight": f"{sec['weight']}%", "questions": qs}


def make_fixture(root, ref):
    outline = c.load_outline(c.CIA)
    shutil.copytree(c.CIA / "shared", root / "shared", ignore=shutil.ignore_patterns("glossary.json", "principles.json",
                    "currency.json", "_framework_library.md"))
    (root / "shared" / "_framework_library.md").write_text(
        f"# Fixture library\n\n## Verified: opened {TODAY} Fixture Standards (https://example.org/standards)\n"
        f"- {STD}\n- {STD2}\n- {TOPICAL}\n\n## Likely: not opened (fixture)\n- Fixture Textbook, 1st edition\n",
        encoding="utf-8")
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
        # A term the notes define too, in the notes' own words.
        {"id": 1, "term": "widget audit", "acronym": "", "def": "A made-up review used only by the harness fixture.",
         "scopeNotes": "", "category": "Fixture", "packs": {"cia1": 1, "ciac": 1}, "notes": ["1A1.1"], "related": [2]},
        # A term the notes do not define, with every optional field: a term of the whole Challenge exam (0)
        # and an older name, which is built into the packs.
        {"id": 2, "term": "widget ledger", "acronym": "", "def": "A made-up list of the widgets a fixture inspector has counted.",
         "scopeNotes": "", "category": "Fixture", "packs": {"cia1": 1, "ciac": 0}, "notes": ["1A2.1"], "related": [1],
         "formerly": ["widget book"]}])
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
    ref.mkdir(exist_ok=True)
    (ref / "standards_fixture.txt").write_text(REF_STANDARDS, encoding="utf-8")
    (ref / "fixture_syllabus.txt").write_text(f" 1. {REF_LINE}\n a. Explain the fixture\n 2. {REF_LINE_ART}\n",
                                              encoding="utf-8")
    rebuild(root)
    if GIT:
        commit(root)


def git(root, *args):
    """git in the fixture's own repository, whatever the machine's git settings are."""
    subprocess.run(["git", "-C", str(root), "-c", "user.name=harness", "-c", "user.email=harness@example.invalid",
                    "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", *args], check=True, capture_output=True)


def commit(root):
    """Record the tree as the fixture's `main`: the base check_ids.py compares the working tree with."""
    if not (root / ".git").exists():
        git(root, "init", "-q")
        git(root, "symbolic-ref", "HEAD", "refs/heads/main")
    git(root, "add", "-A")
    git(root, "commit", "-q", "-m", "harness fixture")


def run(root, ref, cmd):
    """Run one gate on a fixture and return (exit code, output).

    In `cmd`: {root}, {ref} and {repo} are filled in; a leading NAME=value sets an environment
    variable; "@node" and "@git" only say what the row needs. The CIA tools get --root and
    --today, and check_originality.py gets the made-up reference with --require and
    --fixture-ref ("--real-ref" in the row leaves --fixture-ref out, to test the completeness rule).
    """
    def fill(a):
        return a.replace("{root}", str(root)).replace("{ref}", str(ref)).replace("{repo}", str(c.REPO))
    cmd = [fill(a) for a in cmd if not a.startswith("@")]
    scratch = Path(root).parent
    env = dict(os.environ, CIA_PACK_OUT=str(scratch / "pack-dry-run-out"), CIA_REF_DIR=str(scratch / "no-reference-here"))
    while re.match(r"[A-Z_]+=", cmd[0]):
        name, value = cmd.pop(0).split("=", 1)
        env[name] = value
    tool, rest = cmd[0], cmd[1:]
    std = ["--root", str(root), "--today", TODAY]
    if tool.endswith(".cjs"):         # the pack dry run: node, scripts/, the same --root and --today
        argv = [NODE, str(c.REPO / "scripts" / tool), *rest, *std]
    elif tool == "run_gates.sh":      # the lines scripts/verify_repo.sh prints
        argv = ["bash", str(TOOLS / tool), *rest, *std]
    elif tool in ("lint_notes.py", "lint_principles.py"):   # the shared linters take their paths in the row
        argv = [sys.executable, str(c.REPO / "scripts" / tool), *rest]
    elif tool == "prove_harness.py":
        argv = [sys.executable, str(TOOLS / tool), *rest]
    else:
        extra = []
        if tool == "check_originality.py":
            extra = ["--ref", str(ref), "--require"] + ([] if "--real-ref" in rest else ["--fixture-ref"])
            rest = [a for a in rest if a != "--real-ref"]
        argv = [sys.executable, str(TOOLS / tool), *rest, *extra, *std]
    p = subprocess.run(argv, capture_output=True, text=True, env=env)
    return p.returncode, p.stdout + p.stderr


def rebuild(root):
    """Run the three builders, as an author does after an edit."""
    for tool in ("build_packs.py", "build_challenge.py", "sync_practice_ids.py"):
        run(root, None, [tool])


def edit(root, rel, fn):
    data = c.read_json(root / rel)
    fn(data)
    c.write_json(root / rel, data)


def q0(fn, rel="cia1/originals/d1.json", n=0):
    """A fault in one question of a file."""
    return lambda root: edit(root, rel, lambda d: fn(d["questions"][n]))


def setf(field, value):
    """Set one field of whatever the fault is applied to."""
    return lambda obj: obj.__setitem__(field, value)


def sub0(fn, rel="cia1/notes/d1.json"):
    """A fault in the first sub-topic of a notes file."""
    return lambda root: edit(root, rel, lambda d: fn(d["topics"][0]["subtopics"][0]))


def key_longest_everywhere(data):
    """Make the key the single longest option of every question in a file."""
    for q in data["questions"]:
        q["options"][q["correct"]] = max(q["options"].values(), key=len) + " now"


def then(*faults):
    return lambda root: [f(root) for f in faults]


def regen(**kw):
    return lambda root: write_bank(root, c.load_outline(root), **kw)


def lens_fault(q):
    q["options"][q["correct"]] = "Implement the missing approval step in the system"


def wrong_key(q):
    q["correct"] = next(k for k in "ABCD" if k != q["correct"])


def reorder(q):
    """The same fields, with `domain` moved after `subtopic`."""
    moved = {k: q[k] for k in ["id", "subtopic", "domain"]}
    moved.update({k: v for k, v in q.items() if k not in moved})
    q.clear()
    q.update(moved)


def retired_not_last(q):
    style = q.pop("style_version")
    q.update(retired=True, style_version=style)


def no_closest(q):
    for k, v in q["wrong_explanations"].items():
        q["wrong_explanations"][k] = v.replace("Closest choice: the", "The")


def library(text):
    return lambda root: (root / "shared" / "_framework_library.md").write_text(text, encoding="utf-8")


def retire(rel="cia2/originals/d1.json", n=0):
    """Mark one question retired (the field goes last) and rebuild, as an author would."""
    return then(q0(setf("retired", True), rel, n), rebuild)


def delete_and_renumber(root):
    """Delete the first cia1 question and renumber the rest, then rebuild: every other gate
    still passes, and each id now belongs to the next question."""
    def fn(d):
        d["questions"].pop(0)
        for n, q in enumerate(d["questions"], 1):
            q["id"] = f"cia1_d1_{n:03d}"
    edit(root, "cia1/originals/d1.json", fn)
    rebuild(root)


def drop_rows(status):
    return lambda root: edit(root, "ciac/id_map.json",
                             lambda d: d.__setitem__("map", [e for e in d["map"] if e["status"] != status]))


def revive(root):
    edit(root, "ciac/id_map.json", lambda d: [e.__setitem__("status", "active") for e in d["map"]])


def add_fraud_section(root):
    """cia1 section D: four questions on 1D1 tagged for the Challenge-only fraud topic C3, and their note."""
    outline = c.load_outline(root)
    topics, sec = c.part_topics(outline), c.exam(outline, "cia1")["sections"][3]
    qs = [item("cia1", 4, j + 1, "1D1", topics["1D1"]["title"], j, ref="C3") for j in range(4)]
    c.write_json(root / "cia1" / "originals" / "d4.json", section_file("cia1", 4, sec, qs))
    c.write_json(root / "cia1" / "notes" / "d4.json", notes(4, sec["name"], ["1D1"], topics))
    rebuild(root)


def old_term_entry(category):
    """A glossary entry that IS an old term, built into the packs: allowed only when its
    category marks it as an "Older term"."""
    def fault(root):
        edit(root, "shared/glossary.json", lambda d: d.append(
            {"id": 3, "term": "internal audit activity", "acronym": "", "def": "The name the 2017 Standards used.",
             "scopeNotes": "", "category": category, "packs": {"cia1": 1}}))
        rebuild(root)
    return fault


def isaca_note(rel):
    return lambda r: c.write_json(r / rel, {"note": "An IS auditor would look in ITAF."})


def empty_course(root):
    """A course with nothing written yet and no git history: every gate passes, two cannot really run."""
    for name in (*c.PACKS, ".git"):
        shutil.rmtree(root / name, ignore_errors=True)
    for name in ("glossary.json", "principles.json"):
        (root / "shared" / name).unlink()


def alt_ref(fn=None, copy=True):
    """A fault that gives the case its own reference folder, {root}-ref: a copy of the made-up
    reference (or an empty folder), changed by fn."""
    def fault(root):
        dest = Path(str(root) + "-ref")
        if copy:
            shutil.copytree(root.parent / "ref", dest)
        else:
            dest.mkdir()
        if fn:
            fn(dest)
    return fault


def put(name, text, days_old=0):
    """Write one reference text, optionally dated some days before TODAY."""
    def fn(dest):
        (dest / name).write_text(text, encoding="utf-8")
        if days_old:
            when = time.mktime(time.strptime(TODAY, "%Y-%m-%d")) + 12 * 3600 - days_old * 86400   # noon that day
            os.utime(dest / name, (when, when))
    return fn


def all_of(*fns):
    return lambda dest: [fn(dest) for fn in fns]


def rename(old, new):
    return lambda dest: (dest / old).rename(dest / new)


# A Standards text as pdftotext writes it: a form feed at each page break, the running footer
# above it, the "Glossary" heading on the first entry's page, an entry at the top of page 2.
PAGED = (f"\f     Glossary\n     widget audit – {REF_DEF}\n\n     other term – Filler for the fixture.\n\n\n"
         "10   Glossary                         ©2024, The Fixture Institute. All Rights Reserved.\n"
         "                                   Fixture copy for one reader only.\n"
         f"\f     page top – {REF_DEF2}\n\n     last term – More filler for the fixture.\n")
# An entry printed with no space after its dash ("term –Definition"): one entry of the opened Standards
# is, and until 20 Nov 2026 the parser did not read it.
TIGHT = f"Fixture glossary\n\n     widget audit – {REF_DEF}\n\n     tight dash –{REF_DEF2}\n"
SEVEN = ["standards_2024", "p1_syllabus", "p2_syllabus", "p3_syllabus", "challenge_syllabus",
         "sop_three_lines_2026", "sop_erm_2026"]
LETTERS = "abcdefghijklmnopqrstuvwxyz"
N_GLOSSARY = 57                   # check_originality.py's MIN_GLOSSARY, written out again so a change there is noticed here


def full_glossary(n):
    """A made-up Standards glossary of n entries; the first has no space after its dash."""
    return "Fixture glossary\n\n" + "".join(
        f"     widget {LETTERS[i // 26]}{LETTERS[i % 26]} –{' ' if i else ''}Made-up entry number {i} of the fixture.\n\n"
        for i in range(n))


def complete_ref(entries=N_GLOSSARY):
    return all_of(put("standards_2024.txt", full_glossary(entries)), *(put(f"{n}.txt", f" 1. {REF_LINE}\n") for n in SEVEN[1:]))


LINT_NOTES = ["lint_notes.py", "{root}/cia1/notes/d1.json", "--outline", "{repo}/docs/content/CIA_BLUEPRINT.md",
              "--bank", "{root}/cia1/originals", "--part"]
CONTROLS = ("Standard 7.1 and Standards 2024 name internal audit activities, and the IPPF is still described. Set "
            "performance standards for staff, use core principles of ethics and implementation guidance, and ask "
            "why is auditor independence important.")
ORIG, STALE, CUR, CIA_, IDS = (["check_originality.py"], ["check_stale_terms.py"], ["check_currency.py"],
                               ["check_cia.py"], ["check_ids.py"])
GLOSS, PACKS_CHECK = ["check_glossary.py"], ["build_packs.py", "--check"]
MARK = "def_differs_from_notes"   # written out here, not imported: the proof does not lean on the code it proves
OTHER_DEF = "A different made-up meaning that no fixture note gives."
NEW_REF = ["check_originality.py", "--ref", "{root}-ref"]
explain = lambda text: q0(lambda q: q.__setitem__("correct_explanation", q["correct_explanation"] + " " + text))
pre_read = lambda text, n=0, rel="cia1/originals/d1.json": q0(setf("pre_read", text), rel, n)
# The fixture's shared glossary: term 0 is "widget audit" (the notes define it too), term 1 is "widget ledger"
# (they do not; it has an older name).
gloss = lambda n, field, value: (lambda r: edit(r, "shared/glossary.json", lambda d: d[n].__setitem__(field, value)))
gloss0 = lambda field, value: gloss(0, field, value)
gloss_drop = lambda field, n=0: (lambda r: edit(r, "shared/glossary.json", lambda d: d[n].pop(field)))
gloss_add = lambda **changes: (lambda r: edit(r, "shared/glossary.json", lambda d: d.append(dict(d[0], **changes))))
notes_words = lambda fn, rel="cia1/notes/d1.json": (lambda r: edit(r, rel, lambda d: fn(d["key_terminologies"])))
fact0 = lambda field, value: (lambda r: edit(r, "shared/currency.json", lambda d: d["facts"][0].__setitem__(field, value)))
topical0 = lambda field, value: (lambda r: edit(r, "shared/currency.json",
                                                lambda d: d["topical_requirements"][0].__setitem__(field, value)))
outline_topic = lambda exam, field, value: (lambda r: edit(r, "shared/outline.json", lambda d: d["exams"][exam][
    "sections"][0]["topics"][0].__setitem__(field, value)))
LIB = f"## Verified: opened {TODAY} Fixture Standards (https://example.org/standards)\n- {STD}\n- {STD2}\n- {TOPICAL}\n"

# (what is planted, the gate that must stop it, the fault, text the gate must print[, text it must not print])
CASES = [
    # ── old-syllabus wording ──
    ("a 2019 term in a question option", STALE,
     q0(lambda q: q["options"].__setitem__("A", "Ask the internal audit activity to decide")), "is 2019 wording"),
    ("a 2017 Standard number in a note", STALE, sub0(setf("definition", "Standard 1100 requires independence.")),
     "is 2019 wording"),
    ("an ISACA role name in an explanation", STALE, explain("The IS auditor reports it."), "is isaca wording"),
    ("'consulting services' instead of the house term", STALE, pre_read("Think about consulting services."),
     "is house wording"),
    ("a banned term with no evidence in the term list", STALE,
     lambda r: edit(r, "shared/stale_terms.json", lambda d: d["terms"][0].__setitem__("evidence", "")), "needs a class"),
    ("a term whose case_sensitive is not true or false", STALE,
     lambda r: edit(r, "shared/stale_terms.json", lambda d: d["terms"][0].__setitem__("case_sensitive", "yes")),
     "case_sensitive must be true or false"),
    ("an old term as a KEY of a notes word list (what the phone Glossary shows)", STALE,
     lambda r: edit(r, "cia1/notes/d1.json", lambda d: d["key_terminologies"].__setitem__(
         "Internal audit activity", "The team that carries out the reviews.")),
     "key_terminologies (key): 'Internal audit activity' is 2019 wording"),
    ("an old term split by two spaces", STALE, pre_read("Ask what the internal audit  activity decides."),
     "'internal audit activity' is 2019 wording"),
    ("an old term held together by a non-breaking space", STALE, pre_read("Ask what the internal audit activity decides."),
     "'internal audit activity' is 2019 wording"),
    ("an old term joined by hyphens", STALE, pre_read("Think of the Three-Lines-of-Defense picture."),
     "'Three Lines of Defense' is 2019 wording"),
    ("'second line of defence'", STALE, pre_read("Think about the second line of defence."),
     "'second line of defence' is 2019 wording"),
    ("a 2017 sub-number such as 2010.A1", STALE, pre_read("See 2010.A1 for assurance work."), "'2010.A1' is 2019 wording"),
    ("'the 1300 series'", STALE, pre_read("Quality sits in the 1300 series."), "'1300 series' is 2019 wording"),
    ("'2000-series'", STALE, pre_read("Managing the function is 2000-series material."), "'2000 series' is 2019 wording"),
    ("the old name 'Core Principles' with its capitals", STALE, pre_read("Recall the Core Principles."),
     "'Core Principles' is 2019 wording"),
    # The next three are the faults that the three allowances in PASSES let through, without the allowance.
    ("a glossary entry for an old term that is not marked 'Older term'", STALE, old_term_entry("Fixture"),
     "shared/glossary.json 3 [2].term: 'internal audit activity' is 2019 wording"),
    ("an old term in a glossary field that is not a skipped key", STALE, gloss0("scopeNotes", "Once the internal audit activity."),
     "scopeNotes: 'internal audit activity' is 2019 wording"),
    # Term 1 has an older name, which is built into the packs: only the `formerly` key is skipped there.
    ("an old term in the def of a term that has older names, read in the built pack file", STALE,
     then(gloss(1, "def", "A list once kept by the internal audit activity."), rebuild),
     "cia1/glossary.json 2 [1].def: 'internal audit activity' is 2019 wording"),
    ("ISACA terms in a Challenge notes file that is not on the allow list", STALE, isaca_note("ciac/notes/other.json"),
     "ciac/notes/other.json"),
    ("an old term in a retired question (still read)", STALE,
     then(retire(), pre_read("Ask the internal audit activity.", rel="cia2/originals/d1.json")),
     "cia2_d1_001 questions[0].pre_read: 'internal audit activity' is 2019 wording"),
    # ── structure ──
    ("a wrong key letter", CIA_, q0(wrong_key), "Final two tip should start"),
    ("a missing explanation for one wrong option", CIA_,
     q0(lambda q: q["wrong_explanations"].__setitem__(sorted(q["wrong_explanations"])[0], "")), "has no real explanation"),
    ("an explanation written for the key instead of a distractor", CIA_,
     q0(lambda q: q["wrong_explanations"].__setitem__(q["correct"], "This one is actually right, so it needs no text.")),
     "must cover exactly the three distractors"),
    ("a missing explanation for the key", CIA_, q0(setf("correct_explanation", "")), "correct_explanation is missing"),
    ("a citation that is not in the library", CIA_, q0(setf("framework_ref", "Some Guide Nobody Opened, chapter 4")),
     "not in the library"),
    ("a key that rests on an unopened (Likely) source", CIA_,
     q0(setf("framework_ref", "Fixture Textbook, 1st edition; " + STD)), "must be a Verified"),
    ("a key that rests on an opened source that is not an exam reference (Background)", CIA_,
     then(library(LIB + "## Background: opened 2026-11-19 Fixture Framework (https://example.org/fw)\n- Fixture Framework, Summary\n"),
          q0(setf("framework_ref", "Fixture Framework, Summary; " + STD))), "must be a Verified"),
    ("a key that rests on a public Knowledge source outside the topics it was opened for", CIA_,
     then(library(LIB + "## Knowledge: opened 2026-11-26 Fixture Public Guide; topics 2B5 (https://example.org/g)\n"
                        "- Fixture Public Guide, section 2\n"),
          q0(setf("framework_ref", "Fixture Public Guide, section 2; " + STD))), "Knowledge source for topics 2B5 only"),
    ("a Knowledge heading that names a topic the outline does not have", CIA_,
     library(LIB + "## Knowledge: opened 2026-11-26 Fixture Public Guide; topics 2A9 (https://example.org/g)\n"
                   "- Fixture Public Guide, section 2\n"), "names topic 2A9, which is not a Part topic"),
    ("a Knowledge heading that names no topics", CIA_,
     library(LIB + "## Knowledge: opened 2026-11-26 Fixture Public Guide (https://example.org/g)\n"
                   "- Fixture Public Guide, section 2\n"), "a Knowledge heading needs 'topics"),
    ("a Knowledge heading with no opened date", CIA_,
     library(LIB + "## Knowledge: Fixture Public Guide; topics 1A1 (https://example.org/g)\n"
                   "- Fixture Public Guide, section 2\n"), "a Knowledge heading needs 'opened YYYY-MM-DD'"),
    ("a Background heading with no opened date", CIA_,
     library(LIB + "## Background: Fixture Framework\n- Fixture Framework, Summary\n"), "a Background heading needs 'opened YYYY-MM-DD'"),
    ("an empty citation", CIA_, q0(setf("framework_ref", "")), "framework_ref is empty"),
    ("an ISACA-lens answer: the auditor implements the fix", CIA_, q0(lens_fault), "lens:"),
    ("a question that cites a note that does not exist", CIA_,
     q0(setf("_provenance", "Authored from concept: notes 1A1.9, fixture.")), "which does not exist"),
    ("a question filed under another topic's note", CIA_,
     q0(setf("_provenance", "Authored from concept: notes 1A2.1, fixture.")), "but the item is on topic"),
    ("a provenance line that does not start 'Authored from concept:'", CIA_,
     q0(setf("_provenance", "Adapted from notes 1A1.1, fixture.")), "_provenance must start 'Authored from concept:'"),
    ("a question whose notes file is missing", CIA_, lambda r: (r / "cia2" / "notes" / "d1.json").unlink(),
     "notes file cia2/notes/d1.json does not exist"),
    ("a Challenge tag on a topic the Challenge Exam does not have", CIA_, q0(setf("challenge_ref", "B2")),
     "is not valid for topic"),
    ("a wrong id", CIA_, q0(setf("id", "cia1_d1_099")), "id should be"),
    ("a wrong section number on a question", CIA_, q0(setf("domain", 2)), "domain number is wrong"),
    ("a topic code the section does not have", CIA_, q0(setf("subtopic", "1B1 Purpose of Internal Auditing. Case")),
     "is not '1A1 <outline title>. Label' for a topic in the outline"),
    ("a testable date that is not a date", CIA_, q0(setf("testable_from", "March 2027")),
     "testable_from must be null or an ISO date"),
    ("three options instead of four", CIA_, q0(lambda q: q["options"].pop("D")), "options must be A-D with a key among them"),
    ("an empty key concept", CIA_, q0(setf("key_concept", " ")), "key_concept is empty"),
    ("a file header with the wrong weight", CIA_, lambda r: edit(r, "cia1/originals/d1.json", setf("weight", "99%")),
     "cia1 d1: file header should be domain 1"),
    ("a gendered pronoun in a note", CIA_, sub0(setf("example", "The auditor asks the manager what she saw.")),
     "notes 1A1.1: gendered pronoun 'she'"),
    ("fields out of the house order", CIA_, q0(reorder), "fields are out of the house order"),
    ("difficulty and bloom level that disagree", CIA_, q0(setf("bloom_level", "Analysis")),
     "difficulty and bloom_level do not match"),
    ("a style version other than 2", CIA_, q0(setf("style_version", 1)), "style_version must be 2"),
    ("'retired' set to false", CIA_, q0(lambda q: q.__setitem__("retired", False)), "may only be true"),
    ("'retired' not as the last field", CIA_, q0(retired_not_last), "when present, comes last"),
    ("a tip without its prefix", CIA_, q0(lambda q: q["tips"].__setitem__(2, "Remember who runs the area.")),
     "tips must be Eliminate / Final two / Exam cue"),
    # Question 2 is keyed B, with runner-up A and C and D to eliminate.
    ("an Eliminate tip that names the key after a semicolon", CIA_,
     q0(lambda q: q["tips"].__setitem__(0, "Eliminate: C and D, because both leave the gap open; B is wrong too."), n=1),
     "Eliminate tip names the key B"),
    ("an Eliminate tip that names one option, and the article 'A'", CIA_,
     q0(lambda q: q["tips"].__setitem__(0, "Eliminate: C, because a procedure is the area's own job. A manager owns it."), n=1),
     "should name two wrong letters, names ['C']"),
    ("an Eliminate tip that names the runner-up", CIA_,
     q0(lambda q: q["tips"].__setitem__(0, "Eliminate: A and C, because neither confirms the facts with the area."), n=1),
     "the runner-up is also named in the Eliminate tip"),
    ("'Closest choice:' missing from the runner-up", CIA_, q0(no_closest), "'Closest choice:' should open only the runner-up"),
    ("a key far longer than every distractor", CIA_,
     q0(lambda q: q["options"].__setitem__(q["correct"], q["options"][q["correct"]] + " today, in person")),
     "characters longer than the longest distractor"),
    ("a principle tag that is not in the shared principles", CIA_, q0(setf("principle_id", "no-such-principle")),
     "is not in shared/principles.json"),
    ("a topic label that is not the outline title", CIA_, q0(setf("subtopic", "1A1 Definition of auditing. Case")),
     "should be the outline title"),
    ("a gendered pronoun", CIA_, pre_read("Think about who he must tell first."), "gendered pronoun"),
    ("every key on the same letter", CIA_, regen(key="allA"), "key letters unbalanced"),
    ("the key is usually the longest option", CIA_, regen(lengths="long"), "pick-longest outside"),
    ("the key is usually the shortest option", CIA_, regen(lengths="short"), "pick-shortest above"),
    ("a difficulty mix that ignores the syllabus verb", CIA_, regen(depth="allAnalysis"), "does not fit its verb"),
    ("an outline with a topic missing", CIA_,
     lambda r: edit(r, "shared/outline.json", lambda d: d["exams"][1]["sections"][2]["topics"].pop()), "the syllabus has"),
    ("an outline whose exams are out of order", CIA_,
     lambda r: edit(r, "shared/outline.json", lambda d: d["exams"].reverse()), "outline: exams are"),
    ("section weights that do not add up to 100", CIA_,
     lambda r: edit(r, "shared/outline.json", lambda d: d["exams"][0]["sections"][0].__setitem__("weight", 36)),
     "outline cia1: section weights do not sum to 100"),
    ("a topic verb that is in no depth class", CIA_, outline_topic(0, "verb", "Ponder"), "verb 'Ponder' is not in a depth class"),
    ("a topic title that is a sentence", CIA_, outline_topic(0, "title", "The purpose. And more"),
     "outline 1A1: title must be short"),
    ("a topic code that does not follow part, section, number", CIA_, outline_topic(0, "code", "1A9"),
     "outline: topic code 1A9 should be 1A1"),
    ("two Part topics tagged with one Challenge topic", CIA_, outline_topic(0, "challenge", "A1"),
     "but the Part topics tagged A1 are ['1A1', '1A2']"),
    ("a Part topic tagged with a Challenge topic that does not exist", CIA_, outline_topic(0, "challenge", "Z9"),
     "tagged with unknown Challenge topic Z9"),
    ("a Challenge topic that points at the wrong Part topic", CIA_, outline_topic(3, "part_code", "1A1"),
     "Challenge A1 maps to 1A1"),
    ("a Verified library section with no opened date", CIA_,
     library(f"## Verified: Fixture Standards\n- {STD}\n- {STD2}\n- {TOPICAL}\n## Likely: x\n- Fixture Textbook, 1st edition\n"),
     "needs 'opened YYYY-MM-DD'"),
    ("no citation library at all", CIA_, lambda r: (r / "shared" / "_framework_library.md").unlink(),
     "library: _framework_library.md is missing"),
    ("a library bullet outside any section", CIA_, library("- Stray Source, 2nd edition\n" + LIB),
     "bullet outside a Verified or Likely section: Stray Source"),
    ("a library bullet listed twice", CIA_, library(LIB + f"- {STD}\n"), "duplicate bullet"),
    ("a Likely heading written '##Likely'", CIA_, library(LIB + "##Likely: x\n- Fixture Textbook, 1st edition\n"),
     "write the heading as '## Likely: ...'"),
    ("a key resting on a bullet under '### Likely' (once read as Verified)", CIA_,
     then(library(LIB + "### Likely: x\n- Fixture Textbook, 1st edition\n"),
          q0(setf("framework_ref", "Fixture Textbook, 1st edition; " + STD))), "must be a Verified"),
    # ── the shared glossary ──
    ("a glossary term related to an id that does not exist", GLOSS, gloss0("related", [2, 99]),
     "id 1 (widget audit): related 99 is not a glossary id"),
    ("a glossary term related to itself", GLOSS, gloss0("related", [1]), "id 1 (widget audit): related names the term itself"),
    ("related terms given by name, not by id", GLOSS, gloss0("related", ["widget ledger"]),
     "id 1 (widget audit): related must be a list of glossary ids"),
    ("a notes code that no notes file has", GLOSS, gloss0("notes", ["1A1.1", "1A1.9"]),
     "id 1 (widget audit): notes code 1A1.9 is in no notes file of cia1"),
    ("a notes code of a Part the term is not in (2A1.1 is a cia2 note)", GLOSS, gloss0("notes", ["2A1.1"]),
     "id 1 (widget audit): notes code 2A1.1 is in no notes file of cia1"),
    ("notes codes given as one string", GLOSS, gloss0("notes", "1A1.1"), "notes must be a list of notes sub-topic codes"),
    ("a term that is in no pack", GLOSS, gloss0("packs", {}), "id 1 (widget audit): packs is empty"),
    ("a pack key that is not a pack", GLOSS, gloss0("packs", {"cia1": 1, "cia4": 1}),
     "id 1 (widget audit): packs names 'cia4', which is not a pack"),
    ("a section number the pack does not have", GLOSS, gloss0("packs", {"cia1": 5}),
     "id 1 (widget audit): section 5 is not a section of cia1 (1 to 4"),
    ("section 0, the whole exam, in a Part pack", GLOSS, gloss0("packs", {"cia1": 0, "ciac": 0}),
     "section 0 is not a section of cia1 (1 to 4; 0, the whole exam, is for ciac only)"),
    ("a Challenge section number above its five sections", GLOSS, gloss0("packs", {"cia1": 1, "ciac": 6}),
     "section 6 is not a section of ciac (1 to 5, or 0 for a term of the whole exam)"),
    ("a section number written as a string", GLOSS, gloss0("packs", {"cia1": "1"}), "section '1' is not a section of cia1"),
    ("packs written as a list", GLOSS, gloss0("packs", ["cia1"]), "id 1 (widget audit): packs must be an object"),
    ("a glossary term with no `def` field (a named line, not a KeyError)", GLOSS, gloss_drop("def"),
     "id 1 (widget audit): missing def", "Traceback"),
    ("a glossary term with no `id` field (named by its place in the file)", GLOSS, gloss_drop("id"),
     "entry 1 (widget audit): missing id", "Traceback"),
    ("a glossary entry that is not an object", GLOSS,
     lambda r: edit(r, "shared/glossary.json", lambda d: d.append("widget")), "entry 3: must be an object", "Traceback"),
    ("a glossary that is not a list", GLOSS, lambda r: c.write_json(r / "shared" / "glossary.json", {"terms": []}),
     "must be a list of terms", "Traceback"),
    ("two glossary terms with one name, in different letter case", GLOSS, gloss_add(id=3, term="Widget Audit"),
     "id 3 (Widget Audit): term used twice, in any letter case (also id 1 (widget audit))"),
    ("two glossary terms with one id (the term is named)", GLOSS, gloss_add(term="second widget"),
     "id 1 (second widget): id used twice (also id 1 (widget audit))"),
    ("a glossary id that is not a number", GLOSS, gloss(1, "id", "2"), "id must be a whole number above 0, got '2'"),
    ("an empty definition", GLOSS, gloss(1, "def", "  "), "id 2 (widget ledger): def is empty"),
    ("an empty term", GLOSS, gloss(1, "term", " "), "id 2 (no term): term is empty"),
    ("an empty category", GLOSS, gloss(1, "category", ""), "id 2 (widget ledger): category is empty"),
    ("an acronym that is null, not an empty string", GLOSS, gloss(1, "acronym", None),
     "id 2 (widget ledger): acronym must be a string"),
    ("a misspelt optional field (it would be dropped unseen)", GLOSS, gloss(1, "formely", ["widget book"]),
     "id 2 (widget ledger): unknown field formely"),
    ("an older name that is an empty string", GLOSS, gloss(1, "formerly", ["widget book", " "]),
     "id 2 (widget ledger): formerly entry is empty"),
    ("an older name that is the term's own name", GLOSS, gloss(1, "formerly", ["Widget  Ledger"]),
     "id 2 (widget ledger): formerly repeats the term's own name"),
    ("older names given as one string", GLOSS, gloss(1, "formerly", "widget book"), "formerly must be a list of older names"),
    ("a definition that contradicts the notes' word list", GLOSS, gloss0("def", OTHER_DEF),
     "id 1 (widget audit): def differs from the notes' definition of this term (cia1/notes/d1.json key_terminologies"),
    ("a definition that contradicts a sub-topic's key term (the term is in no word list)", GLOSS,
     then(notes_words(lambda w: w.clear()), notes_words(lambda w: w.clear(), "cia2/notes/d1.json"), gloss0("def", OTHER_DEF)),
     "id 1 (widget audit): def differs from the notes' definition of this term (notes 1A1.1 key_terms"),
    ("a definition that contradicts another Part's notes, the name in other letter case", GLOSS,
     notes_words(lambda w: w.__setitem__("Widget  Ledger", "A made-up book of counted widgets."), "cia2/notes/d1.json"),
     "id 2 (widget ledger): def differs from the notes' definition of this term (cia2/notes/d1.json key_terminologies)"),
    ("the differs mark on a definition that is the notes' wording", GLOSS, gloss0(MARK, "The notes give the short form."),
     "id 1 (widget audit): def_differs_from_notes is set, but the def is the notes' wording"),
    ("the differs mark on a term the notes do not define", GLOSS, gloss(1, MARK, "The notes give the short form."),
     "id 2 (widget ledger): def_differs_from_notes is set, but the notes do not define this term"),
    ("the differs mark with no reason", GLOSS, then(gloss0("def", OTHER_DEF), gloss0(MARK, " ")),
     "id 1 (widget audit): def_differs_from_notes must be the reason"),
    # ── dated facts and Topical Requirements ──
    ("a question on a Topical Requirement that is not testable yet", CUR,
     q0(setf("framework_ref", STD + "; " + TOPICAL)), "testable_from is None, should be 2027-03-01 (it cites"),
    ("a question that NAMES such a requirement but cites only a Standard", CUR,
     pre_read("Think about the third party topical requirement."),
     "testable_from is None, should be 2027-03-01 (it names the Third-Party Topical Requirement)"),
    ("a date still set after the requirement became testable", ["check_currency.py", "--today", "2027-04-01"],
     q0(lambda q: q.update(framework_ref=STD + "; " + TOPICAL, testable_from="2027-03-01")),
     "testable_from is 2027-03-01, should be None"),
    ("a requirement whose library prefix matches no bullet", CUR, topical0("library_prefix", "Third Party Topical Requirement"),
     "starts no bullet in the citation library"),
    ("a requirement with no testable date (null)", CUR, topical0("testable_from", None),
     "third-party: testable_from is not an ISO date"),
    ("a dated fact nobody has re-checked for 200 days", ["check_currency.py", "--today", "2027-06-07"], lambda r: None,
     "re-open the source"),
    ("a fact checked on a date in the future", CUR, fact0("last_checked", "2036-11-19"), "is in the future"),
    ("a fact whose date is not a date", CUR, fact0("last_checked", "last week"), "last_checked is not an ISO date"),
    ("an exam length that disagrees with the outline", CUR, fact0("value", 999), "outline.json says"),
    ("section weights that disagree with the outline", CUR,
     lambda r: edit(r, "shared/currency.json", lambda d: d["facts"][2]["value"].__setitem__("A", 1)),
     "cia1.weights: currency.json says"),
    ("a fact with no source", CUR, fact0("source", ""), "no https source"),
    ("a fact with an unknown status", CUR, fact0("status", "probably"), "status must be one of"),
    ("two facts with one id", CUR, lambda r: edit(r, "shared/currency.json", lambda d: d["facts"].append(dict(d["facts"][0]))),
     "duplicate id"),
    ("an exam fact missing", CUR, lambda r: edit(r, "shared/currency.json", lambda d: d["facts"].pop(0)), "fact is missing"),
    ("a fact never opened, with --strict", ["check_currency.py", "--strict"], fact0("status", "search_only"),
     "ERROR cia1.questions: source is search_only"),
    # ── originality ──
    ("a glossary definition copied from the official text", ORIG, gloss0("def", REF_DEF), "tracks the Standards glossary"),
    ("a notes key term copied from the official text", ORIG,
     sub0(lambda s: s["key_terms"][0].__setitem__("definition", REF_DEF)), "tracks the Standards glossary"),
    ("a definition close by its shared 3-word phrases alone", ORIG,
     gloss0("def", "Copied wording can be caught when the harness plants so little, and an entirely invented phrase helps."),
     "tracks the Standards glossary (3-gram share):"),
    ("a definition close by word-sequence similarity alone", ORIG,
     gloss0("def", "An oddly invented phrase that our harness plants so each copied sentence can be spotted reliably."),
     "tracks the Standards glossary (similarity):"),
    ("a definition of a Standards term that lifts another sentence of the official text", ORIG,
     gloss0("def", "In short: " + REF_PROSE), "shared/glossary widget audit: shares a run of 8 or more words"),
    ("a notes title that follows a syllabus line", ORIG,
     lambda r: edit(r, "cia1/notes/d1.json", lambda d: d["topics"][0].__setitem__(
         "topic_name", "The invented purpose of planted widget auditing")), "word run with a syllabus line"),
    ("an outline title that follows a syllabus line", ORIG,
     outline_topic(0, "title", "The invented purpose of planted widget auditing"), "outline 1A1: shares a 7-word run"),
    ("a 'can do' line that follows a syllabus line", ORIG,
     lambda r: edit(r, "cia1/notes/d1.json", lambda d: d["topics"][0]["can_do"].__setitem__(
         0, "Describe the invented purpose of planted widget auditing")), "1A1 can_do: shares a 8-word run"),
    ("a sub-topic name that follows a syllabus line", ORIG, sub0(setf("name", "Invented Purpose of Planted Widget Auditing")),
     "1A1.1 name: shares a 6-word run"),
    ("a glossary scope note that lifts a sentence", ORIG, gloss0("scopeNotes", "In short: " + REF_DEF),
     "shared/glossary widget audit scopeNotes: shares a run of 8 or more words"),
    ("a principle that lifts a sentence", ORIG,
     lambda r: edit(r, "shared/principles.json", lambda d: d["principles"][0].__setitem__("rule", "In short: " + REF_DEF)),
     "shared/principles.json principles[0].rule: shares a run of 8 or more words"),
    ("an exam guide that lifts a sentence", ORIG,
     lambda r: c.write_json(r / "cia1" / "exam" / "cia1_exam_guide.json", {"sections": [{"body": "In short: " + REF_DEF}]}),
     "cia1/exam/cia1_exam_guide.json sections[0].body: shares a run of 8 or more words"),
    ("a title that follows a syllabus line made of terms of art", ORIG,
     lambda r: edit(r, "cia1/notes/d1.json", lambda d: d["topics"][0].__setitem__(
         "topic_name", "The internal audit function supports the chief audit executive")),
     "shares a raw run of 9 words with a syllabus line"),
    ("an explanation that lifts a sentence from the official text", ORIG, explain("In short: " + REF_DEF),
     "shares a run of 8 or more words with The IIA's text"),
    ("a lifted sentence made mostly of terms of art", ORIG,
     explain("In short, every chief audit executive that the internal audit function keeps its quality assurance and "
             "improvement program for is told first."), "shares a raw run of 11 or more words"),
    ("a Standard's title words inside copied prose (no number in front)", ORIG, explain("In short: " + REF_PROSE),
     "shares a run of 8 or more words with The IIA's text"),
    ("a lifted sentence in a retired question (still read)", ORIG,
     then(retire(), q0(setf("pre_read", REF_DEF), "cia2/originals/d1.json")), "cia2/originals/d1.json cia2_d1_001 pre_read"),
    ("a copied definition whose glossary entry opens a page, under the footer", NEW_REF,
     then(alt_ref(put("standards_fixture.txt", PAGED)), gloss0("term", "page top"), gloss0("def", REF_DEF2)),
     "shared/glossary page top: tracks the Standards glossary"),
    ("a copied definition whose glossary entry sits under the 'Glossary' heading", NEW_REF,
     then(alt_ref(put("standards_fixture.txt", PAGED)), gloss0("def", REF_DEF)),
     "shared/glossary widget audit: tracks the Standards glossary"),
    ("a decoy '...standards...page.txt' sorted before the real Standards text", NEW_REF,
     then(alt_ref(put("complete_standards_page.txt", "A saved web page about the standards. It has no glossary.\n")),
          gloss0("def", REF_DEF)), "tracks the Standards glossary"),
    ("a decoy with more 'term – text' lines than standards_2024.txt", NEW_REF,
     then(alt_ref(all_of(rename("standards_fixture.txt", "standards_2024.txt"), put(
         "a_standards_page.txt", "alpha – one.\n\nbeta – two.\n\ngamma – three.\n\nwidget audit – Nothing alike here.\n"))),
          gloss0("def", REF_DEF)), "tracks the Standards glossary"),
    ("no reference text when the gate is required", ["check_originality.py", "--ref", "/nonexistent-cia-ref"],
     lambda r: None, "--require was given"),
    ("a reference folder with one syllabus and nothing else", NEW_REF + ["--real-ref"],
     alt_ref(put("p1_syllabus.txt", f" 1. {REF_LINE}\n"), copy=False), "standards_2024.txt is missing or empty"),
    ("a reference folder whose Standards text is empty", NEW_REF + ["--real-ref"],
     alt_ref(all_of(complete_ref(), put("standards_2024.txt", "")), copy=False), "standards_2024.txt is missing or empty"),
    ("a reference whose glossary parses short of the real count", NEW_REF + ["--real-ref"],
     alt_ref(all_of(complete_ref(), put("standards_2024.txt", REF_STANDARDS)), copy=False),
     "only 1 of the 57 Standards glossary entries parsed"),
    ("a reference one glossary entry short (the count before the no-space entry was read)", NEW_REF + ["--real-ref"],
     alt_ref(complete_ref(N_GLOSSARY - 1), copy=False), "only 56 of the 57 Standards glossary entries parsed"),
    ("a copied definition whose glossary entry has no space after its dash ('term –Definition')", NEW_REF,
     then(alt_ref(put("standards_fixture.txt", TIGHT)), gloss0("term", "tight dash"), gloss0("def", REF_DEF2)),
     "shared/glossary tight dash: tracks the Standards glossary"),
    ("a made-up reference with no glossary entry at all", NEW_REF,
     alt_ref(put("standards_fixture.txt", "Fixture text with no glossary.\n")), "no Standards glossary entry parsed"),
    ("a reference folder inside the repository", ["check_originality.py", "--ref", "{repo}/data/cia/shared"],
     lambda r: None, "is inside the repository"),
    # ── house style and generated files ──
    ("the key made the longest option throughout a 40-question file", ["style_cia.py"],
     lambda r: edit(r, "cia1/originals/d1.json", key_longest_everywhere), "ERROR key is the longest option"),
    ("an option far too long for the house style", ["style_cia.py"],
     q0(lambda q: q["options"].__setitem__(q["correct"], " ".join(["Discuss the finding with the manager"] * 5))), "ERROR"),
    ("a hand-edited Challenge pack file", ["build_challenge.py", "--check"],
     lambda r: edit(r, "ciac/originals/d1.json", lambda d: d["questions"][0].__setitem__("correct", "A" if d["questions"][0]["correct"] != "A" else "B")),
     "ciac/originals/d1.json is not what build_challenge.py produces"),
    ("a source question changed without rebuilding the Challenge pack", ["build_challenge.py", "--check"],
     q0(setf("pre_read", "A changed line."), n=8), "is not what build_challenge.py produces"),
    ("a Challenge id retired by hand in the id map", ["build_challenge.py", "--check"],
     lambda r: edit(r, "ciac/id_map.json", lambda d: d["map"][0].__setitem__("status", "retired")),
     "ciac/id_map.json is not what build_challenge.py produces"),
    ("a Challenge tag that names no Challenge topic", ["build_challenge.py", "--check"], q0(setf("challenge_ref", "Z9")),
     "challenge_ref 'Z9' is not a Challenge topic"),
    ("a hand-edited built glossary", ["build_packs.py", "--check"],
     lambda r: edit(r, "cia1/glossary.json", lambda d: d[0].__setitem__("def", "Edited by hand.")),
     "cia1/glossary.json is out of date or hand-edited"),
    ("a hand-edited built principles file", ["build_packs.py", "--check"],
     lambda r: edit(r, "cia1/mindset/principles.json", setf("description", "Edited by hand.")),
     "cia1/mindset/principles.json is out of date or hand-edited"),
    ("a built glossary whose shared source is gone", ["build_packs.py", "--check"],
     lambda r: (r / "shared" / "glossary.json").unlink(), "cia1/glossary.json is an orphan"),
    ("a built principles file for a pack no principle serves any more", ["build_packs.py", "--check"],
     lambda r: edit(r, "shared/principles.json", lambda d: d["principles"][0]["packs"].remove("cia2")),
     "cia2/mindset/principles.json is an orphan"),
    ("a slip that points at a principle one pack does not have", ["build_packs.py", "--check"],
     lambda r: edit(r, "shared/principles.json", lambda d: (
         d["principles"].append(dict(d["principles"][0], id="only-part-one", order=2, packs=["cia1"])),
         d["slip_map"].__setitem__("role", "only-part-one"))), "which does not serve cia2"),
    ("two shared glossary terms with one id", ["build_packs.py", "--check"],
     lambda r: edit(r, "shared/glossary.json", lambda d: d.append(dict(d[0], term="second widget"))), "duplicate id"),
    ("a glossary term with no `def` field (the builder names it, no KeyError)", PACKS_CHECK, gloss_drop("def"),
     "ERROR shared/glossary.json id 1 (widget audit): missing def", "Traceback"),
    ("a glossary term with no `packs` field (the builder names it; no built file is called an orphan)", PACKS_CHECK,
     gloss_drop("packs", 1), "ERROR shared/glossary.json id 2 (widget ledger): missing packs", "orphan:"),
    ("an older name added to a term without rebuilding (`formerly` is built into the packs)", PACKS_CHECK,
     gloss0("formerly", ["widget review"]), "cia1/glossary.json is out of date or hand-edited"),
    ("practice links that no longer match the questions", ["sync_practice_ids.py", "--check"],
     sub0(setf("practice_ids", ["cia1_d1_040"])), "practice links are out of date"),
    # ── ids never move (the fixture's own `main` is the base) ──
    ("a question deleted and the rest renumbered", IDS, delete_and_renumber,
     "cia1_d1_001: id reused for a different question"),
    ("a question deleted outright", IDS,
     lambda r: edit(r, "cia2/originals/d1.json", lambda d: d["questions"].pop()), "cia2_d1_004: was in main and is gone"),
    ("a hand-edited Challenge id in the id map", IDS,
     lambda r: edit(r, "ciac/id_map.json", lambda d: d["map"][0].__setitem__("id", "ciac_d1_777")),
     "the row for source cia1_d1_009 changed its id from ciac_d1_001 to ciac_d1_777"),
    ("an id-map row moved to another source question", IDS,
     lambda r: edit(r, "ciac/id_map.json", lambda d: d["map"][0].__setitem__("source", "cia1_d1_001")),
     "the row for ciac_d1_001 changed its source from cia1_d1_009 to cia1_d1_001"),
    ("a retired id-map row removed (its number would be given out again)", IDS,
     then(retire(), commit, drop_rows("retired")), "the row for ciac_d3_001 (source cia2_d1_001) was removed"),
    ("a retired Challenge id made active again", IDS, then(retire(), commit, revive),
     "the row for ciac_d3_001 went from retired back to active"),
    ("a base that git does not know", ["check_ids.py", "--base", "no-such-branch"], lambda r: None,
     "is not a commit git knows"),
    # ── the app pack dry run ──
    # cia1 question 1 is not Challenge-tagged, so these two leave the Challenge pack as built.
    ("a question id that another pack already uses", [DRY],
     q0(setf("id", "cia2_d1_001")), "id appears in 2 packs (cia1, cia2)"),
    ("a principle tag that is not one of the pack's principles", [DRY],
     q0(setf("principle_id", "no-such-principle")), "is not a principle in the cia1 pack"),
    ("a hand-edited Challenge file when only cia1 is named (the gate across packs still runs)", [DRY, "cia1"],
     lambda r: edit(r, "ciac/originals/d1.json", lambda d: d["questions"][0].__setitem__("pre_read", "Edited by hand.")),
     "is not what build_challenge.py produces"),
    # ── the shared linters, the gate runner and --keep ──
    ("notes checked against a part and section the outline does not have", LINT_NOTES + ["2"],
     lambda r: edit(r, "cia1/notes/d1.json", setf("domain_number", 4)), "the outline has no code for part 2, section number 4"),
    ("a question file that exists but cannot be read (still an error, not 'not written yet')",
     ["lint_principles.py", "--cert", "cia1", "--cia-root", "{root}"],
     lambda r: (r / "cia1" / "originals" / "d2.json").write_text("{ not json", encoding="utf-8"), "cannot read question bank"),
    ("a failing linter whose problem lines are indented and start with ✗ (shown by the gate runner)",
     ["run_gates.sh", "--no-proof"], lambda r: None, "    ✗ principle 'fixture-principle': missing required field"),
    ("a failing pack dry run (its ✗ lines are shown by the gate runner)", ["run_gates.sh", "--no-proof", "@node"],
     q0(setf("id", "cia2_d1_001")), "id appears in 2 packs (cia1, cia2)"),
    ("a failing glossary gate (its problem line is shown by the gate runner)", ["run_gates.sh", "--no-proof"],
     gloss0("related", [99]), "    ERROR id 1 (widget audit): related 99 is not a glossary id"),
    ("--keep pointed at a folder that is not empty", ["prove_harness.py", "--keep", "{root}"], lambda r: None,
     "is not empty"),
    ("--keep pointed inside the repository", ["prove_harness.py", "--keep", "{repo}/data/cia/tools/keep-test"],
     lambda r: None, "is inside the repository"),
]
# Same shape, but the gate must PASS and print the text: a control, or a fault a builder handles.
PASSES = [
    ("a key on a public Knowledge source for a topic it was opened for", [ "check_cia.py", "cia1"],
     then(library(LIB + "## Knowledge: opened 2026-11-26 Fixture Public Guide; topics 1A1, 2B5 (https://example.org/g)\n"
                        "- Fixture Public Guide, section 2\n"),
          q0(setf("framework_ref", "Fixture Public Guide, section 2; " + STD))), ""),
    # A small file's longest-option share is noise (the generated Challenge section files start small).
    ("the key made the longest option throughout a 4-question file: a note, not a failure", ["style_cia.py"],
     lambda r: edit(r, "cia2/originals/d1.json", key_longest_everywhere), "note (not enforced below 40 items)"),
    # The 'consulting services' case above proves pre_read is read, so these words were seen and let through.
    ("wording that only looks old (Standard 7.1, Standards 2024, internal audit activities, IPPF, 'performance "
     "standards for staff', 'is auditor independence')", STALE, pre_read(CONTROLS), "0 hit(s)"),
    ("an 'Older term' glossary entry that names an old term", STALE, old_term_entry("Older term"), "0 hit(s)"),
    ("an old name in a glossary entry's `formerly`, built into the packs (a skipped key in every file)", STALE,
     then(gloss0("formerly", ["internal audit activity"]), rebuild), "0 hit(s)"),
    ("ISACA terms in a file on the allow list (the CISA bridge)", STALE,
     isaca_note("ciac/notes/bridge.json"), "0 hit(s)"),
    # The clean fixture's glossary line: "2 term(s), 1 defined as in the notes, 0 marked as differing from them,
    # 1 with older names · 0 error(s)".
    ("a definition that differs from the notes on purpose, marked with its reason", GLOSS,
     then(gloss0("def", OTHER_DEF), gloss0(MARK, "The notes give the short form.")),
     "0 defined as in the notes, 1 marked as differing from them, 1 with older names · 0 error(s)"),
    ("the notes' wording with other spacing and a line break, under a name in other letter case", GLOSS,
     then(gloss0("def", "A made-up  review used only\nby the harness fixture. "), gloss0("term", "Widget  Audit")),
     "1 defined as in the notes, 0 marked as differing from them, 1 with older names · 0 error(s)"),
    ("a term the notes define two ways, the glossary using one of them (the notes' own gates judge the notes)", GLOSS,
     notes_words(lambda w: w.__setitem__("widget audit", "Another made-up meaning.")),
     "1 defined as in the notes, 0 marked as differing from them, 1 with older names · 0 error(s)"),
    ("a term of the whole Challenge exam (ciac 0), on a second term", GLOSS, gloss0("packs", {"cia1": 1, "ciac": 0}),
     "check_glossary: 2 term(s)", "ERROR"),
    ("a course with no shared glossary yet", GLOSS, lambda r: (r / "shared" / "glossary.json").unlink(),
     "check_glossary: no shared glossary yet"),
    ("gate-only glossary fields changed without rebuilding (`notes`, `related` and the differs mark are never built "
     "into a pack)", PACKS_CHECK, then(gloss0("notes", []), gloss0("related", []), gloss0(MARK, "A reason.")),
     "0 out of date"),
    ("an Eliminate tip with the article 'A' and two wrong letters", CIA_,
     q0(lambda q: q["tips"].__setitem__(0, "Eliminate: C and D. A manager owns the procedure, so neither is the auditor's move."), n=1),
     "check_cia: 0 error(s)"),
    ("'C3' on questions about 1D1 (the Challenge-only fraud topic)", CIA_, add_fraud_section, "cia1 d4: 4 items"),
    ("a retired question (kept in its file, left out of the counts)", CIA_, retire(), "cia2 d1: 3 items (1 retired"),
    ("a retired question (the rebuilt Challenge pack and practice links agree)", ["build_challenge.py", "--check"],
     retire(), "0 file(s) out of date"),
    ("a retired question (practice links)", ["sync_practice_ids.py", "--check"], retire(), "0 file(s) out of date"),
    ("a retired question (its id is still there, so the id gate passes)", IDS, retire(), "of main checked · 0 error(s)"),
    ("a stem whose wording is edited lightly (the same question)", IDS,
     q0(lambda q: q.__setitem__("question", q["question"].replace("often skipped", "sometimes skipped by the buyers"))),
     "of main checked · 0 error(s)"),
    ("a folder with no git history (nothing to compare with)", IDS, lambda r: shutil.rmtree(r / ".git"),
     "skipped: no git base"),
    ("a fact never opened, without --strict (a warning)", CUR, fact0("status", "search_only"), "1 warning(s)"),
    ("a citation by number and title (the Standard's own words, set aside)", ORIG, explain("See " + LONG_TITLE + "."),
     "1 citation(s) by number and title set aside · 0 too close"),
    # Their sentence runs "... insists on keeping the planted widget ...". With the citation set aside the
    # words on its two sides must not close up into that run.
    ("a citation in the middle of a sentence (the words around it do not join into a copied run)", ORIG,
     explain("The inspector insists on (" + LONG_TITLE + ") keeping the planted widget, they said."),
     "1 citation(s) by number and title set aside · 0 too close"),
    ("a decoy '...standards...page.txt' in the reference folder (the glossary still comes from the Standards text)",
     NEW_REF, alt_ref(put("complete_standards_page.txt", "A saved web page about the standards.\n")),
     "(1 parsed from standards_fixture.txt)"),
    ("a complete reference: seven texts and 57 glossary entries, one with no space after its dash",
     NEW_REF + ["--real-ref"], alt_ref(complete_ref(), copy=False), "(57 parsed from standards_2024.txt)"),
    ("a built file whose source is gone, after a normal build (removed)", ["build_packs.py", "--check"],
     then(lambda r: edit(r, "shared/principles.json", lambda d: d["principles"][0]["packs"].remove("cia3")), rebuild),
     "0 orphan(s)"),
    ("a question that is not testable until 2027 (left out of the mock pool: 39 of 40)", [DRY],
     q0(lambda q: q.update(framework_ref=STD + "; " + TOPICAL, testable_from="2027-03-01")), "mock pool: 39 of 40 live items"),
    ("a retired question (left out of the mock pool: 3 of 3)", [DRY], retire(),
     "mock pool: 3 of 3 live items testable on 2026-11-19 (1 retired item"),
    ("a course with nothing written and no reference text (the last line must say what did not run)",
     ["run_gates.sh", "--no-proof"], empty_course,
     "  ✓ CIA gates clean (originality not run here: no reference text; ids not compared with main: no git base)",
     "every CIA gate clean"),
    ("the same course with an incomplete reference text", ["CIA_REF_DIR={ref}", "run_gates.sh", "--no-proof"], empty_course,
     "originality run on an incomplete reference text", "every CIA gate clean"),
]
# Only the text is judged (the fixture is too small to pass these tools as a whole).
SAYS = [
    ("a reference text 40 days old (fetched again), beside one 10 days old (kept)", NEW_REF + ["--fetch-plan"],
     alt_ref(all_of(put("p1_syllabus.txt", "old\n", 40), put("p2_syllabus.txt", "new\n", 10)), copy=False),
     "fetch: p1_syllabus: 40 days old (limit 30)", "fetch: p2_syllabus"),
    ("the Challenge syllabus address taken from the outline", NEW_REF + ["--fetch-plan"],
     then(alt_ref(copy=False), lambda r: edit(r, "shared/outline.json", lambda d: d["exams"][3].__setitem__(
         "syllabus_url", "https://www.theiia.org/fixture/challenge-syllabus-v9.pdf"))),
     "fetch: challenge_syllabus: missing: https://www.theiia.org/fixture/challenge-syllabus-v9.pdf"),
    ("a reference text fetched from another address than the outline names now", NEW_REF + ["--fetch-plan"],
     alt_ref(all_of(put("challenge_syllabus.txt", "text\n"), put("challenge_syllabus.url", "https://www.theiia.org/old.pdf\n")),
             copy=False), "fetch: challenge_syllabus: the outline names another address now"),
    ("a Part with one section's questions written (principles lint)",
     ["lint_principles.py", "--cert", "cia1", "--cia-root", "{root}"], lambda r: None,
     "not written yet, so not checked:", "cannot read question bank"),
    ("the Challenge pack, which has no section notes (principles lint)",
     ["lint_principles.py", "--cert", "ciac", "--cia-root", "{root}"], lambda r: None,
     "not written yet, so not checked:", "notes files found"),
    ("notes checked against their own part and section (no false alarm)", LINT_NOTES + ["1"], lambda r: None,
     "subtopic(s) checked", "the outline has no code"),
    ("a dated-fact warning (counted by the gate runner)", ["run_gates.sh", "--no-proof"], fact0("status", "search_only"),
     "    ! 1 dated-fact warning(s)"),
    ("the glossary gate's own line in the gate runner", ["run_gates.sh", "--no-proof"], lambda r: None,
     "  glossary: 2 term(s), 1 defined as in the notes, 0 marked as differing from them, 1 with older names · 0 error(s)"),
]
CLEAN = [CIA_, GLOSS, STALE, CUR, ORIG, ["style_cia.py"], ["build_challenge.py", "--check"], PACKS_CHECK,
         ["sync_practice_ids.py", "--check"], IDS, [DRY]]


def testable_today(root, ref):
    rc, out = run(root, ref, ["build_challenge.py", "--check"])
    return out.split("testable today ")[1].split(" ")[0] if "testable today " in out else "?"


def waits_left_out(case, ref):
    """Builders must leave out an item that is not testable yet."""
    before = testable_today(case, ref)
    edit(case, "cia2/originals/d1.json", lambda d: d["questions"][0].update(
        framework_ref=STD + "; " + TOPICAL, testable_from="2027-03-01"))
    run(case, ref, ["build_challenge.py"])
    after = testable_today(case, ref)
    ok = before.isdigit() and after.isdigit() and int(after) == int(before) - 1
    return ok, f"testable today {before} -> {after}"


def retag(case, ref):
    """Drop a Challenge tag, rebuild, restore it, rebuild: the old id must stay retired, not be reused."""
    rel = "cia2/originals/d1.json"
    edit(case, rel, lambda d: d["questions"][0].__setitem__("challenge_ref", None))
    run(case, ref, ["build_challenge.py"])
    edit(case, rel, lambda d: d["questions"][0].__setitem__("challenge_ref", "C1"))
    run(case, ref, ["build_challenge.py"])
    entries = [e for e in c.read_json(case / "ciac" / "id_map.json")["map"] if e["source"] == "cia2_d1_001"]
    ids = [e["id"] for e in entries]
    ok = len(entries) == 2 and entries[0]["status"] == "retired" and entries[1]["status"] == "active" and len(set(ids)) == 2
    return ok, f"id map rows {entries}"


def retired_everywhere(case, ref):
    """A retired Part question: its Challenge id is retired, never reused, and the question is in no
    built Challenge file, practice link or blind copy; its own id and number stay in the Part file."""
    retire()(case)
    rows = [e for e in c.read_json(case / "ciac" / "id_map.json")["map"] if e["source"] == "cia2_d1_001"]
    built = [q for _d, p in c.question_files(case, c.CHALLENGE) for q in c.read_json(p)["questions"]]
    links = [i for t in c.read_json(case / "cia2" / "notes" / "d1.json")["topics"] for s in t["subtopics"]
             for i in s.get("practice_ids", [])]
    out = case.parent / "blind-retired.json"
    run(case, ref, ["blind_copy.py", "cia2", "1", "--out", str(out)])
    blind = [q["id"] for q in c.read_json(out)]
    kept = [q["id"] for q in c.read_json(case / "cia2" / "originals" / "d1.json")["questions"]]
    facts = {"its Challenge id is retired": [e["status"] for e in rows] == ["retired"],
             "no built Challenge item uses that id": all(q["id"] != rows[0]["id"] for q in built) if rows else False,
             "the Challenge pack holds one item fewer": len(built) == 11,
             "no practice link": "cia2_d1_001" not in links and len(links) == 3,
             "not in the blind copy": blind == ["cia2_d1_002", "cia2_d1_003", "cia2_d1_004"],
             "id and number kept in the Part file": kept == [f"cia2_d1_00{n}" for n in (1, 2, 3, 4)]}
    return all(facts.values()), "failed: " + ", ".join(k for k, v in facts.items() if not v)


def blind_has_no_answers(case, ref):
    """The blind copy holds id, outline code, stem and options, and nothing that gives the key away."""
    out = case.parent / "blind.json"
    rc, _ = run(case, ref, ["blind_copy.py", "cia1", "1", "--ids", "1-5", "--out", str(out)])
    rows = c.read_json(out) if rc == 0 else []
    text = out.read_text(encoding="utf-8") if rc == 0 else ""
    leaks = [w for w in ("correct", "explanation", "tips", "Eliminate", "Final two", "framework_ref", STD, "Closest choice",
                         "_provenance", "key_concept") if w in text]
    ok = len(rows) == 5 and all(sorted(r) == ["code", "id", "options", "question"] for r in rows) and not leaks
    return ok, f"{len(rows)} row(s), leaked: {leaks}"


def same_mock_split(case, ref):
    """build_challenge.py and the pack dry run must count one full Challenge mock the same way."""
    find = r"150 items[ ,(]+(A \d+ / B \d+ / C \d+ / D \d+ / E \d+)"
    a = re.search(find, run(case, ref, ["build_challenge.py", "--check"])[1])
    b = re.search(find, run(case, ref, [DRY])[1])
    ok = bool(a and b) and a.group(1) == b.group(1)
    return ok, f"build_challenge: {a and a.group(1)}; dry run: {b and b.group(1)}"


def pack_glossary_shape(case, ref):
    """The builder's contract for a pack glossary: the seven fields in the house order; `formerly` after
    them, only on a term that has older names; `notes`, `related` and the differs mark never built in;
    a whole-exam term is domain 0 in the Challenge pack."""
    seven = ["id", "term", "acronym", "def", "scopeNotes", "domain", "category"]
    then(gloss0("def", OTHER_DEF), gloss0(MARK, "The notes give the short form."), rebuild)(case)
    cia1, ciac = (c.read_json(case / pack / "glossary.json") for pack in ("cia1", c.CHALLENGE))
    facts = {"a term with no older name keeps the seven fields exactly": [list(e) for e in (cia1[0], ciac[0])] == [seven, seven],
             "a term with an older name has `formerly` after them": [list(e) for e in (cia1[1], ciac[1])] == [seven + ["formerly"]] * 2
             and cia1[1]["formerly"] == ["widget book"],
             "the built definition is the shared one": cia1[0]["def"] == OTHER_DEF,
             "sections come from `packs`": [cia1[1]["domain"], ciac[0]["domain"], ciac[1]["domain"]] == [1, 1, 0]}
    return all(facts.values()), "failed: " + ", ".join(k for k, v in facts.items() if not v)


# (what must hold, the check, what it needs): checks that take more than one command.
SCRIPTED = [
    ("a built pack glossary has the seven fields, `formerly` where a term has older names, and no gate-only field",
     pack_glossary_shape, ""),
    ("a not-yet-testable question is left out of the Challenge mock pool", waits_left_out, ""),
    ("a retired Challenge id is never given to another question", retag, ""),
    ("a retired question leaves every built file and keeps its own id", retired_everywhere, ""),
    ("the blind copy carries no key, explanation, tip or citation", blind_has_no_answers, ""),
    ("one full Challenge mock is split the same way by build_challenge.py and the pack dry run", same_mock_split, "@node"),
]


def needs(row):
    """What a check cannot run without: node (the dry run) or git (the id gate). `row` is a
    command (CLEAN), a table row (its command is the second item) or a SCRIPTED row (its third)."""
    cmd = row if isinstance(row, list) else row[1] if isinstance(row[1], list) else [row[2]]
    out = set()
    if any(a.endswith(".cjs") or a == "@node" for a in cmd):
        out.add("node")
    if any(a in ("check_ids.py", "@git") for a in cmd):
        out.add("git")
    return out


def runnable(rows):
    """Leave out the checks that need node or git when it is not installed."""
    have = {"node": NODE, "git": GIT}
    return [r for r in rows if all(have[n] for n in needs(r))]


def judge(work, good, ref, mode, row):
    """Run one check on its own fresh copy of the fixture (and of the reference, beside it).
    Returns (the line to print, the failure text or None)."""
    work.mkdir()
    case, own_ref = work / "case", work / "ref"
    shutil.copytree(good, case)
    shutil.copytree(ref, own_ref)
    try:
        if mode == "holds":                 # a SCRIPTED row
            name, check, _needs = row
            ok, detail = check(case, own_ref)
            return f"  {'✓' if ok else '✗'} {name}", None if ok else f"CHECK FAILED: {name} ({detail})"
        name, cmd, fault, expect, *forbid = row
        fault(case)
        rc, out = run(case, own_ref, cmd)
        ok = expect in out and not any(f in out for f in forbid)
        ok = ok and {"stops": rc != 0, "passes": rc == 0, "says": True}[mode]
        tool = Path(next(a for a in cmd if not re.match(r"[A-Z_]+=", a))).stem
        label = {"stops": "PLANTED FAULT GOT THROUGH", "passes": "CONTROL FAILED", "says": "WRONG OUTPUT"}[mode]
        want = {"stops": "a failure and ", "passes": "exit 0 and ", "says": ""}[mode]
        failure = (f"{label}: {name} ({' '.join(cmd)} exit {rc}, wanted {want}'{expect}'"
                   + (f", and never '{forbid[0]}'" if forbid else "") + f")\n{out.strip()[-700:]}")
        return f"  {'✓' if ok else '✗'} {tool} {mode}: {name}", None if ok else failure
    finally:
        shutil.rmtree(work, ignore_errors=True)


def keep_fixture(target):
    """Write the clean fixture to `target` (and its reference to target-ref) for another tool to
    read. Nothing is ever deleted: a folder that holds something, or a path inside the
    repository, is refused (the old code removed whatever was there, unasked)."""
    keep = Path(target).resolve()
    ref = Path(str(keep) + "-ref")
    for p in (keep, ref):
        if p == c.REPO or c.REPO in p.parents:
            print(f"ERROR --keep {p} is inside the repository; choose a folder outside it")
            return 1
        if p.exists() and (not p.is_dir() or any(p.iterdir())):
            print(f"ERROR --keep {p} exists and is not empty; nothing is deleted, choose a new folder")
            return 1
    keep.mkdir(parents=True, exist_ok=True)
    make_fixture(keep, ref)
    print(f"clean fixture written to {keep}")
    return 0


def main(argv):
    quiet = "-q" in argv
    failures = []
    tables = [("stops", CASES), ("passes", PASSES), ("says", SAYS), ("holds", SCRIPTED)]
    clean = runnable(CLEAN)
    rows = [(mode, r) for mode, table in tables for r in runnable(table)]
    skipped = len(CLEAN) + sum(len(t) for _m, t in tables) - len(clean) - len(rows)
    if "--keep" in argv:   # write the clean fixture where another tool (the pack dry run) can read it
        return keep_fixture(argv[argv.index("--keep") + 1])
    with tempfile.TemporaryDirectory(prefix="cia-harness-") as tmp:
        tmp = Path(tmp).resolve()
        good, ref = tmp / "good", tmp / "ref"
        good.mkdir()
        make_fixture(good, ref)
        if skipped:   # said even with -q: the summary below counts fewer checks than usual
            missing = " and ".join(n for n, have in (("node", NODE), ("git", GIT)) if not have)
            print(f"  • {missing} is not installed: {skipped} check(s) skipped (the app pack dry run needs node, "
                  "the id gate needs git)")
        for cmd in clean:
            rc, out = run(good, ref, cmd)
            ok = rc == 0
            if not ok:
                failures.append(f"the clean fixture fails {' '.join(cmd)}:\n{out.strip()[-1500:]}")
            if not quiet:
                print(f"  {'✓' if ok else '✗'} clean fixture passes {' '.join(cmd)}")
        # Every check works on its own copy, so they can run side by side; the lines print in table order.
        with ThreadPoolExecutor(max_workers=min(8, os.cpu_count() or 2)) as pool:
            results = list(pool.map(lambda job: judge(tmp / f"row{job[0]}", good, ref, *job[1]), enumerate(rows)))
    for line, failure in results:
        if failure:
            failures.append(failure)
        if not quiet:
            print(line)
    for f in failures:
        print(f"ERROR {f}")
    dirty = sum(1 for f in failures if f.startswith("the clean"))
    through = sum(1 for f in failures if f.startswith("PLANTED FAULT"))
    faults = sum(1 for mode, _r in rows if mode == "stops")
    controls = len(rows) - faults
    print(f"prove_harness: {faults - through} of {faults} planted faults stopped · "
          f"{controls - (len(failures) - dirty - through)} of {controls} controls hold · "
          f"clean fixture passes {len(clean) - dirty} of {len(clean)} gates")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
