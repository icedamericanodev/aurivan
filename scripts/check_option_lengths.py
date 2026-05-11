#!/usr/bin/env python3
"""
Option-length pre-commit validator for CISA practice questions.

Built in response to the recurring authoring drift across D4-6, D4-7, D4-8,
D4-9: initial drafts produced 30-50 word correct options against 10-15 word
distractors, requiring 2-3 compression passes post-hoc. This tool catches
the issue at DRAFT TIME — before the script is run and the JSON is modified.

Two modes:
  1. --batch dN_NNN..dN_NNN — validate already-appended questions in the JSON
  2. --draft /path/to/dN_batchM_append.py — inspect new_questions in a draft
     script BEFORE running it; suggests per-option word-count targets

Target ratio: 0.67-1.50 (matches scripts/lint_originals.py option-length check).

Output: per-question word counts + ratio + suggested compression/expansion.
Exit 1 if any errors found AND --strict is passed.

Usage examples:
  python3 scripts/check_option_lengths.py --draft /tmp/d4_batch10_append.py
  python3 scripts/check_option_lengths.py --batch d4_181..d4_200
  python3 scripts/check_option_lengths.py --draft /tmp/x.py --strict
"""
import argparse
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
ORIGINALS = ROOT / "data" / "originals"

TARGET_RATIO_MIN = 0.67
TARGET_RATIO_MAX = 1.50

# Word-count budgets (informational, used in suggested compression text)
CORRECT_TARGET = (18, 25)   # ideal correct-option word count range
DISTRACTOR_TARGET = (18, 22)  # ideal distractor-option word count range


def word_count(s: str) -> int:
    return len(s.split())


def evaluate_question(q: dict) -> dict:
    """Return per-question analysis."""
    options = q.get("options", {})
    correct = q.get("correct", "")
    qid = q.get("id", "?")

    if not options or correct not in options:
        return {"qid": qid, "error": "missing options or correct"}

    correct_wc = word_count(options[correct])
    distractor_wcs = {k: word_count(v) for k, v in options.items() if k != correct}
    distractor_avg = sum(distractor_wcs.values()) / max(len(distractor_wcs), 1)
    ratio = correct_wc / max(distractor_avg, 1)

    result = {
        "qid": qid,
        "correct_letter": correct,
        "correct_wc": correct_wc,
        "distractor_wcs": distractor_wcs,
        "distractor_avg": round(distractor_avg, 1),
        "ratio": round(ratio, 2),
        "status": "ok",
        "suggestions": [],
    }

    if ratio > TARGET_RATIO_MAX:
        # Correct is too long relative to distractors
        target_correct = int(TARGET_RATIO_MAX * distractor_avg) - 1  # margin
        target_distractor_avg = int(correct_wc / TARGET_RATIO_MAX) + 1
        result["status"] = "fail"
        result["suggestions"].append(
            f"Correct option ({correct}, {correct_wc}w) too long; compress to ≤{target_correct}w "
            f"OR lengthen distractors to avg ≥{target_distractor_avg}w each."
        )
        # Identify the short distractors
        short = [(k, w) for k, w in distractor_wcs.items() if w < target_distractor_avg - 2]
        if short:
            result["suggestions"].append(
                f"Short distractors: {', '.join(f'{k}={w}w' for k, w in short)}"
            )

    elif ratio < TARGET_RATIO_MIN:
        target_correct = int(TARGET_RATIO_MIN * distractor_avg) + 1
        result["status"] = "fail"
        result["suggestions"].append(
            f"Correct option ({correct}, {correct_wc}w) too short; expand to ≥{target_correct}w "
            f"OR shorten distractors."
        )

    # Soft warnings for word-count budget
    if correct_wc > CORRECT_TARGET[1] + 5 and ratio <= TARGET_RATIO_MAX:
        result["suggestions"].append(
            f"Correct option {correct_wc}w exceeds soft budget {CORRECT_TARGET[1]}w "
            f"(in-ratio but verbose)."
        )
    for k, w in distractor_wcs.items():
        if w < DISTRACTOR_TARGET[0] - 4:
            result["suggestions"].append(
                f"Distractor {k} at {w}w is very short; consider expanding to ≥{DISTRACTOR_TARGET[0]}w."
            )

    return result


