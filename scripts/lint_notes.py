#!/usr/bin/env python3
"""Lint the topic notes against docs/content/NOTES_SCHEMA_V2.md.

Usage:
    python3 scripts/lint_notes.py                      # data/cisa_notes.json, all domains
    python3 scripts/lint_notes.py path/to/domain4.json # one domain object (writer drafts)
    python3 scripts/lint_notes.py --domain 4           # one domain of the main file

Errors break the schema or a hard limit; warnings are style targets.
Exit code 1 if there are errors.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ECO = ROOT / "docs" / "content" / "CISA_ECO.md"

REQUIRED_SUB = ["id", "name", "definition", "why_it_matters", "how_it_works",
                "example", "isaca_rule", "exam_traps", "key_terms"]
OPTIONAL_SUB = ["legacy_ids", "compare", "types", "illustration", "analogy", "memory_aid"]
V1_FIELDS = ["summary", "key_point", "exam_tip", "common_mistakes", "categories"]
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
BRITISH = re.compile(r"\b(\w+is(e|ed|es|ing|ation)|colour\w*|behaviour\w*|centre\w*|"
                     r"licence|analys(e|ed|es|ing)|favour\w*|organisation\w*|"
                     r"programme\w*|catalogue\w*|defence|judgement)\b", re.I)
BRITISH_OK = {"raise", "raised", "raises", "raising", "advise", "advised", "advises", "advising",
              "revise", "revised", "revises", "revising", "exercise", "exercised", "exercises",
              "exercising", "otherwise", "promise", "promised", "promises", "premise", "premises",
              "expertise", "precise", "concise", "wise", "likewise", "noise", "praise", "rise",
              "arise", "arises", "arising", "arisen", "comprise", "comprises", "comprised",
              "comprising", "compromise", "compromised", "compromises", "compromising",
              "enterprise", "enterprises", "supervise", "supervised", "supervises",
              "supervising", "supervision", "devise", "devised", "televise", "surprise",
              "surprised", "franchise", "merchandise", "disguise", "disguised", "chastise",
              "excise", "incise", "circumcise", "despise", "improvise", "improvised",
              "demise", "paradise", "poise", "cruise", "bruise", "guise", "anise",
              "treatise", "mortise", "concise", "precise", "imprecise", "reprise",
              "sunrise", "otherwise", "clockwise", "crosswise", "lengthwise", "streetwise",
              "advertise", "advertised", "advertises", "advertising", "apprise", "apprised",
              "premised", "noises", "praised", "rises", "wisest", "wiser"}

def words(s):
    return len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'’/-]*", s or ""))

EX_STOP = set("a an and are as at be by for from has have in is it its of on or that the their this to was were with "
               "which what who will would should can may must not no than then there these they into over per each any "
               "all most more less also when while if but so such only".split())
EXAMPLE_OVERLAP_MAX = 0.25  # an example this close to a bank question gives the practice answer away

def content_words(s):
    return {w for w in re.findall(r"[a-z0-9]+", (s or "").lower()) if w not in EX_STOP and len(w) > 2}

def bank_items(n):
    path = ROOT / "data" / "originals" / f"d{n}.json"
    if not path.exists():
        return []
    data = json.loads(path.read_text())
    data = data["questions"] if isinstance(data, dict) else data
    return [(q["id"], content_words(q["question"] + " " + q["options"][q["correct"]])) for q in data]

def eco_codes():
    codes = []
    for line in ECO.read_text().splitlines():
        m = re.match(r"- (\d[AB]\d+) ", line)
        if m and m.group(1) not in codes:
            codes.append(m.group(1))
    return codes

class Report:
    def __init__(self):
        self.errors, self.warnings = [], []
    def err(self, where, msg):
        self.errors.append(f"ERROR {where}: {msg}")
    def warn(self, where, msg):
        self.warnings.append(f"warn  {where}: {msg}")

def text_checks(r, where, field, s):
    if not isinstance(s, str):
        return
    if EMOJI.search(s):
        r.err(where, f"{field} contains emoji")
    if re.search(r"precise terms?\s*(is|are|:)", s, re.I):
        r.err(where, f"{field} uses the old 'Precise term' device")
    if re.match(r"\s*trap\s*:", s, re.I):
        r.warn(where, f"{field} starts with 'Trap:' (the renderer adds labels)")
    for m in BRITISH.finditer(s):
        w = m.group(0).lower()
        if w not in BRITISH_OK and not w.endswith("wise"):
            r.warn(where, f"{field}: British spelling? '{m.group(0)}'")
    if re.search(r"\b\d[\d,]*\s+(practice\s+)?questions\b", s, re.I):
        r.err(where, f"{field} may mention the bank size")

def lint_sub(r, s, topic_id, seen_terms):
    where = s.get("id", "?")
    for f in REQUIRED_SUB:
        if f not in s or s[f] in (None, "", []):
            r.err(where, f"missing {f}")
    for f in V1_FIELDS:
        if f in s:
            r.err(where, f"v1 field '{f}' still present")
    for f in s:
        if f not in REQUIRED_SUB + OPTIONAL_SUB:
            r.err(where, f"unknown field '{f}'")
    if not str(s.get("id", "")).startswith(topic_id + "."):
        r.err(where, f"id does not start with {topic_id}.")
    name = s.get("name", "")
    if name.endswith("?"):
        r.warn(where, "name is a question")
    if name and name[0].islower():
        r.warn(where, "name should start with a capital")
    small = {"a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "vs", "vs.", "with", "from", "into", "per", "via"}
    lower_words = [w for w in name.split()[1:] if w[:1].islower() and w not in small]
    if len(lower_words) >= 2:
        r.warn(where, f"name not in Title Case: '{name}'")

    d = s.get("definition", "")
    if d and not 12 <= words(d) <= 30:
        r.err(where, f"definition is {words(d)} words (12-30)")
    w = s.get("why_it_matters", "")
    if w and words(w) > 45:
        r.err(where, f"why_it_matters is {words(w)} words (max 45)")
    hiw = s.get("how_it_works", [])
    if not isinstance(hiw, list):
        r.err(where, "how_it_works must be a list")
        hiw = []
    elif hiw and not 3 <= len(hiw) <= 6:
        r.err(where, f"how_it_works has {len(hiw)} bullets (3-6)")
    for i, b in enumerate(hiw):
        if words(b) > 30:
            r.err(where, f"how_it_works[{i}] is {words(b)} words (max 30)")
    ex = s.get("example", "")
    if ex and not 30 <= words(ex) <= 80:
        r.err(where, f"example is {words(ex)} words (30-80)")
    rule = s.get("isaca_rule", "")
    if rule and words(rule) > 50:
        r.err(where, f"isaca_rule is {words(rule)} words (max 50)")
    traps = s.get("exam_traps", [])
    if not isinstance(traps, list) or not 1 <= len(traps) <= 2:
        r.err(where, "exam_traps must be a list of 1-2")
        traps = traps if isinstance(traps, list) else []
    for i, t in enumerate(traps):
        if not isinstance(t, dict) or set(t) != {"trap", "why"}:
            r.err(where, f"exam_traps[{i}] must have exactly trap and why")
            continue
        if words(t["trap"]) > 25:
            r.err(where, f"exam_traps[{i}].trap is {words(t['trap'])} words (max 25)")
        if words(t["why"]) > 40:
            r.err(where, f"exam_traps[{i}].why is {words(t['why'])} words (max 40)")
    kt = s.get("key_terms", [])
    if not isinstance(kt, list) or not 2 <= len(kt) <= 5:
        r.err(where, "key_terms must be a list of 2-5")
        kt = kt if isinstance(kt, list) else []
    terms_here = []
    for i, k in enumerate(kt):
        if not isinstance(k, dict) or set(k) != {"term", "definition"}:
            r.err(where, f"key_terms[{i}] must have exactly term and definition")
            continue
        if words(k["definition"]) > 25:
            r.err(where, f"key_terms[{i}] definition is {words(k['definition'])} words (max 25)")
        terms_here.append(k["term"])
    cmp_ = s.get("compare")
    if cmp_ is not None:
        cols = cmp_.get("columns", []) if isinstance(cmp_, dict) else []
        rows = cmp_.get("rows", []) if isinstance(cmp_, dict) else []
        if not 2 <= len(cols) <= 4:
            r.err(where, f"compare has {len(cols)} columns (2-4)")
        if not 1 <= len(rows) <= 5:
            r.err(where, f"compare has {len(rows)} rows (1-5)")
        for i, row in enumerate(rows):
            if not isinstance(row, dict) or "label" not in row or len(row.get("cells", [])) != len(cols):
                r.err(where, f"compare.rows[{i}] needs a label and {len(cols)} cells")
        terms_here += cols
    ty = s.get("types")
    if ty is not None:
        if not isinstance(ty, list) or not 2 <= len(ty) <= 6:
            r.err(where, "types must be a list of 2-6")
        else:
            for i, t in enumerate(ty):
                if not isinstance(t, dict) or set(t) != {"term", "meaning"}:
                    r.err(where, f"types[{i}] must have exactly term and meaning")
                else:
                    terms_here.append(t["term"])
    # "Run book" and "Runbook", "Critical path (batch)" and "critical path": same term
    norm = [re.sub(r"[\s\-]+", "", re.sub(r"\s*\(.*?\)", "", t.lower())).strip() for t in terms_here]
    dup = {t for t in norm if norm.count(t) > 1}
    if dup:
        r.warn(where, f"term appears in more than one place: {sorted(dup)}")
    for t in set(norm):
        if t in seen_terms and seen_terms[t] != where:
            r.warn(where, f"key term '{t}' also defined in {seen_terms[t]}")
        else:
            seen_terms.setdefault(t, where)
    mem = s.get("memory_aid")
    if mem and words(mem) > 20:
        r.err(where, f"memory_aid is {words(mem)} words (max 20)")
    total = sum(words(s.get(f, "")) for f in ["definition", "why_it_matters", "example", "isaca_rule"])
    total += sum(words(b) for b in hiw) + sum(words(t.get("trap", "")) + words(t.get("why", "")) for t in traps if isinstance(t, dict))
    total += sum(words(k.get("term", "")) + words(k.get("definition", "")) for k in kt if isinstance(k, dict))
    if not 180 <= total <= 380:
        r.warn(where, f"{total} words (target 180-380)")
    for f in ["name", "definition", "why_it_matters", "example", "isaca_rule", "analogy", "memory_aid"]:
        text_checks(r, where, f, s.get(f))
    for b in hiw:
        text_checks(r, where, "how_it_works", b)
    for t in traps:
        if isinstance(t, dict):
            text_checks(r, where, "exam_traps", t.get("trap"))
            text_checks(r, where, "exam_traps", t.get("why"))

def lint_domain(r, dom, codes):
    n = dom.get("domain_number")
    where = f"D{n}"
    need = ["domain_number", "topics"] if dom.get("partial") == "B" else \
        ["domain_number", "domain_name", "exam_weight", "overview", "analogy", "parts", "topics", "key_terminologies"]
    for f in need:
        if f not in dom:
            r.err(where, f"missing {f}")
    for f in ["summary", "real_life_analogy"]:
        if f in dom:
            r.err(where, f"v1 field '{f}' still present")
    a = dom.get("analogy", "")
    if a and not 40 <= words(a) <= 110:
        r.warn(where, f"analogy is {words(a)} words (40-110)")
    kt = dom.get("key_terminologies", {})
    if isinstance(kt, dict) and not 15 <= len(kt) <= 30:
        r.warn(where, f"{len(kt)} key_terminologies (15-30)")
    want = [c for c in codes if c.startswith(str(n))]
    got = [t.get("topic_id") for t in dom.get("topics", [])]
    if dom.get("partial"):  # a writer's draft for one Part (A or B) of a domain
        want = [c for c in want if c[1] == dom["partial"]]
    if want and got != want:
        r.err(where, f"topic ids {got} do not match the outline {want}")
    part_ids = [tid for p in dom.get("parts", []) for tid in p.get("topic_ids", [])]
    if part_ids and part_ids != got and not dom.get("partial"):
        r.err(where, "parts.topic_ids do not list the topics in order")
    seen_terms, ids = {}, set()
    bank = bank_items(n)
    for t in dom.get("topics", []):
        tw = t.get("topic_id", "?")
        for f in ["topic_id", "topic_name", "overview", "can_do", "subtopics"]:
            if f not in t:
                r.err(tw, f"missing {f}")
        if "summary" in t:
            r.err(tw, "v1 field 'summary' still present")
        cd = t.get("can_do", [])
        if isinstance(cd, list) and not 2 <= len(cd) <= 4:
            r.err(tw, f"can_do has {len(cd)} items (2-4)")
        if words(t.get("overview", "")) > 70:
            r.warn(tw, f"overview is {words(t.get('overview', ''))} words")
        text_checks(r, tw, "overview", t.get("overview"))
        for s in t.get("subtopics", []):
            if s.get("id") in ids:
                r.err(s.get("id"), "duplicate id")
            ids.add(s.get("id"))
            lint_sub(r, s, tw, seen_terms)
            ex = content_words(s.get("example", ""))
            if ex and bank:
                score, qid = max((len(ex & w) / max(1, len(ex | w)), q) for q, w in bank)
                if score >= EXAMPLE_OVERLAP_MAX:
                    r.warn(s.get("id"), f"example retells bank question {qid} (overlap {score:.2f}); use a fresh scenario")
    return len(ids)

def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    only = None
    if "--domain" in argv:
        only = int(argv[argv.index("--domain") + 1])
        args = [a for a in args if a != str(only)]
    path = Path(args[0]) if args else ROOT / "data" / "cisa_notes.json"
    data = json.loads(path.read_text())
    domains = data["domains"] if "domains" in data else [data]
    if "domains" in data and data.get("schema_version") != 2:
        print("ERROR root: schema_version is not 2")
    codes = eco_codes()
    r = Report()
    count = 0
    for dom in domains:
        if only and dom.get("domain_number") != only:
            continue
        count += lint_domain(r, dom, codes)
    for line in r.errors + r.warnings:
        print(line)
    print(f"{count} subtopic(s) checked · {len(r.errors)} error(s) · {len(r.warnings)} warning(s)")
    return 1 if r.errors else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
