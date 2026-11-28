#!/usr/bin/env python3
"""Run the shared exam-style linter on a CIA question file, with the CIA format exceptions.

scripts/lint_exam_style_v2.py checks stems, options, explanations and tips for
every KaiSip bank, and it is run here unchanged. The CISA, CRISC and AAIA banks
keep that shared v2 standard as it is. CIA items follow The IIA's question
format instead (owner decision, 28 Nov 2026; docs/content/CIA_BANK_PLAN.md
sections 5, 6d and 9, and .claude/agents/cia-standards-auditor.md), so this
wrapper reads the shared linter's result per item and applies the written CIA
exceptions below. Every exception is listed here and in the plan; nothing else
of the shared linter is relaxed (the stem caps, tips, explanations, the key's
8-character and length-ratio rules, the longest-option shares, shorthand in
options).

Stems take the shared "plain stems" caps as they are (FB-013, 28 Nov 2026;
docs/content/EXAM_STYLE_V2.md). A tester said some questions read like jumbled
words, and The IIA's own samples are plain short sentences (0 semicolons and 0
possessive chains in 23 samples), so CIA has no stem caps of its own:
  - aim for 35 words; at most 45 words and 4 sentences (the question included);
  - a stem over 35 words must be plain: no semicolon, no two possessives in one
    noun phrase, no sentence over 20 words;
  - per file, from 40 items as in the shared linter: the median stem at 35
    words or under, and at most 25% of stems over 35 words.
The old CIA caps (35 words and 2 sentences, with a "scenario variant" of 36 to
50 words or 3 sentences for 10% of a file) are gone, and so is the shared
linter's --legacy-stem switch that kept them.

CIA-only exceptions (a shared ERROR that is let through when the rule holds):
  1. Lowercase qualifiers. The shared linter wants a capitalised priority word
     (BEST, FIRST, MOST...). A CIA stem may write it in lowercase, as The IIA
     does ("which action should the internal auditor take first?"). The
     lowercase word must sit in the question itself (the last sentence), so a
     "most" in a fact sentence does not count. A stem with no qualifier at all,
     in either case, is still an error.
  2. Option cap 18 words (shared cap 12). An option of 19 words or more is an error.
CIA-only errors:
  3. An EXCEPT or NOT ask ("each of the following EXCEPT", "which ... is not",
     a capitalised NOT anywhere in the stem). LEAST stays the shared linter's
     business and is an observation for the reviewers, not an error.
  4. A CAPITALISED qualifier in a CIA stem (REQUIRE_LOWERCASE_QUALIFIERS below,
     on since the stage 1 restyle of 28 Nov 2026, when every stem was
     lowercased and the phone app learned to read lowercase qualifiers).
     `--require-lowercase-qualifiers` forces it for one run whatever the
     default (the harness proves it that way).
CIA-only warnings (printed, never failing):
  - more than 25% of a file's stems name a person or a place (a heuristic: a
    capitalised word outside a short list of framework terms and months, or a
    sentence that opens "Name, ..."). The default is a generic role;
  - options without a terminal period (one line per file, with the count);
  - capitalised qualifiers still in the file while the switch is off (the
    stage 1 count, one line per file);
  - "IIA guidance" in a stem (cite what was opened, by name, instead);
  - "I and II" style combination options.
The target for a new round (a stem median of 20 to 28 words, at most 1 stem in
10 over 35 words, no sentence over 25 words) is a round scorecard measure (plan
section 7), not a file gate: the bank written before 28 Nov 2026 sits near 35
words, and its packed stems are rewritten in plain sentences by the stage 3
pass (plan section 6d), not shortened mechanically.

Two written-down differences in how the shared result is read.
First, the generated Challenge pack (ciac). Its section files hold the tagged
Part items and are never edited by hand, so a Challenge file's median and its
share of stems over 35 words are printed as a note and do not fail this gate:
the fix belongs in the Part files, where the same two rules do fail. Every
per-item rule (45 words, 4 sentences, plain over 35) fails in a Challenge file
as anywhere else, because the item is wrong in its Part file too.
Second, the shared linter fails a file whose key is the longest option in more
than 30% of items, whatever the file's size. On a small file that number is noise (4 of 12 is 33%), and the
generated Challenge pack's section files start small because they hold only the
tagged Part items. So below 40 items in a file every "key is the longest option"
line (the share, and the per-item 8-character line with it) is printed as a
note and does not fail this gate. From 40 items they fail as usual. check_cia.py
enforces the 8-character rule on every item whatever the file's size, and the
stricter 15 to 24% on every Part file from 40 items.

Known and accepted: the shared linter's "stem names no actor" warning looks for
CISA actors, so it can appear on CIA items; every stem must still name who acts.

Usage:
  python3 data/cia/tools/style_cia.py            # every pack and section present
  python3 data/cia/tools/style_cia.py cia1       # one pack
  python3 data/cia/tools/style_cia.py cia1 2     # one section file
  python3 data/cia/tools/style_cia.py --require-lowercase-qualifiers cia1
                                                 # also fail on a capitalised qualifier
  --verbose also prints the shared linter's warnings.
Exit 1 if any file has an error after the CIA exceptions.
"""
import ast
import re
import subprocess
import sys

