#!/usr/bin/env python3
"""Lint the shared mindset principles against docs/content/PRINCIPLES_SCHEMA.md.

Usage:
    python3 scripts/lint_principles.py                 # data/mindset/principles.json
    python3 scripts/lint_principles.py path/to/file    # a draft copy
    # another certification's file, checked against its own notes and bank:
    python3 scripts/lint_principles.py data/crisc/mindset/principles.json \
        --notes data/crisc/notes --bank data/crisc/originals
    # the AAIA course (data/aaia/principles.json, its notes and bank):
    python3 scripts/lint_principles.py --cert aaia

Optional flags (the defaults check the CISA files, unchanged):
    --cert aaia   the AAIA files: data/aaia/principles.json (or a draft path),
                  notes data/aaia/notes/d1-3.json (topic codes like 1A and
                  subtopic codes like 1A.2 are both allowed), bank
                  data/aaia/originals/d1-3.json (ids like aaia_d1_004),
                  domains 1-3, no old PRINCIPLES_LIB ids. A principles file
                  that is not written yet prints "skipped: ..." and exits 0
    --notes PATH  notes file, or a folder of d{N}.json notes files, that
                  subtopic codes must exist in (codes like 3C3.2 are allowed)
    --bank DIR    folder of d{N}.json question files; domains come from the
                  files present, ids may carry a prefix (crisc_d3_015) and the
                  old CISA PRINCIPLES_LIB ids are not required

Errors break the schema, a cross-reference or a hard limit. Warnings are
gaps to close (for example a principle with fewer than 3 practice questions).
Exit code 1 if there are errors.

It also reports the question tags: how many bank questions carry each
principle as `principle_id` (docs/content/PRINCIPLE_TAGGING.md), flags any
principle with fewer than MIN_TAGGED, and checks that tags agree with
`practice_ids`.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT = ROOT / "data" / "mindset" / "principles.json"
NOTES = ROOT / "data" / "cisa_notes.json"
ORIGINALS = ROOT / "data" / "originals"
SLIP_COACH = ROOT / "mobile" / "src" / "engine" / "slipCoach.ts"

SCHEMA_VERSION = 2
DOMAINS = {1, 2, 3, 4, 5}
MIN_PER_FAMILY = 2
MIN_PER_DOMAIN = 3
MIN_PRACTICE = 3
# Questions tagged with a principle (principle_id) before it is well covered.
MIN_TAGGED = 10

# Hard word limits.
RULE_MAX = 20
WHY_MAX = 60
EXAMPLE_MAX = 80
NUANCE_MAX = 40
# The optional two-option check (Today's Mindset check).
CHECK_SCENARIO_MAX = 45
CHECK_OPTION_MAX = 22
CHECK_WHY_MAX = 35
# The shorter option must be at least this share of the longer (in characters),
# so length never gives the answer away.
CHECK_LENGTH_RATIO = 0.8

# Every id of the old web PRINCIPLES_LIB. Each must appear in exactly one
# principle's legacy_ids so existing links keep resolving.
LEGACY_IDS = {
    "CONTAIN-FIRST", "REVOCATION-FIRST", "METHODOLOGY-RIGOR-FIRST",
    "BACKUP-IMMUTABILITY-FIRST", "CHAIN-OF-CUSTODY-FIRST", "SCOPE-BEFORE-FIELDWORK",
    "RISK-BEFORE-CONTROLS", "LEAST-PRIVILEGE-ALWAYS", "SEGREGATION-OF-DUTIES-FIRST",
    "GOVERNANCE-OVER-MANAGEMENT", "IMPACT-BEFORE-LIKELIHOOD", "AUDIT-INDEPENDENCE-FIRST",
    "BUSINESS-CONTINUITY-OVER-RECOVERY", "EVIDENCE-BEFORE-CONCLUSION",
    "CONTINUOUS-MONITORING-OVER-PERIODIC",
}
# Used only if mobile/ is absent from the checkout.
FALLBACK_SLIPS = {"runner-up", "priority", "overconfident", "role", "tech-first",
                  "symptom", "misread", "knowledge"}

# --cert profiles. CISA (the default) is the module constants above, unchanged.
AAIA = ROOT / "data" / "aaia"
CERT_PROFILES = {
    "aaia": {
        "principles": AAIA / "principles.json",
        "notes": AAIA / "notes",
        "bank": AAIA / "originals",
        "domains": {1, 2, 3},
        "qid": r"^aaia_d([1-3])_\d{3}$",
        "qid_example": "aaia_d1_004",
        # The AAIA outline (docs/content/AAIA_BLUEPRINT.md): areas 1A-3E and
        # their subtopics 1A.1-3E.3. A principle may link either.
        "subtopic": r"^([1-3])[A-G](?:\.\d+)?$",
        "subtopic_example": "1A or 1A.2",
        "topic_codes": True,
    },
}
# Wording of two messages; a --cert profile swaps in its own id formats.
QID_EXAMPLE = "d1_004"
SUBTOPIC_EXAMPLE = "1A3.6"
TOPIC_CODES = False  # also accept topic codes (1A) as subtopics

TOP_KEYS = {"schema_version", "title", "updated", "description", "families",
            "principles", "slip_map"}
FAMILY_KEYS = {"id", "order", "title", "question"}
REQUIRED = ["id", "family", "order", "title", "rule", "why", "triggers", "trap",
            "example", "domains", "subtopics", "practice_ids", "slip_pattern",
            "legacy_ids"]
OPTIONAL = ["nuance", "aliases", "check"]

KEBAB = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
QID = re.compile(r"^d([1-5])_\d{3}$")
SUBTOPIC = re.compile(r"^([1-5])[AB]\d+\.\d+$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
# Never state the size of the question bank (CLAUDE.md convention).
BANK_SIZE = [
    re.compile(r"\b\d[\d,]*\+?\s+(?:\w+[- ]){0,2}questions?\b", re.I),
    re.compile(r"\b(?:question\s+)?bank\s+(?:of|has|holds|contains|with)\s+\d", re.I),
    re.compile(r"\ball\s+\d[\d,]*\s+(?:items|questions)\b", re.I),
]
BRITISH = re.compile(r"\b(\w+is(e|ed|es|ing|ation)|colour\w*|behaviour\w*|centre\w*|"
                     r"licence|analys(e|ed|es|ing)|favour\w*|organisation\w*|"
                     r"programme\w*|catalogue\w*|defence|judgement|labour\w*|"
                     r"honour\w*|travell\w*|modell\w*)\b", re.I)
BRITISH_OK = {
    "raise", "raised", "raises", "raising", "advise", "advised", "advises", "advising",
    "revise", "revised", "revises", "revising", "exercise", "exercised", "exercises",
    "exercising", "otherwise", "promise", "promised", "promises", "premise", "premises",
    "expertise", "precise", "concise", "wise", "likewise", "noise", "praise", "rise",
    "arise", "arises", "arising", "comprise", "comprises", "comprised", "compromise",
    "compromised", "compromises", "compromising", "enterprise", "enterprises",
    "supervise", "supervised", "supervises", "supervising", "supervision", "devise",
    "devised", "surprise", "surprised", "franchise", "merchandise", "disguise",
    "improvise", "imprecise", "sunrise", "clockwise", "premise", "rising", "risen",
    "uprising", "surprising", "promising", "praising", "appraise", "appraised",
    "appraising", "advertise", "advertised", "advertises", "advertising",
    "franchising", "merchandising", "televised", "chastising", "disguising",
}

errors = []
warnings = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def warn(where, msg):
    warnings.append(f"{where}: {msg}")


def words(text):
    return len(str(text).split())


def sentences(text):
    return len(re.findall(r"[.!?](?:\s|$)", str(text).strip()))


def nonempty_str(v):
    return isinstance(v, str) and v.strip() != ""


def walk_strings(node, path):
    """Yield (path, string) for every string in a JSON value."""
    if isinstance(node, str):
        yield path, node
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk_strings(v, f"{path}[{i}]")
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from walk_strings(v, f"{path}.{k}" if path else k)


def rel(path):
    path = Path(path).resolve()
    return path.relative_to(ROOT) if path.is_relative_to(ROOT) else path


def qdomain(qid):
    """Domain number of a question id, or None if the id is malformed."""
    m = QID.match(qid) if isinstance(qid, str) else None
    return int(m.group(1)) if m else None


def load_questions():
    """Return (all question ids, {id: principle_id} for tagged questions)."""
    ids = set()
    tags = {}
    for n in sorted(DOMAINS):
        f = ORIGINALS / f"d{n}.json"
        try:
            data = json.loads(f.read_text())
        except (OSError, ValueError) as e:
            err(str(rel(f)), f"cannot read question bank ({e})")
            continue
        for q in data.get("questions", []):
            ids.add(q.get("id"))
            if "principle_id" in q:
                tags[q.get("id")] = q["principle_id"]
    return ids, tags


def check_question_tags(doc, ctx):
    """Cross-check principle_id tags on questions against the principles.

    Returns {principle id: {domain: count}} for the report."""
    principles = [p for p in doc.get("principles") or [] if isinstance(p, dict)]
    by_id = {p.get("id"): p for p in principles}
    counts = {p.get("id"): {} for p in principles}
    for qid, pid in sorted(ctx["tags"].items(), key=lambda kv: str(kv[0])):
        m = QID.match(qid) if isinstance(qid, str) else None
        where = f"question {qid}"
        if not isinstance(pid, str) or pid not in by_id:
            err(where, f"principle_id {pid!r} is not a principle id")
            continue
        dom = int(m.group(1)) if m else None
        counts[pid][dom] = counts[pid].get(dom, 0) + 1
        doms = by_id[pid].get("domains") or []
        if dom is not None and dom not in doms:
            warn(where, f"tagged '{pid}', whose domains {doms} exclude D{dom}")
    # practice_ids and principle_id must agree (one principle per question).
    for p in principles:
        for q in p.get("practice_ids") or []:
            tag = ctx["tags"].get(q)
            if tag is not None and tag != p.get("id"):
                err(f"principle '{p.get('id')}'",
                    f"practice id '{q}' is tagged principle_id '{tag}'; the two must agree")
    if ctx["tags"]:
        for pid, per_dom in counts.items():
            total = sum(per_dom.values())
            if total < MIN_TAGGED:
                warn(f"principle '{pid}'", f"{total} tagged question(s) (target {MIN_TAGGED}+)")
    return counts


def load_subtopic_codes():
    files = sorted(NOTES.glob("d*.json")) if NOTES.is_dir() else [NOTES]
    if not files:
        err(str(rel(NOTES)), "no d{N}.json notes files found")
    codes = set()
    for f in files:
        try:
            notes = json.loads(f.read_text())
        except (OSError, ValueError) as e:
            err(str(rel(f)), f"cannot read notes ({e})")
            continue
        # One combined file holds "domains"; a per-domain file holds "topics".
        for d in notes.get("domains", [notes]):
            for t in d.get("topics", []):
                if TOPIC_CODES:
                    codes.add(t.get("topic_id"))
                for s in t.get("subtopics", []):
                    codes.add(s.get("id"))
    return codes


def load_slip_patterns():
    try:
        src = SLIP_COACH.read_text()
    except OSError:
        warn("slipCoach.ts", "not found; using the built-in slip pattern list")
        return set(FALLBACK_SLIPS)
    m = re.search(r"PATTERN_COPY[^{]*\{(.*?)\n\};", src, re.S)
    if not m:
        warn("slipCoach.ts", "PATTERN_COPY not parsed; using the built-in slip pattern list")
        return set(FALLBACK_SLIPS)
    keys = set(re.findall(r"^\s*'?([a-z-]+)'?\s*:\s*\{", m.group(1), re.M))
    return keys or set(FALLBACK_SLIPS)


RUNNER_UP = re.compile(r"runner[- ]?up", re.I)


def check_text_hygiene(doc):
    for path, s in walk_strings(doc, ""):
        for rx in BANK_SIZE:
            if rx.search(s):
                err(path, f"states a bank size or question count: '{rx.search(s).group(0)}'")
        if EMOJI.search(s):
            err(path, "contains an emoji")
        for m in BRITISH.finditer(s):
            if m.group(0).lower() not in BRITISH_OK:
                err(path, f"British spelling '{m.group(0)}' (use US English)")
        # Learner copy says "closest wrong choice", never "runner-up". The
        # slip_pattern id 'runner-up' stays: saved slip-coach data and the
        # slip_map key use it.
        if RUNNER_UP.search(s) and not path.endswith(".slip_pattern"):
            err(path, "says 'runner-up' (learner copy says 'closest wrong choice')")


def check_families(families):
    ids = {}
    orders = set()
    if not isinstance(families, list) or not families:
        err("families", "must be a non-empty list")
        return ids
    for i, f in enumerate(families):
        where = f"families[{i}]"
        if not isinstance(f, dict):
            err(where, "must be an object")
            continue
        missing = FAMILY_KEYS - f.keys()
        extra = f.keys() - FAMILY_KEYS
        if missing:
            err(where, f"missing {sorted(missing)}")
        if extra:
            err(where, f"unknown keys {sorted(extra)}")
        fid = f.get("id")
        if not (isinstance(fid, str) and KEBAB.match(fid)):
            err(where, f"id '{fid}' is not kebab-case")
        elif fid in ids:
            err(where, f"duplicate family id '{fid}'")
        else:
            ids[fid] = f
        if not isinstance(f.get("order"), int) or f.get("order") in orders:
            err(where, f"order must be a unique integer (got {f.get('order')!r})")
        orders.add(f.get("order"))
        for k in ("title", "question"):
            if not nonempty_str(f.get(k)):
                err(where, f"'{k}' must be a non-empty string")
        if nonempty_str(f.get("question")) and not f["question"].strip().endswith("?"):
            err(where, "question must end with '?'")
    if orders and sorted(orders) != list(range(1, len(orders) + 1)):
        err("families", f"orders must run 1..{len(orders)} (got {sorted(orders)})")
    return ids


def check_principle(p, i, ctx):
    where = f"principles[{i}]"
    if not isinstance(p, dict):
        err(where, "must be an object")
        return
    pid = p.get("id")
    if isinstance(pid, str):
        where = f"principle '{pid}'"
    for k in REQUIRED:
        if k not in p:
            err(where, f"missing required field '{k}'")
    extra = p.keys() - set(REQUIRED) - set(OPTIONAL)
    if extra:
        err(where, f"unknown fields {sorted(extra)}")

    # id, family, order, title
    if not (isinstance(pid, str) and KEBAB.match(pid)):
        err(where, f"id '{pid}' is not kebab-case")
    elif pid in ctx["ids"]:
        err(where, "duplicate principle id")
    else:
        ctx["ids"].add(pid)
    fam = p.get("family")
    if fam not in ctx["families"]:
        err(where, f"family '{fam}' is not a declared family")
    else:
        ctx["per_family"].setdefault(fam, []).append(pid)
        order = p.get("order")
        key = (fam, order)
        if not isinstance(order, int) or key in ctx["orders"]:
            err(where, f"order must be a unique integer within its family (got {order!r})")
        ctx["orders"].add(key)
    if not nonempty_str(p.get("title")):
        err(where, "title must be a non-empty string")

    # rule
    rule = p.get("rule")
    if not nonempty_str(rule):
        err(where, "rule must be a non-empty string")
    else:
        if "\n" in rule:
            err(where, "rule must be one line")
        if words(rule) > RULE_MAX:
            err(where, f"rule is {words(rule)} words (max {RULE_MAX})")

    # why
    why = p.get("why")
    if not nonempty_str(why):
        err(where, "why must be a non-empty string")
    else:
        if words(why) > WHY_MAX:
            err(where, f"why is {words(why)} words (max {WHY_MAX})")
        n = sentences(why)
        if n < 2 or n > 3:
            err(where, f"why must be 2-3 sentences (found {n})")

    # triggers
    trig = p.get("triggers")
    if not (isinstance(trig, list) and len(trig) >= 3 and all(nonempty_str(t) for t in trig)):
        err(where, "triggers must be a list of at least 3 non-empty strings")
    elif len(set(t.lower() for t in trig)) != len(trig):
        err(where, "triggers contain duplicates")

    # trap
    trap = p.get("trap")
    if not (isinstance(trap, dict) and set(trap.keys()) == {"move", "why_wrong"}
            and nonempty_str(trap.get("move")) and nonempty_str(trap.get("why_wrong"))):
        err(where, "trap must be an object with non-empty 'move' and 'why_wrong'")

    # example
    ex = p.get("example")
    if not (isinstance(ex, dict) and set(ex.keys()) == {"scenario", "answer"}
            and nonempty_str(ex.get("scenario")) and nonempty_str(ex.get("answer"))):
        err(where, "example must be an object with non-empty 'scenario' and 'answer'")
    else:
        total = words(ex["scenario"]) + words(ex["answer"])
        if total > EXAMPLE_MAX:
            err(where, f"example is {total} words (max {EXAMPLE_MAX})")

    # nuance (optional)
    if "nuance" in p:
        if not nonempty_str(p["nuance"]):
            err(where, "nuance, when present, must be a non-empty string")
        elif words(p["nuance"]) > NUANCE_MAX:
            err(where, f"nuance is {words(p['nuance'])} words (max {NUANCE_MAX})")

    # check (optional): one two-option question, right move against the trap
    if "check" in p:
        ck = p["check"]
        keys = {"scenario", "right", "trap", "why"}
        if not (isinstance(ck, dict) and set(ck.keys()) == keys
                and all(nonempty_str(ck.get(k)) for k in keys)):
            err(where, "check must be an object with non-empty 'scenario', 'right', 'trap' and 'why'")
        else:
            if words(ck["scenario"]) > CHECK_SCENARIO_MAX:
                err(where, f"check.scenario is {words(ck['scenario'])} words (max {CHECK_SCENARIO_MAX})")
            for k in ("right", "trap"):
                if words(ck[k]) > CHECK_OPTION_MAX:
                    err(where, f"check.{k} is {words(ck[k])} words (max {CHECK_OPTION_MAX})")
            if words(ck["why"]) > CHECK_WHY_MAX:
                err(where, f"check.why is {words(ck['why'])} words (max {CHECK_WHY_MAX})")
            a, b = len(ck["right"].strip()), len(ck["trap"].strip())
            if ck["right"].strip() == ck["trap"].strip():
                err(where, "check.right and check.trap are the same")
            elif min(a, b) < CHECK_LENGTH_RATIO * max(a, b):
                err(where, f"check options differ too much in length ({a} vs {b} characters)")

    # domains
    doms = p.get("domains")
    if not (isinstance(doms, list) and doms and all(isinstance(d, int) for d in doms)
            and set(doms) <= DOMAINS and len(set(doms)) == len(doms)):
        err(where, f"domains must be a non-empty list of unique integers {min(DOMAINS)}-{max(DOMAINS)}")
        doms = []
    elif doms != sorted(doms):
        err(where, "domains must be sorted ascending")
    for d in doms:
        ctx["per_domain"].setdefault(d, []).append(pid)

    # subtopics
    subs = p.get("subtopics")
    if not isinstance(subs, list):
        err(where, "subtopics must be a list")
        subs = []
    if len(set(subs)) != len(subs):
        err(where, "subtopics contain duplicates")
    if not subs and fam != "reading":
        warn(where, "no subtopics linked")
    for s in subs:
        m = SUBTOPIC.match(s) if isinstance(s, str) else None
        if not m:
            err(where, f"subtopic '{s}' is not a note code like {SUBTOPIC_EXAMPLE}")
            continue
        if ctx["codes"] and s not in ctx["codes"]:
            err(where, f"subtopic '{s}' does not exist in {rel(NOTES)}")
        if int(m.group(1)) not in doms:
            err(where, f"subtopic '{s}' is in D{m.group(1)}, which is not in domains")

    # practice_ids
    pids = p.get("practice_ids")
    if not isinstance(pids, list):
        err(where, "practice_ids must be a list")
        pids = []
    if len(set(pids)) != len(pids):
        err(where, "practice_ids contain duplicates")
    for q in pids:
        m = QID.match(q) if isinstance(q, str) else None
        if not m:
            err(where, f"practice id '{q}' is not like {QID_EXAMPLE}")
            continue
        if ctx["qids"] and q not in ctx["qids"]:
            err(where, f"practice id '{q}' does not exist in {rel(ORIGINALS)}")
        if int(m.group(1)) not in doms:
            err(where, f"practice id '{q}' is in D{m.group(1)}, which is not in domains")
        owner = ctx["practice_owner"].get(q)
        if owner and owner != pid:
            err(where, f"practice id '{q}' is already used by '{owner}' (one principle per question)")
        ctx["practice_owner"][q] = pid
    if len(pids) < MIN_PRACTICE:
        warn(where, f"only {len(pids)} practice_ids (target {MIN_PRACTICE}+); write questions for this gap")
    if len({qdomain(q) for q in pids if qdomain(q)}) == 1 and len(doms) > 1:
        warn(where, "practice_ids all come from one domain")

    # slip_pattern
    slip = p.get("slip_pattern")
    if slip is not None:
        if slip not in ctx["slips"]:
            err(where, f"slip_pattern '{slip}' is not a slip coach pattern {sorted(ctx['slips'])}")
        elif slip in ctx["slip_owner"]:
            err(where, f"slip_pattern '{slip}' is already the primary pattern of '{ctx['slip_owner'][slip]}'")
        else:
            ctx["slip_owner"][slip] = pid

    # legacy_ids and aliases
    for field in ("legacy_ids", "aliases"):
        vals = p.get(field, [])
        if not isinstance(vals, list) or not all(nonempty_str(v) for v in vals):
            err(where, f"{field} must be a list of strings")
            continue
        for v in vals:
            if field == "legacy_ids" and v not in LEGACY_IDS:
                err(where, f"legacy id '{v}' is not an old PRINCIPLES_LIB id")
            other = ctx["old_owner"].get(v)
            if other and other != pid:
                err(where, f"'{v}' is already mapped to '{other}'")
            ctx["old_owner"][v] = pid


def configure(notes=None, bank=None):
    """Point the checks at another certification's notes and bank.

    With no flags nothing changes: the CISA notes, the CISA bank, domains 1-5
    and the old PRINCIPLES_LIB ids."""
    global NOTES, ORIGINALS, DOMAINS, QID, SUBTOPIC, LEGACY_IDS
    if notes:
        NOTES = Path(notes).resolve()
        SUBTOPIC = re.compile(r"^([1-9])[A-Z]\d+\.\d+$")
    if bank:
        ORIGINALS = Path(bank).resolve()
        found = {int(m.group(1)) for f in ORIGINALS.glob("d*.json")
                 if (m := re.fullmatch(r"d([1-9])\.json", f.name))}
        if not found:
            print(f"✗ no d{{N}}.json question files in {bank}")
            sys.exit(1)
        DOMAINS = found
        QID = re.compile(r"^(?:[a-z]+_)?d([1-9])_\d{3}$")
        LEGACY_IDS = set()  # the old web PRINCIPLES_LIB was CISA only


def configure_cert(cert):
    """Point every check at a --cert profile (CERT_PROFILES). Returns its default file."""
    global NOTES, ORIGINALS, DOMAINS, QID, SUBTOPIC, LEGACY_IDS
    global QID_EXAMPLE, SUBTOPIC_EXAMPLE, TOPIC_CODES
    prof = CERT_PROFILES.get(cert)
    if prof is None:
        print(f"✗ --cert {cert}: unknown certification (known: {', '.join(sorted(CERT_PROFILES))})")
        sys.exit(2)
    NOTES, ORIGINALS = prof["notes"], prof["bank"]
    DOMAINS = set(prof["domains"])
    QID = re.compile(prof["qid"])
    SUBTOPIC = re.compile(prof["subtopic"])
    QID_EXAMPLE, SUBTOPIC_EXAMPLE = prof["qid_example"], prof["subtopic_example"]
    TOPIC_CODES = prof["topic_codes"]
    LEGACY_IDS = set()  # the old web PRINCIPLES_LIB was CISA only
    return prof["principles"]


def parse_args(argv):
    path, opts = None, {"notes": None, "bank": None, "cert": None}
    args = list(argv[1:])
    while args:
        a = args.pop(0)
        if a in ("--notes", "--bank", "--cert"):
            if not args:
                print(f"✗ {a} needs a value")
                sys.exit(2)
            opts[a[2:]] = args.pop(0)
        elif a.startswith("--"):
            print(f"✗ unknown option {a}")
            sys.exit(2)
        else:
            path = Path(a)
    return path or DEFAULT, opts


def main(argv):
    path, opts = parse_args(argv)
    cert = (opts.pop("cert") or "").lower()
    if cert and cert != "cisa":
        default = configure_cert(cert)
        if path == DEFAULT:
            path = default
        if not path.exists():
            print(f"Principles lint ({cert}): skipped: {rel(path)} not written yet")
            return 0
    configure(**opts)
    try:
        doc = json.loads(path.read_text())
    except (OSError, ValueError) as e:
        print(f"✗ cannot read {path}: {e}")
        return 1

    if not isinstance(doc, dict):
        print("✗ top level must be an object")
        return 1
    missing = TOP_KEYS - doc.keys()
    extra = doc.keys() - TOP_KEYS
    if missing:
        err("top level", f"missing {sorted(missing)}")
    if extra:
        err("top level", f"unknown keys {sorted(extra)}")
    if doc.get("schema_version") != SCHEMA_VERSION:
        err("schema_version", f"expected {SCHEMA_VERSION}, got {doc.get('schema_version')!r}")
    if not (isinstance(doc.get("updated"), str) and DATE.match(doc["updated"])):
        err("updated", "must be a YYYY-MM-DD date")

    qids, tags = load_questions()
    ctx = {
        "families": check_families(doc.get("families")),
        "qids": qids, "tags": tags,
        "codes": load_subtopic_codes(),
        "slips": load_slip_patterns(),
        "ids": set(), "orders": set(), "per_family": {}, "per_domain": {},
        "practice_owner": {}, "slip_owner": {}, "old_owner": {},
    }

    principles = doc.get("principles")
    if not isinstance(principles, list) or not principles:
        err("principles", "must be a non-empty list")
        principles = []
    for i, p in enumerate(principles):
        check_principle(p, i, ctx)

    # Aliases must not shadow principle ids.
    for old, owner in ctx["old_owner"].items():
        if old in ctx["ids"]:
            err(f"principle '{owner}'", f"'{old}' collides with a principle id")

    # Coverage rules.
    for fam in ctx["families"]:
        n = len(ctx["per_family"].get(fam, []))
        if n < MIN_PER_FAMILY:
            err(f"family '{fam}'", f"has {n} principles (min {MIN_PER_FAMILY})")
    for d in sorted(DOMAINS):
        n = len(ctx["per_domain"].get(d, []))
        if n < MIN_PER_DOMAIN:
            err(f"domain {d}", f"has {n} principles (min {MIN_PER_DOMAIN})")
    for fam, members in ctx["per_family"].items():
        orders = sorted(o for (f, o) in ctx["orders"] if f == fam and isinstance(o, int))
        if orders != list(range(1, len(members) + 1)):
            err(f"family '{fam}'", f"principle orders must run 1..{len(members)} (got {orders})")
    unmapped = LEGACY_IDS - set(ctx["old_owner"])
    if unmapped:
        err("legacy_ids", f"old PRINCIPLES_LIB ids not mapped: {sorted(unmapped)}")

    # slip_map: every slip pattern has an entry; targets exist; primaries agree.
    sm = doc.get("slip_map")
    if not isinstance(sm, dict):
        err("slip_map", "must be an object")
    else:
        if set(sm) != ctx["slips"]:
            err("slip_map", f"keys must be exactly the slip coach patterns {sorted(ctx['slips'])}")
        for slip, target in sm.items():
            if target is not None and target not in ctx["ids"]:
                err("slip_map", f"'{slip}' points to unknown principle '{target}'")
        for slip, owner in ctx["slip_owner"].items():
            if sm.get(slip) != owner:
                err("slip_map", f"'{slip}' should point to '{owner}', which declares it as slip_pattern")

    tag_counts = check_question_tags(doc, ctx)
    check_text_hygiene(doc)

    # Report.
    shown = rel(path)
    print(f"Principles lint: {shown}")
    print(f"  {len(principles)} principles in {len(ctx['families'])} families")
    fam_line = ", ".join(f"{f} {len(ctx['per_family'].get(f, []))}" for f in ctx["families"])
    print(f"  per family: {fam_line}")
    dom_line = ", ".join(f"D{d} {len(ctx['per_domain'].get(d, []))}" for d in sorted(DOMAINS))
    print(f"  per domain: {dom_line}")
    n_q = len(ctx["qids"] - {None})
    print(f"  question tags (principle_id): {len(ctx['tags'])} of {n_q} tagged")
    if ctx["tags"]:
        tagged_doms = sorted({qdomain(q) for q in ctx["tags"] if qdomain(q)})
        for pid, per_dom in tag_counts.items():
            total = sum(per_dom.values())
            split = ", ".join(f"D{d} {per_dom.get(d, 0)}" for d in tagged_doms)
            flag = "  < target" if total < MIN_TAGGED else ""
            print(f"    {total:4d}  {pid} ({split}){flag}")
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
