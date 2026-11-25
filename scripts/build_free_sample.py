#!/usr/bin/env python3
"""Pick the free question sample the website publishes (web v12.50+).

WHY (plain English):
    kaisip.com used to publish the whole question bank (data/domain1..5.json),
    so anyone could download it. Now the website publishes only a free sample;
    the full bank stays in the repo for the phone app and, later, behind an
    account (owner decisions, 4 Nov 2026; plan in docs/business/monetization/
    WEB_GATE_PLAN.md).

WHAT IT PICKS, per domain:
    - at least one question for EVERY study-notes topic (each topic's
      practice_ids in data/cisa_notes.json), so "Practice this concept" always
      has something to practise;
    - then more, until the domain reaches its share of the bank (CISA 20%;
      every later certification 10%, see FREE_SHARE below);
    - a mix of easier, middle and harder questions close to the mock-exam mix.
    The choice is deterministic (sorted by a fixed hash of the id), so the same
    bank always gives the same sample.

THE ONE RULE THAT MUST NEVER BREAK: the list only grows.
    data/free/cisa_sample_ids.json is the committed list. A re-run keeps every
    id already in it and only adds new ones, so a learner's free progress,
    bookmarks and review queue never lose a question. --check fails if a
    committed id would disappear, or if the files are out of date.

USAGE
    python3 scripts/build_free_sample.py          # (re)write data/free/
    python3 scripts/build_free_sample.py --check  # verify only (verify_repo.sh)

OUTPUT
    data/free/cisa_sample_ids.json   {cert, share, ids}
    data/free/cisa_d{N}.json         same shape as data/domain{N}.json, sample only
"""
import hashlib
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "free"
IDS_FILE = OUT / "cisa_sample_ids.json"

# Share of each domain that is free. CISA is the launch course and is more
# generous on purpose (owner, 4 Nov 2026); other certifications get 10%.
FREE_SHARE = {"cisa": 0.20}
DEFAULT_SHARE = 0.10
CERT = "cisa"

# Target difficulty mix, the same as the CISA mock blueprint in index.html.
MIX = {"application": 0.55, "analysis": 0.30, "foundational": 0.15}


def rank(qid):
    """A fixed pseudo-random order: the same id always sorts the same way."""
    return hashlib.sha256(("kaisip-free-sample:" + qid).encode()).hexdigest()


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def pick_balanced(candidates, chosen, by_id):
    """From candidates, take the one whose difficulty is most under-filled."""
    counts = {k: 0 for k in MIX}
    for qid in chosen:
        diff = by_id[qid].get("difficulty")
        if diff in counts:
            counts[diff] += 1
    total = max(1, len(chosen))

    def need(qid):
        diff = by_id[qid].get("difficulty")
        target = MIX.get(diff, 0.0)
        return (counts.get(diff, 0) / total) - target  # lower = more needed

    return min(candidates, key=lambda q: (need(q), rank(q)))


def published_ids():
    """Free ids already published on main (or, failing that, in HEAD).

    The working-tree file can be edited or deleted, so the "only grows" rule
    is also checked against git history. Returns an empty set when git or
    the file is not available (for example the very first commit of it).
    """
    rel = IDS_FILE.relative_to(ROOT).as_posix()
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


# The phone app's first five questions (mobile/src/content/firstSet.ts, FIRST_SET.cisa).
# A mobile test checks the two lists match.
FIRST_SET = ["d1_002", "d2_006", "d3_002", "d4_041", "d5_008"]


def build():
    share = FREE_SHARE.get(CERT, DEFAULT_SHARE)
    notes = load_json(ROOT / "data" / "cisa_notes.json")
    previous = published_ids()
    if IDS_FILE.exists():
        previous |= set(load_json(IDS_FILE).get("ids", []))

    all_ids = set()
    chosen_all = []
    domain_files = {}
    for dom in notes["domains"]:
        d = str(dom["domain_number"])
        bank = load_json(ROOT / "data" / f"domain{d}.json")
        qs = bank["questions"]
        by_id = {q["id"]: q for q in qs}
        all_ids.update(by_id)
        quota = math.ceil(len(qs) * share)

        # 1. Keep every id already in the free list (the list only grows), plus
        #    the phone app's "first five" (mobile/src/content/firstSet.ts): the
        #    public phone build bundles only this sample, so every new learner's
        #    first set must be free.
        chosen = sorted((i for i in (previous | set(FIRST_SET)) if i in by_id), key=rank)
        picked = set(chosen)

        # 2. One question for every notes topic that has none free yet.
        for topic in dom["topics"]:
            for sub in topic["subtopics"]:
                ids = [i for i in sub.get("practice_ids", []) if i in by_id]
                if not ids or any(i in picked for i in ids):
                    continue
                q = pick_balanced(ids, chosen, by_id)
                chosen.append(q)
                picked.add(q)

        # 3. Fill up to the domain's share.
        rest = [i for i in by_id if i not in picked]
        while len(chosen) < quota and rest:
            q = pick_balanced(rest, chosen, by_id)
            chosen.append(q)
            picked.add(q)
            rest.remove(q)

        # Keep the bank's own order in the published file.
        sample = [q for q in qs if q["id"] in picked]
        out = dict(bank)
        out["questions"] = sample
        out["count"] = len(sample)
        out["free_sample"] = True
        domain_files[d] = out
        chosen_all.extend(q["id"] for q in sample)

    gone = sorted(previous - set(chosen_all))
    if gone:
        missing = sorted(i for i in gone if i not in all_ids)
        raise SystemExit(
            "build_free_sample: these free ids would disappear: " + ", ".join(gone[:20])
            + (" (deleted from the bank: " + ", ".join(missing[:20]) + ")" if missing else "")
            + "\nThe free list only grows. Restore the question, or ask the owner before removing it."
        )
    ids_doc = {
        "cert": CERT,
        "share": share,
        "note": "Free question ids published on kaisip.com. Additive only: never remove an id (scripts/build_free_sample.py).",
        "ids": sorted(chosen_all),
    }
    return ids_doc, domain_files


def dump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def main():
    check = "--check" in sys.argv[1:]
    ids_doc, domain_files = build()
    files = {IDS_FILE: dump(ids_doc)}
    for d, doc in domain_files.items():
        files[OUT / f"cisa_d{d}.json"] = dump(doc)

    if check:
        stale = [p for p, text in files.items() if not p.exists() or p.read_text(encoding="utf-8") != text]
        if stale:
            print("build_free_sample: out of date: " + ", ".join(str(p.relative_to(ROOT)) for p in stale))
            print("  run: python3 scripts/build_free_sample.py")
            sys.exit(1)
        print(f"  ✓ free sample: {len(ids_doc['ids'])} questions, every notes topic covered, list only grows")
        return

    OUT.mkdir(parents=True, exist_ok=True)
    for p, text in files.items():
        p.write_text(text, encoding="utf-8")
    per = {d: doc["count"] for d, doc in domain_files.items()}
    print(f"build_free_sample: {len(ids_doc['ids'])} free questions {per}")


if __name__ == "__main__":
    main()
