#!/usr/bin/env python3
"""Lint the exam guide and the final review week against docs/content/EXAM_GUIDE_SCHEMA.md.

Usage:
    python3 scripts/lint_exam_guide.py                  # both shared files in data/exam/
    python3 scripts/lint_exam_guide.py draft.json ...   # draft copies (type detected from content)
    python3 scripts/lint_exam_guide.py --cert crisc data/crisc/exam/crisc_exam_guide.json
    python3 scripts/lint_exam_guide.py --cert aaia     # data/aaia/exam_guide.json + final_review_week.json

Optional flag (the default, cisa, is unchanged):
    --cert NAME   lint another certification's files: `certification` must be
                  NAME, domain ids and weights come from NAME's block in
                  mobile/src/content/certifications.ts (and from DI only if
                  index.html has CERTS.NAME), and a final review week is checked
                  against data/NAME/mindset/principles.json and data/NAME/notes/
                  AAIA keeps its files flat (CERT_PATHS): data/aaia/exam_guide.json,
                  data/aaia/final_review_week.json, data/aaia/principles.json and
                  data/aaia/notes/ (codes like 1A and 1A.2); its exam length (90)
                  comes from certifications.ts. A file not written yet prints
                  "skipped: ..." (exit 0 when nothing else is wrong)

Errors break the schema, a cross-reference (domain weights, principle ids, note
codes) or a hard limit. Warnings are gaps to close (for example facts that have
not been re-checked for a long time). Exit code 1 if there are errors.
"""
import datetime as dt
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import lint_principles as lp  # noqa: E402  (shared spelling and emoji rules)

GUIDE = ROOT / "data" / "exam" / "cisa_exam_guide.json"
WEEK = ROOT / "data" / "exam" / "final_review_week.json"
PRINCIPLES = ROOT / "data" / "mindset" / "principles.json"
NOTES = ROOT / "data" / "cisa_notes.json"
INDEX = ROOT / "index.html"
MOBILE_CERTS = ROOT / "mobile" / "src" / "content" / "certifications.ts"

SCHEMA_VERSION = 1
DOMAIN_IDS = ["1", "2", "3", "4", "5"]
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
NOTE_CODE = re.compile(r"^([1-5])[AB]\d+(\.\d+)?$")
CERT = "cisa"
STALE_DAYS = 180  # warn when a section's facts are older than this

# Sources must be ISACA's or the exam provider's own pages.
SOURCE_HOSTS = ("isaca.org", "psiexams.com", "psionline.com")

# Certifications whose files do not follow data/NAME/exam/ and data/NAME/mindset/.
CERT_PATHS = {
    "aaia": {
        "guide": ROOT / "data" / "aaia" / "exam_guide.json",
        "week": ROOT / "data" / "aaia" / "final_review_week.json",
        "principles": ROOT / "data" / "aaia" / "principles.json",
        "notes": ROOT / "data" / "aaia" / "notes",
        "note_code": r"^([1-9])[A-Z](\.\d+)?$",
        "note_example": "1A or 1A.2",
    },
}
NOTE_EXAMPLE = "1B3 or 1B3.2"

# ---- Exam guide ------------------------------------------------------------
GUIDE_TOP = {"schema_version", "certification", "title", "description", "last_checked",
             "disclaimer", "check_before_booking", "sections"}
REQUIRED_SECTIONS = ["at-a-glance", "domains", "registering-and-fees", "test-center-or-online",
                     "exam-day", "after-the-exam", "becoming-certified"]
SECTION_REQUIRED = {"id", "title", "summary", "items", "sources", "as_of"}
SECTION_OPTIONAL = {"steps", "domains"}
G_TITLE_MAX, G_SUMMARY_MAX, G_ITEM_MAX, G_STEP_MAX = 8, 40, 45, 40

# ---- Final review week -----------------------------------------------------
WEEK_TOP = {"schema_version", "certification", "title", "updated", "intro", "how_it_works",
            "days", "checklists", "cheat_sheet"}
