#!/usr/bin/env python3
"""Structure gate for the CIA question banks (data/cia/cia{1,2,3}/originals/d{N}.json).

Adapted from the CSOE checker (data/csoe/tools/check_csoe.py) so the banks share
one set of gates, with the CIA-only rules added. In one place it checks:

  outline   shared/outline.json against the counts of the opened syllabuses
            (62 Part topics, 40 Challenge topics, weights that sum to 100, every
            verb in a known depth class, a one-to-one Challenge map), and the
            "- 1A1 Title" lines of docs/content/CIA_BLUEPRINT.md against it
  library   shared/_framework_library.md has well-formed Verified and Likely sections
  item      field set and order (an optional `"retired": true` comes last), id
            (cia1_d1_001), domain, difficulty and bloom pairing, subtopic
            "1A1 <outline title>. Label", four options and a key, an explanation
            for the key and for every wrong option, three tips (Eliminate /
            Final two / Exam cue) that agree with the key (the whole Eliminate
            tip is read: two wrong letters, never the key), "Closest choice:" on
            the runner-up only, key at most 8 characters longer than the longest
            distractor
  links     _provenance names a notes sub-topic of the item's own topic that
            exists; every framework_ref part is a library bullet and the FIRST
            part is Verified (a key may rest only on an opened source);
            principle_id exists once shared/principles.json exists;
            challenge_ref agrees with the outline's Challenge map
  lens      a backstop only: a stem about the internal auditor or the chief
            audit executive whose keyed answer opens with a management action
            (implement, fix, remediate, configure, accept the risk, take over).
            The real lens review is cia-standards-auditor's
  people    no gendered pronoun in items or notes (they/them)
  per file  key spread (from 20 items), pick-the-longest 15 to 24% and
            pick-the-shortest at most 30% (from 40 items, ties shared), the
            difficulty mix each topic's syllabus verb calls for (from 8 items
            per topic), notes sub-topics with no question (reported). Retired
            items keep their id and number and are left out of these counts

Usage:
  python3 data/cia/tools/check_cia.py                 # outline, library and every pack
  python3 data/cia/tools/check_cia.py cia1            # one pack
  python3 data/cia/tools/check_cia.py cia1 --coverage # also list uncovered notes sub-topics
  python3 data/cia/tools/check_cia.py cia1 --list     # also list items where the key is longest or tied
  python3 data/cia/tools/check_cia.py --root DIR      # another tree (the harness fixture)
Exit 1 on any ERROR. Style rules (stem and option length, echoes, absolutes)
are in data/cia/tools/style_cia.py; old-syllabus wording in check_stale_terms.py;
dates in check_currency.py.
"""
import re
import sys
from collections import Counter

import cia_common as c

BLOOM = {"foundational": "Foundational", "application": "Application", "analysis": "Analysis"}
MIN_RATE, MAX_RATE, MAX_SHORT_RATE = 0.15, 0.24, 0.30
KEY_MIN_N, RATE_MIN_N, VERB_MIN_N = 20, 40, 8
GENDERED = re.compile(r"\b(he|she|him|her|his|hers|himself|herself)\b", re.I)
AUDITOR_STEM = re.compile(r"\b(internal auditors?|chief audit executive|audit team|audit function)\b[^.?]*\?\s*$", re.I)
# Words that can follow an option letter but not the English article "A" ("A and D", "A is", "A only tests").
AFTER_LETTER = {"and", "or", "nor", "is", "are", "was", "because", "since", "as", "both", "too", "also", "only", "just",
                "merely", "simply", "still", "never", "alone", "would", "could", "can", "cannot", "may", "might",
                "must", "should", "will"}
OWNER_MOVE = re.compile(r"^(implement|fix|remediate|configure|correct the|accept the risk|take over|"
                        r"assume responsibility for|redesign the control)\b", re.I)


