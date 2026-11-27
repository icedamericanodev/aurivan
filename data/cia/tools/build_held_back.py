#!/usr/bin/env python3
"""Build (and freeze) each CIA Part pack's held-back full exam form.

The held-back form is one full exam, the same for every learner, kept out of
practice so a learner's first try at it is a fair read (docs/content/CIA_BANK_PLAN.md,
section 3 decision 4, and section 11, the expert decisions of 27 Nov 2026). Its
items join practice, with their explanations, once the learner has taken it.

Output: <pack>/exam/held_back.json
  {"_meta": {"comment": ..., "frozen": "YYYY-MM-DD", "exam": "cia1"}, "ids": [...]}

The rules, every one checked again by --check:
  - exactly the exam's count and section split, as the app deals it
    (cia_common.allocate: Part 1 125 as 44/25/37/19; Parts 2 and 3 100 as
    50/40/10 and 25/15/15/45);
  - every topic of the outline sampled;
  - no retired item, no dated item (`testable_from` set, whatever the date),
    no id the pack's free sample publishes;
  - no item from a one-item bullet, and more generally every bullet keeps at
    least one live, undated item in practice (a bullet's last item is never held
    back). Bullets come from the coverage map (docs/content/CIA_P{1,2,3}_COVERAGE.md,
    section 3: each item's one primary bullet; "also touched by" does not count).
    A topic-line row ("1B2 (line)") is treated like a bullet. An item the map does
    not place is never held back;
  - no two items of one sibling group (shared/siblings.json, cut to the pack's live
    items, groups that share an id joined, as mobile/scripts/siblings-pack.cjs does);
  - a difficulty mix close to the pack's own (drawn to each section's own mix;
    --check fails at more than 10 points off the pack's share of any level);
  - what is left still holds one short mock (a third of the exam, at section
    weights) of unseen, testable items, one per sibling group, so the short mock
    never needs the held-back items.

Free sample: the published list `data/free/<pack>_sample_ids.json` ({"ids": [...]},
as CISA's `data/free/cisa_sample_ids.json`), read when it exists (no CIA list
exists yet). The free-sample builder must leave the held-back ids out.

Frozen: once the file exists a build never changes it (the form must be the same
for every learner); `--refreeze` draws it again and stamps today's date. The draw is
deterministic (items ordered by a SHA-256 of a fixed seed and the id), so a build
into an empty folder always gives the same form for the same bank.

If a pack cannot meet the rules nothing is written, and the shortfall is printed
per section (how many are needed, how many can be held back, and why the rest
cannot). The Challenge pack is out of scope.

On another tree (--root, the harness fixture) the coverage maps and free-sample
lists are read from <root>/_coverage/ and <root>/_free/; --maps DIR and --free DIR
override either.

Usage:
  python3 data/cia/tools/build_held_back.py cia1              # build (or keep) cia1's form
  python3 data/cia/tools/build_held_back.py                   # every Part pack
  python3 data/cia/tools/build_held_back.py cia1 --refreeze   # draw it again (changes what learners get)
  python3 data/cia/tools/build_held_back.py --check           # fail if a frozen form breaks a rule (no file: passes)
"""
import hashlib
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import cia_common as c

SEED = "kaisip-cia-held-back-v1"
LEVELS = ["foundational", "application", "analysis"]
MIX_TOLERANCE = 10          # percentage points a level may differ from the pack's own share
ROW = re.compile(r"\|\s*(\d[A-D]\d+[a-z]?(?: \(line\))?)\s*\|")
ID = re.compile(r"\b((?:cia\d_)?d\d+_\d{3})\b")
COMMENT = ("The held-back full exam form: the same for every learner, kept out of practice until the learner "
           "has taken it, then joined to practice with its explanations. Frozen: built by "
           "data/cia/tools/build_held_back.py, which never changes it without --refreeze. Do not edit by hand. "
           "Rules: docs/content/CIA_BANK_PLAN.md, section 3 decision 4 and section 11.")