DAY_KEYS = {"id", "days_before", "title", "goal", "tasks", "remember"}
TASK_KEYS = {"text", "action", "sheet"}
ACTION_KINDS = {"note", "principles", "practice_domain", "mock_mini", "mock_full", "mistakes", "glossary"}
DYNAMIC_DOMAINS = {"focus", "next_focus"}       # filled from the learner's readiness
SHEET_REFS = set(DOMAIN_IDS) | DYNAMIC_DOMAINS | {"principles", "priority_words", "routine", "pace"}
PRIORITY_WORDS = {"FIRST", "BEST", "MOST", "PRIMARY", "GREATEST", "MOST LIKELY", "LEAST"}
# Tasks allow 30 words so the six mobile Mistakes tag labels can be quoted exactly.
W_INTRO_MAX, W_DAY_TITLE_MAX, W_GOAL_MAX, W_TASK_MAX, W_REMEMBER_MAX = 50, 6, 25, 30, 25
W_CHECK_MAX, W_POINT_MAX, W_MEANING_MAX, W_CUE_MAX = 30, 40, 40, 12
W_ROUTINE_TITLE_MAX, W_ROUTINE_TEXT_MAX, W_PACE_MAX = 8, 40, 30
MAX_TASKS, POINTS_MIN, POINTS_MAX = 5, 5, 7

# ---- Learner-text hygiene --------------------------------------------------
# Keys whose values are identifiers or links, not learner text.
NON_TEXT_KEYS = {"id", "ids", "url", "target", "note", "kind", "sheet", "certification",
                 "as_of", "last_checked", "updated", "schema_version"}
STEM = re.compile(r"\bstems?\b", re.I)          # learner copy says "question", not "stem"
URL_IN_TEXT = re.compile(r"https?://|www\.", re.I)
PASS_PROMISE = re.compile(r"\byou(?:'ll| will) pass\b|\bguaranteed? (?:to |a |you )?pass|\bpass guarantee", re.I)
EXTRA_BRITISH = re.compile(r"\b(fibre|metre|grey|enrol|enrolment|practise\w*|cancell\w+|"
                           r"labell\w+|offence|cheque|tonne|aluminium|whilst|amongst)\b", re.I)
# Counting questions: only the official exam length and small session sizes are
# allowed. Anything else could reveal the size of KaiSip's question bank.
QUESTION_COUNT = re.compile(r"\b(\d[\d,]*)\+?\s+(?!(?:seconds?|minutes?|hours?|days?)\b)"
                            r"(?:\w+[- ]){0,2}questions?\b", re.I)
EXAM_QUESTION_COUNTS = {150}
SESSION_MAX = 20
BANK_NUMBER = re.compile(r"\bbank\b[^.]{0,40}?\d|\d[\d,]*\+?\s+(?:practice\s+)?(?:questions|items)\s+in\s+(?:the|our|KaiSip)", re.I)

errors = []
warnings = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def warn(where, msg):
    warnings.append(f"{where}: {msg}")


def words(text):
    return len(str(text).split())


def nonempty_str(v):
    return isinstance(v, str) and v.strip() != ""


def text_field(where, value, max_words, label):
    if not nonempty_str(value):
        err(where, f"{label} must be a non-empty string")
        return False
    if "\n" in value:
        err(where, f"{label} must be one line")
    if words(value) > max_words:
        err(where, f"{label} is {words(value)} words (max {max_words})")
    return True


def text_list(where, value, max_words, label, min_n=1, max_n=None):
    if not isinstance(value, list) or len(value) < min_n:
        err(where, f"{label} must be a list of at least {min_n} string(s)")
        return
    if max_n is not None and len(value) > max_n:
        err(where, f"{label} has {len(value)} entries (max {max_n})")
    for i, v in enumerate(value):
        text_field(f"{where}.{label}[{i}]", v, max_words, "entry")


def parse_date(where, value, label):
    if not (isinstance(value, str) and DATE.match(value)):
        err(where, f"{label} must be a YYYY-MM-DD date")
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        err(where, f"{label} '{value}' is not a real date")
        return None


def check_keys(where, obj, required, optional=frozenset()):
    if not isinstance(obj, dict):
        err(where, "must be an object")
        return False
    missing = set(required) - obj.keys()
    extra = obj.keys() - set(required) - set(optional)
    if missing:
        err(where, f"missing {sorted(missing)}")
    if extra:
        err(where, f"unknown keys {sorted(extra)}")
    return True


def walk_text(node, path, key=None):
    """Yield (path, string) for learner-facing strings only."""
    if key in NON_TEXT_KEYS:
        return
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk_text(v, f"{path}[{i}]", key)
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from walk_text(v, f"{path}.{k}" if path else k, k)


