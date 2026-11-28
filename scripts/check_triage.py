#!/usr/bin/env python3
"""Check the human-verification triage fields on practice questions.

The Human Verification Triage agent (.claude/agents/human-verification-triage.md)
adds five fields to each question for the certified creator's final sign-off:

    "is_human_verified": false,
    "triage_status": "READY_FOR_SIGN_OFF" | "NEEDS_HUMAN_EDIT",
    "audit_note": "<one-line summary>",
    "domain_tag": "<course and domain, e.g. AAIA Domain 2: AI Operations>",
    "verified_date": null

Only the human flips "is_human_verified" to true, and then writes the sign-off
date in "verified_date" (YYYY-MM-DD). This check keeps that promise honest: a
question marked verified without a date fails, a date without the flag fails,
and the fields must have the right types and values. Banks without triage
fields are skipped. It also prints how many questions are signed off.

Usage: python3 scripts/check_triage.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BANKS = ([f"data/originals/d{n}.json" for n in range(1, 6)]
         + [f"data/aaia/originals/d{n}.json" for n in range(1, 4)]
         + [f"data/crisc/originals/d{n}.json" for n in range(1, 5)])
FIELDS = ("is_human_verified", "triage_status", "audit_note", "domain_tag", "verified_date")
STATUSES = {"READY_FOR_SIGN_OFF", "NEEDS_HUMAN_EDIT"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def problems(q):
    out = []
    present = [f for f in FIELDS if f in q]
    if not present:
        return out
    missing = [f for f in FIELDS if f not in q]
    if missing:
        out.append(f"missing {', '.join(missing)}")
    verified = q.get("is_human_verified")
    if not isinstance(verified, bool):
        out.append("is_human_verified must be true or false")
    if q.get("triage_status") not in STATUSES:
        out.append(f"triage_status must be one of {sorted(STATUSES)}")
    for f in ("audit_note", "domain_tag"):
        if not (isinstance(q.get(f), str) and q.get(f).strip()):
            out.append(f"{f} must be non-empty text")
    date = q.get("verified_date")
    if verified is True and not (isinstance(date, str) and DATE.match(date)):
        out.append("signed off (is_human_verified true) but verified_date is not a YYYY-MM-DD date")
    if verified is False and date is not None:
        out.append("verified_date is set but is_human_verified is false")
    return out


def main():
    failed = False
    for path in BANKS:
        p = ROOT / path
        if not p.exists():
            continue
        qs = json.loads(p.read_text())
        qs = qs["questions"] if isinstance(qs, dict) else qs
        tagged = [q for q in qs if any(f in q for f in FIELDS)]
        if not tagged:
            continue
        bad = [(q.get("id"), e) for q in tagged for e in problems(q)]
        signed = sum(1 for q in tagged if q.get("is_human_verified") is True)
        edit = sum(1 for q in tagged if q.get("triage_status") == "NEEDS_HUMAN_EDIT")
        if bad:
            failed = True
            for qid, e in bad[:20]:
                print(f"  ✗ {path} {qid}: {e}")
        else:
            print(f"  ✓ {path}: {len(tagged)} triaged · {signed} signed off · {edit} need a human edit")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
