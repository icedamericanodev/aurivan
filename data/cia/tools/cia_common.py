"""Shared helpers for the CIA course tools (data/cia/tools/).

Every tool takes `--root DIR` (default: data/cia) so the same gates can run on
the planted-fault fixture that prove_harness.py builds in a temp folder, and
`--today YYYY-MM-DD` so date rules can be tested.

Layout and formats: docs/content/CIA_BANK_PLAN.md ("Layout and formats").
"""
import datetime
import json
import re
from pathlib import Path

CIA = Path(__file__).resolve().parent.parent          # data/cia
REPO = CIA.parent.parent
PARTS = ["cia1", "cia2", "cia3"]                       # hand-written packs
CHALLENGE = "ciac"                                     # generated pack
PACKS = PARTS + [CHALLENGE]

FIELDS = ["id", "domain", "subtopic", "principle_id", "challenge_ref", "testable_from", "difficulty",
          "bloom_level", "question", "options", "correct", "key_concept", "pre_read",
          "correct_explanation", "wrong_explanations", "tips", "framework_ref", "related_concepts",
          "_provenance", "style_version"]
# One optional field, always last: `"retired": true`. Saved progress is keyed by question
# id, so an item that is replaced is never deleted or renumbered: it stays in its file
# under its id and number with this mark, and every builder and statistic leaves it out
# (docs/content/QUESTION_SCHEMA.md, "Rewriting a question"). check_ids.py enforces it.
RETIRED = "retired"

# Depth of a topic, from the first word of its syllabus line (kickoff section 2:
# the 2025 syllabus has no Basic or Proficient labels; the verb sets the depth).
VERB_CLASS = {
    "recall": ["Describe", "Recognize", "Identify", "Explain"],
    "apply": ["Interpret", "Apply", "Demonstrate", "Maintain"],
    "judge": ["Evaluate", "Determine", "Analyze", "Assess", "Plan", "Complete", "Prepare", "Summarize"],
}
VERB_TO_CLASS = {v: c for c, vs in VERB_CLASS.items() for v in vs}

# Topic counts per section, counted from the opened syllabus files
# (V2.09.2024 FINAL and V2.10.2025 FINAL, 19 Nov 2026). A fact check on outline.json.
TOPIC_COUNTS = {
    "cia1": {"A": 8, "B": 6, "C": 8, "D": 5},
    "cia2": {"A": 7, "B": 8, "C": 2},
    "cia3": {"A": 4, "B": 3, "C": 3, "D": 8},
    "ciac": {"A": 8, "B": 7, "C": 7, "D": 10, "E": 8},
}


def pop_opt(argv, flag, default=None):
    """Remove `flag VALUE` from argv and return VALUE (or default)."""
    if flag in argv:
        i = argv.index(flag)
        val = argv[i + 1]
        del argv[i:i + 2]
        return val
    return default


def setup(argv):
    """Return (root, today, remaining args). Mutates nothing outside."""
    argv = list(argv)
    root = Path(pop_opt(argv, "--root", str(CIA))).resolve()
    t = pop_opt(argv, "--today")
    today = datetime.date.fromisoformat(t) if t else datetime.date.today()
    return root, today, argv


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, obj):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(dump_json(obj), encoding="utf-8")


def dump_json(obj):
    return json.dumps(obj, indent=1, ensure_ascii=False) + "\n"


def is_retired(q):
    """True for an item marked `"retired": true` (kept for its id, never dealt again)."""
    return q.get(RETIRED) is True


def iso_date(value):
    """A date from "YYYY-MM-DD", or None for anything else (null, a number, a bad date)."""
    try:
        return datetime.date.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def norm_text(s):
    """One spelling of a string for term matching: invisible characters dropped, a hyphen
    between two words turned into a space, every run of whitespace (non-breaking spaces
    included) turned into one space. So "internal audit  activity", "Three-Lines-of-Defense"
    and a non-breaking space cannot slip an old term past a gate."""
    s = re.sub("[\u00ad\u200b\u200c\u200d\u2060\ufeff]", "", s)
    s = re.sub(r"(?<=\w)[-\u2010\u2011](?=\w)", " ", s)
    return re.sub(r"\s+", " ", s)