def check_text_hygiene(doc, label):
    for path, s in walk_text(doc, ""):
        where = f"{label} {path}"
        if STEM.search(s):
            err(where, "says 'stem'; learner text says 'question'")
        if URL_IN_TEXT.search(s):
            err(where, "has a link in learner text; put links in 'sources'")
        if PASS_PROMISE.search(s):
            err(where, f"promises a pass: '{PASS_PROMISE.search(s).group(0)}'")
        if lp.EMOJI.search(s):
            err(where, "contains an emoji")
        for m in lp.BRITISH.finditer(s):
            if m.group(0).lower() not in lp.BRITISH_OK:
                err(where, f"British spelling '{m.group(0)}' (use US English)")
        for m in EXTRA_BRITISH.finditer(s):
            err(where, f"British spelling '{m.group(0)}' (use US English)")
        if BANK_NUMBER.search(s):
            err(where, f"may state the question-bank size: '{BANK_NUMBER.search(s).group(0)}'")
        for m in QUESTION_COUNT.finditer(s):
            n = int(m.group(1).replace(",", ""))
            if n not in EXAM_QUESTION_COUNTS and n > SESSION_MAX:
                err(where, f"counts questions ('{m.group(0)}'); only the exam length or a small set (<= {SESSION_MAX}) may be stated")


# ---- Reference data --------------------------------------------------------
def load_di_weights():
    """CISA domain weights from DI (CERTS.cisa.domains in index.html)."""
    try:
        src = INDEX.read_text()
    except OSError as e:
        err("index.html", f"cannot read ({e})")
        return {}
    if CERT != "cisa":
        # The web app's DI holds CISA only today; check another cert when it is added.
        m = re.search(rf"\b{CERT}:\s*\{{.*?domains:\s*\{{(.*?)\n\s*\}},", src, re.S)
        if not m:
            return None
        found = dict(re.findall(r'"([1-9])"\s*:\s*\{[^}]*?\bweight\s*:\s*(\d+)', m.group(1)))
        return {k: int(v) for k, v in found.items()}
    m = re.search(r"\bcisa:\s*\{.*?domains:\s*\{(.*?)\n\s*\},", src, re.S)
    if not m:
        err("index.html", "CERTS.cisa.domains not found; cannot check weights against DI")
        return {}
    found = dict(re.findall(r'"([1-5])"\s*:\s*\{[^}]*?\bweight\s*:\s*(\d+)', m.group(1)))
    return {k: int(v) for k, v in found.items()}


def load_mobile_weights():
    try:
        src = MOBILE_CERTS.read_text()
    except OSError:
        warn("certifications.ts", "not found; skipping the mobile weight check")
        return None
    if CERT != "cisa":
        # From this cert's `id: '<cert>'` up to the next certification object.
        m = re.search(rf"id:\s*'{CERT}'(.*?)(?=\n\s*\{{\s*\n\s*id:\s*'|\Z)", src, re.S)
        if not m:
            err("certifications.ts", f"{CERT.upper()} block not found; cannot check weights")
            return {}
        found = dict(re.findall(r"\{\s*id:\s*'([1-9])'[^}]*?\bweight:\s*(\d+)", m.group(1)))
        return {k: int(v) for k, v in found.items()}
    m = re.search(r"id:\s*'cisa'(.*?)\bid:\s*'cism'", src, re.S)
    if not m:
        err("certifications.ts", "CISA block not found; cannot check weights")
        return {}
    found = dict(re.findall(r"\{\s*id:\s*'([1-5])'[^}]*?\bweight:\s*(\d+)", m.group(1)))
    return {k: int(v) for k, v in found.items()}


def load_principles():
    try:
        doc = json.loads(PRINCIPLES.read_text())
    except (OSError, ValueError) as e:
        err(str(PRINCIPLES.relative_to(ROOT)), f"cannot read ({e})")
        return [], set()
    ids = [p.get("id") for p in doc.get("principles", [])]
    fams = {f.get("id") for f in doc.get("families", [])}
    return ids, fams