def load_questions_from_json(domain_path: Path) -> list:
    if not domain_path.exists():
        return []
    try:
        return json.loads(domain_path.read_text()).get("questions", [])
    except json.JSONDecodeError:
        return []


def parse_batch(spec: str):
    m = re.match(r"d(\d+)_(\d+)\.\.d(\d+)_(\d+)", spec)
    if not m:
        return None
    d1, s, d2, e = m.groups()
    if d1 != d2:
        return None
    return int(d1), int(s), int(e)


def load_questions_from_draft(script_path: Path) -> list:
    """Import a draft Python script and extract its `new_questions` list."""
    if not script_path.exists():
        print(f"ERROR: draft script not found: {script_path}", file=sys.stderr)
        sys.exit(2)
    spec = importlib.util.spec_from_file_location("draft", script_path)
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
    except Exception as e:
        print(f"ERROR: failed to import draft script: {e}", file=sys.stderr)
        sys.exit(2)
    if not hasattr(module, "new_questions"):
        print(f"ERROR: draft script does not define 'new_questions'", file=sys.stderr)
        sys.exit(2)
    return module.new_questions


def print_report(results: list):
    fail = [r for r in results if r.get("status") == "fail"]
    ok = [r for r in results if r.get("status") == "ok"]

    print()
    print(f"=== Option-length validation ===")
    print(f"Total: {len(results)}  |  PASS: {len(ok)}  |  FAIL: {len(fail)}")
    print(f"Target ratio: {TARGET_RATIO_MIN}–{TARGET_RATIO_MAX}")
    print(f"Word-count budgets: correct {CORRECT_TARGET[0]}-{CORRECT_TARGET[1]}w, distractor {DISTRACTOR_TARGET[0]}-{DISTRACTOR_TARGET[1]}w")
    print()

    if fail:
        print("FAILURES (must fix before --strict passes):")
        for r in fail:
            print(f"  ✗ {r['qid']} ratio={r['ratio']} correct_{r['correct_letter']}={r['correct_wc']}w avg_distractor={r['distractor_avg']}w")
            for s in r["suggestions"]:
                print(f"      → {s}")
        print()

    # Soft warnings (in-ratio but verbose / short distractors)
    soft = [r for r in ok if r.get("suggestions")]
    if soft:
        print(f"SOFT NOTES ({len(soft)} questions in-ratio but with budget notes):")
        for r in soft[:10]:
            print(f"  ⚠ {r['qid']} ratio={r['ratio']} correct_{r['correct_letter']}={r['correct_wc']}w")
            for s in r["suggestions"]:
                print(f"      → {s}")
        if len(soft) > 10:
            print(f"  ... ({len(soft) - 10} more)")
        print()


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--batch", help="dN_NNN..dN_NNN range to check against the JSON")
    g.add_argument("--draft", help="Path to a draft Python script with new_questions")
    ap.add_argument("--strict", action="store_true", help="Exit 1 on any failure")
    args = ap.parse_args()

    if args.draft:
        questions = load_questions_from_draft(Path(args.draft))
        print(f"Loaded {len(questions)} questions from draft script: {args.draft}")
    else:
        batch = parse_batch(args.batch)
        if not batch:
            print(f"ERROR: invalid --batch spec: {args.batch}", file=sys.stderr)
            sys.exit(2)
        d, s, e = batch
        all_q = load_questions_from_json(ORIGINALS / f"d{d}.json")
        questions = []
        for q in all_q:
            qid = q.get("id", "")
            if "_" not in qid:
                continue
            num = int(qid.split("_")[1])
            if s <= num <= e:
                questions.append(q)
        print(f"Loaded {len(questions)} questions from JSON batch: {args.batch}")

    if not questions:
        print("No questions to evaluate.")
        return

    results = [evaluate_question(q) for q in questions]
    print_report(results)

    fail_count = sum(1 for r in results if r.get("status") == "fail")
    if fail_count and args.strict:
        sys.exit(1)


if __name__ == "__main__":
    main()