def load_outline(root):
    return read_json(root / "shared" / "outline.json")


def exam(outline, pack):
    return next(e for e in outline["exams"] if e["id"] == pack)


def part_topics(outline):
    """{code: topic dict + pack, letter, domain} for the 62 Part topics."""
    out = {}
    for e in outline["exams"]:
        if e["id"] == CHALLENGE:
            continue
        for s in e["sections"]:
            for t in s["topics"]:
                out[t["code"]] = dict(t, pack=e["id"], letter=s["letter"], domain=s["domain"])
    return out


def challenge_topics(outline):
    """{ref: {code, part_code, domain, letter, n}} for the Challenge topics; ref is "A1"."""
    out = {}
    for s in exam(outline, CHALLENGE)["sections"]:
        for t in s["topics"]:
            ref = f"{s['letter']}{t['n']}"
            out[ref] = dict(t, ref=ref, code="4" + ref, letter=s["letter"], domain=s["domain"])
    return out


def library(root):
    """Parse shared/_framework_library.md.

    Returns (verified, likely, problems). A heading "## Verified: opened
    YYYY-MM-DD ..." or "## Likely: ..." sets the status of the "- " bullets
    under it. A Verified heading without an opened date is a problem, and so is
    a Verified or Likely heading written any other way ("##Likely", "### Likely"):
    it still sets the status, so a bullet can never silently count as Verified.
    """
    verified, likely, problems = set(), set(), []
    path = root / "shared" / "_framework_library.md"
    if not path.exists():
        return verified, likely, [f"{path.name} is missing"]
    status = None
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        hm = re.match(r"\s*(#+)\s*(.*)$", line)
        if hm:                             # any heading ends the section before it
            head = hm.group(2).strip()
            kind = next((k for k in ("verified", "likely") if head.lower().startswith(k)), None)
            status = kind
            if kind and not line.startswith("## "):
                # "##Likely" or "### Likely" used to be read as plain text, so the bullets
                # under it kept the Verified status of the section above.
                problems.append(f"line {n}: write the heading as '## {kind.capitalize()}: ...' (two hashes, one space)")
            if kind == "verified" and not re.search(r"opened \d{4}-\d{2}-\d{2}", head):
                problems.append(f"line {n}: a Verified heading needs 'opened YYYY-MM-DD'")
        elif line.startswith("- "):
            bullet = line[2:].strip()
            if status is None:
                problems.append(f"line {n}: bullet outside a Verified or Likely section: {bullet}")
            elif bullet in verified or bullet in likely:
                problems.append(f"line {n}: duplicate bullet: {bullet}")
            else:
                (verified if status == "verified" else likely).add(bullet)
    return verified, likely, problems


def currency(root):
    path = root / "shared" / "currency.json"
    return read_json(path) if path.exists() else None


def question_files(root, pack):
    """[(domain number, path)] for the pack's originals, in order."""
    out = []
    for p in (root / pack / "originals").glob("d*.json"):
        m = re.fullmatch(r"d(\d+)\.json", p.name)
        if m:
            out.append((int(m.group(1)), p))
    return sorted(out)


def notes_ids(root, pack, d):
    path = root / pack / "notes" / f"d{d}.json"
    if not path.exists():
        return None
    return [s["id"] for t in read_json(path)["topics"] for s in t["subtopics"]]


def all_items(root, packs=PARTS):
    """Yield (pack, domain, item) for every question in the given packs, retired ones
    included (the wording gates still read them; builders skip them with is_retired)."""
    for pack in packs:
        for d, path in question_files(root, pack):
            for q in read_json(path)["questions"]:
                yield pack, d, q


def not_yet_testable(q, today):
    """True when the item rests on a Topical Requirement that is not testable yet."""
    tf = iso_date(q.get("testable_from"))
    return tf is not None and tf > today


def strings(obj, skip_keys=(), path=""):
    """Yield (json path, string) for every string in obj, skipping some keys."""
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from strings(v, skip_keys, f"{path}[{i}]")
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k in skip_keys:
                continue
            yield from strings(v, skip_keys, f"{path}.{k}" if path else k)