def load_note_codes():
    files = sorted(NOTES.glob("d*.json")) if NOTES.is_dir() else [NOTES]
    codes = set()
    for f in files:
        try:
            notes = json.loads(f.read_text())
        except (OSError, ValueError) as e:
            err(str(f.relative_to(ROOT)) if f.is_relative_to(ROOT) else str(f), f"cannot read ({e})")
            continue
        # One combined file holds "domains"; a per-domain file holds "topics".
        for d in notes.get("domains", [notes]):
            for t in d.get("topics", []):
                codes.add(t.get("topic_id"))
                for s in t.get("subtopics", []):
                    codes.add(s.get("id"))
    codes.discard(None)
    return codes


def check_note(where, code, ctx, domain=None):
    m = NOTE_CODE.match(code) if isinstance(code, str) else None
    if not m:
        err(where, f"note '{code}' is not a topic or subtopic code like {NOTE_EXAMPLE}")
        return
    if ctx["codes"] and code not in ctx["codes"]:
        err(where, f"note '{code}' does not exist in {NOTES.relative_to(ROOT) if NOTES.is_relative_to(ROOT) else NOTES}")
    if domain is not None and m.group(1) != domain:
        err(where, f"note '{code}' is in D{m.group(1)}, not D{domain}")


# ---- Exam guide ------------------------------------------------------------
def lint_guide(doc, ctx):
    label = "guide"
    if not check_keys(label, doc, GUIDE_TOP):
        return
    if doc.get("schema_version") != SCHEMA_VERSION:
        err(label, f"schema_version must be {SCHEMA_VERSION}")
    if doc.get("certification") != CERT:
        err(label, f"certification must be '{CERT}'")
    for k in ("title", "description"):
        if not nonempty_str(doc.get(k)):
            err(label, f"{k} must be a non-empty string")
    checked = parse_date(label, doc.get("last_checked"), "last_checked")
    if checked and checked > ctx["today"]:
        err(label, f"last_checked {checked} is in the future")
    disc = doc.get("disclaimer", "")
    if not (nonempty_str(disc) and "ISACA" in disc and re.search(r"not affiliated", disc, re.I)
            and "independent" in disc.lower()):
        err(label, "disclaimer must say KaiSip is independent and not affiliated with ISACA")
    cbb = doc.get("check_before_booking", "")
    if not (nonempty_str(cbb) and "isaca.org" in cbb and "before you book" in cbb and "change" in cbb):
        err(label, "check_before_booking must tell learners to check isaca.org before they book because these change")

    sections = doc.get("sections")
    if not isinstance(sections, list) or not sections:
        err(label, "sections must be a non-empty list")
        return
    seen = []
    for i, s in enumerate(sections):
        where = f"{label} sections[{i}]"
        if not check_keys(where, s, SECTION_REQUIRED, SECTION_OPTIONAL):
            continue
        sid = s.get("id")
        if isinstance(sid, str):
            where = f"{label} section '{sid}'"
        if not (isinstance(sid, str) and KEBAB.match(sid)):
            err(where, f"id '{sid}' is not kebab-case")
        elif sid in seen:
            err(where, "duplicate section id")
        seen.append(sid)
        text_field(where, s.get("title"), G_TITLE_MAX, "title")
        text_field(where, s.get("summary"), G_SUMMARY_MAX, "summary")
        text_list(where, s.get("items"), G_ITEM_MAX, "items")
        if "steps" in s:
            text_list(where, s.get("steps"), G_STEP_MAX, "steps", min_n=2)
        as_of = parse_date(where, s.get("as_of"), "as_of")
        if as_of:
            if checked and as_of > checked:
                err(where, f"as_of {as_of} is after last_checked {checked}")
            age = (ctx["today"] - as_of).days
            if age > STALE_DAYS:
                warn(where, f"facts last checked {age} days ago; re-check them on isaca.org")
        srcs = s.get("sources")
        if not isinstance(srcs, list) or not srcs:
            err(where, "sources must list at least one {label, url}")
        else:
            urls = set()
            for j, src in enumerate(srcs):
                sw = f"{where} sources[{j}]"
                if not check_keys(sw, src, {"label", "url"}):
                    continue
                if not nonempty_str(src.get("label")):
                    err(sw, "label must be a non-empty string")
                url = src.get("url", "")
                p = urlparse(url) if isinstance(url, str) else None
                if not p or p.scheme != "https" or not p.netloc:
                    err(sw, f"url '{url}' must be an https link")
                elif not any(p.netloc == h or p.netloc.endswith("." + h) for h in SOURCE_HOSTS):
                    err(sw, f"url host '{p.netloc}' is not an official source {SOURCE_HOSTS}")
                if url in urls:
                    err(sw, f"duplicate url '{url}'")
                urls.add(url)
        if "domains" in s:
            if sid != "domains":
                err(where, "only the 'domains' section may carry a domains list")
            check_guide_domains(where, s["domains"], ctx)
    missing = [r for r in REQUIRED_SECTIONS if r not in seen]
    if missing:
        err(label, f"missing required sections {missing}")
    present = [x for x in seen if x in REQUIRED_SECTIONS]
    if present != [r for r in REQUIRED_SECTIONS if r in present]:
        err(label, f"required sections must appear in this order: {REQUIRED_SECTIONS}")
    dom = next((s for s in sections if isinstance(s, dict) and s.get("id") == "domains"), None)
    if dom is not None and "domains" not in dom:
        err(f"{label} section 'domains'", "must carry the domains list with weights")
    check_text_hygiene(doc, label)