import cia_common as c

sys.path.insert(0, str(c.REPO / "scripts"))
import lint_exam_style_v2 as shared  # noqa: E402  (its caps and word count, so the two never drift)

# The stage 1 switch. Flip to True in the change that lowercases every CIA qualifier.
REQUIRE_LOWERCASE_QUALIFIERS = True  # on since the stage 1 restyle, 28 Nov 2026
SWITCH = "--require-lowercase-qualifiers"

LENGTH_TELL = "key is the longest option"
SMALL_FILE = 40
MAX_OPTION = 18                      # shared: 12
NAMED_SHARE = 0.25
# The shared linter's two per-file stem lines (from 40 items): a failure in a Part file, a note in a generated one.
FILE_STEMS = re.compile(r"ERROR (median stem is \d+ words .*|\d+% of stems are over \d+ words .*)$")

CAPS = re.compile(r"\b(" + "|".join(shared.PRIORITY_WORDS) + r")\b")
ANY_CASE = re.compile(r"\b(" + "|".join(shared.PRIORITY_WORDS) + r")\b", re.I)
NOT_CAPS = re.compile(r"\b(EXCEPT|NOT)\b")
NOT_ASK = re.compile(r"\bexcept\b|^(?:which|what)\b(?:\s+\S+){0,5}?\s+(?:is|are|was|were|would|should|could|does|do|"
                     r"did|can|will|might|must)\s+not\b", re.I)
# "IIA guidance" and the same with up to three words between ("current IIA Three Lines guidance",
# found by the Part 1 Section A restyle audit, 28 Nov 2026).
IIA_GUIDANCE = re.compile(r"\bIIA(?:['’]s)?(?:\s+[\w-]+){0,3}?\s+guidance\b", re.I)
# A whole option that is a set of numbered statements ("I and II", "II only", "Both I and II."), not a
# phrase that names Domains II and V.
ROMAN_SET = re.compile(r"(?:[Bb]oth |[Nn]either |[Oo]nly |[Aa]ll of )?(?:[Ss]tatements? )?(?:I|II|III|IV)"
                       r"(?:\s*(?:,|and|or|nor|&)\s*(?:I|II|III|IV))*(?:\s+only)?\.?")
