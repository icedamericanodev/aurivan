#!/usr/bin/env python3
"""Pick each course's free question sample (CISA: web v12.50+; CRISC and AAIA:
the public phone build, owner decision 28 Nov 2026).

WHY (plain English):
    kaisip.com used to publish the whole question bank (data/domain1..5.json),
    so anyone could download it. Now the website publishes only a free sample;
    the full bank stays in the repo for the phone app and, later, behind an
    account (owner decisions, 4 Nov 2026; plan in docs/business/monetization/
    WEB_GATE_PLAN.md). The public phone build bundles only these samples too;
    the full courses go only to the Alpha testers' build (docs/mobile/
    RELEASE_2_3.md, docs/WEB_LAUNCH_PLAN.md stream D).

    Each course keeps its own sample rules, from its own plan:
    - CISA (the launch course): 20% of each domain; every notes subtopic has
      at least one free question; the phone's "first five" are always free.
    - CRISC (docs/content/CRISC_BANK_PLAN.md section 3): 10% of the bank,
      never fewer than 100, weighted by domain; at least one question for
      every outline area (1A1, 1A2 ...); the 50-item mini mock (13/11/16/10)
      can be drawn from the sample alone; more application than recall.
    - AAIA (docs/content/AAIA_BANK_PLAN.md section 6): 20%, never fewer than
      100 (at 1,000 items: D1 66, D2 92, D3 42); every notes subtopic has at
      least one; the 25 / 50 / 25 difficulty mix and balanced answer keys; the
      30-item short mock (10/14/6) and diagnostic (10/13/7) fit in the sample.

WHAT IT PICKS, per domain:
    1. every id already in the course's free list (it only grows), plus any
       pinned ids (CISA's first five);
    2. one question for each notes subtopic (or outline area, for CRISC) that
       has none free yet, from that subtopic's practice_ids;
    3. more, until the domain reaches its share of the bank. For CRISC the
       fill first takes questions that add a notes subtopic with nothing free
       yet, so "Practice this concept" works on as many notes as possible;
    with a difficulty mix close to the course's mock mix (and, for CRISC and
    AAIA, balanced answer letters). The choice is deterministic (sorted by a
    fixed hash of the id), so the same bank always gives the same sample.

THE ONE RULE THAT MUST NEVER BREAK: each list only grows.
    data/free/<cert>_sample_ids.json is the committed list. A re-run keeps
    every id already in it and only adds new ones, so a learner's free
    progress, bookmarks and review queue never lose a question. --check fails
    if a committed id would disappear, or if the files are out of date.

USAGE
    python3 scripts/build_free_sample.py                 # (re)write data/free/, every course
    python3 scripts/build_free_sample.py --check         # verify only (verify_repo.sh)
    python3 scripts/build_free_sample.py --cert crisc    # one course only (with or without --check)

OUTPUT (per course)
    data/free/<cert>_sample_ids.json   {cert, share, note, ids}
    data/free/<cert>_d{N}.json         same shape as data/domain{N}.json, sample only
    Only the CISA files are published on the website (scripts/build_site.sh);
    the CRISC and AAIA ones are read by the phone app's content build
    (mobile/scripts/build-content.mjs) and its public-build audit.
"""
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "free"

# The phone app's first five questions (mobile/src/content/firstSet.ts, FIRST_SET.cisa).
# A mobile test checks the two lists match.
FIRST_SET = ["d1_002", "d2_006", "d3_002", "d4_041", "d5_008"]

# Target difficulty mix, the same as the CISA mock blueprint in index.html
# (and the ISACA mix CRISC's plan asks for: 15 / 55 / 30).
MIX = {"application": 0.55, "analysis": 0.30, "foundational": 0.15}
# AAIA's own mix (AAIA_BANK_PLAN.md section 6: "the same 25 / 50 / 25 mix as the bank").
AAIA_MIX = {"foundational": 0.25, "application": 0.50, "analysis": 0.25}


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ── How each course's files are read ─────────────────────────────────────
# Each loader returns a list of (domain number as text, bank doc, notes
# subtopics) where the bank doc has the CISA domain-file shape
# ({domain, title, weight, count, questions}) and the notes subtopics are
# (subtopic id, practice_ids) pairs.

def cisa_domains():
    notes = load_json(ROOT / "data" / "cisa_notes.json")
    out = []
    for dom in notes["domains"]:
        d = str(dom["domain_number"])
        bank = load_json(ROOT / "data" / f"domain{d}.json")
        subs = [(sub.get("id"), sub.get("practice_ids", [])) for topic in dom["topics"] for sub in topic["subtopics"]]
        out.append((d, bank, subs))
    return out


def course_domains(cert, count):
    """CRISC / AAIA: questions from data/<cert>/originals (no generated domain
    file exists for them), notes from data/<cert>/notes/d{N}.json."""
    out = []
    for n in range(1, count + 1):
        src = load_json(ROOT / "data" / cert / "originals" / f"d{n}.json")
        notes = load_json(ROOT / "data" / cert / "notes" / f"d{n}.json")
        qs = src["questions"]
        # The CISA free files' shape: domain, title, weight, count, questions.
        bank = {"domain": src["domain"], "title": src["domain_name"], "weight": src["weight"],
                "count": len(qs), "questions": qs}
        subs = [(sub["id"], sub.get("practice_ids", [])) for topic in notes["topics"] for sub in topic["subtopics"]]
        out.append((str(n), bank, subs))
    return out