def check_guide_domains(where, doms, ctx):
    if not isinstance(doms, list):
        err(where, "domains must be a list")
        return
    ids = [d.get("id") for d in doms if isinstance(d, dict)]
    if ids != DOMAIN_IDS:
        err(where, f"domains must be ids {DOMAIN_IDS} in order (got {ids})")
    weights = {}
    for d in doms:
        if not check_keys(where, d, {"id", "name", "weight"}):
            continue
        if not nonempty_str(d.get("name")):
            err(where, f"domain {d.get('id')} needs a name")
        if not isinstance(d.get("weight"), int):
            err(where, f"domain {d.get('id')} weight must be an integer percent")
            continue
        weights[d.get("id")] = d["weight"]
        ctx["guide_domain_names"][d.get("id")] = d.get("name")
    if weights and sum(weights.values()) != 100:
        err(where, f"weights sum to {sum(weights.values())}, not 100")
    for name, ref in (("DI in index.html", ctx["di"]), ("mobile certifications.ts", ctx["mobile"])):
        if ref is None:
            continue
        if ref and ref != weights:
            err(where, f"weights {weights} do not match {name} {ref}")


# ---- Final review week -----------------------------------------------------
def check_action(where, action, ctx):
    if not check_keys(where, action, {"kind"}, {"target"}):
        return
    kind = action.get("kind")
    target = action.get("target")
    if kind not in ACTION_KINDS:
        err(where, f"action kind '{kind}' is not one of {sorted(ACTION_KINDS)}")
        return
    has = "target" in action
    if kind in {"mock_mini", "mock_full", "mistakes"} and has:
        err(where, f"action '{kind}' takes no target")
    elif kind == "practice_domain":
        if target not in set(DOMAIN_IDS) | DYNAMIC_DOMAINS:
            err(where, f"practice_domain target '{target}' must be {DOMAIN_IDS[0]}-{DOMAIN_IDS[-1]}, 'focus' or 'next_focus'")
    elif kind == "note" and has:
        check_note(where, target, ctx)
    elif kind == "principles" and has:
        if target == "top_slip" or ctx.get("no_principles"):
            pass
        elif target in ctx["families"]:
            ctx["families_used"].add(target)
        elif target in ctx["principle_ids"]:
            pass
        else:
            err(where, f"principles target '{target}' is not a principle id, a family id or 'top_slip'")
    elif kind == "glossary" and has and not nonempty_str(target):
        err(where, "glossary target, when present, must be a term")