# Capitalised words that are not a person or a place: framework terms and dates.
NOT_A_NAME = set("""Standards Standard Global Internal Audit Auditing Auditor Auditors Topical Requirement Requirements
Three Lines Model Third-Party Cybersecurity Organizational Purpose Behavior Certified The To-Be Domain Principle
Principles Part Section Framework Code Conduct Ethics January February March April May June July August September
October November December Monday Tuesday Wednesday Thursday Friday Saturday Sunday""".split())
OPENERS = {"Meanwhile", "Midyear", "However", "Later", "Earlier", "Then", "Now", "Today", "Instead", "Separately",
           "Afterwards", "Finally", "Meantime", "Overall", "Once", "Again", "Still", "Yesterday", "Also"}

SHARED_NO_CAPS = "stem has no capitalised priority word"
SHARED_OPTION = re.compile(r"option over \d+w: (\{.*\})$")


def ask_of(stem):
    """The question itself: the stem's last sentence."""
    return re.split(r"(?<=[.?!])\s+", stem.strip())[-1]


def names_someone(stem):
    """True when the stem carries a person's name or a place (heuristic, for a warning only)."""
    for m in re.finditer(r"\b([A-Z][a-zà-ÿ][\w'’-]*)", stem):
        word = re.sub(r"['’]s?$", "", m.group(1))
        before = stem[:m.start()].rstrip()
        if not before or before[-1] in '.?!:;"“(':
            # A sentence that opens "Elif, chief audit executive of ..." names someone.
            if (stem[m.end():m.end() + 1] == "," and word not in OPENERS and word not in NOT_A_NAME
                    and "-" not in word and not re.search(r"(ing|ed|ly)$", word)):
                return True
            continue
        if word not in NOT_A_NAME:
            return True
    return False


def reclassify(q, msg):
    """One shared per-item ERROR: None if a CIA exception lets it through, else the error to print.
    The stem caps are not among the exceptions: those shared errors come back as they are."""
    stem = q.get("question", "")
    if msg.startswith(SHARED_NO_CAPS):
        if ANY_CASE.search(ask_of(stem)):
            return None
        return "stem has no qualifier (best, first, most, primary...) in its question, in lowercase or capitals"
    m = SHARED_OPTION.match(msg)
    if m:
        lengths = ast.literal_eval(m.group(1))
        over = {k: v for k, v in lengths.items() if v > MAX_OPTION}
        if not over:
            return None
        return f"option over {MAX_OPTION}w (the CIA option cap): {over}"
    return msg


def cia_checks(q, require_lower):
    """The CIA-only rules on one item: (errors, warnings)."""
    errs, warns = [], []
    stem = q.get("question", "")
    if NOT_CAPS.search(stem) or NOT_ASK.search(ask_of(stem)):
        errs.append("EXCEPT or NOT ask: CIA stems ask for the best answer, never for the one that does not fit")
    caps = CAPS.findall(stem)
    if require_lower and caps:
        errs.append(f"capitalised qualifier '{caps[0]}' in the stem: CIA stems write it in lowercase "
                    f"('{caps[0].lower()}'), as The IIA does")
    if IIA_GUIDANCE.search(stem):
        warns.append("'IIA guidance' in the stem: name what was opened (for example the Global Internal Audit "
                     "Standards), or leave the source out")
    if any(ROMAN_SET.fullmatch(str(v or "").strip()) for v in q.get("options", {}).values()):
        warns.append("an 'I and II' combination option: The IIA's format does not use them")
    return errs, warns


