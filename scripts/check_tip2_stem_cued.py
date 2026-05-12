#!/usr/bin/env python3
"""
Heuristic check for tip[2] (exam-shortcut tip) drift toward "answer-summary"
vs "stem-cued shortcut".

Pattern detected: the third tip should cue a SPECIFIC WORD/PHRASE in the
stem that triggers the correct-answer pattern. It should NOT restate the
correct answer's structural elements verbatim.

Recurring D5 reviewer finding: tip[2] often drifts toward listing the
correct option's "+" delimiters as a memorized recipe rather than naming
a transferable stem cue.

Heuristic signals:
- POSITIVE (stem-cued): tip[2] contains "when stem ... look for ..." or
  "when stem says ... answer involves ..." pattern with named stem words
- NEGATIVE (answer-summary): tip[2] contains 3+ "+" delimiters mirroring
  the correct option's list structure
- NEGATIVE: tip[2] uses letter-anchored framings ("A fails", "B is the trap")
  instead of pattern names

Usage:
    python3 scripts/check_tip2_stem_cued.py --batch dN_NNN..dN_NNN
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
ORIGINALS = ROOT / "data" / "originals"


def parse_batch(spec: str):
    m = re.match(r"d(\d+)_(\d+)\.\.d(\d+)_(\d+)", spec)
    if not m:
        return None
    d1, s, d2, e = m.groups()
    if d1 != d2:
        return None
    return int(d1), int(s), int(e)


def count_plus_delimiters(text: str) -> int:
    return text.count(" + ")


def has_stem_cue_pattern(tip: str) -> bool:
    """Detect 'when stem ... look for ...' style stem-cued framing."""
    patterns = [
        r"when stem (says|describes|asks|mentions|names|invokes)",
        r"when stem .* look for",
        r"when the stem (says|describes|asks|mentions|names)",
        r"stem-cue",
        r"\"[A-Z][A-Z\- ]+\" or \"[A-Z]",  # quoted ALL-CAPS phrase
    ]
    text = tip.lower()
    for pat in patterns:
        if re.search(pat, text):
            return True
    return False


def has_letter_anchor(tip: str) -> bool:
    """Detect letter-anchored framings like 'A fails because' or '(A)'."""
    patterns = [
        r"\b[ABCD] (fails|is wrong|misses|inverts)",
        r"\([ABCD]\) (fails|wrong|misses)",
        r"option [ABCD]",
        r"both [ABCD] and [ABCD]",
    ]
    for pat in patterns:
        if re.search(pat, tip):
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", required=True)
    ap.add_argument("--strict", action="store_true")
    args = ap.parse_args()

    batch = parse_batch(args.batch)
    if not batch:
        print(f"ERROR: invalid --batch: {args.batch}", file=sys.stderr)
        sys.exit(2)
    d, s, e = batch

    all_q = json.loads((ORIGINALS / f"d{d}.json").read_text()).get("questions", [])
    questions = []
    for q in all_q:
        qid = q.get("id", "")
        if "_" not in qid:
            continue
        num = int(qid.split("_")[1])
        if s <= num <= e:
            questions.append(q)

    if not questions:
        print(f"No questions in batch {args.batch}")
        return

    warnings = []
    answer_summary_count = 0

    for q in questions:
        qid = q.get("id")
        tips = q.get("tips", [])
        if len(tips) < 3:
            continue
        tip2 = tips[2]

        # Count plus-delimiters in correct option (the answer pattern)
        correct_text = q["options"].get(q["correct"], "")
        correct_pluses = count_plus_delimiters(correct_text)

        # Count plus-delimiters in tip[2]
        tip2_pluses = count_plus_delimiters(tip2)

        flags = []

        # ANSWER-SUMMARY signal: tip[2] mirrors correct-option list structure
        if correct_pluses >= 4 and tip2_pluses >= 3:
            flags.append(f"answer-summary (correct has {correct_pluses} +; tip[2] has {tip2_pluses} +)")
            answer_summary_count += 1

        # LETTER-ANCHOR signal
        if has_letter_anchor(tip2):
            flags.append("letter-anchored")

        # MISSING STEM-CUE signal: tip[2] doesn't have stem-cue pattern AND has plus-list
        if not has_stem_cue_pattern(tip2) and tip2_pluses >= 3:
            flags.append("missing stem-cue pattern + plus-list structure")

        if flags:
            warnings.append((qid, flags, tip2[:120]))

    print(f"=== tip[2] stem-cued check: {args.batch} ({len(questions)} questions) ===\n")
    if warnings:
        for qid, flags, snippet in warnings:
            print(f"⚠ {qid}: {'; '.join(flags)}")
            print(f"  tip[2]: {snippet}...")
            print()
    else:
        print("✓ No tip[2] answer-summary drift detected.")

    print(f"Summary: {len(warnings)}/{len(questions)} flagged; {answer_summary_count} answer-summary mirrors.")

    if args.strict and warnings:
        sys.exit(1)


if __name__ == "__main__":
    main()
