#!/usr/bin/env python3
"""
Mechanical linter for the original CISA question bank.

Runs 7 checks the cisa-exam-reviewer subagent should not have to:
  1. Option-length parity (correct/distractor avg ratio in 0.67..1.5)
  2. Position-letter rotation (within domain or batch tolerance)
  3. Framework citation validity (against _framework_library.md)
  4. Tip-1 trap-anchor presence (tip 1 should cite a wrong-option letter)
  5. _provenance presence and shape
  6. Precision-word presence in question stem (FIRST/BEST/MOST/GREATEST/PRIMARY)
     for application + analysis tier
  7. scenario_context word count for analysis tier (target 80-160 words)

Exit codes:
  0 = clean
  1 = errors (parity, citation, schema-shape)
  2 = warnings only (precision-words, scenario length)

Usage:
  python3 scripts/lint_originals.py            # all domains
  python3 scripts/lint_originals.py 2          # one domain
  python3 scripts/lint_originals.py --batch d2_051..d2_070   # one batch
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable

REPO_ROOT = Path(__file__).resolve().parent.parent
ORIGINALS_DIR = REPO_ROOT / "data" / "originals"
LIBRARY_PATH = ORIGINALS_DIR / "_framework_library.md"

PRECISION_WORDS = {
    "FIRST", "BEST", "MOST", "GREATEST", "PRIMARY", "PRIMARILY",
    "STRONGEST", "LEAST", "LIKELY", "ABOVE ALL"
}

# ---------------------------------------------------------------------------

def load_library() -> set[str]:
    """Parse bullet entries from _framework_library.md."""
    if not LIBRARY_PATH.exists():
        sys.exit(f"FATAL: framework library not found at {LIBRARY_PATH}")
    canonical: set[str] = set()
    in_code_block = False
    for line in LIBRARY_PATH.read_text().splitlines():
        if line.startswith("```"):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            continue
        m = re.match(r"^- (.+?)\s*$", line)
        if m:
            canonical.add(m.group(1).strip())
    return canonical


def normalize_citation(s: str) -> str:
    """Normalize for comparison: strip extra whitespace, unify dashes."""
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    return s


def check_citation(cite: str, library: set[str]) -> tuple[bool, str | None]:
    """Return (is_valid, suggested_canonical_or_None)."""
    norm = normalize_citation(cite)
    if norm in library:
        return True, None
    # Also try without trailing parenthetical detail (allow refinement)
    base_match = re.match(r"^(.+?)\s+\([^)]+\)$", norm)
    if base_match and base_match.group(1) in library:
        return True, None
    # Suggest closest canonical entry by simple substring/prefix match
    candidates = [c for c in library if norm[:25] and c.startswith(norm[:25])]
    if not candidates:
        # try first 15 chars
        candidates = [c for c in library if norm[:15] and c.startswith(norm[:15])]
    suggested = candidates[0] if candidates else None
    return False, suggested


# ---------------------------------------------------------------------------

def lint_question(q: dict, library: set[str]) -> tuple[list[str], list[str]]:
    """Return (errors, warnings)."""
    errors: list[str] = []
    warnings: list[str] = []
    qid = q.get("id", "<no-id>")

    # Check 1: parity
    correct = q.get("correct", "")
    options = q.get("options", {})
    if correct in options:
        correct_len = len(options[correct].split())
        distractors = [v for k, v in options.items() if k != correct]
        if distractors:
            avg = sum(len(d.split()) for d in distractors) / len(distractors)
            if avg > 0:
                ratio = correct_len / avg
                if ratio > 1.5 or ratio < 0.67:
                    errors.append(
                        f"{qid}: option-length parity ratio {ratio:.2f} "
                        f"(correct={correct_len}w, distractor_avg={avg:.1f}w; target 0.67–1.50)"
                    )

    # Check 5: _provenance presence
    prov = q.get("_provenance", "")
    if not prov or len(prov.strip()) < 30:
        errors.append(f"{qid}: _provenance missing or too short")

    # Check 6: precision-word in stem (application/analysis tier)
    diff = q.get("difficulty", "")
    if diff in ("application", "analysis"):
        stem = q.get("question", "").upper()
        if not any(pw in stem for pw in PRECISION_WORDS):
            warnings.append(
                f"{qid}: stem missing precision word "
                f"(FIRST/BEST/MOST/GREATEST/PRIMARY/STRONGEST) — diff={diff}"
            )

    # Check 7: scenario_context word count for analysis tier
    # Exam-style v2 items have no scenario (see scripts/lint_exam_style_v2.py).
    if diff == "analysis" and q.get("style_version") != 2:
        sc = q.get("scenario_context", "")
        wc = len(sc.split())
        if wc < 60:
            errors.append(
                f"{qid}: scenario_context too short ({wc}w; analysis tier expects 80–160)"
            )
        elif wc < 80:
            warnings.append(
                f"{qid}: scenario_context short ({wc}w; analysis tier target 80–160)"
            )
        elif wc > 200:
            warnings.append(
                f"{qid}: scenario_context long ({wc}w; analysis tier target 80–160)"
            )

    # Check 4: tip-1 trap-anchor (skip for foundational tier — recall questions use mnemonic tips, not trap-naming)
    tips = q.get("tips", [])
    is_foundational = q.get("difficulty") == "foundational" or q.get("bloom_level") == "Foundational"
    # v2 items name the trap in tip 2 ("Final two: K beats R"); lint_exam_style_v2.py checks it.
    if tips and not is_foundational and q.get("style_version") != 2:
        tip1 = tips[0]
        # heuristic: tip 1 should cite a wrong-answer letter (A/B/C/D) that is NOT the correct one
        # Pattern: "Trap is X" or "Trap is X or Y"
        m = re.search(r"Trap\s+is\s+([A-D])(?:\s+or\s+([A-D]))?", tip1)
        if not m:
            warnings.append(
                f"{qid}: tip 1 does not name a trap letter (expected pattern 'Trap is <letter>')"
            )
        else:
            cited = [m.group(1)] + ([m.group(2)] if m.group(2) else [])
            if any(c == correct for c in cited):
                errors.append(
                    f"{qid}: tip 1 cites letter {cited} which includes the CORRECT answer ({correct})"
                )

    # Check 3: framework citation validity
    # We only split on ';' (the explicit separator). 'and' / commas appear
    # naturally inside citations (e.g., "Build, Acquire, and Implement") and
    # must not be splitters.
    fr = q.get("framework_ref", "")
    for cite in [c.strip() for c in fr.split(";")]:
        if not cite:
            continue
        ok, suggested = check_citation(cite, library)
        if not ok:
            msg = f"{qid}: framework citation '{cite}' not in library"
            if suggested:
                msg += f" (closest: '{suggested}')"
            warnings.append(msg)

    return errors, warnings


# ---------------------------------------------------------------------------

def lint_questions(questions: Iterable[dict], library: set[str]) -> tuple[list[str], list[str], dict]:
    """Lint a list of questions. Returns (errors, warnings, position_stats)."""
    all_errors: list[str] = []
    all_warnings: list[str] = []
    position_counts: Counter = Counter()
    diff_counts: Counter = Counter()
    qs_list = list(questions)

    for q in qs_list:
        e, w = lint_question(q, library)
        all_errors.extend(e)
        all_warnings.extend(w)
        position_counts[q.get("correct", "?")] += 1
        diff_counts[q.get("difficulty", "?")] += 1

    return all_errors, all_warnings, {"position": dict(position_counts), "difficulty": dict(diff_counts)}


def select_questions(all_qs: list[dict], batch_spec: str | None) -> list[dict]:
    if not batch_spec:
        return all_qs
    # spec: "d2_051..d2_070"
    m = re.match(r"^([a-z])(\d+)_(\d+)\.\.\1\2_(\d+)$", batch_spec)
    if not m:
        sys.exit(f"FATAL: bad --batch spec '{batch_spec}'; expected like 'd2_051..d2_070'")
    prefix = f"{m.group(1)}{m.group(2)}_"
    lo, hi = int(m.group(3)), int(m.group(4))
    return [q for q in all_qs
            if q.get("id", "").startswith(prefix)
            and lo <= int(q["id"].split("_")[1]) <= hi]


# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("domain", nargs="?", type=int, choices=[1, 2, 3, 4, 5],
                        help="Lint one domain (default: all)")
    parser.add_argument("--batch", default=None,
                        help="Lint one batch (e.g., 'd2_051..d2_070')")
    parser.add_argument("--strict", action="store_true",
                        help="Treat warnings as errors")
    args = parser.parse_args()

    library = load_library()
    print(f"Framework library: {len(library)} canonical citations")

    domains = [args.domain] if args.domain else [1, 2, 3, 4, 5]

    total_errors = 0
    total_warnings = 0

    for d in domains:
        path = ORIGINALS_DIR / f"d{d}.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text())
        qs = data.get("questions", [])
        if not qs:
            print(f"\nD{d}: empty, skipping")
            continue
        qs = select_questions(qs, args.batch)
        if not qs:
            continue

        errors, warnings, stats = lint_questions(qs, library)
        print(f"\n=== D{d}: {len(qs)} questions ===")
        print(f"  Difficulty: {stats['difficulty']}")
        print(f"  Position-letter: {stats['position']}")

        # Position rotation tolerance (only meaningful when batch_spec narrows scope)
        if args.batch:
            total = sum(stats["position"].values())
            for letter in "ABCD":
                pct = stats["position"].get(letter, 0) / total * 100 if total else 0
                if pct > 60:
                    warnings.append(
                        f"position-letter rotation skewed: {letter} = {pct:.0f}% "
                        f"(target each <= ~60% per batch)"
                    )

        if errors:
            print(f"  ERRORS: {len(errors)}")
            for e in errors:
                print(f"    ✗ {e}")
        if warnings:
            print(f"  WARNINGS: {len(warnings)}")
            for w in warnings:
                print(f"    ⚠ {w}")
        if not errors and not warnings:
            print(f"  ✓ clean")

        total_errors += len(errors)
        total_warnings += len(warnings)

    print(f"\nTotal errors: {total_errors}")
    print(f"Total warnings: {total_warnings}")

    if total_errors > 0:
        sys.exit(1)
    if args.strict and total_warnings > 0:
        sys.exit(1)
    if total_warnings > 0:
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
