#!/usr/bin/env python3
"""Validate every question in data/originals/d{1..5}.json against the
schema in docs/content/QUESTION_SCHEMA.md.

Run from repo root:
    python3 scripts/validate_originals.py

Exits 0 when all loaded files are valid (including the empty-questions
case during the early rebuild phase). Exits non-zero with a count of
problems otherwise. Designed to be called from scripts/verify_repo.sh.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS_DIR = ROOT / "data" / "originals"
PRINCIPLES_PATH = ROOT / "data" / "mindset" / "principles.json"

DOMAIN_WEIGHTS = {1: 18, 2: 18, 3: 12, 4: 26, 5: 26}
VALID_DIFFICULTIES = {"foundational", "application", "analysis"}
VALID_BLOOM = {"Foundational", "Application", "Analysis"}
VALID_LETTERS = {"A", "B", "C", "D"}

# Required top-level question fields. Optional fields are listed below.
REQUIRED = [
    "id",
    "domain",
    "subtopic",
    "difficulty",
    "bloom_level",
    "question",
    "options",
    "correct",
    "key_concept",
    "pre_read",
    "correct_explanation",
    "wrong_explanations",
    "tips",
    "framework_ref",
    "_provenance",
]
OPTIONAL = [
    "scenario_context",
    "related_concepts",
    # The one mindset principle the question MOST tests: an `id` from
    # data/mindset/principles.json (docs/content/PRINCIPLE_TAGGING.md).
    # Unknown ids are errors; a missing id is a warning while tagging rolls out.
    "principle_id",
]


def load_principle_ids() -> set[str] | None:
    """Canonical principle ids, or None when the principles file is absent."""
    try:
        doc = json.loads(PRINCIPLES_PATH.read_text())
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        print(f"  ✗ {PRINCIPLES_PATH.relative_to(ROOT)}: invalid JSON — {e}")
        return set()
    return {p.get("id") for p in doc.get("principles", []) if isinstance(p, dict)}


def validate_question(q: dict, expected_domain: int, idx: int,
                      principle_ids: set[str] | None = None) -> list[str]:
    """Return a list of error strings for this question (empty = valid).

    `principle_ids`: canonical ids from data/mindset/principles.json, or None
    to skip the principle_id check (file absent)."""
    errors: list[str] = []
    qid = q.get("id", f"<#{idx} no id>")

    # Required keys
    for key in REQUIRED:
        if key not in q:
            errors.append(f"{qid}: missing required field '{key}'")

    # Type and value checks (only run if the key is present, to avoid
    # cascading errors from missing keys)
    if "domain" in q and q["domain"] != expected_domain:
        errors.append(f"{qid}: domain={q['domain']} but file is for d{expected_domain}")

    if "difficulty" in q and q["difficulty"] not in VALID_DIFFICULTIES:
        errors.append(f"{qid}: difficulty='{q['difficulty']}' not in {sorted(VALID_DIFFICULTIES)}")

    if "bloom_level" in q and q["bloom_level"] not in VALID_BLOOM:
        errors.append(f"{qid}: bloom_level='{q['bloom_level']}' not in {sorted(VALID_BLOOM)}")

    if "options" in q:
        opts = q["options"]
        if not isinstance(opts, dict) or set(opts.keys()) != VALID_LETTERS:
            errors.append(f"{qid}: options must have exactly keys A, B, C, D — got {sorted(opts.keys()) if isinstance(opts, dict) else type(opts).__name__}")
        else:
            for letter, text in opts.items():
                if not isinstance(text, str) or not text.strip():
                    errors.append(f"{qid}: option {letter} is empty or non-string")

    if "correct" in q and q["correct"] not in VALID_LETTERS:
        errors.append(f"{qid}: correct='{q['correct']}' must be one of A/B/C/D")

    if "wrong_explanations" in q and "correct" in q and q["correct"] in VALID_LETTERS:
        we = q["wrong_explanations"]
        expected_keys = VALID_LETTERS - {q["correct"]}
        if not isinstance(we, dict) or set(we.keys()) != expected_keys:
            errors.append(f"{qid}: wrong_explanations should have keys {sorted(expected_keys)} (the non-correct letters), got {sorted(we.keys()) if isinstance(we, dict) else type(we).__name__}")

    if "tips" in q:
        tips = q["tips"]
        if not isinstance(tips, list) or not (3 <= len(tips) <= 4):
            errors.append(f"{qid}: tips must be a list of 3-4 strings, got {type(tips).__name__} of length {len(tips) if isinstance(tips, list) else 'n/a'}")
        elif not all(isinstance(t, str) and t.strip() for t in tips):
            errors.append(f"{qid}: tips contains an empty or non-string entry")

    if "_provenance" in q:
        prov = q["_provenance"]
        if not isinstance(prov, str) or not prov.startswith("Authored from concept:"):
            errors.append(f"{qid}: _provenance must start with 'Authored from concept:' to confirm authoring discipline")

    if "key_concept" in q and (not isinstance(q["key_concept"], str) or len(q["key_concept"].strip()) < 20):
        errors.append(f"{qid}: key_concept too short (< 20 chars)")

    if "pre_read" in q and (not isinstance(q["pre_read"], str) or len(q["pre_read"].strip()) < 30):
        errors.append(f"{qid}: pre_read too short (< 30 chars)")

    if "correct_explanation" in q:
        ce = q["correct_explanation"]
        # Analysis-tier requires longer explanation (60+ words per the checklist quality bar).
        # Exam-style v2 items use a 40–75 word range, checked by lint_exam_style_v2.py.
        if isinstance(ce, str) and q.get("difficulty") == "analysis" and q.get("style_version") != 2:
            words = len(ce.split())
            if words < 60:
                errors.append(f"{qid}: analysis-tier correct_explanation has only {words} words (< 60 expected)")

    if "principle_id" in q:
        pid = q["principle_id"]
        if not isinstance(pid, str) or not pid.strip():
            errors.append(f"{qid}: principle_id must be a non-empty string")
        elif principle_ids is not None and pid not in principle_ids:
            errors.append(f"{qid}: principle_id '{pid}' is not a principle id in data/mindset/principles.json (legacy ids and aliases are not accepted)")

    # ID format: d{1..5}_NNN
    if "id" in q and isinstance(q["id"], str):
        if not re.match(rf"^d{expected_domain}_\d{{3}}$", q["id"]):
            errors.append(f"{qid}: id must match 'd{expected_domain}_NNN' (3-digit sequence)")

    return errors


def main() -> int:
    if not ORIGINALS_DIR.exists():
        print(f"[skip] {ORIGINALS_DIR} does not exist yet — nothing to validate")
        return 0

    total_questions = 0
    total_errors = 0
    principle_ids = load_principle_ids()

    print("Originals schema validation:")
    if principle_ids is None:
        print(f"  [skip] principle_id check: {PRINCIPLES_PATH.relative_to(ROOT)} not found")
    for d in sorted(DOMAIN_WEIGHTS.keys()):
        path = ORIGINALS_DIR / f"d{d}.json"
        if not path.exists():
            print(f"  [skip] D{d}: {path.name} not found")
            continue
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError as e:
            print(f"  ✗ D{d}: invalid JSON — {e}")
            total_errors += 1
            continue

        questions = data.get("questions", [])
        if not isinstance(questions, list):
            print(f"  ✗ D{d}: 'questions' must be a list")
            total_errors += 1
            continue

        file_errors = 0
        for idx, q in enumerate(questions):
            for err in validate_question(q, d, idx, principle_ids):
                if file_errors == 0:
                    print(f"  ✗ D{d}:")
                print(f"      {err}")
                file_errors += 1
                total_errors += 1
        total_questions += len(questions)

        if file_errors == 0:
            count = len(questions)
            label = "empty" if count == 0 else f"{count} question{'s' if count != 1 else ''}"
            print(f"  ✓ D{d}: {label}, all valid")
        # Warning only (never fails): questions not yet linked to a principle.
        untagged = [q.get("id", "?") for q in questions if isinstance(q, dict) and "principle_id" not in q]
        if questions and untagged:
            print(f"  ⚠ D{d}: {len(untagged)} of {len(questions)} without principle_id"
                  + (" (none tagged yet)" if len(untagged) == len(questions) else ""))

    if total_errors == 0:
        print(f"  Total: {total_questions} questions across all 5 domains, no schema issues.")
        return 0
    else:
        print(f"  Total: {total_errors} schema issue{'s' if total_errors != 1 else ''} across {total_questions} questions.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