def where(root, args):
    maps = c.pop_opt(args, "--maps")
    free = c.pop_opt(args, "--free")
    real = root == c.CIA
    maps = Path(maps) if maps else (c.REPO / "docs" / "content" if real else root / "_coverage")
    free = Path(free) if free else (c.REPO / "data" / "free" if real else root / "_free")
    return maps, free


def h(qid):
    return hashlib.sha256(f"{SEED}:{qid}".encode()).hexdigest()


def read_map(path, pack):
    """{item id: bullet row} from section 3 of a coverage map, plus problem lines."""
    if not path.exists():
        return None, [f"no coverage map at {path} (the bullets come from it)"]
    text = path.read_text(encoding="utf-8")
    m = re.search(r"^## 3\..*?$(.*?)(?=^## 4\.|\Z)", text, re.S | re.M)
    if not m:
        return None, [f"{path.name}: no '## 3.' map section"]
    rows, problems = {}, []
    for line in m.group(1).splitlines():
        rm = ROW.match(line)
        if not rm:
            continue
        cells = [x.strip() for x in line.strip().strip("|").split("|")]
        im = re.match(r"(\d+)(?:\s*[:;]\s*(.*))?$", cells[3]) if len(cells) > 3 else None
        if not im:
            problems.append(f"{path.name}: row {rm.group(1)}: the Items cell does not start 'N: ids'")
            continue
        main = re.sub(r"\([^)]*\)", "", (im.group(2) or "").split("also touched by")[0])
        ids = [i if i.startswith("cia") else f"{pack}_{i}" for i in ID.findall(main)]
        if len(ids) != int(im.group(1)):
            problems.append(f"{path.name}: row {rm.group(1)} says {im.group(1)} item(s) but lists {len(ids)}")
        for i in ids:
            if i in rows:
                problems.append(f"{path.name}: {i} is the primary item of two rows ({rows[i]}, {rm.group(1)})")
            rows[i] = rm.group(1)
    return rows, problems


def read_free(free_dir, pack):
    path = free_dir / f"{pack}_sample_ids.json"
    if not path.exists():
        return set(), None, []
    try:
        ids = c.read_json(path)["ids"]
        assert isinstance(ids, list) and all(isinstance(i, str) for i in ids)
    except Exception:
        return set(), path, [f"{path}: cannot be read as {{\"ids\": [...]}}"]
    return {i if i.startswith(pack + "_") else f"{pack}_{i}" for i in ids}, path, []