def check_outline(root, errs):
    """Fact-check outline.json against the opened syllabuses' counts."""
    o = c.load_outline(root)
    ids = [e["id"] for e in o["exams"]]
    if ids != c.PACKS:
        errs.append(f"outline: exams are {ids}, expected {c.PACKS}")
        return o
    refs = {}
    for e in o["exams"]:
        want = c.TOPIC_COUNTS[e["id"]]
        got = {s["letter"]: len(s["topics"]) for s in e["sections"]}
        if got != want:
            errs.append(f"outline {e['id']}: topics per section {got}, the syllabus has {want}")
        if sum(s["weight"] for s in e["sections"]) != 100:
            errs.append(f"outline {e['id']}: section weights do not sum to 100")
        for i, s in enumerate(e["sections"], 1):
            if s["domain"] != i or s["letter"] != chr(64 + i):
                errs.append(f"outline {e['id']}: section {s['letter']} should be domain {i}")
            for n, t in enumerate(s["topics"], 1):
                if t.get("n") != n:
                    errs.append(f"outline {e['id']} {s['letter']}: topic numbers are not 1..N in order")
                if e["id"] == c.CHALLENGE:
                    continue
                code = f"{e['id'][-1]}{s['letter']}{n}"
                if t.get("code") != code:
                    errs.append(f"outline: topic code {t.get('code')} should be {code}")
                if t.get("verb") not in c.VERB_TO_CLASS:
                    errs.append(f"outline {code}: verb '{t.get('verb')}' is not in a depth class")
                title = t.get("title", "")
                if not title or "." in title or len(title.split()) > 9:
                    errs.append(f"outline {code}: title must be short (at most 9 words) with no period")
                if t.get("challenge"):
                    refs.setdefault(t["challenge"], []).append(code)
    ch = c.challenge_topics(o)
    for ref, t in ch.items():
        if refs.get(ref) != [t.get("part_code")]:
            errs.append(f"outline: Challenge {ref} maps to {t.get('part_code')}, "
                        f"but the Part topics tagged {ref} are {refs.get(ref)}")
    for ref in refs:
        if ref not in ch:
            errs.append(f"outline: Part topic(s) {refs[ref]} tagged with unknown Challenge topic {ref}")
    blueprint = c.REPO / "docs" / "content" / "CIA_BLUEPRINT.md"
    if root == c.CIA and blueprint.exists():   # the fixture has no blueprint
        lines = dict(m.groups() for m in re.finditer(r"(?m)^- (\d[A-G]\d+) (.+?)\s*$", blueprint.read_text(encoding="utf-8")))
        want = {code: t["title"] for code, t in c.part_topics(o).items()}
        want.update({t["code"]: want[t["part_code"]] for t in ch.values() if t.get("part_code") in want})
        for code, title in want.items():
            if lines.get(code) != title:
                errs.append(f"blueprint outline line '- {code} {lines.get(code)}' differs from outline.json '{title}'")
        for code in lines:
            if code not in want:
                errs.append(f"blueprint outline line '- {code}' is not in outline.json")
    return o


def rate(qs, length, pick=max):
    """Share a guesser wins by always picking the longest (or shortest) option; ties shared."""
    wins = 0.0
    for q in qs:
        lens = {k: length(v) for k, v in q["options"].items()}
        tied = [k for k, n in lens.items() if n == pick(lens.values())]
        if q["correct"] in tied:
            wins += 1 / len(tied)
    return wins / max(len(qs), 1)


def eliminated(tip, key):
    """The option letters an Eliminate tip names, read from the whole tip.

    A capital "A" is the English article, not option A, when a plain lowercase word follows
    it ("A manager owns the fix"): not a joining word, and not a verb or adverb ("A treats",
    "A is", "A wrongly assumes"). When in doubt the letter counts, and when the key is A
    every "A" counts, so the article can never hide a tip that names the key: reword it.
    """
    letters = set()
    for m in re.finditer(r"\b([A-D])\b", tip):
        nxt = re.match(r" ([a-z]+)\b", tip[m.end():])
        if m.group(1) == "A" and key != "A" and nxt:
            w = nxt.group(1)
            verb_like = (w.endswith("s") and not w.endswith(("ss", "us", "is"))) or w.endswith("ly")
            if w not in AFTER_LETTER and not verb_like:
                continue
        letters.add(m.group(1))
    return letters