COURSES = {
    "cisa": {
        "share": 0.20,
        "floor": 0,
        "mix": MIX,
        "domains": cisa_domains,
        "cover": "subtopics",
        "pinned": FIRST_SET,
        "balance_keys": False,
        "fill_new_subtopics": False,
        "min_per_domain": {},
        "note": "Free question ids published on kaisip.com. Additive only: never remove an id (scripts/build_free_sample.py).",
        "done": "every notes topic covered",
    },
    "crisc": {
        "share": 0.10,
        "floor": 100,
        "mix": MIX,
        "domains": lambda: course_domains("crisc", 4),
        # Notes subtopic "1A2.3" belongs to outline area "1A2".
        "cover": "areas",
        "pinned": [],
        "balance_keys": True,
        "fill_new_subtopics": True,
        # The free 50-item mini mock, split by the 26/22/32/20 weights.
        "min_per_domain": {"1": 13, "2": 11, "3": 16, "4": 10},
        "note": "Free CRISC question ids for the public phone build (not the website). Additive only: never remove an id (scripts/build_free_sample.py).",
        "done": "every outline area covered",
    },
    "aaia": {
        "share": 0.20,
        "floor": 100,
        "mix": AAIA_MIX,
        "domains": lambda: course_domains("aaia", 3),
        "cover": "subtopics",
        "pinned": [],
        "balance_keys": True,
        "fill_new_subtopics": False,
        # The free 30-item short mock (10/14/6) and diagnostic (10/13/7): the larger of each.
        "min_per_domain": {"1": 10, "2": 14, "3": 7},
        "note": "Free AAIA question ids for the public phone build (not the website). Additive only: never remove an id (scripts/build_free_sample.py).",
        "done": "every notes subtopic covered",
    },
}


def rank(qid):
    """A fixed pseudo-random order: the same id always sorts the same way."""
    return hashlib.sha256(("kaisip-free-sample:" + qid).encode()).hexdigest()


def pick_balanced(candidates, chosen, by_id, mix, balance_keys=False):
    """From candidates, take the one whose difficulty (and, when asked, answer
    letter) is most under-filled."""
    counts = {k: 0 for k in mix}
    keys = {}
    for qid in chosen:
        diff = by_id[qid].get("difficulty")
        if diff in counts:
            counts[diff] += 1
        key = by_id[qid].get("correct")
        keys[key] = keys.get(key, 0) + 1
    total = max(1, len(chosen))

    def need(qid):
        diff = by_id[qid].get("difficulty")
        target = mix.get(diff, 0.0)
        score = (counts.get(diff, 0) / total) - target  # lower = more needed
        if balance_keys:
            q = by_id[qid]
            score += keys.get(q.get("correct"), 0) / total - 1.0 / max(1, len(q.get("options") or {}))
        return score

    return min(candidates, key=lambda q: (need(q), rank(q)))


def ids_file(cert):
    return OUT / f"{cert}_sample_ids.json"


def published_ids(cert):
    """Free ids already published on main (or, failing that, in HEAD).

    The working-tree file can be edited or deleted, so the "only grows" rule
    is also checked against git history. Returns an empty set when git or
    the file is not available (for example the very first commit of it).
    """
    rel = ids_file(cert).relative_to(ROOT).as_posix()
    for ref in ("origin/main", "HEAD"):
        try:
            out = subprocess.run(["git", "show", f"{ref}:{rel}"], cwd=ROOT,
                                 capture_output=True, text=True, timeout=20)
        except (OSError, subprocess.SubprocessError):
            return set()
        if out.returncode == 0:
            try:
                return set(json.loads(out.stdout).get("ids", []))
            except ValueError:
                return set()
    return set()


def quotas(cfg, domains):
    """Each domain's share of its bank, rounded up; when the course total is
    under its floor, the floor is split by bank size instead."""
    sizes = {d: len(bank["questions"]) for d, bank, _ in domains}
    q = {d: math.ceil(n * cfg["share"]) for d, n in sizes.items()}
    total = sum(sizes.values())
    if cfg["floor"] and sum(q.values()) < cfg["floor"] and total:
        q = {d: min(n, math.ceil(n * cfg["floor"] / total)) for d, n in sizes.items()}
    return q


def coverage_groups(cfg, subs):
    """The groups that each need one free question: notes subtopics, or (for
    CRISC) outline areas, each with its practice ids, in notes order."""
    if cfg["cover"] == "subtopics":
        return [ids for _, ids in subs]
    groups = {}
    for sub_id, ids in subs:
        groups.setdefault(str(sub_id).split(".")[0], []).extend(ids)
    return list(groups.values())


