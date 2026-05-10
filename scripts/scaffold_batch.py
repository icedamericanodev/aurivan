#!/usr/bin/env python3
"""
Pre-author scaffold generator for CISA question batches.

Outputs a structured scaffold per question with the structural constraints
filled in (position, target word counts, citation pre-flight, trap-letter
target, scenario_context target). The author fills in the topic + content
following the constraints.

Eliminates the recurring authoring drift that the linter catches post-hoc:
- Parity drift (correct options 50-100w vs target 14-22w)
- Position-letter drift (defaults to B/C; target 5/5/5/5)
- Citation drift (paraphrases of canonical names)
- scenario_context drift (lands at 70-79w; target 80-160)

Usage:
  scripts/scaffold_batch.py --batch d3_001..d3_020 --mix "4F+12A+4An"
  scripts/scaffold_batch.py --batch d3_021..d3_040 --mix "4F+12A+4An" \\
      --positions "5B+5A+5C+5D" --out /tmp/d3_batch2_scaffold.md

Output is markdown, easy to read while authoring. Convert to authoring
script (Python with NEW.append() blocks) by hand or by another tool.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import List

REPO_ROOT = Path(__file__).resolve().parent.parent
LIBRARY_PATH = REPO_ROOT / "data" / "originals" / "_framework_library.md"

# Default per-batch position rotation (assumes 20-question batches)
DEFAULT_POSITIONS_20 = ["B", "A", "C", "D"] * 5  # 5B + 5A + 5C + 5D
DEFAULT_POSITIONS_10 = ["B", "A", "C", "D", "B", "A", "C", "D", "B", "C"]  # 3B+3C+2A+2D approx for closing batches

# Stem precision words for application + analysis tier
PRECISION_WORDS = ["BEST", "MOST", "PRIMARY", "GREATEST", "FIRST", "STRONGEST"]

# Per-tier authoring guidance
TIER_GUIDANCE = {
    "foundational": {
        "stem_pattern": "Which statement BEST defines/describes <concept>?",
        "correct_words": "14-22",
        "distractor_words": "14-22",
        "scenario_context": None,
        "tip_anchor": "Trap is <letter> — substitutes a related concept for the target",
    },
    "application": {
        "stem_pattern": "<industry context, 1-2 sentences>. Which approach BEST <action>?",
        "correct_words": "14-22",
        "distractor_words": "14-22",
        "scenario_context": None,
        "tip_anchor": "Trap is <letter> — names the seductive but wrong real-world option",
    },
    "analysis": {
        "stem_pattern": "<one short question, ~10 words>. (See scenario_context.)",
        "correct_words": "20-30",
        "distractor_words": "20-30",
        "scenario_context": "100 words target (80-160 acceptable)",
        "tip_anchor": "Trap is <letter or X or Y> — names the most-seductive distractor",
    },
}


def parse_batch_range(batch_spec: str) -> List[str]:
    """Parse 'd3_001..d3_020' into ['d3_001', ..., 'd3_020']."""
    m = re.match(r"^([a-z])(\d+)_(\d+)\.\.\1\2_(\d+)$", batch_spec)
    if not m:
        sys.exit(f"FATAL: bad batch spec '{batch_spec}'; expected like 'd3_001..d3_020'")
    prefix = f"{m.group(1)}{m.group(2)}_"
    lo, hi = int(m.group(3)), int(m.group(4))
    return [f"{prefix}{i:03d}" for i in range(lo, hi + 1)]


def parse_mix(mix_spec: str) -> List[str]:
    """Parse '4F+12A+4An' into a list of tier-per-question for 20 questions."""
    m = re.match(r"^(\d+)F\+(\d+)A\+(\d+)An$", mix_spec)
    if not m:
        sys.exit(f"FATAL: bad mix spec '{mix_spec}'; expected like '4F+12A+4An'")
    f, a, an = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return ["foundational"] * f + ["application"] * a + ["analysis"] * an


def parse_positions(positions_spec: str, total: int) -> List[str]:
    """Parse '5B+5A+5C+5D' into a list of position-per-question."""
    m = re.match(r"^(\d+)B\+(\d+)A\+(\d+)C\+(\d+)D$", positions_spec)
    if not m:
        sys.exit(f"FATAL: bad positions spec '{positions_spec}'; expected '5B+5A+5C+5D'")
    counts = [("B", int(m.group(1))), ("A", int(m.group(2))),
              ("C", int(m.group(3))), ("D", int(m.group(4)))]
    if sum(c for _, c in counts) != total:
        sys.exit(f"FATAL: positions sum {sum(c for _, c in counts)} != batch size {total}")
    # Round-robin interleave for variety (not all-B-then-all-A-etc)
    result: List[str] = []
    remaining = dict(counts)
    letters = ["B", "A", "C", "D"]
    idx = 0
    while sum(remaining.values()) > 0:
        letter = letters[idx % 4]
        if remaining[letter] > 0:
            result.append(letter)
            remaining[letter] -= 1
        idx += 1
        if idx > total * 10:  # safety
            break
    return result


def load_library_canonicals() -> List[str]:
    """Parse bullet entries from the framework library."""
    if not LIBRARY_PATH.exists():
        return []
    canonical = []
    for line in LIBRARY_PATH.read_text().splitlines():
        m = re.match(r"^- (.+?)\s*$", line)
        if m:
            canonical.append(m.group(1).strip())
    return canonical


def render_scaffold(qids: List[str], tiers: List[str], positions: List[str]) -> str:
    """Render the markdown scaffold."""
    lines = []
    lines.append(f"# Pre-Author Scaffold — {qids[0]}..{qids[-1]}")
    lines.append("")
    lines.append("**Purpose:** structural constraints for the author. Fill in the TOPIC and CONTENT for each question following the pre-set position, target word counts, and citations.")
    lines.append("")
    lines.append(f"**Batch size:** {len(qids)} questions")
    from collections import Counter
    tier_counts = Counter(tiers)
    pos_counts = Counter(positions)
    lines.append(f"**Difficulty mix:** {dict(tier_counts)}")
    lines.append(f"**Position rotation:** {dict(pos_counts)}")
    lines.append("")
    lines.append("**Library reference:** `data/originals/_framework_library.md` ({} canonical citations)".format(len(load_library_canonicals())))
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Authoring Discipline (read before each question)")
    lines.append("")
    lines.append("- **Parity:** correct option + distractors all 14-22 words (analysis tier 20-30 words). Linter target: 0.67-1.50 ratio.")
    lines.append("- **Position:** the `position` field below is YOUR ASSIGNMENT for this question. Author the correct content at this letter; distractors at the other three.")
    lines.append("- **Citations:** before authoring, verify each citation against the library. If a citation is missing, ADD IT to the library FIRST.")
    lines.append("- **Trap letter:** identify the most-seductive distractor BEFORE writing tip 1. Name it explicitly in tip 1: `Trap is <letter> — \"<seductive phrase>\" but <why it fails>.`")
    lines.append("- **scenario_context (analysis tier only):** target 100 words. Lands well in the 80-160 acceptable band.")
    lines.append("- **Stem precision word:** include FIRST/BEST/MOST/GREATEST/PRIMARY/STRONGEST in the stem (application + analysis tier).")
    lines.append("")
    lines.append("---")
    lines.append("")

    for i, (qid, tier, pos) in enumerate(zip(qids, tiers, positions), 1):
        guidance = TIER_GUIDANCE[tier]
        lines.append(f"## {qid} (Q{i}/{len(qids)})")
        lines.append("")
        lines.append(f"- **tier:** {tier}")
        lines.append(f"- **position (correct letter):** {pos}")
        lines.append(f"- **target_correct_words:** {guidance['correct_words']}")
        lines.append(f"- **target_distractor_words:** {guidance['distractor_words']} (each)")
        if guidance["scenario_context"]:
            lines.append(f"- **scenario_context:** {guidance['scenario_context']}")
        lines.append(f"- **stem_pattern:** `{guidance['stem_pattern']}`")
        lines.append(f"- **tip_1 pattern:** `{guidance['tip_anchor']}`")
        lines.append("")
        lines.append("**TODO (author fills in):**")
        lines.append("- subtopic: ___")
        lines.append("- topic / TOC ref: ___")
        if tier == "analysis":
            lines.append("- scenario_context (industry, multi-fact setup): ___")
        lines.append("- question stem (with precision word): ___")
        lines.append(f"- option {pos} (CORRECT, target {guidance['correct_words']}w): ___")
        for letter in "ABCD":
            if letter != pos:
                lines.append(f"- option {letter} (distractor, target {guidance['distractor_words']}w): ___")
        lines.append("- correct_explanation (≥60w for analysis; defends WHY): ___")
        lines.append("- wrong_explanations (3 entries, one per non-correct letter): ___")
        lines.append("- key_concept: ___")
        lines.append("- pre_read: ___")
        lines.append("- tips (3 entries: trap-naming + principle + exam-shortcut): ___")
        lines.append("- framework_ref (verified against library): ___")
        lines.append("- related_concepts: ___")
        lines.append("- _provenance: ___")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## Citation Pre-Flight Reminder")
    lines.append("")
    lines.append("Before authoring, plan which citations the batch will use. For each citation, verify:")
    lines.append("")
    lines.append("- Already in `data/originals/_framework_library.md` (search the file)?")
    lines.append("- If yes: use the canonical form exactly")
    lines.append("- If no: ADD to library in this PR's first commit")
    lines.append("")
    lines.append("Common drift patterns to avoid:")
    lines.append("")
    lines.append("- ❌ \"COBIT 2019 (Risk Management)\" → ✓ \"COBIT 2019 APO12 (Managed Risk)\"")
    lines.append("- ❌ \"Sarbanes-Oxley Section 404\" (for retention) → ✓ \"Sarbanes-Oxley Act Section 802 (Records Retention)\"")
    lines.append("- ❌ \"OCC Bulletin 2017-21 (M&A)\" → ✓ \"OCC Comptroller's Licensing Manual — Business Combinations\"")
    lines.append("- ❌ \"ITAF Standard NNN\" without specific number → ✓ \"ISACA IT Audit Standard 1205 (Evidence)\"")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Post-Author Verification (after authoring is complete)")
    lines.append("")
    lines.append("Run before opening PR:")
    lines.append("")
    lines.append("```bash")
    lines.append(f"python3 scripts/lint_originals.py --batch {qids[0]}..{qids[-1]} --strict")
    lines.append("```")
    lines.append("")
    lines.append("Expected: 0 errors, 0 warnings. If errors appear, fix in one pass before invoking reviewers.")
    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--batch", required=True, help="Batch range, e.g., 'd3_001..d3_020'")
    parser.add_argument("--mix", required=True, help="Tier mix, e.g., '4F+12A+4An'")
    parser.add_argument("--positions", default=None,
                        help="Position rotation, e.g., '5B+5A+5C+5D' (default: equal split)")
    parser.add_argument("--out", default=None, help="Output path (default: stdout)")
    args = parser.parse_args()

    qids = parse_batch_range(args.batch)
    tiers = parse_mix(args.mix)
    if len(tiers) != len(qids):
        sys.exit(f"FATAL: mix sums to {len(tiers)} but batch has {len(qids)} questions")

    if args.positions:
        positions = parse_positions(args.positions, len(qids))
    else:
        # Default: equal split, round-robin distributed
        per_letter = len(qids) // 4
        remainder = len(qids) % 4
        counts = {"B": per_letter, "A": per_letter, "C": per_letter, "D": per_letter}
        for letter in ["B", "A", "C", "D"][:remainder]:
            counts[letter] += 1
        positions = parse_positions(
            f"{counts['B']}B+{counts['A']}A+{counts['C']}C+{counts['D']}D",
            len(qids)
        )

    scaffold = render_scaffold(qids, tiers, positions)

    if args.out:
        Path(args.out).write_text(scaffold)
        print(f"Wrote scaffold to {args.out} ({len(qids)} questions)")
    else:
        print(scaffold)


if __name__ == "__main__":
    main()
