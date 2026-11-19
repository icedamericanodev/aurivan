#!/usr/bin/env python3
"""Currency gate: every dated CIA fact has a source and was checked recently.

shared/currency.json holds each fact that can go out of date (file version
labels, exam lengths, the passing score, the retake rule, the dates on which a
Topical Requirement becomes testable) with its source and `last_checked`.

  - a fact last checked more than `warn_after_days` (60) ago: warning;
    more than `fail_after_days` (120): ERROR. cia-currency-checker re-opens the
    source and updates the date;
  - a fact without a source, a date or a known status: ERROR;
  - a fact whose status is not "opened" is listed as a warning (it may not be
    stated to learners as checked) and is an ERROR with --strict;
  - questions, minutes and section weights must agree with shared/outline.json;
  - Topical Requirements: an item that cites a requirement that is not testable
    yet must carry that date in `testable_from` (the mock, free-sample and
    Challenge builders leave such items out until then); once the date has
    passed, `testable_from` must be cleared.

Usage:
  python3 data/cia/tools/check_currency.py [--strict] [--today YYYY-MM-DD] [--root DIR]
Exit 1 on any ERROR.
"""
import datetime
import sys

import cia_common as c

STATUSES = ("opened", "search_only", "not_opened")
NEEDED = ["questions", "minutes"]          # per exam, as "<pack>.questions"


def main(argv):
    root, today, args = c.setup(argv)
    cur = c.currency(root)
    if cur is None:
        print("ERROR shared/currency.json is missing")
        return 1
    errs, warns = [], []
    warn_d, fail_d = cur.get("warn_after_days", 60), cur.get("fail_after_days", 120)
    seen = {}
    for f in cur.get("facts", []) + cur.get("topical_requirements", []):
        fid = f.get("id", "?")
        if fid in seen:
            errs.append(f"{fid}: duplicate id")
        seen[fid] = f
        if not str(f.get("source", "")).startswith("https://"):
            errs.append(f"{fid}: no https source")
        if f.get("status") not in STATUSES:
            errs.append(f"{fid}: status must be one of {STATUSES}")
        elif f["status"] != "opened":
            (errs if "--strict" in args else warns).append(f"{fid}: source is {f['status']}; do not state it to learners as checked")
        try:
            age = (today - datetime.date.fromisoformat(f.get("last_checked", ""))).days
        except ValueError:
            errs.append(f"{fid}: last_checked is not an ISO date")
            continue
        if age > fail_d:
            errs.append(f"{fid}: last checked {age} days ago (limit {fail_d}); re-open the source")
        elif age > warn_d:
            warns.append(f"{fid}: last checked {age} days ago; re-open the source soon")
    outline = c.load_outline(root)
    for e in outline["exams"]:
        for key in NEEDED:
            f = seen.get(f"{e['id']}.{key}")
            if not f:
                errs.append(f"{e['id']}.{key}: fact is missing")
            elif f.get("value") != e[key]:
                errs.append(f"{e['id']}.{key}: currency.json says {f.get('value')}, outline.json says {e[key]}")
        f = seen.get(f"{e['id']}.weights")
        want = {s["letter"]: s["weight"] for s in e["sections"]}
        if not f:
            errs.append(f"{e['id']}.weights: fact is missing")
        elif f.get("value") != want:
            errs.append(f"{e['id']}.weights: currency.json says {f.get('value')}, outline.json says {want}")
    topical = cur.get("topical_requirements", [])
    for t in topical:
        try:
            datetime.date.fromisoformat(t.get("testable_from", ""))
        except ValueError:
            errs.append(f"{t.get('id')}: testable_from is not an ISO date")
    checked = 0
    for pack, _d, q in c.all_items(root):
        checked += 1
        parts = [p.strip() for p in (q.get("framework_ref") or "").split(";")]
        dates = [t["testable_from"] for t in topical
                 if any(p.startswith(t["library_prefix"]) for p in parts)
                 and datetime.date.fromisoformat(t["testable_from"]) > today]
        want = max(dates) if dates else None
        if q.get("testable_from") != want:
            errs.append(f"{q['id']}: testable_from is {q.get('testable_from')}, should be {want} "
                        "(from the Topical Requirement it cites and today's date)")
    for w in warns:
        print(f"warn  {w}")
    for e in errs:
        print(f"ERROR {e}")
    print(f"check_currency: {len(seen)} dated fact(s), {checked} item(s) checked against {len(topical)} Topical "
          f"Requirement date(s) · {len(errs)} error(s) · {len(warns)} warning(s)")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