def lint_week(doc, ctx):
    label = "week"
    if not check_keys(label, doc, WEEK_TOP):
        return
    if doc.get("schema_version") != SCHEMA_VERSION:
        err(label, f"schema_version must be {SCHEMA_VERSION}")
    if doc.get("certification") != CERT:
        err(label, f"certification must be '{CERT}'")
    if not nonempty_str(doc.get("title")):
        err(label, "title must be a non-empty string")
    upd = parse_date(label, doc.get("updated"), "updated")
    if upd and upd > ctx["today"]:
        err(label, f"updated {upd} is in the future")
    text_field(label, doc.get("intro"), W_INTRO_MAX, "intro")
    text_list(label, doc.get("how_it_works"), W_CHECK_MAX, "how_it_works")

    # Days: exactly seven, counting down 7..1.
    days = doc.get("days")
    if not isinstance(days, list) or len(days) != 7:
        err(label, "days must list exactly 7 days")
        days = days if isinstance(days, list) else []
    expect = list(range(7, 0, -1))
    got = [d.get("days_before") for d in days if isinstance(d, dict)]
    if got != expect:
        err(label, f"days_before must run {expect} (got {got})")
    for i, d in enumerate(days):
        where = f"{label} days[{i}]"
        if not check_keys(where, d, DAY_KEYS):
            continue
        n = d.get("days_before")
        if d.get("id") != f"day-{n}":
            err(where, f"id must be 'day-{n}' (got {d.get('id')!r})")
        where = f"{label} {d.get('id')}"
        text_field(where, d.get("title"), W_DAY_TITLE_MAX, "title")
        text_field(where, d.get("goal"), W_GOAL_MAX, "goal")
        text_field(where, d.get("remember"), W_REMEMBER_MAX, "remember")
        tasks = d.get("tasks")
        if not isinstance(tasks, list) or not (1 <= len(tasks) <= MAX_TASKS):
            err(where, f"tasks must list 1-{MAX_TASKS} tasks")
            continue
        for j, t in enumerate(tasks):
            tw = f"{where} tasks[{j}]"
            if not check_keys(tw, t, {"text"}, TASK_KEYS - {"text"}):
                continue
            text_field(tw, t.get("text"), W_TASK_MAX, "text")
            if "action" in t:
                check_action(tw, t["action"], ctx)
            if "sheet" in t:
                sh = t["sheet"]
                if not (isinstance(sh, list) and sh and all(x in SHEET_REFS for x in sh)):
                    err(tw, f"sheet must be a non-empty list of {sorted(SHEET_REFS)}")
                else:
                    ctx["sheets_used"].update(sh)

    # Checklists.
    cl = doc.get("checklists")
    if check_keys(f"{label} checklists", cl, {"eve", "morning"}):
        for k in ("eve", "morning"):
            text_list(f"{label} checklists", cl.get(k), W_CHECK_MAX, k, min_n=3, max_n=8)

    # Cheat sheet.
    cs = doc.get("cheat_sheet")
    if check_keys(f"{label} cheat_sheet", cs, {"domains", "principles", "priority_words",
                                                "answering_routine", "pace"}):
        lint_cheat_sheet(cs, ctx)

    # Coverage (warnings): every principle family and domain sheet gets a day.
    for fam in sorted(ctx["families"] - ctx["families_used"]):
        warn(label, f"no day links the '{fam}' principles family")
    for dom in DOMAIN_IDS:
        if dom not in ctx["sheets_used"]:
            warn(label, f"no day points to the Domain {dom} must-remember points")
    check_text_hygiene(doc, label)