def sibling_groups(root, live_ids):
    """{id: joined group id} for the pack's live items, the app's reading (siblings-pack.cjs)."""
    path = root / "shared" / "siblings.json"
    if not path.exists():
        return {}, []
    raw = c.read_json(path)
    if not isinstance(raw, dict) or not isinstance(raw.get("groups"), list):
        return {}, ["shared/siblings.json has no \"groups\" list"]
    parts = []
    for g in raw["groups"]:
        ids = g.get("ids") if isinstance(g, dict) else None
        if not isinstance(ids, list):
            return {}, ["shared/siblings.json: a group without an \"ids\" list"]
        mine = list(dict.fromkeys(i for i in ids if i in live_ids))
        if len(mine) >= 2:
            parts.append(mine)
    parent = list(range(len(parts)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    first = {}
    for n, ids in enumerate(parts):
        for i in ids:
            if i in first:
                parent[find(n)] = find(first[i])
            else:
                first[i] = n
    members = defaultdict(set)
    for n, ids in enumerate(parts):
        members[find(n)].update(ids)
    return {i: min(s) for s in members.values() for i in s}, []


class Pack:
    """Everything the draw and the check need about one Part pack."""

    def __init__(self, root, pack, today, maps, free):
        self.pack, self.today, self.problems = pack, today, []
        outline = c.load_outline(root)
        self.exam = c.exam(outline, pack)
        self.sections = self.exam["sections"]
        self.need = dict(zip((s["letter"] for s in self.sections),
                             c.allocate(self.exam["questions"], [s["weight"] for s in self.sections])))
        self.short = dict(zip((s["letter"] for s in self.sections),
                              c.allocate(round(self.exam["questions"] / 3), [s["weight"] for s in self.sections])))
        self.topics = {s["letter"]: [t["code"] for t in s["topics"]] for s in self.sections}
        letter = {s["domain"]: s["letter"] for s in self.sections}
        self.items = {}
        for d, path in c.question_files(root, pack):
            for q in c.read_json(path)["questions"]:
                self.items[q["id"]] = dict(q, _sec=letter.get(d, "?"), _topic=q["subtopic"].split()[0])
        self.live = {i: q for i, q in self.items.items() if not c.is_retired(q)}
        self.rows, p = read_map(maps / f"CIA_P{pack[-1]}_COVERAGE.md", pack)
        self.problems += p
        self.rows = self.rows or {}
        self.free, self.free_path, p = read_free(free, pack)
        self.problems += p
        self.group, p = sibling_groups(root, set(self.live))
        self.problems += p
        # A row's live, undated items: the ones that can keep the bullet in practice.
        self.row_items = defaultdict(list)
        for i, q in self.live.items():
            if i in self.rows and not q.get("testable_from"):
                self.row_items[self.rows[i]].append(i)

    def unit(self, i):
        return self.group.get(i, i)

    def why_not(self, i):
        """Why an item can never be held back, or None."""
        q = self.live[i]
        if q.get("testable_from"):
            return "dated"
        if i in self.free:
            return "free sample"
        if i not in self.rows:
            return "not in the coverage map"
        if len(self.row_items[self.rows[i]]) < 2:
            return "its bullet's only item"
        return None

    def mix(self, ids):
        n = Counter(self.items[i]["difficulty"] for i in ids)
        total = sum(n.values()) or 1
        return {lv: 100 * n[lv] / total for lv in LEVELS}

    def reserve(self, letter, form):
        """Unseen, testable items left in a section for the short mock, one per sibling group."""
        return len({self.unit(i) for i, q in self.live.items() if q["_sec"] == letter and i not in form
                    and not c.not_yet_testable(q, self.today)})


def draw(p):
    """The deterministic draw. Returns (ids, shortfall lines)."""
    picked, used_units, row_picks, short = [], set(), Counter(), []
    for s in p.sections:
        L, n = s["letter"], p.need[s["letter"]]
        sec_live = [i for i, q in p.live.items() if q["_sec"] == L]
        reasons = Counter(r for r in (p.why_not(i) for i in sec_live) if r)
        cand = sorted((i for i in sec_live if not p.why_not(i)), key=h)
        own = Counter(p.live[i]["difficulty"] for i in sec_live)
        left = dict(zip(LEVELS, c.allocate(n, [own[lv] for lv in LEVELS])))
        per_topic = Counter(p.live[i]["_topic"] for i in cand)
        topics = [t for t in p.topics[L] if per_topic[t]]
        quota = dict(zip(topics, (max(1, x) for x in c.allocate(n, [per_topic[t] for t in topics]))))
        got, mine = Counter(), []
        while len(mine) < n:
            best = None
            for i in cand:
                if i in mine or p.unit(i) in used_units or row_picks[p.rows[i]] >= len(p.row_items[p.rows[i]]) - 1:
                    continue
                q = p.live[i]
                t = q["_topic"]
                key = (got[t] > 0, got[t] >= quota[t], left.get(q["difficulty"], 0) <= 0,
                       got[t] / quota[t], row_picks[p.rows[i]], h(i))
                if best is None or key < best[0]:
                    best = (key, i)
            if best is None:
                break
            i = best[1]
            mine.append(i)
            used_units.add(p.unit(i))
            row_picks[p.rows[i]] += 1
            got[p.live[i]["_topic"]] += 1
            left[p.live[i]["difficulty"]] = left.get(p.live[i]["difficulty"], 0) - 1
        picked += mine
        if len(mine) < n:
            blocked = Counter()
            for i in cand:
                if i not in mine:
                    blocked["sibling of a held-back item" if p.unit(i) in used_units else "its bullet's last item"] += 1
            why = ", ".join(f"{k} {v}" for k, v in sorted((reasons + blocked).items()))
            short.append(f"section {L}: needs {n}, can hold back {len(mine)} ({n - len(mine)} short); "
                         f"of its {len(sec_live)} live item(s) the rest are: {why or 'none left'}")
        for t in p.topics[L]:
            if not got[t]:
                short.append(f"section {L}: topic {t} has no item that can be held back "
                             f"({sum(1 for i in sec_live if p.live[i]['_topic'] == t)} live)")
    for s in p.sections:
        L = s["letter"]
        left_over = p.reserve(L, set(picked))
        if left_over < p.short[L]:
            short.append(f"section {L}: after the form, {left_over} unseen testable item(s) (one per sibling "
                         f"group) are left for the short mock, which needs {p.short[L]}")
    return sorted(picked), short


def check(p, data):
    """Every rule against a frozen form. Returns error lines."""
    errs = []
    meta = data.get("_meta") if isinstance(data, dict) else None
    ids = data.get("ids") if isinstance(data, dict) else None
    if not isinstance(meta, dict) or not isinstance(ids, list) or not all(isinstance(i, str) for i in ids):
        return ['must be {"_meta": {"comment", "frozen", "exam"}, "ids": [...]}']
    if meta.get("exam") != p.pack:
        errs.append(f"_meta.exam is {meta.get('exam')!r}, not {p.pack!r}")
    if not c.iso_date(meta.get("frozen")):
        errs.append(f"_meta.frozen {meta.get('frozen')!r} is not a YYYY-MM-DD date")
    if not isinstance(meta.get("comment"), str) or not meta["comment"].strip():
        errs.append("_meta.comment is missing")
    dup = [i for i, n in Counter(ids).items() if n > 1]
    if dup:
        errs.append(f"held back twice: {', '.join(sorted(dup))}")
    form, ok = set(ids), []
    for i in ids:
        q = p.items.get(i)
        if q is None:
            errs.append(f"{i} is not a question of {p.pack}")
        elif c.is_retired(q):
            errs.append(f"{i} is retired")
        else:
            r = p.why_not(i)
            if r == "dated":
                errs.append(f"{i} is dated (testable_from {q['testable_from']})")
            elif r == "free sample":
                errs.append(f"{i} is in the free sample ({p.free_path})")
            elif r == "not in the coverage map":
                errs.append(f"{i} is not placed under a bullet in the coverage map")
            ok.append(i)
    for s in p.sections:
        L = s["letter"]
        have = sum(1 for i in form if i in p.items and p.items[i]["_sec"] == L)
        if have != p.need[L]:
            errs.append(f"section {L} has {have} items; the exam has {p.need[L]}")
        for t in p.topics[L]:
            if not any(p.items[i]["_topic"] == t for i in form if i in p.items):
                errs.append(f"topic {t} is not sampled")
        left_over = p.reserve(L, form)
        if left_over < p.short[L]:
            errs.append(f"section {L} leaves {left_over} unseen testable item(s) for the short mock, which needs {p.short[L]}")
    if len(ids) != p.exam["questions"]:
        errs.append(f"{len(ids)} items; the exam has {p.exam['questions']}")
    by_unit = defaultdict(list)
    for i in ok:
        if i in p.group:
            by_unit[p.group[i]].append(i)
    for g, members in sorted(by_unit.items()):
        if len(members) > 1:
            errs.append(f"{' and '.join(sorted(members))} are siblings (group {g}): at most one per form")
    for row, members in sorted(p.row_items.items()):
        if members and all(i in form for i in members):
            what = "its only live item" if len(members) == 1 else f"all {len(members)} live items"
            errs.append(f"bullet {row}: {what} ({', '.join(sorted(members))}) held back, so practice has none")
    have, own = p.mix(ok), p.mix(p.live)
    for lv in LEVELS:
        if abs(have[lv] - own[lv]) > MIX_TOLERANCE:
            errs.append(f"difficulty mix: {lv} {have[lv]:.0f}% against the pack's {own[lv]:.0f}% "
                        f"(more than {MIX_TOLERANCE} points off)")
    return errs


def describe(p, ids):
    split = " / ".join(f"{s['letter']} {sum(1 for i in ids if p.items[i]['_sec'] == s['letter'])}" for s in p.sections)
    have, own = p.mix(ids), p.mix(p.live)
    mix = " / ".join(f"{lv[:2]} {have[lv]:.0f}%" for lv in LEVELS)
    pmix = " / ".join(f"{own[lv]:.0f}%" for lv in LEVELS)
    left = " / ".join(f"{s['letter']} {p.reserve(s['letter'], set(ids))} (short mock {p.short[s['letter']]})"
                      for s in p.sections)
    return (f"{len(ids)} held back ({split}) · difficulty {mix} (pack {pmix}) · "
            f"{sum(len(v) for v in p.topics.values())} topics sampled · left unseen: {left}")


def main(argv):
    root, today, args = c.setup(argv)
    maps, free = where(root, args)
    checking, refreeze = "--check" in args, "--refreeze" in args
    packs = [a for a in args if not a.startswith("--")] or list(c.PARTS)
    bad = [a for a in packs if a not in c.PARTS]
    if bad:
        print(f"ERROR {', '.join(bad)}: only the Part packs ({', '.join(c.PARTS)}) have a held-back form here "
              "(the Challenge pack is out of scope)")
        return 2
    errors, summary = 0, []
    for pack in packs:
        out = root / pack / "exam" / "held_back.json"
        if not (root / pack / "originals").is_dir():
            summary.append(f"{pack} no bank")
            continue
        if checking and not out.exists():
            summary.append(f"{pack} no form yet")
            continue
        p = Pack(root, pack, today, maps, free)
        for e in p.problems:
            print(f"ERROR {pack}: {e}")
        errors += len(p.problems)
        if p.problems:
            summary.append(f"{pack} not checked")
            continue
        if out.exists() and not refreeze:
            data = c.read_json(out)
            errs = check(p, data)
            frozen = data.get("_meta", {}).get("frozen") if isinstance(data, dict) else None
            if not checking:
                print(f"{pack}: frozen on {frozen}; not redrawn (the form is the same for every learner; "
                      "--refreeze draws a new one)")
            for e in errs:
                print(f"ERROR {pack} held_back.json: {e}")
            errors += len(errs)
            if not errs:
                print(f"{pack}: {describe(p, data['ids'])}")
            summary.append(f"{pack} {len(data.get('ids', []))} frozen {frozen}" + (" BROKEN" if errs else ""))
            continue
        if checking:
            continue
        ids, short = draw(p)
        if short:
            print(f"{pack}: cannot meet the held-back rules; nothing written. What is short:")
            for line in short:
                print(f"  {line}")
            summary.append(f"{pack} short")
            errors += 1
            continue
        data = {"_meta": {"comment": COMMENT, "frozen": today.isoformat(), "exam": pack}, "ids": ids}
        errs = check(p, data)
        for e in errs:
            print(f"ERROR {pack} drawn form: {e}")
        if errs:
            errors += len(errs)
            summary.append(f"{pack} not written")
            continue
        c.write_json(out, data)
        print(f"{pack}: {describe(p, ids)}")
        print(f"{pack}: written to {out.relative_to(root)}, frozen {today.isoformat()}"
              + (" (refrozen)" if refreeze else ""))
        summary.append(f"{pack} {len(ids)} frozen {today.isoformat()}")
    name = "build_held_back --check" if checking else "build_held_back"
    print(f"{name}: {' · '.join(summary)} · {errors} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