def lint_file(pack, d, path, args, require_lower):
    """Lint one file. Returns (failed, lines to print, n errors, n CIA warnings)."""
    items = [q for q in c.read_json(path)["questions"] if q.get("style_version") == 2]
    by_id = {q.get("id"): q for q in items}
    out = subprocess.run([sys.executable, str(c.REPO / "scripts" / "lint_exam_style_v2.py"), "--file", str(path)],
                         capture_output=True, text=True)
    lines = out.stdout.strip().splitlines()
    summary = lines[-1] if lines and "v2 question(s) checked" in lines[-1] else None
    shown, errors, warns = [], [], []
    shared_warns = 0
    where = f"{pack} d{d}"
    for line in lines:
        m = re.match(r"ERROR (\S+): (.*)$", line)
        per_file = FILE_STEMS.match(line)
        if line.startswith("ERROR") and len(items) < SMALL_FILE and LENGTH_TELL in line:
            # Below SMALL_FILE items the longest-option lines are noise: a note, not a failure (unchanged).
            shown.append(line.replace("ERROR", "note (not enforced below 40 items):"))
        elif per_file and pack == c.CHALLENGE:
            # A generated file: the stems are fixed in the Part files, where these two lines do fail.
            shown.append(f"note (a generated Challenge file; the Part files carry this gate): {where}: {per_file.group(1)}")
        elif per_file:
            errors.append(f"ERROR {where}: {per_file.group(1)}")
        elif m and m.group(1) in by_id:
            msg = reclassify(by_id[m.group(1)], m.group(2))
            if msg:
                errors.append(f"ERROR {m.group(1)}: {msg}")
        elif line.startswith("ERROR"):
            errors.append(line)
        elif line.startswith("warn"):
            shared_warns += 1
            if "--verbose" in args:
                shown.append(line)
    for q in items:
        e, w = cia_checks(q, require_lower)
        errors += [f"ERROR {q.get('id')}: {x}" for x in e]
        warns += [f"warn  {q.get('id')}: {x}" for x in w]
    if items:
        named = sum(1 for q in items if names_someone(q.get("question", "")))
        if named / len(items) > NAMED_SHARE:
            warns.append(f"warn  {where}: {named} of {len(items)} stems ({named / len(items):.0%}) name a person or a "
                         f"place (CIA default: a generic role; at most about 1 in 5 named)")
        options = [v for q in items for v in q.get("options", {}).values()]
        bare = sum(1 for v in options if not str(v).rstrip().endswith("."))
        if bare:
            warns.append(f"warn  {where}: {bare} of {len(options)} options lack a terminal period "
                         "(CIA format: every option ends with one; stage 1 restyle)")
        capped = sum(1 for q in items if CAPS.search(q.get("question", "")))
        if capped and not require_lower:
            warns.append(f"warn  {where}: {capped} of {len(items)} stems carry a capitalised qualifier "
                         f"(CIA format: lowercase; an error once {SWITCH} is on, after the stage 1 restyle)")
    spread = re.search(r"key spread ([^·]+?) ·", summary or "")
    tail = (f"{where}: {len(items)} v2 question(s) checked · key spread {spread.group(1) if spread else '?'} · "
            f"{len(errors)} error(s) · {len(warns)} CIA format warning(s) · {shared_warns} shared warning(s)")
    if summary is None:     # the shared linter did not finish: that is a failure, with its own words
        errors.append(f"ERROR {where}: the shared linter did not report ({out.stderr.strip()[-300:]})")
        tail = f"{where}: {errors[-1]}"
    return bool(errors), errors + warns + shown + [tail], len(errors), len(warns)


def main(argv):
    root, _today, args = c.setup(argv)
    require_lower = REQUIRE_LOWERCASE_QUALIFIERS or SWITCH in args
    packs = [a for a in args if a in c.PACKS] or c.PACKS
    doms = [int(a) for a in args if a.isdigit()]
    bad = ran = n_err = n_warn = 0
    for pack in packs:
        for d, path in c.question_files(root, pack):
            if doms and d not in doms:
                continue
            if not c.read_json(path)["questions"]:
                continue   # an empty generated Challenge section file
            ran += 1
            failed, lines, e, w = lint_file(pack, d, path, args, require_lower)
            print("\n".join(lines))
            bad += failed
            n_err += e
            n_warn += w
    if not ran:
        print("style_cia: no question files yet")
    else:
        print(f"style_cia: {ran} file(s) · {n_err} error(s) · {n_warn} CIA format warning(s)"
              + (" · capitalised qualifiers are errors" if require_lower else ""))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