def lint_cheat_sheet(cs, ctx):
    label = "week cheat_sheet"
    doms = cs.get("domains")
    if not isinstance(doms, list):
        err(label, "domains must be a list")
        doms = []
    ids = [d.get("id") for d in doms if isinstance(d, dict)]
    if ids != DOMAIN_IDS:
        err(label, f"domains must be ids {DOMAIN_IDS} in order (got {ids})")
    for d in doms:
        if not check_keys(f"{label} domains", d, {"id", "name", "points"}):
            continue
        did = d.get("id")
        where = f"{label} domain {did}"
        if not nonempty_str(d.get("name")):
            err(where, "name must be a non-empty string")
        gname = ctx["guide_domain_names"].get(did)
        if gname and d.get("name") != gname:
            err(where, f"name '{d.get('name')}' differs from the exam guide's '{gname}'")
        pts = d.get("points")
        if not isinstance(pts, list) or not (POINTS_MIN <= len(pts) <= POINTS_MAX):
            err(where, f"points must list {POINTS_MIN}-{POINTS_MAX} must-remember points")
            continue
        for j, p in enumerate(pts):
            pw = f"{where} points[{j}]"
            if not check_keys(pw, p, {"text"}, {"note"}):
                continue
            text_field(pw, p.get("text"), W_POINT_MAX, "text")
            if "note" in p:
                check_note(pw, p["note"], ctx, domain=did)

    pr = cs.get("principles")
    if check_keys(f"{label} principles", pr, {"intro", "ids"}):
        text_field(f"{label} principles", pr.get("intro"), W_INTRO_MAX, "intro")
        pids = pr.get("ids")
        if not isinstance(pids, list):
            err(f"{label} principles", "ids must be a list")
        elif ctx.get("no_principles"):
            pass  # principles file not written yet (reported as skipped)
        else:
            if len(set(pids)) != len(pids):
                err(f"{label} principles", "ids contain duplicates")
            known = set(ctx["principle_ids"])
            unknown = [p for p in pids if p not in known]
            missing = [p for p in ctx["principle_ids"] if p not in pids]
            if unknown:
                err(f"{label} principles", f"unknown principle ids {unknown}")
            if missing:
                err(f"{label} principles", f"missing principle ids {missing} (list every principle)")

    pw = cs.get("priority_words")
    if not isinstance(pw, list):
        err(label, "priority_words must be a list")
    else:
        seen = []
        for j, w in enumerate(pw):
            ww = f"{label} priority_words[{j}]"
            if not check_keys(ww, w, {"word", "meaning", "cue"}):
                continue
            seen.append(w.get("word"))
            if not (isinstance(w.get("word"), str) and w["word"] == w["word"].upper()):
                err(ww, "word must be written in capitals")
            text_field(ww, w.get("meaning"), W_MEANING_MAX, "meaning")
            text_field(ww, w.get("cue"), W_CUE_MAX, "cue")
        if len(set(seen)) != len(seen):
            err(label, "priority_words has duplicates")
        if set(seen) != PRIORITY_WORDS:
            err(label, f"priority_words must be exactly {sorted(PRIORITY_WORDS)} (got {sorted(set(seen))})")

    rt = cs.get("answering_routine")
    if not isinstance(rt, list) or not (4 <= len(rt) <= 6):
        err(label, "answering_routine must list 4-6 steps")
    else:
        for j, st in enumerate(rt):
            sw = f"{label} answering_routine[{j}]"
            if check_keys(sw, st, {"title", "text"}):
                text_field(sw, st.get("title"), W_ROUTINE_TITLE_MAX, "title")
                text_field(sw, st.get("text"), W_ROUTINE_TEXT_MAX, "text")
    text_list(label, cs.get("pace"), W_PACE_MAX, "pace", min_n=2, max_n=6)


# ---- Main ------------------------------------------------------------------
def kind_of(doc):
    if isinstance(doc, dict) and "sections" in doc:
        return "guide"
    if isinstance(doc, dict) and "days" in doc:
        return "week"
    return None


def configure(cert):
    """Switch the cross-checks to another certification (default cisa: unchanged)."""
    global CERT, DOMAIN_IDS, SHEET_REFS, NOTE_CODE, PRINCIPLES, NOTES, GUIDE, WEEK
    global NOTE_EXAMPLE, EXAM_QUESTION_COUNTS
    CERT = cert
    if cert == "cisa":
        return
    GUIDE = ROOT / "data" / cert / "exam" / f"{cert}_exam_guide.json"
    WEEK = ROOT / "data" / cert / "exam" / "final_review_week.json"
    PRINCIPLES = ROOT / "data" / cert / "mindset" / "principles.json"
    NOTES = ROOT / "data" / cert / "notes"
    NOTE_CODE = re.compile(r"^([1-9])[A-Z]\d+(\.\d+)?$")
    if cert in CERT_PATHS:
        cp = CERT_PATHS[cert]
        GUIDE, WEEK, PRINCIPLES, NOTES = cp["guide"], cp["week"], cp["principles"], cp["notes"]
        NOTE_CODE = re.compile(cp["note_code"])
        NOTE_EXAMPLE = cp["note_example"]
    try:
        src = MOBILE_CERTS.read_text()
        m = re.search(rf"id:\s*'{cert}'(.*?)(?=\n\s*\{{\s*\n\s*id:\s*'|\Z)", src, re.S)
        ids = re.findall(r"\{\s*id:\s*'([1-9])'", m.group(1)) if m else []
        q = re.search(r"\bquestions:\s*(\d+)", m.group(1)) if m else None
    except OSError:
        ids, q = [], None
    if cert in CERT_PATHS and q:
        # The cert's own exam length may be stated (AAIA: 90), not CISA's 150.
        EXAM_QUESTION_COUNTS = {int(q.group(1))}
    if not ids:
        print(f"✗ --cert {cert}: no domains found for '{cert}' in {MOBILE_CERTS.relative_to(ROOT)}")
        sys.exit(2)
    DOMAIN_IDS = ids
    SHEET_REFS = set(DOMAIN_IDS) | DYNAMIC_DOMAINS | {"principles", "priority_words", "routine", "pace"}