def build(cert):
    cfg = COURSES[cert]
    mix = cfg["mix"]
    previous = published_ids(cert)
    if ids_file(cert).exists():
        previous |= set(load_json(ids_file(cert)).get("ids", []))

    domains = cfg["domains"]()
    quota = quotas(cfg, domains)
    all_ids = set()
    chosen_all = []
    domain_files = {}
    problems = []
    for d, bank, subs in domains:
        qs = bank["questions"]
        by_id = {q["id"]: q for q in qs}
        all_ids.update(by_id)
        live = {i for i, q in by_id.items() if not q.get("retired")}

        # 1. Keep every id already in the free list (the list only grows), plus
        #    the pinned ids. CISA pins the phone app's "first five"
        #    (mobile/src/content/firstSet.ts): the public phone build bundles
        #    only this sample, so every new learner's first set must be free.
        chosen = sorted((i for i in (previous | set(cfg["pinned"])) if i in by_id), key=rank)
        picked = set(chosen)

        # 2. One question for every notes subtopic (or outline area) that has none free yet.
        for group in coverage_groups(cfg, subs):
            ids = [i for i in group if i in by_id and i in live]
            if not ids or any(i in picked for i in ids):
                continue
            q = pick_balanced(ids, chosen, by_id, mix, cfg["balance_keys"])
            chosen.append(q)
            picked.add(q)

        # 3. Fill up to the domain's share.
        rest = [i for i in by_id if i not in picked and i in live]
        sub_of = {}
        if cfg["fill_new_subtopics"]:
            for sub_id, ids in subs:
                for i in ids:
                    sub_of.setdefault(i, set()).add(sub_id)
        while len(chosen) < quota[d] and rest:
            pool = rest
            if sub_of:
                covered = set().union(*(sub_of.get(i, set()) for i in picked))
                fresh = [i for i in rest if sub_of.get(i, set()) - covered]
                pool = fresh or rest
            q = pick_balanced(pool, chosen, by_id, mix, cfg["balance_keys"])
            chosen.append(q)
            picked.add(q)
            rest.remove(q)

        # Keep the bank's own order in the published file.
        sample = [q for q in qs if q["id"] in picked]
        need = cfg["min_per_domain"].get(d, 0)
        live_free = sum(1 for q in sample if q["id"] in live)
        if live_free < need:
            problems.append(f"domain {d} has {live_free} free questions, its free mock needs {need}")
        out = dict(bank)
        out["questions"] = sample
        out["count"] = len(sample)
        out["free_sample"] = True
        domain_files[d] = out
        chosen_all.extend(q["id"] for q in sample)

    if cfg["floor"] and len(chosen_all) < cfg["floor"]:
        problems.append(f"{len(chosen_all)} free questions, the floor is {cfg['floor']}")
    gone = sorted(previous - set(chosen_all))
    if gone:
        missing = sorted(i for i in gone if i not in all_ids)
        raise SystemExit(
            f"build_free_sample ({cert}): these free ids would disappear: " + ", ".join(gone[:20])
            + (" (deleted from the bank: " + ", ".join(missing[:20]) + ")" if missing else "")
            + "\nThe free list only grows. Restore the question, or ask the owner before removing it."
        )
    if problems:
        raise SystemExit(f"build_free_sample ({cert}): " + "; ".join(problems))
    ids_doc = {
        "cert": cert,
        "share": cfg["share"],
        "note": cfg["note"],
        "ids": sorted(chosen_all),
    }
    return ids_doc, domain_files


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def course_files(cert):
    ids_doc, domain_files = build(cert)
    files = {ids_file(cert): dump(ids_doc)}
    for d, doc in domain_files.items():
        files[OUT / f"{cert}_d{d}.json"] = dump(doc)
    return ids_doc, domain_files, files


def main():
    args = sys.argv[1:]
    check = "--check" in args
    certs = list(COURSES)
    if "--cert" in args:
        i = args.index("--cert")
        if i + 1 >= len(args) or args[i + 1] not in COURSES:
            raise SystemExit("build_free_sample: --cert must be one of " + ", ".join(COURSES))
        certs = [args[i + 1]]

    failed = False
    for cert in certs:
        ids_doc, domain_files, files = course_files(cert)
        per = {d: doc["count"] for d, doc in domain_files.items()}
        if check:
            stale = [p for p, text in files.items() if not p.exists() or p.read_text(encoding="utf-8") != text]
            if stale:
                print(f"build_free_sample ({cert}): out of date: " + ", ".join(str(p.relative_to(ROOT)) for p in stale))
                print(f"  run: python3 scripts/build_free_sample.py --cert {cert}")
                failed = True
                continue
            label = "free sample" if cert == "cisa" else f"{cert.upper()} free sample"
            print(f"  ✓ {label}: {len(ids_doc['ids'])} questions, {COURSES[cert]['done']}, list only grows")
            continue
        OUT.mkdir(parents=True, exist_ok=True)
        for p, text in files.items():
            p.write_text(text, encoding="utf-8")
        print(f"build_free_sample ({cert}): {len(ids_doc['ids'])} free questions {per}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