def check_item(q, pack, d, n, ctx):
    errs = []
    part, letter = pack[-1], chr(64 + d)
    key = q.get("correct")
    keys = list(q.keys())
    if c.RETIRED in q and q[c.RETIRED] is not True:
        errs.append(f"'{c.RETIRED}' may only be true (a live item does not carry the field)")
    if keys and keys[-1] == c.RETIRED:
        keys = keys[:-1]                   # the one optional field, allowed only after style_version
    if keys != c.FIELDS:
        missing = [f for f in c.FIELDS if f not in q]
        extra = [f for f in q if f not in c.FIELDS and f != c.RETIRED]
        errs.append(f"fields differ from the house order (missing {missing}, extra {extra})"
                    if missing or extra else
                    f"fields are out of the house order ('{c.RETIRED}', when present, comes last)")
    if q.get("id") != f"{pack}_d{d}_{n:03d}":
        errs.append(f"id should be {pack}_d{d}_{n:03d}")
    if q.get("domain") != d:
        errs.append("domain number is wrong")
    if BLOOM.get(q.get("difficulty")) != q.get("bloom_level"):
        errs.append("difficulty and bloom_level do not match")
    if q.get("style_version") != 2:
        errs.append("style_version must be 2 (the style linter skips anything else)")
    code = None
    m = re.match(rf"^({part}{letter}\d+) ([^.]+)\. \S", q.get("subtopic") or "")
    if not m or m.group(1) not in ctx["topics"]:
        errs.append(f"subtopic '{q.get('subtopic')}' is not '{part}{letter}1 <outline title>. Label' for a topic in the outline")
    else:
        code = m.group(1)
        if m.group(2) != ctx["topics"][code]["title"]:
            errs.append(f"subtopic label '{m.group(2)}' should be the outline title '{ctx['topics'][code]['title']}'")
    # Challenge tag
    ref = q.get("challenge_ref")
    if code:
        allowed = {None, ctx["topics"][code].get("challenge")}
        if code == "1D1":
            allowed.add("C3")   # the Challenge-only fraud bullet (CIA_CHALLENGE_MAP.md)
        if ref not in allowed:
            errs.append(f"challenge_ref '{ref}' is not valid for topic {code} (allowed: {sorted(str(a) for a in allowed)})")
    tf = q.get("testable_from")
    if tf is not None and not (isinstance(tf, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", tf)):
        errs.append("testable_from must be null or an ISO date")
    pid = q.get("principle_id")
    if ctx["principles"] is not None and pid not in ctx["principles"]:
        errs.append(f"principle_id '{pid}' is not in shared/principles.json")
    if sorted(q.get("options") or {}) != ["A", "B", "C", "D"] or key not in ("A", "B", "C", "D"):
        errs.append("options must be A-D with a key among them")
        return errs, None, code
    wrong = sorted(k for k in "ABCD" if k != key)
    we = q.get("wrong_explanations") or {}
    if sorted(we) != wrong:
        errs.append("wrong_explanations must cover exactly the three distractors (not the key)")
    for k in wrong:
        if len((we.get(k) or "").split()) < 6:
            errs.append(f"option {k} has no real explanation")
    if len((q.get("correct_explanation") or "").split()) < 12:
        errs.append("correct_explanation is missing or too short")
    for f in ("question", "key_concept", "pre_read"):
        if not (q.get(f) or "").strip():
            errs.append(f"{f} is empty")
    tips = q.get("tips") or []
    prefixes = ["Eliminate:", "Final two:", "Exam cue:"]
    if len(tips) != 3 or any(not t.startswith(p) for t, p in zip(tips, prefixes)):
        errs.append("tips must be Eliminate / Final two / Exam cue")
    else:
        elim = eliminated(tips[0], key)
        if key in elim:
            errs.append(f"Eliminate tip names the key {key}; it names only the two options to rule out")
        if len(elim - {key}) != 2:
            errs.append(f"Eliminate tip should name two wrong letters, names {sorted(elim)} (key {key})")
        fm = re.match(r"Final two: ([A-D]) beats ([A-D])\b", tips[1])
        if not fm or fm.group(1) != key:
            errs.append(f"Final two tip should start 'Final two: {key} beats <runner-up>' (the key is {key})")
        else:
            runner = fm.group(2)
            closest = [k for k, v in we.items() if (v or "").startswith("Closest choice")]
            if closest != [runner]:
                errs.append(f"'Closest choice:' should open only the runner-up {runner}'s explanation, found {closest}")
            if runner in elim:
                errs.append("the runner-up is also named in the Eliminate tip")
    parts = [p.strip() for p in (q.get("framework_ref") or "").split(";") if p.strip()]
    if not parts:
        errs.append("framework_ref is empty")
    for i, p in enumerate(parts):
        if p not in ctx["verified"] and p not in ctx["likely"]:
            errs.append(f"framework_ref part not in the library: {p}")
        elif i == 0 and p not in ctx["verified"]:
            errs.append(f"the first framework_ref part must be a Verified (opened) source; '{p}' is Likely or Background")
    nid = None
    prov = q.get("_provenance") or ""
    if not prov.startswith("Authored from concept:"):
        errs.append("_provenance must start 'Authored from concept:'")
    pm = re.search(r"\bnotes (\d[A-G]\d+\.\d+)", prov)
    ids = ctx["notes"].get(d)
    if not pm:
        errs.append("_provenance does not name a notes sub-topic ('notes 1A1.1')")
    elif ids is None:
        errs.append(f"notes file {pack}/notes/d{d}.json does not exist (notes come before questions)")
    elif pm.group(1) not in ids:
        errs.append(f"_provenance cites notes {pm.group(1)}, which does not exist")
    else:
        nid = pm.group(1)
        if code and not nid.startswith(code + "."):
            errs.append(f"_provenance cites notes {nid}, but the item is on topic {code}")
    lens = {k: len(v) for k, v in q["options"].items()}
    over = lens[key] - max(v for k, v in lens.items() if k != key)
    if over > 8:
        errs.append(f"key is {over} characters longer than the longest distractor (max 8)")
    if AUDITOR_STEM.search(q.get("question") or "") and OWNER_MOVE.match(q["options"][key]):
        errs.append("lens: the keyed answer has the internal auditor doing management's job "
                    f"('{q['options'][key][:40]}...'); the auditor assesses, recommends and reports")
    return errs, nid, code


def check_pack(root, pack, ctx, flags):
    errors = 0
    files = c.question_files(root, pack)
    if not files:
        print(f"{pack}: no question files yet")
        return 0
    ctx = dict(ctx, notes={d: c.notes_ids(root, pack, d) for d, _ in files})
    for d, path in files:
        data = c.read_json(path)
        qs = data["questions"]
        cited, by_topic = Counter(), {}
        live = [q for q in qs if not c.is_retired(q)]    # a retired item is checked, then left out of every count
        for n, q in enumerate(qs, 1):                    # n counts retired items too: numbers never move
            errs, nid, code = check_item(q, pack, d, n, ctx)
            if nid and not c.is_retired(q):
                cited[nid] += 1
            if code and not c.is_retired(q):
                by_topic.setdefault(code, Counter())[q.get("difficulty")] += 1
            if GENDERED.search(c.dump_json(q)):
                errs.append("gendered pronoun; use they/them")
            for e in errs:
                print(f"ERROR {q.get('id')}: {e}")
            errors += len(errs)
        sec = next((s for s in c.exam(ctx["outline"], pack)["sections"] if s["domain"] == d), None)
        if not sec:
            print(f"ERROR {pack} d{d}: the outline has no section {d}")
            errors += 1
        elif data.get("domain") != d or data.get("domain_name") != sec["name"] or data.get("weight") != f"{sec['weight']}%":
            print(f"ERROR {pack} d{d}: file header should be domain {d}, '{sec['name']}', weight '{sec['weight']}%'")
            errors += 1
        notes_path = root / pack / "notes" / f"d{d}.json"
        if notes_path.exists():
            for t in c.read_json(notes_path)["topics"]:
                for sub in t["subtopics"]:
                    hit = GENDERED.search(c.dump_json(sub))
                    if hit:
                        print(f"ERROR notes {sub['id']}: gendered pronoun '{hit.group(0)}'; use they/them")
                        errors += 1
        ok = [q for q in live if sorted(q.get("options") or {}) == ["A", "B", "C", "D"] and q.get("correct") in tuple("ABCD")]
        spread = Counter(q["correct"] for q in ok)
        notes = []
        if len(ok) >= KEY_MIN_N:
            lo, hi = 0.18 * len(ok), 0.32 * len(ok)
            if any(not lo <= spread[k] <= hi for k in "ABCD"):
                notes.append("ERROR key letters unbalanced (each should hold 18 to 32%)")
        longest, shortest = rate(ok, len), rate(ok, len, min)
        if len(ok) >= RATE_MIN_N:
            if not MIN_RATE <= longest <= MAX_RATE:
                notes.append(f"ERROR pick-longest outside {MIN_RATE:.0%}-{MAX_RATE:.0%}")
            if shortest > MAX_SHORT_RATE:
                notes.append(f"ERROR pick-shortest above {MAX_SHORT_RATE:.0%}")
        for code, mix in sorted(by_topic.items()):
            n = sum(mix.values())
            if n < VERB_MIN_N:
                continue
            cls = c.VERB_TO_CLASS[ctx["topics"][code]["verb"]]
            f, ap, an = (mix[k] / n for k in ("foundational", "application", "analysis"))
            bad = ((cls == "recall" and not (0.25 <= f <= 0.60 and an <= 0.25))
                   or (cls == "apply" and not (f <= 0.35 and ap >= 0.40))
                   or (cls == "judge" and not (f <= 0.25 and an >= 0.15)))
            if bad:
                notes.append(f"ERROR {code} ({ctx['topics'][code]['verb']}, {cls}) difficulty mix "
                             f"{mix['foundational']}/{mix['application']}/{mix['analysis']} F/Ap/An does not fit its verb")
        errors += len(notes)
        ids = ctx["notes"].get(d) or []
        uncovered = [i for i in ids if i not in cited]
        mix = Counter(q.get("difficulty") for q in live)
        tagged = sum(1 for q in live if q.get("challenge_ref"))
        retired = f" ({len(qs) - len(live)} retired, left out of the counts)" if len(live) != len(qs) else ""
        print(f"{pack} d{d}: {len(live)} items{retired} · keys " + " ".join(f"{k}{spread[k]}" for k in "ABCD")
              + f" · pick-longest {longest:.1%} · pick-shortest {shortest:.1%}"
              + f" · {mix['foundational']}/{mix['application']}/{mix['analysis']} F/Ap/An"
              + f" · Challenge-tagged {tagged} · notes covered {len(ids) - len(uncovered)}/{len(ids)} "
              + (" · ".join(notes) if notes else "✓"))
        if "--list" in flags:
            tops = []
            for q in ok:
                lens = {k: len(v) for k, v in q["options"].items()}
                tied = [k for k, v in lens.items() if v == max(lens.values())]
                if q["correct"] in tied:
                    tops.append(q["id"][-3:] + ("" if len(tied) == 1 else "(tie)"))
            print(f"   key longest: {', '.join(tops)}")
        if "--coverage" in flags and uncovered:
            print(f"   uncovered: {', '.join(uncovered)}")
    return errors


def main(argv):
    root, _today, args = c.setup(argv)
    packs = [a for a in args if a in c.PARTS] or c.PARTS
    errs = []
    outline = check_outline(root, errs)
    verified, likely, problems = c.library(root)
    errs += [f"library: {p}" for p in problems]
    for e in errs:
        print(f"ERROR {e}")
    errors = len(errs)
    ppath = root / "shared" / "principles.json"
    ctx = {"outline": outline, "topics": c.part_topics(outline), "verified": verified, "likely": likely,
           "principles": ({p["id"] for p in c.read_json(ppath)["principles"]} if ppath.exists() else None)}
    print(f"outline: {len(ctx['topics'])} Part topics, {len(c.challenge_topics(outline))} Challenge topics · "
          f"library: {len(verified)} Verified, {len(likely)} Likely bullet(s)")
    for pack in packs:
        errors += check_pack(root, pack, ctx, args)
    print(f"check_cia: {errors} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