def _rel(p):
    p = Path(p).resolve()
    return p.relative_to(ROOT) if p.is_relative_to(ROOT) else p


def main(argv):
    args = list(argv[1:])
    cert = "cisa"
    if "--cert" in args:
        i = args.index("--cert")
        if i + 1 >= len(args):
            print("✗ --cert needs a certification id, such as crisc")
            return 2
        cert = args[i + 1].lower()
        del args[i:i + 2]
    configure(cert)
    paths = [Path(a) for a in args] or [p for p in (GUIDE, WEEK) if cert == "cisa" or p.exists()]
    skipped = []
    if cert in CERT_PATHS:
        if not args:
            skipped += [p for p in (GUIDE, WEEK) if not p.exists()]
        if not PRINCIPLES.exists():
            skipped.append(PRINCIPLES)
        missing_args = [p for p in paths if not p.exists()]
        skipped += missing_args
        paths = [p for p in paths if p.exists()]
        if not paths:
            print(f"Exam guide lint ({cert}):")
            for p in skipped:
                print(f"  skipped: {_rel(p)} not written yet")
            return 0
    docs = {}
    for p in paths:
        try:
            doc = json.loads(p.read_text())
        except (OSError, ValueError) as e:
            print(f"✗ cannot read {p}: {e}")
            return 1
        k = kind_of(doc)
        if k is None:
            print(f"✗ {p}: neither an exam guide (sections) nor a final review week (days)")
            return 1
        docs[k] = (p, doc)

    no_principles = cert in CERT_PATHS and not PRINCIPLES.exists()
    principle_ids, families = ([], set()) if no_principles else load_principles()
    ctx = {
        "no_principles": no_principles,
        "today": dt.date.today(),
        "di": load_di_weights(),
        "mobile": load_mobile_weights(),
        "principle_ids": principle_ids,
        "families": families,
        "codes": load_note_codes(),
        "guide_domain_names": {},
        "families_used": set(),
        "sheets_used": set(),
    }
    # Lint the guide first so the week can check its domain names against it.
    if "guide" not in docs and GUIDE.exists():
        try:
            g = json.loads(GUIDE.read_text())
            for s in g.get("sections", []):
                if s.get("id") == "domains":
                    for d in s.get("domains", []):
                        ctx["guide_domain_names"][d.get("id")] = d.get("name")
        except (OSError, ValueError):
            pass
    if "guide" in docs:
        lint_guide(docs["guide"][1], ctx)
    if "week" in docs:
        lint_week(docs["week"][1], ctx)

    print("Exam guide lint:" if cert not in CERT_PATHS else f"Exam guide lint ({cert}):")
    for p in skipped:
        print(f"  skipped: {_rel(p)} not written yet")
    for k, (p, doc) in docs.items():
        rel = p.resolve().relative_to(ROOT) if p.resolve().is_relative_to(ROOT) else p
        if k == "guide":
            print(f"  {rel}: {len(doc.get('sections', []))} sections, last checked {doc.get('last_checked')}")
        else:
            print(f"  {rel}: {len(doc.get('days', []))} days, "
                  f"{len(doc.get('cheat_sheet', {}).get('domains', []))} domain sheets")
    if ctx["di"]:
        print(f"  DI weights: {ctx['di']}")
    elif CERT != "cisa" and ctx["di"] is None:
        print(f"  DI weights: none for {CERT} in index.html (checked against mobile certifications.ts only)")
    if CERT != "cisa" and ctx["mobile"]:
        print(f"  mobile weights ({CERT}): {ctx['mobile']}")
    for w in warnings:
        print(f"  ⚠ {w}")
    for e in errors:
        print(f"  ✗ {e}")
    if errors:
        print(f"  ✗ {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(f"  ✓ clean ({len(warnings)} warning(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
